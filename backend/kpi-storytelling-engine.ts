/**
 * KPI Storytelling Engine
 * SRE AgenticOps Intelligence Dashboard — Cisco CIRCUIT AI Integration
 *
 * Transforms raw KPI metrics into contextual, data-driven narratives that
 * explain what happened, why it matters, and what to do next.  Designed to
 * power the interactive AI chatbot and Voice AI module with "explainable"
 * intelligence — every number is accompanied by context, trend, and
 * business impact.
 *
 * Architecture:
 *   Raw Data (CSV cache)
 *     → KPI Calculation Layer (formulas + baselines)
 *       → Insight Correlation (cross-KPI pattern detection)
 *         → Narrative Generation (template + data interpolation)
 *           → Voice-optimized output (SSML-ready)
 *
 * @module KPIStorytellingEngine
 * @version 1.0.0
 */

import {
  getMetricsFromCache,
  getTopCustomersFromCache,
  getTopFieldNoticesFromCache,
  getFilteredMonthlyTrendsFromCache,
  getCacheStats,
} from './csv-data-service';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface KPIDefinition {
  id: string;
  name: string;
  abbreviation: string;
  formula: string;
  unit: string;
  target: string;
  description: string;
  dataSources: string[];
  methodology: string;
  businessContext: string;
}

export interface KPISnapshot {
  kpiId: string;
  value: number;
  formattedValue: string;
  target: number;
  status: 'critical' | 'warning' | 'on-track' | 'exceeding';
  trend: 'improving' | 'stable' | 'degrading';
  trendDelta: number;
  percentOfTarget: number;
  calculatedAt: Date;
  dataPoints: number;
}

export interface KPINarrative {
  kpiId: string;
  headline: string;
  summary: string;
  explanation: string;
  businessImpact: string;
  recommendation: string;
  voiceText: string;
  confidence: number;
  supportingData: { label: string; value: string }[];
  relatedKPIs: string[];
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
}

export interface CrossKPIInsight {
  title: string;
  narrative: string;
  kpisInvolved: string[];
  correlationType: 'causal' | 'correlated' | 'inverse' | 'leading';
  confidence: number;
  actionable: boolean;
  recommendation: string;
}

export interface StorytellingOutput {
  generatedAt: Date;
  executiveSummary: string;
  kpiSnapshots: KPISnapshot[];
  narratives: KPINarrative[];
  crossInsights: CrossKPIInsight[];
  voiceBriefing: string;
  overallHealth: 'healthy' | 'at-risk' | 'critical';
  overallScore: number;
}

// ==========================================
// KPI REGISTRY — Complete metric catalog
// ==========================================

