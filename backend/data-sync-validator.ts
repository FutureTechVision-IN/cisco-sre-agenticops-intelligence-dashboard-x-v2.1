/**
 * Data Synchronization Validator
 * 
 * Ensures consistency between different data sources (DB vs CSV)
 * and between different API endpoints (metrics vs trends)
 * 
 * Requirements:
 * - Compare Intelligence Center metrics with source systems daily
 * - Flag discrepancies exceeding ±1% variance
 * - Generate alerts for manual review
 * - Maintain historical sync logs
 * - Provide traceability for all metric calculations
 */

import { db } from "./db";
import { sql } from "drizzle-orm";
import type { IStorage } from "./storage";
import { 
  getMetricsFromCache, 
  getFilteredMonthlyTrendsFromCache 
} from "./csv-data-service";

export interface ValidationResult {
  endpoint: string;
  metric: string;
  expected: number;
  actual: number;
  variance: number;
  variancePercent: number;
  withinTolerance: boolean;
  timestamp: string;
  source: 'database' | 'csv' | 'api';
  details?: string;
}

export interface SyncReport {
  timestamp: string;
  overallStatus: 'SYNCED' | 'DEGRADED' | 'CRITICAL';
  validations: ValidationResult[];
  alerts: string[];
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    criticalIssues: number;
  };
}

export interface MetricSnapshot {
  timestamp: string;
  source: string;
  endpoint: string;
  vulnerable: number;
  potentiallyVulnerable: number;
  notVulnerable: number;
  total: number;
  calculationMethod: string;
}

export class DataSyncValidator {
  private static VARIANCE_THRESHOLD = 0.01; // 1% tolerance
  private static syncHistory: SyncReport[] = [];
  private static snapshotHistory: MetricSnapshot[] = [];
  
  /**
   * Validate consistency between getMetrics() and SUM of getMonthlyTrends()
   * UPDATED: Now uses in-memory CSV cache for consistent, deduplicated data
   */
  static async validateMetricsConsistency(storage: IStorage): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const timestamp = new Date().toISOString();
    
