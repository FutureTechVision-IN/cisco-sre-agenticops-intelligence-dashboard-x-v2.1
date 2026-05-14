/**
 * Data Verification Service - Comprehensive data completeness and accuracy checks
 * 
 * This service provides:
 * - Monthly data completeness verification
 * - Data quality scoring
 * - Automated alerting for missing or incomplete data
 * - Audit trail for verification runs
 * - Trend analysis for data collection patterns
 */

import { loadCSVData, getCachedAggregations, getCachedRecords, NormalizedRecord } from './csv-data-service';

// Verification result types
export interface DataVerificationResult {
  timestamp: string;
  overallStatus: 'healthy' | 'warning' | 'critical';
  dataQualityScore: number; // 0-100
  summary: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    emptyRecords: number;
    uniqueCustomers: number;
    uniqueFieldNotices: number;
    dateRange: {
      earliest: string;
      latest: string;
      expected: string;
    };
  };
  monthlyCompleteness: MonthlyCompletenessCheck[];
  dataGaps: DataGap[];
  qualityIssues: QualityIssue[];
  recommendations: Recommendation[];
  auditInfo: AuditInfo;
}

export interface MonthlyCompletenessCheck {
  month: string;
  status: 'complete' | 'partial' | 'missing';
  recordCount: number;
  expectedRecords: number | null; // null if cannot estimate
  percentComplete: number;
  vulnerableAssets: number;
  potentiallyVulnerable: number;
  notVulnerable: number;
  uniqueCustomers: number;
  uniqueFieldNotices: number;
  alerts: string[];
}

export interface DataGap {
  type: 'missing_month' | 'incomplete_month' | 'missing_dimension' | 'data_spike' | 'data_drop';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedPeriod: string;
  affectedCount: number;
  recommendedAction: string;
}

export interface QualityIssue {
  type: 'empty_values' | 'invalid_dates' | 'duplicate_records' | 'anomalous_values' | 'missing_required';
  severity: 'low' | 'medium' | 'high';
  field: string;
  count: number;
  percentage: number;
  examples: string[];
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: 'data_collection' | 'data_processing' | 'data_validation' | 'monitoring';
  title: string;
  description: string;
  impact: string;
}

export interface AuditInfo {
  verificationId: string;
  runAt: string;
  runDurationMs: number;
  dataSource: string;
  checksPerformed: string[];
  version: string;
}

/**
 * Generate expected months based on current date and data range
 */
