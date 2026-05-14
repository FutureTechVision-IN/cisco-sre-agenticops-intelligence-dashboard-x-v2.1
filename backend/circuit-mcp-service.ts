/**
 * Cisco CIRCUIT MCP (Model Context Protocol) Service
 * ===================================================
 * Comprehensive API key validation, dual-key management, ML pipelines,
 * real-time monitoring, and intelligent insights extraction.
 * 
 * API Keys:
 *   - Summarize: configured via CISCO_CIRCUIT_API_KEY env var
 *   - Workflow:  configured via CISCO_CIRCUIT_WORKFLOW_KEY env var
 * 
 * Architecture: MCP-based context protocol with multi-model ML pipeline
 */

import {
  getAllRecordsFromCache,
  getMetricsFromCache,
  getFilteredMonthlyTrendsFromCache,
  getTopCustomersFromCache,
  getCacheStats,
} from './csv-data-service';

// Enhanced AI/ML engine: 5-model ensemble, feature engineering, adaptive retraining, XAI
import {
  runEnsemble,
  engineerFeatures,
  computeAccuracyImprovement,
  type TimeSeries,
  type EnsemblePrediction,
} from './circuit-ml-engine';

// ============================================================================
// 1. CIRCUIT API KEY DEFINITIONS & STRUCTURE
// ============================================================================

interface CircuitAPIKey {
  id: string;
  rawKey: string;
  prefix: string;       // egai
  environment: string;  // prd
  domain: string;       // cx | operations
  accountId: string;    // 123051666
  purpose: string;      // summarize | workflow
  timestamp: number;    // unix ms from key
  status: 'active' | 'expired' | 'revoked' | 'rate-limited' | 'validating';
  capabilities: string[];
  rateLimits: { rpm: number; rpd: number; remaining: number; resetAt: number };
  metrics: KeyMetrics;
  lastValidated: number;
  validationTTL: number; // ms
}

interface KeyMetrics {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  lastUsed: number;
  errorsByType: Record<string, number>;
  requestHistory: Array<{ ts: number; latency: number; ok: boolean; endpoint: string }>;
}

interface MCPContext {
  sessionId: string;
  contextWindow: ContextEntry[];
  modelChain: string[];
  aggregatedInsights: AggregatedInsight[];
  pipelineState: 'idle' | 'running' | 'complete' | 'error';
  startedAt: number;
  completedAt?: number;
}

interface ContextEntry {
  role: 'system' | 'data' | 'analysis' | 'prediction' | 'recommendation';
  content: string;
  model: string;
  timestamp: number;
  confidence: number;
}

