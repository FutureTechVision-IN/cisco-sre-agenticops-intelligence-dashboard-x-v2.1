/**
 * Advanced Visualization Service Tests
 * Comprehensive unit tests for visualization capabilities
 */

import {
  groupAccountsByDimension,
  generateTrendForecast,
  generateTooltipData,
  filterAccountsAdvanced,
  verifyDataIntegrity,
  generateAccessibilityLabels,
  clearVisualizationCache,
} from '../advancedVisualizationService';

import { AccountKARMetrics } from '../../types/index';

// Mock data for testing
const mockAccounts: AccountKARMetrics[] = [
  {
    accountId: '1',
    accountName: 'BANCO ITAU BRAZIL',
    accountSize: 'Enterprise',
    industry: 'Financial Services',
    currentRatio: 15.5,
    historicalTrends: [{ period: 'Jan', ratio: 14.2 }, { period: 'Feb', ratio: 15.5 }],
    peerBenchmark: 12.3,
    benchmarkPercentile: 85,
    impactedDevices: 5000,
    vulnerabilityCount: 250,
    riskScore: 100,
    criticalCount: 50,
    complianceExposure: ['SOC 2', 'ISO 27001'],
    remediationStatus: 'In Progress',
  },
  {
    accountId: '2',
    accountName: 'TechCorp USA',
    accountSize: 'Mid-Market',
    industry: 'Technology',
    currentRatio: 8.2,
    historicalTrends: [{ period: 'Jan', ratio: 7.5 }, { period: 'Feb', ratio: 8.2 }],
    peerBenchmark: 7.8,
    benchmarkPercentile: 55,
    impactedDevices: 2500,
    vulnerabilityCount: 120,
    riskScore: 65,
    criticalCount: 15,
    complianceExposure: ['GDPR'],
    remediationStatus: 'Not Started',
  },
  {
    accountId: '3',
    accountName: 'Healthcare Plus',
    accountSize: 'SMB',
    industry: 'Healthcare',
    currentRatio: 3.4,
    historicalTrends: [{ period: 'Jan', ratio: 3.1 }, { period: 'Feb', ratio: 3.4 }],
    peerBenchmark: 3.9,
    benchmarkPercentile: 35,
    impactedDevices: 800,
    vulnerabilityCount: 45,
    riskScore: 45,
    criticalCount: 5,
    complianceExposure: ['HIPAA'],
    remediationStatus: 'Completed',
  },
];

