/**
 * Voice Orchestrator Routes — VibeVoice Integration API
 * SRE AgenticOps Intelligence Dashboard v2.0
 *
 * Provides REST + WebSocket endpoints for the unified voice pipeline:
 *   /api/voice/health      — Service status & available voices
 *   /api/voice/voices       — List voice presets
 *   /api/voice/converse     — Full voice-to-voice turn (audio/text in → audio/text out)
 *   /api/voice/tts          — Text-to-speech synthesis
 *   /api/voice/asr          — Speech-to-text transcription
 *   /api/voice/metrics      — Pipeline performance metrics
 *
 * WebSocket:
 *   Server attaches to httpServer upgrade event for /ws/voice path.
 *
 * @version 1.0.0
 */

import { Router, Request, Response } from 'express';
import { voiceOrchestrator, VoiceConfig } from './voice-orchestrator';

const router = Router();

// -------------------------------------------------------------------------
// GET /api/voice/health — VibeVoice microservice health
// -------------------------------------------------------------------------
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const status = await voiceOrchestrator.checkHealth();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ healthy: false, error: err.message });
  }
});

// -------------------------------------------------------------------------
// GET /api/voice/voices — Available voice presets
// -------------------------------------------------------------------------
router.get('/voices', async (_req: Request, res: Response) => {
  try {
    const voices = await voiceOrchestrator.getVoices();
    res.json(voices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------------------
// POST /api/voice/converse — Full conversation turn
// Body: { text?, sessionId, voice?, language?, responseStyle?, enableTTS? }
// Or multipart with 'audio' file field for voice input
// -------------------------------------------------------------------------
router.post('/converse', async (req: Request, res: Response) => {
  try {
    const { text, sessionId, voice, language, responseStyle, enableTTS, enableASR, dashboardData } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // Check for audio in raw body (sent as application/octet-stream from frontend)
    let audioBuffer: Buffer | undefined;
    if (req.headers['content-type']?.includes('application/octet-stream') && req.rawBody) {
      audioBuffer = Buffer.from(req.rawBody as ArrayBuffer);
    }

    if (!text && !audioBuffer) {
      return res.status(400).json({ error: 'Either text or audio input is required' });
    }

    const config: Partial<VoiceConfig> = {
      voice: voice || 'en-Carter_man',
      language: language || 'en',
      responseStyle: responseStyle || 'concise',
      enableTTS: enableTTS !== false,
      enableASR: enableASR !== false,
      autoSpeak: enableTTS !== false,
    };

    const turn = await voiceOrchestrator.converse(
      { text, audio: audioBuffer },
      sessionId,
      config,
      dashboardData,
    );

    // Build response
    const response: any = {
      id: turn.id,
      inputType: turn.inputType,
      inputText: turn.inputText,
      response: {
        text: turn.chatbotResponse.text,
        suggestedActions: turn.chatbotResponse.suggestedActions,
        relatedInsights: turn.chatbotResponse.relatedInsights,
        metadata: turn.chatbotResponse.metadata,
      },
      latency: {
        totalMs: turn.totalLatencyMs,
        asrMs: turn.asrResult?.processingTimeMs,
      },
      timestamp: turn.timestamp,
    };

    // Include audio if TTS was generated
    if (turn.ttsResult && turn.ttsResult.audioChunks.length > 0) {
      const audioBase64 = Buffer.concat(turn.ttsResult.audioChunks).toString('base64');
      response.audio = {
        data: audioBase64,
        format: 'wav',
        sampleRate: 24000,
        durationSec: turn.ttsResult.durationSec,
        voice: turn.ttsResult.voice,
      };
    }

    res.json(response);
  } catch (err: any) {
    console.error('[VoiceRoutes] Converse error:', err.message);
    res.status(500).json({ error: 'Voice conversation failed', message: err.message });
  }
});

// -------------------------------------------------------------------------
// POST /api/voice/tts — Text-to-speech only
// Body: { text, voice?, format? }
// -------------------------------------------------------------------------
router.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, voice, format } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    if (text.length > 10000) {
      return res.status(400).json({ error: 'Text too long (max 10,000 chars)' });
    }

    const result = await voiceOrchestrator.synthesize(
      text,
      voice || 'en-Carter_man',
      format === 'pcm16' ? 'pcm16' : 'wav',
    );

    res.set('Content-Type', result.contentType);
    res.set('X-Audio-Duration', String(result.durationSec));
    res.set('X-Sample-Rate', '24000');
    res.send(result.audio);
  } catch (err: any) {
    console.error('[VoiceRoutes] TTS error:', err.message);
    res.status(503).json({
      error: 'TTS synthesis failed',
      message: err.message,
      fallback: 'Use browser Web Speech API for TTS',
    });
  }
});

// -------------------------------------------------------------------------
// POST /api/voice/asr — Speech-to-text only
// Body: raw audio bytes (Content-Type: application/octet-stream)
// Query: ?language=en&hotwords=SRE,AgenticOps
// -------------------------------------------------------------------------
router.post('/asr', async (req: Request, res: Response) => {
  try {
    const language = (req.query.language as string) || 'en';
    const hotwords = (req.query.hotwords as string) || 'SRE,AgenticOps,Field Notice,Cisco';

    let audioBuffer: Buffer;
    if (req.rawBody) {
      audioBuffer = Buffer.from(req.rawBody as ArrayBuffer);
    } else {
      return res.status(400).json({ error: 'Audio data required (send as application/octet-stream)' });
    }

    const result = await voiceOrchestrator.transcribe(audioBuffer, language, hotwords);
    res.json(result);
  } catch (err: any) {
    console.error('[VoiceRoutes] ASR error:', err.message);
    res.status(503).json({
      error: 'ASR transcription failed',
      message: err.message,
      fallback: 'Use browser Web Speech API for speech recognition',
    });
  }
});

// -------------------------------------------------------------------------
// GET /api/voice/metrics — Pipeline performance metrics
// -------------------------------------------------------------------------
router.get('/metrics', (_req: Request, res: Response) => {
  res.json(voiceOrchestrator.getMetrics());
});

export default router;