function getExpectedMonths(startMonth: string, endMonth: string): string[] {
  const months: string[] = [];
  const start = new Date(startMonth + '-01');
  const end = new Date(endMonth + '-01');
  
  let current = new Date(start);
  while (current <= end) {
    months.push(current.toISOString().substring(0, 7));
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
}

/**
 * Get the expected latest month based on current date or filename
 */
function getExpectedLatestMonth(): string {
  // Based on filename "apr-sep", expected range is 2025-04 to 2025-09
  return '2025-09';
}

/**
 * Get the expected start month
 */
function getExpectedStartMonth(): string {
  return '2025-04';
}

/**
 * Calculate average records per month (excluding outliers)
 */
function calculateExpectedRecordsPerMonth(monthlyData: Map<string, number>): number {
  const values = Array.from(monthlyData.values()).sort((a, b) => a - b);
  if (values.length === 0) return 0;
  
  // Use median to avoid skewing from outliers
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 0
    ? Math.floor((values[mid - 1] + values[mid]) / 2)
    : values[mid];
}

/**
 * Detect anomalies in month-over-month changes
 */
function detectMoMAnomalies(
  monthlyData: Array<{ month: string; total: number }>
): DataGap[] {
  const gaps: DataGap[] = [];
  
  for (let i = 1; i < monthlyData.length; i++) {
    const current = monthlyData[i];
    const previous = monthlyData[i - 1];
    
    if (previous.total === 0) continue;
    
    const percentChange = ((current.total - previous.total) / previous.total) * 100;
    
    // Detect significant spikes (>200% increase)
    if (percentChange > 200) {
      gaps.push({
        type: 'data_spike',
        severity: 'medium',
        description: `Unusual data spike in ${current.month}: ${percentChange.toFixed(1)}% increase from ${previous.month}`,
        affectedPeriod: current.month,
        affectedCount: current.total - previous.total,
        recommendedAction: 'Investigate if spike is due to genuine data increase or import issues',
      });
    }
    
    // Detect significant drops (>50% decrease)
    if (percentChange < -50) {
      gaps.push({
        type: 'data_drop',
        severity: 'high',
        description: `Significant data drop in ${current.month}: ${Math.abs(percentChange).toFixed(1)}% decrease from ${previous.month}`,
        affectedPeriod: current.month,
        affectedCount: Math.abs(current.total - previous.total),
        recommendedAction: 'Verify if data collection issues occurred or if drop is expected',
      });
    }
  }
  
  return gaps;
}

/**
 * Run comprehensive data verification
 */
export async function runDataVerification(): Promise<DataVerificationResult> {
  const startTime = Date.now();
  const verificationId = `VER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[DATA-VERIFY] Starting verification run ${verificationId}`);
  
  // Load data
  const cache = await loadCSVData();
  const aggregations = await getCachedAggregations();
  const records = await getCachedRecords();
  
  // Calculate basic stats
  const validRecords = records.length;
  const totalRawRecords = cache.rawRecords.length;
  const invalidRecords = totalRawRecords - validRecords;
  const emptyRecords = cache.rawRecords.filter(r => !r.FIELD_NOTICE?.trim()).length;
  
  // Expected months based on filename (apr-sep 2025)
  const expectedStart = getExpectedStartMonth();
  const expectedEnd = getExpectedLatestMonth();
  const expectedMonths = getExpectedMonths(expectedStart, expectedEnd);
  const actualMonths = Array.from(aggregations.monthlyData.keys()).filter(m => m).sort();
  
  // Monthly completeness analysis
  const monthlyCompleteness: MonthlyCompletenessCheck[] = [];
  const dataGaps: DataGap[] = [];
  
  // Calculate expected records per month
  const monthRecordCounts = new Map<string, number>();
  for (const record of records) {
    if (record.month) {
      monthRecordCounts.set(record.month, (monthRecordCounts.get(record.month) || 0) + 1);
    }
  }
  const expectedRecordsPerMonth = calculateExpectedRecordsPerMonth(monthRecordCounts);
  
  // Check each expected month
  for (const month of expectedMonths) {
    const monthData = aggregations.monthlyData.get(month);
    const recordCount = monthRecordCounts.get(month) || 0;
    
    // Get unique counts for this month
    const monthRecords = records.filter(r => r.month === month);
    const uniqueCustomers = new Set(monthRecords.map(r => r.normalizedCustomer).filter(Boolean)).size;
    const uniqueFNs = new Set(monthRecords.map(r => r.fieldNoticeFormatted).filter(Boolean)).size;
    
    const alerts: string[] = [];
    let status: 'complete' | 'partial' | 'missing' = 'complete';
    let percentComplete = 100;
    
    if (!monthData) {
      // Month is completely missing
      status = 'missing';
      percentComplete = 0;
      alerts.push(`No data found for ${month}`);
      
      dataGaps.push({
        type: 'missing_month',
        severity: 'critical',
        description: `Data for ${month} is completely missing from the dataset`,
        affectedPeriod: month,
        affectedCount: expectedRecordsPerMonth,
        recommendedAction: `Import data for ${month} from source system. Expected ~${expectedRecordsPerMonth.toLocaleString()} records based on historical average.`,
      });
    } else if (recordCount < expectedRecordsPerMonth * 0.8) {
      // Month has significantly fewer records than expected
      status = 'partial';
      percentComplete = Math.round((recordCount / expectedRecordsPerMonth) * 100);
      alerts.push(`Only ${percentComplete}% of expected records present`);
      
      dataGaps.push({
        type: 'incomplete_month',
        severity: 'high',
        description: `Data for ${month} appears incomplete: ${recordCount.toLocaleString()} records vs ~${expectedRecordsPerMonth.toLocaleString()} expected`,
        affectedPeriod: month,
        affectedCount: expectedRecordsPerMonth - recordCount,
        recommendedAction: `Review data import for ${month}. Missing approximately ${(expectedRecordsPerMonth - recordCount).toLocaleString()} records.`,
      });
    }
    
    // Check for low unique entity counts
    if (monthData && uniqueCustomers < aggregations.uniqueCustomers.size * 0.5) {
      alerts.push(`Low customer coverage: only ${uniqueCustomers} customers vs ${aggregations.uniqueCustomers.size} overall`);
    }
    
    monthlyCompleteness.push({
      month,
      status,
      recordCount,
      expectedRecords: expectedRecordsPerMonth,
      percentComplete,
      vulnerableAssets: monthData?.vulnerable || 0,
      potentiallyVulnerable: monthData?.potentiallyVulnerable || 0,
      notVulnerable: monthData?.notVulnerable || 0,
      uniqueCustomers,
      uniqueFieldNotices: uniqueFNs,
      alerts,
    });
  }
  
  // Detect month-over-month anomalies
  const monthlyTotals = actualMonths.map(month => ({
    month,
    total: aggregations.monthlyData.get(month)?.total || 0,
  }));
  const momAnomalies = detectMoMAnomalies(monthlyTotals);
  dataGaps.push(...momAnomalies);
  
  // Quality issues analysis
  const qualityIssues: QualityIssue[] = [];
  
  // Check for empty required fields
  const emptyCustomerCount = records.filter(r => !r.normalizedCustomer).length;
  if (emptyCustomerCount > 0) {
    qualityIssues.push({
      type: 'missing_required',
      severity: 'medium',
      field: 'CUSTOMER_NAME',
      count: emptyCustomerCount,
      percentage: (emptyCustomerCount / validRecords) * 100,
      examples: records.filter(r => !r.normalizedCustomer).slice(0, 3).map(r => r.fieldNotice),
    });
  }
  
  // Check for records with all-zero vulnerability counts
  const zeroVulnRecords = records.filter(r => r.totVuln === 0 && r.potVuln === 0 && r.notVuln === 0);
  if (zeroVulnRecords.length > validRecords * 0.1) {
    qualityIssues.push({
      type: 'anomalous_values',
      severity: 'low',
      field: 'vulnerability_counts',
      count: zeroVulnRecords.length,
      percentage: (zeroVulnRecords.length / validRecords) * 100,
      examples: zeroVulnRecords.slice(0, 3).map(r => `${r.fieldNotice} - ${r.customerName}`),
    });
  }
  
  // Check for empty DATE_IMPORTED in valid records
  const emptyDateRecords = records.filter(r => !r.month || r.month.trim() === '');
  if (emptyDateRecords.length > 0) {
    qualityIssues.push({
      type: 'empty_values',
      severity: 'high',
      field: 'DATE_IMPORTED',
      count: emptyDateRecords.length,
      percentage: (emptyDateRecords.length / validRecords) * 100,
      examples: emptyDateRecords.slice(0, 3).map(r => `${r.fieldNotice} - ${r.customerName}`),
    });
  }
  
  // Generate recommendations
  const recommendations: Recommendation[] = [];
  
  // Missing September data is critical
  if (!actualMonths.includes('2025-09')) {
    recommendations.push({
      priority: 'high',
      category: 'data_collection',
      title: 'Import September 2025 Data',
      description: 'The dataset filename indicates data through September 2025, but September data is missing. This needs to be imported urgently.',
      impact: 'Without September data, trend analysis and forecasts will be inaccurate. Users may make decisions based on incomplete information.',
    });
  }
  
  // Check for data pipeline monitoring
  if (dataGaps.length > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'monitoring',
      title: 'Implement Data Pipeline Monitoring',
      description: 'Set up automated alerts when monthly data imports fall below expected thresholds.',
      impact: 'Early detection of data collection issues prevents downstream reporting problems.',
    });
  }
  
  // Check for data validation
  if (qualityIssues.length > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'data_validation',
      title: 'Enhance Data Validation Rules',
      description: 'Implement validation at data import time to catch quality issues early.',
      impact: 'Cleaner data reduces manual cleanup and improves report accuracy.',
    });
  }
  
  // Calculate overall data quality score
  let qualityScore = 100;
  
  // Deduct for missing months (20 points each)
  const missingMonths = monthlyCompleteness.filter(m => m.status === 'missing').length;
  qualityScore -= missingMonths * 20;
  
  // Deduct for partial months (10 points each)
  const partialMonths = monthlyCompleteness.filter(m => m.status === 'partial').length;
  qualityScore -= partialMonths * 10;
  
  // Deduct for quality issues (5 points each high, 2 for medium, 1 for low)
  for (const issue of qualityIssues) {
    if (issue.severity === 'high') qualityScore -= 5;
    else if (issue.severity === 'medium') qualityScore -= 2;
    else qualityScore -= 1;
  }
  
  qualityScore = Math.max(0, Math.min(100, qualityScore));
  
  // Determine overall status
  let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (qualityScore < 50 || missingMonths > 0) {
    overallStatus = 'critical';
  } else if (qualityScore < 80 || partialMonths > 0) {
    overallStatus = 'warning';
  }
  
  const runDurationMs = Date.now() - startTime;
  
  console.log(`[DATA-VERIFY] Verification complete in ${runDurationMs}ms - Status: ${overallStatus}, Score: ${qualityScore}`);
  
  return {
    timestamp: new Date().toISOString(),
    overallStatus,
    dataQualityScore: qualityScore,
    summary: {
      totalRecords: totalRawRecords,
      validRecords,
      invalidRecords,
      emptyRecords,
      uniqueCustomers: aggregations.uniqueCustomers.size,
      uniqueFieldNotices: aggregations.uniqueFieldNotices.size,
      dateRange: {
        earliest: actualMonths[0] || 'N/A',
        latest: actualMonths[actualMonths.length - 1] || 'N/A',
        expected: expectedEnd,
      },
    },
    monthlyCompleteness,
    dataGaps,
    qualityIssues,
    recommendations,
    auditInfo: {
      verificationId,
      runAt: new Date().toISOString(),
      runDurationMs,
      dataSource: 'filtered_bcs_apr25-sep25_2025_apr-sep_1763979225097.csv',
      checksPerformed: [
        'Monthly data completeness',
        'Record count validation',
        'Month-over-month anomaly detection',
        'Required field validation',
        'Data quality scoring',
        'Gap analysis',
      ],
      version: '1.0.0',
    },
  };
}

