/**
 * API Session Tracker
 * ============================================================================
 * Centralized logging, monitoring, and analytics for all API calls.
 * Tracks every API request with detailed metadata including provider,
 * endpoint, timing, status, and AI model usage patterns.
 *
 * Design:
 *   - Ring buffer for in-memory log storage (max 10,000 entries)
 *   - Provider-segmented metrics with Circuit API prioritization
 *   - Aggregate statistics with sliding windows (1m, 5m, 1h, 24h)
 *   - AI model usage pattern detection
 */

// ============================================================================
// TYPES
// ============================================================================

export type APIProvider =
  | 'cisco-circuit'
  | 'azure-openai'
  | 'gemini'
  | 'snowflake'
  | 'langchain'
  | 'internal'
  | 'unknown';

export type CallStatus = 'success' | 'error' | 'timeout' | 'rate-limited' | 'fallback';

export interface APICallLog {
  id: string;
  timestamp: number;
  provider: APIProvider;
  endpoint: string;
  method: string;
  callType: string;
  status: CallStatus;
  statusCode: number;
  durationMs: number;
  requestSize?: number;
  responseSize?: number;
  model?: string;
  taskType?: string;
  tokensUsed?: number;
  errorMessage?: string;
  userId?: string;
  sessionId?: string;
  retryCount?: number;
  fallbackFrom?: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderMetrics {
  provider: APIProvider;
  totalCalls: number;
  successCount: number;
  errorCount: number;
  timeoutCount: number;
  rateLimitedCount: number;
  fallbackCount: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  p95DurationMs: number;
  totalTokensUsed: number;
  errorRate: number;
  lastCallTimestamp: number;
  callsPerMinute: number;
  modelsUsed: Record<string, number>;
  taskTypes: Record<string, number>;
}

export interface SessionSummary {
  sessionStart: number;
  totalCalls: number;
  providerBreakdown: Record<APIProvider, number>;
  circuitCalls: number;
  circuitPercentage: number;
  aiInsightsCalls: number;
  totalDurationMs: number;
  avgDurationMs: number;
  errorRate: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  activeModels: Array<{ model: string; provider: APIProvider; calls: number }>;
}

export interface TrackerFilters {
  provider?: APIProvider;
  status?: CallStatus;
  dateFrom?: number;
  dateTo?: number;
  endpoint?: string;
  minDuration?: number;
  maxDuration?: number;
  taskType?: string;
}

// ============================================================================
// API SESSION TRACKER
// ============================================================================

const MAX_LOG_ENTRIES = 10000;
const CLEANUP_THRESHOLD = 12000;

class APISessionTracker {
  private logs: APICallLog[] = [];
  private sessionStart: number = Date.now();
  private idCounter: number = 0;

  // ──────────────────────────────────────────────────────────────────────────
  // LOGGING
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Record an API call with full metadata
   */
  logCall(entry: Omit<APICallLog, 'id' | 'timestamp'>): APICallLog {
    const log: APICallLog = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...entry,
    };

    this.logs.push(log);

    // Ring buffer cleanup
    if (this.logs.length > CLEANUP_THRESHOLD) {
      this.logs = this.logs.slice(-MAX_LOG_ENTRIES);
    }

    return log;
  }