const KPI_REGISTRY: KPIDefinition[] = [
  {
    id: 'vdi',
    name: 'Vulnerability Density Index',
    abbreviation: 'VDI',
    formula: '(Vulnerable Assets / Total Assessed Assets) x 1000',
    unit: 'per 1,000 assets',
    target: '< 50',
    description: 'Measures the concentration of confirmed vulnerabilities per thousand assessed assets. A rising VDI indicates expanding attack surface.',
    dataSources: ['Field Notice Database', 'Asset Inventory', 'Vulnerability Scanner'],
    methodology: 'Calculated from deduplicated vulnerability counts across the entire assessed asset base. Uses 30-day rolling window with monthly aggregation.',
    businessContext: 'Lower VDI means better security posture. Industry benchmark for critical infrastructure is < 35.'
  },
  {
    id: 'crc',
    name: 'Customer Risk Concentration',
    abbreviation: 'CRC',
    formula: '(Top 5 Customer Vulnerabilities / Total Vulnerabilities) x 100',
    unit: '%',
    target: '< 40%',
    description: 'Measures how concentrated vulnerability risk is across the customer base. High CRC means a small number of customers carry disproportionate risk.',
    dataSources: ['Customer Database', 'Field Notice Records', 'Risk Assessments'],
    methodology: 'Pareto analysis of customer vulnerability distribution. Calculated from sorted customer-level aggregation.',
    businessContext: 'A CRC above 60% is a red flag — it means a breach at just a few customers could have outsized impact.'
  },
  {
    id: 'rv',
    name: 'Remediation Velocity',
    abbreviation: 'RV',
    formula: '((Old Average - Recent Average) / Old Average) x 100',
    unit: '%',
    target: '> 25%',
    description: 'Measures the rate of improvement in vulnerability remediation over time. Positive values mean vulnerabilities are being fixed faster.',
    dataSources: ['Monthly Trends', 'Remediation Tickets', 'Patch Management'],
    methodology: 'Compares the average monthly vulnerability count for the first half of the observation period vs. the second half.',
    businessContext: 'Healthy remediation velocity (>25%) signals effective patch management. Negative velocity requires immediate attention.'
  },
  {
    id: 'fnc',
    name: 'Field Notice Coverage',
    abbreviation: 'FNC',
    formula: '(Assets with Field Notices Applied / Total Assessed Assets) x 100',
    unit: '%',
    target: '> 95%',
    description: 'Measures the percentage of the total asset base that has been evaluated against active field notices.',
    dataSources: ['Field Notice Database', 'Asset Management', 'Coverage Reports'],
    methodology: 'Calculated from the ratio of unique assets with at least one FN record to total unique assessed assets.',
    businessContext: 'Coverage gaps below 95% create blind spots. Compliance frameworks (SOC 2, ISO 27001) typically require >98%.'
  },
  {
    id: 'rsi',
    name: 'Risk Score Index',
    abbreviation: 'RSI',
    formula: '(Vulnerable Assets / Total Assessed Assets) x 100',
    unit: '%',
    target: '< 5%',
    description: 'Overall risk exposure as a percentage of total assessed infrastructure.',
    dataSources: ['Metrics Summary', 'Vulnerability Counts'],
    methodology: 'Direct ratio calculation from aggregate vulnerability and total assessment counts.',
    businessContext: 'RSI above 10% puts the organization in the top risk quartile for the sector.'
  },
  {
    id: 'mttr',
    name: 'Mean Time To Remediate',
    abbreviation: 'MTTR',
    formula: 'Average days from vulnerability detection to closure',
    unit: 'days',
    target: '< 30 days',
    description: 'Average time between vulnerability identification and successful remediation.',
    dataSources: ['Remediation Timestamps', 'Ticket System', 'Patch Deployment Logs'],
    methodology: 'Statistical mean of (remediation_date - detection_date) across closed vulnerabilities.',
    businessContext: 'MTTR directly impacts dwell time. NIST recommends < 30 days for critical vulnerabilities.'
  },
  {
    id: 'det_rate',
    name: 'Detection Rate',
    abbreviation: 'DR',
    formula: '(Vulnerable / Total Assessed) x 100',
    unit: '%',
    target: '< 5%',
    description: 'Percentage of assessed assets found to have confirmed vulnerabilities.',
    dataSources: ['Metrics Cache', 'Assessment Results'],
    methodology: 'Ratio of vulnerable assets to total assessed. Lower is better.',
    businessContext: 'Detection rate above 5% warrants accelerated remediation programs.'
  },
  {
    id: 'sec_coverage',
    name: 'Security Coverage',
    abbreviation: 'SC',
    formula: '(Secure Assets / Total Assessed) x 100',
    unit: '%',
    target: '> 85%',
    description: 'Percentage of total assessed assets confirmed as secure (not vulnerable).',
    dataSources: ['Metrics Summary', 'Assessment Outcomes'],
    methodology: 'Ratio of confirmed-secure assets to total. Complementary to Detection Rate.',
    businessContext: 'Coverage above 90% is considered best-in-class for enterprise environments.'
  }
];

// ==========================================
// NARRATIVE TEMPLATES
// ==========================================

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function trendWord(trend: 'improving' | 'stable' | 'degrading'): string {
  switch (trend) {
    case 'improving': return 'improving';
    case 'stable': return 'holding steady';
    case 'degrading': return 'degrading';
  }
}

function statusEmoji(status: KPISnapshot['status']): string {
  switch (status) {
    case 'critical': return '🚨';
    case 'warning': return '⚠️';
    case 'on-track': return '✅';
    case 'exceeding': return '🌟';
  }
}

// ==========================================
// KPI STORYTELLING ENGINE
// ==========================================

export class KPIStorytellingEngine {
  private static instance: KPIStorytellingEngine;
  private lastOutput: StorytellingOutput | null = null;
  private lastComputeTime = 0;
  private cacheTTL = 60_000; // 1 minute

  private constructor() {
    console.log('[KPI Storytelling] Engine initialized');
  }

  static getInstance(): KPIStorytellingEngine {
    if (!KPIStorytellingEngine.instance) {
      KPIStorytellingEngine.instance = new KPIStorytellingEngine();
    }
    return KPIStorytellingEngine.instance;
  }

  /** Resolve a KPI definition by ID */
  getKPIDefinition(kpiId: string): KPIDefinition | undefined {
    return KPI_REGISTRY.find(k => k.id === kpiId);
  }

  /** List all registered KPIs */
  getAllKPIDefinitions(): KPIDefinition[] {
    return [...KPI_REGISTRY];
  }

  // ------------------------------------------
  // CORE: Compute all KPI snapshots from live data
  // ------------------------------------------

