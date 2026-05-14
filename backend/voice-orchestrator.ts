/**
 * Unified Voice Orchestrator — VibeVoice Integration Layer
 * SRE AgenticOps Intelligence Dashboard v2.0
 *
 * Single entry point for the full voice pipeline:
 *   Audio/Text Input → ASR → NLP → LLM → TTS → Audio/Text Output
 *
 * Connects the Express backend to the VibeVoice Python microservice
 * and unifies the fragmented voice services (VoiceAIService,
 * EnhancedVoiceAIService, VoiceSynthesisService) under one contract.
 *
 * @version 1.0.0
 */

import { processMessage, ChatbotResponse } from './chatbot-service';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const VIBEVOICE_URL = process.env.VIBEVOICE_URL || 'http://127.0.0.1:3001';
const VIBEVOICE_WS_URL = process.env.VIBEVOICE_WS_URL || 'ws://127.0.0.1:3001';
const ASR_FALLBACK_ENABLED = true; // Allow Web Speech API fallback when ASR model unavailable
const TTS_TIMEOUT_MS = 30_000;
const ASR_TIMEOUT_MS = 60_000;
const SAMPLE_RATE = 24_000; // VibeVoice Realtime output rate

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VoiceState {
  phase: 'idle' | 'listening' | 'processing' | 'speaking';
  transcript?: string;
  response?: string;
  progress?: number;
  error?: string;
}

export interface VoiceConfig {
  voice: string;
  language: string;
  autoSpeak: boolean;
  responseStyle: 'concise' | 'detailed' | 'technical' | 'executive';
  enableASR: boolean;
  enableTTS: boolean;
}

export interface VoicePreset {
  id: string;
  language: string;
  label: string;
  gender: 'male' | 'female' | 'unknown';
}

export interface ASRResult {
  text: string;
  language: string;
  source: 'vibevoice' | 'web-speech-api' | 'text-input';
  confidence?: number;
  processingTimeMs: number;
}

export interface TTSResult {
  audioChunks: Buffer[];
  totalSamples: number;
  durationSec: number;
  voice: string;
  processingTimeMs: number;
}

export interface VoiceOrchestratorStatus {
  healthy: boolean;
  vibeVoiceConnected: boolean;
  ttsAvailable: boolean;
  asrAvailable: boolean;
  device: string;
  voices: VoicePreset[];
  defaultVoice: string;
  sampleRate: number;
  uptime: number;
}

export interface ConversationTurn {
  id: string;
  inputType: 'voice' | 'text';
  inputText: string;
  asrResult?: ASRResult;
  chatbotResponse: ChatbotResponse;
  ttsResult?: TTSResult;
  totalLatencyMs: number;
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Voice Orchestrator
// ---------------------------------------------------------------------------

class VoiceOrchestrator {
  private startTime = Date.now();
  private cachedVoices: VoicePreset[] = [];
  private defaultVoice = 'en-Carter_man';
  private connected = false;
  private lastHealthCheck = 0;
  private healthCacheMs = 5000;
  private metrics = {
    totalConversations: 0,
    totalASRRequests: 0,
    totalTTSRequests: 0,
    avgASRLatencyMs: 0,
    avgTTSLatencyMs: 0,
    avgE2ELatencyMs: 0,
    errors: 0,
  };

  // -------------------------------------------------------------------------
  // Health & Discovery
  // -------------------------------------------------------------------------

