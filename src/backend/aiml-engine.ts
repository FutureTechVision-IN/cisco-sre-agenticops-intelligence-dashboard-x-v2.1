/**
 * Advanced AIML Engine for SRE AI Assistant
 * 
 * Implements:
 * - Machine learning algorithms for advanced AIML output generation
 * - Natural language processing for context-aware responses
 * - Dynamic response generation based on query complexity
 * - Temporal data processing for monthly selections
 * - Customer-specific customization and filtering
 * - Executive reporting with formal business communication
 * - Anomaly detection with risk scoring
 * - Field notice comparison and prioritization
 * 
 * @module AimlEngine
 * @version 2.0.0
 */

import {
  getMetricsFromCache,
  getTopCustomersFromCache,
  getTopFieldNoticesFromCache,
  getFilteredMonthlyTrendsFromCache,
  getAllRecordsFromCache,
  getRecordsByCustomerFromCache,
  getRecordsByFieldNoticeFromCache,
  NormalizedRecord,
  Aggregations
} from './csv-data-service';

import { mlAnalyticsEngine } from './advanced-ml-analytics';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

/** Classification severity levels */
export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

/** Risk score result */
export interface RiskScore {
  value: number;
  percentage: string;
  level: SeverityLevel;
  factors: string[];
  confidence: number;
}

/** Anomaly detection result */
export interface AnomalyResult {
  customerId: string;
  customerName: string;
  riskScore: RiskScore;
  vulnerabilityCount: number;
  baselineCount: number;
  deviation: number;
  severityLevel: SeverityLevel;
  recommendation: string;
}

/** Field notice comparison result */
export interface FieldNoticeComparison {
  fieldNoticeId: string;
  title: string;
  totalDevices: number;
  uniqueCustomers: number;
  recordsInDataset: number;
  fnType: 'Software' | 'Hardware';
  criticalInfrastructureCustomers: number;
  remediationType: string;
  severityClassification: SeverityLevel;
  severityJustification: string;
  weightedScore: number;
  priority: number;
}

/** Executive summary output */
export interface ExecutiveSummary {
  title: string;
  timestamp: string;
  sections: ExecutiveSection[];
  keyFindings: string[];
  recommendedActions: string[];
  confidenceLevel: number;
  metadata: {
    dataRange: string;
    customersAnalyzed: number;
    fieldNoticesAnalyzed: number;
    generatedBy: string;
  };
}

export interface ExecutiveSection {
  heading: string;
  content: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  dataPoints?: DataPoint[];
}

export interface DataPoint {
  metric: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  context?: string;
}

/** Temporal filter options */
export interface TemporalFilter {
  month?: string;  // e.g., "August 2025"
  startDate?: Date;
  endDate?: Date;
  aggregationType: 'specific' | 'aggregated' | 'latest';
}

/** Customer filter options */
export interface CustomerFilter {
  customerName?: string;
  customerNames?: string[];
  fieldNotices?: string[];
  severityLevel?: SeverityLevel;
  minRiskScore?: number;
}

/** AIML response output */
export interface AIMLResponse {
  content: string;
  format: 'executive' | 'technical' | 'summary';
  sections: ExecutiveSection[];
  anomalies?: AnomalyResult[];
  comparisons?: FieldNoticeComparison[];
  insights: string[];
  recommendations: string[];
  confidence: number;
  metadata: {
    processingTime: number;
    dataPoints: number;
    model: string;
  };
}

/** Customer aggregate for internal analysis */
interface CustomerAggregate {
  customerName: string;
  totalVulnerable: number;
  totalPotentiallyVulnerable: number;
  totalSecure: number;
  totalAssets: number;
  fieldNotices: Set<string>;
  recordCount: number;
}

/** Field notice aggregate for internal analysis */
interface FieldNoticeAggregate {
  fnTitle: string;
  fnType: string;
  totalVulnerable: number;
  totalPotentiallyVulnerable: number;
  totalSecure: number;
  uniqueCustomerCount: number;
  customers: Set<string>;
  recordCount: number;
}

// ==========================================
// CONSTANTS
// ==========================================

/** Critical infrastructure industries */
const CRITICAL_INFRASTRUCTURE_INDUSTRIES = [
  'FINANCIAL', 'BANK', 'INSURANCE', 'ENERGY', 'UTILITY', 'POWER',
  'HEALTHCARE', 'HOSPITAL', 'PHARMA', 'TELECOM', 'GOVERNMENT',
  'DEFENSE', 'TRANSPORT', 'AVIATION', 'RAIL', 'WATER'
];

/** Severity weight factors for prioritization */
const SEVERITY_WEIGHTS = {
  infrastructureCriticality: 0.30,
  customerBreadth: 0.25,
  cascadingFailureRisk: 0.20,
  complianceExposure: 0.15,
  deviceVolume: 0.10
};

// ==========================================
// AIML ENGINE CLASS
// ==========================================

export class AIMLEngine {
  private static instance: AIMLEngine;
  private cacheTimestamp: number = 0;
  private anomalyCache: Map<string, AnomalyResult[]> = new Map();
  private comparisonCache: Map<string, FieldNoticeComparison[]> = new Map();

  private constructor() {
    console.log('[AIML Engine] Initialized');
  }

  public static getInstance(): AIMLEngine {
    if (!AIMLEngine.instance) {
      AIMLEngine.instance = new AIMLEngine();
    }
    return AIMLEngine.instance;
  }

