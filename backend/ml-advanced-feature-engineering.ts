/**
 * Advanced Feature Engineering Module
 * 
 * Extends the base feature engineering in circuit-ml-engine.ts with:
 * - Automated feature selection (correlation-based, variance threshold)
 * - Dimensionality reduction (PCA approximation)
 * - Synthetic feature generation (interaction, polynomial, temporal)
 * - Feature importance ranking with permutation testing
 * - Feature store with versioning and caching
 * 
 * @module AdvancedFeatureEngineering
 * @version 1.0.0
 */

// ============================================================================
// 1. TYPE DEFINITIONS
// ============================================================================

export interface FeatureSet {
  name: string;
  version: string;
  timestamp: string;
  features: EngineeredFeature[];
  metadata: FeatureSetMetadata;
}

export interface EngineeredFeature {
  name: string;
  values: number[];
  type: 'raw' | 'lag' | 'rolling' | 'polynomial' | 'interaction' | 'temporal' | 'synthetic' | 'reduced';
  importance: number; // 0-1
  selected: boolean;
  stats: { mean: number; std: number; min: number; max: number; nullRate: number };
}

export interface FeatureSetMetadata {
  originalFeatureCount: number;
  selectedFeatureCount: number;
  reducedDimensions: number;
  selectionMethod: string;
  varianceExplained: number; // 0-1 for PCA
  processingTimeMs: number;
}

export interface FeatureImportanceResult {
  featureName: string;
  importance: number;
  rank: number;
  method: 'permutation' | 'correlation' | 'variance' | 'mutual_information';
  pValue: number; // Statistical significance
}

export interface FeatureSelectionConfig {
  varianceThreshold: number;     // Minimum variance to keep feature
  correlationThreshold: number;  // Max correlation between features (remove redundant)
  maxFeatures: number;           // Maximum features to retain
  methods: ('variance' | 'correlation' | 'importance')[];
}

export interface SyntheticFeatureConfig {
  polynomialDegree: number;
  interactions: boolean;
  temporalDecomposition: boolean;
  rollingWindows: number[];
  lagPeriods: number[];
}

export interface FeatureStoreEntry {
  id: string;
  featureSetName: string;
  version: string;
  timestamp: string;
  featureCount: number;
  description: string;
  featureNames: string[];
  stats: Record<string, { mean: number; std: number }>;
}

// ============================================================================
// 2. ADVANCED FEATURE ENGINEERING ENGINE
// ============================================================================

export class AdvancedFeatureEngineering {
  private featureStore: Map<string, FeatureSet> = new Map();
  private featureHistory: FeatureStoreEntry[] = [];

  // --------------------------------------------------------------------------
  // 2a. Comprehensive Feature Generation
  // --------------------------------------------------------------------------

