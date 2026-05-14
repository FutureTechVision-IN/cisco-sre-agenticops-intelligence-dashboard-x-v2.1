/**
 * CalculationMethodologyModal
 *
 * A reusable, accessible modal that displays the full calculation methodology
 * for any KPI card on the dashboard.
 *
 * Usage:
 *   <CalculationMethodologyModal
 *     isOpen={showModal}
 *     onClose={() => setShowModal(false)}
 *     methodologyKey="vulnerable-assets"
 *   />
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Code, Database, BookOpen, Target, ExternalLink,
  ChevronRight, CheckCircle2, AlertTriangle, AlertCircle, Info,
  Clock, User, Zap
} from 'lucide-react';
import { kpiMethodologies } from '../data/kpiMethodologies';
import type { KPIMethodology } from '../data/kpiMethodologies';

// ── Types ───────────────────────────────────────────────────────────────────

interface CalculationMethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
  methodologyKey: string;
}

type TabId = 'formula' | 'sources' | 'context' | 'thresholds';

// ── Colour helpers ────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { accent: string; bg: string; border: string; text: string; badge: string }> = {
  cyan:    { accent: '#06b6d4', bg: 'bg-cyan-500/10',    border: 'border-cyan-500/40',    text: 'text-cyan-400',    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  emerald: { accent: '#10b981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  rose:    { accent: '#f43f5e', bg: 'bg-rose-500/10',    border: 'border-rose-500/40',    text: 'text-rose-400',    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  amber:   { accent: '#f59e0b', bg: 'bg-amber-500/10',   border: 'border-amber-500/40',   text: 'text-amber-400',   badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  purple:  { accent: '#a855f7', bg: 'bg-purple-500/10',  border: 'border-purple-500/40',  text: 'text-purple-400',  badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  indigo:  { accent: '#6366f1', bg: 'bg-indigo-500/10',  border: 'border-indigo-500/40',  text: 'text-indigo-400',  badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  blue:    { accent: '#3b82f6', bg: 'bg-blue-500/10',    border: 'border-blue-500/40',    text: 'text-blue-400',    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  orange:  { accent: '#f97316', bg: 'bg-orange-500/10',  border: 'border-orange-500/40',  text: 'text-orange-400',  badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  violet:  { accent: '#8b5cf6', bg: 'bg-violet-500/10',  border: 'border-violet-500/40',  text: 'text-violet-400',  badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
};

const getColors = (color: string) => COLOR_MAP[color] ?? COLOR_MAP['cyan'];

// ── Threshold level UI ───────────────────────────────────────────────────────

const thresholdLevelConfig = {
  excellent: { icon: <CheckCircle2 size={14} />, labelColor: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  good:      { icon: <CheckCircle2 size={14} />, labelColor: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30' },
  warning:   { icon: <AlertTriangle size={14} />, labelColor: 'text-amber-400',  bg: 'bg-amber-500/10',   border: 'border-amber-500/30' },
  critical:  { icon: <AlertCircle size={14} />,  labelColor: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/30' },
  target:    { icon: <Target size={14} />,        labelColor: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30' },
};

// ── Category badge ───────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<KPIMethodology['category'], string> = {
  'asset': 'Asset Metric',
  'security': 'Security KPI',
  'performance': 'Performance KPI',
  'ml': 'AI / ML',
  'field-notice': 'Field Notice',
};

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'formula',     label: 'Formula',        icon: <Code size={13} /> },
  { id: 'sources',     label: 'Data Sources',   icon: <Database size={13} /> },
  { id: 'context',     label: 'Business Context', icon: <BookOpen size={13} /> },
  { id: 'thresholds',  label: 'Thresholds',     icon: <Target size={13} /> },
];

// ─────────────────────────────── Component ──────────────────────────────────

const CalculationMethodologyModal: React.FC<CalculationMethodologyModalProps> = ({
  isOpen,
  onClose,
  methodologyKey,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('formula');
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const data = kpiMethodologies[methodologyKey];
  const colors = data ? getColors(data.color) : getColors('cyan');

  // Reset tab when key changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab('formula');
    }
  }, [isOpen, methodologyKey]);

  // Focus management and Escape key
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    setTimeout(() => closeButtonRef.current?.focus(), 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      // Focus trap
      if (e.key === 'Tab' && contentRef.current) {
        const focusable = contentRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  // Handle overlay click (close when clicking outside the card)
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.target === overlayRef.current) onClose();
  };

  if (!isOpen) return null;

  // ── Fallback when key not found ────────────────────────────────────────────

  if (!data) {
    return createPortal(
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label="Calculation Methodology — Not found"
        onClick={handleOverlayClick}
      >
        <div
          ref={contentRef}
          className="relative w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl p-8 text-center"
        >
          <Info size={32} className="mx-auto mb-4 text-slate-500" />
          <p className="text-slate-400 text-sm">
            Methodology documentation for <code className="text-slate-300 font-mono">{methodologyKey}</code> is not yet available.
          </p>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="mt-6 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Close
          </button>
        </div>
      </div>,
      document.body
    );
  }

  // ─────────────────────────────── Render ─────────────────────────────────────

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="methodology-modal-title"
      aria-describedby="methodology-modal-description"
      onClick={handleOverlayClick}
    >
      <div
        ref={contentRef}
        className="relative w-full max-w-2xl max-h-[88vh] flex flex-col bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Coloured top border stripe */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: `linear-gradient(90deg, ${colors.accent}88 0%, ${colors.accent} 50%, ${colors.accent}88 100%)` }}
        />

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className={`flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-700/60 ${colors.bg}`}>
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${colors.badge}`}>
                {CATEGORY_LABELS[data.category]}
              </span>
            </div>
            <h2
              id="methodology-modal-title"
              className={`text-lg font-bold text-white leading-tight ${colors.text}`}
            >
              {data.title}
            </h2>
            <p
              id="methodology-modal-description"
              className="text-xs text-slate-400 mt-1 leading-relaxed"
            >
              {data.description}
            </p>
          </div>

          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="flex-shrink-0 p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            aria-label="Close methodology modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Tab navigation ──────────────────────────────────────────────── */}
        <div className="px-6 border-b border-slate-700/60 bg-slate-900/80">
          <div className="flex gap-0.5 -mb-px" role="tablist" aria-label="Methodology sections">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-3 text-xs font-bold uppercase tracking-wider
                  border-b-2 transition-all duration-200 whitespace-nowrap
                  ${activeTab === tab.id
                    ? `border-b-2 text-white ${colors.text.replace('text-', 'border-')}`
                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                  }
                `}
                style={activeTab === tab.id ? { borderBottomColor: colors.accent } : {}}
              >
                <span className={activeTab === tab.id ? colors.text : ''}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab content  ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(88vh - 200px)' }}>

          {/* ─── FORMULA TAB ─────────────────────────────────────────────── */}
          {activeTab === 'formula' && (
            <div
              id="tabpanel-formula"
              role="tabpanel"
              aria-labelledby="tab-formula"
              className="p-6 space-y-5"
            >
              {/* Expression Block */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Code size={12} className={colors.text} /> Mathematical Expression
                </h3>
                <pre
                  className={`text-[13px] font-mono leading-relaxed p-4 rounded-xl border ${colors.bg} ${colors.border} text-slate-100 overflow-x-auto whitespace-pre-wrap`}
                >
                  {data.formula.expression}
                </pre>
              </div>

              {/* Notes */}
              {data.formula.notes && (
                <div className={`flex gap-3 p-4 rounded-xl border ${colors.bg} ${colors.border}`}>
                  <Info size={15} className={`${colors.text} flex-shrink-0 mt-0.5`} />
                  <p className="text-xs text-slate-300 leading-relaxed">{data.formula.notes}</p>
                </div>
              )}

              {/* Variables table */}
              {data.formula.variables.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <ChevronRight size={12} className={colors.text} /> Variable Definitions
                  </h3>
                  <div className="rounded-xl border border-slate-700/60 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-800/80 border-b border-slate-700/60">
                          <th className="text-left py-2.5 px-4 text-slate-400 font-bold uppercase tracking-wider w-[28%]">Variable</th>
                          <th className="text-left py-2.5 px-4 text-slate-400 font-bold uppercase tracking-wider">Description</th>
                          <th className="text-left py-2.5 px-4 text-slate-400 font-bold uppercase tracking-wider w-[25%]">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.formula.variables.map((v, i) => (
                          <tr
                            key={i}
                            className={`border-b border-slate-700/30 last:border-0 ${i % 2 === 0 ? 'bg-slate-800/20' : 'bg-transparent'}`}
                          >
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-200">{v.name}</td>
                            <td className="py-2.5 px-4 text-slate-400 leading-snug">{v.description}</td>
                            <td className="py-2.5 px-4">
                              {v.source ? (
                                <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-slate-700/60 text-slate-300 border border-slate-600/40">
                                  {v.source}
                                </span>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Example */}
              {data.formula.example && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Zap size={12} className="text-amber-400" /> Worked Example
                  </h3>
                  <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                    <p className="text-xs text-amber-200/80 font-mono leading-relaxed">{data.formula.example}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── DATA SOURCES TAB ─────────────────────────────────────────── */}
          {activeTab === 'sources' && (
            <div
              id="tabpanel-sources"
              role="tabpanel"
              aria-labelledby="tab-sources"
              className="p-6 space-y-3"
            >
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <Database size={12} className={colors.text} /> Data Sources & Refresh Rates
              </h3>

              {data.dataSources.map((src, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-700/60 bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-bold text-white">{src.name}</span>
                        {src.table && (
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-700/60 text-slate-300 border border-slate-600/40">
                            {src.table}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-snug">{src.description}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-700/60 text-xs text-slate-300 whitespace-nowrap">
                        <Clock size={10} className={colors.text} />
                        {src.refreshRate}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className={`mt-4 p-3 rounded-xl border ${colors.border} ${colors.bg} flex items-start gap-2`}>
                <Info size={13} className={`${colors.text} flex-shrink-0 mt-0.5`} />
                <p className="text-xs text-slate-400 leading-relaxed">
                  All data is processed through the SRE Intelligence Platform pipeline. Timestamps are in UTC. Contact the Data Engineering team for source-access queries.
                </p>
              </div>
            </div>
          )}

          {/* ─── BUSINESS CONTEXT TAB ─────────────────────────────────────── */}
          {activeTab === 'context' && (
            <div
              id="tabpanel-context"
              role="tabpanel"
              aria-labelledby="tab-context"
              className="p-6 space-y-5"
            >
              {/* Purpose */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <BookOpen size={12} className={colors.text} /> Purpose
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed p-4 rounded-xl bg-slate-800/30 border border-slate-700/40">
                  {data.businessContext.purpose}
                </p>
              </div>

              {/* Impact areas */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Zap size={12} className={colors.text} /> Business Impact Areas
                </h3>
                <ul className="space-y-1.5">
                  {data.businessContext.impactAreas.map((area, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-slate-300">
                      <ChevronRight size={12} className={colors.text} />
                      {area}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Limitations */}
              {data.businessContext.limitations && data.businessContext.limitations.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={12} className="text-amber-400" /> Known Limitations
                  </h3>
                  <ul className="space-y-1.5">
                    {data.businessContext.limitations.map((lim, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-400 leading-snug">
                        <AlertTriangle size={11} className="text-amber-400/70 flex-shrink-0 mt-0.5" />
                        {lim}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Related KPIs */}
              {data.businessContext.relatedKPIs && data.businessContext.relatedKPIs.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <ExternalLink size={12} className={colors.text} /> Related KPIs
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {data.businessContext.relatedKPIs.map((rel, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-full text-xs font-mono bg-slate-800/60 text-slate-300 border border-slate-600/40"
                      >
                        {rel}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Meta info */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700/40">
                <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/40">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Update Frequency</p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <Clock size={11} className={colors.text} />
                    {data.updateFrequency}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/40">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Metric Owner</p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <User size={11} className={colors.text} />
                    {data.owner}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── THRESHOLDS TAB ───────────────────────────────────────────── */}
          {activeTab === 'thresholds' && (
            <div
              id="tabpanel-thresholds"
              role="tabpanel"
              aria-labelledby="tab-thresholds"
              className="p-6 space-y-4"
            >
              {data.thresholds && Object.keys(data.thresholds).length > 0 ? (
                <>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                    <Target size={12} className={colors.text} /> Threshold Definitions
                  </h3>

                  <div className="space-y-3">
                    {(Object.entries(data.thresholds) as [keyof typeof thresholdLevelConfig, { value: string; description: string }][]).map(([level, threshold]) => {
                      const cfg = thresholdLevelConfig[level];
                      if (!cfg || !threshold) return null;
                      return (
                        <div
                          key={level}
                          className={`flex items-start gap-4 p-4 rounded-xl border ${cfg.bg} ${cfg.border}`}
                        >
                          <div className={`mt-0.5 ${cfg.labelColor} flex-shrink-0`}>{cfg.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-0.5">
                              <span className={`text-xs font-bold uppercase tracking-wider ${cfg.labelColor}`}>
                                {level.charAt(0).toUpperCase() + level.slice(1)}
                              </span>
                              <code className="text-xs font-mono bg-slate-800/60 px-2 py-0.5 rounded text-slate-100 border border-slate-700/40">
                                {threshold.value}
                              </code>
                            </div>
                            <p className="text-xs text-slate-400">{threshold.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className={`mt-4 p-3 rounded-xl border ${colors.border} ${colors.bg} flex items-start gap-2`}>
                    <Info size={13} className={`${colors.text} flex-shrink-0 mt-0.5`} />
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Thresholds are reviewed quarterly by the Security Analytics team. Approved deviations require sign-off from the metric owner.
                    </p>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center">
                  <Target size={32} className="mx-auto mb-3 text-slate-600" />
                  <p className="text-sm text-slate-500">
                    No threshold definitions are established for this metric.
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    This is typical for count-based operational metrics.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="px-6 py-3 border-t border-slate-700/60 bg-slate-900/80 flex items-center justify-between">
          <p className="text-xs text-slate-600 font-mono">
            key: {methodologyKey} · {data.updateFrequency}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 text-xs font-bold uppercase tracking-wider transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/40 active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CalculationMethodologyModal;