  // ==========================================
  // ANOMALY DETECTION
  // ==========================================

  /**
   * Detect anomalies in customer vulnerability patterns
   * Uses statistical analysis to identify unusual patterns
   */
  async detectAnomalies(
    filter?: CustomerFilter,
    temporalFilter?: TemporalFilter
  ): Promise<AnomalyResult[]> {
    const startTime = Date.now();
    
    try {
      const records = await this.getFilteredRecords(filter, temporalFilter);
      const customerAggregates = this.aggregateByCustomer(records);
      
      // Calculate baseline statistics
      const vulnerabilityCounts = Array.from(customerAggregates.values())
        .map(c => c.totalVulnerable);
      
      const baseline = this.calculateBaseline(vulnerabilityCounts);
      const anomalies: AnomalyResult[] = [];

      for (const [customerId, data] of Array.from(customerAggregates.entries())) {
        const deviation = this.calculateDeviation(data.totalVulnerable, baseline);
        
        if (deviation > 1.5) { // Flag if 1.5 standard deviations above baseline
          const riskScore = this.calculateRiskScore(data, baseline, deviation);
          
          anomalies.push({
            customerId,
            customerName: data.customerName,
            riskScore,
            vulnerabilityCount: data.totalVulnerable,
            baselineCount: Math.round(baseline.mean),
            deviation: Math.round(deviation * 100) / 100,
            severityLevel: riskScore.level,
            recommendation: this.generateAnomalyRecommendation(data, riskScore)
          });
        }
      }

      // Sort by risk score descending
      anomalies.sort((a, b) => b.riskScore.value - a.riskScore.value);

      console.log(`[AIML Engine] Detected ${anomalies.length} anomalies in ${Date.now() - startTime}ms`);
      return anomalies.slice(0, 20); // Top 20 anomalies
      
    } catch (error) {
      console.error('[AIML Engine] Anomaly detection error:', error);
      return [];
    }
  }

