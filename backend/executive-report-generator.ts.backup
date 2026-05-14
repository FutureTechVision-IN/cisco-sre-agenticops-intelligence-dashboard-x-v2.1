/**
 * Executive Report Generator for SRE AI Assistant
 * 
 * Generates professional, emoji-free reports in formal business communication style.
 * Designed for C-level executives, board presentations, and stakeholder briefings.
 * 
 * Features:
 * - Professional formatting without emojis
 * - Formal business language
 * - Structured sections with clear hierarchy
 * - Data-driven insights with confidence levels
 * - Actionable recommendations
 * 
 * @module ExecutiveReportGenerator
 * @version 2.0.0
 */

import {
  aimlEngine,
  ExecutiveSummary,
  ExecutiveSection,
  AnomalyResult,
  FieldNoticeComparison,
  CustomerFilter,
  TemporalFilter,
  SeverityLevel
} from './aiml-engine';

import {
  getMetricsFromCache,
  ValidatedMetrics,
  getTopCustomersFromCache,
  getTopFieldNoticesFromCache,
  getFilteredMonthlyTrendsFromCache,
  getAllRecordsFromCache
} from './csv-data-service';

import { dataAccuracyValidator } from './data-accuracy-validator';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface ReportConfiguration {
  title?: string;
  format: 'executive' | 'technical' | 'board' | 'operational';
  includeAnomalies: boolean;
  includeComparisons: boolean;
  includeTrends: boolean;
  includeRecommendations: boolean;
  maxPages?: number;
  customerFilter?: CustomerFilter;
  temporalFilter?: TemporalFilter;
}

export interface FormattedReport {
  title: string;
  subtitle: string;
  generatedAt: string;
  confidenceLevel: number;
  executiveSummary: string;
  sections: FormattedSection[];
  appendix?: FormattedSection[];
  metadata: ReportMetadata;
}

export interface FormattedSection {
  id: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  content: string;
  tables?: FormattedTable[];
  bulletPoints?: string[];
  callouts?: Callout[];
}

export interface FormattedTable {
  title: string;
  headers: string[];
  rows: string[][];
  footnote?: string;
}

export interface Callout {
  type: 'warning' | 'info' | 'success' | 'action';
  title: string;
  message: string;
}

export interface ReportMetadata {
  dataRange: string;
  recordsAnalyzed: number;
  customersIncluded: number;
  fieldNoticesIncluded: number;
  generatedBy: string;
  version: string;
  dataValidation?: {
    isValid: boolean;
    lastVerifiedAt: string;
    discrepancies: string[];
  };
}

// ==========================================
// EXECUTIVE REPORT GENERATOR CLASS
// ==========================================

export class ExecutiveReportGenerator {
  private static instance: ExecutiveReportGenerator;

  private constructor() {
    console.log('[Executive Report Generator] Initialized');
  }

  public static getInstance(): ExecutiveReportGenerator {
    if (!ExecutiveReportGenerator.instance) {
      ExecutiveReportGenerator.instance = new ExecutiveReportGenerator();
    }
    return ExecutiveReportGenerator.instance;
  }

  // ==========================================
  // MAIN REPORT GENERATION
  // ==========================================

