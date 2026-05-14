/**
 * EnhancedAnalyticsDashboard - Advanced AI/ML analytics visualization
 * Features: Pattern recognition, anomaly detection, predictive analytics, trend analysis
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, BarChart3, Activity, Zap, RefreshCw, Shield, Target, Sparkles, X, Clock, ChevronRight } from 'lucide-react';

interface MonthlyTrend {
  month: string;
  vuln: number;
  pot: number;
  notVuln: number;
  total: number;
  records: number;
}

interface Anomaly {
  month: string;
  vulnerable: number;
  deviation: string;
  type: 'spike' | 'drop';
  severity: 'critical' | 'warning';
}

interface Prediction {
  month: string;
  predictedVulnerable: number;
  confidenceInterval: { low: number; high: number };
  trend: string;
}

interface AnalyticsData {
  success: boolean;
  timestamp: string;
  dataRange: { months: number; records: number };
  patternRecognition: {
    monthlyTrends: MonthlyTrend[];
    vulnerabilityMean: number;
    vulnerabilityStdDev: number;
  };
  anomalyDetection: {
    anomaliesFound: number;
    anomalies: Anomaly[];
    threshold: string;
  };
  predictiveAnalytics: {
    model: string;
    slope: string;
    predictions: Prediction[];
  };
  riskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  customerInsights: {
    totalCustomers: number;
    topRiskCustomers: Array<{ name: string; totalVuln: number; fnCount: number; months: string[] }>;
  };
}

// ── Analytics Card Modal ──────────────────────────────────
interface AnalyticsCardModalProps {
  open: boolean;
  card: { label: string; value: string; color: string } | null;
  mlLoading: boolean;
  mlData: any;
  mlError: string | null;
  onClose: () => void;
  onRetry: () => void;
}

function AnalyticsCardModal({ open, card, mlLoading, mlData, mlError, onClose, onRetry }: AnalyticsCardModalProps) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open || !card) return null;

  const borderMap: Record<string, string> = {
    cyan: 'border-cyan-500/40', amber: 'border-amber-500/40',
    emerald: 'border-emerald-500/40', rose: 'border-rose-500/40', purple: 'border-purple-500/40',
  };
  const textMap: Record<string, string> = {
    cyan: 'text-cyan-400', amber: 'text-amber-400',
    emerald: 'text-emerald-400', rose: 'text-rose-400', purple: 'text-purple-400',
  };
  const border = borderMap[card.color] ?? 'border-slate-700';
  const txt = textMap[card.color] ?? 'text-white';
  const normalizeConf = (v: any) => typeof v === 'number' ? `${v}%` : String(v ?? '—').replace(/%%$/, '%');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-label={`AI Analysis: ${card.label}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`relative w-full max-w-lg max-h-[85vh] flex flex-col bg-slate-900 rounded-2xl border ${border} shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
              <Brain size={18} className={txt} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{card.label}</h2>
              <p className="text-xs text-slate-500">Current value: <span className={`font-mono font-bold ${txt}`}>{card.value}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!mlLoading && (
              <button onClick={onRetry} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30 transition-all active:scale-95 touch-manipulation" aria-label="Retry AI analysis">
                <RefreshCw size={11} /> Refresh
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors" aria-label="Close modal">
              <X size={18} className="text-slate-400 hover:text-white" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Status chip */}
          <div className={`p-3 rounded-xl bg-slate-800/40 border ${border} flex items-center justify-between`}>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Metric Value</p>
              <p className={`text-xl font-bold font-mono ${txt}`}>{card.value}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-0.5">AI Status</p>
              <p className={`text-xs font-bold ${
                mlLoading ? 'text-cyan-400' : mlData ? 'text-emerald-400' : mlError ? 'text-amber-400' : 'text-slate-500'
              }`}>{mlLoading ? 'Analyzing…' : mlData ? 'Ready' : mlError ? 'Error' : 'Pending'}</p>
            </div>
          </div>

          {/* Error */}
          {mlError && !mlLoading && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-amber-300 font-medium">Analysis failed</p>
                <p className="text-xs text-amber-400/70 mt-0.5">{mlError}</p>
                <button onClick={onRetry} className="mt-2 text-xs text-cyan-400 underline hover:text-cyan-300 active:scale-95 touch-manipulation">Try again</button>
              </div>
            </div>
          )}

          {/* Skeleton */}
          {mlLoading && (
            <div className="space-y-3" aria-hidden="true">
              <div className="flex items-center gap-2 pb-1">
                <RefreshCw size={13} className="animate-spin text-cyan-400" />
                <span className="text-xs text-cyan-400">Running AI/ML analysis…</span>
              </div>
              {[75, 55, 90, 45, 65].map((w, i) => (
                <div key={i} className="h-2.5 bg-slate-700/70 rounded-full animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
          )}

          {/* Results */}
          {mlData && !mlLoading && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
                {[
                  { label: 'ML Trend',     value: String(mlData.trend ?? 'Stable'),       cls: 'text-cyan-400' },
                  { label: 'Confidence',   value: normalizeConf(mlData.confidenceLevel),  cls: 'text-emerald-400' },
                  { label: 'Anomalies',    value: String(mlData.anomaliesDetected ?? 0),  cls: 'text-rose-400' },
                  { label: 'Risk Factors', value: String(mlData.riskFactorsIdentified ?? 0), cls: 'text-amber-400' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="text-center">
                    <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                    <p className={`text-sm font-bold ${cls} capitalize`}>{value}</p>
                  </div>
                ))}
              </div>

              {mlData.recommendations?.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Target size={12} className="text-cyan-400" /> AI Recommendations
                  </h3>
                  <ul className="space-y-1.5">
                    {mlData.recommendations.slice(0, 4).map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs px-2 py-1.5 rounded-lg hover:bg-slate-800/40 transition-colors">
                        <ChevronRight size={12} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-300">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {mlData.estimatedTimeToResolution && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs">
                  <Clock size={12} className="text-indigo-400 flex-shrink-0" />
                  <span className="text-slate-400">Est. resolution: <strong className="text-indigo-300">{mlData.estimatedTimeToResolution}</strong></span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-600 flex items-center gap-1"><Sparkles size={10} className="text-purple-500" /> Powered by CIRCUIT AI</p>
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-white transition-colors active:scale-95 touch-manipulation">Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────
export function EnhancedAnalyticsDashboard({ onClose }: { onClose?: () => void }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Card-level AI modal state
  const [cardModal, setCardModal] = useState<{
    open: boolean;
    card: { label: string; value: string; color: string } | null;
    mlLoading: boolean;
    mlData: any;
    mlError: string | null;
  }>({ open: false, card: null, mlLoading: false, mlData: null, mlError: null });
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openCardModal = useCallback((info: { label: string; value: string; color: string }) => {
    if (abortRef.current) abortRef.current.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCardModal({ open: true, card: info, mlLoading: true, mlData: null, mlError: null });
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
          setCardModal(prev => ({ ...prev, mlLoading: false, mlError: err.message ?? 'Analysis failed. Please retry.' }));
      }
    }, 300);
  }, []);

  const closeCardModal = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCardModal({ open: false, card: null, mlLoading: false, mlData: null, mlError: null });
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics/enhanced');
      if (!res.ok) throw new Error(`Failed to fetch analytics: ${res.status}`);
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Brain className="w-12 h-12 text-cyan-400 animate-pulse mx-auto mb-3" />
          <p className="text-sm text-slate-400 tracking-widest uppercase">Analyzing Data Patterns...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-300 text-sm">{error || 'No analytics data available'}</p>
        <button onClick={fetchAnalytics} className="mt-3 px-4 py-1.5 bg-red-600/30 text-red-300 rounded text-xs hover:bg-red-600/50 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  const maxVuln = Math.max(...data.patternRecognition.monthlyTrends.map(t => t.vuln), 1);
  const maxTotal = Math.max(...data.patternRecognition.monthlyTrends.map(t => t.total), 1);
  const trendDirection = parseFloat(data.predictiveAnalytics.slope) > 0 ? 'increasing' : 'decreasing';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-lg border border-cyan-500/30">
            <Brain className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wider">Enhanced AI/ML Analytics</h2>
            <p className="text-xs text-slate-400">
              {data.dataRange.records.toLocaleString()} records | {data.dataRange.months} months | Updated {new Date(data.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
        <button onClick={fetchAnalytics} className="p-2 bg-slate-700/50 rounded-lg hover:bg-slate-600/50 transition-colors" title="Refresh Analytics">
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Row 1: Key Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Activity className="w-5 h-5" />} label="Mean Vulnerability"
          value={data.patternRecognition.vulnerabilityMean.toLocaleString()} color="cyan"
          processingML={cardModal.mlLoading && cardModal.card?.label === 'Mean Vulnerability'}
          onClick={() => openCardModal({ label: 'Mean Vulnerability', value: data.patternRecognition.vulnerabilityMean.toLocaleString(), color: 'cyan' })}
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />} label="Anomalies Detected"
          value={String(data.anomalyDetection.anomaliesFound)} color="amber"
          processingML={cardModal.mlLoading && cardModal.card?.label === 'Anomalies Detected'}
          onClick={() => openCardModal({ label: 'Anomalies Detected', value: String(data.anomalyDetection.anomaliesFound), color: 'amber' })}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />} label="Prediction Trend"
          value={trendDirection} color={trendDirection === 'decreasing' ? 'emerald' : 'rose'}
          processingML={cardModal.mlLoading && cardModal.card?.label === 'Prediction Trend'}
          onClick={() => openCardModal({ label: 'Prediction Trend', value: trendDirection, color: trendDirection === 'decreasing' ? 'emerald' : 'rose' })}
        />
        <StatCard
          icon={<Shield className="w-5 h-5" />} label="Risk Distribution"
          value={`${data.riskDistribution.critical} Critical`} color="rose"
          processingML={cardModal.mlLoading && cardModal.card?.label === 'Risk Distribution'}
          onClick={() => openCardModal({ label: 'Risk Distribution', value: `${data.riskDistribution.critical} Critical`, color: 'rose' })}
        />
      </div>

      {/* Row 2: Monthly Trend Visualization */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          Monthly Vulnerability Trend (Pattern Recognition)
        </h3>
        <div className="space-y-2">
          {data.patternRecognition.monthlyTrends.map((trend, i) => {
            const isAnomaly = data.anomalyDetection.anomalies.some(a => a.month === trend.month);
            return (
              <div key={trend.month} className="flex items-center gap-3 text-xs">
                <span className="w-16 text-slate-400 font-mono">{trend.month}</span>
                <div className="flex-1 flex gap-1 h-5">
                  <div
                    className={`${isAnomaly ? 'bg-red-500/80' : 'bg-rose-500/70'} rounded-sm transition-all`}
                    style={{ width: `${(trend.vuln / maxTotal) * 100}%` }}
                    title={`Vulnerable: ${trend.vuln.toLocaleString()}`}
                  />
                  <div
                    className="bg-amber-500/70 rounded-sm transition-all"
                    style={{ width: `${(trend.pot / maxTotal) * 100}%` }}
                    title={`Potentially Vulnerable: ${trend.pot.toLocaleString()}`}
                  />
                  <div
                    className="bg-emerald-500/70 rounded-sm transition-all"
                    style={{ width: `${(trend.notVuln / maxTotal) * 100}%` }}
                    title={`Not Vulnerable: ${trend.notVuln.toLocaleString()}`}
                  />
                </div>
                <span className="w-20 text-right text-slate-300 font-mono">{trend.total.toLocaleString()}</span>
                {isAnomaly && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-rose-500/70 rounded-sm inline-block" /> Vulnerable</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-500/70 rounded-sm inline-block" /> Potentially Vulnerable</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500/70 rounded-sm inline-block" /> Not Vulnerable</span>
          <span className="flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5 text-red-400" /> Anomaly</span>
        </div>
      </div>

      {/* Row 3: Anomaly Detection & Predictions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Anomalies */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Anomaly Detection
          </h3>
          <p className="text-xs text-slate-500 mb-3">Threshold: {data.anomalyDetection.threshold}</p>
          {data.anomalyDetection.anomalies.length === 0 ? (
            <p className="text-xs text-emerald-400">No anomalies detected - all values within normal range</p>
          ) : (
            <div className="space-y-2">
              {data.anomalyDetection.anomalies.map((anomaly, i) => (
                <button
                  key={i}
                  onClick={() => openCardModal({
                    label: `${anomaly.month} Anomaly`,
                    value: `${anomaly.type === 'spike' ? 'Spike' : 'Drop'} | ${anomaly.vulnerable.toLocaleString()} vulnerable | ${anomaly.deviation}σ`,
                    color: anomaly.severity === 'critical' ? 'rose' : 'amber'
                  })}
                  aria-label={`Analyze ${anomaly.month} ${anomaly.severity} anomaly with AI/ML`}
                  className={`group w-full text-left p-3 rounded-lg border transition-all duration-200
                    hover:scale-[1.01] active:scale-[0.99] touch-manipulation
                    focus-visible:outline-none focus-visible:ring-2
                    ${anomaly.severity === 'critical'
                      ? 'bg-red-900/20 border-red-500/30 hover:border-red-500/60 hover:bg-red-900/35 focus-visible:ring-red-500'
                      : 'bg-amber-900/20 border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-900/35 focus-visible:ring-amber-500'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{anomaly.month}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${anomaly.severity === 'critical' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}>
                        {anomaly.severity.toUpperCase()}
                      </span>
                      <Zap size={8} className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {anomaly.type === 'spike' ? <TrendingUp className="w-3 h-3 text-red-400" /> : <TrendingDown className="w-3 h-3 text-blue-400" />}
                    <span className="text-xs text-slate-400">
                      {anomaly.type === 'spike' ? 'Spike' : 'Drop'} | {anomaly.vulnerable.toLocaleString()} vulnerable | {anomaly.deviation}σ deviation
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Predictions */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            Predictive Analytics
          </h3>
          <p className="text-xs text-slate-500 mb-3">Model: {data.predictiveAnalytics.model} | Slope: {data.predictiveAnalytics.slope}/month</p>
          <div className="space-y-3">
            {data.predictiveAnalytics.predictions.map((pred, i) => (
              <button
                key={i}
                onClick={() => openCardModal({
                  label: `${pred.month} Prediction`,
                  value: `${pred.predictedVulnerable.toLocaleString()} predicted`,
                  color: pred.trend === 'decreasing' ? 'emerald' : 'rose'
                })}
                aria-label={`Analyze ${pred.month} prediction: ${pred.predictedVulnerable.toLocaleString()} vulnerable with AI/ML`}
                className="group w-full text-left p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg
                  hover:border-purple-500/60 hover:bg-purple-900/35 transition-all duration-200
                  hover:scale-[1.01] active:scale-[0.99] touch-manipulation
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{pred.month}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${pred.trend === 'decreasing' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                      {pred.trend.toUpperCase()}
                    </span>
                    <Zap size={8} className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div className="text-xs text-slate-300">
                  Predicted: <span className="font-bold text-purple-300">{pred.predictedVulnerable.toLocaleString()}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  95% CI: [{pred.confidenceInterval.low.toLocaleString()} - {pred.confidenceInterval.high.toLocaleString()}]
                </div>
                <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (pred.predictedVulnerable / (data.patternRecognition.vulnerabilityMean * 1.5)) * 100)}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Risk Distribution & Top Risk Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk Distribution */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-rose-400" />
            Risk Distribution
          </h3>
          <div className="space-y-3">
            <RiskBar label="Critical" count={data.riskDistribution.critical} total={data.customerInsights.totalCustomers} color="rose"
              onClick={() => openCardModal({ label: 'Critical Risk', value: `${data.riskDistribution.critical} customers`, color: 'rose' })} />
            <RiskBar label="High" count={data.riskDistribution.high} total={data.customerInsights.totalCustomers} color="amber"
              onClick={() => openCardModal({ label: 'High Risk', value: `${data.riskDistribution.high} customers`, color: 'amber' })} />
            <RiskBar label="Medium" count={data.riskDistribution.medium} total={data.customerInsights.totalCustomers} color="yellow"
              onClick={() => openCardModal({ label: 'Medium Risk', value: `${data.riskDistribution.medium} customers`, color: 'amber' })} />
            <RiskBar label="Low" count={data.riskDistribution.low} total={data.customerInsights.totalCustomers} color="emerald"
              onClick={() => openCardModal({ label: 'Low Risk', value: `${data.riskDistribution.low} customers`, color: 'emerald' })} />
          </div>
        </div>

        {/* Top Risk Customers */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            Top Risk Customers ({data.customerInsights.totalCustomers} total)
          </h3>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {data.customerInsights.topRiskCustomers.slice(0, 8).map((cust, i) => (
              <button
                key={i}
                onClick={() => openCardModal({
                  label: cust.name,
                  value: `${cust.totalVuln.toLocaleString()} vulnerable`,
                  color: 'rose'
                })}
                aria-label={`Analyze ${cust.name} — ${cust.totalVuln.toLocaleString()} vulnerabilities`}
                className="group w-full flex items-center justify-between py-1.5 px-2 rounded
                  bg-slate-700/30 hover:bg-slate-700/60 hover:border hover:border-rose-500/20
                  transition-all duration-150 text-xs text-left touch-manipulation
                  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-500"
              >
                <span className="text-slate-300 truncate max-w-[200px] flex items-center gap-1" title={cust.name}>
                  <span className="text-slate-500 mr-1">{i + 1}.</span>
                  {cust.name}
                  <Zap size={7} className="text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </span>
                <span className="text-rose-300 font-mono font-bold">{cust.totalVuln.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Card Analysis Modal */}
      <AnalyticsCardModal
        open={cardModal.open}
        card={cardModal.card}
        mlLoading={cardModal.mlLoading}
        mlData={cardModal.mlData}
        mlError={cardModal.mlError}
        onClose={closeCardModal}
        onRetry={() => { if (cardModal.card) openCardModal(cardModal.card); }}
      />
    </div>
  );
}

function StatCard({
  icon, label, value, color, onClick, processingML = false
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  onClick?: () => void;
  processingML?: boolean;
}) {
  const [hovered, setHovered] = React.useState(false);

  const colorMap: Record<string, string> = {
    cyan:    'from-cyan-500/20    to-cyan-500/5    border-cyan-500/30    text-cyan-400',
    amber:   'from-amber-500/20   to-amber-500/5   border-amber-500/30   text-amber-400',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400',
    rose:    'from-rose-500/20    to-rose-500/5    border-rose-500/30    text-rose-400',
    purple:  'from-purple-500/20  to-purple-500/5  border-purple-500/30  text-purple-400',
  };
  const glowMap: Record<string, string> = {
    cyan: 'shadow-cyan-500/25', amber: 'shadow-amber-500/25',
    emerald: 'shadow-emerald-500/25', rose: 'shadow-rose-500/25', purple: 'shadow-purple-500/25',
  };
  const iconColor = colorMap[color]?.split(' ').pop() ?? 'text-cyan-400';
  const isClickable = !!onClick;

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${
        colorMap[color] ?? colorMap.cyan
      } border rounded-xl p-4 transition-all duration-300 group ${
        isClickable ? 'cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5' : 'cursor-default'
      } ${
        hovered && isClickable ? `shadow-xl ${glowMap[color] ?? ''}` : 'shadow-sm'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      onTouchEnd={isClickable ? (e) => { e.preventDefault(); onClick?.(); } : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `Analyze ${label} with AI/ML` : undefined}
      aria-busy={processingML || undefined}
    >
      {/* Processing overlay */}
      {processingML && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm rounded-xl">
          <div className="flex flex-col items-center gap-1.5">
            <RefreshCw size={16} className="animate-spin text-cyan-400" />
            <span className="text-xs text-cyan-400 font-medium">Analyzing…</span>
          </div>
        </div>
      )}

      {/* Hover glow */}
      <div className={`absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 ${
        hovered && isClickable ? 'opacity-20' : ''
      } bg-white/5 pointer-events-none`} />

      <div className={`${iconColor} mb-2 transition-transform duration-200 ${hovered && isClickable ? 'scale-110' : ''}`}>
        {icon}
      </div>
      <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-white mt-0.5 capitalize">{value}</p>

      {/* Analyze badge on hover */}
      {isClickable && !processingML && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-slate-900/80 border border-slate-700/60 pointer-events-none">
          <Zap size={8} className="text-cyan-400" />
          <span className="text-cyan-400 font-medium">Analyze</span>
        </div>
      )}

      {/* Bottom accent */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r transition-transform duration-300 origin-left ${
        hovered && isClickable ? 'scale-x-100' : 'scale-x-0'
      } ${
        color === 'cyan'    ? 'from-cyan-400 to-teal-400'     :
        color === 'amber'   ? 'from-amber-400 to-yellow-400'  :
        color === 'emerald' ? 'from-emerald-400 to-green-400' :
        color === 'rose'    ? 'from-rose-400 to-red-400'      :
                              'from-purple-400 to-violet-400'
      }`} />
    </div>
  );
}

function RiskBar({ label, count, total, color, onClick }: { label: string; count: number; total: number; color: string; onClick?: () => void }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const colorMap: Record<string, string> = {
    rose: 'bg-rose-500',
    amber: 'bg-amber-500',
    yellow: 'bg-yellow-500',
    emerald: 'bg-emerald-500',
  };
  const ringMap: Record<string, string> = {
    rose: 'focus-visible:ring-rose-500',
    amber: 'focus-visible:ring-amber-500',
    yellow: 'focus-visible:ring-yellow-500',
    emerald: 'focus-visible:ring-emerald-500',
  };
  const hoverMap: Record<string, string> = {
    rose: 'hover:bg-rose-900/20',
    amber: 'hover:bg-amber-900/20',
    yellow: 'hover:bg-yellow-900/20',
    emerald: 'hover:bg-emerald-900/20',
  };
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      aria-label={onClick ? `Analyze ${label} risk tier — ${count} customers with AI/ML` : undefined}
      className={`w-full text-left transition-all duration-150 rounded-lg p-1.5 -m-1.5
        ${ onClick ? `cursor-pointer ${hoverMap[color] ?? ''} active:scale-[0.99] touch-manipulation
          focus-visible:outline-none focus-visible:ring-2 ${ringMap[color] ?? ''} group` : 'cursor-default' }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400 flex items-center gap-1">
          {label}
          {onClick && <Zap size={7} className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
        </span>
        <span className="text-xs font-bold text-white">{count} ({pct.toFixed(1)}%)</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${colorMap[color] || 'bg-cyan-500'} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </button>
  );
}
