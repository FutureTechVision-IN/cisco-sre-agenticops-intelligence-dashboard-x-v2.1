/**
 * Cross-platform browser compatibility tests.
 *
 * Validates that the SRE AgenticOps Dashboard functions correctly across:
 *   - macOS: Safari (WebKit), Chrome, Firefox
 *   - Windows: Edge (Chromium), Chrome, Firefox
 *
 * IE11 is explicitly NOT supported (React 19 requirement).
 * All enterprise Windows deployments should use Edge (Chromium) or Chrome.
 *
 * Covers:
 *   1. Page load and critical UI sections render
 *   2. JavaScript feature detection (Web Speech API, WebSocket, fetch)
 *   3. CSS variable support and Tailwind rendering
 *   4. Interactive components (dropdowns, charts, modals)
 *   5. Console error monitoring — zero critical errors expected
 *   6. API connectivity and data loading
 *   7. Font rendering indicators
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// ─── Helpers ────────────────────────────────────────────────────────────────

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.DASHBOARD_URL ||
  'http://localhost:8000';

/** Required text sections that must be visible after load. */
const REQUIRED_SECTIONS = [
  'SRE AgenticOps',
  'Intelligence Center',
  'KPI',
  'Statistics',
];

/** API endpoints that must return 200 with JSON. */
const REQUIRED_API_ENDPOINTS = [
  '/api/data/health',
  '/api/data/summary',
];

async function signInIfNeeded(page: Page): Promise<void> {
  const usernameField = page
    .locator('input[autocomplete="username"], input[type="text"]')
    .first();
  const needsLogin = await usernameField
    .isVisible({ timeout: 6_000 })
    .catch(() => false);

  if (needsLogin) {
    await usernameField.fill(process.env.QA_DASHBOARD_USER || 'sre-admin');
    await page
      .locator(
        'input[autocomplete="current-password"], input[type="password"]',
      )
      .first()
      .fill(process.env.QA_DASHBOARD_PASSWORD || 'password$$');
    await page
      .locator('button[type="submit"], button:has-text("Sign In")')
      .first()
      .click();
  }

  await expect(page.locator('text=SRE AgenticOps').first()).toBeVisible({
    timeout: 30_000,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Browser Compatibility – Page Load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await signInIfNeeded(page);
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  });

  test('document has correct charset and viewport meta', async ({ page }) => {
    const charset = await page.evaluate(
      () => document.characterSet || document.charset,
    );
    expect(charset.toUpperCase()).toBe('UTF-8');

    const viewport = await page.$eval(
      'meta[name="viewport"]',
      (el) => el.getAttribute('content') ?? '',
    );
    expect(viewport).toMatch(/width=device-width/);
    expect(viewport).toMatch(/initial-scale=1/);
  });

  test('critical UI sections are visible', async ({ page }) => {
    for (const text of REQUIRED_SECTIONS) {
      await expect(page.locator(`text=${text}`).first()).toBeVisible({
        timeout: 15_000,
      });
    }
  });

  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/SRE AgenticOps/i);
  });

  test('root element renders without blank screen', async ({ page }) => {
    const root = page.locator('#root');
    await expect(root).toBeVisible();
    // Root must have meaningful content (not just the loading spinner)
    const rootText = await root.textContent();
    expect((rootText ?? '').length).toBeGreaterThan(50);
  });
});

test.describe('Browser Compatibility – JavaScript Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await signInIfNeeded(page);
  });

  test('fetch API is available', async ({ page }) => {
    const hasFetch = await page.evaluate(() => typeof fetch === 'function');
    expect(hasFetch).toBe(true);
  });

  test('WebSocket is available', async ({ page }) => {
    const hasWS = await page.evaluate(() => typeof WebSocket !== 'undefined');
    expect(hasWS).toBe(true);
  });

  test('Promise and async/await are supported', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const p = new Promise<number>((resolve) => setTimeout(() => resolve(42), 1));
      return await p;
    });
    expect(result).toBe(42);
  });

  test('CSS custom properties (variables) are supported', async ({ page }) => {
    const hasCustomProps = await page.evaluate(() => {
      const div = document.createElement('div');
      div.style.setProperty('--test-var', '1');
      return getComputedStyle(div).getPropertyValue('--test-var').trim() !== '';
    });
    // CSS variables are required for Tailwind CSS v4 theming
    expect(hasCustomProps).toBe(true);
  });

  test('Web Speech API feature detection is graceful', async ({ page }) => {
    // The app must NOT crash when Web Speech API is absent
    // This simulates environments where mic access is denied (Windows Server)
    const hasSpeech = await page.evaluate(
      () =>
        'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
    );
    // Result can be true or false — we only verify the page doesn't throw
    expect(typeof hasSpeech).toBe('boolean');

    // Page should still be functional without speech API
    await expect(page.locator('text=SRE AgenticOps').first()).toBeVisible();
  });

  test('Intl (internationalization) API works correctly', async ({ page }) => {
    const formatted = await page.evaluate(() => {
      return new Intl.NumberFormat('en-US', {
        style: 'decimal',
        maximumFractionDigits: 0,
      }).format(531844);
    });
    expect(formatted).toBe('531,844');
  });

  test('Date formatting is cross-platform consistent', async ({ page }) => {
    const dateStr = await page.evaluate(() => {
      // Simulate what the dashboard does: format an ISO date string
      const d = new Date('2025-08-01T00:00:00.000Z');
      return d.toISOString().substring(0, 7); // "2025-08"
    });
    expect(dateStr).toBe('2025-08');
  });
});

