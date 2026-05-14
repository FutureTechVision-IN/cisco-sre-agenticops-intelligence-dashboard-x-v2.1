

export interface Metric {
  id: string;
  label: string;
  value: number;
  subtext: string;
  percentage?: number;
  trend?: number; // growth percentage
  color: 'blue' | 'green' | 'amber' | 'rose';
  target?: string;
  history?: { date: string; value: number }[]; // Historical data for trend charts
  deepDive?: MetricDeepDive;
}

export interface MetricDeepDive {
  definition: string;
  methodology: string;
  dataSources: string;
  inclusions: string[];
  exclusions: string[];
  businessContext: string;
}

export interface GrowthMetric {
  label: string;
  value: number | string;
  percentageChange: number;
  absoluteChange?: string;
  subtext: string;
  isPositiveGood: boolean;
  history?: { date: string; value: number }[];
  aiAnalysis?: string;
}

export interface AdvancedMetric {
  label: string;
  value: string;
  subtext: string;
  trend?: "up" | "down" | "neutral";
  color: "purple" | "cyan" | "indigo";
  history?: { date: string; value: number }[];
  aiAnalysis?: string;
}

export interface Anomaly {
  id: string;
  entity: string;
  riskScore: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  message: string;
  details: string; // e.g., "8 vulnerabilities found..."
}

export interface Prediction {
  id: string;
  period: string;
  trend: "RISING" | "FALLING" | "STABLE";
  confidence: number;
  description: string;
  drivers: string;
  subtext: string;
}

export interface Recommendation {
  id: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM";
  category: string;
  action: string;
}

export interface MonthlyTrend {
  month: string;
  vulnerable: number;
  potentiallyVulnerable: number;  //  FIXED: Changed from "potential" to "potentiallyVulnerable"
  notVulnerable: number;  //  FIXED: Changed from "secure" to "notVulnerable"
}

export interface FieldNotice {
  id: string;
  title: string;
  vulnerableCount: number;
  potentialCount: number;
  secureCount: number;
}

export interface Customer {
  name: string;
  vulnerableCount: number;
  potentialCount: number;
  secureCount: number;
  recordCount: number;
  // Enhanced fields for Extreme Vulnerability Reporting
  riskLevel: "CRITICAL" | "HIGH" | "ELEVATED";
  trend: "increasing" | "stable" | "decreasing";
  priority: "IMMEDIATE" | "HIGH" | "MEDIUM";
}

// Extended KPI metrics for enhanced dashboard
export interface ExtendedKPI {
  id: string;
  label: string;
  value: number;
  displayValue: string;
  unit?: string;
  subtext: string;
  trend: number; // percentage change
  trendDirection: 'up' | 'down' | 'stable';
  isPositiveGood: boolean;
  color: 'purple' | 'cyan' | 'indigo' | 'emerald' | 'orange';
  icon: string;
  history?: { date: string; value: number }[];
  target?: number;
  targetLabel?: string;
  aiInsight?: string;
}

export interface DashboardData {
  lastUpdated: string;
  metrics: {
    totalAssessed: Metric;
    secure: Metric;
    potential: Metric;
    vulnerable: Metric;
  };
  extendedKPIs?: ExtendedKPI[];
  growthMetrics: GrowthMetric[];
  advancedMetrics: AdvancedMetric[];
  anomalies: Anomaly[];
  predictions: Prediction[];
  recommendations: Recommendation[];
  trends: MonthlyTrend[];
  topFieldNotices: FieldNotice[];
  topCustomers: Customer[];
  // Raw records for client-side filtering
  records?: DataRecord[];
}

// Data record interface for filtering
export interface DataRecord {
  id: string;
  customer: string;
  customerName?: string;
  fieldNotice: string;
  fieldNoticeId?: string;
  fnType: string;
  month: string;
  totVuln: number;
  potVuln: number;
  notVuln: number;
}

export interface FilterState {
  customer: string;
  fieldNotice: string;
  fnType: string;
  month: string;
  // Advanced search fields
  customerSearch?: string;
  fieldNoticeSearch?: string;
  showOnlyVulnerable?: boolean;
}

// Default filter state for reset
export const DEFAULT_FILTER_STATE: FilterState = {
  customer: 'All Customers',
  fieldNotice: 'All Field Notices',
  fnType: 'All Types',
  month: 'All Months',
  customerSearch: '',
  fieldNoticeSearch: '',
  showOnlyVulnerable: false,
};

// Intelligence Center Types

export interface IntelligenceKPI {
  label: string;
  value: string | number;
  subtext: string;
  status?: 'active' | 'good' | 'warning' | 'critical';
}

