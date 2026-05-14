// Light theme rendering checks for SRE AgenticOps Dashboard.
import { test, expect, type Page } from '@playwright/test';
import { setLightTheme } from './helpers/theme';

const baseUrl = process.env.DASHBOARD_URL || 'http://localhost:5173';

const viewports = [
  { name: 'mobile', width: 375, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

const requiredText = [
  'SRE AgenticOps',
  'Intelligence Center',
  'KPI Center',
  'ML Monitor',
  'Statistics',
  'Reports',
  'Records',
  'AI Intelligence Live Feed',
  'Top Concern',
];

async function ensureSignedIn(page: Page) {
  const username = page.locator('input[autocomplete="username"], input[type="text"]').first();
  if (await username.isVisible({ timeout: 3000 }).catch(() => false)) {
    await username.fill(process.env.QA_DASHBOARD_USER || 'sre-admin');
    await page
      .locator('input[autocomplete="current-password"], input[type="password"]')
      .first()
      .fill(process.env.QA_DASHBOARD_PASSWORD || 'password$$');
    await page.locator('button[type="submit"], button:has-text("Sign In")').first().click();
  }

  await page.locator('text=SRE AgenticOps').first().waitFor({ state: 'visible', timeout: 20000 });
}

viewports.forEach((vp) => {
  test.describe(`Light theme render quality - ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test.beforeEach(async ({ page }) => {
      await setLightTheme(page);
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await ensureSignedIn(page);
      await page.evaluate(() => {
        localStorage.setItem('dashboard-theme-preference', 'light');
        document.documentElement.setAttribute('data-theme', 'light');
      });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
    });

    test(`dashboard sections are visible and readable - ${vp.name}`, async ({ page }, testInfo) => {
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('main').first()).toBeVisible();

      for (const text of requiredText) {
        await expect(page.locator(`text=${text}`).first()).toBeVisible();
      }

      const layout = await page.evaluate(() => ({
        theme: document.documentElement.getAttribute('data-theme'),
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyTextLength: document.body.innerText.length,
      }));
      expect(layout.theme).toBe('light');
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 6);
      expect(layout.bodyTextLength).toBeGreaterThan(1000);

      const darkLightModeSurfaces = await page.evaluate(() => {
        const findSurface = (label: string) => {
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
          let current = walker.currentNode as Element | null;
          while (current) {
            if ((current.textContent || '').includes(label)) {
              let candidate: Element | null = current;
              while (candidate && candidate !== document.body) {
                const className = String(candidate.getAttribute('class') || '');
                if (/rounded-|border|shadow|bg-|gradient/.test(className)) return candidate;
                candidate = candidate.parentElement;
              }
            }
            current = walker.nextNode() as Element | null;
          }
          return null;
        };

        return ['AI Intelligence Live Feed', 'Top Concern'].flatMap((label) => {
          const surface = findSurface(label);
          if (!surface) return [`${label}: surface not found`];
          const style = getComputedStyle(surface);
          const paint = `${style.backgroundColor} ${style.backgroundImage}`;
          return /rgb\(30,\s*41,\s*59\)|rgb\(15,\s*23,\s*42\)|rgba\(30,\s*41,\s*59/.test(paint)
            ? [`${label}: dark surface remains in light mode`]
            : [];
        });
      });
      expect(darkLightModeSurfaces).toEqual([]);

      const screenshot = await page.screenshot({ fullPage: true });
      await testInfo.attach(`light-theme-${vp.name}`, {
        body: screenshot,
        contentType: 'image/png',
      });
    });
  });
});