interface AggregatedInsight {
  id: string;
  category: 'anomaly' | 'prediction' | 'pattern' | 'recommendation' | 'risk';
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  dataPoints: number;
  generatedBy: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// 2. API KEY REGISTRY
// ============================================================================

const CIRCUIT_KEYS: CircuitAPIKey[] = [
  {
    id: 'circuit-summarize',
    rawKey: process.env.CISCO_CIRCUIT_API_KEY || '',
    prefix: 'egai',
    environment: 'prd',
    domain: 'cx',
    accountId: '123051666',
    purpose: 'summarize',
    timestamp: 1762363675430,
    status: 'active',
    capabilities: [
      'text_summarization', 'vulnerability_analysis', 'security_recommendations',
      'executive_briefings', 'trend_narratives', 'field_notice_summaries',
    ],
    rateLimits: { rpm: 60, rpd: 10000, remaining: 10000, resetAt: 0 },
    metrics: createEmptyMetrics(),
    lastValidated: 0,
    validationTTL: 3600000,
  },
  {
    id: 'circuit-workflow',
    rawKey: process.env.CISCO_CIRCUIT_WORKFLOW_KEY || '',
    prefix: 'egai',
    environment: 'prd',
    domain: 'operations',
    accountId: '123051666',
    purpose: 'workflow',
    timestamp: 1766066063445,
    status: 'active',
    capabilities: [
      'workflow_orchestration', 'predictive_analytics', 'anomaly_detection',
      'automated_remediation', 'pipeline_management', 'batch_processing',
      'real_time_streaming', 'model_inference',
    ],
    rateLimits: { rpm: 30, rpd: 5000, remaining: 5000, resetAt: 0 },
    metrics: createEmptyMetrics(),
    lastValidated: 0,
    validationTTL: 3600000,
  },
];

const CIRCUIT_ENDPOINT = process.env.CISCO_CIRCUIT_ENDPOINT || 'https://circuit.cisco.com/api/v1';

function createEmptyMetrics(): KeyMetrics {
  return {
    totalRequests: 0, successCount: 0, failureCount: 0,
    avgLatencyMs: 0, p95LatencyMs: 0, lastUsed: 0,
    errorsByType: {}, requestHistory: [],
  };
}

// ============================================================================
// 3. API KEY VALIDATOR
// ============================================================================

export interface KeyValidationResult {
  keyId: string;
  isValid: boolean;
  status: string;
  domain: string;
  purpose: string;
  accountId: string;
  capabilities: string[];
  rateLimits: { rpm: number; rpd: number; remaining: number };
  keyAge: string;
  expiresIn: string;
  structureValid: boolean;
  endpointReachable: boolean;
  authenticationStatus: 'authenticated' | 'fallback' | 'failed';
  diagnostics: string[];
}

function parseKeyStructure(key: string): {
  valid: boolean;
  prefix?: string;
  env?: string;
  domain?: string;
  account?: string;
  purpose?: string;
  timestamp?: number;
  diagnostics: string[];
} {
  const diagnostics: string[] = [];
  const parts = key.split('-');

  if (parts.length < 6) {
    diagnostics.push(`Key has ${parts.length} segments (expected >= 6)`);
    return { valid: false, diagnostics };
  }

  const prefix = parts[0]; // egai
  const env = parts[1];    // prd
  const domain = parts[2]; // cx | operations
  const account = parts[3]; // 123051666
  const purpose = parts[4]; // summarize | workflow
  const ts = parseInt(parts[5]);

  if (prefix !== 'egai') diagnostics.push(`Unknown prefix "${prefix}" (expected "egai")`);
  if (!['prd', 'stg', 'dev'].includes(env)) diagnostics.push(`Unknown environment "${env}"`);
  if (!['cx', 'operations', 'security', 'analytics'].includes(domain))
    diagnostics.push(`Unknown domain "${domain}"`);
  if (!/^\d{6,12}$/.test(account)) diagnostics.push(`Invalid account ID format "${account}"`);
  if (isNaN(ts)) diagnostics.push(`Invalid timestamp segment "${parts[5]}"`);

  const valid = prefix === 'egai' && ['prd', 'stg', 'dev'].includes(env) && !isNaN(ts);
  if (valid) diagnostics.push('Key structure matches Cisco EGAI format');

  return { valid, prefix, env, domain, account, purpose, timestamp: ts, diagnostics };
}

async function testEndpointReachability(key: string): Promise<{ reachable: boolean; authOk: boolean; latency: number; details: string }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(`${CIRCUIT_ENDPOINT}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'X-Cisco-App': 'SRE-AgenticOps-Dashboard',
      },
      body: JSON.stringify({ action: 'validate' }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const latency = Date.now() - start;

    if (resp.ok) return { reachable: true, authOk: true, latency, details: `HTTP ${resp.status} OK` };
    if (resp.status === 401 || resp.status === 403)
      return { reachable: true, authOk: false, latency, details: `HTTP ${resp.status} - Auth failed` };
    return { reachable: true, authOk: false, latency, details: `HTTP ${resp.status}` };
  } catch (err: any) {
    const latency = Date.now() - start;
    if (err.name === 'AbortError')
      return { reachable: false, authOk: false, latency, details: 'Connection timeout (5s)' };
    // Network errors expected for internal APIs when running outside Cisco network
    return { reachable: false, authOk: false, latency, details: `Network: ${err.message?.substring(0, 80)}` };
  }
}

export async function validateAllKeys(): Promise<KeyValidationResult[]> {
  const results: KeyValidationResult[] = [];

  for (const key of CIRCUIT_KEYS) {
    const parsed = parseKeyStructure(key.rawKey);
    const endpoint = await testEndpointReachability(key.rawKey);
    const now = Date.now();
    const keyAgeMs = now - key.timestamp;
    const keyAgeDays = Math.floor(keyAgeMs / 86400000);
    const expiryMs = key.timestamp + 365 * 86400000; // 1 year from issuance
    const expiresInDays = Math.max(0, Math.floor((expiryMs - now) / 86400000));

    const diagnostics = [...parsed.diagnostics];
    diagnostics.push(`Key age: ${keyAgeDays} days`);
    diagnostics.push(`Expires in: ${expiresInDays} days`);
    diagnostics.push(`Endpoint test: ${endpoint.details} (${endpoint.latency}ms)`);

    if (!endpoint.reachable) {
      diagnostics.push('Endpoint unreachable - using intelligent fallback mode with local ML pipeline');
    }

    const authStatus: 'authenticated' | 'fallback' | 'failed' =
      endpoint.authOk ? 'authenticated' : endpoint.reachable ? 'failed' : 'fallback';

    key.lastValidated = now;
    key.status = parsed.valid ? 'active' : 'revoked';

    results.push({
      keyId: key.id,
      isValid: parsed.valid,
      status: key.status,
      domain: key.domain,
      purpose: key.purpose,
      accountId: key.accountId,
      capabilities: key.capabilities,
      rateLimits: { rpm: key.rateLimits.rpm, rpd: key.rateLimits.rpd, remaining: key.rateLimits.remaining },
      keyAge: `${keyAgeDays} days`,
      expiresIn: `${expiresInDays} days`,
      structureValid: parsed.valid,
      endpointReachable: endpoint.reachable,
      authenticationStatus: authStatus,
      diagnostics,
    });
  }

  return results;
}

// ============================================================================
// 4. MCP CONTEXT PROTOCOL ENGINE
// ============================================================================

let activeMCPContext: MCPContext | null = null;

function createMCPSession(): MCPContext {
  return {
    sessionId: `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    contextWindow: [],
    modelChain: [],
    aggregatedInsights: [],
    pipelineState: 'idle',
    startedAt: Date.now(),
  };
}

function addContextEntry(ctx: MCPContext, entry: Omit<ContextEntry, 'timestamp'>): void {
  ctx.contextWindow.push({ ...entry, timestamp: Date.now() });
  if (!ctx.modelChain.includes(entry.model)) ctx.modelChain.push(entry.model);
  // Keep context window bounded
  if (ctx.contextWindow.length > 50) ctx.contextWindow.shift();
}

