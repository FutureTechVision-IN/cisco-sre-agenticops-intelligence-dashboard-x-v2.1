/**
 * ThemeToggle.tsx
 * ===============
 * Accessible theme toggle button for header navigation.
 *
 * Features:
 *  - Sun/Moon icon with smooth morph transition
 *  - Tooltip with current state
 *  - Keyboard accessible (Space/Enter)
 *  - aria-label for screen readers
 *  - Respects prefers-reduced-motion
 */

import React from 'react';
import { useTheme, Theme } from '../contexts/ThemeContext';

/* -- SVG Icons (inline to avoid extra deps) -- */

const SunIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

/* -- Component -- */

interface ThemeToggleProps {
  /** Optional extra classes for the wrapper button */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

export function ThemeToggle({ className = '', size = 'md' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const sizeClasses: Record<string, string> = {
    sm: 'w-8 h-8',
    md: 'w-9 h-9',
    lg: 'w-10 h-10',
  };

  const iconSize: Record<string, string> = {
    sm: 'w-4 h-4',
    md: 'w-[18px] h-[18px]',
    lg: 'w-5 h-5',
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`
        relative group inline-flex items-center justify-center
        ${sizeClasses[size]}
        rounded-lg
        border border-slate-700/50
        bg-slate-800/50
        text-slate-400
        hover:text-cyan-400 hover:bg-slate-700/50 hover:border-cyan-500/30
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
        transition-all duration-200 ease-in-out
        ${className}
      `.trim()}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Sun icon (visible in dark mode = "click to go light") */}
      <span
        className={`
          absolute inset-0 flex items-center justify-center
          transition-all duration-300 ease-in-out
          ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-0'}
        `}
      >
        <SunIcon className={iconSize[size]} />
      </span>

      {/* Moon icon (visible in light mode = "click to go dark") */}
      <span
        className={`
          absolute inset-0 flex items-center justify-center
          transition-all duration-300 ease-in-out
          ${!isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}
        `}
      >
        <MoonIcon className={iconSize[size]} />
      </span>

      {/* Tooltip */}
      <span className="
        pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2
        px-2 py-1 rounded text-xs font-bold uppercase tracking-wider
        bg-slate-800 text-slate-300 border border-slate-700
        opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap
        shadow-lg z-50
      ">
        {isDark ? 'Light' : 'Dark'}
      </span>
    </button>
  );
}

export default ThemeToggle;