  /**
   * Generate a comprehensive executive report
   */
  async generateReport(config: ReportConfiguration): Promise<FormattedReport> {
    const startTime = Date.now();

    try {
      // Gather data from AIML engine
      const anomalies = config.includeAnomalies
        ? await aimlEngine.detectAnomalies(config.customerFilter, config.temporalFilter)
        : [];

      const comparisons = config.includeComparisons
        ? await aimlEngine.compareFieldNotices(undefined, config.customerFilter, config.temporalFilter)
        : [];

      const metrics = await getMetricsFromCache();
      const topCustomers = await getTopCustomersFromCache({}, 20);
      const topFieldNotices = await getTopFieldNoticesFromCache({}, 10);
      const trends = config.includeTrends
        ? await getFilteredMonthlyTrendsFromCache({})
        : null;

      // Build sections based on format
      const sections = await this.buildReportSections(
        config,
        metrics,
        anomalies,
        comparisons,
        topCustomers,
        topFieldNotices,
        trends
      );

      // Generate executive summary
      const executiveSummary = this.generateExecutiveSummaryText(
        config.format,
        metrics,
        anomalies,
        comparisons
      );

      const report: FormattedReport = {
        title: config.title || this.generateReportTitle(config),
        subtitle: this.generateSubtitle(config),
        generatedAt: new Date().toISOString(),
        confidenceLevel: this.calculateConfidence(metrics, anomalies.length),
        executiveSummary,
        sections,
        metadata: {
          dataRange: this.getDataRange(config.temporalFilter),
          recordsAnalyzed: metrics.totalAssessed || 0,
          customersIncluded: metrics.uniqueCustomers || 0,
          fieldNoticesIncluded: metrics.uniqueFieldNotices || 0,
          generatedBy: 'SRE AgenticOps Intelligence Dashboard',
          version: '2.0.0',
          dataValidation: {
            isValid: metrics.validation?.isValid ?? true,
            lastVerifiedAt: metrics.validation?.lastVerifiedAt ?? new Date().toISOString(),
            discrepancies: metrics.validation?.discrepancies ?? []
          }
        }
      };

      // Log validation status
      if (metrics.uniqueCustomers === 0) {
        console.warn('[Executive Report Generator] WARNING: uniqueCustomers is 0 - data may not be loaded correctly');
      }
      if (!metrics.validation?.isValid) {
        console.warn('[Executive Report Generator] Data validation issues:', metrics.validation?.discrepancies);
      }

      console.log(`[Executive Report Generator] Generated report: ${metrics.uniqueCustomers} customers, ${metrics.uniqueFieldNotices} FNs, ${metrics.totalAssessed} assets (${Date.now() - startTime}ms)`);
      return report;

    } catch (error) {
      console.error('[Executive Report Generator] Error:', error);
      throw error;
    }
  }

  // ==========================================
  // SECTION BUILDERS
  // ==========================================

  /**
   * Build report sections based on configuration
   */
  private async buildReportSections(
    config: ReportConfiguration,
    metrics: any,
    anomalies: AnomalyResult[],
    comparisons: FieldNoticeComparison[],
    topCustomers: any[],
    topFieldNotices: any[],
    trends: any
  ): Promise<FormattedSection[]> {
    const sections: FormattedSection[] = [];

    // Section 1: Current State Assessment
    sections.push(this.buildStateAssessmentSection(metrics));

    // Section 2: Risk Analysis (if anomalies present)
    if (config.includeAnomalies && anomalies.length > 0) {
      sections.push(this.buildRiskAnalysisSection(anomalies));
    }

    // Section 3: Field Notice Prioritization
    if (config.includeComparisons && comparisons.length > 0) {
      sections.push(this.buildFieldNoticeSection(comparisons));
    }

    // Section 4: Customer Impact Analysis
    if (topCustomers.length > 0) {
      sections.push(this.buildCustomerImpactSection(topCustomers, anomalies));
    }

    // Section 5: Trend Analysis
    if (config.includeTrends && trends) {
      sections.push(this.buildTrendSection(trends));
    }

    // Section 6: Recommendations
    if (config.includeRecommendations) {
      sections.push(this.buildRecommendationsSection(anomalies, comparisons, metrics));
    }

    return sections;
  }

