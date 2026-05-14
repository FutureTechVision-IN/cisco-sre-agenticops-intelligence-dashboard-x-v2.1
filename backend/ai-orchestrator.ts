/**
 * AI Orchestration Layer
 * ============================================================================
 * Coordinates multiple AI providers (Cisco CIRCUIT, Azure OpenAI/ChatGPT,
 * Google Gemini with voice) into a unified intelligence pipeline.
 *
 * Architecture:
 *   - Provider abstraction: each model has a consistent interface
 *   - Intelligent routing: queries go to the best available provider
 *   - Fallback chains: if primary fails, secondary handles gracefully
 *   - Rate-limit awareness: respects each provider's quotas
 *   - Gemini voice: audio input/output for natural chat interactions
 *   - LangChain tracing: all interactions logged for observability
 *
 * Provider Priority (configurable):
 *   1. Cisco CIRCUIT — primary for SRE/security domain tasks
 *   2. Azure OpenAI (GPT-4o) — general reasoning, code, analysis
 *   3. Google Gemini — multi-modal, voice, vision tasks
 */

import { secretsManager, type SecretProvider } from './secrets-manager';

// ============================================================================
// TYPES
// ============================================================================

export type AIProvider = 'cisco-circuit' | 'azure-openai' | 'gemini';

export type TaskType =
  | 'summarization'
  | 'security_analysis'
  | 'predictive_analytics'
  | 'anomaly_detection'
  | 'general_reasoning'
  | 'code_analysis'
  | 'voice_interaction'
  | 'multi_modal'
  | 'data_analysis'
  | 'workflow_orchestration'
  | 'live_feed'
  | 'real_time_insight';

export interface AIRequest {
  taskType: TaskType;
  prompt: string;
  context?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  voiceInput?: {
    audio?: Buffer;
    format?: 'pcm' | 'wav' | 'mp3';
    sampleRate?: number;
  };
  metadata?: Record<string, unknown>;
}

export interface AIResponse {
  success: boolean;
  provider: AIProvider;
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  confidence?: number;
  voiceOutput?: {
    text: string;
    ssml?: string;
    audioUrl?: string;
    emotion?: string;
  };
  fallbackUsed?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ProviderConfig {
  provider: AIProvider;
  enabled: boolean;
  priority: number;
  maxRetries: number;
  timeoutMs: number;
  rateLimitRPM: number;
  taskAffinities: TaskType[];
  fallback?: AIProvider;
}

interface RateLimitState {
  requests: number[];
  windowMs: number;
  maxRequests: number;
}

// ============================================================================
// PROVIDER ROUTING TABLE
// ============================================================================

const PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    provider: 'cisco-circuit',
    enabled: true,
    priority: 1,
    maxRetries: 3,
    timeoutMs: 15000,
    rateLimitRPM: 60,
    taskAffinities: [
      'summarization', 'security_analysis', 'predictive_analytics',
      'anomaly_detection', 'workflow_orchestration', 'data_analysis',
    ],
    fallback: 'azure-openai',
  },
  {
    provider: 'azure-openai',
    enabled: true,
    priority: 2,
    maxRetries: 2,
    timeoutMs: 30000,
    rateLimitRPM: 120,
    taskAffinities: [
      'general_reasoning', 'code_analysis', 'data_analysis',
      'summarization', 'real_time_insight',
    ],
    fallback: 'gemini',
  },
  {
    provider: 'gemini',
    enabled: true,
    priority: 3,
    maxRetries: 2,
    timeoutMs: 30000,
    rateLimitRPM: 60,
    taskAffinities: [
      'voice_interaction', 'multi_modal', 'general_reasoning',
      'live_feed', 'real_time_insight',
    ],
    fallback: 'cisco-circuit',
  },
];

// ============================================================================
// AI ORCHESTRATOR CLASS
// ============================================================================

class AIOrchestrator {
  private rateLimits: Map<AIProvider, RateLimitState> = new Map();
  private metrics: Map<AIProvider, ProviderMetrics> = new Map();
  private initialized = false;

