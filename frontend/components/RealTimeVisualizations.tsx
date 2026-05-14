/**
 * Real-Time Data Visualizations
 * 
 * Interactive charts with streaming data effects, particle animations,
 * and context-aware transitions for enhanced data presentation.
 * 
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ReferenceArea, Brush
} from 'recharts';
import {
  Activity, TrendingUp, TrendingDown, Zap, Radio, Waves,
  Circle, RefreshCw, Maximize2, Download, Settings,
  Play, Pause, ChevronDown, Eye, EyeOff
} from 'lucide-react';
import { Card, Badge } from './ui/Card';
import { useStreamingData, useAnimatedValue, usePulseAnimation } from '../utils/animationUtils';
import { useChartTheme } from '../hooks/useChartTheme';

// ==================== TYPES ====================

interface DataPoint {
  timestamp: string;
  value: number;
  label?: string;
  category?: string;
  anomaly?: boolean;
}

interface StreamingChartProps {
  data: DataPoint[];
  title: string;
  color?: string;
  height?: number;
  showControls?: boolean;
  onDataPointClick?: (point: DataPoint) => void;
  refreshInterval?: number;
  enableStreaming?: boolean;
}

interface LiveMetricProps {
  value: number;
  label: string;
  unit?: string;
  trend?: number;
  color?: string;
  sparklineData?: number[];
  isLive?: boolean;
}

interface HeatmapData {
  x: string;
  y: string;
  value: number;
}

interface HeatmapChartProps {
  data: HeatmapData[];
  title: string;
  xLabels: string[];
  yLabels: string[];
  colorScale?: [string, string, string]; // low, mid, high
}

interface AnimatedBarChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  title: string;
  height?: number;
  orientation?: 'horizontal' | 'vertical';
  animated?: boolean;
}

// ==================== HELPER COMPONENTS ====================

const StreamingIndicator: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  return (
    <div className="flex items-center gap-2">
      <div className={`relative ${isActive ? 'animate-pulse' : ''}`}>
        <Radio size={14} className={isActive ? 'text-emerald-400' : 'text-slate-500'} />
        {isActive && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
        )}
      </div>
      <span className={`text-xs font-medium ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
        {isActive ? 'LIVE' : 'PAUSED'}
      </span>
    </div>
  );
};

const ParticleCanvas: React.FC<{ 
  width: number; 
  height: number; 
  color: string;
  intensity?: number;
  direction?: 'up' | 'down' | 'horizontal';
}> = ({ width, height, color, intensity = 20, direction = 'up' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
  }>>([]);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const createParticle = () => ({
      x: direction === 'horizontal' ? 0 : Math.random() * width,
      y: direction === 'up' ? height : direction === 'down' ? 0 : Math.random() * height,
      vx: direction === 'horizontal' ? 0.5 + Math.random() : (Math.random() - 0.5) * 0.5,
      vy: direction === 'up' ? -(0.5 + Math.random()) : direction === 'down' ? 0.5 + Math.random() : 0,
      life: 0,
      maxLife: 2000 + Math.random() * 2000,
      size: 1 + Math.random() * 2
    });

    // Initialize particles
    particlesRef.current = Array.from({ length: intensity }, createParticle);

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      ctx.clearRect(0, 0, width, height);

      particlesRef.current.forEach((particle, index) => {
        particle.life += deltaTime;
        
        if (particle.life >= particle.maxLife) {
          particlesRef.current[index] = createParticle();
          return;
        }

        const lifeProgress = particle.life / particle.maxLife;
        const opacity = Math.sin(lifeProgress * Math.PI);

        particle.x += particle.vx * (deltaTime / 16);
        particle.y += particle.vy * (deltaTime / 16);

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = color.replace(')', `, ${opacity * 0.6})`).replace('rgb', 'rgba');
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height, color, intensity, direction]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const isAnomaly = data.payload?.anomaly;

    return (
      <div className={`
        bg-slate-800/95 backdrop-blur-xl p-4 border rounded-lg shadow-xl
        ${isAnomaly ? 'border-rose-500/50' : 'border-slate-600/50'}
      `}>
        <p className="text-xs text-slate-400 mb-1">{label}</p>
        <p className="text-lg font-bold text-white font-mono">
          {typeof data.value === 'number' ? data.value.toLocaleString() : data.value}
        </p>
        {isAnomaly && (
          <div className="mt-2 flex items-center gap-1 text-xs text-rose-400">
            <Activity size={12} />
            <span>Anomaly Detected</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// ==================== STREAMING CHART ====================

export const StreamingChart: React.FC<StreamingChartProps> = ({
  data,
  title,
  color = '#06b6d4',
  height = 300,
  showControls = true,
  onDataPointClick,
  refreshInterval = 1000,
  enableStreaming = true
}) => {
  const [isStreaming, setIsStreaming] = useState(enableStreaming);
  const [visibleData, setVisibleData] = useState<DataPoint[]>(data.slice(0, Math.min(5, data.length)));
  const [showParticles, setShowParticles] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamIndexRef = useRef(Math.min(5, data.length));
  const chartTheme = useChartTheme();

  useEffect(() => {
    if (!isStreaming || streamIndexRef.current >= data.length) return;

    const interval = setInterval(() => {
      if (streamIndexRef.current < data.length) {
        setVisibleData(prev => [...prev, data[streamIndexRef.current]]);
        streamIndexRef.current += 1;
      } else {
        setIsStreaming(false);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [isStreaming, data, refreshInterval]);

  // Reset when data changes
  useEffect(() => {
    setVisibleData(data.slice(0, Math.min(5, data.length)));
    streamIndexRef.current = Math.min(5, data.length);
    if (enableStreaming) {
      setIsStreaming(true);
    }
  }, [data, enableStreaming]);

  const latestValue = visibleData[visibleData.length - 1]?.value || 0;
  const previousValue = visibleData[visibleData.length - 2]?.value || latestValue;
  const trend = previousValue !== 0 ? ((latestValue - previousValue) / previousValue) * 100 : 0;

  return (
    <Card className="relative overflow-hidden">
      {/* Particle Background */}
      {showParticles && isStreaming && containerRef.current && (
        <ParticleCanvas
          width={containerRef.current.offsetWidth}
          height={height}
          color={color}
          intensity={15}
          direction="up"
        />
      )}

      <div className="p-5 relative z-10" ref={containerRef}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">{title}</h3>
            <StreamingIndicator isActive={isStreaming} />
          </div>

          {showControls && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowParticles(!showParticles)}
                className={`p-1.5 rounded transition-colors ${showParticles ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-white'}`}
                title={showParticles ? 'Hide particles' : 'Show particles'}
              >
                <Waves size={14} />
              </button>
              <button
                onClick={() => setIsStreaming(!isStreaming)}
                className="p-1.5 rounded bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
                title={isStreaming ? 'Pause' : 'Play'}
              >
                {isStreaming ? <Pause size={14} className="text-white" /> : <Play size={14} className="text-white" />}
              </button>
            </div>
          )}
        </div>

        {/* Live Value Display */}
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-3xl font-bold text-white font-mono" style={{ color }}>
            {latestValue.toLocaleString()}
          </span>
          <div className={`flex items-center gap-1 text-sm font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        </div>

        {/* Chart */}
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visibleData}>
              <defs>
                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} opacity={0.3} />
              <XAxis 
                dataKey="timestamp" 
                tick={{ fill: chartTheme.tickFillMuted, fontSize: 10 }}
                axisLine={{ stroke: chartTheme.axisLineStroke }}
              />
              <YAxis 
                tick={{ fill: chartTheme.tickFillMuted, fontSize: 10 }}
                axisLine={{ stroke: chartTheme.axisLineStroke }}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#gradient-${title})`}
                isAnimationActive={true}
                animationDuration={300}
                animationEasing="ease-out"
                dot={(props: any) => {
                  const { cx, cy, payload, index } = props;
                  const isLatest = index === visibleData.length - 1;
                  const isAnomaly = payload.anomaly;
                  
                  return (
                    <g>
                      {/* Regular dot */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isLatest ? 6 : isAnomaly ? 5 : 3}
                        fill={isAnomaly ? '#ef4444' : color}
                        stroke={isLatest ? chartTheme.dotOutlineStroke : 'transparent'}
                        strokeWidth={2}
                        style={{ cursor: 'pointer' }}
                        onClick={() => onDataPointClick?.(payload)}
                      />
                      {/* Pulse effect for latest point */}
                      {isLatest && isStreaming && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={12}
                          fill="transparent"
                          stroke={color}
                          strokeWidth={2}
                          opacity={0.5}
                          className="animate-ping"
                        />
                      )}
                    </g>
                  );
                }}
              />
              {/* Anomaly reference areas */}
              {visibleData.filter(d => d.anomaly).map((point, i) => (
                <ReferenceArea
                  key={i}
                  x1={point.timestamp}
                  x2={point.timestamp}
                  fill="#ef4444"
                  fillOpacity={0.1}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Data loaded</span>
            <span>{visibleData.length} / {data.length}</span>
          </div>
          <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${(visibleData.length / data.length) * 100}%`,
                background: `linear-gradient(90deg, ${color}, ${color}80)`
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

// ==================== LIVE METRIC DISPLAY ====================

export const LiveMetric: React.FC<LiveMetricProps> = ({
  value,
  label,
  unit = '',
  trend,
  color = '#06b6d4',
  sparklineData = [],
  isLive = true
}) => {
  const animatedValue = useAnimatedValue(value, { duration: 1000, easing: 'easeOut' });
  const { scale, style: pulseStyle } = usePulseAnimation(isLive, { duration: 2000 });

  // Generate mini sparkline
  const sparklinePoints = useMemo(() => {
    if (sparklineData.length === 0) return '';
    const max = Math.max(...sparklineData);
    const min = Math.min(...sparklineData);
    const range = max - min || 1;
    const width = 80;
    const height = 24;
    const step = width / (sparklineData.length - 1);

    return sparklineData
      .map((v, i) => {
        const x = i * step;
        const y = height - ((v - min) / range) * height;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [sparklineData]);

  return (
    <div 
      className="relative bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 overflow-hidden group hover:border-slate-600/50 transition-all"
      style={pulseStyle}
    >
      {/* Glow effect */}
      <div 
        className="absolute -inset-1 opacity-0 group-hover:opacity-20 blur-xl transition-opacity"
        style={{ background: color }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</span>
          {isLive && (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">LIVE</span>
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <span 
            className="text-2xl font-bold font-mono"
            style={{ color }}
          >
            {Math.round(animatedValue).toLocaleString()}
          </span>
          {unit && <span className="text-sm text-slate-500">{unit}</span>}
          {trend !== undefined && (
            <span className={`text-xs font-medium flex items-center ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>

        {/* Mini Sparkline */}
        {sparklinePoints && (
          <div className="mt-2">
            <svg width="80" height="24" className="overflow-visible">
              <path
                d={sparklinePoints}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.7}
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== ANIMATED BAR CHART ====================

export const AnimatedBarChart: React.FC<AnimatedBarChartProps> = ({
  data,
  title,
  height = 250,
  orientation = 'vertical',
  animated = true
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [animatedItems, setAnimatedItems] = useState<boolean[]>([]);
  const chartTheme = useChartTheme();

  // Staggered animation effect
  useEffect(() => {
    if (!animated) return;
    const timers: NodeJS.Timeout[] = [];
    data.forEach((_, index) => {
      timers.push(setTimeout(() => {
        setAnimatedItems(prev => {
          const newState = [...prev];
          newState[index] = true;
          return newState;
        });
      }, index * 80));
    });
    return () => timers.forEach(t => clearTimeout(t));
  }, [data.length, animated]);

  const getItemStyle = (index: number) => ({
    opacity: animatedItems[index] ? 1 : 0,
    transform: animatedItems[index] ? 'translateY(0)' : 'translateY(20px)',
    transition: 'all 0.3s ease-out'
  });

  const maxValue = Math.max(...data.map(d => d.value));

  const defaultColors = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  if (orientation === 'horizontal') {
    return (
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">{title}</h3>
        <div className="space-y-3">
          {data.map((item, index) => {
            const percentage = (item.value / maxValue) * 100;
            const color = item.color || defaultColors[index % defaultColors.length];
            const isHovered = hoveredIndex === index;

            return (
              <div 
                key={index}
                className="group cursor-pointer"
                style={animated ? getItemStyle(index) : undefined}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300 truncate max-w-[150px]">{item.name}</span>
                  <span className="text-white font-mono">{item.value.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${percentage}%`,
                      background: `linear-gradient(90deg, ${color}, ${color}80)`,
                      transform: isHovered ? 'scaleY(1.5)' : 'scaleY(1)',
                      boxShadow: isHovered ? `0 0 10px ${color}` : 'none'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">{title}</h3>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} opacity={0.3} />
            <XAxis 
              dataKey="name" 
              tick={{ fill: chartTheme.tickFillMuted, fontSize: 10 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fill: chartTheme.tickFillMuted, fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="value" 
              radius={[4, 4, 0, 0]}
              isAnimationActive={animated}
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <rect
                  key={index}
                  fill={entry.color || defaultColors[index % defaultColors.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// ==================== HEATMAP CHART ====================

export const HeatmapChart: React.FC<HeatmapChartProps> = ({
  data,
  title,
  xLabels,
  yLabels,
  colorScale = ['#10b981', '#f59e0b', '#ef4444']
}) => {
  const [hoveredCell, setHoveredCell] = useState<{ x: string; y: string } | null>(null);
  
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));

  const getColor = (value: number) => {
    const percentage = (value - minValue) / (maxValue - minValue);
    if (percentage < 0.33) {
      return colorScale[0];
    } else if (percentage < 0.66) {
      return colorScale[1];
    }
    return colorScale[2];
  };

  const getValue = (x: string, y: string) => {
    const cell = data.find(d => d.x === x && d.y === y);
    return cell?.value || 0;
  };

  return (
    <Card className="p-5">
      <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">{title}</h3>
      
      <div className="overflow-x-auto">
        <div className="grid gap-1" style={{ gridTemplateColumns: `auto repeat(${xLabels.length}, 1fr)` }}>
          {/* Empty corner */}
          <div />
          
          {/* X Labels */}
          {xLabels.map((label) => (
            <div key={label} className="text-xs text-slate-400 text-center py-2 font-medium">
              {label}
            </div>
          ))}

          {/* Rows */}
          {yLabels.map((yLabel) => (
            <React.Fragment key={yLabel}>
              {/* Y Label */}
              <div className="text-xs text-slate-400 pr-3 py-2 font-medium text-right">
                {yLabel}
              </div>
              
              {/* Cells */}
              {xLabels.map((xLabel) => {
                const value = getValue(xLabel, yLabel);
                const isHovered = hoveredCell?.x === xLabel && hoveredCell?.y === yLabel;
                
                return (
                  <div
                    key={`${xLabel}-${yLabel}`}
                    className="relative aspect-square rounded cursor-pointer transition-all duration-200"
                    style={{
                      backgroundColor: getColor(value),
                      opacity: isHovered ? 1 : 0.7,
                      transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                      zIndex: isHovered ? 10 : 1
                    }}
                    onMouseEnter={() => setHoveredCell({ x: xLabel, y: yLabel })}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {isHovered && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 px-2 py-1 rounded text-xs text-white whitespace-nowrap shadow-xl border border-slate-600 z-20">
                        {value.toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colorScale[0] }} />
          <span className="text-xs text-slate-400">Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colorScale[1] }} />
          <span className="text-xs text-slate-400">Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: colorScale[2] }} />
          <span className="text-xs text-slate-400">High</span>
        </div>
      </div>
    </Card>
  );
};

// ==================== COMPARISON CHART ====================

interface ComparisonChartProps {
  data: Array<{
    category: string;
    current: number;
    previous: number;
  }>;
  title: string;
  height?: number;
}

export const ComparisonChart: React.FC<ComparisonChartProps> = ({
  data,
  title,
  height = 250
}) => {
  const chartTheme = useChartTheme();
  return (
    <Card className="p-5">
      <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">{title}</h3>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={0} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} opacity={0.3} />
            <XAxis dataKey="category" tick={{ fill: chartTheme.tickFillMuted, fontSize: 10 }} />
            <YAxis tick={{ fill: chartTheme.tickFillMuted, fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value) => <span className="text-xs text-slate-300">{value}</span>}
            />
            <Bar 
              dataKey="previous" 
              name="Previous" 
              fill="#64748b" 
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
              animationDuration={800}
            />
            <Bar 
              dataKey="current" 
              name="Current" 
              fill="#06b6d4" 
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
              animationDuration={800}
              animationBegin={200}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// ==================== REAL-TIME DASHBOARD GRID ====================

interface RealTimeDashboardProps {
  vulnerableData: DataPoint[];
  potentialData: DataPoint[];
  secureData: DataPoint[];
  metricsSnapshot: {
    totalAssessed: number;
    vulnerable: number;
    potential: number;
    secure: number;
    trendVulnerable: number;
    trendSecure: number;
  };
}

export const RealTimeDashboard: React.FC<RealTimeDashboardProps> = ({
  vulnerableData,
  potentialData,
  secureData,
  metricsSnapshot
}) => {
  const [isGlobalStreaming, setIsGlobalStreaming] = useState(true);

  return (
    <div className="space-y-6">
      {/* Global Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white uppercase tracking-widest">Real-Time Analytics</h2>
          <StreamingIndicator isActive={isGlobalStreaming} />
        </div>
        <button
          onClick={() => setIsGlobalStreaming(!isGlobalStreaming)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider
            transition-all border
            ${isGlobalStreaming 
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
              : 'bg-slate-700/50 text-slate-400 border-slate-600/50'
            }
          `}
        >
          {isGlobalStreaming ? <Pause size={14} /> : <Play size={14} />}
          {isGlobalStreaming ? 'Pause All' : 'Resume All'}
        </button>
      </div>

      {/* Live Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <LiveMetric
          value={metricsSnapshot.totalAssessed}
          label="Total Assessed"
          color="#06b6d4"
          isLive={isGlobalStreaming}
          sparklineData={[...Array(10)].map(() => metricsSnapshot.totalAssessed * (0.95 + Math.random() * 0.1))}
        />
        <LiveMetric
          value={metricsSnapshot.secure}
          label="Secure"
          trend={metricsSnapshot.trendSecure}
          color="#10b981"
          isLive={isGlobalStreaming}
          sparklineData={secureData.slice(-10).map(d => d.value)}
        />
        <LiveMetric
          value={metricsSnapshot.potential}
          label="Potentially Vulnerable"
          color="#f59e0b"
          isLive={isGlobalStreaming}
          sparklineData={potentialData.slice(-10).map(d => d.value)}
        />
        <LiveMetric
          value={metricsSnapshot.vulnerable}
          label="Vulnerable"
          trend={metricsSnapshot.trendVulnerable}
          color="#ef4444"
          isLive={isGlobalStreaming}
          sparklineData={vulnerableData.slice(-10).map(d => d.value)}
        />
      </div>

      {/* Streaming Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StreamingChart
          data={vulnerableData}
          title="Vulnerable Assets Stream"
          color="#ef4444"
          enableStreaming={isGlobalStreaming}
          refreshInterval={800}
        />
        <StreamingChart
          data={secureData}
          title="Secure Assets Stream"
          color="#10b981"
          enableStreaming={isGlobalStreaming}
          refreshInterval={1000}
        />
      </div>
    </div>
  );
};

export default RealTimeDashboard;