  async computeSnapshots(): Promise<KPISnapshot[]> {
    const metrics = await getMetricsFromCache();
    const trends = await getFilteredMonthlyTrendsFromCache({});
    const topCustomers = await getTopCustomersFromCache({}, 20);

    const totalAssessed = metrics.total || 0;
    const vulnerable = metrics.vulnerable || 0;
    const potentiallyVulnerable = metrics.potentiallyVulnerable || 0;
    const secure = metrics.notVulnerable || 0;

    const snapshots: KPISnapshot[] = [];

    // VDI — Vulnerability Density Index (lower is better)
    const vdiValue = totalAssessed > 0 ? (vulnerable / totalAssessed) * 1000 : 0;
    snapshots.push(this.buildSnapshot('vdi', vdiValue, 50, totalAssessed, trends, true));

    // CRC — Customer Risk Concentration
    const topFiveVulnerable = topCustomers.slice(0, 5)
      .reduce((sum, c) => sum + (c.totVuln || 0), 0);
    const crcValue = vulnerable > 0 ? (topFiveVulnerable / vulnerable) * 100 : 0;
    snapshots.push(this.buildSnapshot('crc', crcValue, 40, topCustomers.length, trends, true));

    // RV — Remediation Velocity
    const rvValue = this.computeRemediationVelocity(trends);
    snapshots.push(this.buildSnapshot('rv', rvValue, 25, trends.length, trends));

    // FNC — Field Notice Coverage
    const fncValue = totalAssessed > 0
      ? ((totalAssessed - potentiallyVulnerable) / totalAssessed) * 100
      : 0;
    snapshots.push(this.buildSnapshot('fnc', fncValue, 95, totalAssessed, trends));

    // RSI — Risk Score Index
    const rsiValue = totalAssessed > 0 ? (vulnerable / totalAssessed) * 100 : 0;
    snapshots.push(this.buildSnapshot('rsi', rsiValue, 5, totalAssessed, trends, true));

    // DR — Detection Rate
    snapshots.push(this.buildSnapshot('det_rate', rsiValue, 5, totalAssessed, trends, true));

    // SC — Security Coverage
    const scValue = totalAssessed > 0 ? (secure / totalAssessed) * 100 : 0;
    snapshots.push(this.buildSnapshot('sec_coverage', scValue, 85, totalAssessed, trends));

    return snapshots;
  }

  private buildSnapshot(
    kpiId: string,
    value: number,
    target: number,
    dataPoints: number,
    trends: any[],
    lowerIsBetter: boolean = false
  ): KPISnapshot {
    const { trend, trendDelta } = this.computeTrend(kpiId, trends);
    const percentOfTarget = target !== 0 ? (value / target) * 100 : 0;

    let status: KPISnapshot['status'];
    if (lowerIsBetter) {
      if (value > target * 2) status = 'critical';
      else if (value > target * 1.2) status = 'warning';
      else if (value <= target) status = 'exceeding';
      else status = 'on-track';
    } else {
      if (value < target * 0.5) status = 'critical';
      else if (value < target * 0.8) status = 'warning';
      else if (value >= target * 1.2) status = 'exceeding';
      else status = 'on-track';
    }

    return {
      kpiId,
      value: Math.round(value * 100) / 100,
      formattedValue: this.formatKPIValue(kpiId, value),
      target,
      status,
      trend,
      trendDelta: Math.round(trendDelta * 100) / 100,
      percentOfTarget: Math.round(percentOfTarget * 100) / 100,
      calculatedAt: new Date(),
      dataPoints,
    };
  }

  private formatKPIValue(kpiId: string, value: number): string {
    const def = this.getKPIDefinition(kpiId);
    const unit = def?.unit || '';
    if (unit === '%') return `${value.toFixed(1)}%`;
    if (unit.includes('1,000')) return `${value.toFixed(1)} per 1K`;
    if (unit === 'days') return `${value.toFixed(0)} days`;
    return value.toFixed(2);
  }

  private computeTrend(
    kpiId: string,
    trends: any[]
  ): { trend: 'improving' | 'stable' | 'degrading'; trendDelta: number } {
    if (!trends || trends.length < 2) return { trend: 'stable', trendDelta: 0 };

    // Use vulnerable counts from trend data to derive direction
    const sorted = [...trends].sort((a, b) => {
      const dateA = new Date(a.month || a.date || 0);
      const dateB = new Date(b.month || b.date || 0);
      return dateA.getTime() - dateB.getTime();
    });

    const recent = sorted.slice(-3);
    const older = sorted.slice(0, Math.max(1, sorted.length - 3));

    const recentAvg = recent.reduce((s, t) => s + (t.vulnerable || t.totVuln || 0), 0) / recent.length;
    const olderAvg = older.reduce((s, t) => s + (t.vulnerable || t.totVuln || 0), 0) / older.length;

    const delta = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

    // For vulnerability-related KPIs, decreasing vulnerable count = improving
    if (delta < -5) return { trend: 'improving', trendDelta: delta };
    if (delta > 5) return { trend: 'degrading', trendDelta: delta };
    return { trend: 'stable', trendDelta: delta };
  }

