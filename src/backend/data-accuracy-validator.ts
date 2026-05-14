/**
 * Data Accuracy Validator
 * 
 * Ensures 100% accuracy between displayed metrics and backend data sources.
 * Implements real-time verification, consistency checks, and audit logging.
 * 
 * @module DataAccuracyValidator
 * @version 1.0.0
 */

import {
  getMetricsFromCache,
  ValidatedMetrics,
  getAllRecordsFromCache,
  getTopCustomersFromCache,
  getTopFieldNoticesFromCache,
  getCachedAggregations
} from './csv-data-service';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface DataValidationResult {
  isValid: boolean;
  timestamp: string;
  checks: ValidationCheck[];
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  metrics: {
    uniqueCustomers: number;
    uniqueFieldNotices: number;
    totalAssets: number;
    vulnerable: number;
    potentiallyVulnerable: number;
    notVulnerable: number;
  };
  dataFreshness: {
    lastUpdated: string;
    ageInSeconds: number;
    isStale: boolean;
    staleDefinitionSeconds: number;
  };
}

export interface ValidationCheck {
  name: string;
  category: 'accuracy' | 'consistency' | 'completeness' | 'freshness';
  status: 'pass' | 'fail' | 'warning';
  expected: string | number;
  actual: string | number;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface DataDiscrepancy {
  id: string;
  detectedAt: string;
  field: string;
  expectedValue: string | number;
  actualValue: string | number;
  source: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  resolved: boolean;
  resolvedAt?: string;
}

export interface AuditLogEntry {
  timestamp: string;
  action: 'validation' | 'discrepancy_detected' | 'discrepancy_resolved' | 'data_refresh';
  details: Record<string, unknown>;
  success: boolean;
  duration: number;
}

// ==========================================
// CONFIGURATION
// ==========================================

const STALE_DATA_THRESHOLD_SECONDS = 300; // 5 minutes
const VALIDATION_INTERVAL_MS = 60000; // 1 minute
const MAX_AUDIT_LOG_ENTRIES = 1000;

// ==========================================
// DATA ACCURACY VALIDATOR CLASS
// ==========================================

export class DataAccuracyValidator {
  private static instance: DataAccuracyValidator;
  private discrepancies: DataDiscrepancy[] = [];
  private auditLog: AuditLogEntry[] = [];
  private lastValidation: DataValidationResult | null = null;
  private validationInterval: NodeJS.Timeout | null = null;
  private dataVersion: number = 0;

  private constructor() {
    console.log('[DataAccuracyValidator] Initialized');
  }

  public static getInstance(): DataAccuracyValidator {
    if (!DataAccuracyValidator.instance) {
      DataAccuracyValidator.instance = new DataAccuracyValidator();
    }
    return DataAccuracyValidator.instance;
  }

  // ==========================================
  // MAIN VALIDATION METHODS
  // ==========================================