function addInsight(ctx: MCPContext, insight: Omit<AggregatedInsight, 'id' | 'timestamp'>): void {
  ctx.aggregatedInsights.push({
    ...insight,
    id: `ins-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  });
}

// ============================================================================
// 5. ML PIPELINE - MULTI-MODEL PROCESSING
// ============================================================================

interface MLPipelineResult {
  sessionId: string;
  pipelineStages: PipelineStage[];
  insights: AggregatedInsight[];
  predictions: PredictionResult[];
  anomalies: AnomalyResult[];
  patterns: PatternResult[];
  recommendations: RecommendationResult[];
  riskAssessment: RiskAssessment;
  performanceMetrics: { totalDurationMs: number; stagesCompleted: number; modelsUsed: string[] };
  /** True when result served from cache (sub-5ms) */
  cached?: boolean;
  /** AI/ML engine version info */
  mlEngineVersion: string;
}

interface PipelineStage {
  name: string;
  model: string;
  status: 'completed' | 'skipped' | 'error';
  durationMs: number;
  outputSummary: string;
}

interface PredictionResult {
  metric: string;
  currentValue: number;
  predictedValues: EnsemblePrediction[];
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  model: string;
  r2Score: number;
  /** Dynamic ensemble weights used (model name → weight 0-1) */
  ensembleWeights?: Record<string, number>;
  /** Accuracy KPIs per base model after adaptive retraining */
  modelAccuracy?: Array<{ modelName: string; mape: number; rmse: number; currentWeight: number }>;
  /** Feature engineering metadata */
  featureEngineering?: { featuresUsed: string[]; topFeature: string; improvementVsBaseline?: number };
}

interface AnomalyResult {
  type: 'spike' | 'drop' | 'drift' | 'seasonality_break';
  metric: string;
  period: string;
  observedValue: number;
  expectedValue: number;
  deviationSigma: number;
  severity: 'info' | 'warning' | 'critical';
  explanation: string;
}

interface PatternResult {
  patternType: 'cyclical' | 'trend' | 'cluster' | 'correlation' | 'emergence';
  description: string;
  confidence: number;
  affectedMetrics: string[];
  timespan: string;
  actionable: boolean;
}

interface RecommendationResult {
  id: string;
  priority: 'immediate' | 'short-term' | 'long-term';
  category: 'security' | 'operational' | 'strategic' | 'compliance';
  title: string;
  description: string;
  impact: string;
  confidence: number;
  estimatedEffort: string;
  relatedInsights: string[];
}

interface RiskAssessment {
  overallScore: number; // 0-100
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{ factor: string; weight: number; score: number; trend: string }>;
  mitigationPriorities: string[];
}

// ---------- Statistical Helpers ----------

function linearRegression(y: number[]): { slope: number; intercept: number; r2: number } {
  const n = y.length;
  if (n < 2) return { slope: 0, intercept: y[0] || 0, r2: 0 };
  const x = y.map((_, i) => i);
  const sx = x.reduce((a, b) => a + b, 0);
  const sy = y.reduce((a, b) => a + b, 0);
  const sxy = x.reduce((a, xi, i) => a + xi * y[i], 0);
  const sx2 = x.reduce((a, xi) => a + xi * xi, 0);
  const denom = n * sx2 - sx * sx;
  if (denom === 0) return { slope: 0, intercept: sy / n, r2: 0 };
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  const yMean = sy / n;
  const ssTot = y.reduce((a, yi) => a + (yi - yMean) ** 2, 0);
  const ssRes = y.reduce((a, yi, i) => a + (yi - (intercept + slope * i)) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

function exponentialSmoothing(data: number[], alpha = 0.3): number[] {
  if (data.length === 0) return [];
  const result = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

function zScore(values: number[]): { mean: number; std: number; scores: number[] } {
  const n = values.length;
  if (n === 0) return { mean: 0, std: 0, scores: [] };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  const scores = std === 0 ? values.map(() => 0) : values.map(v => (v - mean) / std);
  return { mean, std, scores };
}

function movingAverage(data: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

function detectSeasonality(data: number[], minPeriod = 2): { seasonal: boolean; period: number; strength: number } {
  if (data.length < minPeriod * 2) return { seasonal: false, period: 0, strength: 0 };
  let bestCorr = 0;
  let bestPeriod = 0;
  for (let p = minPeriod; p <= Math.floor(data.length / 2); p++) {
    let sum = 0;
    let count = 0;
    for (let i = p; i < data.length; i++) {
      sum += (data[i] - data[i - p]) ** 2;
      count++;
    }
    const corr = count > 0 ? 1 / (1 + sum / count) : 0;
    if (corr > bestCorr) { bestCorr = corr; bestPeriod = p; }
  }
  return { seasonal: bestCorr > 0.6, period: bestPeriod, strength: bestCorr };
}

// ---------- ML Pipeline Result Caching ----------

let cachedPipelineResult: MLPipelineResult | null = null;
let cacheTimestamp = 0;
const PIPELINE_CACHE_TTL = 30000; // 30 seconds

export function invalidatePipelineCache(): void {
  cachedPipelineResult = null;
  cacheTimestamp = 0;
}

// ---------- ML Pipeline Execution ----------

export async function runMLPipeline(): Promise<MLPipelineResult> {
  // Return cached result if still fresh
  if (cachedPipelineResult && (Date.now() - cacheTimestamp) < PIPELINE_CACHE_TTL) {
    return { ...cachedPipelineResult, cached: true };
  }

  const ctx = createMCPSession();
  ctx.pipelineState = 'running';
  activeMCPContext = ctx;
  const pipelineStart = Date.now();
  const stages: PipelineStage[] = [];

  try {
    // ---- STAGE 1: Data Ingestion ----
    const s1Start = Date.now();
    const records = await getAllRecordsFromCache();
    const stats = getCacheStats();

    const monthlyAgg = new Map<string, { vuln: number; pot: number; notVuln: number; total: number; count: number }>();
    const customerAgg = new Map<string, { vuln: number; pot: number; notVuln: number; total: number; months: Set<string>; fnSet: Set<string> }>();

    for (const r of records) {
      const m = monthlyAgg.get(r.month) || { vuln: 0, pot: 0, notVuln: 0, total: 0, count: 0 };
      m.vuln += r.totVuln; m.pot += r.potVuln; m.notVuln += r.notVuln; m.total += r.total; m.count++;
      monthlyAgg.set(r.month, m);

      const ck = r.normalizedCustomer || r.customerName;
      if (ck) {
        const c = customerAgg.get(ck) || { vuln: 0, pot: 0, notVuln: 0, total: 0, months: new Set(), fnSet: new Set() };
        c.vuln += r.totVuln; c.pot += r.potVuln; c.notVuln += r.notVuln; c.total += r.total;
        c.months.add(r.month);
        if (r.fieldNoticeFormatted || r.fieldNotice) c.fnSet.add(r.fieldNoticeFormatted || r.fieldNotice);
        customerAgg.set(ck, c);
      }
    }

    const sortedMonths = Array.from(monthlyAgg.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    addContextEntry(ctx, {
      role: 'data',
      content: `Ingested ${records.length} records across ${sortedMonths.length} months, ${customerAgg.size} customers`,
      model: 'data-ingestion',
      confidence: 1.0,
    });

    stages.push({
      name: 'Data Ingestion & Aggregation',
      model: 'csv-cache-engine',
      status: 'completed',
      durationMs: Date.now() - s1Start,
      outputSummary: `${records.length} records, ${sortedMonths.length} months, ${customerAgg.size} customers`,
    });

    // ---- STAGE 2: Pattern Recognition (Multi-Algorithm) ----
    const s2Start = Date.now();
    const vulnSeries = sortedMonths.map(([, v]) => v.vuln);
    const potSeries = sortedMonths.map(([, v]) => v.pot);
    const totalSeries = sortedMonths.map(([, v]) => v.total);

    const vulnSmoothed = exponentialSmoothing(vulnSeries, 0.3);
    const vulnMA3 = movingAverage(vulnSeries, 3);
    const seasonality = detectSeasonality(vulnSeries);
    const vulnRegression = linearRegression(vulnSeries);
    const potRegression = linearRegression(potSeries);

    const patterns: PatternResult[] = [];

    // Trend detection
    if (Math.abs(vulnRegression.slope) > 50000) {
      patterns.push({
        patternType: 'trend',
        description: vulnRegression.slope > 0
          ? `Vulnerability count shows upward trend (slope: +${Math.round(vulnRegression.slope).toLocaleString()}/month, R2: ${vulnRegression.r2.toFixed(3)})`
          : `Vulnerability count shows downward trend (slope: ${Math.round(vulnRegression.slope).toLocaleString()}/month, R2: ${vulnRegression.r2.toFixed(3)})`,
        confidence: Math.min(0.95, vulnRegression.r2 + 0.2),
        affectedMetrics: ['vulnerable_assets'],
        timespan: `${sortedMonths[0][0]} to ${sortedMonths[sortedMonths.length - 1][0]}`,
        actionable: true,
      });
    }

    // Seasonality detection
    if (seasonality.seasonal) {
      patterns.push({
        patternType: 'cyclical',
        description: `Seasonal pattern detected with period of ${seasonality.period} months (strength: ${(seasonality.strength * 100).toFixed(0)}%)`,
        confidence: seasonality.strength,
        affectedMetrics: ['vulnerable_assets'],
        timespan: `${sortedMonths[0][0]} to ${sortedMonths[sortedMonths.length - 1][0]}`,
        actionable: true,
      });
    }

    // Correlation: vuln vs pot
    const corrVulnPot = pearsonCorrelation(vulnSeries, potSeries);
    if (Math.abs(corrVulnPot) > 0.7) {
      patterns.push({
        patternType: 'correlation',
        description: `Strong ${corrVulnPot > 0 ? 'positive' : 'negative'} correlation (r=${corrVulnPot.toFixed(3)}) between vulnerable and potentially vulnerable assets`,
        confidence: Math.abs(corrVulnPot),
        affectedMetrics: ['vulnerable_assets', 'potentially_vulnerable'],
        timespan: `${sortedMonths[0][0]} to ${sortedMonths[sortedMonths.length - 1][0]}`,
        actionable: corrVulnPot > 0,
      });
    }

    // Customer clustering
    const custVulnRatios = Array.from(customerAgg.values()).map(c => c.total > 0 ? c.vuln / c.total : 0);
    const highRiskCluster = custVulnRatios.filter(r => r > 0.05).length;
    const lowRiskCluster = custVulnRatios.filter(r => r <= 0.01).length;
    if (highRiskCluster > 0) {
      patterns.push({
        patternType: 'cluster',
        description: `Customer risk clustering: ${highRiskCluster} high-risk (>5% vuln rate), ${custVulnRatios.length - highRiskCluster - lowRiskCluster} medium, ${lowRiskCluster} low-risk`,
        confidence: 0.88,
        affectedMetrics: ['customer_risk_distribution'],
        timespan: 'Current snapshot',
        actionable: true,
      });
    }

    addContextEntry(ctx, {
      role: 'analysis',
      content: `Pattern recognition: ${patterns.length} patterns detected`,
      model: 'multi-algorithm-pattern-engine',
      confidence: 0.85,
    });

    stages.push({
      name: 'Pattern Recognition (Multi-Algorithm)',
      model: 'exp-smoothing + regression + seasonality + correlation',
      status: 'completed',
      durationMs: Date.now() - s2Start,
      outputSummary: `${patterns.length} patterns: ${patterns.map(p => p.patternType).join(', ')}`,
    });

    // ---- STAGE 3: Anomaly Detection (Multi-Method) ----
    const s3Start = Date.now();
    const anomalies: AnomalyResult[] = [];

    // Z-Score anomalies
    const vulnZ = zScore(vulnSeries);
    sortedMonths.forEach(([month, v], i) => {
      const z = vulnZ.scores[i];
      if (Math.abs(z) > 1.5) {
        anomalies.push({
          type: z > 0 ? 'spike' : 'drop',
          metric: 'vulnerable_assets',
          period: month,
          observedValue: v.vuln,
          expectedValue: Math.round(vulnZ.mean),
          deviationSigma: parseFloat(z.toFixed(2)),
          severity: Math.abs(z) > 2.5 ? 'critical' : Math.abs(z) > 2 ? 'warning' : 'info',
          explanation: `Vulnerability count ${z > 0 ? 'spike' : 'drop'} of ${Math.abs(z).toFixed(1)} sigma from mean (${Math.round(vulnZ.mean).toLocaleString()})`,
        });
      }
    });

    // Smoothed drift detection
    vulnSmoothed.forEach((sv, i) => {
      if (i < 2) return;
      const drift = Math.abs(sv - vulnSmoothed[i - 1]) / (vulnSmoothed[i - 1] || 1);
      if (drift > 0.15) {
        const month = sortedMonths[i][0];
        if (!anomalies.some(a => a.period === month && a.type === 'drift')) {
          anomalies.push({
            type: 'drift',
            metric: 'vulnerability_trend',
            period: month,
            observedValue: Math.round(sv),
            expectedValue: Math.round(vulnSmoothed[i - 1]),
            deviationSigma: drift * 10,
            severity: drift > 0.25 ? 'warning' : 'info',
            explanation: `Smoothed trend shifted ${(drift * 100).toFixed(1)}% from previous period`,
          });
        }
      }
    });

    addContextEntry(ctx, {
      role: 'analysis',
      content: `Anomaly detection: ${anomalies.length} anomalies found`,
      model: 'z-score + exp-smoothing-drift',
      confidence: 0.9,
    });

    stages.push({
      name: 'Anomaly Detection (Multi-Method)',
      model: 'z-score + exponential-smoothing + drift-detection',
      status: 'completed',
      durationMs: Date.now() - s3Start,
      outputSummary: `${anomalies.length} anomalies (${anomalies.filter(a => a.severity === 'critical').length} critical)`,
    });

    // ---- STAGE 4: Predictive Analytics (Enhanced 5-Model Ensemble + XAI) ----
    const s4Start = Date.now();
    const predictions: PredictionResult[] = [];
    const lastMonth = sortedMonths[sortedMonths.length - 1]?.[0] || '2026-01';

    function projectMonths(from: string, count: number): string[] {
      const [y, m] = from.split('-').map(Number);
      const result: string[] = [];
      for (let i = 1; i <= count; i++) {
        const nm = m + i;
        const ny = y + Math.floor((nm - 1) / 12);
        const mo = ((nm - 1) % 12) + 1;
        result.push(`${ny}-${String(mo).padStart(2, '0')}`);
      }
      return result;
    }

    const futureMonths = projectMonths(lastMonth, 6);

    // Helper to build TimeSeries with forward labels for the ensemble engine
    const buildTS = (vals: number[]): TimeSeries => ({
      labels: [
        ...sortedMonths.map(([l]) => l),
        ...futureMonths,
      ],
      values: vals,
    });

    // Run 5-model ensemble for each metric (sub-200ms: all models are O(n))
    const vulnResult = runEnsemble('vulnerable_assets', buildTS(vulnSeries), 6);
    const vulnImprovement = computeAccuracyImprovement('vulnerable_assets', vulnSeries);
    predictions.push({
      metric: 'vulnerable_assets',
      currentValue: vulnSeries[vulnSeries.length - 1] || 0,
      predictedValues: vulnResult.predictions,
      trend: vulnRegression.slope > 50000 ? 'increasing' : vulnRegression.slope < -50000 ? 'decreasing' : 'stable',
      model: 'ensemble(linear-regression + exp-smoothing + holt-linear-trend + weighted-moving-avg + polynomial-regression)',
      r2Score: vulnResult.r2,
      ensembleWeights: vulnResult.accuracy.reduce<Record<string,number>>((acc, m) => { acc[m.modelName] = m.currentWeight; return acc; }, {}),
      modelAccuracy: vulnResult.accuracy,
      featureEngineering: {
        featuresUsed: ['raw', 'lag1', 'lag2', 'lag3', 'rollingMean3', 'rollingStd3', 'rollingMean6', 'rateOfChange', 'normalised', 'maDeviation'],
        topFeature: vulnResult.predictions[0]?.xai?.primaryDriver ?? 'unknown',
        improvementVsBaseline: vulnImprovement.improvementPct,
      },
    });

    const potResult = runEnsemble('potentially_vulnerable', buildTS(potSeries), 6);
    predictions.push({
      metric: 'potentially_vulnerable',
      currentValue: potSeries[potSeries.length - 1] || 0,
      predictedValues: potResult.predictions,
      trend: potRegression.slope > 50000 ? 'increasing' : potRegression.slope < -50000 ? 'decreasing' : 'stable',
      model: 'ensemble(linear-regression + exp-smoothing + holt-linear-trend + weighted-moving-avg + polynomial-regression)',
      r2Score: potResult.r2,
      ensembleWeights: potResult.accuracy.reduce<Record<string,number>>((acc, m) => { acc[m.modelName] = m.currentWeight; return acc; }, {}),
      modelAccuracy: potResult.accuracy,
    });

    const totalRegression = linearRegression(totalSeries);
    const totalResult = runEnsemble('total_assessed', buildTS(totalSeries), 6);
    predictions.push({
      metric: 'total_assessed',
      currentValue: totalSeries[totalSeries.length - 1] || 0,
      predictedValues: totalResult.predictions,
      trend: totalRegression.slope > 100000 ? 'increasing' : totalRegression.slope < -100000 ? 'decreasing' : 'stable',
      model: 'ensemble(linear-regression + exp-smoothing + holt-linear-trend + weighted-moving-avg + polynomial-regression)',
      r2Score: totalResult.r2,
      ensembleWeights: totalResult.accuracy.reduce<Record<string,number>>((acc, m) => { acc[m.modelName] = m.currentWeight; return acc; }, {}),
      modelAccuracy: totalResult.accuracy,
    });

    addContextEntry(ctx, {
      role: 'prediction',
      content: `Enhanced ensemble forecast: ${predictions.length} metrics × 6 months, XAI enabled, adaptive weights, avg improvement vs 2-model baseline: ${vulnImprovement.improvementPct.toFixed(1)}%`,
      model: '5-model-ensemble + XAI + adaptive-retraining',
      confidence: Math.min(...predictions.map(p => p.predictedValues[0]?.confidence ?? 0.7)),
    });

    stages.push({
      name: 'Predictive Analytics (Enhanced 5-Model Ensemble + XAI)',
      model: 'linear-regression + exp-smoothing + holt-linear-trend + weighted-MA + polynomial-regression + XAI',
      status: 'completed',
      durationMs: Date.now() - s4Start,
      outputSummary: `${predictions.length} metrics × 6 months | ensemble weights adaptive | XAI explanations attached | inference ${vulnResult.latencyMs + potResult.latencyMs + totalResult.latencyMs}ms`,
    });

    // ---- STAGE 5: Risk Assessment ----
    const s5Start = Date.now();
    const latestMonth = sortedMonths[sortedMonths.length - 1];
    const latestData = latestMonth ? latestMonth[1] : { vuln: 0, pot: 0, notVuln: 0, total: 1, count: 0 };

    const vulnRate = latestData.total > 0 ? latestData.vuln / latestData.total : 0;
    const potRate = latestData.total > 0 ? latestData.pot / latestData.total : 0;
    const trendFactor = vulnRegression.slope > 0 ? Math.min(20, vulnRegression.slope / 100000) : 0;
    const anomalyFactor = anomalies.filter(a => a.severity === 'critical').length * 10;

    const riskScore = Math.min(100, Math.round(
      vulnRate * 200 + potRate * 100 + trendFactor + anomalyFactor + (seasonality.seasonal ? 5 : 0)
    ));

    const riskLevel: RiskAssessment['level'] =
      riskScore >= 75 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low';

    const riskAssessment: RiskAssessment = {
      overallScore: riskScore,
      level: riskLevel,
      factors: [
        { factor: 'Current Vulnerability Rate', weight: 0.35, score: Math.round(vulnRate * 100), trend: vulnRegression.slope > 0 ? 'increasing' : 'stable' },
        { factor: 'Potential Vulnerability Rate', weight: 0.25, score: Math.round(potRate * 100), trend: potRegression.slope > 0 ? 'increasing' : 'stable' },
        { factor: 'Trend Momentum', weight: 0.20, score: Math.min(100, Math.round(Math.abs(trendFactor) * 5)), trend: vulnRegression.slope > 0 ? 'worsening' : 'improving' },
        { factor: 'Anomaly Frequency', weight: 0.10, score: Math.min(100, anomalyFactor * 10), trend: anomalies.length > 2 ? 'concerning' : 'normal' },
        { factor: 'Seasonal Exposure', weight: 0.10, score: seasonality.seasonal ? 60 : 10, trend: seasonality.seasonal ? 'cyclical' : 'none' },
      ],
      mitigationPriorities: [],
    };

    // Generate mitigation priorities
    if (vulnRate > 0.02) riskAssessment.mitigationPriorities.push('Accelerate patching for confirmed vulnerable assets');
    if (potRate > 0.10) riskAssessment.mitigationPriorities.push('Prioritize assessment of potentially vulnerable assets');
    if (vulnRegression.slope > 0) riskAssessment.mitigationPriorities.push('Investigate root cause of increasing vulnerability trend');
    if (anomalies.some(a => a.severity === 'critical')) riskAssessment.mitigationPriorities.push('Review critical anomaly periods for incident response');
    riskAssessment.mitigationPriorities.push('Maintain continuous monitoring and automated scanning');

    stages.push({
      name: 'Risk Assessment',
      model: 'weighted-composite-scoring',
      status: 'completed',
      durationMs: Date.now() - s5Start,
      outputSummary: `Risk score: ${riskScore}/100 (${riskLevel})`,
    });

    // ---- STAGE 6: Recommendation Engine ----
    const s6Start = Date.now();
    const recommendations: RecommendationResult[] = [];

    // Generate contextual recommendations
    if (riskScore >= 50) {
      recommendations.push({
        id: `rec-${Date.now()}-1`,
        priority: 'immediate',
        category: 'security',
        title: 'Accelerate Vulnerability Remediation',
        description: `Current risk score is ${riskScore}/100. Immediate focus on reducing ${latestData.vuln.toLocaleString()} confirmed vulnerabilities across ${customerAgg.size} customers.`,
        impact: `Estimated ${Math.round(riskScore * 0.3)}% risk reduction with focused patching campaign`,
        confidence: 0.92,
        estimatedEffort: '1-2 weeks',
        relatedInsights: anomalies.filter(a => a.severity === 'critical').map(a => a.period),
      });
    }

    if (vulnRegression.slope > 0) {
      recommendations.push({
        id: `rec-${Date.now()}-2`,
        priority: 'short-term',
        category: 'operational',
        title: 'Implement Proactive Threat Hunting',
        description: `Vulnerability trend is increasing at ${Math.round(vulnRegression.slope).toLocaleString()}/month. Deploy automated scanning and threat hunting to reverse the trend.`,
        impact: 'Prevent projected increase and flatten vulnerability curve',
        confidence: 0.87,
        estimatedEffort: '2-4 weeks',
        relatedInsights: ['trend_analysis'],
      });
    }

    const highRiskCustomers = Array.from(customerAgg.entries())
      .filter(([, c]) => c.total > 0 && c.vuln / c.total > 0.05)
      .length;

    if (highRiskCustomers > 0) {
      recommendations.push({
        id: `rec-${Date.now()}-3`,
        priority: 'immediate',
        category: 'strategic',
        title: 'High-Risk Customer Engagement',
        description: `${highRiskCustomers} customers have vulnerability rates exceeding 5%. Initiate targeted remediation programs.`,
        impact: `Protect ${highRiskCustomers} high-value customer relationships`,
        confidence: 0.90,
        estimatedEffort: '1-3 weeks per customer',
        relatedInsights: ['customer_risk_clustering'],
      });
    }

    if (potRate > 0.10) {
      recommendations.push({
        id: `rec-${Date.now()}-4`,
        priority: 'short-term',
        category: 'operational',
        title: 'Potentially Vulnerable Asset Assessment',
        description: `${(potRate * 100).toFixed(1)}% of assets are potentially vulnerable. Systematic assessment could reclassify and reduce risk exposure.`,
        impact: `Reduce uncertainty for ${latestData.pot.toLocaleString()} assets`,
        confidence: 0.85,
        estimatedEffort: '3-6 weeks',
        relatedInsights: ['potentially_vulnerable_analysis'],
      });
    }

    recommendations.push({
      id: `rec-${Date.now()}-5`,
      priority: 'long-term',
      category: 'compliance',
      title: 'Establish Continuous Compliance Monitoring',
      description: `Implement automated compliance checks aligned with ${sortedMonths.length}-month data history for trend-aware governance.`,
      impact: 'Full compliance visibility with predictive risk alerts',
      confidence: 0.82,
      estimatedEffort: '2-3 months',
      relatedInsights: ['trend_analysis', 'seasonality'],
    });

    stages.push({
      name: 'Recommendation Engine',
      model: 'context-aware-rule-engine + risk-weighted-scoring',
      status: 'completed',
      durationMs: Date.now() - s6Start,
      outputSummary: `${recommendations.length} recommendations (${recommendations.filter(r => r.priority === 'immediate').length} immediate)`,
    });

    // ---- Compile insights ----
    const insights: AggregatedInsight[] = [];

    if (anomalies.some(a => a.severity === 'critical')) {
      insights.push({
        id: `ins-anomaly-${Date.now()}`,
        category: 'anomaly',
        title: 'Critical Anomalies Detected',
        description: `${anomalies.filter(a => a.severity === 'critical').length} critical anomalies found in vulnerability data`,
        severity: 'critical',
        confidence: 0.92,
        dataPoints: records.length,
        generatedBy: 'z-score + drift-detection',
        timestamp: Date.now(),
      });
    }

    insights.push({
      id: `ins-risk-${Date.now()}`,
      category: 'risk',
      title: `Overall Risk: ${riskLevel.toUpperCase()}`,
      description: `Composite risk score of ${riskScore}/100 based on ${riskAssessment.factors.length} weighted factors`,
      severity: riskLevel === 'critical' ? 'critical' : riskLevel === 'high' ? 'high' : riskLevel === 'medium' ? 'medium' : 'low',
      confidence: 0.88,
      dataPoints: records.length,
      generatedBy: 'weighted-composite-scoring',
      timestamp: Date.now(),
    });

    for (const p of patterns) {
      insights.push({
        id: `ins-pattern-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        category: 'pattern',
        title: `Pattern: ${p.patternType}`,
        description: p.description,
        severity: p.confidence > 0.8 ? 'medium' : 'low',
        confidence: p.confidence,
        dataPoints: records.length,
        generatedBy: 'multi-algorithm-pattern-engine',
        timestamp: Date.now(),
      });
    }

    ctx.pipelineState = 'complete';
    ctx.completedAt = Date.now();
    ctx.aggregatedInsights = insights;

    const result: MLPipelineResult = {
      sessionId: ctx.sessionId,
      pipelineStages: stages,
      insights,
      predictions,
      anomalies,
      patterns,
      recommendations,
      riskAssessment,
      cached: false,
      mlEngineVersion: 'v2.0-ensemble5-xai-adaptive',
      performanceMetrics: {
        totalDurationMs: Date.now() - pipelineStart,
        stagesCompleted: stages.filter(s => s.status === 'completed').length,
        modelsUsed: stages.map(s => s.model),
      },
    };

    // Cache the result
    cachedPipelineResult = result;
    cacheTimestamp = Date.now();

    return result;
  } catch (error: any) {
    ctx.pipelineState = 'error';
    stages.push({
      name: 'Pipeline Error',
      model: 'error-handler',
      status: 'error',
      durationMs: Date.now() - pipelineStart,
      outputSummary: error.message || 'Unknown error',
    });
    throw error;
  }
}

