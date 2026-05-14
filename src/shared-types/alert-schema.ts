import { pgTable, varchar, timestamp, text, integer, boolean, serial, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Alert configurations
export const alertConfigs = pgTable(
  "alert_configs",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(), // 'scheduled', 'critical', 'predictive', 'manual'
    schedule: varchar("schedule", { length: 255 }), // cron expression or schedule type
    recipients: text("recipients").notNull(), // JSON array of emails
    severity: varchar("severity", { length: 20 }), // 'high', 'medium', 'low'
    enabled: boolean("enabled").default(true),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    typeIdx: index("alert_config_type_idx").on(table.type),
    enabledIdx: index("alert_config_enabled_idx").on(table.enabled),
  })
);

// Alert history / audit log
export const alertLogs = pgTable(
  "alert_logs",
  {
    id: serial("id").primaryKey(),
    configId: integer("config_id").references(() => alertConfigs.id),
    subject: varchar("subject", { length: 255 }).notNull(),
    recipients: text("recipients").notNull(), // JSON array
    severity: varchar("severity", { length: 20 }).notNull(),
    content: text("content"),
    status: varchar("status", { length: 50 }).notNull(), // 'pending', 'sent', 'failed', 'acknowledged'
    acknowledgedBy: varchar("acknowledged_by", { length: 255 }),
    acknowledgedAt: timestamp("acknowledged_at"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow(),
    sentAt: timestamp("sent_at"),
  },
  (table) => ({
    configIdIdx: index("alert_log_config_idx").on(table.configId),
    statusIdx: index("alert_log_status_idx").on(table.status),
    createdIdx: index("alert_log_created_idx").on(table.createdAt),
  })
);

// Alert thresholds for critical situation detection
export const alertThresholds = pgTable(
  "alert_thresholds",
  {
    id: serial("id").primaryKey(),
    metric: varchar("metric", { length: 100 }).notNull(), // e.g., 'vulnerable_assets', 'anomaly_score'
    threshold: integer("threshold").notNull(),
    operator: varchar("operator", { length: 10 }).notNull(), // '>', '<', '>=', '<=', '=='
    severity: varchar("severity", { length: 20 }).notNull(),
    enabled: boolean("enabled").default(true),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    metricIdx: index("alert_threshold_metric_idx").on(table.metric),
  })
);

// Schemas for validation and insertion
export const insertAlertConfigSchema = createInsertSchema(alertConfigs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAlertLogSchema = createInsertSchema(alertLogs).omit({ id: true, createdAt: true });
export const insertAlertThresholdSchema = createInsertSchema(alertThresholds).omit({ id: true, createdAt: true });

export type AlertConfig = typeof alertConfigs.$inferSelect;
export type InsertAlertConfig = z.infer<typeof insertAlertConfigSchema>;
export type AlertLog = typeof alertLogs.$inferSelect;
export type InsertAlertLog = z.infer<typeof insertAlertLogSchema>;
export type AlertThreshold = typeof alertThresholds.$inferSelect;
export type InsertAlertThreshold = z.infer<typeof insertAlertThresholdSchema>;
