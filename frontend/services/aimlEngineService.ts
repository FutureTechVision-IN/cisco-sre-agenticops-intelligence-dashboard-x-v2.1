/**
 * AIML Engine Service for Frontend
 * 
 * Provides access to advanced AI/ML features:
 * - Executive summary generation (emoji-free, formal business communication)
 * - Anomaly detection with risk scoring
 * - Field notice comparison and prioritization
 * - Temporal data processing
 * - Customer-specific filtering
 * 
 * @module AimlEngineService
 * @version 2.0.0
 */

// ==========================================
// TYPE DEFINITIONS
// ==========================================

/** Severity level classification */
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

/** Executive summary section */
export interface ExecutiveSection {
  heading: string;
  content: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  dataPoints?: DataPoint[];
}

/** Data point for metrics */
export interface DataPoint {
  metric: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  context?: string;
}

/** Executive report output */
export interface ExecutiveReport {
  title: string;
  subtitle?: string;
  markdown: string;
  html?: string;
  sections: ExecutiveSection[];
  confidenceLevel: number;
  metadata: {
    generatedAt: string;
    dataRange: string;
    customersAnalyzed: number;
    fieldNoticesAnalyzed: number;
    model: string;
  };
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

/** Temporal filter options */
export interface TemporalFilter {
  month?: string;  // e.g., "August 2025"
  startDate?: string;
  endDate?: string;
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

/** Anomaly summary */
export interface AnomalySummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  topAccount: string;
  topRiskScore: string;
}

/** Field notice comparison summary */
export interface ComparisonSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  topPriority: string;
  topScore: number;
}

// ==========================================
// AIML ENGINE SERVICE CLASS
// ==========================================

class AimlEngineService {
  private baseUrl = '/api/chatbot/aiml';