  /**
   * Check if the VibeVoice microservice is reachable and ready.
   */
  async checkHealth(): Promise<VoiceOrchestratorStatus> {
    const now = Date.now();
    if (now - this.lastHealthCheck < this.healthCacheMs && this.connected) {
      return this.buildStatus(true);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${VIBEVOICE_URL}/health`, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as any;

      this.connected = true;
      this.lastHealthCheck = now;

      // Cache voices
      if (data.voices?.length) {
        this.cachedVoices = data.voices.map((v: string) => {
          const parts = v.split('-');
          const lang = parts[0] || 'en';
          const label = parts.slice(1).join('-') || v;
          const gender = v.includes('_man') ? 'male' as const : v.includes('_woman') ? 'female' as const : 'unknown' as const;
          return { id: v, language: lang, label, gender };
        });
      }

      return {
        healthy: true,
        vibeVoiceConnected: true,
        ttsAvailable: data.tts_loaded ?? false,
        asrAvailable: data.asr_loaded ?? false,
        device: data.device ?? 'unknown',
        voices: this.cachedVoices,
        defaultVoice: this.defaultVoice,
        sampleRate: SAMPLE_RATE,
        uptime: now - this.startTime,
      };
    } catch (err) {
      this.connected = false;
      return this.buildStatus(false);
    }
  }

  private buildStatus(healthy: boolean): VoiceOrchestratorStatus {
    return {
      healthy,
      vibeVoiceConnected: this.connected,
      ttsAvailable: this.connected,
      asrAvailable: false, // ASR-7B heavy, default off
      device: 'unknown',
      voices: this.cachedVoices,
      defaultVoice: this.defaultVoice,
      sampleRate: SAMPLE_RATE,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Fetch available voice presets from VibeVoice.
   */
  async getVoices(): Promise<{ voices: VoicePreset[]; default: string }> {
    try {
      const res = await fetch(`${VIBEVOICE_URL}/voices`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as any;
      this.cachedVoices = data.voices ?? [];
      this.defaultVoice = data.default ?? 'en-Carter_man';
      return { voices: this.cachedVoices, default: this.defaultVoice };
    } catch {
      return { voices: this.cachedVoices, default: this.defaultVoice };
    }
  }

  // -------------------------------------------------------------------------
  // ASR — Speech-to-Text
  // -------------------------------------------------------------------------

  /**
   * Transcribe audio using VibeVoice-ASR.
   * Falls back gracefully if ASR model unavailable (client uses Web Speech API).
   */
  async transcribe(
    audioBuffer: Buffer,
    language: string = 'en',
    hotwords: string = '',
  ): Promise<ASRResult> {
    const start = Date.now();
    this.metrics.totalASRRequests++;

    try {
      const formData = new FormData();
      formData.append('audio', new Blob([audioBuffer]), 'audio.wav');
      formData.append('language', language);
      formData.append('hotwords', hotwords);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), ASR_TIMEOUT_MS);

      const res = await fetch(`${VIBEVOICE_URL}/asr`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errBody.detail || `HTTP ${res.status}`);
      }

      const data = await res.json() as any;
      const elapsed = Date.now() - start;
      this.updateAvg('avgASRLatencyMs', elapsed);

      return {
        text: data.text,
        language: data.language || language,
        source: 'vibevoice',
        processingTimeMs: elapsed,
      };
    } catch (err: any) {
      const elapsed = Date.now() - start;
      this.metrics.errors++;
      console.warn(`[VoiceOrchestrator] ASR failed (${elapsed}ms):`, err.message);

      // Return empty result — frontend will use Web Speech API fallback
      return {
        text: '',
        language,
        source: 'web-speech-api',
        processingTimeMs: elapsed,
      };
    }
  }

  // -------------------------------------------------------------------------
  // TTS — Text-to-Speech
  // -------------------------------------------------------------------------

  /**
   * Synthesize text to audio using VibeVoice TTS.
   * Returns the full audio as a buffer (for HTTP response).
   */
  async synthesize(
    text: string,
    voice: string = this.defaultVoice,
    format: 'pcm16' | 'wav' = 'wav',
  ): Promise<{ audio: Buffer; contentType: string; durationSec: number }> {
    const start = Date.now();
    this.metrics.totalTTSRequests++;

    try {
      const formData = new URLSearchParams();
      formData.append('text', text);
      formData.append('voice', voice);
      formData.append('format', format);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

      const res = await fetch(`${VIBEVOICE_URL}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);

      const arrayBuf = await res.arrayBuffer();
      const audio = Buffer.from(arrayBuf);
      const elapsed = Date.now() - start;
      this.updateAvg('avgTTSLatencyMs', elapsed);

      const contentType = format === 'wav' ? 'audio/wav' : 'application/octet-stream';
      const samples = format === 'pcm16' ? audio.length / 2 : (audio.length - 44) / 2; // WAV header ~44 bytes
      const durationSec = Math.max(0, samples / SAMPLE_RATE);

      return { audio, contentType, durationSec };
    } catch (err: any) {
      this.metrics.errors++;
      console.error(`[VoiceOrchestrator] TTS failed:`, err.message);
      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // Full Pipeline: Audio → ASR → NLP → LLM → TTS → Audio
  // -------------------------------------------------------------------------

  /**
   * Execute the full voice-to-voice conversation turn.
   * Input can be audio (ASR path) or text (skip ASR).
   */
  async converse(
    input: { text?: string; audio?: Buffer },
    sessionId: string,
    config: Partial<VoiceConfig> = {},
    dashboardData?: any,
    stateCallback?: (state: VoiceState) => void,
  ): Promise<ConversationTurn> {
    const turnStart = Date.now();
    const turnId = `turn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const emit = (state: Partial<VoiceState>) => stateCallback?.({ phase: 'idle', ...state } as VoiceState);

    let asrResult: ASRResult | undefined;
    let inputText = input.text || '';

    // Phase 1: ASR (if audio input)
    if (input.audio && config.enableASR !== false) {
      emit({ phase: 'listening', progress: 0.1 });
      asrResult = await this.transcribe(input.audio, config.language || 'en');
      inputText = asrResult.text || inputText;
      emit({ phase: 'listening', transcript: inputText, progress: 0.3 });
    }

    if (!inputText.trim()) {
      return {
        id: turnId,
        inputType: input.audio ? 'voice' : 'text',
        inputText: '',
        asrResult,
        chatbotResponse: {
          text: "I didn't catch that. Could you repeat?",
          suggestedActions: [],
          relatedInsights: [],
        } as ChatbotResponse,
        totalLatencyMs: Date.now() - turnStart,
        timestamp: new Date(),
      };
    }

    // Phase 2: NLP + LLM Processing
    emit({ phase: 'processing', transcript: inputText, progress: 0.5 });

    const chatbotResponse = await processMessage(
      inputText,
      sessionId,
      input.audio ? 'voice' : 'text',
      dashboardData,
    );

    emit({ phase: 'processing', transcript: inputText, response: chatbotResponse.text, progress: 0.8 });

    // Phase 3: TTS (if enabled)
    let ttsResult: TTSResult | undefined;
    if (config.enableTTS !== false && config.autoSpeak !== false && chatbotResponse.text) {
      emit({ phase: 'speaking', response: chatbotResponse.text, progress: 0.9 });
      try {
        const { audio, durationSec } = await this.synthesize(
          chatbotResponse.text,
          config.voice || this.defaultVoice,
          'wav',
        );
        ttsResult = {
          audioChunks: [audio],
          totalSamples: (audio.length - 44) / 2,
          durationSec,
          voice: config.voice || this.defaultVoice,
          processingTimeMs: Date.now() - turnStart,
        };
      } catch {
        // TTS failure is non-fatal — text response still available
        console.warn('[VoiceOrchestrator] TTS failed, text-only response');
      }
    }

    emit({ phase: 'idle', response: chatbotResponse.text, progress: 1.0 });

    const totalLatency = Date.now() - turnStart;
    this.metrics.totalConversations++;
    this.updateAvg('avgE2ELatencyMs', totalLatency);

    return {
      id: turnId,
      inputType: input.audio ? 'voice' : 'text',
      inputText,
      asrResult,
      chatbotResponse,
      ttsResult,
      totalLatencyMs: totalLatency,
      timestamp: new Date(),
    };
  }

  // -------------------------------------------------------------------------
  // Streaming TTS (for WebSocket relay)
  // -------------------------------------------------------------------------

  /**
   * Create a streaming TTS connection to VibeVoice and relay chunks.
   * Used by the WebSocket handler in routes.ts.
   */
  async *streamTTS(
    text: string,
    voice: string = this.defaultVoice,
  ): AsyncGenerator<Buffer, void, unknown> {
    const WebSocket = (await import('ws')).default;

    const wsUrl = `${VIBEVOICE_WS_URL}/ws/tts`;
    const ws = new WebSocket(wsUrl);

    const chunks: Buffer[] = [];
    let done = false;
    let error: Error | null = null;

    const chunkPromises: Array<() => void> = [];
    let waitingForChunk: (() => void) | null = null;

    ws.on('open', () => {
      ws.send(JSON.stringify({ text, voice }));
    });

    ws.on('message', (data: Buffer | string) => {
      if (typeof data === 'string') {
        // JSON control message
        const msg = JSON.parse(data);
        if (msg.type === 'end') {
          done = true;
          if (waitingForChunk) waitingForChunk();
        } else if (msg.type === 'error') {
          error = new Error(msg.message);
          done = true;
          if (waitingForChunk) waitingForChunk();
        }
      } else {
        // Binary PCM16 audio chunk
        chunks.push(Buffer.from(data));
        if (waitingForChunk) waitingForChunk();
      }
    });

    ws.on('error', (err) => {
      error = err as Error;
      done = true;
      if (waitingForChunk) waitingForChunk();
    });

    ws.on('close', () => {
      done = true;
      if (waitingForChunk) waitingForChunk();
    });

    try {
      while (true) {
        if (chunks.length > 0) {
          yield chunks.shift()!;
          continue;
        }
        if (done) break;
        if (error) throw error;

        // Wait for next chunk
        await new Promise<void>((resolve) => {
          waitingForChunk = resolve;
        });
        waitingForChunk = null;
      }
    } finally {
      if (ws.readyState === WebSocket.OPEN) ws.close();
    }
  }

  // -------------------------------------------------------------------------
  // Metrics
  // -------------------------------------------------------------------------

  getMetrics() {
    return { ...this.metrics };
  }

  private updateAvg(key: 'avgASRLatencyMs' | 'avgTTSLatencyMs' | 'avgE2ELatencyMs', value: number) {
    const count = key === 'avgASRLatencyMs' ? this.metrics.totalASRRequests
      : key === 'avgTTSLatencyMs' ? this.metrics.totalTTSRequests
      : this.metrics.totalConversations;
    if (count <= 1) {
      this.metrics[key] = value;
    } else {
      this.metrics[key] = this.metrics[key] + (value - this.metrics[key]) / count;
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------
export const voiceOrchestrator = new VoiceOrchestrator();
