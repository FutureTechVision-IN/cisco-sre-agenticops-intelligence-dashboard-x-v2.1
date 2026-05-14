const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log(`PAGE LOG: ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.log('PAGE ERROR:', err));

  try {
    await page.goto('http://localhost:8000', { waitUntil: 'networkidle' });
    console.log('Loaded main page');
    // Click the Statistics button (text contains 'Statistics')
    await page.click('text=Statistics', { timeout: 5000 });
    console.log('Clicked Statistics');
    // Wait for our mount log to appear in console
    await page.waitForTimeout(2000);
  } catch (err) {
    console.error('E2E error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }

  process.exit(0);
})();
