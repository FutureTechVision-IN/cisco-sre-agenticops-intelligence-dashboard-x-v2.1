/**
 * Filter Calculation Service
 * Handles real-time KPI metric calculations based on active filters
 * Provides client-side metric aggregation for all filter combinations
 */

import { DashboardData, FilterState, Metric } from '../types';

interface FilteredMetrics {
  totalAssessed: number;
  vulnerable: number;
  potentiallyVulnerable: number;
  notVulnerable: number;
}

/**
 * Calculate filtered metrics from dashboard data and active records
 * This handles metric recalculation when any filter is applied
 *  FIXED: Now properly uses backend-returned metrics for filtered requests
 */
export const calculateFilteredMetrics = (
  dashboardData: DashboardData | null,
  filters: FilterState
): FilteredMetrics => {
  if (!dashboardData) {
    return {
      totalAssessed: 0,
      vulnerable: 0,
      potentiallyVulnerable: 0,
      notVulnerable: 0
    };
  }

  // Determine if any filters are active
  const hasActiveFilters = (
    (filters.customer && filters.customer !== '' && filters.customer !== 'All Customers') ||
    (filters.fieldNotice && filters.fieldNotice !== '' && filters.fieldNotice !== 'All Field Notices') ||
    (filters.fnType && filters.fnType !== '' && filters.fnType !== 'All Types') ||
    (filters.month && filters.month !== '' && filters.month !== 'All Months')
  );

  console.log('[FilterCalculationService]  Calculating filtered metrics:');
  console.log('[FilterCalculationService]   hasActiveFilters:', hasActiveFilters);
  console.log('[FilterCalculationService]   Customer:', filters.customer);
  console.log('[FilterCalculationService]   FieldNotice:', filters.fieldNotice);
  console.log('[FilterCalculationService]   FnType:', filters.fnType);
  console.log('[FilterCalculationService]   Month:', filters.month);

  //  IMPORTANT: When backend returns filtered data, the metrics ARE already filtered
  // Use the metrics directly from the backend response instead of trying to recalculate
  console.log('[FilterCalculationService]  Using backend-returned metrics');
  console.log('[FilterCalculationService]   Total Assessed:', dashboardData.metrics.totalAssessed.value);
  console.log('[FilterCalculationService]   Vulnerable:', dashboardData.metrics.vulnerable.value);
  console.log('[FilterCalculationService]   Potentially Vulnerable:', dashboardData.metrics.potential.value);
  console.log('[FilterCalculationService]   Not Vulnerable:', dashboardData.metrics.secure.value);
  
  return {
    totalAssessed: dashboardData.metrics.totalAssessed.value,
    vulnerable: dashboardData.metrics.vulnerable.value,
    potentiallyVulnerable: dashboardData.metrics.potential.value,
    notVulnerable: dashboardData.metrics.secure.value
  };
};

/**
 * Convert display format "Month Year" to YYYY-MM format
 */
const convertDisplayMonthToYYYYMM = (displayMonth: string): string => {
  if (!displayMonth || displayMonth === 'All Months') return '';
  
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  
  const parts = displayMonth.toLowerCase().split(' ');
  const monthName = parts[0];
  const year = parts[1];
  
  const monthIdx = monthNames.indexOf(monthName);
  if (monthIdx === -1 || !year) {
    console.warn(`[FilterCalculationService] Could not parse month: ${displayMonth}`);
    return displayMonth;
  }
  
  return `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
};

/**
 * Calculate percentage for a metric value
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100 * 10) / 10;
};

/**
 * Generate trend data for metrics (for visualization)
 */
export const generateMetricTrendData = (baseValue: number, points: number = 30) => {
  return Array.from({ length: points }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (points - i));
    const randomVar = (Math.random() - 0.5) * (baseValue * 0.05);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.floor(Math.max(0, baseValue + randomVar))
    };
  });
};

/**
 * Build updated metrics object for dashboard display
 */
export const buildUpdatedMetrics = (
  originalMetrics: any,
  filteredMetrics: FilteredMetrics
): any => {
  const total = Math.max(filteredMetrics.totalAssessed, 1); // Avoid division by zero

  return {
    totalAssessed: {
      ...originalMetrics.totalAssessed,
      value: filteredMetrics.totalAssessed,
      history: generateMetricTrendData(filteredMetrics.totalAssessed)
    },
    vulnerable: {
      ...originalMetrics.vulnerable,
      value: filteredMetrics.vulnerable,
      percentage: calculatePercentage(filteredMetrics.vulnerable, total),
      history: generateMetricTrendData(filteredMetrics.vulnerable)
    },
    potential: {
      ...originalMetrics.potential,
      value: filteredMetrics.potentiallyVulnerable,
      percentage: calculatePercentage(filteredMetrics.potentiallyVulnerable, total),
      history: generateMetricTrendData(filteredMetrics.potentiallyVulnerable)
    },
    secure: {
      ...originalMetrics.secure,
      value: filteredMetrics.notVulnerable,
      percentage: calculatePercentage(filteredMetrics.notVulnerable, total),
      history: generateMetricTrendData(filteredMetrics.notVulnerable)
    }
  };
};
