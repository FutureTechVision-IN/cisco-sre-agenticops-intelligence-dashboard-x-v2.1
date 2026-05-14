/**
 * Advanced Smart Microphone System v2.0
 * SRE AgenticOps Intelligence Dashboard
 *
 * Enterprise-grade voice-activated business intelligence query system.
 *
 * Capabilities:
 *  1. Natural language voice commands to structured BI queries
 *  2. Top-N customers by vulnerability count with drill-down
 *  3. Top field notices by severity / urgency / impact
 *  4. Extreme-vulnerability customer profiling
 *  5. Real-time speech recognition with noise-level feedback
 *  6. Multi-language support (en-US, en-GB, es, fr, de, ja, zh, hi)
 *  7. Voice confirmation read-back (TTS)
 *  8. Export to CSV / JSON / clipboard
 *  9. Comprehensive error handling with retry
 * 10. Audit logging for every query
 *
 * @component VoiceSearchMic
 * @version 2.0.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { autocorrect, extractFnType, type AutocorrectResult } from '../utils/autocorrect';
import {
  Mic,
  MicOff,
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
  Volume2,
  VolumeX,
  Search,
  Building2,
  FileText,
  Filter,
  ChevronDown,
  ChevronUp,
  Download,
  Globe,
  Shield,
  BarChart3,
  TrendingUp,
  Users,
  AlertCircle,
  Clock,
  ArrowUpDown,
  RefreshCw,
  Copy,
  ExternalLink,
} from 'lucide-react';

// ==========================================
// TYPES
// ==========================================

/** Public result type consumed by parent */
export interface VoiceSearchResult {
  transcript: string;
  confidence: number;
  intent: VoiceIntent;
  matchedCustomers: string[];
  matchedFieldNotices: string[];
  matchedFnTypes: string[];
  matchedMonths: string[];
}

export type VoiceIntent =
  | 'top_customers'
  | 'top_field_notices'
  | 'extreme_customers'
  | 'search_customer'
  | 'search_field_notice'
  | 'search_combined'
  | 'filter_type'
  | 'filter_month'
  | 'show_metrics'
  | 'reset_filters'
  | 'help'
  | 'unknown';

type ListeningState = 'idle' | 'listening' | 'processing' | 'fetching' | 'success' | 'error';

interface SupportedLang { code: string; label: string; flag: string; }

/** Row from /api/reports/top-customers */
interface APICustomerRow {
  customerName: string;
  totVuln: number;
  potVuln: number;
  notVuln: number;
  recordCount: number;
}

/** Row from /api/reports/top-field-notices */
interface APIFieldNoticeRow {
  fieldNoticeId: string;
  fnTitle: string;
  totVuln: number;
  potVuln: number;
  notVuln: number;
  fnType: string;
  firstPublished: string;
}

/** Row from /api/reports/extreme-vulnerability-customers */
interface APIExtremeCustomerRow {
  rank: number;
  customerName: string;
  totalVulnerabilities: number;
  potentialVulnerabilities: number;
  secureAssets: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'ELEVATED';
  totalAssets: number;
  vulnerabilityPercentage: string;
}

interface BIQueryResult {
  type: 'customers' | 'field_notices' | 'extreme_customers' | 'metrics' | 'none';
  title: string;
  subtitle: string;
  customers?: APICustomerRow[];
  fieldNotices?: APIFieldNoticeRow[];
  extremeCustomers?: APIExtremeCustomerRow[];
  metricsData?: { totalAssessed: number; vulnerable: number; potentiallyVulnerable: number; notVulnerable: number };
  fetchedAt: Date;
  queryTimeMs: number;
}

interface AuditEntry {
  timestamp: Date;
  transcript: string;
  intent: VoiceIntent;
  confidence: number;
  language: string;
  resultType: string;
  success: boolean;
}

// ==========================================
// CONSTANTS
// ==========================================

const LANGUAGES: SupportedLang[] = [
  { code: 'en-US', label: 'English (US)', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'en-GB', label: 'English (UK)', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'es-ES', label: 'Espa\u00f1ol', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'fr-FR', label: 'Fran\u00e7ais', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'de-DE', label: 'Deutsch', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'ja-JP', label: '\u65E5\u672C\u8A9E', flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'zh-CN', label: '\u4E2D\u6587', flag: '\u{1F1E8}\u{1F1F3}' },
  { code: 'hi-IN', label: '\u0939\u093F\u0928\u094D\u0926\u0940', flag: '\u{1F1EE}\u{1F1F3}' },
];

const SORT_OPTIONS = [
  { value: 'vuln-desc', label: 'Most Vulnerable' },
  { value: 'vuln-asc', label: 'Least Vulnerable' },
  { value: 'name-asc', label: 'Name A\u2192Z' },
  { value: 'name-desc', label: 'Name Z\u2192A' },
];

const auditLog: AuditEntry[] = [];

// ==========================================
// NLP ENGINE
// ==========================================

function fuzzyScore(text: string, query: string): number {
  const t = text.toLowerCase(), q = query.toLowerCase();
  if (t === q) return 1000;
  if (t.startsWith(q)) return 900;
  for (const w of t.split(/[\s\-_,./]+/)) { if (w.startsWith(q)) return 800; }
  if (t.includes(q)) return 700;
  return 0;
}