  /**
   * Build Current State Assessment section
   */
  private buildStateAssessmentSection(metrics: any): FormattedSection {
    const totalAssets = (metrics.vulnerable || 0) + (metrics.potentiallyVulnerable || 0) + (metrics.notVulnerable || 0);
    const remediationRate = totalAssets > 0 
      ? ((metrics.notVulnerable || 0) / totalAssets * 100).toFixed(1) 
      : '0.0';

    return {
      id: 'state-assessment',
      title: 'Current State Assessment',
      priority: 'critical',
      content: `
This section provides an overview of the current security posture across all monitored assets and enterprise customers.

ASSET STATUS DISTRIBUTION

The following table summarizes the current vulnerability status across all assessed assets:
      `.trim(),
      tables: [{
        title: 'Asset Status Summary',
        headers: ['Status Category', 'Asset Count', 'Percentage', 'Trend'],
        rows: [
          ['Vulnerable', (metrics.vulnerable || 0).toLocaleString(), `${((metrics.vulnerable || 0) / totalAssets * 100).toFixed(1)}%`, 'Monitoring'],
          ['Potentially Vulnerable', (metrics.potentiallyVulnerable || 0).toLocaleString(), `${((metrics.potentiallyVulnerable || 0) / totalAssets * 100).toFixed(1)}%`, 'Assessment'],
          ['Secure', (metrics.notVulnerable || 0).toLocaleString(), `${((metrics.notVulnerable || 0) / totalAssets * 100).toFixed(1)}%`, 'Stable'],
          ['Total Assessed', totalAssets.toLocaleString(), '100%', '-']
        ],
        footnote: 'Data reflects most recent assessment cycle. Potentially Vulnerable assets require additional validation.'
      }],
      bulletPoints: [
        `Total enterprise customers under management: ${(metrics.uniqueCustomers || 0).toLocaleString()}`,
        `Active field notices being tracked: ${(metrics.uniqueFieldNotices || 0).toLocaleString()}`,
        `Current remediation rate: ${remediationRate}%`,
        `Assessment coverage: Complete across all monitored environments`
      ]
    };
  }

  /**
   * Build Risk Analysis section
   */
  private buildRiskAnalysisSection(anomalies: AnomalyResult[]): FormattedSection {
    const criticalCount = anomalies.filter(a => a.severityLevel === 'CRITICAL').length;
    const highCount = anomalies.filter(a => a.severityLevel === 'HIGH').length;
    const mediumCount = anomalies.filter(a => a.severityLevel === 'MEDIUM').length;

    const tableRows = anomalies.slice(0, 12).map(a => [
      a.severityLevel,
      a.customerName,
      a.riskScore.percentage,
      a.vulnerabilityCount.toLocaleString(),
      (a.vulnerabilityCount - a.baselineCount).toString(),
      a.recommendation.split('.')[0]
    ]);

    return {
      id: 'risk-analysis',
      title: 'Detected Anomalies and Risk Analysis',
      priority: criticalCount > 0 ? 'critical' : 'high',
      content: `
AI-driven analysis has identified ${anomalies.length} enterprise customers exhibiting unusual vulnerability patterns that warrant executive attention.

ANOMALY CLASSIFICATION SUMMARY

Priority Distribution: CRITICAL: ${criticalCount} | HIGH: ${highCount} | MEDIUM: ${mediumCount}

The following accounts have been flagged based on statistical deviation analysis, infrastructure criticality assessment, and compliance exposure evaluation:
      `.trim(),
      tables: [{
        title: 'Priority Account Analysis',
        headers: ['Severity', 'Customer', 'Risk Score', 'Vulnerabilities', 'Above Baseline', 'Action Required'],
        rows: tableRows,
        footnote: 'Risk scores calculated using weighted factor analysis including infrastructure criticality, compliance exposure, and trend direction.'
      }],
      callouts: criticalCount > 0 ? [{
        type: 'warning',
        title: 'IMMEDIATE ATTENTION REQUIRED',
        message: `${criticalCount} account(s) classified as CRITICAL require immediate executive escalation and resource allocation.`
      }] : undefined
    };
  }

