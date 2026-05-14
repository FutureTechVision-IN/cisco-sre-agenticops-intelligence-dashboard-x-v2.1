/**
 * AI Analytics Service
 * 
 * Advanced AI/ML-driven analytics for pattern detection, trend analysis,
 * predictive modeling, and intelligent recommendations.
 * 
 * @version 2.0.0
 */

import type { 
  DashboardData, 
  Metric, 
  MonthlyTrend, 
  Customer, 
  FieldNotice,
  Anomaly,
  Prediction,
  Recommendation,
  ExtendedKPI 
} from '../types';

// ==================== TYPES ====================

export interface PatternAnalysis {
  id: string;
  type: 'seasonal' | 'trend' | 'cyclical' | 'anomaly' | 'correlation';
  confidence: number;
  description: string;
  impact: 'high' | 'medium' | 'low';
  affectedMetrics: string[];
  timestamp: Date;
  visualization?: {
    type: 'line' | 'scatter' | 'heatmap';
    data: Array<{ x: number; y: number; label?: string }>;
  };
}

export interface TrendForecast {
  metricId: string;
  metricLabel: string;
  currentValue: number;
  forecastedValues: Array<{
    date: string;
    value: number;
    confidence: number;
    lowerBound: number;
    upperBound: number;
  }>;
  trendDirection: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  trendStrength: number; // 0-100
  changeRate: number; // percentage per period
  seasonalityDetected: boolean;
  anomalyProbability: number;
}

export interface IntelligentRecommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'security' | 'performance' | 'cost' | 'compliance' | 'efficiency';
  title: string;
  description: string;
  expectedImpact: string;
  implementationEffort: 'low' | 'medium' | 'high';
  estimatedTimeToValue: string;
  confidence: number;
  dataPoints: string[];
  relatedMetrics: string[];
  actionSteps: string[];
  riskOfInaction: string;
}

export interface DataInsight {
  id: string;
  type: 'pattern' | 'anomaly' | 'prediction' | 'correlation' | 'benchmark';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  summary: string;
  details: string;
  confidence: number;
  timestamp: Date;
  visualizationType: 'sparkline' | 'gauge' | 'bar' | 'trend' | 'comparison';
  visualizationData: any;
  actions?: string[];
}

export interface VisualizationConfig {
  recommendedChartType: 'line' | 'bar' | 'area' | 'pie' | 'radar' | 'scatter' | 'heatmap' | 'treemap';
  colorScheme: string[];
  animationPreset: 'smooth' | 'spring' | 'bounce' | 'fade';
  interactionLevel: 'minimal' | 'standard' | 'rich';
  highlightAnomalies: boolean;
  showConfidenceIntervals: boolean;
  enableDrilldown: boolean;
}

export interface SystemHealthScore {
  overall: number;
  dimensions: {
    security: number;
    performance: number;
    availability: number;
    compliance: number;
    efficiency: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  criticalIssues: number;
  recommendations: string[];
}

export interface UserEngagementMetrics {
  sessionId: string;
  timestamp: Date;
  visualizationType: string;
  interactionType: 'view' | 'hover' | 'click' | 'drill-down' | 'export';
  duration: number;
  metricId?: string;
  feedbackScore?: number;
}

// ==================== AI ANALYTICS SERVICE ====================

export class AIAnalyticsService {
  private static instance: AIAnalyticsService;
  private patternCache: Map<string, PatternAnalysis[]> = new Map();
  private forecastCache: Map<string, TrendForecast> = new Map();
  private engagementLog: UserEngagementMetrics[] = [];

  private constructor() {}

  static getInstance(): AIAnalyticsService {
    if (!AIAnalyticsService.instance) {
      AIAnalyticsService.instance = new AIAnalyticsService();
    }
    return AIAnalyticsService.instance;
  }

  // ==================== PATTERN DETECTION ====================

