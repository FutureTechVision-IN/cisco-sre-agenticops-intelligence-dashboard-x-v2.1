/**
 * KPI Intelligence Briefing Component
 * Real-time KPI storytelling panel powered by the KPI Storytelling Engine.
 * Shows live KPI snapshots, narratives, cross-KPI insights, and a voice briefing button.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Activity, AlertTriangle, ArrowDown, ArrowRight, ArrowUp,
  BarChart3, Brain, CheckCircle, ChevronDown, ChevronUp,
  Lightbulb, Mic, RefreshCw, Shield, Sparkles, TrendingDown,
  TrendingUp, Volume2, XCircle, Zap
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────

interface KPISnapshot {
  kpiId: string;
  value: number;
  formattedValue: string;
  target: number;
  status: 'critical' | 'warning' | 'on-track' | 'exceeding';
  trend: 'improving' | 'stable' | 'degrading';
  trendDelta: number;
  percentOfTarget: number;
  calculatedAt: string;
  dataPoints: number;
}

interface KPINarrative {
  kpiId: string;
  headline: string;
  summary: string;
  explanation: string;
  businessImpact: string;
  recommendation: string;
  voiceText: string;
  confidence: number;
  supportingData: { label: string; value: string }[];
  relatedKPIs: string[];
  severity: string;
}

interface CrossKPIInsight {
  title: string;
  narrative: string;
  kpisInvolved: string[];
  correlationType: string;
  confidence: number;
  actionable: boolean;
  recommendation: string;
}

interface StoryData {
  generatedAt: string;
  overallHealth: 'healthy' | 'at-risk' | 'critical';
  overallScore: number;
  kpiSnapshots: KPISnapshot[];
  narratives: KPINarrative[];
  crossInsights: CrossKPIInsight[];
  voiceBriefing: string;
  executiveSummary: string;
}

// ── KPI Display Names ────────────────────────────────────────

const KPI_LABELS: Record<string, { name: string; abbr: string; icon: React.ReactNode }> = {
  vdi:          { name: 'Vulnerability Density Index',  abbr: 'VDI', icon: <Shield className="w-4 h-4" /> },
  crc:          { name: 'Customer Risk Concentration',  abbr: 'CRC', icon: <AlertTriangle className="w-4 h-4" /> },
  rv:           { name: 'Remediation Velocity',         abbr: 'RV',  icon: <Zap className="w-4 h-4" /> },
  fnc:          { name: 'Field Notice Coverage',        abbr: 'FNC', icon: <CheckCircle className="w-4 h-4" /> },
  rsi:          { name: 'Risk Score Index',             abbr: 'RSI', icon: <Activity className="w-4 h-4" /> },
  mttr:         { name: 'Mean Time To Remediate',       abbr: 'MTTR',icon: <RefreshCw className="w-4 h-4" /> },
  det_rate:     { name: 'Detection Rate',               abbr: 'DR',  icon: <BarChart3 className="w-4 h-4" /> },
  sec_coverage: { name: 'Security Coverage',            abbr: 'SC',  icon: <Shield className="w-4 h-4" /> },
};

// ── Status Colors / Icons ────────────────────────────────────

function statusColor(status: string): string {
  switch (status) {
    case 'critical':  return 'text-red-400 bg-red-500/10 border-red-500/30';
    case 'warning':   return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    case 'on-track':  return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    case 'exceeding': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
    default:          return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
  }
}

function statusBadge(status: string): string {
  switch (status) {
    case 'critical':  return 'bg-red-500/20 text-red-300 border border-red-500/40';
    case 'warning':   return 'bg-amber-500/20 text-amber-300 border border-amber-500/40';
    case 'on-track':  return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
    case 'exceeding': return 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40';
    default:          return 'bg-slate-500/20 text-slate-300 border border-slate-500/40';
  }
}

function TrendIcon({ trend, delta }: { trend: string; delta: number }) {
  if (trend === 'improving') return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (trend === 'degrading') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <ArrowRight className="w-3.5 h-3.5 text-slate-400" />;
}

function healthGlow(health: string): string {
  switch (health) {
    case 'critical': return 'shadow-[0_0_30px_rgba(239,68,68,0.3)]';
    case 'at-risk':  return 'shadow-[0_0_30px_rgba(245,158,11,0.2)]';
    case 'healthy':  return 'shadow-[0_0_30px_rgba(16,185,129,0.2)]';
    default:         return '';
  }
}

// ── Main Component ───────────────────────────────────────────

export function KPIIntelligenceBriefing() {
  const [story, setStory] = useState<StoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedKPI, setExpandedKPI] = useState<string | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchStory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/chatbot/kpi/story');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setStory(data);
        setLastRefresh(new Date());
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load KPI data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStory();
    const interval = setInterval(fetchStory, 120_000); // Refresh every 2 minutes
    return () => clearInterval(interval);
  }, [fetchStory]);

  const speakBriefing = () => {
    if (!story?.voiceBriefing) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(story.voiceBriefing);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const toggleKPI = (kpiId: string) => {
    setExpandedKPI(expandedKPI === kpiId ? null : kpiId);
  };

  // ── Loading / Error States ──

  if (loading && !story) {
    return (
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 backdrop-blur-sm p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center animate-pulse">
            <Brain className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="h-4 w-48 bg-slate-700/60 rounded animate-pulse" />
            <div className="h-3 w-32 bg-slate-700/40 rounded animate-pulse mt-1.5" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-slate-700/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !story) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-red-300">
        <div className="flex items-center gap-2">
          <XCircle className="w-5 h-5" />
          <span className="font-semibold">KPI Intelligence Unavailable</span>
        </div>
        <p className="text-sm mt-1 text-red-400/80">{error}</p>
        <button onClick={fetchStory} className="mt-3 text-xs text-red-300 hover:text-white underline">
          Retry
        </button>
      </div>
    );
  }

  if (!story) return null;

  const criticals = story.kpiSnapshots.filter(s => s.status === 'critical');
  const warnings = story.kpiSnapshots.filter(s => s.status === 'warning');

  return (
    <div className={`rounded-xl border border-slate-700/60 bg-slate-800/40 backdrop-blur-sm overflow-hidden ${healthGlow(story.overallHealth)}`}>
      
      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            story.overallHealth === 'critical' ? 'bg-red-500/20' :
            story.overallHealth === 'at-risk' ? 'bg-amber-500/20' : 'bg-emerald-500/20'
          }`}>
            <Brain className={`w-5 h-5 ${
              story.overallHealth === 'critical' ? 'text-red-400' :
              story.overallHealth === 'at-risk' ? 'text-amber-400' : 'text-emerald-400'
            }`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">KPI Intelligence Briefing</h3>
            <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase mt-0.5">
              Powered by KPI Storytelling Engine
              {lastRefresh && ` | ${lastRefresh.toLocaleTimeString()}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Overall Score */}
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
            story.overallHealth === 'critical' ? 'bg-red-500/20 text-red-300' :
            story.overallHealth === 'at-risk' ? 'bg-amber-500/20 text-amber-300' :
            'bg-emerald-500/20 text-emerald-300'
          }`}>
            {story.overallScore}/100
          </div>

          {/* Voice Briefing Button */}
          <button
            onClick={speakBriefing}
            className={`p-2 rounded-lg transition-all ${
              isSpeaking 
                ? 'bg-cyan-500/30 text-cyan-300 animate-pulse' 
                : 'bg-slate-700/50 text-slate-400 hover:text-cyan-400 hover:bg-slate-700'
            }`}
            title={isSpeaking ? 'Stop briefing' : 'Listen to voice briefing'}
          >
            <Volume2 className="w-4 h-4" />
          </button>

          {/* Refresh */}
          <button
            onClick={fetchStory}
            className={`p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-all ${loading ? 'animate-spin' : ''}`}
            title="Refresh KPI data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Alert Banner (if critical) ── */}
      {criticals.length > 0 && (
        <div className="px-5 py-2.5 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-xs text-red-300 font-medium">
            {criticals.length} critical KPI{criticals.length > 1 ? 's' : ''} require attention:
            {' '}{criticals.map(c => KPI_LABELS[c.kpiId]?.abbr || c.kpiId).join(', ')}
          </span>
        </div>
      )}

      {/* ── KPI Grid ── */}
      <div className="p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {story.kpiSnapshots.map(snapshot => {
            const label = KPI_LABELS[snapshot.kpiId];
            const narrative = story.narratives.find(n => n.kpiId === snapshot.kpiId);
            const isExpanded = expandedKPI === snapshot.kpiId;

            return (
              <div key={snapshot.kpiId} className="col-span-1">
                {/* KPI Card */}
                <button
                  onClick={() => toggleKPI(snapshot.kpiId)}
                  className={`w-full text-left rounded-lg border p-3 transition-all hover:scale-[1.02] cursor-pointer ${statusColor(snapshot.status)}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      {label?.icon}
                      <span className="text-[10px] font-bold tracking-wider uppercase opacity-80">
                        {label?.abbr || snapshot.kpiId}
                      </span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${statusBadge(snapshot.status)}`}>
                      {snapshot.status}
                    </span>
                  </div>
                  
                  <div className="text-lg font-bold text-white leading-tight">
                    {snapshot.formattedValue}
                  </div>
                  
                  <div className="flex items-center gap-1 mt-1">
                    <TrendIcon trend={snapshot.trend} delta={snapshot.trendDelta} />
                    <span className={`text-[10px] font-medium ${
                      snapshot.trend === 'improving' ? 'text-emerald-400' :
                      snapshot.trend === 'degrading' ? 'text-red-400' : 'text-slate-400'
                    }`}>
                      {snapshot.trendDelta > 0 ? '+' : ''}{snapshot.trendDelta.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-slate-500 ml-auto">
                      target: {story.narratives.find(n => n.kpiId === snapshot.kpiId)?.supportingData.find(d => d.label === 'Target')?.value || '—'}
                    </span>
                  </div>

                  {isExpanded && <ChevronUp className="w-3 h-3 text-slate-400 mt-1 mx-auto" />}
                  {!isExpanded && <ChevronDown className="w-3 h-3 text-slate-400 mt-1 mx-auto opacity-40" />}
                </button>

                {/* Expanded Narrative */}
                {isExpanded && narrative && (
                  <div className="mt-2 rounded-lg border border-slate-600/40 bg-slate-800/80 p-3 text-xs space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-slate-300 leading-relaxed">{narrative.summary}</p>
                    
                    <div className="pt-1 border-t border-slate-700/50">
                      <p className="text-[10px] font-bold text-amber-400/90 uppercase tracking-wider mb-1">Business Impact</p>
                      <p className="text-slate-400 leading-relaxed text-[11px]">{narrative.businessImpact}</p>
                    </div>

                    <div className="pt-1 border-t border-slate-700/50">
                      <p className="text-[10px] font-bold text-emerald-400/90 uppercase tracking-wider mb-1">Recommendation</p>
                      <p className="text-slate-400 leading-relaxed text-[11px]">{narrative.recommendation}</p>
                    </div>

                    {narrative.relatedKPIs.length > 0 && (
                      <div className="flex items-center gap-1 pt-1">
                        <span className="text-[9px] text-slate-500">Related:</span>
                        {narrative.relatedKPIs.map(id => (
                          <button
                            key={id}
                            onClick={(e) => { e.stopPropagation(); toggleKPI(id); }}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/60 text-cyan-400 hover:bg-slate-700 transition"
                          >
                            {KPI_LABELS[id]?.abbr || id}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Cross-KPI Insights ── */}
      {story.crossInsights.length > 0 && (
        <div className="border-t border-slate-700/50">
          <button
            onClick={() => setShowInsights(!showInsights)}
            className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-700/20 transition"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-bold text-slate-300 tracking-wide">
                Cross-KPI Insights ({story.crossInsights.length})
              </span>
            </div>
            {showInsights ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showInsights && (
            <div className="px-5 pb-4 space-y-3">
              {story.crossInsights.map((insight, i) => (
                <div key={i} className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-violet-300">{insight.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{insight.narrative}</p>
                      {insight.actionable && (
                        <div className="mt-2 flex items-start gap-1.5">
                          <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-[10px] text-emerald-400/90">{insight.recommendation}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] text-slate-500">Confidence: {(insight.confidence * 100).toFixed(0)}%</span>
                        <span className="text-[9px] text-slate-500">|</span>
                        <span className="text-[9px] text-slate-500">{insight.correlationType}</span>
                        <span className="text-[9px] text-slate-500">|</span>
                        <span className="text-[9px] text-slate-500">
                          {insight.kpisInvolved.map(k => KPI_LABELS[k]?.abbr || k).join(' + ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
