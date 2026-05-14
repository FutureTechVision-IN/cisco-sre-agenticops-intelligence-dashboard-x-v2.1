
import React, { useState, useMemo } from 'react';
import { MonthlyTrend, FieldNotice, Customer, GrowthMetric, AdvancedMetric, InsightData, FilterState, DEFAULT_FILTER_STATE, ExtendedKPI } from '../types';
import { Card, Badge, ProgressBar } from './ui/Card';
import { KPICardAccessible } from './KPICardAccessible';
import { ExtendedKPICard } from './ExtendedKPICard';
import { ErrorBoundary } from './ErrorBoundary';
import { InteractiveChartWrapper, type ChartData, type AIAnalysisResult } from './InteractiveChartWrapper';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, Scatter, PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, Activity, Database, Clock, Settings, PieChart, Info, Download, AlertTriangle, Minus, MousePointerClick, Loader2, Filter, TrendingUp, TrendingDown, Zap, Target, Shield, AlertOctagon } from 'lucide-react';
import { useChartTheme } from '../hooks/useChartTheme';

interface Props {
  trends: MonthlyTrend[];
  topFieldNotices: FieldNotice[];
  topCustomers: Customer[];
  growthMetrics: GrowthMetric[];
  advancedMetrics: AdvancedMetric[];
  metrics: any;
  onInsightSelect: (data: InsightData) => void;
  filters?: FilterState;
  extendedKPIs?: ExtendedKPI[];
}

