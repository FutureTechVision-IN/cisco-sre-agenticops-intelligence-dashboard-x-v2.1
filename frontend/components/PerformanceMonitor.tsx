/**
 * Performance Monitor
 * 
 * System performance monitoring, user engagement tracking,
 * and feedback collection for continuous improvement.
 * 
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Activity, Cpu, HardDrive, Wifi, Clock, Users, Eye,
  MousePointer, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, XCircle, RefreshCw, Settings, Download,
  BarChart3, Gauge, Zap, Server, Database, Globe
} from 'lucide-react';
import { Card, Badge } from './ui/Card';
import { aiAnalytics } from '../services/aiAnalyticsService';
import { useChartTheme } from '../hooks/useChartTheme';

// ==================== TYPES ====================

export interface PerformanceMetrics {
  fps: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: number;
  network: {
    latency: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
  };
  renderTime: number;
  dataLoadTime: number;
}

export interface UserSession {
  sessionId: string;
  startTime: Date;
  duration: number;
  pageViews: number;
  interactions: number;
  visualizationsViewed: string[];
  feedbackSubmitted: boolean;
}

export interface FeedbackData {
  sessionId: string;
  rating: number;
  comments: string;
  mostUsefulFeature: string;
  suggestions: string;
  timestamp: Date;
}

export interface SystemStatus {
  apiHealth: 'healthy' | 'degraded' | 'down';
  databaseHealth: 'healthy' | 'degraded' | 'down';
  cacheHealth: 'healthy' | 'degraded' | 'down';
  lastChecked: Date;
}

// ==================== PERFORMANCE MONITORING HOOK ====================

export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memory: { used: 0, total: 0, percentage: 0 },
    cpu: 0,
    network: { latency: 0, status: 'good' },
    renderTime: 0,
    dataLoadTime: 0
  });

  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const rafIdRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const measureFPS = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastFrameTimeRef.current;
      lastFrameTimeRef.current = currentTime;

      frameTimesRef.current.push(deltaTime);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
      const fps = Math.round(1000 / avgFrameTime);

      setMetrics(prev => ({ ...prev, fps: Math.min(fps, 144) }));

      rafIdRef.current = requestAnimationFrame(measureFPS);
    };

    rafIdRef.current = requestAnimationFrame(measureFPS);

    // Memory monitoring (if available)
    const memoryInterval = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memory: {
            used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
            percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
          }
        }));
      }
    }, 2000);

    // Network latency monitoring
    const measureLatency = async () => {
      try {
        const start = performance.now();
        await fetch('/api/health', { method: 'HEAD', cache: 'no-store' }).catch(() => {});
        const latency = performance.now() - start;
        
        let status: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
        if (latency < 50) status = 'excellent';
        else if (latency < 100) status = 'good';
        else if (latency < 300) status = 'fair';
        else status = 'poor';

        setMetrics(prev => ({
          ...prev,
          network: { latency: Math.round(latency), status }
        }));
      } catch {
        setMetrics(prev => ({
          ...prev,
          network: { latency: 0, status: 'poor' }
        }));
      }
    };

    const latencyInterval = setInterval(measureLatency, 10000);
    measureLatency();

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      clearInterval(memoryInterval);
      clearInterval(latencyInterval);
    };
  }, []);

  const measureRenderTime = useCallback((callback: () => void) => {
    const start = performance.now();
    callback();
    const renderTime = performance.now() - start;
    setMetrics(prev => ({ ...prev, renderTime: Math.round(renderTime * 100) / 100 }));
  }, []);

  const measureDataLoadTime = useCallback(async <T,>(asyncFn: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    const result = await asyncFn();
    const loadTime = performance.now() - start;
    setMetrics(prev => ({ ...prev, dataLoadTime: Math.round(loadTime) }));
    return result;
  }, []);

  return { metrics, measureRenderTime, measureDataLoadTime };
};

// ==================== USER SESSION TRACKING ====================

export const useSessionTracking = () => {
  const [session, setSession] = useState<UserSession>(() => ({
    sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    startTime: new Date(),
    duration: 0,
    pageViews: 1,
    interactions: 0,
    visualizationsViewed: [],
    feedbackSubmitted: false
  }));

  useEffect(() => {
    // Update duration every second
    const interval = setInterval(() => {
      setSession(prev => ({
        ...prev,
        duration: Math.round((Date.now() - prev.startTime.getTime()) / 1000)
      }));
    }, 1000);

    // Track page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setSession(prev => ({ ...prev, pageViews: prev.pageViews + 1 }));
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Track interactions
    const handleInteraction = () => {
      setSession(prev => ({ ...prev, interactions: prev.interactions + 1 }));
    };
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  const trackVisualization = useCallback((visualizationType: string) => {
    setSession(prev => ({
      ...prev,
      visualizationsViewed: prev.visualizationsViewed.includes(visualizationType)
        ? prev.visualizationsViewed
        : [...prev.visualizationsViewed, visualizationType]
    }));

    aiAnalytics.trackEngagement({
      visualizationType,
      interactionType: 'view',
      duration: 0
    });
  }, []);

  const markFeedbackSubmitted = useCallback(() => {
    setSession(prev => ({ ...prev, feedbackSubmitted: true }));
  }, []);

  return { session, trackVisualization, markFeedbackSubmitted };
};

// ==================== COMPONENTS ====================

const MetricGauge: React.FC<{
  value: number;
  max: number;
  label: string;
  unit?: string;
  color: string;
  warningThreshold?: number;
  criticalThreshold?: number;
}> = ({ value, max, label, unit = '', color, warningThreshold = 70, criticalThreshold = 90 }) => {
  const chartTheme = useChartTheme();
  const percentage = (value / max) * 100;
  const displayColor = percentage > criticalThreshold 
    ? '#ef4444' 
    : percentage > warningThreshold 
      ? '#f59e0b' 
      : color;

  return (
    <div className="text-center">
      <div className="relative w-20 h-20 mx-auto">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="40"
            cy="40"
            r="35"
            fill="none"
            stroke={chartTheme.ringTrackStroke}
            strokeWidth="6"
          />
          <circle
            cx="40"
            cy="40"
            r="35"
            fill="none"
            stroke={displayColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 35}`}
            strokeDashoffset={`${2 * Math.PI * 35 * (1 - percentage / 100)}`}
            className="transition-all duration-500"
            style={{ filter: `drop-shadow(0 0 4px ${displayColor})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white font-mono">
            {Math.round(value)}{unit}
          </span>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-2">{label}</p>
    </div>
  );
};

const StatusIndicator: React.FC<{
  status: 'healthy' | 'degraded' | 'down' | 'excellent' | 'good' | 'fair' | 'poor';
  label: string;
}> = ({ status, label }) => {
  const statusConfig = {
    healthy: { color: 'bg-emerald-500', text: 'text-emerald-400', icon: CheckCircle2 },
    excellent: { color: 'bg-emerald-500', text: 'text-emerald-400', icon: CheckCircle2 },
    good: { color: 'bg-blue-500', text: 'text-blue-400', icon: CheckCircle2 },
    degraded: { color: 'bg-amber-500', text: 'text-amber-400', icon: AlertTriangle },
    fair: { color: 'bg-amber-500', text: 'text-amber-400', icon: AlertTriangle },
    down: { color: 'bg-rose-500', text: 'text-rose-400', icon: XCircle },
    poor: { color: 'bg-rose-500', text: 'text-rose-400', icon: XCircle }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${config.color} animate-pulse`} />
      <Icon size={14} className={config.text} />
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-xs font-medium uppercase ${config.text}`}>{status}</span>
    </div>
  );
};

// ==================== PERFORMANCE MONITOR PANEL ====================

interface PerformanceMonitorPanelProps {
  isExpanded?: boolean;
  onToggle?: () => void;
}

export const PerformanceMonitorPanel: React.FC<PerformanceMonitorPanelProps> = ({
  isExpanded = false,
  onToggle
}) => {
  const { metrics } = usePerformanceMonitor();
  const { session } = useSessionTracking();
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    apiHealth: 'healthy',
    databaseHealth: 'healthy',
    cacheHealth: 'healthy',
    lastChecked: new Date()
  });

  const engagementStats = useMemo(() => aiAnalytics.getEngagementAnalytics(), []);

  // Simulate system health checks
  useEffect(() => {
    const checkHealth = () => {
      setSystemStatus({
        apiHealth: Math.random() > 0.1 ? 'healthy' : 'degraded',
        databaseHealth: Math.random() > 0.05 ? 'healthy' : 'degraded',
        cacheHealth: 'healthy',
        lastChecked: new Date()
      });
    };

    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!isExpanded) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-lg shadow-xl hover:bg-slate-700/90 transition-all group"
        title="Show Performance Monitor"
      >
        <Gauge size={16} className="text-cyan-400" />
        <span className="text-xs font-medium text-slate-300 group-hover:text-white">
          {metrics.fps} FPS
        </span>
        <div className={`w-2 h-2 rounded-full ${
          metrics.fps > 50 ? 'bg-emerald-500' : metrics.fps > 30 ? 'bg-amber-500' : 'bg-rose-500'
        }`} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-80 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-700/50 border-b border-slate-600/50">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-cyan-400" />
          <span className="text-sm font-semibold text-white">Performance Monitor</span>
        </div>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-slate-600/50 rounded transition-colors"
        >
          <XCircle size={16} className="text-slate-400 hover:text-white" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
        {/* Performance Gauges */}
        <div className="grid grid-cols-3 gap-4">
          <MetricGauge
            value={metrics.fps}
            max={144}
            label="FPS"
            color="#06b6d4"
            warningThreshold={70}
            criticalThreshold={95}
          />
          <MetricGauge
            value={metrics.memory.percentage}
            max={100}
            label="Memory"
            unit="%"
            color="#8b5cf6"
          />
          <MetricGauge
            value={metrics.network.latency}
            max={500}
            label="Latency"
            unit="ms"
            color="#10b981"
            warningThreshold={30}
            criticalThreshold={60}
          />
        </div>

        {/* System Status */}
        <Card className="p-3 bg-slate-900/50">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Server size={12} />
            System Status
          </h4>
          <div className="space-y-2">
            <StatusIndicator status={systemStatus.apiHealth} label="API" />
            <StatusIndicator status={systemStatus.databaseHealth} label="Database" />
            <StatusIndicator status={systemStatus.cacheHealth} label="Cache" />
            <StatusIndicator status={metrics.network.status} label="Network" />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Last checked: {systemStatus.lastChecked.toLocaleTimeString()}
          </p>
        </Card>

        {/* Session Info */}
        <Card className="p-3 bg-slate-900/50">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users size={12} />
            Session Info
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500">Duration</span>
              <p className="text-white font-mono">
                {Math.floor(session.duration / 60)}m {session.duration % 60}s
              </p>
            </div>
            <div>
              <span className="text-slate-500">Interactions</span>
              <p className="text-white font-mono">{session.interactions}</p>
            </div>
            <div>
              <span className="text-slate-500">Views</span>
              <p className="text-white font-mono">{session.pageViews}</p>
            </div>
            <div>
              <span className="text-slate-500">Charts Viewed</span>
              <p className="text-white font-mono">{session.visualizationsViewed.length}</p>
            </div>
          </div>
        </Card>

        {/* Engagement Stats */}
        <Card className="p-3 bg-slate-900/50">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Eye size={12} />
            Engagement
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Total Interactions</span>
              <span className="text-white font-mono">{engagementStats.totalInteractions}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Avg. Duration</span>
              <span className="text-white font-mono">{Math.round(engagementStats.averageDuration / 1000)}s</span>
            </div>
            {engagementStats.mostViewedVisualizations.slice(0, 3).map((viz, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-400 truncate max-w-[150px]">{viz.type}</span>
                <span className="text-cyan-400 font-mono">{viz.count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Render Stats */}
        <Card className="p-3 bg-slate-900/50">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap size={12} />
            Performance Metrics
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500">Render Time</span>
              <p className="text-white font-mono">{metrics.renderTime}ms</p>
            </div>
            <div>
              <span className="text-slate-500">Data Load</span>
              <p className="text-white font-mono">{metrics.dataLoadTime}ms</p>
            </div>
            <div>
              <span className="text-slate-500">Memory Used</span>
              <p className="text-white font-mono">{metrics.memory.used}MB</p>
            </div>
            <div>
              <span className="text-slate-500">Memory Total</span>
              <p className="text-white font-mono">{metrics.memory.total}MB</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-slate-700/30 border-t border-slate-600/30">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Session: {session.sessionId.slice(0, 16)}...
          </span>
          <button className="text-xs text-cyan-400 hover:text-cyan-300 font-medium">
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== FEEDBACK MODAL ====================

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: FeedbackData) => void;
  sessionId: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  sessionId
}) => {
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');
  const [mostUsefulFeature, setMostUsefulFeature] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const features = [
    'AI Insights',
    'Real-time Charts',
    'Pattern Detection',
    'Forecasting',
    'Recommendations',
    'Performance Monitor'
  ];

  const handleSubmit = async () => {
    if (rating === 0) return;

    setIsSubmitting(true);
    
    const feedback: FeedbackData = {
      sessionId,
      rating,
      comments,
      mostUsefulFeature,
      suggestions,
      timestamp: new Date()
    };

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onSubmit(feedback);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-700/50 border-b border-slate-600/50">
          <h3 className="text-lg font-semibold text-white">Help Us Improve</h3>
          <p className="text-sm text-slate-400">Your feedback helps us build better analytics tools</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Rating */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              How would you rate your experience?
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`w-10 h-10 rounded-lg border transition-all ${
                    star <= rating
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                      : 'border-slate-600 text-slate-500 hover:border-slate-500'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Most Useful Feature */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Most useful feature
            </label>
            <div className="flex flex-wrap gap-2">
              {features.map((feature) => (
                <button
                  key={feature}
                  onClick={() => setMostUsefulFeature(feature)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                    mostUsefulFeature === feature
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                      : 'border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {feature}
                </button>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Comments (optional)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="What did you like? What can we improve?"
              className="w-full h-20 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none"
            />
          </div>

          {/* Suggestions */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              Suggestions (optional)
            </label>
            <input
              type="text"
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              placeholder="Any feature requests?"
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-700/30 border-t border-slate-600/30 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              rating === 0 || isSubmitting
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                : 'bg-cyan-600 text-white hover:bg-cyan-500'
            }`}
          >
            {isSubmitting ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              'Submit Feedback'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== ACCESSIBILITY CHECKER ====================

export const useAccessibilityChecker = () => {
  const [issues, setIssues] = useState<string[]>([]);

  useEffect(() => {
    const checkAccessibility = () => {
      const newIssues: string[] = [];

      // Check for images without alt text
      document.querySelectorAll('img:not([alt])').forEach(() => {
        newIssues.push('Image missing alt text');
      });

      // Check for buttons without accessible names
      document.querySelectorAll('button:not([aria-label]):not([title])').forEach((btn) => {
        if (!btn.textContent?.trim()) {
          newIssues.push('Button missing accessible name');
        }
      });

      // Check for interactive elements without focus indicators
      // This is a simplified check
      const focusableElements = document.querySelectorAll('button, a, input, select, textarea');
      if (focusableElements.length > 0) {
        const style = getComputedStyle(focusableElements[0]);
        if (style.outlineStyle === 'none' && !style.boxShadow) {
          newIssues.push('Some elements may lack focus indicators');
        }
      }

      // Check color contrast (simplified)
      const bodyBg = getComputedStyle(document.body).backgroundColor;
      if (bodyBg === 'rgb(0, 0, 0)' || bodyBg === '#000000') {
        // Dark background - check for light text
        const textElements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6');
        textElements.forEach((el) => {
          const color = getComputedStyle(el).color;
          if (color === 'rgb(0, 0, 0)' || color === '#000000') {
            newIssues.push('Potential color contrast issue');
          }
        });
      }

      setIssues([...new Set(newIssues)]);
    };

    // Run on mount and when DOM changes
    checkAccessibility();
    const observer = new MutationObserver(checkAccessibility);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return { issues, isCompliant: issues.length === 0 };
};

export default PerformanceMonitorPanel;