export interface AnalyticsGridData {
  vulnerabilityTrend: {
    status: string;
    acceleration: string;
    strength: string;
    forecast: string;
  };
  customerRisk: {
    level: string;
    concentration: string;
    pareto: string;
    focus: string;
  };
  fieldNoticeImpact: {
    level: string;
    totalCVEs: number;
    highImpact: number;
    avgImpact: string;
  };
  remediationVelocity: {
    status: string;
    rate: number;
    efficiency: string;
    monthsToClear: number;
  };
  temporalPatterns: {
    status: string;
    seasonality: string;
    peak: string;
    low: string;
  };
  riskPrioritization: {
    level: string;
    score: number;
    confidence: string;
    criticalIssues: number;
    topAsset: string;
  };
  intelligenceSummary: {
    level: string;
    score: number;
    vulnerableAssetsPct: string;
    insights: string[];
  };
  trendPredictions: {
    period: string;
    prediction: string;
    confidence: number;
    trend: 'up' | 'stable' | 'down';
  }[];
}

export interface CompanyAnomaly {
  name: string;
  score: number;
  trend: number;
  vulnerableCount: number;
  updated: string;
  tags: { label: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' }[];
}

export interface SystemHealthMetric {
  label: string;
  score: number;
  status: string;
  description: string;
}

export interface MLPerformance {
  accuracy: string;
  precision: string;
  recall: string;
  mape: string;
}

export interface IntelligenceData {
  aiConfidence: string;
  kpis: IntelligenceKPI[];
  analytics: AnalyticsGridData;
  forecast: { month: string; value: number }[];
  anomalies: CompanyAnomaly[];
  systemHealth: SystemHealthMetric[];
  nlpAnalysis: {
    keywords: string[];
    urgencyScore: string;
    patterns: string[];
  };
  mlPerformance: MLPerformance;
  recommendations: string[];
}

// Unified Insight Data for Modals
export interface InsightData {
  title: string;
  value: string | number;
  subtext: string;
  color: string;
  history?: { date: string; value: number }[];
  aiAnalysis?: string;
  tags?: { label: string; color: string }[];
  recommendations?: string[];
  type: 'metric' | 'anomaly' | 'prediction' | 'recommendation';
}

// Voice System Types
export type VoiceIntent = 
  | 'TREND_PREDICTIONS' 
  | 'ANOMALY_CHECK' 
  | 'SYSTEM_HEALTH' 
  | 'METRIC_VIEW' 
  | 'CUSTOMER_INSIGHT' 
  | 'RECOMMENDATION_VIEW'
  | 'UNKNOWN';

export interface VoiceScenario {
  command: string;
  intent: VoiceIntent;
  response: {
    text: string;
    metrics?: string[]; // metrics to show
    showPredictions?: boolean;
    showAnomalies?: boolean;
    showRecommendations?: boolean;
  };
}

// ========================================
// AI Analytics Types
// ========================================

export type InsightType = 'trend' | 'pattern' | 'anomaly' | 'forecast' | 'recommendation';
export type InsightSeverity = 'info' | 'warning' | 'critical' | 'success';
export type TrendDirection = 'increasing' | 'decreasing' | 'stable' | 'volatile';

export interface AIInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  severity: InsightSeverity;
  confidence: number;
  timestamp: Date;
  affectedMetrics: string[];
  recommendation?: string;
  data?: Record<string, unknown>;
}

export interface PatternDetectionResult {
  patternId: string;
  patternType: 'cyclical' | 'spike' | 'decline' | 'plateau' | 'anomaly';
  confidence: number;
  startIndex: number;
  endIndex: number;
  magnitude: number;
  description: string;
}

export interface TrendAnalysis {
  direction: TrendDirection;
  strength: number;
  changeRate: number;
  movingAverages: {
    short: number[];
    medium: number[];
    long: number[];
  };
  volatility: number;
  seasonality: {
    detected: boolean;
    period?: number;
    strength?: number;
  };
}

export interface AnomalyDetection {
  anomalies: Array<{
    index: number;
    value: number;
    expectedValue: number;
    deviation: number;
    severity: InsightSeverity;
    timestamp?: Date;
  }>;
  threshold: number;
  method: 'zscore' | 'iqr' | 'isolation_forest';
}

export interface ForecastResult {
  predictions: Array<{
    timestamp: Date;
    value: number;
    confidence: number;
    upperBound: number;
    lowerBound: number;
  }>;
  accuracy: number;
  method: 'linear' | 'exponential' | 'arima' | 'prophet';
}

