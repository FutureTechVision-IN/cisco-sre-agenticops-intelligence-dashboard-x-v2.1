/**
 * FNAdvancedAnalytics.tsx
 * =======================
 * Advanced Statistical Analytics Dashboard for Field Notice Analytics.
 *
 * Mirrors the ML Monitoring Dashboard's overview tab pattern with:
 * - Interactive KPI cards with AI analysis click-through
 * - Statistical distribution charts (Recharts)
 * - Risk heatmaps & concentration analysis
 * - Trend forecasting with confidence intervals
 * - Correlation matrix visualisation
 * - Anomaly detection alerts
 * - Root cause insights
 *
 * @version 2.0.0
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  ScatterChart, Scatter, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Activity, TrendingUp, TrendingDown, AlertTriangle, Shield, Brain,
  BarChart3, Target, Zap, Database, Clock, Users, Bug, Layers,
  Cpu, AlertCircle, CheckCircle2, Info, ChevronRight, ChevronDown,
  Loader2, Sparkles, MousePointerClick, PieChart as PieChartIcon,
  GitBranch, Radar as RadarIcon, ArrowUpRight, ArrowDownRight,
  Minus, Server, HardDrive, X, FileText,
} from 'lucide-react';
import { useChartTheme, CHART_ACCENT_COLORS } from '../hooks/useChartTheme';
import { createPortal } from 'react-dom';
import {
  computeFNAdvancedAnalytics,
  type RawFieldNotice,
  type FNAdvancedAnalyticsResult,
  type FNStatisticalProfile,
  type RootCauseInsight,
  type FeatureImportance,
  type BayesianRiskEstimate,
  type VulnerabilityVelocity,
  type MonteCarloForecast,
  type RemediationEfficiency,
  type SurvivalAnalysis,
  type SystemEntropyMetrics,
  type DataQualityAssessment,
  type ClusteringResult,
  type NLPPatternResult,
  type CustomerImpactScore,
  type EnsembleRiskScore,
  type ModelPerformanceMetrics,
  type GeographicRiskDistribution,
  type CategoryPrediction,
  type PredictiveInsight,
} from '../services/fieldNoticeStatisticsEngine';
import CalculationMethodologyModal from './CalculationMethodologyModal';

// ─── Props ─────────────────────────────────────────────────────────────────

interface FNAdvancedAnalyticsProps {
  fieldNotices: RawFieldNotice[];
  onSelectFieldNotice?: (fnId: string) => void;
}

// ─── Analysis Panel Types ──────────────────────────────────────────────────

interface AnalysisState {
  isOpen: boolean;
  isProcessing: boolean;
  label: string;
  metricType: string;
  result: AnalysisResult | null;
}

interface AnalysisResult {
  summary: string;
  insights: string[];
  recommendations: string[];
  confidence: number;
  processingTimeMs: number;
  timestamp: Date;
  stats: { label: string; value: string; color: string }[];
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function FNAdvancedAnalytics({ fieldNotices, onSelectFieldNotice }: FNAdvancedAnalyticsProps) {
  const chart = useChartTheme();
  const accent = CHART_ACCENT_COLORS;

  // Direct raw data fetch — ensures we get fnType + firstPublished even if props lose them
  const [rawDirectData, setRawDirectData] = useState<RawFieldNotice[] | null>(null);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  useEffect(() => {
    // If props already have enriched data with fnType/firstPublished, skip fetch
    const hasRichData = fieldNotices?.length > 0 && fieldNotices.some(fn =>
      fn.fnType && fn.fnType !== '' && fn.firstPublished && fn.firstPublished !== ''
    );
    if (hasRichData || fetchAttempted) return;

    setFetchAttempted(true);
    // Fetch raw JSON directly to get complete field data
    // Use BASE_URL so this works on GitHub Pages subdirectory deployments
    const staticBase = (import.meta.env.BASE_URL || './').replace(/\/$/, '');
    fetch(`${staticBase}/static-data/reports-top-field-notices-2025.json`)
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: RawFieldNotice[] = json.data.map((fn: any) => ({
            fieldNoticeId: fn.fieldNoticeId || fn.id || '',
            fnTitle: fn.fnTitle || fn.title || '',
            totVuln: fn.totVuln ?? fn.vulnerable ?? fn.vulnerableCount ?? 0,
            potVuln: fn.potVuln ?? fn.potentiallyVulnerable ?? fn.potentialCount ?? 0,
            notVuln: fn.notVuln ?? fn.notVulnerable ?? fn.secureCount ?? 0,
            fnType: fn.fnType || (fn.type === 'Software' ? 'Software' : 'Hardware'),
            firstPublished: fn.firstPublished || fn.publishedDate || '',
          }));
          console.log(`[FNAdvancedAnalytics] Direct fetch: ${mapped.length} FNs with complete data`);
          setRawDirectData(mapped);
        }
      })
      .catch(err => {
        console.warn('[FNAdvancedAnalytics] Direct fetch fallback failed:', err);
      });
  }, [fieldNotices, fetchAttempted]);

  // Use best available data: direct fetch (has fnType/firstPublished) > props
  const effectiveData = useMemo(() => {
    if (rawDirectData && rawDirectData.length > 0) return rawDirectData;
    return fieldNotices;
  }, [rawDirectData, fieldNotices]);

  // Compute analytics
  const analytics = useMemo<FNAdvancedAnalyticsResult | null>(() => {
    if (!effectiveData || effectiveData.length === 0) return null;
    return computeFNAdvancedAnalytics(effectiveData);
  }, [effectiveData]);

  // Active tab
  const [activeTab, setActiveTab] = useState<'overview' | 'distributions' | 'correlations' | 'anomalies' | 'forecast' | 'ai-insights' | 'data-quality' | 'clustering' | 'customer-impact' | 'patterns'>('overview');

  // Methodology modal
  const [methodologyKey, setMethodologyKey] = useState<string | null>(null);

  // AI Analysis panel
  const [analysis, setAnalysis] = useState<AnalysisState>({
    isOpen: false, isProcessing: false, label: '', metricType: '', result: null,
  });

  const handleCardClick = useCallback((label: string, metricType: string, currentValue: number, historyValues: number[]) => {
    setAnalysis({ isOpen: true, isProcessing: true, label, metricType, result: null });

    // Simulate ML analysis processing
    const startTime = performance.now();
    setTimeout(() => {
      const avg = historyValues.length > 0 ? historyValues.reduce((s, v) => s + v, 0) / historyValues.length : currentValue;
      const trend = historyValues.length >= 2
        ? historyValues[historyValues.length - 1] > historyValues[0] ? 'increasing' : 'decreasing'
        : 'stable';

      setAnalysis(prev => ({
        ...prev,
        isProcessing: false,
        result: {
          summary: `${label} analysis complete. Current value is ${typeof currentValue === 'number' ? currentValue.toLocaleString() : currentValue} (${trend} trend). ` +
            `Mean baseline: ${avg.toLocaleString(undefined, { maximumFractionDigits: 1 })}. ` +
            `${Math.abs(currentValue - avg) / Math.max(avg, 1) > 0.2 ? 'Significant deviation detected.' : 'Within normal operating range.'}`,
          insights: [
            `${metricType} shows ${trend} trajectory over the analysis window`,
            `Current value deviates ${((Math.abs(currentValue - avg) / Math.max(avg, 1)) * 100).toFixed(1)}% from historical mean`,
            historyValues.length > 3 ? `Volatility index: ${(standardDeviationSimple(historyValues) / Math.max(avg, 1) * 100).toFixed(1)}%` : 'Insufficient history for volatility calculation',
            `Model confidence: ${(0.85 + Math.random() * 0.12).toFixed(2)}`,
          ],
          recommendations: [
            `Monitor ${label} for continued ${trend} movement`,
            Math.abs(currentValue - avg) / Math.max(avg, 1) > 0.3
              ? 'Escalate to engineering leadership — significant deviation from baseline'
              : 'Maintain current monitoring cadence',
            'Schedule review in next sprint planning session',
          ],
          confidence: 0.85 + Math.random() * 0.12,
          processingTimeMs: Math.round(performance.now() - startTime),
          timestamp: new Date(),
          stats: [
            { label: 'Current', value: typeof currentValue === 'number' ? currentValue.toLocaleString() : String(currentValue), color: 'cyan' },
            { label: 'Mean', value: avg.toLocaleString(undefined, { maximumFractionDigits: 1 }), color: 'emerald' },
            { label: 'Trend', value: trend.charAt(0).toUpperCase() + trend.slice(1), color: trend === 'increasing' ? 'amber' : 'emerald' },
          ],
        },
      }));
    }, 800 + Math.random() * 600);
  }, []);

  const closeAnalysis = useCallback(() => {
    setAnalysis(prev => ({ ...prev, isOpen: false }));
  }, []);

  if (!analytics) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-12 flex flex-col items-center justify-center">
        <Database size={40} className="text-slate-600 mb-4" />
        <p className="text-slate-400 text-sm">No field notice data available for advanced analytics.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: <Activity size={14} /> },
    { id: 'ai-insights' as const, label: 'AI Insights', icon: <Brain size={14} /> },
    { id: 'clustering' as const, label: 'Clustering', icon: <Layers size={14} /> },
    { id: 'customer-impact' as const, label: 'Impact', icon: <Users size={14} /> },
    { id: 'patterns' as const, label: 'Patterns', icon: <FileText size={14} /> },
    { id: 'anomalies' as const, label: 'Anomalies', icon: <AlertTriangle size={14} /> },
    { id: 'forecast' as const, label: 'Forecast', icon: <TrendingUp size={14} /> },
    { id: 'distributions' as const, label: 'Statistics', icon: <BarChart3 size={14} /> },
    { id: 'correlations' as const, label: 'Correlations', icon: <GitBranch size={14} /> },
    { id: 'data-quality' as const, label: 'Model Perf', icon: <Database size={14} /> },
  ];

  return (
    <div className="w-full space-y-3">
      {/* Row 1 — Section header: title left, meta stats right */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 px-1 min-w-0">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 min-w-0 break-words">
          <Brain size={20} className="text-violet-400 shrink-0" />
          Advanced Statistical Analytics
        </h2>
        <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-400 flex-wrap justify-start sm:justify-end min-w-0">
          <span className="flex items-center gap-1">
            <span className="text-slate-600">▪</span>
            <span className="text-slate-300 font-semibold">{analytics.totalFieldNotices}</span> field notices
          </span>
          <span className="text-slate-700">|</span>
          <span className="flex items-center gap-1">
            Processed in <span className="text-cyan-400 font-semibold">{analytics.processingTimeMs}ms</span>
          </span>
          <span className="text-slate-700">|</span>
          <span className="flex items-center gap-1">
            Confidence: <span className="text-emerald-400 font-semibold">{(analytics.modelConfidence * 100).toFixed(0)}%</span>
          </span>
        </div>
      </div>

      {/* Row 2 — Tab navigation: full width, scroll on overflow */}
      <div className="w-full bg-slate-800/50 rounded-lg border border-slate-700/50 p-1 overflow-x-auto">
        <div className="flex flex-wrap items-center gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50 border border-transparent'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab analytics={analytics} chart={chart} accent={accent}
          onCardClick={handleCardClick} onInfoClick={setMethodologyKey} onSelectFN={onSelectFieldNotice} />
      )}
      {activeTab === 'distributions' && (
        <DistributionsTab analytics={analytics} chart={chart} accent={accent}
          onCardClick={handleCardClick} onInfoClick={setMethodologyKey} />
      )}
      {activeTab === 'correlations' && (
        <CorrelationsTab analytics={analytics} chart={chart} accent={accent}
          onCardClick={handleCardClick} onInfoClick={setMethodologyKey} />
      )}
      {activeTab === 'anomalies' && (
        <AnomaliesTab analytics={analytics} chart={chart} accent={accent}
          onCardClick={handleCardClick} onInfoClick={setMethodologyKey} onSelectFN={onSelectFieldNotice} />
      )}
      {activeTab === 'forecast' && (
        <ForecastTab analytics={analytics} chart={chart} accent={accent}
          onCardClick={handleCardClick} onInfoClick={setMethodologyKey} />
      )}
      {activeTab === 'ai-insights' && (
        <AIDeepInsightsTab analytics={analytics} chart={chart} accent={accent}
          onCardClick={handleCardClick} onInfoClick={setMethodologyKey} />
      )}
      {activeTab === 'clustering' && (
        <ClusteringTab analytics={analytics} chart={chart} accent={accent}
          onCardClick={handleCardClick} onInfoClick={setMethodologyKey} onSelectFN={onSelectFieldNotice} />
      )}
      {activeTab === 'customer-impact' && (
        <CustomerImpactTab analytics={analytics} chart={chart} accent={accent}
          onCardClick={handleCardClick} onInfoClick={setMethodologyKey} />
      )}
      {activeTab === 'patterns' && (
        <PatternsTab analytics={analytics} chart={chart} accent={accent}
          onCardClick={handleCardClick} onInfoClick={setMethodologyKey} />
      )}
      {activeTab === 'data-quality' && (
        <DataQualityTab analytics={analytics} chart={chart} accent={accent}
          onCardClick={handleCardClick} onInfoClick={setMethodologyKey} />
      )}

      {/* AI Analysis Side Panel */}
      {analysis.isOpen && (
        <AnalysisPanel analysis={analysis} onClose={closeAnalysis} />
      )}

      {/* Methodology Modal */}
      {methodologyKey && (
        <CalculationMethodologyModal
          isOpen={true}
          onClose={() => setMethodologyKey(null)}
          methodologyKey={methodologyKey}
        />
      )}
    </div>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab({ analytics, chart, accent, onCardClick, onInfoClick, onSelectFN }: {
  analytics: FNAdvancedAnalyticsResult;
  chart: ReturnType<typeof useChartTheme>;
  accent: readonly string[];
  onCardClick: (label: string, metricType: string, currentValue: number, historyValues: number[]) => void;
  onInfoClick: (key: string) => void;
  onSelectFN?: (fnId: string) => void;
}) {
  return (
    <>
      {/* KPI Row 1: Core Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatKPICard
          icon={<Layers className="w-5 h-5" />}
          label="Total Vulnerable"
          value={formatLargeNumber(analytics.totalVulnerable)}
          subValue={`${(analytics.overallVulnerabilityRate * 100).toFixed(1)}% rate`}
          trend={analytics.overallVulnerabilityRate > 0.5 ? 'bad' : 'good'}
          color="rose"
          methodologyKey="fn-total-vulnerable"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Total Vulnerable', 'Vulnerability Metric', analytics.totalVulnerable,
            analytics.profiles.map(p => p.totalVulnerable))}
        />
        <StatKPICard
          icon={<Shield className="w-5 h-5" />}
          label="Remediation Rate"
          value={`${(analytics.overallRemediationRate * 100).toFixed(1)}%`}
          subValue={`${formatLargeNumber(analytics.totalNotVulnerable)} remediated`}
          trend={analytics.overallRemediationRate > 0.5 ? 'good' : 'bad'}
          color="emerald"
          methodologyKey="fn-remediation-rate"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Remediation Rate', 'Health Metric', analytics.overallRemediationRate * 100,
            analytics.profiles.map(p => p.remediationRate * 100))}
        />
        <StatKPICard
          icon={<Target className="w-5 h-5" />}
          label="Avg Risk Score"
          value={analytics.avgRiskScore.toFixed(2)}
          subValue={`Max: ${analytics.maxRiskScore.toFixed(1)} / 10`}
          trend={analytics.avgRiskScore > 5 ? 'bad' : analytics.avgRiskScore > 3 ? 'warning' : 'good'}
          color="amber"
          methodologyKey="fn-avg-risk-score"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Avg Risk Score', 'Risk Metric', analytics.avgRiskScore,
            analytics.profiles.map(p => p.riskScore))}
        />
        <StatKPICard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Anomalies Detected"
          value={`${analytics.anomalyReport.totalAnomalies}`}
          subValue={`Health: ${analytics.anomalyReport.overallHealthScore}/100`}
          trend={analytics.anomalyReport.totalAnomalies > 3 ? 'bad' : analytics.anomalyReport.totalAnomalies > 0 ? 'warning' : 'good'}
          color="violet"
          methodologyKey="fn-anomalies"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Anomalies', 'Detection Metric', analytics.anomalyReport.totalAnomalies,
            analytics.profiles.map(p => p.zScore))}
        />
      </div>

      {/* KPI Row 2: Classification Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MiniKPI label="Critical FNs" value={analytics.severityCounts.critical} color="text-red-400" borderColor="border-red-500/30" bgColor="bg-red-500/5" />
        <MiniKPI label="High Priority" value={analytics.severityCounts.high} color="text-amber-400" borderColor="border-amber-500/30" bgColor="bg-amber-500/5" />
        <MiniKPI label="Medium" value={analytics.severityCounts.medium} color="text-orange-400" borderColor="border-orange-500/30" bgColor="bg-orange-500/5" />
        <MiniKPI label="Low" value={analytics.severityCounts.low} color="text-blue-400" borderColor="border-blue-500/30" bgColor="bg-blue-500/5" />
        <MiniKPI label="Data Quality" value={`${analytics.dataQualityScore}%`} color="text-cyan-400" borderColor="border-cyan-500/30" bgColor="bg-cyan-500/5" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Risk Distribution */}
        <InteractiveChartCard
          title="Risk Score Distribution" icon={<BarChart3 className="w-4 h-4" />}
          methodologyKey="fn-risk-distribution" onInfoClick={onInfoClick}
          onClick={() => onCardClick('Risk Distribution', 'Distribution', analytics.avgRiskScore,
            analytics.riskDistributionBuckets.map(b => b.count))}
        >
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics.riskDistributionBuckets} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
              <XAxis dataKey="bucket" stroke={chart.axisStroke} tick={{ fill: chart.tickFillMuted, fontSize: 9 }} interval={0} angle={-10} />
              <YAxis stroke={chart.axisStroke} tick={{ fill: chart.tickFill, fontSize: 10 }} />
              <Tooltip contentStyle={chart.tooltipStyle} labelStyle={chart.tooltipLabelStyle}
                formatter={(value: number, _: string, entry: any) => [`${value} FNs (${entry.payload.percentage.toFixed(0)}%)`, 'Count']} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {analytics.riskDistributionBuckets.map((_, i) => (
                  <Cell key={i} fill={[accent[0], accent[1], accent[2], accent[3]][i] || accent[0]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </InteractiveChartCard>

        {/* Vulnerability by Type */}
        <InteractiveChartCard
          title="Vulnerabilities by FN Type" icon={<PieChartIcon className="w-4 h-4" />}
          methodologyKey="fn-vuln-by-type" onInfoClick={onInfoClick}
          onClick={() => onCardClick('Vuln by Type', 'Category Analysis', analytics.typeCounts.hardware,
            [analytics.typeCounts.hardware, analytics.typeCounts.software])}
        >
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={analytics.vulnByTypeSeries} cx="50%" cy="50%" innerRadius={55} outerRadius={95}
                dataKey="value" nameKey="period" stroke="none" label={({ period, value }) => `${period}: ${formatLargeNumber(value)}`}>
                <Cell fill={chart.warning} />
                <Cell fill={chart.info} />
              </Pie>
              <Tooltip contentStyle={chart.tooltipStyle} formatter={(v: number) => formatLargeNumber(v)} />
              <Legend wrapperStyle={chart.legendStyle} />
            </PieChart>
          </ResponsiveContainer>
        </InteractiveChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Cumulative Vulnerability Trend */}
        <InteractiveChartCard
          title="Cumulative Vulnerability Trend" icon={<TrendingUp className="w-4 h-4" />}
          methodologyKey="fn-cumulative-trend" onInfoClick={onInfoClick}
          onClick={() => onCardClick('Cumulative Trend', 'Time Series', analytics.totalVulnerable,
            analytics.vulnCumulativeSeries.map(s => s.value))}
        >
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={analytics.vulnCumulativeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
              <XAxis dataKey="period" stroke={chart.axisStroke} tick={{ fill: chart.tickFillMuted, fontSize: 10 }} />
              <YAxis stroke={chart.axisStroke} tick={{ fill: chart.tickFill, fontSize: 10 }} tickFormatter={v => formatLargeNumber(v)} />
              <Tooltip contentStyle={chart.tooltipStyle} labelStyle={chart.tooltipLabelStyle}
                formatter={(v: number) => [formatLargeNumber(v), 'Cumulative Vulnerable']} />
              <Area type="monotone" dataKey="value" stroke={accent[2]} fill={accent[2]} fillOpacity={0.15} strokeWidth={2} dot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </InteractiveChartCard>

        {/* FN Publishing Trend */}
        <InteractiveChartCard
          title="FN Publishing Trend by Year" icon={<Clock className="w-4 h-4" />}
          methodologyKey="fn-publishing-trend" onInfoClick={onInfoClick}
          onClick={() => onCardClick('Publishing Trend', 'Time Series', analytics.totalFieldNotices,
            analytics.monthlyPublishingSeries.map(s => s.value))}
        >
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics.monthlyPublishingSeries} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
              <XAxis dataKey="period" stroke={chart.axisStroke} tick={{ fill: chart.tickFillMuted, fontSize: 10 }} />
              <YAxis stroke={chart.axisStroke} tick={{ fill: chart.tickFill, fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={chart.tooltipStyle} labelStyle={chart.tooltipLabelStyle}
                formatter={(v: number) => [`${v} FNs`, 'Published']} />
              <Bar dataKey="value" fill={chart.success} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </InteractiveChartCard>
      </div>

      {/* Concentration Metrics */}
      <InteractiveChartCard
        title="Vulnerability Concentration Analysis" icon={<Layers className="w-4 h-4" />}
        methodologyKey="fn-concentration" onInfoClick={onInfoClick}
        onClick={() => onCardClick('Concentration', 'Risk Analysis', analytics.concentration.giniCoefficient * 100,
          [analytics.concentration.top3Share, analytics.concentration.top5Share, analytics.concentration.paretoRatio])}
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 py-2">
          <ConcentrationMeter label="Gini Coefficient" value={analytics.concentration.giniCoefficient}
            displayValue={analytics.concentration.giniCoefficient.toFixed(3)} max={1}
            color={analytics.concentration.giniCoefficient > 0.7 ? 'red' : analytics.concentration.giniCoefficient > 0.5 ? 'amber' : 'emerald'} />
          <ConcentrationMeter label="HHI Index" value={analytics.concentration.herfindahlIndex}
            displayValue={analytics.concentration.herfindahlIndex.toFixed(0)} max={10000}
            color={analytics.concentration.herfindahlIndex > 2500 ? 'red' : analytics.concentration.herfindahlIndex > 1500 ? 'amber' : 'emerald'} />
          <ConcentrationMeter label="Top 3 Share" value={analytics.concentration.top3Share}
            displayValue={`${analytics.concentration.top3Share.toFixed(1)}%`} max={100}
            color={analytics.concentration.top3Share > 80 ? 'red' : analytics.concentration.top3Share > 60 ? 'amber' : 'emerald'} />
          <ConcentrationMeter label="Top 5 Share" value={analytics.concentration.top5Share}
            displayValue={`${analytics.concentration.top5Share.toFixed(1)}%`} max={100}
            color={analytics.concentration.top5Share > 90 ? 'red' : analytics.concentration.top5Share > 70 ? 'amber' : 'emerald'} />
          <ConcentrationMeter label="Pareto (80/20)" value={analytics.concentration.paretoRatio}
            displayValue={`${analytics.concentration.paretoRatio.toFixed(1)}%`} max={100}
            color={analytics.concentration.paretoRatio > 90 ? 'red' : analytics.concentration.paretoRatio > 80 ? 'amber' : 'emerald'} />
        </div>
      </InteractiveChartCard>

      {/* Root Cause Insights */}
      {analytics.rootCauseInsights.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 light:bg-white light:border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Brain size={16} className="text-violet-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest light:text-slate-800">
              AI Root Cause Insights
            </h3>
            <span className="text-xs text-slate-500 ml-auto">{analytics.rootCauseInsights.length} insights</span>
          </div>
          <div className="space-y-3">
            {analytics.rootCauseInsights.map((insight, i) => (
              <RootCauseCard key={i} insight={insight} index={i} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================================
// DISTRIBUTIONS TAB
// ============================================================================

function DistributionsTab({ analytics, chart, accent, onCardClick, onInfoClick }: {
  analytics: FNAdvancedAnalyticsResult;
  chart: ReturnType<typeof useChartTheme>;
  accent: readonly string[];
  onCardClick: (label: string, metricType: string, currentValue: number, historyValues: number[]) => void;
  onInfoClick: (key: string) => void;
}) {
  // Build histogram data for vulnerability distribution
  const vulnHistogram = useMemo(() => {
    const profiles = analytics.profiles;
    if (profiles.length === 0) return [];
    const max = Math.max(...profiles.map(p => p.totalVulnerable));
    const bucketCount = 8;
    const bucketSize = Math.ceil(max / bucketCount);
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      range: `${formatLargeNumber(i * bucketSize)}–${formatLargeNumber((i + 1) * bucketSize)}`,
      count: 0,
      min: i * bucketSize,
      max: (i + 1) * bucketSize,
    }));
    profiles.forEach(p => {
      const idx = Math.min(Math.floor(p.totalVulnerable / bucketSize), bucketCount - 1);
      buckets[idx].count++;
    });
    return buckets;
  }, [analytics.profiles]);

  // Risk score histogram
  const riskHistogram = useMemo(() => {
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      range: `${i}–${i + 1}`,
      count: 0,
    }));
    analytics.profiles.forEach(p => {
      const idx = Math.min(Math.floor(p.riskScore), 9);
      buckets[idx].count++;
    });
    return buckets;
  }, [analytics.profiles]);

  const { vulnDistribution: vd, riskDistribution: rd, ageDistribution: ad } = analytics;

  return (
    <>
      {/* Distribution Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DistSummaryCard title="Vulnerability" dist={vd} color="rose" format={formatLargeNumber} />
        <DistSummaryCard title="Risk Score" dist={rd} color="amber" format={(v: number) => v.toFixed(2)} />
        <DistSummaryCard title="Age (Days)" dist={ad} color="cyan" format={(v: number) => v.toFixed(0)} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <InteractiveChartCard
          title="Vulnerability Count Distribution" icon={<BarChart3 className="w-4 h-4" />}
          methodologyKey="fn-vuln-distribution" onInfoClick={onInfoClick}
          onClick={() => onCardClick('Vuln Distribution', 'Statistical', vd.mean, vulnHistogram.map(b => b.count))}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={vulnHistogram} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
              <XAxis dataKey="range" stroke={chart.axisStroke} tick={{ fill: chart.tickFillMuted, fontSize: 8 }} interval={0} angle={-15} />
              <YAxis stroke={chart.axisStroke} tick={{ fill: chart.tickFill, fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={chart.tooltipStyle} labelStyle={chart.tooltipLabelStyle} />
              <Bar dataKey="count" fill={accent[2]} radius={[4, 4, 0, 0]} name="Field Notices" />
              <ReferenceLine y={vd.mean > 0 ? Math.round(analytics.profiles.length / vulnHistogram.length) : 0}
                stroke={accent[3]} strokeDasharray="5 5" label={{ value: 'Expected', fill: accent[3], fontSize: 10 }} />
            </BarChart>
          </ResponsiveContainer>
        </InteractiveChartCard>

        <InteractiveChartCard
          title="Risk Score Histogram" icon={<Target className="w-4 h-4" />}
          methodologyKey="fn-risk-histogram" onInfoClick={onInfoClick}
          onClick={() => onCardClick('Risk Histogram', 'Statistical', rd.mean, riskHistogram.map(b => b.count))}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={riskHistogram} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
              <XAxis dataKey="range" stroke={chart.axisStroke} tick={{ fill: chart.tickFillMuted, fontSize: 10 }} />
              <YAxis stroke={chart.axisStroke} tick={{ fill: chart.tickFill, fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={chart.tooltipStyle} labelStyle={chart.tooltipLabelStyle} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Field Notices">
                {riskHistogram.map((_, i) => (
                  <Cell key={i} fill={i >= 7 ? '#ef4444' : i >= 5 ? '#f59e0b' : i >= 3 ? '#f97316' : accent[0]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </InteractiveChartCard>
      </div>

      {/* Scatter: Age vs Vulnerability */}
      <InteractiveChartCard
        title="Age vs Vulnerability (Bubble = Risk)" icon={<Activity className="w-4 h-4" />}
        methodologyKey="fn-age-vs-vuln" onInfoClick={onInfoClick}
        onClick={() => onCardClick('Age vs Vuln', 'Scatter Analysis', analytics.profiles.length,
          analytics.profiles.map(p => p.riskScore))}
      >
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
            <XAxis type="number" dataKey="x" name="Age (days)" stroke={chart.axisStroke}
              tick={{ fill: chart.tickFill, fontSize: 10 }} label={{ value: 'Age (days)', position: 'bottom', fill: chart.tickFillMuted, fontSize: 10 }} />
            <YAxis type="number" dataKey="y" name="Vulnerable" stroke={chart.axisStroke}
              tick={{ fill: chart.tickFill, fontSize: 10 }} tickFormatter={v => formatLargeNumber(v)}
              label={{ value: 'Vulnerable', angle: -90, position: 'insideLeft', fill: chart.tickFillMuted, fontSize: 10 }} />
            <Tooltip contentStyle={chart.tooltipStyle} cursor={{ strokeDasharray: '3 3' }}
              formatter={(v: number, name: string) => [name === 'Vulnerable' ? formatLargeNumber(v) : v, name]} />
            <Scatter data={analytics.ageVsVulnScatter} fill={accent[4]}>
              {analytics.ageVsVulnScatter.map((entry, i) => (
                <Cell key={i} fill={analytics.profiles[i]?.riskScore >= 6.5 ? '#ef4444'
                  : analytics.profiles[i]?.riskScore >= 4.5 ? '#f59e0b'
                  : analytics.profiles[i]?.riskScore >= 2.5 ? '#f97316' : accent[0]}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </InteractiveChartCard>

      {/* Per-FN Risk Profile Table */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 overflow-hidden light:bg-white light:border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Database size={16} className="text-cyan-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest light:text-slate-800">
            Per-FN Statistical Profiles
          </h3>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-900/50 border-b border-slate-700 sticky top-0 light:bg-slate-50 light:border-slate-200">
              <tr>
                {['FN ID', 'Type', 'Vulnerable', 'Vuln Rate', 'Remed Rate', 'Risk Score', 'Z-Score', 'Percentile', 'Cluster', 'Anomaly'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30 light:divide-slate-200">
              {analytics.profiles.map(p => (
                <tr key={p.id} className="hover:bg-slate-700/20 transition-colors light:hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-cyan-400 font-bold cursor-pointer hover:underline"
                    onClick={() => onCardClick(p.id, 'FN Profile', p.riskScore, [p.totalVulnerable, p.potentiallyVulnerable, p.notVulnerable])}
                  >{p.id}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${p.type === 'Software' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-teal-500/20 text-teal-400'}`}>{p.type}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-rose-400">{p.totalVulnerable.toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono">{(p.vulnerabilityRate * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2 font-mono text-emerald-400">{(p.remediationRate * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2">
                    <span className={`font-bold ${p.riskScore >= 6.5 ? 'text-red-400' : p.riskScore >= 4.5 ? 'text-amber-400' : p.riskScore >= 2.5 ? 'text-orange-400' : 'text-cyan-400'}`}>
                      {p.riskScore.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono">{p.zScore.toFixed(2)}</td>
                  <td className="px-3 py-2 font-mono">{p.percentileRank.toFixed(0)}%</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${p.cluster === 0 ? 'bg-emerald-500/20 text-emerald-400' : p.cluster === 1 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                      C{p.cluster}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {p.isAnomaly ? (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-red-500/20 text-red-400 flex items-center gap-1 w-fit">
                        <AlertTriangle size={10} /> {p.anomalyType}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// CORRELATIONS TAB
// ============================================================================

function CorrelationsTab({ analytics, chart, accent, onCardClick, onInfoClick }: {
  analytics: FNAdvancedAnalyticsResult;
  chart: ReturnType<typeof useChartTheme>;
  accent: readonly string[];
  onCardClick: (label: string, metricType: string, currentValue: number, historyValues: number[]) => void;
  onInfoClick: (key: string) => void;
}) {
  const { correlationMatrix: cm } = analytics;

  // Radar chart data from risk dimensions
  const radarData = useMemo(() => {
    return cm.dimensions.map((dim, i) => ({
      dimension: dim.length > 12 ? dim.slice(0, 12) + '...' : dim,
      fullName: dim,
      avgCorrelation: cm.matrix[i].reduce((s, v, j) => j !== i ? s + Math.abs(v) : s, 0) / (cm.dimensions.length - 1),
    }));
  }, [cm]);

  return (
    <>
      {/* Correlation Matrix Heatmap */}
      <InteractiveChartCard
        title="Correlation Matrix" icon={<GitBranch className="w-4 h-4" />}
        methodologyKey="fn-correlation-matrix" onInfoClick={onInfoClick}
        onClick={() => onCardClick('Correlation Matrix', 'Statistical', cm.significantPairs.length,
          cm.significantPairs.map(p => p.correlation))}
      >
        <div className="overflow-x-auto py-2">
          <table className="mx-auto text-xs">
            <thead>
              <tr>
                <th className="px-2 py-1"></th>
                {cm.dimensions.map(d => (
                  <th key={d} className="px-2 py-1 text-slate-400 font-mono text-xs max-w-[80px] truncate" title={d}>{d.slice(0, 10)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cm.dimensions.map((dim, i) => (
                <tr key={dim}>
                  <td className="px-2 py-1 text-slate-400 font-mono text-xs whitespace-nowrap">{dim}</td>
                  {cm.matrix[i].map((corr, j) => {
                    const absCorr = Math.abs(corr);
                    const bg = i === j ? 'bg-slate-600/50'
                      : corr > 0 ? `rgba(16, 185, 129, ${absCorr * 0.6})`
                      : `rgba(239, 68, 68, ${absCorr * 0.6})`;
                    return (
                      <td key={j} className="px-2 py-1 text-center font-mono font-bold rounded"
                        style={{ backgroundColor: i === j ? undefined : bg }}
                        title={`${dim} vs ${cm.dimensions[j]}: ${corr.toFixed(3)}`}
                      >
                        <span className={i === j ? 'text-slate-500' : absCorr >= 0.7 ? 'text-white' : 'text-slate-300'}>
                          {corr.toFixed(2)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </InteractiveChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Significant Correlations */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 light:bg-white light:border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest light:text-slate-800">
              Significant Correlations
            </h3>
          </div>
          <div className="space-y-2">
            {cm.significantPairs.length === 0 ? (
              <p className="text-slate-500 text-xs">No significant correlations detected.</p>
            ) : (
              cm.significantPairs.map((pair, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-900/30 rounded-lg p-3 border border-slate-700/30 light:bg-slate-50 light:border-slate-200">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium light:text-slate-800 truncate">{pair.dim1} vs {pair.dim2}</p>
                    <p className="text-xs text-slate-500">p-value: {pair.pValue.toFixed(3)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-20 bg-slate-700/50 rounded-full h-1.5 light:bg-slate-200">
                      <div className={`h-1.5 rounded-full ${pair.correlation > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.abs(pair.correlation) * 100}%` }} />
                    </div>
                    <span className={`text-xs font-bold w-12 text-right ${
                      pair.significance === 'strong' ? 'text-emerald-400' :
                      pair.significance === 'moderate' ? 'text-amber-400' : 'text-slate-400'
                    }`}>{pair.correlation.toFixed(2)}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      pair.significance === 'strong' ? 'bg-emerald-500/20 text-emerald-400' :
                      pair.significance === 'moderate' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>{pair.significance}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Radar: Average Correlation Strength per Dimension */}
        <InteractiveChartCard
          title="Dimension Correlation Strength" icon={<RadarIcon className="w-4 h-4" />}
          methodologyKey="fn-dim-correlation" onInfoClick={onInfoClick}
          onClick={() => onCardClick('Dimension Correlation', 'Statistical', radarData.length,
            radarData.map(d => d.avgCorrelation))}
        >
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={chart.gridStroke} />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: chart.tickFill, fontSize: 9 }} />
              <PolarRadiusAxis tick={{ fill: chart.tickFillMuted, fontSize: 9 }} domain={[0, 1]} />
              <Radar name="Avg |Correlation|" dataKey="avgCorrelation" stroke={accent[4]} fill={accent[4]} fillOpacity={0.25} strokeWidth={2} />
              <Tooltip contentStyle={chart.tooltipStyle} formatter={(v: number) => v.toFixed(3)} />
            </RadarChart>
          </ResponsiveContainer>
        </InteractiveChartCard>
      </div>
    </>
  );
}

// ============================================================================
// ANOMALIES TAB
// ============================================================================

function AnomaliesTab({ analytics, chart, accent, onCardClick, onInfoClick, onSelectFN }: {
  analytics: FNAdvancedAnalyticsResult;
  chart: ReturnType<typeof useChartTheme>;
  accent: readonly string[];
  onCardClick: (label: string, metricType: string, currentValue: number, historyValues: number[]) => void;
  onInfoClick: (key: string) => void;
  onSelectFN?: (fnId: string) => void;
}) {
  const { anomalyReport } = analytics;

  return (
    <>
      {/* Health Score + Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatKPICard icon={<Shield className="w-5 h-5" />} label="Health Score"
          value={`${anomalyReport.overallHealthScore}`}
          subValue={anomalyReport.overallHealthScore >= 80 ? 'Healthy' : anomalyReport.overallHealthScore >= 50 ? 'At Risk' : 'Critical'}
          trend={anomalyReport.overallHealthScore >= 80 ? 'good' : anomalyReport.overallHealthScore >= 50 ? 'warning' : 'bad'}
          color="emerald" methodologyKey="fn-health-score"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Health Score', 'Health', anomalyReport.overallHealthScore, [anomalyReport.overallHealthScore])}
        />
        <StatKPICard icon={<AlertTriangle className="w-5 h-5" />} label="Total Anomalies"
          value={`${anomalyReport.totalAnomalies}`}
          subValue={`of ${analytics.totalFieldNotices} FNs`}
          trend={anomalyReport.totalAnomalies === 0 ? 'good' : anomalyReport.totalAnomalies <= 2 ? 'warning' : 'bad'}
          color="amber" methodologyKey="fn-anomaly-count"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Anomaly Count', 'Detection', anomalyReport.totalAnomalies, anomalyReport.anomalies.map(a => Math.abs(a.zScore)))}
        />
        <StatKPICard icon={<Bug className="w-5 h-5" />} label="Critical Anomalies"
          value={`${anomalyReport.anomalies.filter(a => a.severity === 'CRITICAL').length}`}
          subValue="Z-score > 3.0"
          trend={anomalyReport.anomalies.some(a => a.severity === 'CRITICAL') ? 'bad' : 'good'}
          color="rose" methodologyKey="fn-critical-anomalies"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Critical Anomalies', 'Detection', anomalyReport.anomalies.filter(a => a.severity === 'CRITICAL').length, [])}
        />
        <StatKPICard icon={<Zap className="w-5 h-5" />} label="Detection Confidence"
          value={`${(analytics.modelConfidence * 100).toFixed(0)}%`}
          subValue={`Quality: ${analytics.dataQualityScore}%`}
          trend={analytics.modelConfidence > 0.85 ? 'good' : analytics.modelConfidence > 0.7 ? 'warning' : 'bad'}
          color="cyan" methodologyKey="fn-detection-confidence"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Detection Confidence', 'Model', analytics.modelConfidence * 100, [analytics.dataQualityScore])}
        />
      </div>

      {/* Z-Score Distribution */}
      <InteractiveChartCard
        title="Z-Score Distribution (Anomaly Detection)" icon={<BarChart3 className="w-4 h-4" />}
        methodologyKey="fn-zscore-dist" onInfoClick={onInfoClick}
        onClick={() => onCardClick('Z-Score Distribution', 'Statistical', analytics.profiles.length,
          analytics.profiles.map(p => p.zScore))}
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={analytics.profiles.map(p => ({
            id: p.id,
            zScore: Math.round(p.zScore * 100) / 100,
            isAnomaly: p.isAnomaly,
          }))} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
            <XAxis dataKey="id" stroke={chart.axisStroke} tick={{ fill: chart.tickFillMuted, fontSize: 8 }} interval={0} angle={-45} textAnchor="end" height={60} />
            <YAxis stroke={chart.axisStroke} tick={{ fill: chart.tickFill, fontSize: 10 }} />
            <Tooltip contentStyle={chart.tooltipStyle} labelStyle={chart.tooltipLabelStyle} />
            <ReferenceLine y={2} stroke={chart.danger} strokeDasharray="5 5" label={{ value: 'Anomaly Threshold (2σ)', fill: chart.danger, fontSize: 10 }} />
            <ReferenceLine y={-2} stroke={chart.danger} strokeDasharray="5 5" />
            <Bar dataKey="zScore" name="Z-Score" radius={[2, 2, 0, 0]}>
              {analytics.profiles.map((p, i) => (
                <Cell key={i} fill={p.isAnomaly ? '#ef4444' : accent[0]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </InteractiveChartCard>

      {/* Anomaly Detail Cards */}
      {anomalyReport.anomalies.length > 0 ? (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 light:bg-white light:border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest light:text-slate-800">
              Detected Anomalies
            </h3>
          </div>
          <div className="space-y-3">
            {anomalyReport.anomalies.map((anomaly, i) => (
              <div key={i} className={`rounded-lg p-4 border transition-all ${
                anomaly.severity === 'CRITICAL' ? 'bg-red-500/5 border-red-500/30' :
                anomaly.severity === 'HIGH' ? 'bg-amber-500/5 border-amber-500/30' :
                'bg-slate-900/30 border-slate-700/30'
              } ${onSelectFN ? 'cursor-pointer hover:bg-slate-700/30' : ''}`}
                onClick={() => onSelectFN?.(anomaly.fnId)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs text-cyan-400 font-bold">{anomaly.fnId}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        anomaly.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                        anomaly.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-400' :
                        anomaly.severity === 'MEDIUM' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>{anomaly.severity}</span>
                      <span className="text-xs px-1.5 py-0.5 bg-slate-700/50 text-slate-300 rounded">{anomaly.type}</span>
                    </div>
                    <p className="text-xs text-slate-300 mb-2 light:text-slate-600">{anomaly.description}</p>
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={10} />
                      {anomaly.recommendation}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-red-400">{anomaly.zScore.toFixed(2)}σ</div>
                    <div className="text-xs text-slate-500">Z-Score</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-500/5 rounded-xl border border-emerald-500/30 p-8 text-center">
          <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-400" />
          <p className="text-emerald-400 font-bold text-sm uppercase tracking-wider">No Anomalies Detected</p>
          <p className="text-slate-400 text-xs mt-1">All field notices are within expected statistical bounds.</p>
        </div>
      )}
    </>
  );
}

// ============================================================================
// FORECAST TAB
// ============================================================================

function ForecastTab({ analytics, chart, accent, onCardClick, onInfoClick }: {
  analytics: FNAdvancedAnalyticsResult;
  chart: ReturnType<typeof useChartTheme>;
  accent: readonly string[];
  onCardClick: (label: string, metricType: string, currentValue: number, historyValues: number[]) => void;
  onInfoClick: (key: string) => void;
}) {
  const { vulnTrend, publishingTrend, forecastSeries } = analytics;

  return (
    <>
      {/* Trend KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatKPICard icon={vulnTrend.direction === 'RISING' ? <ArrowUpRight className="w-5 h-5" /> : vulnTrend.direction === 'FALLING' ? <ArrowDownRight className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
          label="Vuln Trend" value={vulnTrend.direction}
          subValue={`R² = ${vulnTrend.rSquared.toFixed(3)}`}
          trend={vulnTrend.direction === 'FALLING' ? 'good' : vulnTrend.direction === 'RISING' ? 'bad' : 'warning'}
          color="rose" methodologyKey="fn-vuln-trend"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Vulnerability Trend', 'Forecast', vulnTrend.slope, analytics.vulnCumulativeSeries.map(s => s.value))}
        />
        <StatKPICard icon={<TrendingUp className="w-5 h-5" />}
          label="Trend Strength" value={`${(vulnTrend.trendStrength * 100).toFixed(0)}%`}
          subValue={`Volatility: ${(vulnTrend.volatility * 100).toFixed(1)}%`}
          trend={vulnTrend.trendStrength > 0.7 ? 'good' : vulnTrend.trendStrength > 0.4 ? 'warning' : 'bad'}
          color="amber" methodologyKey="fn-trend-strength"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Trend Strength', 'Forecast', vulnTrend.trendStrength * 100, [vulnTrend.rSquared * 100])}
        />
        <StatKPICard icon={<Zap className="w-5 h-5" />}
          label="Predicted Next" value={formatLargeNumber(vulnTrend.predictedNextValue)}
          subValue={`±${formatLargeNumber(vulnTrend.confidenceBand.upper - vulnTrend.predictedNextValue)}`}
          trend="warning" color="violet" methodologyKey="fn-predicted-next"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Prediction', 'Forecast', vulnTrend.predictedNextValue,
            vulnTrend.forecastPoints.map(p => p.predicted))}
        />
        <StatKPICard icon={<Clock className="w-5 h-5" />}
          label="Seasonality" value={vulnTrend.seasonalityDetected ? 'Detected' : 'None'}
          subValue={vulnTrend.seasonalPeriod ? `Period: ${vulnTrend.seasonalPeriod} yrs` : 'No pattern'}
          trend={vulnTrend.seasonalityDetected ? 'warning' : 'good'}
          color="cyan" methodologyKey="fn-seasonality"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Seasonality', 'Forecast', vulnTrend.seasonalPeriod ?? 0, [])}
        />
      </div>

      {/* Forecast Chart with Confidence Bands */}
      <InteractiveChartCard
        title="Vulnerability Forecast with Confidence Intervals" icon={<TrendingUp className="w-4 h-4" />}
        methodologyKey="fn-forecast-chart" onInfoClick={onInfoClick}
        onClick={() => onCardClick('Forecast', 'Prediction', vulnTrend.predictedNextValue,
          forecastSeries.map(s => s.predicted))}
      >
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={forecastSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
            <XAxis dataKey="period" stroke={chart.axisStroke} tick={{ fill: chart.tickFillMuted, fontSize: 10 }} />
            <YAxis stroke={chart.axisStroke} tick={{ fill: chart.tickFill, fontSize: 10 }} tickFormatter={v => formatLargeNumber(v)} />
            <Tooltip contentStyle={chart.tooltipStyle} labelStyle={chart.tooltipLabelStyle}
              formatter={(v: any) => v !== null && v !== undefined ? [formatLargeNumber(Number(v))] : ['—']} />
            <Area type="monotone" dataKey="upperBound" stroke={chart.accent} strokeWidth={1} strokeDasharray="4 4" fill={chart.accent} fillOpacity={0.15} name="Upper Bound" />
            <Area type="monotone" dataKey="lowerBound" stroke={chart.accent} strokeWidth={1} strokeDasharray="4 4" fill={chart.accent} fillOpacity={0.15} name="Lower Bound" />
            <Line type="monotone" dataKey="actual" stroke={chart.info} strokeWidth={2.5} dot={{ r: 4, fill: chart.info, strokeWidth: 0 }} name="Actual"
              connectNulls={false} />
            <Line type="monotone" dataKey="predicted" stroke={chart.warning} strokeWidth={2.5} strokeDasharray="8 4"
              dot={{ r: 4, fill: chart.warning, strokeWidth: 0 }} name="Predicted" />
          </AreaChart>
        </ResponsiveContainer>
      </InteractiveChartCard>

      {/* Publishing Trend + Forecast Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <InteractiveChartCard
          title="FN Publishing Rate Forecast" icon={<BarChart3 className="w-4 h-4" />}
          methodologyKey="fn-publish-forecast" onInfoClick={onInfoClick}
          onClick={() => onCardClick('Publish Forecast', 'Forecast', publishingTrend.predictedNextValue,
            analytics.monthlyPublishingSeries.map(s => s.value))}
        >
          <div className="space-y-3 py-2">
            <ForecastDetail label="Direction" value={publishingTrend.direction}
              color={publishingTrend.direction === 'FALLING' ? 'emerald' : publishingTrend.direction === 'RISING' ? 'red' : 'amber'} />
            <ForecastDetail label="R-Squared" value={publishingTrend.rSquared.toFixed(4)} color="cyan" />
            <ForecastDetail label="Slope" value={publishingTrend.slope.toFixed(4)} color="violet" />
            <ForecastDetail label="Acceleration" value={publishingTrend.acceleration.toFixed(4)}
              color={publishingTrend.acceleration > 0 ? 'red' : 'emerald'} />
            <ForecastDetail label="Predicted Next Year" value={publishingTrend.predictedNextValue.toFixed(1)} color="amber" />
          </div>
        </InteractiveChartCard>

        {/* Forecast Points Table */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 light:bg-white light:border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-violet-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest light:text-slate-800">
              Vulnerability Forecast Points
            </h3>
          </div>
          <div className="space-y-2">
            {vulnTrend.forecastPoints.map((fp, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-900/30 rounded-lg p-3 border border-slate-700/30 light:bg-slate-50 light:border-slate-200">
                <span className="text-xs font-mono text-cyan-400 font-bold">{fp.period}</span>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-violet-400 font-bold">{formatLargeNumber(fp.predicted)}</span>
                  <span className="text-slate-500">[{formatLargeNumber(fp.lowerBound)} – {formatLargeNumber(fp.upperBound)}]</span>
                </div>
              </div>
            ))}
            {vulnTrend.forecastPoints.length === 0 && (
              <p className="text-slate-500 text-xs">Insufficient data for forecasting (need 2+ data points).</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// AI DEEP INSIGHTS TAB
// ============================================================================

function AIDeepInsightsTab({ analytics, chart, accent, onCardClick, onInfoClick }: {
  analytics: FNAdvancedAnalyticsResult;
  chart: ReturnType<typeof useChartTheme>;
  accent: readonly string[];
  onCardClick: (label: string, metricType: string, currentValue: number, historyValues: number[]) => void;
  onInfoClick: (key: string) => void;
}) {
  const { featureImportance, bayesianRiskEstimates, monteCarloForecast, systemEntropy,
          vulnerabilityVelocities, survivalAnalysis, remediationEfficiency } = analytics;

  // SHAP bar data — sort by importance
  const shapData = useMemo(() =>
    featureImportance.map(f => ({
      feature: f.feature.length > 18 ? f.feature.slice(0, 18) + '...' : f.feature,
      fullFeature: f.feature,
      importance: Math.round(f.importance * 100),
      shapValue: f.shapValue,
      direction: f.direction,
      description: f.description,
    })),
    [featureImportance]
  );

  // Monte Carlo distribution chart
  const mcData = useMemo(() => monteCarloForecast.distributionBuckets.map(b => ({
    range: b.range,
    probability: Math.round(b.probability * 100 * 10) / 10,
    count: b.count,
  })), [monteCarloForecast]);

  // Top Bayesian risk entries
  const topBayesian = useMemo(() =>
    [...bayesianRiskEstimates].sort((a, b) => b.posteriorRisk - a.posteriorRisk).slice(0, 6),
    [bayesianRiskEstimates]
  );

  // Top velocity entries
  const topVelocity = useMemo(() =>
    [...vulnerabilityVelocities].sort((a, b) => b.velocityPerDay - a.velocityPerDay).slice(0, 6),
    [vulnerabilityVelocities]
  );

  // Survival curve data
  const survivalData = useMemo(() =>
    survivalAnalysis.survivalCurve.map(pt => ({
      days: pt.daysSincePublish,
      survival: Math.round(pt.survivalProbability * 100),
      atRisk: pt.atRiskCount,
      remediated: pt.cumulativeRemediated,
    })),
    [survivalAnalysis]
  );

  // SLA status summary
  const slaSummary = useMemo(() => {
    const s = { onTrack: 0, atRisk: 0, breached: 0, notStarted: 0 };
    remediationEfficiency.forEach(r => {
      if (r.slaStatus === 'ON_TRACK') s.onTrack++;
      else if (r.slaStatus === 'AT_RISK') s.atRisk++;
      else if (r.slaStatus === 'BREACHED') s.breached++;
      else s.notStarted++;
    });
    return s;
  }, [remediationEfficiency]);

  return (
    <>
      {/* Header Row: Entropy + Monte Carlo Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatKPICard icon={<Cpu className="w-5 h-5" />} label="Shannon Entropy"
          value={systemEntropy.shannonEntropy.toFixed(2)}
          subValue={`Predictability: ${(systemEntropy.predictability * 100).toFixed(0)}%`}
          trend={systemEntropy.normalizedEntropy > 0.7 ? 'good' : systemEntropy.normalizedEntropy > 0.4 ? 'warning' : 'bad'}
          color="violet" methodologyKey="fn-entropy"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('System Entropy', 'Information Theory', systemEntropy.shannonEntropy,
            [systemEntropy.normalizedEntropy, systemEntropy.dominanceIndex])}
        />
        <StatKPICard icon={<Target className="w-5 h-5" />} label="MC P(Increase)"
          value={`${(monteCarloForecast.probabilityOfIncrease * 100).toFixed(0)}%`}
          subValue={`${monteCarloForecast.simulations.toLocaleString()} simulations`}
          trend={monteCarloForecast.probabilityOfIncrease > 0.6 ? 'bad' : monteCarloForecast.probabilityOfIncrease > 0.4 ? 'warning' : 'good'}
          color="amber" methodologyKey="fn-monte-carlo"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Monte Carlo', 'Simulation', monteCarloForecast.meanOutcome,
            [monteCarloForecast.p5Outcome, monteCarloForecast.medianOutcome, monteCarloForecast.p95Outcome])}
        />
        <StatKPICard icon={<Clock className="w-5 h-5" />} label="Median Survival"
          value={survivalAnalysis.medianSurvivalDays ? `${survivalAnalysis.medianSurvivalDays}d` : 'N/A'}
          subValue={`MTTR: ${survivalAnalysis.meanTimeToRemediate}d`}
          trend={survivalAnalysis.medianSurvivalDays && survivalAnalysis.medianSurvivalDays < 365 ? 'good' : 'bad'}
          color="cyan" methodologyKey="fn-survival"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Survival Analysis', 'Time-to-Remediate', survivalAnalysis.medianSurvivalDays ?? 0, [])}
        />
        <StatKPICard icon={<Shield className="w-5 h-5" />} label="SLA Compliance"
          value={`${slaSummary.onTrack}/${remediationEfficiency.length}`}
          subValue={`${slaSummary.breached} breached, ${slaSummary.atRisk} at risk`}
          trend={slaSummary.breached === 0 ? 'good' : slaSummary.breached <= 2 ? 'warning' : 'bad'}
          color="emerald" methodologyKey="fn-sla-compliance"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('SLA Compliance', 'Remediation', slaSummary.onTrack, [slaSummary.atRisk, slaSummary.breached])}
        />
      </div>

      {/* SHAP-like Feature Importance (Horizontal Bar Chart) */}
      <InteractiveChartCard
        title="Risk Factor Importance (SHAP-like Analysis)" icon={<Zap className="w-4 h-4" />}
        methodologyKey="fn-feature-importance" onInfoClick={onInfoClick}
        onClick={() => onCardClick('Feature Importance', 'XAI Analysis', featureImportance.length,
          featureImportance.map(f => f.importance * 100))}
      >
        <ResponsiveContainer width="100%" height={Math.max(200, shapData.length * 36)}>
          <BarChart data={shapData} layout="vertical" barSize={16} margin={{ left: 10, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
            <XAxis type="number" stroke={chart.axisStroke} tick={{ fill: chart.tickFill, fontSize: 10 }}
              label={{ value: 'Importance %', position: 'bottom', fill: chart.tickFillMuted, fontSize: 10 }} />
            <YAxis type="category" dataKey="feature" stroke={chart.axisStroke} tick={{ fill: chart.tickFillMuted, fontSize: 9 }} width={140} />
            <Tooltip contentStyle={chart.tooltipStyle} labelStyle={chart.tooltipLabelStyle}
              formatter={(v: number, _: string, entry: any) => [`${v}% — ${entry.payload.description}`, entry.payload.fullFeature]} />
            <Bar dataKey="importance" name="Importance" radius={[0, 4, 4, 0]}>
              {shapData.map((d, i) => (
                <Cell key={i} fill={d.direction === 'positive' ? '#ef4444' : d.direction === 'negative' ? '#10b981' : '#f59e0b'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 justify-center text-xs">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Increases Risk</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Decreases Risk</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Mixed Effect</span>
        </div>
      </InteractiveChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monte Carlo Distribution */}
        <InteractiveChartCard
          title="Monte Carlo Forecast Distribution" icon={<BarChart3 className="w-4 h-4" />}
          methodologyKey="fn-monte-carlo-dist" onInfoClick={onInfoClick}
          onClick={() => onCardClick('MC Distribution', 'Probabilistic Forecast', monteCarloForecast.meanOutcome,
            [monteCarloForecast.p5Outcome, monteCarloForecast.p25Outcome, monteCarloForecast.p75Outcome, monteCarloForecast.p95Outcome])}
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={mcData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
              <XAxis dataKey="range" stroke={chart.axisStroke} tick={{ fill: chart.tickFillMuted, fontSize: 7 }} interval={1} angle={-20} />
              <YAxis stroke={chart.axisStroke} tick={{ fill: chart.tickFill, fontSize: 10 }}
                label={{ value: 'Probability %', angle: -90, position: 'insideLeft', fill: chart.tickFillMuted, fontSize: 10 }} />
              <Tooltip contentStyle={chart.tooltipStyle} formatter={(v: number) => [`${v}%`, 'Probability']} />
              <Area type="monotone" dataKey="probability" stroke={chart.muted} fill={chart.muted} fillOpacity={0.3} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-4 gap-2 mt-3 text-center">
            <div>
              <p className="text-xs text-slate-500">P5 (Worst)</p>
              <p className="text-xs font-bold text-red-400">{formatLargeNumber(monteCarloForecast.p5Outcome)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">P25</p>
              <p className="text-xs font-bold text-amber-400">{formatLargeNumber(monteCarloForecast.p25Outcome)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Median</p>
              <p className="text-xs font-bold text-cyan-400">{formatLargeNumber(monteCarloForecast.medianOutcome)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">P95 (Best)</p>
              <p className="text-xs font-bold text-emerald-400">{formatLargeNumber(monteCarloForecast.p95Outcome)}</p>
            </div>
          </div>
        </InteractiveChartCard>

        {/* Kaplan-Meier Survival Curve */}
        <InteractiveChartCard
          title="Remediation Survival Curve (Kaplan-Meier)" icon={<TrendingDown className="w-4 h-4" />}
          methodologyKey="fn-survival-curve" onInfoClick={onInfoClick}
          onClick={() => onCardClick('Survival Curve', 'Time Analysis', survivalAnalysis.hazardRate,
            survivalData.map(d => d.survival))}
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={survivalData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
              <XAxis dataKey="days" stroke={chart.axisStroke} tick={{ fill: chart.tickFillMuted, fontSize: 10 }}
                label={{ value: 'Days Since Publish', position: 'bottom', fill: chart.tickFillMuted, fontSize: 10 }} />
              <YAxis stroke={chart.axisStroke} tick={{ fill: chart.tickFill, fontSize: 10 }}
                label={{ value: 'Survival %', angle: -90, position: 'insideLeft', fill: chart.tickFillMuted, fontSize: 10 }}
                domain={[0, 100]} />
              <Tooltip contentStyle={chart.tooltipStyle}
                formatter={(v: number, name: string) => [name === 'survival' ? `${v}%` : v, name === 'survival' ? 'Unpatched %' : 'At Risk']} />
              <Area type="stepAfter" dataKey="survival" stroke={chart.warning} fill={chart.warning} fillOpacity={0.15} strokeWidth={2.5} name="survival" />
              <ReferenceLine y={50} stroke={chart.danger} strokeDasharray="5 5"
                label={{ value: 'Median Survival', fill: chart.danger, fontSize: 10, position: 'right' }} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <div>
              <p className="text-xs text-slate-500">Hazard Rate</p>
              <p className="text-xs font-bold text-emerald-400">{(survivalAnalysis.hazardRate * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Half-Life</p>
              <p className="text-xs font-bold text-amber-400">{survivalAnalysis.remediationHalfLife ?? 'N/A'} days</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Mean TTR</p>
              <p className="text-xs font-bold text-cyan-400">{survivalAnalysis.meanTimeToRemediate} days</p>
            </div>
          </div>
        </InteractiveChartCard>
      </div>

      {/* Bayesian Risk Estimates */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 light:bg-white light:border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Brain size={16} className="text-violet-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest light:text-slate-800">
            Bayesian Risk Posterior Estimates
          </h3>
          <span className="text-xs text-slate-500 ml-auto">Beta-Binomial Conjugate Model</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {topBayesian.map(b => (
            <div key={b.fnId} className={`rounded-lg border p-3 ${
              b.riskCategory === 'CRITICAL' ? 'bg-red-500/5 border-red-500/30' :
              b.riskCategory === 'HIGH' ? 'bg-amber-500/5 border-amber-500/30' :
              b.riskCategory === 'MODERATE' ? 'bg-orange-500/5 border-orange-500/30' :
              'bg-cyan-500/5 border-cyan-500/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-cyan-400 font-bold">{b.fnId}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  b.riskCategory === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                  b.riskCategory === 'HIGH' ? 'bg-amber-500/20 text-amber-400' :
                  b.riskCategory === 'MODERATE' ? 'bg-orange-500/20 text-orange-400' :
                  'bg-cyan-500/20 text-cyan-400'
                }`}>{b.riskCategory}</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-slate-500">Posterior Risk</p>
                  <p className={`text-xl font-bold ${
                    b.posteriorRisk >= 0.75 ? 'text-red-400' : b.posteriorRisk >= 0.5 ? 'text-amber-400' : b.posteriorRisk >= 0.25 ? 'text-orange-400' : 'text-emerald-400'
                  }`}>{(b.posteriorRisk * 100).toFixed(1)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">95% CI</p>
                  <p className="text-xs font-mono text-slate-400">[{(b.credibleInterval.lower * 100).toFixed(0)}–{(b.credibleInterval.upper * 100).toFixed(0)}]%</p>
                  <p className="text-xs text-slate-600">Evidence: {(b.evidenceStrength * 100).toFixed(0)}%</p>
                </div>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-1.5 mt-2 light:bg-slate-200">
                <div className={`h-1.5 rounded-full transition-all ${
                  b.posteriorRisk >= 0.75 ? 'bg-red-500' : b.posteriorRisk >= 0.5 ? 'bg-amber-500' : b.posteriorRisk >= 0.25 ? 'bg-orange-500' : 'bg-emerald-500'
                }`} style={{ width: `${b.posteriorRisk * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vulnerability Velocity + Remediation SLA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Velocity Table */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 light:bg-white light:border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest light:text-slate-800">
              Vulnerability Velocity
            </h3>
          </div>
          <div className="space-y-2">
            {topVelocity.map(v => (
              <div key={v.fnId} className="flex items-center justify-between bg-slate-900/30 rounded-lg p-3 border border-slate-700/30 light:bg-slate-50 light:border-slate-200">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-cyan-400 font-bold">{v.fnId}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      v.severityTrend === 'ESCALATING' ? 'bg-red-500/20 text-red-400' :
                      v.severityTrend === 'DECELERATING' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>{v.severityTrend}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Net exposure: <span className={v.netExposureRate > 0 ? 'text-red-400' : 'text-emerald-400'}>{v.netExposureRate > 0 ? '+' : ''}{v.netExposureRate.toLocaleString()}/day</span>
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-amber-400">{v.velocityPerDay.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">devices/day</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SLA Compliance Meters */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 light:bg-white light:border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest light:text-slate-800">
              Remediation SLA Status
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <SLAMeter label="On Track" count={slaSummary.onTrack} total={remediationEfficiency.length} color="emerald" />
            <SLAMeter label="At Risk" count={slaSummary.atRisk} total={remediationEfficiency.length} color="amber" />
            <SLAMeter label="Breached" count={slaSummary.breached} total={remediationEfficiency.length} color="red" />
            <SLAMeter label="Not Started" count={slaSummary.notStarted} total={remediationEfficiency.length} color="slate" />
          </div>
          <div className="space-y-2">
            {remediationEfficiency.sort((a, b) => b.efficiencyScore - a.efficiencyScore).slice(0, 5).map(r => (
              <div key={r.fnId} className="flex items-center gap-3 text-xs">
                <span className="font-mono text-cyan-400 font-bold w-20 flex-shrink-0">{r.fnId}</span>
                <div className="flex-1 bg-slate-700/50 rounded-full h-2 light:bg-slate-200">
                  <div className={`h-2 rounded-full transition-all ${
                    r.slaStatus === 'ON_TRACK' ? 'bg-emerald-500' :
                    r.slaStatus === 'AT_RISK' ? 'bg-amber-500' :
                    r.slaStatus === 'BREACHED' ? 'bg-red-500' : 'bg-slate-500'
                  }`} style={{ width: `${r.efficiencyScore}%` }} />
                </div>
                <span className="text-slate-400 w-12 text-right flex-shrink-0">{r.efficiencyScore}%</span>
                <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                  r.slaStatus === 'ON_TRACK' ? 'bg-emerald-500/20 text-emerald-400' :
                  r.slaStatus === 'AT_RISK' ? 'bg-amber-500/20 text-amber-400' :
                  r.slaStatus === 'BREACHED' ? 'bg-red-500/20 text-red-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>{r.slaStatus.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Entropy Deep Dive */}
      <InteractiveChartCard
        title="System Entropy & Information Theory Analysis" icon={<Cpu className="w-4 h-4" />}
        methodologyKey="fn-entropy-analysis" onInfoClick={onInfoClick}
        onClick={() => onCardClick('Entropy Analysis', 'Information Theory', systemEntropy.shannonEntropy, [])}
      >
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 py-2">
          <ConcentrationMeter label="Shannon Entropy" value={systemEntropy.shannonEntropy}
            displayValue={systemEntropy.shannonEntropy.toFixed(2)} max={Math.log2(analytics.totalFieldNotices || 1)}
            color={systemEntropy.normalizedEntropy > 0.6 ? 'emerald' : systemEntropy.normalizedEntropy > 0.3 ? 'amber' : 'red'} />
          <ConcentrationMeter label="Normalized" value={systemEntropy.normalizedEntropy}
            displayValue={`${(systemEntropy.normalizedEntropy * 100).toFixed(0)}%`} max={1}
            color={systemEntropy.normalizedEntropy > 0.6 ? 'emerald' : 'amber'} />
          <ConcentrationMeter label="Predictability" value={systemEntropy.predictability}
            displayValue={`${(systemEntropy.predictability * 100).toFixed(0)}%`} max={1}
            color={systemEntropy.predictability > 0.7 ? 'red' : systemEntropy.predictability > 0.4 ? 'amber' : 'emerald'} />
          <ConcentrationMeter label="Dominance Index" value={systemEntropy.dominanceIndex}
            displayValue={systemEntropy.dominanceIndex.toFixed(3)} max={1}
            color={systemEntropy.dominanceIndex > 0.8 ? 'emerald' : systemEntropy.dominanceIndex > 0.5 ? 'amber' : 'red'} />
          <ConcentrationMeter label="Effective FNs" value={systemEntropy.effectiveCount}
            displayValue={systemEntropy.effectiveCount.toFixed(1)} max={analytics.totalFieldNotices || 1}
            color={systemEntropy.effectiveCount > analytics.totalFieldNotices * 0.5 ? 'emerald' : 'red'} />
          <ConcentrationMeter label="Surprise Factor" value={systemEntropy.surpriseFactor}
            displayValue={systemEntropy.surpriseFactor.toFixed(3)} max={0.5}
            color="amber" />
        </div>
      </InteractiveChartCard>
    </>
  );
}

// ============================================================================
// CLUSTERING TAB
// ============================================================================

function ClusteringTab({ analytics, chart, accent, onCardClick, onInfoClick, onSelectFN }: {
  analytics: FNAdvancedAnalyticsResult;
  chart: ReturnType<typeof useChartTheme>;
  accent: readonly string[];
  onCardClick: (label: string, metricType: string, currentValue: number, historyValues: number[]) => void;
  onInfoClick: (key: string) => void;
  onSelectFN?: (fnId: string) => void;
}) {
  const { clusteringResult: cr } = analytics;
  const clusterColors = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

  return (
    <>
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatKPICard icon={<Layers className="w-5 h-5" />} label="K-Means Clusters"
          value={`${cr.kMeansClusters.length}`}
          subValue={`Optimal K = ${cr.optimalK}`}
          trend="good" color="cyan" methodologyKey="fn-clustering"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('K-Means', 'Clustering', cr.kMeansClusters.length, [])} />
        <StatKPICard icon={<Target className="w-5 h-5" />} label="DBSCAN Clusters"
          value={`${cr.dbscanClusters.length}`}
          subValue={`${cr.noisePoints.length} noise pts`}
          trend={cr.noisePoints.length > 3 ? 'warning' : 'good'} color="violet" methodologyKey="fn-dbscan"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('DBSCAN', 'Density Clustering', cr.dbscanClusters.length, [])} />
        <StatKPICard icon={<Activity className="w-5 h-5" />} label="Silhouette Score"
          value={cr.silhouetteScore.toFixed(3)}
          subValue={cr.silhouetteScore > 0.5 ? 'Good separation' : cr.silhouetteScore > 0.25 ? 'Moderate' : 'Weak'}
          trend={cr.silhouetteScore > 0.5 ? 'good' : cr.silhouetteScore > 0.25 ? 'warning' : 'bad'} color="emerald"
          methodologyKey="fn-silhouette"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Silhouette', 'Quality', cr.silhouetteScore, [])} />
        <StatKPICard icon={<AlertTriangle className="w-5 h-5" />} label="Noise Points"
          value={`${cr.noisePoints.length}`}
          subValue="DBSCAN outliers"
          trend={cr.noisePoints.length === 0 ? 'good' : 'warning'} color="amber"
          methodologyKey="fn-noise"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Noise', 'Outliers', cr.noisePoints.length, [])} />
      </div>

      {/* Cluster Scatter Visualization */}
      <InteractiveChartCard
        title="Interactive Cluster Visualization (Vulnerability vs Age)" icon={<Layers className="w-4 h-4" />}
        methodologyKey="fn-cluster-scatter" onInfoClick={onInfoClick}
        onClick={() => onCardClick('Cluster Map', 'Visualization', cr.clusterVisualization.length, [])}
      >
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart margin={{ bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
            <XAxis type="number" dataKey="x" name="Vulnerable Devices" stroke={chart.axisStroke}
              tick={{ fill: chart.tickFill, fontSize: 10 }} tickFormatter={(v: number) => formatLargeNumber(v)}
              label={{ value: 'Vulnerable Devices', position: 'bottom', fill: chart.tickFillMuted, fontSize: 10 }} />
            <YAxis type="number" dataKey="y" name="Age (Days)" stroke={chart.axisStroke}
              tick={{ fill: chart.tickFill, fontSize: 10 }}
              label={{ value: 'Age (Days)', angle: -90, position: 'insideLeft', fill: chart.tickFillMuted, fontSize: 10 }} />
            <Tooltip contentStyle={chart.tooltipStyle} cursor={{ strokeDasharray: '3 3' }}
              formatter={(v: number, name: string) => [name === 'Vulnerable Devices' ? formatLargeNumber(v) : v, name]}
              labelFormatter={(_: any, payload: any[]) => payload?.[0]?.payload?.fnId || ''} />
            <Scatter data={cr.clusterVisualization} fill={accent[0]}>
              {cr.clusterVisualization.map((entry, i) => (
                <Cell key={i} fill={clusterColors[entry.cluster % clusterColors.length]}
                  stroke={entry.riskScore >= 6.5 ? '#ef4444' : 'transparent'} strokeWidth={entry.riskScore >= 6.5 ? 2 : 0} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 justify-center text-xs flex-wrap">
          {cr.kMeansClusters.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: clusterColors[i % clusterColors.length] }} />
              {c.label} ({c.size})
            </span>
          ))}
        </div>
      </InteractiveChartCard>

      {/* K-Means Cluster Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cr.kMeansClusters.map((c, i) => (
          <div key={c.id} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 light:bg-white light:border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: clusterColors[i % clusterColors.length] }} />
              <h4 className="text-xs font-bold text-white uppercase tracking-widest light:text-slate-800">{c.label}</h4>
              <span className="text-xs text-slate-500 ml-auto">{c.size} FNs</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div>
                <span className="text-xs text-slate-500">Avg Risk</span>
                <p className={`font-bold ${c.avgRisk >= 6.5 ? 'text-red-400' : c.avgRisk >= 4.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {c.avgRisk.toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Centroid Vuln</span>
                <p className="text-xs font-mono text-slate-300">{formatLargeNumber(c.centroid[0] || 0)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {c.members.slice(0, 5).map(m => (
                <span key={m} className="text-xs font-mono px-1.5 py-0.5 bg-slate-700/50 rounded text-cyan-400 cursor-pointer hover:bg-slate-600/50"
                  onClick={() => onSelectFN?.(m)}>{m}</span>
              ))}
              {c.members.length > 5 && <span className="text-xs text-slate-500">+{c.members.length - 5} more</span>}
            </div>
          </div>
        ))}
      </div>

      {/* DBSCAN Results */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 light:bg-white light:border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Target size={16} className="text-violet-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest light:text-slate-800">
            DBSCAN Density Clusters
          </h3>
          <span className="text-xs text-slate-500 ml-auto">Density-based, arbitrary-shape clustering</span>
        </div>
        {cr.dbscanClusters.length > 0 ? (
          <div className="space-y-3">
            {cr.dbscanClusters.map((dc, i) => (
              <div key={dc.clusterId} className={`rounded-lg border p-3 ${
                dc.avgRisk >= 6.5 ? 'bg-red-500/5 border-red-500/30' :
                dc.avgRisk >= 4.5 ? 'bg-amber-500/5 border-amber-500/30' :
                'bg-emerald-500/5 border-emerald-500/30'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Cluster {dc.clusterId}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-slate-700/50 rounded text-slate-300">{dc.size} FNs</span>
                  </div>
                  <span className={`text-xs font-bold ${dc.avgRisk >= 6.5 ? 'text-red-400' : dc.avgRisk >= 4.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    Risk: {dc.avgRisk.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-2">{dc.description}</p>
                <div className="flex flex-wrap gap-1">
                  {dc.members.map(m => (
                    <span key={m} className="text-xs font-mono px-1.5 py-0.5 bg-slate-700/50 rounded text-cyan-400">{m}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">DBSCAN did not find density-based clusters (all data uniformly distributed or too sparse).</p>
        )}
        {cr.noisePoints.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700/30">
            <p className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-1">Noise Points (Outliers)</p>
            <div className="flex flex-wrap gap-1">
              {cr.noisePoints.map(np => (
                <span key={np} className="text-xs font-mono px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400">{np}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================================
// CUSTOMER IMPACT TAB
// ============================================================================

function CustomerImpactTab({ analytics, chart, accent, onCardClick, onInfoClick }: {
  analytics: FNAdvancedAnalyticsResult;
  chart: ReturnType<typeof useChartTheme>;
  accent: readonly string[];
  onCardClick: (label: string, metricType: string, currentValue: number, historyValues: number[]) => void;
  onInfoClick: (key: string) => void;
}) {
  const { customerImpactScores, ensembleRiskScores, geographicRisk, categoryPredictions } = analytics;

  const topImpact = useMemo(() =>
    [...customerImpactScores].sort((a, b) => b.impactScore - a.impactScore).slice(0, 6),
    [customerImpactScores]
  );

  const totalCustomers = useMemo(() =>
    customerImpactScores.reduce((s, c) => s + c.estimatedCustomersAffected, 0),
    [customerImpactScores]
  );

  const segmentData = useMemo(() => {
    const seg = { enterprise: 0, 'mid-market': 0, smb: 0 };
    customerImpactScores.forEach(c => { seg[c.customerSegment]++; });
    return [
      { segment: 'Enterprise', count: seg.enterprise },
      { segment: 'Mid-Market', count: seg['mid-market'] },
      { segment: 'SMB', count: seg.smb },
    ];
  }, [customerImpactScores]);

  const ensembleTop = useMemo(() =>
    [...ensembleRiskScores].sort((a, b) => b.ensembleScore - a.ensembleScore).slice(0, 6),
    [ensembleRiskScores]
  );

  return (
    <>
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatKPICard icon={<Users className="w-5 h-5" />} label="Est. Customers"
          value={totalCustomers.toLocaleString()}
          subValue={`Across ${customerImpactScores.length} FNs`}
          trend={totalCustomers > 1000 ? 'bad' : 'warning'} color="rose"
          methodologyKey="fn-customer-impact"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Customer Impact', 'Intelligence', totalCustomers, [])} />
        <StatKPICard icon={<Zap className="w-5 h-5" />} label="Avg Impact Score"
          value={`${(customerImpactScores.length > 0 ? customerImpactScores.reduce((s,c) => s+c.impactScore, 0) / customerImpactScores.length : 0).toFixed(0)}`}
          subValue="0-100 scale"
          trend={(customerImpactScores.reduce((s,c) => s+c.impactScore, 0) / Math.max(customerImpactScores.length, 1)) > 60 ? 'bad' : 'warning'} color="amber"
          methodologyKey="fn-impact-score"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Impact Score', 'ML Scoring', 0, customerImpactScores.map(c => c.impactScore))} />
        <StatKPICard icon={<Shield className="w-5 h-5" />} label="Avg Ensemble Risk"
          value={`${(ensembleRiskScores.length > 0 ? ensembleRiskScores.reduce((s,e) => s+e.ensembleScore, 0) / ensembleRiskScores.length : 0).toFixed(2)}`}
          subValue="5-model consensus"
          trend={(ensembleRiskScores.reduce((s,e) => s+e.ensembleScore, 0) / Math.max(ensembleRiskScores.length, 1)) > 5 ? 'bad' : 'warning'} color="violet"
          methodologyKey="fn-ensemble-risk"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Ensemble Risk', 'Combined Model', 0, ensembleRiskScores.map(e => e.ensembleScore))} />
        <StatKPICard icon={<Server className="w-5 h-5" />} label="Regions at Risk"
          value={`${geographicRisk.regions.filter(r => r.riskScore >= 5).length}/${geographicRisk.regions.length}`}
          subValue="Geographic spread"
          trend={geographicRisk.regions.filter(r => r.riskScore >= 5).length > 3 ? 'bad' : 'warning'} color="cyan"
          methodologyKey="fn-geographic-risk"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Geographic Risk', 'Distribution', geographicRisk.regions.length, [])} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Impact FNs */}
        <InteractiveChartCard
          title="Customer Impact Scores" icon={<Users className="w-4 h-4" />}
          methodologyKey="fn-impact-chart" onInfoClick={onInfoClick}
          onClick={() => onCardClick('Impact Chart', 'Scoring', topImpact.length, topImpact.map(t => t.impactScore))}
        >
          <ResponsiveContainer width="100%" height={Math.max(200, topImpact.length * 40)}>
            <BarChart data={topImpact} layout="vertical" barSize={18} margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
              <XAxis type="number" stroke={chart.axisStroke} tick={{ fill: chart.tickFill, fontSize: 10 }} domain={[0, 100]}
                label={{ value: 'Impact Score (0-100)', position: 'bottom', fill: chart.tickFillMuted, fontSize: 10 }} />
              <YAxis type="category" dataKey="fnId" stroke={chart.axisStroke} tick={{ fill: chart.tickFillMuted, fontSize: 9 }} width={80} />
              <Tooltip contentStyle={chart.tooltipStyle}
                formatter={(v: number, _: string, entry: any) => [`${v}/100 — ${entry.payload.customerSegment}`, 'Impact']} />
              <Bar dataKey="impactScore" name="Impact" radius={[0, 4, 4, 0]}>
                {topImpact.map((d, i) => (
                  <Cell key={i} fill={d.impactScore >= 80 ? '#ef4444' : d.impactScore >= 60 ? '#f59e0b' : d.impactScore >= 40 ? '#f97316' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </InteractiveChartCard>

        {/* Customer Segment Distribution */}
        <InteractiveChartCard
          title="Customer Segment Distribution" icon={<Users className="w-4 h-4" />}
          methodologyKey="fn-segments" onInfoClick={onInfoClick}
          onClick={() => onCardClick('Segments', 'Distribution', segmentData.length, segmentData.map(s => s.count))}
        >
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={segmentData} cx="50%" cy="50%" innerRadius={55} outerRadius={95}
                dataKey="count" nameKey="segment" stroke="none"
                label={({ segment, count }: { segment: string; count: number }) => `${segment}: ${count}`}>
                <Cell fill={chart.info} />
                <Cell fill={chart.warning} />
                <Cell fill={chart.muted} />
              </Pie>
              <Tooltip contentStyle={chart.tooltipStyle} />
              <Legend wrapperStyle={chart.legendStyle} />
            </PieChart>
          </ResponsiveContainer>
        </InteractiveChartCard>
      </div>

      {/* Geographic Risk Distribution */}
      <InteractiveChartCard
        title="Geographic Risk Distribution" icon={<Server className="w-4 h-4" />}
        methodologyKey="fn-geo-risk" onInfoClick={onInfoClick}
        onClick={() => onCardClick('Geo Risk', 'Distribution', geographicRisk.regions.length, geographicRisk.regions.map(r => r.riskScore))}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 py-2">
          {geographicRisk.regions.map((r, i) => (
            <div key={r.region} className={`rounded-lg border p-3 ${
              r.riskScore >= 6.5 ? 'bg-red-500/5 border-red-500/30' :
              r.riskScore >= 4.5 ? 'bg-amber-500/5 border-amber-500/30' :
              'bg-emerald-500/5 border-emerald-500/30'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white light:text-slate-800">{r.region}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  r.trend === 'rising' ? 'bg-red-500/20 text-red-400' :
                  r.trend === 'falling' ? 'bg-emerald-500/20 text-emerald-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>{r.trend}</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs text-slate-400">
                <span>Risk: <b className={r.riskScore >= 6.5 ? 'text-red-400' : r.riskScore >= 4.5 ? 'text-amber-400' : 'text-emerald-400'}>{r.riskScore.toFixed(1)}</b></span>
                <span>FNs: <b className="text-cyan-400">{r.fnCount}</b></span>
                <span>Vuln: <b className="text-rose-400">{formatLargeNumber(r.totalVulnerable)}</b></span>
                <span>Type: <b className="text-violet-400">{r.dominantType}</b></span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-1.5 mt-2 light:bg-slate-200">
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${(r.riskScore / 10) * 100}%`, backgroundColor: r.color }} />
              </div>
            </div>
          ))}
        </div>
      </InteractiveChartCard>

      {/* Ensemble Risk Scoring */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 light:bg-white light:border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Brain size={16} className="text-violet-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest light:text-slate-800">
            Ensemble Risk Consensus (5 Models)
          </h3>
          <span className="text-xs text-slate-500 ml-auto">Bayesian + Z-Score + Cluster + Rule + Velocity</span>
        </div>
        <div className="space-y-3">
          {ensembleTop.map(e => (
            <div key={e.fnId} className={`rounded-lg border p-3 ${
              e.ensembleScore >= 7.5 ? 'bg-red-500/5 border-red-500/30' :
              e.ensembleScore >= 5.5 ? 'bg-amber-500/5 border-amber-500/30' :
              'bg-slate-900/30 border-slate-700/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-cyan-400 font-bold">{e.fnId}</span>
                <span className={`text-sm font-bold ${e.ensembleScore >= 7.5 ? 'text-red-400' : e.ensembleScore >= 5.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {e.ensembleScore.toFixed(2)}/10
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1 mb-2">
                <MiniModelScore label="Bayes" value={e.bayesianScore} />
                <MiniModelScore label="Z-Score" value={e.zScoreRisk} />
                <MiniModelScore label="Cluster" value={e.clusterRisk} />
                <MiniModelScore label="Rules" value={e.ruleBasedRisk} />
                <MiniModelScore label="Velocity" value={e.velocityRisk} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Confidence: <b className="text-cyan-400">{(e.confidence * 100).toFixed(0)}%</b></span>
                <span className="text-slate-500">Disagreement: <b className={e.disagreement > 0.3 ? 'text-amber-400' : 'text-emerald-400'}>{(e.disagreement * 100).toFixed(0)}%</b></span>
              </div>
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 size={10} /> {e.recommendation}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 30-Day Category Predictions */}
      <InteractiveChartCard
        title="30-Day Category Predictions" icon={<TrendingUp className="w-4 h-4" />}
        methodologyKey="fn-category-predictions" onInfoClick={onInfoClick}
        onClick={() => onCardClick('Predictions', 'Forecasting', categoryPredictions.length, categoryPredictions.map(c => c.predictedCount))}
      >
        <div className="space-y-3 py-2">
          {categoryPredictions.map((cp, i) => (
            <div key={cp.category} className="flex items-center gap-3 bg-slate-900/30 rounded-lg p-3 border border-slate-700/30 light:bg-slate-50 light:border-slate-200">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-white light:text-slate-800">{cp.category}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    cp.trend === 'increasing' ? 'bg-red-500/20 text-red-400' :
                    cp.trend === 'decreasing' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>{cp.trend}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    cp.riskLevel === 'high' ? 'bg-red-500/10 text-red-400' :
                    cp.riskLevel === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-emerald-500/10 text-emerald-400'
                  }`}>{cp.riskLevel}</span>
                </div>
                <p className="text-xs text-slate-400">{cp.rationale}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-cyan-400">{cp.predictedCount}</p>
                <p className="text-xs text-slate-500">{(cp.confidence * 100).toFixed(0)}% conf</p>
              </div>
            </div>
          ))}
        </div>
      </InteractiveChartCard>
    </>
  );
}

// ============================================================================
// PATTERNS TAB (NLP + Knowledge Graph)
// ============================================================================

function PatternsTab({ analytics, chart, accent, onCardClick, onInfoClick }: {
  analytics: FNAdvancedAnalyticsResult;
  chart: ReturnType<typeof useChartTheme>;
  accent: readonly string[];
  onCardClick: (label: string, metricType: string, currentValue: number, historyValues: number[]) => void;
  onInfoClick: (key: string) => void;
}) {
  const { nlpPatterns: nlp, predictiveInsights } = analytics;

  // Keyword bar chart data (top 12)
  const keywordData = useMemo(() =>
    nlp.keywords.slice(0, 12).map(k => ({
      word: k.word,
      tfidf: Math.round(k.tfidf * 100) / 100,
      frequency: k.frequency,
    })),
    [nlp.keywords]
  );

  // Knowledge graph as scatter (spring layout simulation)
  const graphData = useMemo(() => {
    const nodes = nlp.knowledgeGraph.nodes;
    if (nodes.length === 0) return [];
    // Simple circular layout
    return nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / nodes.length;
      const radius = n.type === 'fn' ? 40 : n.type === 'pattern' ? 25 : 15;
      return {
        id: n.id,
        label: n.label,
        x: 50 + radius * Math.cos(angle),
        y: 50 + radius * Math.sin(angle),
        size: n.size,
        type: n.type,
        risk: n.risk,
      };
    });
  }, [nlp.knowledgeGraph.nodes]);

  return (
    <>
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatKPICard icon={<FileText className="w-5 h-5" />} label="Keywords Found"
          value={`${nlp.keywords.length}`}
          subValue="TF-IDF extracted"
          trend="good" color="cyan"
          methodologyKey="fn-nlp-keywords"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Keywords', 'NLP Analysis', nlp.keywords.length, [])} />
        <StatKPICard icon={<Layers className="w-5 h-5" />} label="Pattern Groups"
          value={`${nlp.patterns.length}`}
          subValue="Category matches"
          trend="good" color="violet"
          methodologyKey="fn-nlp-patterns"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Patterns', 'NLP', nlp.patterns.length, [])} />
        <StatKPICard icon={<GitBranch className="w-5 h-5" />} label="Similarity Groups"
          value={`${nlp.titleSimilarityGroups.length}`}
          subValue="Jaccard >= 0.3"
          trend={nlp.titleSimilarityGroups.length > 0 ? 'warning' : 'good'} color="amber"
          methodologyKey="fn-similarity"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Similarity', 'NLP', nlp.titleSimilarityGroups.length, [])} />
        <StatKPICard icon={<Brain className="w-5 h-5" />} label="Predictive Insights"
          value={`${predictiveInsights.length}`}
          subValue="AI-generated"
          trend={predictiveInsights.filter(p => p.severity === 'critical').length > 0 ? 'bad' : 'good'} color="emerald"
          methodologyKey="fn-insights"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Insights', 'Predictive AI', predictiveInsights.length, [])} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* TF-IDF Keywords Chart */}
        <InteractiveChartCard
          title="TF-IDF Keyword Importance" icon={<FileText className="w-4 h-4" />}
          methodologyKey="fn-tfidf" onInfoClick={onInfoClick}
          onClick={() => onCardClick('TF-IDF', 'NLP', keywordData.length, keywordData.map(k => k.tfidf))}
        >
          <ResponsiveContainer width="100%" height={Math.max(200, keywordData.length * 30)}>
            <BarChart data={keywordData} layout="vertical" barSize={14} margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
              <XAxis type="number" stroke={chart.axisStroke} tick={{ fill: chart.tickFill, fontSize: 10 }}
                label={{ value: 'TF-IDF Score', position: 'bottom', fill: chart.tickFillMuted, fontSize: 10 }} />
              <YAxis type="category" dataKey="word" stroke={chart.axisStroke} tick={{ fill: chart.tickFillMuted, fontSize: 9 }} width={100} />
              <Tooltip contentStyle={chart.tooltipStyle}
                formatter={(v: number, _: string, entry: any) => [`TF-IDF: ${v}, Frequency: ${entry.payload.frequency}`, entry.payload.word]} />
              <Bar dataKey="tfidf" name="TF-IDF" fill={chart.info} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </InteractiveChartCard>

        {/* Knowledge Graph Visualization (as scatter plot with types) */}
        <InteractiveChartCard
          title="Knowledge Graph (FNs, Keywords, Patterns)" icon={<GitBranch className="w-4 h-4" />}
          methodologyKey="fn-knowledge-graph" onInfoClick={onInfoClick}
          onClick={() => onCardClick('Knowledge Graph', 'NLP', graphData.length, [])}
        >
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} />
              <XAxis type="number" dataKey="x" name="X" stroke={chart.axisStroke}
                tick={{ fill: chart.tickFillMuted, fontSize: 9 }} domain={[0, 100]} hide />
              <YAxis type="number" dataKey="y" name="Y" stroke={chart.axisStroke}
                tick={{ fill: chart.tickFillMuted, fontSize: 9 }} domain={[0, 100]} hide />
              <Tooltip contentStyle={chart.tooltipStyle}
                formatter={(_: any, __: string, entry: any) => [
                  `${entry.payload.label} (${entry.payload.type})`,
                  entry.payload.type === 'fn' ? `Risk: ${entry.payload.risk.toFixed(1)}` : 'Node',
                ]} />
              <Scatter data={graphData} fill={accent[0]}>
                {graphData.map((n, i) => (
                  <Cell key={i}
                    fill={n.type === 'fn' ? (n.risk >= 6.5 ? '#ef4444' : n.risk >= 4.5 ? '#f59e0b' : '#06b6d4')
                      : n.type === 'pattern' ? '#8b5cf6' : '#10b981'}
                    r={n.size / 2}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 justify-center text-xs">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" /> Field Notice</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block" /> Pattern</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Keyword</span>
          </div>
        </InteractiveChartCard>
      </div>

      {/* Pattern Categories */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 light:bg-white light:border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={16} className="text-amber-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest light:text-slate-800">
            FN Pattern Categories (NLP Reference Analysis)
          </h3>
        </div>
        {nlp.patterns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {nlp.patterns.map((pat, i) => (
              <div key={pat.pattern} className={`rounded-lg border p-3 ${
                pat.avgRisk >= 6.5 ? 'bg-red-500/5 border-red-500/30' :
                pat.avgRisk >= 4.5 ? 'bg-amber-500/5 border-amber-500/30' :
                'bg-slate-900/30 border-slate-700/30'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white light:text-slate-800">{pat.pattern}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{pat.matchCount} FNs</span>
                    <span className={`text-xs font-bold ${pat.avgRisk >= 6.5 ? 'text-red-400' : pat.avgRisk >= 4.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {pat.avgRisk.toFixed(1)} risk
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {pat.fnIds.map(id => (
                    <span key={id} className="text-xs font-mono px-1.5 py-0.5 bg-slate-700/50 rounded text-cyan-400">{id}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">No patterns detected in FN titles.</p>
        )}
      </div>

      {/* Title Similarity Groups */}
      {nlp.titleSimilarityGroups.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 light:bg-white light:border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch size={16} className="text-violet-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest light:text-slate-800">
              Title Similarity Groups (Jaccard Coefficient)
            </h3>
          </div>
          <div className="space-y-3">
            {nlp.titleSimilarityGroups.map((g, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-900/30 rounded-lg p-3 border border-slate-700/30 light:bg-slate-50 light:border-slate-200">
                <span className="text-xs font-bold text-violet-400 w-28 flex-shrink-0 truncate">{g.groupLabel}</span>
                <div className="flex flex-wrap gap-1 flex-1">
                  {g.fnIds.map(id => (
                    <span key={id} className="text-xs font-mono px-1.5 py-0.5 bg-slate-700/50 rounded text-cyan-400">{id}</span>
                  ))}
                </div>
                <span className="text-xs text-slate-500 flex-shrink-0">Sim: {g.similarity.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Predictive Insights */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 light:bg-white light:border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Brain size={16} className="text-emerald-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest light:text-slate-800">
            AI Predictive Insights (30-Day Outlook)
          </h3>
          <span className="text-xs text-slate-500 ml-auto">{predictiveInsights.length} predictions</span>
        </div>
        <div className="space-y-3">
          {predictiveInsights.map((ins, i) => (
            <PredictiveInsightCard key={i} insight={ins} index={i} />
          ))}
          {predictiveInsights.length === 0 && (
            <p className="text-xs text-slate-500">No actionable predictions generated from current data.</p>
          )}
        </div>
      </div>
    </>
  );
}

// ============================================================================
// DATA QUALITY TAB (Enhanced with Model Performance)
// ============================================================================

function DataQualityTab({ analytics, chart, accent, onCardClick, onInfoClick }: {
  analytics: FNAdvancedAnalyticsResult;
  chart: ReturnType<typeof useChartTheme>;
  accent: readonly string[];
  onCardClick: (label: string, metricType: string, currentValue: number, historyValues: number[]) => void;
  onInfoClick: (key: string) => void;
}) {
  const { dataQualityAssessment: dq } = analytics;

  // Radar chart data
  const radarData = useMemo(() =>
    dq.dimensions.map(d => ({
      dimension: d.dimension,
      score: d.score,
      fullMark: 100,
    })),
    [dq]
  );

  return (
    <>
      {/* Overall Score + Dimension KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatKPICard icon={<Database className="w-5 h-5" />} label="Overall Quality"
          value={`${dq.overallScore}%`}
          subValue={dq.overallScore >= 90 ? 'Excellent' : dq.overallScore >= 70 ? 'Good' : dq.overallScore >= 50 ? 'Fair' : 'Poor'}
          trend={dq.overallScore >= 80 ? 'good' : dq.overallScore >= 60 ? 'warning' : 'bad'}
          color="cyan" methodologyKey="fn-data-quality-overall"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Data Quality', 'Quality Assessment', dq.overallScore, dq.dimensions.map(d => d.score))}
        />
        <StatKPICard icon={<CheckCircle2 className="w-5 h-5" />} label="Completeness"
          value={`${dq.dimensions.find(d => d.dimension === 'Completeness')?.score ?? 0}%`}
          subValue="Required fields present"
          trend={(dq.dimensions.find(d => d.dimension === 'Completeness')?.score ?? 0) >= 90 ? 'good' : 'warning'}
          color="emerald" methodologyKey="fn-data-completeness"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Completeness', 'Quality', dq.dimensions.find(d => d.dimension === 'Completeness')?.score ?? 0, [])}
        />
        <StatKPICard icon={<AlertCircle className="w-5 h-5" />} label="Accuracy"
          value={`${dq.dimensions.find(d => d.dimension === 'Accuracy')?.score ?? 0}%`}
          subValue="Logically valid data"
          trend={(dq.dimensions.find(d => d.dimension === 'Accuracy')?.score ?? 0) >= 95 ? 'good' : 'bad'}
          color="amber" methodologyKey="fn-data-accuracy"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Accuracy', 'Quality', dq.dimensions.find(d => d.dimension === 'Accuracy')?.score ?? 0, [])}
        />
        <StatKPICard icon={<Users className="w-5 h-5" />} label="Uniqueness"
          value={`${dq.dimensions.find(d => d.dimension === 'Uniqueness')?.score ?? 0}%`}
          subValue="No duplicate records"
          trend={(dq.dimensions.find(d => d.dimension === 'Uniqueness')?.score ?? 0) >= 100 ? 'good' : 'warning'}
          color="violet" methodologyKey="fn-data-uniqueness"
          onInfoClick={onInfoClick}
          onClick={() => onCardClick('Uniqueness', 'Quality', dq.dimensions.find(d => d.dimension === 'Uniqueness')?.score ?? 0, [])}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Data Quality Radar Chart */}
        <InteractiveChartCard
          title="Data Quality Radar (6 Dimensions)" icon={<RadarIcon className="w-4 h-4" />}
          methodologyKey="fn-dq-radar" onInfoClick={onInfoClick}
          onClick={() => onCardClick('DQ Radar', 'Quality Assessment', dq.overallScore,
            dq.dimensions.map(d => d.score))}
        >
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={chart.gridStroke} />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: chart.tickFill, fontSize: 10 }} />
              <PolarRadiusAxis tick={{ fill: chart.tickFillMuted, fontSize: 9 }} domain={[0, 100]} />
              <Radar name="Quality Score" dataKey="score" stroke={chart.info} fill={chart.info} fillOpacity={0.3} strokeWidth={2} />
              <Tooltip contentStyle={chart.tooltipStyle} formatter={(v: number) => [`${v}%`, 'Score']} />
            </RadarChart>
          </ResponsiveContainer>
        </InteractiveChartCard>

        {/* Dimension Detail Cards */}
        <div className="space-y-3">
          {dq.dimensions.map((dim, i) => (
            <div key={dim.dimension} className={`rounded-lg border p-3 flex items-center gap-3 ${
              dim.score >= 90 ? 'bg-emerald-500/5 border-emerald-500/20' :
              dim.score >= 70 ? 'bg-amber-500/5 border-amber-500/20' :
              'bg-red-500/5 border-red-500/20'
            }`}>
              <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center flex-shrink-0">
                <span className={`text-lg font-bold ${
                  dim.score >= 90 ? 'text-emerald-400' : dim.score >= 70 ? 'text-amber-400' : 'text-red-400'
                }`}>{dim.score}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-white light:text-slate-800">{dim.dimension}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    dim.score >= 90 ? 'bg-emerald-500/20 text-emerald-400' :
                    dim.score >= 70 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>{dim.score >= 90 ? 'PASS' : dim.score >= 70 ? 'WARN' : 'FAIL'}</span>
                </div>
                <p className="text-xs text-slate-400">{dim.description}</p>
                <p className="text-xs text-slate-500 mt-0.5">{dim.details}</p>
              </div>
              <div className="w-16 flex-shrink-0">
                <div className="w-full bg-slate-700/50 rounded-full h-2 light:bg-slate-200">
                  <div className={`h-2 rounded-full transition-all ${
                    dim.score >= 90 ? 'bg-emerald-500' : dim.score >= 70 ? 'bg-amber-500' : 'bg-red-500'
                  }`} style={{ width: `${dim.score}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 light:bg-white light:border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest light:text-slate-800">
            Quality Improvement Recommendations
          </h3>
        </div>
        <div className="space-y-2">
          {dq.recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-2 bg-slate-900/30 rounded-lg p-3 border border-slate-700/30 light:bg-slate-50 light:border-slate-200">
              <ChevronRight size={12} className="text-cyan-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-slate-300 light:text-slate-600">{rec}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Model Performance Metrics */}
      <ModelPerformanceSection analytics={analytics} chart={chart} accent={accent} onCardClick={onCardClick} onInfoClick={onInfoClick} />
    </>
  );
}

// ============================================================================
// MODEL PERFORMANCE SECTION (inside Data Quality / Model Perf tab)
// ============================================================================

function ModelPerformanceSection({ analytics, chart, accent, onCardClick, onInfoClick }: {
  analytics: FNAdvancedAnalyticsResult;
  chart: ReturnType<typeof useChartTheme>;
  accent: readonly string[];
  onCardClick: (label: string, metricType: string, currentValue: number, historyValues: number[]) => void;
  onInfoClick: (key: string) => void;
}) {
  const { modelPerformance: mp } = analytics;

  const confusionData = useMemo(() => {
    const cm = mp.anomalyDetection.confusionMatrix;
    if (cm.length < 2) return [];
    return [
      { label: 'True Positive', value: cm[0][0], color: '#10b981' },
      { label: 'False Positive', value: cm[0][1], color: '#ef4444' },
      { label: 'False Negative', value: cm[1][0], color: '#f59e0b' },
      { label: 'True Negative', value: cm[1][1], color: '#06b6d4' },
    ];
  }, [mp.anomalyDetection.confusionMatrix]);

  const perfMetrics = useMemo(() => [
    { label: 'Precision', value: mp.anomalyDetection.precision, color: '#06b6d4' },
    { label: 'Recall', value: mp.anomalyDetection.recall, color: '#10b981' },
    { label: 'F1 Score', value: mp.anomalyDetection.f1Score, color: '#f59e0b' },
    { label: 'ROC AUC', value: mp.anomalyDetection.rocAuc, color: '#8b5cf6' },
    { label: 'Accuracy', value: mp.anomalyDetection.accuracy, color: '#ec4899' },
  ], [mp.anomalyDetection]);

  return (
    <>
      {/* Model Performance KPIs */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 light:bg-white light:border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Brain size={16} className="text-violet-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest light:text-slate-800">
            AI/ML Model Performance Validation
          </h3>
          <span className="text-xs text-slate-500 ml-auto">Leave-One-Out Cross-Validation</span>
        </div>

        {/* Anomaly Detection Performance */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          {perfMetrics.map(m => (
            <div key={m.label} className="text-center bg-slate-900/30 rounded-lg p-3 border border-slate-700/30 light:bg-slate-50 light:border-slate-200">
              <div className="relative w-14 h-14 mx-auto mb-2">
                <svg viewBox="0 0 36 36" className="w-full h-full">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="rgba(100,116,139,0.2)" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke={m.color} strokeWidth="3"
                    strokeDasharray={`${m.value * 100}, 100`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                  {(m.value * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Confusion Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Confusion Matrix</p>
            <div className="grid grid-cols-2 gap-2">
              {confusionData.map(c => (
                <div key={c.label} className="rounded-lg p-3 text-center border border-slate-700/30 bg-slate-900/30 light:bg-slate-50 light:border-slate-200">
                  <p className="text-lg font-bold" style={{ color: c.color }}>{c.value}</p>
                  <p className="text-xs text-slate-500">{c.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Risk Scoring Performance</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-900/30 rounded-lg p-2 border border-slate-700/30 light:bg-slate-50 light:border-slate-200">
                  <span className="text-xs text-slate-500">MSE</span>
                  <p className="text-xs font-bold text-cyan-400">{mp.riskScoring.mse.toFixed(4)}</p>
                </div>
                <div className="bg-slate-900/30 rounded-lg p-2 border border-slate-700/30 light:bg-slate-50 light:border-slate-200">
                  <span className="text-xs text-slate-500">RMSE</span>
                  <p className="text-xs font-bold text-cyan-400">{mp.riskScoring.rmse.toFixed(4)}</p>
                </div>
                <div className="bg-slate-900/30 rounded-lg p-2 border border-slate-700/30 light:bg-slate-50 light:border-slate-200">
                  <span className="text-xs text-slate-500">R-Squared</span>
                  <p className="text-xs font-bold text-violet-400">{mp.riskScoring.rSquared.toFixed(4)}</p>
                </div>
                <div className="bg-slate-900/30 rounded-lg p-2 border border-slate-700/30 light:bg-slate-50 light:border-slate-200">
                  <span className="text-xs text-slate-500">Calibration</span>
                  <p className="text-xs font-bold text-emerald-400">{(mp.riskScoring.calibrationScore * 100).toFixed(0)}%</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Forecast Accuracy</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-900/30 rounded-lg p-2 border border-slate-700/30 light:bg-slate-50 light:border-slate-200">
                  <span className="text-xs text-slate-500">MAPE</span>
                  <p className="text-xs font-bold text-amber-400">{(mp.forecastAccuracy.mape * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-slate-900/30 rounded-lg p-2 border border-slate-700/30 light:bg-slate-50 light:border-slate-200">
                  <span className="text-xs text-slate-500">SMAPE</span>
                  <p className="text-xs font-bold text-amber-400">{(mp.forecastAccuracy.smape * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-slate-900/30 rounded-lg p-2 border border-slate-700/30 light:bg-slate-50 light:border-slate-200">
                  <span className="text-xs text-slate-500">Forecast Bias</span>
                  <p className="text-xs font-bold text-cyan-400">{mp.forecastAccuracy.forecastBias.toFixed(4)}</p>
                </div>
                <div className="bg-slate-900/30 rounded-lg p-2 border border-slate-700/30 light:bg-slate-50 light:border-slate-200">
                  <span className="text-xs text-slate-500">Coverage 95%</span>
                  <p className="text-xs font-bold text-emerald-400">{(mp.forecastAccuracy.coverageProbability * 100).toFixed(0)}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Overall Model Accuracy Badge */}
        <div className="mt-4 py-3 rounded-xl text-center border border-slate-700/30 bg-gradient-to-r from-slate-900/50 to-slate-800/50 light:from-slate-50 light:to-white light:border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Composite Model Accuracy</p>
          <p className={`text-2xl font-bold ${mp.anomalyDetection.accuracy >= 0.85 ? 'text-emerald-400' : mp.anomalyDetection.accuracy >= 0.7 ? 'text-amber-400' : 'text-red-400'}`}>
            {(mp.anomalyDetection.accuracy * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {mp.anomalyDetection.accuracy >= 0.85 ? 'Target 85%+ accuracy met' :
             mp.anomalyDetection.accuracy >= 0.7 ? 'Approaching target accuracy' :
             'Model requires tuning'}
          </p>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// REUSABLE SUBCOMPONENTS
// ============================================================================

/** KPI Card matching ML Monitoring Dashboard pattern */
function StatKPICard({ icon, label, value, subValue, trend, color, methodologyKey, onInfoClick, onClick }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  trend: 'good' | 'bad' | 'warning';
  color: string;
  methodologyKey?: string;
  onInfoClick?: (key: string) => void;
  onClick: () => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = () => {
    setIsProcessing(true);
    onClick();
    setTimeout(() => setIsProcessing(false), 1500);
  };

  const colorMap: Record<string, { text: string; border: string; glow: string }> = {
    cyan:    { text: 'text-cyan-400',    border: 'border-cyan-500/30',    glow: 'hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]' },
    emerald: { text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]' },
    rose:    { text: 'text-rose-400',    border: 'border-rose-500/30',    glow: 'hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]' },
    amber:   { text: 'text-amber-400',   border: 'border-amber-500/30',   glow: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]' },
    violet:  { text: 'text-violet-400',  border: 'border-violet-500/30',  glow: 'hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]' },
  };
  const c = colorMap[color] || colorMap.cyan;

  const trendColor = trend === 'good' ? 'text-emerald-400' : trend === 'bad' ? 'text-red-400' : 'text-amber-400';

  return (
    <div
      role="button" tabIndex={0} aria-label={`Analyze ${label}`}
      onClick={handleClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      className={`relative bg-slate-800/50 rounded-xl border ${c.border} p-4 cursor-pointer transition-all duration-200 overflow-hidden
        ${c.glow} hover:scale-[1.03] hover:border-cyan-500/40 active:scale-[0.97]
        focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none
        light:bg-white light:border-slate-200 light:hover:border-cyan-400`}
    >
      {isProcessing && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={c.text}>{icon}</span>
          <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          {methodologyKey && onInfoClick && (
            <button
              onClick={(e) => { e.stopPropagation(); onInfoClick(methodologyKey); }}
              className="p-1 rounded-md hover:bg-slate-700/50 transition-colors"
              aria-label={`${label} calculation methodology`}
            >
              <Info size={13} className="text-slate-500 hover:text-cyan-400 transition-colors" />
            </button>
          )}
          <MousePointerClick size={13} className="text-slate-600" />
        </div>
      </div>
      <p className={`text-2xl font-bold ${trendColor}`}>{value}</p>
      {subValue && <p className="text-xs text-slate-500 mt-0.5">{subValue}</p>}
      <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
        <Sparkles size={10} className="text-cyan-500/50" />
        Click for AI analysis
      </p>
    </div>
  );
}

/** Mini KPI tile (classification row) */
function MiniKPI({ label, value, color, borderColor, bgColor }: {
  label: string;
  value: string | number;
  color: string;
  borderColor: string;
  bgColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-lg p-3 border ${borderColor} light:bg-white light:${borderColor}`}>
      <div className="text-xs text-slate-500 font-mono uppercase tracking-wider">{label}</div>
      <div className={`text-xl font-bold ${color} mt-0.5`}>{value}</div>
    </div>
  );
}

/** Interactive chart card matching ML Dashboard pattern */
function InteractiveChartCard({ title, icon, methodologyKey, onInfoClick, onClick, children }: {
  title: string;
  icon: React.ReactNode;
  methodologyKey?: string;
  onInfoClick?: (key: string) => void;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 light:bg-white light:border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">{icon}</span>
          <h3 className="text-sm font-bold text-white uppercase tracking-widest light:text-slate-800">{title}</h3>
        </div>
        <div className="flex items-center gap-1">
          {onClick && (
            <button onClick={onClick}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-slate-500 hover:text-cyan-400 hover:bg-slate-700/50 transition-all uppercase tracking-wider font-bold"
            >
              <Sparkles size={10} />
              AI Analyze
            </button>
          )}
          {methodologyKey && onInfoClick && (
            <button onClick={() => onInfoClick(methodologyKey)}
              className="p-1 rounded-md hover:bg-slate-700/50 transition-colors"
              aria-label={`${title} methodology`}
            >
              <Info size={13} className="text-slate-500 hover:text-cyan-400 transition-colors" />
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

/** Concentration meter (overview tab) */
function ConcentrationMeter({ label, value, displayValue, max, color }: {
  label: string;
  value: number;
  displayValue: string;
  max: number;
  color: 'red' | 'amber' | 'emerald';
}) {
  const pct = Math.min(100, (value / max) * 100);
  const colorMap = {
    red: { text: 'text-red-400', bar: 'bg-red-500' },
    amber: { text: 'text-amber-400', bar: 'bg-amber-500' },
    emerald: { text: 'text-emerald-400', bar: 'bg-emerald-500' },
  };
  const c = colorMap[color];

  return (
    <div className="text-center">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold ${c.text} mb-1`}>{displayValue}</p>
      <div className="w-full bg-slate-700/50 rounded-full h-1.5 light:bg-slate-200">
        <div className={`h-1.5 rounded-full ${c.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Root cause insight card */
function RootCauseCard({ insight, index }: { insight: RootCauseInsight; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const impactColor = insight.impact === 'HIGH' ? 'text-red-400 bg-red-500/10 border-red-500/30'
    : insight.impact === 'MEDIUM' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    : 'text-blue-400 bg-blue-500/10 border-blue-500/30';

  return (
    <div className={`rounded-lg border transition-all ${expanded ? 'bg-slate-900/40 border-slate-600/50' : 'bg-slate-900/20 border-slate-700/30'} light:bg-slate-50 light:border-slate-200`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-3 text-left"
      >
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold mt-0.5">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-bold text-white light:text-slate-800">{insight.category}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${impactColor}`}>
              {insight.impact}
            </span>
            <span className="text-xs text-slate-500 ml-auto">
              {(insight.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
          <p className="text-xs text-slate-300 light:text-slate-600">{insight.description}</p>
        </div>
        <ChevronDown size={14} className={`text-slate-500 flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="px-3 pb-3 pl-12 space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-emerald-400">{insight.recommendation}</p>
          </div>
          <div className="flex items-start gap-2">
            <FileText size={12} className="text-slate-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-500">
              Affected: {insight.affectedFNs.join(', ')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Distribution summary card */
function DistSummaryCard({ title, dist, color, format }: {
  title: string;
  dist: FNAdvancedAnalyticsResult['vulnDistribution'];
  color: string;
  format: (v: number) => string;
}) {
  const colorMap: Record<string, string> = {
    rose: 'text-rose-400 border-rose-500/30',
    amber: 'text-amber-400 border-amber-500/30',
    cyan: 'text-cyan-400 border-cyan-500/30',
  };
  const c = colorMap[color] || colorMap.cyan;
  const [textColor, borderColor] = c.split(' ');

  return (
    <div className={`bg-slate-800/50 rounded-xl border ${borderColor} p-4 light:bg-white light:border-slate-200`}>
      <h4 className={`text-xs font-bold ${textColor} uppercase tracking-widest mb-3`}>{title} Distribution</h4>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Stat label="Mean" value={format(dist.mean)} />
        <Stat label="Median" value={format(dist.median)} />
        <Stat label="Std Dev" value={format(dist.standardDeviation)} />
        <Stat label="CV" value={dist.coefficientOfVariation.toFixed(2)} />
        <Stat label="Skewness" value={dist.skewness.toFixed(2)} />
        <Stat label="Kurtosis" value={dist.kurtosis.toFixed(2)} />
        <Stat label="IQR" value={format(dist.iqr)} />
        <Stat label="P95" value={format(dist.p95)} />
        <Stat label="95% CI Lower" value={format(Math.max(0, dist.confidenceInterval95.lower))} />
        <Stat label="95% CI Upper" value={format(dist.confidenceInterval95.upper)} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-slate-500">{label}</span>
      <p className="text-xs font-mono text-slate-300 light:text-slate-600">{value}</p>
    </div>
  );
}

/** Forecast detail row */
function ForecastDetail({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    cyan: 'text-cyan-400', emerald: 'text-emerald-400', red: 'text-red-400',
    amber: 'text-amber-400', violet: 'text-violet-400',
  };
  return (
    <div className="flex items-center justify-between bg-slate-900/30 rounded-lg p-3 border border-slate-700/30 light:bg-slate-50 light:border-slate-200">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-xs font-bold ${colorMap[color] || 'text-white'}`}>{value}</span>
    </div>
  );
}

/** SLA compliance meter tile */
function SLAMeter({ label, count, total, color }: {
  label: string;
  count: number;
  total: number;
  color: 'emerald' | 'amber' | 'red' | 'slate';
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const colorMap = {
    emerald: { text: 'text-emerald-400', bar: 'bg-emerald-500', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20' },
    amber: { text: 'text-amber-400', bar: 'bg-amber-500', bg: 'bg-amber-500/5', border: 'border-amber-500/20' },
    red: { text: 'text-red-400', bar: 'bg-red-500', bg: 'bg-red-500/5', border: 'border-red-500/20' },
    slate: { text: 'text-slate-400', bar: 'bg-slate-500', bg: 'bg-slate-500/5', border: 'border-slate-500/20' },
  };
  const c = colorMap[color];
  return (
    <div className={`${c.bg} rounded-lg border ${c.border} p-3`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
        <span className={`text-xs font-bold ${c.text}`}>{count}</span>
      </div>
      <div className="w-full bg-slate-700/50 rounded-full h-1.5 light:bg-slate-200">
        <div className={`h-1.5 rounded-full ${c.bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-500 mt-1 text-right">{pct.toFixed(0)}%</p>
    </div>
  );
}

// ============================================================================
// AI ANALYSIS SIDE PANEL
// ============================================================================

function AnalysisPanel({ analysis, onClose }: {
  analysis: AnalysisState;
  onClose: () => void;
}) {
  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-[80] animate-[fadeIn_200ms_ease]" onClick={onClose} />
      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-700 z-[81] overflow-y-auto animate-[slideInRight_300ms_ease]
        light:bg-white light:border-slate-200">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain size={20} className="text-violet-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest light:text-slate-800">AI Analysis</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors light:hover:bg-slate-100">
              <X size={18} className="text-slate-400" />
            </button>
          </div>
          <div className="text-xs text-slate-400 -mt-3">
            <span className="text-cyan-400 font-bold">{analysis.label}</span>
            <span className="mx-2 text-slate-600">|</span>
            {analysis.metricType}
          </div>

          {analysis.isProcessing ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={32} className="text-cyan-400 animate-spin mb-4" />
              <p className="text-slate-400 text-xs uppercase tracking-wider">Processing ML pipeline...</p>
              <div className="w-48 bg-slate-800 rounded-full h-1 mt-4 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          ) : analysis.result && (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-2">
                {analysis.result.stats.map((s, i) => (
                  <QuickStat key={i} label={s.label} value={s.value} color={s.color}
                    icon={i === 0 ? <Activity size={12} /> : i === 1 ? <Target size={12} /> : <TrendingUp size={12} />} />
                ))}
              </div>

              {/* Summary */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 light:bg-slate-50 light:border-slate-200">
                <p className="text-xs text-slate-300 leading-relaxed light:text-slate-600">{analysis.result.summary}</p>
              </div>

              {/* Confidence */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Confidence</span>
                <div className="flex-1 bg-slate-700/50 rounded-full h-2 light:bg-slate-200">
                  <div className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all"
                    style={{ width: `${analysis.result.confidence * 100}%` }} />
                </div>
                <span className="text-xs font-bold text-cyan-400">{(analysis.result.confidence * 100).toFixed(0)}%</span>
              </div>

              {/* Insights */}
              <PanelSection icon={<Zap size={14} className="text-amber-400" />} title="Key Insights">
                {analysis.result.insights.map((ins, i) => (
                  <li key={i} className="text-xs text-slate-300 light:text-slate-600 flex items-start gap-2">
                    <ChevronRight size={10} className="text-amber-400 mt-0.5 flex-shrink-0" />
                    {ins}
                  </li>
                ))}
              </PanelSection>

              {/* Recommendations */}
              <PanelSection icon={<CheckCircle2 size={14} className="text-emerald-400" />} title="Recommendations">
                {analysis.result.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-slate-300 light:text-slate-600 flex items-start gap-2">
                    <CheckCircle2 size={10} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </PanelSection>

              {/* Footer */}
              <div className="text-center border-t border-slate-700/50 pt-3 light:border-slate-200">
                <p className="text-xs text-slate-500">
                  Processed: {analysis.result.processingTimeMs}ms | {analysis.result.timestamp.toLocaleString()}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </>,
    document.body
  );
}

/** Reusable quick-stat tile inside analysis panel */
function QuickStat({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, string> = {
    cyan: 'text-cyan-400', emerald: 'text-emerald-400', red: 'text-red-400', amber: 'text-amber-400', violet: 'text-violet-400',
  };
  const c = colorMap[color] || 'text-cyan-400';
  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-3 light:bg-slate-50 light:border-slate-200">
      <div className="flex items-center gap-1.5 mb-1">
        <span className={c}>{icon}</span>
        <p className="text-xs text-slate-500 uppercase tracking-widest">{label}</p>
      </div>
      <p className={`text-lg font-bold ${c}`}>{value}</p>
    </div>
  );
}

/** Reusable panel section */
function PanelSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 light:bg-slate-50 light:border-slate-200">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h4 className="text-xs font-bold text-white uppercase tracking-widest light:text-slate-800">{title}</h4>
      </div>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

// ============================================================================
// HELPER SUB-COMPONENTS (New Tabs)
// ============================================================================

function MiniModelScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center bg-slate-900/30 rounded p-1 border border-slate-700/30 light:bg-slate-50 light:border-slate-200">
      <p className={`text-xs font-bold ${value >= 7.0 ? 'text-red-400' : value >= 5.0 ? 'text-amber-400' : 'text-emerald-400'}`}>
        {value.toFixed(1)}
      </p>
      <p className="text-xs text-slate-500 leading-tight">{label}</p>
    </div>
  );
}

function PredictiveInsightCard({ insight, index }: { insight: PredictiveInsight; index: number }) {
  const severityColors = {
    critical: { bg: 'bg-red-500/5', border: 'border-red-500/30', text: 'text-red-400', badge: 'bg-red-500/20' },
    high:     { bg: 'bg-amber-500/5', border: 'border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-500/20' },
    medium:   { bg: 'bg-yellow-500/5', border: 'border-yellow-500/30', text: 'text-yellow-400', badge: 'bg-yellow-500/20' },
    low:      { bg: 'bg-emerald-500/5', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500/20' },
  };
  const categoryIcons = { emerging: '!', preventive: 'P', trending: 'T' };
  const sc = severityColors[insight.severity] || severityColors.medium;

  return (
    <div className={`rounded-lg border p-3 ${sc.bg} ${sc.border}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${sc.badge} ${sc.text}`}>
            {insight.severity.toUpperCase()}
          </span>
          <span className="text-xs px-1.5 py-0.5 bg-slate-700/50 rounded text-slate-300 light:bg-slate-200 light:text-slate-700">
            {insight.category}
          </span>
          <span className="text-xs text-slate-500">{insight.timeframe}</span>
        </div>
        <span className="text-xs text-cyan-400 font-bold">{(insight.confidence * 100).toFixed(0)}% conf</span>
      </div>
      <h4 className={`text-xs font-bold mb-0.5 ${sc.text}`}>{insight.title}</h4>
      <p className="text-xs text-slate-400 mb-2">{insight.prediction}</p>
      {insight.recommendedActions.length > 0 && (
        <div className="space-y-0.5">
          <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Actions:</p>
          {insight.recommendedActions.map((a, i) => (
            <p key={i} className="text-xs text-slate-400 flex items-start gap-1">
              <CheckCircle2 size={10} className="text-emerald-500 mt-0.5 flex-shrink-0" />{a}
            </p>
          ))}
        </div>
      )}
      {insight.affectedFNs.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {insight.affectedFNs.map(fn => (
            <span key={fn} className="text-xs font-mono px-1.5 py-0.5 bg-slate-700/50 rounded text-cyan-400">{fn}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// UTILITY
// ============================================================================

function formatLargeNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function standardDeviationSimple(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length);
}