  private computeRemediationVelocity(trends: any[]): number {
    if (!trends || trends.length < 4) return 0;
    const sorted = [...trends].sort((a, b) => {
      const dateA = new Date(a.month || a.date || 0);
      const dateB = new Date(b.month || b.date || 0);
      return dateA.getTime() - dateB.getTime();
    });
    const half = Math.floor(sorted.length / 2);
    const oldAvg = sorted.slice(0, half).reduce((s, t) => s + (t.vulnerable || t.totVuln || 0), 0) / half;
    const newAvg = sorted.slice(half).reduce((s, t) => s + (t.vulnerable || t.totVuln || 0), 0) / (sorted.length - half);
    return oldAvg > 0 ? ((oldAvg - newAvg) / oldAvg) * 100 : 0;
  }

  // ------------------------------------------
  // NARRATIVE GENERATION — turn snapshots into stories
  // ------------------------------------------

  async generateNarrative(snapshot: KPISnapshot): Promise<KPINarrative> {
    const def = this.getKPIDefinition(snapshot.kpiId);
    if (!def) {
      return this.fallbackNarrative(snapshot);
    }

    const metrics = await getMetricsFromCache();
    const topCustomers = await getTopCustomersFromCache({}, 5);

    const topCustomerNames = topCustomers.slice(0, 3)
      .map(c => c.customerName || 'Unknown')
      .join(', ');
    const totalAssessedStr = formatNumber(metrics.total || 0);
    const vulnerableStr = formatNumber(metrics.vulnerable || 0);

    // Build headline
    const headline = this.buildHeadline(snapshot, def);

    // Build explanation with real data
    const explanation = this.buildExplanation(snapshot, def, metrics, topCustomerNames);

    // Business impact
    const businessImpact = this.buildBusinessImpact(snapshot, def, metrics);

    // Recommendation
    const recommendation = this.buildRecommendation(snapshot, def);

    // Voice-optimized text
    const voiceText = this.buildVoiceText(snapshot, def, metrics);

    // Summary
    const summary = `${def.name} is currently at ${snapshot.formattedValue} (target: ${def.target}). ` +
      `The metric is ${trendWord(snapshot.trend)} with a ${Math.abs(snapshot.trendDelta).toFixed(1)}% change. ` +
      `Status: ${snapshot.status}.`;

    return {
      kpiId: snapshot.kpiId,
      headline,
      summary,
      explanation,
      businessImpact,
      recommendation,
      voiceText,
      confidence: this.computeConfidence(snapshot),
      supportingData: [
        { label: 'Current Value', value: snapshot.formattedValue },
        { label: 'Target', value: def.target },
        { label: 'Trend', value: `${snapshot.trend} (${snapshot.trendDelta > 0 ? '+' : ''}${snapshot.trendDelta.toFixed(1)}%)` },
        { label: 'Data Points', value: snapshot.dataPoints.toLocaleString() },
        { label: 'Calculated', value: snapshot.calculatedAt.toLocaleTimeString() },
      ],
      relatedKPIs: this.findRelatedKPIs(snapshot.kpiId),
      severity: snapshot.status === 'critical' ? 'critical' : snapshot.status === 'warning' ? 'high' : 'medium',
    };
  }

  private buildHeadline(snapshot: KPISnapshot, def: KPIDefinition): string {
    const emoji = statusEmoji(snapshot.status);
    if (snapshot.status === 'critical') {
      return `${emoji} ${def.abbreviation} Alert: ${snapshot.formattedValue} — exceeds critical threshold`;
    }
    if (snapshot.status === 'warning') {
      return `${emoji} ${def.abbreviation} Warning: ${snapshot.formattedValue} — approaching target limit`;
    }
    if (snapshot.status === 'exceeding') {
      return `${emoji} ${def.abbreviation} Excellent: ${snapshot.formattedValue} — outperforming target`;
    }
    return `${emoji} ${def.abbreviation}: ${snapshot.formattedValue} — on track`;
  }

