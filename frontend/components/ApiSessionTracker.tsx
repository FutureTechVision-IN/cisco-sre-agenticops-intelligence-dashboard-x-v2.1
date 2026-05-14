/**
 * API Session Tracker Component
 * ============================================================================
 * Comprehensive administrative interface for logging, monitoring, and analyzing
 * all API calls. Circuit API usage is prioritized and visually differentiated.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, Zap, Clock, AlertTriangle, CheckCircle, XCircle,
  Filter, RefreshCw, Download, ChevronLeft, ChevronRight,
  TrendingUp, Cpu, Globe, Database, BarChart3, Layers
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface APICallLog {
  id: string;
  timestamp: number;
  provider: string;
  endpoint: string;
  method: string;
  callType: string;
  status: string;
  statusCode: number;
  durationMs: number;
  model?: string;
  taskType?: string;
  tokensUsed?: number;
  errorMessage?: string;
  userId?: string;
  sessionId?: string;
  retryCount?: number;
}

interface ProviderMetric {
  provider: string;
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

interface SessionSummary {
  sessionStart: number;
  totalCalls: number;
  providerBreakdown: Record<string, number>;
  circuitCalls: number;
  circuitPercentage: number;
  aiInsightsCalls: number;
  totalDurationMs: number;
  avgDurationMs: number;
  errorRate: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  activeModels: Array<{ model: string; provider: string; calls: number }>;
}

interface AIInsights {
  totalAICalls: number;
  providerDistribution: Record<string, { calls: number; percentage: number }>;
  taskDistribution: Record<string, number>;
  avgResponseByTask: Record<string, number>;
  topPatterns: Array<{ pattern: string; frequency: number; avgDuration: number }>;
}

// ============================================================================
// PROVIDER CONFIG
// ============================================================================

const PROVIDER_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  'cisco-circuit': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/40', badge: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30' },
  'azure-openai': { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/40', badge: 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30' },
  'gemini': { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/40', badge: 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30' },
  'snowflake': { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/40', badge: 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/30' },
  'langchain': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/40', badge: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30' },
  'internal': { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/40', badge: 'bg-slate-500/20 text-slate-300 ring-1 ring-slate-500/30' },
};

const PROVIDER_LABELS: Record<string, string> = {
  'cisco-circuit': 'Cisco CIRCUIT',
  'azure-openai': 'Azure OpenAI / ChatGPT',
  'gemini': 'Google Gemini',
  'snowflake': 'Snowflake',
  'langchain': 'LangChain',
  'internal': 'Internal',
};

const STATUS_STYLES: Record<string, { icon: typeof CheckCircle; color: string }> = {
  'success': { icon: CheckCircle, color: 'text-green-400' },
  'error': { icon: XCircle, color: 'text-red-400' },
  'timeout': { icon: Clock, color: 'text-amber-400' },
  'rate-limited': { icon: AlertTriangle, color: 'text-orange-400' },
  'fallback': { icon: Layers, color: 'text-blue-400' },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const ApiSessionTracker: React.FC = () => {
  const [activeView, setActiveView] = useState<'overview' | 'logs' | 'ai-insights'>('overview');
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [metrics, setMetrics] = useState<ProviderMetric[]>([]);
  const [logs, setLogs] = useState<APICallLog[]>([]);
  const [aiInsights, setAIInsights] = useState<AIInsights | null>(null);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterProvider, setFilterProvider] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterEndpoint, setFilterEndpoint] = useState<string>('');
  const [filterTaskType, setFilterTaskType] = useState<string>('');

  // ──────────────────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ──────────────────────────────────────────────────────────────────────────

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/session-tracker/summary');
      const data = await res.json();
      if (data.success) setSummary(data);
    } catch (e) {
      console.error('Failed to fetch summary:', e);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/session-tracker/metrics');
      const data = await res.json();
      if (data.success) setMetrics(data.metrics);
    } catch (e) {
      console.error('Failed to fetch metrics:', e);
    }
  }, []);

  const fetchLogs = useCallback(async (page: number = 1) => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '30' });
      if (filterProvider) params.set('provider', filterProvider);
      if (filterStatus) params.set('status', filterStatus);
      if (filterEndpoint) params.set('endpoint', filterEndpoint);
      if (filterTaskType) params.set('taskType', filterTaskType);

      const res = await fetch(`/api/admin/session-tracker/logs?${params}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
        setLogTotal(data.total);
        setLogPage(data.page);
        setLogTotalPages(data.totalPages);
      }
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    }
  }, [filterProvider, filterStatus, filterEndpoint, filterTaskType]);

  const fetchAIInsights = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/session-tracker/ai-insights');
      const data = await res.json();
      if (data.success) setAIInsights(data);
    } catch (e) {
      console.error('Failed to fetch AI insights:', e);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchSummary(), fetchMetrics(), fetchLogs(1), fetchAIInsights()]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [fetchSummary, fetchMetrics, fetchLogs, fetchAIInsights]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    fetchLogs(1);
  }, [filterProvider, filterStatus, filterEndpoint, filterTaskType, fetchLogs]);

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTimestamp = (ts: number): string => {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  const getProviderColor = (provider: string) => {
    return PROVIDER_COLORS[provider] || PROVIDER_COLORS['internal'];
  };

  const getProviderLabel = (provider: string) => {
    return PROVIDER_LABELS[provider] || provider;
  };

  // ──────────────────────────────────────────────────────────────────────────
  // CIRCUIT API HERO SECTION
  // ──────────────────────────────────────────────────────────────────────────

  const renderCircuitHero = () => {
    if (!summary) return null;
    const circuitMetric = metrics.find(m => m.provider === 'cisco-circuit');

    return (
      <div className="mb-6 bg-gradient-to-r from-emerald-900/30 via-emerald-800/20 to-slate-800/50 border border-emerald-500/30 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center ring-2 ring-emerald-500/40">
            <Zap className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-300">Cisco CIRCUIT API</h3>
            <p className="text-xs text-emerald-400/70">Primary Provider — High-Volume Operations</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-sm font-bold ring-1 ring-emerald-500/40">
              PRIORITY
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
              {summary.circuitPercentage}% of total traffic
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-800/60 rounded-lg p-3 border border-emerald-500/20">
            <div className="text-xs text-emerald-400/70 mb-1">Total Calls</div>
            <div className="text-xl font-bold text-emerald-300">{summary.circuitCalls.toLocaleString()}</div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-3 border border-emerald-500/20">
            <div className="text-xs text-emerald-400/70 mb-1">Avg Response</div>
            <div className="text-xl font-bold text-emerald-300">{circuitMetric ? formatDuration(circuitMetric.avgDurationMs) : '—'}</div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-3 border border-emerald-500/20">
            <div className="text-xs text-emerald-400/70 mb-1">Success Rate</div>
            <div className="text-xl font-bold text-emerald-300">
              {circuitMetric && circuitMetric.totalCalls > 0
                ? `${Math.round((circuitMetric.successCount / circuitMetric.totalCalls) * 100)}%`
                : '—'}
            </div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-3 border border-emerald-500/20">
            <div className="text-xs text-emerald-400/70 mb-1">Tokens Used</div>
            <div className="text-xl font-bold text-emerald-300">
              {circuitMetric ? circuitMetric.totalTokensUsed.toLocaleString() : '—'}
            </div>
          </div>
        </div>

        {circuitMetric && Object.keys(circuitMetric.modelsUsed).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-emerald-400/70">Models:</span>
            {Object.entries(circuitMetric.modelsUsed).map(([model, count]) => (
              <span key={model} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-xs border border-emerald-500/20">
                {model} ({count})
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // OVERVIEW TAB
  // ──────────────────────────────────────────────────────────────────────────

  const renderOverview = () => {
    if (!summary) return null;

    return (
      <div>
        {renderCircuitHero()}

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <Activity className="w-3.5 h-3.5" />
              Total API Calls
            </div>
            <div className="text-2xl font-bold text-white">{summary.totalCalls.toLocaleString()}</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <Clock className="w-3.5 h-3.5" />
              Avg Duration
            </div>
            <div className="text-2xl font-bold text-white">{formatDuration(summary.avgDurationMs)}</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              Error Rate
            </div>
            <div className={`text-2xl font-bold ${summary.errorRate > 5 ? 'text-red-400' : summary.errorRate > 2 ? 'text-amber-400' : 'text-green-400'}`}>
              {summary.errorRate}%
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <Cpu className="w-3.5 h-3.5" />
              AI Insights Calls
            </div>
            <div className="text-2xl font-bold text-white">{summary.aiInsightsCalls.toLocaleString()}</div>
          </div>
        </div>

        {/* Provider Metrics Grid */}
        <h4 className="text-sm font-semibold text-white mb-3">Provider Performance</h4>
        <div className="space-y-3 mb-6">
          {metrics
            .filter(m => m.totalCalls > 0)
            .sort((a, b) => {
              // Circuit always first
              if (a.provider === 'cisco-circuit') return -1;
              if (b.provider === 'cisco-circuit') return 1;
              return b.totalCalls - a.totalCalls;
            })
            .map(m => {
              const colors = getProviderColor(m.provider);
              const isCircuit = m.provider === 'cisco-circuit';
              return (
                <div
                  key={m.provider}
                  className={`rounded-lg p-4 border transition-colors ${
                    isCircuit
                      ? 'bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20'
                      : `${colors.bg} ${colors.border}`
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isCircuit && <Zap className="w-4 h-4 text-emerald-400" />}
                      <span className={`text-sm font-bold ${colors.text}`}>
                        {getProviderLabel(m.provider)}
                      </span>
                      {isCircuit && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 uppercase">
                          Primary
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {m.callsPerMinute.toFixed(1)} calls/min
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-3 text-center">
                    <div>
                      <div className="text-xs text-slate-400">Calls</div>
                      <div className="text-sm font-bold text-white">{m.totalCalls}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Success</div>
                      <div className="text-sm font-bold text-green-400">{m.successCount}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Errors</div>
                      <div className={`text-sm font-bold ${m.errorCount > 0 ? 'text-red-400' : 'text-slate-500'}`}>{m.errorCount}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Avg Time</div>
                      <div className="text-sm font-bold text-white">{formatDuration(m.avgDurationMs)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">P95</div>
                      <div className="text-sm font-bold text-white">{formatDuration(m.p95DurationMs)}</div>
                    </div>
                  </div>

                  {/* Progress bar showing success rate */}
                  {m.totalCalls > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Success rate</span>
                        <span>{Math.round((m.successCount / m.totalCalls) * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isCircuit ? 'bg-emerald-500' : 'bg-cyan-500'}`}
                          style={{ width: `${(m.successCount / m.totalCalls) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Top Endpoints */}
        {summary.topEndpoints.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-white mb-3">Top Endpoints</h4>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg divide-y divide-slate-700/50">
              {summary.topEndpoints.slice(0, 8).map((ep, i) => (
                <div key={ep.endpoint} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-5">{i + 1}</span>
                    <code className="text-xs text-slate-300 font-mono">{ep.endpoint}</code>
                  </div>
                  <span className="text-xs font-medium text-slate-400">{ep.count} calls</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Models */}
        {summary.activeModels.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Active AI Models</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {summary.activeModels.slice(0, 8).map((m) => {
                const colors = getProviderColor(m.provider);
                return (
                  <div key={m.model} className={`flex items-center justify-between px-3 py-2 rounded-lg ${colors.bg} border ${colors.border}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${colors.text}`}>{m.model}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors.badge}`}>
                        {getProviderLabel(m.provider)}
                      </span>
                      <span className="text-xs text-slate-400">{m.calls}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // LOGS TAB
  // ──────────────────────────────────────────────────────────────────────────

  const renderLogs = () => {
    return (
      <div>
        {/* Filters */}
        <div className="mb-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Filters</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 block">Provider</label>
              <select
                value={filterProvider}
                onChange={(e) => setFilterProvider(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                title="Filter by API provider"
              >
                <option value="">All Providers</option>
                <option value="cisco-circuit">Cisco CIRCUIT</option>
                <option value="azure-openai">Azure OpenAI</option>
                <option value="gemini">Gemini</option>
                <option value="snowflake">Snowflake</option>
                <option value="langchain">LangChain</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 block">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                title="Filter by call status"
              >
                <option value="">All Statuses</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
                <option value="timeout">Timeout</option>
                <option value="rate-limited">Rate Limited</option>
                <option value="fallback">Fallback</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 block">Endpoint</label>
              <input
                type="text"
                value={filterEndpoint}
                onChange={(e) => setFilterEndpoint(e.target.value)}
                placeholder="Filter endpoint..."
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                title="Filter by endpoint URL"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 block">Task Type</label>
              <select
                value={filterTaskType}
                onChange={(e) => setFilterTaskType(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                title="Filter by AI task type"
              >
                <option value="">All Tasks</option>
                <option value="summarization">Summarization</option>
                <option value="security_analysis">Security Analysis</option>
                <option value="predictive_analytics">Predictive Analytics</option>
                <option value="anomaly_detection">Anomaly Detection</option>
                <option value="general_reasoning">General Reasoning</option>
                <option value="voice_interaction">Voice Interaction</option>
                <option value="data_analysis">Data Analysis</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pagination Info */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-400">
            Showing {logs.length} of {logTotal.toLocaleString()} logs
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs(logPage - 1)}
              disabled={logPage <= 1}
              className="p-1.5 rounded bg-slate-700 border border-slate-600 disabled:opacity-30 hover:bg-slate-600 transition-colors"
              title="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-300" />
            </button>
            <span className="text-xs text-slate-400">
              Page {logPage} of {logTotalPages}
            </span>
            <button
              onClick={() => fetchLogs(logPage + 1)}
              disabled={logPage >= logTotalPages}
              className="p-1.5 rounded bg-slate-700 border border-slate-600 disabled:opacity-30 hover:bg-slate-600 transition-colors"
              title="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            </button>
          </div>
        </div>

        {/* Log Table */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_120px_90px_80px_70px_60px] gap-2 px-4 py-2.5 bg-slate-800 border-b border-slate-700 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            <div>Endpoint</div>
            <div>Provider</div>
            <div>Status</div>
            <div>Duration</div>
            <div>Tokens</div>
            <div>Time</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-700/50 max-h-[500px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                No logs match current filters
              </div>
            ) : (
              logs.map((log) => {
                const colors = getProviderColor(log.provider);
                const statusDef = STATUS_STYLES[log.status] || STATUS_STYLES['error'];
                const StatusIcon = statusDef.icon;
                const isCircuit = log.provider === 'cisco-circuit';

                return (
                  <div
                    key={log.id}
                    className={`grid grid-cols-[1fr_120px_90px_80px_70px_60px] gap-2 px-4 py-2 items-center hover:bg-slate-700/30 transition-colors ${
                      isCircuit ? 'border-l-2 border-l-emerald-500/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${log.method === 'POST' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-600/50 text-slate-300'}`}>
                        {log.method}
                      </span>
                      <code className="text-xs text-slate-300 font-mono truncate" title={log.endpoint}>
                        {log.endpoint}
                      </code>
                    </div>
                    <div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors.badge} truncate inline-block max-w-full`}>
                        {isCircuit ? 'CIRCUIT' : getProviderLabel(log.provider).split(' ')[0]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <StatusIcon className={`w-3 h-3 ${statusDef.color}`} />
                      <span className={`text-[10px] ${statusDef.color}`}>{log.status}</span>
                    </div>
                    <div className={`text-xs font-mono ${log.durationMs > 5000 ? 'text-red-400' : log.durationMs > 1000 ? 'text-amber-400' : 'text-slate-300'}`}>
                      {formatDuration(log.durationMs)}
                    </div>
                    <div className="text-xs text-slate-400">
                      {log.tokensUsed ? log.tokensUsed.toLocaleString() : '—'}
                    </div>
                    <div className="text-[10px] text-slate-500" title={new Date(log.timestamp).toLocaleString()}>
                      {new Date(log.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // AI INSIGHTS TAB
  // ──────────────────────────────────────────────────────────────────────────

  const renderAIInsights = () => {
    if (!aiInsights) return null;

    return (
      <div>
        {/* AI Usage KPIs */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/20 border border-blue-500/30 rounded-lg p-4">
            <div className="text-xs text-blue-400/70 mb-1">Total AI Calls</div>
            <div className="text-2xl font-bold text-blue-300">{aiInsights.totalAICalls.toLocaleString()}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/30 rounded-lg p-4">
            <div className="text-xs text-purple-400/70 mb-1">Active Models</div>
            <div className="text-2xl font-bold text-purple-300">{aiInsights.topPatterns.length}</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-900/30 to-cyan-900/20 border border-emerald-500/30 rounded-lg p-4">
            <div className="text-xs text-emerald-400/70 mb-1">Task Types</div>
            <div className="text-2xl font-bold text-emerald-300">{Object.keys(aiInsights.taskDistribution).length}</div>
          </div>
        </div>

        {/* Provider Distribution */}
        <h4 className="text-sm font-semibold text-white mb-3">AI Provider Distribution</h4>
        <div className="space-y-2 mb-6">
          {Object.entries(aiInsights.providerDistribution)
            .sort(([a], [b]) => a === 'cisco-circuit' ? -1 : b === 'cisco-circuit' ? 1 : 0)
            .map(([provider, data]) => {
              const colors = getProviderColor(provider);
              const isCircuit = provider === 'cisco-circuit';
              return (
                <div key={provider} className={`rounded-lg p-3 border ${isCircuit ? 'bg-emerald-500/10 border-emerald-500/30' : `${colors.bg} ${colors.border}`}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${colors.text}`}>
                      {isCircuit && <Zap className="w-3.5 h-3.5 inline mr-1" />}
                      {getProviderLabel(provider)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {data.calls} calls ({data.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isCircuit ? 'bg-emerald-500' : provider === 'azure-openai' ? 'bg-blue-500' : 'bg-purple-500'}`}
                      style={{ width: `${data.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>

        {/* Task Type Performance */}
        <h4 className="text-sm font-semibold text-white mb-3">Task Type Performance</h4>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg divide-y divide-slate-700/50 mb-6">
          {Object.entries(aiInsights.taskDistribution)
            .sort(([, a], [, b]) => b - a)
            .map(([task, count]) => (
              <div key={task} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs text-slate-300 capitalize">{task.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-400">{count} calls</span>
                  {aiInsights.avgResponseByTask[task] && (
                    <span className="text-xs text-slate-500">avg {formatDuration(aiInsights.avgResponseByTask[task])}</span>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* Usage Patterns */}
        <h4 className="text-sm font-semibold text-white mb-3">Top Usage Patterns</h4>
        <div className="space-y-2">
          {aiInsights.topPatterns.slice(0, 8).map((pattern, i) => {
            const [provider, task, model] = pattern.pattern.split(':');
            const colors = getProviderColor(provider);
            return (
              <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${colors.bg} border ${colors.border}`}>
                <span className="text-xs text-slate-500 w-5">#{i + 1}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors.badge}`}>
                  {getProviderLabel(provider)}
                </span>
                <span className="text-xs text-slate-300 capitalize">{task.replace(/_/g, ' ')}</span>
                <code className="text-[10px] text-slate-500 font-mono">{model}</code>
                <span className="ml-auto text-xs text-slate-400">{pattern.frequency}x</span>
                <span className="text-[10px] text-slate-500">{formatDuration(pattern.avgDuration)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ──────────────────────────────────────────────────────────────────────────

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin mr-3" />
        <span className="text-sm text-slate-400">Loading API Session Tracker...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
        <XCircle className="w-5 h-5 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-red-300">{error}</p>
        <button onClick={loadAll} className="mt-2 text-xs text-red-400 hover:text-red-300 underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
            <Globe className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">API Session Tracker</h3>
            <p className="text-[10px] text-slate-400">
              Session started {summary ? formatTimestamp(summary.sessionStart) : '—'} — {summary?.totalCalls.toLocaleString() || 0} total calls tracked
            </p>
          </div>
        </div>
        <button
          onClick={loadAll}
          className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 transition-colors"
          title="Refresh data"
        >
          <RefreshCw className="w-4 h-4 text-slate-300" />
        </button>
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-1 bg-slate-800/50 border border-slate-700 rounded-lg p-1">
        {([
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'logs', label: 'Session Logs', icon: Database },
          { key: 'ai-insights', label: 'AI Insights', icon: Cpu },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveView(key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              activeView === key
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeView === 'overview' && renderOverview()}
      {activeView === 'logs' && renderLogs()}
      {activeView === 'ai-insights' && renderAIInsights()}
    </div>
  );
};

export default ApiSessionTracker;
