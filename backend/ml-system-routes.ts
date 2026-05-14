/**
 * ML System API Routes
 * Endpoints for continuous learning, model versioning, performance monitoring, and A/B testing
 */

import express from "express";
import { MLSystem, ModelVersion, PerformanceMetrics, ABTestConfig } from "./ml-system";
import { ContinuousLearningService } from "./ml-continuous-learning";

const router = express.Router();
const learningService = new ContinuousLearningService();

// Track active model versions
const modelVersions: Map<string, ModelVersion[]> = new Map();
const activeABTests: Map<string, ABTestConfig> = new Map();

/**
 * GET /api/ml/models/:modelId/versions
 * Get all versions for a model
 */
router.get("/models/:modelId/versions", (req, res) => {
  const { modelId } = req.params;
  const versions = modelVersions.get(modelId) || [];

  res.json({
    modelId,
    versions,
    count: versions.length,
    production: versions.find(v => v.status === "production"),
    testing: versions.find(v => v.status === "testing"),
  });
});

/**
 * GET /api/ml/models/:modelId/performance
 * Get current model performance metrics
 */
router.get("/models/:modelId/performance", (req, res) => {
  const { modelId } = req.params;
  const versions = modelVersions.get(modelId) || [];
  const productionVersion = versions.find(v => v.status === "production");

  if (!productionVersion) {
    return res.status(404).json({ error: "No production model found" });
  }

  res.json({
    modelId,
    version: productionVersion.version,
    metrics: productionVersion.performanceMetrics,
    hyperparameters: productionVersion.hyperparameters,
    trainingDataSize: productionVersion.trainingDataSize,
    lastUpdated: productionVersion.timestamp,
  });
});

/**
 * POST /api/ml/feedback
 * Capture prediction feedback for continuous learning
 */
router.post("/feedback", (req, res) => {
  const { predictionId, predicted, actual, confidence, modelVersionId } = req.body;

  const error = Math.abs(predicted - actual);
  learningService.captureFeedback({
    predictionId,
    predicted,
    actual,
    confidence,
    modelVersionId,
    timestamp: new Date().toISOString(),
    error,
  });

  res.json({
    success: true,
    feedback: {
      predictionId,
      error,
      captured: new Date().toISOString(),
    },
  });
});

/**
 * POST /api/ml/retrain
 * Trigger manual retraining with feedback data
 */
router.post("/retrain", async (req, res) => {
  const { modelId, forceRetrain } = req.body;

  try {
    const versions = modelVersions.get(modelId) || [];
    const currentVersion = versions.find(v => v.status === "production");

    if (!currentVersion) {
      return res.status(404).json({ error: "Model not found" });
    }

    // Check if retraining should proceed
    const { shouldRetrain, reason } = learningService.scheduleRetraining(
      modelId,
      currentVersion.performanceMetrics
    );

    if (!shouldRetrain && !forceRetrain) {
      return res.json({
        status: "skipped",
        reason,
        lastVersion: currentVersion.version,
      });
    }

    // Execute retraining pipeline
    const newVersion = await learningService.executeRetrainingPipeline(
      modelId,
      [],
      currentVersion
    );

    // Add new version to history
    const history = modelVersions.get(modelId) || [];
    history.push(newVersion);
    modelVersions.set(modelId, history);

    // Generate report
    const report = learningService.generateRetrainingReport(currentVersion, newVersion);

    res.json({
      status: "completed",
      oldVersion: currentVersion.version,
      newVersion: newVersion.version,
      improvement: report.improvement,
      recommendation: report.recommendation,
      metrics: report.metrics,
    });
  } catch (error) {
    console.error("[ML SYSTEM] Retraining error:", error);
    res.status(500).json({ error: "Retraining failed" });
  }
});

/**
 * POST /api/ml/detect-drift
 * Detect data drift
 */
router.post("/detect-drift", (req, res) => {
  const { baseline, current } = req.body;

  const driftResult = MLSystem.detectDataDrift(baseline, current);

  res.json({
    ...driftResult,
    action: driftResult.driftDetected ? "Consider retraining" : "No action needed",
  });
});

