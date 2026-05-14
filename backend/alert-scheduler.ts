import * as cron from "node-cron";
import { generateReport, getScheduledReports } from "./report-service";
import { triggerAlert, createAlertTemplate } from "./alert-service";
import { db } from "./db";
import { fieldNoticeRecords } from "@shared/schema";
import { desc } from "drizzle-orm";

let scheduledJobs: Map<string, any> = new Map();
let dbBackedSchedulerDisabled = false;
type DashboardDb = NonNullable<typeof db>;

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function isDatabaseUnavailable(error: unknown): boolean {
  const maybeError = error as { code?: string; message?: string } | null;
  const message = (maybeError?.message || describeError(error)).toLowerCase();
  return (
    maybeError?.code === "28000" ||
    maybeError?.code === "3D000" ||
    message.includes("role \"postgres\" does not exist") ||
    message.includes("database not configured") ||
    message.includes("connection refused") ||
    message.includes("password authentication failed")
  );
}

function disableDbBackedJobs(reason: string): void {
  if (dbBackedSchedulerDisabled) return;
  dbBackedSchedulerDisabled = true;
  console.warn(
    `[SCHEDULER] Disabling DB-backed scheduled jobs for this process: ${reason}`,
  );
  stopScheduler();
}

function handleSchedulerError(jobName: string, error: unknown): void {
  if (isDatabaseUnavailable(error)) {
    disableDbBackedJobs(`${jobName} cannot reach a usable database (${describeError(error)})`);
    return;
  }
  console.error(`[SCHEDULER-ERROR] ${jobName} failed:`, error);
}

// Initialize alert and report scheduler
export function initializeScheduler(): void {
  console.log("[SCHEDULER] Initializing alert and report scheduler");

  if (process.env.DISABLE_DB_SCHEDULER === "true") {
    console.log("[SCHEDULER] DB-backed scheduled jobs disabled by DISABLE_DB_SCHEDULER=true");
    return;
  }

  if (!db) {
    console.log("[SCHEDULER] Database is not configured; skipping DB-backed scheduled jobs");
    return;
  }

  // Schedule report generation - daily check at 2 AM
  scheduleReportGeneration();

  // Schedule anomaly detection checks - every 15 minutes
  scheduleAnomalyDetection(db);

  // Schedule vulnerability threshold checks - every hour
  scheduleThresholdChecks(db);

  console.log("[SCHEDULER] Scheduler initialized successfully");
}

// Schedule report generation
function scheduleReportGeneration(): void {
  const job = cron.schedule("0 2 * * *", async () => {
    console.log("[SCHEDULER] Running scheduled report generation");
    try {
      const reports = await getScheduledReports();
      for (const report of reports) {
        if (
          !report.nextScheduled ||
          new Date(report.nextScheduled) <= new Date()
        ) {
          await generateReport(report.id);
        }
      }
    } catch (error) {
      handleSchedulerError("Report generation", error);
    }
  });

  scheduledJobs.set("report-generation", job);
  console.log("[SCHEDULER] Report generation scheduled for 2 AM daily");
}

// Schedule anomaly detection
function scheduleAnomalyDetection(database: DashboardDb): void {
  const job = cron.schedule("*/15 * * * *", async () => {
    console.log("[SCHEDULER] Running anomaly detection check");
    try {
      // Detect anomalies in vulnerability trends
      const recentData = await database
        .select()
        .from(fieldNoticeRecords)
        .orderBy((t) => t.createdAt)
        .limit(100);

      // Simple anomaly: if vulnerable assets exceed 10% threshold
      const vulnerableCount = recentData.filter((r) => (r.totVuln ?? 0) > 0).length;
      const anomalyThreshold = recentData.length * 0.1;

      if (vulnerableCount > anomalyThreshold) {
        await triggerAlert({
          type: "reactive",
          severity: "high",
          trigger: "anomaly_detection",
          recipients: ["sre-team@cisco.internal"],
          subject: "⚠️ Anomaly Detected: High Vulnerability Rate",
          body: createAlertTemplate(
            "Vulnerability Anomaly Detected",
            `
            <p>An anomaly has been detected in your vulnerability data:</p>
            <ul>
              <li>Vulnerable Assets: ${vulnerableCount}</li>
              <li>Anomaly Threshold: ${anomalyThreshold.toFixed(0)}</li>
              <li>Deviation: +${(((vulnerableCount - anomalyThreshold) / anomalyThreshold) * 100).toFixed(1)}%</li>
            </ul>
            <p>This may indicate a new security issue or data anomaly.</p>
            `,
            "https://dashboard.internal/intelligence"
          ),
          metadata: { anomalyType: "vulnerability_rate", count: vulnerableCount },
        });
      }
    } catch (error) {
      handleSchedulerError("Anomaly detection", error);
    }
  });

  scheduledJobs.set("anomaly-detection", job);
  console.log("[SCHEDULER] Anomaly detection scheduled every 15 minutes");
}

