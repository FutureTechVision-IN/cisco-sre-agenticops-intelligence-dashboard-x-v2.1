/**
 * Email Service - Handles all email delivery using SendGrid
 */

import nodemailer from "nodemailer";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface AlertEmailData {
  type: "scheduled" | "critical" | "predictive" | "manual";
  severity: "high" | "medium" | "low";
  title: string;
  content: string;
  metrics?: Record<string, any>;
  recommendations?: string[];
  timestamp: Date;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private sendGridApiKey: string | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    // Try SendGrid first
    const sendgridKey = process.env.SENDGRID_API_KEY;
    if (sendgridKey) {
      this.sendGridApiKey = sendgridKey;
      this.transporter = nodemailer.createTransport({
        host: "smtp.sendgrid.net",
        port: 587,
        auth: {
          user: "apikey",
          pass: sendgridKey,
        },
      });
    } else {
      // Fallback to test transport (for development)
      console.warn(
        "SENDGRID_API_KEY not found. Email service will log emails to console in test mode."
      );
      this.transporter = nodemailer.createTestAccount();
    }
  }

  /**
   * Generate HTML email template for alert
   */
  private generateAlertTemplate(data: AlertEmailData): string {
    const severityColor =
      data.severity === "high"
        ? "#dc2626"
        : data.severity === "medium"
          ? "#f59e0b"
          : "#10b981";

    const recommendationsHtml = data.recommendations
      ? data.recommendations
          .map((rec) => `<li style="margin: 5px 0;">${rec}</li>`)
          .join("")
      : "";

    const metricsHtml = data.metrics
      ? Object.entries(data.metrics)
          .map(
            ([key, value]) =>
              `<tr><td style="padding: 8px; border: 1px solid #e5e7eb;">${key}</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${value}</td></tr>`
          )
          .join("")
      : "";

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .severity-badge { 
      display: inline-block; 
      background-color: ${severityColor}; 
      color: white; 
      padding: 6px 12px; 
      border-radius: 4px; 
      font-weight: bold; 
      font-size: 12px;
      margin-top: 10px;
    }
    .content { background: #f9fafb; padding: 20px; }
    .section { margin: 20px 0; }
    .section h2 { color: #1f2937; font-size: 16px; margin: 0 0 10px 0; }
    .metrics-table { width: 100%; border-collapse: collapse; background: white; }
    .metrics-table th { background: #f3f4f6; padding: 10px; text-align: left; font-weight: bold; border: 1px solid #e5e7eb; }
    .recommendations { margin: 15px 0; padding: 15px; background: white; border-left: 4px solid ${severityColor}; }
    .recommendations ul { margin: 0; padding-left: 20px; }
    .footer { 
      background: #1f2937; 
      color: white; 
      padding: 15px; 
      text-align: center; 
      font-size: 12px;
      border-radius: 0 0 8px 8px;
    }
    .timestamp { color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SRE AgenticOps Intelligence Alert</h1>
      <div class="severity-badge">${data.severity.toUpperCase()} PRIORITY</div>
    </div>
    
    <div class="content">
      <div class="section">
        <h2>${data.title}</h2>
        <p>${data.content}</p>
        <p class="timestamp">Generated: ${data.timestamp.toLocaleString()}</p>
      </div>

      ${
        metricsHtml
          ? `
      <div class="section">
        <h2>Current Metrics</h2>
        <table class="metrics-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            ${metricsHtml}
          </tbody>
        </table>
      </div>
      `
          : ""
      }

      ${
        recommendationsHtml
          ? `
      <div class="recommendations">
        <h2 style="margin-top: 0; color: ${severityColor};">Recommended Actions</h2>
        <ul>
          ${recommendationsHtml}
        </ul>
      </div>
      `
          : ""
      }
    </div>

    <div class="footer">
      <p>Cisco Systems, Inc. | SRE AgenticOps Intelligence Dashboard</p>
      <p style="margin: 5px 0;">This is an automated alert. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Send alert email
   */
  async sendAlert(
    recipients: string | string[],
    alertData: AlertEmailData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.transporter) {
        throw new Error("Email service not initialized");
      }

      const html = this.generateAlertTemplate(alertData);

      const mailOptions: EmailOptions = {
        to: recipients,
        subject: `[${alertData.severity.toUpperCase()}] ${alertData.title}`,
        html,
        text: `${alertData.title}\n\n${alertData.content}\n\nGenerated: ${alertData.timestamp.toLocaleString()}`,
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log(`Email sent successfully. Message ID: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error sending email:", errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send scheduled report
   */
  async sendScheduledReport(
    recipients: string[],
    reportData: {
      title: string;
      content: string;
      metrics: Record<string, any>;
      period: string;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const html = this.generateScheduledReportTemplate(reportData);

    try {
      if (!this.transporter) {
        throw new Error("Email service not initialized");
      }

      const info = await this.transporter.sendMail({
        to: recipients,
        subject: `${reportData.title} - ${reportData.period}`,
        html,
        text: `${reportData.title}\n\nPeriod: ${reportData.period}\n\nPlease review the attached report.`,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Generate HTML template for scheduled reports
   */
  private generateScheduledReportTemplate(data: {
    title: string;
    content: string;
    metrics: Record<string, any>;
    period: string;
  }): string {
    const metricsHtml = Object.entries(data.metrics)
      .map(
        ([key, value]) =>
          `<tr><td style="padding: 10px; border: 1px solid #e5e7eb;">${key}</td><td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">${value}</td></tr>`
      )
      .join("");

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; }
    .container { max-width: 700px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .period { color: #e0e7ff; font-size: 14px; margin-top: 10px; }
    .content { background: white; padding: 30px; }
    .metrics-table { width: 100%; border-collapse: collapse; background: #f9fafb; margin: 20px 0; }
    .metrics-table th { background: #1f2937; color: white; padding: 12px; text-align: left; font-weight: bold; }
    .dashboard-link { display: inline-block; margin: 20px 0; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 4px; }
    .footer { background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${data.title}</h1>
      <div class="period">${data.period}</div>
    </div>
    
    <div class="content">
      <p>${data.content}</p>
      
      <h2 style="color: #1f2937; margin-top: 30px;">Key Metrics</h2>
      <table class="metrics-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          ${metricsHtml}
        </tbody>
      </table>
      
      <p style="text-align: center;">
        <a href="${process.env.DASHBOARD_URL || "https://sre-agenticops.cisco.com"}" class="dashboard-link">View Full Dashboard</a>
      </p>
    </div>

    <div class="footer">
      <p>Cisco Systems, Inc. | SRE AgenticOps Intelligence Dashboard</p>
      <p style="margin: 5px 0;">This is an automated report. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}

export const emailService = new EmailService();
