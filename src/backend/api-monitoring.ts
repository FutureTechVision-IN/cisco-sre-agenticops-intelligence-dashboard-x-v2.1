/**
 * API Monitoring and Analytics
 * Tracks usage patterns, identifies bottlenecks, and optimizes API allocation
 */

import { apiOptimizer } from "./api-optimizer";

export interface APIUsageReport {
  reportPeriod: string;
  totalRequests: number;
  apiCallsUsed: number;
  cachedResponses: number;
  builtInSolutions: number;
  averageResponseTime: number;
  peakUsageTime: string;
  efficiency: {
    apiSavingsPercentage: number;
    cacheHitRate: number;
    averageTokensUsedPerUser: number;
  };
  riskMetrics: {
    globalRateLimitStatus: Record<string, any>;
    failureRate: number;
    slaPenetration: number; // % of requests under 500ms
  };
  recommendations: string[];
}

export class APIMonitoringService {
  /**
   * Generate comprehensive usage report
   */
  static generateUsageReport(minutes: number = 60): APIUsageReport {
    const analytics = apiOptimizer.getMonitoringAnalytics(minutes);
    const cacheStats = apiOptimizer.getCacheStats();
    const rateLimitStatus = apiOptimizer.getRateLimitStatus();

    const builtInSolutions = analytics.totalRequests - analytics.apiCalls - analytics.cacheHits;
    const apiSavings = analytics.totalRequests - analytics.apiCalls;

    const recommendations: string[] = [];

    // Analyze and generate recommendations
    if (analytics.apiUsagePercentage > 50) {
      recommendations.push("API usage is high. Consider enabling more aggressive caching.");
    }

    if (analytics.cacheHitRate < 30) {
      recommendations.push(
        "Cache hit rate is low. Review cache TTL settings and common query patterns."
      );
    }

    if (analytics.avgResponseTimeDistribution[">500ms"] > analytics.totalRequests * 0.1) {
      recommendations.push(
        "More than 10% of requests exceed 500ms SLA. Optimize slow endpoints."
      );
    }

    const globalStatus = rateLimitStatus.global || rateLimitStatus;
    const remainingTokens = globalStatus.remainingTokens || 0;

    if (remainingTokens <= 2) {
      recommendations.push(
        `CRITICAL: Global rate limit nearly exhausted (${remainingTokens}/12 tokens remaining). Increase caching or defer API calls.`
      );
    }

    if (analytics.apiUsagePercentage > 30) {
      recommendations.push(
        `API usage is ${analytics.apiUsagePercentage}%. With strict 12 calls/min global limit across all users, increase cache hit rate to ${Math.min(98, analytics.cacheHitRate + 20)}%+.`
      );
    }

    if (analytics.failureCount > analytics.totalRequests * 0.05) {
      recommendations.push("Failure rate exceeds 5%. Investigate and resolve errors.");
    }

    // Calculate SLA penetration (requests under 500ms)
    const slaPenetration =
      ((analytics.totalRequests - analytics.avgResponseTimeDistribution[">500ms"]) /
        analytics.totalRequests) *
      100;

    return {
      reportPeriod: `Last ${minutes} minutes`,
      totalRequests: analytics.totalRequests,
      apiCallsUsed: analytics.apiCalls,
      cachedResponses: analytics.cacheHits,
      builtInSolutions,
      averageResponseTime: analytics.averageResponseTime,
      peakUsageTime: this.getPeakUsageTime(),
      efficiency: {
        apiSavingsPercentage: apiSavings > 0 ? Math.round((apiSavings / analytics.totalRequests) * 100) : 0,
        cacheHitRate: analytics.cacheHitRate,
        averageTokensUsedPerUser: this.calculateAvgTokensPerUser(rateLimitStatus, analytics.totalRequests),
      },
      riskMetrics: {
        globalRateLimitStatus: rateLimitStatus.global,
        failureRate: Math.round((analytics.failureCount / analytics.totalRequests) * 100),
        slaPenetration: Math.round(slaPenetration),
      },
      recommendations,
    };
  }

  /**
   * Get peak usage time from monitoring data
   */
  private static getPeakUsageTime(): string {
    const analytics = apiOptimizer.getMonitoringAnalytics(60);
    const endpoints = analytics.topEndpoints as any[];

    if (endpoints.length === 0) return "No data";

    const peak = endpoints[0];
    return `${peak.endpoint} (${peak.count} requests)`;
  }

