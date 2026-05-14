/**
 * useVibeVoice — React hook for VibeVoice voice interaction
 * SRE AgenticOps Intelligence Dashboard v2.0
 *
 * Provides:
 *   - WebSocket streaming TTS (real-time audio playback)
 *   - Full conversation pipeline (text → NLP → LLM → streamed speech)
 *   - ASR via Web Speech API (with VibeVoice ASR fallback when available)
 *   - Voice state management (idle/listening/processing/speaking)
 *   - Voice preset selection
 *   - Interrupt capability (stop speaking mid-stream)
 *
 * @version 1.0.0
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VoicePhase = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export interface VibeVoiceState {
  phase: VoicePhase;
  transcript: string;
  interimTranscript: string;
  responseText: string;
  error: string | null;
  connected: boolean;
  vibeVoiceAvailable: boolean;
  currentVoice: string;
  audioLevel: number;
}

export interface VoicePreset {
  id: string;
  language: string;
  label: string;
  gender: 'male' | 'female' | 'unknown';
}

export interface VibeVoiceOptions {
  sessionId: string;
  voice?: string;
  autoSpeak?: boolean;
  enableVibeVoiceTTS?: boolean;
  dashboardData?: any;
  onTranscript?: (text: string) => void;
  onResponse?: (text: string, metadata?: any) => void;
  onSpeakingStart?: () => void;
  onSpeakingEnd?: () => void;
  onError?: (error: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WS_RECONNECT_DELAY = 3000;
const WS_MAX_RECONNECTS = 5;
const SAMPLE_RATE = 24_000;
const TTS_HEALTH_CHECK_INTERVAL = 30_000;
const HEALTH_CHECK_TIMEOUT_MS = 3000;

// Detect static hosting (GitHub Pages) — skip backend calls entirely
const isStaticHosting = (): boolean => {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h.includes('github.') || h.includes('.github.io') || h.includes('pages.');
};

// Built-in voice presets — used when the VibeVoice Python microservice is unreachable
const BUILTIN_VOICE_PRESETS: VoicePreset[] = [
  { id: 'en-Carter_man', language: 'en', label: 'Carter', gender: 'male' },
  { id: 'en-Aria_woman', language: 'en', label: 'Aria', gender: 'female' },
  { id: 'en-James_man', language: 'en', label: 'James', gender: 'male' },
  { id: 'en-Sophia_woman', language: 'en', label: 'Sophia', gender: 'female' },
  { id: 'en-David_man', language: 'en', label: 'David', gender: 'male' },
  { id: 'en-Emily_woman', language: 'en', label: 'Emily', gender: 'female' },
];

// ---------------------------------------------------------------------------
// Audio Playback Manager
// ---------------------------------------------------------------------------

class AudioStreamPlayer {
  private audioContext: AudioContext | null = null;
  private nextPlayTime = 0;
  private playing = false;
  private onEnd: (() => void) | null = null;
  private scheduledBuffers = 0;
  private playedBuffers = 0;

  async init() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this.nextPlayTime = this.audioContext.currentTime;
    this.scheduledBuffers = 0;
    this.playedBuffers = 0;
    this.playing = true;
  }

  scheduleChunk(pcm16Data: ArrayBuffer) {
    if (!this.audioContext || !this.playing) return;

    const int16 = new Int16Array(pcm16Data);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    const buffer = this.audioContext.createBuffer(1, float32.length, SAMPLE_RATE);
    buffer.copyToChannel(float32, 0);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    const startTime = Math.max(this.nextPlayTime, this.audioContext.currentTime);
    source.start(startTime);
    this.nextPlayTime = startTime + buffer.duration;
    this.scheduledBuffers++;

    source.onended = () => {
      this.playedBuffers++;
      if (this.playedBuffers >= this.scheduledBuffers && !this.playing) {
        this.onEnd?.();
      }
    };
  }

  markStreamEnd(callback: () => void) {
    this.playing = false;
    this.onEnd = callback;
    // If all scheduled buffers already played
    if (this.playedBuffers >= this.scheduledBuffers) {
      callback();
    }
  }

  stop() {
    this.playing = false;
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }
    this.audioContext = null;
    this.onEnd?.();
  }

  getAudioLevel(): number {
    if (!this.audioContext || !this.playing) return 0;
    const elapsed = this.audioContext.currentTime;
    return elapsed < this.nextPlayTime ? 0.4 + Math.random() * 0.6 : 0;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVibeVoice(options: VibeVoiceOptions) {
  const {
    sessionId,
    voice: initialVoice = 'en-Carter_man',
    autoSpeak = true,
    enableVibeVoiceTTS = true,
    dashboardData,
    onTranscript,
    onResponse,
    onSpeakingStart,
    onSpeakingEnd,
    onError,
  } = options;

  const [state, setState] = useState<VibeVoiceState>({
    phase: 'idle',
    transcript: '',
    interimTranscript: '',
    responseText: '',
    error: null,
    connected: false,
    vibeVoiceAvailable: false,
    currentVoice: initialVoice,
    audioLevel: 0,
  });

  const [voices, setVoices] = useState<VoicePreset[]>(isStaticHosting() ? BUILTIN_VOICE_PRESETS : []);

  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);
  const playerRef = useRef(new AudioStreamPlayer());
  const reconnectCount = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const audioLevelTimer = useRef<ReturnType<typeof setTimeout>>();

  // Store mutable callbacks in refs so connectWS stays stable across renders.
  // This prevents the WebSocket from being torn down and re-created every time
  // the parent component re-renders with new inline callback references.
  const onResponseRef      = useRef(onResponse);
  const onSpeakingStartRef = useRef(onSpeakingStart);
  const onSpeakingEndRef   = useRef(onSpeakingEnd);
  const onErrorRef         = useRef(onError);
  useEffect(() => { onResponseRef.current      = onResponse;      });
  useEffect(() => { onSpeakingStartRef.current = onSpeakingStart; });
  useEffect(() => { onSpeakingEndRef.current   = onSpeakingEnd;   });
  useEffect(() => { onErrorRef.current         = onError;         });

  // -------------------------------------------------------------------------
  // WebSocket connection
  // -------------------------------------------------------------------------

  const connectWS = useCallback(() => {
    // Guard against duplicate connections (OPEN or still CONNECTING).
    // Without the CONNECTING check the cleanup from a previous effect run can
    // close a socket that hasn't finished opening yet, which produces
    // "WebSocket is closed before the connection is established" in the console.
    const rs = wsRef.current?.readyState;
    if (rs === WebSocket.OPEN || rs === WebSocket.CONNECTING) return;
    if (!enableVibeVoiceTTS) return;
    if (isStaticHosting()) return; // No WebSocket on GitHub Pages

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/voice`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[VibeVoice] WebSocket connected');
        reconnectCount.current = 0;
        setState(prev => ({ ...prev, connected: true }));
      };

      ws.onmessage = async (event) => {
        if (event.data instanceof Blob) {
          // Binary PCM16 audio chunk
          const arrayBuffer = await event.data.arrayBuffer();
          playerRef.current.scheduleChunk(arrayBuffer);
        } else {
          // JSON control message
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'tts_start':
              await playerRef.current.init();
              setState(prev => ({ ...prev, phase: 'speaking' }));
              onSpeakingStartRef.current?.();

              // Start audio level polling
              audioLevelTimer.current = setInterval(() => {
                setState(prev => ({
                  ...prev,
                  audioLevel: playerRef.current.getAudioLevel(),
                }));
              }, 50);
              break;

            case 'tts_end':
              playerRef.current.markStreamEnd(() => {
                clearInterval(audioLevelTimer.current);
                setState(prev => ({ ...prev, phase: 'idle', audioLevel: 0 }));
                onSpeakingEndRef.current?.();
              });
              break;

            case 'response':
              setState(prev => ({ ...prev, responseText: msg.text }));
              onResponseRef.current?.(msg.text, msg.metadata);
              break;

            case 'state':
              if (msg.phase) {
                setState(prev => ({ ...prev, phase: msg.phase }));
              }
              break;

            case 'error':
              console.error('[VibeVoice] Server error:', msg.message);
              setState(prev => ({ ...prev, error: msg.message, phase: 'idle' }));
              onErrorRef.current?.(msg.message);
              break;

            case 'pong':
              break;
          }
        }
      };

      ws.onclose = () => {
        setState(prev => ({ ...prev, connected: false }));
        if (reconnectCount.current < WS_MAX_RECONNECTS) {
          reconnectCount.current++;
          reconnectTimer.current = setTimeout(connectWS, WS_RECONNECT_DELAY);
        }
      };

      ws.onerror = () => {
        console.warn('[VibeVoice] WebSocket error');
      };
    } catch {
      console.warn('[VibeVoice] Failed to create WebSocket');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableVibeVoiceTTS]); // callbacks accessed via refs – intentionally excluded

  // -------------------------------------------------------------------------
  // Check VibeVoice availability & load voices
  // -------------------------------------------------------------------------

  useEffect(() => {
    // Skip backend health/voice polling on static hosting (GitHub Pages)
    if (isStaticHosting()) return;
    let cancelled = false;

    const check = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
        const res = await fetch('/api/voice/health', { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error('not ok');
        const health = await res.json();
        if (!cancelled) {
          setState(prev => ({
            ...prev,
            vibeVoiceAvailable: health.healthy && health.ttsAvailable,
          }));
        }
      } catch {
        if (!cancelled) {
          setState(prev => ({ ...prev, vibeVoiceAvailable: false }));
        }
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
        const res = await fetch('/api/voice/voices', { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            const fetchedVoices = data.voices || [];
            setVoices(fetchedVoices.length > 0 ? fetchedVoices : BUILTIN_VOICE_PRESETS);
            if (data.default) {
              setState(prev => ({ ...prev, currentVoice: data.default }));
            }
          }
        } else if (!cancelled) {
          setVoices(BUILTIN_VOICE_PRESETS);
        }
      } catch {
        // Voices fetch failed — use built-in presets for UI display
        if (!cancelled) {
          setVoices(prev => prev.length > 0 ? prev : BUILTIN_VOICE_PRESETS);
        }
      }
    };

    check();
    const interval = setInterval(check, TTS_HEALTH_CHECK_INTERVAL);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Connect WebSocket
  useEffect(() => {
    if (enableVibeVoiceTTS) {
      connectWS();
    }
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connectWS, enableVibeVoiceTTS]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearInterval(audioLevelTimer.current);
      playerRef.current.stop();
    };
  }, []);

  // -------------------------------------------------------------------------
  // ASR — Speech-to-Text (Web Speech API with VibeVoice fallback intent)
  // -------------------------------------------------------------------------

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setState(prev => ({ ...prev, error: 'Speech recognition not supported' }));
      return;
    }

    // Stop any ongoing speech first
    playerRef.current.stop();

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setState(prev => ({
        ...prev,
        phase: 'listening',
        transcript: '',
        interimTranscript: '',
        error: null,
      }));
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setState(prev => ({
        ...prev,
        transcript: final || prev.transcript,
        interimTranscript: interim,
      }));
    };

    recognition.onend = () => {
      const finalTranscript = state.transcript || state.interimTranscript;
      setState(prev => ({
        ...prev,
        phase: finalTranscript ? 'processing' : 'idle',
        transcript: finalTranscript || prev.transcript,
        interimTranscript: '',
      }));

      if (finalTranscript) {
        onTranscript?.(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[VibeVoice] Speech recognition error:', event.error);
      setState(prev => ({ ...prev, phase: 'idle', error: `ASR: ${event.error}` }));
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [state.transcript, state.interimTranscript, onTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  // -------------------------------------------------------------------------
  // Converse — Full pipeline via WebSocket
  // -------------------------------------------------------------------------

  const converse = useCallback((text: string) => {
    if (!text.trim()) return;

    // Try WebSocket streaming first (lower latency)
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setState(prev => ({ ...prev, phase: 'processing', transcript: text }));
      wsRef.current.send(JSON.stringify({
        type: 'converse',
        text,
        sessionId,
        voice: state.currentVoice,
        dashboardData,
      }));
      return;
    }

    // Fallback: REST API
    setState(prev => ({ ...prev, phase: 'processing', transcript: text }));
    fetch('/api/voice/converse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        sessionId,
        voice: state.currentVoice,
        enableTTS: autoSpeak,
        dashboardData,
      }),
    })
      .then(res => res.json())
      .then(data => {
        setState(prev => ({ ...prev, responseText: data.response?.text || '', phase: 'idle' }));
        onResponse?.(data.response?.text, data.response?.metadata);

        // Play audio if available
        if (data.audio?.data) {
          playBase64Audio(data.audio.data, data.audio.sampleRate || SAMPLE_RATE);
        }
      })
      .catch(err => {
        setState(prev => ({ ...prev, phase: 'idle', error: err.message }));
        onError?.(err.message);
      });
  }, [sessionId, state.currentVoice, autoSpeak, dashboardData, onResponse, onError]);

  // -------------------------------------------------------------------------
  // TTS — Speak text (standalone, not tied to conversation)
  // -------------------------------------------------------------------------

  const speak = useCallback((text: string, voice?: string) => {
    if (!text.trim()) return;

    const selectedVoice = voice || state.currentVoice;

    // Try WebSocket streaming
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'tts',
        text,
        voice: selectedVoice,
      }));
      return;
    }

    // Fallback: REST TTS → play audio
    fetch('/api/voice/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: selectedVoice, format: 'wav' }),
    })
      .then(res => {
        if (!res.ok) throw new Error('TTS failed');
        return res.arrayBuffer();
      })
      .then(buffer => {
        playAudioBuffer(buffer);
      })
      .catch(() => {
        // Final fallback: browser speech synthesis
        fallbackSpeak(text);
      });
  }, [state.currentVoice]);

  // -------------------------------------------------------------------------
  // Stop — Interrupt speaking
  // -------------------------------------------------------------------------

  const stop = useCallback(() => {
    playerRef.current.stop();
    recognitionRef.current?.stop();
    clearInterval(audioLevelTimer.current);
    window.speechSynthesis?.cancel();
    setState(prev => ({ ...prev, phase: 'idle', audioLevel: 0 }));
    onSpeakingEnd?.();
  }, [onSpeakingEnd]);

  // -------------------------------------------------------------------------
  // Voice selection
  // -------------------------------------------------------------------------

  const setVoice = useCallback((voiceId: string) => {
    setState(prev => ({ ...prev, currentVoice: voiceId }));
  }, []);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function playBase64Audio(base64: string, sampleRate: number) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    playAudioBuffer(bytes.buffer);
  }

  function playAudioBuffer(buffer: ArrayBuffer) {
    const audio = new Audio();
    audio.src = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
    setState(prev => ({ ...prev, phase: 'speaking' }));
    onSpeakingStart?.();
    audio.onended = () => {
      setState(prev => ({ ...prev, phase: 'idle' }));
      onSpeakingEnd?.();
    };
    audio.play().catch(() => {
      setState(prev => ({ ...prev, phase: 'idle' }));
    });
  }

  function fallbackSpeak(text: string) {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    setState(prev => ({ ...prev, phase: 'speaking' }));
    onSpeakingStart?.();
    utterance.onend = () => {
      setState(prev => ({ ...prev, phase: 'idle' }));
      onSpeakingEnd?.();
    };
    window.speechSynthesis.speak(utterance);
  }

  return {
    state,
    voices,
    startListening,
    stopListening,
    converse,
    speak,
    stop,
    setVoice,
  };
}