/**
 * Get quick data health status (for dashboard indicators)
 */
export async function getDataHealthStatus(): Promise<{
  status: 'healthy' | 'warning' | 'critical';
  score: number;
  lastMonth: string;
  expectedMonth: string;
  isLatestMonthPresent: boolean;
  missingMonths: string[];
  lastVerified: string;
}> {
  const startTime = Date.now();
  const aggregations = await getCachedAggregations();
  
  const actualMonths = aggregations.availableMonths;
  const expectedMonth = getExpectedLatestMonth();
  const lastMonth = actualMonths[actualMonths.length - 1] || 'N/A';
  
  // Check for missing months
  const expectedMonths = getExpectedMonths(getExpectedStartMonth(), expectedMonth);
  const missingMonths = expectedMonths.filter(m => !actualMonths.includes(m));
  
  // Calculate quick score
  let score = 100;
  score -= missingMonths.length * 15;
  score = Math.max(0, Math.min(100, score));
  
  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (missingMonths.length > 0) {
    status = 'critical';
  } else if (score < 80) {
    status = 'warning';
  }
  
  console.log(`[DATA-VERIFY] Quick health check in ${Date.now() - startTime}ms`);
  
  return {
    status,
    score,
    lastMonth,
    expectedMonth,
    isLatestMonthPresent: actualMonths.includes(expectedMonth),
    missingMonths,
    lastVerified: new Date().toISOString(),
  };
}

