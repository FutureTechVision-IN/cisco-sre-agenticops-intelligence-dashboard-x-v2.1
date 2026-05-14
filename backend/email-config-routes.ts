import { Router, Request, Response } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import nodemailer from "nodemailer";

const router = Router();

// In-memory email config (in production, store in database)
let emailConfig: any = null;

// Get email configuration
router.get("/api/admin/email-config", async (req: Request, res: Response) => {
  try {
    // For now, return in-memory config or env vars
    if (emailConfig) {
      res.json(emailConfig);
    } else {
      // Return env vars as default
      res.json({
        smtpHost: process.env.SMTP_HOST || "localhost",
        smtpPort: parseInt(process.env.SMTP_PORT || "25"),
        smtpUser: process.env.SMTP_USER || "",
        smtpPassword: "***hidden***",
        smtpSecure: process.env.SMTP_SECURE === "true",
        alertFromEmail: process.env.ALERT_FROM_EMAIL || "alerts@cisco-sre.internal",
        alertRecipients: [],
        reportRecipients: [],
        testStatus: "untested",
        lastTested: null,
      });
    }
  } catch (error) {
    console.error("[EMAIL-CONFIG] Error fetching config:", error);
    res.status(500).json({ error: "Failed to fetch email configuration" });
  }
});

// Save email configuration
router.post("/api/admin/email-config", async (req: Request, res: Response) => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPassword, smtpSecure, alertFromEmail, alertRecipients, reportRecipients } = req.body;

    if (!smtpHost || !smtpPort || !alertFromEmail) {
      return res.status(400).json({
        error: "Missing required fields: smtpHost, smtpPort, alertFromEmail",
      });
    }

    // Store in memory (in production, save to database)
    emailConfig = {
      smtpHost,
      smtpPort: parseInt(smtpPort),
      smtpUser,
      smtpPassword: smtpPassword ? "***hidden***" : "",
      smtpSecure: !!smtpSecure,
      alertFromEmail,
      alertRecipients: alertRecipients || [],
      reportRecipients: reportRecipients || [],
      testStatus: "untested",
      lastTested: null,
    };

    // Also set as environment variables for the alert service
    process.env.SMTP_HOST = smtpHost;
    process.env.SMTP_PORT = smtpPort.toString();
    process.env.SMTP_USER = smtpUser || "";
    process.env.SMTP_PASSWORD = smtpPassword || "";
    process.env.SMTP_SECURE = smtpSecure ? "true" : "false";
    process.env.ALERT_FROM_EMAIL = alertFromEmail;
    process.env.ALERT_RECIPIENTS = (alertRecipients || []).join(",");
    process.env.REPORT_RECIPIENTS = (reportRecipients || []).join(",");

    console.log(`[EMAIL-CONFIG] Configuration saved: ${smtpHost}:${smtpPort} from ${alertFromEmail}`);
    console.log(`[EMAIL-CONFIG] Alert recipients: ${(alertRecipients || []).join(", ")}`);
    console.log(`[EMAIL-CONFIG] Report recipients: ${(reportRecipients || []).join(", ")}`);

    res.json({
      success: true,
      message: "Email configuration saved",
      config: emailConfig,
    });
  } catch (error) {
    console.error("[EMAIL-CONFIG] Error saving config:", error);
    res.status(500).json({ error: "Failed to save email configuration" });
  }
});

// Test email configuration
router.post("/api/admin/email-config/test", async (req: Request, res: Response) => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPassword, smtpSecure, alertFromEmail } = req.body;

    if (!smtpHost || !smtpPort || !alertFromEmail) {
      return res.status(400).json({
        error: "Missing required fields for test",
      });
    }

    console.log(`[EMAIL-CONFIG-TEST] Testing SMTP connection: ${smtpHost}:${smtpPort}`);

    // Create transporter with provided config
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: !!smtpSecure,
      auth: smtpUser ? {
        user: smtpUser,
        pass: smtpPassword,
      } : undefined,
    });

    // Test connection and send test email
    try {
      await transporter.verify();
      console.log("[EMAIL-CONFIG-TEST] SMTP connection verified");

      // Send test email
      const result = await transporter.sendMail({
        from: alertFromEmail,
        to: process.env.ALERT_FROM_EMAIL || alertFromEmail,
        subject: "SRE Dashboard - Email Configuration Test",
        html: `
          <h2 style="color: #10b981;">Email Configuration Test Successful</h2>
          <p>Your SMTP configuration is working correctly.</p>
          <p><strong>Configuration:</strong></p>
          <ul>
            <li>Host: ${smtpHost}</li>
            <li>Port: ${smtpPort}</li>
            <li>From: ${alertFromEmail}</li>
            <li>TLS/SSL: ${smtpSecure ? "Enabled" : "Disabled"}</li>
          </ul>
          <p>You can now use this configuration for automated alerts and reports.</p>
        `,
      });

      // Update config with success status
      if (emailConfig) {
        emailConfig.testStatus = "success";
        emailConfig.lastTested = new Date().toISOString();
      }

      console.log("[EMAIL-CONFIG-TEST] Test email sent successfully:", result.messageId);

      res.json({
        success: true,
        message: "Test email sent successfully",
        messageId: result.messageId,
      });
    } catch (testError: any) {
      console.error("[EMAIL-CONFIG-TEST] Test failed:", testError.message);

      if (emailConfig) {
        emailConfig.testStatus = "failed";
        emailConfig.lastTested = new Date().toISOString();
      }

      res.status(400).json({
        success: false,
        error: testError.message || "SMTP test failed",
      });
    }
  } catch (error) {
    console.error("[EMAIL-CONFIG-TEST] Error:", error);
    res.status(500).json({ error: "Failed to test email configuration" });
  }
});

export default router;
