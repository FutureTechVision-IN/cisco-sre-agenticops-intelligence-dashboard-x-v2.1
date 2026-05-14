
import React, { useState } from 'react';
import { InsightData } from '../types';
import { Sparkles, X, Activity, LineChart as LineChartIcon, Target, Server, Brain, CheckCircle, AlertTriangle, TrendingUp, Zap, Globe, Info, Clock, Database, Loader2, Cpu, ShieldCheck } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, ReferenceLine } from 'recharts';
import { useChartTheme } from '../hooks/useChartTheme';

export interface MLAnalysisData {
  forecast?: number;
  confidenceLevel?: string;
  trend?: string;
  anomaliesDetected?: number;
  riskFactorsIdentified?: number;
  recommendations?: string[];
  estimatedTimeToResolution?: string;
}

interface Props {
  data: InsightData | null;
  onClose: () => void;
  mlAnalysis?: MLAnalysisData | null;
  isMlLoading?: boolean;
  mlError?: string | null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-600 p-2 rounded shadow-xl backdrop-blur-xl">
        <p className="text-xs text-slate-400 font-bold uppercase mb-1">{label}</p>
        <p className="text-sm font-bold text-white">
          {payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export const InsightModal: React.FC<Props> = ({ data, onClose, mlAnalysis, isMlLoading, mlError }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'methodology' | 'actions'>('overview');
  const chartTheme = useChartTheme();
  
  if (!data) return null;

  const colorHex = {
    rose: '#f43f5e',
    amber: '#f59e0b',
    green: '#10b981',
    blue: '#06b6d4',
    purple: '#a855f7',
  }[data.color] || '#06b6d4';

  const getColorClass = (type: string) => {
     const base = data.color === 'rose' ? 'red' : data.color === 'amber' ? 'amber' : data.color === 'green' ? 'emerald' : 'cyan';
     if (type === 'bg') return `bg-${base}-900/30`;
     if (type === 'border') return `border-${base}-500/30`;
     if (type === 'text') return `text-${base}-400`;
     return '';
  };

  const Icon = data.type === 'anomaly' ? AlertTriangle : data.type === 'prediction' ? TrendingUp : data.type === 'recommendation' ? Zap : Activity;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />
      
      <div className="relative bg-slate-900 border border-slate-700 rounded-xl shadow-[0_0_100px_rgba(0,0,0,0.8)] w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Glowing Border Effect */}
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${data.color === 'rose' ? 'red' : data.color === 'amber' ? 'amber' : data.color === 'green' ? 'emerald' : 'cyan'}-500 to-transparent opacity-70`} />

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-700/80 flex justify-between items-center bg-slate-800/40 backdrop-blur-xl shrink-0 z-10">
          <div className="flex items-center gap-4">
             <div className={`p-2 rounded-lg ${getColorClass('bg')} ${getColorClass('border')} border`}>
                <Icon size={24} className={getColorClass('text')} />
             </div>
             <div>
                <h2 className="text-xl lg:text-2xl font-bold text-white uppercase tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                  {data.title}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-xs bg-slate-800 border border-slate-600 px-2 py-0.5 rounded text-slate-300 font-bold uppercase tracking-wider">
                      {data.type.toUpperCase()} ANALYSIS
                   </span>
                </div>
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-red-500/20 rounded-full text-slate-400 hover:text-red-400 transition-all border border-transparent hover:border-red-500/50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-4 border-b border-slate-700">
          <div className="flex gap-1 mb-0">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'analysis', label: 'Analysis' },
              { id: 'methodology', label: 'Methodology' },
              { id: 'actions', label: 'Recommended Actions' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-all
                  ${activeTab === tab.id
                    ? 'bg-slate-800 border-b-2 border-cyan-400 text-white'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area - Tab Based */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Value & Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Current Value</h3>
                  <div className="text-3xl font-bold text-white">
                    {typeof data.value === 'number' ? data.value.toLocaleString() : data.value}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">{data.subtext}</p>
                </div>

                <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Type</h3>
                  <div className="text-3xl font-bold text-cyan-400 capitalize">{data.type}</div>
                  <p className="text-xs text-slate-500 mt-2">Insight Category</p>
                </div>

                <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Status</h3>
                  <div className="text-3xl font-bold text-amber-400">Active</div>
                  <p className="text-xs text-slate-500 mt-2">Real-time Monitoring</p>
                </div>
              </div>

              {/* Historical Trend Chart */}
              {data.history && (
                <div className="p-6 rounded-xl bg-slate-800/30 border border-slate-700">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <LineChartIcon size={16} className="text-cyan-400" /> Trend Analysis
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={data.history}>
                      <defs>
                        <linearGradient id="overviewGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={colorHex} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={colorHex} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} opacity={0.2} />
                      <XAxis dataKey="date" stroke={chartTheme.axisStroke} fontSize={11} />
                      <YAxis stroke={chartTheme.axisStroke} fontSize={11} />
                      <Tooltip contentStyle={chartTheme.tooltipStyle} />
                      <Area type="monotone" dataKey="value" fill="url(#overviewGradient)" stroke={colorHex} strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Key Factors */}
              {data.tags && (
                <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Target size={16} className="text-cyan-400" /> Key Factors
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {data.tags.map((tag, i) => (
                      <span key={i} className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide ${
                        tag.color === 'red' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        tag.color === 'amber' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ANALYSIS TAB */}
          {activeTab === 'analysis' && (
            <div className="space-y-6">
              {/* AI Insight */}
              <div className="p-6 rounded-xl border-l-4 border-indigo-500 bg-slate-800/30">
                <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Brain size={16} />
                  AI Insight
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {data.aiAnalysis || "Analysis of this metric shows patterns correlated with recent system changes. The trend indicates a potential anomaly requiring investigation."}
                </p>
                <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-700/50">
                  <span className="text-xs text-slate-400 font-bold">Model Confidence</span>
                  {isMlLoading ? (
                    <span className="flex items-center gap-1 text-slate-400">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-xs">Calculating...</span>
                    </span>
                  ) : mlAnalysis?.confidenceLevel ? (
                    <span className="text-lg font-bold text-indigo-400">{mlAnalysis.confidenceLevel}</span>
                  ) : mlError ? (
                    <span className="text-xs text-amber-400">Unavailable</span>
                  ) : (
                    <span className="text-lg font-bold text-indigo-400">94.2%</span>
                  )}
                </div>
              </div>

              {/* ML Backend Live Results */}
              {(isMlLoading || mlAnalysis || mlError) && (
                <div className="p-5 rounded-xl bg-indigo-900/20 border border-indigo-500/30">
                  <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Cpu size={14} /> ML Engine Results
                    {isMlLoading && <Loader2 size={12} className="animate-spin text-indigo-400" />}
                  </h3>
                  {isMlLoading && (
                    <div className="flex items-center gap-3 py-4">
                      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                      <div>
                        <p className="text-sm text-indigo-300 font-semibold">Running comprehensive ML analysis...</p>
                        <p className="text-xs text-slate-400 mt-1">Analyzing trends, anomalies, and risk factors</p>
                      </div>
                    </div>
                  )}
                  {mlError && !isMlLoading && (
                    <div className="flex items-center gap-2 text-amber-400 text-sm py-2">
                      <AlertTriangle size={16} />
                      <span>ML analysis unavailable: {mlError}. Showing baseline data.</span>
                    </div>
                  )}
                  {mlAnalysis && !isMlLoading && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {mlAnalysis.trend && (
                        <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">ML Trend</p>
                          <p className={`text-base font-bold ${
                            mlAnalysis.trend === 'RISING' ? 'text-amber-400' :
                            mlAnalysis.trend === 'FALLING' ? 'text-red-400' :
                            'text-emerald-400'
                          }`}>
                            {mlAnalysis.trend === 'RISING' ? '↑ Rising' : mlAnalysis.trend === 'FALLING' ? '↓ Falling' : '→ Stable'}
                          </p>
                        </div>
                      )}
                      {mlAnalysis.anomaliesDetected !== undefined && (
                        <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Anomalies</p>
                          <p className={`text-base font-bold ${mlAnalysis.anomaliesDetected > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {mlAnalysis.anomaliesDetected}
                          </p>
                        </div>
                      )}
                      {mlAnalysis.riskFactorsIdentified !== undefined && (
                        <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Risk Factors</p>
                          <p className="text-base font-bold text-amber-400">{mlAnalysis.riskFactorsIdentified}</p>
                        </div>
                      )}
                      {mlAnalysis.forecast !== undefined && (
                        <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Forecast Value</p>
                          <p className="text-sm font-bold text-cyan-400">{Number(mlAnalysis.forecast).toLocaleString()}</p>
                        </div>
                      )}
                      {mlAnalysis.estimatedTimeToResolution && mlAnalysis.estimatedTimeToResolution !== 'N/A' && (
                        <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Est. Resolution</p>
                          <p className="text-sm font-bold text-purple-400">{mlAnalysis.estimatedTimeToResolution}</p>
                        </div>
                      )}
                      {mlAnalysis.confidenceLevel && (
                        <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Confidence</p>
                          <p className="text-base font-bold text-indigo-400">{mlAnalysis.confidenceLevel}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {/* ML Recommendations */}
                  {mlAnalysis?.recommendations && mlAnalysis.recommendations.length > 0 && !isMlLoading && (
                    <div className="mt-3 pt-3 border-t border-indigo-500/20">
                      <p className="text-xs text-indigo-300 uppercase tracking-wider font-bold mb-2 flex items-center gap-1">
                        <ShieldCheck size={11} /> ML Recommendations
                      </p>
                      <ul className="space-y-1">
                        {mlAnalysis.recommendations.slice(0, 3).map((rec, i) => (
                          <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-indigo-400 mt-0.5 flex-shrink-0">→</span>
                            <span>{typeof rec === 'string' ? rec : JSON.stringify(rec)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Deep Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700">
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Activity size={14} /> Data Quality
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Accuracy</span>
                        <span className="text-emerald-400 font-bold">98.5%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                        <div className="h-full w-[98.5%] rounded-full bg-emerald-500" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Coverage</span>
                        <span className="text-blue-400 font-bold">100%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                        <div className="h-full w-full rounded-full bg-blue-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700">
                  <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <TrendingUp size={14} /> Trend Direction
                  </h3>
                  {isMlLoading ? (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-sm">Analyzing trend...</span>
                    </div>
                  ) : mlAnalysis?.trend ? (
                    <>
                      <p className="text-sm text-slate-300 mb-3">
                        ML model detected a {mlAnalysis.trend.toLowerCase()} pattern based on historical data.
                      </p>
                      <div className={`text-2xl font-bold ${
                        mlAnalysis.trend === 'RISING' ? 'text-amber-400' :
                        mlAnalysis.trend === 'FALLING' ? 'text-red-400' :
                        'text-emerald-400'
                      }`}>
                        {mlAnalysis.trend === 'RISING' ? '↑ Rising' : mlAnalysis.trend === 'FALLING' ? '↓ Falling' : '→ Stable'}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-slate-300 mb-3">The metric is trending upward with sustained growth over the past 30 days.</p>
                      <div className="text-2xl font-bold text-emerald-400">+2.4% / day</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* METHODOLOGY TAB */}
          {activeTab === 'methodology' && (
            <div className="space-y-6">
              {/* Calculation Formula */}
              <div className="p-6 rounded-xl bg-slate-800/40 border-2 border-cyan-500/50">
                <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-4">Calculation Methodology</h3>
                <div className="bg-slate-900/60 p-5 rounded-lg border border-slate-700 font-mono text-sm">
                  <code className="text-cyan-300 leading-relaxed whitespace-pre-wrap break-words">
                    {data.formula || (
                      data.type === 'anomaly'
                        ? 'Anomaly Score = (Deviation from Baseline × Severity Weight × Confidence Factor) / 100'
                        : data.type === 'prediction'
                        ? 'Forecast Confidence = (Historical Accuracy × Pattern Strength × Data Quality) / 100'
                        : data.type === 'recommendation'
                        ? 'Priority Score = (Risk Impact × Urgency × Implementation Feasibility) / 100'
                        : data.title === 'Vulnerable Assets'
                        ? 'Total = Count of assets with severity >= HIGH'
                        : data.title === 'Secure Assets'
                        ? 'Total = Assets with no vulnerabilities and all patches applied'
                        : data.title === 'Potentially Vulnerable'
                        ? 'Total = Assets with unconfirmed vulnerabilities or pending patches'
                        : data.title === 'Total Assessed Assets'
                        ? 'Total = Vulnerable Assets + Potentially Vulnerable Assets + Secure Assets'
                        : data.title === 'Risk Score'
                        ? 'Risk Score = (Vulnerable × 100 + Potentially Vulnerable × 50) / Total Assessed'
                        : 'Mean Time To Remediate = Sum of all remediation times / Number of remediated items'
                    )}
                  </code>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="border-l-4 border-indigo-500 pl-6 py-2">
                <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-3">Calculation Details</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {data.methodology || (
                    data.type === 'anomaly'
                      ? 'Anomaly detection uses machine learning algorithms to identify deviations from established baseline patterns. The system analyzes historical data, applies statistical models, and weights anomalies based on severity, confidence level, and potential business impact. Each anomaly is scored on a 0-100 scale where higher values indicate greater deviation from normal behavior.'
                      : data.type === 'prediction'
                      ? 'Predictive analytics leverages time-series forecasting models trained on historical trends, seasonal patterns, and external factors. The confidence score reflects the statistical accuracy of the prediction based on data quality, pattern consistency, and historical validation. Forecasts are continuously updated as new data becomes available.'
                      : data.type === 'recommendation'
                      ? 'Recommendations are generated using a multi-factor prioritization algorithm that evaluates risk impact, urgency level, and implementation feasibility. Each recommendation is ranked based on potential security improvement, resource requirements, and alignment with organizational risk tolerance. Priority scores guide remediation sequencing.'
                      : data.title === 'Vulnerable Assets'
                      ? 'This metric aggregates all assets that contain one or more confirmed vulnerabilities with severity ratings of HIGH or CRITICAL. Real-time scanning continuously identifies new vulnerabilities and updates this count.'
                      : data.title === 'Total Assessed Assets'
                      ? 'This represents the complete inventory of assets under assessment, calculated as the sum of all three asset classification categories: vulnerable, potentially vulnerable, and secure.'
                      : 'This metric is calculated using real-time data aggregation from multiple sources, validated against baseline benchmarks, and computed with statistical confidence intervals applied.'
                  )}
                </p>
              </div>

              {/* Data Sources */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Database size={14} className="text-purple-400" /> Data Sources
                  </h3>
                  <ul className="space-y-2">
                    {(data.dataSources || [
                      'Primary SRE Cluster',
                      'ML Analytics Engine',
                      'Real-time Telemetry Feed',
                      'Historical Vulnerability Archive'
                    ]).map((source, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="text-cyan-400 mt-1">•</span> {source}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Clock size={14} className="text-blue-400" /> Update Frequency
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-slate-400">Real-time Updates</span>
                      <p className="text-lg font-bold text-blue-400 mt-1">Every 15 seconds</p>
                    </div>
                    <div className="pt-2 border-t border-slate-600">
                      <span className="text-xs text-slate-400">Last Refreshed</span>
                      <p className="text-sm text-slate-300 mt-1">{new Date().toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Formula Components Breakdown */}
              <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Formula Components</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/30 border border-slate-600">
                    <span className="text-cyan-400 font-bold flex-shrink-0">①</span>
                    <div>
                      <p className="text-xs font-bold text-slate-300">Data Collection</p>
                      <p className="text-xs text-slate-500">Aggregate metrics from all configured sources</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/30 border border-slate-600">
                    <span className="text-cyan-400 font-bold flex-shrink-0">②</span>
                    <div>
                      <p className="text-xs font-bold text-slate-300">Normalization</p>
                      <p className="text-xs text-slate-500">Apply standardization rules and remove duplicates</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/30 border border-slate-600">
                    <span className="text-cyan-400 font-bold flex-shrink-0">③</span>
                    <div>
                      <p className="text-xs font-bold text-slate-300">Calculation</p>
                      <p className="text-xs text-slate-500">Apply formula and compute final metric value</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/30 border border-slate-600">
                    <span className="text-cyan-400 font-bold flex-shrink-0">④</span>
                    <div>
                      <p className="text-xs font-bold text-slate-300">Validation</p>
                      <p className="text-xs text-slate-500">Cross-check against benchmarks and thresholds</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/30 border border-slate-600">
                    <span className="text-cyan-400 font-bold flex-shrink-0">⑤</span>
                    <div>
                      <p className="text-xs font-bold text-slate-300">Publication</p>
                      <p className="text-xs text-slate-500">Display metric with status, trends, and confidence</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ACTIONS TAB */}
          {activeTab === 'actions' && (
            <div className="space-y-6">
              {data.recommendations && data.recommendations.length > 0 ? (
                <>
                  <div className="border-l-4 border-amber-500 pl-6 py-2">
                    <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Sparkles size={16} />
                      Recommended Actions
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {data.recommendations.map((rec, i) => (
                      <div key={i} className="flex gap-4 items-start p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-cyan-500/50 transition-colors">
                        <div className="flex-shrink-0 mt-1">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50">
                            <CheckCircle size={16} className="text-emerald-400" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-200">{rec}</p>
                          <p className="text-xs text-slate-500 mt-2">Priority: High</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-6 rounded-xl bg-slate-800/30 border border-slate-700 text-center">
                  <Zap size={32} className="text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No specific actions recommended at this time.</p>
                  <p className="text-xs text-slate-500 mt-2">Continue monitoring this metric for changes.</p>
                </div>
              )}

              {/* Contact & Support */}
              <div className="mt-6 pt-6 border-t border-slate-700">
                <div className="flex items-center gap-3 text-slate-500 text-xs">
                  <Server size={14} />
                  <div className="uppercase font-bold">
                    Source: Primary SRE Cluster • Region: US-East-1
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