// ========================================
// Performance Monitoring Types
// ========================================

export interface SystemMetrics {
  cpu: number;
  memory: number;
  network: {
    latency: number;
    throughput: number;
  };
  errorRate: number;
  timestamp: Date;
}

export interface UserEngagement {
  sessionId: string;
  userId?: string;
  startTime: Date;
  duration: number;
  interactions: InteractionEvent[];
  visualizationsViewed: string[];
  feedbackSubmitted: boolean;
}

export interface InteractionEvent {
  type: 'click' | 'hover' | 'scroll' | 'filter' | 'export' | 'feedback';
  target: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface VisualizationMetrics {
  visualizationId: string;
  viewCount: number;
  avgViewDuration: number;
  interactionCount: number;
  lastViewed: Date;
  heatmapData?: HeatmapCell[];
}

export interface HeatmapCell {
  x: number;
  y: number;
  intensity: number;
}

export interface FeedbackEntry {
  id: string;
  userId?: string;
  type: 'rating' | 'comment' | 'suggestion' | 'bug';
  rating?: number;
  content: string;
  timestamp: Date;
  metadata?: {
    page?: string;
    visualization?: string;
    userAgent?: string;
  };
}

export interface PerformanceReport {
  period: {
    start: Date;
    end: Date;
  };
  systemMetrics: {
    avgCpu: number;
    avgMemory: number;
    avgLatency: number;
    errorRate: number;
  };
  userMetrics: {
    totalSessions: number;
    avgSessionDuration: number;
    totalInteractions: number;
    uniqueUsers: number;
  };
  visualizationMetrics: VisualizationMetrics[];
  feedback: {
    totalEntries: number;
    avgRating: number;
    topIssues: string[];
  };
}

// ========================================
// Animation Types
// ========================================

export interface AnimationConfig {
  duration: number;
  delay?: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'spring' | 'bounce';
  direction?: 'normal' | 'reverse' | 'alternate';
  iterations?: number;
}

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

export interface ParticleConfig {
  count: number;
  color: string;
  size: { min: number; max: number };
  speed: { min: number; max: number };
  lifetime: number;
  direction: 'up' | 'down' | 'random' | 'radial';
}

export interface TransitionConfig {
  type: 'fade' | 'slide' | 'scale' | 'rotate' | 'morph';
  duration: number;
  easing: string;
  stagger?: number;
}

// ========================================
// Dashboard View Types
// ========================================

export type DashboardView = 
  | 'overview' 
  | 'intelligence' 
  | 'comprehensive-stats' 
  | 'analytics' 
  | 'settings';

export interface DashboardState {
  currentView: DashboardView;
  selectedTimeRange: TimeRange;
  activeFilters: FilterState;
  isLoading: boolean;
  error?: string;
}

export interface TimeRange {
  start: Date;
  end: Date;
  preset?: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
}

// ========================================
// Comprehensive Dashboard Types
// ========================================

export interface ComprehensiveMetric {
  id: string;
  category: 'security' | 'performance' | 'engagement' | 'ai';
  label: string;
  value: number;
  displayValue: string;
  trend: TrendDirection;
  trendValue: number;
  history: Array<{ timestamp: Date; value: number }>;
  aiInsights: AIInsight[];
  threshold?: {
    warning: number;
    critical: number;
  };
}

export interface DashboardSection {
  id: string;
  title: string;
  description?: string;
  metrics: ComprehensiveMetric[];
  visualizations: string[];
  collapsed?: boolean;
  order: number;
}

export interface RealTimeDataStream {
  streamId: string;
  metricId: string;
  isActive: boolean;
  updateInterval: number;
  buffer: Array<{ timestamp: Date; value: number }>;
  onUpdate?: (value: number) => void;
}

// ============================================================================
// KAR (Key Account Ratio) Analytics Types
// ============================================================================

export interface AffectedCustomer {
  id: string;
  name: string;
  recordCount: number;
  vulnerabilityCount: number;
  riskScore: number;
}

export interface KARDataPoint {
  month: string;
  ratio: number;
  affectedCustomers: number;
  criticalCount: number;
}

export interface FieldNoticeAnalyticsResponse {
  fieldNoticeId: string;
  customers: AffectedCustomer[];
  totalAffected: number;
  totalRecords: number;
  totalVulnerabilities: number;
  avgRiskScore: number | string;
  responseTime: string;
  timestamp: string;
}

export interface KPICardInteractiveProps {
  fieldNoticeId?: string;
  fieldNoticeTitle?: string;
  onCustomerSelect?: (customer: AffectedCustomer) => void;
}