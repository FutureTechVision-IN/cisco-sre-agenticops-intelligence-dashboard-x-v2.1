import { db } from "./db";
import { alertDeduplication, alertAuditLogs } from "@shared/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import crypto from "crypto";
import nodemailer from "nodemailer";

export interface AlertConfig {
  type: "proactive" | "reactive" | "critical";
  severity: "low" | "medium" | "high" | "critical";
  trigger: string;
  recipients: string[];
  subject: string;
  body: string;
  metadata?: Record<string, any>;
}

// Internal SMTP configuration (no 3rd party services)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "25"),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  } : undefined,
});

// Generate hash for alert deduplication
function generateAlertHash(alertType: string, trigger: string, metric?: string): string {
  return crypto
    .createHash("sha256")
    .update(`${alertType}:${trigger}:${metric || ""}`)
    .digest("hex");
}

// Check if alert should be deduplicated (already triggered recently)
async function shouldDeduplicate(
  alertHash: string,
  deduplicationWindow: number = 3600000 // 1 hour default
): Promise<boolean> {
  const recent = await db
    .select()
    .from(alertDeduplication)
    .where(
      and(
        eq(alertDeduplication.alertHash, alertHash),
        gt(alertDeduplication.lastTriggered, new Date(Date.now() - deduplicationWindow))
      )
    )
    .limit(1);

  if (recent.length > 0) {
    // Update trigger count using SQL increment
    await db
      .update(alertDeduplication)
      .set({
        triggerCount: sql`${alertDeduplication.triggerCount} + 1`,
        lastTriggered: new Date(),
      })
      .where(eq(alertDeduplication.alertHash, alertHash));
    return true;
  }
  return false;
}

// Record deduplication entry
async function recordDeduplication(
  alertHash: string,
  acknowledged: boolean = false
): Promise<void> {
  await db
    .insert(alertDeduplication)
    .values({
      alertHash,
      lastTriggered: new Date(),
      triggerCount: 1,
      acknowledged: acknowledged ? 1 : 0,
    })
    .onConflictDoUpdate({
      target: alertDeduplication.alertHash,
      set: {
        lastTriggered: new Date(),
        triggerCount: sql`${alertDeduplication.triggerCount} + 1`,
      },
    });
}

// Send email notification via internal SMTP
async function sendEmailAlert(
  recipients: string[],
  subject: string,
  body: string,
  priority: "low" | "normal" | "high" = "normal"
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    console.log(`[ALERT-MAIL] Sending email to ${recipients.join(", ")}`);
    
    const result = await transporter.sendMail({
      from: process.env.ALERT_FROM_EMAIL || "alerts@cisco-sre.internal",
      to: recipients,
      subject,
      html: body,
      priority: priority === "high" ? "high" : "normal",
    });

    console.log(`[ALERT-SENT] Message ID: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("[ALERT-ERROR] Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Main alert trigger function
export async function triggerAlert(config: AlertConfig): Promise<void> {
  const alertHash = generateAlertHash(config.type, config.trigger, config.metadata?.metric);

  // Check deduplication
  const isDuplicate = await shouldDeduplicate(alertHash);
  if (isDuplicate) {
    console.log(`[ALERT-DEDUP] Alert already triggered: ${alertHash}`);
    return;
  }

  // Record audit log
  const sendResult = await sendEmailAlert(
    config.recipients,
    config.subject,
    config.body,
    config.severity === "critical" ? "high" : "normal"
  );

  await db.insert(alertAuditLogs).values({
    alertType: config.type,
    severity: config.severity,
    trigger: config.trigger,
    recipients: JSON.stringify(config.recipients),
    status: sendResult.success ? "sent" : "failed",
    errorMessage: sendResult.error,
    metadata: JSON.stringify(config.metadata || {}),
  });

  // Record deduplication
  await recordDeduplication(alertHash);

  console.log(
    `[ALERT-${config.severity.toUpperCase()}] ${config.type}: ${config.trigger}`
  );
}

// Acknowledge alert
export async function acknowledgeAlert(
  alertHash: string,
  acknowledgedBy: string
): Promise<void> {
  await db
    .update(alertDeduplication)
    .set({
      acknowledged: 1,
      acknowledgedAt: new Date(),
      acknowledgedBy,
    })
    .where(eq(alertDeduplication.alertHash, alertHash));
}

// Get alert history
export async function getAlertHistory(limit: number = 100): Promise<any[]> {
  return await db.select().from(alertAuditLogs).orderBy(alertAuditLogs.createdAt).limit(limit);
}

// Create email template for alerts
export function createAlertTemplate(
  title: string,
  content: string,
  action?: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: #1e40af; color: white; padding: 20px; }
          .content { padding: 20px; }
          .action { background: #3b82f6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; }
          .footer { background: #f3f4f6; padding: 10px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${title}</h1>
          </div>
          <div class="content">
            ${content}
            ${action ? `<p><a href="${action}" class="action">View Details</a></p>` : ""}
          </div>
          <div class="footer">
            SRE AgenticOps Intelligence Dashboard | Automated Alert System
          </div>
        </div>
      </body>
    </html>
  `;
}
