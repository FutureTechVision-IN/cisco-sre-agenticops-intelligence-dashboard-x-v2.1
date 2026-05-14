/**
 * ExtendedKPICard - Enhanced KPI visualization component
 * Features: Sparkline charts, trend indicators, progress towards target, AI insights
 */

import React, { useState, useMemo } from 'react';
import { ExtendedKPI, InsightData } from '../types';
import { Card } from './ui/Card';
import { 
  Shield, Clock, TrendingUp, TrendingDown, Minus, Target, 
  Sparkles, Loader2, MousePointerClick, Info, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { 
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis,
  ReferenceLine
} from 'recharts';
import { useChartTheme } from '../hooks/useChartTheme';
import CalculationMethodologyModal from './CalculationMethodologyModal';

interface Props {
  kpi: ExtendedKPI;
  onClick: (data: InsightData) => void;
}

// Custom tooltip for sparkline
const SparklineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800/95 backdrop-blur-xl px-3 py-2 border border-slate-600 shadow-xl rounded-lg">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-bold text-white font-mono">{payload[0].value?.toFixed(1)}</p>
      </div>
    );
  }
  return null;
};

export const ExtendedKPICard: React.FC<Props> = ({ kpi, onClick }) => {
  const chartTheme = useChartTheme();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);

  // Debug logging
  React.useEffect(() => {
    console.log('[ExtendedKPICard] KPI received:', {
      label: kpi.label,
      hasFormula: !!kpi.formula,
      formula: kpi.formula,
      hasMethodology: !!kpi.methodology,
      methodology: kpi.methodology ? kpi.methodology.substring(0, 50) + '...' : 'undefined'
    });
  }, [kpi]);

  // Icon mapping
  const IconComponent = kpi.icon === 'Shield' ? Shield : Clock;

  // Color configurations
  const colorConfig = {
    orange: {
      text: 'text-orange-400',
      bg: 'bg-orange-900/40',
      border: 'border-orange-500/50',
      shadow: 'shadow-[0_0_15px_rgba(251,146,60,0.3)]',
      gradient: 'from-orange-500/20 to-transparent',
      chartColor: '#fb923c',
      chartGradient: ['#fb923c', '#fb923c00']
    },
    cyan: {
      text: 'text-cyan-400',
      bg: 'bg-cyan-900/40',
      border: 'border-cyan-500/50',
      shadow: 'shadow-[0_0_15px_rgba(34,211,238,0.3)]',
      gradient: 'from-cyan-500/20 to-transparent',
      chartColor: '#22d3ee',
      chartGradient: ['#22d3ee', '#22d3ee00']
    },
    purple: {
      text: 'text-purple-400',
      bg: 'bg-purple-900/40',
      border: 'border-purple-500/50',
      shadow: 'shadow-[0_0_15px_rgba(192,132,252,0.3)]',
      gradient: 'from-purple-500/20 to-transparent',
      chartColor: '#c084fc',
      chartGradient: ['#c084fc', '#c084fc00']
    },
    indigo: {
      text: 'text-indigo-400',
      bg: 'bg-indigo-900/40',
      border: 'border-indigo-500/50',
      shadow: 'shadow-[0_0_15px_rgba(129,140,248,0.3)]',
      gradient: 'from-indigo-500/20 to-transparent',
      chartColor: '#818cf8',
      chartGradient: ['#818cf8', '#818cf800']
    },
    emerald: {
      text: 'text-emerald-400',
      bg: 'bg-emerald-900/40',
      border: 'border-emerald-500/50',
      shadow: 'shadow-[0_0_15px_rgba(52,211,153,0.3)]',
      gradient: 'from-emerald-500/20 to-transparent',
      chartColor: '#34d399',
      chartGradient: ['#34d399', '#34d39900']
    }
  };

  const colors = colorConfig[kpi.color] || colorConfig.cyan;

  // Determine if trend is good
  const isGoodTrend = kpi.isPositiveGood 
    ? kpi.trend > 0 
    : kpi.trend < 0;

  // Calculate progress towards target
  const progressPercent = kpi.target 
    ? Math.min(100, Math.max(0, (kpi.value / kpi.target) * 100))
    : null;

  // Prepare insight payload
  const insightPayload: InsightData = {
    title: kpi.label,
    value: `${kpi.displayValue}${kpi.unit ? ' ' + kpi.unit : ''}`,
    subtext: kpi.subtext,
    color: kpi.color === 'orange' ? 'amber' : kpi.color === 'cyan' ? 'blue' : kpi.color,
    history: kpi.history,
    aiAnalysis: kpi.aiInsight,
    type: 'metric',
    formula: kpi.formula || 'Formula not specified',
    methodology: kpi.methodology || 'Methodology not specified',
    dataSources: ['Primary SRE Cluster', 'ML Analytics Engine', 'Real-time Telemetry Feed', 'Historical Vulnerability Archive']
  };

  const handleClick = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      onClick(insightPayload);
    } catch (e) {
      console.error("Analysis processing failed", e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Trend icon component
  const TrendIcon = kpi.trendDirection === 'up' 
    ? ArrowUpRight 
    : kpi.trendDirection === 'down' 
      ? ArrowDownRight 
      : Minus;

  return (
    <div 
      className={`perspective-1000 group h-full cursor-pointer w-full ${isProcessing ? 'pointer-events-none' : ''}`}
      onClick={handleClick}
      role="button"
      aria-label={`View detailed analysis for ${kpi.label}`}
      aria-busy={isProcessing}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className={`relative h-full bg-slate-800/80 backdrop-blur-xl rounded-xl border border-slate-700/80 
                    transition-all duration-500 ease-out transform-style-3d overflow-hidden
                    ${isProcessing ? 'opacity-100 scale-100' : 'group-hover:rotate-x-1 group-hover:rotate-y-1 group-hover:translate-y-[-3px] group-hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)]'}
                    border-t-slate-600/50`}>
        
        {/* Gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
        
        {/* Content */}
        <div className="relative z-10 p-5 flex flex-col h-full">
          
          {/* Header Row */}
          <div className="flex justify-between items-start mb-3">
            <div className={`p-2.5 rounded-lg backdrop-blur-sm transition-transform duration-300 
                          ${colors.bg} ${colors.border} border ${colors.shadow}
                          ${isProcessing ? 'scale-100' : 'group-hover:scale-110'}`}>
              <IconComponent size={20} className={`${colors.text} ${isProcessing ? 'animate-pulse' : ''}`} />
            </div>
            
            {/* Right side: methodology button + trend badge */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMethodologyModal(true); }}
                className="p-1.5 rounded-lg text-slate-600 hover:text-cyan-300 hover:bg-slate-700/60 transition-all border border-transparent hover:border-slate-600/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                aria-label={`View calculation methodology for ${kpi.label}`}
                title="Calculation Methodology"
                tabIndex={0}
              >
                <Info size={12} />
              </button>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold
                            ${isGoodTrend 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                <TrendIcon size={12} />
                <span>{kpi.trend > 0 ? '+' : ''}{kpi.trend}%</span>
              </div>
            </div>
          </div>

          {/* Label */}
          <h3 className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">
            {kpi.label}
          </h3>

          {/* Value Display */}
          <div className="flex items-baseline gap-1 mb-2">
            <span className={`text-3xl font-bold ${colors.text} drop-shadow-[0_0_8px_currentColor]`}>
              {kpi.displayValue}
            </span>
            {kpi.unit && (
              <span className="text-sm text-slate-400 font-medium">{kpi.unit}</span>
            )}
          </div>

          {/* Subtext */}
          <p className="text-xs text-slate-500 mb-3">{kpi.subtext}</p>

          {/* Target Progress Bar */}
          {kpi.target && progressPercent !== null && (
            <div className="mb-3">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-500 flex items-center gap-1">
                  <Target size={10} />
                  {kpi.targetLabel}
                </span>
                <span className={`font-mono font-bold ${progressPercent <= 100 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {progressPercent.toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    kpi.isPositiveGood 
                      ? progressPercent >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
                      : progressPercent <= 100 ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, progressPercent)}%` }}
                />
              </div>
            </div>
          )}

          {/* Sparkline Chart */}
          {kpi.history && kpi.history.length > 0 && (
            <div className="flex-1 min-h-[60px] mt-auto">
              <ResponsiveContainer width="100%" height={60}>
                <AreaChart data={kpi.history} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`gradient-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.chartColor} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={colors.chartColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip content={<SparklineTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke={colors.chartColor}
                    strokeWidth={2}
                    fill={`url(#gradient-${kpi.id})`}
                    dot={false}
                    activeDot={{ 
                      r: 4, 
                      fill: colors.chartColor,
                      stroke: chartTheme.dotOutlineStroke,
                      strokeWidth: 2
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* AI Insight Preview */}
          {kpi.aiInsight && (
            <div 
              className="mt-2 relative"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <div className="flex items-center gap-1 text-xs text-cyan-400/70 cursor-help">
                <Sparkles size={10} />
                <span className="truncate">AI Insight available</span>
                <Info size={10} className="ml-auto opacity-50" />
              </div>
              
              {/* AI Insight Tooltip */}
              {showTooltip && (
                <div className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-slate-900/95 backdrop-blur-xl 
                              border border-cyan-500/30 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-start gap-2">
                    <Sparkles size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-slate-300 leading-relaxed">{kpi.aiInsight}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Interactive Cue */}
          {!isProcessing && (
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <MousePointerClick size={14} className="text-cyan-400 animate-bounce" />
            </div>
          )}
        </div>

        {/* Loading Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-in fade-in">
            <Loader2 className={`${colors.text} animate-spin mb-2`} size={32} />
            <span className={`text-xs ${colors.text} font-bold uppercase tracking-widest animate-pulse`}>
              Analyzing...
            </span>
          </div>
        )}
      </div>

      {/* Calculation Methodology Modal */}
      <CalculationMethodologyModal
        isOpen={showMethodologyModal}
        onClose={() => setShowMethodologyModal(false)}
        methodologyKey={kpi.id}
      />
    </div>
  );
};

export default ExtendedKPICard;
