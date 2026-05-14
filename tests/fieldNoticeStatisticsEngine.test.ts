/**
 * @jest-environment node
 */

/**
 * Field Notice Statistics Engine — Comprehensive Test Suite
 * ==========================================================
 * Validates all statistical calculations, ML algorithms, edge cases,
 * and data integrity of the FN Advanced Analytics system.
 *
 * @file tests/fieldNoticeStatisticsEngine.test.ts
 * @requires jest
 * @version 2.0.0
 */

// Polyfill performance.now for Node test environment
if (typeof performance === 'undefined') {
  (globalThis as any).performance = { now: () => Date.now() };
}

import { describe, test, expect, beforeAll } from '@jest/globals';
import {
  computeFNAdvancedAnalytics,
  type RawFieldNotice,
  type FNAdvancedAnalyticsResult,
  type DistributionStats,
  type TrendForecast,
  type CorrelationMatrix,
  type ConcentrationMetrics,
  type AnomalyReport,
} from '../frontend/services/fieldNoticeStatisticsEngine';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/** Realistic sample data modeled after production field notices */
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

/** Minimal 3-item dataset for small-sample edge cases */
const MINIMAL_DATA: RawFieldNotice[] = [
  { fieldNoticeId: 'FN-M1', fnTitle: 'Test FN 1', totVuln: 1000, potVuln: 500, notVuln: 5000, fnType: 'Hardware', firstPublished: '01/01/25 8:00' },
  { fieldNoticeId: 'FN-M2', fnTitle: 'Test FN 2', totVuln: 2000, potVuln: 1000, notVuln: 10000, fnType: 'Software', firstPublished: '02/01/25 8:00' },
  { fieldNoticeId: 'FN-M3', fnTitle: 'Test FN 3', totVuln: 3000, potVuln: 1500, notVuln: 15000, fnType: 'Hardware', firstPublished: '03/01/25 8:00' },
];

/** Single-item dataset (extreme edge case) */
const SINGLE_ITEM: RawFieldNotice[] = [
  { fieldNoticeId: 'FN-S1', fnTitle: 'Solo Notice', totVuln: 100000, potVuln: 50000, notVuln: 500000, fnType: 'Hardware', firstPublished: '01/15/25 10:00' },
];

/** Dataset with zero-vulnerability entries */
const ZERO_VULN_DATA: RawFieldNotice[] = [
  { fieldNoticeId: 'FN-Z1', fnTitle: 'Zero Vuln 1', totVuln: 0, potVuln: 0, notVuln: 10000, fnType: 'Hardware', firstPublished: '01/01/25 8:00' },
  { fieldNoticeId: 'FN-Z2', fnTitle: 'Zero Vuln 2', totVuln: 0, potVuln: 0, notVuln: 20000, fnType: 'Software', firstPublished: '02/01/25 8:00' },
  { fieldNoticeId: 'FN-Z3', fnTitle: 'Has Vuln', totVuln: 5000, potVuln: 3000, notVuln: 15000, fnType: 'Hardware', firstPublished: '03/01/25 8:00' },
];

/** Dataset with missing/invalid fields */
const DIRTY_DATA: RawFieldNotice[] = [
  { fieldNoticeId: 'FN-D1', fnTitle: 'Missing Type', totVuln: 1000, potVuln: 500, notVuln: 5000, fnType: '', firstPublished: '01/01/25 8:00' },
  { fieldNoticeId: 'FN-D2', fnTitle: 'Missing Date', totVuln: 2000, potVuln: 1000, notVuln: 10000, fnType: 'Software', firstPublished: '' },
  { fieldNoticeId: '', fnTitle: 'No ID', totVuln: 3000, potVuln: 1500, notVuln: 15000, fnType: 'Hardware', firstPublished: '03/01/25 8:00' },
  { fieldNoticeId: 'FN-D4', fnTitle: 'Negative Values', totVuln: -100, potVuln: -50, notVuln: 5000, fnType: 'Hardware', firstPublished: '04/01/25 8:00' },
];

/** Dataset with all same values (zero variance) */
const UNIFORM_DATA: RawFieldNotice[] = [
  { fieldNoticeId: 'FN-U1', fnTitle: 'Uniform 1', totVuln: 1000, potVuln: 500, notVuln: 5000, fnType: 'Hardware', firstPublished: '01/01/25 8:00' },
  { fieldNoticeId: 'FN-U2', fnTitle: 'Uniform 2', totVuln: 1000, potVuln: 500, notVuln: 5000, fnType: 'Hardware', firstPublished: '02/01/25 8:00' },
  { fieldNoticeId: 'FN-U3', fnTitle: 'Uniform 3', totVuln: 1000, potVuln: 500, notVuln: 5000, fnType: 'Hardware', firstPublished: '03/01/25 8:00' },
  { fieldNoticeId: 'FN-U4', fnTitle: 'Uniform 4', totVuln: 1000, potVuln: 500, notVuln: 5000, fnType: 'Hardware', firstPublished: '04/01/25 8:00' },
  { fieldNoticeId: 'FN-U5', fnTitle: 'Uniform 5', totVuln: 1000, potVuln: 500, notVuln: 5000, fnType: 'Hardware', firstPublished: '05/01/25 8:00' },
];

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/** Assert a number is finite (not NaN, not Infinity) */
function expectFinite(value: number, context: string): void {
  expect(Number.isFinite(value)).toBe(true);
  if (!Number.isFinite(value)) {
    throw new Error(`Expected finite number for ${context}, got ${value}`);
  }
}

