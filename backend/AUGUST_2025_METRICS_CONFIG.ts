/**
 * AUGUST 2025 METRICS CONFIGURATION
 * Single Source of Truth for all August 2025 (most recent month) analytics
 * Source: backend/data-reconciliation.ts line 47
 */

export interface August2025Metrics {
  timestamp: string;
  dataMonth: 'August 2025';
  totalAssessed: number;
  secure: { count: number; percentage: number };
  vulnerable: { count: number; percentage: number };
  potentiallyVulnerable: { count: number; percentage: number };
  comparison: {
    month: string;
    vulnerableChange: { absolute: number; percentage: number };
  };
  remediationMetrics: { monthlyRate: number; trendDirection: 'improving' | 'declining' | 'stable' };
}

export const AUGUST_2025_METRICS: August2025Metrics = {
  timestamp: 'August 2025',
  dataMonth: 'August 2025',
  totalAssessed: 55401546,
  secure: { count: 47789438, percentage: 86.2 },
  vulnerable: { count: 1167640, percentage: 2.1 },
  potentiallyVulnerable: { count: 6444468, percentage: 11.6 },
  comparison: {
    month: 'July 2025',
    vulnerableChange: { absolute: -172686, percentage: -12.8 },
  },
  remediationMetrics: { monthlyRate: 847000, trendDirection: 'improving' },
};

export const AUGUST_2025_DISPLAY = {
  totalAssessed: '55.4M',
  secure: '47.8M (86.2%)',
  vulnerable: '1.17M (2.1%)',
  potentiallyVulnerable: '6.44M (11.6%)',
  remediationRate: '847K/month',
  month: 'August 2025',
  monthLabel: 'August 2025 (Most Recent Month)',
  comparisonWithJuly: 'Vulnerable assets down 12.8% from July',
  dataTimestamp: 'August 2025 - Most Recent Assessment Cycle',
};

export const AUGUST_2025_KPI_CARDS = [
  {
    id: 'total-assessed',
    label: 'Total Assessed Assets',
    value: '55.4M',
    status: 'good',
    timestamp: 'August 2025',
  },
  {
    id: 'secure-assets',
    label: 'Secure Assets',
    value: '47.8M',
    percentage: 86.2,
    change: '+0.5%',
    status: 'good',
    trend: 'improving',
  },
  {
    id: 'vulnerable-assets',
    label: 'Vulnerable Assets',
    value: '1.17M',
    percentage: 2.1,
    change: '-12.8%',
    status: 'good',
    trend: 'improving',
  },
  {
    id: 'potential-vulnerable',
    label: 'Potentially Vulnerable',
    value: '6.44M',
    percentage: 11.6,
    change: '+3.8%',
    status: 'medium',
  },
];

export function validateAugust2025Data(): { isValid: boolean; errors: string[]; totalCalculated: number } {
  const errors: string[] = [];
  const totalCalculated =
    AUGUST_2025_METRICS.secure.count +
    AUGUST_2025_METRICS.vulnerable.count +
    AUGUST_2025_METRICS.potentiallyVulnerable.count;

  if (totalCalculated !== AUGUST_2025_METRICS.totalAssessed) {
    errors.push(`Total mismatch: ${totalCalculated} vs ${AUGUST_2025_METRICS.totalAssessed}`);
  }
  if (AUGUST_2025_METRICS.secure.percentage !== 86.2) {
    errors.push(`Secure percentage incorrect: ${AUGUST_2025_METRICS.secure.percentage}%`);
  }

  return { isValid: errors.length === 0, errors, totalCalculated };
}

export default {
  AUGUST_2025_METRICS,
  AUGUST_2025_DISPLAY,
  AUGUST_2025_KPI_CARDS,
  validateAugust2025Data,
};
