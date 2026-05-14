/**
 * Cisco CIRCUIT ML Engine — Enhanced AI/ML Module
 * ================================================
 * Implements ensemble learning, automated feature engineering,
 * real-time adaptive retraining, and explainable AI (XAI).
 *
 * Enhancements over baseline:
 *  - 5-model ensemble with dynamic weight optimization (vs fixed 0.6/0.4)
 *  - Automated feature engineering (lag, rolling stats, rate-of-change, normalization)
 *  - Adaptive model weights updated after each pipeline run (EWMA error tracking)
 *  - XAI: per-prediction feature importance + plain-English reasoning
 *  - Feature precomputation for sub-200ms inference
 *  - Target: ≥15% MAPE improvement over 2-model fixed-weight baseline
 *
 * @module circuit-ml-engine
 */

// ============================================================================
// 1. TYPES
// ============================================================================

export interface TimeSeries {
  labels: string[];   // e.g. ['2025-01', '2025-02', ...]
  values: number[];
}

export interface FeatureVector {
  raw: number;              // original value
  lag1: number;             // previous period value
  lag2: number;             // 2 periods ago
  lag3: number;             // 3 periods ago
  rollingMean3: number;     // 3-period rolling mean
  rollingStd3: number;      // 3-period rolling std
  rollingMean6: number;     // 6-period rolling mean
  rateOfChange: number;     // (raw - lag1) / lag1
  normalised: number;       // z-score normalised
  maDeviation: number;      // deviation from moving average
}

export interface ModelPrediction {
  model: string;
  value: number;
  weight: number;
}

export interface EnsemblePrediction {
  period: string;
  value: number;
  confidence: number;
  interval: { low: number; high: number };
  models: ModelPrediction[];
  xai: XAIExplanation;
}

export interface XAIExplanation {
  primaryDriver: string;
  featureImportance: Array<{ feature: string; importance: number; direction: 'positive' | 'negative' | 'neutral' }>;
  reasoning: string;
  uncertaintyFactors: string[];
  confidenceExplanation: string;
}

export interface ModelAccuracyTracker {
  modelName: string;
  predictions: number;
  sumAbsError: number;
  sumSquaredError: number;
  mape: number;       // Mean Absolute Percentage Error
  rmse: number;       // Root Mean Squared Error
  currentWeight: number;
}

export interface FeatureEngineeredSeries {
  labels: string[];
  features: FeatureVector[];
  stats: { mean: number; std: number; min_: number; max_: number };
}

export interface EnhancedPredictionResult {
  metric: string;
  currentValue: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  r2Score: number;
  ensembleWeights: Record<string, number>;
  forecastHorizon: number;
  predictedValues: EnsemblePrediction[];
  modelAccuracy: ModelAccuracyTracker[];
  featureEngineering: { featuresUsed: string[]; topFeature: string };
  latencyMs: number;
}

// ============================================================================
// 2. ADAPTIVE MODEL WEIGHT REGISTRY (persisted in module scope for retraining)
// ============================================================================

interface WeightRegistry {
  [metricKey: string]: Record<string, ModelAccuracyTracker>;
}

const modelWeights: WeightRegistry = {};

const DEFAULT_WEIGHTS: Record<string, number> = {
  'linear-regression':      0.25,
  'exp-smoothing':          0.20,
  'holt-linear-trend':      0.25,
  'weighted-moving-avg':    0.15,
  'polynomial-regression':  0.15,
};

function getWeights(metricKey: string): Record<string, number> {
  const reg = modelWeights[metricKey];
  if (!reg) return { ...DEFAULT_WEIGHTS };
  const weights: Record<string, number> = {};
  const total = Object.values(reg).reduce((s, t) => s + t.currentWeight, 0);
  for (const [k, v] of Object.entries(reg)) {
    weights[k] = total > 0 ? v.currentWeight / total : DEFAULT_WEIGHTS[k] ?? 0.2;
  }
  return weights;
}

/**
 * Update model error tracking and re-normalise weights.
 * Called once per pipeline run with actual vs predicted pairs for the last known period.
 */
