import { Router } from "express";
import { db } from "./db";
import { alertAuditLogs, alertDeduplication } from "@shared/schema";
import { desc, eq } from "drizzle-orm";
import { triggerAlert, createAlertTemplate } from "./alert-service";

const router = Router();

// Get alert history
router.get("/api/alerts/history", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const history = await db
      .select()
      .from(alertAuditLogs)
      .orderBy(desc(alertAuditLogs.createdAt))
      .limit(limit);

    res.json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    console.error("[ALERT-API] Error fetching history:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch alert history",
    });
  }
});

// Get deduplication status
router.get("/api/alerts/dedup-status", async (req, res) => {
  try {
    const status = await db.select().from(alertDeduplication).limit(100);

    res.json({
      success: true,
      count: status.length,
      data: status,
    });
  } catch (error) {
    console.error("[ALERT-API] Error fetching dedup status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch deduplication status",
    });
  }
});

// Acknowledge alert
router.post("/api/alerts/:alertHash/acknowledge", async (req, res) => {
  try {
    const { alertHash } = req.params;
    const { acknowledgedBy } = req.body;

    if (!acknowledgedBy) {
      return res.status(400).json({
        success: false,
        error: "acknowledgedBy is required",
      });
    }

    await db
      .update(alertDeduplication)
      .set({
        acknowledged: 1,
        acknowledgedAt: new Date(),
        acknowledgedBy,
      })
      .where(eq(alertDeduplication.alertHash, alertHash));

    res.json({
      success: true,
      message: "Alert acknowledged",
    });
  } catch (error) {
    console.error("[ALERT-API] Error acknowledging alert:", error);
    res.status(500).json({
      success: false,
      error: "Failed to acknowledge alert",
    });
  }
});

// Manually trigger alert (admin only)
router.post("/api/alerts/trigger", async (req, res) => {
  try {
    const {
      type,
      severity,
      trigger,
      recipients,
      subject,
      body,
      metadata,
    } = req.body;

    if (!type || !severity || !trigger || !recipients || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    await triggerAlert({
      type: type as "proactive" | "reactive" | "critical",
      severity: severity as "low" | "medium" | "high" | "critical",
      trigger,
      recipients,
      subject,
      body,
      metadata,
    });

    res.json({
      success: true,
      message: "Alert triggered successfully",
    });
  } catch (error) {
    console.error("[ALERT-API] Error triggering alert:", error);
    res.status(500).json({
      success: false,
      error: "Failed to trigger alert",
    });
  }
});

export default router;