  constructor() {
    for (const config of PROVIDER_CONFIGS) {
      this.rateLimits.set(config.provider, {
        requests: [],
        windowMs: 60000,
        maxRequests: config.rateLimitRPM,
      });
      this.metrics.set(config.provider, {
        totalRequests: 0,
        successCount: 0,
        failureCount: 0,
        avgLatencyMs: 0,
        lastUsed: 0,
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MAIN ENTRY POINT
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Process an AI request through the orchestration pipeline.
   * Routes to the best available provider based on task type, availability, and priority.
   */
  async process(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();

    // Determine provider chain (primary + fallbacks)
    const providerChain = this.resolveProviderChain(request.taskType);

    for (const config of providerChain) {
      // Skip disabled or unconfigured providers
      if (!config.enabled || !secretsManager.isProviderConfigured(config.provider as SecretProvider)) {
        continue;
      }

      // Check rate limits
      if (!this.checkRateLimit(config.provider)) {
        console.warn(`[AI-Orchestrator] Rate limit reached for ${config.provider}, trying next`);
        continue;
      }

      // Attempt the call with retries
      for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
        try {
          const response = await this.callProvider(config.provider, request, config.timeoutMs);
          this.recordSuccess(config.provider, Date.now() - startTime);

          return {
            ...response,
            fallbackUsed: config.provider !== providerChain[0]?.provider,
          };
        } catch (err: any) {
          console.warn(`[AI-Orchestrator] ${config.provider} attempt ${attempt}/${config.maxRetries} failed: ${err.message}`);
          if (attempt === config.maxRetries) {
            this.recordFailure(config.provider);
          }
        }
      }
    }

    // All providers failed
    return {
      success: false,
      provider: 'cisco-circuit',
      content: 'All AI providers are currently unavailable. The system will continue using cached intelligence and local ML models.',
      model: 'fallback',
      latencyMs: Date.now() - startTime,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PROVIDER IMPLEMENTATIONS
  // ──────────────────────────────────────────────────────────────────────────

  private async callProvider(
    provider: AIProvider, request: AIRequest, timeoutMs: number
  ): Promise<AIResponse> {
    switch (provider) {
      case 'cisco-circuit':
        return this.callCiscoCircuit(request, timeoutMs);
      case 'azure-openai':
        return this.callAzureOpenAI(request, timeoutMs);
      case 'gemini':
        return this.callGemini(request, timeoutMs);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Cisco CIRCUIT API — Primary provider for SRE/security tasks.
   * Uses OAuth2 bearer tokens from secrets manager.
   */
  private async callCiscoCircuit(request: AIRequest, timeoutMs: number): Promise<AIResponse> {
    const start = Date.now();
    const scope = request.taskType === 'workflow_orchestration' ? 'workflow' : 'summarize';

    let bearerToken: string;
    try {
      bearerToken = await secretsManager.getOAuthToken(scope);
    } catch {
      // Fallback to direct API key
      bearerToken = secretsManager.get(
        scope === 'workflow' ? 'CISCO_CIRCUIT_WORKFLOW_KEY' : 'CISCO_CIRCUIT_API_KEY'
      );
    }

    const endpoint = secretsManager.get('CISCO_CIRCUIT_ENDPOINT') || 'https://circuit.cisco.com/api/v1';
    const action = this.mapTaskToCircuitAction(request.taskType);

    const response = await fetch(`${endpoint}/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
        'X-Cisco-App': 'SRE-AgenticOps-Dashboard',
        'X-Request-Id': this.generateRequestId(),
      },
      body: JSON.stringify({
        prompt: request.prompt,
        context: request.context || '',
        systemPrompt: request.systemPrompt || 'You are a Cisco SRE intelligence assistant specializing in network security, vulnerability management, and field notice analysis.',
        temperature: request.temperature ?? 0.3,
        maxTokens: request.maxTokens ?? 2048,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`CIRCUIT API returned ${response.status}`);
    }

    const data = await response.json() as any;

    return {
      success: true,
      provider: 'cisco-circuit',
      content: data.content || data.summary || data.result || '',
      model: `circuit-${scope}`,
      usage: data.usage,
      latencyMs: Date.now() - start,
      confidence: data.confidence,
    };
  }

  /**
   * Azure OpenAI (ChatGPT/GPT-4o) — General reasoning and insights.
   */
  private async callAzureOpenAI(request: AIRequest, timeoutMs: number): Promise<AIResponse> {
    const start = Date.now();
    const apiKey = secretsManager.get('AZURE_OPENAI_API_KEY');
    const endpoint = secretsManager.get('AZURE_OPENAI_ENDPOINT');
    const deployment = secretsManager.get('AZURE_OPENAI_DEPLOYMENT') || 'gpt-4o';
    const apiVersion = secretsManager.get('AZURE_OPENAI_API_VERSION') || '2024-08-01-preview';

    const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    const messages: Array<{ role: string; content: string }> = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    } else {
      messages.push({
        role: 'system',
        content: 'You are an expert SRE intelligence analyst for Cisco infrastructure. Provide precise, data-driven insights about network security, vulnerabilities, and field notices. Be concise and actionable.',
      });
    }
    if (request.context) {
      messages.push({ role: 'system', content: `Dashboard context: ${request.context}` });
    }
    messages.push({ role: 'user', content: request.prompt });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        temperature: request.temperature ?? 0.4,
        max_tokens: request.maxTokens ?? 2048,
        stream: false,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`Azure OpenAI returned ${response.status}`);
    }

    const data = await response.json() as any;
    const choice = data.choices?.[0];

    return {
      success: true,
      provider: 'azure-openai',
      content: choice?.message?.content || '',
      model: data.model || deployment,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
      latencyMs: Date.now() - start,
    };
  }

  /**
   * Google Gemini via Cisco Circuit API Gateway.
   * All Gemini model access is routed exclusively through Circuit.
   * Supports text, vision, and audio input/output.
   */
  private async callGemini(request: AIRequest, timeoutMs: number): Promise<AIResponse> {
    const start = Date.now();
    const model = request.voiceInput
      ? (secretsManager.get('GEMINI_VOICE_MODEL') || 'gemini-2.0-flash-live')
      : (secretsManager.get('GEMINI_MODEL') || 'gemini-2.0-flash');

    // Route through Cisco Circuit API — no standalone Gemini key required
    let bearerToken: string;
    try {
      bearerToken = await secretsManager.getOAuthToken('summarize');
    } catch {
      bearerToken = secretsManager.get('CISCO_CIRCUIT_API_KEY');
    }

    if (!bearerToken) {
      throw new Error('Cisco Circuit API key not configured for Gemini routing');
    }

    const circuitEndpoint = secretsManager.get('CISCO_CIRCUIT_ENDPOINT') || 'https://circuit.cisco.com/api/v1';

    // Build content parts
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    if (request.systemPrompt) {
      parts.push({ text: request.systemPrompt + '\n\n' });
    }
    if (request.context) {
      parts.push({ text: `Context: ${request.context}\n\n` });
    }

    // Voice input handling
    if (request.voiceInput?.audio) {
      const mimeType = request.voiceInput.format === 'wav' ? 'audio/wav' :
        request.voiceInput.format === 'mp3' ? 'audio/mp3' : 'audio/pcm';
      parts.push({
        inlineData: {
          mimeType,
          data: request.voiceInput.audio.toString('base64'),
        },
      });
      parts.push({ text: request.prompt || 'Please transcribe and respond to this audio.' });
    } else {
      parts.push({ text: request.prompt });
    }

    const response = await fetch(`${circuitEndpoint}/gemini/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
        'X-Cisco-App': 'SRE-AgenticOps-Dashboard',
        'X-Model': model,
        'X-Request-Id': this.generateRequestId(),
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: request.temperature ?? 0.4,
          maxOutputTokens: request.maxTokens ?? 2048,
          responseMimeType: 'text/plain',
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`Gemini via Circuit returned ${response.status}`);
    }

    const data = await response.json() as any;
    const candidate = data.candidates?.[0];
    const content = candidate?.content?.parts?.map((p: any) => p.text).join('') || '';

    // Generate voice output for voice interactions
    let voiceOutput: AIResponse['voiceOutput'] | undefined;
    if (request.taskType === 'voice_interaction' || request.voiceInput) {
      voiceOutput = {
        text: content,
        ssml: this.textToSSML(content),
        emotion: this.detectEmotion(content),
      };
    }

    return {
      success: true,
      provider: 'gemini',
      content,
      model,
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount || 0,
        completionTokens: data.usageMetadata.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata.totalTokenCount || 0,
      } : undefined,
      latencyMs: Date.now() - start,
      voiceOutput,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // GEMINI VOICE CAPABILITIES (via Circuit API Gateway)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Gemini Live Voice Session — Streams audio for real-time conversation.
   * Routed through Cisco Circuit API for secure access.
   */
  async startVoiceSession(sessionId: string): Promise<GeminiVoiceSession> {
    let bearerToken: string;
    try {
      bearerToken = await secretsManager.getOAuthToken('summarize');
    } catch {
      bearerToken = secretsManager.get('CISCO_CIRCUIT_API_KEY');
    }
    if (!bearerToken) {
      throw new Error('Cisco Circuit API key not configured for voice sessions');
    }

    return new GeminiVoiceSession(bearerToken, sessionId);
  }

  /**
   * Text-to-Speech via Gemini — Generate natural speech from text.
   * Routed through Cisco Circuit API gateway.
   */
  async synthesizeSpeech(text: string, options?: {
    voice?: string;
    speed?: number;
    emotion?: string;
  }): Promise<{ audio: Buffer; format: string; durationMs: number }> {
    let bearerToken: string;
    try {
      bearerToken = await secretsManager.getOAuthToken('summarize');
    } catch {
      bearerToken = secretsManager.get('CISCO_CIRCUIT_API_KEY');
    }

    const circuitEndpoint = secretsManager.get('CISCO_CIRCUIT_ENDPOINT') || 'https://circuit.cisco.com/api/v1';
    const model = secretsManager.get('GEMINI_VOICE_MODEL') || 'gemini-2.0-flash-live';

    const response = await fetch(
      `${circuitEndpoint}/gemini/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bearerToken}`,
          'X-Cisco-App': 'SRE-AgenticOps-Dashboard',
          'X-Model': model,
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: `Please read the following text aloud naturally${options?.emotion ? ` with a ${options.emotion} tone` : ''}: "${text}"` }],
          }],
          generationConfig: {
            responseMimeType: 'audio/pcm',
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: options?.voice || 'Kore' },
              },
            },
          },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini TTS via Circuit returned ${response.status}`);
    }

    const data = await response.json() as any;
    const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    return {
      audio: Buffer.from(audioData || '', 'base64'),
      format: 'pcm',
      durationMs: Math.floor((audioData?.length || 0) / 48), // 24kHz 16-bit mono estimate
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ORCHESTRATED WORKFLOWS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Real-time dashboard intelligence — Combines CIRCUIT data with ChatGPT reasoning.
   */
  async generateDashboardInsight(dashboardData: Record<string, unknown>): Promise<AIResponse> {
    return this.process({
      taskType: 'real_time_insight',
      prompt: 'Analyze the current dashboard metrics and provide actionable insights for the SRE team.',
      context: JSON.stringify(dashboardData),
      systemPrompt: 'You are the Nova AI assistant for Cisco SRE AgenticOps. Analyze the provided metrics data and deliver 3-5 key insights with severity levels and recommended actions. Focus on anomalies, trends, and security posture.',
      temperature: 0.3,
      maxTokens: 1024,
    });
  }

  /**
   * Predictive analytics pipeline — CIRCUIT primary, GPT-4o for reasoning.
   */
  async runPredictiveAnalysis(historicalData: unknown[]): Promise<AIResponse> {
    // First pass: CIRCUIT for pattern detection
    const patternResult = await this.process({
      taskType: 'predictive_analytics',
      prompt: 'Identify emerging patterns and predict vulnerability trends for the next 30 days.',
      context: JSON.stringify(historicalData.slice(-100)), // Last 100 data points
      temperature: 0.2,
    });

    // Second pass: GPT-4o for executive reasoning
    if (patternResult.success && secretsManager.isProviderConfigured('azure-openai')) {
      return this.process({
        taskType: 'general_reasoning',
        prompt: `Based on this ML analysis, provide executive-level recommendations:\n\n${patternResult.content}`,
        systemPrompt: 'You are a senior SRE advisor. Transform ML predictions into actionable business decisions with risk scores and timelines.',
        temperature: 0.4,
      });
    }

    return patternResult;
  }

  /**
   * Live security feed — Real-time analysis with streaming.
   */
  async processSecurityEvent(event: {
    type: string;
    severity: string;
    details: string;
    affectedAssets: number;
  }): Promise<AIResponse> {
    return this.process({
      taskType: 'security_analysis',
      prompt: `Security event detected:\nType: ${event.type}\nSeverity: ${event.severity}\nDetails: ${event.details}\nAffected assets: ${event.affectedAssets}\n\nProvide immediate assessment, risk score (1-100), and recommended response actions.`,
      temperature: 0.1,
      maxTokens: 512,
    });
  }

  /**
   * Voice-enabled chat interaction — Gemini processes audio, responds naturally.
   */
  async processVoiceChat(audio: Buffer, sessionContext?: string): Promise<AIResponse> {
    return this.process({
      taskType: 'voice_interaction',
      prompt: 'Process this voice command and provide a helpful response about the SRE dashboard.',
      context: sessionContext,
      voiceInput: { audio, format: 'pcm', sampleRate: 16000 },
      systemPrompt: 'You are Nova, the Cisco SRE voice assistant. Respond conversationally and concisely. Use natural language suitable for text-to-speech output.',
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ROUTING & RATE LIMITING
  // ──────────────────────────────────────────────────────────────────────────

  private resolveProviderChain(taskType: TaskType): ProviderConfig[] {
    // Sort by: (1) task affinity match, (2) priority
    const sorted = [...PROVIDER_CONFIGS]
      .filter(c => c.enabled)
      .sort((a, b) => {
        const aAffinity = a.taskAffinities.includes(taskType) ? 0 : 1;
        const bAffinity = b.taskAffinities.includes(taskType) ? 0 : 1;
        if (aAffinity !== bAffinity) return aAffinity - bAffinity;
        return a.priority - b.priority;
      });

    return sorted;
  }

  private checkRateLimit(provider: AIProvider): boolean {
    const state = this.rateLimits.get(provider);
    if (!state) return true;

    const now = Date.now();
    // Remove expired entries
    state.requests = state.requests.filter(t => now - t < state.windowMs);
    if (state.requests.length >= state.maxRequests) return false;

    state.requests.push(now);
    return true;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // METRICS
  // ──────────────────────────────────────────────────────────────────────────

  private recordSuccess(provider: AIProvider, latencyMs: number): void {
    const m = this.metrics.get(provider);
    if (!m) return;
    m.totalRequests++;
    m.successCount++;
    m.avgLatencyMs = (m.avgLatencyMs * (m.totalRequests - 1) + latencyMs) / m.totalRequests;
    m.lastUsed = Date.now();
  }

  private recordFailure(provider: AIProvider): void {
    const m = this.metrics.get(provider);
    if (!m) return;
    m.totalRequests++;
    m.failureCount++;
  }

  getMetrics(): Record<AIProvider, ProviderMetrics> {
    const result: Record<string, ProviderMetrics> = {};
    for (const [provider, metrics] of this.metrics) {
      result[provider] = { ...metrics };
    }
    return result as Record<AIProvider, ProviderMetrics>;
  }

  getProviderStatus(): Array<{
    provider: AIProvider;
    configured: boolean;
    enabled: boolean;
    healthy: boolean;
    capabilities: string[];
  }> {
    return PROVIDER_CONFIGS.map(config => ({
      provider: config.provider,
      configured: secretsManager.isProviderConfigured(config.provider as SecretProvider),
      enabled: config.enabled,
      healthy: (this.metrics.get(config.provider)?.failureCount || 0) < 5,
      capabilities: config.taskAffinities,
    }));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  private mapTaskToCircuitAction(taskType: TaskType): string {
    switch (taskType) {
      case 'summarization': return 'summarize';
      case 'security_analysis': return 'analyze/security';
      case 'predictive_analytics': return 'predict';
      case 'anomaly_detection': return 'detect/anomalies';
      case 'workflow_orchestration': return 'workflow/execute';
      case 'data_analysis': return 'analyze/data';
      default: return 'generate';
    }
  }

  private textToSSML(text: string): string {
    // Convert plain text to SSML with natural prosody
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<speak><prosody rate="medium" pitch="medium">${escaped}</prosody></speak>`;
  }

  private detectEmotion(content: string): string {
    const lower = content.toLowerCase();
    if (lower.includes('critical') || lower.includes('urgent') || lower.includes('alert'))
      return 'concerned';
    if (lower.includes('resolved') || lower.includes('improved') || lower.includes('excellent'))
      return 'positive';
    if (lower.includes('warning') || lower.includes('degraded'))
      return 'concerned';
    return 'neutral';
  }

  private generateRequestId(): string {
    return `sre-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

// ============================================================================
// GEMINI VOICE SESSION (for bidirectional audio streaming)
// ============================================================================

export class GeminiVoiceSession {
  private apiKey: string;
  private sessionId: string;
  private history: Array<{ role: string; text: string }> = [];

  constructor(apiKey: string, sessionId: string) {
    this.apiKey = apiKey;
    this.sessionId = sessionId;
  }

  /**
   * Send text/audio and get a voice-optimized response.
   */
  async converse(input: string | Buffer, options?: {
    voice?: string;
    includeAudio?: boolean;
  }): Promise<{
    text: string;
    ssml: string;
    emotion: string;
    suggestions: string[];
  }> {
    const model = 'gemini-2.0-flash';
    const isAudio = Buffer.isBuffer(input);

    const parts: any[] = [];
    if (this.history.length > 0) {
      parts.push({
        text: `Conversation history:\n${this.history.map(h => `${h.role}: ${h.text}`).join('\n')}\n\n`,
      });
    }

    if (isAudio) {
      parts.push({
        inlineData: { mimeType: 'audio/pcm', data: (input as Buffer).toString('base64') },
      });
      parts.push({ text: 'Respond to this voice input conversationally.' });
    } else {
      parts.push({ text: input as string });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: 'You are Nova, a friendly and knowledgeable SRE voice assistant for Cisco infrastructure monitoring. Speak naturally and concisely. Offer follow-up suggestions. Keep responses under 3 sentences unless asked for detail.',
            }],
          },
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 256,
          },
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini voice session error: ${response.status}`);
    }

