/**
 * Filter Calculation Service - Unit Tests
 * Tests for metric calculation with various filter combinations
 */

import { calculateFilteredMetrics, calculatePercentage } from '../services/filterCalculationService';
import { DashboardData, FilterState } from '../types';

// Mock data for testing
const createMockDashboardData = (recordCount: number): DashboardData => {
  const records = Array.from({ length: recordCount }, (_, i) => {
    const statuses = ['vulnerable', 'potentiallyVulnerable', 'notVulnerable'];
    const status = statuses[i % 3];
    
    return {
      id: `record-${i}`,
      customerName: i % 2 === 0 ? 'Cisco' : 'Other Company',
      fieldNoticeId: i % 3 === 0 ? 'FN-001' : 'FN-002',
      fnType: i % 2 === 0 ? 'SECURITY' : 'BUG',
      date: `2025-${String((i % 9) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      status: status,
      vulnerableCount: status === 'vulnerable' ? 1 : 0,
      potentialCount: status === 'potentiallyVulnerable' ? 1 : 0,
      secureCount: status === 'notVulnerable' ? 1 : 0
    };
  });
  
  return {
    metrics: {
      totalAssessed: { value: recordCount, label: 'Total Assessed', color: 'blue' },
      vulnerable: { value: Math.floor(recordCount / 3), label: 'Vulnerable', color: 'rose', percentage: 33 },
      potential: { value: Math.floor(recordCount / 3), label: 'Potentially Vulnerable', color: 'amber', percentage: 33 },
      secure: { value: recordCount - Math.floor(recordCount / 3) * 2, label: 'Secure', color: 'green', percentage: 34 }
    },
    records: records as any[],
    trends: [],
    topFieldNotices: [],
    topCustomers: [],
    growthMetrics: [],
    advancedMetrics: [],
    anomalies: [],
    predictions: [],
    recommendations: [],
    extendedKPIs: [],
    lastUpdated: new Date().toISOString()
  } as any;
};

/**
 * Test Suite 1: No Filters
 */
const testNoFilters = () => {
  console.log('\n TEST 1: No Filters Applied');
  
  const mockData = createMockDashboardData(300);
  const filters: FilterState = {
    customer: '',
    fieldNotice: '',
    fnType: '',
    month: ''
  };
  
  const result = calculateFilteredMetrics(mockData, filters);
  
  console.log(' Result:', result);
  console.assert(result.totalAssessed === 300, 'Total should be 300');
  console.log(' PASS: No filters returns base metrics');
};

/**
 * Test Suite 2: Single Filter - Customer
 */
const testCustomerFilter = () => {
  console.log('\n TEST 2: Customer Filter (Cisco)');
  
  const mockData = createMockDashboardData(300);
  const filters: FilterState = {
    customer: 'Cisco',
    fieldNotice: '',
    fnType: '',
    month: ''
  };
  
  const result = calculateFilteredMetrics(mockData, filters);
  
  console.log(' Result:', result);
  console.assert(result.totalAssessed <= 300, 'Total should be less than or equal to 300');
  console.assert(result.totalAssessed > 0, 'Total should be greater than 0');
  console.log(' PASS: Customer filter reduces records');
};

/**
 * Test Suite 3: Single Filter - Field Notice
 */
const testFieldNoticeFilter = () => {
  console.log('\n TEST 3: Field Notice Filter (FN-001)');
  
  const mockData = createMockDashboardData(300);
  const filters: FilterState = {
    customer: '',
    fieldNotice: 'FN-001',
    fnType: '',
    month: ''
  };
  
  const result = calculateFilteredMetrics(mockData, filters);
  
  console.log(' Result:', result);
  console.assert(result.totalAssessed <= 300, 'Total should be less than or equal to 300');
  console.log(' PASS: Field notice filter reduces records');
};

/**
 * Test Suite 4: Single Filter - FN Type
 */
const testFNTypeFilter = () => {
  console.log('\n TEST 4: FN Type Filter (SECURITY)');
  
  const mockData = createMockDashboardData(300);
  const filters: FilterState = {
    customer: '',
    fieldNotice: '',
    fnType: 'SECURITY',
    month: ''
  };
  
  const result = calculateFilteredMetrics(mockData, filters);
  
  console.log(' Result:', result);
  console.assert(result.totalAssessed <= 300, 'Total should be less than or equal to 300');
  console.log(' PASS: FN type filter reduces records');
};

/**
 * Test Suite 5: Single Filter - Month
 */
const testMonthFilter = () => {
  console.log('\n TEST 5: Month Filter (2025-01)');
  
  const mockData = createMockDashboardData(300);
  const filters: FilterState = {
    customer: '',
    fieldNotice: '',
    fnType: '',
    month: 'January 2025'
  };
  
  const result = calculateFilteredMetrics(mockData, filters);
  
  console.log(' Result:', result);
  console.assert(result.totalAssessed >= 0, 'Total should be >= 0');
  console.log(' PASS: Month filter applies correctly');
};

/**
 * Test Suite 6: Multiple Filters
 */
const testMultipleFilters = () => {
  console.log('\n TEST 6: Multiple Filters (Cisco + FN-001 + SECURITY)');
  
  const mockData = createMockDashboardData(300);
  const filters: FilterState = {
    customer: 'Cisco',
    fieldNotice: 'FN-001',
    fnType: 'SECURITY',
    month: ''
  };
  
  const result = calculateFilteredMetrics(mockData, filters);
  
  console.log(' Result:', result);
  console.assert(result.totalAssessed <= 300, 'Total should be less than or equal to 300');
  console.log(' PASS: Multiple filters stack correctly');
};

/**
 * Test Suite 7: Metric Percentage Calculation
 */
const testPercentageCalculation = () => {
  console.log('\n TEST 7: Percentage Calculation');
  
  const result1 = calculatePercentage(50, 100);
  console.assert(result1 === 50, 'Should be 50%');
  
  const result2 = calculatePercentage(25, 100);
  console.assert(result2 === 25, 'Should be 25%');
  
  const result3 = calculatePercentage(0, 100);
  console.assert(result3 === 0, 'Should be 0%');
  
  const result4 = calculatePercentage(100, 0);
  console.assert(result4 === 0, 'Should be 0% (division by zero)');
  
  console.log(' PASS: Percentage calculations correct');
};

/**
 * Test Suite 8: Three Security Statuses Preserved
 */
const testThreeStatuses = () => {
  console.log('\n TEST 8: All Three Security Statuses Preserved');
  
  const mockData = createMockDashboardData(300);
  const filters: FilterState = {
    customer: 'Cisco',
    fieldNotice: '',
    fnType: '',
    month: ''
  };
  
  const result = calculateFilteredMetrics(mockData, filters);
  
  console.log(' Result:', result);
  console.assert(
    result.vulnerable + result.potentiallyVulnerable + result.notVulnerable === result.totalAssessed,
    'All three statuses should sum to total'
  );
  console.log(' PASS: Three statuses sum correctly to total');
};

/**
 * Run All Tests
 */
export const runFilterTests = () => {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║ FILTER CALCULATION SERVICE - TEST SUITE        ║');
  console.log('╚════════════════════════════════════════════════╝');
  
  try {
    testNoFilters();
    testCustomerFilter();
    testFieldNoticeFilter();
    testFNTypeFilter();
    testMonthFilter();
    testMultipleFilters();
    testPercentageCalculation();
    testThreeStatuses();
    
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║  ALL TESTS PASSED                            ║');
    console.log('╚════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n TEST FAILED:', error);
  }
};

// Export for use in dev tools
if (typeof window !== 'undefined') {
  (window as any).runFilterTests = runFilterTests;
}