/**
 * POST /api/ml/ab-test
 * Create and manage A/B tests
 */
router.post("/ab-test", (req, res) => {
  const { modelVersionAId, modelVersionBId, trafficSplit, duration } = req.body;

  const abTest = MLSystem.createABTest(modelVersionAId, modelVersionBId, trafficSplit, duration);
  activeABTests.set(abTest.id, abTest);

  res.json({
    testId: abTest.id,
    status: "running",
    modelA: modelVersionAId,
    modelB: modelVersionBId,
    trafficSplit,
    duration,
    startTime: new Date().toISOString(),
  });
});

/**
 * GET /api/ml/ab-test/:testId
 * Get A/B test results
 */
router.get("/ab-test/:testId", (req, res) => {
  const { testId } = req.params;
  const test = activeABTests.get(testId);

  if (!test) {
    return res.status(404).json({ error: "Test not found" });
  }

  res.json(test);
});

/**
 * POST /api/ml/calibrate-confidence
 * Calibrate prediction confidence
 */
router.post("/calibrate-confidence", (req, res) => {
  const { predictions, actuals, confidences } = req.body;

  const { calibrationError, calibratedConfidences } = MLSystem.calibratePredictionConfidence(
    predictions,
    actuals,
    confidences
  );

  res.json({
    calibrationError: calibrationError.toFixed(4),
    originalConfidenceAvg: (confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length).toFixed(4),
    calibratedConfidenceAvg: (
      calibratedConfidences.reduce((a: number, b: number) => a + b, 0) / calibratedConfidences.length
    ).toFixed(4),
    improvement: (calibrationError * 100).toFixed(2) + "%",
  });
});

/**
 * POST /api/ml/detect-degradation
 * Check for performance degradation
 */
router.post("/detect-degradation", (req, res) => {
  const { currentMetrics, baselineMetrics, threshold } = req.body;

  const trigger = MLSystem.detectPerformanceDegradation(
    currentMetrics as PerformanceMetrics,
    baselineMetrics as PerformanceMetrics,
    threshold || 5
  );

  res.json({
    ...trigger,
    action: trigger.triggered ? "RETRAIN RECOMMENDED" : "MONITOR",
  });
});

/**
 * POST /api/ml/audit-log
 * Log model changes and performance impacts
 */
router.post("/audit-log", (req, res) => {
  const { action, modelId, version, metrics, changes } = req.body;

  const auditEntry = {
    id: `audit_${Date.now()}`,
    timestamp: new Date().toISOString(),
    action,
    modelId,
    version,
    metrics,
    changes,
  };

  console.log("[ML AUDIT]", JSON.stringify(auditEntry, null, 2));

  res.json({
    logged: true,
    auditId: auditEntry.id,
  });
});

/**
 * POST /api/ml/rollback
 * Rollback to previous model version
 */
router.post("/rollback", (req, res) => {
  const { modelId, targetVersion } = req.body;

  const versions = modelVersions.get(modelId) || [];
  const currentVersion = versions.find(v => v.status === "production");
  const targetVer = versions.find(v => v.version === targetVersion);

  if (!currentVersion || !targetVer) {
    return res.status(404).json({ error: "Version not found" });
  }

  const canRollback = MLSystem.canRollback(currentVersion, targetVer);

  if (!canRollback) {
    return res.status(400).json({
      error: "Cannot rollback - previous version not significantly better",
      currentAccuracy: currentVersion.accuracy,
      targetAccuracy: targetVer.accuracy,
    });
  }

  // Perform rollback
  currentVersion.status = "deprecated";
  targetVer.status = "production";

  console.log(`[ML SYSTEM] Rolled back model ${modelId} from v${currentVersion.version} to v${targetVer.version}`);

  res.json({
    success: true,
    rolledBackFrom: currentVersion.version,
    rolledBackTo: targetVer.version,
    timestamp: new Date().toISOString(),
  });
});

export default router;
