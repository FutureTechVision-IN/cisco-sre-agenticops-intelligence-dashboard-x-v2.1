/**
 * CircuitInsightsDashboard - Cisco CIRCUIT MCP Intelligence Dashboard
 * Comprehensive AI/ML insights from dual API key architecture with
 * MCP context protocol, multi-model pipeline, and real-time monitoring.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Brain, Shield, Activity, AlertTriangle, TrendingUp, TrendingDown,
  Zap, RefreshCw, CheckCircle, XCircle, Clock, Key, Cpu, BarChart3,
  Target, Layers, Gauge, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';

// ---- Types ----

interface KeyValidation {
  keyId: string;
  isValid: boolean;
  status: string;
  domain: string;
  purpose: string;
  accountId: string;
  capabilities: string[];
  rateLimits: { rpm: number; rpd: number; remaining: number };
  keyAge: string;
  expiresIn: string;
  structureValid: boolean;
  endpointReachable: boolean;
  authenticationStatus: 'authenticated' | 'fallback' | 'failed';
  diagnostics: string[];
}

interface RiskAssessment {
  overallScore: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{ factor: string; weight: number; score: number; trend: string }>;
  mitigationPriorities: string[];
}

interface Prediction {
  metric: string;
  currentValue: number;
  predictedValues: Array<{ period: string; value: number; confidence: number; interval: { low: number; high: number } }>;
  trend: string;
  model: string;
  r2Score: number;
}

interface Anomaly {
  type: string;
  metric: string;
  period: string;
  observedValue: number;
  expectedValue: number;
  deviationSigma: number;
  severity: 'info' | 'warning' | 'critical';
  explanation: string;
}

interface Pattern {
  patternType: string;
  description: string;
  confidence: number;
  affectedMetrics: string[];
  timespan: string;
  actionable: boolean;
}

interface Recommendation {
  id: string;
  priority: 'immediate' | 'short-term' | 'long-term';
  category: string;
  title: string;
  description: string;
  impact: string;
  confidence: number;
  estimatedEffort: string;
}

interface Insight {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: string;
  confidence: number;
  generatedBy: string;
}

interface PipelineStage {
  name: string;
  model: string;
  status: string;
  durationMs: number;
  outputSummary: string;
}

interface InsightsData {
  success: boolean;
  sessionId: string;
  durationMs: number;
  riskAssessment: RiskAssessment;
  insights: Insight[];
  predictions: Prediction[];
  anomalies: Anomaly[];
  patterns: Pattern[];
  recommendations: Recommendation[];
  pipelineSummary: { stagesCompleted: number; modelsUsed: number; totalDurationMs: number };
}

interface ValidationData {
  success: boolean;
  validationDurationMs: number;
  keys: KeyValidation[];
  summary: { totalKeys: number; activeKeys: number; structureValid: number; endpointsReachable: number; totalCapabilities: number };
}

interface PipelineData {
  success: boolean;
  sessionId: string;
  pipelineStages: PipelineStage[];
  performanceMetrics: { totalDurationMs: number; stagesCompleted: number; modelsUsed: string[] };
}

interface MonitoringData {
  success: boolean;
  totalCalls: number;
  successRate: number;
  avgLatency: number;
  p95Latency: number;
  keyBreakdown: Array<{ keyId: string; calls: number; successRate: number; avgLatency: number; p95Latency: number; remaining: number; lastUsed: string }>;
  hourlyDistribution: Array<{ hour: number; calls: number }>;
  endpointBreakdown: Array<{ endpoint: string; calls: number; avgLatency: number }>;
  recommendations: string[];
}

// ---- Sub-Tab type ----
type SubTab = 'overview' | 'keys' | 'pipeline' | 'predictions' | 'recommendations' | 'monitoring';

// ---- Component ----

export function CircuitInsightsDashboard() {
  const [activeTab, setActiveTab] = useState<SubTab>('overview');
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [validation, setValidation] = useState<ValidationData | null>(null);
  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [monitoring, setMonitoring] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- AI/ML Card Modal ----
  const [cardModal, setCardModal] = useState<{
    open: boolean;
    card: { label: string; value: string; color: string } | null;
    mlLoading: boolean;
    mlData: any;
    mlError: string | null;
  }>({ open: false, card: null, mlLoading: false, mlData: null, mlError: null });
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openCardModal = useCallback((label: string, value: string, color: string) => {
    if (abortRef.current) abortRef.current.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCardModal({ open: true, card: { label, value, color }, mlLoading: true, mlData: null, mlError: null });
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/ml/analyze/comprehensive', { signal: ctrl.signal });
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const json = await res.json();
        setCardModal(prev => ({ ...prev, mlLoading: false, mlData: json.analysis || json }));
      } catch (err: any) {
        if (err.name !== 'AbortError')
          setCardModal(prev => ({ ...prev, mlLoading: false, mlError: err.message ?? 'Analysis failed.' }));
      }
    }, 300);
  }, []);

  const closeCardModal = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCardModal({ open: false, card: null, mlLoading: false, mlData: null, mlError: null });
  }, []);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/circuit/insights');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInsights(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchValidation = useCallback(async () => {
    setValidating(true);
    try {
      const res = await fetch('/api/circuit/keys/validate');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setValidation(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setValidating(false);
    }
  }, []);

  const fetchPipeline = useCallback(async () => {
    try {
      const res = await fetch('/api/circuit/pipeline/run');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPipeline(await res.json());
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const fetchMonitoring = useCallback(async () => {
    try {
      const res = await fetch('/api/circuit/monitoring');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMonitoring(await res.json());
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  // Fetch extra data when switching tabs
  useEffect(() => {
    if (activeTab === 'keys' && !validation) fetchValidation();
    if (activeTab === 'pipeline' && !pipeline) fetchPipeline();
    if (activeTab === 'monitoring') fetchMonitoring();
  }, [activeTab, validation, pipeline, fetchValidation, fetchPipeline, fetchMonitoring]);

  const tabs: { key: SubTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <Gauge className="w-3.5 h-3.5" /> },
    { key: 'keys', label: 'API Keys', icon: <Key className="w-3.5 h-3.5" /> },
    { key: 'pipeline', label: 'ML Pipeline', icon: <Cpu className="w-3.5 h-3.5" /> },
    { key: 'predictions', label: 'Predictions', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { key: 'recommendations', label: 'Actions', icon: <Target className="w-3.5 h-3.5" /> },
    { key: 'monitoring', label: 'Monitoring', icon: <Activity className="w-3.5 h-3.5" /> },
  ];

  if (loading && !insights) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="ml-3 text-slate-300 text-sm">Running CIRCUIT MCP Intelligence Pipeline...</span>
      </div>
    );
  }

  if (error && !insights) {
    return (
      <div className="text-center py-20">
        <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-red-300 text-sm">{error}</p>
        <button onClick={fetchInsights} className="mt-4 px-4 py-2 bg-cyan-600 text-white rounded text-xs hover:bg-cyan-500">Retry</button>
      </div>
    );
  }

  const risk = insights?.riskAssessment;
  const riskColor = risk?.level === 'critical' ? 'text-red-400' : risk?.level === 'high' ? 'text-orange-400' : risk?.level === 'medium' ? 'text-yellow-400' : 'text-emerald-400';
  const riskBg = risk?.level === 'critical' ? 'bg-red-500/10 border-red-500/30' : risk?.level === 'high' ? 'bg-orange-500/10 border-orange-500/30' : risk?.level === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-emerald-500/10 border-emerald-500/30';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg border border-cyan-500/30">
            <Brain className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide uppercase">CIRCUIT MCP Intelligence</h2>
            <p className="ds-page-subtitle">
              Dual-Key Architecture | MCP Context Protocol | {insights?.pipelineSummary.modelsUsed || 0} ML Models | 
              Session: {insights?.sessionId?.slice(0, 16) || '---'}
            </p>
          </div>
        </div>
        <button onClick={fetchInsights} className="ds-header-action">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Running...' : 'Refresh'}
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-800/40 p-1 rounded-lg border border-slate-700/50">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`ds-sub-tab flex-1 justify-center whitespace-nowrap ${activeTab === t.key ? 'ds-sub-tab-active' : ''}`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && insights && <OverviewTab insights={insights} riskColor={riskColor} riskBg={riskBg} onCardClick={openCardModal} />}
      {activeTab === 'keys' && <KeysTab validation={validation} validating={validating} onRefresh={fetchValidation} onCardClick={openCardModal} />}
      {activeTab === 'pipeline' && <PipelineTab pipeline={pipeline} insights={insights} onCardClick={openCardModal} />}
      {activeTab === 'predictions' && insights && <PredictionsTab predictions={insights.predictions} anomalies={insights.anomalies} patterns={insights.patterns} onCardClick={openCardModal} />}
      {activeTab === 'recommendations' && insights && <RecommendationsTab recommendations={insights.recommendations} risk={insights.riskAssessment} onCardClick={openCardModal} />}
      {activeTab === 'monitoring' && <MonitoringTab monitoring={monitoring} onCardClick={openCardModal} />}

      {/* ---- AI/ML Card Modal ---- */}
      {cardModal.open && cardModal.card && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={closeCardModal}
          role="dialog"
          aria-modal="true"
          aria-label={`ML Analysis: ${cardModal.card.label}`}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r ${
              cardModal.card.color === 'cyan' ? 'from-cyan-500/10 to-blue-500/10' :
              cardModal.card.color === 'emerald' ? 'from-emerald-500/10 to-teal-500/10' :
              cardModal.card.color === 'violet' ? 'from-violet-500/10 to-purple-500/10' :
              cardModal.card.color === 'amber' ? 'from-amber-500/10 to-yellow-500/10' :
              cardModal.card.color === 'rose' ? 'from-rose-500/10 to-red-500/10' :
              cardModal.card.color === 'purple' ? 'from-purple-500/10 to-violet-500/10' :
              'from-blue-500/10 to-indigo-500/10'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    cardModal.card.color === 'cyan' ? 'bg-cyan-500/20' :
                    cardModal.card.color === 'emerald' ? 'bg-emerald-500/20' :
                    cardModal.card.color === 'violet' ? 'bg-violet-500/20' :
                    cardModal.card.color === 'amber' ? 'bg-amber-500/20' :
                    cardModal.card.color === 'rose' ? 'bg-rose-500/20' :
                    cardModal.card.color === 'purple' ? 'bg-purple-500/20' :
                    'bg-blue-500/20'
                  }`}>
                    <Brain className={`w-5 h-5 ${
                      cardModal.card.color === 'cyan' ? 'text-cyan-400' :
                      cardModal.card.color === 'emerald' ? 'text-emerald-400' :
                      cardModal.card.color === 'violet' ? 'text-violet-400' :
                      cardModal.card.color === 'amber' ? 'text-amber-400' :
                      cardModal.card.color === 'rose' ? 'text-rose-400' :
                      cardModal.card.color === 'purple' ? 'text-purple-400' :
                      'text-blue-400'
                    }`} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">ML Deep Dive</p>
                    <h3 className="text-sm font-bold text-white">{cardModal.card.label}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${
                    cardModal.card.color === 'cyan' ? 'text-cyan-400' :
                    cardModal.card.color === 'emerald' ? 'text-emerald-400' :
                    cardModal.card.color === 'violet' ? 'text-violet-400' :
                    cardModal.card.color === 'amber' ? 'text-amber-400' :
                    cardModal.card.color === 'rose' ? 'text-rose-400' :
                    cardModal.card.color === 'purple' ? 'text-purple-400' :
                    'text-blue-400'
                  }`}>{cardModal.card.value}</span>
                  <button
                    onClick={closeCardModal}
                    className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                    aria-label="Close modal"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              {cardModal.mlLoading && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                  <p className="text-sm text-slate-400">Running ML analysis pipeline...</p>
                </div>
              )}
              {cardModal.mlError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-sm text-red-300">{cardModal.mlError}</p>
                </div>
              )}
              {cardModal.mlData && !cardModal.mlLoading && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {cardModal.mlData.forecast !== undefined && (
                      <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
                        <p className="text-xs text-slate-500 uppercase mb-1">Forecast</p>
                        <p className="text-sm font-bold text-cyan-400">{Number(cardModal.mlData.forecast).toFixed(1)}</p>
                      </div>
                    )}
                    {cardModal.mlData.confidenceLevel !== undefined && (
                      <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
                        <p className="text-xs text-slate-500 uppercase mb-1">Confidence</p>
                        <p className="text-sm font-bold text-emerald-400">{(Number(cardModal.mlData.confidenceLevel) * 100).toFixed(0)}%</p>
                      </div>
                    )}
                    {cardModal.mlData.trend && (
                      <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
                        <p className="text-xs text-slate-500 uppercase mb-1">Trend</p>
                        <p className={`text-sm font-bold capitalize ${cardModal.mlData.trend === 'increasing' ? 'text-red-400' : cardModal.mlData.trend === 'decreasing' ? 'text-emerald-400' : 'text-slate-300'}`}>{cardModal.mlData.trend}</p>
                      </div>
                    )}
                    {cardModal.mlData.anomaliesDetected !== undefined && (
                      <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
                        <p className="text-xs text-slate-500 uppercase mb-1">Anomalies</p>
                        <p className={`text-sm font-bold ${cardModal.mlData.anomaliesDetected > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{cardModal.mlData.anomaliesDetected}</p>
                      </div>
                    )}
                    {cardModal.mlData.riskFactorsIdentified !== undefined && (
                      <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
                        <p className="text-xs text-slate-500 uppercase mb-1">Risk Factors</p>
                        <p className="text-sm font-bold text-rose-400">{cardModal.mlData.riskFactorsIdentified}</p>
                      </div>
                    )}
                    {cardModal.mlData.estimatedTimeToResolution && (
                      <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
                        <p className="text-xs text-slate-500 uppercase mb-1">ETA Resolution</p>
                        <p className="text-sm font-bold text-violet-400">{cardModal.mlData.estimatedTimeToResolution}</p>
                      </div>
                    )}
                  </div>
                  {cardModal.mlData.recommendations && cardModal.mlData.recommendations.length > 0 && (
                    <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
                      <p className="text-xs text-slate-500 uppercase mb-2">ML Recommendations</p>
                      <ul className="space-y-1">
                        {cardModal.mlData.recommendations.slice(0, 3).map((r: string, i: number) => (
                          <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                            <span className="text-cyan-500 mt-0.5">›</span>{r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Overview Tab ----

function OverviewTab({ insights, riskColor, riskBg, onCardClick }: { insights: InsightsData; riskColor: string; riskBg: string; onCardClick: (label: string, value: string, color: string) => void }) {
  const risk = insights.riskAssessment;
  const riskModalColor = risk.level === 'critical' || risk.level === 'high' ? 'rose' : risk.level === 'medium' ? 'amber' : 'emerald';
  return (
    <div className="space-y-4">
      {/* Risk Score + Pipeline Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risk Score */}
        <div className={`p-4 rounded-lg border ${riskBg}`}>
          <div className="flex items-center gap-2 mb-3">
            <Shield className={`w-5 h-5 ${riskColor}`} />
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Composite Risk Score</span>
          </div>
          <button
            className={`flex items-end gap-2 w-full text-left rounded-lg px-1 py-0.5 hover:bg-white/5 transition-colors cursor-pointer group`}
            onClick={() => onCardClick('Composite Risk Score', `${risk.overallScore}/100 (${risk.level})`, riskModalColor)}
            aria-label={`ML analysis for Composite Risk Score ${risk.overallScore}/100`}
          >
            <span className={`text-4xl font-bold ${riskColor} group-hover:opacity-80 transition-opacity`}>{risk.overallScore}</span>
            <span className="text-slate-500 text-sm mb-1">/100</span>
            <span className={`ml-auto px-2 py-0.5 rounded text-xs font-bold uppercase ${riskColor} ${riskBg}`}>
              {risk.level}
            </span>
          </button>
          <div className="mt-3 h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                risk.level === 'critical' ? 'bg-red-500' : risk.level === 'high' ? 'bg-orange-500' : risk.level === 'medium' ? 'bg-yellow-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${risk.overallScore}%` }}
            />
          </div>
          <div className="mt-3 space-y-1">
            {risk.factors.map((f, i) => {
              const fc = f.trend === 'increasing' || f.trend === 'worsening' ? 'rose' : f.trend === 'improving' ? 'emerald' : 'cyan';
              return (
                <button
                  key={i}
                  className="w-full flex items-center justify-between text-xs px-2 py-1 rounded hover:bg-white/5 transition-colors cursor-pointer group"
                  onClick={() => onCardClick(f.factor, `${f.score}% — ${f.trend}`, fc)}
                  aria-label={`ML analysis for ${f.factor}`}
                >
                  <span className="text-slate-400 group-hover:text-slate-200 transition-colors text-left">{f.factor}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-300 font-medium">{f.score}%</span>
                    <span className={`text-xs ${f.trend === 'increasing' || f.trend === 'worsening' ? 'text-red-400' : f.trend === 'improving' ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {f.trend}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pipeline Performance */}
        <div className="p-4 rounded-lg border border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-5 h-5 text-violet-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">MCP Pipeline</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="text-left p-2 rounded hover:bg-violet-500/10 transition-colors group" onClick={() => onCardClick('Pipeline Session', insights.sessionId.slice(4, 16), 'violet')} aria-label="ML analysis for Pipeline Session">
              <span className="text-xs text-slate-500 uppercase block">Session</span>
              <span className="text-sm font-bold text-violet-300 group-hover:text-violet-200 transition-colors">{insights.sessionId.slice(4, 16)}</span>
            </button>
            <button className="text-left p-2 rounded hover:bg-cyan-500/10 transition-colors group" onClick={() => onCardClick('Pipeline Duration', `${insights.pipelineSummary.totalDurationMs}ms`, 'cyan')} aria-label="ML analysis for Pipeline Duration">
              <span className="text-xs text-slate-500 uppercase block">Duration</span>
              <span className="text-sm font-bold text-cyan-300 group-hover:text-cyan-200 transition-colors">{insights.pipelineSummary.totalDurationMs}ms</span>
            </button>
            <button className="text-left p-2 rounded hover:bg-emerald-500/10 transition-colors group" onClick={() => onCardClick('Pipeline Stages', `${insights.pipelineSummary.stagesCompleted} completed`, 'emerald')} aria-label="ML analysis for Pipeline Stages">
              <span className="text-xs text-slate-500 uppercase block">Stages</span>
              <span className="text-sm font-bold text-emerald-300 group-hover:text-emerald-200 transition-colors">{insights.pipelineSummary.stagesCompleted}</span>
            </button>
            <button className="text-left p-2 rounded hover:bg-amber-500/10 transition-colors group" onClick={() => onCardClick('ML Models Used', `${insights.pipelineSummary.modelsUsed} models`, 'amber')} aria-label="ML analysis for ML Models">
              <span className="text-xs text-slate-500 uppercase block">ML Models</span>
              <span className="text-sm font-bold text-amber-300 group-hover:text-amber-200 transition-colors">{insights.pipelineSummary.modelsUsed}</span>
            </button>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <div className="text-xs text-slate-400 mb-1 uppercase tracking-wider">Quick Stats</div>
            <div className="grid grid-cols-3 gap-2">
              <button className="flex items-center gap-1.5 p-1.5 rounded hover:bg-yellow-500/10 transition-colors group" onClick={() => onCardClick('Anomalies Detected', `${insights.anomalies.length}`, 'amber')} aria-label="ML analysis for Anomalies">
                <span className="text-yellow-400 group-hover:scale-110 transition-transform"><AlertTriangle className="w-3 h-3" /></span>
                <div>
                  <span className="text-sm font-bold text-yellow-400">{insights.anomalies.length}</span>
                  <span className="text-xs text-slate-500 block">Anomalies</span>
                </div>
              </button>
              <button className="flex items-center gap-1.5 p-1.5 rounded hover:bg-cyan-500/10 transition-colors group" onClick={() => onCardClick('Forecast Predictions', `${insights.predictions.length}`, 'cyan')} aria-label="ML analysis for Forecasts">
                <span className="text-cyan-400 group-hover:scale-110 transition-transform"><TrendingUp className="w-3 h-3" /></span>
                <div>
                  <span className="text-sm font-bold text-cyan-400">{insights.predictions.length}</span>
                  <span className="text-xs text-slate-500 block">Forecasts</span>
                </div>
              </button>
              <button className="flex items-center gap-1.5 p-1.5 rounded hover:bg-violet-500/10 transition-colors group" onClick={() => onCardClick('ML Patterns', `${insights.patterns.length}`, 'violet')} aria-label="ML analysis for Patterns">
                <span className="text-violet-400 group-hover:scale-110 transition-transform"><Layers className="w-3 h-3" /></span>
                <div>
                  <span className="text-sm font-bold text-violet-400">{insights.patterns.length}</span>
                  <span className="text-xs text-slate-500 block">Patterns</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Top Insights */}
        <div className="p-4 rounded-lg border border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-amber-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">AI Insights</span>
            <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">LIVE</span>
          </div>
          <div className="space-y-2">
            {insights.insights.slice(0, 4).map((ins, i) => {
              const insColor = ins.severity === 'critical' ? 'rose' : ins.severity === 'high' || ins.severity === 'warning' ? 'amber' : ins.severity === 'low' ? 'blue' : 'cyan';
              return (
                <button
                  key={i}
                  className="w-full text-left p-2 bg-slate-800/50 rounded border border-slate-700/30 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all cursor-pointer group"
                  onClick={() => onCardClick(ins.title, `${(ins.confidence * 100).toFixed(0)}% conf. — ${ins.severity}`, insColor)}
                  aria-label={`ML analysis for insight: ${ins.title}`}
                >
                  <div className="flex items-center gap-1.5">
                    <SeverityDot severity={ins.severity} />
                    <span className="text-xs font-bold text-white uppercase group-hover:text-amber-200 transition-colors">{ins.title}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{ins.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">{ins.generatedBy}</span>
                    <span className="text-xs text-cyan-500">{(ins.confidence * 100).toFixed(0)}% conf.</span>
                    <span className="ml-auto text-xs text-amber-400/70 opacity-0 group-hover:opacity-100 transition-opacity">ML Deep Dive →</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mitigation Priorities */}
      {risk.mitigationPriorities.length > 0 && (
        <div className="p-4 rounded-lg border border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-cyan-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Mitigation Priorities</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {risk.mitigationPriorities.map((p, i) => (
              <button
                key={i}
                className="flex items-start gap-2 p-2 bg-slate-800/50 rounded border border-slate-700/30 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all text-left group cursor-pointer"
                onClick={() => onCardClick(`Priority ${i + 1}: Mitigation`, p, 'cyan')}
                aria-label={`ML analysis for mitigation priority ${i + 1}`}
              >
                <span className="text-cyan-400 font-bold text-xs mt-0.5 shrink-0 group-hover:text-cyan-300 transition-colors">{i + 1}</span>
                <span className="text-xs text-slate-300 group-hover:text-slate-100 transition-colors">{p}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Keys Tab ----

function KeysTab({ validation, validating, onRefresh, onCardClick }: { validation: ValidationData | null; validating: boolean; onRefresh: () => void; onCardClick: (label: string, value: string, color: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">CIRCUIT API Key Validation</span>
        <button onClick={onRefresh} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/50 border border-slate-600/50 rounded text-xs text-slate-300 hover:bg-slate-600/50">
          <RefreshCw className={`w-3 h-3 ${validating ? 'animate-spin' : ''}`} />
          {validating ? 'Validating...' : 'Re-validate'}
        </button>
      </div>

      {!validation && validating && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
          <span className="ml-2 text-sm text-slate-400">Validating API keys...</span>
        </div>
      )}

      {validation && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <SummaryCard label="Total Keys" value={validation.summary.totalKeys} icon={<Key className="w-4 h-4" />} color="text-cyan-400" onClick={() => onCardClick('Total API Keys', `${validation.summary.totalKeys}`, 'cyan')} />
            <SummaryCard label="Active" value={validation.summary.activeKeys} icon={<CheckCircle className="w-4 h-4" />} color="text-emerald-400" onClick={() => onCardClick('Active API Keys', `${validation.summary.activeKeys} active`, 'emerald')} />
            <SummaryCard label="Structure Valid" value={validation.summary.structureValid} icon={<Shield className="w-4 h-4" />} color="text-violet-400" onClick={() => onCardClick('Structure Valid Keys', `${validation.summary.structureValid}`, 'violet')} />
            <SummaryCard label="Endpoints" value={validation.summary.endpointsReachable} icon={<Activity className="w-4 h-4" />} color="text-amber-400" onClick={() => onCardClick('Reachable Endpoints', `${validation.summary.endpointsReachable}`, 'amber')} />
            <SummaryCard label="Capabilities" value={validation.summary.totalCapabilities} icon={<Zap className="w-4 h-4" />} color="text-pink-400" onClick={() => onCardClick('Total Capabilities', `${validation.summary.totalCapabilities}`, 'violet')} />
          </div>

          {/* Key details */}
          {validation.keys.map((key, i) => (
            <div key={i} className="p-4 rounded-lg border border-slate-700/50 bg-slate-800/30">
              <button
                className="w-full flex items-center justify-between mb-3 hover:bg-cyan-500/5 rounded px-1 py-0.5 transition-colors group cursor-pointer"
                onClick={() => onCardClick(`Key: ${key.keyId}`, `${key.status} — ${key.authenticationStatus} — ${key.rateLimits.remaining} remaining`, key.isValid ? 'emerald' : 'rose')}
                aria-label={`ML analysis for API key ${key.keyId}`}
              >
                <div className="flex items-center gap-2">
                  <Key className={`w-4 h-4 ${key.isValid ? 'text-emerald-400' : 'text-red-400'}`} />
                  <span className="text-sm font-bold text-white uppercase tracking-wider group-hover:text-cyan-200 transition-colors">{key.keyId}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    key.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>{key.status}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    key.authenticationStatus === 'authenticated' ? 'bg-emerald-500/10 text-emerald-400' :
                    key.authenticationStatus === 'fallback' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                  }`}>{key.authenticationStatus}</span>
                </div>
                <span className="text-xs text-cyan-400/70 opacity-0 group-hover:opacity-100 transition-opacity">ML Deep Dive →</span>
              </button>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <span className="text-xs text-slate-500 uppercase block">Domain</span>
                  <span className="text-xs text-slate-200 font-medium">{key.domain}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase block">Purpose</span>
                  <span className="text-xs text-slate-200 font-medium">{key.purpose}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase block">Key Age</span>
                  <span className="text-xs text-slate-200 font-medium">{key.keyAge}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase block">Expires In</span>
                  <span className="text-xs text-slate-200 font-medium">{key.expiresIn}</span>
                </div>
              </div>

              <div className="mb-3">
                <span className="text-xs text-slate-500 uppercase block mb-1">Rate Limits</span>
                <div className="flex gap-3">
                  <span className="text-xs text-slate-300"><span className="text-cyan-400 font-bold">{key.rateLimits.rpm}</span> req/min</span>
                  <span className="text-xs text-slate-300"><span className="text-cyan-400 font-bold">{key.rateLimits.rpd}</span> req/day</span>
                  <span className="text-xs text-slate-300"><span className="text-emerald-400 font-bold">{key.rateLimits.remaining}</span> remaining</span>
                </div>
              </div>

              <div className="mb-3">
                <span className="text-xs text-slate-500 uppercase block mb-1">Capabilities ({key.capabilities.length})</span>
                <div className="flex flex-wrap gap-1">
                  {key.capabilities.map((cap, j) => (
                    <span key={j} className="px-1.5 py-0.5 bg-slate-700/50 rounded text-xs text-slate-300 border border-slate-600/30">{cap}</span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 uppercase block mb-1">Diagnostics</span>
                <div className="space-y-0.5">
                  {key.diagnostics.map((d, j) => (
                    <div key={j} className="flex items-center gap-1.5 text-xs">
                      {d.includes('matches') || d.includes('OK') ? <CheckCircle className="w-3 h-3 text-emerald-400" /> :
                       d.includes('unreachable') || d.includes('failed') ? <XCircle className="w-3 h-3 text-amber-400" /> :
                       <Clock className="w-3 h-3 text-slate-500" />}
                      <span className="text-slate-400">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ---- Pipeline Tab ----

function PipelineTab({ pipeline, insights, onCardClick }: { pipeline: PipelineData | null; insights: InsightsData | null; onCardClick: (label: string, value: string, color: string) => void }) {
  const stages = pipeline?.pipelineStages || [];
  return (
    <div className="space-y-4">
      {/* Pipeline summary */}
      {pipeline && (
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard label="Session" value={pipeline.sessionId.slice(4, 16)} icon={<Cpu className="w-4 h-4" />} color="text-violet-400" onClick={() => onCardClick('Pipeline Session', pipeline.sessionId.slice(4, 16), 'violet')} />
          <SummaryCard label="Duration" value={`${pipeline.performanceMetrics.totalDurationMs}ms`} icon={<Clock className="w-4 h-4" />} color="text-cyan-400" onClick={() => onCardClick('Pipeline Duration', `${pipeline.performanceMetrics.totalDurationMs}ms`, 'cyan')} />
          <SummaryCard label="Models" value={pipeline.performanceMetrics.modelsUsed.length} icon={<Layers className="w-4 h-4" />} color="text-amber-400" onClick={() => onCardClick('ML Models Used', `${pipeline.performanceMetrics.modelsUsed.length} models`, 'amber')} />
        </div>
      )}

      {/* Pipeline stages visualization */}
      <div className="p-4 rounded-lg border border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-5 h-5 text-violet-400" />
          <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">MCP Pipeline Stages</span>
        </div>
        <div className="space-y-3">
          {stages.map((stage, i) => (
            <div key={i} className="relative">
              {i < stages.length - 1 && (
                <div className="absolute left-[15px] top-[32px] w-0.5 h-[calc(100%)] bg-slate-700/50" />
              )}
              <div className="flex items-start gap-3">
                <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 border ${
                  stage.status === 'completed' ? 'bg-emerald-500/20 border-emerald-500/50' :
                  stage.status === 'error' ? 'bg-red-500/20 border-red-500/50' :
                  'bg-slate-700/50 border-slate-600/50'
                }`}>
                  {stage.status === 'completed' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> :
                   stage.status === 'error' ? <XCircle className="w-3.5 h-3.5 text-red-400" /> :
                   <Clock className="w-3.5 h-3.5 text-slate-500" />}
                </div>
                <button
                  className="flex-1 pb-3 text-left hover:bg-violet-500/5 rounded px-2 py-1 -ml-2 transition-colors group cursor-pointer"
                  onClick={() => onCardClick(`Stage: ${stage.name}`, `${stage.durationMs}ms — ${stage.status} — ${stage.model}`, stage.status === 'completed' ? 'emerald' : stage.status === 'error' ? 'rose' : 'violet')}
                  aria-label={`ML analysis for pipeline stage ${stage.name}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-violet-200 transition-colors">{stage.name}</span>
                    <span className="text-xs text-slate-500">{stage.durationMs}ms</span>
                  </div>
                  <p className="text-xs text-cyan-400/80 font-mono mt-0.5">{stage.model}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{stage.outputSummary}</p>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model chain */}
      {pipeline && (
        <div className="p-4 rounded-lg border border-slate-700/50 bg-slate-800/30">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-bold block mb-2">ML Model Chain</span>
          <div className="flex flex-wrap gap-2">
            {pipeline.performanceMetrics.modelsUsed.map((model, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <button
                  className="px-2 py-1 bg-violet-500/10 border border-violet-500/30 rounded text-xs text-violet-300 font-mono hover:bg-violet-500/20 hover:border-violet-500/50 transition-all cursor-pointer"
                  onClick={() => onCardClick(`ML Model: ${model}`, `model ${i + 1} of ${pipeline.performanceMetrics.modelsUsed.length}`, 'violet')}
                  aria-label={`ML analysis for model ${model}`}
                >{model}</button>
                {i < pipeline.performanceMetrics.modelsUsed.length - 1 && <ArrowUpRight className="w-3 h-3 text-slate-600" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Predictions Tab ----

function PredictionsTab({ predictions, anomalies, patterns, onCardClick }: { predictions: Prediction[]; anomalies: Anomaly[]; patterns: Pattern[]; onCardClick: (label: string, value: string, color: string) => void }) {
  return (
    <div className="space-y-4">
      {/* Predictions */}
      {predictions.map((pred, i) => (
        <div key={i} className="p-4 rounded-lg border border-slate-700/50 bg-slate-800/30">
          <button
            className="w-full flex items-center justify-between mb-3 hover:bg-cyan-500/5 rounded px-1 py-0.5 transition-colors group cursor-pointer"
            onClick={() => onCardClick(pred.metric.replace(/_/g, ' '), `${pred.currentValue.toLocaleString()} — ${pred.trend} (R²: ${pred.r2Score.toFixed(3)})`, 'cyan')}
            aria-label={`ML analysis for ${pred.metric}`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider group-hover:text-cyan-200 transition-colors">{pred.metric.replace(/_/g, ' ')}</span>
              <TrendBadge trend={pred.trend} />
            </div>
            <span className="text-xs text-slate-500 font-mono">{pred.model}</span>
          </button>

          <div className="flex items-center gap-4 mb-3">
            <div>
              <span className="text-xs text-slate-500 uppercase block">Current</span>
              <span className="text-lg font-bold text-white">{pred.currentValue.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase block">R2 Score</span>
              <span className="text-lg font-bold text-cyan-400">{pred.r2Score.toFixed(3)}</span>
            </div>
          </div>

          {/* Forecast table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left text-slate-500 uppercase py-1 pr-3">Period</th>
                  <th className="text-right text-slate-500 uppercase py-1 px-3">Predicted</th>
                  <th className="text-right text-slate-500 uppercase py-1 px-3">Low</th>
                  <th className="text-right text-slate-500 uppercase py-1 px-3">High</th>
                  <th className="text-right text-slate-500 uppercase py-1">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {pred.predictedValues.map((pv, j) => (
                  <tr
                    key={j}
                    className="border-b border-slate-800/50 hover:bg-cyan-500/5 transition-colors cursor-pointer group"
                    onClick={() => onCardClick(`${pred.metric.replace(/_/g, ' ')} — ${pv.period}`, `${pv.value.toLocaleString()} (${(pv.confidence * 100).toFixed(0)}% conf.)`, 'cyan')}
                    title={`Click to analyze ${pv.period}`}
                  >
                    <td className="text-slate-300 py-1.5 pr-3 font-medium group-hover:text-cyan-300 transition-colors">{pv.period}</td>
                    <td className="text-right text-white font-bold py-1.5 px-3">{pv.value.toLocaleString()}</td>
                    <td className="text-right text-slate-500 py-1.5 px-3">{pv.interval.low.toLocaleString()}</td>
                    <td className="text-right text-slate-500 py-1.5 px-3">{pv.interval.high.toLocaleString()}</td>
                    <td className="text-right py-1.5">
                      <span className={`font-bold ${pv.confidence > 0.8 ? 'text-emerald-400' : pv.confidence > 0.6 ? 'text-yellow-400' : 'text-orange-400'}`}>
                        {(pv.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <div className="p-4 rounded-lg border border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Anomalies Detected ({anomalies.length})</span>
          </div>
          <div className="space-y-2">
            {anomalies.map((a, i) => {
              const ac = a.severity === 'critical' ? 'rose' : a.severity === 'warning' ? 'amber' : 'blue';
              return (
                <button
                  key={i}
                  className={`w-full text-left p-2.5 rounded border transition-all cursor-pointer group ${
                    a.severity === 'critical' ? 'bg-red-500/5 border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50' :
                    a.severity === 'warning' ? 'bg-yellow-500/5 border-yellow-500/30 hover:bg-yellow-500/10 hover:border-yellow-500/50' :
                    'bg-slate-800/50 border-slate-700/30 hover:bg-cyan-500/5 hover:border-cyan-500/30'
                  }`}
                  onClick={() => onCardClick(`Anomaly: ${a.period}`, `${a.deviationSigma}σ deviation — ${a.type} (${a.severity})`, ac)}
                  aria-label={`ML analysis for anomaly at ${a.period}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SeverityDot severity={a.severity} />
                      <span className="text-xs font-bold text-white group-hover:text-slate-100">{a.period}</span>
                      <span className="text-xs text-slate-500 uppercase">{a.type}</span>
                    </div>
                    <span className="text-xs text-slate-500">{a.deviationSigma}σ</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 text-left">{a.explanation}</p>
                  <div className="flex gap-4 mt-1 text-xs">
                    <span className="text-slate-500">Observed: <span className="text-white font-medium">{a.observedValue.toLocaleString()}</span></span>
                    <span className="text-slate-500">Expected: <span className="text-white font-medium">{a.expectedValue.toLocaleString()}</span></span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Patterns */}
      {patterns.length > 0 && (
        <div className="p-4 rounded-lg border border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patterns ({patterns.length})</span>
          </div>
          <div className="space-y-2">
            {patterns.map((p, i) => (
              <button
                key={i}
                className="w-full text-left p-2.5 rounded border border-slate-700/30 bg-slate-800/50 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all cursor-pointer group"
                onClick={() => onCardClick(`Pattern: ${p.patternType}`, `${(p.confidence * 100).toFixed(0)}% confidence — ${p.timespan}`, 'violet')}
                aria-label={`ML analysis for pattern ${p.patternType}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-violet-500/20 rounded text-xs text-violet-400 font-bold uppercase">{p.patternType}</span>
                    <span className="text-xs text-slate-500">{p.timespan}</span>
                  </div>
                  <span className="text-xs text-cyan-400 font-bold">{(p.confidence * 100).toFixed(0)}%</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 group-hover:text-slate-200 transition-colors">{p.description}</p>
                <div className="flex gap-1 mt-1">
                  {p.affectedMetrics.map((m, j) => (
                    <span key={j} className="text-xs text-slate-500 bg-slate-700/50 px-1 rounded">{m}</span>
                  ))}
                  {p.actionable && <span className="text-xs text-emerald-400 bg-emerald-500/10 px-1 rounded ml-auto">actionable</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Recommendations Tab ----

function RecommendationsTab({ recommendations, risk, onCardClick }: { recommendations: Recommendation[]; risk: RiskAssessment; onCardClick: (label: string, value: string, color: string) => void }) {
  const priorityOrder = { immediate: 0, 'short-term': 1, 'long-term': 2 };
  const sorted = [...recommendations].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Immediate" value={recommendations.filter(r => r.priority === 'immediate').length} icon={<AlertTriangle className="w-4 h-4" />} color="text-red-400" onClick={() => onCardClick('Immediate Actions', `${recommendations.filter(r => r.priority === 'immediate').length} items`, 'rose')} />
        <SummaryCard label="Short-term" value={recommendations.filter(r => r.priority === 'short-term').length} icon={<Clock className="w-4 h-4" />} color="text-yellow-400" onClick={() => onCardClick('Short-term Actions', `${recommendations.filter(r => r.priority === 'short-term').length} items`, 'amber')} />
        <SummaryCard label="Long-term" value={recommendations.filter(r => r.priority === 'long-term').length} icon={<Target className="w-4 h-4" />} color="text-emerald-400" onClick={() => onCardClick('Long-term Actions', `${recommendations.filter(r => r.priority === 'long-term').length} items`, 'emerald')} />
      </div>

      <div className="space-y-3">
        {sorted.map((rec, i) => {
          const rc = rec.priority === 'immediate' ? 'rose' : rec.priority === 'short-term' ? 'amber' : 'emerald';
          return (
            <button
              key={i}
              className={`w-full text-left p-4 rounded-lg border transition-all cursor-pointer group ${
                rec.priority === 'immediate' ? 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/50' :
                rec.priority === 'short-term' ? 'border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10 hover:border-yellow-500/50' :
                'border-slate-700/50 bg-slate-800/30 hover:bg-emerald-500/5 hover:border-emerald-500/30'
              }`}
              onClick={() => onCardClick(`${rec.priority.toUpperCase()}: ${rec.title}`, `${(rec.confidence * 100).toFixed(0)}% conf. — ${rec.category} | Impact: ${rec.impact}`, rc)}
              aria-label={`ML analysis for recommendation: ${rec.title}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-bold uppercase ${
                    rec.priority === 'immediate' ? 'bg-red-500/20 text-red-400' :
                    rec.priority === 'short-term' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>{rec.priority}</span>
                  <span className="px-1.5 py-0.5 bg-slate-700/50 rounded text-xs text-slate-400 uppercase">{rec.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-cyan-400 font-bold">{(rec.confidence * 100).toFixed(0)}% conf.</span>
                  <span className="text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">ML Deep Dive →</span>
                </div>
              </div>
              <h4 className="text-xs font-bold text-white mb-1 group-hover:text-slate-100 transition-colors">{rec.title}</h4>
              <p className="text-xs text-slate-400 mb-2">{rec.description}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400">Impact: {rec.impact}</span>
                <span className="text-slate-500">Effort: {rec.estimatedEffort}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- Monitoring Tab ----

function MonitoringTab({ monitoring, onCardClick }: { monitoring: MonitoringData | null; onCardClick: (label: string, value: string, color: string) => void }) {
  if (!monitoring) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
        <span className="ml-2 text-sm text-slate-400">Loading monitoring data...</span>
      </div>
    );
  }

  const maxHourlyCalls = Math.max(1, ...monitoring.hourlyDistribution.map(h => h.calls));

  return (
    <div className="space-y-4">
      {/* Global Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Total API Calls" value={monitoring.totalCalls} icon={<Activity className="w-4 h-4" />} color="text-cyan-400" onClick={() => onCardClick('Total API Calls', `${monitoring.totalCalls}`, 'cyan')} />
        <SummaryCard label="Success Rate" value={`${(monitoring.successRate * 100).toFixed(1)}%`} icon={<CheckCircle className="w-4 h-4" />} color={monitoring.successRate >= 0.95 ? 'text-emerald-400' : 'text-amber-400'} onClick={() => onCardClick('API Success Rate', `${(monitoring.successRate * 100).toFixed(1)}%`, monitoring.successRate >= 0.95 ? 'emerald' : 'amber')} />
        <SummaryCard label="Avg Latency" value={`${monitoring.avgLatency}ms`} icon={<Clock className="w-4 h-4" />} color={monitoring.avgLatency < 500 ? 'text-emerald-400' : 'text-amber-400'} onClick={() => onCardClick('Average Latency', `${monitoring.avgLatency}ms`, monitoring.avgLatency < 500 ? 'emerald' : 'amber')} />
        <SummaryCard label="P95 Latency" value={`${monitoring.p95Latency}ms`} icon={<Gauge className="w-4 h-4" />} color={monitoring.p95Latency < 1000 ? 'text-emerald-400' : 'text-amber-400'} onClick={() => onCardClick('P95 Latency', `${monitoring.p95Latency}ms`, monitoring.p95Latency < 1000 ? 'emerald' : 'amber')} />
      </div>

      {/* Per-Key Breakdown */}
      <div className="p-4 rounded-lg border border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-2 mb-3">
          <Key className="w-5 h-5 text-cyan-400" />
          <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Per-Key Usage</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {monitoring.keyBreakdown.map((k, i) => (
            <button
              key={i}
              className="p-3 rounded border border-slate-700/30 bg-slate-800/50 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all text-left group cursor-pointer"
              onClick={() => onCardClick(`Key: ${k.keyId}`, `${k.calls} calls — ${(k.successRate * 100).toFixed(0)}% success — ${k.avgLatency}ms avg`, 'cyan')}
              aria-label={`ML analysis for API key ${k.keyId}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white uppercase group-hover:text-cyan-200 transition-colors">{k.keyId}</span>
                <span className="text-xs text-slate-500">{k.lastUsed === 'never' ? 'Never used' : `Last: ${new Date(k.lastUsed).toLocaleTimeString()}`}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <span className="text-lg font-bold text-cyan-400">{k.calls}</span>
                  <span className="text-xs text-slate-500 block">Calls</span>
                </div>
                <div>
                  <span className={`text-lg font-bold ${k.successRate >= 0.95 ? 'text-emerald-400' : 'text-amber-400'}`}>{(k.successRate * 100).toFixed(0)}%</span>
                  <span className="text-xs text-slate-500 block">Success</span>
                </div>
                <div>
                  <span className="text-lg font-bold text-violet-400">{k.avgLatency}ms</span>
                  <span className="text-xs text-slate-500 block">Avg ms</span>
                </div>
                <div>
                  <span className="text-lg font-bold text-amber-400">{k.remaining}</span>
                  <span className="text-xs text-slate-500 block">Remaining</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Endpoint Breakdown */}
      {monitoring.endpointBreakdown.length > 0 && (
        <div className="p-4 rounded-lg border border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-5 h-5 text-violet-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Endpoint Usage</span>
          </div>
          <div className="space-y-2">
            {monitoring.endpointBreakdown.map((ep, i) => (
              <button
                key={i}
                className="w-full flex items-center justify-between p-2 rounded border border-slate-700/30 bg-slate-800/50 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all cursor-pointer group"
                onClick={() => onCardClick(`Endpoint: ${ep.endpoint}`, `${ep.calls} calls — ${ep.avgLatency}ms avg`, 'violet')}
                aria-label={`ML analysis for endpoint ${ep.endpoint}`}
              >
                <span className="text-xs font-mono text-cyan-300 group-hover:text-cyan-200 transition-colors">{ep.endpoint}</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-400"><span className="text-white font-bold">{ep.calls}</span> calls</span>
                  <span className="text-xs text-slate-400">avg <span className="text-white font-bold">{ep.avgLatency}ms</span></span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hourly Distribution */}
      <div className="p-4 rounded-lg border border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Hourly Distribution (24h)</span>
        </div>
        <div className="flex items-end gap-[2px] h-20">
          {monitoring.hourlyDistribution.map((h, i) => {
            const pct = maxHourlyCalls > 0 ? (h.calls / maxHourlyCalls) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full relative" style={{ height: '60px' }}>
                  <div
                    className="absolute bottom-0 w-full rounded-t bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all"
                    style={{ height: `${Math.max(pct, 2)}%` }}
                    title={`${h.hour}:00 - ${h.calls} calls`}
                  />
                </div>
                {i % 3 === 0 && <span className="text-xs text-slate-600">{h.hour}h</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Optimization Recommendations */}
      {monitoring.recommendations.length > 0 && (
        <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-amber-400 uppercase tracking-wider font-bold">Optimization Recommendations</span>
          </div>
          <div className="space-y-1">
            {monitoring.recommendations.map((r, i) => (
              <p key={i} className="text-xs text-slate-300">- {r}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Shared helpers ----

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div>
      <span className="text-xs text-slate-500 uppercase block">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}

function MiniStat({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={color}>{icon}</span>
      <div>
        <span className={`text-sm font-bold ${color}`}>{value}</span>
        <span className="text-xs text-slate-500 block">{label}</span>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, color, onClick }: { label: string; value: string | number; icon: React.ReactNode; color: string; onClick?: () => void }) {
  if (onClick) {
    return (
      <button
        className="p-3 rounded-lg border border-slate-700/50 bg-slate-800/30 text-center hover:border-current/40 hover:bg-white/5 transition-all cursor-pointer group w-full"
        onClick={onClick}
        aria-label={`ML analysis for ${label}`}
      >
        <div className={`${color} flex justify-center mb-1 group-hover:scale-110 transition-transform`}>{icon}</div>
        <div className={`text-lg font-bold ${color}`}>{value}</div>
        <div className="text-xs text-slate-500 uppercase">{label}</div>
      </button>
    );
  }
  return (
    <div className="p-3 rounded-lg border border-slate-700/50 bg-slate-800/30 text-center">
      <div className={`${color} flex justify-center mb-1`}>{icon}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 uppercase">{label}</div>
    </div>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const color = severity === 'critical' ? 'bg-red-500' : severity === 'high' ? 'bg-orange-500' : severity === 'warning' ? 'bg-yellow-500' : severity === 'medium' ? 'bg-yellow-500' : severity === 'low' ? 'bg-blue-500' : 'bg-slate-500';
  return <div className={`w-1.5 h-1.5 rounded-full ${color}`} />;
}

function TrendBadge({ trend }: { trend: string }) {
  if (trend === 'increasing') return <span className="flex items-center gap-0.5 text-xs text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded font-bold"><ArrowUpRight className="w-2.5 h-2.5" />INCREASING</span>;
  if (trend === 'decreasing') return <span className="flex items-center gap-0.5 text-xs text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-bold"><ArrowDownRight className="w-2.5 h-2.5" />DECREASING</span>;
  return <span className="flex items-center gap-0.5 text-xs text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded font-bold"><Minus className="w-2.5 h-2.5" />STABLE</span>;
}