export function updateModelAccuracy(
  metricKey: string,
  actual: number,
  predictedByModel: Record<string, number>
): void {
  if (!modelWeights[metricKey]) {
    modelWeights[metricKey] = {};
    for (const [name, w] of Object.entries(DEFAULT_WEIGHTS)) {
      modelWeights[metricKey][name] = {
        modelName: name, predictions: 0, sumAbsError: 0, sumSquaredError: 0,
        mape: 0, rmse: 0, currentWeight: w,
      };
    }
  }

  const reg = modelWeights[metricKey];

  for (const [name, predicted] of Object.entries(predictedByModel)) {
    if (!reg[name]) continue;
    const absErr = Math.abs(actual - predicted);
    const pctErr = actual !== 0 ? absErr / Math.abs(actual) : absErr;
    reg[name].predictions++;
    reg[name].sumAbsError += absErr;
    reg[name].sumSquaredError += absErr * absErr;
    reg[name].mape = reg[name].sumAbsError / reg[name].predictions / (actual !== 0 ? Math.abs(actual) : 1);
    reg[name].rmse = Math.sqrt(reg[name].sumSquaredError / reg[name].predictions);
  }

  // Inverse-MAPE weighting: lower MAPE → higher weight
  const mapes = Object.values(reg).map(t => t.mape);
  const maxMape = Math.max(...mapes, 0.01);
  const inverseScores = Object.values(reg).map(t => maxMape - t.mape + 0.01);
  const total = inverseScores.reduce((a, b) => a + b, 0);

  Object.values(reg).forEach((t, i) => {
    // Blend with default weights to avoid over-fitting on few samples (EWMA-style)
    const learnedWeight = inverseScores[i] / (total || 1);
    const alpha = Math.min(0.5, t.predictions / 20); // full learning at 20 samples
    t.currentWeight = alpha * learnedWeight + (1 - alpha) * DEFAULT_WEIGHTS[t.modelName];
  });
}

// ============================================================================
// 3. AUTOMATED FEATURE ENGINEERING
// ============================================================================

export function engineerFeatures(series: TimeSeries): FeatureEngineeredSeries {
  const vals = series.values;
  const n = vals.length;
  const mean = n > 0 ? vals.reduce((a, b) => a + b, 0) / n : 0;
  const variance = n > 0 ? vals.reduce((a, v) => a + (v - mean) ** 2, 0) / n : 1;
  const std = Math.sqrt(variance) || 1;
  const min_ = n > 0 ? Math.min(...vals) : 0;
  const max_ = n > 0 ? Math.max(...vals) : 1;

  const rollingMean = (i: number, w: number) => {
    const sl = vals.slice(Math.max(0, i - w + 1), i + 1);
    return sl.reduce((a, b) => a + b, 0) / sl.length;
  };
  const rollingStd = (i: number, w: number) => {
    const sl = vals.slice(Math.max(0, i - w + 1), i + 1);
    const m = sl.reduce((a, b) => a + b, 0) / sl.length;
    return Math.sqrt(sl.reduce((a, v) => a + (v - m) ** 2, 0) / sl.length) || 0;
  };
  const ma6 = (i: number) => rollingMean(i, 6);

  const features: FeatureVector[] = vals.map((raw, i) => {
    const lag1 = i >= 1 ? vals[i - 1] : raw;
    const lag2 = i >= 2 ? vals[i - 2] : lag1;
    const lag3 = i >= 3 ? vals[i - 3] : lag2;
    const rm3  = rollingMean(i, 3);
    const rs3  = rollingStd(i, 3);
    const rm6  = ma6(i);
    const roc  = lag1 !== 0 ? (raw - lag1) / lag1 : 0;
    return {
      raw,
      lag1, lag2, lag3,
      rollingMean3: rm3,
      rollingStd3: rs3,
      rollingMean6: rm6,
      rateOfChange: roc,
      normalised: (raw - mean) / std,
      maDeviation: rm6 !== 0 ? (raw - rm6) / rm6 : 0,
    };
  });

  return { labels: series.labels, features, stats: { mean, std, min_, max_ } };
}

// ============================================================================
// 4. BASE MODEL IMPLEMENTATIONS
// ============================================================================

function linearRegressionForecast(values: number[], horizon: number): number[] {
  const n = values.length;
  if (n < 2) return Array(horizon).fill(values[0] ?? 0);
  const x = values.map((_, i) => i);
  const sx = x.reduce((a, b) => a + b, 0);
  const sy = values.reduce((a, b) => a + b, 0);
  const sxy = x.reduce((a, xi, i) => a + xi * values[i], 0);
  const sx2 = x.reduce((a, xi) => a + xi * xi, 0);
  const denom = n * sx2 - sx * sx;
  const slope = denom !== 0 ? (n * sxy - sx * sy) / denom : 0;
  const intercept = (sy - slope * sx) / n;
  return Array.from({ length: horizon }, (_, i) => intercept + slope * (n + i));
}

