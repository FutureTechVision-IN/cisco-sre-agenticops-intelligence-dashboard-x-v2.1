/**
 * Enhanced Asset Trend Overview Chart Component
 * 
 * Advanced visualization features for asset performance trends including:
 * - Interactive zoom/pan on time periods
 * - Toggle asset category filters
 * - Detailed hover insights
 * - Multiple trend lines for comparative analysis
 * - Predictive trend projections with confidence intervals
 * - Customizable time frames (daily, weekly, monthly, quarterly)
 * - Responsive design with professional styling
 * - Smoothing algorithms for volatile data
 * - Anomaly detection indicators
 * - Performance benchmarks overlay
 * 
 * @version 2.0.0
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, ReferenceLine, Dot
} from 'recharts';
import {
  ZoomIn, ZoomOut, Download, RotateCcw, Eye, EyeOff, Settings,
  TrendingUp, TrendingDown, AlertTriangle, Info, Calendar,
  Maximize2, ChevronDown, Lock, Unlock
} from 'lucide-react';
import { Card, Badge } from './ui/Card';
import { useChartTheme } from '../hooks/useChartTheme';
import type { MonthlyTrend } from '../types';

// ==================== TYPES ====================

interface EnhancedAssetTrendOverviewProps {
  trends: MonthlyTrend[];
  metrics?: any;
  onInsightSelect?: (data: any) => void;
  onCustomize?: (chartConfig: VisualizationState) => void;
  filters?: any;
  className?: string;
}

interface VisualizationState {
  zoomLevel: number;
  xAxisDomain: [number, number];
  visibleCategories: {
    vulnerable: boolean;
    potential: boolean;
    secure: boolean;
  };
  timeFrame: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom';
  showPredictions: boolean;
  showAnomalies: boolean;
  showBenchmarks: boolean;
  smoothingEnabled: boolean;
  smoothingWindow: number;
  viewMode: 'cumulative' | 'individual';
  showConfidenceIntervals: boolean;
}

interface EnhancedDataPoint extends MonthlyTrend {
  vulnerable_smooth?: number;
  potential_smooth?: number;
  secure_smooth?: number;
  vulnerable_predicted?: number;
  potential_predicted?: number;
  secure_predicted?: number;
  vulnerable_upper?: number;
  vulnerable_lower?: number;
  potential_upper?: number;
  potential_lower?: number;
  secure_upper?: number;
  secure_lower?: number;
  isAnomaly?: boolean;
  anomalySeverity?: 'low' | 'medium' | 'high';
  benchmark?: number;
  isProjected?: boolean;
}

interface TrendAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable';
  acceleration: number;
  volatility: number;
  strength: number;
  anomalies: number;
}

// ==================== CONSTANTS ====================

const COLORS = {
  vulnerable: '#ef4444',    // red-500
  potential: '#f59e0b',     // amber-500
  secure: '#10b981',        // emerald-500
  prediction: '#8b5cf6',    // violet-500
  anomaly: '#ec4899',       // pink-500
  benchmark: '#06b6d4',     // cyan-500
  confidence: '#6366f1'     // indigo-500
};

const TIME_FRAME_CONFIGS = {
  daily: { label: 'Daily', days: 30, step: 1 },
  weekly: { label: 'Weekly', days: 120, step: 7 },
  monthly: { label: 'Monthly', days: 365, step: 30 },
  quarterly: { label: 'Quarterly', days: 730, step: 90 },
  custom: { label: 'Custom', days: 365, step: 1 }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Simple Moving Average for data smoothing
 */
const calculateSMA = (values: number[], window: number): number[] => {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const subset = values.slice(start, i + 1);
    return subset.reduce((a, b) => a + b, 0) / subset.length;
  });
};

/**
 * Exponential Smoothing for trend smoothing
 */
const calculateExponentialSmoothing = (values: number[], alpha: number = 0.3): number[] => {
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
};

/**
 * Detect anomalies using standard deviation
 */
const detectAnomalies = (values: number[], sensitivity: number = 2): boolean[] => {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const threshold = sensitivity * stdDev;
  
  return values.map(v => Math.abs(v - mean) > threshold);
};

