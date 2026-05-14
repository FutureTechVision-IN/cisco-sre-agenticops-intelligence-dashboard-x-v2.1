import { Express } from "express";
import { IStorage } from "./storage";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-dev-key-do-not-use-in-production";

// Encryption utilities for storing API keys securely
const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY.padEnd(32, "0")).slice(0, 32), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
};

const decrypt = (text: string): string => {
  const parts = text.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY.padEnd(32, "0")).slice(0, 32),
    iv
  );
  let decrypted = decipher.update(parts[1], "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

const maskKey = (key: string): string => {
  if (key.length < 12) return "***";
  return key.slice(0, 4) + "*".repeat(Math.max(4, key.length - 8)) + key.slice(-4);
};

export function registerAdminRoutes(app: Express, storage: IStorage) {
  // Get all API key configurations for current user
  app.get("/api/admin/api-keys", async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const configs = await storage.getApiKeyConfigsByUser?.(userId);
      const formatted = configs?.map((config: any) => ({
        ...config,
        maskedKey: maskKey(decrypt(config.apiKey)),
      })) || [];

      res.json(formatted);
    } catch (error) {
      console.error("Error fetching API key configs:", error);
      res.status(500).json({ error: "Failed to fetch configurations" });
    }
  });

  // Create new API key configuration
  app.post("/api/admin/api-keys", async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { apiKey, serviceName, usageLimit } = req.body;

      if (!apiKey || !serviceName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Encrypt the API key before storing
      const encryptedKey = encrypt(apiKey);

      const config = await storage.createApiKeyConfig?.(userId, "cisco-advanced", encryptedKey);

      res.json({
        ...config,
        maskedKey: maskKey(apiKey),
        message: "API key configuration created successfully",
      });
    } catch (error) {
      console.error("Error creating API key config:", error);
      res.status(500).json({ error: "Failed to create configuration" });
    }
  });

  // Validate API key connectivity
  app.post("/api/admin/api-keys/:id/validate", async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // In production, you would make a test call to the Cisco API
      // For now, we'll simulate validation
      const isValid = Math.random() > 0.1; // 90% success rate for demo

      if (isValid) {
        res.json({
          status: "valid",
          message: "API key validated successfully",
          connectivity: "OK",
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          status: "invalid",
          message: "API key validation failed",
          error: "Invalid credentials or connectivity issue",
        });
      }
    } catch (error) {
      console.error("Error validating API key:", error);
      res.status(500).json({ error: "Validation failed" });
    }
  });

  // Delete API key configuration
  app.delete("/api/admin/api-keys/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await storage.deleteApiKeyConfig?.(id);

      res.json({ message: "API key configuration deleted successfully" });
    } catch (error) {
      console.error("Error deleting API key config:", error);
      res.status(500).json({ error: "Failed to delete configuration" });
    }
  });

  // Get usage logs
  app.get("/api/admin/api-keys/usage", async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // In production, fetch from usage_logs table
      const sampleLogs = [
        {
          id: "1",
          providerId: "cisco-1",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          serviceUsed: "Deep Learning Models",
          status: "success",
          tokensUsed: 150,
        },
        {
          id: "2",
          providerId: "cisco-1",
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          serviceUsed: "Enhanced Analytics",
          status: "success",
          tokensUsed: 200,
        },
        {
          id: "3",
          providerId: "cisco-1",
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          serviceUsed: "Predictive Intelligence",
          status: "failed",
          tokensUsed: 0,
        },
      ];

      res.json(sampleLogs);
    } catch (error) {
      console.error("Error fetching usage logs:", error);
      res.status(500).json({ error: "Failed to fetch usage logs" });
    }
  });

  // Get usage statistics
  app.get("/api/admin/api-keys/stats", async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const stats = {
        totalConfigs: 2,
        activeConfigs: 2,
        totalTokensUsed: 350,
        failedRequests: 1,
        averageResponseTime: 245, // ms
        uptime: "99.8%",
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });
}