function expSmoothingForecast(values: number[], alpha: number, horizon: number): number[] {
  if (values.length === 0) return Array(horizon).fill(0);
  let s = values[0];
  let slope = 0;
  for (let i = 1; i < values.length; i++) {
    const prev = s;
    s = alpha * values[i] + (1 - alpha) * s;
    slope = alpha * (s - prev) + (1 - alpha) * slope;
  }
  return Array.from({ length: horizon }, (_, i) => s + slope * (i + 1));
}

/** Holt's linear trend method (double exponential smoothing) */
function holtLinearForecast(values: number[], alpha = 0.3, beta = 0.2, horizon: number): number[] {
  if (values.length < 2) return expSmoothingForecast(values, alpha, horizon);
  let level = values[0];
  let trend = values[1] - values[0];
  for (let i = 1; i < values.length; i++) {
    const prevLevel = level;
    level = alpha * values[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }
  return Array.from({ length: horizon }, (_, i) => level + (i + 1) * trend);
}

/** Weighted moving average with recency-bias weights */
function weightedMAForecast(values: number[], horizon: number): number[] {
  const window = Math.min(6, values.length);
  const slice = values.slice(-window);
  // Linear weights: most recent gets highest weight
  const weights = slice.map((_, i) => i + 1);
  const totalW = weights.reduce((a, b) => a + b, 0);
  const wma = slice.reduce((s, v, i) => s + v * weights[i], 0) / totalW;
  // Compute trend from WMA vs previous WMA
  const prevSlice = values.slice(-window - 1, -1);
  let prevWma = wma;
  if (prevSlice.length === window) {
    const pw = prevSlice.map((_, i) => i + 1);
    const ptw = pw.reduce((a, b) => a + b, 0);
    prevWma = prevSlice.reduce((s, v, i) => s + v * pw[i], 0) / ptw;
  }
  const trendPerPeriod = wma - prevWma;
  return Array.from({ length: horizon }, (_, i) => wma + (i + 1) * trendPerPeriod);
}

/** Polynomial regression (degree 2) */
function polynomialRegressionForecast(values: number[], horizon: number): number[] {
  const n = values.length;
  if (n < 3) return linearRegressionForecast(values, horizon);
  // Solve for [a, b, c] in y = a + b*x + c*x^2 using normal equations (3x3 system)
  const x1 = values.map((_, i) => i);
  const x2 = x1.map(v => v * v);
  const sy  = values.reduce((a, b) => a + b, 0);
  const sx1 = x1.reduce((a, b) => a + b, 0);
  const sx2 = x2.reduce((a, b) => a + b, 0);
  const sx3 = x1.reduce((a, v) => a + v * v * v, 0);
  const sx4 = x2.reduce((a, v, i) => a + v * x2[i], 0);
  const syx1 = x1.reduce((a, v, i) => a + v * values[i], 0);
  const syx2 = x2.reduce((a, v, i) => a + v * values[i], 0);
  // Gaussian elimination (simplified 3x3)
  const mat = [
    [n,   sx1,  sx2,  sy],
    [sx1, sx2,  sx3,  syx1],
    [sx2, sx3,  sx4,  syx2],
  ];
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let row = col + 1; row < 3; row++) if (Math.abs(mat[row][col]) > Math.abs(mat[pivot][col])) pivot = row;
    [mat[col], mat[pivot]] = [mat[pivot], mat[col]];
    if (Math.abs(mat[col][col]) < 1e-12) continue;
    for (let row = 0; row < 3; row++) {
      if (row === col) continue;
      const f = mat[row][col] / mat[col][col];
      for (let k = col; k <= 3; k++) mat[row][k] -= f * mat[col][k];
    }
  }
  const a = mat[2][2] !== 0 ? mat[2][3] / mat[2][2] : 0;
  const b = mat[1][1] !== 0 ? (mat[1][3] - mat[1][2] * a) / mat[1][1] : 0;
  const c = mat[0][0] !== 0 ? (mat[0][3] - mat[0][1] * b - mat[0][2] * a) / mat[0][0] : 0;
  return Array.from({ length: horizon }, (_, i) => {
    const xi = n + i;
    return c + b * xi + a * xi * xi;
  });
}

// ============================================================================
// 5. ENSEMBLE PREDICTOR WITH XAI OUTPUT
// ============================================================================

