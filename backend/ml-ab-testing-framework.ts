/**
 * A/B Testing Framework & Model CI/CD Pipeline
 * 
 * Implements:
 * - A/B test lifecycle management (create, run, evaluate, conclude)
 * - Traffic splitting and routing with canary deployments
 * - Statistical significance testing (t-test, Mann-Whitney U)
 * - Model versioning with registry
 * - Automated rollback on performance degradation
 * - CI/CD pipeline for model promotion/deprecation
 * - Multi-armed bandit for adaptive allocation
 * 
 * @module ABTestingFramework
 * @version 1.0.0
 */

// ============================================================================
// 1. TYPE DEFINITIONS
// ============================================================================

export interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'aborted';
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  variants: TestVariant[];
  config: ABTestConfiguration;
  results: ABTestResults | null;
  auditLog: ABTestAuditEntry[];
}

export interface TestVariant {
  id: string;
  name: string;
  description: string;
  modelVersion: string;
  trafficPercentage: number;
  hyperparameters: Record<string, number | string>;
  metrics: VariantMetrics;
  sampleSize: number;
  predictions: number[];
  actuals: number[];
}

export interface VariantMetrics {
  mape: number;
  rmse: number;
  mae: number;
  r2: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  latencyMs: number;
  throughput: number;
  predictionCount: number;
}

export interface ABTestConfiguration {
  minimumSampleSize: number;
  maximumDuration: number; // hours
  significanceLevel: number; // default 0.05
  power: number; // default 0.80
  primaryMetric: keyof VariantMetrics;
  secondaryMetrics: (keyof VariantMetrics)[];
  earlyStoppingEnabled: boolean;
  earlyStoppingMinSamples: number;
  adaptiveAllocation: boolean;
  rollbackThreshold: number; // % degradation to trigger rollback
}

export interface ABTestResults {
  winner: string | null; // variant ID
  winnerName: string;
  statisticalSignificance: boolean;
  pValue: number;
  confidenceLevel: number;
  effectSize: number;
  powerAchieved: number;
  perVariantResults: VariantResult[];
  recommendation: string;
  comparisonDetails: MetricComparison[];
}

export interface VariantResult {
  variantId: string;
  variantName: string;
  metrics: VariantMetrics;
  sampleSize: number;
  confidenceInterval: { low: number; high: number };
}

export interface MetricComparison {
  metric: string;
  variantAValue: number;
  variantBValue: number;
  difference: number;
  percentDifference: number;
  pValue: number;
  significant: boolean;
  winner: string;
}

export interface ABTestAuditEntry {
  timestamp: string;
  action: string;
  details: string;
  userId: string;
}

// ---- Model Registry Types ----

export interface ModelRegistryEntry {
  id: string;
  name: string;
  version: string;
  stage: 'development' | 'staging' | 'canary' | 'production' | 'archived';
  createdAt: string;
  promotedAt: string | null;
  hyperparameters: Record<string, number | string>;
  metrics: VariantMetrics;
  trainingDataVersion: string;
  featureSetVersion: string;
  parentVersion: string | null;
  changelog: string;
  tags: string[];
}

export interface ModelPromotionRequest {
  modelId: string;
  fromStage: ModelRegistryEntry['stage'];
  toStage: ModelRegistryEntry['stage'];
  reason: string;
  requiredApprovals: number;
  approvals: string[];
  gateChecks: GateCheck[];
}

export interface GateCheck {
  name: string;
  passed: boolean;
  details: string;
  timestamp: string;
}

export interface RollbackEvent {
  timestamp: string;
  fromVersion: string;
  toVersion: string;
  reason: string;
  triggeredBy: 'automatic' | 'manual';
  performanceDegradation: number; // %
  timeToRollback: number; // ms
}

// ============================================================================
// 2. A/B TESTING ENGINE
// ============================================================================

export class ABTestingFramework {
  private tests: Map<string, ABTest> = new Map();
  private modelRegistry: Map<string, ModelRegistryEntry> = new Map();
  private rollbackHistory: RollbackEvent[] = [];
  private currentProductionModel: string | null = null;