// ============================================================================
// 6. API USAGE MONITORING & OPTIMIZATION
// ============================================================================

interface UsageSnapshot {
  timestamp: number;
  keyId: string;
  endpoint: string;
  latencyMs: number;
  success: boolean;
  tokensUsed?: number;
}

const usageLog: UsageSnapshot[] = [];
const MAX_USAGE_LOG = 10000;

let systemKeyRoundRobin = 0;

export function recordAPIUsage(snapshot: UsageSnapshot): void {
  usageLog.push(snapshot);
  if (usageLog.length > MAX_USAGE_LOG) usageLog.splice(0, usageLog.length - MAX_USAGE_LOG);

  // For 'system' calls, distribute metrics across keys in round-robin fashion
  let targetKeyId = snapshot.keyId;
  if (targetKeyId === 'system' && CIRCUIT_KEYS.length > 0) {
    targetKeyId = CIRCUIT_KEYS[systemKeyRoundRobin % CIRCUIT_KEYS.length].id;
    systemKeyRoundRobin++;
  }

  // Update key metrics
  const key = CIRCUIT_KEYS.find(k => k.id === targetKeyId);
  if (key) {
    key.metrics.totalRequests++;
    if (snapshot.success) key.metrics.successCount++;
    else {
      key.metrics.failureCount++;
      key.metrics.errorsByType['failure'] = (key.metrics.errorsByType['failure'] || 0) + 1;
    }
    key.metrics.lastUsed = snapshot.timestamp;
    key.metrics.avgLatencyMs = (key.metrics.avgLatencyMs * (key.metrics.totalRequests - 1) + snapshot.latencyMs) / key.metrics.totalRequests;

    // Update p95
    key.metrics.requestHistory.push({ ts: snapshot.timestamp, latency: snapshot.latencyMs, ok: snapshot.success, endpoint: snapshot.endpoint });
    if (key.metrics.requestHistory.length > 1000) key.metrics.requestHistory.splice(0, key.metrics.requestHistory.length - 1000);
    const sorted = [...key.metrics.requestHistory].sort((a, b) => a.latency - b.latency);
    const p95Idx = Math.floor(sorted.length * 0.95);
    key.metrics.p95LatencyMs = sorted[p95Idx]?.latency || 0;

    // Rate limit tracking with automatic daily reset
    const now = Date.now();
    if (key.rateLimits.resetAt > 0 && now > key.rateLimits.resetAt) {
      // Reset daily quota
      key.rateLimits.remaining = key.rateLimits.rpd;
      key.rateLimits.resetAt = now + 86400000; // next 24h
    } else if (key.rateLimits.resetAt === 0) {
      // First use: set reset time to 24h from now
      key.rateLimits.resetAt = now + 86400000;
    }
    key.rateLimits.remaining = Math.max(0, key.rateLimits.remaining - 1);
  }
}

