/**
 * Comprehensive Statistics Dashboard
 * 
 * A unified interface consolidating all key metrics with AI/ML-driven insights,
 * sophisticated animations, and professional data visualization.
 * 
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ComposedChart, Scatter, ReferenceLine
} from 'recharts';
import {
  Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Info,
  Sparkles, Target, Shield, Activity, Zap, Eye, RefreshCw, Download,
  ChevronRight, ArrowUpRight, ArrowDownRight, Minus, BarChart3, PieChart as PieIcon,
  LineChart as LineIcon, Gauge, Clock, Users, FileWarning, Layers,
  ChevronDown, ChevronUp, X, Play, Pause, Settings, Maximize2, ArrowLeft,
  LayoutDashboard, Network, Lightbulb, GitBranch, Cpu
} from 'lucide-react';
import { Card, Badge } from './ui/Card';
import { ThemeToggle } from './ThemeToggle';
import { useChartTheme } from '../hooks/useChartTheme';
import { EnhancedAnalyticsDashboard } from './EnhancedAnalyticsDashboard';
import { CircuitInsightsDashboard } from './CircuitInsightsDashboard';
import { MOCK_DATA } from '../constants';
import { useCountUp, useStaggeredAnimation, useAnimatedValue } from '../utils/animationUtils';
import { reportClientError } from '../utils/monitoring';
import { aiAnalytics, type PatternAnalysis, type TrendForecast, type IntelligentRecommendation, type DataInsight } from '../services/aiAnalyticsService';
import type { DashboardData, Metric, MonthlyTrend, Customer, FieldNotice, InsightData } from '../types';
import CalculationMethodologyModal from './CalculationMethodologyModal';
import { kpiMethodologies } from '../data/kpiMethodologies';

// ==================== TYPES ====================

interface ComprehensiveStatsDashboardProps {
  data: DashboardData;
  onInsightSelect: (insight: InsightData) => void;
  onClose: () => void;
  isLoading?: boolean;
}

interface StatCardProps {
  title: string;
  value: number | string;
  subtext: string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  trendDirection?: 'up' | 'down' | 'stable';
  isLoading?: boolean;
  onClick?: () => void;
  animationDelay?: number;
  methodologyId?: string;  // optional override; defaults to title → kebab-case lookup
  // Enhanced AI/ML Properties
  enableAIAnalysis?: boolean;
  metricType?: 'assets' | 'security' | 'vulnerability' | 'performance' | 'compliance';
  targetValue?: number;
  historicalData?: number[];
  aiInsightAvailable?: boolean;
  processingML?: boolean;
}

interface AIInsightPanelProps {
  insights: DataInsight[];
  onSelectInsight: (insight: DataInsight) => void;
  onMLAnalyze?: (title: string, summary: string) => void;
}

interface PatternVisualizerProps {
  patterns: PatternAnalysis[];
  trends: MonthlyTrend[];
  onPatternAnalyze?: (label: string, value: string) => void;
}

interface ForecastChartProps {
  forecast: TrendForecast;
  height?: number;
  onMetricClick?: (label: string, value: string) => void;
}

interface RecommendationCardProps {
  recommendation: IntelligentRecommendation;
  onClick: () => void;
  onMLAnalyze?: (title: string, description: string) => void;
  animationDelay?: number;
}

// ==================== HELPER COMPONENTS ====================

const AnimatedStatCard: React.FC<StatCardProps> = ({
  title, value, subtext, icon, color, trend, trendDirection, isLoading, onClick, animationDelay = 0, processingML = false, methodologyId
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);
  const numericValue = typeof value === 'number' ? value : parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
  const { formattedValue, isAnimating } = useCountUp(numericValue, {
    duration: 2000,
    decimals: numericValue < 100 ? 1 : 0,
    separator: ','
  });

  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400',
    green: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400',
    rose: 'from-rose-500/20 to-rose-600/5 border-rose-500/30 text-rose-400',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/30 text-purple-400',
    cyan: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30 text-cyan-400'
  };

  const glowClasses: Record<string, string> = {
    blue: 'shadow-blue-500/20',
    green: 'shadow-emerald-500/20',
    amber: 'shadow-amber-500/20',
    rose: 'shadow-rose-500/20',
    purple: 'shadow-purple-500/20',
    cyan: 'shadow-cyan-500/20'
  };

  // Only make card interactive if onClick is provided
  const isClickable = !!onClick;
  // Check whether a methodology entry exists for this card
  const resolvedMethodologyKey = methodologyId ?? title.toLowerCase().replace(/\s+/g, '-');
  const hasMethodology = resolvedMethodologyKey in kpiMethodologies;
  
  return (
    <>
    <div
      className={`
        relative overflow-hidden rounded-xl border bg-gradient-to-br backdrop-blur-xl
        transition-all duration-500 group
        ${isClickable ? 'cursor-pointer hover:scale-[1.02] hover:-translate-y-1' : 'cursor-default'}
        ${colorClasses[color]}
        ${isHovered ? `shadow-xl ${glowClasses[color]}` : 'shadow-md'}
      `}
      style={{ 
        animationDelay: `${animationDelay}ms`,
        animation: 'fadeSlideUp 0.6s ease-out forwards',
        opacity: 0 
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      onTouchStart={isClickable ? (e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0.8'; } : undefined}
      onTouchEnd={isClickable ? (e) => { (e.currentTarget as HTMLDivElement).style.opacity = ''; e.preventDefault(); onClick?.(); } : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `Analyze ${title} with AI/ML` : undefined}
      aria-busy={processingML || undefined}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }} />
      </div>

      {/* AI Processing Overlay */}
      {processingML && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm rounded-xl">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw size={18} className="animate-spin text-cyan-400" />
            <span className="text-xs text-cyan-400 font-medium">Analyzing…</span>
          </div>
        </div>
      )}

      {/* Glow Effect */}
      <div className={`
        absolute -inset-1 bg-gradient-to-r rounded-xl opacity-0 blur-xl transition-opacity duration-500
        ${isHovered ? 'opacity-30' : ''}
        ${color === 'blue' ? 'from-blue-400 to-cyan-400' : ''}
        ${color === 'green' ? 'from-emerald-400 to-green-400' : ''}
        ${color === 'amber' ? 'from-amber-400 to-yellow-400' : ''}
        ${color === 'rose' ? 'from-rose-400 to-red-400' : ''}
        ${color === 'purple' ? 'from-purple-400 to-violet-400' : ''}
        ${color === 'cyan' ? 'from-cyan-400 to-teal-400' : ''}
      `} />

      <div className="relative p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`
            p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50
            transition-transform duration-300
            ${isHovered ? 'scale-110' : ''}
          `}>
            {icon}
          </div>

          {/* Right side: optional info button + trend badge */}
          <div className="flex items-center gap-1.5">
            {hasMethodology && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowMethodologyModal(true); }}
                className="p-1 rounded-lg text-slate-600 hover:text-cyan-300 hover:bg-slate-700/60 transition-all border border-transparent hover:border-slate-600/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 relative z-10"
                aria-label={`View calculation methodology for ${title}`}
                title="Calculation Methodology"
                tabIndex={0}
              >
                <Info size={11} />
              </button>
            )}
            {trend !== undefined && (
              <div className={`
                flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full
                ${trendDirection === 'up' ? 'bg-emerald-500/20 text-emerald-400' : ''}
                ${trendDirection === 'down' ? 'bg-rose-500/20 text-rose-400' : ''}
                ${trendDirection === 'stable' ? 'bg-slate-500/20 text-slate-400' : ''}
              `}>
                {trendDirection === 'up' && <ArrowUpRight size={12} />}
                {trendDirection === 'down' && <ArrowDownRight size={12} />}
                {trendDirection === 'stable' && <Minus size={12} />}
                {Math.abs(trend).toFixed(1)}%
              </div>
            )}
          </div>
        </div>

        <div className="mb-1">
          <span className="metric-tertiary font-mono">
            {isLoading || isAnimating ? formattedValue : (typeof value === 'number' ? value.toLocaleString() : value)}
          </span>
        </div>

        <h4 className="label-display text-slate-200 mb-1">{title}</h4>
        <p className="text-description">{subtext}</p>

        {/* AI Analyze Hint Badge */}
        {isClickable && !processingML && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-slate-900/80 border border-slate-700/60 pointer-events-none z-10">
            <Zap size={9} className="text-cyan-400" />
            <span className="text-cyan-400 font-medium">Analyze</span>
          </div>
        )}

        {/* Hover Indicator */}
        <div className={`
          absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r
          transform transition-transform duration-300 origin-left
          ${isHovered ? 'scale-x-100' : 'scale-x-0'}
          ${color === 'blue' ? 'from-blue-400 to-cyan-400' : ''}
          ${color === 'green' ? 'from-emerald-400 to-green-400' : ''}
          ${color === 'amber' ? 'from-amber-400 to-yellow-400' : ''}
          ${color === 'rose' ? 'from-rose-400 to-red-400' : ''}
          ${color === 'purple' ? 'from-purple-400 to-violet-400' : ''}
          ${color === 'cyan' ? 'from-cyan-400 to-teal-400' : ''}
        `} />
      </div>
    </div>

    {/* Calculation Methodology Modal */}
    <CalculationMethodologyModal
      isOpen={showMethodologyModal}
      onClose={() => setShowMethodologyModal(false)}
      methodologyKey={resolvedMethodologyKey}
    />
    </>
  );
};

const AIInsightPanel: React.FC<AIInsightPanelProps> = ({ insights, onSelectInsight, onMLAnalyze }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const severityColors = {
    info: 'border-blue-500/30 bg-blue-500/10',
    warning: 'border-amber-500/30 bg-amber-500/10',
    critical: 'border-rose-500/30 bg-rose-500/10'
  };

  const severityIcons = {
    info: <Info size={16} className="text-blue-400" />,
    warning: <AlertTriangle size={16} className="text-amber-400" />,
    critical: <AlertTriangle size={16} className="text-rose-400" />
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="text-purple-400" size={20} />
        <h3 className="text-sm font-bold text-white uppercase tracking-widest">AI-Generated Insights</h3>
        <Badge color="blue">Live</Badge>
      </div>

      {insights.map((insight, index) => (
        <div
          key={insight.id}
          className={`
            border rounded-lg p-4 cursor-pointer transition-all duration-300
            hover:shadow-lg group
            ${severityColors[insight.severity]}
          `}
          style={{
            animation: `fadeSlideUp 0.5s ease-out ${index * 100}ms forwards`,
            opacity: 0
          }}
          onClick={() => {
            setExpandedId(expandedId === insight.id ? null : insight.id);
            onSelectInsight(insight);
          }}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{severityIcons[insight.severity]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-white truncate">{insight.title}</h4>
                <span className="text-xs text-slate-500 font-mono ml-2">
                  {insight.confidence.toFixed(0)}% conf.
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">{insight.summary}</p>
              
              {expandedId === insight.id && (
                <div className="mt-3 pt-3 border-t border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-xs text-slate-300 mb-3">{insight.details}</p>
                  {insight.actions && insight.actions.length > 0 && (
                    <div className="space-y-1 mb-3">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Recommended Actions:
                      </span>
                      {insight.actions.map((action, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                          <ChevronRight size={12} className="text-cyan-400" />
                          {action}
                        </div>
                      ))}
                    </div>
                  )}
                  {onMLAnalyze && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnalyzingId(insight.id);
                        setTimeout(() => setAnalyzingId(null), 800);
                        onMLAnalyze(insight.title, insight.summary);
                      }}
                      disabled={analyzingId === insight.id}
                      aria-label={`Run ML deep-dive on ${insight.title}`}
                      aria-busy={analyzingId === insight.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/25 transition-all active:scale-95 touch-manipulation disabled:opacity-60"
                    >
                      {analyzingId === insight.id
                        ? <><RefreshCw size={11} className="animate-spin" /> Queuing…</>
                        : <><Brain size={11} /> ML Deep Dive</>}
                    </button>
                  )}
                </div>
              )}
            </div>
            <ChevronDown 
              size={16} 
              className={`text-slate-500 transition-transform duration-300 ${expandedId === insight.id ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const PatternVisualizer: React.FC<PatternVisualizerProps> = ({ patterns, trends, onPatternAnalyze }) => {
  const chartTheme = useChartTheme();
  const [selectedPattern, setSelectedPattern] = useState<PatternAnalysis | null>(null);
  const [analyzingPatternId, setAnalyzingPatternId] = useState<string | null>(null);

  const patternTypeIcons = {
    trend: <TrendingUp size={14} />,
    seasonal: <RefreshCw size={14} />,
    anomaly: <AlertTriangle size={14} />,
    correlation: <Layers size={14} />,
    cyclical: <Activity size={14} />
  };

  const patternTypeColors = {
    trend: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
    seasonal: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
    anomaly: 'text-rose-400 bg-rose-500/20 border-rose-500/30',
    correlation: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30',
    cyclical: 'text-amber-400 bg-amber-500/20 border-amber-500/30'
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="text-cyan-400" size={20} />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Pattern Detection</h3>
        </div>
        <span className="text-xs text-slate-500 font-mono">{patterns.length} patterns found</span>
      </div>

      {/* Pattern Tags */}
      <div className="flex flex-wrap gap-2">
        {patterns.map((pattern) => (
          <button
            key={pattern.id}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium
              transition-all duration-200 hover:scale-105
              ${patternTypeColors[pattern.type]}
              ${selectedPattern?.id === pattern.id ? 'ring-2 ring-white/20' : ''}
            `}
            aria-label={`View ${pattern.type} pattern details — ${pattern.confidence.toFixed(0)}% confidence`}
            aria-pressed={selectedPattern?.id === pattern.id}
            onClick={() => setSelectedPattern(selectedPattern?.id === pattern.id ? null : pattern)}
          >
            {patternTypeIcons[pattern.type]}
            <span className="capitalize">{pattern.type}</span>
            <span className="opacity-60">{pattern.confidence.toFixed(0)}%</span>
          </button>
        ))}
      </div>

      {/* Pattern Details */}
      {selectedPattern && (
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {patternTypeIcons[selectedPattern.type]}
              <span className="text-sm font-semibold text-white capitalize">{selectedPattern.type} Pattern</span>
            </div>
            <button onClick={() => setSelectedPattern(null)}>
              <X size={16} className="text-slate-500 hover:text-white transition-colors" />
            </button>
          </div>
          <p className="text-xs text-slate-300 mb-3">{selectedPattern.description}</p>
          <div className="flex items-center gap-4 text-xs mb-3">
            <div>
              <span className="text-slate-500">Confidence:</span>
              <span className="text-white font-mono ml-1">{selectedPattern.confidence.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-slate-500">Impact:</span>
              <span className={`ml-1 font-semibold capitalize ${
                selectedPattern.impact === 'high' ? 'text-rose-400' :
                selectedPattern.impact === 'medium' ? 'text-amber-400' : 'text-slate-400'
              }`}>{selectedPattern.impact}</span>
            </div>
          </div>

          {onPatternAnalyze && (
            <button
              onClick={() => {
                setAnalyzingPatternId(selectedPattern.id);
                setTimeout(() => setAnalyzingPatternId(null), 800);
                onPatternAnalyze(
                  `${selectedPattern.type} Pattern`,
                  `${selectedPattern.confidence.toFixed(0)}% conf · Impact: ${selectedPattern.impact}`
                );
              }}
              disabled={analyzingPatternId === selectedPattern.id}
              aria-label={`Run AI/ML analysis on ${selectedPattern.type} pattern`}
              aria-busy={analyzingPatternId === selectedPattern.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/25 transition-all active:scale-95 touch-manipulation disabled:opacity-60 w-full justify-center"
            >
              {analyzingPatternId === selectedPattern.id
                ? <><RefreshCw size={11} className="animate-spin" /> Queuing…</>
                : <><Brain size={11} /> Run AI/ML Analysis</>}
            </button>
          )}
          
          {/* Visualization */}
          {selectedPattern.visualization && (
            <div className="mt-4 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedPattern.visualization.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fill: chartTheme.tickFillMuted, fontSize: 10 }} />
                  <YAxis hide />
                  <Line 
                    type="monotone" 
                    dataKey="y" 
                    stroke="#06b6d4" 
                    strokeWidth={2}
                    dot={{ fill: '#06b6d4', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Trend Visualization */}
      {trends.length > 0 && (
        <div className="h-48 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="gradVuln" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gradPot" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gradSec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} opacity={0.3} />
              <XAxis dataKey="month" tick={{ fill: chartTheme.tickFillMuted, fontSize: 10 }} />
              <YAxis hide />
              <Tooltip 
                contentStyle={chartTheme.tooltipStyle}
              />
              <Area type="monotone" dataKey="secure" stackId="1" stroke="#10b981" fill="url(#gradSec)" />
              <Area type="monotone" dataKey="potential" stackId="1" stroke="#f59e0b" fill="url(#gradPot)" />
              <Area type="monotone" dataKey="vulnerable" stackId="1" stroke="#ef4444" fill="url(#gradVuln)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

const ForecastChart: React.FC<ForecastChartProps> = ({ forecast, height = 200, onMetricClick }) => {
  const chartTheme = useChartTheme();
  const [analyzingMetric, setAnalyzingMetric] = useState<string | null>(null);

  const handleMetricClick = (label: string, value: string) => {
    if (!onMetricClick) return;
    setAnalyzingMetric(label);
    setTimeout(() => setAnalyzingMetric(null), 800);
    onMetricClick(label, value);
  };

  const chartData = useMemo(() => {
    const historical = forecast.forecastedValues.slice(0, 0); // Use actual historical if available
    const projected = forecast.forecastedValues.map(f => ({
      date: f.date,
      value: f.value,
      upper: f.upperBound,
      lower: f.lowerBound,
      confidence: f.confidence,
      isProjected: true
    }));
    
    // Add current value as starting point
    return [
      { date: 'Current', value: forecast.currentValue, isProjected: false },
      ...projected
    ];
  }, [forecast]);

  const trendColors = {
    increasing: '#ef4444',
    decreasing: '#10b981',
    stable: '#3b82f6',
    volatile: '#f59e0b'
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="text-indigo-400" size={18} />
          <h4 className="text-sm font-semibold text-white">{forecast.metricLabel}</h4>
        </div>
        {onMetricClick ? (
          <button
            onClick={() => handleMetricClick('Trend Direction', forecast.trendDirection)}
            disabled={analyzingMetric === 'Trend Direction'}
            aria-label={`Analyze Trend Direction (${forecast.trendDirection}) with AI/ML`}
            aria-busy={analyzingMetric === 'Trend Direction'}
            className={`
              group flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all duration-200
              hover:scale-105 active:scale-95 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
              disabled:opacity-60
              ${forecast.trendDirection === 'increasing' ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/35' : ''}
              ${forecast.trendDirection === 'decreasing' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/35' : ''}
              ${forecast.trendDirection === 'stable' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/35' : ''}
              ${forecast.trendDirection === 'volatile' ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/35' : ''}
            `}
          >
            {analyzingMetric === 'Trend Direction' ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : (
              <>
                {forecast.trendDirection === 'increasing' && <TrendingUp size={12} />}
                {forecast.trendDirection === 'decreasing' && <TrendingDown size={12} />}
                {forecast.trendDirection === 'stable' && <Minus size={12} />}
                {forecast.trendDirection === 'volatile' && <Activity size={12} />}
              </>
            )}
            <span className="capitalize">{forecast.trendDirection}</span>
            <Zap size={8} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ) : (
          <div className={`
            flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
            ${forecast.trendDirection === 'increasing' ? 'bg-rose-500/20 text-rose-400' : ''}
            ${forecast.trendDirection === 'decreasing' ? 'bg-emerald-500/20 text-emerald-400' : ''}
            ${forecast.trendDirection === 'stable' ? 'bg-blue-500/20 text-blue-400' : ''}
            ${forecast.trendDirection === 'volatile' ? 'bg-amber-500/20 text-amber-400' : ''}
          `}>
            {forecast.trendDirection === 'increasing' && <TrendingUp size={12} />}
            {forecast.trendDirection === 'decreasing' && <TrendingDown size={12} />}
            {forecast.trendDirection === 'stable' && <Minus size={12} />}
            {forecast.trendDirection === 'volatile' && <Activity size={12} />}
            <span className="capitalize">{forecast.trendDirection}</span>
          </div>
        )}
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={trendColors[forecast.trendDirection]} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={trendColors[forecast.trendDirection]} stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} opacity={0.3} />
            <XAxis dataKey="date" tick={{ fill: chartTheme.tickFillMuted, fontSize: 10 }} />
            <YAxis tick={{ fill: chartTheme.tickFillMuted, fontSize: 10 }} width={60} tickFormatter={(v) => (v / 1000000).toFixed(1) + 'M'} />
            <Tooltip 
              contentStyle={chartTheme.tooltipStyle}
              formatter={(value: number) => [value.toLocaleString(), 'Forecast']}
            />
            
            {/* Confidence Interval */}
            <Area 
              type="monotone" 
              dataKey="upper"
              stroke="transparent"
              fill={trendColors[forecast.trendDirection]}
              fillOpacity={0.1}
            />
            
            {/* Main Forecast Line */}
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={trendColors[forecast.trendDirection]}
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={payload.isProjected ? 4 : 6}
                    fill={payload.isProjected ? trendColors[forecast.trendDirection] : '#fff'}
                    stroke={trendColors[forecast.trendDirection]}
                    strokeWidth={2}
                    strokeDasharray={payload.isProjected ? '4 2' : '0'}
                  />
                );
              }}
            />
            
            {/* Reference Line at Current */}
            <ReferenceLine 
              x="Current" 
              stroke={chartTheme.referenceLineStroke} 
              strokeDasharray="3 3"
              label={{ value: 'Now', fill: chartTheme.tickFillMuted, fontSize: 10 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        {([
          { label: 'Trend Strength', value: `${forecast.trendStrength.toFixed(0)}%` },
          { label: 'Change Rate', value: `${forecast.changeRate.toFixed(1)}%/mo` },
          { label: 'Anomaly Risk', value: `${forecast.anomalyProbability.toFixed(0)}%` },
        ] as const).map((metric) => (
          onMetricClick ? (
            <button
              key={metric.label}
              onClick={() => handleMetricClick(metric.label, metric.value)}
              disabled={analyzingMetric === metric.label}
              aria-label={`Analyze ${metric.label} (${metric.value}) with AI/ML`}
              aria-busy={analyzingMetric === metric.label}
              className="group relative text-center px-2 py-2 rounded-lg transition-all duration-200
                hover:bg-indigo-500/10 hover:scale-105 active:scale-95 touch-manipulation
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                disabled:opacity-60 border border-transparent hover:border-indigo-500/20"
            >
              <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
                {metric.label}
                <Zap size={8} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
              {analyzingMetric === metric.label ? (
                <RefreshCw size={14} className="animate-spin text-indigo-400 mx-auto mt-0.5" />
              ) : (
                <p className="text-sm font-bold text-white font-mono">{metric.value}</p>
              )}
            </button>
          ) : (
            <div key={metric.label}>
              <p className="text-xs text-slate-500">{metric.label}</p>
              <p className="text-sm font-bold text-white">{metric.value}</p>
            </div>
          )
        ))}
      </div>
    </div>
  );
};

const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation, onClick, onMLAnalyze, animationDelay = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [analyzingML, setAnalyzingML] = useState(false);

  const handleMLAnalyze = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onMLAnalyze) return;
    setAnalyzingML(true);
    setTimeout(() => setAnalyzingML(false), 800);
    onMLAnalyze(recommendation.title, recommendation.description);
  };

  const priorityGlow: Record<string, string> = {
    critical: 'hover:shadow-rose-500/20 hover:border-rose-500/50',
    high: 'hover:shadow-amber-500/20 hover:border-amber-500/50',
    medium: 'hover:shadow-blue-500/20 hover:border-blue-500/50',
    low: 'hover:shadow-slate-500/20 hover:border-slate-500/50',
  };

  const priorityColors = {
    critical: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
    high: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    medium: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    low: 'border-slate-500/30 bg-slate-500/10 text-slate-400'
  };

  const categoryIcons = {
    security: <Shield size={16} />,
    performance: <Zap size={16} />,
    cost: <BarChart3 size={16} />,
    compliance: <FileWarning size={16} />,
    efficiency: <Activity size={16} />
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label={`${recommendation.priority} priority: ${recommendation.title}`}
      className={`
        group border rounded-lg overflow-hidden transition-all duration-300
        hover:shadow-lg cursor-pointer
        ${priorityColors[recommendation.priority]}
        ${priorityGlow[recommendation.priority]}
      `}
      style={{
        animation: `fadeSlideUp 0.5s ease-out ${animationDelay}ms forwards`,
        opacity: 0
      }}
      onClick={() => {
        setIsExpanded(!isExpanded);
        onClick();
      }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsExpanded(!isExpanded); onClick(); } }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 p-2 rounded-lg bg-slate-800/50">
            {categoryIcons[recommendation.category]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`
                text-xs font-bold uppercase px-2 py-0.5 rounded
                ${priorityColors[recommendation.priority]}
              `}>
                {recommendation.priority}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {recommendation.confidence}% conf.
              </span>
            </div>
            <h4 className="text-sm font-semibold text-white mb-1">{recommendation.title}</h4>
            <p className="text-xs text-slate-400 line-clamp-2">{recommendation.description}</p>
          </div>
          <ChevronDown 
            size={16} 
            className={`text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-700/30 pt-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">Expected Impact</p>
              <p className="text-xs text-white">{recommendation.expectedImpact}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Time to Value</p>
              <p className="text-xs text-white">{recommendation.estimatedTimeToValue}</p>
            </div>
          </div>

          <div className="mb-3">
            <p className="text-xs text-slate-500 mb-2">Action Steps:</p>
            <div className="space-y-1.5">
              {recommendation.actionSteps.slice(0, 3).map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="text-cyan-400 font-mono">{i + 1}.</span>
                  {step}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-700/30">
            <span className="text-xs text-slate-500">Effort: <span className="text-white capitalize">{recommendation.implementationEffort}</span></span>
            <div className="flex items-center gap-2">
              {onMLAnalyze && (
                <button
                  onClick={handleMLAnalyze}
                  disabled={analyzingML}
                  aria-label={`Run ML analysis on ${recommendation.title}`}
                  aria-busy={analyzingML}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold
                    bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/25
                    transition-all active:scale-95 touch-manipulation disabled:opacity-60
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                  {analyzingML ? <RefreshCw size={10} className="animate-spin" /> : <Brain size={10} />}
                  {analyzingML ? 'Queuing…' : 'ML Analysis'}
                </button>
              )}
              <button
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1
                  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 rounded"
              >
                View Details <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== CARD ANALYSIS MODAL ====================

interface CardAnalysisModalProps {
  open: boolean;
  card: { title: string; value: number | string; subtext: string; color: string } | null;
  mlLoading: boolean;
  mlData: any;
  mlError: string | null;
  onClose: () => void;
  onRetry: () => void;
}

const CardAnalysisModal: React.FC<CardAnalysisModalProps> = ({
  open, card, mlLoading, mlData, mlError, onClose, onRetry
}) => {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !card) return null;

  const borderClass: Record<string, string> = {
    blue: 'border-blue-500/40', green: 'border-emerald-500/40',
    amber: 'border-amber-500/40', rose: 'border-rose-500/40',
    purple: 'border-purple-500/40', cyan: 'border-cyan-500/40',
    indigo: 'border-indigo-500/40'
  };
  const textClass: Record<string, string> = {
    blue: 'text-blue-400', green: 'text-emerald-400',
    amber: 'text-amber-400', rose: 'text-rose-400',
    purple: 'text-purple-400', cyan: 'text-cyan-400',
    indigo: 'text-indigo-400'
  };
  const normalizeConf = (v: any) =>
    typeof v === 'number' ? `${v}%` : String(v ?? '—').replace(/%%$/, '%');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`AI Analysis: ${card.title}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`relative w-full max-w-lg max-h-[85vh] flex flex-col bg-slate-900 rounded-2xl border ${
        borderClass[card.color] ?? 'border-slate-700'
      } shadow-2xl overflow-hidden`}>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
              <Brain size={18} className={textClass[card.color] ?? 'text-cyan-400'} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">{card.title}</h2>
              <p className="text-xs text-slate-500">{card.subtext}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!mlLoading && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30 transition-all active:scale-95 touch-manipulation"
                aria-label="Retry AI analysis"
              >
                <RefreshCw size={11} /> Refresh
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
              aria-label="Close modal"
            >
              <X size={18} className="text-slate-400 hover:text-white" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Current value chip */}
          <div className={`p-3 rounded-xl bg-slate-800/40 border ${
            borderClass[card.color] ?? 'border-slate-700/40'
          } flex items-center justify-between`}>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Current Value</p>
              <p className={`text-xl font-bold font-mono ${
                textClass[card.color] ?? 'text-white'
              }`}>
                {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-0.5">AI Status</p>
              <p className={`text-xs font-bold ${
                mlLoading ? 'text-cyan-400' : mlData ? 'text-emerald-400' : mlError ? 'text-amber-400' : 'text-slate-500'
              }`}>
                {mlLoading ? 'Analyzing…' : mlData ? 'Ready' : mlError ? 'Error' : 'Pending'}
              </p>
            </div>
          </div>

          {/* Error banner */}
          {mlError && !mlLoading && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-amber-300 font-medium">Analysis failed</p>
                <p className="text-xs text-amber-400/70 mt-0.5">{mlError}</p>
                <button
                  onClick={onRetry}
                  className="mt-2 text-xs text-cyan-400 underline hover:text-cyan-300 active:scale-95 touch-manipulation"
                >Try again</button>
              </div>
            </div>
          )}

          {/* Loading skeleton */}
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

          {/* ML Results */}
          {mlData && !mlLoading && (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
                {[
                  { label: 'ML Trend',     value: String(mlData.trend ?? 'Stable'), cls: 'text-cyan-400' },
                  { label: 'Confidence',   value: normalizeConf(mlData.confidenceLevel), cls: 'text-emerald-400' },
                  { label: 'Anomalies',    value: String(mlData.anomaliesDetected ?? 0), cls: 'text-rose-400' },
                  { label: 'Risk Factors', value: String(mlData.riskFactorsIdentified ?? 0), cls: 'text-amber-400' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="text-center">
                    <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                    <p className={`text-sm font-bold ${cls} capitalize`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              {mlData.recommendations?.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Target size={12} className="text-cyan-400" /> AI Recommendations
                  </h3>
                  <ul className="space-y-1.5">
                    {mlData.recommendations.slice(0, 4).map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs px-2 py-1.5 rounded-lg hover:bg-slate-800/40 transition-colors">
                        <span className="text-cyan-400 font-bold mt-0.5 flex-shrink-0">→</span>
                        <span className="text-slate-300">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Est. resolution */}
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
          <p className="text-xs text-slate-600 flex items-center gap-1">
            <Sparkles size={10} className="text-purple-500" /> Powered by CIRCUIT AI
          </p>
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-white transition-colors active:scale-95 touch-manipulation"
          >Close</button>
        </div>
      </div>
    </div>
  );
};

// ==================== PERFORMANCE GAUGE ====================

const PerformanceGauge: React.FC<{ 
  value: number; 
  max: number; 
  label: string; 
  color: string;
}> = ({ value, max, label, color }) => {
  const chartTheme = useChartTheme();
  const percentage = (value / max) * 100;
  const animatedValue = useAnimatedValue(percentage, { duration: 1500, easing: 'easeOut' });
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (animatedValue / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background Circle */}
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke={chartTheme.ringTrackStroke}
            strokeWidth="8"
          />
          {/* Progress Circle */}
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            style={{
              filter: `drop-shadow(0 0 6px ${color})`
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white font-mono">{Math.round(animatedValue)}%</span>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-2 text-center">{label}</p>
    </div>
  );
};

// ==================== TAB METADATA ====================

const TAB_META = [
  { key: 'overview'        as const, label: 'Overview',       icon: <LayoutDashboard size={13} />, color: 'cyan'   },
  { key: 'patterns'        as const, label: 'Patterns',        icon: <Activity        size={13} />, color: 'purple' },
  { key: 'forecast'        as const, label: 'Forecast',        icon: <TrendingUp      size={13} />, color: 'indigo' },
  { key: 'recommendations' as const, label: 'Recommendations', icon: <Lightbulb       size={13} />, color: 'amber'  },
  { key: 'ai-analytics'   as const, label: 'AI/ML Analytics', icon: <Brain           size={13} />, color: 'purple' },
  { key: 'circuit-mcp'    as const, label: 'CIRCUIT MCP',     icon: <Cpu             size={13} />, color: 'cyan'   },
];

// ==================== SECTION HERO ====================

interface SectionHeroProps {
  icon: React.ReactNode;
  color: string;
  title: string;
  description: string;
  stats: { label: string; value: string }[];
  onStatClick?: (stat: { label: string; value: string }) => void;
}

const SectionHero: React.FC<SectionHeroProps> = ({ icon, color, title, description, stats, onStatClick }) => {
  const gradientMap: Record<string, string> = {
    cyan:   'from-cyan-500/10   via-transparent to-transparent border-cyan-500/20',
    purple: 'from-purple-500/10 via-transparent to-transparent border-purple-500/20',
    indigo: 'from-indigo-500/10 via-transparent to-transparent border-indigo-500/20',
    amber:  'from-amber-500/10  via-transparent to-transparent border-amber-500/20',
    rose:   'from-rose-500/10   via-transparent to-transparent border-rose-500/20',
  };
  const iconBgMap: Record<string, string> = {
    cyan:   'bg-cyan-500/15   border-cyan-500/30',
    purple: 'bg-purple-500/15 border-purple-500/30',
    indigo: 'bg-indigo-500/15 border-indigo-500/30',
    amber:  'bg-amber-500/15  border-amber-500/30',
    rose:   'bg-rose-500/15   border-rose-500/30',
  };
  const dividerMap: Record<string, string> = {
    cyan: 'bg-cyan-500/40', purple: 'bg-purple-500/40', indigo: 'bg-indigo-500/40',
    amber: 'bg-amber-500/40', rose: 'bg-rose-500/40',
  };

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-gradient-to-r border ${gradientMap[color] ?? gradientMap.cyan}`}>
      <div className="flex items-center gap-4">
        <div className={`flex-shrink-0 p-3 rounded-xl border ${iconBgMap[color] ?? iconBgMap.cyan}`}>
          {icon}
        </div>
        <div>
          <h2 className="text-base font-bold text-white">{title}</h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-xl leading-relaxed">{description}</p>
        </div>
      </div>
      {stats.length > 0 && (
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
          {stats.map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <span className={`hidden sm:block w-px h-6 ${dividerMap[color] ?? dividerMap.cyan}`} />}
              {onStatClick ? (
                <button
                  onClick={() => onStatClick(s)}
                  aria-label={`Analyze ${s.label} (${s.value}) with AI/ML`}
                  className={`group relative text-center sm:text-right px-2 py-1 rounded-lg transition-all duration-200
                    hover:bg-white/5 hover:scale-105 active:scale-95 touch-manipulation
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900`}
                >
                  <p className="text-xs text-slate-500 leading-tight flex items-center gap-1 justify-center sm:justify-end">
                    {s.label}
                    <Zap size={8} className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                  <p className="text-sm font-bold text-white capitalize font-mono">{s.value}</p>
                </button>
              ) : (
                <div className="text-center sm:text-right">
                  <p className="text-xs text-slate-500 leading-tight">{s.label}</p>
                  <p className="text-sm font-bold text-white capitalize font-mono">{s.value}</p>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

export const ComprehensiveStatsDashboard: React.FC<ComprehensiveStatsDashboardProps> = ({
  data,
  onInsightSelect,
  onClose,
  isLoading = false
}) => {
  // Lifecycle logging for debugging blank-screen issues
  useEffect(() => {
    console.log('[ComprehensiveStatsDashboard] mounted with data:', data?.metrics?.totalAssessed?.value);
    return () => {
      console.log('[ComprehensiveStatsDashboard] unmounted');
    };
  }, []);

  // Defensive guards for missing or malformed data
  console.debug('[ComprehensiveStatsDashboard] render check, data=', data);
  const hasMetrics = data && typeof data === 'object' && data.metrics && typeof data.metrics.totalAssessed !== 'undefined';
  
  // Use mock data as a graceful fallback in case the live data is missing
  const dashboard = useMemo(() => {
    if (hasMetrics) {
      return data;
    }
    console.warn('[ComprehensiveStatsDashboard] live data missing - using MOCK_DATA fallback');
    return MOCK_DATA;
  }, [data, hasMetrics]);

  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'forecast' | 'recommendations' | 'ai-analytics' | 'circuit-mcp'>('overview');
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Card-level AI/ML analysis modal
  const [cardModal, setCardModal] = useState<{
    open: boolean;
    card: { title: string; value: number | string; subtext: string; color: string } | null;
    mlLoading: boolean;
    mlData: any;
    mlError: string | null;
  }>({ open: false, card: null, mlLoading: false, mlData: null, mlError: null });
  const cardMlAbortRef = useRef<AbortController | null>(null);
  const cardMlDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const openCardModal = useCallback((info: { title: string; value: number | string; subtext: string; color: string }) => {
    if (cardMlAbortRef.current) cardMlAbortRef.current.abort();
    if (cardMlDebounceRef.current) clearTimeout(cardMlDebounceRef.current);
    setCardModal({ open: true, card: info, mlLoading: true, mlData: null, mlError: null });
    const controller = new AbortController();
    cardMlAbortRef.current = controller;
    cardMlDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/ml/analyze/comprehensive', { signal: controller.signal });
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const json = await res.json();
        setCardModal(prev => ({ ...prev, mlLoading: false, mlData: json.analysis || json }));
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setCardModal(prev => ({ ...prev, mlLoading: false, mlError: err.message ?? 'Analysis failed. Please retry.' }));
        }
      }
    }, 300);
  }, []);

  const closeCardModal = useCallback(() => {
    if (cardMlAbortRef.current) cardMlAbortRef.current.abort();
    if (cardMlDebounceRef.current) clearTimeout(cardMlDebounceRef.current);
    setCardModal({ open: false, card: null, mlLoading: false, mlData: null, mlError: null });
  }, []);

  // AI Analytics
  const patterns = useMemo(() => aiAnalytics.detectPatterns(dashboard.trends), [dashboard.trends]);
  const insights = useMemo(() => aiAnalytics.generateInsights(dashboard), [dashboard]);
  const recommendations = useMemo(() => aiAnalytics.generateRecommendations(dashboard), [dashboard]);
  const forecast = useMemo(() => {
    if (dashboard.metrics?.vulnerable) {
      return aiAnalytics.generateForecast(dashboard.metrics.vulnerable, 6);
    }
    return null;
  }, [dashboard.metrics?.vulnerable]);

  // Auto-refresh effect
  useEffect(() => {
    if (!isAutoRefresh) return;

    const interval = setInterval(() => {
      setLastRefresh(new Date());
      // Trigger data refresh via engagement tracking
      aiAnalytics.trackEngagement({
        visualizationType: 'dashboard',
        interactionType: 'view',
        duration: refreshInterval * 1000
      });
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [isAutoRefresh, refreshInterval]);

  // Health metrics
  const healthScore = useMemo(() => {
    const vulnRatio = dashboard.metrics.vulnerable.value / dashboard.metrics.totalAssessed.value;
    const secureRatio = dashboard.metrics.secure.value / dashboard.metrics.totalAssessed.value;
    return {
      security: Math.round(100 - vulnRatio * 1000),
      efficiency: Math.round(secureRatio * 100),
      compliance: Math.round(90 - (dashboard.metrics.potential.value / dashboard.metrics.totalAssessed.value) * 200),
      performance: 95
    };
  }, [dashboard.metrics]);

  const handleInsightClick = useCallback((insight: DataInsight) => {
    aiAnalytics.trackEngagement({
      visualizationType: insight.visualizationType,
      interactionType: 'click',
      duration: 0,
      metricId: insight.id
    });

    onInsightSelect({
      title: insight.title,
      value: insight.summary,
      subtext: `Confidence: ${insight.confidence}%`,
      color: insight.severity === 'critical' ? 'rose' : insight.severity === 'warning' ? 'amber' : 'blue',
      type: 'metric',
      aiAnalysis: insight.details,
      recommendations: insight.actions
    });
  }, [onInsightSelect]);

  return (
    <div className="min-h-screen w-full bg-slate-900 text-slate-300 pb-20">

      {/* ── Sticky Header ────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-xl">

        {/* Row 1 – Title + Controls */}
        <div className="flex items-center justify-between px-6 py-3 gap-4">
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-all flex-shrink-0"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="flex-shrink-0 p-2 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg shadow-lg shadow-cyan-500/20">
                <BarChart3 className="text-white" size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-white tracking-tight whitespace-nowrap">Comprehensive Statistics</h1>
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-xs font-bold text-emerald-400 uppercase tracking-wider flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-tight hidden sm:block">AI-Powered Analytics Dashboard</p>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Active tab breadcrumb */}
            <span className="hidden md:flex items-center gap-1.5 text-xs text-slate-500">
              {TAB_META.find(t => t.key === activeTab)?.icon &&
                React.cloneElement(TAB_META.find(t => t.key === activeTab)!.icon as React.ReactElement<{ size?: number; className?: string }>, { size: 12, className: 'text-slate-500' })
              }
              <span className="capitalize">{TAB_META.find(t => t.key === activeTab)?.label}</span>
            </span>
            <span className="hidden md:block w-px h-4 bg-slate-700" />

            {/* Auto-refresh toggle */}
            <button
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                isAutoRefresh
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-slate-800/60 border-slate-700 text-slate-500 hover:text-white'
              }`}
              aria-label={isAutoRefresh ? 'Pause auto-refresh' : 'Start auto-refresh'}
            >
              {isAutoRefresh ? <Play size={11} /> : <Pause size={11} />}
              <span>{isAutoRefresh ? `${refreshInterval}s` : 'Paused'}</span>
            </button>

            {/* Last updated */}
            <span className="hidden lg:flex items-center gap-1 text-xs text-slate-500">
              <Clock size={11} />
              {lastRefresh.toLocaleTimeString()}
            </span>

            <ThemeToggle size="sm" />

            {/* Close */}
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-all"
              aria-label="Close statistics"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Row 2 – Tab Bar */}
        <nav
          className="flex items-end px-6 gap-0 overflow-x-auto scrollbar-none"
          aria-label="Statistics sections"
          role="tablist"
        >
          {TAB_META.map(({ key, label, icon, color }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${key}`}
                id={`tab-${key}`}
                onClick={() => setActiveTab(key)}
                className={`
                  relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap
                  transition-all duration-200 border-b-2 focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1
                  focus-visible:ring-offset-slate-900 rounded-t-sm
                  ${isActive
                    ? `border-${color}-400 text-${color}-300 bg-${color}-500/5`
                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600 hover:bg-slate-800/40'
                  }
                `}
              >
                {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 13 })}
                {label}
                {isActive && (
                  <span className={`absolute bottom-0 left-2 right-2 h-0.5 bg-${color}-400 rounded-full`} />
                )}
              </button>
            );
          })}
        </nav>
      </header>

{/* ── Main Content ─────────────────────────────────────── */}
      <main id="main" className="p-6 max-w-[1920px] mx-auto space-y-6 relative">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-slate-800 rounded-xl p-8 flex flex-col items-center gap-4 shadow-2xl border border-slate-700">
              <div className="animate-spin">
                <Sparkles className="text-cyan-400" size={32} />
              </div>
              <p className="text-slate-300 font-semibold">Loading Statistics…</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {!isLoading && (!dashboard || !dashboard.metrics) && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <AlertTriangle className="text-amber-400 mx-auto mb-4" size={48} />
              <p className="text-slate-300 mb-2">Unable to load statistics data</p>
              <p className="text-slate-500 text-sm">Please try again or contact support</p>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {!isLoading && dashboard && dashboard.metrics && (
          <>

        {/* ══════════ OVERVIEW TAB ══════════ */}
        {activeTab === 'overview' && (
          <div
            id="tabpanel-overview"
            role="tabpanel"
            aria-labelledby="tab-overview"
            className="space-y-6"
          >
            {/* Section Hero */}
            <SectionHero
              icon={<LayoutDashboard className="text-cyan-400" size={22} />}
              color="cyan"
              title="Dashboard Overview"
              description="Live consolidated view of all security and operational metrics with real-time AI analysis"
              stats={[
                { label: 'Total Assets', value: (dashboard.metrics.totalAssessed.value / 1e6).toFixed(1) + 'M' },
                { label: 'Secure Rate', value: `${dashboard.metrics.secure.percentage}%` },
                { label: 'Vulnerability Rate', value: `${((dashboard.metrics.vulnerable.value / dashboard.metrics.totalAssessed.value) * 100).toFixed(1)}%` },
                { label: 'Health Score', value: `${Math.round((healthScore.security + healthScore.efficiency + healthScore.compliance + healthScore.performance) / 4)}%` },
              ]}
              onStatClick={(s) => openCardModal({ title: s.label, value: s.value, subtext: 'Dashboard Overview · Click to run AI/ML analysis', color: 'cyan' })}
            />

            {/* Primary Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <AnimatedStatCard
                title="Total Assessed"
                value={dashboard.metrics.totalAssessed.value}
                subtext="All monitored assets"
                icon={<Layers className="text-cyan-400" size={20} />}
                color="cyan"
                trend={0.5}
                trendDirection="up"
                animationDelay={0}
                processingML={cardModal.mlLoading && cardModal.card?.title === 'Total Assessed'}
                onClick={() => openCardModal({ title: 'Total Assessed', value: dashboard.metrics.totalAssessed.value, subtext: 'All monitored assets', color: 'cyan' })}
              />
              <AnimatedStatCard
                title="Secure Assets"
                value={dashboard.metrics.secure.value}
                subtext={`${dashboard.metrics.secure.percentage}% of total`}
                icon={<CheckCircle2 className="text-emerald-400" size={20} />}
                color="green"
                trend={dashboard.metrics.secure.trend}
                trendDirection={dashboard.metrics.secure.trend && dashboard.metrics.secure.trend > 0 ? 'up' : 'down'}
                animationDelay={100}
                processingML={cardModal.mlLoading && cardModal.card?.title === 'Secure Assets'}
                onClick={() => openCardModal({ title: 'Secure Assets', value: dashboard.metrics.secure.value, subtext: `${dashboard.metrics.secure.percentage}% of total`, color: 'green' })}
              />
              <AnimatedStatCard
                title="Potentially Vulnerable"
                value={dashboard.metrics.potential.value}
                subtext="Requires investigation"
                icon={<AlertTriangle className="text-amber-400" size={20} />}
                color="amber"
                trend={dashboard.metrics.potential.trend}
                trendDirection={dashboard.metrics.potential.trend && dashboard.metrics.potential.trend > 0 ? 'up' : 'down'}
                animationDelay={200}
                processingML={cardModal.mlLoading && cardModal.card?.title === 'Potentially Vulnerable'}
                onClick={() => openCardModal({ title: 'Potentially Vulnerable', value: dashboard.metrics.potential.value, subtext: 'Requires investigation', color: 'amber' })}
              />
              <AnimatedStatCard
                title="Vulnerable Assets"
                value={dashboard.metrics.vulnerable.value}
                subtext="Critical attention needed"
                icon={<Shield className="text-rose-400" size={20} />}
                color="rose"
                trend={dashboard.metrics.vulnerable.trend}
                trendDirection={dashboard.metrics.vulnerable.trend && dashboard.metrics.vulnerable.trend < 0 ? 'down' : 'up'}
                animationDelay={300}
                processingML={cardModal.mlLoading && cardModal.card?.title === 'Vulnerable Assets'}
                onClick={() => openCardModal({ title: 'Vulnerable Assets', value: dashboard.metrics.vulnerable.value, subtext: 'Critical attention needed', color: 'rose' })}
              />
            </div>

            {/* Health + Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="p-6">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Gauge className="text-cyan-400" size={16} /> System Health
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <PerformanceGauge value={healthScore.security}   max={100} label="Security"   color="#10b981" />
                  <PerformanceGauge value={healthScore.efficiency} max={100} label="Efficiency" color="#3b82f6" />
                  <PerformanceGauge value={healthScore.compliance} max={100} label="Compliance" color="#8b5cf6" />
                  <PerformanceGauge value={healthScore.performance} max={100} label="Performance" color="#06b6d4" />
                </div>
              </Card>
              <Card className="p-6 lg:col-span-2">
                <AIInsightPanel
                  insights={insights}
                  onSelectInsight={handleInsightClick}
                  onMLAnalyze={(title, summary) => openCardModal({ title, value: summary, subtext: 'AI Insight · ML deep-dive analysis', color: 'purple' })}
                />
              </Card>
            </div>

            {/* Quick Stats */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Activity size={14} /> Operational Counts
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <AnimatedStatCard
                  title="Field Notices"
                  value={dashboard.topFieldNotices?.length || 0}
                  subtext="Active notices"
                  icon={<FileWarning className="text-purple-400" size={18} />}
                  color="purple"
                  animationDelay={400}
                  processingML={cardModal.mlLoading && cardModal.card?.title === 'Field Notices'}
                  onClick={() => openCardModal({ title: 'Field Notices', value: dashboard.topFieldNotices?.length || 0, subtext: 'Active notices', color: 'purple' })}
                />
                <AnimatedStatCard
                  title="Customers"
                  value={dashboard.topCustomers?.length || 0}
                  subtext="Monitored accounts"
                  icon={<Users className="text-blue-400" size={18} />}
                  color="blue"
                  animationDelay={500}
                  processingML={cardModal.mlLoading && cardModal.card?.title === 'Customers'}
                  onClick={() => openCardModal({ title: 'Customers', value: dashboard.topCustomers?.length || 0, subtext: 'Monitored accounts', color: 'blue' })}
                />
                <AnimatedStatCard
                  title="Anomalies"
                  value={dashboard.anomalies?.length || 0}
                  subtext="Detected issues"
                  icon={<AlertTriangle className="text-amber-400" size={18} />}
                  color="amber"
                  animationDelay={600}
                  processingML={cardModal.mlLoading && cardModal.card?.title === 'Anomalies'}
                  onClick={() => openCardModal({ title: 'Anomalies', value: dashboard.anomalies?.length || 0, subtext: 'Detected issues', color: 'amber' })}
                />
                <AnimatedStatCard
                  title="Predictions"
                  value={dashboard.predictions?.length || 0}
                  subtext="Active forecasts"
                  icon={<TrendingUp className="text-cyan-400" size={18} />}
                  color="cyan"
                  animationDelay={700}
                  processingML={cardModal.mlLoading && cardModal.card?.title === 'Predictions'}
                  onClick={() => openCardModal({ title: 'Predictions', value: dashboard.predictions?.length || 0, subtext: 'Active forecasts', color: 'cyan' })}
                />
                <AnimatedStatCard
                  title="Recommendations"
                  value={recommendations.length}
                  subtext="AI suggestions"
                  icon={<Sparkles className="text-purple-400" size={18} />}
                  color="purple"
                  animationDelay={800}
                  processingML={cardModal.mlLoading && cardModal.card?.title === 'Recommendations'}
                  onClick={() => openCardModal({ title: 'Recommendations', value: recommendations.length, subtext: 'AI suggestions', color: 'purple' })}
                />
                <AnimatedStatCard
                  title="Patterns"
                  value={patterns.length}
                  subtext="Detected patterns"
                  icon={<Activity className="text-emerald-400" size={18} />}
                  color="green"
                  animationDelay={900}
                  processingML={cardModal.mlLoading && cardModal.card?.title === 'Patterns'}
                  onClick={() => openCardModal({ title: 'Patterns', value: patterns.length, subtext: 'Detected patterns', color: 'green' })}
                />
              </div>
            </div>
          </div>
        )}

        {/* ══════════ PATTERNS TAB ══════════ */}
        {activeTab === 'patterns' && (
          <div
            id="tabpanel-patterns"
            role="tabpanel"
            aria-labelledby="tab-patterns"
            className="space-y-6"
          >
            <SectionHero
              icon={<Activity className="text-purple-400" size={22} />}
              color="purple"
              title="Pattern Detection"
              description="AI-driven analysis of behavioral patterns, seasonal trends, anomalies, and cyclical movements across all monitored assets"
              stats={[
                { label: 'Patterns Found', value: String(patterns.length) },
                { label: 'Anomaly Insights', value: String(insights.filter(i => i.type === 'anomaly').length) },
                { label: 'Pattern Insights', value: String(insights.filter(i => i.type === 'pattern').length) },
                { label: 'Trend Points', value: String(dashboard.trends?.length || 0) },
              ]}
              onStatClick={(s) => openCardModal({ title: s.label, value: s.value, subtext: 'Pattern Detection · Click to run AI/ML analysis', color: 'purple' })}
            />

            {/* Pattern type summary pills */}
            {patterns.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(['trend', 'seasonal', 'anomaly', 'correlation', 'cyclical'] as const).map(type => {
                  const count = patterns.filter(p => p.type === type).length;
                  const cfg: Record<string, string> = {
                    trend: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
                    seasonal: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
                    anomaly: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
                    correlation: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
                    cyclical: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
                  };
                  if (!count) return null;
                  return (
                    <span key={type} className={`px-3 py-1 rounded-full border text-xs font-semibold capitalize ${cfg[type]}`}>
                      {count} {type}
                    </span>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <PatternVisualizer
                  patterns={patterns}
                  trends={dashboard.trends}
                  onPatternAnalyze={(label, value) => openCardModal({ title: label, value, subtext: 'Pattern Analysis · Confidence & impact breakdown', color: 'purple' })}
                />
              </Card>
              <Card className="p-6">
                <AIInsightPanel
                  insights={insights.filter(i => i.type === 'pattern' || i.type === 'anomaly')}
                  onSelectInsight={handleInsightClick}
                  onMLAnalyze={(title, summary) => openCardModal({ title, value: summary, subtext: 'Pattern Insight · ML deep-dive analysis', color: 'purple' })}
                />
              </Card>
            </div>
          </div>
        )}

        {/* ══════════ FORECAST TAB ══════════ */}
        {activeTab === 'forecast' && (
          <div
            id="tabpanel-forecast"
            role="tabpanel"
            aria-labelledby="tab-forecast"
            className="space-y-6"
          >
            <SectionHero
              icon={<TrendingUp className="text-indigo-400" size={22} />}
              color="indigo"
              title="Vulnerability Forecast"
              description="ML-powered predictive modeling of future vulnerability trends with confidence intervals and anomaly probability scoring"
              stats={forecast ? [
                { label: 'Trend Direction', value: forecast.trendDirection },
                { label: 'Trend Strength', value: `${forecast.trendStrength.toFixed(0)}%` },
                { label: 'Change Rate', value: `${forecast.changeRate.toFixed(1)}%/mo` },
                { label: 'Anomaly Risk', value: `${forecast.anomalyProbability.toFixed(0)}%` },
              ] : [
                { label: 'Status', value: 'No Data' },
              ]}
              onStatClick={(s) => openCardModal({ title: s.label, value: s.value, subtext: 'Vulnerability Forecast · ML prediction analysis', color: 'indigo' })}
            />

            {forecast ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <ForecastChart
                    forecast={forecast}
                    onMetricClick={(label, value) => openCardModal({
                      title: label,
                      value,
                      subtext: 'Vulnerability Forecast · ML prediction analysis',
                      color: 'indigo'
                    })}
                  />
                </Card>
                <Card className="p-6">
                  <AIInsightPanel
                    insights={insights.filter(i => i.type === 'prediction')}
                    onSelectInsight={handleInsightClick}
                    onMLAnalyze={(title, summary) => openCardModal({ title, value: summary, subtext: 'Forecast Insight · ML deep-dive analysis', color: 'indigo' })}
                  />
                </Card>
              </div>
            ) : (
              <Card className="p-12">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="p-4 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                    <TrendingUp size={32} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-slate-300 font-semibold mb-1">Forecast data unavailable</p>
                    <p className="text-slate-500 text-sm">Insufficient historical data to generate ML forecast.<br/>Forecasting requires at least 3 months of trend data.</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ══════════ RECOMMENDATIONS TAB ══════════ */}
        {activeTab === 'recommendations' && (
          <div
            id="tabpanel-recommendations"
            role="tabpanel"
            aria-labelledby="tab-recommendations"
            className="space-y-6"
          >
            <SectionHero
              icon={<Lightbulb className="text-amber-400" size={22} />}
              color="amber"
              title="AI Recommendations"
              description="Intelligent, prioritized action items generated by ML models analyzing your security posture, performance gaps, and operational patterns"
              stats={[
                { label: 'Total', value: String(recommendations.length) },
                { label: 'Critical', value: String(recommendations.filter(r => r.priority === 'critical').length) },
                { label: 'High', value: String(recommendations.filter(r => r.priority === 'high').length) },
                { label: 'Medium+', value: String(recommendations.filter(r => r.priority === 'medium' || r.priority === 'low').length) },
              ]}
              onStatClick={(s) => openCardModal({ title: s.label, value: s.value, subtext: 'AI Recommendations · Priority breakdown analysis', color: 'amber' })}
            />

            {/* Priority breakdown bar */}
            {recommendations.length > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Priority split</span>
                <div className="flex-1 flex rounded-full overflow-hidden h-2 gap-px">
                  {(['critical', 'high', 'medium', 'low'] as const).map(p => {
                    const cnt = recommendations.filter(r => r.priority === p).length;
                    const pct = recommendations.length ? (cnt / recommendations.length) * 100 : 0;
                    const colors: Record<string, string> = { critical: 'bg-rose-500', high: 'bg-amber-500', medium: 'bg-blue-500', low: 'bg-slate-500' };
                    return pct > 0 ? <div key={p} className={`${colors[p]} transition-all duration-700`} style={{ width: `${pct}%` }} /> : null;
                  })}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {(['critical', 'high', 'medium', 'low'] as const).map(p => {
                    const cnt = recommendations.filter(r => r.priority === p).length;
                    const colors: Record<string, string> = { critical: 'text-rose-400', high: 'text-amber-400', medium: 'text-blue-400', low: 'text-slate-400' };
                    return cnt > 0 ? <span key={p} className={`${colors[p]} capitalize font-medium`}>{cnt} {p}</span> : null;
                  })}
                </div>
              </div>
            )}

            {recommendations.length === 0 ? (
              <Card className="p-12">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="p-4 rounded-full bg-amber-500/10 border border-amber-500/20">
                    <Lightbulb size={32} className="text-amber-400" />
                  </div>
                  <p className="text-slate-300 font-semibold">No recommendations at this time</p>
                  <p className="text-slate-500 text-sm">AI models are analyzing your data. Check back shortly.</p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {recommendations.map((rec, index) => (
                  <RecommendationCard
                    key={rec.id}
                    recommendation={rec}
                    onClick={() => {
                      aiAnalytics.trackEngagement({
                        visualizationType: 'recommendation',
                        interactionType: 'click',
                        duration: 0,
                        metricId: rec.id
                      });
                    }}
                    onMLAnalyze={(title, description) => openCardModal({
                      title,
                      value: description,
                      subtext: `${rec.priority.toUpperCase()} · ${rec.confidence}% confidence · AI Recommendation`,
                      color: rec.priority === 'critical' ? 'rose' : rec.priority === 'high' ? 'amber' : rec.priority === 'medium' ? 'blue' : 'cyan'
                    })}
                    animationDelay={index * 80}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════ AI/ML ANALYTICS TAB ══════════ */}
        {activeTab === 'ai-analytics' && (
          <div
            id="tabpanel-ai-analytics"
            role="tabpanel"
            aria-labelledby="tab-ai-analytics"
            className="space-y-6"
          >
            <SectionHero
              icon={<Brain className="text-purple-400" size={22} />}
              color="purple"
              title="AI/ML Analytics Engine"
              description="Advanced machine learning pipeline for pattern recognition, anomaly detection, predictive modeling, and intelligent recommendation generation"
              stats={[
                { label: 'Insights Generated', value: String(insights.length) },
                { label: 'ML Patterns', value: String(patterns.length) },
                { label: 'Predictions', value: String(dashboard.predictions?.length || 0) },
                { label: 'Anomalies', value: String(dashboard.anomalies?.length || 0) },
              ]}
              onStatClick={(s) => openCardModal({ title: s.label, value: s.value, subtext: 'AI/ML Analytics · Pipeline metric analysis', color: 'purple' })}
            />
            <EnhancedAnalyticsDashboard />
          </div>
        )}

        {/* ══════════ CIRCUIT MCP TAB ══════════ */}
        {activeTab === 'circuit-mcp' && (
          <div
            id="tabpanel-circuit-mcp"
            role="tabpanel"
            aria-labelledby="tab-circuit-mcp"
            className="space-y-6"
          >
            <SectionHero
              icon={<Cpu className="text-cyan-400" size={22} />}
              color="cyan"
              title="CIRCUIT MCP Intelligence"
              description="Cisco CIRCUIT Model Context Protocol — real-time AI orchestration, contextual analysis, and intelligent decision support for SRE operations"
              stats={[
                { label: 'Protocol', value: 'CIRCUIT v2' },
                { label: 'Status', value: 'Active' },
                { label: 'Context Window', value: '128K' },
                { label: 'Models', value: 'Multi-agent' },
              ]}
              onStatClick={(s) => openCardModal({ title: s.label, value: s.value, subtext: 'CIRCUIT MCP · Protocol capability analysis', color: 'cyan' })}
            />
            <CircuitInsightsDashboard />
          </div>
        )}

          </>
        )}
      </main>

      {/* Card Analysis Modal */}
      <CardAnalysisModal
        open={cardModal.open}
        card={cardModal.card}
        mlLoading={cardModal.mlLoading}
        mlData={cardModal.mlData}
        mlError={cardModal.mlError}
        onClose={closeCardModal}
        onRetry={() => { if (cardModal.card) openCardModal(cardModal.card); }}
      />

      {/* Accessibility: Skip to main content link */}
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-cyan-600 text-white px-4 py-2 rounded">
        Skip to main content
      </a>

      {/* Keyframes for animations */}
      <style>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ComprehensiveStatsDashboard;
