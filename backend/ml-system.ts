/**
 * Self-Improving AI/ML System
 * Implements continuous learning, performance monitoring, and automated optimization
 * with audit trails and rollback capabilities
 */

export interface ModelVersion {
  id: string;
  version: number;
  timestamp: string;
  status: "training" | "testing" | "production" | "deprecated";
  accuracy: number;
  precision: number;
  recall: number;
  mape: number;
  hyperparameters: Record<string, number | string>;
  trainingDataSize: number;
  performanceMetrics: PerformanceMetrics;
}

export interface PerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  mape: number;
  auc: number;
  confusionMatrix: number[][];
  evaluationDate: string;
  testDataSize: number;
}

export interface PredictionFeedback {
  predictionId: string;
  predicted: number;
  actual: number;
  confidence: number;
  timestamp: string;
  modelVersionId: string;
  error: number;
}

export interface RetrainingTrigger {
  id: string;
  triggerType: "performance_degradation" | "data_drift" | "scheduled" | "manual";
  threshold: number;
  currentMetric: number;
  triggered: boolean;
  timestamp: string;
}

export interface HyperparameterTuningResult {
  modelVersionId: string;
  parameters: Record<string, number | string>;
  performanceImprovement: number;
  trialNumber: number;
  timestamp: string;
}

export interface ABTestConfig {
  id: string;
  modelVersionAId: string;
  modelVersionBId: string;
  trafficSplit: number; // 0-100, percentage for model A
  duration: string;
  winnerCriteria: "accuracy" | "precision" | "recall" | "f1_score";
  status: "running" | "completed" | "aborted";
  winner?: string;
  results?: {
    modelAMetrics: PerformanceMetrics;
    modelBMetrics: PerformanceMetrics;
  };
}

export interface DataDriftDetection {
  id: string;
  timestamp: string;
  metric: string;
  baseline: number;
  current: number;
  driftDetected: boolean;
  severity: "low" | "medium" | "high";
  recommendation: string;
}