  /**
   * Generate a complete set of engineered features from raw time series data.
   * Creates base, lag, rolling, polynomial, interaction, and temporal features.
   */
  generateFeatures(
    values: number[],
    labels: string[],
    config: Partial<SyntheticFeatureConfig> = {}
  ): FeatureSet {
    const start = Date.now();
    const cfg: SyntheticFeatureConfig = {
      polynomialDegree: config.polynomialDegree ?? 2,
      interactions: config.interactions ?? true,
      temporalDecomposition: config.temporalDecomposition ?? true,
      rollingWindows: config.rollingWindows ?? [3, 6, 12],
      lagPeriods: config.lagPeriods ?? [1, 2, 3, 6],
    };

    const features: EngineeredFeature[] = [];
    const n = values.length;

    // --- Raw feature ---
    features.push(this.createFeature('raw', values, 'raw'));

    // --- Lag features ---
    for (const lag of cfg.lagPeriods) {
      const lagValues = values.map((v, i) => i >= lag ? values[i - lag] : values[0]);
      features.push(this.createFeature(`lag_${lag}`, lagValues, 'lag'));
    }

    // --- Rolling statistics ---
    for (const window of cfg.rollingWindows) {
      features.push(this.createFeature(`rolling_mean_${window}`, this.rollingMean(values, window), 'rolling'));
      features.push(this.createFeature(`rolling_std_${window}`, this.rollingStd(values, window), 'rolling'));
      features.push(this.createFeature(`rolling_min_${window}`, this.rollingMin(values, window), 'rolling'));
      features.push(this.createFeature(`rolling_max_${window}`, this.rollingMax(values, window), 'rolling'));
      features.push(this.createFeature(`rolling_range_${window}`, this.rollingRange(values, window), 'rolling'));
      features.push(this.createFeature(`ema_${window}`, this.exponentialMovingAverage(values, window), 'rolling'));
    }

    // --- Rate of change features ---
    features.push(this.createFeature('rate_of_change', this.rateOfChange(values), 'synthetic'));
    features.push(this.createFeature('acceleration', this.acceleration(values), 'synthetic'));
    features.push(this.createFeature('momentum', this.momentum(values, 3), 'synthetic'));

    // --- Volatility features ---
    features.push(this.createFeature('volatility_3', this.rollingVolatility(values, 3), 'synthetic'));
    features.push(this.createFeature('volatility_6', this.rollingVolatility(values, 6), 'synthetic'));

    // --- Normalization features ---
    features.push(this.createFeature('z_score', this.zScoreNormalize(values), 'synthetic'));
    features.push(this.createFeature('min_max_scaled', this.minMaxScale(values), 'synthetic'));
    features.push(this.createFeature('ma_deviation', this.maDeviation(values, 6), 'synthetic'));

    // --- Polynomial features ---
    if (cfg.polynomialDegree >= 2) {
      const timeIndex = values.map((_, i) => i);
      for (let d = 2; d <= cfg.polynomialDegree; d++) {
        features.push(this.createFeature(`time_poly_${d}`, timeIndex.map(t => Math.pow(t / n, d)), 'polynomial'));
      }
      // Value polynomial features
      const scaled = this.minMaxScale(values);
      features.push(this.createFeature('value_squared', scaled.map(v => v * v), 'polynomial'));
      features.push(this.createFeature('value_sqrt', scaled.map(v => Math.sqrt(Math.abs(v))), 'polynomial'));
    }

    // --- Interaction features ---
    if (cfg.interactions) {
      const roc = this.rateOfChange(values);
      const vol3 = this.rollingVolatility(values, 3);
      const rm3 = this.rollingMean(values, 3);

      features.push(this.createFeature('roc_x_volatility', roc.map((r, i) => r * vol3[i]), 'interaction'));
      features.push(this.createFeature('mean_x_momentum', rm3.map((m, i) => m * this.momentum(values, 3)[i]), 'interaction'));
      features.push(this.createFeature('zscore_x_roc', this.zScoreNormalize(values).map((z, i) => z * roc[i]), 'interaction'));
    }

    // --- Temporal decomposition ---
    if (cfg.temporalDecomposition && n >= 4) {
      const { trend, seasonal, residual } = this.decomposeSeries(values);
      features.push(this.createFeature('trend_component', trend, 'temporal'));
      features.push(this.createFeature('seasonal_component', seasonal, 'temporal'));
      features.push(this.createFeature('residual_component', residual, 'temporal'));
      features.push(this.createFeature('detrended', values.map((v, i) => v - trend[i]), 'temporal'));
      features.push(this.createFeature('deseasoned', values.map((v, i) => v - seasonal[i]), 'temporal'));
    }

    const featureSet: FeatureSet = {
      name: `features_${Date.now()}`,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      features,
      metadata: {
        originalFeatureCount: features.length,
        selectedFeatureCount: features.length,
        reducedDimensions: 0,
        selectionMethod: 'none',
        varianceExplained: 1.0,
        processingTimeMs: Date.now() - start,
      },
    };

    return featureSet;
  }

  // --------------------------------------------------------------------------
  // 2b. Automated Feature Selection
  // --------------------------------------------------------------------------