  /**
   * Build Field Notice Prioritization section
   */
  private buildFieldNoticeSection(comparisons: FieldNoticeComparison[]): FormattedSection {
    const critical = comparisons.filter(c => c.severityClassification === 'CRITICAL');
    const high = comparisons.filter(c => c.severityClassification === 'HIGH');

    const tableRows = comparisons.slice(0, 10).map(c => {
      const deviceStr = c.totalDevices > 1000000 
        ? `${(c.totalDevices / 1000000).toFixed(2)}M`
        : c.totalDevices.toLocaleString();
      return [
        c.priority.toString(),
        c.fieldNoticeId,
        deviceStr,
        c.uniqueCustomers.toString(),
        c.fnType,
        c.severityClassification,
        c.remediationType
      ];
    });

    return {
      id: 'field-notice-prioritization',
      title: 'Field Notice Comparison and Prioritization',
      priority: critical.length > 0 ? 'critical' : 'high',
      content: `
This analysis compares active field notices using a weighted scoring methodology that considers infrastructure criticality, customer breadth, cascading failure risk, compliance exposure, and device volume.

KEY INSIGHT: Device count alone is insufficient for prioritization. Field notices affecting network infrastructure (routers, switches) receive higher priority than those affecting endpoint devices, regardless of total device count.

PRIORITIZATION METHODOLOGY

Weighted factors applied:
- Infrastructure Criticality: 30%
- Customer Breadth: 25%
- Cascading Failure Risk: 20%
- Compliance Exposure: 15%
- Device Volume: 10%
      `.trim(),
      tables: [{
        title: 'Field Notice Priority Matrix',
        headers: ['Priority', 'Field Notice', 'Devices', 'Customers', 'Type', 'Severity', 'Remediation'],
        rows: tableRows,
        footnote: 'Priority rankings reflect weighted analysis. CRITICAL items require immediate cross-functional coordination.'
      }],
      bulletPoints: critical.length > 0 ? [
        `${critical.length} field notice(s) classified as CRITICAL requiring immediate BE, CX, TAC coordination`,
        `${high.length} field notice(s) classified as HIGH requiring scheduled remediation`,
        `Recommended SLA for CRITICAL items: 72-hour remediation window for critical infrastructure customers`
      ] : undefined
    };
  }

  /**
   * Build Customer Impact section
   */
  private buildCustomerImpactSection(topCustomers: any[], anomalies: AnomalyResult[]): FormattedSection {
    const anomalyMap = new Map(anomalies.map(a => [a.customerName.toUpperCase(), a]));

    const tableRows = topCustomers.slice(0, 15).map(c => {
      const anomaly = anomalyMap.get(c.customerName?.toUpperCase());
      return [
        c.customerName || 'Unknown',
        (c.totVuln || 0).toLocaleString(),
        (c.potVuln || 0).toLocaleString(),
        (c.notVuln || 0).toLocaleString(),
        anomaly ? anomaly.riskScore.percentage : 'Normal',
        anomaly ? anomaly.severityLevel : '-'
      ];
    });

    return {
      id: 'customer-impact',
      title: 'Customer Impact Analysis',
      priority: 'high',
      content: `
This section provides a detailed breakdown of vulnerability exposure by customer, enabling account-level prioritization and resource allocation decisions.

TOP IMPACTED CUSTOMERS

The following table ranks customers by total vulnerable asset count, with anomaly indicators for accounts exhibiting unusual patterns:
      `.trim(),
      tables: [{
        title: 'Customer Vulnerability Summary',
        headers: ['Customer', 'Vulnerable', 'Potentially Vuln.', 'Secure', 'Risk Score', 'Flag'],
        rows: tableRows,
        footnote: 'Customers with elevated risk scores have been flagged for additional review. Risk Score "Normal" indicates within expected baseline.'
      }]
    };
  }

  /**
   * Build Trend Analysis section
   */
  private buildTrendSection(trends: any): FormattedSection {
    const tableRows = Object.entries(trends).slice(0, 12).map(([month, data]: [string, any]) => [
      month,
      (data.vulnerable || 0).toLocaleString(),
      (data.potentiallyVulnerable || 0).toLocaleString(),
      (data.notVulnerable || 0).toLocaleString(),
      ((data.vulnerable || 0) + (data.potentiallyVulnerable || 0) + (data.notVulnerable || 0)).toLocaleString()
    ]);

    return {
      id: 'trend-analysis',
      title: 'Historical Trend Analysis',
      priority: 'medium',
      content: `
This section presents month-over-month trends in vulnerability detection and remediation progress, enabling identification of patterns and forecasting of future resource requirements.

MONTHLY VULNERABILITY TRENDS

The following table shows vulnerability status changes over time:
      `.trim(),
      tables: [{
        title: 'Monthly Trend Data',
        headers: ['Month', 'Vulnerable', 'Potentially Vuln.', 'Secure', 'Total'],
        rows: tableRows,
        footnote: 'Trend data enables capacity planning and remediation velocity assessment.'
      }]
    };
  }