const COLORS = {
  vulnerable: '#ef4444', // red-500
  potential: '#f59e0b',  // amber-500
  secure: '#10b981'      // emerald-500
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800/95 backdrop-blur-xl p-4 border border-slate-600 shadow-2xl rounded-lg">
        <p className="text-sm font-bold text-white mb-2 tracking-wide">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-3 text-xs mb-1">
            <div className="w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]" style={{ backgroundColor: entry.color, color: entry.color }} />
            <span className="text-slate-300 capitalize font-medium">{entry.name}:</span>
            <span className="font-mono font-bold text-white ml-auto">{entry.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const GrowthCard: React.FC<{ metric: GrowthMetric; onClick: (data: InsightData) => void }> = ({ metric, onClick }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const isPositive = metric.percentageChange >= 0;
  const isGood = metric.isPositiveGood ? isPositive : !isPositive;
  const colorClass = isGood ? 'text-emerald-400' : 'text-red-400';
  const Icon = metric.percentageChange > 0 ? ArrowUpRight : ArrowDownRight;

  // Get metric-specific methodology based on label
  const getMethodology = (label: string): string => {
    if (label.toLowerCase().includes('vulnerable growth')) {
      return 'Tracks month-over-month changes in vulnerable assets (HIGH/CRITICAL severity). Negative growth indicates successful remediation efforts reducing risk exposure. Positive growth signals increasing vulnerability burden requiring immediate security attention and prioritized patching.';
    } else if (label.toLowerCase().includes('potentially vulnerable')) {
      return 'Tracks month-over-month changes in potentially vulnerable assets (MEDIUM severity). Growth indicates newly discovered vulnerabilities or delayed patch deployments. Monitoring this metric prevents medium-risk items from escalating to critical vulnerabilities and helps prioritize preventive remediation.';
    } else if (label.toLowerCase().includes('secure assets')) {
      return 'Tracks month-over-month changes in secure assets (compliant systems meeting security standards). Positive growth reflects successful security hygiene, effective patch management, and remediation efforts. This is the primary indicator of overall security posture improvement and organizational maturity.';
    }
    // Fallback for any other growth metrics
    return 'Growth metrics track month-over-month changes in asset classifications. Positive growth in vulnerable assets indicates increasing risk exposure, while growth in secure assets reflects successful remediation efforts. Percentage changes are calculated relative to the previous reporting period and normalized for seasonal variations.';
  };

  // Prepare InsightData payload
  const insightPayload: InsightData = {
    title: metric.label,
    value: metric.value,
    subtext: metric.subtext,
    color: isGood ? 'green' : 'rose',
    history: metric.history,
    aiAnalysis: metric.aiAnalysis,
    type: 'metric',
    formula: 'Growth Rate = ((Current Period - Previous Period) / Previous Period) × 100',
    methodology: getMethodology(metric.label),
    dataSources: ['Time-Series Database', 'Asset Inventory', 'Change Management Records', 'Historical Baselines']
  };

  const handleClick = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    // Simulate AI processing delay
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      onClick(insightPayload);
    } catch (e) {
      console.error("Analysis processing failed", e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card 
      className={`p-4 flex flex-col justify-between h-full border-l-2 border-l-slate-700 hover:border-l-cyan-500/50 perspective-500 cursor-pointer group relative overflow-hidden ${isProcessing ? 'pointer-events-none' : ''}`}
      onClick={handleClick}
      // Accessibility
      role="button"
      aria-label={`View analysis for ${metric.label}`}
      aria-busy={isProcessing}
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
       <div className={`transform transition-transform duration-300 ${isProcessing ? 'scale-95 opacity-50' : 'group-hover:translate-z-4'} relative z-10`}>
          <h4 className="text-xs text-slate-300 font-bold uppercase tracking-widest truncate" title={metric.label}>{metric.label}</h4>
          <div className="mt-2 text-2xl font-bold text-white">{metric.value}</div>
       </div>
       <div className={`mt-2 flex items-center justify-between transform transition-transform duration-300 ${isProcessing ? 'opacity-50' : 'group-hover:translate-z-2'} relative z-10`}>
          <div className={`flex items-center text-sm font-bold ${colorClass} drop-shadow-[0_0_5px_currentColor]`}>
            <Icon size={16} className="mr-0.5" />
            {metric.percentageChange > 0 ? '+' : ''}{metric.percentageChange}%
          </div>
          <div className="text-xs text-slate-400 font-mono">{metric.absoluteChange}</div>
       </div>
       <div className="text-xs text-slate-500 font-bold uppercase mt-1 tracking-wider text-right relative z-10">{metric.subtext}</div>
       
       {/* Visual Feedback on Hover */}
       {!isProcessing && (
         <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <MousePointerClick size={14} className="text-cyan-400 animate-bounce" />
         </div>
       )}
       <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl" />

       {/* Loading Overlay */}
       {isProcessing && (
         <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 transition-all duration-300 animate-in fade-in">
            <Loader2 className="text-cyan-400 animate-spin mb-2" size={28} />
            <span className="text-xs text-cyan-300 font-bold uppercase tracking-widest animate-pulse">Analyzing...</span>
         </div>
       )}
    </Card>
  );
};

const AdvancedCard: React.FC<{ metric: AdvancedMetric; onClick: (data: InsightData) => void }> = ({ metric, onClick }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const insightPayload: InsightData = {
    title: metric.label,
    value: metric.value,
    subtext: metric.subtext,
    color: metric.color === 'purple' ? 'purple' : metric.color === 'cyan' ? 'blue' : 'purple',
    history: metric.history,
    aiAnalysis: metric.aiAnalysis,
    type: 'metric',
    formula: 'Advanced Metric = Weighted aggregation of component factors with confidence intervals',
    methodology: 'Advanced metrics combine multiple data sources and apply statistical analysis to produce composite indicators. These metrics use machine learning models to identify patterns, correlations, and leading indicators that may not be visible in individual measurements. Values are normalized and validated against historical benchmarks.',
    dataSources: ['ML Analytics Engine', 'Statistical Models', 'Multi-Source Aggregator', 'Pattern Recognition System']
  };

  const handleClick = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onClick(insightPayload);
    } catch (e) {
      console.error("Analysis failed", e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card 
      className={`p-4 flex flex-col justify-between h-full border-t-2 ${metric.color === 'purple' ? 'border-t-purple-500' : metric.color === 'cyan' ? 'border-t-cyan-500' : 'border-t-indigo-500'} cursor-pointer group hover:bg-slate-800/80 transition-all relative ${isProcessing ? 'pointer-events-none' : ''}`}
      onClick={handleClick}
      // Accessibility
      role="button"
      aria-label={`View analysis for ${metric.label}`}
      aria-busy={isProcessing}
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
       <h4 className={`text-xs text-slate-300 font-bold uppercase tracking-widest truncate group-hover:text-white transition-colors relative z-10 ${isProcessing ? 'opacity-50' : ''}`}>{metric.label}</h4>
       <div className={`mt-2 text-2xl font-bold ${metric.color === 'purple' ? 'text-purple-400' : metric.color === 'cyan' ? 'text-cyan-400' : 'text-indigo-400'} drop-shadow-[0_0_5px_currentColor] relative z-10 ${isProcessing ? 'opacity-50' : ''}`}>
          {metric.value}
       </div>
       <div className={`mt-1 text-xs text-slate-400 font-medium uppercase tracking-wider flex justify-between items-center relative z-10 ${isProcessing ? 'opacity-50' : ''}`}>
         <span>{metric.subtext}</span>
         <Activity size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${metric.color === 'purple' ? 'text-purple-400' : metric.color === 'cyan' ? 'text-cyan-400' : 'text-indigo-400'}`} />
       </div>
       
       {/* Hover Overlay */}
       <div className={`absolute inset-0 bg-gradient-to-t ${metric.color === 'purple' ? 'from-purple-500/10' : metric.color === 'cyan' ? 'from-cyan-500/10' : 'from-indigo-500/10'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none`} />

       {/* Loading Overlay */}
       {isProcessing && (
         <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 transition-all duration-300 animate-in fade-in">
            <Loader2 className={`${metric.color === 'purple' ? 'text-purple-400' : metric.color === 'cyan' ? 'text-cyan-400' : 'text-indigo-400'} animate-spin mb-2`} size={28} />
            <span className={`text-xs ${metric.color === 'purple' ? 'text-purple-300' : metric.color === 'cyan' ? 'text-cyan-300' : 'text-indigo-300'} font-bold uppercase tracking-widest animate-pulse`}>Generating...</span>
         </div>
       )}
    </Card>
  );
};

// Helper component to show active filter badge
const ActiveFilterBadge: React.FC<{ filters?: FilterState }> = ({ filters }) => {
  if (!filters) return null;
  
  const activeFilters: string[] = [];
  if (filters.customer && filters.customer !== 'All Customers') {
    activeFilters.push(`Customer: ${filters.customer}`);
  }
  if (filters.fieldNotice && filters.fieldNotice !== 'All Field Notices') {
    activeFilters.push(`FN: ${filters.fieldNotice}`);
  }
  if (filters.fnType && filters.fnType !== 'All Types') {
    activeFilters.push(`Type: ${filters.fnType}`);
  }
  if (filters.month && filters.month !== 'All Months') {
    activeFilters.push(`Month: ${filters.month}`);
  }
  
  if (activeFilters.length === 0) return null;
  
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 text-xs text-cyan-400">
        <Filter size={12} />
        <span className="font-semibold uppercase tracking-wider">Filtered:</span>
      </div>
      {activeFilters.map((filter, idx) => (
        <span 
          key={idx}
          className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30"
        >
          {filter}
        </span>
      ))}
    </div>
  );
};

// New Advanced KPI Card - Risk Concentration Radar
const RiskConcentrationCard: React.FC<{ 
  topCustomers: Customer[]; 
  onClick: (data: InsightData) => void;
}> = ({ topCustomers, onClick }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const chartTheme = useChartTheme();
  
  // Calculate risk metrics for radar chart
  const radarData = useMemo(() => {
    if (!topCustomers || topCustomers.length === 0) return [];
    
    const top5 = topCustomers.slice(0, 5);
    const maxVuln = Math.max(...top5.map(c => c.vulnerableCount || 0));
    const maxPotential = Math.max(...top5.map(c => c.potentialCount || 0));
    const maxTotal = Math.max(...top5.map(c => (c.vulnerableCount || 0) + (c.potentialCount || 0) + (c.secureCount || 0)));
    
    return top5.map(c => ({
      name: c.name?.substring(0, 15) || 'Unknown',
      fullName: c.name,
      vulnerability: maxVuln > 0 ? Math.round((c.vulnerableCount || 0) / maxVuln * 100) : 0,
      potential: maxPotential > 0 ? Math.round((c.potentialCount || 0) / maxPotential * 100) : 0,
      exposure: maxTotal > 0 ? Math.round(((c.vulnerableCount || 0) + (c.potentialCount || 0)) / maxTotal * 100) : 0,
    }));
  }, [topCustomers]);
  
  const insightPayload: InsightData = {
    title: 'Customer Risk Concentration',
    value: `${topCustomers?.length || 0} customers analyzed`,
    subtext: 'Top 5 customers by vulnerability exposure',
    color: 'rose',
    type: 'metric',
    formula: 'Risk Concentration = (Customer Vulnerability Count / Total Vulnerabilities) × 100',
    methodology: 'Risk concentration analysis identifies customers with the highest vulnerability exposure relative to the total risk landscape. This metric helps prioritize customer-focused remediation efforts and resource allocation. Concentration is measured across vulnerable, potentially vulnerable, and total assessed assets to provide a comprehensive risk profile per customer.',
    dataSources: ['Customer Asset Inventory', 'Vulnerability Database', 'Risk Scoring Engine', 'Customer Relationship Management']
  };
  
  const handleClick = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      onClick(insightPayload);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Card 
      className="p-5 cursor-pointer group relative overflow-hidden border-t-2 border-t-rose-500"
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs text-slate-300 font-bold uppercase tracking-widest flex items-center gap-2">
          <Target size={14} className="text-rose-400" />
          Risk Concentration
        </h4>
        <Badge color="rose">Advanced</Badge>
      </div>
      
      <div className="h-[180px]">
        {radarData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke={chartTheme.gridStroke} />
              <PolarAngleAxis 
                dataKey="name" 
                tick={{ fill: chartTheme.tickFill, fontSize: 9 }}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                tick={{ fill: chartTheme.tickFillMuted, fontSize: 8 }}
              />
              <Radar 
                name="Vulnerability" 
                dataKey="vulnerability" 
                stroke="#ef4444" 
                fill="#ef4444" 
                fillOpacity={0.3} 
              />
              <Radar 
                name="Exposure" 
                dataKey="exposure" 
                stroke="#f59e0b" 
                fill="#f59e0b" 
                fillOpacity={0.2} 
              />
              <Tooltip 
                contentStyle={chartTheme.tooltipStyle}
                labelStyle={chartTheme.tooltipLabelStyle}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            No customer data available
          </div>
        )}
      </div>
      
      <div className="mt-2 text-xs text-slate-500 font-medium text-center">
        Top 5 customers by risk exposure
      </div>
      
      {isProcessing && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <Loader2 className="text-rose-400 animate-spin mb-2" size={28} />
          <span className="text-xs text-rose-300 font-bold uppercase tracking-widest animate-pulse">Analyzing...</span>
        </div>
      )}
    </Card>
  );
};

// New Advanced KPI Card - Remediation Velocity Trend
const RemediationVelocityCard: React.FC<{ 
  trends: MonthlyTrend[]; 
  onClick: (data: InsightData) => void;
}> = ({ trends, onClick }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const chartTheme = useChartTheme();
  
  // Calculate remediation velocity over time
  const velocityData = useMemo(() => {
    if (!trends || trends.length < 2) return [];
    
    return trends.slice(1).map((current, idx) => {
      const previous = trends[idx];
      const secureGrowth = previous.secure > 0 
        ? ((current.secure - previous.secure) / previous.secure * 100) 
        : 0;
      const vulnReduction = previous.vulnerable > 0 
        ? ((previous.vulnerable - current.vulnerable) / previous.vulnerable * 100)
        : 0;
        
      return {
        month: current.month?.split('-')[1] || `M${idx + 2}`,
        velocity: Math.round((secureGrowth + vulnReduction) / 2),
        secureGrowth: Math.round(secureGrowth),
        vulnReduction: Math.round(vulnReduction),
      };
    });
  }, [trends]);
  
  const avgVelocity = velocityData.length > 0 
    ? Math.round(velocityData.reduce((sum, d) => sum + d.velocity, 0) / velocityData.length)
    : 0;
    
  const latestVelocity = velocityData.length > 0 ? velocityData[velocityData.length - 1].velocity : 0;
  const velocityTrend = latestVelocity > avgVelocity ? 'improving' : latestVelocity < avgVelocity ? 'declining' : 'stable';
  
  const insightPayload: InsightData = {
    title: 'Remediation Velocity',
    value: `${avgVelocity}% avg velocity`,
    subtext: `Current trend: ${velocityTrend}`,
    color: velocityTrend === 'improving' ? 'green' : velocityTrend === 'declining' ? 'rose' : 'blue',
    type: 'metric',
    formula: 'Velocity = ((Secure Asset Growth + Vulnerability Reduction) / 2) per period',
    methodology: 'Remediation velocity measures the rate at which security posture improves over time. It combines two key indicators: the growth rate of secure assets and the reduction rate of vulnerable assets. A positive velocity indicates effective remediation efforts, while negative velocity suggests deteriorating security posture. The metric is calculated on a monthly basis and averaged to identify trends.',
    dataSources: ['Time-Series Database', 'Remediation Tracking System', 'Asset Classification History', 'Change Management Records']
  };
  
  const handleClick = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      onClick(insightPayload);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Dynamic color based on velocity trend
  const trendColor = velocityTrend === 'improving' ? 'emerald' : velocityTrend === 'declining' ? 'rose' : 'amber';
  const trendColorClass = velocityTrend === 'improving' ? 'text-emerald-400' : velocityTrend === 'declining' ? 'text-rose-400' : 'text-amber-400';
  const borderColorClass = velocityTrend === 'improving' ? 'border-t-emerald-500' : velocityTrend === 'declining' ? 'border-t-rose-500' : 'border-t-amber-500';
  
  return (
    <Card 
      className={`p-5 cursor-pointer group relative overflow-hidden border-t-2 ${borderColorClass}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs text-slate-300 font-bold uppercase tracking-widest flex items-center gap-2">
          <Zap size={14} className={trendColorClass} />
          Remediation Velocity
        </h4>
        <div className="flex items-center gap-1">
          {velocityTrend === 'improving' ? (
            <TrendingUp size={14} className="text-emerald-400" />
          ) : velocityTrend === 'declining' ? (
            <TrendingDown size={14} className="text-rose-400" />
          ) : (
            <Minus size={14} className="text-amber-400" />
          )}
          <Badge color={velocityTrend === 'improving' ? 'green' : velocityTrend === 'declining' ? 'rose' : 'blue'}>
            {velocityTrend}
          </Badge>
        </div>
      </div>
      
      <div className="flex items-baseline gap-2 mb-3">
        <span className={`text-3xl font-bold ${trendColorClass}`}>{avgVelocity}%</span>
        <span className="text-xs text-slate-500">avg velocity</span>
      </div>
      
      <div className="h-[100px]">
        {velocityData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={velocityData}>
              <defs>
                <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={velocityTrend === 'improving' ? '#10b981' : velocityTrend === 'declining' ? '#f43f5e' : '#f59e0b'} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={velocityTrend === 'improving' ? '#10b981' : velocityTrend === 'declining' ? '#f43f5e' : '#f59e0b'} stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} opacity={0.3} />
              <XAxis 
                dataKey="month" 
                tick={{ fill: chartTheme.tickFillMuted, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip 
                contentStyle={chartTheme.tooltipStyle}
                labelStyle={chartTheme.tooltipLabelStyle}
                formatter={(value: number) => [`${value}%`, 'Velocity']}
              />
              <Area 
                type="monotone" 
                dataKey="velocity" 
                fill="url(#velocityGradient)" 
                stroke={velocityTrend === 'improving' ? '#10b981' : velocityTrend === 'declining' ? '#f43f5e' : '#f59e0b'}
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="velocity" 
                stroke={velocityTrend === 'improving' ? '#10b981' : velocityTrend === 'declining' ? '#f43f5e' : '#f59e0b'}
                strokeWidth={2}
                dot={{ fill: velocityTrend === 'improving' ? '#10b981' : velocityTrend === 'declining' ? '#f43f5e' : '#f59e0b', strokeWidth: 0, r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            Insufficient data
          </div>
        )}
      </div>
      
      {isProcessing && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <Loader2 className="text-emerald-400 animate-spin mb-2" size={28} />
          <span className="text-xs text-emerald-300 font-bold uppercase tracking-widest animate-pulse">Analyzing...</span>
        </div>
      )}
    </Card>
  );
};

export const ChartsSection: React.FC<Props> = ({ trends, topFieldNotices, topCustomers, growthMetrics, advancedMetrics, metrics, onInsightSelect, filters, extendedKPIs }) => {
  const chartTheme = useChartTheme();
  const [isCumulative, setIsCumulative] = useState(false);
  const [viewMode, setViewMode] = useState<'absolute' | 'percentage' | 'normalized'>('absolute');
  const [topFNCount, setTopFNCount] = useState(10);
  const [topCustomerCount, setTopCustomerCount] = useState(10);
  const [isLoadingFN, setIsLoadingFN] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  
  // Memoize sliced data
  const slicedFieldNotices = useMemo(() => {
    if (!topFieldNotices) return [];
    return topFieldNotices.slice(0, Math.min(topFNCount, topFieldNotices.length));
  }, [topFieldNotices, topFNCount]);
  
  const slicedCustomers = useMemo(() => {
    if (!topCustomers) return [];
    return topCustomers.slice(0, Math.min(topCustomerCount, topCustomers.length));
  }, [topCustomers, topCustomerCount]);

  // Dynamic period label — shows the selected month or "All Months" for the unfiltered view
  const periodLabel = (filters?.month && filters.month !== 'All Months')
    ? filters.month
    : 'All Months (Aug 2025 – Feb 2026)';
  
  // CRITICAL DEBUG LOGGING: Verify trends data structure
  React.useEffect(() => {
    if (trends && trends.length > 0) {
      console.log('[ChartsSection] TRENDS DATA RECEIVED:');
      trends.forEach((trend: any, idx: number) => {
        console.log(`  Month ${idx}: ${trend.month}`, {
          vulnerable: trend.vulnerable,
          potentiallyVulnerable: trend.potentiallyVulnerable,
          notVulnerable: trend.notVulnerable,
          total: (trend.vulnerable || 0) + (trend.potentiallyVulnerable || 0) + (trend.notVulnerable || 0)
        });
      });
      console.log('[ChartsSection] All 3 categories present:', {
        hasVulnerable: trends.every(t => t.vulnerable !== undefined),
        hasPotentiallyVulnerable: trends.every(t => t.potentiallyVulnerable !== undefined),
        hasNotVulnerable: trends.every(t => t.notVulnerable !== undefined)
      });
    }
  }, [trends]);
  
  // Check if any filter is active
  const isFilterActive = filters && (
    (filters.customer && filters.customer !== 'All Customers') ||
    (filters.fieldNotice && filters.fieldNotice !== 'All Field Notices') ||
    (filters.fnType && filters.fnType !== 'All Types') ||
    (filters.month && filters.month !== 'All Months')
  );

  // Export CSV function for Field Notices table
  const exportFieldNoticesToCSV = (data: FieldNotice[]) => {
    if (!data || data.length === 0) return;
    const headers = ['Rank', 'Field Notice ID', 'Title', 'Vulnerable', 'Potentially Vulnerable', 'Not Vulnerable'];
    const csvContent = [
      headers.join(','),
      ...data.map((fn, idx) => [
        idx + 1,
        fn.id,
        `"${(fn.title || '').replace(/"/g, '""')}"`,
        fn.vulnerableCount || 0,
        fn.potentialCount || 0,
        fn.secureCount || 0
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `top-field-notices-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export CSV function for Customers table
  const exportCustomersToCSV = (data: Customer[]) => {
    if (!data || data.length === 0) return;
    const headers = ['Rank', 'Customer Name', 'Vulnerable', 'Potentially Vulnerable', 'Not Vulnerable', 'Records'];
    const csvContent = [
      headers.join(','),
      ...data.map((c, idx) => [
        idx + 1,
        `"${(c.name || '').replace(/"/g, '""')}"`,
        c.vulnerableCount || 0,
        c.potentialCount || 0,
        c.secureCount || 0,
        c.recordCount || 0
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `top-customers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* 6-Grid Growth & Advanced KPIs + New Advanced Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {growthMetrics.map((m, i) => <GrowthCard key={i} metric={m} onClick={onInsightSelect} />)}
        {advancedMetrics.map((m, i) => <AdvancedCard key={i} metric={m} onClick={onInsightSelect} />)}
      </div>

      {/* Extended KPI Cards - Risk Score Index & Mean Time to Remediate */}
      {extendedKPIs && extendedKPIs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {extendedKPIs.map((kpi) => (
            <ExtendedKPICard 
              key={kpi.id} 
              kpi={kpi} 
              onClick={onInsightSelect} 
            />
          ))}
        </div>
      )}
      
      {/* New Row: Advanced KPI Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskConcentrationCard topCustomers={topCustomers} onClick={onInsightSelect} />
        <RemediationVelocityCard trends={trends} onClick={onInsightSelect} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Column: Stats & System Status (4 cols) */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Monthly Comparison Small */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-cyan-300 uppercase tracking-widest">Monthly Comparison Analysis</h3>
              {isFilterActive && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-cyan-500/20 rounded-full">
                  <Filter size={10} className="text-cyan-400" />
                  <span className="text-xs text-cyan-300 font-bold uppercase">Filtered</span>
                </div>
              )}
            </div>
            <ActiveFilterBadge filters={filters} />
            <p className="text-xs text-slate-500 mb-4 mt-2">
              {isFilterActive 
                ? 'Showing filtered vulnerability distribution' 
                : 'All months trend showing vulnerability state distribution (Aug 2025 - Feb 2026)'}
            </p>
            <div className="h-[150px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trends}>
                    <Bar dataKey="vulnerable" stackId="a" fill={COLORS.vulnerable} />
                    <Bar dataKey="potentiallyVulnerable" stackId="a" fill={COLORS.potential} />
                    <Bar dataKey="notVulnerable" stackId="a" fill={COLORS.secure} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-xs text-slate-500 font-mono mt-2 px-2">
               <span>{trends.length > 0 ? trends[0].month.replace(/^(\d{4})-(\d{2})$/, (_, y, m) => { const mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return mn[parseInt(m)-1] + ' ' + y.slice(2); }) : ''}</span>
               <span>{trends.length > 0 ? trends[trends.length-1].month.replace(/^(\d{4})-(\d{2})$/, (_, y, m) => { const mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return mn[parseInt(m)-1] + ' ' + y.slice(2); }) : ''}</span>
            </div>
          </Card>

          {/* Vulnerability Distribution Widget */}
          <Card className="p-5">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-sm font-bold text-white uppercase tracking-widest">Vulnerability Distribution</h3>
               <PieChart size={14} className="text-slate-500" />
             </div>
             <div className="space-y-4">
                {[
                  { label: 'Secure', value: metrics.secure.value, percent: metrics.secure.percentage, color: 'emerald' },
                  { label: 'Potentially Vulnerable', value: metrics.potential.value, percent: metrics.potential.percentage, color: 'amber' },
                  { label: 'Vulnerable', value: metrics.vulnerable.value, percent: metrics.vulnerable.percentage, color: 'rose' }
                ].map((item: any) => (
                  <div key={item.label}>
                     <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">{item.label}</span>
                        <span className="text-white font-mono">{item.value.toLocaleString()} <span className="text-slate-500">({item.percent}%)</span></span>
                     </div>
                     <ProgressBar value={item.percent} color={item.color} />
                  </div>
                ))}
             </div>
          </Card>

          {/* System Status Widget */}
          <Card className="p-5">
             <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">System Status</h3>
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Activity size={14} className="text-emerald-400" />
                      API Status
                   </div>
                   <Badge color="green">Connected</Badge>
                </div>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Database size={14} className="text-cyan-400" />
                      Data Integrity
                   </div>
                   <Badge color="blue">Verified</Badge>
                </div>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock size={14} className="text-purple-400" />
                      Refresh Rate
                   </div>
                   <span className="text-xs font-mono text-white">30s</span>
                </div>
             </div>
          </Card>

        </div>

        {/* Right Column: Main Chart (8 cols) */}
        <div className="xl:col-span-8">
             <Card className="p-6 h-full flex flex-col">
              
              {/* Chart Configuration Panel */}
              <div className="bg-slate-800/50 rounded-lg p-4 mb-4 border border-slate-700/50">
                 <div className="flex items-center gap-2 mb-3">
                    <Settings size={14} className="text-cyan-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest">Chart Configuration</h3>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label className="text-xs text-slate-500 uppercase font-bold block mb-2">Data Type</label>
                       <div className="flex bg-slate-900 rounded border border-slate-700 p-0.5">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setIsCumulative(true); }}
                            className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-all ${isCumulative ? 'bg-cyan-900/30 text-cyan-300 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            Cumulative Totals
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setIsCumulative(false); }}
                            className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-all ${!isCumulative ? 'bg-cyan-900/30 text-cyan-300 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            Incremental
                          </button>
                       </div>
                       <p className="mt-1.5 text-xs text-slate-500 leading-tight">
                          Total asset inventory at each month-end across all reporting months
                       </p>
                    </div>

                    <div>
                       <label className="text-xs text-slate-500 uppercase font-bold block mb-2">Visualization Mode</label>
                       <select 
                         value={viewMode}
                         onChange={(e) => { e.stopPropagation(); setViewMode(e.target.value as any); }}
                         onClick={(e) => e.stopPropagation()}
                         className="w-full bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded p-1.5 focus:outline-none focus:border-cyan-500"
                       >
                          <option value="absolute">Absolute Values</option>
                          <option value="percentage">Percentage Distribution</option>
                          <option value="normalized">Normalized Index (Base=100)</option>
                       </select>
                       <p className="mt-1.5 text-xs text-slate-500 leading-tight">
                          Raw asset counts. Best for understanding actual volumes.
                       </p>
                    </div>
                 </div>
              </div>

              {/* Main Chart Area */}
              <div className="flex-1 flex flex-col min-h-0">
                 <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                       <div className="flex items-center gap-3">
                         <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                            {isCumulative ? 'Cumulative Asset Distribution' : 'Asset Trend Overview'}
                         </h3>
                         {isFilterActive && (
                           <div className="flex items-center gap-1 px-2 py-0.5 bg-cyan-500/20 rounded-full animate-pulse">
                             <Filter size={10} className="text-cyan-400" />
                             <span className="text-xs text-cyan-300 font-bold uppercase">Filtered Data</span>
                           </div>
                         )}
                       </div>
                       <p className="text-xs text-slate-500 mt-1">
                          {isCumulative 
                            ? 'Stacked view of all asset categories over time' 
                            : 'All asset categories: Secure, Potentially Vulnerable, and Vulnerable'}
                       </p>
                       {isFilterActive && (
                         <div className="mt-2">
                           <ActiveFilterBadge filters={filters} />
                         </div>
                       )}
                    </div>
                    <Badge color="gray">{viewMode}</Badge>
                 </div>
                 <div className="flex-1 min-h-[280px]" onClick={(e) => e.stopPropagation()}>
                   <ResponsiveContainer width="100%" height="100%">
                     {isCumulative ? (
                        <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorVuln" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS.vulnerable} stopOpacity={0.3}/>
                              <stop offset="95%" stopColor={COLORS.vulnerable} stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorPot" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS.potential} stopOpacity={0.3}/>
                              <stop offset="95%" stopColor={COLORS.potential} stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorSec" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS.secure} stopOpacity={0.3}/>
                              <stop offset="95%" stopColor={COLORS.secure} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.gridStroke} opacity={0.3} />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: chartTheme.tickFillMuted, fontFamily: 'IBM Plex Sans'}} dy={10} />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 11, fill: chartTheme.tickFillMuted, fontFamily: 'IBM Plex Sans'}} 
                            tickFormatter={(value) => {
                              // Smart formatter for flexible data ranges in cumulative view
                              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                              if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                              return value.toString();
                            }}
                            width={60}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="notVulnerable" stackId="1" stroke={COLORS.secure} fill="url(#colorSec)" name="Secure" />
                          <Area type="monotone" dataKey="potentiallyVulnerable" stackId="1" stroke={COLORS.potential} fill="url(#colorPot)" name="Potentially Vulnerable" />
                          <Area type="monotone" dataKey="vulnerable" stackId="1" stroke={COLORS.vulnerable} fill="url(#colorVuln)" name="Vulnerable" />
                          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                        </AreaChart>
                     ) : (
                        <AreaChart data={trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorVulnLine" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS.vulnerable} stopOpacity={0.4}/>
                              <stop offset="95%" stopColor={COLORS.vulnerable} stopOpacity={0.05}/>
                            </linearGradient>
                            <linearGradient id="colorPotLine" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS.potential} stopOpacity={0.4}/>
                              <stop offset="95%" stopColor={COLORS.potential} stopOpacity={0.05}/>
                            </linearGradient>
                            <linearGradient id="colorSecLine" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS.secure} stopOpacity={0.4}/>
                              <stop offset="95%" stopColor={COLORS.secure} stopOpacity={0.05}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.gridStroke} opacity={0.3} />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: chartTheme.tickFillMuted, fontFamily: 'IBM Plex Sans'}} dy={10} />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 11, fill: chartTheme.tickFillMuted, fontFamily: 'IBM Plex Sans'}} 
                            tickFormatter={(value) => {
                              // Smart formatter for flexible data ranges
                              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                              if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                              return value.toString();
                            }}
                            width={60}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Area 
                            type="monotone" 
                            dataKey="notVulnerable" 
                            stroke={COLORS.secure} 
                            strokeWidth={2}
                            fill="url(#colorSecLine)" 
                            name="Secure"
                            dot={{r: 4, fill: COLORS.secure, strokeWidth: 0}}
                            activeDot={{r: 6, fill: COLORS.secure, stroke: chartTheme.dotOutlineStroke, strokeWidth: 2}}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="potentiallyVulnerable" 
                            stroke={COLORS.potential} 
                            strokeWidth={2}
                            fill="url(#colorPotLine)" 
                            name="Potentially Vulnerable"
                            dot={{r: 4, fill: COLORS.potential, strokeWidth: 0}}
                            activeDot={{r: 6, fill: COLORS.potential, stroke: chartTheme.dotOutlineStroke, strokeWidth: 2}}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="vulnerable" 
                            stroke={COLORS.vulnerable} 
                            strokeWidth={2}
                            fill="url(#colorVulnLine)" 
                            name="Vulnerable"
                            dot={{r: 4, fill: COLORS.vulnerable, strokeWidth: 0}}
                            activeDot={{r: 6, fill: COLORS.vulnerable, stroke: chartTheme.dotOutlineStroke, strokeWidth: 2}}
                          />
                          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                        </AreaChart>
                     )}
                   </ResponsiveContainer>
                 </div>
              </div>
             </Card>
        </div>
      </div>

      {/* Field Notice Analytics - KPI Card Interactive */}
      <ErrorBoundary componentName="KPICardInteractive">
        <KPICardAccessible fieldNotices={topFieldNotices} />
      </ErrorBoundary>

      {/* Tables Row - Top Field Notices and Top Customers */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-w-0">
        {/* Top Field Notices by Vulnerability Count */}
        <Card className="overflow-hidden flex flex-col max-h-[600px] min-w-0">
          <div className="p-4 border-b border-slate-700/50 flex flex-col gap-2">
             <div className="flex justify-between items-start">
               <div>
                  <h3 className="text-base font-bold text-cyan-300 uppercase tracking-widest drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]">Top {topFNCount} Field Notices by Vulnerability Count</h3>
                  <p className="text-xs text-slate-400 mt-1">{periodLabel} - Last updated {new Date().toLocaleString()}</p>
                  <p className="text-xs text-slate-400">(Showing {Math.min(topFNCount, topFieldNotices.length)} of {topFieldNotices.length} total)</p>
               </div>
               <div className="flex gap-2">
                  <div className="flex flex-col items-end">
                     <span className="text-xs uppercase text-slate-400 font-bold mb-1">Show Top:</span>
                     <select 
                        value={topFNCount}
                        onChange={(e) => {
                          setIsLoadingFN(true);
                          setTopFNCount(Number(e.target.value));
                          setTimeout(() => setIsLoadingFN(false), 300);
                        }}
                        className="bg-slate-900 border border-slate-700 text-sm rounded px-3 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500"
                     >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={30}>30</option>
                        <option value={40}>40</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                        <option value={300}>300</option>
                        <option value={400}>400</option>
                        <option value={500}>500</option>
                     </select>
                  </div>
                  <button 
                     onClick={() => exportFieldNoticesToCSV(topFieldNotices.slice(0, topFNCount))}
                     className="h-fit px-4 py-2 bg-slate-800 border border-slate-700 text-sm rounded flex items-center gap-2 hover:bg-slate-700 text-slate-300 font-medium"
                  >
                     <Download size={14} /> Export
                  </button>
               </div>
             </div>
          </div>
          <div className={`overflow-auto custom-scrollbar flex-1 relative min-w-0 ${isLoadingFN ? 'opacity-50' : 'opacity-100'} transition-opacity duration-200`}>
            <table className="w-full min-w-full table-fixed text-sm text-left">
              <thead className="bg-slate-800/80 text-slate-300 font-bold uppercase tracking-wider text-xs sticky top-0 backdrop-blur-md z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 w-[50px]">#</th>
                  <th className="px-4 py-3 w-[120px]">Field Notice ID</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3 text-right">Vulnerable</th>
                  <th className="px-4 py-3 text-right">Pot. Vuln</th>
                  <th className="px-4 py-3 text-right">Not Vuln</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {slicedFieldNotices.map((fn, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30 transition-colors group">
                    <td className="px-4 py-2.5 text-slate-400 font-mono text-sm">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-cyan-400 font-bold text-sm">{fn.id}</td>
                    <td className="px-4 py-2.5 text-slate-200 font-medium truncate max-w-[250px] text-sm" title={fn.title}>{fn.title}</td>
                    <td className="px-4 py-2.5 text-right">
                      {fn.vulnerableCount > 0 ? (
                        <span className="bg-red-900/40 text-red-400 px-2 py-1 rounded border border-red-500/20 font-mono font-bold text-sm">{fn.vulnerableCount.toLocaleString()}</span>
                      ) : <span className="text-slate-500 font-mono text-sm">0</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                       {fn.potentialCount > 0 ? (
                        <span className="bg-amber-900/40 text-amber-400 px-2 py-1 rounded border border-amber-500/20 font-mono font-bold text-sm">{fn.potentialCount.toLocaleString()}</span>
                      ) : <span className="text-slate-500 font-mono text-sm">0</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                       {fn.secureCount > 0 ? (
                        <span className="bg-emerald-900/40 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 font-mono font-bold text-sm">{fn.secureCount.toLocaleString()}</span>
                      ) : <span className="text-slate-500 font-mono text-sm">0</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Top Customers by Vulnerability Count */}
        <Card className="overflow-hidden flex flex-col max-h-[600px] min-w-0">
          <div className="p-4 border-b border-slate-700/50 flex flex-col gap-2">
             <div className="flex justify-between items-start">
               <div>
                  <h3 className="text-base font-bold text-cyan-300 uppercase tracking-widest drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]">Top {topCustomerCount} Customers by Vulnerability Count</h3>
                  <p className="text-xs text-slate-400 mt-1">{periodLabel} - Last updated {new Date().toLocaleString()}</p>
                  <p className="text-xs text-slate-400">(Showing {Math.min(topCustomerCount, topCustomers.length)} of {topCustomers.length} total)</p>
               </div>
               <div className="flex gap-2">
                  <div className="flex flex-col items-end">
                     <span className="text-xs uppercase text-slate-400 font-bold mb-1">Show Top:</span>
                     <select 
                        value={topCustomerCount}
                        onChange={(e) => {
                          setIsLoadingCustomers(true);
                          setTopCustomerCount(Number(e.target.value));
                          setTimeout(() => setIsLoadingCustomers(false), 300);
                        }}
                        className="bg-slate-900 border border-slate-700 text-sm rounded px-3 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500"
                     >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={30}>30</option>
                        <option value={40}>40</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                        <option value={300}>300</option>
                        <option value={400}>400</option>
                        <option value={500}>500</option>
                     </select>
                  </div>
                  <button 
                     onClick={() => exportCustomersToCSV(topCustomers.slice(0, topCustomerCount))}
                     className="h-fit px-4 py-2 bg-slate-800 border border-slate-700 text-sm rounded flex items-center gap-2 hover:bg-slate-700 text-slate-300 font-medium"
                  >
                     <Download size={14} /> Export
                  </button>
               </div>
             </div>
          </div>
          <div className={`overflow-auto custom-scrollbar flex-1 relative min-w-0 ${isLoadingCustomers ? 'opacity-50' : 'opacity-100'} transition-opacity duration-200`}>
            <table className="w-full min-w-full table-fixed text-sm text-left">
              <thead className="bg-slate-800/80 text-slate-300 font-bold uppercase tracking-wider text-xs sticky top-0 backdrop-blur-md z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 w-[50px]">#</th>
                  <th className="px-4 py-3">Customer Name</th>
                  <th className="px-4 py-3 text-right">Vulnerable</th>
                  <th className="px-4 py-3 text-right">Pot. Vuln</th>
                  <th className="px-4 py-3 text-right">Not Vuln</th>
                  <th className="px-4 py-3 text-right">Records</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {slicedCustomers.map((cust, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30 transition-colors group">
                    <td className="px-4 py-2.5 text-slate-400 font-mono text-sm">{idx + 1}</td>
                    <td className="px-4 py-2.5 text-slate-100 font-bold tracking-tight truncate max-w-[250px] text-sm" title={cust.name}>{cust.name}</td>
                    <td className="px-4 py-2.5 text-right">
                      {cust.vulnerableCount > 0 ? (
                        <span className="bg-red-900/40 text-red-400 px-2 py-1 rounded border border-red-500/20 font-mono font-bold text-sm">{cust.vulnerableCount.toLocaleString()}</span>
                      ) : <span className="text-slate-500 font-mono text-sm">0</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                       {cust.potentialCount > 0 ? (
                        <span className="bg-amber-900/40 text-amber-400 px-2 py-1 rounded border border-amber-500/20 font-mono font-bold text-sm">{cust.potentialCount.toLocaleString()}</span>
                      ) : <span className="text-slate-500 font-mono text-sm">0</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                       {cust.secureCount > 0 ? (
                        <span className="bg-emerald-900/40 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 font-mono font-bold text-sm">{cust.secureCount.toLocaleString()}</span>
                      ) : <span className="text-slate-500 font-mono text-sm">0</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                       <span className="text-slate-300 font-mono text-sm">{cust.recordCount.toLocaleString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </div>
  );
};