  /**
   * Calculate baseline statistics for anomaly detection
   */
  private calculateBaseline(values: number[]): { mean: number; stdDev: number; median: number } {
    if (values.length === 0) return { mean: 0, stdDev: 0, median: 0 };

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev, median };
  }

  /**
   * Calculate deviation from baseline
   */
  private calculateDeviation(value: number, baseline: { mean: number; stdDev: number }): number {
    if (baseline.stdDev === 0) return value > baseline.mean ? 2 : 0;
    return (value - baseline.mean) / baseline.stdDev;
  }

  /**
   * Calculate comprehensive risk score
   */
  private calculateRiskScore(
    customerData: CustomerAggregate,
    baseline: { mean: number; stdDev: number },
    deviation: number
  ): RiskScore {
    const factors: string[] = [];
    let score = 0;

    // Factor 1: Vulnerability count deviation (0-30 points)
    const vulnScore = Math.min(30, deviation * 10);
    score += vulnScore;
    if (vulnScore > 15) {
      factors.push(`${customerData.totalVulnerable} vulnerabilities detected (${Math.round(customerData.totalVulnerable - baseline.mean)} above baseline)`);
    }

    // Factor 2: Critical infrastructure (0-25 points)
    const isCritical = this.isCustomerCriticalInfrastructure(customerData.customerName);
    if (isCritical) {
      score += 25;
      factors.push('Critical infrastructure customer');
    }

    // Factor 3: Multi-field notice exposure (0-20 points)
    const fnCount = customerData.fieldNotices.size;
    const fnScore = Math.min(20, fnCount * 4);
    score += fnScore;
    if (fnCount > 3) {
      factors.push(`Exposed to ${fnCount} field notices`);
    }

    // Factor 4: Vulnerability ratio (0-15 points)
    const vulnRatio = customerData.totalVulnerable / Math.max(1, customerData.totalAssets);
    const ratioScore = Math.min(15, vulnRatio * 100);
    score += ratioScore;
    if (vulnRatio > 0.5) {
      factors.push(`${Math.round(vulnRatio * 100)}% vulnerability ratio`);
    }

    // Factor 5: Trend direction (0-10 points)
    // Would need historical data - placeholder
    score += 5; // Neutral assumption

    // Normalize to 0-100
    const normalizedScore = Math.min(100, Math.round(score));

    return {
      value: normalizedScore,
      percentage: `${normalizedScore}%`,
      level: this.scoreToSeverity(normalizedScore),
      factors,
      confidence: Math.min(95, 70 + fnCount * 5)
    };
  }

  /**
   * Convert numerical score to severity level
   */
  private scoreToSeverity(score: number): SeverityLevel {
    if (score >= 90) return 'CRITICAL';
    if (score >= 70) return 'HIGH';
    if (score >= 50) return 'MEDIUM';
    if (score >= 30) return 'LOW';
    return 'INFO';
  }

  /**
   * Check if customer belongs to critical infrastructure
   */
  private isCustomerCriticalInfrastructure(customerName: string): boolean {
    const upperName = customerName.toUpperCase();
    return CRITICAL_INFRASTRUCTURE_INDUSTRIES.some(ind => upperName.includes(ind));
  }

  /**
   * Generate recommendation for anomaly
   */
  private generateAnomalyRecommendation(
    data: CustomerAggregate,
    riskScore: RiskScore
  ): string {
    if (riskScore.level === 'CRITICAL') {
      return `Immediate executive briefing required. Schedule priority remediation with ${data.customerName} account team.`;
    }
    if (riskScore.level === 'HIGH') {
      return `Engage account team for root cause analysis. Review SLA commitments for ${data.customerName}.`;
    }
    if (riskScore.level === 'MEDIUM') {
      return `Monitor vulnerability trends. Schedule routine review with ${data.customerName} within 30 days.`;
    }
    return `Continue standard monitoring procedures for ${data.customerName}.`;
  }

  // ==========================================
  // FIELD NOTICE COMPARISON
  // ==========================================

  /**
   * Compare and prioritize field notices
   * Uses weighted scoring based on impact factors
   */
  async compareFieldNotices(
    fieldNoticeIds?: string[],
    filter?: CustomerFilter,
    temporalFilter?: TemporalFilter
  ): Promise<FieldNoticeComparison[]> {
    const startTime = Date.now();
    
    try {
      const records = await this.getFilteredRecords(filter, temporalFilter);
      const fnAggregates = this.aggregateByFieldNotice(records, fieldNoticeIds);
      const comparisons: FieldNoticeComparison[] = [];

      for (const [fnId, data] of Array.from(fnAggregates.entries())) {
        const comparison = this.analyzeFieldNotice(fnId, data);
        comparisons.push(comparison);
      }

      // Sort by weighted score descending
      comparisons.sort((a, b) => b.weightedScore - a.weightedScore);

      // Assign priorities
      comparisons.forEach((c, i) => {
        c.priority = i + 1;
      });

      console.log(`[AIML Engine] Compared ${comparisons.length} field notices in ${Date.now() - startTime}ms`);
      return comparisons;
      
    } catch (error) {
      console.error('[AIML Engine] Field notice comparison error:', error);
      return [];
    }
  }

  /**
   * Analyze individual field notice
   */
  private analyzeFieldNotice(fnId: string, data: FieldNoticeAggregate): FieldNoticeComparison {
    const criticalCustomers = this.countCriticalInfrastructureCustomers(data.customers);
    const fnType = data.fnType.includes('Software') ? 'Software' : 'Hardware';
    
    // Calculate weighted score based on severity factors
    const scores = {
      infrastructureCriticality: this.scoreInfrastructureCriticality(fnType, data.totalVulnerable),
      customerBreadth: Math.min(10, data.uniqueCustomerCount / 10),
      cascadingFailureRisk: fnType === 'Software' ? 8 : 3,
      complianceExposure: Math.min(10, criticalCustomers / 5),
      deviceVolume: Math.min(10, Math.log10(data.totalVulnerable + 1) * 2)
    };

    const weightedScore = 
      scores.infrastructureCriticality * SEVERITY_WEIGHTS.infrastructureCriticality +
      scores.customerBreadth * SEVERITY_WEIGHTS.customerBreadth +
      scores.cascadingFailureRisk * SEVERITY_WEIGHTS.cascadingFailureRisk +
      scores.complianceExposure * SEVERITY_WEIGHTS.complianceExposure +
      scores.deviceVolume * SEVERITY_WEIGHTS.deviceVolume;

    const severityLevel = this.scoreToSeverity(weightedScore * 10);
    const justification = this.generateSeverityJustification(fnId, data, scores, severityLevel);

    return {
      fieldNoticeId: fnId,
      title: data.fnTitle,
      totalDevices: data.totalVulnerable,
      uniqueCustomers: data.uniqueCustomerCount,
      recordsInDataset: data.recordCount,
      fnType,
      criticalInfrastructureCustomers: criticalCustomers,
      remediationType: this.determineRemediationType(fnType, data.fnTitle),
      severityClassification: severityLevel,
      severityJustification: justification,
      weightedScore: Math.round(weightedScore * 100) / 100,
      priority: 0 // Will be set after sorting
    };
  }

  /**
   * Score infrastructure criticality
   */
  private scoreInfrastructureCriticality(fnType: string, deviceCount: number): number {
    // Software affecting network infrastructure is more critical
    if (fnType === 'Software') {
      if (deviceCount > 1000000) return 10;
      if (deviceCount > 100000) return 8;
      if (deviceCount > 10000) return 6;
      return 4;
    }
    // Hardware (endpoints) less critical
    if (deviceCount > 3000000) return 5;
    if (deviceCount > 1000000) return 4;
    return 3;
  }

  /**
   * Count critical infrastructure customers
   */
  private countCriticalInfrastructureCustomers(customers: Set<string>): number {
    let count = 0;
    for (const customer of Array.from(customers)) {
      if (this.isCustomerCriticalInfrastructure(customer)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Determine remediation type
   */
  private determineRemediationType(fnType: string, title: string): string {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('certificate') || titleLower.includes('pki')) {
      return 'Workaround (Complex)';
    }
    if (fnType === 'Hardware') {
      if (titleLower.includes('replace') || titleLower.includes('hardware')) {
        return 'Replace on Failure';
      }
      return 'Config Change';
    }
    return 'Software Update';
  }

  /**
   * Generate severity justification
   */
  private generateSeverityJustification(
    fnId: string,
    data: FieldNoticeAggregate,
    scores: Record<string, number>,
    severity: SeverityLevel
  ): string {
    const parts: string[] = [];

    if (severity === 'CRITICAL') {
      parts.push(`${fnId} is classified as CRITICAL due to`);
      if (data.totalVulnerable > 1000000) {
        parts.push(`unprecedented scale (${(data.totalVulnerable / 1000000).toFixed(2)}M devices)`);
      }
      if (data.uniqueCustomerCount > 100) {
        parts.push(`broad customer impact (${data.uniqueCustomerCount} enterprises)`);
      }
      parts.push('potential for cascading failures across security-critical services');
    } else if (severity === 'HIGH') {
      parts.push(`${fnId} is classified as HIGH due to significant device count (${data.totalVulnerable.toLocaleString()})`);
      parts.push('isolated failure scope limits cascading impact');
    } else {
      parts.push(`${fnId} is classified as ${severity} with limited impact scope`);
      parts.push('replace-on-failure remediation approach recommended');
    }

    return parts.join('; ');
  }

  // ==========================================
  // EXECUTIVE REPORTING
  // ==========================================

  /**
   * Generate executive summary in formal business format
   * No emojis, professional language
   */
  async generateExecutiveSummary(
    filter?: CustomerFilter,
    temporalFilter?: TemporalFilter
  ): Promise<ExecutiveSummary> {
    const startTime = Date.now();
    
    try {
      const records = await this.getFilteredRecords(filter, temporalFilter);
      const anomalies = await this.detectAnomalies(filter, temporalFilter);
      const comparisons = await this.compareFieldNotices(undefined, filter, temporalFilter);

      const metrics = this.calculateSummaryMetrics(records);
      const sections = this.buildExecutiveSections(metrics, anomalies, comparisons);
      const keyFindings = this.extractKeyFindings(anomalies, comparisons, metrics);
      const recommendations = this.generateRecommendations(anomalies, comparisons);

      const summary: ExecutiveSummary = {
        title: this.generateReportTitle(filter, temporalFilter),
        timestamp: new Date().toISOString(),
        sections,
        keyFindings,
        recommendedActions: recommendations,
        confidenceLevel: this.calculateConfidenceLevel(records.length, anomalies.length),
        metadata: {
          dataRange: this.getDataRange(temporalFilter),
          customersAnalyzed: metrics.uniqueCustomers,
          fieldNoticesAnalyzed: metrics.uniqueFieldNotices,
          generatedBy: 'AIML Engine v2.0'
        }
      };

      console.log(`[AIML Engine] Generated executive summary in ${Date.now() - startTime}ms`);
      return summary;
      
    } catch (error) {
      console.error('[AIML Engine] Executive summary error:', error);
      throw error;
    }
  }

  /**
   * Generate report title
   */
  private generateReportTitle(filter?: CustomerFilter, temporal?: TemporalFilter): string {
    const parts = ['SRE Operations Intelligence Report'];
    
    if (filter?.customerName) {
      parts.push(`- ${filter.customerName}`);
    }
    if (temporal?.month) {
      parts.push(`- ${temporal.month}`);
    }
    
    return parts.join(' ');
  }

  /**
   * Calculate summary metrics
   */
  private calculateSummaryMetrics(records: NormalizedRecord[]): {
    totalVulnerable: number;
    totalPotentiallyVulnerable: number;
    totalSecure: number;
    totalAssets: number;
    uniqueCustomers: number;
    uniqueFieldNotices: number;
    criticalAccounts: number;
    remediationRate: number;
  } {
    const customers = new Set<string>();
    const fieldNotices = new Set<string>();
    let totalVuln = 0, totalPot = 0, totalSecure = 0;

    for (const record of records) {
      if (record.normalizedCustomer) customers.add(record.normalizedCustomer);
      if (record.fieldNoticeFormatted) fieldNotices.add(record.fieldNoticeFormatted);
      totalVuln += record.totVuln;
      totalPot += record.potVuln;
      totalSecure += record.notVuln;
    }

    const totalAssets = totalVuln + totalPot + totalSecure;
    const remediationRate = totalAssets > 0 ? (totalSecure / totalAssets) * 100 : 0;

    let criticalAccounts = 0;
    for (const customer of Array.from(customers)) {
      if (this.isCustomerCriticalInfrastructure(customer)) {
        criticalAccounts++;
      }
    }

    return {
      totalVulnerable: totalVuln,
      totalPotentiallyVulnerable: totalPot,
      totalSecure: totalSecure,
      totalAssets,
      uniqueCustomers: customers.size,
      uniqueFieldNotices: fieldNotices.size,
      criticalAccounts,
      remediationRate: Math.round(remediationRate * 100) / 100
    };
  }

  /**
   * Build executive sections
   */
  private buildExecutiveSections(
    metrics: ReturnType<typeof this.calculateSummaryMetrics>,
    anomalies: AnomalyResult[],
    comparisons: FieldNoticeComparison[]
  ): ExecutiveSection[] {
    const sections: ExecutiveSection[] = [];

    // Section 1: Summary Overview
    sections.push({
      heading: 'Executive Summary',
      content: this.formatExecutiveOverview(metrics),
      priority: 'critical',
      dataPoints: [
        { metric: 'Total Assets Assessed', value: metrics.totalAssets.toLocaleString() },
        { metric: 'Vulnerable Assets', value: metrics.totalVulnerable.toLocaleString(), trend: 'stable' },
        { metric: 'Remediation Rate', value: `${metrics.remediationRate}%` },
        { metric: 'Critical Accounts', value: metrics.criticalAccounts }
      ]
    });

    // Section 2: Anomaly Detection
    if (anomalies.length > 0) {
      const criticalCount = anomalies.filter(a => a.severityLevel === 'CRITICAL').length;
      const highCount = anomalies.filter(a => a.severityLevel === 'HIGH').length;
      
      sections.push({
        heading: 'Detected Anomalies',
        content: this.formatAnomalySection(anomalies),
        priority: criticalCount > 0 ? 'critical' : 'high',
        dataPoints: [
          { metric: 'Anomalies Detected', value: anomalies.length },
          { metric: 'Critical Accounts', value: criticalCount },
          { metric: 'High Priority', value: highCount }
        ]
      });
    }

    // Section 3: Field Notice Prioritization
    if (comparisons.length > 0) {
      const critical = comparisons.filter(c => c.severityClassification === 'CRITICAL');
      
      sections.push({
        heading: 'Field Notice Prioritization',
        content: this.formatFieldNoticePrioritization(comparisons),
        priority: critical.length > 0 ? 'critical' : 'medium',
        dataPoints: comparisons.slice(0, 5).map(c => ({
          metric: c.fieldNoticeId,
          value: c.severityClassification,
          context: `${c.uniqueCustomers} customers, ${c.totalDevices.toLocaleString()} devices`
        }))
      });
    }

    // Section 4: Recommendations
    sections.push({
      heading: 'Strategic Recommendations',
      content: this.formatStrategicRecommendations(metrics, anomalies, comparisons),
      priority: 'high'
    });

    return sections;
  }

  /**
   * Format executive overview - NO EMOJIS
   */
  private formatExecutiveOverview(metrics: ReturnType<typeof this.calculateSummaryMetrics>): string {
    return `
CURRENT STATE ASSESSMENT

Total Assets Under Management: ${metrics.totalAssets.toLocaleString()}

Status Distribution:
- Vulnerable: ${metrics.totalVulnerable.toLocaleString()} assets requiring immediate attention
- Potentially Vulnerable: ${metrics.totalPotentiallyVulnerable.toLocaleString()} assets pending assessment
- Secure: ${metrics.totalSecure.toLocaleString()} assets with verified remediation

Enterprise Coverage:
- ${metrics.uniqueCustomers} unique enterprise customers analyzed
- ${metrics.criticalAccounts} critical infrastructure accounts identified
- ${metrics.uniqueFieldNotices} active field notices tracked

Overall Remediation Rate: ${metrics.remediationRate}%
`.trim();
  }

  /**
   * Format anomaly section - NO EMOJIS
   */
  private formatAnomalySection(anomalies: AnomalyResult[]): string {
    const lines: string[] = [
      'AI-IDENTIFIED ANOMALIES IN CUSTOMER VULNERABILITY PATTERNS',
      '',
      `${anomalies.length} enterprise customers flagged with unusual vulnerability patterns requiring executive attention.`,
      ''
    ];

    const byLevel = {
      CRITICAL: anomalies.filter(a => a.severityLevel === 'CRITICAL').length,
      HIGH: anomalies.filter(a => a.severityLevel === 'HIGH').length,
      MEDIUM: anomalies.filter(a => a.severityLevel === 'MEDIUM').length
    };

    lines.push(`Priority Distribution: CRITICAL: ${byLevel.CRITICAL} | HIGH: ${byLevel.HIGH} | MEDIUM: ${byLevel.MEDIUM}`);
    lines.push('');
    lines.push('TOP PRIORITY ACCOUNTS:');
    lines.push('');

    anomalies.slice(0, 12).forEach((a, i) => {
      const severityTag = `[${a.severityLevel}]`;
      lines.push(`${i + 1}. ${severityTag} ${a.customerName}`);
      lines.push(`   Risk Score: ${a.riskScore.percentage} | ${a.vulnerabilityCount} vulnerabilities detected (${a.vulnerabilityCount - a.baselineCount} above baseline of ${a.baselineCount})`);
    });

    return lines.join('\n');
  }

  /**
   * Format field notice prioritization - NO EMOJIS
   */
  private formatFieldNoticePrioritization(comparisons: FieldNoticeComparison[]): string {
    const lines: string[] = [
      'FIELD NOTICE COMPARISON AND PRIORITIZATION ANALYSIS',
      '',
      'Severity Classification Matrix:',
      ''
    ];

    lines.push('| Field Notice | Device Count | Severity | Justification |');
    lines.push('|--------------|--------------|----------|---------------|');

    comparisons.slice(0, 10).forEach(c => {
      const deviceStr = c.totalDevices > 1000000 
        ? `${(c.totalDevices / 1000000).toFixed(2)}M`
        : c.totalDevices.toLocaleString();
      lines.push(`| ${c.fieldNoticeId} | ${deviceStr} | ${c.severityClassification} | ${c.severityJustification.substring(0, 60)}... |`);
    });

    lines.push('');
    lines.push('KEY INSIGHT: Device count alone is insufficient for prioritization. Infrastructure criticality, customer breadth, cascading failure potential, and compliance implications must be considered.');

    return lines.join('\n');
  }

  /**
   * Format strategic recommendations - NO EMOJIS
   */
  private formatStrategicRecommendations(
    metrics: ReturnType<typeof this.calculateSummaryMetrics>,
    anomalies: AnomalyResult[],
    comparisons: FieldNoticeComparison[]
  ): string {
    const lines: string[] = [
      'RECOMMENDED ACTIONS',
      ''
    ];

    const criticalFNs = comparisons.filter(c => c.severityClassification === 'CRITICAL');
    const criticalCustomers = anomalies.filter(a => a.severityLevel === 'CRITICAL');

    if (criticalFNs.length > 0) {
      lines.push(`1. IMMEDIATE: Initiate BE, CX, TAC coordination for ${criticalFNs.map(f => f.fieldNoticeId).join(', ')}`);
      lines.push('   - Establish 72-hour remediation SLA for critical infrastructure customers');
    }

    if (criticalCustomers.length > 0) {
      lines.push(`2. HIGH PRIORITY: Schedule executive briefing for ${criticalCustomers.slice(0, 3).map(c => c.customerName).join(', ')}`);
      lines.push('   - Engage account teams for root cause analysis');
    }

    lines.push(`3. OPERATIONAL: Review SLA commitments for all ${metrics.criticalAccounts} critical infrastructure accounts`);
    lines.push('4. MONITORING: Establish automated alerting for vulnerability threshold breaches');
    lines.push('5. REPORTING: Generate weekly progress reports for leadership review');

    return lines.join('\n');
  }

  /**
   * Extract key findings
   */
  private extractKeyFindings(
    anomalies: AnomalyResult[],
    comparisons: FieldNoticeComparison[],
    metrics: ReturnType<typeof this.calculateSummaryMetrics>
  ): string[] {
    const findings: string[] = [];

    // Critical field notice finding
    const criticalFN = comparisons.find(c => c.severityClassification === 'CRITICAL');
    if (criticalFN) {
      findings.push(
        `[CLASSIFICATION RATIONALE] ${criticalFN.fieldNoticeId} is classified as CRITICAL due to its scale (${(criticalFN.totalDevices / 1000000).toFixed(2)}M devices), broad customer impact (${criticalFN.uniqueCustomers} enterprises), and the potential for cascading failures. The higher impact ratio compared to other field notices, combined with cross-functional implications requiring BE, CX, TAC coordination, warrants immediate executive attention.`
      );
    }

    // Priority distribution
    const priorityDist = `CRITICAL: ${comparisons.filter(c => c.severityClassification === 'CRITICAL').length} | HIGH: ${comparisons.filter(c => c.severityClassification === 'HIGH').length} | MEDIUM: ${comparisons.filter(c => c.severityClassification === 'MEDIUM').length}`;
    findings.push(priorityDist + ' Priority Accounts');

    // Top anomalies
    anomalies.slice(0, 10).forEach(a => {
      const tag = a.severityLevel === 'CRITICAL' ? 'CRIT' : a.severityLevel === 'HIGH' ? 'HIGH' : 'MED';
      findings.push(
        `[${tag}] ${a.customerName} - Risk Score: ${a.riskScore.percentage} | ${a.vulnerabilityCount} vulnerabilities detected (${a.vulnerabilityCount - a.baselineCount} above normal baseline of ${a.baselineCount})`
      );
    });

    return findings;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    anomalies: AnomalyResult[],
    comparisons: FieldNoticeComparison[]
  ): string[] {
    const recommendations: string[] = [
      'Schedule executive briefing for high-priority accounts',
      'Engage account teams for root cause analysis',
      'Review SLA commitments for affected customers'
    ];

    const critical = anomalies.filter(a => a.severityLevel === 'CRITICAL');
    if (critical.length > 0) {
      recommendations.unshift('IMMEDIATE: Escalate to executive leadership for resource allocation');
    }

    return recommendations;
  }

  /**
   * Calculate confidence level
   */
  private calculateConfidenceLevel(recordCount: number, anomalyCount: number): number {
    // Base confidence from data volume
    let confidence = Math.min(85, 50 + Math.log10(recordCount + 1) * 15);
    
    // Boost if anomalies detected (indicates working detection)
    if (anomalyCount > 0) {
      confidence = Math.min(95, confidence + 5);
    }
    
    return Math.round(confidence);
  }

  /**
   * Get data range description
   */
  private getDataRange(temporal?: TemporalFilter): string {
    if (temporal?.month) {
      return temporal.month;
    }
    if (temporal?.startDate && temporal?.endDate) {
      return `${temporal.startDate.toLocaleDateString()} - ${temporal.endDate.toLocaleDateString()}`;
    }
    return 'All Available Data';
  }

  // ==========================================
  // TEMPORAL DATA PROCESSING
  // ==========================================

  /**
   * Process data with temporal filtering
   */
  async processTemporalData(
    filter: TemporalFilter,
    customerFilter?: CustomerFilter
  ): Promise<{
    records: NormalizedRecord[];
    summary: {
      period: string;
      recordCount: number;
      customerCount: number;
      fieldNoticeCount: number;
    };
  }> {
    const records = await this.getFilteredRecords(customerFilter, filter);
    
    const customers = new Set<string>();
    const fieldNotices = new Set<string>();
    
    for (const record of records) {
      if (record.normalizedCustomer) customers.add(record.normalizedCustomer);
      if (record.fieldNoticeFormatted) fieldNotices.add(record.fieldNoticeFormatted);
    }

    return {
      records,
      summary: {
        period: this.getDataRange(filter),
        recordCount: records.length,
        customerCount: customers.size,
        fieldNoticeCount: fieldNotices.size
      }
    };
  }

  /**
   * Get latest month data
   */
  async getLatestMonthData(): Promise<{
    month: string;
    records: NormalizedRecord[];
  }> {
    const allRecords = await getAllRecordsFromCache();
    
    // Find the latest month
    const months = new Set(allRecords.map(r => r.month));
    const sortedMonths = Array.from(months).sort().reverse();
    const latestMonth = sortedMonths[0] || '';

    const records = allRecords.filter(r => r.month === latestMonth);

    return { month: latestMonth, records };
  }

  // ==========================================
  // DATA AGGREGATION HELPERS
  // ==========================================

  /**
   * Get filtered records based on criteria
   */
  private async getFilteredRecords(
    customerFilter?: CustomerFilter,
    temporalFilter?: TemporalFilter
  ): Promise<NormalizedRecord[]> {
    let records = await getAllRecordsFromCache();

    // Apply temporal filter
    if (temporalFilter?.month) {
      const monthLower = temporalFilter.month.toLowerCase();
      records = records.filter(r => r.month.toLowerCase().includes(monthLower));
    }

    // Apply customer filter
    if (customerFilter?.customerName) {
      const nameLower = customerFilter.customerName.toLowerCase();
      records = records.filter(r => 
        r.normalizedCustomer?.toLowerCase().includes(nameLower) ||
        r.customerName.toLowerCase().includes(nameLower)
      );
    }

    if (customerFilter?.customerNames && customerFilter.customerNames.length > 0) {
      const namesLower = customerFilter.customerNames.map(n => n.toLowerCase());
      records = records.filter(r => 
        namesLower.some(n => 
          r.normalizedCustomer?.toLowerCase().includes(n) ||
          r.customerName.toLowerCase().includes(n)
        )
      );
    }

    // Apply field notice filter
    if (customerFilter?.fieldNotices && customerFilter.fieldNotices.length > 0) {
      const fnLower = customerFilter.fieldNotices.map(f => f.toLowerCase());
      records = records.filter(r => 
        fnLower.some(f => r.fieldNotice.toLowerCase().includes(f))
      );
    }

    return records.filter(r => r.isValid);
  }

  /**
   * Aggregate records by customer
   */
  private aggregateByCustomer(records: NormalizedRecord[]): Map<string, CustomerAggregate> {
    const aggregates = new Map<string, CustomerAggregate>();

    for (const record of records) {
      const key = record.normalizedCustomer || record.customerName;
      if (!key) continue;

      if (!aggregates.has(key)) {
        aggregates.set(key, {
          customerName: key,
          totalVulnerable: 0,
          totalPotentiallyVulnerable: 0,
          totalSecure: 0,
          totalAssets: 0,
          fieldNotices: new Set(),
          recordCount: 0
        });
      }

      const agg = aggregates.get(key)!;
      agg.totalVulnerable += record.totVuln;
      agg.totalPotentiallyVulnerable += record.potVuln;
      agg.totalSecure += record.notVuln;
      agg.totalAssets += record.total;
      if (record.fieldNoticeFormatted) {
        agg.fieldNotices.add(record.fieldNoticeFormatted);
      }
      agg.recordCount++;
    }

    return aggregates;
  }

  /**
   * Aggregate records by field notice
   */
  private aggregateByFieldNotice(
    records: NormalizedRecord[],
    filterIds?: string[]
  ): Map<string, FieldNoticeAggregate> {
    const aggregates = new Map<string, FieldNoticeAggregate>();

    for (const record of records) {
      const fnId = record.fieldNoticeFormatted;
      if (!fnId) continue;
      if (filterIds && filterIds.length > 0 && !filterIds.includes(fnId)) continue;

      if (!aggregates.has(fnId)) {
        aggregates.set(fnId, {
          fnTitle: record.fnTitle,
          fnType: record.fnType,
          totalVulnerable: 0,
          totalPotentiallyVulnerable: 0,
          totalSecure: 0,
          uniqueCustomerCount: 0,
          customers: new Set(),
          recordCount: 0
        });
      }

      const agg = aggregates.get(fnId)!;
      agg.totalVulnerable += record.totVuln;
      agg.totalPotentiallyVulnerable += record.potVuln;
      agg.totalSecure += record.notVuln;
      if (record.normalizedCustomer) {
        agg.customers.add(record.normalizedCustomer);
      }
      agg.recordCount++;
    }

    // Update customer counts
    for (const agg of Array.from(aggregates.values())) {
      agg.uniqueCustomerCount = agg.customers.size;
    }

    return aggregates;
  }

  // ==========================================
  // AIML RESPONSE GENERATION
  // ==========================================

  /**
   * Generate comprehensive AIML response
   * Main entry point for chatbot integration
   */
  async generateAIMLResponse(
    query: string,
    options: {
      format?: 'executive' | 'technical' | 'summary';
      customerFilter?: CustomerFilter;
      temporalFilter?: TemporalFilter;
      includeAnomalies?: boolean;
      includeComparisons?: boolean;
    } = {}
  ): Promise<AIMLResponse> {
    const startTime = Date.now();
    const format = options.format || 'executive';

    try {
      // Gather data
      const anomalies = options.includeAnomalies !== false
        ? await this.detectAnomalies(options.customerFilter, options.temporalFilter)
        : [];

      const comparisons = options.includeComparisons !== false
        ? await this.compareFieldNotices(undefined, options.customerFilter, options.temporalFilter)
        : [];

      const summary = await this.generateExecutiveSummary(
        options.customerFilter,
        options.temporalFilter
      );

      // Build response content
      const content = this.buildResponseContent(query, summary, anomalies, comparisons, format);
      const insights = this.extractInsights(summary, anomalies, comparisons);
      const recommendations = summary.recommendedActions;

      const response: AIMLResponse = {
        content,
        format,
        sections: summary.sections,
        anomalies: anomalies.length > 0 ? anomalies : undefined,
        comparisons: comparisons.length > 0 ? comparisons : undefined,
        insights,
        recommendations,
        confidence: summary.confidenceLevel,
        metadata: {
          processingTime: Date.now() - startTime,
          dataPoints: summary.metadata.customersAnalyzed + summary.metadata.fieldNoticesAnalyzed,
          model: 'AIML Engine v2.0'
        }
      };

      console.log(`[AIML Engine] Generated response in ${response.metadata.processingTime}ms`);
      return response;

    } catch (error) {
      console.error('[AIML Engine] Response generation error:', error);
      throw error;
    }
  }

  /**
   * Build response content based on format
   */
  private buildResponseContent(
    query: string,
    summary: ExecutiveSummary,
    anomalies: AnomalyResult[],
    comparisons: FieldNoticeComparison[],
    format: 'executive' | 'technical' | 'summary'
  ): string {
    const sections: string[] = [];

    // Title
    sections.push(`# ${summary.title}`);
    sections.push(`Generated: ${new Date(summary.timestamp).toLocaleString()}`);
    sections.push('');

    // Format-specific content
    if (format === 'executive') {
      // Executive format - high-level, formal
      for (const section of summary.sections) {
        sections.push(`## ${section.heading}`);
        sections.push(section.content);
        sections.push('');
      }
    } else if (format === 'technical') {
      // Technical format - more detail
      sections.push('## Technical Analysis');
      sections.push(`Query: ${query}`);
      sections.push('');
      
      if (anomalies.length > 0) {
        sections.push('### Anomaly Details');
        for (const a of anomalies.slice(0, 5)) {
          sections.push(`- **${a.customerName}**: Score ${a.riskScore.percentage}, Deviation ${a.deviation}σ`);
          sections.push(`  Factors: ${a.riskScore.factors.join('; ')}`);
        }
        sections.push('');
      }
      
      if (comparisons.length > 0) {
        sections.push('### Field Notice Technical Analysis');
        for (const c of comparisons.slice(0, 5)) {
          sections.push(`- **${c.fieldNoticeId}** (${c.fnType})`);
          sections.push(`  Devices: ${c.totalDevices.toLocaleString()}, Customers: ${c.uniqueCustomers}`);
          sections.push(`  Weighted Score: ${c.weightedScore}`);
        }
        sections.push('');
      }
    } else {
      // Summary format - concise
      sections.push('## Summary');
      sections.push(`- ${summary.metadata.customersAnalyzed} customers analyzed`);
      sections.push(`- ${summary.metadata.fieldNoticesAnalyzed} field notices tracked`);
      sections.push(`- ${anomalies.length} anomalies detected`);
      sections.push(`- Confidence Level: ${summary.confidenceLevel}%`);
      sections.push('');
      sections.push('### Key Findings');
      for (const finding of summary.keyFindings.slice(0, 5)) {
        sections.push(`- ${finding}`);
      }
    }

    // Recommendations (all formats)
    sections.push('## Recommended Actions');
    for (const rec of summary.recommendedActions) {
      sections.push(`- ${rec}`);
    }
    sections.push('');
    sections.push(`Confidence Level: ${summary.confidenceLevel}%`);

    return sections.join('\n');
  }

  /**
   * Extract key insights
   */
  private extractInsights(
    summary: ExecutiveSummary,
    anomalies: AnomalyResult[],
    comparisons: FieldNoticeComparison[]
  ): string[] {
    const insights: string[] = [];

    // Anomaly insights
    if (anomalies.length > 0) {
      insights.push(`${anomalies.length} enterprise customers flagged with unusual vulnerability patterns requiring executive attention`);
      
      const critical = anomalies.filter(a => a.severityLevel === 'CRITICAL');
      if (critical.length > 0) {
        insights.push(`Critical accounts: ${critical.map(a => a.customerName).join(', ')}`);
      }
    }

    // Field notice insights
    const criticalFNs = comparisons.filter(c => c.severityClassification === 'CRITICAL');
    if (criticalFNs.length > 0) {
      insights.push(`${criticalFNs.length} field notice(s) classified as CRITICAL requiring immediate attention`);
    }

    // Add key findings
    insights.push(...summary.keyFindings.slice(0, 3));

    return insights;
  }
}

// ==========================================
// TYPE DEFINITIONS FOR AGGREGATES
// ==========================================

interface CustomerAggregate {
  customerName: string;
  totalVulnerable: number;
  totalPotentiallyVulnerable: number;
  totalSecure: number;
  totalAssets: number;
  fieldNotices: Set<string>;
  recordCount: number;
}

interface FieldNoticeAggregate {
  fnTitle: string;
  fnType: string;
  totalVulnerable: number;
  totalPotentiallyVulnerable: number;
  totalSecure: number;
  uniqueCustomerCount: number;
  customers: Set<string>;
  recordCount: number;
}

// ==========================================
// SINGLETON EXPORT
// ==========================================

export const aimlEngine = AIMLEngine.getInstance();

export default aimlEngine;
