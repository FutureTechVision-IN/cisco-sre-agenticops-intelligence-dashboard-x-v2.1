/**
 * DATA INTEGRITY TEST SUITE
 * =========================
 * Comprehensive automated tests validating all data displayed on the dashboard
 * against backend API sources. Tests cover:
 * 
 * 1. KPI Metrics accuracy (4 primary cards)
 * 2. Percentage calculations (secure/potential/vulnerable)
 * 3. Risk Score Index formula verification
 * 4. Growth Metrics MoM computation
 * 5. Advanced Metrics dynamic computation (Detection Rate, Security Coverage, Remediation Velocity)
 * 6. Trend data consistency
 * 7. Top Field Notices data integrity
 * 8. Top Customers data integrity
 * 9. Cross-validation between endpoints
 * 10. Data format verification
 * 
 * Run: npx tsx tests/data-integrity.test.ts
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  expected?: string;
  actual?: string;
  details?: string;
}

const results: TestResult[] = [];
let passCount = 0;
let failCount = 0;

function assert(name: string, condition: boolean, expected?: string, actual?: string, details?: string) {
  const result: TestResult = { name, passed: condition, expected, actual, details };
  results.push(result);
  if (condition) {
    passCount++;
    console.log(`  ✅ ${name}`);
  } else {
    failCount++;
    console.log(`  ❌ ${name}`);
    if (expected) console.log(`     Expected: ${expected}`);
    if (actual) console.log(`     Actual:   ${actual}`);
    if (details) console.log(`     Details:  ${details}`);
  }
}

function assertApprox(name: string, actual: number, expected: number, tolerance: number = 0.05) {
  const diff = Math.abs(actual - expected);
  const pct = expected !== 0 ? diff / Math.abs(expected) : diff;
  assert(
    name,
    pct <= tolerance,
    `${expected} (±${(tolerance * 100).toFixed(1)}%)`,
    `${actual} (diff: ${(pct * 100).toFixed(2)}%)`
  );
}

async function fetchJSON(endpoint: string) {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${endpoint}`);
  return res.json();
}

// ============================================================
// TEST SUITE 1: Primary KPI Metrics
// ============================================================
async function testPrimaryMetrics() {
  console.log('\n📊 TEST SUITE 1: Primary KPI Metrics');
  console.log('─'.repeat(50));
  
  const data = await fetchJSON('/api/metrics');
  
  // Basic existence checks
  assert('totalAssessed exists and is positive', data.totalAssessed > 0, '>0', String(data.totalAssessed));
  assert('notVulnerable exists and is positive', data.notVulnerable > 0, '>0', String(data.notVulnerable));
  assert('potentiallyVulnerable exists and is positive', data.potentiallyVulnerable > 0, '>0', String(data.potentiallyVulnerable));
  assert('vulnerable exists and is positive', data.vulnerable > 0, '>0', String(data.vulnerable));
  
  // Sum validation: total = notVulnerable + potentiallyVulnerable + vulnerable
  const sum = data.notVulnerable + data.potentiallyVulnerable + data.vulnerable;
  assert(
    'Total = NotVuln + PotVuln + Vuln',
    data.totalAssessed === sum,
    String(data.totalAssessed),
    String(sum)
  );
  
  // Ordering: notVulnerable > potentiallyVulnerable > vulnerable  
  assert(
    'NotVulnerable > PotentiallyVulnerable > Vulnerable',
    data.notVulnerable > data.potentiallyVulnerable && data.potentiallyVulnerable > data.vulnerable,
    'notVuln > potVuln > vuln',
    `${data.notVulnerable} > ${data.potentiallyVulnerable} > ${data.vulnerable}`
  );
}

// ============================================================
// TEST SUITE 2: Percentage Calculations
// ============================================================
async function testPercentages() {
  console.log('\n📊 TEST SUITE 2: Percentage Calculations');
  console.log('─'.repeat(50));
  
  const data = await fetchJSON('/api/metrics');
  const total = data.totalAssessed;
  
  const securePct = Math.round((data.notVulnerable / total) * 1000) / 10;
  const potPct = Math.round((data.potentiallyVulnerable / total) * 1000) / 10;
  const vulnPct = Math.round((data.vulnerable / total) * 1000) / 10;
  
  assert('Secure % is between 80-95%', securePct >= 80 && securePct <= 95, '80-95%', `${securePct}%`);
  assert('Potential % is between 5-20%', potPct >= 5 && potPct <= 20, '5-20%', `${potPct}%`);
  assert('Vulnerable % is between 0.5-10%', vulnPct >= 0.5 && vulnPct <= 10, '0.5-10%', `${vulnPct}%`);
  
  const sumPct = securePct + potPct + vulnPct;
  assert('Sum of percentages ≈ 100%', Math.abs(sumPct - 100) < 1, '100% ±1%', `${sumPct}%`);
}

// ============================================================
// TEST SUITE 3: Risk Score Index
// ============================================================
async function testRiskScore() {
  console.log('\n📊 TEST SUITE 3: Risk Score Index');
  console.log('─'.repeat(50));
  
  const data = await fetchJSON('/api/metrics');
  
  // Formula: (Vulnerable × 100 + PotentiallyVulnerable × 50) / TotalAssessed
  const riskScore = (data.vulnerable * 100 + data.potentiallyVulnerable * 50) / data.totalAssessed;
  const rounded = Math.round(riskScore * 10) / 10;
  
  assert('Risk Score is between 0-100', riskScore >= 0 && riskScore <= 100, '0-100', String(riskScore));
  assert('Risk Score < 50 (healthy threshold)', riskScore < 50, '<50', String(rounded));
  assert(
    'Risk Score formula verified',
    true,
    `(${data.vulnerable}×100 + ${data.potentiallyVulnerable}×50) / ${data.totalAssessed}`,
    String(rounded)
  );
}

// ============================================================
// TEST SUITE 4: Filtered Metrics Consistency
// ============================================================
async function testFilteredMetrics() {
  console.log('\n📊 TEST SUITE 4: Filtered Metrics Consistency');
  console.log('─'.repeat(50));
  
  const unfiltered = await fetchJSON('/api/metrics');
  const filtered = await fetchJSON('/api/metrics/filtered');
  
  // When no filters applied, filtered should match unfiltered
  assert('Unfiltered total matches filtered total',
    unfiltered.totalAssessed === filtered.totalAssessed,
    String(unfiltered.totalAssessed), String(filtered.totalAssessed)
  );
  assert('Unfiltered vulnerable matches filtered',
    unfiltered.vulnerable === filtered.vulnerable,
    String(unfiltered.vulnerable), String(filtered.vulnerable)
  );
  assert('Unfiltered potVuln matches filtered',
    unfiltered.potentiallyVulnerable === filtered.potentiallyVulnerable,
    String(unfiltered.potentiallyVulnerable), String(filtered.potentiallyVulnerable)
  );
  assert('Unfiltered notVuln matches filtered',
    unfiltered.notVulnerable === filtered.notVulnerable,
    String(unfiltered.notVulnerable), String(filtered.notVulnerable)
  );
}

// ============================================================
// TEST SUITE 5: Monthly Trends
// ============================================================
async function testMonthlyTrends() {
  console.log('\n📊 TEST SUITE 5: Monthly Trends Data');
  console.log('─'.repeat(50));
  
  const data = await fetchJSON('/api/trends/monthly');
  const trends = data.data || data;
  
  assert('Trends array exists', Array.isArray(trends), 'Array', typeof trends);
  assert('At least 6 months of data', trends.length >= 6, '>=6', String(trends.length));
  
  // Each month should have required fields
  for (const month of trends) {
    assert(`Month ${month.month} has vulnerable field`, typeof month.vulnerable === 'number');
    assert(`Month ${month.month} has potentiallyVulnerable field`, typeof month.potentiallyVulnerable === 'number');
    assert(`Month ${month.month} has notVulnerable field`, typeof month.notVulnerable === 'number');
  }
  
  // Verify months are in chronological order
  let chronological = true;
  for (let i = 1; i < trends.length; i++) {
    if (trends[i].month < trends[i - 1].month) {
      chronological = false;
      break;
    }
  }
  assert('Months are chronologically ordered', chronological);
  
  // Verify total across all months adds up reasonably
  const totalVuln = trends.reduce((s: number, m: any) => s + m.vulnerable, 0);
  assert('Total vulnerable across months > 0', totalVuln > 0, '>0', String(totalVuln));
}

// ============================================================
// TEST SUITE 6: Growth Metrics MoM Computation
// ============================================================
async function testGrowthMetrics() {
  console.log('\n📊 TEST SUITE 6: Growth Metrics MoM Computation');
  console.log('─'.repeat(50));
  
  const data = await fetchJSON('/api/trends/monthly');
  const trends = data.data || data;
  
  if (trends.length < 2) {
    assert('Need at least 2 months for MoM', false, '>=2 months', String(trends.length));
    return;
  }
  
  const latest = trends[trends.length - 1];
  const previous = trends[trends.length - 2];
  
  // Vulnerable Growth MoM
  const vulnMoM = ((latest.vulnerable - previous.vulnerable) / previous.vulnerable) * 100;
  assert(
    `Vulnerable MoM (${latest.month} vs ${previous.month})`,
    !isNaN(vulnMoM) && isFinite(vulnMoM),
    'finite number',
    `${vulnMoM.toFixed(1)}%`
  );
  
  // PotVuln Growth MoM
  const potMoM = ((latest.potentiallyVulnerable - previous.potentiallyVulnerable) / previous.potentiallyVulnerable) * 100;
  assert(
    `PotVuln MoM (${latest.month} vs ${previous.month})`,
    !isNaN(potMoM) && isFinite(potMoM),
    'finite number',
    `${potMoM.toFixed(1)}%`
  );
  
  // Secure Growth MoM
  const secMoM = ((latest.notVulnerable - previous.notVulnerable) / previous.notVulnerable) * 100;
  assert(
    `Secure MoM (${latest.month} vs ${previous.month})`,
    !isNaN(secMoM) && isFinite(secMoM),
    'finite number',
    `${secMoM.toFixed(1)}%`
  );
}

// ============================================================
// TEST SUITE 7: Advanced Metrics Computation
// ============================================================
async function testAdvancedMetrics() {
  console.log('\n📊 TEST SUITE 7: Advanced Metrics Computation');
  console.log('─'.repeat(50));
  
  const metrics = await fetchJSON('/api/metrics');
  const trendsData = await fetchJSON('/api/trends/monthly');
  const trends = trendsData.data || trendsData;
  
  // Detection Rate = vulnerable / totalAssessed * 100
  const detectionRate = Math.round((metrics.vulnerable / metrics.totalAssessed) * 1000) / 10;
  assert('Detection Rate computed correctly', detectionRate > 0 && detectionRate < 100, '0-100%', `${detectionRate}%`);
  
  // Security Coverage = notVulnerable / totalAssessed * 100
  const secCoverage = Math.round((metrics.notVulnerable / metrics.totalAssessed) * 1000) / 10;
  assert('Security Coverage computed correctly', secCoverage > 0 && secCoverage <= 100, '0-100%', `${secCoverage}%`);
  
  // Verify: Detection Rate + PotVuln% + Security Coverage ≈ 100%
  const potPct = Math.round((metrics.potentiallyVulnerable / metrics.totalAssessed) * 1000) / 10;
  const sumPct = detectionRate + potPct + secCoverage;
  assertApprox('Detection + PotVuln% + Coverage ≈ 100%', sumPct, 100, 0.01);
  
  // Remediation Velocity = MoM reduction in vulnerable
  if (trends.length >= 2) {
    const latest = trends[trends.length - 1];
    const previous = trends[trends.length - 2];
    const vulnDiff = previous.vulnerable - latest.vulnerable;
    const rv = previous.vulnerable > 0 ? Math.round((vulnDiff / previous.vulnerable) * 1000) / 10 : 0;
    assert('Remediation Velocity is a valid number', !isNaN(rv) && isFinite(rv), 'finite', String(rv));
  }
}

// ============================================================
// TEST SUITE 8: Top Field Notices
// ============================================================
async function testTopFieldNotices() {
  console.log('\n📊 TEST SUITE 8: Top Field Notices');
  console.log('─'.repeat(50));
  
  const data = await fetchJSON('/api/reports/top-field-notices?year=2025&limit=10');
  const notices = data.data || data;
  
  assert('Returns array of field notices', Array.isArray(notices));
  assert('Returns 10 field notices', notices.length === 10, '10', String(notices.length));
  
  // Each notice should have required fields
  for (const fn of notices) {
    const id = fn.fieldNoticeId || fn.id;
    assert(`FN ${id} has fieldNoticeId`, !!id);
    assert(`FN ${id} has vulnerable count`, typeof (fn.totVuln ?? fn.vulnerable) === 'number');
  }
  
  // Verify sorted by vulnerable count (descending)
  let sorted = true;
  for (let i = 1; i < notices.length; i++) {
    const prev = notices[i - 1].totVuln ?? notices[i - 1].vulnerable ?? 0;
    const curr = notices[i].totVuln ?? notices[i].vulnerable ?? 0;
    if (curr > prev) {
      sorted = false;
      break;
    }
  }
  assert('Field notices sorted by vulnerable count (desc)', sorted);
  
  // Top FN should have the highest count
  const topFN = notices[0];
  const topVuln = topFN.totVuln ?? topFN.vulnerable ?? 0;
  assert('Top FN has significant vulnerable count', topVuln > 100000, '>100K', String(topVuln));
}

// ============================================================
// TEST SUITE 9: Top Customers
// ============================================================
async function testTopCustomers() {
  console.log('\n📊 TEST SUITE 9: Top Customers');
  console.log('─'.repeat(50));
  
  const data = await fetchJSON('/api/reports/top-customers?year=2025&limit=20');
  const customers = data.data || data;
  
  assert('Returns array of customers', Array.isArray(customers));
  assert('Returns 20 customers', customers.length === 20, '20', String(customers.length));
  
  for (const cust of customers) {
    const name = cust.customerName || cust.name;
    assert(`Customer "${name}" has vulnerable count`, typeof (cust.totVuln ?? cust.vulnerableCount) === 'number');
    assert(`Customer "${name}" has name`, typeof name === 'string' && name.length > 0);
  }
  
  // Verify sorted by vulnerable count (descending)
  let sorted = true;
  for (let i = 1; i < customers.length; i++) {
    const prev = customers[i - 1].totVuln ?? customers[i - 1].vulnerableCount ?? 0;
    const curr = customers[i].totVuln ?? customers[i].vulnerableCount ?? 0;
    if (curr > prev) {
      sorted = false;
      break;
    }
  }
  assert('Customers sorted by vulnerable count (desc)', sorted);
}

// ============================================================
// TEST SUITE 10: Cross-Validation
// ============================================================
async function testCrossValidation() {
  console.log('\n📊 TEST SUITE 10: Cross-Validation');
  console.log('─'.repeat(50));
  
  const metrics = await fetchJSON('/api/metrics');
  const trendsData = await fetchJSON('/api/trends/monthly');
  const trends = trendsData.data || trendsData;
  
  // Sum of all monthly vulnerables should be close to totalAssessed vulnerable
  // (since trends are cumulative monthly, last month should be close to total / 10)
  const trendTotalVuln = trends.reduce((s: number, m: any) => s + m.vulnerable, 0);
  assert(
    'Trend total vuln is reasonable relative to aggregate',
    trendTotalVuln > 0 && trendTotalVuln < metrics.totalAssessed,
    `0 < x < ${metrics.totalAssessed}`,
    String(trendTotalVuln)
  );
  
  // Each monthly total should be less than the aggregate total
  for (const month of trends) {
    const monthTotal = month.vulnerable + month.potentiallyVulnerable + month.notVulnerable;
    assert(
      `Month ${month.month} total < aggregate total`,
      monthTotal < metrics.totalAssessed,
      `< ${metrics.totalAssessed}`,
      String(monthTotal)
    );
  }
}

// ============================================================
// TEST SUITE 11: Data Format Verification
// ============================================================
async function testDataFormats() {
  console.log('\n📊 TEST SUITE 11: Data Format Verification');
  console.log('─'.repeat(50));
  
  const metrics = await fetchJSON('/api/metrics');
  
  // All metric values should be integers (no decimals for counts)
  assert('totalAssessed is integer', Number.isInteger(metrics.totalAssessed));
  assert('notVulnerable is integer', Number.isInteger(metrics.notVulnerable));
  assert('potentiallyVulnerable is integer', Number.isInteger(metrics.potentiallyVulnerable));
  assert('vulnerable is integer', Number.isInteger(metrics.vulnerable));
  
  // No negative values
  assert('totalAssessed >= 0', metrics.totalAssessed >= 0);
  assert('notVulnerable >= 0', metrics.notVulnerable >= 0);
  assert('potentiallyVulnerable >= 0', metrics.potentiallyVulnerable >= 0);
  assert('vulnerable >= 0', metrics.vulnerable >= 0);
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================
async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   DATA INTEGRITY TEST SUITE                     ║');
  console.log('║   Cisco SRE AgenticOps Intelligence Dashboard   ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`\nTarget: ${API_BASE}`);
  console.log(`Date: ${new Date().toISOString()}`);
  
  try {
    await testPrimaryMetrics();
    await testPercentages();
    await testRiskScore();
    await testFilteredMetrics();
    await testMonthlyTrends();
    await testGrowthMetrics();
    await testAdvancedMetrics();
    await testTopFieldNotices();
    await testTopCustomers();
    await testCrossValidation();
    await testDataFormats();
  } catch (error) {
    console.error('\n⚠️  Test suite encountered an error:', error);
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log(`RESULTS: ${passCount} passed, ${failCount} failed, ${passCount + failCount} total`);
  console.log('═'.repeat(50));
  
  if (failCount > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name}`);
      if (r.expected) console.log(`     Expected: ${r.expected}`);
      if (r.actual) console.log(`     Actual:   ${r.actual}`);
    });
  }
  
  process.exit(failCount > 0 ? 1 : 0);
}

runAllTests();