  /**
   * Select the most informative features using multiple methods.
   */
  selectFeatures(
    featureSet: FeatureSet,
    targetValues: number[],
    config: Partial<FeatureSelectionConfig> = {}
  ): FeatureSet {
    const start = Date.now();
    const cfg: FeatureSelectionConfig = {
      varianceThreshold: config.varianceThreshold ?? 0.01,
      correlationThreshold: config.correlationThreshold ?? 0.95,
      maxFeatures: config.maxFeatures ?? 20,
      methods: config.methods ?? ['variance', 'correlation', 'importance'],
    };

    let selected = [...featureSet.features];

    // Step 1: Variance-based filtering
    if (cfg.methods.includes('variance')) {
      selected = selected.filter(f => {
        const variance = f.stats.std * f.stats.std;
        return variance > cfg.varianceThreshold;
      });
    }

    // Step 2: Correlation-based filtering (remove highly correlated pairs)
    if (cfg.methods.includes('correlation')) {
      selected = this.removeCorrelatedFeatures(selected, cfg.correlationThreshold);
    }

    // Step 3: Importance-based ranking
    if (cfg.methods.includes('importance')) {
      const importances = this.computeFeatureImportance(selected, targetValues);
      for (const feat of selected) {
        const imp = importances.find(i => i.featureName === feat.name);
        if (imp) feat.importance = imp.importance;
      }
      selected.sort((a, b) => b.importance - a.importance);
      selected = selected.slice(0, cfg.maxFeatures);
    }

    // Update selection status
    for (const f of featureSet.features) {
      f.selected = selected.some(s => s.name === f.name);
    }

    return {
      ...featureSet,
      features: featureSet.features,
      metadata: {
        ...featureSet.metadata,
        selectedFeatureCount: selected.length,
        selectionMethod: cfg.methods.join('+'),
        processingTimeMs: Date.now() - start,
      },
    };
  }

  // --------------------------------------------------------------------------
  // 2c. Dimensionality Reduction (PCA Approximation)
  // --------------------------------------------------------------------------