/**
 * Run the 5-model ensemble and produce per-step predictions with
 * dynamically-optimised weights and XAI explanations.
 *
 * Sub-200ms inference: all base models are O(n) with small constants;
 * feature vectors are pre-computed once and reused.
 */
export function runEnsemble(
  metricKey: string,
  series: TimeSeries,
  horizon = 6
): { predictions: EnsemblePrediction[]; accuracy: ModelAccuracyTracker[]; latencyMs: number; r2: number } {
  const start = Date.now();
  const vals = series.values;

  if (vals.length < 2) {
    const flat = Array.from({ length: horizon }, (_, i) => ({
      period: series.labels[vals.length + i] ?? `T+${i + 1}`,
      value: vals[0] ?? 0,
      confidence: 0.5,
      interval: { low: 0, high: vals[0] ?? 0 },
      models: [],
      xai: { primaryDriver: 'insufficient-data', featureImportance: [], reasoning: 'Insufficient historical data for ensemble model.', uncertaintyFactors: ['< 2 data points'], confidenceExplanation: 'Low data volume.' },
    }));
    return { predictions: flat, accuracy: [], latencyMs: Date.now() - start, r2: 0 };
  }

  // Pre-compute features (cached for sub-200ms inference)
  const engineered = engineerFeatures({ labels: series.labels, values: vals });
  const { stats } = engineered;

  // Get dynamically-optimised weights for this metric
  const weights = getWeights(metricKey);

  // Generate per-model forecasts
  const forecasts: Record<string, number[]> = {
    'linear-regression':     linearRegressionForecast(vals, horizon),
    'exp-smoothing':         expSmoothingForecast(vals, 0.3, horizon),
    'holt-linear-trend':     holtLinearForecast(vals, 0.3, 0.2, horizon),
    'weighted-moving-avg':   weightedMAForecast(vals, horizon),
    'polynomial-regression': polynomialRegressionForecast(vals, horizon),
  };

  // Compute R² of linear regression as overall fit quality
  const linForecast = forecasts['linear-regression'];
  const yMean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const ssTot = vals.reduce((a, v) => a + (v - yMean) ** 2, 0);
  const ssRes = vals.reduce((a, v, i) => {
    const li = linForecast[Math.min(i, linForecast.length - 1)];
    return a + (v - li) ** 2;
  }, 0);
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  // Build weighted ensemble predictions
  const predictions: EnsemblePrediction[] = [];
  const futureLabels = series.labels.slice(vals.length, vals.length + horizon);

  for (let step = 0; step < horizon; step++) {
    const modelOutputs: ModelPrediction[] = Object.entries(forecasts).map(([name, fc]) => ({
      model: name,
      value: fc[step] ?? 0,
      weight: weights[name] ?? DEFAULT_WEIGHTS[name] ?? 0.2,
    }));

    const totalW = modelOutputs.reduce((s, m) => s + m.weight, 0);
    const ensembleValue = modelOutputs.reduce((s, m) => s + (m.value * m.weight) / totalW, 0);

    // Prediction interval: weighted std of model divergence
    const modelVals = modelOutputs.map(m => m.value);
    const modelMean = modelVals.reduce((a, b) => a + b, 0) / modelVals.length;
    const modelStd = Math.sqrt(modelVals.reduce((s, v) => s + (v - modelMean) ** 2, 0) / modelVals.length);
    const dataRange = stats.max_ - stats.min_;
    const baseUncertainty = dataRange > 0 ? modelStd / dataRange : 0.05;

    // Confidence degrades with forecast horizon + data uncertainty
    const confidence = Math.max(0.40, Math.min(0.97, 0.95 - step * 0.06 - baseUncertainty * 0.3));
    const marginFraction = (1 - confidence) + 0.04;
    const ev = Math.max(0, Math.round(ensembleValue));
    const low = Math.max(0, Math.round(ev * (1 - marginFraction)));
    const high = Math.round(ev * (1 + marginFraction));

    // XAI: determine primary driver
    const xai = buildXAI(step, engineered, modelOutputs, weights, ensembleValue, confidence, series.labels, vals);

    predictions.push({
      period: futureLabels[step] ?? `T+${step + 1}`,
      value: ev,
      confidence,
      interval: { low, high },
      models: modelOutputs,
      xai,
    });
  }

  // Adaptive retraining: compare last known actual vs what models predicted last time
  // This runs on every pipeline call; weights converge over time.
  if (vals.length >= 2) {
    const lastActual = vals[vals.length - 1];
    const prevModelPreds: Record<string, number> = {};
    for (const [name, fc] of Object.entries(forecasts)) {
      // Use model's 1-step-ahead from position n-2
      const subVals = vals.slice(0, -1);
      const subF = {
        'linear-regression':     linearRegressionForecast(subVals, 1),
        'exp-smoothing':         expSmoothingForecast(subVals, 0.3, 1),
        'holt-linear-trend':     holtLinearForecast(subVals, 0.3, 0.2, 1),
        'weighted-moving-avg':   weightedMAForecast(subVals, 1),
        'polynomial-regression': polynomialRegressionForecast(subVals, 1),
      };
      prevModelPreds[name] = subF[name as keyof typeof subF]?.[0] ?? 0;
    }
    updateModelAccuracy(metricKey, lastActual, prevModelPreds);
  }

  const trackers = modelWeights[metricKey]
    ? Object.values(modelWeights[metricKey])
    : Object.entries(DEFAULT_WEIGHTS).map(([name, w]) => ({
        modelName: name, predictions: 0, sumAbsError: 0, sumSquaredError: 0,
        mape: 0, rmse: 0, currentWeight: w,
      }));

  return { predictions, accuracy: trackers, latencyMs: Date.now() - start, r2 };
}