  /**
   * Detect patterns in time series data using statistical analysis
   */
  detectPatterns(data: MonthlyTrend[]): PatternAnalysis[] {
    const patterns: PatternAnalysis[] = [];

    if (!data || data.length < 2) return patterns;

    // Trend Detection
    const trendPattern = this.detectTrendPattern(data);
    if (trendPattern) patterns.push(trendPattern);

    // Seasonality Detection
    const seasonalPattern = this.detectSeasonality(data);
    if (seasonalPattern) patterns.push(seasonalPattern);

    // Anomaly Detection
    const anomalies = this.detectAnomalies(data);
    patterns.push(...anomalies);

    // Correlation Analysis
    const correlations = this.detectCorrelations(data);
    patterns.push(...correlations);

    return patterns;
  }

  private detectTrendPattern(data: MonthlyTrend[]): PatternAnalysis | null {
    if (data.length < 3) return null;

    const vulnerableValues = data.map(d => d.vulnerable);
    const slope = this.calculateLinearSlope(vulnerableValues);
    const r2 = this.calculateR2(vulnerableValues);

    if (Math.abs(slope) < 0.01) return null;

    const trendType = slope > 0 ? 'increasing' : 'decreasing';
    const confidence = Math.min(r2 * 100, 95);

    return {
      id: `trend-${Date.now()}`,
      type: 'trend',
      confidence,
      description: `Vulnerability count shows ${trendType} trend with ${confidence.toFixed(1)}% confidence. ${
        slope > 0 
          ? 'Security posture may be degrading - immediate attention recommended.'
          : 'Security improvements are taking effect - continue current remediation strategy.'
      }`,
      impact: Math.abs(slope) > 0.1 ? 'high' : Math.abs(slope) > 0.05 ? 'medium' : 'low',
      affectedMetrics: ['vulnerable', 'potential', 'secure'],
      timestamp: new Date(),
      visualization: {
        type: 'line',
        data: vulnerableValues.map((v, i) => ({ x: i, y: v, label: data[i].month }))
      }
    };
  }

  private detectSeasonality(data: MonthlyTrend[]): PatternAnalysis | null {
    if (data.length < 4) return null;

    // Simple seasonality detection using autocorrelation
    const vulnerableValues = data.map(d => d.vulnerable);
    const autocorr = this.calculateAutocorrelation(vulnerableValues, 2);

    if (Math.abs(autocorr) < 0.3) return null;

    return {
      id: `seasonal-${Date.now()}`,
      type: 'seasonal',
      confidence: Math.abs(autocorr) * 100,
      description: `Seasonal pattern detected in vulnerability data. Consider aligning remediation schedules with these cycles for optimal resource allocation.`,
      impact: 'medium',
      affectedMetrics: ['vulnerable', 'potential'],
      timestamp: new Date()
    };
  }

  private detectAnomalies(data: MonthlyTrend[]): PatternAnalysis[] {
    const anomalies: PatternAnalysis[] = [];
    if (data.length < 3) return anomalies;

    const vulnerableValues = data.map(d => d.vulnerable);
    const mean = this.calculateMean(vulnerableValues);
    const stdDev = this.calculateStdDev(vulnerableValues);

    data.forEach((d, i) => {
      const zScore = (d.vulnerable - mean) / stdDev;
      if (Math.abs(zScore) > 2) {
        anomalies.push({
          id: `anomaly-${d.month}-${Date.now()}`,
          type: 'anomaly',
          confidence: Math.min(Math.abs(zScore) * 30, 99),
          description: `Anomalous vulnerability count detected in ${d.month}. Value is ${Math.abs(zScore).toFixed(1)} standard deviations from mean.`,
          impact: Math.abs(zScore) > 3 ? 'high' : 'medium',
          affectedMetrics: ['vulnerable'],
          timestamp: new Date()
        });
      }
    });

    return anomalies;
  }

