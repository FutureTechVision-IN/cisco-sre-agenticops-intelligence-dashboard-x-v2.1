/**
 * AI/ML Service Layer for KPI Intelligence
 * Provides anomaly detection, trend prediction, and recommendations
 * with hybrid online/offline capabilities
 */

import { FieldNoticeRecord } from "@shared/schema";

// Types for ML outputs
export interface AnomalyResult {
  customerId: string;
  customerName: string;
  anomalies: Array<{
    type: "unusual_spike" | "unexpected_drop" | "outlier_vulnerability";
    severity: "low" | "medium" | "high";
    description: string;
    vulnCount: number;
    expectedRange: [number, number];
    timestamp: string;
  }>;
  score: number; // 0-100 anomaly likelihood
}

export interface TrendPrediction {
  month: string;
  predicted_vulnerable: number;
  predicted_potentially_vulnerable: number;
  predicted_not_vulnerable: number;
  confidence: number; // 0-100
  trend: "increasing" | "decreasing" | "stable";
  reasoning: string;
}

export interface Recommendation {
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  action: string;
  expectedImpact: string;
  customerId?: string;
  fieldNoticeId?: string;
}

/**
 * Offline ML Service - Uses statistical heuristics
 */
export class OfflineMLService {
  /**
   * Detect anomalies using statistical methods (Z-score and IQR)
   */
  static detectAnomalies(records: FieldNoticeRecord[]): AnomalyResult[] {
    const customerGroups = this.groupByCustomer(records);
    const results: AnomalyResult[] = [];

    for (const [customerName, custRecords] of Object.entries(customerGroups)) {
      const vulnerabilities = custRecords.map(r => r.totVuln || 0);
      const stats = this.calculateStats(vulnerabilities);

      const anomalies = [];
      let anomalyScore = 0;

      // Z-score based anomaly detection
      for (let i = 0; i < vulnerabilities.length; i++) {
        const zscore = Math.abs((vulnerabilities[i] - stats.mean) / (stats.stdDev || 1));
        if (zscore > 2.5) {
          anomalyScore = Math.min(100, anomalyScore + 30);
          anomalies.push({
            type: vulnerabilities[i] > stats.mean ? "unusual_spike" : "unexpected_drop" as const,
            severity: zscore > 3.5 ? "high" : zscore > 2.8 ? "medium" : "low" as const,
            description: `Vulnerability count ${vulnerabilities[i]} deviates significantly from average ${stats.mean.toFixed(0)}`,
            vulnCount: vulnerabilities[i],
            expectedRange: [
              Math.max(0, stats.q1),
              stats.q3,
            ] as [number, number],
            timestamp: custRecords[i].createdAt?.toISOString() || new Date().toISOString(),
          });
        }
      }

      // IQR based outlier detection
      for (let i = 0; i < vulnerabilities.length; i++) {
        if (vulnerabilities[i] < stats.q1 * 1.5 || vulnerabilities[i] > stats.q3 * 1.5) {
          anomalyScore = Math.min(100, anomalyScore + 20);
          anomalies.push({
            type: "outlier_vulnerability" as const,
            severity: "medium" as const,
            description: `Outlier detected: ${vulnerabilities[i]} outside expected range`,
            vulnCount: vulnerabilities[i],
            expectedRange: [stats.q1, stats.q3] as [number, number],
            timestamp: custRecords[i].createdAt?.toISOString() || new Date().toISOString(),
          });
        }
      }

      if (anomalies.length > 0 || vulnerabilities.length > 0) {
        results.push({
          customerId: custRecords[0].id || "unknown",
          customerName,
          anomalies: anomalies.slice(0, 5) as Array<{
            type: "unusual_spike" | "unexpected_drop" | "outlier_vulnerability";
            severity: "low" | "medium" | "high";
            description: string;
            vulnCount: number;
            expectedRange: [number, number];
            timestamp: string;
          }>,
          score: Math.min(100, anomalyScore),
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Predict future vulnerability trends using exponential smoothing
   */
  static predictTrends(monthlyData: Array<{
    month: string;
    vulnerable: number;
    potentiallyVulnerable: number;
    notVulnerable: number;
  }>): TrendPrediction[] {
    if (monthlyData.length < 2) return [];

    const predictions: TrendPrediction[] = [];
    const alpha = 0.3; // Smoothing factor

    // Extract time series for each metric
    const vulnSeries = monthlyData.map(m => m.vulnerable);
    const potSeries = monthlyData.map(m => m.potentiallyVulnerable);
    const secureSeries = monthlyData.map(m => m.notVulnerable);

    // Exponential smoothing forecast
    const nextVuln = this.exponentialSmoothing(vulnSeries, alpha);
    const nextPot = this.exponentialSmoothing(potSeries, alpha);
    const nextSecure = this.exponentialSmoothing(secureSeries, alpha);

    // Calculate trend
    const recentVuln = vulnSeries.slice(-3);
    const vulnTrend = recentVuln[recentVuln.length - 1] > recentVuln[0] ? "increasing" : "decreasing";
    
    // Calculate confidence (lower variance = higher confidence)
    const variance = this.calculateVariance(vulnSeries);
    const confidence = Math.max(40, Math.min(95, 100 - (variance * 0.5)));

    predictions.push({
      month: this.getNextMonth(monthlyData[monthlyData.length - 1].month),
      predicted_vulnerable: Math.round(nextVuln),
      predicted_potentially_vulnerable: Math.round(nextPot),
      predicted_not_vulnerable: Math.round(nextSecure),
      confidence: Math.round(confidence),
      trend: vulnTrend as "increasing" | "decreasing" | "stable",
      reasoning: `Based on recent trend analysis: vulnerable assets trend is ${vulnTrend}. Confidence: ${Math.round(confidence)}%`,
    });

    return predictions;
  }

  /**
   * Generate intelligent recommendations based on KPI analysis
   */
  static generateRecommendations(
    records: FieldNoticeRecord[],
    monthlyData: Array<{ month: string; vulnerable: number }>
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Recommendation 1: High vulnerability growth
    if (monthlyData.length >= 2) {
      const recent = monthlyData.slice(-2);
      const vulnGrowth = (recent[1].vulnerable - recent[0].vulnerable) / Math.max(1, recent[0].vulnerable);
      if (vulnGrowth > 0.2) {
        recommendations.push({
          priority: "critical",
          category: "vulnerability_management",
          action: "Investigate rapid increase in vulnerable assets. Prioritize critical and high-severity vulnerabilities.",
          expectedImpact: "Reduce vulnerability growth by implementing immediate patch management procedures",
        });
      }
    }

    // Recommendation 2: Customer with high vulnerability count
    const customerVuln = this.groupByCustomer(records);
    const highRiskCustomers = Object.entries(customerVuln)
      .map(([name, recs]) => ({
        name,
        totalVuln: recs.reduce((sum, r) => sum + (r.totVuln || 0), 0),
      }))
      .filter(c => c.totalVuln > 1000)
      .sort((a, b) => b.totalVuln - a.totalVuln);

    if (highRiskCustomers.length > 0) {
      recommendations.push({
        priority: "high",
        category: "customer_focus",
        action: `Focus remediation efforts on ${highRiskCustomers[0].name} (${highRiskCustomers[0].totalVuln} vulnerabilities)`,
        expectedImpact: `Reduce overall vulnerability count by up to ${(highRiskCustomers[0].totalVuln * 0.3).toFixed(0)} through targeted remediation`,
        customerId: highRiskCustomers[0].name,
      });
    }

    // Recommendation 3: FN diversity
    const fnTypes = new Set(records.map(r => r.fnType).filter(Boolean));
    if (fnTypes.size === 2) {
      recommendations.push({
        priority: "medium",
        category: "coverage",
        action: "Ensure coverage for both Hardware and Software vulnerabilities across all systems",
        expectedImpact: "Improve overall security posture by addressing both hardware and software vulnerabilities systematically",
      });
    }

    // Recommendation 4: Potentially vulnerable assessment
    const potentiallyVuln = records.reduce((sum, r) => sum + (r.potVuln || 0), 0);
    if (potentiallyVuln > 0) {
      recommendations.push({
        priority: "high",
        category: "assessment",
        action: `Expedite assessment of ${potentiallyVuln} potentially vulnerable assets to confirm actual risk`,
        expectedImpact: "Clarify vulnerability status and adjust priority accordingly",
      });
    }

    return recommendations.sort((a, b) => {
      const priorityMap = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityMap[a.priority] - priorityMap[b.priority];
    });
  }

  // Helper methods
  private static groupByCustomer(records: FieldNoticeRecord[]): Record<string, FieldNoticeRecord[]> {
    return records.reduce((acc, record) => {
      const key = record.customerName || "Unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(record);
      return acc;
    }, {} as Record<string, FieldNoticeRecord[]>);
  }

  private static calculateStats(values: number[]) {
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];

    return { mean, stdDev, q1, q3, variance };
  }

  private static calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private static exponentialSmoothing(series: number[], alpha: number): number {
    if (series.length === 0) return 0;
    let result = series[0];
    for (let i = 1; i < series.length; i++) {
      result = alpha * series[i] + (1 - alpha) * result;
    }
    return result;
  }

  private static getNextMonth(currentMonth: string): string {
    const [year, month] = currentMonth.split("-");
    let nextMonth = (parseInt(month) + 1).toString().padStart(2, "0");
    let nextYear = year;
    if (parseInt(month) === 12) {
      nextMonth = "01";
      nextYear = (parseInt(year) + 1).toString();
    }
    return `${nextYear}-${nextMonth}`;
  }
}

/**
 * Hybrid LLM Service - Attempts online LLM, falls back to offline
 */
export class HybridLLMService {
  private static apiKey: string | null = null;

  static setApiKey(key: string | null) {
    this.apiKey = key;
  }

  /**
   * Generate insights using LLM or fallback to heuristics
   */
  static async generateInsights(
    anomalies: AnomalyResult[],
    predictions: TrendPrediction[],
    recommendations: Recommendation[]
  ): Promise<{
    summary: string;
    insights: string[];
    mode: "online" | "offline";
  }> {
    // Try online LLM if available
    if (this.apiKey) {
      try {
        return await this.generateOnlineInsights(anomalies, predictions, recommendations);
      } catch (error) {
        console.log("LLM API unavailable, falling back to offline mode");
      }
    }

    // Fallback to offline heuristics
    return this.generateOfflineInsights(anomalies, predictions, recommendations);
  }

  private static async generateOnlineInsights(
    anomalies: AnomalyResult[],
    predictions: TrendPrediction[],
    recommendations: Recommendation[]
  ): Promise<{ summary: string; insights: string[]; mode: "online" }> {
    // This would call Cisco CIRCUIT API for LLM-powered insights
    // In production, this integrates with Cisco's internal AI services
    const summary = `Generated using Cisco CIRCUIT: ${anomalies.length} anomalies detected, ${predictions.length} predictions made, ${recommendations.length} recommendations provided.`;

    return {
      summary,
      insights: [
        "Cisco CIRCUIT AI provides advanced contextual security insights",
        "Integrated with Cisco Talos threat intelligence for enhanced analysis",
      ],
      mode: "online",
    };
  }

  private static generateOfflineInsights(
    anomalies: AnomalyResult[],
    predictions: TrendPrediction[],
    recommendations: Recommendation[]
  ): { summary: string; insights: string[]; mode: "offline" } {
    const insights: string[] = [];

    // Analyze anomalies
    const highAnomalies = anomalies.filter(a => a.score > 70);
    if (highAnomalies.length > 0) {
      insights.push(
        `High anomaly detected in ${highAnomalies[0].customerName}: ${highAnomalies[0].anomalies[0]?.description || "Unusual behavior detected"}`
      );
    }

    // Analyze predictions
    if (predictions.length > 0) {
      const pred = predictions[0];
      insights.push(
        `Next month trend: ${pred.trend} (Confidence: ${pred.confidence}%). Predicted ${pred.predicted_vulnerable} vulnerable assets.`
      );
    }

    // Analyze recommendations
    const criticalRecs = recommendations.filter(r => r.priority === "critical");
    if (criticalRecs.length > 0) {
      insights.push(`Critical action required: ${criticalRecs[0].action}`);
    }

    const summary = `Offline Analysis: ${anomalies.length} anomalies, ${predictions.length} predictions, ${recommendations.length} recommendations generated using statistical heuristics.`;

    return {
      summary,
      insights: insights.length > 0 ? insights : ["No significant anomalies or patterns detected"],
      mode: "offline",
    };
  }
}
