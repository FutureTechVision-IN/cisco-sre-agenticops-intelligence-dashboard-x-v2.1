"""
VibeVoice Microservice — ASR + TTS wrapper for SRE AgenticOps Dashboard
Runs as a standalone FastAPI process alongside the Express backend.

Endpoints:
  POST /asr        — Transcribe audio file → text
  POST /tts        — Synthesize text → streamed PCM16 audio
  GET  /voices     — List available voice presets
  GET  /health     — Service health check
  WS   /ws/tts     — WebSocket streaming TTS

Requires:
  pip install vibevoice torch transformers fastapi uvicorn python-multipart

Usage:
  python backend/vibevoice-server.py --device mps --tts-model microsoft/VibeVoice-Realtime-0.5B
"""

import argparse
import asyncio
import datetime
import io
import json
import os
import sys
import threading
import time
import traceback
from pathlib import Path
from queue import Empty, Queue
from typing import Any, Dict, Iterator, Optional, Tuple

import numpy as np
import torch
from fastapi import FastAPI, File, Form, UploadFile, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from starlette.websockets import WebSocketDisconnect, WebSocketState

# ---------------------------------------------------------------------------
# VibeVoice imports — add the VibeVoice project root to sys.path
# ---------------------------------------------------------------------------
VIBEVOICE_ROOT = os.environ.get(
    "VIBEVOICE_ROOT",
    str(Path(__file__).resolve().parent.parent.parent
        / "VibeVoice-main"),
)
if VIBEVOICE_ROOT not in sys.path:
    sys.path.insert(0, VIBEVOICE_ROOT)

# TTS imports (Realtime 0.5B — lightweight, streaming)
from vibevoice.modular.modeling_vibevoice_streaming_inference import (
    VibeVoiceStreamingForConditionalGenerationInference,
)
from vibevoice.processor.vibevoice_streaming_processor import (
    VibeVoiceStreamingProcessor,
)
from vibevoice.modular.streamer import AudioStreamer

# ASR imports (7B — heavy, optional)
try:
    from vibevoice.modular.modeling_vibevoice_asr import (
        VibeVoiceASRForConditionalGeneration,
    )
    from vibevoice.processor.vibevoice_asr_processor import VibeVoiceASRProcessor
    from vibevoice.processor.audio_utils import COMMON_AUDIO_EXTS

    ASR_AVAILABLE = True
except ImportError:
    ASR_AVAILABLE = False
    print("[vibevoice-server] ASR modules not available — TTS-only mode")

import copy

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
SAMPLE_RATE = 24_000  # VibeVoice Realtime output rate
DEFAULT_VOICE = "en-Carter_man"

