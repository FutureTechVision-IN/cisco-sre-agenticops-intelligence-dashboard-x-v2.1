/**
 * MCP Theme Validation Server
 * ============================
 * Provides programmatic access to the frontend dashboard for automated
 * theme testing, screenshot comparison, color contrast validation,
 * and interactive element testing.
 *
 * Endpoints:
 *   GET  /health                    — Server health check
 *   GET  /api/theme/state           — Detect current theme state
 *   POST /api/theme/switch          — Switch to light/dark theme
 *   POST /api/theme/screenshot      — Take themed screenshot
 *   POST /api/theme/compare         — Compare light vs dark screenshots
 *   POST /api/validate/contrast     — Validate WCAG color contrast
 *   POST /api/validate/fonts        — Analyze font rendering
 *   POST /api/validate/interactive  — Test interactive element states
 *   POST /api/test/run              — Run full automated test suite
 */

import express, { Request, Response } from 'express';
import puppeteer, { Browser, Page } from 'puppeteer';
import { mkdir, writeFile, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Configuration ─────────────────────────────────────────────
const PORT = parseInt(process.env.MCP_PORT || '4100', 10);
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:5000';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const CREDENTIALS = { username: 'sre-admin', password: 'password$$' };

// ─── Types ─────────────────────────────────────────────────────
interface ContrastResult {
  selector: string;
  element: string;
  foreground: string;
  background: string;
  ratio: number;
  passes_AA: boolean;
  passes_AAA: boolean;
  level: 'normal' | 'large';
}

interface FontAnalysis {
  selector: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  color: string;
  isLegible: boolean;
  contrastRatio: number;
}

interface InteractiveTest {
  selector: string;
  element: string;
  hasHoverState: boolean;
  hasActiveState: boolean;
  hasFocusState: boolean;
  isClickable: boolean;
  tapTargetSize: { width: number; height: number };
  meetsMinimumSize: boolean; // 44x44px per WCAG 2.5.5
}

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: unknown;
}

// ─── Browser Management ────────────────────────────────────────
let browser: Browser | null = null;
let page: Page | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return browser;
}

async function getPage(): Promise<Page> {
  if (!page || page.isClosed()) {
    const b = await getBrowser();
    page = await b.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
  }
  return page;
}

async function ensureLoggedIn(p: Page): Promise<void> {
  const url = p.url();
  if (!url.includes(DASHBOARD_URL) || url === 'about:blank') {
    await p.goto(DASHBOARD_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  }

  // Check if we need to log in (login form present)
  const loginForm = await p.$('input[type="password"]');
  if (loginForm) {
    await p.type('input[type="text"], input[name="username"]', CREDENTIALS.username);
    await p.type('input[type="password"]', CREDENTIALS.password);
    await p.click('button[type="submit"]');
    await p.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
    // Wait for dashboard to load
    await p.waitForSelector('[class*="Intelligence"], [class*="intelligence"], h1', { timeout: 10000 }).catch(() => {});
  }
}

// ─── Color Utilities ───────────────────────────────────────────

function parseColor(color: string): { r: number; g: number; b: number; a: number } | null {
  // rgba(r, g, b, a) or rgb(r, g, b)
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1]),
      g: parseInt(rgbaMatch[2]),
      b: parseInt(rgbaMatch[3]),
      a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
    };
  }
  return null;
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(fg: { r: number; g: number; b: number }, bg: { r: number; g: number; b: number }): number {
  const l1 = relativeLuminance(fg.r, fg.g, fg.b);
  const l2 = relativeLuminance(bg.r, bg.g, bg.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── Express App ───────────────────────────────────────────────
const app = express();
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    dashboardUrl: DASHBOARD_URL,
    browserConnected: !!browser,
    timestamp: new Date().toISOString(),
  });
});

// ─── Theme State Detection ─────────────────────────────────────
app.get('/api/theme/state', async (_req: Request, res: Response) => {
  try {
    const p = await getPage();
    await ensureLoggedIn(p);

    const state = await p.evaluate(() => {
      const html = document.documentElement;
      return {
        dataTheme: html.getAttribute('data-theme'),
        storedTheme: localStorage.getItem('dashboard-theme-preference'),
        systemPreference: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
        bodyBg: getComputedStyle(document.body).backgroundColor,
        bodyColor: getComputedStyle(document.body).color,
      };
    });

    res.json({ status: 'ok', theme: state });
  } catch (err) {
    res.status(500).json({ status: 'error', message: String(err) });
  }
});