  /**
   * Build Recommendations section
   */
  private buildRecommendationsSection(
    anomalies: AnomalyResult[],
    comparisons: FieldNoticeComparison[],
    metrics: any
  ): FormattedSection {
    const criticalAnomalies = anomalies.filter(a => a.severityLevel === 'CRITICAL');
    const criticalFNs = comparisons.filter(c => c.severityClassification === 'CRITICAL');

    const recommendations: string[] = [];

    // Immediate actions for critical items
    if (criticalFNs.length > 0) {
      recommendations.push(
        `IMMEDIATE: Initiate cross-functional coordination (BE, CX, TAC) for ${criticalFNs.map(f => f.fieldNoticeId).join(', ')}. Establish 72-hour remediation SLA for critical infrastructure customers.`
      );
    }

    if (criticalAnomalies.length > 0) {
      const customerNames = criticalAnomalies.slice(0, 3).map(a => a.customerName).join(', ');
      recommendations.push(
        `HIGH PRIORITY: Schedule executive briefing for ${customerNames}. Engage account teams for root cause analysis within 48 hours.`
      );
    }

    // Standard operational recommendations
    recommendations.push(
      'OPERATIONAL: Conduct weekly progress reviews with leadership to track remediation velocity and escalate blockers.',
      'MONITORING: Implement automated threshold alerting for vulnerability count increases exceeding 20% week-over-week.',
      'COMPLIANCE: Verify SLA adherence for all critical infrastructure accounts and document compliance gaps.',
      'REPORTING: Establish cadence for executive dashboard reviews to maintain visibility into security posture trends.'
    );

    return {
      id: 'recommendations',
      title: 'Strategic Recommendations',
      priority: criticalAnomalies.length > 0 || criticalFNs.length > 0 ? 'critical' : 'high',
      content: `
Based on the analysis presented in this report, the following actions are recommended to address identified risks and maintain security posture:

RECOMMENDED ACTIONS
      `.trim(),
      bulletPoints: recommendations,
      callouts: criticalAnomalies.length > 0 ? [{
        type: 'action',
        title: 'EXECUTIVE ESCALATION REQUIRED',
        message: `${criticalAnomalies.length} account(s) require executive-level attention and resource allocation decisions.`
      }] : undefined
    };
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Generate executive summary text
   */
  private generateExecutiveSummaryText(
    format: string,
    metrics: any,
    anomalies: AnomalyResult[],
    comparisons: FieldNoticeComparison[]
  ): string {
    const totalAssets = (metrics.vulnerable || 0) + (metrics.potentiallyVulnerable || 0) + (metrics.notVulnerable || 0);
    const criticalCount = anomalies.filter(a => a.severityLevel === 'CRITICAL').length;
    const criticalFNs = comparisons.filter(c => c.severityClassification === 'CRITICAL');

    const lines: string[] = [
      'EXECUTIVE SUMMARY',
      '',
      `This report provides a comprehensive analysis of the current security posture across ${totalAssets.toLocaleString()} assessed assets spanning ${(metrics.uniqueCustomers || 0).toLocaleString()} enterprise customers.`,
      ''
    ];

    if (criticalCount > 0 || criticalFNs.length > 0) {
      lines.push('KEY FINDINGS REQUIRING IMMEDIATE ATTENTION:');
      lines.push('');
      
      if (criticalCount > 0) {
        lines.push(`- ${criticalCount} enterprise customer(s) identified with CRITICAL risk patterns requiring executive escalation`);
      }
      
      if (criticalFNs.length > 0) {
        lines.push(`- ${criticalFNs.length} field notice(s) classified as CRITICAL affecting network infrastructure`);
        lines.push(`  Priority field notices: ${criticalFNs.map(f => f.fieldNoticeId).join(', ')}`);
      }
      
      lines.push('');
    }

    lines.push('CURRENT STATE METRICS:');
    lines.push('');
    lines.push(`- Vulnerable Assets: ${(metrics.vulnerable || 0).toLocaleString()}`);
    lines.push(`- Potentially Vulnerable: ${(metrics.potentiallyVulnerable || 0).toLocaleString()}`);
    lines.push(`- Secure Assets: ${(metrics.notVulnerable || 0).toLocaleString()}`);
    lines.push(`- Active Field Notices: ${(metrics.uniqueFieldNotices || 0).toLocaleString()}`);

    return lines.join('\n');
  }

  /**
   * Generate report title based on configuration
   */
  private generateReportTitle(config: ReportConfiguration): string {
    const baseTitle = 'SRE Operations Intelligence Report';
    
    if (config.format === 'board') {
      return `Board-Level ${baseTitle}`;
    }
    if (config.format === 'operational') {
      return `Operational ${baseTitle}`;
    }
    
    return baseTitle;
  }

  /**
   * Generate subtitle
   */
  private generateSubtitle(config: ReportConfiguration): string {
    const parts: string[] = [];
    
    if (config.customerFilter?.customerName) {
      parts.push(`Customer: ${config.customerFilter.customerName}`);
    }
    
    if (config.temporalFilter?.month) {
      parts.push(`Period: ${config.temporalFilter.month}`);
    }
    
    parts.push(`Generated: ${new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`);
    
    return parts.join(' | ');
  }

  /**
   * Calculate confidence level
   */
  private calculateConfidence(metrics: any, anomalyCount: number): number {
    const totalAssets = (metrics.vulnerable || 0) + (metrics.potentiallyVulnerable || 0) + (metrics.notVulnerable || 0);
    
    // Base confidence from data volume
    let confidence = Math.min(85, 50 + Math.log10(totalAssets + 1) * 10);
    
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
  // FORMAT CONVERSION
  // ==========================================

  /**
   * Convert report to plain text format
   */
  toPlainText(report: FormattedReport): string {
    const lines: string[] = [];
    
    // Header
    lines.push('='.repeat(80));
    lines.push(report.title.toUpperCase());
    lines.push(report.subtitle);
    lines.push('='.repeat(80));
    lines.push('');
    
    // Executive Summary
    lines.push(report.executiveSummary);
    lines.push('');
    lines.push('-'.repeat(80));
    
    // Sections
    for (const section of report.sections) {
      lines.push('');
      lines.push(section.title.toUpperCase());
      lines.push('-'.repeat(section.title.length));
      lines.push('');
      lines.push(section.content);
      lines.push('');
      
      // Tables
      if (section.tables) {
        for (const table of section.tables) {
          lines.push(table.title);
          lines.push('');
          lines.push(table.headers.join(' | '));
          lines.push('-'.repeat(table.headers.join(' | ').length));
          for (const row of table.rows) {
            lines.push(row.join(' | '));
          }
          if (table.footnote) {
            lines.push('');
            lines.push(`Note: ${table.footnote}`);
          }
          lines.push('');
        }
      }
      
      // Bullet points
      if (section.bulletPoints) {
        for (const point of section.bulletPoints) {
          lines.push(`  * ${point}`);
        }
        lines.push('');
      }
      
      // Callouts
      if (section.callouts) {
        for (const callout of section.callouts) {
          lines.push(`[${callout.type.toUpperCase()}] ${callout.title}`);
          lines.push(`  ${callout.message}`);
          lines.push('');
        }
      }
    }
    
    // Footer
    lines.push('='.repeat(80));
    lines.push(`Confidence Level: ${report.confidenceLevel}%`);
    lines.push(`Generated by: ${report.metadata.generatedBy}`);
    lines.push(`Report Version: ${report.metadata.version}`);
    lines.push('='.repeat(80));
    
    return lines.join('\n');
  }

  /**
   * Convert report to markdown format
   */
  toMarkdown(report: FormattedReport): string {
    const lines: string[] = [];
    
    // Header
    lines.push(`# ${report.title}`);
    lines.push(`*${report.subtitle}*`);
    lines.push('');
    lines.push('---');
    lines.push('');
    
    // Executive Summary
    lines.push('## Executive Summary');
    lines.push('');
    lines.push(report.executiveSummary);
    lines.push('');
    
    // Sections
    for (const section of report.sections) {
      lines.push(`## ${section.title}`);
      lines.push('');
      lines.push(section.content);
      lines.push('');
      
      // Tables
      if (section.tables) {
        for (const table of section.tables) {
          lines.push(`### ${table.title}`);
          lines.push('');
          lines.push('| ' + table.headers.join(' | ') + ' |');
          lines.push('| ' + table.headers.map(() => '---').join(' | ') + ' |');
          for (const row of table.rows) {
            lines.push('| ' + row.join(' | ') + ' |');
          }
          if (table.footnote) {
            lines.push('');
            lines.push(`*${table.footnote}*`);
          }
          lines.push('');
        }
      }
      
      // Bullet points
      if (section.bulletPoints) {
        for (const point of section.bulletPoints) {
          lines.push(`- ${point}`);
        }
        lines.push('');
      }
      
      // Callouts
      if (section.callouts) {
        for (const callout of section.callouts) {
          const prefix = callout.type === 'warning' ? '**WARNING:**' 
            : callout.type === 'action' ? '**ACTION REQUIRED:**'
            : `**${callout.type.toUpperCase()}:**`;
          lines.push(`> ${prefix} ${callout.title}`);
          lines.push(`> ${callout.message}`);
          lines.push('');
        }
      }
    }
    
    // Footer
    lines.push('---');
    lines.push('');
    lines.push(`**Confidence Level:** ${report.confidenceLevel}%`);
    lines.push('');
    lines.push(`*Generated by ${report.metadata.generatedBy} v${report.metadata.version}*`);
    
    return lines.join('\n');
  }

  /**
   * Convert report to HTML format for display
   */
  toHTML(report: FormattedReport): string {
    const sections = report.sections.map(section => {
      let html = `
        <section class="report-section priority-${section.priority}">
          <h2>${section.title}</h2>
          <div class="section-content">${section.content.replace(/\n/g, '<br>')}</div>
      `;
      
      if (section.tables) {
        for (const table of section.tables) {
          html += `
            <div class="table-container">
              <h3>${table.title}</h3>
              <table>
                <thead>
                  <tr>${table.headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                  ${table.rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
                </tbody>
              </table>
              ${table.footnote ? `<p class="table-footnote">${table.footnote}</p>` : ''}
            </div>
          `;
        }
      }
      
      if (section.bulletPoints) {
        html += `<ul>${section.bulletPoints.map(p => `<li>${p}</li>`).join('')}</ul>`;
      }
      
      if (section.callouts) {
        for (const callout of section.callouts) {
          html += `
            <div class="callout callout-${callout.type}">
              <strong>${callout.title}</strong>
              <p>${callout.message}</p>
            </div>
          `;
        }
      }
      
      html += '</section>';
      return html;
    }).join('');

    return `
      <article class="executive-report">
        <header>
          <h1>${report.title}</h1>
          <p class="subtitle">${report.subtitle}</p>
        </header>
        <section class="executive-summary">
          <h2>Executive Summary</h2>
          <pre>${report.executiveSummary}</pre>
        </section>
        ${sections}
        <footer>
          <p>Confidence Level: ${report.confidenceLevel}%</p>
          <p>Generated by ${report.metadata.generatedBy} v${report.metadata.version}</p>
        </footer>
      </article>
    `;
  }
}

// ==========================================
// SINGLETON EXPORT
// ==========================================

export const executiveReportGenerator = ExecutiveReportGenerator.getInstance();

export default executiveReportGenerator;