  private buildExplanation(
    snapshot: KPISnapshot,
    def: KPIDefinition,
    metrics: any,
    topCustomers: string
  ): string {
    const totalStr = formatNumber(metrics.total || 0);
    const vulnStr = formatNumber(metrics.vulnerable || 0);
    const secureStr = formatNumber(metrics.notVulnerable || 0);

    const lines: string[] = [
      `**${def.name} (${def.abbreviation})** measures ${def.description.toLowerCase()}`,
      '',
      `**How it's calculated:** ${def.formula}`,
      '',
      `**Current reading:** ${snapshot.formattedValue} against a target of ${def.target}. `,
      `This is based on ${totalStr} total assessed assets, of which ${vulnStr} are confirmed vulnerable and ${secureStr} are secure.`,
      '',
      `**Trend:** The metric has been ${trendWord(snapshot.trend)} over the recent observation window ` +
        `(${Math.abs(snapshot.trendDelta).toFixed(1)}% ${snapshot.trendDelta >= 0 ? 'increase' : 'decrease'}).`,
      '',
      `**Methodology:** ${def.methodology}`,
    ];

    if (topCustomers) {
      lines.push('', `**Top contributing customers:** ${topCustomers}`);
    }

    return lines.join('\n');
  }

  private buildBusinessImpact(snapshot: KPISnapshot, def: KPIDefinition, metrics: any): string {
    const lines: string[] = [def.businessContext];

    if (snapshot.status === 'critical') {
      lines.push(
        `At the current level of ${snapshot.formattedValue}, this KPI indicates elevated organizational risk. ` +
        `Immediate action is recommended to bring it within the ${def.target} target.`
      );
    } else if (snapshot.status === 'warning') {
      lines.push(
        `The current value of ${snapshot.formattedValue} is approaching the threshold. ` +
        `Proactive measures can prevent escalation to a critical state.`
      );
    } else if (snapshot.status === 'exceeding') {
      lines.push(
        `Performance at ${snapshot.formattedValue} exceeds the target of ${def.target}. ` +
        `This represents strong operational maturity in this area.`
      );
    }

    return lines.join(' ');
  }

  private buildRecommendation(snapshot: KPISnapshot, def: KPIDefinition): string {
    const recs: Record<string, Record<string, string>> = {
      vdi: {
        critical: 'Initiate emergency patch deployment for the highest-severity field notices. Engage TAC for critical customer accounts.',
        warning: 'Accelerate vulnerability remediation sprints. Prioritize field notices by customer impact.',
        'on-track': 'Maintain current remediation cadence. Review low-priority items for batch resolution.',
        exceeding: 'Document best practices for sustained performance. Consider raising the target threshold.'
      },
      crc: {
        critical: 'Immediately assess the top 5 customers for dedicated remediation resources. Escalate to account teams.',
        warning: 'Schedule focused reviews for high-concentration customers. Rebalance remediation effort.',
        'on-track': 'Monitor for concentration shifts. Continue balanced remediation approach.',
        exceeding: 'Risk is well-distributed. Use this as a benchmark for ongoing operations.'
      },
      rv: {
        critical: 'Remediation is slowing. Review process bottlenecks — staffing, tooling, approval chains.',
        warning: 'Velocity is plateauing. Consider automation of common remediation patterns.',
        'on-track': 'Velocity is healthy. Maintain current resource allocation.',
        exceeding: 'Excellent improvement trajectory. Share learnings across teams.'
      },
      rsi: {
        critical: 'Overall risk is elevated. Prioritize top field notices and high-vulnerability customers.',
        warning: 'Risk approaching threshold. Increase remediation throughput.',
        'on-track': 'Risk within acceptable range. Continue monitoring.',
        exceeding: 'Outstanding risk posture. Document and sustain.'
      }
    };

    return recs[snapshot.kpiId]?.[snapshot.status] || `Continue monitoring ${def.abbreviation} and maintain current operational practices.`;
  }

  private buildVoiceText(snapshot: KPISnapshot, def: KPIDefinition, metrics: any): string {
    // Optimized for TTS — no markdown, no tables, natural sentence flow
    const statusWords: Record<string, string> = {
      critical: 'in a critical state',
      warning: 'showing a warning',
      'on-track': 'on track',
      exceeding: 'exceeding expectations',
    };
    const trendWords: Record<string, string> = {
      improving: 'and the trend is positive',
      stable: 'and the trend is stable',
      degrading: 'but the trend is concerning',
    };

    return (
      `The ${def.name}, or ${def.abbreviation}, is currently at ${snapshot.formattedValue}. ` +
      `It is ${statusWords[snapshot.status] || 'within range'}, ${trendWords[snapshot.trend] || ''}. ` +
      `The target is ${def.target}. ${def.businessContext}`
    );
  }

  private computeConfidence(snapshot: KPISnapshot): number {
    let confidence = 70;
    if (snapshot.dataPoints > 100) confidence += 10;
    if (snapshot.dataPoints > 1000) confidence += 5;
    if (snapshot.dataPoints > 10000) confidence += 5;
    if (snapshot.trend !== 'stable') confidence += 3; // More signal
    if (snapshot.status === 'critical' || snapshot.status === 'exceeding') confidence += 2;
    return Math.min(98, confidence);
  }

