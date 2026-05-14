/**
 * Playwright global setup: authenticate once and save browser storage state.
 *
 * This runs before all test projects that list 'setup' as a dependency.
 * The saved auth state (cookies + localStorage) is reused across browsers,
 * avoiding a redundant login on every test run.
 *
 * Usage: add `storageState: 'playwright/.auth/user.json'` to any project that
 * needs to start already authenticated.
 */

import { test as setup, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const AUTH_FILE = path.join('playwright', '.auth', 'user.json');

setup('authenticate', async ({ page }) => {
  // Ensure the .auth directory exists
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  const baseUrl =
    process.env.PLAYWRIGHT_BASE_URL ||
    process.env.DASHBOARD_URL ||
    'http://localhost:8000';

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });

  // Check if a login form is present
  const usernameField = page.locator(
    'input[autocomplete="username"], input[type="text"]',
  ).first();

  const loginRequired = await usernameField
    .isVisible({ timeout: 5_000 })
    .catch(() => false);

  if (loginRequired) {
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

  // Wait for the main dashboard heading to appear
  await expect(
    page.locator('text=SRE AgenticOps').first(),
  ).toBeVisible({ timeout: 30_000 });

  // Persist cookies and localStorage to a file
  await page.context().storageState({ path: AUTH_FILE });
});
