import { type Server } from "node:http";

import express, { type Express, type Request, Response, NextFunction } from "express";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { db } from "./db";
import { registerRoutes } from "./routes";
import { seedDatabase } from "./seed";
import { initializeScheduler } from "./alert-scheduler";
import { SyncMonitorService } from "./sync-monitor-service";
import { storage } from "./storage";
import { loadCSVData, getCacheStats } from "./csv-data-service";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Session middleware - MUST come after body parsing
// Use PostgreSQL session store if DATABASE_URL is set, otherwise use memory store
let sessionStore: session.Store | undefined;
if (process.env.DATABASE_URL) {
  const PgSession = ConnectPgSimple(session);
  sessionStore = new PgSession({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    tableName: 'session',
  });
  console.log("[SESSION] Using PostgreSQL session store");
} else {
  // Use default memory store (built into express-session)
  sessionStore = undefined;
  console.log("[SESSION] Using in-memory session store (no DATABASE_URL)");
}

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  },
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

export default async function runApp(
  setup: (app: Express, server: Server) => Promise<void>,
) {
  // Auto-seed database on startup if empty
  try {
    console.log("[APP] Checking if database needs seeding...");
    await seedDatabase();
  } catch (error: any) {
    console.error("[APP] Seed warning (non-fatal):", error.message);
  }

  // CRITICAL: Preload CSV data on startup to prevent "Data Loading..." messages
  try {
    console.log("[APP] Preloading CSV data for SRE AI Assistant...");
    const startTime = Date.now();
    await loadCSVData(false); // Load with cache if available
    const loadTime = Date.now() - startTime;
    const stats = getCacheStats();
    if (stats.loaded && stats.recordCount > 0) {
      console.log(`[APP] CSV data preloaded successfully in ${loadTime}ms (${stats.recordCount} records, ${stats.customerCount} customers, ${stats.fieldNoticeCount} field notices)`);
    } else {
      console.warn("[APP] CSV data preload completed but cache appears empty - will load on first request");
    }
  } catch (error: any) {
    console.error("[APP] CSV preload warning (non-fatal):", error.message);
    console.log("[APP] Data will be loaded on first user request");
  }

  const server = await registerRoutes(app);
  
  // Initialize alert and report scheduler (cron jobs for automated alerts/reports)
  initializeScheduler();
  
  // Initialize data synchronization monitoring service
  try {
    const syncMonitor = SyncMonitorService.initialize(storage, {
      enabled: process.env.SYNC_MONITOR_ENABLED !== 'false', // Enabled by default
      validationIntervalMinutes: parseInt(process.env.SYNC_VALIDATION_INTERVAL || '60'), // Default: hourly
      dailyReportHour: parseInt(process.env.SYNC_DAILY_REPORT_HOUR || '9'), // Default: 9 AM
      weeklyReportDay: parseInt(process.env.SYNC_WEEKLY_REPORT_DAY || '1'), // Default: Monday
      alertThresholds: {
        info: parseFloat(process.env.SYNC_THRESHOLD_INFO || '0.5'),
        warning: parseFloat(process.env.SYNC_THRESHOLD_WARNING || '1.0'),
        critical: parseFloat(process.env.SYNC_THRESHOLD_CRITICAL || '5.0')
      }
    });
    syncMonitor.start();
    console.log("[APP] Data synchronization monitoring service started");
  } catch (error: any) {
    console.error("[APP] Failed to start sync monitoring service:", error.message);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly run the final setup after setting up all the other routes so
  // the catch-all route doesn't interfere with the other routes
  await setup(app, server);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // this serves both the API and the client.
  const port = parseInt(process.env.PORT || '5000', 10);
  const host = process.env.HOST || (process.platform === 'darwin' ? '127.0.0.1' : '0.0.0.0');
  server.listen(port, host, () => {
    log(`serving on http://${host}:${port}`);
  });
}
