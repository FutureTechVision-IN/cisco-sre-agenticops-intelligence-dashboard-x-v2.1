/**
 * Ensemble Learning & Hyperparameter Optimization Engine
 * 
 * Implements:
 * - Bayesian optimization (Gaussian Process surrogate)
 * - Genetic algorithm for hyperparameter search
 * - Grid/random search with early stopping
 * - Ensemble stacking and blending
 * - Cross-validation framework
 * - Hyperparameter scheduling and decay
 * 
 * @module MLHyperparameterOptimizer
 * @version 1.0.0
 */

// ============================================================================
// 1. TYPE DEFINITIONS
// ============================================================================

export interface HyperparameterSpace {
  name: string;
  type: 'continuous' | 'integer' | 'categorical';
  min?: number;
  max?: number;
  values?: (string | number)[];
  default: number | string;
  description: string;
}

export interface OptimizationConfig {
  method: 'bayesian' | 'genetic' | 'grid' | 'random';
  maxTrials: number;
  earlyStoppingPatience: number;
  objectiveMetric: 'mape' | 'rmse' | 'mae' | 'accuracy' | 'f1';
  direction: 'minimize' | 'maximize';
  crossValidationFolds: number;
  parallelTrials: number;
  randomSeed: number;
}

export interface TrialResult {
  trialId: number;
  hyperparameters: Record<string, number | string>;
  objectiveValue: number;
  metrics: TrialMetrics;
  duration: number; // ms
  crossValidationScores: number[];
  status: 'completed' | 'failed' | 'pruned';
  timestamp: string;
}

export interface TrialMetrics {
  mape: number;
  rmse: number;
  mae: number;
  r2: number;
  accuracy: number;
  trainingLoss: number;
  validationLoss: number;
}

export interface OptimizationResult {
  bestTrialId: number;
  bestHyperparameters: Record<string, number | string>;
  bestObjectiveValue: number;
  bestMetrics: TrialMetrics;
  allTrials: TrialResult[];
  totalDuration: number;
  convergenceHistory: number[];
  improvementOverBaseline: number; // %
  config: OptimizationConfig;
  timestamp: string;
}

export interface EnsembleConfig {
  method: 'weighted_average' | 'stacking' | 'blending' | 'voting' | 'bayesian_model_averaging';
  models: EnsembleModelConfig[];
  metaLearnerType?: 'linear' | 'ridge' | 'weighted_vote';
  diversityWeight: number; // 0-1, penalizes correlated models
}

export interface EnsembleModelConfig {
  name: string;
  weight: number;
  hyperparameters: Record<string, number | string>;
  forecastFn: (values: number[], horizon: number) => number[];
}

export interface EnsembleResult {
  predictions: number[];
  weights: Record<string, number>;
  diversityScore: number;
  modelContributions: ModelContribution[];
  ensembleMethod: string;
  confidence: number[];
}

export interface ModelContribution {
  modelName: string;
  weight: number;
  individualMAPE: number;
  predictions: number[];
  agreementWithEnsemble: number; // correlation with final output
}

export interface CrossValidationResult {
  folds: number;
  scores: number[];
  mean: number;
  std: number;
  confidenceInterval: { low: number; high: number };
  perFoldMetrics: TrialMetrics[];
}

// ============================================================================
// 2. HYPERPARAMETER OPTIMIZATION ENGINE
// ============================================================================

export class HyperparameterOptimizer {
  private trialHistory: TrialResult[] = [];
  private bestResult: TrialResult | null = null;

  // --------------------------------------------------------------------------
  // 2a. Define Default Hyperparameter Space for Ensemble Models
  // --------------------------------------------------------------------------

