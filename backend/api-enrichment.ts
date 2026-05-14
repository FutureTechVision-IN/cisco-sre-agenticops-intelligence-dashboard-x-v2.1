/**
 * API Enrichment Service
 * Combines built-in ML with Cisco API data for enhanced analytics
 * Uses decision matrix to determine optimal data source
 */

import { getCiscoAPI } from "./cisco-api-client";
import { KPIMLEngine } from "./kpi-ml-engine";
import { DecisionMatrix } from "./api-integration-matrix";

export class APIEnrichmentService {
  /**
   * Enrich KPI metrics with external data when available
   */
  static async enrichKPIMetrics(
    baseMetrics: Record<string, any>,
    userId: string = "system"
  ): Promise<Record<string, any>> {
    const ciscoAPI = getCiscoAPI();
    const decision = DecisionMatrix.getEntry("get-kpi-metrics");

    if (!ciscoAPI || !decision) {
      return baseMetrics;
    }

    // Decide whether to use API
    if (decision.recommendedApproach === "hybrid" || decision.recommendedApproach === "api") {
      try {
        const apiMetrics = await ciscoAPI.getKPIMetrics(userId);

        if (apiMetrics.success && apiMetrics.data) {
          // Merge API data with built-in metrics
          return {
            ...baseMetrics,
            external: apiMetrics.data,
            hasExternalData: true,
            dataSource: apiMetrics.cached ? "cache" : "live_api",
            responseTime: apiMetrics.responseTime,
          };
        }
      } catch (error) {
        console.error("[ENRICHMENT] Error enriching KPI metrics:", error);
        // Fall through to return base metrics
      }
    }

    return baseMetrics;
  }

  /**
   * Enhance vulnerability forecast with external predictions
   */
  static async enhanceForecast(
    builtInForecast: any[],
    userId: string = "system"
  ): Promise<any[]> {
    const ciscoAPI = getCiscoAPI();
    const decision = DecisionMatrix.getEntry("get-vulnerability-forecast");

    if (!ciscoAPI || !decision) {
      return builtInForecast;
    }

    try {
      const apiForecasts = await ciscoAPI.getVulnerabilityForecast(userId);

      if (apiForecasts.success && apiForecasts.data) {
        // Blend predictions: 60% built-in, 40% API for confidence
        return builtInForecast.map((item, idx) => {
          const apiItem = apiForecasts.data?.[idx];

          if (apiItem) {
            return {
              ...item,
              externalPrediction: apiItem.value,
              blendedValue: Math.round(item.value * 0.6 + apiItem.value * 0.4),
              confidence: Math.max(item.confidence || 0, apiItem.confidence),
              source: "hybrid",
            };
          }

          return item;
        });
      }
    } catch (error) {
      console.error("[ENRICHMENT] Error enhancing forecast:", error);
    }

    return builtInForecast;
  }

  /**
   * Enhance field notice data with NLP and external insights
   */
  static async enhanceFieldNotice(
    fieldNotice: any,
    userId: string = "system"
  ): Promise<any> {
    const ciscoAPI = getCiscoAPI();
    const decision = DecisionMatrix.getEntry("get-field-notice-insights");

    if (!ciscoAPI || !decision) {
      return fieldNotice;
    }

    try {
      const insights = await ciscoAPI.getFieldNoticeInsights(fieldNotice.id, userId);

      if (insights.success && insights.data) {
        return {
          ...fieldNotice,
          insights: insights.data,
          severity: insights.data.severity,
          affectedComponents: insights.data.affectedComponents,
          recommendedActions: insights.data.recommendedActions,
          hasExternalInsights: true,
        };
      }
    } catch (error) {
      console.error("[ENRICHMENT] Error enhancing field notice:", error);
    }

    return fieldNotice;
  }

  /**
   * Enrich anomaly detection with external data
   */
  static async enrichAnomalyDetection(
    builtInAnomalies: any[],
    userId: string = "system"
  ): Promise<any[]> {
    const ciscoAPI = getCiscoAPI();
    const decision = DecisionMatrix.getEntry("get-anomaly-detection");

    if (!ciscoAPI || decision?.rateLimitCost === 0) {
      // Built-in only for this operation
      return builtInAnomalies;
    }

    try {
      const externalAnomalies = await ciscoAPI.detectAnomalies(userId);

      if (externalAnomalies.success && externalAnomalies.data) {
        // Combine both sources
        const combined = new Map<string, any>();

        // Add built-in anomalies
        for (const anomaly of builtInAnomalies) {
          const ts = typeof anomaly.timestamp === "string" 
            ? new Date(anomaly.timestamp).getTime() 
            : (anomaly.timestamp as number);
          const key = `${anomaly.metric}_${Math.floor(ts / 60000)}`;
          combined.set(key, {
            ...anomaly,
            source: "builtin",
          });
        }

        // Merge external anomalies
        for (const anomaly of externalAnomalies.data) {
          const ts = typeof anomaly.timestamp === "string" 
            ? new Date(anomaly.timestamp).getTime() 
            : (anomaly.timestamp as number);
          const key = `${anomaly.metric}_${Math.floor(ts / 60000)}`;
          if (combined.has(key)) {
            const existing = combined.get(key);
            combined.set(key, {
              ...existing,
              externalSeverity: anomaly.severity,
              confirmed: true, // Confirmed by external source
              source: "hybrid",
            });
          } else {
            combined.set(key, {
              ...anomaly,
              source: "external",
            });
          }
        }

        return Array.from(combined.values());
      }
    } catch (error) {
      console.error("[ENRICHMENT] Error enriching anomaly detection:", error);
    }

    return builtInAnomalies;
  }

  /**
   * Enrich customer insights with external data
   */
  static async enrichCustomerInsights(
    customerId: string,
    builtInData: Record<string, any>,
    userId: string = "system"
  ): Promise<Record<string, any>> {
    const ciscoAPI = getCiscoAPI();
    const decision = DecisionMatrix.getEntry("get-customer-insights");

    if (!ciscoAPI || !decision) {
      return builtInData;
    }

    try {
      const externalInsights = await ciscoAPI.getCustomerInsights(customerId, userId);

      if (externalInsights.success && externalInsights.data) {
        return {
          ...builtInData,
          external: externalInsights.data,
          enriched: true,
          sources: ["builtin", "cisco_api"],
        };
      }
    } catch (error) {
      console.error("[ENRICHMENT] Error enriching customer insights:", error);
    }

    return builtInData;
  }

  /**
   * Get enrichment statistics
   */
  static getEnrichmentStats(): Record<string, any> {
    const ciscoAPI = getCiscoAPI();

    return {
      apiAvailable: ciscoAPI !== null,
      availableOperations: ciscoAPI ? CiscoAPIClient.getAvailableOperations() : {},
      decisionMatrix: DecisionMatrix.getMatrixStats(),
    };
  }
}

import { CiscoAPIClient } from "./cisco-api-client";