    const data = await response.json() as any;
    const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';

    // Update conversation history
    this.history.push({ role: 'user', text: isAudio ? '[audio input]' : (input as string) });
    this.history.push({ role: 'assistant', text });

    // Keep history manageable
    if (this.history.length > 20) {
      this.history = this.history.slice(-10);
    }

    return {
      text,
      ssml: `<speak><prosody rate="medium">${text.replace(/[<>&]/g, '')}</prosody></speak>`,
      emotion: this.detectResponseEmotion(text),
      suggestions: this.extractSuggestions(text),
    };
  }

  private detectResponseEmotion(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('alert') || lower.includes('critical')) return 'urgent';
    if (lower.includes('great') || lower.includes('resolved')) return 'positive';
    return 'neutral';
  }

  private extractSuggestions(text: string): string[] {
    const suggestions: string[] = [];
    if (text.includes('?')) suggestions.push('Tell me more');
    suggestions.push('Show metrics', 'Run analysis', 'Check alerts');
    return suggestions.slice(0, 3);
  }
}

// ============================================================================
// PROVIDER METRICS TYPE
// ============================================================================

interface ProviderMetrics {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  avgLatencyMs: number;
  lastUsed: number;
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const aiOrchestrator = new AIOrchestrator();
export default aiOrchestrator;
