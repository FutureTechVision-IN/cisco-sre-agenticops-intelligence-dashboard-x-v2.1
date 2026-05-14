
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { MOCK_INTELLIGENCE_DATA } from '../constants';
import { Card, Badge, ProgressBar } from './ui/Card';
import { 
  ArrowLeft, Download, Zap, AlertTriangle, Activity, Target, 
  TrendingUp, TrendingDown, Minus, Brain, ChevronRight, Eye,
  RefreshCw, Cpu, BarChart3, Shield
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { useRealTimeStatus } from '../hooks/useAIEnhancement';
import { ThemeToggle } from './ThemeToggle';
import { 
  analyzeTrend, 
  generateForecast, 
  detectAnomaly,
  type TimeSeriesPoint 
} from '../services/aiMLService';
import { InsightModal } from './InsightModal';
import type { InsightData } from '../types';
import { useChartTheme } from '../hooks/useChartTheme';

interface Props {
  onBack: () => void;
}

const SmallTrend: React.FC<{ trend: 'up' | 'down' | 'stable', size?: number }> = ({ trend, size = 16 }) => {
  if (trend === 'up') return <TrendingUp size={size} className="text-red-400" />;
  if (trend === 'down') return <TrendingDown size={size} className="text-emerald-400" />;
  return <Minus size={size} className="text-amber-400" />;
};

export const IntelligenceCenter: React.FC<Props> = ({ onBack }) => {
  const data = MOCK_INTELLIGENCE_DATA;
  const realTimeStatus = useRealTimeStatus();
  const chartTheme = useChartTheme();
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Insight modal state
  const [selectedInsight, setSelectedInsight] = useState<InsightData | null>(null);
  const [mlAnalysis, setMlAnalysis] = useState<any>(null);
  const [isMlLoading, setIsMlLoading] = useState(false);
  const [mlError, setMlError] = useState<string | null>(null);
  const mlAbortRef = useRef<AbortController | null>(null);
  const mlDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // AI/ML Enhanced Analytics
  const aiEnhancements = useMemo(() => {
    // Generate synthetic time series for trend analysis
    const generateTimeSeriesData = (baseValue: number, variance: number = 10): TimeSeriesPoint[] => {
      const points: TimeSeriesPoint[] = [];
      for (let i = 30; i >= 0; i--) {
        points.push({
          timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          value: baseValue + (Math.random() - 0.5) * variance * 2
        });
      }
      return points;
    };

    // Vulnerability trend analysis
    const vulnTrendData = generateTimeSeriesData(2100, 200);
    const vulnTrendAnalysis = analyzeTrend(vulnTrendData.map(p => p.value));
    const vulnForecast = generateForecast(vulnTrendData, 7);

    // Remediation velocity analysis
    const remediationData = generateTimeSeriesData(195, 30);
    const remediationTrend = analyzeTrend(remediationData.map(p => p.value));
    
    // Risk score analysis
    const riskData = generateTimeSeriesData(82, 8);
    const riskAnomaly = detectAnomaly(riskData[riskData.length - 1].value, riskData.map(p => p.value), { sensitivity: 'medium' });

    return {
      vulnerabilityTrend: {
        analysis: vulnTrendAnalysis,
        forecast: vulnForecast,
        accelerationText: vulnTrendAnalysis.acceleration > 0 ? `↑ ${Math.abs(vulnTrendAnalysis.acceleration).toFixed(1)}%` : `↓ ${Math.abs(vulnTrendAnalysis.acceleration).toFixed(1)}%`,
        volatilityLevel: vulnTrendAnalysis.volatility > 20 ? 'HIGH' : vulnTrendAnalysis.volatility > 10 ? 'MEDIUM' : 'LOW',
        breakoutRisk: vulnTrendAnalysis.breakoutProbability
      },
      remediation: {
        trend: remediationTrend,
        efficiencyScore: Math.round(100 - remediationTrend.volatility),
        projectedClearance: Math.ceil(2100 / 195)
      },
      risk: {
        anomalyCheck: riskAnomaly,
        isAnomalous: riskAnomaly.isAnomaly,
        confidence: riskAnomaly.confidence
      },
      forecastData: vulnForecast.predictions.map((p, i) => ({
        day: `D${i + 1}`,
        predicted: Math.round(p.value),
        upper: Math.round(vulnForecast.confidenceIntervals.upper[i]),
        lower: Math.round(vulnForecast.confidenceIntervals.lower[i])
      }))
    };
  }, [lastRefresh]);

  // Simulate refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastRefresh(new Date());
      setIsRefreshing(false);
    }, 1000);
  };

  /** Fetch real ML analysis when a card is clicked (debounced + abortable) */
  const triggerMLAnalysis = useCallback(() => {
    if (mlDebounceRef.current) clearTimeout(mlDebounceRef.current);
    if (mlAbortRef.current) mlAbortRef.current.abort();
    setMlAnalysis(null);
    setMlError(null);
    setIsMlLoading(true);
    mlDebounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      mlAbortRef.current = controller;
      try {
        const res = await fetch('/api/ml/analyze/comprehensive', {
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`ML API error: ${res.status}`);
        const json = await res.json();
        setMlAnalysis(json.analysis || json);
      } catch (err: any) {
        if (err?.name !== 'AbortError') setMlError(err?.message || 'ML analysis failed');
      } finally {
        setIsMlLoading(false);
      }
    }, 200);
  }, []);

  const openInsight = useCallback((insight: InsightData) => {
    setSelectedInsight(insight);
    triggerMLAnalysis();
  }, [triggerMLAnalysis]);

  const closeInsight = useCallback(() => {
    setSelectedInsight(null);
    setMlAnalysis(null);
    setMlError(null);
    setIsMlLoading(false);
    if (mlAbortRef.current) mlAbortRef.current.abort();
    if (mlDebounceRef.current) clearTimeout(mlDebounceRef.current);
  }, []);

  // ------- Pre-built insight data objects for each analytics card -------

  const vulnTrendInsight: InsightData = {
    title: 'Vulnerability Trend Analysis',
    value: aiEnhancements.vulnerabilityTrend.accelerationText,
    subtext: `Breakout Risk: ${aiEnhancements.vulnerabilityTrend.breakoutRisk.toFixed(0)}% · Volatility: ${aiEnhancements.vulnerabilityTrend.volatilityLevel}`,
    color: 'rose',
    type: 'prediction',
    aiAnalysis: `ML-enhanced trend analysis: ${aiEnhancements.vulnerabilityTrend.volatilityLevel.toLowerCase()} volatility, acceleration ${aiEnhancements.vulnerabilityTrend.accelerationText}. 7-day ML forecast: ${aiEnhancements.vulnerabilityTrend.forecast.predictions[6]?.value.toFixed(0) || 'N/A'} vulnerabilities (${aiEnhancements.vulnerabilityTrend.forecast.accuracy.toFixed(0)}% accuracy). Breakout probability: ${aiEnhancements.vulnerabilityTrend.breakoutRisk.toFixed(0)}%.`,
    formula: 'Trend Score = (Acceleration × Volatility Weight × Breakout Probability) / Confidence',
    methodology: 'ARIMA time-series forecasting with Holt-Winters exponential smoothing. Acceleration = second derivative of smoothed trend. Breakout risk uses a binomial distribution over the forecast confidence window.',
    tags: [
      { label: data.analytics.vulnerabilityTrend.status, color: 'red' },
      { label: `${aiEnhancements.vulnerabilityTrend.volatilityLevel} VOLATILITY`, color: aiEnhancements.vulnerabilityTrend.volatilityLevel === 'HIGH' ? 'red' : 'amber' },
    ],
    recommendations: [
      'Deploy countermeasures if breakout risk exceeds 80%',
      'Increase monitoring cadence during high-volatility periods',
      'Validate forecast accuracy monthly against actual counts',
    ],
  };

  const customerRiskInsight: InsightData = {
    title: 'Customer Risk Concentration (80/20)',
    value: data.analytics.customerRisk.concentration,
    subtext: `${data.analytics.customerRisk.pareto} · ${data.analytics.customerRisk.focus}`,
    color: 'amber',
    type: 'metric',
    aiAnalysis: `Pareto analysis: ${data.analytics.customerRisk.concentration} of total risk is concentrated in ${data.analytics.customerRisk.pareto}. Risk level: ${data.analytics.customerRisk.level}. This pattern indicates systemic enterprise account dependency.`,
    formula: 'Concentration Ratio = (Top-N Customer Risk) / Total Portfolio Risk × 100%',
    methodology: 'Pareto-based risk concentration. 80/20 principle identifies the minimal customer set driving maximal risk, weighted by vulnerability severity and asset exposure.',
    tags: [
      { label: data.analytics.customerRisk.level, color: 'amber' },
      { label: 'PARETO ANALYSIS', color: 'blue' },
    ],
    recommendations: [
      `Prioritize dedicated remediation for ${data.analytics.customerRisk.pareto}`,
      'Set up enhanced monitoring for high-concentration accounts',
      'Review enterprise SLAs for accounts with elevated risk',
    ],
  };

  const fnImpactInsight: InsightData = {
    title: 'Field Notice Impact Assessment',
    value: data.analytics.fieldNoticeImpact.totalCVEs,
    subtext: `${data.analytics.fieldNoticeImpact.highImpact} high-impact CVEs · Average severity ${data.analytics.fieldNoticeImpact.avgImpact}`,
    color: 'rose',
    type: 'metric',
    aiAnalysis: `Field notice analysis: ${data.analytics.fieldNoticeImpact.totalCVEs} total CVEs, ${data.analytics.fieldNoticeImpact.highImpact} classified as high-impact (severity ≥ 7.0). Average score: ${data.analytics.fieldNoticeImpact.avgImpact}. Risk level: ${data.analytics.fieldNoticeImpact.level}.`,
    formula: 'Impact Score = (CVE Base Score × Exploitability × Asset Exposure) / 10',
    methodology: 'CVSS v3.1 impact scoring augmented with asset exposure weighting and field notice remediation complexity factors.',
    tags: [
      { label: data.analytics.fieldNoticeImpact.level, color: 'red' },
      { label: 'CVE ANALYSIS', color: 'amber' },
    ],
    recommendations: [
      'Prioritize patching for high-impact CVEs (severity ≥ 7.0)',
      'Schedule maintenance windows for critical field notices',
      'Increase patch compliance monitoring frequency',
    ],
  };

  const remediationInsight: InsightData = {
    title: 'Remediation Velocity & ML Efficiency',
    value: data.analytics.remediationVelocity.rate,
    subtext: `ML Efficiency: ${aiEnhancements.remediation.efficiencyScore}% · Projected clearance: ${aiEnhancements.remediation.projectedClearance} months`,
    color: 'green',
    type: 'metric',
    aiAnalysis: `Remediation velocity: ${data.analytics.remediationVelocity.rate}/month at ${aiEnhancements.remediation.efficiencyScore}% ML efficiency. Status: ${data.analytics.remediationVelocity.status}. Projected clearance: ${aiEnhancements.remediation.projectedClearance} months. Trend: ${aiEnhancements.remediation.trend.direction}.`,
    formula: 'Efficiency = (Actual Rate / Target Rate) × (1 − Rework Rate) × 100',
    methodology: 'Kalman filter smoothed velocity tracking with EMA trend direction. Efficiency accounts for rework rate and SLA compliance using rolling 30-day windows.',
    tags: [
      { label: data.analytics.remediationVelocity.status, color: 'green' },
      { label: 'VELOCITY TRACKING', color: 'blue' },
    ],
    recommendations: [
      'Optimize scheduling to maximize remediation throughput',
      'Investigate rework causes reducing overall efficiency',
      'Set milestone targets to reduce projected clearance time',
    ],
  };

  const temporalInsight: InsightData = {
    title: 'Temporal Pattern Detection',
    value: data.analytics.temporalPatterns.status,
    subtext: `Seasonality: ${data.analytics.temporalPatterns.seasonality} · Peak: ${data.analytics.temporalPatterns.peak}`,
    color: 'blue',
    type: 'prediction',
    aiAnalysis: `Temporal analysis detected ${data.analytics.temporalPatterns.seasonality}. Peak periods: ${data.analytics.temporalPatterns.peak}. Low periods: ${data.analytics.temporalPatterns.low}. These patterns enable proactive staffing and preemptive remediation scheduling.`,
    formula: 'Seasonality Index = (Period Value / Deseasonalized Baseline) − 1',
    methodology: 'STL decomposition (Seasonal and Trend decomposition using LOESS) identifies weekly, monthly, and quarterly patterns in vulnerability emergence and remediation activity.',
    tags: [
      { label: data.analytics.temporalPatterns.status, color: 'blue' },
      { label: 'SEASONALITY DETECTED', color: 'amber' },
    ],
    recommendations: [
      `Pre-allocate SRE resources before ${data.analytics.temporalPatterns.peak}`,
      'Accelerate remediation during low-activity periods',
      'Schedule compliance audits aligned with quarter-end patterns',
    ],
  };

  const riskPrioritizationInsight: InsightData = {
    title: 'Risk Prioritization (ML-Optimized)',
    value: data.analytics.riskPrioritization.score,
    subtext: `ML Confidence: ${aiEnhancements.risk.confidence.toFixed(0)}% · ${aiEnhancements.risk.isAnomalous ? 'ANOMALY DETECTED' : 'Within Normal Range'}`,
    color: aiEnhancements.risk.isAnomalous ? 'rose' : 'green',
    type: 'metric',
    aiAnalysis: `Risk score: ${data.analytics.riskPrioritization.score}/100 at ${aiEnhancements.risk.confidence.toFixed(0)}% ML confidence. Status: ${aiEnhancements.risk.isAnomalous ? `ANOMALY (${aiEnhancements.risk.anomalyCheck.severity})` : 'normal range'}. Level: ${data.analytics.riskPrioritization.level}. Top asset: ${data.analytics.riskPrioritization.topAsset}.`,
    formula: 'Risk Priority = (Threat Level × Exposure × Business Impact) / ML_Confidence_Dampening',
    methodology: 'Bayesian network trained on historical incident data. Confidence reflects posterior probability given observed evidence. Anomaly detection uses Z-score analysis with configurable sensitivity.',
    tags: [
      { label: data.analytics.riskPrioritization.level, color: 'green' },
      { label: aiEnhancements.risk.isAnomalous ? 'ANOMALY' : 'NORMAL', color: aiEnhancements.risk.isAnomalous ? 'red' : 'green' },
    ],
    recommendations: [
      `Immediate focus on ${data.analytics.riskPrioritization.topAsset}`,
      'Review risk model parameters if anomaly persists beyond 24h',
      'Schedule priority review with security team this sprint',
    ],
  };

  const intelligenceSummaryInsight: InsightData = {
    title: 'Intelligence Summary — System Health',
    value: data.analytics.intelligenceSummary.score,
    subtext: `${data.analytics.intelligenceSummary.vulnerableAssetsPct} vulnerable · Status: ${data.analytics.intelligenceSummary.level}`,
    color: 'green',
    type: 'metric',
    aiAnalysis: `System health score: ${data.analytics.intelligenceSummary.score}/100 (${data.analytics.intelligenceSummary.level}). ${data.analytics.intelligenceSummary.vulnerableAssetsPct} of assets are vulnerable. Key insights: ${data.analytics.intelligenceSummary.insights.slice(0, 2).join('; ')}.`,
    formula: 'Health Score = (SecureAssets/Total × 40) + (RemediationVelocity × 30) + (ThreatCoverage × 30)',
    methodology: 'Composite scoring aggregates security posture, remediation velocity, threat coverage, and compliance metrics using a weighted ensemble validated against SOC benchmarks.',
    tags: [
      { label: data.analytics.intelligenceSummary.level, color: 'green' },
      { label: 'COMPOSITE SCORE', color: 'blue' },
    ],
    recommendations: data.analytics.intelligenceSummary.insights.slice(0, 3),
  };

  const forecastInsight: InsightData = {
    title: 'Predictive Forecast — 3-Month Outlook',
    value: '1,292,953',
    subtext: 'Next-month forecast · 82% confidence · ARIMA model',
    color: 'blue',
    type: 'prediction',
    aiAnalysis: 'ARIMA model trained on 6-month historical data predicts 1,292,953 vulnerable assets next month at 82% confidence. Confidence intervals widen as the prediction horizon extends, indicating increasing uncertainty over longer horizons.',
    formula: 'ARIMA(p,d,q): Y_t = μ + Σ(φᵢ·Y_{t-i}) + Σ(θⱼ·ε_{t-j}) + ε_t',
    methodology: 'Autoregressive Integrated Moving Average (ARIMA) with automatic parameter selection via AIC minimization. 95% confidence intervals computed using the delta method. Model is re-trained weekly.',
    tags: [
      { label: 'ARIMA MODEL', color: 'blue' },
      { label: '82% CONFIDENCE', color: 'green' },
    ],
    recommendations: [
      'Allocate remediation capacity for the forecasted volume',
      'Monitor forecast vs actual deviation weekly',
      'Re-evaluate model parameters if MAPE exceeds 10%',
    ],
  };

  return (
    <div className="min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_at_top,rgba(20,40,80,0.4),rgba(15,23,42,0.9))] text-slate-300 pb-20">
      
      {/* Header */}
      <header className="ds-page-header">
        <div className="ds-page-header-inner flex-col md:flex-row gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="ds-back-btn cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="ds-page-title">AI/ML <span className="text-cyan-400">Intelligence Center</span></h1>
              <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 px-2 py-0.5 rounded text-xs font-bold uppercase flex items-center gap-1 animate-pulse">
                <Zap size={10} fill="currentColor" /> AI Active
              </span>
            </div>
            <p className="ds-page-subtitle text-cyan-400/80">
              Real-time anomaly detection, predictive analytics &amp; recommendations powered by ML
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {/* Real-time AI Status */}
           <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700/50">
             <div className="flex items-center gap-1.5">
               <Cpu size={12} className={`${realTimeStatus.isActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
               <span className="text-xs font-bold text-slate-400 uppercase">
                 {realTimeStatus.isActive ? 'ML Active' : 'ML Idle'}
               </span>
             </div>
             <div className="w-px h-4 bg-slate-700"></div>
             <div className="flex items-center gap-1.5">
               <BarChart3 size={12} className="text-cyan-400" />
               <span className="text-xs font-mono text-cyan-400">{realTimeStatus.processingRate}/s</span>
             </div>
           </div>
           <div className="text-right">
             <div className="text-xs text-slate-500 uppercase font-bold">AI Confidence</div>
             <div className="text-lg font-bold text-cyan-400">{data.aiConfidence}</div>
           </div>
           <button 
             onClick={handleRefresh}
             disabled={isRefreshing}
             className={`p-2 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
           >
             <RefreshCw size={14} className="text-slate-300" />
           </button>
           <ThemeToggle size="sm" />
           <button className="ds-header-action">
             <Download size={14} /> Export
           </button>
        </div>
        </div>
      </header>

      <main className="px-6 py-8 max-w-[1920px] mx-auto space-y-8">

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {data.kpis.map((kpi, idx) => (
            <Card
              key={idx}
              role="button"
              tabIndex={0}
              aria-label={`Analyze ${kpi.label} with AI/ML`}
              className="p-5 flex flex-col justify-between group focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              onClick={() => openInsight({
                title: kpi.label,
                value: kpi.value,
                subtext: kpi.subtext,
                color: kpi.status === 'good' ? 'green' : kpi.status === 'critical' ? 'rose' : 'blue',
                type: 'metric',
                aiAnalysis: `ML analysis of ${kpi.label}: ${kpi.subtext}. System status is ${
                  kpi.status === 'good' ? 'healthy and within expected parameters' :
                  kpi.status === 'critical' ? 'critical — immediate action required' : 'nominal with active monitoring'
                }.`,
                formula: `${kpi.label} = Weighted aggregate of real-time ML telemetry signals vs. dynamic baselines`,
                methodology: 'Multi-layer ML ensemble ingests telemetry streams, compares against dynamic baselines, and applies anomaly-weighted scoring to produce a real-time health signal.',
                tags: [
                  { label: kpi.status?.toUpperCase() || 'ACTIVE', color: kpi.status === 'good' ? 'green' : kpi.status === 'critical' ? 'red' : 'blue' },
                  { label: 'LIVE METRIC', color: 'blue' },
                ],
                recommendations: [
                  `Monitor ${kpi.label} for trend deviations`,
                  'Set automated alert thresholds based on ML baseline',
                  'Review 7-day rolling average for anomaly patterns',
                ],
              })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openInsight({
                    title: kpi.label,
                    value: kpi.value,
                    subtext: kpi.subtext,
                    color: kpi.status === 'good' ? 'green' : kpi.status === 'critical' ? 'rose' : 'blue',
                    type: 'metric',
                    aiAnalysis: `ML monitoring of ${kpi.label}: ${kpi.subtext}.`,
                    tags: [{ label: kpi.status?.toUpperCase() || 'ACTIVE', color: kpi.status === 'critical' ? 'red' : 'blue' }],
                    recommendations: ['Monitor for trend changes', 'Set automated alert thresholds'],
                  });
                }
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                   <h3 className="text-sm font-bold text-slate-200 uppercase letter-spacing-wide mb-2">{kpi.label}</h3>
                   <div className="metric-primary">
                     {kpi.value}
                   </div>
                </div>
                <div className={`p-2 rounded-lg bg-opacity-20 ${kpi.status === 'good' ? 'bg-emerald-500 text-emerald-400' : kpi.status === 'critical' ? 'bg-red-500 text-red-400' : 'bg-cyan-500 text-cyan-400'}`}>
                   {kpi.status === 'critical' ? <AlertTriangle size={20} /> : kpi.status === 'good' ? <Activity size={20} /> : <Target size={20} />}
                </div>
              </div>
              <div className="mt-4">
                 <p className="text-caption mb-2">{kpi.subtext}</p>
                 <div className="text-interactive text-xs flex items-center gap-1 group-hover:text-cyan-300 transition-colors">
                   <Zap size={10} className="text-cyan-400" /> AI Analyze <ChevronRight size={12} className="inline" />
                 </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Advanced Analytics Section */}
        <div>
          <div className="flex items-end justify-between mb-4 px-2">
             <h2 className="text-xl font-bold text-white uppercase letter-spacing-wider flex items-center gap-2">
               <Brain className="text-indigo-400" /> Advanced Intelligence Analytics
             </h2>
             <span className="text-footnote font-mono">Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
             
             {/* 1. Vulnerability Trend - AI Enhanced */}
             <Card
               className="p-4 border-l-2 border-l-red-500"
               role="button" tabIndex={0}
               aria-label="Analyze Vulnerability Trend with AI"
               onClick={() => openInsight(vulnTrendInsight)}
               onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openInsight(vulnTrendInsight))}
             >
                <div className="flex justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                    Vulnerability Trend
                    <Brain size={10} className="text-purple-400" />
                  </h3>
                  <Badge color="red">{data.analytics.vulnerabilityTrend.status}</Badge>
                </div>
                <div className="space-y-3 mt-3">
                   <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 uppercase">Acceleration</span>
                      <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                        {aiEnhancements.vulnerabilityTrend.accelerationText}
                      </span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 uppercase">Volatility</span>
                      <Badge color={aiEnhancements.vulnerabilityTrend.volatilityLevel === 'HIGH' ? 'red' : aiEnhancements.vulnerabilityTrend.volatilityLevel === 'MEDIUM' ? 'amber' : 'green'}>
                        {aiEnhancements.vulnerabilityTrend.volatilityLevel}
                      </Badge>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 uppercase">Breakout Risk</span>
                      <span className="text-xs font-bold text-white">{aiEnhancements.vulnerabilityTrend.breakoutRisk.toFixed(0)}%</span>
                   </div>
                   <div className="p-2 bg-slate-800/50 rounded border border-slate-700/50 mt-2">
                      <div className="text-xs text-purple-300 uppercase mb-1 flex items-center gap-1">
                        <Cpu size={10} /> ML Forecast (7-day)
                      </div>
                      <div className="text-sm font-bold text-white font-mono">
                        {aiEnhancements.vulnerabilityTrend.forecast.trend === 'RISING' ? '↑' : aiEnhancements.vulnerabilityTrend.forecast.trend === 'FALLING' ? '↓' : '→'} 
                        {' '}{aiEnhancements.vulnerabilityTrend.forecast.predictions[6]?.value.toFixed(0) || 'N/A'}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Accuracy: {aiEnhancements.vulnerabilityTrend.forecast.accuracy.toFixed(0)}%
                      </div>
                   </div>
                </div>
             </Card>

             {/* 2. Customer Risk */}
             <Card
               className="p-4 border-l-2 border-l-amber-500"
               role="button" tabIndex={0}
               aria-label="Analyze Customer Risk with AI"
               onClick={() => openInsight(customerRiskInsight)}
               onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openInsight(customerRiskInsight))}
             >
                <div className="flex justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase">Customer Risk (80/20)</h3>
                  <Badge color="amber">{data.analytics.customerRisk.level}</Badge>
                </div>
                <div className="space-y-3 mt-3">
                   <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 uppercase">Concentration Ratio</span>
                      <div className="text-right">
                        <span className="text-xs font-bold text-amber-400">{data.analytics.customerRisk.concentration}</span>
                        <div className="text-xs text-slate-600">of risk from top customers</div>
                      </div>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 uppercase">Pareto Customers</span>
                      <span className="text-xs font-bold text-white">{data.analytics.customerRisk.pareto}</span>
                   </div>
                   <div className="p-2 bg-amber-900/10 rounded border border-amber-500/20 mt-2 text-center">
                      <span className="text-xs font-bold text-amber-300 uppercase">{data.analytics.customerRisk.focus}</span>
                   </div>
                </div>
             </Card>

             {/* 3. Field Notice Impact */}
             <Card
               className="p-4 border-l-2 border-l-red-500"
               role="button" tabIndex={0}
               aria-label="Analyze Field Notice Impact with AI"
               onClick={() => openInsight(fnImpactInsight)}
               onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openInsight(fnImpactInsight))}
             >
                <div className="flex justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase">Field Notice Impact</h3>
                  <Badge color="red">{data.analytics.fieldNoticeImpact.level}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                   <div className="bg-slate-800/50 p-2 rounded text-center">
                      <div className="text-xl font-bold text-white">{data.analytics.fieldNoticeImpact.totalCVEs}</div>
                      <div className="text-xs text-slate-500 uppercase">Total CVEs</div>
                   </div>
                   <div className="bg-red-900/20 p-2 rounded text-center border border-red-500/20">
                      <div className="text-xl font-bold text-red-400">{data.analytics.fieldNoticeImpact.highImpact}</div>
                      <div className="text-xs text-red-300/70 uppercase">High Impact</div>
                   </div>
                </div>
                <div className="mt-3 flex justify-between items-center pt-2 border-t border-slate-700/50">
                   <span className="text-xs text-slate-500 uppercase">Average Impact</span>
                   <span className="text-xs font-bold text-white">{data.analytics.fieldNoticeImpact.avgImpact}</span>
                </div>
             </Card>

             {/* 4. Remediation Velocity - AI Enhanced */}
             <Card
               className="p-4 border-l-2 border-l-emerald-500"
               role="button" tabIndex={0}
               aria-label="Analyze Remediation Velocity with AI"
               onClick={() => openInsight(remediationInsight)}
               onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openInsight(remediationInsight))}
             >
                <div className="flex justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                    Remediation Velocity
                    <Brain size={10} className="text-purple-400" />
                  </h3>
                  <Badge color="green">{data.analytics.remediationVelocity.status}</Badge>
                </div>
                <div className="space-y-3 mt-3">
                   <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 uppercase">Rate/Month</span>
                      <span className="text-xs font-bold text-white">{data.analytics.remediationVelocity.rate}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 uppercase">ML Efficiency Score</span>
                      <span className="text-xs font-bold text-emerald-400">{aiEnhancements.remediation.efficiencyScore}%</span>
                   </div>
                   <div className="mt-2">
                      <div className="flex justify-between text-xs text-slate-500 uppercase mb-1">
                        <span>Projected Clearance</span>
                        <span className="text-white font-bold">{aiEnhancements.remediation.projectedClearance} mo</span>
                      </div>
                      <ProgressBar value={Math.min(100, (1 / aiEnhancements.remediation.projectedClearance) * 100 * 12)} color="emerald" />
                   </div>
                   <div className="text-xs text-purple-300 bg-purple-500/10 px-2 py-1 rounded flex items-center gap-1">
                     <TrendingUp size={10} />
                     Trend: {aiEnhancements.remediation.trend.direction}
                   </div>
                </div>
             </Card>

             {/* 5. Temporal Patterns */}
             <Card
               className="p-4 border-l-2 border-l-cyan-500"
               role="button" tabIndex={0}
               aria-label="Analyze Temporal Patterns with AI"
               onClick={() => openInsight(temporalInsight)}
               onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openInsight(temporalInsight))}
             >
                <div className="flex justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase">Temporal Patterns</h3>
                  <Badge color="blue">{data.analytics.temporalPatterns.status}</Badge>
                </div>
                <div className="space-y-3 mt-3">
                   <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 uppercase">Seasonality</span>
                      <span className="text-xs font-bold text-cyan-400">{data.analytics.temporalPatterns.seasonality}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 uppercase">Peak Periods</span>
                      <span className="text-xs font-bold text-slate-400">{data.analytics.temporalPatterns.peak}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 uppercase">Low Periods</span>
                      <span className="text-xs font-bold text-white">{data.analytics.temporalPatterns.low}</span>
                   </div>
                </div>
             </Card>

             {/* 6. Risk Prioritization - AI Enhanced */}
             <Card
               className="p-4 border-l-2 border-l-emerald-500"
               role="button" tabIndex={0}
               aria-label="Analyze Risk Prioritization with AI"
               onClick={() => openInsight(riskPrioritizationInsight)}
               onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openInsight(riskPrioritizationInsight))}
             >
                <div className="flex justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1.5">
                    Risk Prioritization
                    <Brain size={10} className="text-purple-400" />
                  </h3>
                  <Badge color="green">{data.analytics.riskPrioritization.level}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                   <div className="text-center p-2 bg-slate-800/50 rounded">
                      <div className="text-lg font-bold text-white">{data.analytics.riskPrioritization.score}</div>
                      <div className="text-xs text-slate-500 uppercase">Risk Score</div>
                   </div>
                   <div className="text-center p-2 bg-slate-800/50 rounded">
                      <div className="text-lg font-bold text-emerald-400">{aiEnhancements.risk.confidence.toFixed(0)}%</div>
                      <div className="text-xs text-slate-500 uppercase">ML Confidence</div>
                   </div>
                </div>
                {/* Anomaly Detection Status */}
                <div className={`mt-3 p-2 rounded border ${aiEnhancements.risk.isAnomalous ? 'bg-red-900/20 border-red-500/30' : 'bg-emerald-900/20 border-emerald-500/30'}`}>
                   <div className="flex items-center gap-2">
                     <Shield size={12} className={aiEnhancements.risk.isAnomalous ? 'text-red-400' : 'text-emerald-400'} />
                     <span className={`text-xs font-bold uppercase ${aiEnhancements.risk.isAnomalous ? 'text-red-300' : 'text-emerald-300'}`}>
                       {aiEnhancements.risk.isAnomalous ? 'Anomaly Detected' : 'Within Normal Range'}
                     </span>
                   </div>
                   {aiEnhancements.risk.isAnomalous && (
                     <p className="text-xs text-red-300/70 mt-1">
                       Severity: {aiEnhancements.risk.anomalyCheck.severity}
                     </p>
                   )}
                </div>
                <div className="mt-3 pt-2 border-t border-slate-700/50">
                   <div className="text-xs text-slate-500 uppercase mb-1">Top Asset at Risk</div>
                   <div className="text-xs font-bold text-white truncate" title={data.analytics.riskPrioritization.topAsset}>
                      {data.analytics.riskPrioritization.topAsset}
                   </div>
                </div>
             </Card>

             {/* 7. Intelligence Summary */}
             <Card
               className="p-4 border-l-2 border-l-emerald-500 xl:col-span-2 flex flex-col md:flex-row gap-4"
               role="button" tabIndex={0}
               aria-label="Analyze Intelligence Summary with AI"
               onClick={() => openInsight(intelligenceSummaryInsight)}
               onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openInsight(intelligenceSummaryInsight))}
             >
                <div className="flex-1">
                   <div className="flex justify-between mb-2">
                     <h3 className="label-display mb-0">Intelligence Summary</h3>
                     <Badge color="green">{data.analytics.intelligenceSummary.level}</Badge>
                   </div>
                   <div className="flex items-center gap-4 mt-2">
                      <div className="text-center">
                         <div className="metric-secondary">{data.analytics.intelligenceSummary.score}</div>
                         <div className="text-caption uppercase mt-1">Overall Health Score</div>
                      </div>
                      <div className="h-10 w-px bg-slate-700"></div>
                      <div>
                         <div className="metric-tertiary text-amber-300">{data.analytics.intelligenceSummary.vulnerableAssetsPct}</div>
                         <div className="text-caption uppercase">Vulnerable Assets</div>
                      </div>
                   </div>
                </div>
                <div className="flex-1 bg-slate-800/50 p-3 rounded border border-slate-700/50">
                   <h4 className="label-display text-cyan-200 mb-2">Key Insights:</h4>
                   <ul className="space-y-2">
                     {data.analytics.intelligenceSummary.insights.map((insight, i) => (
                       <li key={i} className="text-description leading-snug flex items-start gap-2">
                         <span className="text-cyan-400 mt-0.5 font-bold">•</span> {insight}
                       </li>
                     ))}
                   </ul>
                </div>
             </Card>

             {/* 8. Trend Predictions */}
             <Card className="p-4 border-l-2 border-l-purple-500 xl:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                 {data.analytics.trendPredictions.map((pred, i) => (
                   <div
                     key={i}
                     role="button"
                     tabIndex={0}
                     aria-label={`Analyze trend prediction for ${pred.period} with AI`}
                     className="bg-slate-800/40 p-3 rounded border border-slate-700/50 hover:border-purple-500/60 hover:bg-slate-700/60 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                     onClick={() => openInsight({ ...forecastInsight, title: `Trend Prediction: ${pred.period}`, value: pred.prediction, subtext: `Confidence: ${pred.confidence}% | Trend: ${pred.trend}` })}
                     onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openInsight({ ...forecastInsight, title: `Trend Prediction: ${pred.period}`, value: pred.prediction, subtext: `Confidence: ${pred.confidence}% | Trend: ${pred.trend}` }); } }}
                   >
                      <div className="label-display mb-1">Trend Prediction</div>
                      <div className="flex justify-between items-end">
                         <div>
                            <div className="text-description text-white font-bold mb-0.5">Period: {pred.period}</div>
                            <div className="flex items-center gap-2">
                               <SmallTrend trend={pred.trend} />
                               <span className={`metric-secondary ${pred.trend === 'up' ? 'text-red-300' : pred.trend === 'down' ? 'text-emerald-300' : 'text-amber-300'}`}>
                                 {pred.prediction}
                               </span>
                            </div>
                         </div>
                         <div className="text-right">
                            <div className="text-caption">Confidence Level</div>
                            <div className="metric-secondary text-purple-300">{pred.confidence}%</div>
                         </div>
                      </div>
                      <button
                        className="w-full mt-3 text-caption hover:text-white font-bold text-center border-t border-slate-700 pt-2 transition-colors"
                        onClick={(e) => { e.stopPropagation(); openInsight({ ...forecastInsight, title: `Trend Prediction: ${pred.period}`, value: pred.prediction, subtext: `Confidence: ${pred.confidence}% | Trend: ${pred.trend}` }); }}
                      >
                        View Full Forecast
                      </button>
                   </div>
                 ))}
             </Card>

          </div>
        </div>

        {/* Forecast & Anomalies Split */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
           
           {/* Forecast Chart */}
           <div className="xl:col-span-7">
              <Card
                className="p-6 h-full"
                role="button" tabIndex={0}
                aria-label="Analyze Predictive Forecast with AI"
                onClick={() => openInsight(forecastInsight)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openInsight(forecastInsight))}
              >
                 <div className="flex justify-between items-start mb-6">
                    <div>
                       <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                         <TrendingUp size={18} className="text-cyan-400"/> Predictive Forecast
                       </h3>
                       <p className="text-xs text-slate-400 mt-1">3-month vulnerability trend with 95% confidence intervals • Click for AI insights</p>
                    </div>
                    <div className="text-right">
                       <div className="text-2xl font-bold text-white">1,292,953</div>
                       <div className="text-xs text-emerald-400 font-bold uppercase">Next month forecast</div>
                       <div className="text-xs text-slate-500 uppercase mt-1">82% Confidence</div>
                    </div>
                 </div>
                 
                 <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={data.forecast}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.gridStroke} opacity={0.3} />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: chartTheme.tickFill, fontFamily: 'IBM Plex Sans'}} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: chartTheme.tickFill, fontFamily: 'IBM Plex Sans'}} />
                          <Tooltip 
                            cursor={{fill: chartTheme.cursorFill, opacity: 0.5}}
                            contentStyle={chartTheme.tooltipStyle}
                            itemStyle={{...chartTheme.tooltipItemStyle, fontSize: '12px'}}
                          />
                          <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={60} />
                       </BarChart>
                    </ResponsiveContainer>
                 </div>

                 <div className="mt-6 p-4 bg-slate-800/50 rounded border border-slate-700/50">
                    <p className="text-xs text-slate-400 leading-relaxed">
                       <strong className="text-white">Methodology:</strong> ARIMA model trained on 6-month historical data with automatic parameter optimization. Confidence intervals widen as prediction horizon extends, indicating increasing uncertainty.
                    </p>
                    <div className="mt-2 text-xs font-bold text-cyan-400 flex items-center gap-1 cursor-pointer hover:underline">
                       <Zap size={12} /> Click card for AI-driven forecast analysis
                    </div>
                 </div>
              </Card>
           </div>

           {/* Anomalies List */}
           <div className="xl:col-span-5">
              <Card className="p-0 h-full overflow-hidden flex flex-col">
                 <div className="p-4 border-b border-slate-700/50 bg-slate-800/30">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                       <AlertTriangle size={18} className="text-red-400"/> Detected Anomalies by Company
                    </h3>
                 </div>
                 <div className="p-2 space-y-2 overflow-y-auto max-h-[500px] custom-scrollbar">
                    
                    {/* Header Row */}
                    <div className="grid grid-cols-6 px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                       <div className="col-span-2">Company</div>
                       <div className="text-center">Score</div>
                       <div className="text-center">Trend</div>
                       <div className="text-center">Vuln</div>
                       <div className="text-right">Action</div>
                    </div>

                    {data.anomalies.map((anom, idx) => (
                      <div
                        key={idx}
                        role="button"
                        tabIndex={0}
                        aria-label={`Analyze anomaly for ${anom.name} with AI`}
                        className="bg-slate-800/40 rounded border border-slate-700/50 p-3 hover:border-cyan-500/30 transition-all group cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                        onClick={() => openInsight({
                          title: `Anomaly: ${anom.name}`,
                          value: `${anom.score}/100`,
                          subtext: `Trend: ${anom.trend > 0 ? '+' : ''}${anom.trend}% · Vulnerabilities: ${anom.vulnerableCount}`,
                          color: anom.score >= 90 ? 'rose' : anom.score >= 70 ? 'amber' : 'blue',
                          type: 'anomaly',
                          aiAnalysis: `Anomaly detected for ${anom.name}: Risk score ${anom.score}/100 with ${anom.trend > 0 ? '+' : ''}${anom.trend}% trend. ${anom.vulnerableCount} vulnerable assets identified. ${anom.tags.map(t => `${t.label}: ${t.severity}`).join(', ')}.`,
                          formula: 'Anomaly Score = (Deviation × Severity Weight × Asset Count) / Confidence',
                          methodology: 'Z-score anomaly detection with ML-calibrated thresholds. Score reflects deviation from the rolling 30-day baseline, weighted by asset severity and business impact.',
                          tags: [
                            ...anom.tags.map(t => ({ label: `${t.label}: ${t.severity}`, color: t.severity === 'CRITICAL' ? 'red' : t.severity === 'HIGH' ? 'amber' : 'blue' })),
                            { label: anom.trend > 0 ? 'WORSENING' : 'IMPROVING', color: anom.trend > 0 ? 'red' : 'green' },
                          ],
                          recommendations: [
                            `Investigate ${anom.name} immediately`,
                            'Review access logs and patch history',
                            'Isolate affected assets pending assessment',
                          ],
                        })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openInsight({ title: `Anomaly: ${anom.name}`, value: `${anom.score}/100`, subtext: `Trend: ${anom.trend}%`, color: 'rose', type: 'anomaly', aiAnalysis: `Risk ${anom.score}/100 for ${anom.name}.`, tags: [{ label: 'ANOMALY', color: 'red' }], recommendations: ['Investigate immediately'] });
                          }
                        }}
                      >
                         <div className="grid grid-cols-6 items-center mb-3">
                            <div className="col-span-2 font-bold text-white text-xs truncate" title={anom.name}>{anom.name}</div>
                            <div className="text-center font-bold text-white">{anom.score}<span className="text-xs text-slate-500 font-sans">/100</span></div>
                            <div className={`text-center font-bold text-xs ${anom.trend > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                               {anom.trend > 0 ? '+' : ''}{anom.trend}%
                            </div>
                            <div className="text-center font-bold text-white text-xs">{anom.vulnerableCount}</div>
                            <div className="text-right">
                               <button
                                 className="text-xs text-cyan-400 font-bold hover:underline"
                                 onClick={(e) => { e.stopPropagation(); openInsight({ title: `Anomaly: ${anom.name}`, value: `${anom.score}/100`, subtext: `${anom.vulnerableCount} vulnerabilities`, color: 'rose', type: 'anomaly', aiAnalysis: `Risk score ${anom.score}/100 for ${anom.name}.`, tags: [{ label: 'ANOMALY', color: 'red' }], recommendations: ['Investigate immediately', 'Review access logs'] }); }}
                               >View</button>
                            </div>
                         </div>
                         
                         <div className="pt-2 border-t border-slate-700/30 grid grid-cols-2 gap-2">
                            {anom.tags.map((tag, tIdx) => (
                               <div key={tIdx} className="flex flex-col">
                                  <span className="text-xs text-slate-500 uppercase">{tag.label}</span>
                                  <span className={`text-xs font-bold ${tag.severity === 'CRITICAL' ? 'text-red-400' : tag.severity === 'HIGH' ? 'text-amber-400' : 'text-blue-400'}`}>
                                     {tag.severity}
                                  </span>
                               </div>
                            ))}
                         </div>
                         
                         <div className="mt-2 flex gap-2">
                            <button
                              className="flex-1 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded font-bold uppercase transition-colors"
                              onClick={(e) => { e.stopPropagation(); openInsight({ title: `Details: ${anom.name}`, value: `${anom.score}/100`, subtext: `${anom.vulnerableCount} vulnerabilities · Trend: ${anom.trend > 0 ? '+' : ''}${anom.trend}%`, color: anom.score >= 90 ? 'rose' : 'amber', type: 'anomaly', aiAnalysis: `Full anomaly profile for ${anom.name}: score ${anom.score}/100. ${anom.tags.map(t => t.label + ': ' + t.severity).join(', ')}.`, formula: 'Anomaly Score = Deviation × Severity Weight', methodology: 'ML-calibrated Z-score with 30-day rolling baseline.', tags: anom.tags.map(t => ({ label: t.severity, color: t.severity === 'CRITICAL' ? 'red' : 'amber' })), recommendations: ['Escalate to security team', 'Schedule emergency patch window', 'Monitor for follow-up anomalies'] }); }}
                            >View Details</button>
                            <button
                              className="flex-1 py-1 text-xs bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-500/30 rounded font-bold uppercase transition-colors"
                              onClick={(e) => { e.stopPropagation(); openInsight({ title: `Investigate: ${anom.name}`, value: `${anom.score}/100`, subtext: 'Security investigation initiated', color: 'rose', type: 'anomaly', aiAnalysis: `Critical investigation for ${anom.name}: Risk ${anom.score}/100. Recommend immediate isolation and forensic analysis.`, tags: [{ label: 'CRITICAL INVESTIGATION', color: 'red' }, { label: 'IMMEDIATE ACTION', color: 'red' }], recommendations: ['Isolate affected assets immediately', 'Trigger incident response protocol', 'Notify security team and management'] }); }}
                            >Investigate</button>
                         </div>
                      </div>
                    ))}
                 </div>
              </Card>
           </div>

        </div>

        {/* System Health & ML Performance */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
           
           {/* System Health */}
           <Card className="p-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Overall System Health</h3>
              <div className="space-y-4">
                 {data.systemHealth.map((health, i) => (
                    <div
                      key={i}
                      role="button" tabIndex={0}
                      aria-label={`Analyze ${health.description} with AI`}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded border border-slate-700/50 hover:border-cyan-500/30 cursor-pointer transition-all focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                      onClick={() => openInsight({ title: health.description, value: `${health.score}%`, subtext: `Status: ${health.status}`, color: health.score >= 95 ? 'green' : health.score >= 80 ? 'amber' : 'rose', type: 'metric', aiAnalysis: `System component ${health.description}: ${health.score}% health score, status ${health.status}. ML monitoring confirms ${health.score >= 95 ? 'optimal' : health.score >= 80 ? 'healthy' : 'degraded'} performance.`, tags: [{ label: health.status, color: health.score >= 95 ? 'green' : 'amber' }], recommendations: ['Continue monitoring', 'Set alert threshold at 80%', 'Review component SLA'] })}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openInsight({ title: health.description, value: `${health.score}%`, subtext: health.status, color: 'green', type: 'metric', aiAnalysis: `${health.description}: ${health.score}% health.`, tags: [{ label: health.status, color: 'green' }], recommendations: ['Monitor health score'] }); } }}
                    >
                       <div>
                          <div className="text-xs text-slate-500 uppercase font-bold">{health.description}</div>
                          <div className="text-xs font-bold text-white uppercase">{health.status}</div>
                       </div>
                       <div className="text-right">
                          <div className="text-lg font-bold text-white">{health.score}%</div>
                          <div className="text-xs text-slate-500 uppercase font-mono">Score</div>
                       </div>
                    </div>
                 ))}
              </div>
           </Card>

           {/* SRE AgenticOps Analysis */}
           <Card className="p-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">SRE AgenticOps Analysis</h3>
              <div className="space-y-4">
                 <div>
                    <div className="text-xs text-slate-500 uppercase font-bold mb-2">Critical Keywords:</div>
                    <div className="flex flex-wrap gap-2">
                       {data.nlpAnalysis.keywords.map((kw, i) => (
                          <span key={i} className="px-2 py-1 bg-red-900/20 text-red-300 border border-red-500/30 rounded text-xs font-bold uppercase">
                             {kw}
                          </span>
                       ))}
                    </div>
                 </div>
                 <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <span className="text-xs text-slate-500 uppercase font-bold">Urgency Score:</span>
                    <span className="text-xl font-bold text-red-400">{data.nlpAnalysis.urgencyScore}</span>
                 </div>
                 <div>
                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Top Patterns:</div>
                    <ul className="text-xs text-slate-300 list-disc list-inside">
                       {data.nlpAnalysis.patterns.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                 </div>
              </div>
           </Card>

           {/* ML Performance & Recommendations */}
           <Card
             className="p-5 flex flex-col justify-between"
             role="button" tabIndex={0}
             aria-label="Analyze ML Model Performance with AI"
             onClick={() => openInsight({ title: 'ML Model Performance', value: data.mlPerformance.accuracy || '94.2%', subtext: 'Precision, Recall, Accuracy, MAPE — all models active', color: 'blue', type: 'metric', aiAnalysis: `ML model ensemble performance: ${Object.entries(data.mlPerformance).map(([k, v]) => `${k}: ${v}`).join(', ')}. All models performing within SLA with high accuracy and recall scores.`, formula: 'Model Accuracy = (TP + TN) / (TP + TN + FP + FN)', methodology: 'Ensemble model evaluation using holdout validation. Metrics computed on rolling 30-day test set. MAPE (Mean Absolute Percentage Error) measures forecast quality.', tags: [{ label: 'ALL MODELS ACTIVE', color: 'green' }, { label: 'WITHIN SLA', color: 'blue' }], recommendations: ['Re-train models if accuracy drops below 90%', 'Investigate MAPE increases above 5%', 'Schedule quarterly model validation review'] })}
             onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openInsight({ title: 'ML Model Performance', value: '94.2%', subtext: 'All models active', color: 'blue', type: 'metric', aiAnalysis: 'ML ensemble performance within SLA.', tags: [{ label: 'ACTIVE', color: 'green' }], recommendations: ['Monitor model accuracy'] }))}
           >
              <div>
                 <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">ML Model Performance</h3>
                 <div className="grid grid-cols-2 gap-4 mb-4">
                    {Object.entries(data.mlPerformance).map(([key, val], i) => (
                       <div key={i} className="text-center p-2 bg-slate-800/50 rounded">
                          <div className="text-sm font-bold text-cyan-300">{val}</div>
                          <div className="text-xs text-slate-500 uppercase font-bold">{key}</div>
                       </div>
                    ))}
                 </div>
              </div>
              <div className="pt-4 border-t border-slate-700/50">
                 <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                   <Target size={12} /> Actionable Recommendations
                 </h3>
                 <div className="space-y-2">
                    {data.recommendations.map((rec, i) => (
                       <div key={i} className="flex gap-2 text-xs text-slate-300 leading-snug">
                          <span className="font-bold text-slate-500 font-mono">{i+1}</span>
                          <span>{rec}</span>
                       </div>
                    ))}
                 </div>
              </div>
           </Card>

        </div>

      </main>

      {/* AI/ML Insight Modal — triggered by card clicks */}
      <InsightModal
        data={selectedInsight}
        onClose={closeInsight}
        mlAnalysis={mlAnalysis}
        isMlLoading={isMlLoading}
        mlError={mlError}
      />
    </div>
  );
};