// ============================================================================
// 6. EXPLAINABLE AI (XAI) REASONING ENGINE
// ============================================================================

function buildXAI(
  step: number,
  engineered: FeatureEngineeredSeries,
  modelOutputs: ModelPrediction[],
  weights: Record<string, number>,
  ensembleValue: number,
  confidence: number,
  labels: string[],
  vals: number[]
): XAIExplanation {
  const last = engineered.features[engineered.features.length - 1];
  if (!last) return emptyXAI();

  // Determine primary driver by feature magnitude relative to mean
  const featureContributions: Array<{ feature: string; importance: number; direction: 'positive' | 'negative' | 'neutral' }> = [
    { feature: 'recent_trend (rate-of-change)', importance: Math.min(1, Math.abs(last.rateOfChange) * 5), direction: last.rateOfChange > 0.02 ? 'positive' : last.rateOfChange < -0.02 ? 'negative' : 'neutral' },
    { feature: 'ma_deviation', importance: Math.min(1, Math.abs(last.maDeviation) * 3), direction: last.maDeviation > 0 ? 'positive' : 'negative' },
    { feature: 'rolling_momentum (3-period)', importance: Math.min(1, Math.abs(last.rollingMean3 - last.rollingMean6) / (engineered.stats.std || 1)), direction: last.rollingMean3 > last.rollingMean6 ? 'positive' : 'negative' },
    { feature: 'normalised_level', importance: Math.min(1, Math.abs(last.normalised) / 3), direction: last.normalised > 0 ? 'positive' : 'negative' },
    { feature: 'lag1_signal', importance: 0.15, direction: 'neutral' },
  ];

  featureContributions.sort((a, b) => b.importance - a.importance);
  const topFeature = featureContributions[0].feature;

  // Determine dominant model
  const totalW = modelOutputs.reduce((s, m) => s + m.weight, 0);
  const dominantModel = modelOutputs.reduce((a, b) => (b.weight > a.weight ? b : a), modelOutputs[0]);
  const dominantPct = totalW > 0 ? Math.round((dominantModel.weight / totalW) * 100) : 0;

  // Build reasoning text
  const trendDesc = last.rateOfChange > 0.05 ? 'accelerating upward'
    : last.rateOfChange > 0.01 ? 'modestly rising'
    : last.rateOfChange < -0.05 ? 'sharply declining'
    : last.rateOfChange < -0.01 ? 'gradually declining'
    : 'relatively flat';

  const momentumDesc = last.rollingMean3 > last.rollingMean6
    ? 'short-term momentum above long-term average (bullish signal)'
    : 'short-term momentum below long-term average (bearish signal)';

  const horizonDesc = step === 0 ? 'near-term (1 month)' : step < 3 ? `medium-term (${step + 1} months)` : `long-term (${step + 1} months)`;

  const reasoning = [
    `${horizonDesc.charAt(0).toUpperCase()}${horizonDesc.slice(1)} forecast of ${Math.round(ensembleValue).toLocaleString()} driven primarily by "${topFeature}".`,
    `Recent trend is ${trendDesc} (Δ ${(last.rateOfChange * 100).toFixed(1)}%/period). ${momentumDesc}.`,
    `Ensemble led by ${dominantModel.model} (${dominantPct}% weight); all 5 models agree to within ±${computeModelSpread(modelOutputs, ensembleValue)}%.`,
  ].join(' ');

  const uncertaintyFactors: string[] = [];
  if (step >= 4) uncertaintyFactors.push('Extended forecast horizon reduces reliability');
  if (Math.abs(last.rateOfChange) > 0.15) uncertaintyFactors.push('High recent volatility increases uncertainty');
  if (engineered.features.length < 6) uncertaintyFactors.push('Limited historical data (<6 periods)');
  if (Math.abs(last.normalised) > 2) uncertaintyFactors.push('Current values are statistical outliers');

  const confPct = Math.round(confidence * 100);
  const confidenceExplanation = `${confPct}% confidence — based on ${engineered.features.length} historical periods, model consensus variance, and ${step === 0 ? 'minimal' : step < 3 ? 'moderate' : 'significant'} forecast horizon uncertainty.`;

  return {
    primaryDriver: topFeature,
    featureImportance: featureContributions,
    reasoning,
    uncertaintyFactors: uncertaintyFactors.length > 0 ? uncertaintyFactors : ['No major uncertainty factors identified'],
    confidenceExplanation,
  };
}

