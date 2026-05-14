import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, index, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Field Notice ID Format Specification
 * ====================================
 * Format: "FN" followed by exactly 5 digits (e.g., FN12345)
 * Range: FN00001 to FN99999 (FN00000 is reserved as invalid marker)
 * 
 * @see migrations/0001_field_notice_format_constraint.sql for database constraint
 * @see shared-types/field-notice-validator.ts for validation functions
 */
export const FIELD_NOTICE_ID_REGEX = /^FN[0-9]{5}$/;

/**
 * Zod schema for Field Notice ID validation
 */
export const fieldNoticeIdSchema = z.string()
  .trim()
  .toUpperCase()
  .regex(FIELD_NOTICE_ID_REGEX, {
    message: "Field Notice ID must be 'FN' followed by exactly 5 digits (e.g., FN12345)"
  })
  .refine(val => val !== 'FN00000', {
    message: "FN00000 is a reserved value and cannot be used"
  });

export const fieldNoticeRecords = pgTable(
  "field_notice_records",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    fieldNoticeId: varchar("field_notice_id").notNull(),
    firstPublished: timestamp("first_published"),
    fnTitle: text("fn_title"),
    fnType: varchar("fn_type"),
    totVuln: integer("tot_vuln").default(0),
    cvul: decimal("cvul", { precision: 10, scale: 1 }).default("0"),
    potVuln: integer("pot_vuln").default(0),
    cpVuln: decimal("cp_vuln", { precision: 10, scale: 1 }).default("0"),
    notVuln: integer("not_vuln").default(0),
    cNotVuln: decimal("c_not_vuln", { precision: 10, scale: 1 }).default("0"),
    dateImported: varchar("date_imported"),
    cpyKey: varchar("cpy_key").notNull(),
    customerName: text("customer_name").notNull(),
    duplicateDetected: integer("duplicate_detected").default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    fieldNoticeIdx: index("idx_field_notice_id").on(table.fieldNoticeId),
    customerIdx: index("idx_customer_name").on(table.customerName),
  })
);

export const insertFieldNoticeSchema = createInsertSchema(fieldNoticeRecords, {
  // Override fieldNoticeId with our strict validation schema
  fieldNoticeId: fieldNoticeIdSchema,
}).omit({
  id: true,
  createdAt: true,
  cvul: true,
  cpVuln: true,
  cNotVuln: true,
});

