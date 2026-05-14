/**
 * Cross-platform performance tests.
 *
 * Validates that the dashboard meets minimum performance targets across
 * macOS and Windows environments. Thresholds are intentionally lenient to
 * accommodate CI runners and Windows Server environments which may have
 * slower I/O than developer workstations.
 *
 * Metrics measured:
 *   - Time to First Byte (TTFB)
 *   - DOM Content Loaded time
 *   - Page load time (load event)
 *   - Largest Contentful Paint (LCP) via PerformanceObserver
 *   - Total JS bundle size (sum of script transfer sizes)
 *   - Memory usage (JS heap where available)
 *   - Number of network requests
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.DASHBOARD_URL ||
  'http://localhost:8000';

// Performance budget thresholds
const THRESHOLDS = {
  /** Time from navigation start to load event — 30 s is lenient for 531 K-record data load */
  pageLoadMs: 30_000,
  /** Time to First Byte from server */
  ttfbMs: 3_000,
  /** DOM Content Loaded event */
  dclMs: 15_000,
  /** Maximum total JS transferred (compressed) — 2 MB */
  totalJsKB: 2_048,
  /** Maximum number of HTTP requests on initial page load */
  maxRequests: 60,
  /** JS heap snapshot — 300 MB soft cap */
  jsHeapMB: 300,
};

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
    await expect(page.locator('text=SRE AgenticOps').first()).toBeVisible({
      timeout: 30_000,
    });
  }
}

// ─── Navigation Timing Tests ─────────────────────────────────────────────────

test.describe('Performance – Navigation Timing', () => {
  test('page loads within performance budget', async ({ page }) => {
    const start = Date.now();

    await page.goto(BASE_URL, { waitUntil: 'load', timeout: 45_000 });
    await signInIfNeeded(page);

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(THRESHOLDS.pageLoadMs);
  });

  test('TTFB and DCL timings are within budget', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'load', timeout: 45_000 });

    const timing = await page.evaluate(() => {
      const nav = performance.getEntriesByType(
        'navigation',
      )[0] as PerformanceNavigationTiming;
      if (!nav) return null;
      return {
        ttfb: nav.responseStart - nav.requestStart,
        dcl: nav.domContentLoadedEventEnd - nav.startTime,
        load: nav.loadEventEnd - nav.startTime,
      };
    });

    if (timing) {
      expect(timing.ttfb).toBeLessThan(THRESHOLDS.ttfbMs);
      expect(timing.dcl).toBeLessThan(THRESHOLDS.dclMs);
      expect(timing.load).toBeLessThan(THRESHOLDS.pageLoadMs);
    }
  });
});

// ─── Network Budget Tests ─────────────────────────────────────────────────────

test.describe('Performance – Network Budget', () => {
  test('total JS transfer size is within budget', async ({ page }) => {
    const jsRequests: number[] = [];

    page.on('response', (resp) => {
      const url = resp.url();
      const ct = resp.headers()['content-type'] ?? '';
      if (
        (url.endsWith('.js') || ct.includes('javascript')) &&
        !url.includes('hot-update')
      ) {
        const cl = resp.headers()['content-length'];
        if (cl) jsRequests.push(parseInt(cl, 10));
      }
    });

    await page.goto(BASE_URL, {
      waitUntil: 'networkidle',
      timeout: 45_000,
    });

    const totalKB = jsRequests.reduce((a, b) => a + b, 0) / 1024;
    // Attach the metric for reporting
    console.log(`Total JS transferred: ${totalKB.toFixed(0)} KB`);
    expect(totalKB).toBeLessThan(THRESHOLDS.totalJsKB);
  });

  test('number of network requests is within budget', async ({ page }) => {
    let requestCount = 0;

    page.on('request', (req) => {
      const rt = req.resourceType();
      if (['document', 'script', 'stylesheet', 'image', 'fetch', 'xhr'].includes(rt)) {
        requestCount++;
      }
    });

    await page.goto(BASE_URL, {
      waitUntil: 'networkidle',
      timeout: 45_000,
    });

    console.log(`Total requests on load: ${requestCount}`);
    expect(requestCount).toBeLessThan(THRESHOLDS.maxRequests);
  });
});