  private findRelatedKPIs(kpiId: string): string[] {
    const relationships: Record<string, string[]> = {
      vdi: ['rsi', 'rv', 'det_rate'],
      crc: ['rsi', 'vdi'],
      rv: ['vdi', 'mttr'],
      fnc: ['sec_coverage', 'vdi'],
      rsi: ['vdi', 'crc', 'det_rate'],
      mttr: ['rv', 'vdi'],
      det_rate: ['rsi', 'vdi', 'sec_coverage'],
      sec_coverage: ['fnc', 'det_rate'],
    };
    return relationships[kpiId] || [];
  }

  private fallbackNarrative(snapshot: KPISnapshot): KPINarrative {
    return {
      kpiId: snapshot.kpiId,
      headline: `KPI ${snapshot.kpiId}: ${snapshot.formattedValue}`,
      summary: `Current value: ${snapshot.formattedValue}, status: ${snapshot.status}`,
      explanation: `This metric is at ${snapshot.formattedValue} with trend ${snapshot.trend}.`,
      businessImpact: 'Contact your SRE team for detailed impact assessment.',
      recommendation: 'Continue monitoring this metric.',
      voiceText: `The metric ${snapshot.kpiId} is at ${snapshot.formattedValue}.`,
      confidence: 60,
      supportingData: [{ label: 'Value', value: snapshot.formattedValue }],
      relatedKPIs: [],
      severity: 'medium',
    };
  }

  // ------------------------------------------
  // CROSS-KPI INSIGHT CORRELATION
  // ------------------------------------------

  async generateCrossInsights(snapshots: KPISnapshot[]): Promise<CrossKPIInsight[]> {
    const insights: CrossKPIInsight[] = [];

    const vdi = snapshots.find(s => s.kpiId === 'vdi');
    const crc = snapshots.find(s => s.kpiId === 'crc');
    const rv = snapshots.find(s => s.kpiId === 'rv');
    const rsi = snapshots.find(s => s.kpiId === 'rsi');
    const sc = snapshots.find(s => s.kpiId === 'sec_coverage');

    // Insight 1: VDI rising + CRC high = concentrated attack surface
    if (vdi && crc && vdi.trend === 'degrading' && crc.value > 50) {
      insights.push({
        title: 'Concentrated Vulnerability Expansion',
        narrative: `Vulnerability density is rising (VDI: ${vdi.formattedValue}, trend: ${vdi.trend}) ` +
          `while risk remains concentrated in a small number of customers (CRC: ${crc.formattedValue}). ` +
          `This combination means new vulnerabilities are disproportionately hitting already at-risk accounts. ` +
          `This amplifies cascading failure risk.`,
        kpisInvolved: ['vdi', 'crc'],
        correlationType: 'causal',
        confidence: 0.85,
        actionable: true,
        recommendation: 'Focus remediation on the top 5 at-risk customers first to break the concentration pattern.'
      });
    }

    // Insight 2: RV positive + VDI stable = effective remediation
    if (rv && vdi && rv.value > 15 && vdi.trend !== 'degrading') {
      insights.push({
        title: 'Remediation Effectiveness Confirmed',
        narrative: `Remediation velocity at ${rv.formattedValue} is actively reducing vulnerability density ` +
          `(VDI: ${vdi.formattedValue}, trend: ${vdi.trend}). The remediation program is delivering measurable results.`,
        kpisInvolved: ['rv', 'vdi'],
        correlationType: 'causal',
        confidence: 0.9,
        actionable: false,
        recommendation: 'Sustain current remediation cadence and resource allocation.'
      });
    }

    // Insight 3: RV negative or stalled + RSI rising = process bottleneck
    if (rv && rsi && rv.value < 10 && (rsi.status === 'warning' || rsi.status === 'critical')) {
      insights.push({
        title: 'Remediation Bottleneck Detected',
        narrative: `Remediation velocity is low (${rv.formattedValue}) while overall risk continues to rise ` +
          `(RSI: ${rsi.formattedValue}). This pattern suggests process bottlenecks — ` +
          `vulnerabilities are accumulating faster than they're being resolved.`,
        kpisInvolved: ['rv', 'rsi'],
        correlationType: 'inverse',
        confidence: 0.82,
        actionable: true,
        recommendation: 'Audit the remediation pipeline for approval delays, staffing gaps, or tooling limitations.'
      });
    }

    // Insight 4: Security coverage declining
    if (sc && sc.trend === 'degrading' && sc.value < 90) {
      insights.push({
        title: 'Security Coverage Erosion',
        narrative: `Security coverage has dropped to ${sc.formattedValue} and is declining. ` +
          `This means an increasing portion of the asset base has unresolved vulnerabilities.`,
        kpisInvolved: ['sec_coverage', 'det_rate'],
        correlationType: 'correlated',
        confidence: 0.88,
        actionable: true,
        recommendation: 'Launch a coverage gap analysis across all asset segments.'
      });
    }

    return insights;
  }

