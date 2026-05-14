import type { Page } from '@playwright/test';

/**
 * Force the dashboard into the light theme before any scripts run.
 */
export async function setLightTheme(page: Page) {
  await page.addInitScript(() => {
    // Apply light theme attribute early
    document.documentElement.dataset.theme = 'light';
  });
}