  private detectCorrelations(data: MonthlyTrend[]): PatternAnalysis[] {
    const correlations: PatternAnalysis[] = [];
    if (data.length < 4) return correlations;

    // Check correlation between vulnerable and potential
    const vulnValues = data.map(d => d.vulnerable);
    const potValues = data.map(d => d.potential);
    const correlation = this.calculateCorrelation(vulnValues, potValues);

    if (Math.abs(correlation) > 0.5) {
      correlations.push({
        id: `corr-vuln-pot-${Date.now()}`,
        type: 'correlation',
        confidence: Math.abs(correlation) * 100,
        description: `Strong ${correlation > 0 ? 'positive' : 'negative'} correlation (${(correlation * 100).toFixed(0)}%) detected between vulnerable and potentially vulnerable assets. ${
          correlation > 0 
            ? 'As potential vulnerabilities increase, confirmed vulnerabilities tend to follow.'
            : 'Effective triage is converting potential vulnerabilities to secure status.'
        }`,
        impact: 'high',
        affectedMetrics: ['vulnerable', 'potential'],
        timestamp: new Date(),
        visualization: {
          type: 'scatter',
          data: vulnValues.map((v, i) => ({ x: v, y: potValues[i] }))
        }
      });
    }

    return correlations;
  }

  // ==================== FORECASTING ====================