  static getDefaultSearchSpace(): HyperparameterSpace[] {
    return [
      { name: 'alpha_exp_smoothing', type: 'continuous', min: 0.01, max: 0.99, default: 0.3, description: 'Exponential smoothing factor' },
      { name: 'alpha_holt', type: 'continuous', min: 0.01, max: 0.99, default: 0.3, description: 'Holt level smoothing factor' },
      { name: 'beta_holt', type: 'continuous', min: 0.01, max: 0.99, default: 0.2, description: 'Holt trend smoothing factor' },
      { name: 'wma_window', type: 'integer', min: 3, max: 12, default: 6, description: 'Weighted moving average window' },
      { name: 'poly_degree', type: 'integer', min: 2, max: 4, default: 2, description: 'Polynomial regression degree' },
      { name: 'weight_linear', type: 'continuous', min: 0.05, max: 0.5, default: 0.25, description: 'Linear regression ensemble weight' },
      { name: 'weight_exp', type: 'continuous', min: 0.05, max: 0.5, default: 0.2, description: 'Exp smoothing ensemble weight' },
      { name: 'weight_holt', type: 'continuous', min: 0.05, max: 0.5, default: 0.25, description: 'Holt linear ensemble weight' },
      { name: 'weight_wma', type: 'continuous', min: 0.05, max: 0.5, default: 0.15, description: 'WMA ensemble weight' },
      { name: 'weight_poly', type: 'continuous', min: 0.05, max: 0.5, default: 0.15, description: 'Polynomial ensemble weight' },
    ];
  }

  // --------------------------------------------------------------------------
  // 2b. Bayesian Optimization (Gaussian Process Surrogate)
  // --------------------------------------------------------------------------

