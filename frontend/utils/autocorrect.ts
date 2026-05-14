/**
 * SRE AgenticOps Intelligence Dashboard — Autocorrect Engine
 *
 * Provides intelligent spelling correction for search queries, with
 * domain-specific word corrections, contextual phrase matching,
 * and abbreviation expansion.  All correction data is loaded from
 * a persistent JSON data file (`frontend/data/autocorrect-dictionary.json`)
 * so it can be maintained independently of code.
 *
 * @module autocorrect
 * @version 1.0.0
 */

import dictionaryData from '../data/autocorrect-dictionary.json';

// ─── Types ───────────────────────────────────────────────────────────
export interface AutocorrectResult {
  /** The fully corrected query string */
  corrected: string;
  /** The original raw input */
  original: string;
  /** Whether any corrections were applied */
  wasChanged: boolean;
  /** Per-word correction details */
  corrections: CorrectionDetail[];
}

export interface CorrectionDetail {
  original: string;
  corrected: string;
  type: 'word' | 'phrase' | 'abbreviation';
  confidence: number;
}

// ─── Load dictionary ─────────────────────────────────────────────────
const wordMap: Record<string, string> = dictionaryData.corrections ?? {};
const phraseMap: Record<string, string> = dictionaryData.contextual_phrases ?? {};
const abbrMap: Record<string, string> = dictionaryData.abbreviation_expansions ?? {};

// ─── Levenshtein distance (used for fuzzy fallback) ──────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// ─── Fuzzy lookup: try Levenshtein distance against known words ──────
const knownWords = new Set([
  ...Object.values(wordMap),
  'top', 'show', 'me', 'list', 'get', 'find', 'display', 'the',
  'a', 'an', 'and', 'or', 'of', 'in', 'on', 'for', 'to', 'with',
  'by', 'all', 'my', 'is', 'are', 'not', 'most', 'worst', 'best',
  'high', 'low', 'risk', 'severe', 'urgent',
]);

function fuzzyCorrect(word: string, maxDist = 2): { correction: string; confidence: number } | null {
  if (word.length <= 2) return null; // skip very short words
  let bestWord = '';
  let bestDist = Infinity;

  // Check against dictionary correction targets
  for (const target of knownWords) {
    if (Math.abs(target.length - word.length) > maxDist) continue;
    const d = levenshtein(word, target);
    if (d < bestDist && d <= maxDist && d > 0) {
      bestDist = d;
      bestWord = target;
    }
  }
  if (bestWord) {
    const confidence = Math.max(0.4, 1 - (bestDist / Math.max(word.length, bestWord.length)));
    return { correction: bestWord, confidence };
  }
  return null;
}

// ─── Core autocorrect function ───────────────────────────────────────

/**
 * Autocorrect a search query.  Priority order:
 * 1. Contextual phrase matches (multi-word)
 * 2. Exact dictionary word corrections
 * 3. Abbreviation expansions (only for standalone short words)
 * 4. Fuzzy / Levenshtein-based fallback
 */
export function autocorrect(input: string): AutocorrectResult {
  if (!input?.trim()) {
    return { corrected: input, original: input, wasChanged: false, corrections: [] };
  }

  const original = input;
  const corrections: CorrectionDetail[] = [];
  let text = input;

  // ── Pass 1: contextual phrase correction ──
  const lowerText = text.toLowerCase();
  for (const [badPhrase, goodPhrase] of Object.entries(phraseMap)) {
    if (lowerText.includes(badPhrase) && badPhrase !== goodPhrase) {
      const re = new RegExp(badPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      text = text.replace(re, goodPhrase);
      corrections.push({ original: badPhrase, corrected: goodPhrase, type: 'phrase', confidence: 0.95 });
    }
  }

  // ── Pass 2: per-word correction ──
  const words = text.split(/(\s+)/); // keep whitespace tokens
  const correctedWords = words.map(w => {
    if (/^\s+$/.test(w)) return w; // preserve whitespace
    const lower = w.toLowerCase();

    // Skip words that are already correct / known
    if (knownWords.has(lower)) return w;

    // 2a: exact dictionary match
    if (wordMap[lower]) {
      const corrected = wordMap[lower];
      // Preserve original casing style
      const result = w[0] === w[0].toUpperCase()
        ? corrected.charAt(0).toUpperCase() + corrected.slice(1)
        : corrected;
      corrections.push({ original: w, corrected: result, type: 'word', confidence: 0.98 });
      return result;
    }

    // 2b: abbreviation expansion (only for short standalone tokens, 2-5 chars)
    if (lower.length <= 5 && abbrMap[lower]) {
      const expanded = abbrMap[lower];
      corrections.push({ original: w, corrected: expanded, type: 'abbreviation', confidence: 0.90 });
      return expanded;
    }

    // 2c: fuzzy fallback
    const fuzzy = fuzzyCorrect(lower);
    if (fuzzy) {
      const result = w[0] === w[0].toUpperCase()
        ? fuzzy.correction.charAt(0).toUpperCase() + fuzzy.correction.slice(1)
        : fuzzy.correction;
      corrections.push({ original: w, corrected: result, type: 'word', confidence: fuzzy.confidence });
      return result;
    }

    return w; // no correction needed
  });

  const corrected = correctedWords.join('');
  const wasChanged = corrected.toLowerCase() !== original.toLowerCase();

  return { corrected, original, wasChanged, corrections };
}

/**
 * Get a human-readable label describing the corrections
 * e.g. "Did you mean: show me top software field notices?"
 */
export function formatCorrectionHint(result: AutocorrectResult): string {
  if (!result.wasChanged) return '';
  return `Did you mean: "${result.corrected}"?`;
}

/**
 * Extract fnType (Software / Hardware) from query text.
 * Returns null if no type filter is specified.
 */
export function extractFnType(query: string): 'Software' | 'Hardware' | null {
  const t = query.toLowerCase();
  if (/\bsoftware\b|\bsw\b/.test(t)) return 'Software';
  if (/\bhardware\b|\bhw\b/.test(t)) return 'Hardware';
  return null;
}

export default autocorrect;