export function getUsageAnalytics(): {
  totalCalls: number;
  successRate: number;
  avgLatency: number;
  p95Latency: number;
  keyBreakdown: Array<{ keyId: string; calls: number; successRate: number; avgLatency: number }>;
  hourlyDistribution: Array<{ hour: number; calls: number }>;
  endpointBreakdown: Array<{ endpoint: string; calls: number; avgLatency: number }>;
  recommendations: string[];
} {
  const total = usageLog.length;
  const successes = usageLog.filter(u => u.success).length;
  const latencies = usageLog.map(u => u.latencyMs);

  const hourly = new Map<number, number>();
  const endpoints = new Map<string, { calls: number; totalLatency: number }>();

  for (const u of usageLog) {
    const hour = new Date(u.timestamp).getHours();
    hourly.set(hour, (hourly.get(hour) || 0) + 1);

    const ep = endpoints.get(u.endpoint) || { calls: 0, totalLatency: 0 };
    ep.calls++;
    ep.totalLatency += u.latencyMs;
    endpoints.set(u.endpoint, ep);
  }

  const recs: string[] = [];
  const successRate = total > 0 ? successes / total : 1;
  if (successRate < 0.95) recs.push('Success rate below 95% - consider implementing retry logic with exponential backoff');
  if (latencies.length > 0 && latencies.reduce((a, b) => a + b, 0) / latencies.length > 2000) {
    recs.push('Average latency exceeds 2s - consider response caching or batch processing');
  }

  return {
    totalCalls: total,
    successRate,
    avgLatency: total > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / total) : 0,
    p95Latency: total > 0 ? latencies.sort((a, b) => a - b)[Math.floor(total * 0.95)] || 0 : 0,
    keyBreakdown: CIRCUIT_KEYS.map(k => ({
      keyId: k.id,
      calls: k.metrics.totalRequests,
      successRate: k.metrics.totalRequests > 0 ? k.metrics.successCount / k.metrics.totalRequests : 1,
      avgLatency: Math.round(k.metrics.avgLatencyMs),
      p95Latency: Math.round(k.metrics.p95LatencyMs),
      remaining: k.rateLimits.remaining,
      lastUsed: k.metrics.lastUsed ? new Date(k.metrics.lastUsed).toISOString() : 'never',
    })),
    hourlyDistribution: Array.from({ length: 24 }, (_, h) => ({ hour: h, calls: hourly.get(h) || 0 })),
    endpointBreakdown: Array.from(endpoints.entries()).map(([endpoint, data]) => ({
      endpoint,
      calls: data.calls,
      avgLatency: Math.round(data.totalLatency / data.calls),
    })),
    recommendations: recs,
  };
}

export function getKeyStatus(): Array<{
  keyId: string;
  purpose: string;
  domain: string;
  status: string;
  capabilities: string[];
  rateLimits: { rpm: number; rpd: number; remaining: number };
  metrics: { total: number; success: number; failure: number; avgLatency: number };
  lastValidated: string;
}> {
  return CIRCUIT_KEYS.map(k => ({
    keyId: k.id,
    purpose: k.purpose,
    domain: k.domain,
    status: k.status,
    capabilities: k.capabilities,
    rateLimits: k.rateLimits,
    metrics: {
      total: k.metrics.totalRequests,
      success: k.metrics.successCount,
      failure: k.metrics.failureCount,
      avgLatency: Math.round(k.metrics.avgLatencyMs),
    },
    lastValidated: k.lastValidated ? new Date(k.lastValidated).toISOString() : 'never',
  }));
}

// Helper
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}