  /**
   * Reduce feature dimensionality using power-iteration PCA approximation.
   * Pure TypeScript implementation — no external dependencies.
   */
  reduceDimensions(
    featureSet: FeatureSet,
    targetDimensions = 5
  ): FeatureSet {
    const start = Date.now();
    const selectedFeatures = featureSet.features.filter(f => f.selected);
    if (selectedFeatures.length <= targetDimensions) return featureSet;

    const n = selectedFeatures[0]?.values.length || 0;
    if (n === 0) return featureSet;

    // Build data matrix [samples x features]
    const matrix: number[][] = [];
    for (let i = 0; i < n; i++) {
      matrix.push(selectedFeatures.map(f => f.values[i] ?? 0));
    }

    // Center the data
    const means = selectedFeatures.map(f => f.stats.mean);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < selectedFeatures.length; j++) {
        matrix[i][j] -= means[j];
      }
    }

    // Power iteration to find top-k principal components
    const components: number[][] = [];
    let totalVariance = 0;
    let explainedVariance = 0;

    // Total variance
    for (let j = 0; j < selectedFeatures.length; j++) {
      const colVar = matrix.reduce((s, row) => s + row[j] ** 2, 0) / n;
      totalVariance += colVar;
    }

    const residualMatrix = matrix.map(row => [...row]);

    for (let k = 0; k < targetDimensions; k++) {
      const { eigenvector, eigenvalue } = this.powerIteration(residualMatrix, 100);
      components.push(eigenvector);
      explainedVariance += eigenvalue;

      // Deflate: remove component from residual
      for (let i = 0; i < n; i++) {
        const projection = residualMatrix[i].reduce((s, v, j) => s + v * eigenvector[j], 0);
        for (let j = 0; j < selectedFeatures.length; j++) {
          residualMatrix[i][j] -= projection * eigenvector[j];
        }
      }
    }

    // Project data onto principal components
    const reducedFeatures: EngineeredFeature[] = [];
    for (let k = 0; k < targetDimensions; k++) {
      const projected: number[] = [];
      for (let i = 0; i < n; i++) {
        projected.push(matrix[i].reduce((s, v, j) => s + v * components[k][j], 0));
      }
      reducedFeatures.push(this.createFeature(`PC_${k + 1}`, projected, 'reduced'));
      reducedFeatures[reducedFeatures.length - 1].importance = (k === 0 ? 1 : 0.8 / k);
    }

    return {
      ...featureSet,
      features: [...featureSet.features, ...reducedFeatures],
      metadata: {
        ...featureSet.metadata,
        reducedDimensions: targetDimensions,
        varianceExplained: totalVariance > 0 ? explainedVariance / totalVariance : 0,
        processingTimeMs: Date.now() - start,
      },
    };
  }

  // --------------------------------------------------------------------------
  // 2d. Feature Importance (Permutation-based)
  // --------------------------------------------------------------------------

  /**
   * Compute feature importance using correlation with target + permutation test.
   */
  computeFeatureImportance(
    features: EngineeredFeature[],
    targetValues: number[]
  ): FeatureImportanceResult[] {
    const results: FeatureImportanceResult[] = [];

    for (const feature of features) {
      if (feature.values.length !== targetValues.length) continue;

      // Pearson correlation with target
      const correlation = this.pearsonCorrelation(feature.values, targetValues);

      // Permutation test: shuffle feature N times and compare
      const permutationRuns = 50;
      let nullCorrelations = 0;
      for (let p = 0; p < permutationRuns; p++) {
        const shuffled = this.shuffle([...feature.values]);
        const nullCorr = Math.abs(this.pearsonCorrelation(shuffled, targetValues));
        if (nullCorr >= Math.abs(correlation)) nullCorrelations++;
      }
      const pValue = (nullCorrelations + 1) / (permutationRuns + 1);

      results.push({
        featureName: feature.name,
        importance: Math.abs(correlation),
        rank: 0,
        method: 'permutation',
        pValue: Math.round(pValue * 10000) / 10000,
      });
    }

    // Assign ranks
    results.sort((a, b) => b.importance - a.importance);
    results.forEach((r, i) => r.rank = i + 1);

    return results;
  }

  // --------------------------------------------------------------------------
  // 2e. Feature Store (Cache & Version)
  // --------------------------------------------------------------------------

  /**
   * Save feature set to store.
   */
  saveToStore(name: string, featureSet: FeatureSet): FeatureStoreEntry {
    const version = `v${(this.featureHistory.filter(e => e.featureSetName === name).length + 1)}`;
    featureSet.name = name;
    featureSet.version = version;

    const key = `${name}:${version}`;
    this.featureStore.set(key, featureSet);

    const entry: FeatureStoreEntry = {
      id: key,
      featureSetName: name,
      version,
      timestamp: new Date().toISOString(),
      featureCount: featureSet.features.filter(f => f.selected).length,
      description: `${featureSet.metadata.selectedFeatureCount} features, ${featureSet.metadata.selectionMethod} selection`,
      featureNames: featureSet.features.filter(f => f.selected).map(f => f.name),
      stats: Object.fromEntries(
        featureSet.features.filter(f => f.selected).map(f => [f.name, { mean: f.stats.mean, std: f.stats.std }])
      ),
    };

    this.featureHistory.push(entry);
    return entry;
  }

  getFromStore(name: string, version?: string): FeatureSet | undefined {
    if (version) return this.featureStore.get(`${name}:${version}`);
    // Get latest
    const latest = this.featureHistory
      .filter(e => e.featureSetName === name)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    return latest ? this.featureStore.get(latest.id) : undefined;
  }

  getStoreHistory(): FeatureStoreEntry[] {
    return [...this.featureHistory];
  }

  // --------------------------------------------------------------------------
  // INTERNAL HELPERS
  // --------------------------------------------------------------------------

  private createFeature(name: string, values: number[], type: EngineeredFeature['type']): EngineeredFeature {
    const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const std = values.length > 1
      ? Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length)
      : 0;
    const min = values.length > 0 ? Math.min(...values) : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;

    return {
      name,
      values,
      type,
      importance: 0,
      selected: true,
      stats: { mean, std, min, max, nullRate: 0 },
    };
  }

  private rollingMean(values: number[], window: number): number[] {
    return values.map((_, i) => {
      const start = Math.max(0, i - window + 1);
      const slice = values.slice(start, i + 1);
      return slice.reduce((a, b) => a + b, 0) / slice.length;
    });
  }

  private rollingStd(values: number[], window: number): number[] {
    return values.map((_, i) => {
      const start = Math.max(0, i - window + 1);
      const slice = values.slice(start, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
      return Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length);
    });
  }

  private rollingMin(values: number[], window: number): number[] {
    return values.map((_, i) => {
      const start = Math.max(0, i - window + 1);
      return Math.min(...values.slice(start, i + 1));
    });
  }

  private rollingMax(values: number[], window: number): number[] {
    return values.map((_, i) => {
      const start = Math.max(0, i - window + 1);
      return Math.max(...values.slice(start, i + 1));
    });
  }

  private rollingRange(values: number[], window: number): number[] {
    const mins = this.rollingMin(values, window);
    const maxs = this.rollingMax(values, window);
    return mins.map((m, i) => maxs[i] - m);
  }

  private exponentialMovingAverage(values: number[], span: number): number[] {
    const alpha = 2 / (span + 1);
    const ema: number[] = [values[0] ?? 0];
    for (let i = 1; i < values.length; i++) {
      ema.push(alpha * values[i] + (1 - alpha) * ema[i - 1]);
    }
    return ema;
  }

  private rateOfChange(values: number[]): number[] {
    return values.map((v, i) => {
      if (i === 0) return 0;
      const prev = values[i - 1];
      return prev !== 0 ? (v - prev) / Math.abs(prev) : 0;
    });
  }

  private acceleration(values: number[]): number[] {
    const roc = this.rateOfChange(values);
    return this.rateOfChange(roc);
  }

  private momentum(values: number[], window: number): number[] {
    return values.map((v, i) => i >= window ? v - values[i - window] : 0);
  }

  private rollingVolatility(values: number[], window: number): number[] {
    const roc = this.rateOfChange(values);
    return this.rollingStd(roc, window);
  }

  private zScoreNormalize(values: number[]): number[] {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
    return std > 0 ? values.map(v => (v - mean) / std) : values.map(() => 0);
  }

  private minMaxScale(values: number[]): number[] {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    return range > 0 ? values.map(v => (v - min) / range) : values.map(() => 0.5);
  }

  private maDeviation(values: number[], window: number): number[] {
    const ma = this.rollingMean(values, window);
    return values.map((v, i) => ma[i] !== 0 ? (v - ma[i]) / ma[i] : 0);
  }

  /**
   * Additive time series decomposition: Trend + Seasonal + Residual
   */
  private decomposeSeries(values: number[]): { trend: number[]; seasonal: number[]; residual: number[] } {
    const n = values.length;
    // Trend: moving average
    const period = Math.min(4, Math.floor(n / 2));
    const trend = this.rollingMean(values, period);

    // Seasonal: average deviation from trend per position in cycle
    const detrended = values.map((v, i) => v - trend[i]);
    const seasonalPattern: number[] = [];
    for (let p = 0; p < period; p++) {
      const indices = Array.from({ length: n }, (_, i) => i).filter(i => i % period === p);
      const avg = indices.reduce((s, i) => s + detrended[i], 0) / indices.length;
      seasonalPattern.push(avg);
    }
    const seasonal = values.map((_, i) => seasonalPattern[i % period]);

    // Residual
    const residual = values.map((v, i) => v - trend[i] - seasonal[i]);

    return { trend, seasonal, residual };
  }

  private removeCorrelatedFeatures(features: EngineeredFeature[], threshold: number): EngineeredFeature[] {
    const keep: boolean[] = features.map(() => true);

    for (let i = 0; i < features.length; i++) {
      if (!keep[i]) continue;
      for (let j = i + 1; j < features.length; j++) {
        if (!keep[j]) continue;
        const corr = Math.abs(this.pearsonCorrelation(features[i].values, features[j].values));
        if (corr > threshold) {
          // Remove the one with lower variance
          if (features[i].stats.std >= features[j].stats.std) {
            keep[j] = false;
          } else {
            keep[i] = false;
            break;
          }
        }
      }
    }

    return features.filter((_, i) => keep[i]);
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const mx = x.reduce((a, b) => a + b, 0) / n;
    const my = y.reduce((a, b) => a + b, 0) / n;

    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - mx;
      const dy = y[i] - my;
      sxy += dx * dy;
      sxx += dx * dx;
      syy += dy * dy;
    }

    const denom = Math.sqrt(sxx * syy);
    return denom > 0 ? sxy / denom : 0;
  }

  private powerIteration(matrix: number[][], maxIter: number): { eigenvector: number[]; eigenvalue: number } {
    const n = matrix.length;
    const p = matrix[0]?.length || 0;
    if (n === 0 || p === 0) return { eigenvector: [], eigenvalue: 0 };

    // Random initial vector
    let vec = Array.from({ length: p }, () => Math.random() - 0.5);
    let eigenvalue = 0;

    for (let iter = 0; iter < maxIter; iter++) {
      // Compute X^T * X * vec
      const Xv: number[] = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < p; j++) {
          Xv[i] += matrix[i][j] * vec[j];
        }
      }

      const newVec: number[] = new Array(p).fill(0);
      for (let j = 0; j < p; j++) {
        for (let i = 0; i < n; i++) {
          newVec[j] += matrix[i][j] * Xv[i];
        }
      }

      // Normalize
      const norm = Math.sqrt(newVec.reduce((s, v) => s + v * v, 0));
      if (norm < 1e-12) break;
      eigenvalue = norm;
      vec = newVec.map(v => v / norm);
    }

    return { eigenvector: vec, eigenvalue: eigenvalue / n };
  }

  private shuffle(arr: number[]): number[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const advancedFeatureEngineering = new AdvancedFeatureEngineering();
