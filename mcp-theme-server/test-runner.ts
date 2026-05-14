/**
 * MCP Theme Automated Test Runner
 * =================================
 * Runs the full theme validation test suite against the MCP server,
 * generates a detailed report, and exits with appropriate code.
 *
 * Usage:
 *   npx tsx test-runner.ts [--theme light|dark|both] [--url http://localhost:4100]
 */

const MCP_URL = process.argv.includes('--url')
  ? process.argv[process.argv.indexOf('--url') + 1]
  : 'http://localhost:4100';

const requestedTheme = process.argv.includes('--theme')
  ? process.argv[process.argv.indexOf('--theme') + 1]
  : 'both';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: unknown;
}

interface TestSuiteReport {
  timestamp: string;
  mcpServerUrl: string;
  themes: string[];
  sections: SectionReport[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    passRate: string;
  };
}

interface SectionReport {
  name: string;
  theme: string;
  tests: TestResult[];
}

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

function icon(status: string): string {
  switch (status) {
    case 'pass': return `${COLORS.green}✓${COLORS.reset}`;
    case 'fail': return `${COLORS.red}✗${COLORS.reset}`;
    case 'warn': return `${COLORS.yellow}⚠${COLORS.reset}`;
    default:     return ' ';
  }
}

async function fetchJSON(endpoint: string, method = 'GET', body?: unknown): Promise<unknown> {
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);

  const resp = await fetch(`${MCP_URL}${endpoint}`, options);
  if (!resp.ok) throw new Error(`${method} ${endpoint} → ${resp.status}`);
  return resp.json();
}

async function runSection(name: string, theme: string, endpoint: string, body?: unknown): Promise<SectionReport> {
  const report: SectionReport = { name, theme, tests: [] };

  try {
    const data = await fetchJSON(endpoint, 'POST', { theme, ...body }) as Record<string, unknown>;

    if (endpoint === '/api/test/run') {
      report.tests = (data as { results: TestResult[] }).results;
    } else if (endpoint === '/api/validate/contrast') {
      const d = data as { totalChecked: number; passed: number; failed: number; failures: unknown[] };
      report.tests.push({
        name: `Color contrast (${theme})`,
        status: d.failed > 0 ? 'fail' : 'pass',
        message: `${d.passed}/${d.totalChecked} pass WCAG AA · ${d.failed} failures`,
        details: d.failures,
      });
    } else if (endpoint === '/api/validate/fonts') {
      const d = data as { totalAnalyzed: number; legible: number; illegible: number; issues: unknown[] };
      report.tests.push({
        name: `Font legibility (${theme})`,
        status: d.illegible > 0 ? 'warn' : 'pass',
        message: `${d.legible}/${d.totalAnalyzed} legible · ${d.illegible} issues`,
        details: d.issues,
      });
    } else if (endpoint === '/api/validate/interactive') {
      const d = data as { totalTested: number; meetsSizeRequirement: number; belowMinimumSize: number; smallTargets: unknown[] };
      report.tests.push({
        name: `Tap targets (${theme})`,
        status: d.belowMinimumSize > 5 ? 'warn' : 'pass',
        message: `${d.meetsSizeRequirement}/${d.totalTested} meet 44×44px minimum · ${d.belowMinimumSize} too small`,
        details: d.smallTargets,
      });
    } else if (endpoint === '/api/theme/screenshot') {
      report.tests.push({
        name: `Screenshot capture (${theme})`,
        status: 'pass',
        message: `Screenshot saved: ${(data as { file: string }).file}`,
      });
    }
  } catch (err) {
    report.tests.push({
      name: `${name} (${theme})`,
      status: 'fail',
      message: `Error: ${err}`,
    });
  }

  return report;
}

