/**
 * Automated Data Synchronization Monitoring Service
 * 
 * Runs scheduled validation checks and generates alerts
 * Implements requirements for:
 * - Daily automated validation
 * - Alert generation for discrepancies >1%
 * - Historical logging
 * - Weekly validation reports
 */

import { DataSyncValidator } from './data-sync-validator';
import type { IStorage } from './storage';

export interface AlertThresholdConfig {
  variancePercent: number;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  notificationChannel?: 'email' | 'slack' | 'log';
}

export interface MonitoringConfig {
  enabled: boolean;
  validationIntervalMinutes: number;
  dailyReportHour: number; // 0-23
  weeklyReportDay: number; // 0-6 (Sunday-Saturday)
  alertThresholds: {
    info: number;      // 0.5%
    warning: number;   // 1.0%
    critical: number;  // 5.0%
  };
}

export class SyncMonitorService {
  private static instance: SyncMonitorService;
  private validationTimer: NodeJS.Timeout | null = null;
  private dailyReportTimer: NodeJS.Timeout | null = null;
  private weeklyReportTimer: NodeJS.Timeout | null = null;
  private storage: IStorage;
  private config: MonitoringConfig;
  
  private constructor(storage: IStorage, config: Partial<MonitoringConfig> = {}) {
    this.storage = storage;
    this.config = {
      enabled: config.enabled ?? true,
      validationIntervalMinutes: config.validationIntervalMinutes ?? 60, // Default: hourly
      dailyReportHour: config.dailyReportHour ?? 9, // Default: 9 AM
      weeklyReportDay: config.weeklyReportDay ?? 1, // Default: Monday
      alertThresholds: {
        info: config.alertThresholds?.info ?? 0.5,
        warning: config.alertThresholds?.warning ?? 1.0,
        critical: config.alertThresholds?.critical ?? 5.0
      }
    };
  }
  
  static initialize(storage: IStorage, config?: Partial<MonitoringConfig>): SyncMonitorService {
    if (!SyncMonitorService.instance) {
      SyncMonitorService.instance = new SyncMonitorService(storage, config);
    }
    return SyncMonitorService.instance;
  }
  
  static getInstance(): SyncMonitorService | null {
    return SyncMonitorService.instance || null;
  }
  