app = FastAPI(title="VibeVoice Microservice", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# TTS Service (adapted from demo/web/app.py)
# ---------------------------------------------------------------------------
class TTSService:
    """Streaming TTS using VibeVoice-Realtime-0.5B."""

    def __init__(self, model_path: str, device: str = "mps", inference_steps: int = 5):
        self.model_path = model_path
        self.device = device
        self.inference_steps = inference_steps
        self.sample_rate = SAMPLE_RATE
        self.processor: Optional[VibeVoiceStreamingProcessor] = None
        self.model: Optional[VibeVoiceStreamingForConditionalGenerationInference] = None
        self.voice_presets: Dict[str, Path] = {}
        self.default_voice_key: Optional[str] = None
        self._voice_cache: Dict[str, Any] = {}
        self._torch_device = torch.device(device)
        self._lock = asyncio.Lock()

    def load(self) -> None:
        print(f"[TTS] Loading processor from {self.model_path}")
        self.processor = VibeVoiceStreamingProcessor.from_pretrained(self.model_path)

        # Device-specific dtype & attention
        if self.device == "mps":
            load_dtype, device_map, attn = torch.float32, None, "sdpa"
        elif self.device == "cuda":
            load_dtype, device_map, attn = torch.bfloat16, "cuda", "flash_attention_2"
        else:
            load_dtype, device_map, attn = torch.float32, "cpu", "sdpa"

        print(f"[TTS] device={device_map}, dtype={load_dtype}, attn={attn}")
        try:
            self.model = VibeVoiceStreamingForConditionalGenerationInference.from_pretrained(
                self.model_path,
                torch_dtype=load_dtype,
                device_map=device_map,
                attn_implementation=attn,
            )
        except Exception:
            if attn == "flash_attention_2":
                print("[TTS] flash_attention_2 failed, falling back to sdpa")
                self.model = VibeVoiceStreamingForConditionalGenerationInference.from_pretrained(
                    self.model_path,
                    torch_dtype=load_dtype,
                    device_map=self.device,
                    attn_implementation="sdpa",
                )
            else:
                raise

        if self.device == "mps":
            self.model.to("mps")

        self.model.eval()
        self.model.model.noise_scheduler = self.model.model.noise_scheduler.from_config(
            self.model.model.noise_scheduler.config,
            algorithm_type="sde-dpmsolver++",
            beta_schedule="squaredcos_cap_v2",
        )
        self.model.set_ddpm_inference_steps(num_steps=self.inference_steps)

        # Load voice presets
        voices_dir = Path(VIBEVOICE_ROOT) / "demo" / "voices" / "streaming_model"
        if voices_dir.exists():
            for pt in voices_dir.rglob("*.pt"):
                self.voice_presets[pt.stem] = pt
            self.voice_presets = dict(sorted(self.voice_presets.items()))
            print(f"[TTS] Found {len(self.voice_presets)} voice presets")
        else:
            print(f"[TTS] Warning: voice dir not found at {voices_dir}")

        self.default_voice_key = DEFAULT_VOICE if DEFAULT_VOICE in self.voice_presets else (
            next(iter(self.voice_presets)) if self.voice_presets else None
        )
        if self.default_voice_key:
            self._ensure_voice_cached(self.default_voice_key)
        print("[TTS] Ready")

    def _ensure_voice_cached(self, key: str) -> Any:
        if key not in self.voice_presets:
            raise RuntimeError(f"Voice preset {key!r} not found")
        if key not in self._voice_cache:
            path = self.voice_presets[key]
            print(f"[TTS] Loading voice preset: {key}")
            self._voice_cache[key] = torch.load(path, map_location=self._torch_device, weights_only=False)
        return self._voice_cache[key]

    def _prepare_inputs(self, text: str, prefilled: Any) -> Dict:
        processed = self.processor.process_input_with_cached_prompt(
            text=text.strip(),
            cached_prompt=prefilled,
            padding=True,
            return_tensors="pt",
            return_attention_mask=True,
        )
        return {k: v.to(self._torch_device) if hasattr(v, "to") else v for k, v in processed.items()}

    def stream(
        self,
        text: str,
        voice_key: Optional[str] = None,
        cfg_scale: float = 1.5,
        do_sample: bool = False,
        temperature: float = 0.9,
        top_p: float = 0.9,
    ) -> Iterator[np.ndarray]:
        """Generate audio chunks from text. Yields float32 numpy arrays."""
        if not text.strip():
            return

        key = voice_key if voice_key and voice_key in self.voice_presets else self.default_voice_key
        if not key:
            raise RuntimeError("No voice preset available")

        prefilled = self._ensure_voice_cached(key)
        inputs = self._prepare_inputs(text.replace("\u2019", "'"), prefilled)
        audio_streamer = AudioStreamer(batch_size=1, stop_signal=None, timeout=None)
        errors: list = []
        stop_event = threading.Event()

        def run_gen():
            try:
                self.model.generate(
                    **inputs,
                    max_new_tokens=None,
                    cfg_scale=cfg_scale,
                    tokenizer=self.processor.tokenizer,
                    generation_config={"do_sample": do_sample, "temperature": temperature, "top_p": top_p},
                    audio_streamer=audio_streamer,
                    stop_check_fn=stop_event.is_set,
                    verbose=False,
                    refresh_negative=True,
                    all_prefilled_outputs=copy.deepcopy(prefilled),
                )
            except Exception as exc:
                errors.append(exc)
                traceback.print_exc()
                audio_streamer.end()

        thread = threading.Thread(target=run_gen, daemon=True)
        thread.start()

        try:
            stream = audio_streamer.get_stream(0)
            for chunk in stream:
                if torch.is_tensor(chunk):
                    chunk = chunk.detach().cpu().to(torch.float32).numpy()
                else:
                    chunk = np.asarray(chunk, dtype=np.float32)
                if chunk.ndim > 1:
                    chunk = chunk.reshape(-1)
                peak = np.max(np.abs(chunk)) if chunk.size else 0.0
                if peak > 1.0:
                    chunk = chunk / peak
                yield chunk.astype(np.float32, copy=False)
        finally:
            stop_event.set()
            audio_streamer.end()
            thread.join()
            if errors:
                raise errors[0]

    @staticmethod
    def to_pcm16(chunk: np.ndarray) -> bytes:
        return (np.clip(chunk, -1.0, 1.0) * 32767.0).astype(np.int16).tobytes()


# ---------------------------------------------------------------------------
# ASR Service (optional — requires heavy model download)
# ---------------------------------------------------------------------------
class ASRService:
    """Speech-to-text using VibeVoice-ASR-7B."""

    def __init__(self, model_path: str, device: str = "mps"):
        self.model_path = model_path
        self.device = device
        self.processor = None
        self.model = None

    def load(self) -> None:
        if not ASR_AVAILABLE:
            print("[ASR] Modules not available — skipping load")
            return
        print(f"[ASR] Loading from {self.model_path}")
        dtype = torch.float32 if self.device in ("mps", "cpu") else torch.bfloat16
        attn = "sdpa" if self.device != "cuda" else "flash_attention_2"

        self.processor = VibeVoiceASRProcessor.from_pretrained(
            self.model_path,
            language_model_pretrained_name="Qwen/Qwen2.5-7B",
        )
        self.model = VibeVoiceASRForConditionalGeneration.from_pretrained(
            self.model_path,
            dtype=dtype,
            device_map=self.device if self.device == "auto" else None,
            attn_implementation=attn,
            trust_remote_code=True,
        )
        if self.device != "auto":
            self.model = self.model.to(self.device)
        self.model.eval()
        print("[ASR] Ready")

    def transcribe(self, audio_bytes: bytes, language: str = "en", hotwords: str = "") -> Dict[str, Any]:
        """Transcribe audio bytes to structured text."""
        if not self.model or not self.processor:
            raise RuntimeError("ASR model not loaded")

        import librosa

        # Load audio
        audio, sr = librosa.load(io.BytesIO(audio_bytes), sr=16000, mono=True)

        # Build prompt
        prompt = f"<|startoftranscript|><|{language}|>"
        if hotwords:
            prompt += f"<|hotwords|>{hotwords}"
        prompt += "<|transcribe|><|notimestamps|>"

        inputs = self.processor(
            audio=audio,
            text=prompt,
            sampling_rate=16000,
            return_tensors="pt",
        )
        inputs = {k: v.to(self.model.device) if hasattr(v, "to") else v for k, v in inputs.items()}

        gen_config = {
            "max_new_tokens": 512,
            "do_sample": False,
            "pad_token_id": self.processor.pad_id,
            "eos_token_id": self.processor.tokenizer.eos_token_id,
        }

        with torch.no_grad():
            output_ids = self.model.generate(**inputs, **gen_config)

        # Decode
        text = self.processor.tokenizer.decode(output_ids[0], skip_special_tokens=True)
        return {"text": text.strip(), "language": language}


# ---------------------------------------------------------------------------
# Service instances (initialized at startup)
# ---------------------------------------------------------------------------
tts_service: Optional[TTSService] = None
asr_service: Optional[ASRService] = None


# ---------------------------------------------------------------------------
# REST Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "tts_loaded": tts_service is not None and tts_service.model is not None,
        "asr_loaded": asr_service is not None and asr_service.model is not None,
        "asr_available": ASR_AVAILABLE,
        "device": tts_service.device if tts_service else "unknown",
        "voices": list(tts_service.voice_presets.keys()) if tts_service else [],
        "sample_rate": SAMPLE_RATE,
    }


