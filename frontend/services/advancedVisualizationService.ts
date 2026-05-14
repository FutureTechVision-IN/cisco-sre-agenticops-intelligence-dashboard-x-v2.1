/**
 * Advanced Visualization Service
 * Provides sophisticated visualization capabilities including:
 * - Multi-dimensional data analysis
 * - Intelligent grouping and categorization
 * - Trend forecasting and predictions
 * - Performance optimization
 * - Accessibility features
 */

import { 
  AccountKARMetrics, 
  GroupedAccountData, 
  TrendData,
  TooltipData,
  ExportConfig,
  DataIntegrityResult
} from '../types/index';

/**
 * Intelligent Account Grouping
 * Groups accounts by multiple dimensions for better visualization
 */
export interface TooltipData {
  accountName: string;
  ratio: number;
  riskScore: number;
  devices: number;
  size: string;
  industry: string;
  benchmark: number;
  percentile: number;
  status?: string;
}

/**
 * Intelligent Account Grouping
 * Groups accounts by multiple dimensions for better visualization
 */
export const groupAccountsByDimension = (
  accounts: AccountKARMetrics[],
  dimension: 'size' | 'industry' | 'risk' | 'ratio'
): GroupedAccountData[] => {
  const groupMap = new Map<string, AccountKARMetrics[]>();
  const colorMap: Record<string, string> = {
    Enterprise: '#06b6d4',
    'Mid-Market': '#f59e0b',
    SMB: '#8b5cf6',
    'Financial Services': '#06b6d4',
    Healthcare: '#10b981',
    Retail: '#f59e0b',
    Technology: '#3b82f6',
    Manufacturing: '#ef4444',
    Energy: '#6366f1',
    'Critical (80-100)': '#ef4444',
    'High (65-79)': '#f59e0b',
    'Medium (50-64)': '#eab308',
    'Low (0-49)': '#10b981',
  };

  let groups: Map<string, AccountKARMetrics[]>;

  switch (dimension) {
    case 'size':
      groups = accounts.reduce((map, acc) => {
        const key = acc.accountSize || 'Unknown';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(acc);
        return map;
      }, groupMap);
      break;

    case 'industry':
      groups = accounts.reduce((map, acc) => {
        const key = acc.industry || 'Other';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(acc);
        return map;
      }, groupMap);
      break;

    case 'risk':
      groups = accounts.reduce((map, acc) => {
        let key = 'Low (0-49)';
        if (acc.riskScore >= 80) key = 'Critical (80-100)';
        else if (acc.riskScore >= 65) key = 'High (65-79)';
        else if (acc.riskScore >= 50) key = 'Medium (50-64)';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(acc);
        return map;
      }, groupMap);
      break;

    case 'ratio':
      groups = accounts.reduce((map, acc) => {
        let key = 'Low (<5%)';
        if (acc.currentRatio >= 15) key = 'Critical (15%+)';
        else if (acc.currentRatio >= 10) key = 'High (10-14%)';
        else if (acc.currentRatio >= 5) key = 'Medium (5-9%)';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(acc);
        return map;
      }, groupMap);
      break;

    default:
      groups = groupMap;
  }

  return Array.from(groups.entries()).map(([name, accts]) => ({
    groupName: name,
    groupId: `${dimension}-${name.toLowerCase().replace(/\s+/g, '-')}`,
    accounts: accts,
    avgRatio: accts.reduce((sum, a) => sum + a.currentRatio, 0) / accts.length,
    avgRiskScore: accts.reduce((sum, a) => sum + a.riskScore, 0) / accts.length,
    totalDevices: accts.reduce((sum, a) => sum + a.impactedDevices, 0),
    totalAccounts: accts.length,
    color: colorMap[name] || '#64748b',
  }));
};

/**
 * Trend Forecasting
 * Predicts future trends based on historical data
 */
