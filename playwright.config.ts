import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

/**
 * Playwright configuration for cross-platform browser compatibility testing.
 *
 * Browser support matrix:
 *   macOS  : Safari (WebKit), Chrome (Chromium), Firefox
 *   Windows: Edge (Chromium), Chrome (Chromium), Firefox
 *
 * NOTE: Internet Explorer 11 is NOT supported by this dashboard.
 *   React 19 requires a modern JavaScript runtime (ES2015+ with Promises,
 *   fetch, etc.) and does not polyfill IE11. All Cisco enterprise Windows
 *   deployments should use Microsoft Edge (Chromium) as the primary browser.
 *
 * Targets for macOS  : Safari 15+, Chrome 90+, Firefox 90+
 * Targets for Windows: Edge 90+, Chrome 90+, Firefox 90+
 *
 * To run a specific project:
 *   npx playwright test --project=chromium
 *   npx playwright test --project=edge
 *   npx playwright test --project=webkit
 */

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.DASHBOARD_URL ||
  'http://localhost:8000';

export default defineConfig({
  // Where tests live
  testDir: './tests',

  // Match all spec files, including our new cross-platform directory
  testMatch: ['**/*.spec.ts', '**/*.visual.test.ts'],

  // Retry failed tests once in CI to handle flaky network conditions
  retries: process.env.CI ? 2 : 0,

  // Run tests in parallel (disable in CI to conserve resources if needed)
  workers: process.env.CI ? 2 : undefined,

  // Fail fast if a test file is syntactically invalid
  fullyParallel: false,

  // Reporter: HTML report + CI-friendly line reporting
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],

  // Shared settings for all projects
  use: {
    // Base URL so tests can use relative paths
    baseURL: BASE_URL,

    // Collect traces on failure for debugging
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on retry
    video: 'on-first-retry',

    // Standard navigation timeout
    navigationTimeout: 45_000,

    // Action timeout (click, fill, etc.)
    actionTimeout: 15_000,

    // Ignore HTTPS errors from self-signed certs in dev/staging
    ignoreHTTPSErrors: true,

    // Cross-platform locale and timezone to simulate Windows-region enterprise
    locale: 'en-US',
    timezoneId: 'America/New_York',

    // Extra HTTP headers added to every request (mimics enterprise proxy)
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },

  // Global timeout per test (2 minutes for data-heavy dashboard)
  timeout: 120_000,

  // Output directory for test artefacts
  outputDir: path.join('playwright-report', 'test-artifacts'),

  // ─── Browser Projects ───────────────────────────────────────────────────────

  projects: [
    // ── Setup project: authenticate and store session state ─────────────────
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // ── macOS: Safari (WebKit) ───────────────────────────────────────────────
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        // Safari on macOS Ventura / Sonoma
        viewport: { width: 1440, height: 900 },
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      },
      dependencies: ['setup'],
      testIgnore: ['**/windows-server/**'],
    },

    // ── macOS: Chrome ────────────────────────────────────────────────────────
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        channel: 'chromium',
      },
      dependencies: ['setup'],
    },

    // ── macOS / Windows: Firefox ─────────────────────────────────────────────
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1440, height: 900 },
      },
      dependencies: ['setup'],
    },

    // ── Windows: Microsoft Edge (Chromium) ───────────────────────────────────
    {
      name: 'edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        viewport: { width: 1440, height: 900 },
        // Simulate Windows Server 2022 / Windows 11 UA
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      },
      dependencies: ['setup'],
      testIgnore: ['**/macos-only/**'],
    },

    // ── Windows: Chrome ──────────────────────────────────────────────────────
    {
      name: 'chrome-windows',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1440, height: 900 },
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      dependencies: ['setup'],
      testIgnore: ['**/macos-only/**'],
    },

    // ── Mobile: iOS Safari ──────────────────────────────────────────────────
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 14'],
      },
      dependencies: ['setup'],
      testIgnore: ['**/windows-server/**', '**/performance/**'],
    },

    // ── Mobile: Android Chrome ───────────────────────────────────────────────
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 7'],
      },
      dependencies: ['setup'],
      testIgnore: ['**/windows-server/**', '**/performance/**'],
    },
  ],

  // ─── Web server: start production server if not already running ─────────
  webServer: process.env.CI
    ? {
        command: 'node build/index.js',
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 60_000,
        env: {
          NODE_ENV: 'production',
          PORT: '8000',
        },
        stdout: 'pipe',
        stderr: 'pipe',
      }
    : undefined,
});
