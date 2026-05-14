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

// ─── CIRCUIT API integration (merged from cisco-circuit.ts) ─────────────────

const CISCO_CIRCUIT_API_KEY = process.env.CISCO_CIRCUIT_API_KEY || '';
const CISCO_CIRCUIT_ENDPOINT = process.env.CISCO_CIRCUIT_ENDPOINT || "https://circuit.cisco.com/api/v1";

export interface CircuitResponse {
  success: boolean;
  content?: string;
  error?: string;
  model: string;
  timestamp: string;
}

export async function testTextGeneration(prompt: string): Promise<CircuitResponse> {
  try {
    const response = await fetch(`${CISCO_CIRCUIT_ENDPOINT}/summarize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CISCO_CIRCUIT_API_KEY}`,
        "X-Cisco-App": "SRE-AgenticOps-Dashboard"
      },
      body: JSON.stringify({ prompt, max_tokens: 500, temperature: 0.7 })
    });

    if (!response.ok) {
      console.warn(`[CIRCUIT API] Error: ${response.status}, using fallback`);
      return { success: false, error: `API returned ${response.status}`, content: "Cisco CIRCUIT API test - fallback response", model: "cisco-circuit-fallback", timestamp: new Date().toISOString() };
    }

    const data = await response.json();
    return { success: true, content: data.summary || data.content || data.text || "Response received", model: "cisco-circuit-summarize", timestamp: new Date().toISOString() };
  } catch (error) {
    console.warn("[CIRCUIT API] Failed:", error instanceof Error ? error.message : "Unknown error");
    return { success: false, error: error instanceof Error ? error.message : "Unknown error", content: "Cisco CIRCUIT API connectivity test - fallback mode", model: "cisco-circuit-fallback", timestamp: new Date().toISOString() };
  }
}

export async function analyzeVulnerabilityData(inputData: {
  customerName: string;
  totVuln: number;
  potVuln: number;
  notVuln: number;
}): Promise<CircuitResponse> {
  try {
    const totalAssets = inputData.totVuln + inputData.potVuln + inputData.notVuln;
    const prompt = `As a cybersecurity expert, analyze this vulnerability data for ${inputData.customerName}:
- Vulnerable Assets: ${inputData.totVuln}
- Potentially Vulnerable Assets: ${inputData.potVuln}
- Not Vulnerable Assets: ${inputData.notVuln}
- Total Assets: ${totalAssets}

Provide:
1. Risk Assessment (Low/Medium/High/Critical)
2. Key Concerns
3. Recommended Actions
Keep response concise and actionable.`;

    const response = await fetch(`${CISCO_CIRCUIT_ENDPOINT}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CISCO_CIRCUIT_API_KEY}`,
        "X-Cisco-App": "SRE-AgenticOps-Dashboard"
      },
      body: JSON.stringify({ prompt, context: "vulnerability_analysis", max_tokens: 1000 })
    });

    if (!response.ok) {
      console.warn(`[CIRCUIT API] Analysis error: ${response.status}, using fallback`);
      return generateFallbackAnalysis(inputData);
    }

    const result = await response.json();
    return { success: true, content: result.analysis || result.content || result.text || "Analysis complete", model: "cisco-circuit-analyze", timestamp: new Date().toISOString() };
  } catch (error) {
    console.warn("[CIRCUIT API] Analysis failed, using fallback:", error instanceof Error ? error.message : "Unknown error");
    return generateFallbackAnalysis(inputData);
  }
}

export async function generateSecurityRecommendations(context: string): Promise<CircuitResponse> {
  try {
    const prompt = `You are a senior security architect at Cisco. Based on this context:
${context}

Provide 5 specific, actionable security recommendations with implementation priority.`;

    const response = await fetch(`${CISCO_CIRCUIT_ENDPOINT}/recommendations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CISCO_CIRCUIT_API_KEY}`,
        "X-Cisco-App": "SRE-AgenticOps-Dashboard"
      },
      body: JSON.stringify({ prompt, context: "security_recommendations", max_tokens: 1500, temperature: 0.8 })
    });

    if (!response.ok) {
      console.warn(`[CIRCUIT API] Recommendations error: ${response.status}, using fallback`);
      return generateFallbackRecommendations(context);
    }

    const result = await response.json();
    return { success: true, content: result.recommendations || result.content || result.text || "No recommendations available", model: "cisco-circuit-recommendations", timestamp: new Date().toISOString() };
  } catch (error) {
    console.warn("[CIRCUIT API] Recommendations failed, using fallback:", error instanceof Error ? error.message : "Unknown error");
    return generateFallbackRecommendations(context);
  }
}

function generateFallbackAnalysis(data: { customerName: string; totVuln: number; potVuln: number; notVuln: number }): CircuitResponse {
  const totalAssets = data.totVuln + data.potVuln + data.notVuln;
  const vulnPercentage = ((data.totVuln / totalAssets) * 100).toFixed(1);
  const potVulnPercentage = ((data.potVuln / totalAssets) * 100).toFixed(1);
  let riskLevel = "Low";
  if (data.totVuln > totalAssets * 0.2) riskLevel = "Critical";
  else if (data.totVuln > totalAssets * 0.1) riskLevel = "High";
  else if (data.totVuln > totalAssets * 0.05) riskLevel = "Medium";

  const content = `**Risk Assessment: ${riskLevel}**\n\n**Key Metrics for ${data.customerName}:**\n- Total Assets: ${totalAssets.toLocaleString()}\n- Vulnerable: ${data.totVuln.toLocaleString()} (${vulnPercentage}%)\n- Potentially Vulnerable: ${data.potVuln.toLocaleString()} (${potVulnPercentage}%)\n- Secure: ${data.notVuln.toLocaleString()}\n\n**Recommended Actions:**\n1. Prioritize patching of ${data.totVuln} confirmed vulnerable assets\n2. Conduct detailed assessment of ${data.potVuln} potentially vulnerable assets\n3. Implement continuous vulnerability scanning\n4. Establish automated patch management workflows\n5. Review security policies based on current threat landscape`;

  return { success: true, content, model: "cisco-fallback-analysis", timestamp: new Date().toISOString() };
}

function generateFallbackRecommendations(context: string): CircuitResponse {
  const insights: string[] = [];
  const forecastMatch = context.match(/forecast (\d+(?:,\d{3})*)/);
  const confidenceMatch = context.match(/Confidence level (\d+)%/);
  const trendMatch = context.match(/Trend: (\w+)/);
  const trend = trendMatch ? trendMatch[1] : 'stable';
  const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 0;

  if (trend === 'increasing' || trend === 'INCREASING') {
    insights.push("Trend Analysis: Vulnerability count is increasing - implement proactive threat hunting and enhanced monitoring.");
  }
  if (confidence > 80) {
    insights.push("High Confidence Prediction: Model shows high confidence (>80%) - prioritize resource allocation based on these forecasts.");
  } else if (confidence < 70) {
    insights.push("Moderate Confidence: Prediction confidence below 70% - consider gathering more data points for improved accuracy.");
  }
  insights.push("Strategic Priority: Focus on CVE-2024 vulnerabilities as they represent the highest current risk exposure.");
  insights.push("Automation Opportunity: Deploy AI-powered vulnerability scanners to handle the scale of expected growth.");

  return { success: true, content: insights.join('\n\n'), model: "cisco-fallback-recommendations", timestamp: new Date().toISOString() };
}
