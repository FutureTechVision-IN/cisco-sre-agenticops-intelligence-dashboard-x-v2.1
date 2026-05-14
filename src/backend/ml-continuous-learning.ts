/**
 * Continuous Learning Service
 * Automated retraining pipeline with feedback loop integration
 */

import { FieldNoticeRecord } from "@shared/schema";
import { MLSystem, ModelVersion, PredictionFeedback, PerformanceMetrics } from "./ml-system";

export class ContinuousLearningService {
  private feedbackBuffer: PredictionFeedback[] = [];
  private retrainingSchedule: Map<string, { interval: number; lastRun: number }> = new Map();

  /**
   * Capture prediction feedback for model improvement
   */
  captureFeedback(feedback: PredictionFeedback): void {
    this.feedbackBuffer.push(feedback);

    // Trigger retraining if buffer reaches threshold
    if (this.feedbackBuffer.length >= 1000) {
      this.processFeedbackBuffer();
    }
  }

  /**
   * Process feedback buffer and prepare retraining data
   */
  private processFeedbackBuffer(): { trainingData: PredictionFeedback[]; metrics: any } {
    const trainingData = [...this.feedbackBuffer];
    
    // Calculate aggregate metrics from feedback
    const metrics = {
      totalPredictions: trainingData.length,
      avgError: trainingData.reduce((sum, f) => sum + Math.abs(f.error), 0) / trainingData.length,
      errorVariance:
        trainingData.reduce((sum, f) => sum + Math.pow(f.error, 2), 0) / trainingData.length,
      confidenceAccuracy: trainingData.filter(f => f.confidence > 0.8 && f.error < 1).length / trainingData.length,
    };

    // Clear buffer after processing
    this.feedbackBuffer = [];

    return { trainingData, metrics };
  }

  /**
   * Adaptive retraining schedule based on performance
   */
  scheduleRetraining(modelId: string, performanceMetrics: PerformanceMetrics): { shouldRetrain: boolean; reason: string } {
    const schedule = this.retrainingSchedule.get(modelId) || { interval: 7 * 24 * 60 * 60 * 1000, lastRun: Date.now() }; // Default 7 days

    const timeSinceLastRun = Date.now() - schedule.lastRun;

    // Scheduled retraining
    if (timeSinceLastRun >= schedule.interval) {
      return { shouldRetrain: true, reason: "Scheduled retraining interval reached" };
    }

    // Performance-based retraining
    if (performanceMetrics.accuracy < 75) {
      return { shouldRetrain: true, reason: `Accuracy degraded to ${performanceMetrics.accuracy}%` };
    }

    if (performanceMetrics.mape > 25) {
      return { shouldRetrain: true, reason: `MAPE exceeded threshold: ${performanceMetrics.mape}%` };
    }

    // Adaptive interval adjustment
    if (performanceMetrics.accuracy > 90) {
      schedule.interval = Math.max(7 * 24 * 60 * 60 * 1000, schedule.interval * 1.2); // Increase interval
    } else if (performanceMetrics.accuracy < 80) {
      schedule.interval = Math.min(24 * 60 * 60 * 1000, schedule.interval * 0.8); // Decrease interval
    }

    this.retrainingSchedule.set(modelId, schedule);

    return { shouldRetrain: false, reason: "Performance within acceptable range" };
  }

  /**
   * Automated retraining pipeline
   */
  async executeRetrainingPipeline(
    modelId: string,
    trainingData: any[],
    currentVersion: ModelVersion
  ): Promise<ModelVersion> {
    console.log(`[ML SYSTEM] Starting automated retraining for model ${modelId}`);

    // Phase 1: Data preparation and feature engineering
    const preparedData = this.prepareTrainingData(trainingData);

    // Phase 2: Suggest hyperparameter improvements
    const suggestedParams = MLSystem.suggestHyperparameterTuning(
      currentVersion.performanceMetrics,
      currentVersion.hyperparameters
    );

    // Phase 3: Create new model version for testing
    const newVersion: ModelVersion = {
      id: `model_${modelId}_v${currentVersion.version + 1}`,
      version: currentVersion.version + 1,
      timestamp: new Date().toISOString(),
      status: "testing",
      accuracy: 0, // Will be updated during testing
      precision: 0,
      recall: 0,
      mape: 0,
      hyperparameters: suggestedParams,
      trainingDataSize: preparedData.length,
      performanceMetrics: {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        mape: 0,
        auc: 0,
        confusionMatrix: [],
        evaluationDate: new Date().toISOString(),
        testDataSize: 0,
      },
    };

    // Phase 4: Validate before deployment
    const validationResults = this.validateModel(newVersion, trainingData);

    if (validationResults.passed) {
      newVersion.status = "production";
      console.log(`[ML SYSTEM] Model ${newVersion.id} validated and promoted to production`);
    } else {
      console.log(`[ML SYSTEM] Model ${newVersion.id} failed validation: ${validationResults.errors.join(", ")}`);
    }

    return newVersion;
  }

  /**
   * Prepare and engineer features for training
   */
  private prepareTrainingData(data: any[]): any[] {
    return data.map(record => ({
      ...record,
      // Add temporal features
      dayOfWeek: new Date(record.timestamp).getDay(),
      hour: new Date(record.timestamp).getHours(),
      // Normalize numeric features
      normalizedError: (record.error || 0) / 100,
    }));
  }

  /**
   * Validate model before production deployment
   */
  private validateModel(model: ModelVersion, testData: any[]): { passed: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validation 1: Minimum accuracy threshold
    if (model.performanceMetrics.accuracy < 75) {
      errors.push(`Accuracy ${model.performanceMetrics.accuracy}% below 75% threshold`);
    }

    // Validation 2: Training data size
    if (model.trainingDataSize < 100) {
      errors.push(`Insufficient training data: ${model.trainingDataSize} samples`);
    }

    // Validation 3: Model stability
    if (model.performanceMetrics.mape > 30) {
      errors.push(`MAPE ${model.performanceMetrics.mape}% exceeds 30% threshold`);
    }

    // Validation 4: Hyperparameter sanity
    const learningRate = Number(model.hyperparameters.learning_rate || 0.01);
    if (learningRate < 0.0001 || learningRate > 1) {
      errors.push(`Learning rate ${learningRate} out of valid range`);
    }

    return {
      passed: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate retraining report
   */
  generateRetrainingReport(
    previousVersion: ModelVersion,
    newVersion: ModelVersion
  ): {
    metrics: PerformanceMetrics;
    improvement: number;
    recommendation: string;
  } {
    const accuracyImprovement = newVersion.accuracy - previousVersion.accuracy;
    const precisionImprovement = newVersion.precision - previousVersion.precision;
    const mapeImprovement = previousVersion.mape - newVersion.mape;

    const overallImprovement =
      (accuracyImprovement * 0.4 + precisionImprovement * 0.3 + (mapeImprovement / 100) * 30) / 100;

    return {
      metrics: newVersion.performanceMetrics,
      improvement: overallImprovement,
      recommendation:
        overallImprovement > 2
          ? "Deploy to production"
          : overallImprovement > 0
          ? "Monitor in staging before production"
          : "Investigate degradation before deployment",
    };
  }
}