  /**
   * Start automated monitoring
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('[SYNC-MONITOR] Service is disabled');
      return;
    }
    
    console.log('[SYNC-MONITOR] Starting automated monitoring service...');
    
    // Run initial validation
    this.runValidation();
    
    // Schedule periodic validations
    const intervalMs = this.config.validationIntervalMinutes * 60 * 1000;
    this.validationTimer = setInterval(() => {
      this.runValidation();
    }, intervalMs);
    
    // Schedule daily reports
    this.scheduleDailyReport();
    
    // Schedule weekly reports
    this.scheduleWeeklyReport();
    
    console.log(`[SYNC-MONITOR] Service started - Validation every ${this.config.validationIntervalMinutes} minutes`);
  }
  
  /**
   * Stop automated monitoring
   */
  stop(): void {
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
      this.validationTimer = null;
    }
    if (this.dailyReportTimer) {
      clearTimeout(this.dailyReportTimer);
      this.dailyReportTimer = null;
    }
    if (this.weeklyReportTimer) {
      clearTimeout(this.weeklyReportTimer);
      this.weeklyReportTimer = null;
    }
    console.log('[SYNC-MONITOR] Service stopped');
  }
  
  /**
   * Run validation check and generate alerts
   */
  private async runValidation(): Promise<void> {
    try {
      const report = await DataSyncValidator.runComprehensiveValidation(this.storage);
      
      // Process alerts based on thresholds
      for (const validation of report.validations) {
        if (!validation.withinTolerance) {
          const severity = this.getSeverity(validation.variancePercent);
          this.generateAlert(validation, severity);
        }
      }
      
      // Log summary
      console.log(
        `[SYNC-MONITOR] Validation complete: ${report.overallStatus} - ` +
        `${report.summary.passed}/${report.summary.totalChecks} checks passed, ` +
        `Quality Score: ${DataSyncValidator.getDataQualityScore().toFixed(1)}%`
      );
      
    } catch (error) {
      console.error('[SYNC-MONITOR] Validation failed:', error);
    }
  }
  
  /**
   * Determine alert severity based on variance
   */
  private getSeverity(variancePercent: number): 'INFO' | 'WARNING' | 'CRITICAL' {
    if (variancePercent >= this.config.alertThresholds.critical) {
      return 'CRITICAL';
    } else if (variancePercent >= this.config.alertThresholds.warning) {
      return 'WARNING';
    } else {
      return 'INFO';
    }
  }
  
  /**
   * Generate alert for discrepancy
   */
  private generateAlert(validation: any, severity: string): void {
    const message = 
      `[${severity}] Data Sync Alert: ${validation.endpoint} - ${validation.metric} | ` +
      `Variance: ${validation.variancePercent.toFixed(2)}% | ` +
      `Expected: ${validation.expected.toLocaleString()}, ` +
      `Actual: ${validation.actual.toLocaleString()} | ` +
      `Time: ${new Date(validation.timestamp).toLocaleString()}`;
    
    switch (severity) {
      case 'CRITICAL':
        console.error(message);
        // TODO: Integrate with notification service (email, Slack, PagerDuty)
        break;
      case 'WARNING':
        console.warn(message);
        // TODO: Send warning notification
        break;
      default:
        console.info(message);
    }
  }
  
  /**
   * Schedule daily report
   */
  private scheduleDailyReport(): void {
    const now = new Date();
    const targetHour = this.config.dailyReportHour;
    
    let nextRun = new Date(now);
    nextRun.setHours(targetHour, 0, 0, 0);
    
    // If target hour has passed today, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    const msUntilNextRun = nextRun.getTime() - now.getTime();
    
    this.dailyReportTimer = setTimeout(() => {
      this.generateDailyReport();
      // Reschedule for next day
      this.scheduleDailyReport();
    }, msUntilNextRun);
    
    console.log(`[SYNC-MONITOR] Daily report scheduled for ${nextRun.toLocaleString()}`);
  }
  
  /**
   * Schedule weekly report
   */
  private scheduleWeeklyReport(): void {
    const now = new Date();
    const targetDay = this.config.weeklyReportDay;
    const targetHour = this.config.dailyReportHour;
    
    let nextRun = new Date(now);
    nextRun.setHours(targetHour, 0, 0, 0);
    
    // Calculate days until target day
    const currentDay = now.getDay();
    let daysUntilTarget = targetDay - currentDay;
    if (daysUntilTarget < 0) {
      daysUntilTarget += 7;
    } else if (daysUntilTarget === 0 && nextRun <= now) {
      daysUntilTarget = 7;
    }
    
    nextRun.setDate(nextRun.getDate() + daysUntilTarget);
    
    const msUntilNextRun = nextRun.getTime() - now.getTime();
    
    this.weeklyReportTimer = setTimeout(() => {
      this.generateWeeklyReport();
      // Reschedule for next week
      this.scheduleWeeklyReport();
    }, msUntilNextRun);
    
    console.log(`[SYNC-MONITOR] Weekly report scheduled for ${nextRun.toLocaleString()}`);
  }
  
  /**
   * Generate daily validation report
   */
  private generateDailyReport(): void {
    const history = DataSyncValidator.getSyncHistory(24); // Last 24 hours
    const latest = DataSyncValidator.getLatestSyncReport();
    const qualityScore = DataSyncValidator.getDataQualityScore();
    
    console.log('\n' + '='.repeat(80));
    console.log('DAILY DATA SYNCHRONIZATION REPORT');
    console.log(`Generated: ${new Date().toLocaleString()}`);
    console.log('='.repeat(80));
    console.log(`Current Status: ${latest?.overallStatus || 'UNKNOWN'}`);
    console.log(`Data Quality Score: ${qualityScore.toFixed(1)}%`);
    console.log(`Validations in Last 24h: ${history.length}`);
    
    if (latest) {
      console.log(`\nLatest Validation (${new Date(latest.timestamp).toLocaleString()}):`);
      console.log(`  - Total Checks: ${latest.summary.totalChecks}`);
      console.log(`  - Passed: ${latest.summary.passed}`);
      console.log(`  - Failed: ${latest.summary.failed}`);
      console.log(`  - Critical Issues: ${latest.summary.criticalIssues}`);
      
      if (latest.alerts.length > 0) {
        console.log('\nActive Alerts:');
        latest.alerts.forEach(alert => console.log(`  ${alert}`));
      }
    }
    
    console.log('='.repeat(80) + '\n');
  }
  
  /**
   * Generate weekly validation report
   */
  private generateWeeklyReport(): void {
    const history = DataSyncValidator.getSyncHistory(168); // Last 7 days (assuming hourly checks)
    const qualityScore = DataSyncValidator.getDataQualityScore();
    
    // Calculate weekly statistics
    const syncedCount = history.filter(r => r.overallStatus === 'SYNCED').length;
    const degradedCount = history.filter(r => r.overallStatus === 'DEGRADED').length;
    const criticalCount = history.filter(r => r.overallStatus === 'CRITICAL').length;
    
    const avgQualityScore = history.reduce((sum, r) => {
      return sum + (r.summary.passed / r.summary.totalChecks * 100);
    }, 0) / (history.length || 1);
    
    console.log('\n' + '='.repeat(80));
    console.log('WEEKLY DATA SYNCHRONIZATION REPORT');
    console.log(`Generated: ${new Date().toLocaleString()}`);
    console.log('='.repeat(80));
    console.log(`Period: Last 7 Days`);
    console.log(`Total Validations: ${history.length}`);
    console.log(`  - SYNCED: ${syncedCount} (${(syncedCount / history.length * 100).toFixed(1)}%)`);
    console.log(`  - DEGRADED: ${degradedCount} (${(degradedCount / history.length * 100).toFixed(1)}%)`);
    console.log(`  - CRITICAL: ${criticalCount} (${(criticalCount / history.length * 100).toFixed(1)}%)`);
    console.log(`\nAverage Quality Score: ${avgQualityScore.toFixed(1)}%`);
    console.log(`Current Quality Score: ${qualityScore.toFixed(1)}%`);
    
    // Most common issues
    const allAlerts = history.flatMap(r => r.alerts);
    console.log(`\nTotal Alerts: ${allAlerts.length}`);
    
    if (allAlerts.length > 0) {
      const criticalAlerts = allAlerts.filter(a => a.includes('[CRITICAL]')).length;
      const warningAlerts = allAlerts.filter(a => a.includes('[WARNING]')).length;
      console.log(`  - CRITICAL: ${criticalAlerts}`);
      console.log(`  - WARNING: ${warningAlerts}`);
    }
    
    console.log('='.repeat(80) + '\n');
  }
  
  /**
   * Get service status
   */
  getStatus(): {
    enabled: boolean;
    running: boolean;
    config: MonitoringConfig;
    lastValidation: string | null;
    qualityScore: number;
  } {
    const latest = DataSyncValidator.getLatestSyncReport();
    return {
      enabled: this.config.enabled,
      running: this.validationTimer !== null,
      config: this.config,
      lastValidation: latest?.timestamp || null,
      qualityScore: DataSyncValidator.getDataQualityScore()
    };
  }
}