// Schedule threshold checks
function scheduleThresholdChecks(database: DashboardDb): void {
  const job = cron.schedule("0 * * * *", async () => {
    console.log("[SCHEDULER] Running threshold checks");
    try {
      // Use DISTINCT ON per RULE-001 to prevent double-counting duplicates
      const distinctRecords = await database.selectDistinct({
        fieldNoticeId: fieldNoticeRecords.fieldNoticeId,
        customerName: fieldNoticeRecords.customerName,
        cpyKey: fieldNoticeRecords.cpyKey,
        totVuln: fieldNoticeRecords.totVuln,
      }).from(fieldNoticeRecords)
        .orderBy(
          fieldNoticeRecords.fieldNoticeId,
          fieldNoticeRecords.customerName,
          fieldNoticeRecords.cpyKey,
          desc(fieldNoticeRecords.createdAt)
        );

      const vulnerable = distinctRecords.filter((r) => (r.totVuln ?? 0) > 0).length;
      const total = distinctRecords.length;
      const vulnerabilityRate = (vulnerable / total) * 100;

      // Critical alert if > 5% vulnerable
      if (vulnerabilityRate > 5) {
        await triggerAlert({
          type: "critical",
          severity: "critical",
          trigger: "vulnerability_threshold",
          recipients: ["sre-director@cisco.internal", "sre-vp@cisco.internal"],
          subject: `🚨 CRITICAL: Vulnerability Rate ${vulnerabilityRate.toFixed(2)}%`,
          body: createAlertTemplate(
            "Critical Vulnerability Threshold Exceeded",
            `
            <p><strong>CRITICAL ALERT</strong></p>
            <p>Your organization has exceeded the critical vulnerability threshold:</p>
            <ul>
              <li>Current Rate: ${vulnerabilityRate.toFixed(2)}%</li>
              <li>Critical Threshold: 5%</li>
              <li>Vulnerable Assets: ${vulnerable} / ${total}</li>
            </ul>
            <p>Immediate action is required. Please review the intelligence dashboard.</p>
            `,
            "https://dashboard.internal/dashboard"
          ),
          metadata: { threshold: 5, current: vulnerabilityRate, vulnerable, total },
        });
      }
      // Proactive alert if > 2% vulnerable
      else if (vulnerabilityRate > 2) {
        await triggerAlert({
          type: "proactive",
          severity: "medium",
          trigger: "vulnerability_warning",
          recipients: ["sre-manager@cisco.internal"],
          subject: `⚠️ WARNING: Vulnerability Rate Rising (${vulnerabilityRate.toFixed(2)}%)`,
          body: createAlertTemplate(
            "Vulnerability Rate Warning",
            `
            <p>Your organization is approaching the warning threshold:</p>
            <ul>
              <li>Current Rate: ${vulnerabilityRate.toFixed(2)}%</li>
              <li>Warning Threshold: 2%</li>
              <li>Vulnerable Assets: ${vulnerable} / ${total}</li>
            </ul>
            <p>Consider increasing remediation efforts.</p>
            `,
            "https://dashboard.internal/dashboard"
          ),
          metadata: { threshold: 2, current: vulnerabilityRate, vulnerable, total },
        });
      }
    } catch (error) {
      handleSchedulerError("Threshold check", error);
    }
  });

  scheduledJobs.set("threshold-checks", job);
  console.log("[SCHEDULER] Threshold checks scheduled hourly");
}

// Stop all scheduled jobs
export function stopScheduler(): void {
  console.log("[SCHEDULER] Stopping all scheduled jobs");
  scheduledJobs.forEach((job) => job.stop());
  scheduledJobs.clear();
}

// Get job status
export function getSchedulerStatus(): Record<string, string> {
  const status: Record<string, string> = {};
  scheduledJobs.forEach((job, name) => {
    status[name] = "active";
  });
  return status;
}