  /**
   * Run comprehensive data validation
   * Cross-checks all displayed metrics against backend sources
   */
  async runFullValidation(): Promise<DataValidationResult> {
    const startTime = Date.now();
    const checks: ValidationCheck[] = [];

    try {
      // Get metrics from primary data source
      const metrics = await getMetricsFromCache();
      const aggregations = await getCachedAggregations();
      const records = await getAllRecordsFromCache();
      const topCustomers = await getTopCustomersFromCache({}, 1000);
      const topFieldNotices = await getTopFieldNoticesFromCache({}, 1000);

      // ==========================================
      // CHECK 1: Customer Count Accuracy
      // ==========================================
      const uniqueCustomersFromRecords = new Set(
        records.filter(r => r.isValid && r.normalizedCustomer).map(r => r.normalizedCustomer)
      ).size;
      
      checks.push({
        name: 'Customer Count Accuracy',
        category: 'accuracy',
        status: metrics.uniqueCustomers === uniqueCustomersFromRecords ? 'pass' : 'fail',
        expected: uniqueCustomersFromRecords,
        actual: metrics.uniqueCustomers,
        message: metrics.uniqueCustomers === uniqueCustomersFromRecords 
          ? `Customer count verified: ${metrics.uniqueCustomers} customers`
          : `DISCREPANCY: Expected ${uniqueCustomersFromRecords} customers, got ${metrics.uniqueCustomers}`,
        severity: 'critical'
      });

      // ==========================================
      // CHECK 2: Field Notice Count Accuracy
      // ==========================================
      const uniqueFNFromRecords = new Set(
        records.filter(r => r.isValid && r.fieldNoticeFormatted).map(r => r.fieldNoticeFormatted)
      ).size;
      
      checks.push({
        name: 'Field Notice Count Accuracy',
        category: 'accuracy',
        status: metrics.uniqueFieldNotices === uniqueFNFromRecords ? 'pass' : 'fail',
        expected: uniqueFNFromRecords,
        actual: metrics.uniqueFieldNotices,
        message: metrics.uniqueFieldNotices === uniqueFNFromRecords
          ? `Field notice count verified: ${metrics.uniqueFieldNotices} FNs`
          : `DISCREPANCY: Expected ${uniqueFNFromRecords} FNs, got ${metrics.uniqueFieldNotices}`,
        severity: 'critical'
      });

      // ==========================================
      // CHECK 3: Total Assets Consistency
      // ==========================================
      const calculatedTotal = metrics.vulnerable + metrics.potentiallyVulnerable + metrics.notVulnerable;
      const totalDiff = Math.abs(calculatedTotal - metrics.totalAssessed);
      
      checks.push({
        name: 'Total Assets Consistency',
        category: 'consistency',
        status: totalDiff <= 1 ? 'pass' : 'fail',
        expected: metrics.totalAssessed,
        actual: calculatedTotal,
        message: totalDiff <= 1
          ? `Asset totals consistent: ${metrics.totalAssessed.toLocaleString()} total`
          : `DISCREPANCY: Sum of categories (${calculatedTotal.toLocaleString()}) differs from total (${metrics.totalAssessed.toLocaleString()})`,
        severity: 'high'
      });

      // ==========================================
      // CHECK 4: Top Customers Data Consistency
      // ==========================================
      const topCustomerCount = topCustomers.length;
      const expectedTopCustomers = Math.min(1000, metrics.uniqueCustomers);
      
      checks.push({
        name: 'Top Customers Availability',
        category: 'completeness',
        status: topCustomerCount === expectedTopCustomers ? 'pass' : topCustomerCount > 0 ? 'warning' : 'fail',
        expected: expectedTopCustomers,
        actual: topCustomerCount,
        message: topCustomerCount === expectedTopCustomers
          ? `All ${topCustomerCount} customers available for analysis`
          : `Retrieved ${topCustomerCount} of ${expectedTopCustomers} expected customers`,
        severity: 'medium'
      });

      // ==========================================
      // CHECK 5: Top Field Notices Data Consistency
      // ==========================================
      const topFNCount = topFieldNotices.length;
      const expectedTopFN = Math.min(1000, metrics.uniqueFieldNotices);
      
      checks.push({
        name: 'Top Field Notices Availability',
        category: 'completeness',
        status: topFNCount === expectedTopFN ? 'pass' : topFNCount > 0 ? 'warning' : 'fail',
        expected: expectedTopFN,
        actual: topFNCount,
        message: topFNCount === expectedTopFN
          ? `All ${topFNCount} field notices available for analysis`
          : `Retrieved ${topFNCount} of ${expectedTopFN} expected field notices`,
        severity: 'medium'
      });

      // ==========================================
      // CHECK 6: Non-Zero Customer Validation
      // ==========================================
      checks.push({
        name: 'Non-Zero Customer Count',
        category: 'accuracy',
        status: metrics.uniqueCustomers > 0 ? 'pass' : 'fail',
        expected: '>0',
        actual: metrics.uniqueCustomers,
        message: metrics.uniqueCustomers > 0
          ? `Customer count is valid: ${metrics.uniqueCustomers}`
          : 'CRITICAL: Customer count is 0 - data may not be loaded',
        severity: 'critical'
      });

      // ==========================================
      // CHECK 7: Data Freshness
      // ==========================================
      const dataAge = metrics.validation.dataSourceTimestamp 
        ? (Date.now() - metrics.validation.dataSourceTimestamp) / 1000 
        : 0;
      const isStale = dataAge > STALE_DATA_THRESHOLD_SECONDS;
      
      checks.push({
        name: 'Data Freshness',
        category: 'freshness',
        status: !isStale ? 'pass' : 'warning',
        expected: `< ${STALE_DATA_THRESHOLD_SECONDS}s`,
        actual: `${Math.round(dataAge)}s`,
        message: !isStale
          ? `Data is fresh (${Math.round(dataAge)}s old)`
          : `Data may be stale (${Math.round(dataAge)}s old, threshold: ${STALE_DATA_THRESHOLD_SECONDS}s)`,
        severity: 'low'
      });

      // ==========================================
      // CHECK 8: Aggregation Consistency
      // ==========================================
      const aggCustomerCount = aggregations.uniqueCustomers.size;
      const aggFNCount = aggregations.uniqueFieldNotices.size;
      
      checks.push({
        name: 'Aggregation Cache Consistency',
        category: 'consistency',
        status: aggCustomerCount === metrics.uniqueCustomers && aggFNCount === metrics.uniqueFieldNotices ? 'pass' : 'fail',
        expected: `${metrics.uniqueCustomers} customers, ${metrics.uniqueFieldNotices} FNs`,
        actual: `${aggCustomerCount} customers, ${aggFNCount} FNs`,
        message: aggCustomerCount === metrics.uniqueCustomers && aggFNCount === metrics.uniqueFieldNotices
          ? 'Aggregation cache is consistent with metrics'
          : 'DISCREPANCY: Aggregation cache differs from metrics',
        severity: 'high'
      });

      // ==========================================
      // BUILD RESULT
      // ==========================================
      const passedChecks = checks.filter(c => c.status === 'pass').length;
      const failedChecks = checks.filter(c => c.status === 'fail').length;
      const warningChecks = checks.filter(c => c.status === 'warning').length;

      const result: DataValidationResult = {
        isValid: failedChecks === 0,
        timestamp: new Date().toISOString(),
        checks,
        summary: {
          totalChecks: checks.length,
          passed: passedChecks,
          failed: failedChecks,
          warnings: warningChecks
        },
        metrics: {
          uniqueCustomers: metrics.uniqueCustomers,
          uniqueFieldNotices: metrics.uniqueFieldNotices,
          totalAssets: metrics.totalAssessed,
          vulnerable: metrics.vulnerable,
          potentiallyVulnerable: metrics.potentiallyVulnerable,
          notVulnerable: metrics.notVulnerable
        },
        dataFreshness: {
          lastUpdated: metrics.validation.lastVerifiedAt,
          ageInSeconds: Math.round(dataAge),
          isStale,
          staleDefinitionSeconds: STALE_DATA_THRESHOLD_SECONDS
        }
      };

      // Log any discrepancies
      for (const check of checks) {
        if (check.status === 'fail') {
          this.recordDiscrepancy({
            id: `${Date.now()}-${check.name.replace(/\s+/g, '-')}`,
            detectedAt: new Date().toISOString(),
            field: check.name,
            expectedValue: check.expected,
            actualValue: check.actual,
            source: 'validation',
            severity: check.severity,
            resolved: false
          });
        }
      }

      // Update last validation
      this.lastValidation = result;
      this.dataVersion++;

      // Log audit entry
      this.logAudit('validation', {
        checksPerformed: checks.length,
        passed: passedChecks,
        failed: failedChecks,
        metrics: result.metrics
      }, failedChecks === 0, Date.now() - startTime);

      console.log(`[DataAccuracyValidator] Validation complete: ${passedChecks}/${checks.length} passed, ${failedChecks} failed, ${warningChecks} warnings (${Date.now() - startTime}ms)`);

      return result;

    } catch (error) {
      console.error('[DataAccuracyValidator] Validation error:', error);
      this.logAudit('validation', { error: String(error) }, false, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Quick validation for real-time checks
   * Faster than full validation, checks critical metrics only
   */
  async runQuickValidation(): Promise<{ isValid: boolean; metrics: ValidatedMetrics }> {
    const metrics = await getMetricsFromCache();
    
    const isValid = 
      metrics.uniqueCustomers > 0 &&
      metrics.uniqueFieldNotices > 0 &&
      metrics.totalAssessed > 0 &&
      metrics.validation.isValid;
    
    return { isValid, metrics };
  }

  /**
   * Get validated metrics with data freshness indicator
   * Use this instead of getMetricsFromCache for UI display
   */
  async getValidatedMetricsForDisplay(): Promise<{
    metrics: ValidatedMetrics;
    displayInfo: {
      lastVerified: string;
      freshnessLabel: string;
      isReliable: boolean;
      warningMessage?: string;
    };
  }> {
    const metrics = await getMetricsFromCache();
    const now = Date.now();
    const ageMs = now - (metrics.validation.dataSourceTimestamp || now);
    const ageSeconds = Math.round(ageMs / 1000);
    
    let freshnessLabel: string;
    if (ageSeconds < 60) {
      freshnessLabel = 'Just now';
    } else if (ageSeconds < 300) {
      freshnessLabel = `Updated ${Math.floor(ageSeconds / 60)} minute${Math.floor(ageSeconds / 60) > 1 ? 's' : ''} ago`;
    } else if (ageSeconds < 3600) {
      freshnessLabel = `Updated ${Math.floor(ageSeconds / 60)} minutes ago`;
    } else {
      freshnessLabel = `Updated ${Math.floor(ageSeconds / 3600)} hour${Math.floor(ageSeconds / 3600) > 1 ? 's' : ''} ago`;
    }
    
    const isReliable = metrics.validation.isValid && ageSeconds < STALE_DATA_THRESHOLD_SECONDS;
    let warningMessage: string | undefined;
    
    if (!metrics.validation.isValid) {
      warningMessage = `Data validation issues detected: ${metrics.validation.discrepancies.join(', ')}`;
    } else if (ageSeconds >= STALE_DATA_THRESHOLD_SECONDS) {
      warningMessage = 'Data may be stale. Consider refreshing.';
    }
    
    return {
      metrics,
      displayInfo: {
        lastVerified: metrics.validation.lastVerifiedAt,
        freshnessLabel,
        isReliable,
        warningMessage
      }
    };
  }

  // ==========================================
  // DISCREPANCY MANAGEMENT
  // ==========================================

  private recordDiscrepancy(discrepancy: DataDiscrepancy): void {
    // Check for duplicate
    const existing = this.discrepancies.find(
      d => d.field === discrepancy.field && !d.resolved
    );
    
    if (!existing) {
      this.discrepancies.push(discrepancy);
      console.warn(`[DataAccuracyValidator] Discrepancy recorded: ${discrepancy.field}`);
      
      this.logAudit('discrepancy_detected', {
        field: discrepancy.field,
        expected: discrepancy.expectedValue,
        actual: discrepancy.actualValue,
        severity: discrepancy.severity
      }, true, 0);
    }
  }

  resolveDiscrepancy(id: string): void {
    const discrepancy = this.discrepancies.find(d => d.id === id);
    if (discrepancy) {
      discrepancy.resolved = true;
      discrepancy.resolvedAt = new Date().toISOString();
      
      this.logAudit('discrepancy_resolved', { id, field: discrepancy.field }, true, 0);
    }
  }

  getActiveDiscrepancies(): DataDiscrepancy[] {
    return this.discrepancies.filter(d => !d.resolved);
  }

  getAllDiscrepancies(): DataDiscrepancy[] {
    return [...this.discrepancies];
  }

  // ==========================================
  // AUDIT LOGGING
  // ==========================================

  private logAudit(
    action: AuditLogEntry['action'],
    details: Record<string, unknown>,
    success: boolean,
    duration: number
  ): void {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      action,
      details,
      success,
      duration
    };
    
    this.auditLog.push(entry);
    
    // Keep log size bounded
    if (this.auditLog.length > MAX_AUDIT_LOG_ENTRIES) {
      this.auditLog = this.auditLog.slice(-MAX_AUDIT_LOG_ENTRIES);
    }
  }

  getAuditLog(limit?: number): AuditLogEntry[] {
    const logs = [...this.auditLog].reverse();
    return limit ? logs.slice(0, limit) : logs;
  }

  // ==========================================
  // MONITORING
  // ==========================================

  startAutomaticValidation(): void {
    if (this.validationInterval) {
      return;
    }
    
    this.validationInterval = setInterval(async () => {
      try {
        await this.runQuickValidation();
      } catch (error) {
        console.error('[DataAccuracyValidator] Automatic validation failed:', error);
      }
    }, VALIDATION_INTERVAL_MS);
    
    console.log('[DataAccuracyValidator] Automatic validation started');
  }

  stopAutomaticValidation(): void {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = null;
      console.log('[DataAccuracyValidator] Automatic validation stopped');
    }
  }

  // ==========================================
  // GETTERS
  // ==========================================

  getLastValidationResult(): DataValidationResult | null {
    return this.lastValidation;
  }

  getDataVersion(): number {
    return this.dataVersion;
  }
}

// Singleton export
export const dataAccuracyValidator = DataAccuracyValidator.getInstance();