  /**
   * Create a call tracker that auto-logs when completed
   */
  startCall(params: {
    provider: APIProvider;
    endpoint: string;
    method: string;
    callType: string;
    model?: string;
    taskType?: string;
    userId?: string;
    sessionId?: string;
  }): { finish: (result: { status: CallStatus; statusCode: number; responseSize?: number; tokensUsed?: number; errorMessage?: string; fallbackFrom?: string; metadata?: Record<string, unknown> }) => APICallLog } {
    const startTime = Date.now();

    return {
      finish: (result) => {
        return this.logCall({
          provider: params.provider,
          endpoint: params.endpoint,
          method: params.method,
          callType: params.callType,
          model: params.model,
          taskType: params.taskType,
          userId: params.userId,
          sessionId: params.sessionId,
          status: result.status,
          statusCode: result.statusCode,
          durationMs: Date.now() - startTime,
          responseSize: result.responseSize,
          tokensUsed: result.tokensUsed,
          errorMessage: result.errorMessage,
          fallbackFrom: result.fallbackFrom,
          metadata: result.metadata,
        });
      },
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // QUERIES
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Get filtered logs with pagination
   */
  getLogs(filters?: TrackerFilters, page: number = 1, pageSize: number = 50): {
    logs: APICallLog[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  } {
    let filtered = [...this.logs];

    if (filters) {
      if (filters.provider) {
        filtered = filtered.filter(l => l.provider === filters.provider);
      }
      if (filters.status) {
        filtered = filtered.filter(l => l.status === filters.status);
      }
      if (filters.dateFrom) {
        filtered = filtered.filter(l => l.timestamp >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        filtered = filtered.filter(l => l.timestamp <= filters.dateTo!);
      }
      if (filters.endpoint) {
        filtered = filtered.filter(l => l.endpoint.includes(filters.endpoint!));
      }
      if (filters.minDuration !== undefined) {
        filtered = filtered.filter(l => l.durationMs >= filters.minDuration!);
      }
      if (filters.maxDuration !== undefined) {
        filtered = filtered.filter(l => l.durationMs <= filters.maxDuration!);
      }
      if (filters.taskType) {
        filtered = filtered.filter(l => l.taskType === filters.taskType);
      }
    }

    // Sort by timestamp descending (newest first)
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const logs = filtered.slice(start, start + pageSize);

    return { logs, total, page, pageSize, totalPages };
  }

  /**
   * Get metrics for a specific provider or all providers
   */
  getProviderMetrics(provider?: APIProvider, windowMs: number = 3600000): ProviderMetrics[] {
    const now = Date.now();
    const windowStart = now - windowMs;
    const windowLogs = this.logs.filter(l => l.timestamp >= windowStart);

    const providers: APIProvider[] = provider
      ? [provider]
      : ['cisco-circuit', 'azure-openai', 'gemini', 'snowflake', 'langchain', 'internal'];

    return providers.map(p => {
      const pLogs = windowLogs.filter(l => l.provider === p);
      const durations = pLogs.map(l => l.durationMs).sort((a, b) => a - b);

      const modelsUsed: Record<string, number> = {};
      const taskTypes: Record<string, number> = {};
      pLogs.forEach(l => {
        if (l.model) modelsUsed[l.model] = (modelsUsed[l.model] || 0) + 1;
        if (l.taskType) taskTypes[l.taskType] = (taskTypes[l.taskType] || 0) + 1;
      });

      const totalCalls = pLogs.length;
      const successCount = pLogs.filter(l => l.status === 'success').length;
      const errorCount = pLogs.filter(l => l.status === 'error').length;
      const timeoutCount = pLogs.filter(l => l.status === 'timeout').length;
      const rateLimitedCount = pLogs.filter(l => l.status === 'rate-limited').length;
      const fallbackCount = pLogs.filter(l => l.status === 'fallback').length;

      // Calculate calls per minute in the window
      const windowMinutes = windowMs / 60000;
      const callsPerMinute = totalCalls / windowMinutes;

      return {
        provider: p,
        totalCalls,
        successCount,
        errorCount,
        timeoutCount,
        rateLimitedCount,
        fallbackCount,
        avgDurationMs: totalCalls > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / totalCalls) : 0,
        minDurationMs: durations.length > 0 ? durations[0] : 0,
        maxDurationMs: durations.length > 0 ? durations[durations.length - 1] : 0,
        p95DurationMs: durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0,
        totalTokensUsed: pLogs.reduce((sum, l) => sum + (l.tokensUsed || 0), 0),
        errorRate: totalCalls > 0 ? Math.round((errorCount / totalCalls) * 100 * 10) / 10 : 0,
        lastCallTimestamp: pLogs.length > 0 ? Math.max(...pLogs.map(l => l.timestamp)) : 0,
        callsPerMinute: Math.round(callsPerMinute * 100) / 100,
        modelsUsed,
        taskTypes,
      };
    });
  }

  /**
   * Get comprehensive session summary
   */
  getSessionSummary(): SessionSummary {
    const providerBreakdown: Record<string, number> = {};
    const endpointCounts: Record<string, number> = {};
    const modelCounts: Record<string, { provider: APIProvider; calls: number }> = {};

    let totalDuration = 0;
    let errorCount = 0;
    let circuitCalls = 0;
    let aiInsightsCalls = 0;

    for (const log of this.logs) {
      // Provider breakdown
      providerBreakdown[log.provider] = (providerBreakdown[log.provider] || 0) + 1;

      // Endpoint tracking
      endpointCounts[log.endpoint] = (endpointCounts[log.endpoint] || 0) + 1;

      // Model tracking
      if (log.model) {
        if (!modelCounts[log.model]) {
          modelCounts[log.model] = { provider: log.provider, calls: 0 };
        }
        modelCounts[log.model].calls++;
      }

      // Aggregates
      totalDuration += log.durationMs;
      if (log.status === 'error') errorCount++;
      if (log.provider === 'cisco-circuit') circuitCalls++;
      if (['summarization', 'security_analysis', 'predictive_analytics', 'anomaly_detection', 'general_reasoning'].includes(log.taskType || '')) {
        aiInsightsCalls++;
      }
    }

    const totalCalls = this.logs.length;

    const topEndpoints = Object.entries(endpointCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));

    const activeModels = Object.entries(modelCounts)
      .sort(([, a], [, b]) => b.calls - a.calls)
      .map(([model, data]) => ({ model, provider: data.provider, calls: data.calls }));

    return {
      sessionStart: this.sessionStart,
      totalCalls,
      providerBreakdown: providerBreakdown as Record<APIProvider, number>,
      circuitCalls,
      circuitPercentage: totalCalls > 0 ? Math.round((circuitCalls / totalCalls) * 100 * 10) / 10 : 0,
      aiInsightsCalls,
      totalDurationMs: totalDuration,
      avgDurationMs: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
      errorRate: totalCalls > 0 ? Math.round((errorCount / totalCalls) * 100 * 10) / 10 : 0,
      topEndpoints,
      activeModels,
    };
  }

  /**
   * Get timeline data for charts (calls per minute bucketed)
   */
  getTimeline(windowMs: number = 3600000, bucketMs: number = 60000): Array<{
    timestamp: number;
    total: number;
    byProvider: Record<string, number>;
  }> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const windowLogs = this.logs.filter(l => l.timestamp >= windowStart);

    const buckets: Map<number, { total: number; byProvider: Record<string, number> }> = new Map();

    for (const log of windowLogs) {
      const bucketKey = Math.floor(log.timestamp / bucketMs) * bucketMs;
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, { total: 0, byProvider: {} });
      }
      const bucket = buckets.get(bucketKey)!;
      bucket.total++;
      bucket.byProvider[log.provider] = (bucket.byProvider[log.provider] || 0) + 1;
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a - b)
      .map(([timestamp, data]) => ({ timestamp, ...data }));
  }

  /**
   * Get AI model usage insights
   */
  getAIUsageInsights(): {
    totalAICalls: number;
    providerDistribution: Record<string, { calls: number; percentage: number }>;
    taskDistribution: Record<string, number>;
    avgResponseByTask: Record<string, number>;
    topPatterns: Array<{ pattern: string; frequency: number; avgDuration: number }>;
  } {
    const aiLogs = this.logs.filter(l =>
      ['cisco-circuit', 'azure-openai', 'gemini'].includes(l.provider)
    );

    const providerCounts: Record<string, number> = {};
    const taskCounts: Record<string, number> = {};
    const taskDurations: Record<string, number[]> = {};
    const patterns: Record<string, { count: number; durations: number[] }> = {};

    for (const log of aiLogs) {
      // Provider distribution
      providerCounts[log.provider] = (providerCounts[log.provider] || 0) + 1;

      // Task distribution
      if (log.taskType) {
        taskCounts[log.taskType] = (taskCounts[log.taskType] || 0) + 1;
        if (!taskDurations[log.taskType]) taskDurations[log.taskType] = [];
        taskDurations[log.taskType].push(log.durationMs);
      }

      // Pattern detection (provider + taskType + model)
      const patternKey = `${log.provider}:${log.taskType || 'general'}:${log.model || 'default'}`;
      if (!patterns[patternKey]) patterns[patternKey] = { count: 0, durations: [] };
      patterns[patternKey].count++;
      patterns[patternKey].durations.push(log.durationMs);
    }

    const totalAICalls = aiLogs.length;

    const providerDistribution: Record<string, { calls: number; percentage: number }> = {};
    for (const [provider, count] of Object.entries(providerCounts)) {
      providerDistribution[provider] = {
        calls: count,
        percentage: totalAICalls > 0 ? Math.round((count / totalAICalls) * 100 * 10) / 10 : 0,
      };
    }

    const avgResponseByTask: Record<string, number> = {};
    for (const [task, durations] of Object.entries(taskDurations)) {
      avgResponseByTask[task] = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    }

    const topPatterns = Object.entries(patterns)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([pattern, data]) => ({
        pattern,
        frequency: data.count,
        avgDuration: Math.round(data.durations.reduce((a, b) => a + b, 0) / data.durations.length),
      }));

    return {
      totalAICalls,
      providerDistribution,
      taskDistribution: taskCounts,
      avgResponseByTask,
      topPatterns,
    };
  }

  /**
   * Get total log count
   */
  getLogCount(): number {
    return this.logs.length;
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
    this.sessionStart = Date.now();
  }

  /**
   * Seed sample data for demonstration purposes
   */
  seedSampleData(): void {
    const now = Date.now();
    const providers: APIProvider[] = ['cisco-circuit', 'azure-openai', 'gemini', 'langchain', 'snowflake'];
    const endpoints: Record<APIProvider, string[]> = {
      'cisco-circuit': [
        '/api/circuit/summarize',
        '/api/circuit/workflow/orchestrate',
        '/api/circuit/security/analyze',
        '/api/circuit/predict/anomaly',
        '/api/circuit/field-notice/enrich',
      ],
      'azure-openai': [
        '/api/openai/chat/completions',
        '/api/openai/embeddings',
        '/api/openai/reasoning/analyze',
        '/api/openai/code/generate',
      ],
      'gemini': [
        '/api/gemini/generate',
        '/api/gemini/voice/transcribe',
        '/api/gemini/multimodal/analyze',
        '/api/gemini/stream/live',
      ],
      'snowflake': [
        '/api/snowflake/query',
        '/api/snowflake/time-travel',
        '/api/snowflake/ml/predict',
      ],
      'langchain': [
        '/api/langchain/chain/execute',
        '/api/langchain/trace/log',
        '/api/langchain/eval/score',
      ],
      'internal': ['/api/data/metrics', '/api/data/filter'],
      'unknown': ['/api/unknown'],
    };
    const models: Record<APIProvider, string[]> = {
      'cisco-circuit': ['circuit-pro-v2', 'circuit-summarize-v1', 'circuit-security-v3'],
      'azure-openai': ['gpt-4o', 'gpt-4o-mini', 'text-embedding-3-large'],
      'gemini': ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-voice-live'],
      'snowflake': ['cortex-analyst', 'cortex-search'],
      'langchain': ['langchain-orchestrator'],
      'internal': ['local-ml'],
      'unknown': [],
    };
    const taskTypes = [
      'summarization', 'security_analysis', 'predictive_analytics',
      'anomaly_detection', 'general_reasoning', 'code_analysis',
      'voice_interaction', 'data_analysis', 'workflow_orchestration',
    ];
    const statuses: CallStatus[] = ['success', 'success', 'success', 'success', 'success', 'success', 'success', 'error', 'timeout', 'rate-limited'];

    // Generate 500 sample entries over the last 2 hours
    for (let i = 0; i < 500; i++) {
      const provider = providers[Math.floor(Math.random() * providers.length)];
      // Weight Circuit higher (40% of calls)
      const effectiveProvider = Math.random() < 0.4 ? 'cisco-circuit' : provider;
      const providerEndpoints = endpoints[effectiveProvider] || endpoints['internal'];
      const providerModels = models[effectiveProvider] || [];

      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const baseDuration = effectiveProvider === 'cisco-circuit' ? 120 : effectiveProvider === 'azure-openai' ? 800 : 500;
      const durationMs = Math.round(baseDuration + Math.random() * baseDuration * 2 + (status === 'timeout' ? 15000 : 0));

      this.logCall({
        provider: effectiveProvider,
        endpoint: providerEndpoints[Math.floor(Math.random() * providerEndpoints.length)],
        method: Math.random() > 0.3 ? 'POST' : 'GET',
        callType: Math.random() > 0.5 ? 'ai-inference' : 'data-query',
        status,
        statusCode: status === 'success' ? 200 : status === 'error' ? 500 : status === 'timeout' ? 408 : 429,
        durationMs,
        model: providerModels.length > 0 ? providerModels[Math.floor(Math.random() * providerModels.length)] : undefined,
        taskType: taskTypes[Math.floor(Math.random() * taskTypes.length)],
        tokensUsed: effectiveProvider !== 'snowflake' ? Math.round(50 + Math.random() * 2000) : undefined,
        errorMessage: status === 'error' ? 'Provider returned non-200 status' : undefined,
        userId: `user-${Math.floor(Math.random() * 3) + 1}`,
        sessionId: `session-${Math.floor(Math.random() * 5) + 1}`,
        retryCount: status === 'error' ? Math.floor(Math.random() * 3) : 0,
      });

      // Adjust timestamp to spread over 2 hours
      const lastLog = this.logs[this.logs.length - 1];
      lastLog.timestamp = now - Math.floor(Math.random() * 7200000);
    }

    // Sort by timestamp
    this.logs.sort((a, b) => a.timestamp - b.timestamp);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIVATE
  // ──────────────────────────────────────────────────────────────────────────

  private generateId(): string {
    this.idCounter++;
    return `api-${Date.now()}-${this.idCounter.toString(36)}`;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const apiSessionTracker = new APISessionTracker();

// Seed sample data on startup for demonstration
apiSessionTracker.seedSampleData();