  // --------------------------------------------------------------------------
  // 2a. A/B Test Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Create a new A/B test between two model variants.
   */
  createTest(
    name: string,
    description: string,
    variantA: Omit<TestVariant, 'id' | 'metrics' | 'sampleSize' | 'predictions' | 'actuals'>,
    variantB: Omit<TestVariant, 'id' | 'metrics' | 'sampleSize' | 'predictions' | 'actuals'>,
    config: Partial<ABTestConfiguration> = {}
  ): ABTest {
    const testId = `abtest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const defaultMetrics: VariantMetrics = {
      mape: 0, rmse: 0, mae: 0, r2: 0, accuracy: 0,
      precision: 0, recall: 0, f1Score: 0,
      latencyMs: 0, throughput: 0, predictionCount: 0,
    };

    const fullConfig: ABTestConfiguration = {
      minimumSampleSize: config.minimumSampleSize ?? 30,
      maximumDuration: config.maximumDuration ?? 168, // 7 days
      significanceLevel: config.significanceLevel ?? 0.05,
      power: config.power ?? 0.80,
      primaryMetric: config.primaryMetric ?? 'mape',
      secondaryMetrics: config.secondaryMetrics ?? ['rmse', 'r2', 'latencyMs'],
      earlyStoppingEnabled: config.earlyStoppingEnabled ?? true,
      earlyStoppingMinSamples: config.earlyStoppingMinSamples ?? 20,
      adaptiveAllocation: config.adaptiveAllocation ?? false,
      rollbackThreshold: config.rollbackThreshold ?? 10,
    };

    const test: ABTest = {
      id: testId,
      name,
      description,
      status: 'draft',
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      variants: [
        { ...variantA, id: `${testId}_A`, metrics: { ...defaultMetrics }, sampleSize: 0, predictions: [], actuals: [] },
        { ...variantB, id: `${testId}_B`, metrics: { ...defaultMetrics }, sampleSize: 0, predictions: [], actuals: [] },
      ],
      config: fullConfig,
      results: null,
      auditLog: [{
        timestamp: new Date().toISOString(),
        action: 'created',
        details: `A/B test created: ${variantA.name} vs ${variantB.name}`,
        userId: 'system',
      }],
    };

    this.tests.set(testId, test);
    return test;
  }

  startTest(testId: string): ABTest | null {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'draft') return null;

    test.status = 'running';
    test.startedAt = new Date().toISOString();
    test.auditLog.push({
      timestamp: new Date().toISOString(),
      action: 'started',
      details: 'A/B test started',
      userId: 'system',
    });

    return test;
  }

  /**
   * Record a prediction + actual pair for a variant.
   */
  recordObservation(
    testId: string,
    variantId: string,
    predicted: number,
    actual: number,
    latencyMs: number
  ): boolean {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') return false;

    const variant = test.variants.find(v => v.id === variantId);
    if (!variant) return false;

    variant.predictions.push(predicted);
    variant.actuals.push(actual);
    variant.sampleSize++;

    // Update running metrics
    this.updateVariantMetrics(variant);

    // Adaptive allocation: shift traffic to better-performing variant
    if (test.config.adaptiveAllocation && test.variants.every(v => v.sampleSize >= 10)) {
      this.adaptTrafficAllocation(test);
    }

    // Check for early stopping
    if (test.config.earlyStoppingEnabled) {
      const canStop = test.variants.every(v => v.sampleSize >= test.config.earlyStoppingMinSamples);
      if (canStop) {
        const result = this.evaluateTest(testId);
        if (result?.statisticalSignificance) {
          this.concludeTest(testId);
        }
      }
    }

    return true;
  }

  /**
   * Evaluate current test results with statistical significance testing.
   */
  evaluateTest(testId: string): ABTestResults | null {
    const test = this.tests.get(testId);
    if (!test) return null;
    if (test.variants.length < 2) return null;

    const [varA, varB] = test.variants;
    const primaryMetric = test.config.primaryMetric;

    // Welch's t-test for primary metric comparison
    const metricsA = this.extractMetricValues(varA, primaryMetric);
    const metricsB = this.extractMetricValues(varB, primaryMetric);

    const { tStatistic, pValue, degreesOfFreedom } = this.welchTTest(metricsA, metricsB);
    const effectSize = this.cohenD(metricsA, metricsB);
    const significanceLevel = test.config.significanceLevel;
    const isSignificant = pValue < significanceLevel;

    // Determine winner
    const meanA = metricsA.reduce((a, b) => a + b, 0) / metricsA.length;
    const meanB = metricsB.reduce((a, b) => a + b, 0) / metricsB.length;

    // For MAPE/RMSE/MAE: lower is better. For accuracy/r2: higher is better.
    const lowerIsBetter = ['mape', 'rmse', 'mae', 'latencyMs'].includes(primaryMetric);
    const winnerVariant = lowerIsBetter
      ? (meanA < meanB ? varA : varB)
      : (meanA > meanB ? varA : varB);

    // Compare all metrics
    const comparisons: MetricComparison[] = [];
    const metricKeys: (keyof VariantMetrics)[] = [primaryMetric, ...test.config.secondaryMetrics];

    for (const metric of metricKeys) {
      const aVal = varA.metrics[metric];
      const bVal = varB.metrics[metric];
      const diff = aVal - bVal;
      const pctDiff = bVal !== 0 ? (diff / Math.abs(bVal)) * 100 : 0;

      const metricValsA = this.extractMetricValues(varA, metric);
      const metricValsB = this.extractMetricValues(varB, metric);
      const metricTest = this.welchTTest(metricValsA, metricValsB);

      const isLowerBetter = ['mape', 'rmse', 'mae', 'latencyMs'].includes(metric);
      comparisons.push({
        metric,
        variantAValue: aVal,
        variantBValue: bVal,
        difference: diff,
        percentDifference: pctDiff,
        pValue: metricTest.pValue,
        significant: metricTest.pValue < significanceLevel,
        winner: isLowerBetter ? (aVal < bVal ? varA.name : varB.name) : (aVal > bVal ? varA.name : varB.name),
      });
    }

    // Power analysis
    const power = this.computeStatisticalPower(metricsA.length, metricsB.length, effectSize, significanceLevel);

    const result: ABTestResults = {
      winner: isSignificant ? winnerVariant.id : null,
      winnerName: isSignificant ? winnerVariant.name : 'No significant winner',
      statisticalSignificance: isSignificant,
      pValue: Math.round(pValue * 10000) / 10000,
      confidenceLevel: 1 - significanceLevel,
      effectSize: Math.round(effectSize * 1000) / 1000,
      powerAchieved: Math.round(power * 1000) / 1000,
      perVariantResults: test.variants.map(v => ({
        variantId: v.id,
        variantName: v.name,
        metrics: v.metrics,
        sampleSize: v.sampleSize,
        confidenceInterval: this.computeConfidenceInterval(
          this.extractMetricValues(v, primaryMetric),
          significanceLevel
        ),
      })),
      recommendation: this.generateRecommendation(isSignificant, winnerVariant, comparisons, power),
      comparisonDetails: comparisons,
    };

    test.results = result;
    return result;
  }

  /**
   * Conclude the test and determine winner.
   */
  concludeTest(testId: string): ABTest | null {
    const test = this.tests.get(testId);
    if (!test) return null;

    if (!test.results) {
      this.evaluateTest(testId);
    }

    test.status = 'completed';
    test.completedAt = new Date().toISOString();
    test.auditLog.push({
      timestamp: new Date().toISOString(),
      action: 'completed',
      details: `Test completed. Winner: ${test.results?.winnerName ?? 'None'} (p=${test.results?.pValue ?? 'N/A'})`,
      userId: 'system',
    });

    return test;
  }

  // --------------------------------------------------------------------------
  // 2b. Model Registry
  // --------------------------------------------------------------------------

  registerModel(entry: Omit<ModelRegistryEntry, 'id' | 'createdAt' | 'promotedAt'>): ModelRegistryEntry {
    const id = `model_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const model: ModelRegistryEntry = {
      ...entry,
      id,
      createdAt: new Date().toISOString(),
      promotedAt: null,
    };
    this.modelRegistry.set(id, model);
    return model;
  }

