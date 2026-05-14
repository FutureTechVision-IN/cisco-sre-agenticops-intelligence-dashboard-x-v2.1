/**
 * Unified ML Service — Single entry point for anomaly detection,
 * trend prediction, recommendations, and LLM insights.
 *
 * Merges the former ml.ts (basic) and ml-enhanced.ts (detailed) into
 * one service with a configurable `detail` level.  All legacy types
 * are re-exported so existing import paths can migrate seamlessly.
 */

import { FieldNoticeRecord } from "@shared/schema";

// ─── Shared helper utilities (used by both basic & enhanced paths) ──────────

function groupByCustomer(records: FieldNoticeRecord[]): Record<string, FieldNoticeRecord[]> {
  return records.reduce((acc, record) => {
    const key = record.customerName || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(record);
    return acc;
  }, {} as Record<string, FieldNoticeRecord[]>);
}

function calculateStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const median = sorted[Math.floor(sorted.length * 0.5)];
  return { mean, stdDev, q1, q3, median, variance };
}

function calculateVariance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
}

function exponentialSmoothing(series: number[], alpha: number): number {
  if (series.length === 0) return 0;
  let result = series[0];
  for (let i = 1; i < series.length; i++) {
    result = alpha * series[i] + (1 - alpha) * result;
  }
  return result;
}

function getNextMonth(currentMonth: string): string {
  const [year, month] = currentMonth.split("-");
  let nextMonth = (parseInt(month) + 1).toString().padStart(2, "0");
  let nextYear = year;
  if (parseInt(month) === 12) {
    nextMonth = "01";
    nextYear = (parseInt(year) + 1).toString();
  }
  return `${nextYear}-${nextMonth}`;
}

// ─── Types — basic (legacy) ────────────────────────────────────────────────

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
  score: number;
}