  /**
   * Calculate average tokens used per user
   */
  private static calculateAvgTokensPerUser(
    rateLimitStatus: Record<string, any>,
    totalRequests: number
  ): number {
    if (totalRequests === 0 || Object.keys(rateLimitStatus).length === 0) return 0;

    const userCount = Object.keys(rateLimitStatus).length;
    const avgTokensPerRequest = 1 / userCount; // Simplified calculation

    return Math.round(totalRequests * avgTokensPerRequest);
  }

  /**
   * Health check for API optimization system
   */
  static performHealthCheck(): Record<string, any> {
    const analytics = apiOptimizer.getMonitoringAnalytics(5); // Last 5 minutes
    const cacheStats = apiOptimizer.getCacheStats();

    const health = {
      status: "healthy" as "healthy" | "warning" | "critical",
      checks: {
        cacheHitRate: analytics.cacheHitRate >= 20 ? "pass" : "warning",
        responseTime: analytics.averageResponseTime < 500 ? "pass" : "warning",
        failureRate: (analytics.totalRequests - analytics.failureCount) / analytics.totalRequests > 0.95 ? "pass" : "critical",
        cacheSize: cacheStats.cacheSize < 50 * 1024 * 1024 ? "pass" : "warning", // <50MB
      },
      metrics: {
        cacheHitRate: analytics.cacheHitRate,
        avgResponseTime: analytics.averageResponseTime,
        successRate: Math.round(
          ((analytics.totalRequests - analytics.failureCount) / analytics.totalRequests) * 100
        ),
        cacheEntries: cacheStats.totalEntries,
      },
    };

    // Determine overall status
    if (Object.values(health.checks).includes("critical")) {
      health.status = "critical";
    } else if (Object.values(health.checks).includes("warning")) {
      health.status = "warning";
    }

    return health;
  }

  /**
   * Optimize for concurrent users
   * STRICT global limit: 12 API calls/min shared across ALL users
   */
  static optimizeForConcurrency(activeUserCount: number): Record<string, any> {
    const avgTokensPerUser = Math.round(12 / Math.max(1, activeUserCount));
    const isHighConcurrency = activeUserCount > 5;

    return {
      activeUsers: activeUserCount,
      globalLimit: 12,
      avgTokensPerUser,
      totalCapacity: 12,
      limitType: "STRICT GLOBAL (12 API calls/min shared across ALL concurrent users)",
      recommendation: isHighConcurrency
        ? `With ${activeUserCount} concurrent users, average ${avgTokensPerUser} tokens/user/min. Heavy reliance on caching (${100 - (activeUserCount * 10)}%) required.`
        : `With ${activeUserCount} concurrent user(s), each can use up to ${avgTokensPerUser} API calls/min. Implement smart caching to reduce API usage.`,
      strategy:
        activeUserCount > 10
          ? "aggressive_caching_required"
          : activeUserCount > 5
            ? "smart_caching_recommended"
            : "balanced_api_and_cache",
      cacheRecommendation: `Recommend cache hit rate of at least ${Math.min(95, 70 + activeUserCount * 5)}% for optimal performance`,
    };
  }
}

// Export monitoring endpoint handler
export function registerMonitoringRoutes(app: any): void {
  // Get usage report
  app.get("/api/admin/monitoring/usage-report", (req: any, res: any) => {
    try {
      const minutes = parseInt(req.query.minutes as string) || 60;
      const report = APIMonitoringService.generateUsageReport(minutes);
      res.json(report);
    } catch (error) {
      console.error("[MONITORING] Error generating usage report:", error);
      res.status(500).json({ error: "Failed to generate usage report" });
    }
  });

  // Health check
  app.get("/api/admin/monitoring/health", (req: any, res: any) => {
    try {
      const health = APIMonitoringService.performHealthCheck();
      res.json(health);
    } catch (error) {
      console.error("[MONITORING] Error performing health check:", error);
      res.status(500).json({ error: "Failed to perform health check" });
    }
  });

  // Concurrency optimization
  app.get("/api/admin/monitoring/concurrency/:userCount", (req: any, res: any) => {
    try {
      const userCount = parseInt(req.params.userCount as string) || 1;
      const optimization = APIMonitoringService.optimizeForConcurrency(userCount);
      res.json(optimization);
    } catch (error) {
      console.error("[MONITORING] Error optimizing concurrency:", error);
      res.status(500).json({ error: "Failed to optimize concurrency" });
    }
  });

  // Get full system stats
  app.get("/api/admin/monitoring/stats", (req: any, res: any) => {
    try {
      const stats = apiOptimizer.getSystemStats();
      res.json(stats);
    } catch (error) {
      console.error("[MONITORING] Error getting system stats:", error);
      res.status(500).json({ error: "Failed to get system stats" });
    }
  });
}