export type InsertFieldNotice = z.infer<typeof insertFieldNoticeSchema>;
export type FieldNoticeRecord = typeof fieldNoticeRecords.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 50 }).default("user"),
  email: text("email"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  mustChangePassword: integer("must_change_password").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  email: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const emailConfigs = pgTable("email_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  fromEmail: text("from_email").notNull(),
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpUser: text("smtp_user"),
  smtpPassword: text("smtp_password"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const apiKeyConfigs = pgTable("api_key_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  provider: varchar("provider", { length: 50 }).notNull(),
  apiKey: text("api_key").notNull(),
  isEncrypted: integer("is_encrypted").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const alertRecipients = pgTable("alert_recipients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  email: text("email").notNull(),
  verified: integer("verified").default(0),
  isPrimary: integer("is_primary").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export type EmailConfig = typeof emailConfigs.$inferSelect;
export type ApiKeyConfig = typeof apiKeyConfigs.$inferSelect;
export type AlertRecipient = typeof alertRecipients.$inferSelect;

// Alert configuration tables
export const alertConfigs = pgTable("alert_configs", {
  id: integer("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  schedule: varchar("schedule", { length: 255 }),
  recipients: text("recipients").notNull(),
  severity: varchar("severity", { length: 20 }),
  enabled: integer("enabled").default(1),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const alertLogs = pgTable("alert_logs", {
  id: integer("id").primaryKey(),
  configId: integer("config_id"),
  subject: varchar("subject", { length: 255 }).notNull(),
  recipients: text("recipients").notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  acknowledgedBy: varchar("acknowledged_by", { length: 255 }),
  acknowledgedAt: timestamp("acknowledged_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ML Model Metrics for AI/ML Intelligence Center
export const mlModelMetrics = pgTable("ml_model_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  modelType: varchar("model_type", { length: 100 }).notNull(),
  accuracy: decimal("accuracy", { precision: 5, scale: 2 }).default("0.00"),
  precision: decimal("precision", { precision: 5, scale: 2 }).default("0.00"),
  recall: decimal("recall", { precision: 5, scale: 2 }).default("0.00"),
  mape: decimal("mape", { precision: 5, scale: 2 }).default("0.00"),
  trainedAt: timestamp("trained_at").defaultNow(),
  performanceScores: text("performance_scores"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type MLModelMetric = typeof mlModelMetrics.$inferSelect;
export type InsertMLModelMetric = typeof mlModelMetrics.$inferInsert;

export const alertThresholds = pgTable("alert_thresholds", {
  id: integer("id").primaryKey(),
  metric: varchar("metric", { length: 100 }).notNull(),
  threshold: integer("threshold").notNull(),
  operator: varchar("operator", { length: 10 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  enabled: integer("enabled").default(1),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AlertConfig = typeof alertConfigs.$inferSelect;
export type AlertLog = typeof alertLogs.$inferSelect;
export type AlertThreshold = typeof alertThresholds.$inferSelect;

// Report tables
export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // weekly, monthly, quarterly, half-yearly, yearly
  scheduleInterval: integer("schedule_interval").notNull(), // days between runs
  lastGenerated: timestamp("last_generated"),
  nextScheduled: timestamp("next_scheduled"),
  recipients: text("recipients").notNull(), // JSON array of emails
  enabled: integer("enabled").default(1),
  includeMetrics: text("include_metrics").default("all"), // JSON
  includeAnalytics: integer("include_analytics").default(1),
  includeInsights: integer("include_insights").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reportExecutions = pgTable("report_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: varchar("report_id").notNull(),
  status: varchar("status", { length: 50 }).notNull(), // pending, running, completed, failed
  filePath: text("file_path"),
  deliveryStatus: varchar("delivery_status", { length: 50 }), // pending, sent, failed
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  metricsSnapshot: text("metrics_snapshot"), // JSON snapshot of metrics
  executedAt: timestamp("executed_at").defaultNow(),
});

export const alertDeduplication = pgTable("alert_deduplication", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alertHash: varchar("alert_hash", { length: 64 }).notNull().unique(), // SHA-256 hash
  lastTriggered: timestamp("last_triggered").notNull(),
  triggerCount: integer("trigger_count").default(1),
  acknowledged: integer("acknowledged").default(0),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: varchar("acknowledged_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const alertAuditLogs = pgTable("alert_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alertType: varchar("alert_type", { length: 50 }).notNull(), // proactive, reactive, critical
  severity: varchar("severity", { length: 20 }).notNull(),
  trigger: varchar("trigger", { length: 255 }).notNull(),
  recipients: text("recipients").notNull(),
  status: varchar("status", { length: 50 }).notNull(), // sent, failed, rate_limited
  rateLimit: integer("rate_limit").default(0), // 1 if rate limited
  deduplicatedFrom: varchar("deduplicated_from", { length: 255 }), // original alert ID if deduplicated
  acknowledged: integer("acknowledged").default(0),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: varchar("acknowledged_by", { length: 255 }),
  readReceipts: integer("read_receipts").default(0),
  errorMessage: text("error_message"),
  metadata: text("metadata"), // JSON
  createdAt: timestamp("created_at").defaultNow(),
});

export type Report = typeof reports.$inferSelect;
export type ReportExecution = typeof reportExecutions.$inferSelect;
export type AlertDeduplication = typeof alertDeduplication.$inferSelect;
export type AlertAuditLog = typeof alertAuditLogs.$inferSelect;