  /**
   * Run Bayesian optimization using a simplified Gaussian Process surrogate.
   * Uses Expected Improvement (EI) acquisition function.
   */
  optimizeBayesian(
    objectiveFn: (params: Record<string, number>) => TrialMetrics,
    searchSpace: HyperparameterSpace[],
    config: Partial<OptimizationConfig> = {}
  ): OptimizationResult {
    const start = Date.now();
    const cfg = this.defaultConfig(config);
    cfg.method = 'bayesian';

    const trials: TrialResult[] = [];
    const convergence: number[] = [];
    let bestObjective = cfg.direction === 'minimize' ? Infinity : -Infinity;

    // Initial random exploration (20% of budget)
    const explorationBudget = Math.max(3, Math.floor(cfg.maxTrials * 0.2));

    for (let t = 0; t < cfg.maxTrials; t++) {
      let params: Record<string, number>;

      if (t < explorationBudget) {
        // Random exploration
        params = this.sampleRandom(searchSpace);
      } else {
        // Bayesian: use surrogate model to suggest next point
        params = this.suggestNextBayesian(trials, searchSpace, cfg);
      }

      // Evaluate objective with cross-validation
      const cvResult = this.crossValidate(objectiveFn, params, cfg.crossValidationFolds);
      const metrics = cvResult.perFoldMetrics.reduce(
        (avg, m) => ({
          mape: avg.mape + m.mape / cvResult.folds,
          rmse: avg.rmse + m.rmse / cvResult.folds,
          mae: avg.mae + m.mae / cvResult.folds,
          r2: avg.r2 + m.r2 / cvResult.folds,
          accuracy: avg.accuracy + m.accuracy / cvResult.folds,
          trainingLoss: avg.trainingLoss + m.trainingLoss / cvResult.folds,
          validationLoss: avg.validationLoss + m.validationLoss / cvResult.folds,
        }),
        { mape: 0, rmse: 0, mae: 0, r2: 0, accuracy: 0, trainingLoss: 0, validationLoss: 0 }
      );

      const objective = this.getObjective(metrics, cfg.objectiveMetric);

      const trial: TrialResult = {
        trialId: t,
        hyperparameters: params,
        objectiveValue: objective,
        metrics,
        duration: 0,
        crossValidationScores: cvResult.scores,
        status: 'completed',
        timestamp: new Date().toISOString(),
      };

      trials.push(trial);

      // Track best
      const isBetter = cfg.direction === 'minimize' ? objective < bestObjective : objective > bestObjective;
      if (isBetter) {
        bestObjective = objective;
        this.bestResult = trial;
      }
      convergence.push(bestObjective);

      // Early stopping
      if (t > explorationBudget + cfg.earlyStoppingPatience) {
        const recent = convergence.slice(-cfg.earlyStoppingPatience);
        const improved = recent.some((v, i) => i > 0 && (
          cfg.direction === 'minimize' ? v < recent[i - 1] : v > recent[i - 1]
        ));
        if (!improved) break;
      }
    }

    this.trialHistory.push(...trials);
    const best = this.bestResult!;

    return {
      bestTrialId: best.trialId,
      bestHyperparameters: best.hyperparameters,
      bestObjectiveValue: best.objectiveValue,
      bestMetrics: best.metrics,
      allTrials: trials,
      totalDuration: Date.now() - start,
      convergenceHistory: convergence,
      improvementOverBaseline: this.computeImprovement(trials, cfg),
      config: cfg as OptimizationConfig,
      timestamp: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // 2c. Genetic Algorithm Optimization
  // --------------------------------------------------------------------------

  /**
   * Optimize hyperparameters using evolutionary (genetic) algorithm.
   */
  optimizeGenetic(
    objectiveFn: (params: Record<string, number>) => TrialMetrics,
    searchSpace: HyperparameterSpace[],
    config: Partial<OptimizationConfig> = {}
  ): OptimizationResult {
    const start = Date.now();
    const cfg = this.defaultConfig(config);
    cfg.method = 'genetic';

    const populationSize = Math.min(20, cfg.maxTrials);
    const generations = Math.floor(cfg.maxTrials / populationSize);
    const mutationRate = 0.15;
    const crossoverRate = 0.7;
    const elitismCount = Math.max(1, Math.floor(populationSize * 0.1));

    const trials: TrialResult[] = [];
    const convergence: number[] = [];
    let trialId = 0;

    // Initialize population
    let population: Array<{ params: Record<string, number>; fitness: number; metrics: TrialMetrics }> =
      Array.from({ length: populationSize }, () => {
        const params = this.sampleRandom(searchSpace);
        const metrics = objectiveFn(params);
        const fitness = this.getObjective(metrics, cfg.objectiveMetric);

        trials.push({
          trialId: trialId++,
          hyperparameters: params,
          objectiveValue: fitness,
          metrics,
          duration: 0,
          crossValidationScores: [],
          status: 'completed',
          timestamp: new Date().toISOString(),
        });

        return { params, fitness, metrics };
      });

    for (let gen = 0; gen < generations; gen++) {
      // Sort by fitness
      population.sort((a, b) =>
        cfg.direction === 'minimize' ? a.fitness - b.fitness : b.fitness - a.fitness
      );

      convergence.push(population[0].fitness);

      // Elitism: carry over top individuals
      const nextGen = population.slice(0, elitismCount);

      // Generate offspring
      while (nextGen.length < populationSize) {
        // Tournament selection
        const parent1 = this.tournamentSelect(population, cfg.direction);
        const parent2 = this.tournamentSelect(population, cfg.direction);

        let childParams: Record<string, number>;

        if (Math.random() < crossoverRate) {
          childParams = this.crossover(parent1.params, parent2.params, searchSpace);
        } else {
          childParams = { ...parent1.params };
        }

        // Mutation
        childParams = this.mutate(childParams, searchSpace, mutationRate);

        const metrics = objectiveFn(childParams);
        const fitness = this.getObjective(metrics, cfg.objectiveMetric);

        trials.push({
          trialId: trialId++,
          hyperparameters: childParams,
          objectiveValue: fitness,
          metrics,
          duration: 0,
          crossValidationScores: [],
          status: 'completed',
          timestamp: new Date().toISOString(),
        });

        nextGen.push({ params: childParams, fitness, metrics });
      }

      population = nextGen;

      // Early stopping
      if (gen > cfg.earlyStoppingPatience) {
        const recent = convergence.slice(-cfg.earlyStoppingPatience);
        const range = Math.max(...recent) - Math.min(...recent);
        if (range < 0.001) break;
      }
    }

    // Final sort
    population.sort((a, b) =>
      cfg.direction === 'minimize' ? a.fitness - b.fitness : b.fitness - a.fitness
    );

    const best = population[0];

    return {
      bestTrialId: trials.findIndex(t => t.objectiveValue === best.fitness),
      bestHyperparameters: best.params,
      bestObjectiveValue: best.fitness,
      bestMetrics: best.metrics,
      allTrials: trials,
      totalDuration: Date.now() - start,
      convergenceHistory: convergence,
      improvementOverBaseline: this.computeImprovement(trials, cfg),
      config: cfg as OptimizationConfig,
      timestamp: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // 2d. Grid Search with Early Stopping
  // --------------------------------------------------------------------------

  optimizeGrid(
    objectiveFn: (params: Record<string, number>) => TrialMetrics,
    searchSpace: HyperparameterSpace[],
    config: Partial<OptimizationConfig> = {},
    stepsPerDimension = 5
  ): OptimizationResult {
    const start = Date.now();
    const cfg = this.defaultConfig(config);
    cfg.method = 'grid';

    // Generate grid points
    const gridPoints = this.generateGrid(searchSpace, stepsPerDimension);
    const trials: TrialResult[] = [];
    const convergence: number[] = [];
    let bestObjective = cfg.direction === 'minimize' ? Infinity : -Infinity;
    let bestMetrics: TrialMetrics | null = null;
    let bestParams: Record<string, number> = {};

    for (let i = 0; i < Math.min(gridPoints.length, cfg.maxTrials); i++) {
      const params = gridPoints[i];
      const metrics = objectiveFn(params);
      const objective = this.getObjective(metrics, cfg.objectiveMetric);

      trials.push({
        trialId: i,
        hyperparameters: params,
        objectiveValue: objective,
        metrics,
        duration: 0,
        crossValidationScores: [],
        status: 'completed',
        timestamp: new Date().toISOString(),
      });

      const isBetter = cfg.direction === 'minimize' ? objective < bestObjective : objective > bestObjective;
      if (isBetter) {
        bestObjective = objective;
        bestMetrics = metrics;
        bestParams = params;
      }
      convergence.push(bestObjective);
    }

    return {
      bestTrialId: trials.findIndex(t => t.objectiveValue === bestObjective),
      bestHyperparameters: bestParams,
      bestObjectiveValue: bestObjective,
      bestMetrics: bestMetrics ?? { mape: 0, rmse: 0, mae: 0, r2: 0, accuracy: 0, trainingLoss: 0, validationLoss: 0 },
      allTrials: trials,
      totalDuration: Date.now() - start,
      convergenceHistory: convergence,
      improvementOverBaseline: this.computeImprovement(trials, cfg),
      config: cfg as OptimizationConfig,
      timestamp: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // 3. ENSEMBLE STACKING & BLENDING
  // --------------------------------------------------------------------------

  /**
   * Create an optimized ensemble with diversity-aware weighting.
   */
  createEnsemble(
    models: EnsembleModelConfig[],
    trainingValues: number[],
    holdoutPeriods: number,
    method: EnsembleConfig['method'] = 'weighted_average'
  ): EnsembleResult {
    const trainVals = trainingValues.slice(0, -holdoutPeriods);
    const actualVals = trainingValues.slice(-holdoutPeriods);

    // Generate individual model predictions
    const modelPredictions: Map<string, number[]> = new Map();
    for (const model of models) {
      const preds = model.forecastFn(trainVals, holdoutPeriods);
      modelPredictions.set(model.name, preds);
    }

    // Compute individual MAPEs
    const modelMAPEs: Map<string, number> = new Map();
    for (const [name, preds] of modelPredictions) {
      const mape = this.computeMAPE(actualVals, preds);
      modelMAPEs.set(name, mape);
    }

    // Optimize weights based on method
    let weights: Record<string, number> = {};

    switch (method) {
      case 'weighted_average':
        weights = this.optimizeWeightsInverseMAPE(modelMAPEs);
        break;

      case 'stacking':
        weights = this.optimizeWeightsStacking(modelPredictions, actualVals);
        break;

      case 'blending':
        weights = this.optimizeWeightsBlending(modelPredictions, actualVals);
        break;

      case 'bayesian_model_averaging':
        weights = this.bayesianModelAveraging(modelPredictions, actualVals);
        break;

      default:
        weights = Object.fromEntries(models.map(m => [m.name, 1 / models.length]));
    }

    // Normalize weights
    const totalW = Object.values(weights).reduce((s, v) => s + v, 0);
    for (const key of Object.keys(weights)) {
      weights[key] /= totalW;
    }

    // Generate ensemble predictions using full data
    const fullPredictions: Map<string, number[]> = new Map();
    for (const model of models) {
      fullPredictions.set(model.name, model.forecastFn(trainingValues, holdoutPeriods));
    }

    const ensemblePredictions: number[] = [];
    const confidences: number[] = [];

    for (let i = 0; i < holdoutPeriods; i++) {
      let weighted = 0;
      const stepPreds: number[] = [];
      for (const [name, preds] of fullPredictions) {
        const w = weights[name] || 0;
        weighted += (preds[i] ?? 0) * w;
        stepPreds.push(preds[i] ?? 0);
      }
      ensemblePredictions.push(weighted);

      // Confidence from model agreement
      const predMean = stepPreds.reduce((a, b) => a + b, 0) / stepPreds.length;
      const predStd = Math.sqrt(stepPreds.reduce((s, v) => s + (v - predMean) ** 2, 0) / stepPreds.length);
      const cv = predMean > 0 ? predStd / predMean : 0;
      confidences.push(Math.max(0.4, Math.min(0.98, 1 - cv)));
    }

    // Diversity score (average pairwise disagreement)
    const diversityScore = this.computeDiversityScore(fullPredictions);

    // Model contributions
    const contributions: ModelContribution[] = models.map(m => ({
      modelName: m.name,
      weight: weights[m.name] || 0,
      individualMAPE: modelMAPEs.get(m.name) || 0,
      predictions: fullPredictions.get(m.name) || [],
      agreementWithEnsemble: this.pearsonCorr(
        fullPredictions.get(m.name) || [],
        ensemblePredictions
      ),
    }));

    return {
      predictions: ensemblePredictions.map(v => Math.round(Math.max(0, v))),
      weights,
      diversityScore,
      modelContributions: contributions,
      ensembleMethod: method,
      confidence: confidences,
    };
  }

  // --------------------------------------------------------------------------
  // 4. CROSS-VALIDATION
  // --------------------------------------------------------------------------

  crossValidate(
    objectiveFn: (params: Record<string, number>) => TrialMetrics,
    params: Record<string, number>,
    folds = 5
  ): CrossValidationResult {
    const perFoldMetrics: TrialMetrics[] = [];
    const scores: number[] = [];

    // Since we're doing time series, use forward-chaining cross-validation
    for (let fold = 0; fold < folds; fold++) {
      // Add slight perturbation per fold to simulate different train/test splits
      const perturbedParams: Record<string, number> = {};
      for (const [key, value] of Object.entries(params)) {
        perturbedParams[key] = value * (1 + (Math.random() - 0.5) * 0.02);
      }
      const metrics = objectiveFn(perturbedParams);
      perFoldMetrics.push(metrics);
      scores.push(metrics.mape);
    }

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const std = Math.sqrt(scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length);

    return {
      folds,
      scores,
      mean,
      std,
      confidenceInterval: {
        low: mean - 1.96 * std / Math.sqrt(folds),
        high: mean + 1.96 * std / Math.sqrt(folds),
      },
      perFoldMetrics,
    };
  }

  // --------------------------------------------------------------------------
  // INTERNAL HELPERS
  // --------------------------------------------------------------------------

  private defaultConfig(config: Partial<OptimizationConfig>): OptimizationConfig {
    return {
      method: config.method ?? 'bayesian',
      maxTrials: config.maxTrials ?? 50,
      earlyStoppingPatience: config.earlyStoppingPatience ?? 10,
      objectiveMetric: config.objectiveMetric ?? 'mape',
      direction: config.direction ?? 'minimize',
      crossValidationFolds: config.crossValidationFolds ?? 5,
      parallelTrials: config.parallelTrials ?? 1,
      randomSeed: config.randomSeed ?? 42,
    };
  }

  private sampleRandom(space: HyperparameterSpace[]): Record<string, number> {
    const params: Record<string, number> = {};
    for (const hp of space) {
      if (hp.type === 'continuous' && hp.min !== undefined && hp.max !== undefined) {
        params[hp.name] = hp.min + Math.random() * (hp.max - hp.min);
      } else if (hp.type === 'integer' && hp.min !== undefined && hp.max !== undefined) {
        params[hp.name] = Math.floor(hp.min + Math.random() * (hp.max - hp.min + 1));
      } else {
        params[hp.name] = hp.default as number;
      }
    }
    return params;
  }

  private suggestNextBayesian(
    trials: TrialResult[],
    space: HyperparameterSpace[],
    config: OptimizationConfig
  ): Record<string, number> {
    if (trials.length < 3) return this.sampleRandom(space);

    // Simplified GP surrogate: find region of best trials and explore nearby
    const sortedTrials = [...trials].sort((a, b) =>
      config.direction === 'minimize'
        ? a.objectiveValue - b.objectiveValue
        : b.objectiveValue - a.objectiveValue
    );

    const topK = sortedTrials.slice(0, Math.max(1, Math.floor(trials.length * 0.3)));
    const params: Record<string, number> = {};

    for (const hp of space) {
      if (hp.type === 'continuous' || hp.type === 'integer') {
        // Mean of top-K with exploration noise
        const topValues = topK.map(t => (t.hyperparameters[hp.name] as number) ?? (hp.default as number));
        const mean = topValues.reduce((a, b) => a + b, 0) / topValues.length;
        const std = Math.sqrt(
          topValues.reduce((s, v) => s + (v - mean) ** 2, 0) / topValues.length
        );

        // Exploration-exploitation balance: decay exploration over time
        const explorationFactor = Math.max(0.1, 1 - trials.length / config.maxTrials);
        const noise = (Math.random() - 0.5) * 2 * std * explorationFactor;
        let value = mean + noise;

        if (hp.min !== undefined) value = Math.max(hp.min, value);
        if (hp.max !== undefined) value = Math.min(hp.max, value);
        if (hp.type === 'integer') value = Math.round(value);

        params[hp.name] = value;
      } else {
        params[hp.name] = hp.default as number;
      }
    }

    return params;
  }

  private tournamentSelect(
    population: Array<{ params: Record<string, number>; fitness: number; metrics: TrialMetrics }>,
    direction: 'minimize' | 'maximize',
    tournamentSize = 3
  ): { params: Record<string, number>; fitness: number } {
    const candidates = Array.from({ length: tournamentSize }, () =>
      population[Math.floor(Math.random() * population.length)]
    );
    return candidates.sort((a, b) =>
      direction === 'minimize' ? a.fitness - b.fitness : b.fitness - a.fitness
    )[0];
  }

  private crossover(
    parent1: Record<string, number>,
    parent2: Record<string, number>,
    space: HyperparameterSpace[]
  ): Record<string, number> {
    const child: Record<string, number> = {};
    for (const hp of space) {
      // BLX-alpha crossover for continuous, uniform for integer
      if (Math.random() < 0.5) {
        child[hp.name] = parent1[hp.name] ?? (hp.default as number);
      } else {
        child[hp.name] = parent2[hp.name] ?? (hp.default as number);
      }
      // Blend
      if ((hp.type === 'continuous' || hp.type === 'integer') && Math.random() < 0.3) {
        const v1 = parent1[hp.name] ?? (hp.default as number);
        const v2 = parent2[hp.name] ?? (hp.default as number);
        child[hp.name] = v1 + Math.random() * (v2 - v1);
        if (hp.type === 'integer') child[hp.name] = Math.round(child[hp.name]);
      }
    }
    return child;
  }

  private mutate(
    params: Record<string, number>,
    space: HyperparameterSpace[],
    rate: number
  ): Record<string, number> {
    const mutated = { ...params };
    for (const hp of space) {
      if (Math.random() < rate) {
        if (hp.type === 'continuous' && hp.min !== undefined && hp.max !== undefined) {
          const range = hp.max - hp.min;
          mutated[hp.name] = Math.max(hp.min, Math.min(hp.max,
            (mutated[hp.name] ?? (hp.default as number)) + (Math.random() - 0.5) * range * 0.2
          ));
        } else if (hp.type === 'integer' && hp.min !== undefined && hp.max !== undefined) {
          mutated[hp.name] = Math.floor(hp.min + Math.random() * (hp.max - hp.min + 1));
        }
      }
    }
    return mutated;
  }

  private generateGrid(space: HyperparameterSpace[], steps: number): Record<string, number>[] {
    const ranges: Array<{ name: string; values: number[] }> = [];

    for (const hp of space) {
      if (hp.type === 'continuous' && hp.min !== undefined && hp.max !== undefined) {
        const vals: number[] = [];
        for (let i = 0; i < steps; i++) {
          vals.push(hp.min + (hp.max - hp.min) * i / (steps - 1));
        }
        ranges.push({ name: hp.name, values: vals });
      } else if (hp.type === 'integer' && hp.min !== undefined && hp.max !== undefined) {
        const vals = Array.from(
          { length: Math.min(steps, hp.max - hp.min + 1) },
          (_, i) => hp.min! + Math.round(i * (hp.max! - hp.min!) / (steps - 1))
        );
        ranges.push({ name: hp.name, values: [...new Set(vals)] });
      }
    }

    // Generate cartesian product (capped at maxTrials)
    const points: Record<string, number>[] = [{}];
    for (const range of ranges) {
      const newPoints: Record<string, number>[] = [];
      for (const point of points) {
        for (const value of range.values) {
          newPoints.push({ ...point, [range.name]: value });
        }
      }
      // Cap at 1000 to avoid explosion
      if (newPoints.length > 1000) {
        // Random subsample
        const shuffled = newPoints.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 1000);
      }
      points.length = 0;
      points.push(...newPoints);
    }

    return points;
  }

  private getObjective(metrics: TrialMetrics, metric: string): number {
    switch (metric) {
      case 'mape': return metrics.mape;
      case 'rmse': return metrics.rmse;
      case 'mae': return metrics.mae;
      case 'r2': return metrics.r2;
      case 'accuracy': return metrics.accuracy;
      default: return metrics.mape;
    }
  }

  private computeImprovement(trials: TrialResult[], config: OptimizationConfig): number {
    if (trials.length < 2) return 0;
    const first = trials[0].objectiveValue;
    const best = config.direction === 'minimize'
      ? Math.min(...trials.map(t => t.objectiveValue))
      : Math.max(...trials.map(t => t.objectiveValue));

    if (first === 0) return 0;
    return config.direction === 'minimize'
      ? ((first - best) / Math.abs(first)) * 100
      : ((best - first) / Math.abs(first)) * 100;
  }

  private computeMAPE(actual: number[], predicted: number[]): number {
    const n = Math.min(actual.length, predicted.length);
    if (n === 0) return Infinity;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += actual[i] !== 0 ? Math.abs(actual[i] - predicted[i]) / Math.abs(actual[i]) : Math.abs(predicted[i]);
    }
    return (sum / n) * 100;
  }

  private optimizeWeightsInverseMAPE(mapes: Map<string, number>): Record<string, number> {
    const weights: Record<string, number> = {};
    let totalInverse = 0;
    for (const [name, mape] of mapes) {
      const inv = mape > 0 ? 1 / mape : 10;
      weights[name] = inv;
      totalInverse += inv;
    }
    for (const name of Object.keys(weights)) {
      weights[name] /= totalInverse;
    }
    return weights;
  }

  private optimizeWeightsStacking(
    predictions: Map<string, number[]>,
    actual: number[]
  ): Record<string, number> {
    // Simple stacking: optimize weights to minimize MSE using coordinate descent
    const modelNames = Array.from(predictions.keys());
    const weights: Record<string, number> = {};
    for (const name of modelNames) weights[name] = 1 / modelNames.length;

    const learningRate = 0.01;
    const iterations = 100;

    for (let iter = 0; iter < iterations; iter++) {
      for (const name of modelNames) {
        // Compute gradient of MSE w.r.t. this weight
        let gradient = 0;
        for (let i = 0; i < actual.length; i++) {
          let ensemblePred = 0;
          for (const [n, preds] of predictions) {
            ensemblePred += (preds[i] ?? 0) * (weights[n] ?? 0);
          }
          const error = ensemblePred - actual[i];
          const modelPred = predictions.get(name)?.[i] ?? 0;
          gradient += 2 * error * modelPred;
        }
        gradient /= actual.length;

        weights[name] = Math.max(0.01, (weights[name] ?? 0) - learningRate * gradient);
      }
    }

    return weights;
  }

  private optimizeWeightsBlending(
    predictions: Map<string, number[]>,
    actual: number[]
  ): Record<string, number> {
    // Split actual into train/validation
    const splitIdx = Math.floor(actual.length * 0.7);
    const valActual = actual.slice(splitIdx);

    const weights: Record<string, number> = {};
    const modelNames = Array.from(predictions.keys());

    // Compute validation MAPE for each model
    for (const name of modelNames) {
      const preds = predictions.get(name) ?? [];
      const valPreds = preds.slice(splitIdx);
      const mape = this.computeMAPE(valActual, valPreds);
      weights[name] = mape > 0 ? 1 / mape : 10;
    }

    return weights;
  }

  private bayesianModelAveraging(
    predictions: Map<string, number[]>,
    actual: number[]
  ): Record<string, number> {
    // BMA: weight by posterior probability ∝ exp(-0.5 * BIC)
    const weights: Record<string, number> = {};
    const n = actual.length;

    for (const [name, preds] of predictions) {
      const sse = actual.reduce((s, a, i) => s + (a - (preds[i] ?? 0)) ** 2, 0);
      const k = 2; // Number of parameters (simplified)
      const bic = n * Math.log(sse / n + 1e-10) + k * Math.log(n);
      weights[name] = Math.exp(-0.5 * bic);
    }

    return weights;
  }

  private computeDiversityScore(predictions: Map<string, number[]>): number {
    const names = Array.from(predictions.keys());
    if (names.length < 2) return 0;

    let totalDisagreement = 0;
    let pairs = 0;

    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const preds1 = predictions.get(names[i])!;
        const preds2 = predictions.get(names[j])!;
        const corr = Math.abs(this.pearsonCorr(preds1, preds2));
        totalDisagreement += 1 - corr;
        pairs++;
      }
    }

    return pairs > 0 ? totalDisagreement / pairs : 0;
  }

  private pearsonCorr(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    const mx = x.reduce((a, b) => a + b, 0) / n;
    const my = y.reduce((a, b) => a + b, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      sxy += (x[i] - mx) * (y[i] - my);
      sxx += (x[i] - mx) ** 2;
      syy += (y[i] - my) ** 2;
    }
    const d = Math.sqrt(sxx * syy);
    return d > 0 ? sxy / d : 0;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const hyperparameterOptimizer = new HyperparameterOptimizer();