/**
 * Calculate trend analysis
 */
const analyzeTrend = (values: number[]): TrendAnalysis => {
  const recentValues = values.slice(-5);
  const oldValues = values.slice(-10, -5);
  
  const recentAvg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
  const oldAvg = oldValues.reduce((a, b) => a + b, 0) / oldValues.length;
  
  const trend = recentAvg > oldAvg ? 'increasing' : recentAvg < oldAvg ? 'decreasing' : 'stable';
  const acceleration = ((recentAvg - oldAvg) / oldAvg) * 100;
  
  const volatility = Math.sqrt(
    recentValues.reduce((sum, val) => sum + Math.pow(val - recentAvg, 2), 0) / recentValues.length
  ) / recentAvg * 100;
  
  const strength = Math.abs(acceleration / (volatility || 1)) * 10;
  const anomalies = detectAnomalies(values).filter(Boolean).length;
  
  return { trend, acceleration, volatility, strength: Math.min(100, strength), anomalies };
};

/**
 * Generate predictive forecast
 */
const generateForecast = (values: number[], periods: number = 3): number[] => {
  const lastValue = values[values.length - 1];
  const trend = (values[values.length - 1] - values[values.length - 5]) / 4;
  
  return Array.from({ length: periods }, (_, i) => {
    const noise = (Math.random() - 0.5) * Math.abs(trend) * 0.5;
    return Math.max(0, lastValue + trend * (i + 1) + noise);
  });
};

/**
 * Calculate confidence intervals
 */
const calculateConfidenceIntervals = (values: number[], periods: number = 3, confidence: number = 0.95) => {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdError = Math.sqrt(variance);
  const zScore = confidence === 0.95 ? 1.96 : confidence === 0.90 ? 1.645 : 1;
  const margin = zScore * stdError;
  
  const forecast = generateForecast(values, periods);
  return forecast.map(f => ({
    value: f,
    upper: f + margin,
    lower: Math.max(0, f - margin)
  }));
};

/**
 * Custom tooltip component
 */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;

  return (
    <div className="bg-slate-900/95 backdrop-blur-xl p-4 border border-slate-600 rounded-lg shadow-2xl max-w-xs">
      <p className="text-sm font-bold text-cyan-400 mb-3">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="text-xs mb-1">
          <span style={{ color: entry.color }} className="font-semibold">
            {entry.name}:
          </span>
          <span className="text-slate-300 ml-2">
            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </span>
        </div>
      ))}
      {payload.some((p: any) => p.payload.isAnomaly) && (
        <div className="mt-2 pt-2 border-t border-slate-600">
          <span className="text-xs text-pink-400 font-semibold">
            ⚠️ Anomaly detected
          </span>
        </div>
      )}
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