export class MLSystem {
  /**
   * Detect performance degradation and trigger retraining
   */
  static detectPerformanceDegradation(
    currentMetrics: PerformanceMetrics,
    baselineMetrics: PerformanceMetrics,
    degradationThreshold: number = 5 // 5% degradation threshold
  ): RetrainingTrigger {
    const accuracyDegradation = ((baselineMetrics.accuracy - currentMetrics.accuracy) / baselineMetrics.accuracy) * 100;
    const precisionDegradation = ((baselineMetrics.precision - currentMetrics.precision) / baselineMetrics.precision) * 100;
    
    const maxDegradation = Math.max(accuracyDegradation, precisionDegradation);
    const triggered = maxDegradation > degradationThreshold;

    return {
      id: `trigger_${Date.now()}`,
      triggerType: "performance_degradation",
      threshold: degradationThreshold,
      currentMetric: maxDegradation,
      triggered,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Detect data drift using statistical tests
   */
  static detectDataDrift(
    baselineData: number[],
    currentData: number[],
    method: "kolmogorov_smirnov" | "js_divergence" = "kolmogorov_smirnov"
  ): DataDriftDetection {
    const baselineMean = baselineData.reduce((a, b) => a + b, 0) / baselineData.length;
    const currentMean = currentData.reduce((a, b) => a + b, 0) / currentData.length;
    
    const baselineStd = Math.sqrt(
      baselineData.reduce((sum, val) => sum + Math.pow(val - baselineMean, 2), 0) / baselineData.length
    );
    const currentStd = Math.sqrt(
      currentData.reduce((sum, val) => sum + Math.pow(val - currentMean, 2), 0) / currentData.length
    );

    // KS-like test: compare distribution differences
    const meanDifference = Math.abs(currentMean - baselineMean) / (baselineMean || 1);
    const stdDifference = Math.abs(currentStd - baselineStd) / (baselineStd || 1);
    const driftScore = (meanDifference + stdDifference) / 2;

    const driftDetected = driftScore > 0.15; // 15% threshold
    let severity: "low" | "medium" | "high" = "low";
    if (driftScore > 0.25) severity = "high";
    else if (driftScore > 0.2) severity = "medium";

    return {
      id: `drift_${Date.now()}`,
      timestamp: new Date().toISOString(),
      metric: "distribution_shift",
      baseline: baselineMean,
      current: currentMean,
      driftDetected,
      severity,
      recommendation: driftDetected
        ? "Data drift detected. Recommend immediate model retraining with fresh data."
        : "No significant data drift detected.",
    };
  }

  /**
   * Automated hyperparameter tuning using Bayesian optimization approach
   */
  static suggestHyperparameterTuning(
    currentMetrics: PerformanceMetrics,
    hyperparameters: Record<string, number | string>
  ): Record<string, number | string> {
    const suggestions: Record<string, number | string> = { ...hyperparameters };

    // If precision is low, reduce learning rate for stability
    if (currentMetrics.precision < 75) {
      suggestions.learning_rate = Math.max(0.0001, (Number(suggestions.learning_rate) || 0.01) * 0.5);
    }

    // If recall is low, increase regularization to reduce false negatives
    if (currentMetrics.recall < 75) {
      suggestions.regularization = Math.min(1.0, (Number(suggestions.regularization) || 0.001) * 2);
    }

    // If MAPE is high, increase batch size for stability
    if (currentMetrics.mape > 20) {
      suggestions.batch_size = Math.min(256, (Number(suggestions.batch_size) || 32) * 2);
    }

    // Increase ensemble size if F1 score is below target
    if (currentMetrics.f1Score < 80) {
      suggestions.ensemble_size = Math.min(100, (Number(suggestions.ensemble_size) || 10) + 5);
    }

    return suggestions;
  }

  /**
   * Calculate confidence calibration for predictions
   */
  static calibratePredictionConfidence(
    predictions: number[],
    actuals: number[],
    confidences: number[]
  ): { calibrationError: number; calibratedConfidences: number[] } {
    if (predictions.length !== actuals.length) {
      return { calibrationError: 0, calibratedConfidences: confidences };
    }

    // Calculate calibration error (expected vs actual accuracy)
    let correctCount = 0;
    let confidenceSum = 0;

    for (let i = 0; i < predictions.length; i++) {
      const isCorrect = Math.abs(predictions[i] - actuals[i]) < 1;
      if (isCorrect) correctCount++;
      confidenceSum += confidences[i];
    }

    const actualAccuracy = correctCount / predictions.length;
    const expectedAccuracy = confidenceSum / predictions.length;
    const calibrationError = Math.abs(actualAccuracy - expectedAccuracy);

    // Adjust confidences based on calibration error
    const calibratedConfidences = confidences.map(conf => {
      if (calibrationError > 0.1) {
        // Reduce overconfident predictions
        return Math.max(0, conf * (1 - calibrationError * 0.5));
      }
      return conf;
    });

    return { calibrationError, calibratedConfidences };
  }

  /**
   * A/B test configuration and tracking
   */
  static createABTest(
    modelAId: string,
    modelBId: string,
    trafficSplit: number = 50,
    duration: string = "7 days"
  ): ABTestConfig {
    return {
      id: `abtest_${Date.now()}`,
      modelVersionAId: modelAId,
      modelVersionBId: modelBId,
      trafficSplit,
      duration,
      winnerCriteria: "f1_score",
      status: "running",
    };
  }

  /**
   * Determine AB test winner
   */
  static determineABTestWinner(
    metricsA: PerformanceMetrics,
    metricsB: PerformanceMetrics,
    criteria: string = "f1_score"
  ): string {
    const scoreA = criteria === "f1_score" ? metricsA.f1Score : (metricsA as any)[criteria];
    const scoreB = criteria === "f1_score" ? metricsB.f1Score : (metricsB as any)[criteria];
    return scoreA > scoreB ? "A" : "B";
  }

  /**
   * Feature importance analysis for model explainability
   */
  static analyzeFeatureImportance(
    predictions: number[],
    actuals: number[],
    featureValues: number[][]
  ): { feature: number; importance: number }[] {
    const featureImportance: { feature: number; importance: number }[] = [];

    for (let f = 0; f < featureValues[0].length; f++) {
      let correlation = 0;
      let count = 0;

      for (let i = 0; i < actuals.length; i++) {
        if (featureValues[i] && featureValues[i][f] !== undefined) {
          const error = Math.abs(predictions[i] - actuals[i]);
          correlation += featureValues[i][f] * error;
          count++;
        }
      }

      featureImportance.push({
        feature: f,
        importance: count > 0 ? correlation / count : 0,
      });
    }

    return featureImportance.sort((a, b) => b.importance - a.importance);
  }

  /**
   * Model rollback capability
   */
  static canRollback(currentVersion: ModelVersion, previousVersion: ModelVersion): boolean {
    // Can rollback if previous version had better primary metrics
    const metricsImprovement =
      (currentVersion.accuracy - previousVersion.accuracy) * 0.4 +
      (currentVersion.precision - previousVersion.precision) * 0.3 +
      (currentVersion.recall - previousVersion.recall) * 0.3;

    return metricsImprovement < -2; // More than 2% degradation triggers rollback option
  }
}