  /**
   * Generate an executive summary report
   * Returns emoji-free, formal business communication
   */
  async generateExecutiveSummary(options?: {
    customerFilter?: CustomerFilter;
    temporalFilter?: TemporalFilter;
    format?: 'executive' | 'technical' | 'summary';
  }): Promise<{ success: boolean; report?: ExecutiveReport; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/executive-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerFilter: options?.customerFilter,
          temporalFilter: options?.temporalFilter,
          format: options?.format || 'executive'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to generate executive summary'
        };
      }

      return {
        success: true,
        report: data.report
      };
    } catch (error) {
      console.error('[AIML Service] Executive summary error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Detect anomalies in customer vulnerability patterns
   * Returns risk scores and severity classifications
   */
  async detectAnomalies(options?: {
    customerFilter?: CustomerFilter;
    temporalFilter?: TemporalFilter;
  }): Promise<{
    success: boolean;
    summary?: AnomalySummary;
    anomalies?: AnomalyResult[];
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/anomalies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerFilter: options?.customerFilter,
          temporalFilter: options?.temporalFilter
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to detect anomalies'
        };
      }

      return {
        success: true,
        summary: data.summary,
        anomalies: data.anomalies
      };
    } catch (error) {
      console.error('[AIML Service] Anomaly detection error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Compare and prioritize field notices
   * Returns severity classifications and priority rankings
   */
  async compareFieldNotices(options?: {
    fieldNoticeIds?: string[];
    customerFilter?: CustomerFilter;
    temporalFilter?: TemporalFilter;
  }): Promise<{
    success: boolean;
    summary?: ComparisonSummary;
    comparisons?: FieldNoticeComparison[];
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/field-notice-comparison`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldNoticeIds: options?.fieldNoticeIds,
          customerFilter: options?.customerFilter,
          temporalFilter: options?.temporalFilter
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to compare field notices'
        };
      }

      return {
        success: true,
        summary: data.summary,
        comparisons: data.comparisons
      };
    } catch (error) {
      console.error('[AIML Service] Field notice comparison error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Generate a comprehensive AIML response
   * Combines anomaly detection, comparisons, and insights
   */
  async generateAIMLResponse(
    query: string,
    options?: {
      format?: 'executive' | 'technical' | 'summary';
      customerFilter?: CustomerFilter;
      temporalFilter?: TemporalFilter;
      includeAnomalies?: boolean;
      includeComparisons?: boolean;
    }
  ): Promise<{
    success: boolean;
    response?: AIMLResponse;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          format: options?.format || 'executive',
          customerFilter: options?.customerFilter,
          temporalFilter: options?.temporalFilter,
          includeAnomalies: options?.includeAnomalies !== false,
          includeComparisons: options?.includeComparisons !== false
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to generate AIML response'
        };
      }

      return {
        success: true,
        response: {
          content: data.response.content,
          format: data.response.format,
          sections: data.response.sections,
          anomalies: data.anomalies,
          comparisons: data.comparisons,
          insights: data.response.insights,
          recommendations: data.response.recommendations,
          confidence: data.response.confidence,
          metadata: data.metadata
        }
      };
    } catch (error) {
      console.error('[AIML Service] Generate AIML error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Get data for the latest available month
   */
  async getLatestMonthData(): Promise<{
    success: boolean;
    month?: string;
    recordCount?: number;
    summary?: {
      vulnerable: number;
      potentiallyVulnerable: number;
      secure: number;
    };
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/latest-month`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to get latest month data'
        };
      }

      return {
        success: true,
        month: data.month,
        recordCount: data.recordCount,
        summary: data.summary
      };
    } catch (error) {
      console.error('[AIML Service] Latest month error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Format anomaly results as a markdown table
   */
  formatAnomaliesAsMarkdown(anomalies: AnomalyResult[]): string {
    if (!anomalies || anomalies.length === 0) {
      return 'No anomalies detected in the current dataset.';
    }

    let markdown = '### Detected Anomalies\n\n';
    markdown += '| Customer | Risk Score | Severity | Vulnerabilities | Deviation | Recommendation |\n';
    markdown += '|----------|------------|----------|-----------------|-----------|----------------|\n';

    for (const anomaly of anomalies.slice(0, 10)) {
      markdown += `| ${anomaly.customerName} | ${anomaly.riskScore.percentage} | ${anomaly.severityLevel} | ${anomaly.vulnerabilityCount} | ${anomaly.deviation.toFixed(1)}x baseline | ${anomaly.recommendation} |\n`;
    }

    if (anomalies.length > 10) {
      markdown += `\n*Showing top 10 of ${anomalies.length} anomalies*\n`;
    }

    return markdown;
  }

  /**
   * Format field notice comparisons as a markdown table
   */
  formatComparisonsAsMarkdown(comparisons: FieldNoticeComparison[]): string {
    if (!comparisons || comparisons.length === 0) {
      return 'No field notice comparisons available.';
    }

    let markdown = '### Field Notice Comparison Report\n\n';
    markdown += '| Priority | Field Notice | Type | Devices | Customers | Severity | Score |\n';
    markdown += '|----------|--------------|------|---------|-----------|----------|-------|\n';

    for (const comparison of comparisons.slice(0, 10)) {
      markdown += `| ${comparison.priority} | ${comparison.fieldNoticeId} | ${comparison.fnType} | ${comparison.totalDevices} | ${comparison.uniqueCustomers} | ${comparison.severityClassification} | ${comparison.weightedScore.toFixed(1)} |\n`;
    }

    if (comparisons.length > 10) {
      markdown += `\n*Showing top 10 of ${comparisons.length} field notices*\n`;
    }

    return markdown;
  }

  /**
   * Format executive summary sections as markdown
   */
  formatSectionsAsMarkdown(sections: ExecutiveSection[]): string {
    if (!sections || sections.length === 0) {
      return '';
    }

    let markdown = '';

    for (const section of sections) {
      markdown += `### ${section.heading}\n\n`;
      markdown += `${section.content}\n\n`;

      if (section.dataPoints && section.dataPoints.length > 0) {
        for (const point of section.dataPoints) {
          const trendIcon = point.trend === 'up' ? 'UP' : point.trend === 'down' ? 'DOWN' : 'STABLE';
          markdown += `- **${point.metric}**: ${point.value}${point.trend ? ` (${trendIcon})` : ''}\n`;
        }
        markdown += '\n';
      }
    }

    return markdown;
  }
}

// ==========================================
// SINGLETON EXPORT
// ==========================================

export const aimlEngineService = new AimlEngineService();

// Export the class for testing
export { AimlEngineService };