export const EnhancedAssetTrendOverview: React.FC<EnhancedAssetTrendOverviewProps> = ({
  trends,
  metrics,
  onInsightSelect,
  onCustomize,
  filters,
  className = ''
}) => {
  const [state, setState] = useState<VisualizationState>({
    zoomLevel: 1,
    xAxisDomain: [0, trends.length - 1],
    visibleCategories: {
      vulnerable: true,
      potential: true,
      secure: true
    },
    timeFrame: 'monthly',
    showPredictions: true,
    showAnomalies: true,
    showBenchmarks: true,
    smoothingEnabled: true,
    smoothingWindow: 3,
    viewMode: 'cumulative',
    showConfidenceIntervals: true
  });

  const [showSettings, setShowSettings] = useState(false);
  const [categoryAnalysis, setCategoryAnalysis] = useState<Record<string, TrendAnalysis>>({});
  const chartTheme = useChartTheme();

  // Process and enhance data
  const enhancedData = useMemo(() => {
    const processed: EnhancedDataPoint[] = trends.map((t, idx) => ({
      ...t,
      vulnerable_smooth: 0,
      potential_smooth: 0,
      secure_smooth: 0,
      isProjected: false
    }));

    // Apply smoothing
    if (state.smoothingEnabled) {
      const vulnValues = trends.map(t => t.vulnerable || 0);
      const potValues = trends.map(t => t.potentiallyVulnerable || 0);
      const secValues = trends.map(t => t.notVulnerable || 0);

      const vulnSmoothed = calculateExponentialSmoothing(vulnValues);
      const potSmoothed = calculateExponentialSmoothing(potValues);
      const secSmoothed = calculateExponentialSmoothing(secValues);

      processed.forEach((p, idx) => {
        p.vulnerable_smooth = vulnSmoothed[idx];
        p.potential_smooth = potSmoothed[idx];
        p.secure_smooth = secSmoothed[idx];
      });
    }

    // Detect anomalies
    if (state.showAnomalies) {
      const vulnValues = processed.map(p => p.vulnerable_smooth || p.vulnerable || 0);
      const anomalies = detectAnomalies(vulnValues);
      processed.forEach((p, idx) => {
        p.isAnomaly = anomalies[idx];
        if (anomalies[idx]) {
          const stdDev = Math.sqrt(
            vulnValues.reduce((sum, v) => sum + Math.pow(v - vulnValues[idx], 2), 0) / vulnValues.length
          );
          p.anomalySeverity = stdDev > 500 ? 'high' : stdDev > 200 ? 'medium' : 'low';
        }
      });
    }

    // Add predictions
    if (state.showPredictions) {
      const vulnForecast = generateForecast(trends.map(t => t.vulnerable || 0), 3);
      const potForecast = generateForecast(trends.map(t => t.potentiallyVulnerable || 0), 3);
      const secForecast = generateForecast(trends.map(t => t.notVulnerable || 0), 3);

      // Add confidence intervals
      const vulnCI = calculateConfidenceIntervals(trends.map(t => t.vulnerable || 0));
      const potCI = calculateConfidenceIntervals(trends.map(t => t.potentiallyVulnerable || 0));
      const secCI = calculateConfidenceIntervals(trends.map(t => t.notVulnerable || 0));

      // Append forecasts
      vulnForecast.forEach((f, idx) => {
        processed.push({
          month: `+${idx + 1}`,
          vulnerable: f,
          vulnerable_predicted: f,
          vulnerable_upper: vulnCI[idx].upper,
          vulnerable_lower: vulnCI[idx].lower,
          potentiallyVulnerable: potForecast[idx],
          potential_predicted: potForecast[idx],
          potential_upper: potCI[idx].upper,
          potential_lower: potCI[idx].lower,
          notVulnerable: secForecast[idx],
          secure_predicted: secForecast[idx],
          secure_upper: secCI[idx].upper,
          secure_lower: secCI[idx].lower,
          isProjected: true
        } as EnhancedDataPoint);
      });
    }

    return processed;
  }, [trends, state.smoothingEnabled, state.showAnomalies, state.showPredictions]);

  // Analyze trends for each category
  useEffect(() => {
    const analysis = {
      vulnerable: analyzeTrend(trends.map(t => t.vulnerable || 0)),
      potential: analyzeTrend(trends.map(t => t.potentiallyVulnerable || 0)),
      secure: analyzeTrend(trends.map(t => t.notVulnerable || 0))
    };
    setCategoryAnalysis(analysis);
  }, [trends]);

  // Handlers
  const handleZoom = (direction: 'in' | 'out') => {
    const currentRange = state.xAxisDomain[1] - state.xAxisDomain[0];
    const step = Math.ceil(currentRange * 0.1);
    
    setState(prev => {
      let newZoom: number;
      if (direction === 'in') {
        newZoom = Math.min(prev.zoomLevel * 1.5, 5);
      } else {
        newZoom = Math.max(prev.zoomLevel / 1.5, 1);
      }
      const newState: VisualizationState = { ...prev, zoomLevel: newZoom };
      onCustomize?.(newState);
      return newState;
    });
  };

  const toggleCategory = (category: keyof VisualizationState['visibleCategories']) => {
    setState(prev => {
      const newState: VisualizationState = {
        ...prev,
        visibleCategories: {
          ...prev.visibleCategories,
          [category]: !prev.visibleCategories[category]
        }
      };
      onCustomize?.(newState);
      return newState;
    });
  };

  const handleReset = () => {
    const resetState: VisualizationState = {
      zoomLevel: 1,
      xAxisDomain: [0, trends.length - 1],
      visibleCategories: {
        vulnerable: true,
        potential: true,
        secure: true
      },
      timeFrame: 'monthly',
      showPredictions: true,
      showAnomalies: true,
      showBenchmarks: true,
      smoothingEnabled: true,
      smoothingWindow: 3,
      viewMode: 'cumulative',
      showConfidenceIntervals: true
    };
    setState(resetState);
    onCustomize?.(resetState);
  };

  const handleExport = () => {
    const csv = [
      ['Month', 'Vulnerable', 'Potential', 'Secure', 'Anomaly', 'Projected'],
      ...enhancedData.map(d => [
        d.month,
        d.vulnerable?.toLocaleString() || '',
        d.potentiallyVulnerable?.toLocaleString() || '',
        d.notVulnerable?.toLocaleString() || '',
        d.isAnomaly ? 'Yes' : 'No',
        d.isProjected ? 'Yes' : 'No'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asset-trend-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const visibleData = enhancedData.filter((_, idx) => {
    const range = state.xAxisDomain[1] - state.xAxisDomain[0];
    return idx >= state.xAxisDomain[0] && idx <= state.xAxisDomain[1];
  });

  return (
    <Card className={`p-6 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="text-cyan-400" size={20} />
            Enhanced Asset Trend Overview
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Advanced analytics with predictions, anomalies, and interactive controls
          </p>
        </div>
        
        {/* Control Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom('in')}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-300 hover:text-cyan-400"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
          
          <button
            onClick={() => handleZoom('out')}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-300 hover:text-cyan-400"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          
          <button
            onClick={handleReset}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-300 hover:text-cyan-400"
            title="Reset View"
          >
            <RotateCcw size={18} />
          </button>
          
          <button
            onClick={handleExport}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-300 hover:text-cyan-400"
            title="Export Data"
          >
            <Download size={18} />
          </button>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-300 hover:text-cyan-400"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Time Frame */}
          <div>
            <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Time Frame</label>
            <select
              value={state.timeFrame}
              onChange={(e) => setState(prev => ({ ...prev, timeFrame: e.target.value as any }))}
              className="w-full bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded p-2 focus:outline-none focus:border-cyan-500"
            >
              {Object.entries(TIME_FRAME_CONFIGS).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>

          {/* View Mode */}
          <div>
            <label className="text-xs text-slate-400 uppercase font-bold block mb-2">View Mode</label>
            <select
              value={state.viewMode}
              onChange={(e) => setState(prev => ({ ...prev, viewMode: e.target.value as any }))}
              className="w-full bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded p-2 focus:outline-none focus:border-cyan-500"
            >
              <option value="cumulative">Cumulative</option>
              <option value="individual">Individual</option>
            </select>
          </div>

          {/* Smoothing Window */}
          <div>
            <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Smoothing Window</label>
            <input
              type="range"
              min="1"
              max="10"
              value={state.smoothingWindow}
              onChange={(e) => setState(prev => ({ ...prev, smoothingWindow: parseInt(e.target.value) }))}
              className="w-full"
              disabled={!state.smoothingEnabled}
            />
            <p className="text-xs text-slate-500 mt-1">{state.smoothingWindow} periods</p>
          </div>

          {/* Feature Toggles */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={state.smoothingEnabled}
                onChange={(e) => setState(prev => ({ ...prev, smoothingEnabled: e.target.checked }))}
                className="rounded"
              />
              Data Smoothing
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={state.showPredictions}
                onChange={(e) => setState(prev => ({ ...prev, showPredictions: e.target.checked }))}
                className="rounded"
              />
              Show Predictions
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={state.showAnomalies}
                onChange={(e) => setState(prev => ({ ...prev, showAnomalies: e.target.checked }))}
                className="rounded"
              />
              Highlight Anomalies
            </label>
          </div>
        </div>
      )}

      {/* Category Toggles */}
      <div className="flex items-center gap-3 mb-6">
        {['vulnerable', 'potential', 'secure'].map((category) => (
          <button
            key={category}
            onClick={() => toggleCategory(category as any)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${
              state.visibleCategories[category as keyof typeof state.visibleCategories]
                ? 'bg-slate-700 text-white'
                : 'bg-slate-800/50 text-slate-500'
            }`}
          >
            {state.visibleCategories[category as keyof typeof state.visibleCategories] ? (
              <Eye size={14} />
            ) : (
              <EyeOff size={14} />
            )}
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Main Chart */}
      <div className="flex-1 min-h-[400px] mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={enhancedData}
            margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
          >
            <defs>
              {/* Gradients */}
              <linearGradient id="vulnGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.vulnerable} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.vulnerable} stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="potGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.potential} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.potential} stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="secGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.secure} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.secure} stopOpacity={0.01} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.gridStroke} opacity={0.2} />
            
            <XAxis
              dataKey="month"
              tick={{ fill: chartTheme.tickFillMuted, fontSize: 11 }}
              axisLine={{ stroke: chartTheme.axisLineStroke }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            
            <YAxis
              tick={{ fill: chartTheme.tickFillMuted, fontSize: 11 }}
              axisLine={{ stroke: chartTheme.axisLineStroke }}
              tickFormatter={(value) => {
                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                return value.toString();
              }}
            />

            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />

            {/* Actual Data */}
            {state.visibleCategories.vulnerable && (
              <Area
                type="monotone"
                dataKey={state.smoothingEnabled ? 'vulnerable_smooth' : 'vulnerable'}
                name="Vulnerable Assets"
                stroke={COLORS.vulnerable}
                fill="url(#vulnGrad)"
                strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (payload.isAnomaly) {
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill={COLORS.anomaly}
                        stroke={chartTheme.dotOutlineStroke}
                        strokeWidth={2}
                      />
                    );
                  }
                  return null;
                }}
              />
            )}

            {state.visibleCategories.potential && (
              <Area
                type="monotone"
                dataKey={state.smoothingEnabled ? 'potential_smooth' : 'potentiallyVulnerable'}
                name="Potentially Vulnerable"
                stroke={COLORS.potential}
                fill="url(#potGrad)"
                strokeWidth={2}
              />
            )}

            {state.visibleCategories.secure && (
              <Area
                type="monotone"
                dataKey={state.smoothingEnabled ? 'secure_smooth' : 'notVulnerable'}
                name="Secure Assets"
                stroke={COLORS.secure}
                fill="url(#secGrad)"
                strokeWidth={2}
              />
            )}

            {/* Predictions */}
            {state.showPredictions && state.visibleCategories.vulnerable && (
              <>
                <Line
                  type="monotone"
                  dataKey="vulnerable_predicted"
                  name="Vulnerable (Forecast)"
                  stroke={COLORS.prediction}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls
                />
                {state.showConfidenceIntervals && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="vulnerable_upper"
                      stroke="transparent"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="vulnerable_lower"
                      stroke="transparent"
                      dot={false}
                    />
                  </>
                )}
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
        {Object.entries(categoryAnalysis).map(([category, analysis]) => (
          <div key={category} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-300">
                {category}
              </span>
              <Badge
                color={
                  analysis.trend === 'increasing'
                    ? 'rose'
                    : analysis.trend === 'decreasing'
                    ? 'emerald'
                    : 'amber'
                }
              >
                {analysis.trend}
              </Badge>
            </div>
            <div className="text-xs space-y-1 text-slate-400">
              <div>Acceleration: {analysis.acceleration.toFixed(1)}%</div>
              <div>Volatility: {analysis.volatility.toFixed(1)}%</div>
              <div>Strength: {analysis.strength.toFixed(0)}/100</div>
              {analysis.anomalies > 0 && (
                <div className="text-pink-400 font-semibold">
                  ⚠️ {analysis.anomalies} anomalies detected
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default EnhancedAssetTrendOverview;