export const generateTrendForecast = (historicalData: any[], periods: number = 3): TrendData[] => {
  if (historicalData.length < 2) return historicalData.map((d, i) => ({ month: d.month, value: d.ratio }));

  const data = historicalData.map((d) => ({
    month: d.month,
    value: d.ratio,
  }));

  // Simple linear regression for forecasting
  const n = data.length;
  const sumX = data.reduce((sum, _, i) => sum + i, 0);
  const sumY = data.reduce((sum, d) => sum + d.value, 0);
  const sumXY = data.reduce((sum, d, i) => sum + i * d.value, 0);
  const sumX2 = data.reduce((sum, _, i) => sum + i * i, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Add forecast data
  const forecast: TrendData[] = [...data];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const lastMonthIndex = months.indexOf(data[data.length - 1].month);

  for (let i = 1; i <= periods; i++) {
    const monthIndex = (lastMonthIndex + i) % 12;
    const forecastValue = slope * (n + i - 1) + intercept;
    const confidence = Math.max(70, 95 - i * 10); // Confidence decreases with forecast distance

    forecast.push({
      month: months[monthIndex],
      value: forecastValue,
      forecast: true,
      confidence,
    });
  }

  return forecast;
};

/**
 * Generate Rich Tooltip Data
 * Creates detailed tooltip information for interactive visualization
 */
export const generateTooltipData = (account: AccountKARMetrics): TooltipData => ({
  accountName: account.accountName,
  ratio: account.currentRatio,
  riskScore: account.riskScore,
  devices: account.impactedDevices,
  size: account.accountSize || 'Unknown',
  industry: account.industry || 'Other',
  benchmark: account.peerBenchmark,
  percentile: account.benchmarkPercentile,
});

/**
 * Filter Accounts by Multiple Criteria
 * Advanced filtering with support for complex queries
 */
export const filterAccountsAdvanced = (
  accounts: AccountKARMetrics[],
  filters: {
    riskScoreRange?: [number, number];
    ratioRange?: [number, number];
    deviceCountRange?: [number, number];
    industries?: string[];
    sizes?: string[];
    searchQuery?: string;
  }
): AccountKARMetrics[] => {
  return accounts.filter((account) => {
    // Risk score filter
    if (filters.riskScoreRange) {
      const [min, max] = filters.riskScoreRange;
      if (account.riskScore < min || account.riskScore > max) return false;
    }

    // Ratio filter
    if (filters.ratioRange) {
      const [min, max] = filters.ratioRange;
      if (account.currentRatio < min || account.currentRatio > max) return false;
    }

    // Device count filter
    if (filters.deviceCountRange) {
      const [min, max] = filters.deviceCountRange;
      if (account.impactedDevices < min || account.impactedDevices > max) return false;
    }

    // Industries filter
    if (filters.industries && filters.industries.length > 0) {
      if (!filters.industries.includes(account.industry)) return false;
    }

    // Sizes filter
    if (filters.sizes && filters.sizes.length > 0) {
      if (!filters.sizes.includes(account.accountSize)) return false;
    }

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      if (
        !account.accountName.toLowerCase().includes(query) &&
        !account.industry.toLowerCase().includes(query) &&
        !account.accountSize.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Performance Optimization: Memoize account calculations
 */
const calculationCache = new Map<string, any>();

export const getCachedCalculation = (key: string, calculator: () => any): any => {
  if (calculationCache.has(key)) {
    return calculationCache.get(key);
  }
  const result = calculator();
  calculationCache.set(key, result);
  return result;
};

export const clearVisualizationCache = (): void => {
  calculationCache.clear();
};

/**
 * Export Data to Various Formats
 */
export const exportVisualizationData = (
  accounts: AccountKARMetrics[],
  config: ExportConfig
): string => {
  switch (config.format) {
    case 'csv':
      return exportToCSV(accounts);
    case 'json':
      return exportToJSON(accounts);
    case 'pdf':
      return exportToPDF(accounts);
    default:
      return '';
  }
};

const exportToCSV = (accounts: AccountKARMetrics[]): string => {
  const headers = ['Account Name', 'Size', 'Industry', 'Current Ratio (%)', 'Risk Score', 'Devices', 'Status'];
  const rows = accounts.map((a) => [
    a.accountName,
    a.accountSize,
    a.industry,
    a.currentRatio.toFixed(1),
    a.riskScore,
    a.impactedDevices,
    a.remediationStatus || 'Not Started',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
};

const exportToJSON = (accounts: AccountKARMetrics[]): string => {
  return JSON.stringify(
    {
      exportDate: new Date().toISOString(),
      totalAccounts: accounts.length,
      accounts: accounts.map((a) => ({
        id: a.accountId,
        name: a.accountName,
        size: a.accountSize,
        industry: a.industry,
        metrics: {
          currentRatio: a.currentRatio,
          riskScore: a.riskScore,
          impactedDevices: a.impactedDevices,
          benchmarkPercentile: a.benchmarkPercentile,
        },
        status: a.remediationStatus,
      })),
    },
    null,
    2
  );
};

const exportToPDF = (accounts: AccountKARMetrics[]): string => {
  // PDF export implementation would require a library like jsPDF
  // For now, return JSON representation that can be converted to PDF
  return exportToJSON(accounts);
};

/**
 * Accessibility: Generate ARIA labels
 */
export const generateAccessibilityLabels = (account: AccountKARMetrics): Record<string, string> => ({
  chartBar: `${account.accountName} bar chart showing KAR ratio of ${account.currentRatio.toFixed(1)}% and risk score of ${account.riskScore} out of 100`,
  tooltip: `Account ${account.accountName}: Size ${account.accountSize}, Industry ${account.industry}, Risk Score ${account.riskScore}, Impacted Devices ${account.impactedDevices.toLocaleString()}`,
  filterButton: `Filter by ${account.accountSize} accounts`,
});

/**
 * Performance Benchmarking
 */
export const measureRenderPerformance = (
  renderFn: () => void,
  label: string = 'Render'
): { duration: number; label: string } => {
  const startTime = performance.now();
  renderFn();
  const endTime = performance.now();
  const duration = endTime - startTime;

  console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);

  return {
    duration,
    label,
  };
};

/**
 * Data Integrity Verification
 */
export const verifyDataIntegrity = (accounts: AccountKARMetrics[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  accounts.forEach((account, index) => {
    if (!account.accountId) errors.push(`Account ${index}: Missing ID`);
    if (!account.accountName) errors.push(`Account ${index}: Missing name`);
    if (account.currentRatio < 0 || account.currentRatio > 100)
      errors.push(`Account ${index}: Invalid ratio value ${account.currentRatio}`);
    if (account.riskScore < 0 || account.riskScore > 100)
      errors.push(`Account ${index}: Invalid risk score ${account.riskScore}`);
    if (account.impactedDevices < 0) errors.push(`Account ${index}: Negative device count`);
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};