function computeModelSpread(models: ModelPrediction[], ensemble: number): number {
  if (ensemble === 0 || models.length === 0) return 0;
  const maxDev = Math.max(...models.map(m => Math.abs(m.value - ensemble) / Math.abs(ensemble)));
  return Math.round(maxDev * 100);
}

function emptyXAI(): XAIExplanation {
  return {
    primaryDriver: 'unavailable',
    featureImportance: [],
    reasoning: 'Insufficient data for XAI analysis.',
    uncertaintyFactors: ['No historical data'],
    confidenceExplanation: 'Cannot assess confidence.',
  };
}

// ============================================================================
// 7. MAPE BENCHMARK UTILITY (for 15% improvement verification)
// ============================================================================

/**
 * Compute MAPE of a given model against holdout (last N periods).
 * Use holdoutPeriods=3 for standard backtesting.
 */
export function backtestMAPE(
  values: number[],
  modelFn: (v: number[], horizon: number) => number[],
  holdoutPeriods = 3
): number {
  if (values.length <= holdoutPeriods + 1) return Infinity;
  const trainVals = values.slice(0, -holdoutPeriods);
  const actual = values.slice(-holdoutPeriods);
  const predicted = modelFn(trainVals, holdoutPeriods);
  let mae = 0;
  for (let i = 0; i < holdoutPeriods; i++) {
    const act = actual[i];
    const pred = predicted[i];
    mae += act !== 0 ? Math.abs(act - pred) / Math.abs(act) : Math.abs(pred);
  }
  return mae / holdoutPeriods;
}

/**
 * Baseline 2-model MAPE (linear-regression 60% + exp-smoothing 40%).
 */
export function baselineMAPE(values: number[], holdoutPeriods = 3): number {
  return backtestMAPE(
    values,
    (v, h) => {
      const lr = linearRegressionForecast(v, h);
      const es = expSmoothingForecast(v, 0.3, h);
      return lr.map((val, i) => val * 0.6 + (es[i] ?? 0) * 0.4);
    },
    holdoutPeriods
  );
}

/**
 * Enhanced 5-model ensemble MAPE.
 */
export function enhancedMAPE(metricKey: string, values: number[], holdoutPeriods = 3): number {
  return backtestMAPE(
    values,
    (v, h) => {
      const ts: TimeSeries = { labels: v.map((_, i) => `T${i}`), values: v };
      const result = runEnsemble(metricKey, ts, h);
      return result.predictions.map(p => p.value);
    },
    holdoutPeriods
  );
}

/**
 * Returns improvement % of ensemble over baseline (positive = better).
 * Target: ≥ 15%.
 */
export function computeAccuracyImprovement(
  metricKey: string,
  values: number[],
  holdoutPeriods = 3
): { baselineMAPE: number; enhancedMAPE: number; improvementPct: number } {
  const bm = baselineMAPE(values, holdoutPeriods);
  const em = enhancedMAPE(metricKey, values, holdoutPeriods);
  const improv = bm > 0 && bm !== Infinity ? ((bm - em) / bm) * 100 : 0;
  return { baselineMAPE: bm, enhancedMAPE: em, improvementPct: improv };
}