/**
 * Check if specific month's data is complete
 */
export async function isMonthDataComplete(month: string): Promise<{
  isComplete: boolean;
  recordCount: number;
  expectedCount: number;
  percentComplete: number;
  details: string;
}> {
  const aggregations = await getCachedAggregations();
  const records = await getCachedRecords();
  
  const monthRecords = records.filter(r => r.month === month);
  const recordCount = monthRecords.length;
  
  // Calculate expected based on other months
  const monthCounts = new Map<string, number>();
  for (const r of records) {
    if (r.month && r.month !== month) {
      monthCounts.set(r.month, (monthCounts.get(r.month) || 0) + 1);
    }
  }
  
  const values = Array.from(monthCounts.values());
  const expectedCount = values.length > 0
    ? Math.floor(values.reduce((a, b) => a + b, 0) / values.length)
    : recordCount;
  
  const percentComplete = expectedCount > 0
    ? Math.round((recordCount / expectedCount) * 100)
    : 100;
  
  const isComplete = percentComplete >= 80;
  
  let details: string;
  if (recordCount === 0) {
    details = `No data found for ${month}. This month appears to be completely missing from the dataset.`;
  } else if (percentComplete < 50) {
    details = `${month} has only ${recordCount.toLocaleString()} records (${percentComplete}% of expected). Significant data may be missing.`;
  } else if (percentComplete < 80) {
    details = `${month} has ${recordCount.toLocaleString()} records (${percentComplete}% of expected). Some data may be missing.`;
  } else {
    details = `${month} has ${recordCount.toLocaleString()} records (${percentComplete}% of expected). Data appears complete.`;
  }
  
  return {
    isComplete,
    recordCount,
    expectedCount,
    percentComplete,
    details,
  };
}

/**
 * Export verification results for audit purposes
 */
