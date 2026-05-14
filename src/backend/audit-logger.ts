/**
 * Audit Trail Logger
 * Tracks all data operations for compliance and accountability
 */

import { db } from "./db";

export interface AuditEvent {
  timestamp: string;
  event_type: "IMPORT" | "EXPORT" | "VALIDATE" | "CALCULATE" | "TRANSFORM";
  record_count: number;
  operation: string;
  status: "SUCCESS" | "WARNING" | "ERROR";
  details: Record<string, unknown>;
}

class AuditLogger {
  private events: AuditEvent[] = [];
  private maxEvents = 1000;

  logEvent(event: Omit<AuditEvent, "timestamp">): void {
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.events.push(auditEvent);

    // Keep only recent events in memory
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Log to console for server monitoring
    console.log(`[AUDIT] ${auditEvent.event_type} | Records: ${auditEvent.record_count} | Status: ${auditEvent.status} | ${auditEvent.operation}`);
  }

  getEvents(filter?: { event_type?: string; status?: string }): AuditEvent[] {
    let filtered = this.events;

    if (filter?.event_type) {
      filtered = filtered.filter(e => e.event_type === filter.event_type);
    }
    if (filter?.status) {
      filtered = filtered.filter(e => e.status === filter.status);
    }

    return filtered;
  }

  getEventSummary() {
    const summary = {
      totalEvents: this.events.length,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      recentEvents: this.events.slice(-10),
    };

    for (const event of this.events) {
      summary.byType[event.event_type] = (summary.byType[event.event_type] || 0) + 1;
      summary.byStatus[event.status] = (summary.byStatus[event.status] || 0) + 1;
    }

    return summary;
  }

  clearEvents(): void {
    this.events = [];
  }
}

export const auditLogger = new AuditLogger();

/**
 * Log data import event
 */
export function logDataImport(recordCount: number, source: string, status: "SUCCESS" | "ERROR" = "SUCCESS"): void {
  auditLogger.logEvent({
    event_type: "IMPORT",
    record_count: recordCount,
    operation: `Imported from ${source}`,
    status,
    details: { source, recordCount },
  });
}

/**
 * Log data export event
 */
export function logDataExport(recordCount: number, format: "PDF" | "EXCEL" | "CSV", status: "SUCCESS" | "ERROR" = "SUCCESS"): void {
  auditLogger.logEvent({
    event_type: "EXPORT",
    record_count: recordCount,
    operation: `Exported ${format} format`,
    status,
    details: { format, recordCount },
  });
}

/**
 * Log data validation event
 */
export function logDataValidation(passedTests: number, totalTests: number, status: "SUCCESS" | "WARNING" | "ERROR"): void {
  auditLogger.logEvent({
    event_type: "VALIDATE",
    record_count: totalTests,
    operation: `Validation test suite (${passedTests}/${totalTests} passed)`,
    status,
    details: { passedTests, totalTests, successRate: (passedTests / totalTests) * 100 },
  });
}

/**
 * Log metrics calculation event
 */
export function logMetricsCalculation(totalRecords: number, status: "SUCCESS" | "ERROR" = "SUCCESS"): void {
  auditLogger.logEvent({
    event_type: "CALCULATE",
    record_count: totalRecords,
    operation: "Calculated aggregated metrics",
    status,
    details: { totalRecords },
  });
}

/**
 * Log data transformation event
 */
export function logDataTransformation(recordCount: number, transformationType: string, status: "SUCCESS" | "ERROR" = "SUCCESS"): void {
  auditLogger.logEvent({
    event_type: "TRANSFORM",
    record_count: recordCount,
    operation: `Transform: ${transformationType}`,
    status,
    details: { transformationType, recordCount },
  });
}