  // ------------------------------------------
  // FULL STORYTELLING OUTPUT
  // ------------------------------------------

  async generateFullStory(): Promise<StorytellingOutput> {
    // Check cache
    if (this.lastOutput && Date.now() - this.lastComputeTime < this.cacheTTL) {
      return this.lastOutput;
    }

    const startTime = Date.now();
    const snapshots = await this.computeSnapshots();
    const narratives = await Promise.all(snapshots.map(s => this.generateNarrative(s)));
    const crossInsights = await this.generateCrossInsights(snapshots);

    // Derive overall health
    const criticalCount = snapshots.filter(s => s.status === 'critical').length;
    const warningCount = snapshots.filter(s => s.status === 'warning').length;
    const overallHealth: StorytellingOutput['overallHealth'] =
      criticalCount > 0 ? 'critical' : warningCount > 1 ? 'at-risk' : 'healthy';
    const overallScore = Math.round(
      snapshots.reduce((sum, s) => {
        if (s.status === 'exceeding') return sum + 100;
        if (s.status === 'on-track') return sum + 75;
        if (s.status === 'warning') return sum + 40;
        return sum + 15;
      }, 0) / snapshots.length
    );

    // Executive summary
    const executiveSummary = this.buildExecutiveSummary(snapshots, narratives, crossInsights, overallHealth, overallScore);

    // Voice briefing
    const voiceBriefing = this.buildVoiceBriefing(snapshots, overallHealth, overallScore);

    const output: StorytellingOutput = {
      generatedAt: new Date(),
      executiveSummary,
      kpiSnapshots: snapshots,
      narratives,
      crossInsights,
      voiceBriefing,
      overallHealth,
      overallScore,
    };

    this.lastOutput = output;
    this.lastComputeTime = Date.now();
    console.log(`[KPI Storytelling] Full story generated in ${Date.now() - startTime}ms`);
    return output;
  }

  private buildExecutiveSummary(
    snapshots: KPISnapshot[],
    narratives: KPINarrative[],
    crossInsights: CrossKPIInsight[],
    health: string,
    score: number
  ): string {
    const criticals = narratives.filter(n => n.severity === 'critical');
    const warnings = narratives.filter(n => n.severity === 'high');

    const lines: string[] = [
      `## SRE AgenticOps — KPI Intelligence Briefing`,
      '',
      `**Overall Health:** ${health.toUpperCase()} | **Score:** ${score}/100 | **Generated:** ${new Date().toLocaleString()}`,
      '',
      `### Key Performance Indicators`,
      '',
      '| KPI | Value | Target | Status | Trend |',
      '|-----|-------|--------|--------|-------|',
    ];

    for (const s of snapshots) {
      const def = this.getKPIDefinition(s.kpiId);
      lines.push(`| ${def?.abbreviation || s.kpiId} | ${s.formattedValue} | ${def?.target || '-'} | ${statusEmoji(s.status)} ${s.status} | ${s.trend} (${s.trendDelta > 0 ? '+' : ''}${s.trendDelta.toFixed(1)}%) |`);
    }

    if (criticals.length > 0) {
      lines.push('', `### Critical Alerts (${criticals.length})`);
      criticals.forEach(n => lines.push('', `- **${n.headline}** — ${n.recommendation}`));
    }
    if (warnings.length > 0) {
      lines.push('', `### Warnings (${warnings.length})`);
      warnings.forEach(n => lines.push('', `- **${n.headline}** — ${n.recommendation}`));
    }
    if (crossInsights.length > 0) {
      lines.push('', `### Cross-KPI Insights`);
      crossInsights.forEach(ci => lines.push('', `- **${ci.title}:** ${ci.narrative.substring(0, 200)}...`));
    }

    return lines.join('\n');
  }

  private buildVoiceBriefing(snapshots: KPISnapshot[], health: string, score: number): string {
    const criticals = snapshots.filter(s => s.status === 'critical');
    const onTrack = snapshots.filter(s => s.status === 'on-track' || s.status === 'exceeding');

    let briefing = `Here is your KPI intelligence briefing. `;
    briefing += `Overall system health is ${health} with a score of ${score} out of 100. `;
    briefing += `I'm tracking ${snapshots.length} key performance indicators. `;

    if (criticals.length > 0) {
      briefing += `${criticals.length} ${criticals.length === 1 ? 'metric is' : 'metrics are'} in critical status. `;
      criticals.forEach(s => {
        const def = this.getKPIDefinition(s.kpiId);
        if (def) {
          briefing += `${def.name} is at ${s.formattedValue}, which is ${s.status}. `;
        }
      });
    }

    if (onTrack.length > 0) {
      briefing += `${onTrack.length} metrics are meeting or exceeding targets. `;
    }

    briefing += `Would you like me to dive deeper into any specific KPI?`;
    return briefing;
  }