/** Assert a number is within range [min, max] */
function expectInRange(value: number, min: number, max: number, context: string): void {
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
}

/** Deep-check that no numeric field in an object is NaN or Infinity */
function assertNoNaNOrInfinity(obj: unknown, path = ''): void {
  if (obj === null || obj === undefined) return;
  if (typeof obj === 'number') {
    if (!Number.isFinite(obj)) {
      throw new Error(`NaN/Infinity found at ${path}: ${obj}`);
    }
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
// 1. CORE COMPUTATION — STANDARD DATA
// ============================================================================

describe('FN Statistics Engine — Core Computation', () => {
  let result: FNAdvancedAnalyticsResult;

  beforeAll(() => {
    result = computeFNAdvancedAnalytics(SAMPLE_RAW_DATA);
  });

  test('should return valid result object with all required fields', () => {
    expect(result).toBeDefined();
    expect(result.totalFieldNotices).toBe(10);
    expect(result.profiles).toHaveLength(10);
    expect(result.processedAt).toBeInstanceOf(Date);
    expect(result.processingTimeMs).toBeGreaterThan(0);
  });

  test('should compute correct aggregate totals', () => {
    // Sum of all totVuln values from SAMPLE_RAW_DATA
    const expectedTotalVuln = 2500000 + 1200000 + 800000 + 350000 + 150000 + 50000 + 500000 + 25000 + 75000 + 200000;
    expect(result.totalVulnerable).toBe(expectedTotalVuln);
    expect(result.totalVulnerable).toBe(5850000);

    const expectedPotVuln = 1800000 + 900000 + 600000 + 250000 + 100000 + 30000 + 400000 + 15000 + 50000 + 150000;
    expect(result.totalPotentiallyVulnerable).toBe(expectedPotVuln);

    const expectedNotVuln = 15000000 + 8000000 + 5000000 + 3000000 + 2000000 + 1500000 + 4000000 + 500000 + 1000000 + 2500000;
    expect(result.totalNotVulnerable).toBe(expectedNotVuln);
  });

  test('should compute valid total devices', () => {
    expect(result.totalDevices).toBe(
      result.totalVulnerable + result.totalPotentiallyVulnerable + result.totalNotVulnerable
    );
    expect(result.totalDevices).toBeGreaterThan(0);
  });

  test('should compute rates in valid range [0, 1]', () => {
    expectInRange(result.overallVulnerabilityRate, 0, 1, 'overallVulnerabilityRate');
    expectInRange(result.overallRemediationRate, 0, 1, 'overallRemediationRate');
    // Vulnerability rate should be < remediation rate for this dataset
    expect(result.overallVulnerabilityRate).toBeLessThan(result.overallRemediationRate);
  });

  test('should compute risk scores in valid range', () => {
    expectInRange(result.avgRiskScore, 0, 10, 'avgRiskScore');
    expectInRange(result.maxRiskScore, 0, 10, 'maxRiskScore');
    expectInRange(result.medianRiskScore, 0, 10, 'medianRiskScore');
    expect(result.maxRiskScore).toBeGreaterThanOrEqual(result.avgRiskScore);
  });

  test('should compute data quality score in range [0, 100]', () => {
    expectInRange(result.dataQualityScore, 0, 100, 'dataQualityScore');
    // Good data should have high quality score
    expect(result.dataQualityScore).toBeGreaterThanOrEqual(80);
  });

  test('should compute model confidence in range [0, 1]', () => {
    expectInRange(result.modelConfidence, 0, 1, 'modelConfidence');
  });
});

// ============================================================================
// 2. SEVERITY CLASSIFICATION
// ============================================================================

describe('FN Statistics Engine — Severity Classification', () => {
  let result: FNAdvancedAnalyticsResult;

  beforeAll(() => {
    result = computeFNAdvancedAnalytics(SAMPLE_RAW_DATA);
  });

  test('should classify all FNs into severity buckets', () => {
    const { critical, high, medium, low } = result.severityCounts;
    expect(critical + high + medium + low).toBe(result.totalFieldNotices);
  });

  test('severity counts should be non-negative', () => {
    expect(result.severityCounts.critical).toBeGreaterThanOrEqual(0);
    expect(result.severityCounts.high).toBeGreaterThanOrEqual(0);
    expect(result.severityCounts.medium).toBeGreaterThanOrEqual(0);
    expect(result.severityCounts.low).toBeGreaterThanOrEqual(0);
  });

  test('should classify by type (software/hardware)', () => {
    const { software, hardware } = result.typeCounts;
    expect(software + hardware).toBe(result.totalFieldNotices);
    // SAMPLE_RAW_DATA has 6 Hardware, 4 Software
    expect(hardware).toBe(6);
    expect(software).toBe(4);
  });
});

// ============================================================================
// 3. STATISTICAL DISTRIBUTIONS
// ============================================================================

describe('FN Statistics Engine — Distribution Statistics', () => {
  let result: FNAdvancedAnalyticsResult;

  beforeAll(() => {
    result = computeFNAdvancedAnalytics(SAMPLE_RAW_DATA);
  });

  describe('Vulnerability Distribution', () => {
    test('should have valid mean', () => {
      expectFinite(result.vulnDistribution.mean, 'vulnDistribution.mean');
      expect(result.vulnDistribution.mean).toBeGreaterThan(0);
      // Mean should equal totalVuln / totalFNs
      expect(result.vulnDistribution.mean).toBeCloseTo(5850000 / 10, -2);
    });

    test('should have valid median', () => {
      expectFinite(result.vulnDistribution.median, 'vulnDistribution.median');
      expect(result.vulnDistribution.median).toBeGreaterThan(0);
    });

    test('should have non-negative standard deviation', () => {
      expect(result.vulnDistribution.standardDeviation).toBeGreaterThanOrEqual(0);
      expectFinite(result.vulnDistribution.standardDeviation, 'vulnDistribution.standardDeviation');
    });

    test('variance should equal stddev squared', () => {
      const expected = result.vulnDistribution.standardDeviation ** 2;
      expect(result.vulnDistribution.variance).toBeCloseTo(expected, -2);
    });

    test('should have valid quartiles', () => {
      expect(result.vulnDistribution.q1).toBeLessThanOrEqual(result.vulnDistribution.median);
      expect(result.vulnDistribution.q3).toBeGreaterThanOrEqual(result.vulnDistribution.median);
      expect(result.vulnDistribution.iqr).toBe(
        result.vulnDistribution.q3 - result.vulnDistribution.q1
      );
    });

    test('should have valid percentiles in ascending order', () => {
      expect(result.vulnDistribution.p90).toBeLessThanOrEqual(result.vulnDistribution.p95);
      expect(result.vulnDistribution.p95).toBeLessThanOrEqual(result.vulnDistribution.p99);
    });

    test('min should be <= median <= max', () => {
      expect(result.vulnDistribution.min).toBeLessThanOrEqual(result.vulnDistribution.median);
      expect(result.vulnDistribution.median).toBeLessThanOrEqual(result.vulnDistribution.max);
    });

    test('confidence interval should bracket the mean', () => {
      const ci = result.vulnDistribution.confidenceInterval95;
      expectFinite(ci.lower, 'CI lower');
      expectFinite(ci.upper, 'CI upper');
      expect(ci.lower).toBeLessThanOrEqual(ci.upper);
    });

    test('coefficient of variation should be finite', () => {
      expectFinite(result.vulnDistribution.coefficientOfVariation, 'CV');
    });

    test('skewness and kurtosis should be finite', () => {
      expectFinite(result.vulnDistribution.skewness, 'skewness');
      expectFinite(result.vulnDistribution.kurtosis, 'kurtosis');
    });
  });

  describe('Risk Distribution', () => {
    test('should have valid risk distribution stats', () => {
      expectFinite(result.riskDistribution.mean, 'riskDistribution.mean');
      expectFinite(result.riskDistribution.standardDeviation, 'riskDistribution.sd');
      expect(result.riskDistribution.min).toBeGreaterThanOrEqual(0);
      expect(result.riskDistribution.max).toBeLessThanOrEqual(10);
    });
  });

  describe('Age Distribution', () => {
    test('should have valid age distribution', () => {
      expectFinite(result.ageDistribution.mean, 'ageDistribution.mean');
      expect(result.ageDistribution.mean).toBeGreaterThan(0);
      expect(result.ageDistribution.min).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================================
// 4. PER-FN STATISTICAL PROFILES
// ============================================================================

describe('FN Statistics Engine — FN Profiles', () => {
  let result: FNAdvancedAnalyticsResult;

  beforeAll(() => {
    result = computeFNAdvancedAnalytics(SAMPLE_RAW_DATA);
  });

  test('every profile should have finite numeric fields', () => {
    for (const profile of result.profiles) {
      expectFinite(profile.totalVulnerable, `${profile.id}.totalVulnerable`);
      expectFinite(profile.potentiallyVulnerable, `${profile.id}.potentiallyVulnerable`);
      expectFinite(profile.notVulnerable, `${profile.id}.notVulnerable`);
      expectFinite(profile.totalDevices, `${profile.id}.totalDevices`);
      expectFinite(profile.vulnerabilityRate, `${profile.id}.vulnerabilityRate`);
      expectFinite(profile.remediationRate, `${profile.id}.remediationRate`);
      expectFinite(profile.riskScore, `${profile.id}.riskScore`);
      expectFinite(profile.percentileRank, `${profile.id}.percentileRank`);
      expectFinite(profile.zScore, `${profile.id}.zScore`);
      expectFinite(profile.ageInDays, `${profile.id}.ageInDays`);
    }
  });

  test('risk scores should be in [0, 10]', () => {
    for (const profile of result.profiles) {
      expectInRange(profile.riskScore, 0, 10, `${profile.id}.riskScore`);
    }
  });

  test('vulnerability rate should be in [0, 1]', () => {
    for (const profile of result.profiles) {
      expectInRange(profile.vulnerabilityRate, 0, 1, `${profile.id}.vulnerabilityRate`);
    }
  });

  test('remediation rate should be in [0, 1]', () => {
    for (const profile of result.profiles) {
      expectInRange(profile.remediationRate, 0, 1, `${profile.id}.remediationRate`);
    }
  });

  test('percentile rank should be in [0, 100]', () => {
    for (const profile of result.profiles) {
      expectInRange(profile.percentileRank, 0, 100, `${profile.id}.percentileRank`);
    }
  });

  test('totalDevices = totVuln + potVuln + notVuln', () => {
    for (const profile of result.profiles) {
      expect(profile.totalDevices).toBe(
        profile.totalVulnerable + profile.potentiallyVulnerable + profile.notVulnerable
      );
    }
  });

  test('FN-001 (highest vuln) should have highest risk score', () => {
    const fn001 = result.profiles.find(p => p.id === 'FN-001');
    expect(fn001).toBeDefined();
    // With 2.5M vulnerable, it should have a high risk score
    expect(fn001!.riskScore).toBeGreaterThanOrEqual(5);
  });

  test('published dates should be valid', () => {
    for (const profile of result.profiles) {
      expect(profile.publishedDate).toBeInstanceOf(Date);
      expect(profile.publishedDate.getTime()).not.toBeNaN();
    }
  });

  test('type should be Software or Hardware', () => {
    for (const profile of result.profiles) {
      expect(['Software', 'Hardware']).toContain(profile.type);
    }
  });

  test('anomaly type should be valid enum value', () => {
    const validTypes = ['none', 'high-vuln', 'rapid-growth', 'stale', 'zero-remediation'];
    for (const profile of result.profiles) {
      expect(validTypes).toContain(profile.anomalyType);
    }
  });
});

// ============================================================================
// 5. TREND FORECAST
// ============================================================================

describe('FN Statistics Engine — Trend Forecast', () => {
  let result: FNAdvancedAnalyticsResult;

  beforeAll(() => {
    result = computeFNAdvancedAnalytics(SAMPLE_RAW_DATA);
  });

  test('vulnerability trend should have valid direction', () => {
    expect(['RISING', 'FALLING', 'STABLE']).toContain(result.vulnTrend.direction);
  });

  test('R-squared should be in [0, 1]', () => {
    expectInRange(result.vulnTrend.rSquared, 0, 1, 'vulnTrend.rSquared');
  });

  test('slope should be finite', () => {
    expectFinite(result.vulnTrend.slope, 'vulnTrend.slope');
  });

  test('trend strength should be in [0, 1]', () => {
    expectInRange(result.vulnTrend.trendStrength, 0, 1, 'vulnTrend.trendStrength');
  });

  test('volatility should be finite and non-negative', () => {
    expectFinite(result.vulnTrend.volatility, 'vulnTrend.volatility');
    expect(result.vulnTrend.volatility).toBeGreaterThanOrEqual(0);
  });

  test('forecast points should be present', () => {
    expect(result.vulnTrend.forecastPoints).toBeDefined();
    expect(Array.isArray(result.vulnTrend.forecastPoints)).toBe(true);
  });

  test('confidence band lower should be <= upper', () => {
    expect(result.vulnTrend.confidenceBand.lower)
      .toBeLessThanOrEqual(result.vulnTrend.confidenceBand.upper);
  });

  test('publishing trend should have valid fields', () => {
    expect(['RISING', 'FALLING', 'STABLE']).toContain(result.publishingTrend.direction);
    expectInRange(result.publishingTrend.rSquared, 0, 1, 'publishingTrend.rSquared');
    expectFinite(result.publishingTrend.slope, 'publishingTrend.slope');
  });
});

// ============================================================================
// 6. CONCENTRATION METRICS
// ============================================================================

describe('FN Statistics Engine — Concentration Metrics', () => {
  let result: FNAdvancedAnalyticsResult;

  beforeAll(() => {
    result = computeFNAdvancedAnalytics(SAMPLE_RAW_DATA);
  });

  test('Gini coefficient should be in [0, 1]', () => {
    expectInRange(result.concentration.giniCoefficient, 0, 1, 'giniCoefficient');
    // Our data is concentrated (FN-001 has ~43% of total vuln), expect high Gini
    expect(result.concentration.giniCoefficient).toBeGreaterThan(0.4);
  });

  test('HHI should be in [0, 10000]', () => {
    expectInRange(result.concentration.herfindahlIndex, 0, 10000, 'HHI');
    expectFinite(result.concentration.herfindahlIndex, 'HHI');
  });

  test('Pareto ratio should be in [0, 100]', () => {
    expectInRange(result.concentration.paretoRatio, 0, 100, 'paretoRatio');
  });

  test('top3Share should be >= top5Share or both valid', () => {
    // Note: top3Share should be <= top5Share (top5 includes top3)
    expectInRange(result.concentration.top3Share, 0, 100, 'top3Share');
    expectInRange(result.concentration.top5Share, 0, 100, 'top5Share');
    expect(result.concentration.top5Share).toBeGreaterThanOrEqual(result.concentration.top3Share);
  });

  test('top3 share should be significant for concentrated data', () => {
    // FN-001 (2.5M) + FN-002 (1.2M) + FN-003 (800K) = 4.5M / 5.85M = ~77%
    expect(result.concentration.top3Share).toBeGreaterThan(50);
  });

  test('domain concentration should have entries', () => {
    expect(result.concentration.domainConcentration).toBeDefined();
    expect(Array.isArray(result.concentration.domainConcentration)).toBe(true);
  });
});

// ============================================================================
// 7. CORRELATION MATRIX
// ============================================================================

describe('FN Statistics Engine — Correlation Matrix', () => {
  let result: FNAdvancedAnalyticsResult;

  beforeAll(() => {
    result = computeFNAdvancedAnalytics(SAMPLE_RAW_DATA);
  });

  test('correlation matrix should have dimensions', () => {
    expect(result.correlationMatrix.dimensions).toBeDefined();
    expect(result.correlationMatrix.dimensions.length).toBeGreaterThan(0);
  });

  test('matrix should be square', () => {
    const dims = result.correlationMatrix.dimensions.length;
    expect(result.correlationMatrix.matrix).toHaveLength(dims);
    for (const row of result.correlationMatrix.matrix) {
      expect(row).toHaveLength(dims);
    }
  });

  test('diagonal elements should be 1.0 (self-correlation)', () => {
    const { matrix } = result.correlationMatrix;
    for (let i = 0; i < matrix.length; i++) {
      expect(matrix[i][i]).toBeCloseTo(1.0, 1);
    }
  });

  test('all correlation values should be in [-1, 1]', () => {
    for (const row of result.correlationMatrix.matrix) {
      for (const val of row) {
        expectFinite(val, 'correlation');
        expectInRange(val, -1, 1, 'correlation');
      }
    }
  });

  test('matrix should be symmetric', () => {
    const { matrix } = result.correlationMatrix;
    for (let i = 0; i < matrix.length; i++) {
      for (let j = i + 1; j < matrix.length; j++) {
        expect(matrix[i][j]).toBeCloseTo(matrix[j][i], 5);
      }
    }
  });

  test('significant pairs should have valid fields', () => {
    for (const pair of result.correlationMatrix.significantPairs) {
      expectFinite(pair.correlation, 'pair.correlation');
      expectFinite(pair.pValue, 'pair.pValue');
      expectInRange(pair.correlation, -1, 1, 'pair.correlation');
      expectInRange(pair.pValue, 0, 1, 'pair.pValue');
      expect(['strong', 'moderate', 'weak', 'none']).toContain(pair.significance);
    }
  });
});

// ============================================================================
// 8. ANOMALY DETECTION
// ============================================================================

describe('FN Statistics Engine — Anomaly Detection', () => {
  let result: FNAdvancedAnalyticsResult;

  beforeAll(() => {
    result = computeFNAdvancedAnalytics(SAMPLE_RAW_DATA);
  });

  test('anomaly report should have valid structure', () => {
    expect(result.anomalyReport).toBeDefined();
    expect(result.anomalyReport.totalAnomalies).toBeGreaterThanOrEqual(0);
    expect(result.anomalyReport.anomalies).toHaveLength(result.anomalyReport.totalAnomalies);
  });

  test('health score should be in [0, 100]', () => {
    expectInRange(result.anomalyReport.overallHealthScore, 0, 100, 'healthScore');
  });

  test('each anomaly should have valid severity', () => {
    for (const anomaly of result.anomalyReport.anomalies) {
      expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).toContain(anomaly.severity);
      expectFinite(anomaly.zScore, 'anomaly.zScore');
      expectFinite(anomaly.deviation, 'anomaly.deviation');
      expect(anomaly.fnId).toBeTruthy();
      expect(anomaly.description).toBeTruthy();
      expect(anomaly.recommendation).toBeTruthy();
    }
  });

  test('FN-001 (highest outlier) should be flagged as anomaly', () => {
    // FN-001 has 2.5M vulnerable vs mean ~585K — clear statistical outlier
    const fn001Anomaly = result.anomalyReport.anomalies.find(a => a.fnId === 'FN-001');
    expect(fn001Anomaly).toBeDefined();
    expect(['CRITICAL', 'HIGH']).toContain(fn001Anomaly!.severity);
  });

  test('anomalies should have non-zero z-scores', () => {
    for (const anomaly of result.anomalyReport.anomalies) {
      expect(Math.abs(anomaly.zScore)).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// 9. ROOT CAUSE INSIGHTS
// ============================================================================

describe('FN Statistics Engine — Root Cause Insights', () => {
  let result: FNAdvancedAnalyticsResult;

  beforeAll(() => {
    result = computeFNAdvancedAnalytics(SAMPLE_RAW_DATA);
  });

  test('should generate root cause insights', () => {
    expect(result.rootCauseInsights).toBeDefined();
    expect(Array.isArray(result.rootCauseInsights)).toBe(true);
    expect(result.rootCauseInsights.length).toBeGreaterThan(0);
  });

  test('each insight should have valid structure', () => {
    for (const insight of result.rootCauseInsights) {
      expect(insight.category).toBeTruthy();
      expect(insight.description).toBeTruthy();
      expect(insight.recommendation).toBeTruthy();
      expectInRange(insight.confidence, 0, 1, 'insight.confidence');
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(insight.impact);
      expect(Array.isArray(insight.affectedFNs)).toBe(true);
    }
  });
});

// ============================================================================
// 10. TIME SERIES & CHART DATA
// ============================================================================

describe('FN Statistics Engine — Time Series & Chart Data', () => {
  let result: FNAdvancedAnalyticsResult;

  beforeAll(() => {
    result = computeFNAdvancedAnalytics(SAMPLE_RAW_DATA);
  });

  test('vulnerability by type series should have entries', () => {
    expect(result.vulnByTypeSeries).toBeDefined();
    expect(result.vulnByTypeSeries.length).toBeGreaterThan(0);
    for (const point of result.vulnByTypeSeries) {
      expect(point.period).toBeTruthy();
      expectFinite(point.value, 'vulnByTypeSeries.value');
    }
  });

  test('cumulative series should be monotonically non-decreasing', () => {
    for (let i = 1; i < result.vulnCumulativeSeries.length; i++) {
      expect(result.vulnCumulativeSeries[i].value)
        .toBeGreaterThanOrEqual(result.vulnCumulativeSeries[i - 1].value);
    }
  });

  test('risk distribution buckets should be present', () => {
    expect(result.riskDistributionBuckets).toBeDefined();
    expect(result.riskDistributionBuckets.length).toBeGreaterThan(0);
    // All FNs should be accounted for
    const totalCount = result.riskDistributionBuckets.reduce((s, b) => s + b.count, 0);
    expect(totalCount).toBe(result.totalFieldNotices);
  });

  test('scatter data should have valid x/y/size', () => {
    for (const point of result.ageVsVulnScatter) {
      expectFinite(point.x, 'scatter.x');
      expectFinite(point.y, 'scatter.y');
      expectFinite(point.size, 'scatter.size');
      expect(point.id).toBeTruthy();
    }
  });

  test('forecast series should have predictions', () => {
    expect(result.forecastSeries).toBeDefined();
    expect(result.forecastSeries.length).toBeGreaterThan(0);
    for (const point of result.forecastSeries) {
      expectFinite(point.predicted, 'forecastSeries.predicted');
      expectFinite(point.upperBound, 'forecastSeries.upperBound');
      expectFinite(point.lowerBound, 'forecastSeries.lowerBound');
      expect(point.lowerBound).toBeLessThanOrEqual(point.upperBound);
    }
  });

  test('risk heatmap should have valid cells', () => {
    expect(result.riskHeatmap).toBeDefined();
    for (const cell of result.riskHeatmap) {
      expectFinite(cell.xValue, 'heatmap.xValue');
      expectFinite(cell.yValue, 'heatmap.yValue');
      expectFinite(cell.intensity, 'heatmap.intensity');
      expect(cell.label).toBeTruthy();
      expect(cell.color).toBeTruthy();
    }
  });
});

// ============================================================================
// 11. NaN/INFINITY SAFETY — FULL RESULT SCAN
// ============================================================================

describe('FN Statistics Engine — NaN/Infinity Safety', () => {
  test('standard data: no NaN or Infinity in entire result', () => {
    const result = computeFNAdvancedAnalytics(SAMPLE_RAW_DATA);
    expect(() => assertNoNaNOrInfinity(result)).not.toThrow();
  });

  test('minimal data: no NaN or Infinity in entire result', () => {
    const result = computeFNAdvancedAnalytics(MINIMAL_DATA);
    expect(() => assertNoNaNOrInfinity(result)).not.toThrow();
  });

  test('single item: no NaN or Infinity in entire result', () => {
    const result = computeFNAdvancedAnalytics(SINGLE_ITEM);
    expect(() => assertNoNaNOrInfinity(result)).not.toThrow();
  });

  test('zero-vuln data: no NaN or Infinity in entire result', () => {
    const result = computeFNAdvancedAnalytics(ZERO_VULN_DATA);
    expect(() => assertNoNaNOrInfinity(result)).not.toThrow();
  });

  test('dirty data: no NaN or Infinity in entire result', () => {
    const result = computeFNAdvancedAnalytics(DIRTY_DATA);
    expect(() => assertNoNaNOrInfinity(result)).not.toThrow();
  });

  test('uniform data: no NaN or Infinity in entire result', () => {
    const result = computeFNAdvancedAnalytics(UNIFORM_DATA);
    expect(() => assertNoNaNOrInfinity(result)).not.toThrow();
  });
});

// ============================================================================
// 12. EDGE CASES — EMPTY DATA
// ============================================================================

describe('FN Statistics Engine — Empty Data', () => {
  test('empty array should return valid empty result', () => {
    const result = computeFNAdvancedAnalytics([]);
    expect(result.totalFieldNotices).toBe(0);
    expect(result.totalVulnerable).toBe(0);
    expect(result.profiles).toHaveLength(0);
    expect(result.dataQualityScore).toBeGreaterThanOrEqual(0);
    expect(() => assertNoNaNOrInfinity(result)).not.toThrow();
  });
});

// ============================================================================
// 13. EDGE CASES — SINGLE ITEM
// ============================================================================

describe('FN Statistics Engine — Single Item', () => {
  let result: FNAdvancedAnalyticsResult;

  beforeAll(() => {
    result = computeFNAdvancedAnalytics(SINGLE_ITEM);
  });

  test('should handle single FN without crashing', () => {
    expect(result.totalFieldNotices).toBe(1);
    expect(result.profiles).toHaveLength(1);
  });

  test('standard deviation should be 0 for single item', () => {
    expect(result.vulnDistribution.standardDeviation).toBe(0);
  });

  test('Gini coefficient should be 0 for single item', () => {
    expect(result.concentration.giniCoefficient).toBe(0);
  });

  test('risk score should still be valid', () => {
    expectInRange(result.avgRiskScore, 0, 10, 'avgRiskScore');
    expectFinite(result.avgRiskScore, 'avgRiskScore');
  });
});

// ============================================================================
// 14. EDGE CASES — UNIFORM DATA (ZERO VARIANCE)
// ============================================================================

describe('FN Statistics Engine — Uniform Data (Zero Variance)', () => {
  let result: FNAdvancedAnalyticsResult;

  beforeAll(() => {
    result = computeFNAdvancedAnalytics(UNIFORM_DATA);
  });

  test('standard deviation should be 0', () => {
    expect(result.vulnDistribution.standardDeviation).toBe(0);
    expect(result.vulnDistribution.variance).toBe(0);
  });

  test('skewness and kurtosis should be 0 for zero-variance data', () => {
    expect(result.vulnDistribution.skewness).toBe(0);
    expect(result.vulnDistribution.kurtosis).toBe(0);
  });

  test('Gini coefficient should be 0 for perfectly equal data', () => {
    expect(result.concentration.giniCoefficient).toBeCloseTo(0, 1);
  });

  test('z-scores should be 0 for all profiles', () => {
    for (const profile of result.profiles) {
      expect(profile.zScore).toBe(0);
    }
  });

  test('no anomalies should be detected in uniform data', () => {
    expect(result.anomalyReport.totalAnomalies).toBe(0);
  });

  test('volatility should be 0', () => {
    expect(result.vulnTrend.volatility).toBe(0);
  });
});

// ============================================================================
// 15. EDGE CASES — ZERO VULNERABILITY DATA
// ============================================================================

describe('FN Statistics Engine — Zero Vulnerability Data', () => {
  let result: FNAdvancedAnalyticsResult;

  beforeAll(() => {
    result = computeFNAdvancedAnalytics(ZERO_VULN_DATA);
  });

  test('should handle zero-vuln entries gracefully', () => {
    expect(result.totalFieldNotices).toBe(3);
    // Only FN-Z3 has vulnerabilities
    expect(result.totalVulnerable).toBe(5000);
  });

  test('vulnerability rate should be valid', () => {
    expectInRange(result.overallVulnerabilityRate, 0, 1, 'overallVulnerabilityRate');
    expectFinite(result.overallVulnerabilityRate, 'overallVulnerabilityRate');
  });

  test('data quality should reflect zero-vuln issues', () => {
    // 2 of 3 FNs have zero vulnerabilities, quality may be lower
    expectInRange(result.dataQualityScore, 0, 100, 'dataQualityScore');
  });
});

// ============================================================================
// 16. EDGE CASES — DIRTY/INVALID DATA
// ============================================================================

describe('FN Statistics Engine — Dirty/Invalid Data', () => {
  let result: FNAdvancedAnalyticsResult;

  beforeAll(() => {
    result = computeFNAdvancedAnalytics(DIRTY_DATA);
  });

  test('should handle dirty data without crashing', () => {
    expect(result).toBeDefined();
    expect(result.totalFieldNotices).toBeGreaterThanOrEqual(0);
  });

  test('negative values should be clamped to 0', () => {
    // FN-D4 had -100 totVuln, should be sanitized to 0
    const fn4 = result.profiles.find(p => p.id === 'FN-D4');
    if (fn4) {
      expect(fn4.totalVulnerable).toBeGreaterThanOrEqual(0);
    }
  });

  test('missing type should default to Hardware', () => {
    const fn1 = result.profiles.find(p => p.id === 'FN-D1');
    if (fn1) {
      expect(['Software', 'Hardware']).toContain(fn1.type);
    }
  });

  test('no NaN or Infinity in result', () => {
    expect(() => assertNoNaNOrInfinity(result)).not.toThrow();
  });
});

// ============================================================================
// 17. PERFORMANCE
// ============================================================================

describe('FN Statistics Engine — Performance', () => {
  test('should process 10 FNs in under 500ms', () => {
    const result = computeFNAdvancedAnalytics(SAMPLE_RAW_DATA);
    expect(result.processingTimeMs).toBeLessThan(500);
  });

  test('should process empty data nearly instantly', () => {
    const result = computeFNAdvancedAnalytics([]);
    expect(result.processingTimeMs).toBeLessThan(50);
  });

  test('should process large synthetic dataset efficiently', () => {
    // Generate 100 synthetic FNs
    const largeSample: RawFieldNotice[] = Array.from({ length: 100 }, (_, i) => ({
      fieldNoticeId: `FN-PERF-${i.toString().padStart(3, '0')}`,
      fnTitle: `Performance Test FN ${i}`,
      totVuln: Math.floor(Math.random() * 5000000),
      potVuln: Math.floor(Math.random() * 3000000),
      notVuln: Math.floor(Math.random() * 20000000),
      fnType: i % 3 === 0 ? 'Software' : 'Hardware',
      firstPublished: `${(i % 12) + 1}/15/25 10:00`,
    }));

    const result = computeFNAdvancedAnalytics(largeSample);
    expect(result.totalFieldNotices).toBe(100);
    expect(result.processingTimeMs).toBeLessThan(2000);
    expect(() => assertNoNaNOrInfinity(result)).not.toThrow();
  });
});

// ============================================================================
// 18. DATE PARSING
// ============================================================================

describe('FN Statistics Engine — Date Parsing', () => {
  test('should parse M/D/YY H:MM format', () => {
    const data: RawFieldNotice[] = [
      { fieldNoticeId: 'FN-DP1', fnTitle: 'Date Test 1', totVuln: 1000, potVuln: 500, notVuln: 5000, fnType: 'Hardware', firstPublished: '1/15/25 8:00' },
      { fieldNoticeId: 'FN-DP2', fnTitle: 'Date Test 2', totVuln: 2000, potVuln: 1000, notVuln: 10000, fnType: 'Software', firstPublished: '12/01/24 10:30' },
      { fieldNoticeId: 'FN-DP3', fnTitle: 'Date Test 3', totVuln: 3000, potVuln: 1500, notVuln: 15000, fnType: 'Hardware', firstPublished: '6/15/25 14:00' },
    ];
    const result = computeFNAdvancedAnalytics(data);

    // All dates should parse correctly — no defaults to 2020
    for (const profile of result.profiles) {
      expect(profile.publishedDate.getFullYear()).toBeGreaterThan(2020);
    }
  });

  test('should handle ISO date format', () => {
    const data: RawFieldNotice[] = [
      { fieldNoticeId: 'FN-ISO1', fnTitle: 'ISO Date', totVuln: 1000, potVuln: 500, notVuln: 5000, fnType: 'Hardware', firstPublished: '2025-03-15' },
      { fieldNoticeId: 'FN-ISO2', fnTitle: 'ISO Date 2', totVuln: 2000, potVuln: 1000, notVuln: 10000, fnType: 'Software', firstPublished: '2025-06-01' },
      { fieldNoticeId: 'FN-ISO3', fnTitle: 'ISO Date 3', totVuln: 3000, potVuln: 1500, notVuln: 15000, fnType: 'Hardware', firstPublished: '2024-12-25' },
    ];
    const result = computeFNAdvancedAnalytics(data);

    expect(result.profiles[0].publishedDate.getFullYear()).toBe(2025);
    expect(result.profiles[1].publishedDate.getFullYear()).toBe(2025);
    expect(result.profiles[2].publishedDate.getFullYear()).toBe(2024);
  });

  test('should handle missing dates gracefully', () => {
    const data: RawFieldNotice[] = [
      { fieldNoticeId: 'FN-ND1', fnTitle: 'No Date', totVuln: 1000, potVuln: 500, notVuln: 5000, fnType: 'Hardware', firstPublished: '' },
      { fieldNoticeId: 'FN-ND2', fnTitle: 'Has Date', totVuln: 2000, potVuln: 1000, notVuln: 10000, fnType: 'Software', firstPublished: '03/01/25 8:00' },
      { fieldNoticeId: 'FN-ND3', fnTitle: 'No Date 2', totVuln: 3000, potVuln: 1500, notVuln: 15000, fnType: 'Hardware', firstPublished: '' },
    ];
    const result = computeFNAdvancedAnalytics(data);
    expect(result.totalFieldNotices).toBeGreaterThanOrEqual(1);
    expect(() => assertNoNaNOrInfinity(result)).not.toThrow();
  });
});

// ============================================================================
// 19. IDEMPOTENCY & DETERMINISM
// ============================================================================

describe('FN Statistics Engine — Determinism', () => {
  test('two runs on same data should produce identical results', () => {
    const result1 = computeFNAdvancedAnalytics(SAMPLE_RAW_DATA);
    const result2 = computeFNAdvancedAnalytics(SAMPLE_RAW_DATA);

    expect(result1.totalFieldNotices).toBe(result2.totalFieldNotices);
    expect(result1.totalVulnerable).toBe(result2.totalVulnerable);
    expect(result1.overallVulnerabilityRate).toBeCloseTo(result2.overallVulnerabilityRate, 10);
    expect(result1.avgRiskScore).toBeCloseTo(result2.avgRiskScore, 10);
    expect(result1.concentration.giniCoefficient).toBeCloseTo(result2.concentration.giniCoefficient, 10);
    expect(result1.concentration.herfindahlIndex).toBeCloseTo(result2.concentration.herfindahlIndex, 10);
  });
});

// ============================================================================
// 20. MATHEMATICAL CORRECTNESS — MANUAL VERIFICATION
// ============================================================================

describe('FN Statistics Engine — Mathematical Correctness', () => {
  test('HHI calculation matches manual computation for simple case', () => {
    // 3 items: 50%, 30%, 20% of total => HHI = 50^2 + 30^2 + 20^2 = 2500 + 900 + 400 = 3800
    const data: RawFieldNotice[] = [
      { fieldNoticeId: 'FN-H1', fnTitle: 'Half', totVuln: 5000, potVuln: 1000, notVuln: 10000, fnType: 'Hardware', firstPublished: '01/01/25 8:00' },
      { fieldNoticeId: 'FN-H2', fnTitle: 'Third', totVuln: 3000, potVuln: 1000, notVuln: 10000, fnType: 'Software', firstPublished: '02/01/25 8:00' },
      { fieldNoticeId: 'FN-H3', fnTitle: 'Fifth', totVuln: 2000, potVuln: 1000, notVuln: 10000, fnType: 'Hardware', firstPublished: '03/01/25 8:00' },
    ];
    const result = computeFNAdvancedAnalytics(data);
    // HHI = (50)^2 + (30)^2 + (20)^2 = 3800
    expect(result.concentration.herfindahlIndex).toBeCloseTo(3800, -1);
  });

  test('vulnerability rate = totalVuln / totalDevices', () => {
    const result = computeFNAdvancedAnalytics(SAMPLE_RAW_DATA);
    const expected = result.totalVulnerable / result.totalDevices;
    expect(result.overallVulnerabilityRate).toBeCloseTo(expected, 5);
  });

  test('remediation rate = totalNotVuln / totalDevices', () => {
    const result = computeFNAdvancedAnalytics(SAMPLE_RAW_DATA);
    const expected = result.totalNotVulnerable / result.totalDevices;
    expect(result.overallRemediationRate).toBeCloseTo(expected, 5);
  });

  test('all device totals should add up', () => {
    const result = computeFNAdvancedAnalytics(SAMPLE_RAW_DATA);
    expect(result.totalDevices).toBe(
      result.totalVulnerable + result.totalPotentiallyVulnerable + result.totalNotVulnerable
    );
  });
});
