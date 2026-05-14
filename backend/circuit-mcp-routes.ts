/**
 * Cisco CIRCUIT MCP Routes
 * REST API endpoints for the CIRCUIT MCP intelligence system
 */

import { Router } from 'express';
import {
  validateAllKeys,
  runMLPipeline,
  getUsageAnalytics,
  getKeyStatus,
  recordAPIUsage,
} from './circuit-mcp-service';

const router = Router();

// ============================================================================
// GET /api/circuit/keys/validate - Full API key validation
// ============================================================================
router.get('/keys/validate', async (_req, res) => {
  const start = Date.now();
  try {
    const results = await validateAllKeys();
    recordAPIUsage({ timestamp: Date.now(), keyId: 'system', endpoint: '/keys/validate', latencyMs: Date.now() - start, success: true });
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      validationDurationMs: Date.now() - start,
      keys: results,
      summary: {
        totalKeys: results.length,
        activeKeys: results.filter(r => r.status === 'active').length,
        structureValid: results.filter(r => r.structureValid).length,
        endpointsReachable: results.filter(r => r.endpointReachable).length,
        totalCapabilities: [...new Set(results.flatMap(r => r.capabilities))].length,
      },
    });
  } catch (error: any) {
    recordAPIUsage({ timestamp: Date.now(), keyId: 'system', endpoint: '/keys/validate', latencyMs: Date.now() - start, success: false });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET /api/circuit/keys/status - Quick key status overview
// ============================================================================
router.get('/keys/status', (_req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    keys: getKeyStatus(),
  });
});

// ============================================================================
// GET /api/circuit/pipeline/run - Execute full ML pipeline
// ============================================================================
router.get('/pipeline/run', async (_req, res) => {
  const start = Date.now();
  try {
    const result = await runMLPipeline();
    recordAPIUsage({ timestamp: Date.now(), keyId: 'system', endpoint: '/pipeline/run', latencyMs: Date.now() - start, success: true });
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    recordAPIUsage({ timestamp: Date.now(), keyId: 'system', endpoint: '/pipeline/run', latencyMs: Date.now() - start, success: false });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET /api/circuit/insights - Get aggregated MCP insights (lightweight)
// ============================================================================
router.get('/insights', async (_req, res) => {
  const start = Date.now();
  try {
    const result = await runMLPipeline();
    recordAPIUsage({ timestamp: Date.now(), keyId: 'system', endpoint: '/insights', latencyMs: Date.now() - start, success: true });
    // Return just the distilled insights for the dashboard
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      sessionId: result.sessionId,
      durationMs: Date.now() - start,
      riskAssessment: result.riskAssessment,
      insights: result.insights,
      predictions: result.predictions,
      anomalies: result.anomalies,
      patterns: result.patterns,
      recommendations: result.recommendations,
      pipelineSummary: {
        stagesCompleted: result.performanceMetrics.stagesCompleted,
        modelsUsed: result.performanceMetrics.modelsUsed.length,
        totalDurationMs: result.performanceMetrics.totalDurationMs,
      },
    });
  } catch (error: any) {
    recordAPIUsage({ timestamp: Date.now(), keyId: 'system', endpoint: '/insights', latencyMs: Date.now() - start, success: false });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET /api/circuit/monitoring - API usage analytics & monitoring
// ============================================================================
router.get('/monitoring', (_req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    ...getUsageAnalytics(),
  });
});

export default router;