// ─── Memory Tests ─────────────────────────────────────────────────────────────

test.describe('Performance – Memory Usage', () => {
  test('JS heap is within soft cap after navigation', async ({ page, browserName }) => {
    // memory API is Chromium-only
    test.skip(browserName !== 'chromium', 'performance.memory is Chromium-only');

    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 45_000 });
    await signInIfNeeded(page);
    await page.waitForTimeout(2_000); // let GC settle

    const heapMB = await page.evaluate(() => {
      const mem = (performance as { memory?: { usedJSHeapSize: number } }).memory;
      return mem ? mem.usedJSHeapSize / 1024 / 1024 : 0;
    });

    console.log(`JS heap used: ${heapMB.toFixed(1)} MB`);
    expect(heapMB).toBeLessThan(THRESHOLDS.jsHeapMB);
  });

  test('heap does not grow unboundedly after repeated tab switches', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'performance.memory is Chromium-only');

    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 45_000 });
    await signInIfNeeded(page);

    const heapBefore = await page.evaluate(
      () =>
        (performance as { memory?: { usedJSHeapSize: number } }).memory
          ?.usedJSHeapSize ?? 0,
    );

    // Simulate 5 tab switch interactions
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    if (tabCount > 1) {
      for (let i = 0; i < 5; i++) {
        await tabs.nth(i % tabCount).click().catch(() => undefined);
        await page.waitForTimeout(300);
      }
    }

    await page.evaluate(() => {
      // Request garbage collection if exposed (only in --expose-gc mode)
      if (typeof (globalThis as { gc?: () => void }).gc === 'function') {
        (globalThis as { gc: () => void }).gc();
      }
    });
    await page.waitForTimeout(1_000);

    const heapAfter = await page.evaluate(
      () =>
        (performance as { memory?: { usedJSHeapSize: number } }).memory
          ?.usedJSHeapSize ?? 0,
    );

    const growthMB = (heapAfter - heapBefore) / 1024 / 1024;
    console.log(`Heap growth after tab switches: ${growthMB.toFixed(1)} MB`);
    // Growth of more than 100 MB after 5 tab switches may indicate a memory leak
    expect(growthMB).toBeLessThan(100);
  });
});

// ─── Largest Contentful Paint ─────────────────────────────────────────────────

test.describe('Performance – Largest Contentful Paint', () => {
  test('LCP is under 5 seconds', async ({ page }) => {
    // Inject LCP observer before navigation
    await page.addInitScript(() => {
      (window as { __lcpTime?: number }).__lcpTime = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          (window as { __lcpTime?: number }).__lcpTime = entry.startTime;
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 45_000 });
    await signInIfNeeded(page);
    await page.waitForTimeout(2_000); // LCP fires late sometimes

    const lcp = await page.evaluate(
      () => (window as { __lcpTime?: number }).__lcpTime ?? 0,
    );

    console.log(`LCP: ${lcp.toFixed(0)} ms`);
    // 5-second LCP budget (lenient for data-heavy SPA with 531 K records)
    if (lcp > 0) {
      expect(lcp).toBeLessThan(5_000);
    }
  });
});

// ─── Windows-specific slow-network simulation ─────────────────────────────────

test.describe('Performance – Slow Network Resilience (3G simulation)', () => {
  test('dashboard renders core sections on simulated slow 3G', async ({
    page,
    browserName,
  }) => {
    // Network throttling is Chromium only via CDP
    test.skip(browserName !== 'chromium', 'Network throttling is Chromium-only');

    const client = await page.context().newCDPSession(page);
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (750 * 1024) / 8, // 750 kbps download
      uploadThroughput: (250 * 1024) / 8,   // 250 kbps upload
      latency: 150,
    });

    await page.goto(BASE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await signInIfNeeded(page);

    // At minimum, the page skeleton must render even on slow networks
    await expect(page.locator('#root')).toBeVisible({ timeout: 30_000 });

    // Restore normal conditions
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0,
    });
  });
});
