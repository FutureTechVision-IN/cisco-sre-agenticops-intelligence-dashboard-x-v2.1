/**
 * Field Notice Statistics Engine — Standalone Test Runner
 * ========================================================
 * Runs comprehensive validation tests without jest dependency issues.
 * Execute: npx tsx tests/run-fn-statistics-tests.ts
 *
 * @version 2.0.0
 */

import {
  computeFNAdvancedAnalytics,
  type RawFieldNotice,
  type FNAdvancedAnalyticsResult,
} from '../frontend/services/fieldNoticeStatisticsEngine';

// ============================================================================
// MINI TEST FRAMEWORK
// ============================================================================

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures: string[] = [];
let currentSuite = '';

function describe(name: string, fn: () => void): void {
  currentSuite = name;
  console.log(`\n  ${name}`);
  fn();
}

function test(name: string, fn: () => void): void {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`    \x1b[32m✓\x1b[0m ${name}`);
  } catch (err: any) {
    failedTests++;
    const msg = `${currentSuite} > ${name}: ${err.message}`;
    failures.push(msg);
    console.log(`    \x1b[31m✗\x1b[0m ${name}`);
    console.log(`      \x1b[31m${err.message}\x1b[0m`);
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`);
    },
    toEqual(expected: any) {
      if (JSON.stringify(actual) !== JSON.stringify(expected))
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toBeDefined() {
      if (actual === undefined) throw new Error(`Expected value to be defined`);
    },
    toBeInstanceOf(cls: any) {
      if (!(actual instanceof cls)) throw new Error(`Expected instance of ${cls.name}`);
    },
    toBeGreaterThan(n: number) {
      if (!(actual > n)) throw new Error(`Expected ${actual} > ${n}`);
    },
    toBeGreaterThanOrEqual(n: number) {
      if (!(actual >= n)) throw new Error(`Expected ${actual} >= ${n}`);
    },
    toBeLessThan(n: number) {
      if (!(actual < n)) throw new Error(`Expected ${actual} < ${n}`);
    },
    toBeLessThanOrEqual(n: number) {
      if (!(actual <= n)) throw new Error(`Expected ${actual} <= ${n}`);
    },
    toBeCloseTo(expected: number, precision: number = 2) {
      const pow = Math.pow(10, -precision);
      if (Math.abs(actual - expected) > pow)
        throw new Error(`Expected ${actual} to be close to ${expected} (precision ${precision})`);
    },
    toHaveLength(n: number) {
      if (actual.length !== n) throw new Error(`Expected length ${n}, got ${actual.length}`);
    },
    toContain(item: any) {
      if (Array.isArray(actual)) {
        if (!actual.includes(item)) throw new Error(`Array does not contain ${item}`);
      } else {
        throw new Error(`Expected array, got ${typeof actual}`);
      }
    },
    toBeTruthy() {
      if (!actual) throw new Error(`Expected truthy, got ${actual}`);
    },
    not: {
      toThrow() {
        // If we get here the value is not a function that threw, so it passes
      },
    },
  };
}

function expectFinite(value: number, context: string): void {
  if (!Number.isFinite(value)) throw new Error(`Expected finite number for ${context}, got ${value}`);
}

function expectInRange(value: number, min: number, max: number, context: string): void {
  if (value < min || value > max) throw new Error(`${context}: ${value} not in [${min}, ${max}]`);
}

function assertNoNaNOrInfinity(obj: unknown, path = ''): void {
  if (obj === null || obj === undefined) return;
  if (typeof obj === 'number') {
    if (!Number.isFinite(obj)) throw new Error(`NaN/Infinity at ${path}: ${obj}`);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => assertNoNaNOrInfinity(item, `${path}[${idx}]`));
    return;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      assertNoNaNOrInfinity(value, path ? `${path}.${key}` : key);
    }
  }
}

// ============================================================================
// TEST FIXTURES
// ============================================================================

const SAMPLE_RAW_DATA: RawFieldNotice[] = [
  { fieldNoticeId: 'FN-001', fnTitle: 'Critical ASR Router Vulnerability', totVuln: 2500000, potVuln: 1800000, notVuln: 15000000, fnType: 'Hardware', firstPublished: '11/15/24 8:00' },
  { fieldNoticeId: 'FN-002', fnTitle: 'Catalyst Switch Memory Leak', totVuln: 1200000, potVuln: 900000, notVuln: 8000000, fnType: 'Hardware', firstPublished: '12/01/24 10:30' },
  { fieldNoticeId: 'FN-003', fnTitle: 'IOS XE Security Patch', totVuln: 800000, potVuln: 600000, notVuln: 5000000, fnType: 'Software', firstPublished: '01/10/25 9:00' },
  { fieldNoticeId: 'FN-004', fnTitle: 'Nexus VXLAN Configuration Issue', totVuln: 350000, potVuln: 250000, notVuln: 3000000, fnType: 'Hardware', firstPublished: '02/05/25 14:00' },
  { fieldNoticeId: 'FN-005', fnTitle: 'ISE Policy Update', totVuln: 150000, potVuln: 100000, notVuln: 2000000, fnType: 'Software', firstPublished: '03/01/25 11:00' },
  { fieldNoticeId: 'FN-006', fnTitle: 'Firepower Threat Defense Bug', totVuln: 50000, potVuln: 30000, notVuln: 1500000, fnType: 'Software', firstPublished: '03/15/25 16:30' },
  { fieldNoticeId: 'FN-007', fnTitle: 'UCS Server BIOS Update', totVuln: 500000, potVuln: 400000, notVuln: 4000000, fnType: 'Hardware', firstPublished: '04/01/25 8:00' },
  { fieldNoticeId: 'FN-008', fnTitle: 'Webex Codec Firmware Issue', totVuln: 25000, potVuln: 15000, notVuln: 500000, fnType: 'Hardware', firstPublished: '04/20/25 12:00' },
  { fieldNoticeId: 'FN-009', fnTitle: 'SD-WAN vEdge Certificate Expiry', totVuln: 75000, potVuln: 50000, notVuln: 1000000, fnType: 'Software', firstPublished: '05/10/25 9:30' },
  { fieldNoticeId: 'FN-010', fnTitle: 'Meraki AP Radio Calibration', totVuln: 200000, potVuln: 150000, notVuln: 2500000, fnType: 'Hardware', firstPublished: '06/01/25 10:00' },
];

const MINIMAL_DATA: RawFieldNotice[] = [
  { fieldNoticeId: 'FN-M1', fnTitle: 'Test FN 1', totVuln: 1000, potVuln: 500, notVuln: 5000, fnType: 'Hardware', firstPublished: '01/01/25 8:00' },
  { fieldNoticeId: 'FN-M2', fnTitle: 'Test FN 2', totVuln: 2000, potVuln: 1000, notVuln: 10000, fnType: 'Software', firstPublished: '02/01/25 8:00' },
  { fieldNoticeId: 'FN-M3', fnTitle: 'Test FN 3', totVuln: 3000, potVuln: 1500, notVuln: 15000, fnType: 'Hardware', firstPublished: '03/01/25 8:00' },
];

const SINGLE_ITEM: RawFieldNotice[] = [
  { fieldNoticeId: 'FN-S1', fnTitle: 'Solo Notice', totVuln: 100000, potVuln: 50000, notVuln: 500000, fnType: 'Hardware', firstPublished: '01/15/25 10:00' },
];

const ZERO_VULN_DATA: RawFieldNotice[] = [
  { fieldNoticeId: 'FN-Z1', fnTitle: 'Zero Vuln 1', totVuln: 0, potVuln: 0, notVuln: 10000, fnType: 'Hardware', firstPublished: '01/01/25 8:00' },
  { fieldNoticeId: 'FN-Z2', fnTitle: 'Zero Vuln 2', totVuln: 0, potVuln: 0, notVuln: 20000, fnType: 'Software', firstPublished: '02/01/25 8:00' },
  { fieldNoticeId: 'FN-Z3', fnTitle: 'Has Vuln', totVuln: 5000, potVuln: 3000, notVuln: 15000, fnType: 'Hardware', firstPublished: '03/01/25 8:00' },
];

const DIRTY_DATA: RawFieldNotice[] = [
  { fieldNoticeId: 'FN-D1', fnTitle: 'Missing Type', totVuln: 1000, potVuln: 500, notVuln: 5000, fnType: '', firstPublished: '01/01/25 8:00' },
  { fieldNoticeId: 'FN-D2', fnTitle: 'Missing Date', totVuln: 2000, potVuln: 1000, notVuln: 10000, fnType: 'Software', firstPublished: '' },
  { fieldNoticeId: '', fnTitle: 'No ID', totVuln: 3000, potVuln: 1500, notVuln: 15000, fnType: 'Hardware', firstPublished: '03/01/25 8:00' },
  { fieldNoticeId: 'FN-D4', fnTitle: 'Negative Values', totVuln: -100, potVuln: -50, notVuln: 5000, fnType: 'Hardware', firstPublished: '04/01/25 8:00' },
];

const UNIFORM_DATA: RawFieldNotice[] = Array.from({ length: 5 }, (_, i) => ({
  fieldNoticeId: `FN-U${i + 1}`, fnTitle: `Uniform ${i + 1}`,
  totVuln: 1000, potVuln: 500, notVuln: 5000,
  fnType: 'Hardware', firstPublished: `${(i + 1).toString().padStart(2, '0')}/01/25 8:00`,
}));

// ============================================================================
// PRE-COMPUTE RESULTS
// ============================================================================

console.log('\n\x1b[1m============================================================\x1b[0m');
console.log('\x1b[1m  FN Statistics Engine — Comprehensive Test Suite v2.0\x1b[0m');
console.log('\x1b[1m============================================================\x1b[0m');

const sampleResult = computeFNAdvancedAnalytics(SAMPLE_RAW_DATA);
const minimalResult = computeFNAdvancedAnalytics(MINIMAL_DATA);
const singleResult = computeFNAdvancedAnalytics(SINGLE_ITEM);
const zeroVulnResult = computeFNAdvancedAnalytics(ZERO_VULN_DATA);
const dirtyResult = computeFNAdvancedAnalytics(DIRTY_DATA);
const uniformResult = computeFNAdvancedAnalytics(UNIFORM_DATA);
const emptyResult = computeFNAdvancedAnalytics([]);

// ============================================================================
// 1. CORE COMPUTATION — STANDARD DATA
// ============================================================================

describe('Core Computation — Standard Data', () => {
  test('should return valid result with all required fields', () => {
    expect(sampleResult).toBeDefined();
    expect(sampleResult.totalFieldNotices).toBe(10);
    expect(sampleResult.profiles).toHaveLength(10);
    expect(sampleResult.processedAt).toBeInstanceOf(Date);
    expect(sampleResult.processingTimeMs).toBeGreaterThan(0);
  });

  test('should compute correct aggregate totals', () => {
    expect(sampleResult.totalVulnerable).toBe(5850000);
    expect(sampleResult.totalPotentiallyVulnerable).toBe(4295000);
    expect(sampleResult.totalNotVulnerable).toBe(42500000);
  });

  test('should compute valid total devices', () => {
    expect(sampleResult.totalDevices).toBe(
      sampleResult.totalVulnerable + sampleResult.totalPotentiallyVulnerable + sampleResult.totalNotVulnerable
    );
    expect(sampleResult.totalDevices).toBeGreaterThan(0);
  });

  test('should compute rates in valid range [0, 1]', () => {
    expectInRange(sampleResult.overallVulnerabilityRate, 0, 1, 'overallVulnerabilityRate');
    expectInRange(sampleResult.overallRemediationRate, 0, 1, 'overallRemediationRate');
  });

  test('should compute risk scores in valid range [0, 10]', () => {
    expectInRange(sampleResult.avgRiskScore, 0, 10, 'avgRiskScore');
    expectInRange(sampleResult.maxRiskScore, 0, 10, 'maxRiskScore');
    expectInRange(sampleResult.medianRiskScore, 0, 10, 'medianRiskScore');
    expect(sampleResult.maxRiskScore).toBeGreaterThanOrEqual(sampleResult.avgRiskScore);
  });

  test('should compute data quality [0, 100]', () => {
    expectInRange(sampleResult.dataQualityScore, 0, 100, 'dataQualityScore');
    expect(sampleResult.dataQualityScore).toBeGreaterThanOrEqual(80);
  });

  test('should compute model confidence [0, 1]', () => {
    expectInRange(sampleResult.modelConfidence, 0, 1, 'modelConfidence');
  });
});

// ============================================================================
// 2. SEVERITY CLASSIFICATION
// ============================================================================

describe('Severity Classification', () => {
  test('all FNs classified into severity buckets', () => {
    const { critical, high, medium, low } = sampleResult.severityCounts;
    expect(critical + high + medium + low).toBe(sampleResult.totalFieldNotices);
  });

  test('severity counts non-negative', () => {
    expect(sampleResult.severityCounts.critical).toBeGreaterThanOrEqual(0);
    expect(sampleResult.severityCounts.high).toBeGreaterThanOrEqual(0);
    expect(sampleResult.severityCounts.medium).toBeGreaterThanOrEqual(0);
    expect(sampleResult.severityCounts.low).toBeGreaterThanOrEqual(0);
  });

  test('type counts: 6 HW, 4 SW', () => {
    expect(sampleResult.typeCounts.hardware).toBe(6);
    expect(sampleResult.typeCounts.software).toBe(4);
  });
});

// ============================================================================
// 3. VULNERABILITY DISTRIBUTION
// ============================================================================

describe('Vulnerability Distribution', () => {
  const d = sampleResult.vulnDistribution;

  test('mean is correct', () => {
    expectFinite(d.mean, 'mean');
    expect(d.mean).toBeCloseTo(585000, -3);
  });

  test('median is positive', () => {
    expectFinite(d.median, 'median');
    expect(d.median).toBeGreaterThan(0);
  });

  test('standard deviation non-negative', () => {
    expect(d.standardDeviation).toBeGreaterThanOrEqual(0);
    expectFinite(d.standardDeviation, 'stddev');
  });

  test('variance = stddev^2', () => {
    expect(d.variance).toBeCloseTo(d.standardDeviation ** 2, -2);
  });

  test('quartiles in order', () => {
    expect(d.q1).toBeLessThanOrEqual(d.median);
    expect(d.q3).toBeGreaterThanOrEqual(d.median);
    expect(d.iqr).toBeCloseTo(d.q3 - d.q1, 0);
  });

  test('percentiles ascending', () => {
    expect(d.p90).toBeLessThanOrEqual(d.p95);
    expect(d.p95).toBeLessThanOrEqual(d.p99);
  });

  test('min <= median <= max', () => {
    expect(d.min).toBeLessThanOrEqual(d.median);
    expect(d.median).toBeLessThanOrEqual(d.max);
  });

  test('CI95 has valid bounds', () => {
    expectFinite(d.confidenceInterval95.lower, 'CI lower');
    expectFinite(d.confidenceInterval95.upper, 'CI upper');
    expect(d.confidenceInterval95.lower).toBeLessThanOrEqual(d.confidenceInterval95.upper);
  });

  test('skewness and kurtosis finite', () => {
    expectFinite(d.skewness, 'skewness');
    expectFinite(d.kurtosis, 'kurtosis');
  });

  test('coefficient of variation finite', () => {
    expectFinite(d.coefficientOfVariation, 'CV');
  });
});

// ============================================================================
// 4. PER-FN PROFILES
// ============================================================================

describe('FN Profiles', () => {
  test('all profiles have finite numeric fields', () => {
    for (const p of sampleResult.profiles) {
      expectFinite(p.totalVulnerable, `${p.id}.totVuln`);
      expectFinite(p.potentiallyVulnerable, `${p.id}.potVuln`);
      expectFinite(p.notVulnerable, `${p.id}.notVuln`);
      expectFinite(p.totalDevices, `${p.id}.totalDevices`);
      expectFinite(p.vulnerabilityRate, `${p.id}.vulnRate`);
      expectFinite(p.remediationRate, `${p.id}.remRate`);
      expectFinite(p.riskScore, `${p.id}.risk`);
      expectFinite(p.percentileRank, `${p.id}.percentile`);
      expectFinite(p.zScore, `${p.id}.zScore`);
      expectFinite(p.ageInDays, `${p.id}.age`);
    }
  });

  test('risk scores in [0, 10]', () => {
    for (const p of sampleResult.profiles) {
      expectInRange(p.riskScore, 0, 10, `${p.id}.risk`);
    }
  });

  test('rates in [0, 1]', () => {
    for (const p of sampleResult.profiles) {
      expectInRange(p.vulnerabilityRate, 0, 1, `${p.id}.vulnRate`);
      expectInRange(p.remediationRate, 0, 1, `${p.id}.remRate`);
    }
  });

  test('totalDevices = totVuln + potVuln + notVuln', () => {
    for (const p of sampleResult.profiles) {
      expect(p.totalDevices).toBe(p.totalVulnerable + p.potentiallyVulnerable + p.notVulnerable);
    }
  });

  test('FN-001 has high risk score (largest outlier)', () => {
    const fn001 = sampleResult.profiles.find(p => p.id === 'FN-001');
    expect(fn001).toBeDefined();
    expect(fn001!.riskScore).toBeGreaterThanOrEqual(5);
  });

  test('valid types and anomaly types', () => {
    const validTypes = ['Software', 'Hardware'];
    const validAnomalyTypes = ['none', 'high-vuln', 'rapid-growth', 'stale', 'zero-remediation'];
    for (const p of sampleResult.profiles) {
      expect(validTypes).toContain(p.type);
      expect(validAnomalyTypes).toContain(p.anomalyType);
    }
  });
});

// ============================================================================
// 5. TREND FORECAST
// ============================================================================

describe('Trend Forecast', () => {
  test('valid direction', () => {
    expect(['RISING', 'FALLING', 'STABLE']).toContain(sampleResult.vulnTrend.direction);
    expect(['RISING', 'FALLING', 'STABLE']).toContain(sampleResult.publishingTrend.direction);
  });

  test('R-squared in [0, 1]', () => {
    expectInRange(sampleResult.vulnTrend.rSquared, 0, 1, 'rSquared');
  });

  test('trend fields finite', () => {
    expectFinite(sampleResult.vulnTrend.slope, 'slope');
    expectInRange(sampleResult.vulnTrend.trendStrength, 0, 1, 'trendStrength');
    expectFinite(sampleResult.vulnTrend.volatility, 'volatility');
    expect(sampleResult.vulnTrend.volatility).toBeGreaterThanOrEqual(0);
  });

  test('confidence band lower <= upper', () => {
    expect(sampleResult.vulnTrend.confidenceBand.lower)
      .toBeLessThanOrEqual(sampleResult.vulnTrend.confidenceBand.upper);
  });

  test('forecast points present', () => {
    expect(sampleResult.vulnTrend.forecastPoints).toBeDefined();
  });
});

// ============================================================================
// 6. CONCENTRATION METRICS
// ============================================================================

describe('Concentration Metrics', () => {
  test('Gini in [0, 1]', () => {
    expectInRange(sampleResult.concentration.giniCoefficient, 0, 1, 'gini');
    expect(sampleResult.concentration.giniCoefficient).toBeGreaterThan(0.3);
  });

  test('HHI in [0, 10000]', () => {
    expectInRange(sampleResult.concentration.herfindahlIndex, 0, 10000, 'HHI');
    expectFinite(sampleResult.concentration.herfindahlIndex, 'HHI');
  });

  test('Pareto ratio in [0, 100]', () => {
    expectInRange(sampleResult.concentration.paretoRatio, 0, 100, 'pareto');
  });

  test('top5 >= top3', () => {
    expectInRange(sampleResult.concentration.top3Share, 0, 100, 'top3');
    expectInRange(sampleResult.concentration.top5Share, 0, 100, 'top5');
    expect(sampleResult.concentration.top5Share)
      .toBeGreaterThanOrEqual(sampleResult.concentration.top3Share);
  });

  test('top3 share reflects concentration', () => {
    expect(sampleResult.concentration.top3Share).toBeGreaterThan(50);
  });
});

// ============================================================================
// 7. CORRELATION MATRIX
// ============================================================================

describe('Correlation Matrix', () => {
  const cm = sampleResult.correlationMatrix;

  test('has dimensions', () => {
    expect(cm.dimensions.length).toBeGreaterThan(0);
  });

  test('matrix is square', () => {
    const n = cm.dimensions.length;
    expect(cm.matrix).toHaveLength(n);
    for (const row of cm.matrix) {
      expect(row).toHaveLength(n);
    }
  });

  test('diagonal is 1.0', () => {
    for (let i = 0; i < cm.matrix.length; i++) {
      expect(cm.matrix[i][i]).toBeCloseTo(1.0, 1);
    }
  });

  test('values in [-1, 1]', () => {
    for (const row of cm.matrix) {
      for (const val of row) {
        expectFinite(val, 'corr');
        expectInRange(val, -1.001, 1.001, 'corr');
      }
    }
  });

  test('matrix is symmetric', () => {
    for (let i = 0; i < cm.matrix.length; i++) {
      for (let j = i + 1; j < cm.matrix.length; j++) {
        expect(cm.matrix[i][j]).toBeCloseTo(cm.matrix[j][i], 5);
      }
    }
  });

  test('significant pairs valid', () => {
    for (const pair of cm.significantPairs) {
      expectFinite(pair.correlation, 'pair.corr');
      expectFinite(pair.pValue, 'pair.pValue');
      expectInRange(pair.pValue, 0, 1, 'pair.pValue');
      expect(['strong', 'moderate', 'weak', 'none']).toContain(pair.significance);
    }
  });
});

// ============================================================================
// 8. ANOMALY DETECTION
// ============================================================================

describe('Anomaly Detection', () => {
  test('valid structure', () => {
    expect(sampleResult.anomalyReport).toBeDefined();
    expect(sampleResult.anomalyReport.totalAnomalies).toBeGreaterThanOrEqual(0);
  });

  test('health score in [0, 100]', () => {
    expectInRange(sampleResult.anomalyReport.overallHealthScore, 0, 100, 'health');
  });

  test('anomalies have valid fields', () => {
    for (const a of sampleResult.anomalyReport.anomalies) {
      expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).toContain(a.severity);
      expectFinite(a.zScore, 'anomaly.zScore');
      expectFinite(a.deviation, 'anomaly.deviation');
      expect(a.fnId).toBeTruthy();
      expect(a.description).toBeTruthy();
    }
  });

  test('FN-001 flagged as anomaly (highest outlier)', () => {
    const fn001 = sampleResult.anomalyReport.anomalies.find(a => a.fnId === 'FN-001');
    expect(fn001).toBeDefined();
  });
});

// ============================================================================
// 9. ROOT CAUSE INSIGHTS
// ============================================================================

describe('Root Cause Insights', () => {
  test('generates insights', () => {
    expect(sampleResult.rootCauseInsights.length).toBeGreaterThan(0);
  });

  test('insights have valid structure', () => {
    for (const ins of sampleResult.rootCauseInsights) {
      expect(ins.category).toBeTruthy();
      expect(ins.description).toBeTruthy();
      expectInRange(ins.confidence, 0, 1, 'confidence');
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(ins.impact);
    }
  });
});

// ============================================================================
// 10. TIME SERIES & CHART DATA
// ============================================================================

describe('Time Series & Chart Data', () => {
  test('vuln by type has entries', () => {
    expect(sampleResult.vulnByTypeSeries.length).toBeGreaterThan(0);
    for (const pt of sampleResult.vulnByTypeSeries) {
      expectFinite(pt.value, 'vulnByType.value');
    }
  });

  test('cumulative series monotonically non-decreasing', () => {
    for (let i = 1; i < sampleResult.vulnCumulativeSeries.length; i++) {
      expect(sampleResult.vulnCumulativeSeries[i].value)
        .toBeGreaterThanOrEqual(sampleResult.vulnCumulativeSeries[i - 1].value);
    }
  });

  test('risk buckets account for all FNs', () => {
    const total = sampleResult.riskDistributionBuckets.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(sampleResult.totalFieldNotices);
  });

  test('scatter data valid', () => {
    for (const pt of sampleResult.ageVsVulnScatter) {
      expectFinite(pt.x, 'scatter.x');
      expectFinite(pt.y, 'scatter.y');
      expectFinite(pt.size, 'scatter.size');
    }
  });

  test('forecast series has predictions', () => {
    expect(sampleResult.forecastSeries.length).toBeGreaterThan(0);
    for (const pt of sampleResult.forecastSeries) {
      expectFinite(pt.predicted, 'forecast.predicted');
      expectFinite(pt.upperBound, 'forecast.upper');
      expectFinite(pt.lowerBound, 'forecast.lower');
      expect(pt.lowerBound).toBeLessThanOrEqual(pt.upperBound);
    }
  });
});

// ============================================================================
// 11. NaN/INFINITY SAFETY — FULL RESULT SCAN
// ============================================================================

describe('NaN/Infinity Safety — Full Result Scan', () => {
  test('standard data: no NaN/Infinity', () => {
    assertNoNaNOrInfinity(sampleResult);
  });

  test('minimal data: no NaN/Infinity', () => {
    assertNoNaNOrInfinity(minimalResult);
  });

  test('single item: no NaN/Infinity', () => {
    assertNoNaNOrInfinity(singleResult);
  });

  test('zero-vuln data: no NaN/Infinity', () => {
    assertNoNaNOrInfinity(zeroVulnResult);
  });

  test('dirty data: no NaN/Infinity', () => {
    assertNoNaNOrInfinity(dirtyResult);
  });

  test('uniform data: no NaN/Infinity', () => {
    assertNoNaNOrInfinity(uniformResult);
  });

  test('empty data: no NaN/Infinity', () => {
    assertNoNaNOrInfinity(emptyResult);
  });
});

// ============================================================================
// 12. EMPTY DATA
// ============================================================================

describe('Edge Case — Empty Data', () => {
  test('returns valid empty result', () => {
    expect(emptyResult.totalFieldNotices).toBe(0);
    expect(emptyResult.totalVulnerable).toBe(0);
    expect(emptyResult.profiles).toHaveLength(0);
    expect(emptyResult.dataQualityScore).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// 13. SINGLE ITEM
// ============================================================================

describe('Edge Case — Single Item', () => {
  test('handles single FN', () => {
    expect(singleResult.totalFieldNotices).toBe(1);
    expect(singleResult.profiles).toHaveLength(1);
  });

  test('stddev = 0 for single item', () => {
    expect(singleResult.vulnDistribution.standardDeviation).toBe(0);
  });

  test('Gini = 0 for single item', () => {
    expect(singleResult.concentration.giniCoefficient).toBe(0);
  });

  test('risk score still valid', () => {
    expectInRange(singleResult.avgRiskScore, 0, 10, 'avgRiskScore');
  });
});

// ============================================================================
// 14. UNIFORM DATA (ZERO VARIANCE)
// ============================================================================

describe('Edge Case — Uniform Data', () => {
  test('stddev = 0', () => {
    expect(uniformResult.vulnDistribution.standardDeviation).toBe(0);
    expect(uniformResult.vulnDistribution.variance).toBe(0);
  });

  test('skewness = 0, kurtosis = 0', () => {
    expect(uniformResult.vulnDistribution.skewness).toBe(0);
    expect(uniformResult.vulnDistribution.kurtosis).toBe(0);
  });

  test('Gini ~ 0 for equal data', () => {
    expect(uniformResult.concentration.giniCoefficient).toBeLessThan(0.01);
  });

  test('z-scores = 0 for all profiles', () => {
    for (const p of uniformResult.profiles) {
      expect(p.zScore).toBe(0);
    }
  });

  test('no anomalies in uniform data', () => {
    expect(uniformResult.anomalyReport.totalAnomalies).toBe(0);
  });
});

// ============================================================================
// 15. ZERO VULNERABILITY DATA
// ============================================================================

describe('Edge Case — Zero Vulnerability Data', () => {
  test('handles zero-vuln entries', () => {
    expect(zeroVulnResult.totalFieldNotices).toBe(3);
    expect(zeroVulnResult.totalVulnerable).toBe(5000);
  });

  test('vulnerability rate valid', () => {
    expectInRange(zeroVulnResult.overallVulnerabilityRate, 0, 1, 'vulnRate');
  });
});

// ============================================================================
// 16. DIRTY/INVALID DATA
// ============================================================================

describe('Edge Case — Dirty/Invalid Data', () => {
  test('handles dirty data without crash', () => {
    expect(dirtyResult).toBeDefined();
    expect(dirtyResult.totalFieldNotices).toBeGreaterThanOrEqual(0);
  });

  test('negative values clamped to 0', () => {
    const fn4 = dirtyResult.profiles.find(p => p.id === 'FN-D4');
    if (fn4) {
      expect(fn4.totalVulnerable).toBeGreaterThanOrEqual(0);
    }
  });

  test('no NaN/Infinity', () => {
    assertNoNaNOrInfinity(dirtyResult);
  });
});

// ============================================================================
// 17. DATE PARSING
// ============================================================================

describe('Date Parsing', () => {
  test('M/D/YY H:MM format parsed correctly', () => {
    for (const p of sampleResult.profiles) {
      expect(p.publishedDate.getFullYear()).toBeGreaterThan(2020);
    }
  });

  test('ISO format parsed correctly', () => {
    const isoData: RawFieldNotice[] = [
      { fieldNoticeId: 'FN-ISO1', fnTitle: 'ISO 1', totVuln: 1000, potVuln: 500, notVuln: 5000, fnType: 'Hardware', firstPublished: '2025-03-15' },
      { fieldNoticeId: 'FN-ISO2', fnTitle: 'ISO 2', totVuln: 2000, potVuln: 1000, notVuln: 10000, fnType: 'Software', firstPublished: '2025-06-01' },
      { fieldNoticeId: 'FN-ISO3', fnTitle: 'ISO 3', totVuln: 3000, potVuln: 1500, notVuln: 15000, fnType: 'Hardware', firstPublished: '2024-12-25' },
    ];
    const isoResult = computeFNAdvancedAnalytics(isoData);
    for (const p of isoResult.profiles) {
      expect(p.publishedDate.getFullYear()).toBeGreaterThanOrEqual(2024);
    }
  });

  test('empty date handled gracefully', () => {
    const noDateData: RawFieldNotice[] = [
      { fieldNoticeId: 'FN-ND1', fnTitle: 'No Date', totVuln: 1000, potVuln: 500, notVuln: 5000, fnType: 'Hardware', firstPublished: '' },
      { fieldNoticeId: 'FN-ND2', fnTitle: 'Has Date', totVuln: 2000, potVuln: 1000, notVuln: 10000, fnType: 'Software', firstPublished: '03/01/25 8:00' },
      { fieldNoticeId: 'FN-ND3', fnTitle: 'No Date 2', totVuln: 3000, potVuln: 1500, notVuln: 15000, fnType: 'Hardware', firstPublished: '' },
    ];
    const noDateResult = computeFNAdvancedAnalytics(noDateData);
    assertNoNaNOrInfinity(noDateResult);
  });
});

// ============================================================================
// 18. DETERMINISM
// ============================================================================

describe('Determinism', () => {
  test('same inputs produce same outputs', () => {
    const r1 = computeFNAdvancedAnalytics(SAMPLE_RAW_DATA);
    const r2 = computeFNAdvancedAnalytics(SAMPLE_RAW_DATA);
    expect(r1.totalVulnerable).toBe(r2.totalVulnerable);
    expect(r1.overallVulnerabilityRate).toBeCloseTo(r2.overallVulnerabilityRate, 10);
    expect(r1.avgRiskScore).toBeCloseTo(r2.avgRiskScore, 10);
    expect(r1.concentration.giniCoefficient).toBeCloseTo(r2.concentration.giniCoefficient, 10);
    expect(r1.concentration.herfindahlIndex).toBeCloseTo(r2.concentration.herfindahlIndex, 10);
  });
});

// ============================================================================
// 19. MATHEMATICAL CORRECTNESS
// ============================================================================

describe('Mathematical Correctness', () => {
  test('HHI matches manual computation', () => {
    // 3 items: 50%, 30%, 20% of total => HHI = 50^2 + 30^2 + 20^2 = 3800
    const hData: RawFieldNotice[] = [
      { fieldNoticeId: 'FN-H1', fnTitle: 'Half', totVuln: 5000, potVuln: 1000, notVuln: 10000, fnType: 'Hardware', firstPublished: '01/01/25 8:00' },
      { fieldNoticeId: 'FN-H2', fnTitle: 'Third', totVuln: 3000, potVuln: 1000, notVuln: 10000, fnType: 'Software', firstPublished: '02/01/25 8:00' },
      { fieldNoticeId: 'FN-H3', fnTitle: 'Fifth', totVuln: 2000, potVuln: 1000, notVuln: 10000, fnType: 'Hardware', firstPublished: '03/01/25 8:00' },
    ];
    const hResult = computeFNAdvancedAnalytics(hData);
    expect(hResult.concentration.herfindahlIndex).toBeCloseTo(3800, -1);
  });

  test('vulnerability rate = totalVuln / totalDevices', () => {
    const expected = sampleResult.totalVulnerable / sampleResult.totalDevices;
    expect(sampleResult.overallVulnerabilityRate).toBeCloseTo(expected, 5);
  });

  test('remediation rate = totalNotVuln / totalDevices', () => {
    const expected = sampleResult.totalNotVulnerable / sampleResult.totalDevices;
    expect(sampleResult.overallRemediationRate).toBeCloseTo(expected, 5);
  });

  test('device totals add up', () => {
    expect(sampleResult.totalDevices).toBe(
      sampleResult.totalVulnerable + sampleResult.totalPotentiallyVulnerable + sampleResult.totalNotVulnerable
    );
  });
});

// ============================================================================
// 20. PERFORMANCE
// ============================================================================

describe('Performance', () => {
  test('10 FNs processed in < 500ms', () => {
    expect(sampleResult.processingTimeMs).toBeLessThan(500);
  });

  test('empty data processed nearly instantly', () => {
    expect(emptyResult.processingTimeMs).toBeLessThan(50);
  });

  test('100 synthetic FNs in < 2000ms', () => {
    const large: RawFieldNotice[] = Array.from({ length: 100 }, (_, i) => ({
      fieldNoticeId: `FN-P${i.toString().padStart(3, '0')}`,
      fnTitle: `Perf Test ${i}`,
      totVuln: Math.floor(Math.random() * 5000000),
      potVuln: Math.floor(Math.random() * 3000000),
      notVuln: Math.floor(Math.random() * 20000000),
      fnType: i % 3 === 0 ? 'Software' : 'Hardware',
      firstPublished: `${(i % 12) + 1}/15/25 10:00`,
    }));
    const largeResult = computeFNAdvancedAnalytics(large);
    expect(largeResult.totalFieldNotices).toBe(100);
    expect(largeResult.processingTimeMs).toBeLessThan(2000);
    assertNoNaNOrInfinity(largeResult);
  });
});

// ============================================================================
// FINAL REPORT
// ============================================================================

console.log('\n\x1b[1m============================================================\x1b[0m');
if (failedTests === 0) {
  console.log(`\x1b[32m\x1b[1m  ALL ${totalTests} TESTS PASSED\x1b[0m`);
} else {
  console.log(`\x1b[31m\x1b[1m  ${failedTests} of ${totalTests} TESTS FAILED\x1b[0m`);
  console.log('\n  Failures:');
  for (const f of failures) {
    console.log(`    \x1b[31m- ${f}\x1b[0m`);
  }
}
console.log(`\x1b[1m============================================================\x1b[0m\n`);

process.exit(failedTests > 0 ? 1 : 0);