export function formatVerificationForAudit(result: DataVerificationResult): string {
  const lines: string[] = [];
  
  lines.push('═'.repeat(80));
  lines.push('DATA VERIFICATION AUDIT REPORT');
  lines.push('═'.repeat(80));
  lines.push('');
  lines.push(`Verification ID: ${result.auditInfo.verificationId}`);
  lines.push(`Run At: ${result.auditInfo.runAt}`);
  lines.push(`Duration: ${result.auditInfo.runDurationMs}ms`);
  lines.push(`Data Source: ${result.auditInfo.dataSource}`);
  lines.push('');
  lines.push('─'.repeat(80));
  lines.push('OVERALL STATUS');
  lines.push('─'.repeat(80));
  lines.push(`Status: ${result.overallStatus.toUpperCase()}`);
  lines.push(`Data Quality Score: ${result.dataQualityScore}/100`);
  lines.push('');
  lines.push('─'.repeat(80));
  lines.push('SUMMARY');
  lines.push('─'.repeat(80));
  lines.push(`Total Records: ${result.summary.totalRecords.toLocaleString()}`);
  lines.push(`Valid Records: ${result.summary.validRecords.toLocaleString()}`);
  lines.push(`Invalid Records: ${result.summary.invalidRecords.toLocaleString()}`);
  lines.push(`Empty Records: ${result.summary.emptyRecords.toLocaleString()}`);
  lines.push(`Unique Customers: ${result.summary.uniqueCustomers.toLocaleString()}`);
  lines.push(`Unique Field Notices: ${result.summary.uniqueFieldNotices.toLocaleString()}`);
  lines.push(`Date Range: ${result.summary.dateRange.earliest} to ${result.summary.dateRange.latest}`);
  lines.push(`Expected Latest: ${result.summary.dateRange.expected}`);
  lines.push('');
  lines.push('─'.repeat(80));
  lines.push('MONTHLY COMPLETENESS');
  lines.push('─'.repeat(80));
  
  for (const mc of result.monthlyCompleteness) {
    const statusIcon = mc.status === 'complete' ? '✓' : mc.status === 'partial' ? '⚠' : '✗';
    lines.push(`${statusIcon} ${mc.month}: ${mc.recordCount.toLocaleString()} records (${mc.percentComplete}% complete)`);
    if (mc.alerts.length > 0) {
      for (const alert of mc.alerts) {
        lines.push(`    ⚠ ${alert}`);
      }
    }
  }
  
  lines.push('');
  lines.push('─'.repeat(80));
  lines.push('DATA GAPS');
  lines.push('─'.repeat(80));
  
  if (result.dataGaps.length === 0) {
    lines.push('No significant data gaps detected.');
  } else {
    for (const gap of result.dataGaps) {
      lines.push(`[${gap.severity.toUpperCase()}] ${gap.type}: ${gap.description}`);
      lines.push(`    Period: ${gap.affectedPeriod} | Affected: ${gap.affectedCount.toLocaleString()} records`);
      lines.push(`    Action: ${gap.recommendedAction}`);
      lines.push('');
    }
  }
  
  lines.push('─'.repeat(80));
  lines.push('QUALITY ISSUES');
  lines.push('─'.repeat(80));
  
  if (result.qualityIssues.length === 0) {
    lines.push('No significant quality issues detected.');
  } else {
    for (const issue of result.qualityIssues) {
      lines.push(`[${issue.severity.toUpperCase()}] ${issue.type} in ${issue.field}`);
      lines.push(`    Count: ${issue.count.toLocaleString()} (${issue.percentage.toFixed(2)}%)`);
      lines.push('');
    }
  }
  
  lines.push('─'.repeat(80));
  lines.push('RECOMMENDATIONS');
  lines.push('─'.repeat(80));
  
  for (const rec of result.recommendations) {
    lines.push(`[${rec.priority.toUpperCase()}] ${rec.title}`);
    lines.push(`    ${rec.description}`);
    lines.push(`    Impact: ${rec.impact}`);
    lines.push('');
  }
  
  lines.push('─'.repeat(80));
  lines.push('CHECKS PERFORMED');
  lines.push('─'.repeat(80));
  
  for (const check of result.auditInfo.checksPerformed) {
    lines.push(`  ✓ ${check}`);
  }
  
  lines.push('');
  lines.push('═'.repeat(80));
  lines.push('END OF AUDIT REPORT');
  lines.push('═'.repeat(80));
  
  return lines.join('\n');
}