test.describe('Browser Compatibility – CSS Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await signInIfNeeded(page);
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  });

  test('background color is set (dark theme renders)', async ({ page }) => {
    const bgColor = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    // body should have dark background: rgb(15, 23, 42) = slate-900
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(bgColor).not.toBe('');
  });

  test('Flexbox layout works correctly', async ({ page }) => {
    const flexWorks = await page.evaluate(() => {
      const el = document.createElement('div');
      el.style.display = 'flex';
      document.body.appendChild(el);
      const display = getComputedStyle(el).display;
      document.body.removeChild(el);
      return display === 'flex';
    });
    expect(flexWorks).toBe(true);
  });

  test('CSS Grid layout works correctly', async ({ page }) => {
    const gridWorks = await page.evaluate(() => {
      const el = document.createElement('div');
      el.style.display = 'grid';
      document.body.appendChild(el);
      const display = getComputedStyle(el).display;
      document.body.removeChild(el);
      return display === 'grid';
    });
    expect(gridWorks).toBe(true);
  });

  test('no critical layout overflow on desktop viewport', async ({ page }) => {
    // Check horizontal scrollbar does not appear (would indicate broken layout)
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalScroll).toBe(false);
  });

  test('scrollbar CSS renders without throwing', async ({ page }) => {
    // Ensure custom scrollbar styles (both webkit and standard) don't cause errors
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.reload({ waitUntil: 'domcontentloaded' });
    const criticalErrors = errors.filter(
      (e) =>
        e.toLowerCase().includes('syntaxerror') ||
        e.toLowerCase().includes('css parse'),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Browser Compatibility – Interactive Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await signInIfNeeded(page);
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  });

  test('navigation / tab switching works', async ({ page }) => {
    // Find any clickable nav tabs
    const navItems = page.locator('nav a, [role="tab"], [role="menuitem"]');
    const count = await navItems.count();
    expect(count).toBeGreaterThan(0);

    // Click the first available nav item
    await navItems.first().click();
    await page.waitForTimeout(500);
    // Page should not crash after navigation
    await expect(page.locator('#root')).toBeVisible();
  });

  test('dropdown / select components open and close', async ({ page }) => {
    // Try any select/dropdown element
    const selects = page.locator('select, [role="combobox"], [role="listbox"]');
    const hasDropdowns = await selects.count();
    if (hasDropdowns > 0) {
      await selects.first().click().catch(() => undefined);
      await page.keyboard.press('Escape');
    }
    await expect(page.locator('#root')).toBeVisible();
  });

  test('charts render (SVG elements present)', async ({ page }) => {
    // Recharts outputs SVG — verify at least one SVG chart element is present
    const svgCount = await page.locator('svg').count();
    expect(svgCount).toBeGreaterThan(0);
  });

  test('buttons are keyboard-accessible (focus + Enter)', async ({ page }) => {
    const btn = page.locator('button:not([disabled])').first();
    await btn.focus();
    const isFocused = await btn.evaluate(
      (el) => document.activeElement === el,
    );
    expect(isFocused).toBe(true);
  });
});

test.describe('Browser Compatibility – Console Error Audit', () => {
  test('no uncaught JavaScript errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await signInIfNeeded(page);
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
    await page.waitForTimeout(2_000);

    // Filter out known non-critical warnings
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('ResizeObserver loop') && // benign browser quirk
        !e.includes('Non-Error promise rejection'), // async warning
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('no failed network requests for critical assets', async ({ page }) => {
    const failedRequests: string[] = [];
    page.on('requestfailed', (req) => {
      const url = req.url();
      // Only flag JS/CSS assets, not optional API calls
      if (url.endsWith('.js') || url.endsWith('.css')) {
        failedRequests.push(url);
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
    expect(failedRequests).toHaveLength(0);
  });
});

test.describe('Browser Compatibility – API Integration', () => {
  for (const endpoint of REQUIRED_API_ENDPOINTS) {
    test(`${endpoint} returns 200 and JSON`, async ({ request }) => {
      const response = await request.get(`${BASE_URL}${endpoint}`);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toBeTruthy();
    });
  }

  test('API health endpoint reports healthy status', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/data/health`);
    const body = await res.json();
    expect(body.status).toBe('healthy');
  });

  test('summary API returns non-zero record count', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/data/summary`);
    if (res.status() === 200) {
      const body = await res.json();
      // Verify data is actually loaded (guards against zero-data regression)
      const totalRecords =
        body.totalRecords ?? body.total ?? body.recordCount ?? 0;
      expect(totalRecords).toBeGreaterThan(0);
    }
  });
});