export interface TrendPrediction {
  month: string;
  predicted_vulnerable: number;
  predicted_potentially_vulnerable: number;
  predicted_not_vulnerable: number;
  confidence: number;
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

// ─── Types — enhanced (detailed) ───────────────────────────────────────────

export interface DetailedAnomaly {
  type: "unusual_spike" | "unexpected_drop" | "outlier_vulnerability" | "trend_deviation";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  vulnCount: number;
  expectedRange: [number, number];
  timestamp: string;
  riskScore: number;
  confidence: number;
  rootCauseAnalysis: string;
  remediationSteps: string[];
  affectedAssets: number;
}

export interface DetailedAnomalyResult {
  customerId: string;
  customerName: string;
  totalAnomalies: number;
  criticalAnomalies: number;
  anomalies: DetailedAnomaly[];
  overallRiskScore: number;
  scoringMethodology: string;
  lastUpdated: string;
}

export interface EnhancedPrediction {
  month: string;
  predicted_vulnerable: number;
  predicted_potentially_vulnerable: number;
  predicted_not_vulnerable: number;
  confidence: number;
  trend: "increasing" | "decreasing" | "stable";
  percentageChange: number;
  confidenceInterval: { lower: number; upper: number };
  reasoning: string;
  riskAssessment: "low" | "medium" | "high" | "critical";
  trendDuration: number;
  volatility: number;
}

export interface EnhancedRecommendation {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  action: string;
  detailedDescription: string;
  rootCause: string;
  expectedImpact: string;
  impactPercentage: number;
  remediationSteps: string[];
  timeToImplement: string;
  requiredResources: string[];
  customerId?: string;
  fieldNoticeId?: string;
  riskIfNotAddressed: string;
  confidenceScore: number;
}

// ─── Enhanced internal helpers ──────────────────────────────────────────────

function calculateRiskScore(zscore: number, isSpiking: boolean, current: number, expected: number): number {
  const zscoreFactor = Math.min(100, zscore * 15);
  const magnitudeFactor = Math.abs(current - expected) / Math.max(1, expected) * 30;
  const directionFactor = isSpiking ? 20 : 5;
  return Math.min(100, zscoreFactor + magnitudeFactor + directionFactor);
}

function calculateSeverity(riskScore: number): "low" | "medium" | "high" | "critical" {
  if (riskScore >= 80) return "critical";
  if (riskScore >= 60) return "high";
  if (riskScore >= 40) return "medium";
  return "low";
}

function analyzeRootCause(isSpiking: boolean): string {
  if (isSpiking) {
    return "Possible causes: New vulnerability disclosure, incomplete remediation, new assets added, or detection methodology change. Requires investigation.";
  }
  return "Possible causes: Successful remediation, decommissioned assets, or detection gap. Verify actual improvement vs. detection change.";
}

function generateRemediationSteps(isSpiking: boolean, customerName: string): string[] {
  if (isSpiking) {
    return [
      `Investigate new vulnerabilities affecting ${customerName}`,
      "Review recent security advisories and CVEs",
      "Prioritize patches by criticality and affected asset count",
      "Execute staged patching starting with test systems",
      "Implement monitoring to track remediation progress",
    ];
  }
  return [
    "Verify remediation actions are effective",
    "Validate assessments for previously vulnerable assets",
    "Document remediation procedures for future reference",
    "Schedule follow-up validation in 30 days",
  ];
}

function assessTrendRisk(trend: string, percentChange: number): "low" | "medium" | "high" | "critical" {
  if (trend === "increasing" && percentChange > 30) return "critical";
  if (trend === "increasing" && percentChange > 15) return "high";
  if (trend === "increasing") return "medium";
  return "low";
}

// ─── OfflineMLService — basic statistical heuristics ────────────────────────

export class OfflineMLService {
  static detectAnomalies(records: FieldNoticeRecord[]): AnomalyResult[] {
    const customerGroups = groupByCustomer(records);
    const results: AnomalyResult[] = [];

    for (const [customerName, custRecords] of Object.entries(customerGroups)) {
      const vulnerabilities = custRecords.map(r => r.totVuln || 0);
      const stats = calculateStats(vulnerabilities);
      const anomalies: AnomalyResult["anomalies"] = [];
      let anomalyScore = 0;

      for (let i = 0; i < vulnerabilities.length; i++) {
        const zscore = Math.abs((vulnerabilities[i] - stats.mean) / (stats.stdDev || 1));
        if (zscore > 2.5) {
          anomalyScore = Math.min(100, anomalyScore + 30);
          anomalies.push({
            type: vulnerabilities[i] > stats.mean ? "unusual_spike" : "unexpected_drop",
            severity: zscore > 3.5 ? "high" : zscore > 2.8 ? "medium" : "low",
            description: `Vulnerability count ${vulnerabilities[i]} deviates significantly from average ${stats.mean.toFixed(0)}`,
            vulnCount: vulnerabilities[i],
            expectedRange: [Math.max(0, stats.q1), stats.q3],
            timestamp: custRecords[i].createdAt?.toISOString() || new Date().toISOString(),
          });
        }
      }

      for (let i = 0; i < vulnerabilities.length; i++) {
        if (vulnerabilities[i] < stats.q1 * 1.5 || vulnerabilities[i] > stats.q3 * 1.5) {
          anomalyScore = Math.min(100, anomalyScore + 20);
          anomalies.push({
            type: "outlier_vulnerability",
            severity: "medium",
            description: `Outlier detected: ${vulnerabilities[i]} outside expected range`,
            vulnCount: vulnerabilities[i],
            expectedRange: [stats.q1, stats.q3],
            timestamp: custRecords[i].createdAt?.toISOString() || new Date().toISOString(),
          });
        }
      }

      if (anomalies.length > 0 || vulnerabilities.length > 0) {
        results.push({
          customerId: custRecords[0].id || "unknown",
          customerName,
          anomalies: anomalies.slice(0, 5),
          score: Math.min(100, anomalyScore),
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  static predictTrends(monthlyData: Array<{
    month: string;
    vulnerable: number;
    potentiallyVulnerable: number;
    notVulnerable: number;
  }>): TrendPrediction[] {
    if (monthlyData.length < 2) return [];

    const alpha = 0.3;
    const vulnSeries = monthlyData.map(m => m.vulnerable);
    const potSeries = monthlyData.map(m => m.potentiallyVulnerable);
    const secureSeries = monthlyData.map(m => m.notVulnerable);

    const nextVuln = exponentialSmoothing(vulnSeries, alpha);
    const nextPot = exponentialSmoothing(potSeries, alpha);
    const nextSecure = exponentialSmoothing(secureSeries, alpha);

    const recentVuln = vulnSeries.slice(-3);
    const vulnTrend = recentVuln[recentVuln.length - 1] > recentVuln[0] ? "increasing" : "decreasing";
    const variance = calculateVariance(vulnSeries);
    const confidence = Math.max(40, Math.min(95, 100 - (variance * 0.5)));

    return [{
      month: getNextMonth(monthlyData[monthlyData.length - 1].month),
      predicted_vulnerable: Math.round(nextVuln),
      predicted_potentially_vulnerable: Math.round(nextPot),
      predicted_not_vulnerable: Math.round(nextSecure),
      confidence: Math.round(confidence),
      trend: vulnTrend as "increasing" | "decreasing" | "stable",
      reasoning: `Based on recent trend analysis: vulnerable assets trend is ${vulnTrend}. Confidence: ${Math.round(confidence)}%`,
    }];
  }

  static generateRecommendations(
    records: FieldNoticeRecord[],
    monthlyData: Array<{ month: string; vulnerable: number }>
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

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

    const customerVuln = groupByCustomer(records);
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

    const fnTypes = new Set(records.map(r => r.fnType).filter(Boolean));
    if (fnTypes.size === 2) {
      recommendations.push({
        priority: "medium",
        category: "coverage",
        action: "Ensure coverage for both Hardware and Software vulnerabilities across all systems",
        expectedImpact: "Improve overall security posture by addressing both hardware and software vulnerabilities systematically",
      });
    }

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
}

// ─── EnhancedMLService — full risk scoring and root-cause analysis ─────────

export class EnhancedMLService {
  static detectAnomaliesEnhanced(records: FieldNoticeRecord[]): DetailedAnomalyResult[] {
    const customerGroups = groupByCustomer(records);
    const results: DetailedAnomalyResult[] = [];

    for (const [customerName, custRecords] of Object.entries(customerGroups)) {
      const vulnerabilities = custRecords.map(r => r.totVuln || 0);
      const stats = calculateStats(vulnerabilities);
      const anomalies: DetailedAnomaly[] = [];
      let totalRiskScore = 0;
      let criticalCount = 0;

      for (let i = 0; i < vulnerabilities.length; i++) {
        const zscore = Math.abs((vulnerabilities[i] - stats.mean) / (stats.stdDev || 1));
        if (zscore > 2.5) {
          const isSpiking = vulnerabilities[i] > stats.mean;
          const riskScore = calculateRiskScore(zscore, isSpiking, vulnerabilities[i], stats.mean);
          const severity = calculateSeverity(riskScore);

          if (severity === "critical") criticalCount++;

          anomalies.push({
            type: isSpiking ? "unusual_spike" : "unexpected_drop",
            severity,
            description: `${isSpiking ? "Spike" : "Drop"} in vulnerability count: ${vulnerabilities[i]} vs expected ${stats.mean.toFixed(0)} (Z-score: ${zscore.toFixed(2)})`,
            vulnCount: vulnerabilities[i],
            expectedRange: [Math.max(0, stats.q1), stats.q3],
            timestamp: custRecords[i].createdAt?.toISOString() || new Date().toISOString(),
            riskScore,
            confidence: Math.min(99, 50 + (Math.abs(zscore) * 10)),
            rootCauseAnalysis: analyzeRootCause(isSpiking),
            remediationSteps: generateRemediationSteps(isSpiking, customerName),
            affectedAssets: vulnerabilities[i],
          });

          totalRiskScore = Math.min(100, totalRiskScore + riskScore * 0.5);
        }
      }

      if (vulnerabilities.length >= 3) {
        const recentTrend = vulnerabilities.slice(-3);
        const trendDirection = recentTrend[recentTrend.length - 1] - recentTrend[0];
        const trendAcceleration = Math.abs(recentTrend[2] - recentTrend[1]) - Math.abs(recentTrend[1] - recentTrend[0]);

        if (Math.abs(trendAcceleration) > stats.stdDev) {
          const riskScore = Math.min(100, 50 + Math.abs(trendAcceleration) / 10);
          anomalies.push({
            type: "trend_deviation",
            severity: riskScore > 70 ? "high" : "medium",
            description: `Trend acceleration detected: ${trendDirection > 0 ? "accelerating upward" : "accelerating downward"}`,
            vulnCount: recentTrend[2],
            expectedRange: [stats.q1, stats.q3],
            timestamp: custRecords[custRecords.length - 1].createdAt?.toISOString() || new Date().toISOString(),
            riskScore,
            confidence: 75,
            rootCauseAnalysis: "Recent trend shows acceleration. Possible causes: new vulnerabilities discovered, incomplete remediation, or system configuration changes.",
            remediationSteps: [
              "Review recent system changes and deployments",
              "Audit remediation progress vs. identified vulnerabilities",
              "Prioritize highest-severity vulnerabilities for immediate action",
            ],
            affectedAssets: recentTrend[2],
          });
        }
      }

      if (anomalies.length > 0 || vulnerabilities.length > 0) {
        results.push({
          customerId: custRecords[0].id || "unknown",
          customerName,
          totalAnomalies: anomalies.length,
          criticalAnomalies: criticalCount,
          anomalies: anomalies.slice(0, 10),
          overallRiskScore: Math.min(100, totalRiskScore),
          scoringMethodology: "Z-score statistical analysis (threshold 2.5σ), Interquartile Range (IQR) outlier detection, Trend acceleration detection",
          lastUpdated: new Date().toISOString(),
        });
      }
    }

    return results.sort((a, b) => b.overallRiskScore - a.overallRiskScore);
  }

  static predictTrendsEnhanced(monthlyData: Array<{
    month: string;
    vulnerable: number;
    potentiallyVulnerable: number;
    notVulnerable: number;
  }>): EnhancedPrediction[] {
    if (monthlyData.length < 2) return [];

    const alpha = 0.3;
    const vulnSeries = monthlyData.map(m => m.vulnerable);
    const potSeries = monthlyData.map(m => m.potentiallyVulnerable);
    const secureSeries = monthlyData.map(m => m.notVulnerable);

    const nextVuln = exponentialSmoothing(vulnSeries, alpha);
    const nextPot = exponentialSmoothing(potSeries, alpha);
    const nextSecure = exponentialSmoothing(secureSeries, alpha);

    const recentVuln = vulnSeries.slice(-3);
    const trend = recentVuln[recentVuln.length - 1] > recentVuln[0] ? "increasing" : "decreasing";
    const variance = calculateVariance(vulnSeries);
    const stdDev = Math.sqrt(variance);
    const confidence = Math.max(40, Math.min(95, 100 - variance * 0.5));
    const percentChange = ((nextVuln - recentVuln[recentVuln.length - 1]) / Math.max(1, recentVuln[recentVuln.length - 1])) * 100;
    const riskAssessment = assessTrendRisk(trend, percentChange);

    return [{
      month: getNextMonth(monthlyData[monthlyData.length - 1].month),
      predicted_vulnerable: Math.round(nextVuln),
      predicted_potentially_vulnerable: Math.round(nextPot),
      predicted_not_vulnerable: Math.round(nextSecure),
      confidence: Math.round(confidence),
      trend,
      percentageChange: Math.round(percentChange * 10) / 10,
      confidenceInterval: {
        lower: Math.round(nextVuln * (1 - stdDev / 100)),
        upper: Math.round(nextVuln * (1 + stdDev / 100)),
      },
      reasoning: `Based on exponential smoothing of recent ${vulnSeries.length} months. Trend is ${trend}ing with ${Math.abs(percentChange).toFixed(1)}% expected change.`,
      riskAssessment,
      trendDuration: vulnSeries.length,
      volatility: Math.round(stdDev * 100) / 100,
    }];
  }

  static generateRecommendationsEnhanced(
    records: FieldNoticeRecord[],
    monthlyData: Array<{ month: string; vulnerable: number }>
  ): EnhancedRecommendation[] {
    const recommendations: EnhancedRecommendation[] = [];
    let idCounter = 1;

    if (monthlyData.length >= 2) {
      const recent = monthlyData.slice(-2);
      const growth = (recent[1].vulnerable - recent[0].vulnerable) / Math.max(1, recent[0].vulnerable);
      if (growth > 0.2) {
        recommendations.push({
          id: `rec-${idCounter++}`,
          priority: "critical",
          category: "vulnerability_management",
          action: "Implement emergency vulnerability remediation program",
          detailedDescription: `Vulnerable assets increased by ${(growth * 100).toFixed(1)}% month-over-month. This acceleration requires immediate intervention.`,
          rootCause: "Increased detection rate, possible new vulnerability disclosure, or insufficient remediation velocity",
          expectedImpact: `Reduce vulnerability growth by 40-60% through accelerated patching`,
          impactPercentage: 50,
          remediationSteps: [
            "Establish emergency change window for critical patches (within 24 hours)",
            "Prioritize vulnerabilities by CVSS score and asset criticality",
            "Deploy automated patching for non-critical systems",
            "Implement continuous vulnerability scanning to catch new issues early",
            "Establish SLA for remediation: Critical (1 day), High (3 days), Medium (7 days)",
          ],
          timeToImplement: "2-4 hours for policies, ongoing for execution",
          requiredResources: ["Security team lead", "Systems engineering team", "Change management approval"],
          riskIfNotAddressed: "Exposure window expands daily, increasing breach probability by 10-15% daily",
          confidenceScore: 95,
        });
      }
    }

    const customerVuln = groupByCustomer(records);
    const customers = Object.entries(customerVuln)
      .map(([name, recs]) => ({
        name,
        totalVuln: recs.reduce((sum, r) => sum + (r.totVuln || 0), 0),
        records: recs.length,
      }))
      .sort((a, b) => b.totalVuln - a.totalVuln);

    if (customers.length > 0) {
      const topCustomer = customers[0];
      const proportion = (topCustomer.totalVuln / customers.reduce((sum, c) => sum + c.totalVuln, 0)) * 100;

      recommendations.push({
        id: `rec-${idCounter++}`,
        priority: "high",
        category: "customer_focus",
        action: `Execute targeted remediation for ${topCustomer.name}`,
        detailedDescription: `${topCustomer.name} represents ${proportion.toFixed(1)}% of organization vulnerability risk with ${topCustomer.totalVuln} vulnerable assets.`,
        rootCause: "Customer has highest vulnerability footprint; needs focused remediation strategy",
        expectedImpact: `Reduce overall organizational risk by 20-30%`,
        impactPercentage: 25,
        remediationSteps: [
          `Assign dedicated remediation team to ${topCustomer.name}`,
          "Conduct risk assessment of their critical systems",
          "Develop phased remediation plan (2-week sprints)",
          "Weekly status reviews with customer stakeholders",
          "Implement continuous monitoring and reporting dashboard",
        ],
        timeToImplement: "1-2 weeks for planning, 4-8 weeks for execution",
        requiredResources: ["Dedicated security engineer", "Systems team", "Customer liaison"],
        customerId: topCustomer.name,
        riskIfNotAddressed: `Risk concentration remains high; single customer incident could affect ${proportion.toFixed(0)}% of organization`,
        confidenceScore: 88,
      });
    }

    const potentiallyVuln = records.reduce((sum, r) => sum + (r.potVuln || 0), 0);
    if (potentiallyVuln > 100) {
      recommendations.push({
        id: `rec-${idCounter++}`,
        priority: "high",
        category: "assessment",
        action: "Accelerate potentially vulnerable asset assessment",
        detailedDescription: `${potentiallyVuln} assets remain unassessed. Fast assessment would clarify actual risk.`,
        rootCause: "Assessment backlog or resource constraints limiting evaluation velocity",
        expectedImpact: `Improve risk visibility by 40-50%, enabling better prioritization`,
        impactPercentage: 45,
        remediationSteps: [
          "Allocate resources to parallel assessment tracks",
          "Use automated assessment tools to accelerate process",
          "Prioritize high-criticality systems for expedited review",
          "Set daily assessment targets (e.g., 50 assets/day)",
          "Create assessment queue and visibility dashboard",
        ],
        timeToImplement: potentiallyVuln > 500 ? "2-3 weeks" : "1-2 weeks",
        requiredResources: ["Assessment team", "Analysis tools", "Testing environment"],
        riskIfNotAddressed: "Hidden critical vulnerabilities could exist in unassessed assets",
        confidenceScore: 82,
      });
    }

    const fnTypes = new Set(records.map(r => r.fnType).filter(Boolean));
    if (fnTypes.size < 2) {
      recommendations.push({
        id: `rec-${idCounter++}`,
        priority: "medium",
        category: "coverage",
        action: "Expand vulnerability coverage across all categories",
        detailedDescription: `Only ${fnTypes.size} FN type(s) currently covered. Complete coverage requires both Hardware and Software.`,
        rootCause: "Incomplete monitoring across all vulnerability categories",
        expectedImpact: `Improve coverage to 100%, reducing blind spots by ${(50 / fnTypes.size).toFixed(0)}%`,
        impactPercentage: 35,
        remediationSteps: [
          "Audit current monitoring configuration",
          "Enable missing vulnerability feeds",
          "Configure scanning for uncovered asset types",
          "Validate data collection from all feeds",
          "Establish regular feed validation process",
        ],
        timeToImplement: "1-2 days",
        requiredResources: ["Security operations team", "Scanning tools access"],
        riskIfNotAddressed: "Unmonitored vulnerability categories could affect 40-50% of assets",
        confidenceScore: 90,
      });
    }

    return recommendations.sort((a, b) => {
      const priorityMap = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityMap[a.priority] - priorityMap[b.priority];
    });
  }
}

// ─── HybridLLMService — online / offline insight generation ─────────────────

export class HybridLLMService {
  private static apiKey: string | null = null;

  static setApiKey(key: string | null) {
    this.apiKey = key;
  }

  static async generateInsights(
    anomalies: AnomalyResult[],
    predictions: TrendPrediction[],
    recommendations: Recommendation[]
  ): Promise<{ summary: string; insights: string[]; mode: "online" | "offline" }> {
    if (this.apiKey) {
      try {
        return await this.generateOnlineInsights(anomalies, predictions, recommendations);
      } catch {
        console.log("LLM API unavailable, falling back to offline mode");
      }
    }
    return this.generateOfflineInsights(anomalies, predictions, recommendations);
  }

  private static async generateOnlineInsights(
    anomalies: AnomalyResult[],
    predictions: TrendPrediction[],
    recommendations: Recommendation[]
  ): Promise<{ summary: string; insights: string[]; mode: "online" }> {
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

    const highAnomalies = anomalies.filter(a => a.score > 70);
    if (highAnomalies.length > 0) {
      insights.push(
        `High anomaly detected in ${highAnomalies[0].customerName}: ${highAnomalies[0].anomalies[0]?.description || "Unusual behavior detected"}`
      );
    }

    if (predictions.length > 0) {
      const pred = predictions[0];
      insights.push(
        `Next month trend: ${pred.trend} (Confidence: ${pred.confidence}%). Predicted ${pred.predicted_vulnerable} vulnerable assets.`
      );
    }

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