@app.get("/voices")
async def list_voices():
    if not tts_service:
        raise HTTPException(503, "TTS not loaded")
    voices = []
    for name in tts_service.voice_presets:
        parts = name.split("-", 1)
        lang = parts[0] if len(parts) > 1 else "en"
        label = parts[1] if len(parts) > 1 else name
        gender = "male" if "_man" in name else "female" if "_woman" in name else "unknown"
        voices.append({"id": name, "language": lang, "label": label, "gender": gender})
    return {"voices": voices, "default": tts_service.default_voice_key}


@app.post("/tts")
async def synthesize(
    text: str = Form(...),
    voice: str = Form(DEFAULT_VOICE),
    format: str = Form("pcm16"),
):
    """Synthesize text to audio. Returns raw PCM16 at 24kHz or WAV."""
    if not tts_service or not tts_service.model:
        raise HTTPException(503, "TTS model not loaded")

    if len(text) > 10000:
        raise HTTPException(400, "Text too long (max 10,000 chars)")

    def generate_audio():
        for chunk in tts_service.stream(text, voice_key=voice):
            yield tts_service.to_pcm16(chunk)

    if format == "wav":
        # Collect all chunks and wrap in WAV
        import wave
        buf = io.BytesIO()
        all_pcm = b"".join(tts_service.to_pcm16(c) for c in tts_service.stream(text, voice_key=voice))
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(SAMPLE_RATE)
            wf.writeframes(all_pcm)
        buf.seek(0)
        return StreamingResponse(buf, media_type="audio/wav")

    return StreamingResponse(generate_audio(), media_type="application/octet-stream")