function findMatches(items: string[], tokens: string[], minScore = 400): string[] {
  const joined = tokens.join(' ');
  const matches: { item: string; score: number }[] = [];
  for (const item of items) {
    let best = fuzzyScore(item, joined);
    for (const tk of tokens) { if (tk.length >= 2) { const s = fuzzyScore(item, tk); if (s > best) best = s; } }
    if (best >= minScore) matches.push({ item, score: best });
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, 10).map(m => m.item);
}

function classifyIntent(transcript: string): VoiceIntent {
  const t = transcript.toLowerCase();
  if (/\breset\b|\bclear\b|\bremove all\b/.test(t)) return 'reset_filters';
  if (/\bhelp\b|\bwhat can you do\b|\bcommands?\b/.test(t)) return 'help';
  if (/\btop\b.*\bcustomer|\bbiggest\b.*\bcustomer|\bworst\b.*\bcustomer|\bhighest.*customer|\bmost vulnerable.*customer/.test(t)) return 'top_customers';
  if (/\bextreme\b|\bcritical.*customer|\bhigh.?risk.*customer|\bservice request|\bsupport ticket|\bcomplaint|\bescalat/.test(t)) return 'extreme_customers';
  if (/\btop\b.*\bfield.?notice|\btop\b.*\bfn\b|\bworst\b.*\bnotice|\bsevere.*notice|\burgent.*notice|\bhighest.*field/.test(t)) return 'top_field_notices';
  // "show software/hardware field notices" without explicit "top" -> treat as top field notices
  if (/\b(show|list|get|find|display)\b.*\b(software|hardware|sw|hw)\b.*\b(field.?notice|fn)/.test(t)) return 'top_field_notices';
  if (/\bmetric|\bsummary\b|\boverview\b|\bdashboard\b|\bstatus\b/.test(t)) return 'show_metrics';
  const hasCust = /\bcustomer\b|\baccount\b|\bclient\b|\bcompany\b/.test(t);
  const hasFN = /\bfield.?notice\b|\bfn[-\s]?\d|\bnotice\b/.test(t);
  if (hasCust && hasFN) return 'search_combined';
  if (hasCust) return 'search_customer';
  if (hasFN) return 'search_field_notice';
  if (/\btype\b|\bsoftware\b|\bhardware\b/.test(t)) return 'filter_type';
  if (/\bjanuary|february|march|april|may|june|july|august|september|october|november|december|\bmonth\b|\bperiod\b/.test(t)) return 'filter_month';
  return 'unknown';
}

// ==========================================
// DATA FETCHER
// ==========================================