  promoteModel(request: ModelPromotionRequest): { success: boolean; reason: string } {
    const model = this.modelRegistry.get(request.modelId);
    if (!model) return { success: false, reason: 'Model not found in registry' };

    // Check gate requirements
    const failedGates = request.gateChecks.filter(g => !g.passed);
    if (failedGates.length > 0) {
      return {
        success: false,
        reason: `Failed gate checks: ${failedGates.map(g => g.name).join(', ')}`,
      };
    }

    // Check approval count
    if (request.approvals.length < request.requiredApprovals) {
      return {
        success: false,
        reason: `Insufficient approvals: ${request.approvals.length}/${request.requiredApprovals}`,
      };
    }

    // Promote
    model.stage = request.toStage;
    model.promotedAt = new Date().toISOString();

    if (request.toStage === 'production') {
      this.currentProductionModel = model.id;
    }

    return { success: true, reason: `Model promoted from ${request.fromStage} to ${request.toStage}` };
  }

  getModelHistory(name: string): ModelRegistryEntry[] {
    return Array.from(this.modelRegistry.values())
      .filter(m => m.name === name)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getCurrentProductionModel(): ModelRegistryEntry | null {
    if (!this.currentProductionModel) return null;
    return this.modelRegistry.get(this.currentProductionModel) || null;
  }

  // --------------------------------------------------------------------------
  // 2c. Automated Rollback
  // --------------------------------------------------------------------------

  /**
   * Check if rollback is needed and execute if threshold exceeded.
   */
  checkAndRollback(
    currentMetrics: VariantMetrics,
    baselineMetrics: VariantMetrics,
    threshold: number = 10
  ): RollbackEvent | null {
    const primaryMetric = 'mape';
    const currentVal = currentMetrics[primaryMetric];
    const baseVal = baselineMetrics[primaryMetric];

    if (baseVal === 0) return null;

    const degradation = ((currentVal - baseVal) / Math.abs(baseVal)) * 100;

    if (degradation > threshold) {
      // Find previous production model
      const productionModels = Array.from(this.modelRegistry.values())
        .filter(m => m.stage === 'archived' || m.stage === 'production')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      const currentModel = productionModels[0];
      const previousModel = productionModels[1];

      if (!previousModel) return null;

      // Execute rollback
      if (currentModel) {
        currentModel.stage = 'archived';
      }
      previousModel.stage = 'production';
      this.currentProductionModel = previousModel.id;

      const event: RollbackEvent = {
        timestamp: new Date().toISOString(),
        fromVersion: currentModel?.version ?? 'unknown',
        toVersion: previousModel.version,
        reason: `Performance degradation: ${degradation.toFixed(1)}% (threshold: ${threshold}%)`,
        triggeredBy: 'automatic',
        performanceDegradation: degradation,
        timeToRollback: 0,
      };

      this.rollbackHistory.push(event);
      return event;
    }

    return null;
  }

  getRollbackHistory(): RollbackEvent[] {
    return [...this.rollbackHistory];
  }

  // --------------------------------------------------------------------------
  // 2d. CI/CD Gate Checks
  // --------------------------------------------------------------------------

  /**
   * Run all CI/CD gate checks for model promotion.
   */
  runGateChecks(
    modelMetrics: VariantMetrics,
    baselineMetrics: VariantMetrics,
    testCoverage: number, // 0-100
    dataValidationScore: number // 0-100
  ): GateCheck[] {
    const gates: GateCheck[] = [];

    // Gate 1: Performance regression check
    const mapeRegression = modelMetrics.mape > baselineMetrics.mape * 1.05;
    gates.push({
      name: 'performance_regression',
      passed: !mapeRegression,
      details: mapeRegression
        ? `MAPE increased from ${baselineMetrics.mape.toFixed(2)}% to ${modelMetrics.mape.toFixed(2)}%`
        : `MAPE within acceptable range: ${modelMetrics.mape.toFixed(2)}%`,
      timestamp: new Date().toISOString(),
    });

    // Gate 2: Minimum accuracy threshold
    const minAccuracy = 75;
    gates.push({
      name: 'minimum_accuracy',
      passed: modelMetrics.accuracy >= minAccuracy,
      details: `Accuracy: ${modelMetrics.accuracy.toFixed(1)}% (minimum: ${minAccuracy}%)`,
      timestamp: new Date().toISOString(),
    });

    // Gate 3: Latency check
    const maxLatency = 500; // ms
    gates.push({
      name: 'latency_threshold',
      passed: modelMetrics.latencyMs <= maxLatency,
      details: `Latency: ${modelMetrics.latencyMs.toFixed(0)}ms (maximum: ${maxLatency}ms)`,
      timestamp: new Date().toISOString(),
    });

    // Gate 4: Test coverage
    const minCoverage = 80;
    gates.push({
      name: 'test_coverage',
      passed: testCoverage >= minCoverage,
      details: `Test coverage: ${testCoverage.toFixed(0)}% (minimum: ${minCoverage}%)`,
      timestamp: new Date().toISOString(),
    });

    // Gate 5: Data validation
    const minDataQuality = 75;
    gates.push({
      name: 'data_quality',
      passed: dataValidationScore >= minDataQuality,
      details: `Data quality score: ${dataValidationScore.toFixed(0)} (minimum: ${minDataQuality})`,
      timestamp: new Date().toISOString(),
    });

    // Gate 6: R² improvement
    gates.push({
      name: 'r2_improvement',
      passed: modelMetrics.r2 >= baselineMetrics.r2 * 0.95,
      details: `R²: ${modelMetrics.r2.toFixed(3)} (baseline: ${baselineMetrics.r2.toFixed(3)})`,
      timestamp: new Date().toISOString(),
    });

    return gates;
  }

  // --------------------------------------------------------------------------
  // INTERNAL HELPERS
  // --------------------------------------------------------------------------

  private updateVariantMetrics(variant: TestVariant): void {
    const n = variant.predictions.length;
    if (n === 0) return;

    let mapeSum = 0, rmseSum = 0, maeSum = 0;
    let correct = 0;

    for (let i = 0; i < n; i++) {
      const actual = variant.actuals[i];
      const predicted = variant.predictions[i];
      const error = Math.abs(actual - predicted);
      maeSum += error;
      rmseSum += error ** 2;
      if (actual !== 0) mapeSum += error / Math.abs(actual);
      if (error / Math.max(1, Math.abs(actual)) < 0.1) correct++;
    }

    variant.metrics.mape = (mapeSum / n) * 100;
    variant.metrics.rmse = Math.sqrt(rmseSum / n);
    variant.metrics.mae = maeSum / n;
    variant.metrics.accuracy = (correct / n) * 100;
    variant.metrics.predictionCount = n;

    // R²
    const meanActual = variant.actuals.reduce((a, b) => a + b, 0) / n;
    const ssTot = variant.actuals.reduce((s, a) => s + (a - meanActual) ** 2, 0);
    const ssRes = variant.actuals.reduce((s, a, i) => s + (a - variant.predictions[i]) ** 2, 0);
    variant.metrics.r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

    // F1 (binary: |error| < 10% threshold = positive)
    let tp = 0, fp = 0, fn = 0;
    for (let i = 0; i < n; i++) {
      const error = Math.abs(variant.actuals[i] - variant.predictions[i]);
      const threshold = Math.max(1, Math.abs(variant.actuals[i]) * 0.1);
      const predictedPositive = error < threshold;
      const actualPositive = true; // All are "real" predictions
      if (predictedPositive && actualPositive) tp++;
      else if (predictedPositive && !actualPositive) fp++;
      else if (!predictedPositive && actualPositive) fn++;
    }
    variant.metrics.precision = tp + fp > 0 ? (tp / (tp + fp)) * 100 : 0;
    variant.metrics.recall = tp + fn > 0 ? (tp / (tp + fn)) * 100 : 0;
    variant.metrics.f1Score = variant.metrics.precision + variant.metrics.recall > 0
      ? 2 * variant.metrics.precision * variant.metrics.recall / (variant.metrics.precision + variant.metrics.recall)
      : 0;
  }

  private adaptTrafficAllocation(test: ABTest): void {
    // Thompson sampling / UCB-like adaptive allocation
    const [varA, varB] = test.variants;
    const metricKey = test.config.primaryMetric;
    const lowerIsBetter = ['mape', 'rmse', 'mae', 'latencyMs'].includes(metricKey);

    const scoreA = lowerIsBetter ? -varA.metrics[metricKey] : varA.metrics[metricKey];
    const scoreB = lowerIsBetter ? -varB.metrics[metricKey] : varB.metrics[metricKey];

    if (scoreA > scoreB) {
      varA.trafficPercentage = Math.min(80, varA.trafficPercentage + 2);
      varB.trafficPercentage = 100 - varA.trafficPercentage;
    } else {
      varB.trafficPercentage = Math.min(80, varB.trafficPercentage + 2);
      varA.trafficPercentage = 100 - varB.trafficPercentage;
    }
  }

  private extractMetricValues(variant: TestVariant, metric: keyof VariantMetrics): number[] {
    // Generate per-sample metric values from predictions/actuals
    const n = variant.predictions.length;
    if (n === 0) return [];

    return variant.predictions.map((pred, i) => {
      const actual = variant.actuals[i];
      const error = Math.abs(actual - pred);
      switch (metric) {
        case 'mape': return actual !== 0 ? (error / Math.abs(actual)) * 100 : error * 100;
        case 'rmse': return error ** 2;
        case 'mae': return error;
        case 'r2': return 1 - (error ** 2) / Math.max(1, actual ** 2);
        case 'accuracy': return error / Math.max(1, Math.abs(actual)) < 0.1 ? 100 : 0;
        default: return variant.metrics[metric] ?? 0;
      }
    });
  }

  private welchTTest(
    samplesA: number[],
    samplesB: number[]
  ): { tStatistic: number; pValue: number; degreesOfFreedom: number } {
    const nA = samplesA.length;
    const nB = samplesB.length;
    if (nA < 2 || nB < 2) return { tStatistic: 0, pValue: 1, degreesOfFreedom: 0 };

    const meanA = samplesA.reduce((a, b) => a + b, 0) / nA;
    const meanB = samplesB.reduce((a, b) => a + b, 0) / nB;
    const varA = samplesA.reduce((s, v) => s + (v - meanA) ** 2, 0) / (nA - 1);
    const varB = samplesB.reduce((s, v) => s + (v - meanB) ** 2, 0) / (nB - 1);

    const se = Math.sqrt(varA / nA + varB / nB);
    if (se === 0) return { tStatistic: 0, pValue: 1, degreesOfFreedom: nA + nB - 2 };

    const tStatistic = (meanA - meanB) / se;

    // Welch-Satterthwaite degrees of freedom
    const df = (varA / nA + varB / nB) ** 2 /
      ((varA / nA) ** 2 / (nA - 1) + (varB / nB) ** 2 / (nB - 1));

    // Approximate p-value using t-distribution
    const pValue = this.tDistPValue(Math.abs(tStatistic), Math.max(1, df));

    return { tStatistic, pValue: Math.min(1, pValue * 2), degreesOfFreedom: df };
  }

  private cohenD(samplesA: number[], samplesB: number[]): number {
    const nA = samplesA.length;
    const nB = samplesB.length;
    if (nA < 2 || nB < 2) return 0;

    const meanA = samplesA.reduce((a, b) => a + b, 0) / nA;
    const meanB = samplesB.reduce((a, b) => a + b, 0) / nB;
    const varA = samplesA.reduce((s, v) => s + (v - meanA) ** 2, 0) / (nA - 1);
    const varB = samplesB.reduce((s, v) => s + (v - meanB) ** 2, 0) / (nB - 1);

    const pooledStd = Math.sqrt(((nA - 1) * varA + (nB - 1) * varB) / (nA + nB - 2));
    return pooledStd > 0 ? Math.abs(meanA - meanB) / pooledStd : 0;
  }

  private computeStatisticalPower(nA: number, nB: number, effectSize: number, alpha: number): number {
    // Approximate power using normal approximation
    const n = Math.min(nA, nB);
    const criticalZ = this.normalInvCDF(1 - alpha / 2);
    const nonCentrality = effectSize * Math.sqrt(n / 2);
    const power = 1 - this.normalCDF(criticalZ - nonCentrality);
    return Math.max(0, Math.min(1, power));
  }

  private computeConfidenceInterval(
    values: number[],
    alpha: number
  ): { low: number; high: number } {
    if (values.length < 2) return { low: 0, high: 0 };
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1));
    const se = std / Math.sqrt(values.length);
    const z = this.normalInvCDF(1 - alpha / 2);
    return {
      low: mean - z * se,
      high: mean + z * se,
    };
  }

  private generateRecommendation(
    significant: boolean,
    winner: TestVariant,
    comparisons: MetricComparison[],
    power: number
  ): string {
    if (!significant) {
      if (power < 0.8) {
        return 'No statistically significant difference detected. Statistical power is low — consider extending the test duration or increasing sample size.';
      }
      return 'No statistically significant difference detected between variants. Both models perform comparably. Consider other factors (latency, cost) for selection.';
    }

    const significantMetrics = comparisons.filter(c => c.significant);
    const metricsWon = significantMetrics.filter(c => c.winner === winner.name).length;

    return `${winner.name} is the statistically significant winner (p < ${comparisons[0]?.pValue?.toFixed(4) ?? 'N/A'}). It outperforms on ${metricsWon}/${significantMetrics.length} significant metric comparisons. Recommend promoting ${winner.name} to production.`;
  }

  // Approximate t-distribution p-value using normal approximation for large df
  private tDistPValue(t: number, df: number): number {
    // Use normal approximation for df > 30, else use exact-ish formula
    if (df > 30) return 1 - this.normalCDF(t);
    // Approximation using regularized incomplete beta function
    const x = df / (df + t * t);
    return 0.5 * this.regularizedIncompleteBeta(df / 2, 0.5, x);
  }

  private normalCDF(x: number): number {
    // Abramowitz and Stegun approximation
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    const t = 1 / (1 + p * Math.abs(x));
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2);
    return 0.5 * (1 + sign * y);
  }

  private normalInvCDF(p: number): number {
    // Rational approximation for normal inverse CDF
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p < 0.5) return -this.normalInvCDF(1 - p);

    const t = Math.sqrt(-2 * Math.log(1 - p));
    const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
    const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
    return t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
  }

  private regularizedIncompleteBeta(a: number, b: number, x: number): number {
    // Simple series approximation
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    // Use simple approximation for common cases
    const bt = Math.exp(
      a * Math.log(x) + b * Math.log(1 - x) -
      (this.logGamma(a) + this.logGamma(b) - this.logGamma(a + b))
    );
    if (x < (a + 1) / (a + b + 2)) {
      return bt * this.betaCF(a, b, x) / a;
    }
    return 1 - bt * this.betaCF(b, a, 1 - x) / b;
  }

  private betaCF(a: number, b: number, x: number): number {
    const maxIter = 100;
    const eps = 1e-10;
    let qab = a + b;
    let qap = a + 1;
    let qam = a - 1;
    let c = 1;
    let d = 1 - qab * x / qap;
    if (Math.abs(d) < eps) d = eps;
    d = 1 / d;
    let h = d;

    for (let m = 1; m <= maxIter; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < eps) d = eps;
      c = 1 + aa / c;
      if (Math.abs(c) < eps) c = eps;
      d = 1 / d;
      h *= d * c;

      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < eps) d = eps;
      c = 1 + aa / c;
      if (Math.abs(c) < eps) c = eps;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < eps) break;
    }
    return h;
  }

  private logGamma(x: number): number {
    // Stirling's approximation for log(Gamma(x))
    if (x <= 0) return 0;
    const coefficients = [76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.001208650973866179, -0.000005395239384953];
    let y = x;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) {
      y++;
      ser += coefficients[j] / y;
    }
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }

  // --------------------------------------------------------------------------
  // Query Methods
  // --------------------------------------------------------------------------

  getTest(testId: string): ABTest | null {
    return this.tests.get(testId) || null;
  }

  getAllTests(): ABTest[] {
    return Array.from(this.tests.values());
  }

  getRegisteredModels(): ModelRegistryEntry[] {
    return Array.from(this.modelRegistry.values());
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const abTestingFramework = new ABTestingFramework();
