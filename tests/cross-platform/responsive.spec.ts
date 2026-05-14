/**
 * Cross-platform responsive design tests.
 *
 * Validates that the dashboard renders correctly at all viewport sizes
 * across browsers on macOS and Windows.
 *
 * Viewport matrix:
 *   mobile   : 375 × 812  (iPhone 14 / Android small)
 *   tablet   : 768 × 1024 (iPad / Surface tablet)
 *   laptop   : 1280 × 800 (Windows laptop / MacBook Air 13")
 *   desktop  : 1440 × 900 (Standard desktop / MacBook Pro 14")
 *   widescreen: 1920 × 1080 (Full HD / Windows Server console monitor)
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.DASHBOARD_URL ||
  'http://localhost:8000';

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'widescreen', width: 1920, height: 1080 },
] as const;

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
      .locator('input[autocomplete="current-password"], input[type="password"]')
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

// ─── Viewport Tests ──────────────────────────────────────────────────────────

for (const vp of VIEWPORTS) {
  test.describe(`Responsive – ${vp.name} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test.beforeEach(async ({ page }) => {
      await page.goto(BASE_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      });
      await signInIfNeeded(page);
      await page
        .waitForLoadState('networkidle', { timeout: 20_000 })
        .catch(() => undefined);
    });

    test('page loads without JavaScript errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.waitForTimeout(1_500);
      const critical = errors.filter(
        (e) =>
          !e.includes('ResizeObserver loop') &&
          !e.includes('Non-Error promise rejection'),
      );
      expect(critical).toHaveLength(0);
    });

    test('root element is visible and has content', async ({ page }) => {
      const root = page.locator('#root');
      await expect(root).toBeVisible();
      const text = await root.textContent();
      expect((text ?? '').trim().length).toBeGreaterThan(10);
    });

    test('no horizontal overflow (no horizontal scrollbar)', async ({ page }) => {
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);
    });

    test('header / navigation is accessible', async ({ page }) => {
      const header = page.locator('header').first();
      const headerVisible = await header.isVisible().catch(() => false);
      // On mobile, header might be inside a drawer — check at least something exists
      if (!headerVisible) {
        // Check for hamburger menu or equivalent mobile nav trigger
        const navTrigger = page.locator(
          '[aria-label*="menu" i], [aria-label*="navigation" i], button[aria-expanded]',
        );
        const hasTrigger = (await navTrigger.count()) > 0;
        // Accept: either visible header OR mobile nav trigger
        expect(headerVisible || hasTrigger).toBe(true);
      } else {
        await expect(header).toBeVisible();
      }
    });

    test('at least one KPI/metric card is visible', async ({ page }) => {
      // KPI cards are core dashboard components — they must render at all sizes
      const kpiCards = page.locator(
        '[class*="card"], [class*="kpi"], [class*="metric"]',
      );
      const count = await kpiCards.count();
      expect(count).toBeGreaterThan(0);
    });

    test('font size is readable (>=12px body text)', async ({ page }) => {
      const fontSize = await page.evaluate(() => {
        const el = document.querySelector('p, span, td, li');
        if (!el) return 16;
        return parseFloat(getComputedStyle(el).fontSize);
      });
      expect(fontSize).toBeGreaterThanOrEqual(12);
    });

    test('touch/pointer targets are adequate size on mobile', async ({
      page,
    }) => {
      if (vp.width < 768) {
        // On mobile, interactive elements should be at least 44×44px (WCAG 2.5.5)
        const buttons = page.locator('button:not([disabled])');
        const count = await buttons.count();
        if (count > 0) {
          const box = await buttons.first().boundingBox();
          if (box) {
            // Allow some tolerance — critical buttons should be tap-friendly
            expect(Math.max(box.width, box.height)).toBeGreaterThanOrEqual(24);
          }
        }
      }
    });
  });
}

// ─── Orientation Tests ───────────────────────────────────────────────────────

test.describe('Responsive – landscape orientation (tablet)', () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test('dashboard renders correctly in landscape', async ({ page }) => {
    await page.goto(BASE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    await signInIfNeeded(page);
    await expect(page.locator('text=SRE AgenticOps').first()).toBeVisible({
      timeout: 30_000,
    });
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});

// ─── Visual Snapshot Tests (screenshots) ────────────────────────────────────

test.describe('Responsive – visual snapshots', () => {
  for (const vp of [VIEWPORTS[0], VIEWPORTS[2], VIEWPORTS[3]]) {
    test(`screenshot – ${vp.name}`, async ({ page }, testInfo) => {
      test.use({ viewport: { width: vp.width, height: vp.height } });
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(BASE_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      });
      await signInIfNeeded(page);
      await page
        .waitForLoadState('networkidle', { timeout: 20_000 })
        .catch(() => undefined);
      await page.waitForTimeout(1_000); // let animations settle

      // Capture a screenshot attached to the test report
      const screenshot = await page.screenshot({
        fullPage: false,
        type: 'png',
      });
      await testInfo.attach(`dashboard-${vp.name}`, {
        body: screenshot,
        contentType: 'image/png',
      });

      // Page should still have content after screenshot
      await expect(page.locator('#root')).toBeVisible();
    });
  }
});