  // ------------------------------------------
  // CHATBOT INTEGRATION: answer KPI questions
  // ------------------------------------------

  async answerKPIQuestion(question: string): Promise<{
    response: string;
    voiceResponse: string;
    attachments: any[];
    suggestions: string[];
  }> {
    const story = await this.generateFullStory();
    const lowerQ = question.toLowerCase();

    // Detect which KPI the user is asking about
    const matchedKPI = KPI_REGISTRY.find(k =>
      lowerQ.includes(k.id) ||
      lowerQ.includes(k.abbreviation.toLowerCase()) ||
      lowerQ.includes(k.name.toLowerCase()) ||
      k.name.toLowerCase().split(' ').some(word => word.length > 3 && lowerQ.includes(word))
    );

    // Full story request
    if (lowerQ.includes('all kpi') || lowerQ.includes('kpi summary') || lowerQ.includes('kpi brief') || lowerQ.includes('all metrics')) {
      return {
        response: story.executiveSummary,
        voiceResponse: story.voiceBriefing,
        attachments: [{
          type: 'metrics',
          title: 'KPI Dashboard',
          data: story.kpiSnapshots.map(s => ({
            kpi: s.kpiId.toUpperCase(),
            value: s.formattedValue,
            status: s.status,
            trend: s.trend,
          }))
        }],
        suggestions: [
          'Explain the most critical KPI',
          'What are the cross-KPI insights?',
          'Show remediation velocity details',
          'Compare current vs target for all KPIs'
        ]
      };
    }

    // Specific KPI deep-dive
    if (matchedKPI) {
      const snapshot = story.kpiSnapshots.find(s => s.kpiId === matchedKPI.id);
      const narrative = story.narratives.find(n => n.kpiId === matchedKPI.id);

      if (snapshot && narrative) {
        const response = [
          `## ${narrative.headline}`,
          '',
          narrative.explanation,
          '',
          `### Business Impact`,
          narrative.businessImpact,
          '',
          `### Recommendation`,
          narrative.recommendation,
          '',
          `### Supporting Data`,
          ...narrative.supportingData.map(d => `- **${d.label}:** ${d.value}`),
        ].join('\n');

        const relatedNames = narrative.relatedKPIs
          .map(id => this.getKPIDefinition(id)?.name)
          .filter(Boolean);

        return {
          response,
          voiceResponse: narrative.voiceText,
          attachments: [{
            type: 'metrics',
            title: matchedKPI.name,
            data: narrative.supportingData,
          }],
          suggestions: [
            ...relatedNames.map(n => `Tell me about ${n}`),
            'Show all KPIs',
            'What are the cross-KPI insights?',
          ].slice(0, 4)
        };
      }
    }

    // Cross-KPI insights
    if (lowerQ.includes('cross') || lowerQ.includes('correlation') || lowerQ.includes('insight') || lowerQ.includes('pattern')) {
      if (story.crossInsights.length === 0) {
        return {
          response: 'No significant cross-KPI correlations detected at this time. All metrics are operating independently within expected ranges.',
          voiceResponse: 'No significant cross KPI correlations detected at this time.',
          attachments: [],
          suggestions: ['Show all KPIs', 'Explain vulnerability density']
        };
      }

      const response = [
        '## Cross-KPI Intelligence Insights',
        '',
        ...story.crossInsights.map(ci => [
          `### ${ci.title}`,
          ci.narrative,
          `**Confidence:** ${(ci.confidence * 100).toFixed(0)}% | **Type:** ${ci.correlationType}`,
          ci.actionable ? `**Action:** ${ci.recommendation}` : '',
          ''
        ].join('\n'))
      ].join('\n');

      return {
        response,
        voiceResponse: story.crossInsights.map(ci => `${ci.title}. ${ci.narrative}`).join(' '),
        attachments: [],
        suggestions: story.crossInsights.map(ci => `Explain ${ci.kpisInvolved.map(k => k.toUpperCase()).join(' and ')} correlation`).slice(0, 3)
      };
    }

    // Default: executive summary
    return {
      response: story.executiveSummary,
      voiceResponse: story.voiceBriefing,
      attachments: [],
      suggestions: [
        'Explain vulnerability density index',
        'What is remediation velocity?',
        'Show cross-KPI insights',
        'Tell me about customer risk concentration'
      ]
    };
  }
}

// ==========================================
// SINGLETON EXPORT
// ==========================================

export const kpiStorytellingEngine = KPIStorytellingEngine.getInstance();