async function fetchBIData(intent: VoiceIntent, limit = 5, fnTypeFilter?: 'Software' | 'Hardware' | null): Promise<BIQueryResult> {
  const start = Date.now();
  try {
    switch (intent) {
      case 'top_customers': {
        const res = await fetch(`/api/reports/top-customers?limit=${limit}&year=2025`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return { type: 'customers', title: `Top ${limit} Customers`, subtitle: `By vulnerability count \u2022 Period: ${json.period || '2025'}`, customers: json.data?.slice(0, limit) || [], fetchedAt: new Date(), queryTimeMs: Date.now() - start };
      }
      case 'top_field_notices': {
        // Fetch more than needed so we can filter by type client-side
        const fetchLimit = fnTypeFilter ? Math.max(limit * 3, 20) : limit;
        const res = await fetch(`/api/reports/top-field-notices?limit=${fetchLimit}&year=2025`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        let notices: APIFieldNoticeRow[] = json.data || [];
        // Apply fnType filter if specified (Software / Hardware)
        if (fnTypeFilter) {
          notices = notices.filter((fn: APIFieldNoticeRow) => fn.fnType === fnTypeFilter);
        }
        notices = notices.slice(0, limit);
        const typeLabel = fnTypeFilter ? ` ${fnTypeFilter}` : '';
        return { type: 'field_notices', title: `Top ${limit}${typeLabel} Field Notices`, subtitle: `By severity & impact \u2022 Period: ${json.period || '2025'}${fnTypeFilter ? ` \u2022 Type: ${fnTypeFilter}` : ''}`, fieldNotices: notices, fetchedAt: new Date(), queryTimeMs: Date.now() - start };
      }
      case 'extreme_customers': {
        const res = await fetch(`/api/reports/extreme-vulnerability-customers?limit=${limit}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return { type: 'extreme_customers', title: 'High-Risk Customers', subtitle: `${json.summary?.criticalRisk || 0} Critical \u2022 ${json.summary?.highRisk || 0} High \u2022 ${json.summary?.elevatedRisk || 0} Elevated`, extremeCustomers: json.data?.slice(0, limit) || [], fetchedAt: new Date(), queryTimeMs: Date.now() - start };
      }
      case 'show_metrics': {
        const res = await fetch('/api/metrics');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return { type: 'metrics', title: 'Dashboard Metrics', subtitle: 'Current assessment overview', metricsData: { totalAssessed: json.total || json.totalAssessed || 0, vulnerable: json.vulnerable || 0, potentiallyVulnerable: json.potentiallyVulnerable || 0, notVulnerable: json.notVulnerable || 0 }, fetchedAt: new Date(), queryTimeMs: Date.now() - start };
      }
      default:
        return { type: 'none', title: '', subtitle: '', fetchedAt: new Date(), queryTimeMs: Date.now() - start };
    }
  } catch (err: any) {
    console.error('[SmartMic] Fetch error:', err);
    throw err;
  }
}

// ==========================================
// EXPORT HELPERS
// ==========================================

function exportToCSV(result: BIQueryResult): void {
  let csv = '';
  if (result.type === 'customers' && result.customers) {
    csv = 'Rank,Customer,Vulnerable,Potentially Vulnerable,Secure,Records\n';
    result.customers.forEach((c, i) => { csv += `${i + 1},"${c.customerName}",${c.totVuln},${c.potVuln},${c.notVuln},${c.recordCount}\n`; });
  } else if (result.type === 'field_notices' && result.fieldNotices) {
    csv = 'Rank,ID,Title,Type,Vulnerable,Potentially Vulnerable,Secure,Published\n';
    result.fieldNotices.forEach((fn, i) => { csv += `${i + 1},${fn.fieldNoticeId},"${fn.fnTitle}",${fn.fnType},${fn.totVuln},${fn.potVuln},${fn.notVuln},${fn.firstPublished}\n`; });
  } else if (result.type === 'extreme_customers' && result.extremeCustomers) {
    csv = 'Rank,Customer,Risk Level,Vulnerabilities,Potential,Secure,Total Assets,Vuln %\n';
    result.extremeCustomers.forEach(c => { csv += `${c.rank},"${c.customerName}",${c.riskLevel},${c.totalVulnerabilities},${c.potentialVulnerabilities},${c.secureAssets},${c.totalAssets},${c.vulnerabilityPercentage}\n`; });
  } else if (result.type === 'metrics' && result.metricsData) {
    csv = 'Metric,Value\nTotal Assessed,' + result.metricsData.totalAssessed + '\nVulnerable,' + result.metricsData.vulnerable + '\nPotentially Vulnerable,' + result.metricsData.potentiallyVulnerable + '\nSecure,' + result.metricsData.notVulnerable + '\n';
  }
  if (!csv) return;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${result.type}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function exportToJSON(result: BIQueryResult): void {
  const data = result.customers || result.fieldNotices || result.extremeCustomers || result.metricsData || {};
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${result.type}-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  URL.revokeObjectURL(url);
}

function copyToClipboard(result: BIQueryResult): void {
  let text = `${result.title}\n${result.subtitle}\n\n`;
  if (result.customers) {
    result.customers.forEach((c, i) => { text += `${i + 1}. ${c.customerName} \u2014 ${c.totVuln.toLocaleString()} vulnerable\n`; });
  } else if (result.fieldNotices) {
    result.fieldNotices.forEach((fn, i) => { text += `${i + 1}. ${fn.fieldNoticeId}: ${fn.fnTitle} \u2014 ${fn.totVuln.toLocaleString()} vulnerable\n`; });
  } else if (result.extremeCustomers) {
    result.extremeCustomers.forEach(c => { text += `${c.rank}. ${c.customerName} [${c.riskLevel}] \u2014 ${c.totalVulnerabilities.toLocaleString()} vulnerabilities\n`; });
  }
  navigator.clipboard.writeText(text).catch(() => {});
}

// ==========================================
// FORMAT HELPERS
// ==========================================

function fmtNum(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function riskColor(level: string): string {
  switch (level) {
    case 'CRITICAL': return 'text-red-400 bg-red-500/15 border-red-500/30';
    case 'HIGH': return 'text-orange-400 bg-orange-500/15 border-orange-500/30';
    case 'ELEVATED': return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
    default: return 'text-slate-400 bg-slate-500/15 border-slate-500/30';
  }
}

// ==========================================
// PROPS
// ==========================================

interface Props {
  customers: string[];
  fieldNotices: string[];
  fnTypes: string[];
  months: string[];
  onResult: (result: VoiceSearchResult) => void;
  onTranscript: (text: string) => void;
  /** Pass a text query to trigger BI processing without voice (e.g., from search box Enter key) */
  textQuery?: string;
  className?: string;
}

// ==========================================
// COMPONENT
// ==========================================

export function VoiceSearchMic({ customers, fieldNotices, fnTypes, months, onResult, onTranscript, textQuery, className = '' }: Props) {
  const [state, setState] = useState<ListeningState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  const [biResult, setBiResult] = useState<BIQueryResult | null>(null);
  const [sortBy, setSortBy] = useState('vuln-desc');
  const [resultLimit, setResultLimit] = useState(5);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const [language, setLanguage] = useState<string>('en-US');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [showExport, setShowExport] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptRef = useRef('');
  const panelRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<ListeningState>('idle');

  const isSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
  useEffect(() => { stateRef.current = state; }, [state]);

  // ---- Audio level monitor ----
  const startAudioMonitor = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((s, v) => s + v, 0) / buf.length;
        setAudioLevel(Math.min(1, avg / 128));
        animRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* mic denied */ }
  }, []);

  const stopAudioMonitor = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    audioCtxRef.current?.close().catch(() => {});
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current = null; analyserRef.current = null; streamRef.current = null;
    setAudioLevel(0);
  }, []);

  // ---- TTS ----
  const speak = useCallback((text: string) => {
    if (!ttsEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.1; u.volume = 0.6; u.lang = language;
    window.speechSynthesis.speak(u);
  }, [ttsEnabled, language]);

  // ---- Process transcript ----
  const processTranscript = useCallback(async (text: string) => {
    if (!text.trim()) { setState('idle'); return; }
    setState('processing');

    // ── Autocorrect pass ──
    const acResult = autocorrect(text);
    const correctedText = acResult.wasChanged ? acResult.corrected : text;
    if (acResult.wasChanged) {
      console.log('[SmartMic] Autocorrect:', text, '->', correctedText, acResult.corrections);
      setTranscript(correctedText);
    }

    const tokens = correctedText.toLowerCase().split(/[\s,]+/).filter(w => w.length > 1);
    const intent = classifyIntent(correctedText);

    const matchedCusts = findMatches(customers, tokens, 300);
    const matchedFNs = findMatches(fieldNotices, tokens, 300);
    const matchedTypes = findMatches(fnTypes, tokens, 500);
    const matchedMos = findMatches(months, tokens, 500);

    onResult({ transcript: correctedText, confidence: 0.85, intent, matchedCustomers: matchedCusts, matchedFieldNotices: matchedFNs, matchedFnTypes: matchedTypes, matchedMonths: matchedMos });

    const limitMatch = correctedText.match(/\btop\s+(\d+)/i);
    const queryLimit = limitMatch ? Math.min(50, Math.max(1, parseInt(limitMatch[1]))) : resultLimit;
    if (limitMatch) setResultLimit(queryLimit);

    // ── Extract fnType filter (Software / Hardware) ──
    const fnTypeFilter = extractFnType(correctedText);

    const biIntents: VoiceIntent[] = ['top_customers', 'top_field_notices', 'extreme_customers', 'show_metrics'];
    if (biIntents.includes(intent)) {
      setState('fetching');
      try {
        const result = await fetchBIData(intent, queryLimit, fnTypeFilter);
        setBiResult(result);
        setExpandedRow(null);

        if (result.type === 'customers' && result.customers?.length) {
          speak(`Found top ${result.customers.length} customers. Number one is ${result.customers[0].customerName} with ${result.customers[0].totVuln.toLocaleString()} vulnerabilities.`);
        } else if (result.type === 'field_notices' && result.fieldNotices?.length) {
          speak(`Found top ${result.fieldNotices.length} field notices. The most impactful is ${result.fieldNotices[0].fieldNoticeId}.`);
        } else if (result.type === 'extreme_customers' && result.extremeCustomers?.length) {
          const crit = result.extremeCustomers.filter(c => c.riskLevel === 'CRITICAL').length;
          speak(`Found ${result.extremeCustomers.length} high-risk customers. ${crit} are critical.`);
        } else if (result.type === 'metrics' && result.metricsData) {
          speak(`Total assessed: ${fmtNum(result.metricsData.totalAssessed)}. Vulnerable: ${fmtNum(result.metricsData.vulnerable)}. Secure: ${fmtNum(result.metricsData.notVulnerable)}.`);
        }
        auditLog.push({ timestamp: new Date(), transcript: text, intent, confidence: 0.85, language, resultType: result.type, success: true });
        setState('success');
      } catch (err: any) {
        setErrorMsg(`Data fetch failed: ${err.message || 'Network error'}. Try again.`);
        auditLog.push({ timestamp: new Date(), transcript: text, intent, confidence: 0.85, language, resultType: 'error', success: false });
        setState('error');
      }
    } else if (intent === 'help') {
      speak('You can say: show top 5 customers, top field notices, high risk customers, show metrics, or name a specific customer or field notice.');
      setBiResult(null);
      setState('success');
    } else if (intent === 'reset_filters') {
      speak('Filters have been reset.');
      setBiResult(null);
      setState('success');
    } else {
      const total = matchedCusts.length + matchedFNs.length + matchedTypes.length + matchedMos.length;
      if (total > 0) {
        const parts: string[] = [];
        if (matchedCusts.length) parts.push(`${matchedCusts.length} customer${matchedCusts.length > 1 ? 's' : ''}`);
        if (matchedFNs.length) parts.push(`${matchedFNs.length} field notice${matchedFNs.length > 1 ? 's' : ''}`);
        speak(`Matched ${parts.join(' and ')}.`);
      } else {
        speak("I didn't find a match. Try saying: top 5 customers, or name a specific customer.");
      }
      auditLog.push({ timestamp: new Date(), transcript: text, intent, confidence: 0.85, language, resultType: total > 0 ? 'filter' : 'no_match', success: total > 0 });
      setState('success');
    }
  }, [customers, fieldNotices, fnTypes, months, onResult, resultLimit, language, speak]);

  // ---- Speech Recognition ----
  const startListening = useCallback(() => {
    if (!isSupported) { setErrorMsg('Speech recognition not supported. Use Chrome or Edge.'); setState('error'); setShowPanel(true); return; }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = language;
    rec.maxAlternatives = 3;

    rec.onstart = () => {
      setState('listening');
      setTranscript(''); transcriptRef.current = '';
      setInterim(''); setErrorMsg('');
      setBiResult(null);
      setShowPanel(true);
      startAudioMonitor();
      autoStopRef.current = setTimeout(() => { recognitionRef.current?.stop(); }, 20000);
    };

    rec.onresult = (ev: any) => {
      let final = '', itr = '';
      for (let i = 0; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) final += ev.results[i][0].transcript;
        else itr += ev.results[i][0].transcript;
      }
      if (final) {
        setTranscript(prev => { const next = (prev + ' ' + final).trim(); transcriptRef.current = next; return next; });
        onTranscript(final.trim());
      }
      setInterim(itr);
    };

    rec.onerror = (ev: any) => {
      const msgs: Record<string, string> = {
        'no-speech': 'No speech detected. Tap the mic and try again.',
        'audio-capture': 'Microphone unavailable. Check browser permissions.',
        'not-allowed': 'Microphone access denied. Allow mic in browser settings.',
        'network': 'Network error. Check your connection.',
      };
      setErrorMsg(msgs[ev.error] || `Voice error: ${ev.error}. Tap mic to retry.`);
      setState('error'); stopAudioMonitor();
    };

    rec.onend = () => {
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      stopAudioMonitor();
      const finalText = transcriptRef.current;
      if (finalText.trim()) { processTranscript(finalText.trim()); }
      else if (stateRef.current === 'listening') { setState('idle'); }
    };

    recognitionRef.current = rec;
    rec.start();
  }, [isSupported, language, startAudioMonitor, stopAudioMonitor, onTranscript, processTranscript]);

  const stopListening = useCallback(() => {
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    recognitionRef.current?.stop(); recognitionRef.current = null;
    stopAudioMonitor();
  }, [stopAudioMonitor]);

  useEffect(() => { return () => { recognitionRef.current?.stop(); stopAudioMonitor(); if (autoStopRef.current) clearTimeout(autoStopRef.current); }; }, [stopAudioMonitor]);

  // ---- Text-based BI query (triggered from search box Enter key) ----
  const lastTextQueryRef = useRef('');
  const [autocorrectHint, setAutocorrectHint] = useState<AutocorrectResult | null>(null);
  useEffect(() => {
    if (textQuery && textQuery.trim() && textQuery !== lastTextQueryRef.current) {
      lastTextQueryRef.current = textQuery;
      // Strip any timestamp suffix (e.g., "top 5 customers#1708712345678")
      const cleanQuery = textQuery.replace(/#\d+$/, '').trim();
      if (cleanQuery) {
        // Run autocorrect and store hint for display
        const acResult = autocorrect(cleanQuery);
        setAutocorrectHint(acResult.wasChanged ? acResult : null);
        setShowPanel(true);
        setTranscript(acResult.wasChanged ? acResult.corrected : cleanQuery);
        setErrorMsg('');
        setBiResult(null);
        processTranscript(acResult.wasChanged ? acResult.corrected : cleanQuery);
      }
    }
  }, [textQuery, processTranscript]);

  // Close on outside click (only when idle and no BI results)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) && stateRef.current === 'idle' && !biResult) setShowPanel(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [biResult]);

  const toggleListening = () => {
    if (state === 'listening') stopListening();
    else if (['idle', 'success', 'error'].includes(state)) startListening();
  };

  const dismiss = () => {
    stopListening(); setState('idle'); setShowPanel(false);
    setTranscript(''); setInterim(''); setErrorMsg(''); setBiResult(null);
  };

  // ---- Sorted results ----
  const sortedCustomers = useMemo(() => {
    if (!biResult?.customers) return [];
    const arr = [...biResult.customers];
    switch (sortBy) {
      case 'vuln-asc': return arr.sort((a, b) => a.totVuln - b.totVuln);
      case 'name-asc': return arr.sort((a, b) => a.customerName.localeCompare(b.customerName));
      case 'name-desc': return arr.sort((a, b) => b.customerName.localeCompare(a.customerName));
      default: return arr.sort((a, b) => b.totVuln - a.totVuln);
    }
  }, [biResult?.customers, sortBy]);

  const sortedFieldNotices = useMemo(() => {
    if (!biResult?.fieldNotices) return [];
    const arr = [...biResult.fieldNotices];
    switch (sortBy) {
      case 'vuln-asc': return arr.sort((a, b) => a.totVuln - b.totVuln);
      case 'name-asc': return arr.sort((a, b) => a.fieldNoticeId.localeCompare(b.fieldNoticeId));
      case 'name-desc': return arr.sort((a, b) => b.fieldNoticeId.localeCompare(a.fieldNoticeId));
      default: return arr.sort((a, b) => b.totVuln - a.totVuln);
    }
  }, [biResult?.fieldNotices, sortBy]);

  // ---- Render helpers ----
  const pulseRings = state === 'listening' ? (
    <>
      <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: `radial-gradient(circle, rgba(6,182,212,${0.3 + audioLevel * 0.4}) 0%, transparent 70%)`, animationDuration: '1.5s' }} />
      <span className="absolute -inset-1 rounded-full opacity-20" style={{ background: `radial-gradient(circle, rgba(139,92,246,${0.2 + audioLevel * 0.3}) 0%, transparent 60%)`, transform: `scale(${1 + audioLevel * 0.3})`, transition: 'transform 100ms' }} />
    </>
  ) : null;

  const micBtnCls =
    state === 'listening' ? 'from-cyan-500 via-purple-500 to-pink-500 shadow-[0_0_20px_rgba(6,182,212,0.6)]' :
    state === 'processing' || state === 'fetching' ? 'from-amber-500 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]' :
    state === 'success' ? 'from-emerald-500 to-green-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' :
    state === 'error' ? 'from-rose-500 to-red-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]' :
    'from-purple-600 via-indigo-600 to-cyan-600 shadow-[0_0_15px_rgba(139,92,246,0.5)]';

  const micIcon =
    state === 'listening' ? <Mic size={20} className="animate-pulse" /> :
    state === 'processing' || state === 'fetching' ? <Loader2 size={20} className="animate-spin" /> :
    state === 'success' ? <CheckCircle size={20} /> :
    state === 'error' ? <MicOff size={20} /> :
    <Mic size={20} />;

  const hasResults = biResult && biResult.type !== 'none';

  return (
    <div className={`relative ${className}`} ref={panelRef}>
      {/* ---- Mic Button ---- */}
      <button
        onClick={toggleListening}
        disabled={state === 'processing' || state === 'fetching'}
        className={`relative w-12 h-12 flex items-center justify-center rounded-full bg-linear-to-br ${micBtnCls} text-white hover:scale-105 active:scale-95 transition-all duration-200 shrink-0 disabled:opacity-60`}
        aria-label={state === 'listening' ? 'Stop voice search' : 'Start voice search'}
        title="Smart Voice Search — speak to query top customers, field notices & more"
      >
        {pulseRings}
        <span className="relative z-10">{micIcon}</span>
        {state === 'idle' && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-linear-to-br from-cyan-400 to-emerald-400 rounded-full flex items-center justify-center">
            <Search size={8} className="text-gray-900" />
          </span>
        )}
      </button>

      {/* ---- Results Panel ---- */}
      {showPanel && (
        <div className="absolute top-full left-0 mt-3 w-120 max-w-[92vw] bg-slate-800/95 backdrop-blur-xl border border-slate-600/80 rounded-2xl shadow-2xl shadow-black/60 z-100 overflow-hidden flex flex-col max-h-[70vh]">

          {/* ======== HEADER ======== */}
          <div className="flex items-center justify-between px-4 py-3 bg-linear-to-r from-slate-800 to-slate-700 border-b border-slate-600/50 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {state === 'listening' && <span className="relative flex h-3 w-3 shrink-0"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400" /></span>}
              {(state === 'processing' || state === 'fetching') && <Loader2 size={14} className="animate-spin text-amber-400 shrink-0" />}
              <span className="text-sm font-semibold text-white truncate">
                {state === 'listening' ? 'Listening...' : state === 'processing' ? 'Analyzing...' : state === 'fetching' ? 'Querying data...' : state === 'success' && hasResults ? biResult!.title : state === 'error' ? 'Error' : 'Smart Voice Search'}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {/* Language */}
              <div className="relative">
                <button onClick={() => setShowLangPicker(!showLangPicker)} className="p-1.5 hover:bg-slate-600/50 rounded-lg transition-colors text-slate-400 hover:text-white" title="Language">
                  <Globe size={14} />
                </button>
                {showLangPicker && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-slate-700 border border-slate-600 rounded-xl shadow-xl z-50 overflow-hidden">
                    {LANGUAGES.map(l => (
                      <button key={l.code} onClick={() => { setLanguage(l.code); setShowLangPicker(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-600/50 transition-colors ${language === l.code ? 'text-cyan-300 bg-cyan-500/10' : 'text-slate-300'}`}>
                        <span>{l.flag}</span> <span>{l.label}</span>
                        {language === l.code && <CheckCircle size={10} className="ml-auto text-cyan-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* TTS */}
              <button onClick={() => setTtsEnabled(!ttsEnabled)} className={`p-1.5 hover:bg-slate-600/50 rounded-lg transition-colors ${ttsEnabled ? 'text-cyan-400' : 'text-slate-500'}`} title={ttsEnabled ? 'Voice feedback ON' : 'Voice feedback OFF'}>
                {ttsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </button>
              {/* Close */}
              <button onClick={dismiss} className="p-1.5 hover:bg-slate-600/50 rounded-lg transition-colors text-slate-400 hover:text-white"><X size={14} /></button>
            </div>
          </div>

          {/* ======== AUDIO LEVEL ======== */}
          {state === 'listening' && (
            <div className="px-4 py-2 shrink-0">
              <div className="flex items-center gap-2">
                <Volume2 size={12} className="text-cyan-400 shrink-0" />
                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-linear-to-r from-cyan-400 via-purple-400 to-pink-400 rounded-full transition-all duration-75" style={{ width: `${Math.max(5, audioLevel * 100)}%` }} />
                </div>
                <span className="text-[10px] text-slate-500 font-mono w-8 text-right">{Math.round(audioLevel * 100)}%</span>
              </div>
            </div>
          )}

          {/* ======== TRANSCRIPT ======== */}
          {(state === 'listening' || state === 'processing' || (transcript && !hasResults)) && (
            <div className="px-4 py-3 shrink-0">
              {(transcript || interim) ? (
                <p className="text-sm text-slate-200 leading-relaxed">
                  {transcript}{interim && <span className="text-slate-400 italic"> {interim}</span>}
                </p>
              ) : (
                <p className="text-sm text-slate-400 italic">Speak now &mdash; &quot;Show top 5 customers&quot; or &quot;Top field notices&quot;</p>
              )}
            </div>
          )}

          {/* ======== ERROR ======== */}
          {state === 'error' && (
            <div className="px-4 py-3 shrink-0">
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-300">{errorMsg}</p>
              </div>
              <button onClick={() => { setState('idle'); setErrorMsg(''); startListening(); }} className="w-full py-2 rounded-lg bg-linear-to-r from-cyan-600 to-indigo-600 text-white text-sm font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2">
                <RefreshCw size={14} /> Try Again
              </button>
            </div>
          )}

          {/* ======== AUTOCORRECT HINT ======== */}
          {autocorrectHint && autocorrectHint.wasChanged && (
            <div className="px-4 py-2 bg-amber-900/30 border-b border-amber-700/40 flex items-center gap-2 text-[11px] shrink-0">
              <AlertCircle size={12} className="text-amber-400 shrink-0" />
              <span className="text-amber-300">Auto-corrected:</span>
              <span className="text-slate-400 line-through">{autocorrectHint.original}</span>
              <span className="text-white mx-1">&rarr;</span>
              <span className="text-emerald-300 font-medium">{autocorrectHint.corrected}</span>
              <span className="text-slate-500 ml-auto">
                {autocorrectHint.corrections.length} fix{autocorrectHint.corrections.length !== 1 ? 'es' : ''}
              </span>
            </div>
          )}

          {/* ======== BI RESULTS ======== */}
          {hasResults && (
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Controls bar */}
              <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-700/50 flex items-center justify-between gap-2 shrink-0 flex-wrap">
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Clock size={10} /> {biResult!.queryTimeMs}ms
                  <span className="mx-1">&bull;</span>
                  {biResult!.subtitle}
                </p>
                <div className="flex items-center gap-1">
                  {(biResult!.type === 'customers' || biResult!.type === 'field_notices') && (
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-[10px] bg-slate-700 border border-slate-600 text-slate-300 rounded-md px-1.5 py-1 focus:outline-none">
                      {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  )}
                  <div className="relative">
                    <button onClick={() => setShowExport(!showExport)} className="p-1.5 hover:bg-slate-600/50 rounded-lg transition-colors text-slate-400 hover:text-white" title="Export"><Download size={12} /></button>
                    {showExport && (
                      <div className="absolute right-0 top-full mt-1 w-32 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden">
                        <button onClick={() => { exportToCSV(biResult!); setShowExport(false); }} className="w-full text-left text-xs text-slate-300 hover:bg-slate-600/50 px-3 py-2 flex items-center gap-2"><Download size={10} /> Export CSV</button>
                        <button onClick={() => { exportToJSON(biResult!); setShowExport(false); }} className="w-full text-left text-xs text-slate-300 hover:bg-slate-600/50 px-3 py-2 flex items-center gap-2"><ExternalLink size={10} /> Export JSON</button>
                        <button onClick={() => { copyToClipboard(biResult!); setShowExport(false); }} className="w-full text-left text-xs text-slate-300 hover:bg-slate-600/50 px-3 py-2 flex items-center gap-2"><Copy size={10} /> Copy Text</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ---- Top Customers ---- */}
              {biResult!.type === 'customers' && sortedCustomers.length > 0 && (
                <div className="divide-y divide-slate-700/40">
                  {sortedCustomers.map((c, i) => (
                    <div key={c.customerName}>
                      <button onClick={() => setExpandedRow(expandedRow === i ? null : i)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/30 transition-colors text-left">
                        <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{c.customerName}</p>
                          <p className="text-[11px] text-slate-400">{c.recordCount.toLocaleString()} records</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-red-400">{fmtNum(c.totVuln)}</p>
                          <p className="text-[10px] text-slate-500">vulnerable</p>
                        </div>
                        <ChevronDown size={12} className={`text-slate-500 transition-transform shrink-0 ${expandedRow === i ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedRow === i && (
                        <div className="px-4 pb-3 pt-1 bg-slate-900/40 grid grid-cols-3 gap-2 text-center">
                          <StatTile label="Vulnerable" value={fmtNum(c.totVuln)} color="red" />
                          <StatTile label="Potential" value={fmtNum(c.potVuln)} color="amber" />
                          <StatTile label="Secure" value={fmtNum(c.notVuln)} color="emerald" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ---- Top Field Notices ---- */}
              {biResult!.type === 'field_notices' && sortedFieldNotices.length > 0 && (
                <div className="divide-y divide-slate-700/40">
                  {sortedFieldNotices.map((fn, i) => (
                    <div key={fn.fieldNoticeId}>
                      <button onClick={() => setExpandedRow(expandedRow === i ? null : i)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/30 transition-colors text-left">
                        <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{fn.fieldNoticeId}</p>
                          <p className="text-[11px] text-slate-400 truncate">{fn.fnTitle}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-red-400">{fmtNum(fn.totVuln)}</p>
                          <p className="text-[10px] text-slate-500">{fn.fnType}</p>
                        </div>
                        <ChevronDown size={12} className={`text-slate-500 transition-transform shrink-0 ${expandedRow === i ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedRow === i && (
                        <div className="px-4 pb-3 pt-1 bg-slate-900/40">
                          <div className="grid grid-cols-3 gap-2 text-center mb-2">
                            <StatTile label="Vulnerable" value={fmtNum(fn.totVuln)} color="red" />
                            <StatTile label="Potential" value={fmtNum(fn.potVuln)} color="amber" />
                            <StatTile label="Secure" value={fmtNum(fn.notVuln)} color="emerald" />
                          </div>
                          <p className="text-[10px] text-slate-500">Published: {fn.firstPublished ? new Date(fn.firstPublished).toLocaleDateString() : 'N/A'} &bull; Type: {fn.fnType}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ---- Extreme Customers ---- */}
              {biResult!.type === 'extreme_customers' && biResult!.extremeCustomers && biResult!.extremeCustomers.length > 0 && (
                <div className="divide-y divide-slate-700/40">
                  {biResult!.extremeCustomers.map((c, i) => (
                    <div key={c.customerName}>
                      <button onClick={() => setExpandedRow(expandedRow === i ? null : i)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/30 transition-colors text-left">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${riskColor(c.riskLevel)}`}>{c.riskLevel}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{c.customerName}</p>
                          <p className="text-[11px] text-slate-400">{fmtNum(c.totalAssets)} total assets</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-red-400">{fmtNum(c.totalVulnerabilities)}</p>
                          <p className="text-[10px] text-slate-500">{c.vulnerabilityPercentage}%</p>
                        </div>
                        <ChevronDown size={12} className={`text-slate-500 transition-transform shrink-0 ${expandedRow === i ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedRow === i && (
                        <div className="px-4 pb-3 pt-1 bg-slate-900/40 grid grid-cols-3 gap-2 text-center">
                          <StatTile label="Vulnerable" value={fmtNum(c.totalVulnerabilities)} color="red" />
                          <StatTile label="Potential" value={fmtNum(c.potentialVulnerabilities)} color="amber" />
                          <StatTile label="Secure" value={fmtNum(c.secureAssets)} color="emerald" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ---- Metrics ---- */}
              {biResult!.type === 'metrics' && biResult!.metricsData && (
                <div className="p-4 grid grid-cols-2 gap-3">
                  <MetricTile icon={<BarChart3 size={14} />} label="Total Assessed" value={fmtNum(biResult!.metricsData.totalAssessed)} color="cyan" />
                  <MetricTile icon={<AlertCircle size={14} />} label="Vulnerable" value={fmtNum(biResult!.metricsData.vulnerable)} color="red" />
                  <MetricTile icon={<AlertTriangle size={14} />} label="Potentially Vuln." value={fmtNum(biResult!.metricsData.potentiallyVulnerable)} color="amber" />
                  <MetricTile icon={<Shield size={14} />} label="Secure" value={fmtNum(biResult!.metricsData.notVulnerable)} color="emerald" />
                </div>
              )}

              {/* Empty */}
              {biResult!.type !== 'none' && !biResult!.customers?.length && !biResult!.fieldNotices?.length && !biResult!.extremeCustomers?.length && !biResult!.metricsData && (
                <div className="px-4 py-6 text-center">
                  <Search size={20} className="mx-auto text-slate-500 mb-2" />
                  <p className="text-sm text-slate-400">No results found.</p>
                  <p className="text-xs text-slate-500 mt-1">Try a different voice command.</p>
                </div>
              )}
            </div>
          )}

          {/* ======== VOICE COMMANDS HINT ======== */}
          {state === 'listening' && (
            <div className="px-4 pb-3 pt-1 border-t border-slate-700/30 shrink-0">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Voice Commands</p>
              <div className="grid grid-cols-2 gap-1">
                {['Top 5 customers', 'Top field notices', 'High risk customers', 'Show metrics', 'Show [customer name]', 'Reset all filters'].map((cmd, i) => (
                  <span key={i} className="text-[10px] text-slate-400 bg-slate-700/40 px-2 py-1 rounded-md truncate">&quot;{cmd}&quot;</span>
                ))}
              </div>
            </div>
          )}

          {/* ======== FOOTER ======== */}
          {(hasResults || state === 'success') && (
            <div className="px-4 py-2 bg-slate-900/50 border-t border-slate-700/40 flex items-center justify-between shrink-0">
              <button onClick={startListening} disabled={state === 'listening' || state === 'processing' || state === 'fetching'} className="flex items-center gap-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 disabled:text-slate-500 transition-colors">
                <Mic size={12} /> New query
              </button>
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Shield size={8} /> Session logged &bull; {LANGUAGES.find(l => l.code === language)?.flag} {language}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Sub-components ----

function StatTile({ label, value, color }: { label: string; value: string; color: string }) {
  const cls: Record<string, string> = {
    red: 'bg-red-500/10 border-red-500/20',
    amber: 'bg-amber-500/10 border-amber-500/20',
    emerald: 'bg-emerald-500/10 border-emerald-500/20',
  };
  const txtCls: Record<string, string> = { red: 'text-red-400', amber: 'text-amber-400', emerald: 'text-emerald-400' };
  return (
    <div className={`rounded-lg border p-2 ${cls[color] || cls.red}`}>
      <p className={`text-xs font-bold ${txtCls[color] || txtCls.red}`}>{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

function MetricTile({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const cls: Record<string, string> = {
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };
  return (
    <div className={`rounded-xl border p-3 ${cls[color] || cls.cyan}`}>
      <div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-[10px] uppercase tracking-wider font-bold">{label}</span></div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

export default VoiceSearchMic;
