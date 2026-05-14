import { Router } from "express";
import { db } from "./db";
import { reports, reportExecutions } from "@shared/schema";
import { desc, eq } from "drizzle-orm";
import { generateReport } from "./report-service";

const router = Router();

// Get all reports
router.get("/api/reports", async (req, res) => {
  try {
    const allReports = await db.select().from(reports).limit(100);

    res.json({
      success: true,
      count: allReports.length,
      data: allReports,
    });
  } catch (error) {
    console.error("[REPORT-API] Error fetching reports:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch reports",
    });
  }
});

// Get report execution history
router.get("/api/reports/:reportId/executions", async (req, res) => {
  try {
    const { reportId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);

    const executions = await db
      .select()
      .from(reportExecutions)
      .where(eq(reportExecutions.reportId, reportId))
      .orderBy(desc(reportExecutions.executedAt))
      .limit(limit);

    res.json({
      success: true,
      count: executions.length,
      data: executions,
    });
  } catch (error) {
    console.error("[REPORT-API] Error fetching executions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch report executions",
    });
  }
});

// Manually trigger report generation
router.post("/api/reports/:reportId/generate", async (req, res) => {
  try {
    const { reportId } = req.params;

    // Check if report exists
    const report = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);

    if (!report.length) {
      return res.status(404).json({
        success: false,
        error: "Report not found",
      });
    }

    // Trigger generation asynchronously
    generateReport(reportId).catch((err) => {
      console.error("[REPORT-API] Report generation error:", err);
    });

    res.json({
      success: true,
      message: "Report generation started",
    });
  } catch (error) {
    console.error("[REPORT-API] Error triggering report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to trigger report generation",
    });
  }
});

// Create new report schedule
router.post("/api/reports", async (req, res) => {
  try {
    const {
      name,
      type,
      recipients,
      metrics,
      includeAnalytics,
      includeInsights,
    } = req.body;

    if (!name || !type || !recipients || !recipients.length) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const intervals: Record<string, number> = {
      weekly: 7,
      monthly: 30,
      quarterly: 90,
      "half-yearly": 180,
      yearly: 365,
    };

    const newReport = await db
      .insert(reports)
      .values({
        name,
        type,
        scheduleInterval: intervals[type] || 30,
        recipients: JSON.stringify(recipients),
        includeMetrics: JSON.stringify(metrics || ["all"]),
        includeAnalytics: includeAnalytics !== false ? 1 : 0,
        includeInsights: includeInsights !== false ? 1 : 0,
        nextScheduled: new Date(Date.now() + (intervals[type] || 30) * 24 * 60 * 60 * 1000),
      })
      .returning();

    res.json({
      success: true,
      message: "Report created",
      data: newReport[0],
    });
  } catch (error) {
    console.error("[REPORT-API] Error creating report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create report",
    });
  }
});

export default router;