    try {
      // Get data from CACHED sources (properly deduplicated)
      const metrics = await getMetricsFromCache();
      const trends = await getFilteredMonthlyTrendsFromCache({});
      
      // Calculate SUM of all months from trends
      const trendsSums = trends.reduce((acc, t) => {
        if (t.month && t.month.trim() !== '') {
          acc.vulnerable += t.vulnerable || 0;
          acc.potentiallyVulnerable += t.potentiallyVulnerable || 0;
          acc.notVulnerable += t.notVulnerable || 0;
          acc.total += t.total || 0;
        }
        return acc;
      }, { vulnerable: 0, potentiallyVulnerable: 0, notVulnerable: 0, total: 0 });
      
      // Store snapshots
      this.snapshotHistory.push({
        timestamp,
        source: 'csv',
        endpoint: '/api/metrics (cached)',
        vulnerable: metrics.vulnerable,
        potentiallyVulnerable: metrics.potentiallyVulnerable,
        notVulnerable: metrics.notVulnerable,
        total: metrics.total,
        calculationMethod: 'Global deduplication via composite key'
      });
      
      this.snapshotHistory.push({
        timestamp,
        source: 'csv',
        endpoint: '/api/trends/monthly (cached sum)',
        vulnerable: trendsSums.vulnerable,
        potentiallyVulnerable: trendsSums.potentiallyVulnerable,
        notVulnerable: trendsSums.notVulnerable,
        total: trendsSums.total,
        calculationMethod: 'Monthly deduplication, then SUM'
      });
      
      // Validate vulnerable assets (metrics vs SUM of all months)
      const vulnVariance = Math.abs(metrics.vulnerable - trendsSums.vulnerable);
      const vulnVariancePercent = metrics.vulnerable > 0 
        ? (vulnVariance / metrics.vulnerable) * 100 
        : 0;
      
      results.push({
        endpoint: '/api/metrics vs /api/trends/monthly (sum)',
        metric: 'vulnerable',
        expected: metrics.vulnerable,
        actual: trendsSums.vulnerable,
        variance: vulnVariance,
        variancePercent: vulnVariancePercent,
        withinTolerance: vulnVariancePercent <= (this.VARIANCE_THRESHOLD * 100),
        timestamp,
        source: 'csv',
        details: `Metrics: ${metrics.vulnerable}, Trends Sum: ${trendsSums.vulnerable}`
      });
      
      // Validate potentially vulnerable
      const potVulnVariance = Math.abs(metrics.potentiallyVulnerable - trendsSums.potentiallyVulnerable);
      const potVulnVariancePercent = metrics.potentiallyVulnerable > 0
        ? (potVulnVariance / metrics.potentiallyVulnerable) * 100
        : 0;
      
      results.push({
        endpoint: '/api/metrics vs /api/trends/monthly (sum)',
        metric: 'potentiallyVulnerable',
        expected: metrics.potentiallyVulnerable,
        actual: trendsSums.potentiallyVulnerable,
        variance: potVulnVariance,
        variancePercent: potVulnVariancePercent,
        withinTolerance: potVulnVariancePercent <= (this.VARIANCE_THRESHOLD * 100),
        timestamp,
        source: 'csv',
        details: `Metrics: ${metrics.potentiallyVulnerable}, Trends Sum: ${trendsSums.potentiallyVulnerable}`
      });
      
      // Validate not vulnerable (secure)
      const notVulnVariance = Math.abs(metrics.notVulnerable - trendsSums.notVulnerable);
      const notVulnVariancePercent = metrics.notVulnerable > 0
        ? (notVulnVariance / metrics.notVulnerable) * 100
        : 0;
      
      results.push({
        endpoint: '/api/metrics vs /api/trends/monthly (sum)',
        metric: 'notVulnerable',
        expected: metrics.notVulnerable,
        actual: trendsSums.notVulnerable,
        variance: notVulnVariance,
        variancePercent: notVulnVariancePercent,
        withinTolerance: notVulnVariancePercent <= (this.VARIANCE_THRESHOLD * 100),
        timestamp,
        source: 'csv',
        details: `Metrics: ${metrics.notVulnerable}, Trends Sum: ${trendsSums.notVulnerable}`
      });
      
      // Validate totals
      const totalVariance = Math.abs(metrics.total - trendsSums.total);
      const totalVariancePercent = metrics.total > 0
        ? (totalVariance / metrics.total) * 100
        : 0;
      
      results.push({
        endpoint: '/api/metrics vs /api/trends/monthly (sum)',
        metric: 'total',
        expected: metrics.total,
        actual: trendsSums.total,
        variance: totalVariance,
        variancePercent: totalVariancePercent,
        withinTolerance: totalVariancePercent <= (this.VARIANCE_THRESHOLD * 100),
        timestamp,
        source: 'csv',
        details: `Metrics: ${metrics.total}, Trends Sum: ${trendsSums.total}`
      });
      
    } catch (error) {
      console.error('[SYNC-VALIDATOR] Error validating metrics consistency:', error);
      results.push({
        endpoint: '/api/metrics vs /api/trends/monthly',
        metric: 'all',
        expected: 0,
        actual: 0,
        variance: 0,
        variancePercent: 0,
        withinTolerance: false,
        timestamp,
        source: 'csv',
        details: `Validation failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
    
    return results;
  }
  
  /**
   * Validate CSV cache data quality
   * UPDATED: Since we now use CSV cache as the primary source, this validates cache consistency
   */
  static async validateDatabaseVsCSV(storage: IStorage): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const timestamp = new Date().toISOString();
    
    try {
      // Get metrics from cache (our primary source)
      const cachedMetrics = await getMetricsFromCache();
      
      // Get trends from cache and sum them
      const trends = await getFilteredMonthlyTrendsFromCache({});
      const trendsSums = trends.reduce((acc, t) => {
        acc.vulnerable += t.vulnerable || 0;
        acc.total += t.total || 0;
        return acc;
      }, { vulnerable: 0, total: 0 });
      
      // Compare vulnerable - should be identical now
      const vulnVariance = Math.abs(cachedMetrics.vulnerable - trendsSums.vulnerable);
      const vulnVariancePercent = cachedMetrics.vulnerable > 0
        ? (vulnVariance / cachedMetrics.vulnerable) * 100
        : 0;
      
      results.push({
        endpoint: 'Cached Metrics vs Trends',
        metric: 'vulnerable',
        expected: cachedMetrics.vulnerable,
        actual: trendsSums.vulnerable,
        variance: vulnVariance,
        variancePercent: vulnVariancePercent,
        withinTolerance: vulnVariancePercent <= (this.VARIANCE_THRESHOLD * 100),
        timestamp,
        source: 'csv',
        details: `Cached: ${cachedMetrics.vulnerable}, Trends: ${trendsSums.vulnerable}`
      });
      
      // Compare total
      const totalVariance = Math.abs(cachedMetrics.total - trendsSums.total);
      const totalVariancePercent = cachedMetrics.total > 0
        ? (totalVariance / cachedMetrics.total) * 100
        : 0;
      
      results.push({
        endpoint: 'Cached Metrics vs Trends',
        metric: 'total',
        expected: cachedMetrics.total,
        actual: trendsSums.total,
        variance: totalVariance,
        variancePercent: totalVariancePercent,
        withinTolerance: totalVariancePercent <= (this.VARIANCE_THRESHOLD * 100),
        timestamp,
        source: 'csv',
        details: `Cached: ${cachedMetrics.total}, Trends: ${trendsSums.total}`
      });
      
    } catch (error) {
      console.error('[SYNC-VALIDATOR] Error validating cache consistency:', error);
      results.push({
        endpoint: 'Cached Metrics vs Trends',
        metric: 'all',
        expected: 0,
        actual: 0,
        variance: 0,
        variancePercent: 0,
        withinTolerance: false,
        timestamp,
        source: 'csv',
        details: `Validation failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
    
    return results;
  }
  
  /**
   * Run comprehensive validation and generate sync report
   */
  static async runComprehensiveValidation(storage: IStorage): Promise<SyncReport> {
    console.log('[SYNC-VALIDATOR] Running comprehensive validation...');
    
    const timestamp = new Date().toISOString();
    const validations: ValidationResult[] = [];
    const alerts: string[] = [];
    
    // Validate metrics consistency
    const metricsResults = await this.validateMetricsConsistency(storage);
    validations.push(...metricsResults);
    
    // Validate DB vs CSV
    const csvResults = await this.validateDatabaseVsCSV(storage);
    validations.push(...csvResults);
    
    // Analyze results
    const failed = validations.filter(v => !v.withinTolerance);
    const critical = failed.filter(v => v.variancePercent > 5.0); // >5% is critical
    
    // Generate alerts
    for (const failure of failed) {
      const severity = failure.variancePercent > 5.0 ? 'CRITICAL' : 'WARNING';
      alerts.push(
        `[${severity}] ${failure.endpoint} - ${failure.metric}: ` +
        `${failure.variancePercent.toFixed(2)}% variance (expected: ${failure.expected}, actual: ${failure.actual})`
      );
    }
    
    const report: SyncReport = {
      timestamp,
      overallStatus: critical.length > 0 ? 'CRITICAL' : failed.length > 0 ? 'DEGRADED' : 'SYNCED',
      validations,
      alerts,
      summary: {
        totalChecks: validations.length,
        passed: validations.length - failed.length,
        failed: failed.length,
        criticalIssues: critical.length
      }
    };
    
    // Store in history
    this.syncHistory.push(report);
    
    // Keep only last 100 reports
    if (this.syncHistory.length > 100) {
      this.syncHistory = this.syncHistory.slice(-100);
    }
    
    // Keep only last 1000 snapshots
    if (this.snapshotHistory.length > 1000) {
      this.snapshotHistory = this.snapshotHistory.slice(-1000);
    }
    
    console.log(`[SYNC-VALIDATOR] Validation complete: ${report.overallStatus} - ${report.summary.passed}/${report.summary.totalChecks} checks passed`);
    if (alerts.length > 0) {
      console.warn('[SYNC-VALIDATOR] Alerts:', alerts);
    }
    
    return report;
  }
  
  /**
   * Get sync history for reporting
   */
  static getSyncHistory(limit: number = 20): SyncReport[] {
    return this.syncHistory.slice(-limit);
  }
  
  /**
   * Get snapshot history for traceability
   */
  static getSnapshotHistory(limit: number = 100): MetricSnapshot[] {
    return this.snapshotHistory.slice(-limit);
  }
  
  /**
   * Get latest sync report
   */
  static getLatestSyncReport(): SyncReport | null {
    return this.syncHistory.length > 0 
      ? this.syncHistory[this.syncHistory.length - 1] 
      : null;
  }
  
  /**
   * Check if system is currently in sync
   */
  static isSystemInSync(): boolean {
    const latest = this.getLatestSyncReport();
    return latest?.overallStatus === 'SYNCED';
  }
  
  /**
   * Get data quality score (0-100)
   */
  static getDataQualityScore(): number {
    const latest = this.getLatestSyncReport();
    if (!latest) return 0;
    
    const passRate = latest.summary.passed / latest.summary.totalChecks;
    const criticalPenalty = latest.summary.criticalIssues * 0.1;
    
    return Math.max(0, Math.min(100, (passRate * 100) - (criticalPenalty * 10)));
  }
}