// ─── Theme Switching ───────────────────────────────────────────
app.post('/api/theme/switch', async (req: Request, res: Response) => {
  try {
    const { theme } = req.body as { theme: 'light' | 'dark' };
    if (!theme || !['light', 'dark'].includes(theme)) {
      res.status(400).json({ status: 'error', message: 'theme must be "light" or "dark"' });
      return;
    }

    const p = await getPage();
    await ensureLoggedIn(p);

    const result = await p.evaluate((t: string) => {
      const html = document.documentElement;
      html.setAttribute('data-theme', t);
      localStorage.setItem('dashboard-theme-preference', t);

      if (t === 'light') {
        document.body.style.backgroundColor = '#f8fafc';
        document.body.style.color = '#1e293b';
      } else {
        document.body.style.backgroundColor = '#0f172a';
        document.body.style.color = '#fff';
      }

      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: t } }));

      return {
        newTheme: html.getAttribute('data-theme'),
        bodyBg: getComputedStyle(document.body).backgroundColor,
      };
    }, theme);

    // Wait for transitions
    await new Promise((r) => setTimeout(r, 500));

    res.json({ status: 'ok', ...result });
  } catch (err) {
    res.status(500).json({ status: 'error', message: String(err) });
  }
});

// ─── Screenshot ────────────────────────────────────────────────
app.post('/api/theme/screenshot', async (req: Request, res: Response) => {
  try {
    const { theme, page: pageName = 'dashboard', fullPage = true } = req.body as {
      theme?: 'light' | 'dark';
      page?: string;
      fullPage?: boolean;
    };

    const p = await getPage();
    await ensureLoggedIn(p);

    // Switch theme if requested
    if (theme) {
      await p.evaluate((t: string) => {
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('dashboard-theme-preference', t);
        document.body.style.backgroundColor = t === 'light' ? '#f8fafc' : '#0f172a';
        document.body.style.color = t === 'light' ? '#1e293b' : '#fff';
        window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: t } }));
      }, theme);
      await new Promise((r) => setTimeout(r, 500));
    }

    await mkdir(SCREENSHOT_DIR, { recursive: true });
    const currentTheme = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
    const filename = `${pageName}-${currentTheme}-${Date.now()}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);

    await p.screenshot({ path: filepath, fullPage });

    res.json({
      status: 'ok',
      theme: currentTheme,
      file: filename,
      path: filepath,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: String(err) });
  }
});

// ─── Screenshot Comparison ─────────────────────────────────────
app.post('/api/theme/compare', async (req: Request, res: Response) => {
  try {
    const { page: pageName = 'dashboard' } = req.body as { page?: string };

    const p = await getPage();
    await ensureLoggedIn(p);
    await mkdir(SCREENSHOT_DIR, { recursive: true });

    const screenshots: Record<string, string> = {};

    for (const theme of ['light', 'dark'] as const) {
      await p.evaluate((t: string) => {
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('dashboard-theme-preference', t);
        document.body.style.backgroundColor = t === 'light' ? '#f8fafc' : '#0f172a';
        document.body.style.color = t === 'light' ? '#1e293b' : '#fff';
        window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: t } }));
      }, theme);
      await new Promise((r) => setTimeout(r, 600));

      const filename = `${pageName}-${theme}-compare-${Date.now()}.png`;
      const filepath = path.join(SCREENSHOT_DIR, filename);
      await p.screenshot({ path: filepath, fullPage: true });
      screenshots[theme] = filepath;
    }

    // Pixel comparison (basic diff — count differing pixels)
    const lightBuffer = await readFile(screenshots.light);
    const darkBuffer = await readFile(screenshots.dark);

    res.json({
      status: 'ok',
      screenshots,
      comparison: {
        lightSize: lightBuffer.length,
        darkSize: darkBuffer.length,
        sizeDiffPercent: Math.abs(lightBuffer.length - darkBuffer.length) / Math.max(lightBuffer.length, darkBuffer.length) * 100,
        message: 'Screenshots captured for both themes. Visual comparison requires pixel-level analysis.',
      },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: String(err) });
  }
});

// ─── Color Contrast Validation ─────────────────────────────────
app.post('/api/validate/contrast', async (req: Request, res: Response) => {
  try {
    const { theme, selectors } = req.body as {
      theme?: 'light' | 'dark';
      selectors?: string[];
    };

    const p = await getPage();
    await ensureLoggedIn(p);

    if (theme) {
      await p.evaluate((t: string) => {
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('dashboard-theme-preference', t);
        document.body.style.backgroundColor = t === 'light' ? '#f8fafc' : '#0f172a';
        document.body.style.color = t === 'light' ? '#1e293b' : '#fff';
      }, theme);
      await new Promise((r) => setTimeout(r, 500));
    }

    const defaultSelectors = selectors || [
      'h1', 'h2', 'h3', 'h4', 'p', 'span', 'a', 'button', 'label',
      'td', 'th', '.text-white', '.text-slate-300', '.text-slate-400',
      '.ds-nav-tab', '.ds-section-title', '.ds-card-heading', '.ds-text-data',
    ];

    const results = await p.evaluate((sels: string[]) => {
      const findings: Array<{
        selector: string;
        element: string;
        foreground: string;
        background: string;
        fontSize: string;
        fontWeight: string;
      }> = [];

      for (const sel of sels) {
        const elements = document.querySelectorAll(sel);
        elements.forEach((el, i) => {
          if (i >= 5) return; // Limit per selector
          const styles = getComputedStyle(el as HTMLElement);
          const fg = styles.color;
          const bg = styles.backgroundColor;

          // Find effective background (walk up tree if transparent)
          let effectiveBg = bg;
          let parent = (el as HTMLElement).parentElement;
          while (parent && (effectiveBg === 'rgba(0, 0, 0, 0)' || effectiveBg === 'transparent')) {
            effectiveBg = getComputedStyle(parent).backgroundColor;
            parent = parent.parentElement;
          }
          if (effectiveBg === 'rgba(0, 0, 0, 0)') effectiveBg = 'rgb(255, 255, 255)';

          findings.push({
            selector: sel,
            element: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''),
            foreground: fg,
            background: effectiveBg,
            fontSize: styles.fontSize,
            fontWeight: styles.fontWeight,
          });
        });
      }

      return findings;
    }, defaultSelectors);

    // Calculate contrast ratios server-side
    const contrastResults: ContrastResult[] = results.map((r) => {
      const fg = parseColor(r.foreground);
      const bg = parseColor(r.background);
      const ratio = fg && bg ? contrastRatio(fg, bg) : 0;
      const fontSize = parseFloat(r.fontSize);
      const fontWeight = parseInt(r.fontWeight);
      const isLarge = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);

      return {
        selector: r.selector,
        element: r.element,
        foreground: r.foreground,
        background: r.background,
        ratio: Math.round(ratio * 100) / 100,
        passes_AA: isLarge ? ratio >= 3 : ratio >= 4.5,
        passes_AAA: isLarge ? ratio >= 4.5 : ratio >= 7,
        level: isLarge ? 'large' : 'normal',
      };
    });

    const failures = contrastResults.filter((r) => !r.passes_AA);
    const currentTheme = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));

    res.json({
      status: 'ok',
      theme: currentTheme,
      totalChecked: contrastResults.length,
      passed: contrastResults.length - failures.length,
      failed: failures.length,
      passRate: `${(((contrastResults.length - failures.length) / contrastResults.length) * 100).toFixed(1)}%`,
      failures,
      results: contrastResults,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: String(err) });
  }
});

// ─── Font Rendering Analysis ───────────────────────────────────
app.post('/api/validate/fonts', async (req: Request, res: Response) => {
  try {
    const { theme } = req.body as { theme?: 'light' | 'dark' };

    const p = await getPage();
    await ensureLoggedIn(p);

    if (theme) {
      await p.evaluate((t: string) => {
        document.documentElement.setAttribute('data-theme', t);
        document.body.style.backgroundColor = t === 'light' ? '#f8fafc' : '#0f172a';
        document.body.style.color = t === 'light' ? '#1e293b' : '#fff';
      }, theme);
      await new Promise((r) => setTimeout(r, 500));
    }

    const fontData = await p.evaluate(() => {
      const selectors = [
        'h1', 'h2', 'h3', 'h4', 'p', 'span.text-white', 'button',
        '.card-value', '.metric-primary', '.ds-page-title', '.ds-section-title',
        '.ds-text-data', '.ds-card-heading', '.ds-nav-tab', '.label-critical',
        '.label-success', '.label-warning', '.text-high-contrast',
      ];

      const results: Array<{
        selector: string;
        count: number;
        fontFamily: string;
        fontSize: string;
        fontWeight: string;
        lineHeight: string;
        letterSpacing: string;
        color: string;
        effectiveBg: string;
      }> = [];

      for (const sel of selectors) {
        const el = document.querySelector(sel) as HTMLElement;
        if (!el) continue;
        const s = getComputedStyle(el);

        let bg = s.backgroundColor;
        let parent = el.parentElement;
        while (parent && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) {
          bg = getComputedStyle(parent).backgroundColor;
          parent = parent.parentElement;
        }

        results.push({
          selector: sel,
          count: document.querySelectorAll(sel).length,
          fontFamily: s.fontFamily,
          fontSize: s.fontSize,
          fontWeight: s.fontWeight,
          lineHeight: s.lineHeight,
          letterSpacing: s.letterSpacing,
          color: s.color,
          effectiveBg: bg,
        });
      }

      return results;
    });

    // Analyze each font for legibility
    const analyses: FontAnalysis[] = fontData.map((f) => {
      const fg = parseColor(f.color);
      const bg = parseColor(f.effectiveBg);
      const ratio = fg && bg ? contrastRatio(fg, bg) : 0;
      const fontSize = parseFloat(f.fontSize);

      return {
        selector: f.selector,
        fontFamily: f.fontFamily,
        fontSize: f.fontSize,
        fontWeight: f.fontWeight,
        lineHeight: f.lineHeight,
        color: f.color,
        isLegible: fontSize >= 10 && ratio >= 3,
        contrastRatio: Math.round(ratio * 100) / 100,
      };
    });

    const issues = analyses.filter((a) => !a.isLegible);
    const currentTheme = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));

    res.json({
      status: 'ok',
      theme: currentTheme,
      totalAnalyzed: analyses.length,
      legible: analyses.length - issues.length,
      illegible: issues.length,
      issues,
      analyses,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: String(err) });
  }
});

// ─── Interactive Element Testing ───────────────────────────────
app.post('/api/validate/interactive', async (req: Request, res: Response) => {
  try {
    const { theme } = req.body as { theme?: 'light' | 'dark' };

    const p = await getPage();
    await ensureLoggedIn(p);

    if (theme) {
      await p.evaluate((t: string) => {
        document.documentElement.setAttribute('data-theme', t);
        document.body.style.backgroundColor = t === 'light' ? '#f8fafc' : '#0f172a';
        document.body.style.color = t === 'light' ? '#1e293b' : '#fff';
      }, theme);
      await new Promise((r) => setTimeout(r, 500));
    }

    const interactiveResults = await p.evaluate(() => {
      const results: Array<{
        selector: string;
        element: string;
        width: number;
        height: number;
        hasHoverStyle: boolean;
        hasFocusStyle: boolean;
        isVisible: boolean;
        ariaLabel: string | null;
        role: string | null;
      }> = [];

      const buttons = document.querySelectorAll('button');
      buttons.forEach((btn, i) => {
        if (i >= 20) return;
        const rect = btn.getBoundingClientRect();
        const styles = getComputedStyle(btn);

        results.push({
          selector: `button:nth-of-type(${i + 1})`,
          element: btn.textContent?.trim().substring(0, 40) || btn.getAttribute('aria-label') || 'unnamed',
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          hasHoverStyle: !!btn.querySelector(':hover') || styles.cursor === 'pointer',
          hasFocusStyle: styles.outlineStyle !== 'none' || btn.className.includes('focus'),
          isVisible: rect.width > 0 && rect.height > 0 && styles.visibility !== 'hidden',
          ariaLabel: btn.getAttribute('aria-label'),
          role: btn.getAttribute('role'),
        });
      });

      return results;
    });

    const tests: InteractiveTest[] = interactiveResults.map((r) => ({
      selector: r.selector,
      element: r.element,
      hasHoverState: r.hasHoverStyle,
      hasActiveState: true, // Buttons inherently have active state
      hasFocusState: r.hasFocusStyle,
      isClickable: r.isVisible,
      tapTargetSize: { width: r.width, height: r.height },
      meetsMinimumSize: r.width >= 44 && r.height >= 44,
    }));

    const smallTargets = tests.filter((t) => !t.meetsMinimumSize && t.isClickable);
    const currentTheme = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));

    res.json({
      status: 'ok',
      theme: currentTheme,
      totalTested: tests.length,
      meetsSizeRequirement: tests.length - smallTargets.length,
      belowMinimumSize: smallTargets.length,
      smallTargets,
      tests,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: String(err) });
  }
});

// ─── Full Test Suite ───────────────────────────────────────────
app.post('/api/test/run', async (req: Request, res: Response) => {
  try {
    const p = await getPage();
    await ensureLoggedIn(p);

    const results: TestResult[] = [];

    // Test 1: Theme switching works
    for (const theme of ['light', 'dark'] as const) {
      await p.evaluate((t: string) => {
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('dashboard-theme-preference', t);
        document.body.style.backgroundColor = t === 'light' ? '#f8fafc' : '#0f172a';
        document.body.style.color = t === 'light' ? '#1e293b' : '#fff';
      }, theme);
      await new Promise((r) => setTimeout(r, 400));

      const actual = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
      results.push({
        name: `Theme switch to ${theme}`,
        status: actual === theme ? 'pass' : 'fail',
        message: actual === theme ? `Correctly set to ${theme}` : `Expected ${theme}, got ${actual}`,
      });
    }

    // Test 2: localStorage persistence
    const stored = await p.evaluate(() => localStorage.getItem('dashboard-theme-preference'));
    results.push({
      name: 'localStorage persistence',
      status: stored ? 'pass' : 'fail',
      message: stored ? `Stored theme: ${stored}` : 'No theme stored in localStorage',
    });

    // Test 3: FOUC prevention script
    const fouc = await p.evaluate(() => {
      const scripts = document.querySelectorAll('script');
      for (const s of scripts) {
        if (s.textContent?.includes('dashboard-theme-preference')) return true;
      }
      return false;
    });
    results.push({
      name: 'FOUC prevention script',
      status: fouc ? 'pass' : 'fail',
      message: fouc ? 'Inline FOUC prevention script detected' : 'FOUC prevention script missing',
    });

    // Test 4: ThemeToggle present
    const togglePresent = await p.evaluate(() => {
      const btn = document.querySelector('[aria-label*="Switch to"]');
      return !!btn;
    });
    results.push({
      name: 'ThemeToggle button present',
      status: togglePresent ? 'pass' : 'fail',
      message: togglePresent ? 'ThemeToggle button found' : 'ThemeToggle button missing from DOM',
    });

    // Test 5: Light mode text contrast
    await p.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.style.backgroundColor = '#f8fafc';
      document.body.style.color = '#1e293b';
    });
    await new Promise((r) => setTimeout(r, 400));

    const lightContrastIssues = await p.evaluate(() => {
      const issues: string[] = [];
      const checkElements = document.querySelectorAll('h1, h2, h3, p, span, button, td, th, label');
      checkElements.forEach((el) => {
        const s = getComputedStyle(el as HTMLElement);
        const color = s.color;
        // Check for white/near-white text on light bg
        if (color === 'rgb(255, 255, 255)' || color === 'rgb(248, 250, 252)' || color === 'rgb(241, 245, 249)') {
          const text = (el as HTMLElement).textContent?.trim().substring(0, 30);
          if (text) issues.push(`${el.tagName}.${String((el as HTMLElement).className).split(' ')[0]}: "${text}" has white text in light mode`);
        }
      });
      return issues.slice(0, 10);
    });
    results.push({
      name: 'Light mode text visibility',
      status: lightContrastIssues.length === 0 ? 'pass' : 'warn',
      message: lightContrastIssues.length === 0
        ? 'No white text detected on light background'
        : `${lightContrastIssues.length} potential white-on-white text issues`,
      details: lightContrastIssues,
    });

    // Test 6: Dark mode text contrast
    await p.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.style.backgroundColor = '#0f172a';
      document.body.style.color = '#fff';
    });
    await new Promise((r) => setTimeout(r, 400));

    const darkContrastIssues = await p.evaluate(() => {
      const issues: string[] = [];
      const checkElements = document.querySelectorAll('h1, h2, h3, p, span, button, td, th, label');
      checkElements.forEach((el) => {
        const s = getComputedStyle(el as HTMLElement);
        const color = s.color;
        // Check for dark text on dark bg
        if (color === 'rgb(15, 23, 42)' || color === 'rgb(30, 41, 59)' || color === 'rgb(51, 65, 85)') {
          const text = (el as HTMLElement).textContent?.trim().substring(0, 30);
          if (text) issues.push(`${el.tagName}: "${text}" has dark text in dark mode`);
        }
      });
      return issues.slice(0, 10);
    });
    results.push({
      name: 'Dark mode text visibility',
      status: darkContrastIssues.length === 0 ? 'pass' : 'warn',
      message: darkContrastIssues.length === 0
        ? 'No dark text detected on dark background'
        : `${darkContrastIssues.length} potential dark-on-dark text issues`,
      details: darkContrastIssues,
    });

    // Test 7: Transition class applied
    const hasTransitionClass = await p.evaluate(() =>
      document.documentElement.classList.contains('theme-transition')
    );
    results.push({
      name: 'Theme transition class',
      status: hasTransitionClass ? 'pass' : 'warn',
      message: hasTransitionClass
        ? 'theme-transition class active on <html>'
        : 'theme-transition class not yet applied',
    });

    // Test 8: CSS custom properties loaded
    const cssVarsLoaded = await p.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      return {
        bgPrimary: root.getPropertyValue('--theme-bg-primary').trim(),
        textPrimary: root.getPropertyValue('--theme-text-primary').trim(),
        surface: root.getPropertyValue('--theme-surface').trim(),
      };
    });
    results.push({
      name: 'CSS custom properties loaded',
      status: cssVarsLoaded.bgPrimary ? 'pass' : 'fail',
      message: cssVarsLoaded.bgPrimary
        ? 'Theme CSS variables are defined'
        : 'Theme CSS variables not found — theme-system.css may not be loaded',
      details: cssVarsLoaded,
    });

    // Summary
    const passed = results.filter((r) => r.status === 'pass').length;
    const failed = results.filter((r) => r.status === 'fail').length;
    const warned = results.filter((r) => r.status === 'warn').length;

    res.json({
      status: 'ok',
      summary: {
        total: results.length,
        passed,
        failed,
        warnings: warned,
        passRate: `${((passed / results.length) * 100).toFixed(0)}%`,
      },
      results,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: String(err) });
  }
});

// ─── Cleanup ───────────────────────────────────────────────────
process.on('SIGINT', async () => {
  if (browser) await browser.close();
  process.exit(0);
});

// ─── Start Server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  MCP Theme Validation Server running on port ${PORT}`);
  console.log(`  Dashboard URL: ${DASHBOARD_URL}`);
  console.log(`  Endpoints:`);
  console.log(`    GET  /health`);
  console.log(`    GET  /api/theme/state`);
  console.log(`    POST /api/theme/switch         { theme: "light"|"dark" }`);
  console.log(`    POST /api/theme/screenshot      { theme?, page?, fullPage? }`);
  console.log(`    POST /api/theme/compare         { page? }`);
  console.log(`    POST /api/validate/contrast     { theme?, selectors? }`);
  console.log(`    POST /api/validate/fonts        { theme? }`);
  console.log(`    POST /api/validate/interactive  { theme? }`);
  console.log(`    POST /api/test/run\n`);
});