async function main() {
  console.log(`\n${COLORS.bold}╔════════════════════════════════════════════╗${COLORS.reset}`);
  console.log(`${COLORS.bold}║   MCP Theme Validation Test Runner         ║${COLORS.reset}`);
  console.log(`${COLORS.bold}╚════════════════════════════════════════════╝${COLORS.reset}\n`);
  console.log(`  Server:  ${MCP_URL}`);
  console.log(`  Themes:  ${requestedTheme}\n`);

  // Check health
  try {
    const health = await fetchJSON('/health') as { status: string };
    console.log(`  ${icon('pass')} MCP server healthy (${health.status})\n`);
  } catch {
    console.error(`  ${icon('fail')} Cannot reach MCP server at ${MCP_URL}`);
    console.error(`  Make sure server is running: cd mcp-theme-server && npx tsx server.ts\n`);
    process.exit(1);
  }

  const themes = requestedTheme === 'both' ? ['light', 'dark'] : [requestedTheme];
  const allSections: SectionReport[] = [];

  // 1. Core theme test suite
  console.log(`${COLORS.cyan}─── Core Tests ───${COLORS.reset}`);
  const coreReport = await runSection('Core Tests', 'dark', '/api/test/run');
  allSections.push(coreReport);
  for (const t of coreReport.tests) {
    console.log(`  ${icon(t.status)} ${t.name}: ${t.message}`);
  }
  console.log();

  // 2. Per-theme validation
  for (const theme of themes) {
    console.log(`${COLORS.cyan}─── ${theme.toUpperCase()} Mode Validation ───${COLORS.reset}`);

    // Contrast
    const contrast = await runSection('Color Contrast', theme, '/api/validate/contrast');
    allSections.push(contrast);
    for (const t of contrast.tests) {
      console.log(`  ${icon(t.status)} ${t.name}: ${t.message}`);
    }

    // Fonts
    const fonts = await runSection('Font Legibility', theme, '/api/validate/fonts');
    allSections.push(fonts);
    for (const t of fonts.tests) {
      console.log(`  ${icon(t.status)} ${t.name}: ${t.message}`);
    }

    // Interactive
    const interactive = await runSection('Interactive Elements', theme, '/api/validate/interactive');
    allSections.push(interactive);
    for (const t of interactive.tests) {
      console.log(`  ${icon(t.status)} ${t.name}: ${t.message}`);
    }

    // Screenshot
    const screenshot = await runSection('Screenshot', theme, '/api/theme/screenshot');
    allSections.push(screenshot);
    for (const t of screenshot.tests) {
      console.log(`  ${icon(t.status)} ${t.name}: ${t.message}`);
    }

    console.log();
  }

  // Aggregate
  const allTests = allSections.flatMap((s) => s.tests);
  const passed = allTests.filter((t) => t.status === 'pass').length;
  const failed = allTests.filter((t) => t.status === 'fail').length;
  const warned = allTests.filter((t) => t.status === 'warn').length;

  console.log(`${COLORS.bold}═══ SUMMARY ═══${COLORS.reset}`);
  console.log(`  Total:    ${allTests.length}`);
  console.log(`  ${COLORS.green}Passed:${COLORS.reset}   ${passed}`);
  console.log(`  ${COLORS.red}Failed:${COLORS.reset}   ${failed}`);
  console.log(`  ${COLORS.yellow}Warnings:${COLORS.reset} ${warned}`);
  console.log(`  Pass Rate: ${((passed / allTests.length) * 100).toFixed(0)}%`);
  console.log();

  // Write JSON report
  const report: TestSuiteReport = {
    timestamp: new Date().toISOString(),
    mcpServerUrl: MCP_URL,
    themes,
    sections: allSections,
    summary: {
      total: allTests.length,
      passed, failed, warnings: warned,
      passRate: `${((passed / allTests.length) * 100).toFixed(0)}%`,
    },
  };

  const reportPath = `test-report-${Date.now()}.json`;
  await Bun?.write?.(reportPath, JSON.stringify(report, null, 2)).catch(() => {
    // Fallback for Node
    const { writeFileSync } = require('fs');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
  });
  console.log(`  Report saved: ${reportPath}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(2);
});
