/**
 * Cisco API Client Service
 * Handles all interactions with Cisco API endpoints
 * Integrates with rate limiting and caching via API optimizer
 */

import { apiOptimizer } from "./api-optimizer";
import { DecisionMatrix } from "./api-integration-matrix";

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  responseTime?: number;
}

interface CiscoAPIPrediction {
  timestamp: string;
  value: number;
  confidence: number;
  trend: "increasing" | "decreasing" | "stable";
}

interface FieldNoticeInsight {
  fnId: string;
  title: string;
  summary: string;
  affectedComponents: string[];
  severity: "critical" | "high" | "medium" | "low";
  recommendedActions: string[];
}

interface AnomalyAlert {
  timestamp: string;
  metric: string;
  expectedValue: number;
  actualValue: number;
  severity: "critical" | "warning" | "info";
  description: string;
}

export class CiscoAPIClient {
  private apiKey: string;
  private baseURL: string = "https://api.cisco.com/sre";
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Make optimized API call with rate limiting and caching
   */
  private async makeRequest<T>(
    endpoint: string,
    operation: string,
    userId: string = "system",
    params: Record<string, any> = {}
  ): Promise<APIResponse<T>> {
    const startTime = Date.now();
    try {

      // Check decision matrix
      const decision = DecisionMatrix.getEntry(operation);
      if (!decision) {
        return {
          success: false,
          error: `Unknown operation: ${operation}`,
        };
      }

      // Check cache first
      const cacheKey = apiOptimizer.getCacheKey(endpoint, params);
      const cached = apiOptimizer.getFromCache(cacheKey);

      if (cached) {
        console.log(`[CISCO-API] Cache HIT for ${operation}`);
        apiOptimizer.recordMonitoring({
          endpoint,
          useAPI: false,
          cacheHit: true,
          responseTime: 0,
          statusCode: 200,
          tokensUsed: 0,
        });
        return {
          success: true,
          data: cached,
          cached: true,
          responseTime: Date.now() - startTime,
        };
      }

      // Check rate limit
      const allowed = await apiOptimizer.checkRateLimit(userId);
      if (!allowed) {
        console.warn(`[CISCO-API] Rate limit exceeded for user ${userId}`);
        return {
          success: false,
          error: "Rate limit exceeded. Please try again in a moment.",
        };
      }

      // Make actual API call
      console.log(`[CISCO-API] Making API call to ${endpoint} for ${operation}`);

      const response = await this.callCiscoAPI<T>(endpoint, params);

      if (response) {
        // Cache the result
        apiOptimizer.setCache(cacheKey, response, decision.cacheTTL);

        const responseTime = Date.now() - startTime;

        apiOptimizer.recordMonitoring({
          endpoint,
          useAPI: true,
          cacheHit: false,
          responseTime,
          statusCode: 200,
          tokensUsed: decision.rateLimitCost,
        });

        return {
          success: true,
          data: response,
          cached: false,
          responseTime,
        };
      }

      return {
        success: false,
        error: "Failed to fetch from Cisco API",
      };
    } catch (error) {
      console.error(`[CISCO-API] Error for ${operation}:`, error);

      apiOptimizer.recordMonitoring({
        endpoint,
        useAPI: true,
        cacheHit: false,
        responseTime: Date.now() - startTime,
        statusCode: 500,
        tokensUsed: 0,
      });

      return {
        success: false,
        error: `API request failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Call Cisco API endpoint with authentication
   */
  private async callCiscoAPI<T>(endpoint: string, params: Record<string, any>): Promise<T | null> {
    try {
      const url = new URL(`${this.baseURL}${endpoint}`);

      // Add query parameters
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "SRE-AgenticOps/1.0",
        },
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT),
      });

      if (!response.ok) {
        console.error(`[CISCO-API] HTTP ${response.status}: ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error("[CISCO-API] Request error:", error);
      return null;
    }
  }

  /**
   * Get vulnerability forecasting for 30 days
   */
  async getVulnerabilityForecast(
    userId: string = "system"
  ): Promise<APIResponse<CiscoAPIPrediction[]>> {
    return this.makeRequest(
      "/forecasting/vulnerability-30day",
      "get-vulnerability-forecast",
      userId,
      {}
    );
  }

  /**
   * Get KPI metrics with external validation
   */
  async getKPIMetrics(
    userId: string = "system",
    includeComparison: boolean = true
  ): Promise<APIResponse<Record<string, any>>> {
    return this.makeRequest(
      "/metrics/kpi",
      "get-kpi-metrics",
      userId,
      { include_comparison: includeComparison }
    );
  }

  /**
   * Get field notice insights and NLP analysis
   */
  async getFieldNoticeInsights(
    fieldNoticeId: string,
    userId: string = "system"
  ): Promise<APIResponse<FieldNoticeInsight>> {
    return this.makeRequest(
      `/fnm/insights/${fieldNoticeId}`,
      "get-field-notice-insights",
      userId,
      { fnId: fieldNoticeId }
    );
  }

  /**
   * Get risk assessment with external data
   */
  async getRiskAssessment(
    customerId: string,
    userId: string = "system"
  ): Promise<APIResponse<Record<string, any>>> {
    return this.makeRequest(
      `/risk/assessment/${customerId}`,
      "get-risk-assessment",
      userId,
      { customerId }
    );
  }

  /**
   * Get health score benchmarking
   */
  async getHealthScoreBenchmark(
    userId: string = "system"
  ): Promise<APIResponse<Record<string, any>>> {
    return this.makeRequest(
      "/health/benchmarks",
      "get-health-score",
      userId,
      {}
    );
  }

  /**
   * Get trend analysis over time
   */
  async getTrendAnalysis(
    metricType: string,
    days: number = 90,
    userId: string = "system"
  ): Promise<APIResponse<CiscoAPIPrediction[]>> {
    return this.makeRequest(
      `/analytics/trends/${metricType}`,
      "get-trend-analysis",
      userId,
      { days, metric_type: metricType }
    );
  }

  /**
   * Get customer vulnerability insights
   */
  async getCustomerInsights(
    customerId: string,
    userId: string = "system"
  ): Promise<APIResponse<Record<string, any>>> {
    return this.makeRequest(
      `/customers/insights/${customerId}`,
      "get-customer-insights",
      userId,
      { customerId }
    );
  }

  /**
   * Detect anomalies with external ML
   */
  async detectAnomalies(
    userId: string = "system"
  ): Promise<APIResponse<AnomalyAlert[]>> {
    return this.makeRequest(
      "/ml/anomaly-detection",
      "get-anomaly-detection",
      userId,
      {}
    );
  }

  /**
   * Get all API operations available
   */
  static getAvailableOperations(): Record<string, string> {
    return {
      "get-vulnerability-forecast": "30-day vulnerability trend forecasting",
      "get-kpi-metrics": "External KPI metrics with benchmarking",
      "get-field-notice-insights": "Deep NLP analysis of field notices",
      "get-risk-assessment": "Risk scoring with external context",
      "get-health-score": "Health score benchmarking",
      "get-trend-analysis": "Historical trend analysis",
      "get-customer-insights": "Customer vulnerability insights",
      "get-anomaly-detection": "ML-powered anomaly detection",
    };
  }

  /**
   * Validate API key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/auth/validate`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
let ciscoClient: CiscoAPIClient | null = null;

export function initializeCiscoAPI(apiKey: string): CiscoAPIClient {
  if (ciscoClient) {
    return ciscoClient;
  }
  ciscoClient = new CiscoAPIClient(apiKey);
  return ciscoClient;
}

export function getCiscoAPI(): CiscoAPIClient | null {
  return ciscoClient;
}