@app.post("/asr")
async def transcribe(
    audio: UploadFile = File(...),
    language: str = Form("en"),
    hotwords: str = Form(""),
):
    """Transcribe an audio file to text."""
    if not asr_service or not asr_service.model:
        # Fallback: return a helpful message instead of 503
        raise HTTPException(
            503,
            "ASR model not loaded. VibeVoice-ASR-7B requires significant GPU memory. "
            "Use Web Speech API as fallback for real-time ASR."
        )

    audio_bytes = await audio.read()
    if len(audio_bytes) > 100 * 1024 * 1024:  # 100MB limit
        raise HTTPException(400, "Audio file too large (max 100MB)")

    result = await asyncio.to_thread(
        asr_service.transcribe, audio_bytes, language, hotwords
    )
    return result


# ---------------------------------------------------------------------------
# WebSocket TTS streaming
# ---------------------------------------------------------------------------
@app.websocket("/ws/tts")
async def ws_tts(ws: WebSocket):
    """WebSocket endpoint for streaming TTS. Send JSON with {text, voice}, receive PCM16 chunks."""
    await ws.accept()

    if not tts_service or not tts_service.model:
        await ws.send_json({"type": "error", "message": "TTS not loaded"})
        await ws.close(1011)
        return

    try:
        while True:
            data = await ws.receive_json()
            text = data.get("text", "")
            voice = data.get("voice", tts_service.default_voice_key)

            if not text.strip():
                await ws.send_json({"type": "error", "message": "Empty text"})
                continue

            await ws.send_json({"type": "start", "sample_rate": SAMPLE_RATE, "voice": voice})

            stop_event = threading.Event()
            chunk_count = 0
            total_samples = 0

            try:
                for chunk in tts_service.stream(text, voice_key=voice):
                    if ws.client_state != WebSocketState.CONNECTED:
                        stop_event.set()
                        break
                    pcm = tts_service.to_pcm16(chunk)
                    await ws.send_bytes(pcm)
                    chunk_count += 1
                    total_samples += chunk.size
            except Exception as e:
                await ws.send_json({"type": "error", "message": str(e)})

            duration_sec = total_samples / SAMPLE_RATE if total_samples else 0
            await ws.send_json({
                "type": "end",
                "chunks": chunk_count,
                "duration_sec": round(duration_sec, 2),
            })

    except WebSocketDisconnect:
        print("[WS-TTS] Client disconnected")
    except Exception as e:
        print(f"[WS-TTS] Error: {e}")
        traceback.print_exc()


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
def parse_args():
    parser = argparse.ArgumentParser(description="VibeVoice Microservice")
    parser.add_argument("--tts-model", default="microsoft/VibeVoice-Realtime-0.5B", help="TTS model path or HF repo")
    parser.add_argument("--asr-model", default="microsoft/VibeVoice-ASR", help="ASR model path or HF repo")
    parser.add_argument("--device", default="mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu"))
    parser.add_argument("--port", type=int, default=3001)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--no-asr", action="store_true", help="Skip loading ASR model (saves memory)")
    parser.add_argument("--tts-steps", type=int, default=5, help="Diffusion inference steps for TTS")
    return parser.parse_args()


@app.on_event("startup")
async def startup():
    global tts_service, asr_service
    # Args come from environment when launched via uvicorn
    device = os.environ.get("VV_DEVICE", "mps" if torch.backends.mps.is_available() else "cpu")
    tts_model = os.environ.get("VV_TTS_MODEL", "microsoft/VibeVoice-Realtime-0.5B")
    asr_model = os.environ.get("VV_ASR_MODEL", "microsoft/VibeVoice-ASR")
    no_asr = os.environ.get("VV_NO_ASR", "true").lower() in ("true", "1", "yes")
    tts_steps = int(os.environ.get("VV_TTS_STEPS", "5"))

    tts_service = TTSService(tts_model, device=device, inference_steps=tts_steps)
    tts_service.load()

    if not no_asr and ASR_AVAILABLE:
        asr_service = ASRService(asr_model, device=device)
        asr_service.load()
    else:
        print("[startup] ASR disabled (--no-asr or modules unavailable)")


if __name__ == "__main__":
    import uvicorn

    args = parse_args()
    os.environ["VV_DEVICE"] = args.device
    os.environ["VV_TTS_MODEL"] = args.tts_model
    os.environ["VV_ASR_MODEL"] = args.asr_model
    os.environ["VV_NO_ASR"] = "true" if args.no_asr else "false"
    os.environ["VV_TTS_STEPS"] = str(args.tts_steps)

    print(f"[vibevoice-server] Starting on {args.host}:{args.port}")
    print(f"[vibevoice-server] Device: {args.device}")
    print(f"[vibevoice-server] TTS Model: {args.tts_model}")
    print(f"[vibevoice-server] ASR: {'disabled' if args.no_asr else args.asr_model}")

    uvicorn.run(app, host=args.host, port=args.port, log_level="info")
