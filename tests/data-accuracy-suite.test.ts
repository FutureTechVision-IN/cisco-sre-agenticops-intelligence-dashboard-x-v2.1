/**
 * Comprehensive Data Accuracy Test Suite
 * Validates data integrity across all dashboard components
 * Tests: CSV loading, data validation, API endpoints, metric accuracy
 * @jest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const API_BASE = process.env.API_URL || 'http://localhost:5000';

// Helper to make API requests
async function apiGet(path: string) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path} returned ${res.status}`);
  return res.json();
}

describe('Data Accuracy Validation Suite', () => {
  
  describe('CSV Data Loading', () => {
    it('should load cache with valid record count', async () => {
      const stats = await apiGet('/api/cache/status');
      expect(stats.csvCache.loaded).toBe(true);
      expect(stats.csvCache.recordCount).toBeGreaterThan(100000);
    });

    it('should have April 2025 through January 2026 month coverage', async () => {
      const health = await apiGet('/api/data/health');
      expect(health.monthCount).toBeGreaterThanOrEqual(10);
      expect(health.dataRange).toContain('2025-04');
      expect(health.dataRange).toContain('2026-01');
    });

    it('should have valid customer and field notice counts', async () => {
      const health = await apiGet('/api/data/health');
      expect(health.customerCount).toBeGreaterThan(100);
      expect(health.fieldNoticeCount).toBeGreaterThan(50);
    });
  });

  describe('Data Validation Pipeline', () => {
    it('should return validation results with no critical errors', async () => {
      const result = await apiGet('/api/data/validation');
      expect(result.success).toBe(true);
      expect(result.validation).toBeDefined();
      expect(result.validation.totalRecords).toBeGreaterThan(0);
      // Allow warnings but not errors
      expect(result.validation.validationErrors.length).toBe(0);
    });

    it('should report correct column structure', async () => {
      const result = await apiGet('/api/data/validation');
      const cols = result.validation.columnValidation;
      expect(cols.missing.length).toBe(0);
      expect(cols.actual).toContain('FIELD_NOTICE');
      expect(cols.actual).toContain('CUSTOMER_NAME');
      expect(cols.actual).toContain('DATE_IMPORTED');
    });

    it('should have date range coverage above 90%', async () => {
      const result = await apiGet('/api/data/validation');
      expect(result.validation.dateRangeCoverage.coveragePercent).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Metrics Accuracy', () => {
    it('should return non-zero metrics from /api/metrics/filtered', async () => {
      const metrics = await apiGet('/api/metrics/filtered');
      expect(metrics.totalAssessed).toBeGreaterThan(0);
      expect(metrics.vulnerable).toBeGreaterThanOrEqual(0);
      expect(metrics.potentiallyVulnerable).toBeGreaterThanOrEqual(0);
      expect(metrics.notVulnerable).toBeGreaterThanOrEqual(0);
    });

    it('should have consistent total (vuln + pot + notVuln = total)', async () => {
      const metrics = await apiGet('/api/metrics/filtered');
      const calculatedTotal = metrics.vulnerable + metrics.potentiallyVulnerable + metrics.notVulnerable;
      expect(calculatedTotal).toBe(metrics.totalAssessed);
    });

    it('should return data period metadata', async () => {
      const metrics = await apiGet('/api/metrics/filtered');
      expect(metrics.dataPeriod).toBeDefined();
      expect(metrics.lastUpdated).toBeDefined();
    });
  });

  describe('Monthly Trends', () => {
    it('should return trend data for all months', async () => {
      const trends = await apiGet('/api/trends/monthly');
      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBeGreaterThanOrEqual(10);
    });

    it('should have sequential months from Apr 2025', async () => {
      const trends = await apiGet('/api/trends/monthly');
      const months = trends.map((t: any) => t.month).sort();
      expect(months[0]).toBe('2025-04');
      expect(months[months.length - 1]).toBe('2026-01');
    });

    it('should have non-negative values in each month', async () => {
      const trends = await apiGet('/api/trends/monthly');
      for (const t of trends) {
        expect(t.vulnerable).toBeGreaterThanOrEqual(0);
        expect(t.potentiallyVulnerable).toBeGreaterThanOrEqual(0);
        expect(t.notVulnerable).toBeGreaterThanOrEqual(0);
        expect(t.total).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Filter System', () => {
    it('should return filter options with customers and field notices', async () => {
      const filters = await apiGet('/api/filters');
      expect(Array.isArray(filters.customers)).toBe(true);
      expect(filters.customers.length).toBeGreaterThan(0);
      expect(Array.isArray(filters.fieldNotices)).toBe(true);
      expect(filters.fieldNotices.length).toBeGreaterThan(0);
      expect(Array.isArray(filters.months)).toBe(true);
      expect(filters.months.length).toBeGreaterThanOrEqual(10);
    });

    it('should return months including new months (Sep-Jan)', async () => {
      const filters = await apiGet('/api/filters');
      expect(filters.months).toContain('2025-09');
      expect(filters.months).toContain('2025-10');
      expect(filters.months).toContain('2025-11');
      expect(filters.months).toContain('2025-12');
      expect(filters.months).toContain('2026-01');
    });
  });

  describe('Top Reports', () => {
    it('should return top field notices sorted by vulnerability', async () => {
      const result = await apiGet('/api/reports/top-field-notices?limit=10');
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
      // Verify sorting
      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i - 1].totVuln).toBeGreaterThanOrEqual(result.data[i].totVuln);
      }
    });

    it('should return top customers sorted by vulnerability', async () => {
      const result = await apiGet('/api/reports/top-customers?limit=10');
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i - 1].totVuln).toBeGreaterThanOrEqual(result.data[i].totVuln);
      }
    });
  });

  describe('Enhanced Analytics', () => {
    it('should return pattern recognition data', async () => {
      const analytics = await apiGet('/api/analytics/enhanced');
      expect(analytics.success).toBe(true);
      expect(analytics.patternRecognition).toBeDefined();
      expect(analytics.patternRecognition.monthlyTrends.length).toBeGreaterThan(0);
      expect(analytics.patternRecognition.vulnerabilityMean).toBeGreaterThan(0);
    });

    it('should return anomaly detection results', async () => {
      const analytics = await apiGet('/api/analytics/enhanced');
      expect(analytics.anomalyDetection).toBeDefined();
      expect(typeof analytics.anomalyDetection.anomaliesFound).toBe('number');
    });

    it('should return predictive analytics with predictions', async () => {
      const analytics = await apiGet('/api/analytics/enhanced');
      expect(analytics.predictiveAnalytics).toBeDefined();
      expect(analytics.predictiveAnalytics.predictions.length).toBe(3);
      for (const pred of analytics.predictiveAnalytics.predictions) {
        expect(pred.predictedVulnerable).toBeGreaterThanOrEqual(0);
        expect(pred.confidenceInterval).toBeDefined();
      }
    });

    it('should return risk distribution', async () => {
      const analytics = await apiGet('/api/analytics/enhanced');
      expect(analytics.riskDistribution).toBeDefined();
      const total = analytics.riskDistribution.critical + analytics.riskDistribution.high +
                    analytics.riskDistribution.medium + analytics.riskDistribution.low;
      expect(total).toBe(analytics.customerInsights.totalCustomers);
    });
  });

  describe('Data Refresh', () => {
    it('should successfully refresh data', async () => {
      const res = await fetch(`${API_BASE}/api/data/refresh`, { method: 'POST' });
      const result = await res.json();
      expect(result.success).toBe(true);
      expect(result.refreshTimeMs).toBeGreaterThan(0);
      expect(result.stats.loaded).toBe(true);
    }, 30000);
  });

  describe('Data Health', () => {
    it('should report healthy or degraded status', async () => {
      const health = await apiGet('/api/data/health');
      expect(['healthy', 'degraded']).toContain(health.status);
      expect(health.loaded).toBe(true);
    });
  });
});