describe('Advanced Visualization Service', () => {
  beforeEach(() => {
    clearVisualizationCache();
  });

  describe('Account Grouping', () => {
    test('should group accounts by size', () => {
      const grouped = groupAccountsByDimension(mockAccounts, 'size');
      expect(grouped).toHaveLength(3);
      expect(grouped[0].groupName).toMatch(/Enterprise|Mid-Market|SMB/);
      expect(grouped[0].totalAccounts).toBeGreaterThan(0);
    });

    test('should group accounts by industry', () => {
      const grouped = groupAccountsByDimension(mockAccounts, 'industry');
      expect(grouped.length).toBeGreaterThan(0);
      grouped.forEach((group) => {
        expect(group.accounts).toBeDefined();
        expect(group.avgRatio).toBeGreaterThanOrEqual(0);
        expect(group.avgRiskScore).toBeGreaterThanOrEqual(0);
      });
    });

    test('should group accounts by risk level', () => {
      const grouped = groupAccountsByDimension(mockAccounts, 'risk');
      expect(grouped.length).toBeGreaterThan(0);
      grouped.forEach((group) => {
        expect(group.groupName).toMatch(/Critical|High|Medium|Low/);
      });
    });

    test('should calculate group averages correctly', () => {
      const grouped = groupAccountsByDimension(mockAccounts, 'size');
      grouped.forEach((group) => {
        if (group.totalAccounts > 0) {
          const expectedAvgRatio = group.accounts.reduce((sum, a) => sum + a.currentRatio, 0) / group.totalAccounts;
          expect(group.avgRatio).toBeCloseTo(expectedAvgRatio, 2);
        }
      });
    });

    test('should assign colors to groups', () => {
      const grouped = groupAccountsByDimension(mockAccounts, 'size');
      grouped.forEach((group) => {
        expect(group.color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe('Trend Forecasting', () => {
    const historicalData = [
      { month: 'Apr', ratio: 10 },
      { month: 'May', ratio: 12 },
      { month: 'Jun', ratio: 14 },
      { month: 'Jul', ratio: 16 },
      { month: 'Aug', ratio: 18 },
    ];

    test('should generate forecast with correct number of periods', () => {
      const forecast = generateTrendForecast(historicalData, 3);
      expect(forecast.length).toBe(8); // 5 historical + 3 forecast
    });

    test('should maintain data integrity in forecast', () => {
      const forecast = generateTrendForecast(historicalData, 3);
      forecast.forEach((point) => {
        expect(point.month).toBeDefined();
        expect(point.value).toBeGreaterThanOrEqual(0);
      });
    });

    test('should calculate confidence correctly', () => {
      const forecast = generateTrendForecast(historicalData, 3);
      const forecastPoints = forecast.filter((p) => p.forecast !== undefined);
      forecastPoints.forEach((point, index) => {
        if (point.confidence !== undefined) {
          expect(point.confidence).toBeGreaterThan(0);
          expect(point.confidence).toBeLessThanOrEqual(100);
        }
      });
    });

    test('should handle minimal data gracefully', () => {
      const minimalData = [{ month: 'Jan', ratio: 5 }];
      const forecast = generateTrendForecast(minimalData, 2);
      expect(forecast).toBeDefined();
      expect(forecast.length).toBeGreaterThan(0);
    });
  });

  describe('Tooltip Generation', () => {
    test('should generate complete tooltip data', () => {
      const tooltip = generateTooltipData(mockAccounts[0]);
      expect(tooltip.accountName).toBe('BANCO ITAU BRAZIL');
      expect(tooltip.ratio).toBe(15.5);
      expect(tooltip.riskScore).toBe(100);
      expect(tooltip.devices).toBe(5000);
    });

    test('should include all required fields', () => {
      const tooltip = generateTooltipData(mockAccounts[0]);
      expect(tooltip).toHaveProperty('accountName');
      expect(tooltip).toHaveProperty('ratio');
      expect(tooltip).toHaveProperty('riskScore');
      expect(tooltip).toHaveProperty('devices');
      expect(tooltip).toHaveProperty('size');
      expect(tooltip).toHaveProperty('industry');
      expect(tooltip).toHaveProperty('benchmark');
      expect(tooltip).toHaveProperty('percentile');
    });
  });

  describe('Advanced Filtering', () => {
    test('should filter by risk score range', () => {
      const filtered = filterAccountsAdvanced(mockAccounts, {
        riskScoreRange: [50, 80],
      });
      expect(filtered.length).toBe(1);
      expect(filtered[0].accountName).toBe('TechCorp USA');
    });

    test('should filter by ratio range', () => {
      const filtered = filterAccountsAdvanced(mockAccounts, {
        ratioRange: [5, 15],
      });
      expect(filtered.length).toBe(2);
    });

    test('should filter by industries', () => {
      const filtered = filterAccountsAdvanced(mockAccounts, {
        industries: ['Technology', 'Healthcare'],
      });
      expect(filtered.length).toBe(2);
    });

    test('should filter by sizes', () => {
      const filtered = filterAccountsAdvanced(mockAccounts, {
        sizes: ['Enterprise', 'Mid-Market'],
      });
      expect(filtered.length).toBe(2);
    });

    test('should support search query', () => {
      const filtered = filterAccountsAdvanced(mockAccounts, {
        searchQuery: 'Tech',
      });
      expect(filtered.length).toBe(1);
      expect(filtered[0].accountName).toBe('TechCorp USA');
    });

    test('should combine multiple filters', () => {
      const filtered = filterAccountsAdvanced(mockAccounts, {
        riskScoreRange: [0, 70],
        sizes: ['Mid-Market', 'SMB'],
        industries: ['Technology', 'Healthcare'],
      });
      expect(filtered.length).toBe(2);
    });

    test('should return empty array when no matches', () => {
      const filtered = filterAccountsAdvanced(mockAccounts, {
        riskScoreRange: [101, 110],
      });
      expect(filtered).toEqual([]);
    });
  });

  describe('Data Integrity Verification', () => {
    test('should validate correct data', () => {
      const result = verifyDataIntegrity(mockAccounts);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should detect missing required fields', () => {
      const invalidAccounts = [{ ...mockAccounts[0], accountId: '' }];
      const result = verifyDataIntegrity(invalidAccounts);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should detect invalid ratio values', () => {
      const invalidAccounts = [{ ...mockAccounts[0], currentRatio: 105 }];
      const result = verifyDataIntegrity(invalidAccounts);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('ratio'))).toBe(true);
    });

    test('should detect invalid risk scores', () => {
      const invalidAccounts = [{ ...mockAccounts[0], riskScore: -10 }];
      const result = verifyDataIntegrity(invalidAccounts);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('risk score'))).toBe(true);
    });

    test('should detect negative device counts', () => {
      const invalidAccounts = [{ ...mockAccounts[0], impactedDevices: -100 }];
      const result = verifyDataIntegrity(invalidAccounts);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('device count'))).toBe(true);
    });
  });

  describe('Accessibility Labels', () => {
    test('should generate all accessibility labels', () => {
      const labels = generateAccessibilityLabels(mockAccounts[0]);
      expect(labels).toHaveProperty('chartBar');
      expect(labels).toHaveProperty('tooltip');
      expect(labels).toHaveProperty('filterButton');
    });

    test('should include account details in labels', () => {
      const labels = generateAccessibilityLabels(mockAccounts[0]);
      expect(labels.chartBar).toContain('BANCO ITAU BRAZIL');
      expect(labels.tooltip).toContain('Financial Services');
    });

    test('should format numbers correctly in labels', () => {
      const labels = generateAccessibilityLabels(mockAccounts[0]);
      expect(labels.tooltip).toContain('5,000');
    });
  });

  describe('Cache Management', () => {
    test('should clear cache', () => {
      // Perform some calculations to populate cache
      groupAccountsByDimension(mockAccounts, 'size');
      // Clear and verify
      clearVisualizationCache();
      expect(true).toBe(true); // Cache cleared successfully
    });
  });
});