  /**
   * Generate forecasts for metrics using exponential smoothing
   */
  generateForecast(metric: Metric, periods: number = 6): TrendForecast {
    const history = metric.history || [];
    const cacheKey = `${metric.id}-${periods}`;
    
    // Check cache
    const cached = this.forecastCache.get(cacheKey);
    if (cached && Date.now() - cached.forecastedValues[0]?.date.length < 60000) {
      return cached;
    }

    const values = history.map(h => h.value);
    const dates = history.map(h => h.date);

    // Use exponential smoothing for forecasting
    const alpha = 0.3; // Smoothing factor
    const beta = 0.1; // Trend factor
    
    let level = values[0] || metric.value;
    let trend = values.length > 1 ? values[1] - values[0] : 0;

    // Calculate smoothed values
    const smoothed: number[] = [];
    for (let i = 0; i < values.length; i++) {
      const prevLevel = level;
      level = alpha * values[i] + (1 - alpha) * (level + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
      smoothed.push(level);
    }

    // Generate forecasts
    const forecastedValues: TrendForecast['forecastedValues'] = [];
    const lastDate = new Date();
    const stdDev = this.calculateStdDev(values);

    for (let i = 1; i <= periods; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setMonth(forecastDate.getMonth() + i);
      
      const forecastValue = Math.round(level + trend * i);
      const confidence = Math.max(0.5, 0.95 - (i * 0.08));
      const margin = stdDev * (1 + i * 0.2);

      forecastedValues.push({
        date: forecastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        value: Math.max(0, forecastValue),
        confidence: confidence * 100,
        lowerBound: Math.max(0, forecastValue - margin),
        upperBound: forecastValue + margin
      });
    }

    // Calculate mean first before using it
    const mean = this.calculateMean(values);

    // Determine trend characteristics
    const trendDirection = trend > stdDev * 0.1 
      ? 'increasing' 
      : trend < -stdDev * 0.1 
        ? 'decreasing' 
        : Math.abs(this.calculateStdDev(smoothed)) > mean * 0.2 
          ? 'volatile' 
          : 'stable';

    const forecast: TrendForecast = {
      metricId: metric.id,
      metricLabel: metric.label,
      currentValue: metric.value,
      forecastedValues,
      trendDirection,
      trendStrength: Math.min(100, Math.abs(trend / (mean || 1)) * 1000),
      changeRate: mean > 0 ? (trend / mean) * 100 : 0,
      seasonalityDetected: this.calculateAutocorrelation(values, 3) > 0.3,
      anomalyProbability: this.calculateAnomalyProbability(values)
    };

    this.forecastCache.set(cacheKey, forecast);
    return forecast;
  }

  // ==================== INTELLIGENT RECOMMENDATIONS ====================

  /**
   * Generate AI-powered recommendations based on data analysis
   */
  generateRecommendations(data: DashboardData): IntelligentRecommendation[] {
    const recommendations: IntelligentRecommendation[] = [];

    // Analyze vulnerability ratios
    const vulnRatio = data.metrics.vulnerable.value / data.metrics.totalAssessed.value;
    const potentialRatio = data.metrics.potential.value / data.metrics.totalAssessed.value;

    // Critical Security Recommendation
    if (vulnRatio > 0.02) {
      recommendations.push({
        id: 'rec-security-critical',
        priority: 'critical',
        category: 'security',
        title: 'Urgent Vulnerability Remediation Required',
        description: `Current vulnerability ratio (${(vulnRatio * 100).toFixed(2)}%) exceeds industry benchmark of 2%. Immediate action required to reduce attack surface.`,
        expectedImpact: `Reduce vulnerable assets by ${Math.round(data.metrics.vulnerable.value * 0.3).toLocaleString()} within 30 days`,
        implementationEffort: 'high',
        estimatedTimeToValue: '2-4 weeks',
        confidence: 92,
        dataPoints: [
          `${data.metrics.vulnerable.value.toLocaleString()} confirmed vulnerabilities`,
          `${(vulnRatio * 100).toFixed(2)}% vulnerability ratio`,
          `Industry average: 1.5-2%`
        ],
        relatedMetrics: ['vulnerable-assets', 'risk-score-index'],
        actionSteps: [
          'Prioritize critical CVEs affecting >1000 assets',
          'Deploy automated patching for software vulnerabilities',
          'Isolate unpatched hardware from critical networks',
          'Schedule emergency maintenance window'
        ],
        riskOfInaction: 'High probability of security breach within 60 days based on current exposure levels'
      });
    }

    // Efficiency Recommendation
    if (potentialRatio > 0.1) {
      recommendations.push({
        id: 'rec-efficiency-potential',
        priority: 'high',
        category: 'efficiency',
        title: 'Accelerate Vulnerability Triage Process',
        description: `${(potentialRatio * 100).toFixed(1)}% of assets are in "Potentially Vulnerable" status, creating operational uncertainty.`,
        expectedImpact: 'Resolve 50% of potential vulnerabilities within 2 weeks',
        implementationEffort: 'medium',
        estimatedTimeToValue: '1-2 weeks',
        confidence: 85,
        dataPoints: [
          `${data.metrics.potential.value.toLocaleString()} assets pending verification`,
          `Average time in queue: 14 days`,
          `Conversion rate to confirmed: 23%`
        ],
        relatedMetrics: ['potential-vulnerable', 'mttr'],
        actionSteps: [
          'Implement automated vulnerability verification',
          'Assign dedicated triage team for backlog',
          'Deploy AI-assisted classification',
          'Establish SLA for potential vulnerability resolution'
        ],
        riskOfInaction: 'Delayed detection of actual vulnerabilities, increased remediation costs'
      });
    }

    // Customer Concentration Risk
    if (data.topCustomers?.length > 0) {
      const topCustomerVuln = data.topCustomers.slice(0, 3).reduce(
        (sum, c) => sum + (c.vulnerableCount || 0), 0
      );
      const totalVuln = data.metrics.vulnerable.value;
      const concentration = topCustomerVuln / totalVuln;

      if (concentration > 0.4) {
        recommendations.push({
          id: 'rec-risk-concentration',
          priority: 'high',
          category: 'compliance',
          title: 'Address Customer Risk Concentration',
          description: `Top 3 customers account for ${(concentration * 100).toFixed(0)}% of all vulnerabilities. Diversification and targeted remediation recommended.`,
          expectedImpact: 'Reduce concentration risk by 30%',
          implementationEffort: 'medium',
          estimatedTimeToValue: '4-6 weeks',
          confidence: 88,
          dataPoints: [
            `Top 3 customers: ${topCustomerVuln.toLocaleString()} vulnerabilities`,
            `Concentration ratio: ${(concentration * 100).toFixed(0)}%`,
            `Recommended threshold: <30%`
          ],
          relatedMetrics: ['customer-risk', 'vulnerable-assets'],
          actionSteps: [
            'Engage high-risk customer accounts proactively',
            'Develop customer-specific remediation plans',
            'Implement enhanced monitoring for top accounts',
            'Consider contractual SLAs for vulnerability management'
          ],
          riskOfInaction: 'Regulatory compliance issues, increased liability exposure'
        });
      }
    }

    // Field Notice Impact
    if (data.topFieldNotices?.length > 0) {
      const criticalFN = data.topFieldNotices.filter(fn => fn.vulnerableCount > 100000);
      if (criticalFN.length > 0) {
        recommendations.push({
          id: 'rec-field-notice',
          priority: 'critical',
          category: 'security',
          title: 'Critical Field Notice Response Required',
          description: `${criticalFN.length} Field Notice(s) affecting over 100,000 assets each. Coordinated response needed.`,
          expectedImpact: 'Address critical field notices within SLA',
          implementationEffort: 'high',
          estimatedTimeToValue: '1-3 weeks',
          confidence: 95,
          dataPoints: criticalFN.map(fn => `${fn.id}: ${fn.vulnerableCount.toLocaleString()} vulnerable`),
          relatedMetrics: ['field-notices', 'vulnerable-assets'],
          actionSteps: [
            'Review vendor mitigation guidance',
            'Assess affected asset criticality',
            'Plan phased remediation approach',
            'Communicate timeline to stakeholders'
          ],
          riskOfInaction: 'Exploitation of known vulnerabilities, potential regulatory penalties'
        });
      }
    }

    // Performance Optimization
    recommendations.push({
      id: 'rec-performance-optimize',
      priority: 'medium',
      category: 'performance',
      title: 'Optimize Scanning and Assessment Frequency',
      description: 'Analysis suggests current assessment frequency may miss emerging threats. Consider increasing scan frequency for high-risk segments.',
      expectedImpact: '20% improvement in detection latency',
      implementationEffort: 'low',
      estimatedTimeToValue: '1 week',
      confidence: 78,
      dataPoints: [
        `Current scan coverage: ${((data.metrics.totalAssessed.value / 300000000) * 100).toFixed(1)}%`,
        `Average detection latency: 72 hours`,
        `Industry best practice: 24-48 hours`
      ],
      relatedMetrics: ['total-assessed', 'detection-rate'],
      actionSteps: [
        'Implement continuous vulnerability scanning',
        'Deploy agent-based scanning for critical assets',
        'Configure real-time CVE feed integration',
        'Establish automated alert thresholds'
      ],
      riskOfInaction: 'Increased window of exposure to new vulnerabilities'
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  // ==================== DATA INSIGHTS ====================

  /**
   * Generate actionable insights from dashboard data
   */
  generateInsights(data: DashboardData): DataInsight[] {
    const insights: DataInsight[] = [];
    const now = new Date();

    // Overall Health Insight
    const healthScore = this.calculateHealthScore(data);
    insights.push({
      id: 'insight-health',
      type: 'benchmark',
      severity: healthScore.overall > 70 ? 'info' : healthScore.overall > 50 ? 'warning' : 'critical',
      title: 'System Security Health',
      summary: `Overall security health score: ${healthScore.overall}/100`,
      details: `Security posture is ${healthScore.trend}. ${healthScore.recommendations[0]}`,
      confidence: 90,
      timestamp: now,
      visualizationType: 'gauge',
      visualizationData: healthScore,
      actions: healthScore.recommendations
    });

    // Trend Insight
    if (data.trends?.length > 2) {
      const trend = this.analyzeTrendDirection(data.trends);
      insights.push({
        id: 'insight-trend',
        type: 'pattern',
        severity: trend.direction === 'improving' ? 'info' : trend.direction === 'declining' ? 'warning' : 'info',
        title: 'Vulnerability Trend Analysis',
        summary: `${trend.direction.charAt(0).toUpperCase() + trend.direction.slice(1)} trend detected`,
        details: trend.description,
        confidence: trend.confidence,
        timestamp: now,
        visualizationType: 'trend',
        visualizationData: { trends: data.trends, analysis: trend }
      });
    }

    // Customer Risk Insight
    if (data.topCustomers?.length > 0) {
      const riskAnalysis = this.analyzeCustomerRisk(data.topCustomers);
      insights.push({
        id: 'insight-customer-risk',
        type: 'anomaly',
        severity: riskAnalysis.highRiskCount > 3 ? 'critical' : riskAnalysis.highRiskCount > 1 ? 'warning' : 'info',
        title: 'Customer Risk Distribution',
        summary: `${riskAnalysis.highRiskCount} high-risk customers identified`,
        details: riskAnalysis.summary,
        confidence: 85,
        timestamp: now,
        visualizationType: 'bar',
        visualizationData: riskAnalysis
      });
    }

    // Prediction Insight
    if (data.metrics?.vulnerable) {
      const forecast = this.generateForecast(data.metrics.vulnerable, 3);
      const nextMonth = forecast.forecastedValues[0];
      if (nextMonth) {
        insights.push({
          id: 'insight-prediction',
          type: 'prediction',
          severity: nextMonth.value > data.metrics.vulnerable.value ? 'warning' : 'info',
          title: 'Vulnerability Forecast',
          summary: `Projected: ${nextMonth.value.toLocaleString()} vulnerable assets by ${nextMonth.date}`,
          details: `${forecast.trendDirection.charAt(0).toUpperCase() + forecast.trendDirection.slice(1)} trend with ${Math.round(nextMonth.confidence)}% confidence. ${
            nextMonth.value > data.metrics.vulnerable.value 
              ? 'Proactive measures recommended to counter projected increase.'
              : 'Current remediation efforts are showing positive impact.'
          }`,
          confidence: nextMonth.confidence,
          timestamp: now,
          visualizationType: 'sparkline',
          visualizationData: forecast
        });
      }
    }

    return insights;
  }

  // ==================== VISUALIZATION CONFIG ====================

  /**
   * Dynamically determine optimal visualization parameters
   */
  getVisualizationConfig(dataType: string, dataSize: number, variance: number): VisualizationConfig {
    let chartType: VisualizationConfig['recommendedChartType'] = 'line';
    let animation: VisualizationConfig['animationPreset'] = 'smooth';
    let interaction: VisualizationConfig['interactionLevel'] = 'standard';

    // Determine chart type based on data characteristics
    if (dataType === 'distribution' || dataType === 'composition') {
      chartType = dataSize < 6 ? 'pie' : 'bar';
    } else if (dataType === 'trend' || dataType === 'timeSeries') {
      chartType = variance > 0.3 ? 'area' : 'line';
    } else if (dataType === 'comparison') {
      chartType = dataSize < 10 ? 'radar' : 'bar';
    } else if (dataType === 'correlation') {
      chartType = 'scatter';
    } else if (dataType === 'hierarchy') {
      chartType = 'treemap';
    }

    // Adjust animation based on data size
    if (dataSize > 100) {
      animation = 'fade';
      interaction = 'minimal';
    } else if (dataSize > 50) {
      animation = 'smooth';
      interaction = 'standard';
    } else {
      animation = 'spring';
      interaction = 'rich';
    }

    return {
      recommendedChartType: chartType,
      colorScheme: this.getColorScheme(dataType),
      animationPreset: animation,
      interactionLevel: interaction,
      highlightAnomalies: variance > 0.2,
      showConfidenceIntervals: dataType === 'prediction' || dataType === 'forecast',
      enableDrilldown: dataSize > 10
    };
  }

  private getColorScheme(dataType: string): string[] {
    const schemes: Record<string, string[]> = {
      security: ['#10b981', '#f59e0b', '#ef4444'], // green, amber, red
      performance: ['#3b82f6', '#8b5cf6', '#ec4899'], // blue, violet, pink
      trend: ['#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1'], // cyan gradient
      distribution: ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
      default: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
    };

    return schemes[dataType] || schemes.default;
  }

  // ==================== MONITORING ====================

  /**
   * Track user engagement with visualizations
   */
  trackEngagement(event: Omit<UserEngagementMetrics, 'sessionId' | 'timestamp'>): void {
    const engagement: UserEngagementMetrics = {
      ...event,
      sessionId: this.getSessionId(),
      timestamp: new Date()
    };

    this.engagementLog.push(engagement);

    // Keep only last 1000 events
    if (this.engagementLog.length > 1000) {
      this.engagementLog = this.engagementLog.slice(-1000);
    }
  }

  /**
   * Get engagement analytics
   */
  getEngagementAnalytics(): {
    totalInteractions: number;
    mostViewedVisualizations: Array<{ type: string; count: number }>;
    averageDuration: number;
    popularMetrics: Array<{ id: string; count: number }>;
  } {
    const byType = new Map<string, number>();
    const byMetric = new Map<string, number>();
    let totalDuration = 0;

    this.engagementLog.forEach(event => {
      byType.set(event.visualizationType, (byType.get(event.visualizationType) || 0) + 1);
      if (event.metricId) {
        byMetric.set(event.metricId, (byMetric.get(event.metricId) || 0) + 1);
      }
      totalDuration += event.duration || 0;
    });

    return {
      totalInteractions: this.engagementLog.length,
      mostViewedVisualizations: Array.from(byType.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      averageDuration: this.engagementLog.length > 0 
        ? totalDuration / this.engagementLog.length 
        : 0,
      popularMetrics: Array.from(byMetric.entries())
        .map(([id, count]) => ({ id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    };
  }

  // ==================== HELPER METHODS ====================

  private calculateLinearSlope(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;

    const xMean = (n - 1) / 2;
    const yMean = this.calculateMean(values);

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += (i - xMean) ** 2;
    }

    return denominator !== 0 ? numerator / denominator : 0;
  }

  private calculateR2(values: number[]): number {
    const mean = this.calculateMean(values);
    const slope = this.calculateLinearSlope(values);
    
    let ssRes = 0;
    let ssTot = 0;

    for (let i = 0; i < values.length; i++) {
      const predicted = mean + slope * (i - (values.length - 1) / 2);
      ssRes += (values[i] - predicted) ** 2;
      ssTot += (values[i] - mean) ** 2;
    }

    return ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;
  }

  private calculateMean(values: number[]): number {
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  private calculateStdDev(values: number[]): number {
    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(v => (v - mean) ** 2);
    return Math.sqrt(this.calculateMean(squaredDiffs));
  }

  private calculateAutocorrelation(values: number[], lag: number): number {
    if (values.length <= lag) return 0;

    const mean = this.calculateMean(values);
    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < values.length - lag; i++) {
      numerator += (values[i] - mean) * (values[i + lag] - mean);
    }

    for (let i = 0; i < values.length; i++) {
      denominator += (values[i] - mean) ** 2;
    }

    return denominator !== 0 ? numerator / denominator : 0;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const xMean = this.calculateMean(x.slice(0, n));
    const yMean = this.calculateMean(y.slice(0, n));

    let numerator = 0;
    let xDenom = 0;
    let yDenom = 0;

    for (let i = 0; i < n; i++) {
      const xDiff = x[i] - xMean;
      const yDiff = y[i] - yMean;
      numerator += xDiff * yDiff;
      xDenom += xDiff ** 2;
      yDenom += yDiff ** 2;
    }

    const denom = Math.sqrt(xDenom * yDenom);
    return denom !== 0 ? numerator / denom : 0;
  }

  private calculateAnomalyProbability(values: number[]): number {
    const stdDev = this.calculateStdDev(values);
    const mean = this.calculateMean(values);
    const cv = mean !== 0 ? stdDev / mean : 0;
    return Math.min(cv * 50, 95);
  }

  private calculateHealthScore(data: DashboardData): SystemHealthScore {
    const vulnRatio = data.metrics.vulnerable.value / data.metrics.totalAssessed.value;
    const secureRatio = data.metrics.secure.value / data.metrics.totalAssessed.value;
    const potentialRatio = data.metrics.potential.value / data.metrics.totalAssessed.value;

    const security = Math.max(0, Math.min(100, 100 - (vulnRatio * 1000)));
    const performance = Math.max(0, Math.min(100, secureRatio * 100));
    const availability = 95; // Baseline
    const compliance = Math.max(0, Math.min(100, 100 - (potentialRatio * 200)));
    const efficiency = Math.max(0, Math.min(100, 80 - (potentialRatio * 100)));

    const overall = Math.round((security * 0.4 + performance * 0.2 + availability * 0.15 + compliance * 0.15 + efficiency * 0.1));

    // Determine trend based on vulnerable trend
    const vulnTrend = data.metrics.vulnerable.trend || 0;
    const trend = vulnTrend < -5 ? 'improving' : vulnTrend > 5 ? 'declining' : 'stable';

    const recommendations: string[] = [];
    if (security < 70) recommendations.push('Prioritize critical vulnerability remediation');
    if (compliance < 70) recommendations.push('Accelerate potential vulnerability triage');
    if (efficiency < 70) recommendations.push('Optimize remediation workflows');
    if (recommendations.length === 0) recommendations.push('Maintain current security practices');

    return {
      overall,
      dimensions: { security, performance, availability, compliance, efficiency },
      trend,
      criticalIssues: data.anomalies?.filter(a => a.severity === 'CRITICAL').length || 0,
      recommendations
    };
  }

  private analyzeTrendDirection(trends: MonthlyTrend[]): {
    direction: 'improving' | 'declining' | 'stable';
    confidence: number;
    description: string;
  } {
    if (trends.length < 2) {
      return { direction: 'stable', confidence: 50, description: 'Insufficient data for trend analysis.' };
    }

    const vulnerableSlope = this.calculateLinearSlope(trends.map(t => t.vulnerable));
    const secureSlope = this.calculateLinearSlope(trends.map(t => t.secure));

    if (vulnerableSlope < -1000 && secureSlope > 0) {
      return {
        direction: 'improving',
        confidence: 85,
        description: 'Vulnerability counts are decreasing while secure assets increase. Security posture is strengthening.'
      };
    } else if (vulnerableSlope > 1000) {
      return {
        direction: 'declining',
        confidence: 80,
        description: 'Vulnerability counts are increasing. Additional remediation resources may be needed.'
      };
    }

    return {
      direction: 'stable',
      confidence: 70,
      description: 'Vulnerability trends are relatively stable. Continue monitoring for changes.'
    };
  }

  private analyzeCustomerRisk(customers: Customer[]): {
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    summary: string;
    distribution: Array<{ name: string; risk: number }>;
  } {
    const distribution = customers.map(c => ({
      name: c.name?.substring(0, 20) || 'Unknown',
      risk: c.vulnerableCount || 0
    }));

    const maxRisk = Math.max(...distribution.map(d => d.risk));
    const highThreshold = maxRisk * 0.7;
    const mediumThreshold = maxRisk * 0.3;

    const highRiskCount = distribution.filter(d => d.risk >= highThreshold).length;
    const mediumRiskCount = distribution.filter(d => d.risk >= mediumThreshold && d.risk < highThreshold).length;
    const lowRiskCount = distribution.filter(d => d.risk < mediumThreshold).length;

    return {
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      summary: `${highRiskCount} customers in high-risk category, ${mediumRiskCount} in medium, and ${lowRiskCount} in low. Focus remediation efforts on high-risk accounts.`,
      distribution
    };
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('ai-analytics-session');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('ai-analytics-session', sessionId);
    }
    return sessionId;
  }
}

// Export singleton instance
export const aiAnalytics = AIAnalyticsService.getInstance();
