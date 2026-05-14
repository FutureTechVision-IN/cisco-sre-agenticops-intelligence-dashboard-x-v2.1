/**
 * useChartTheme.ts
 * =================
 * Centralized chart theming hook for Recharts components.
 * 
 * Provides theme-aware colors for all Recharts inline props
 * (grid, axes, tooltip, cursor, etc.) that cannot be styled via CSS.
 * 
 * Usage:
 *   const chart = useChartTheme();
 *   <CartesianGrid stroke={chart.gridStroke} ... />
 *   <XAxis stroke={chart.axisStroke} tick={{ fill: chart.tickFill }} ... />
 *   <Tooltip contentStyle={chart.tooltipStyle} labelStyle={chart.tooltipLabelStyle} />
 */

import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export interface ChartThemeColors {
  /** CartesianGrid / PolarGrid stroke */
  gridStroke: string;
  /** XAxis/YAxis stroke color */
  axisStroke: string;
  /** Tick label fill color (primary — for important labels) */
  tickFill: string;
  /** Tick label fill color (secondary — for less important labels) */
  tickFillMuted: string;
  /** Axis line stroke */
  axisLineStroke: string;
  /** Tooltip container background */
  tooltipBg: string;
  /** Tooltip border color */
  tooltipBorder: string;
  /** Tooltip text color */
  tooltipText: string;
  /** Tooltip label style object (for Recharts labelStyle prop) */
  tooltipLabelStyle: { color: string };
  /** Tooltip item style object (for Recharts itemStyle prop) */
  tooltipItemStyle: { color: string };
  /** Tooltip contentStyle object (for Recharts contentStyle prop) */
  tooltipStyle: {
    backgroundColor: string;
    border: string;
    borderRadius: string;
    color: string;
  };
  /** Cursor fill for bar/area hover */
  cursorFill: string;
  /** SVG background ring stroke (e.g., progress circle tracks) */
  ringTrackStroke: string;
  /** SVG dot outline stroke */
  dotOutlineStroke: string;
  /** ReferenceLine stroke */
  referenceLineStroke: string;
  /** Legend text style */
  legendStyle: { fontSize: string; color: string; fontFamily?: string };
}

/**
 * Accent/data colors remain the same across themes —
 * they're chosen for adequate contrast on both light/dark backgrounds.
 */
export const CHART_ACCENT_COLORS = [
  '#06b6d4', // cyan-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#10b981', // emerald-500
  '#8b5cf6', // violet-500
  '#6366f1', // indigo-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
] as const;

const DARK_CHART: ChartThemeColors = {
  gridStroke: '#334155',
  axisStroke: '#94a3b8',
  tickFill: '#94a3b8',
  tickFillMuted: '#64748b',
  axisLineStroke: '#334155',
  tooltipBg: 'rgba(15, 23, 42, 0.95)',
  tooltipBorder: '#334155',
  tooltipText: '#ffffff',
  tooltipLabelStyle: { color: '#ffffff' },
  tooltipItemStyle: { color: '#ffffff' },
  tooltipStyle: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#ffffff',
  },
  cursorFill: '#1e293b',
  ringTrackStroke: '#1e293b',
  dotOutlineStroke: '#ffffff',
  referenceLineStroke: '#475569',
  legendStyle: { fontSize: '12px', color: '#94a3b8', fontFamily: "'IBM Plex Sans', sans-serif" },
};

const LIGHT_CHART: ChartThemeColors = {
  gridStroke: '#cbd5e1',
  axisStroke: '#475569',
  tickFill: '#475569',
  tickFillMuted: '#64748b',
  axisLineStroke: '#cbd5e1',
  tooltipBg: 'rgba(255, 255, 255, 0.97)',
  tooltipBorder: '#cbd5e1',
  tooltipText: '#0f172a',
  tooltipLabelStyle: { color: '#0f172a' },
  tooltipItemStyle: { color: '#1e293b' },
  tooltipStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    color: '#0f172a',
  },
  cursorFill: '#f1f5f9',
  ringTrackStroke: '#e2e8f0',
  dotOutlineStroke: '#1e293b',
  referenceLineStroke: '#94a3b8',
  legendStyle: { fontSize: '12px', color: '#475569', fontFamily: "'IBM Plex Sans', sans-serif" },
};

/**
 * Returns theme-aware chart colors that react to light/dark mode.
 */
export function useChartTheme(): ChartThemeColors {
  const { theme } = useTheme();
  return useMemo(() => (theme === 'light' ? LIGHT_CHART : DARK_CHART), [theme]);
}

/**
 * Non-hook version for use outside React components (e.g., constants, config).
 * Reads the current theme from the DOM attribute.
 */
export function getChartTheme(): ChartThemeColors {
  if (typeof document === 'undefined') return DARK_CHART;
  const theme = document.documentElement.getAttribute('data-theme');
  return theme === 'light' ? LIGHT_CHART : DARK_CHART;
}

export default useChartTheme;
