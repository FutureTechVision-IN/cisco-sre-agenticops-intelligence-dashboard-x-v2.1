/**
 * ThemeContext.tsx
 * ================
 * Centralized theme management for the SRE AgenticOps Dashboard.
 *
 * Priority: localStorage → system preference → default ("dark").
 * Persists user choice under key 'dashboard-theme-preference'.
 * Applies `data-theme` attribute on <html> and fires a custom
 * 'theme-change' event for cross-component communication.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

/* -----------------------------------------------------------
   Types
   ----------------------------------------------------------- */

export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
  /** Current active theme */
  theme: Theme;
  /** Toggle between light and dark */
  toggleTheme: () => void;
  /** Set a specific theme */
  setTheme: (t: Theme) => void;
  /** Whether the current theme was auto-detected from OS */
  isSystemPreference: boolean;
}

const STORAGE_KEY = 'dashboard-theme-preference';

/* -----------------------------------------------------------
   Helpers
   ----------------------------------------------------------- */

function getSystemPreference(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 *  Read initial theme synchronously.
 *  Called before first render to prevent FOUC.
 */
function getInitialTheme(): { theme: Theme; fromSystem: boolean } {
  if (typeof window === 'undefined') return { theme: 'dark', fromSystem: false };

  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === 'light' || stored === 'dark') {
      return { theme: stored, fromSystem: false };
    }
  } catch {
    /* localStorage may be blocked */
  }

  return { theme: getSystemPreference(), fromSystem: true };
}

function applyThemeToDom(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);

  // Update body background immediately to avoid flash
  if (theme === 'light') {
    // Use CSS custom properties for background and text color
    document.body.style.backgroundColor = 'var(--theme-bg-primary)';
    document.body.style.color = 'var(--theme-text-primary)';
  } else {
    document.body.style.backgroundColor = 'var(--theme-bg-primary)';
    document.body.style.color = 'var(--theme-text-primary)';
  }
}

/* -----------------------------------------------------------
   Context
   ----------------------------------------------------------- */

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/* -----------------------------------------------------------
   Provider
   ----------------------------------------------------------- */

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const initial = useMemo(getInitialTheme, []);
  const [theme, setThemeState] = useState<Theme>(initial.theme);
  const [isSystemPreference, setIsSystemPreference] = useState(initial.fromSystem);

  // Apply theme to DOM whenever it changes
  useEffect(() => {
    applyThemeToDom(theme);

    // Enable smooth transitions AFTER first paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.add('theme-transition');
      });
    });

    // Dispatch custom event for any listener
    window.dispatchEvent(
      new CustomEvent('theme-change', { detail: { theme } })
    );
  }, [theme]);

  // Listen for system preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const handler = (e: MediaQueryListEvent) => {
      // Only follow system if user hasn't set explicit preference
      if (isSystemPreference) {
        const newTheme: Theme = e.matches ? 'dark' : 'light';
        setThemeState(newTheme);
      }
    };

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [isSystemPreference]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    setIsSystemPreference(false);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* noop */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, toggleTheme, setTheme, isSystemPreference }),
    [theme, toggleTheme, setTheme, isSystemPreference]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/* -----------------------------------------------------------
   Hook
   ----------------------------------------------------------- */

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}
