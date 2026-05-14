/**
 * Secrets Management API Routes
 * ============================================================================
 * REST endpoints for secrets health monitoring, validation, and AI orchestration.
 * These endpoints are admin-only and require authentication.
 *
 * Routes:
 *   GET  /api/secrets/health       - Full health report (all providers)
 *   GET  /api/secrets/providers    - Provider status overview
 *   POST /api/secrets/validate     - Trigger full validation
 *   GET  /api/secrets/rotation     - Key rotation warnings
 *   POST /api/ai/process           - Process AI request through orchestrator
 *   GET  /api/ai/providers         - AI provider status
 *   POST /api/ai/insights          - Generate dashboard insights
 *   POST /api/ai/voice             - Process voice interaction
 *   GET  /api/ai/metrics           - AI provider metrics
 */

import { Router } from 'express';
import { secretsManager } from './secrets-manager';
import { aiOrchestrator, type AIRequest, type TaskType } from './ai-orchestrator';

const router = Router();

// ============================================================================
// SECRETS MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/secrets/health
 * Full secrets health report — shows all providers, validation status, rotation warnings.
 * Does NOT expose raw secret values.
 */
router.get('/health', async (_req, res) => {
  try {
    const report = await secretsManager.validateAll();
    res.json({
      success: true,
      ...report,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/secrets/providers
 * Quick overview of which providers are configured and their status.
 */
router.get('/providers', (_req, res) => {
  const registry = secretsManager.getRegistrySummary();
  const providers = new Map<string, { configured: number; valid: number; missing: number; keys: string[] }>();

  for (const entry of registry) {
    if (!providers.has(entry.provider)) {
      providers.set(entry.provider, { configured: 0, valid: 0, missing: 0, keys: [] });
    }
    const p = providers.get(entry.provider)!;
    p.keys.push(entry.key);
    if (entry.status === 'missing') p.missing++;
    else if (entry.status === 'valid') { p.configured++; p.valid++; }
    else p.configured++;
  }

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    providers: Object.fromEntries(providers),
  });
});

/**
 * POST /api/secrets/validate
 * Trigger manual validation of all secrets. Returns full health report.
 */
router.post('/validate', async (_req, res) => {
  try {
    const start = Date.now();
    const report = await secretsManager.validateAll();
    res.json({
      success: true,
      durationMs: Date.now() - start,
      ...report,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/secrets/rotation
 * Check key rotation status and return warnings for aging keys.
 */
router.get('/rotation', async (_req, res) => {
  try {
    const report = await secretsManager.validateAll();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      rotationWarnings: report.rotationWarnings,
      summary: {
        total: report.rotationWarnings.length,
        critical: report.rotationWarnings.filter(w => w.urgency === 'critical').length,
        warning: report.rotationWarnings.filter(w => w.urgency === 'warning').length,
        info: report.rotationWarnings.filter(w => w.urgency === 'info').length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// AI ORCHESTRATION ENDPOINTS
// ============================================================================

/**
 * POST /api/ai/process
 * Send a request through the AI orchestration pipeline.
 * Body: { taskType, prompt, context?, systemPrompt?, temperature?, maxTokens? }
 */
router.post('/process', async (req, res) => {
  try {
    const { taskType, prompt, context, systemPrompt, temperature, maxTokens } = req.body;

    if (!prompt || !taskType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: prompt, taskType',
        validTaskTypes: [
          'summarization', 'security_analysis', 'predictive_analytics',
          'anomaly_detection', 'general_reasoning', 'code_analysis',
          'voice_interaction', 'multi_modal', 'data_analysis',
          'workflow_orchestration', 'live_feed', 'real_time_insight',
        ],
      });
    }

    const request: AIRequest = {
      taskType: taskType as TaskType,
      prompt,
      context,
      systemPrompt,
      temperature,
      maxTokens,
    };

    const response = await aiOrchestrator.process(request);
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ai/providers
 * Get status of all AI providers (configured, enabled, healthy).
 */
router.get('/providers', (_req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    providers: aiOrchestrator.getProviderStatus(),
    metrics: aiOrchestrator.getMetrics(),
  });
});

/**
 * POST /api/ai/insights
 * Generate real-time dashboard insights from current metrics.
 * Body: { dashboardData }
 */
router.post('/insights', async (req, res) => {
  try {
    const { dashboardData } = req.body;
    if (!dashboardData) {
      return res.status(400).json({ success: false, error: 'dashboardData required' });
    }

    const response = await aiOrchestrator.generateDashboardInsight(dashboardData);
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ai/voice
 * Process voice interaction through Gemini.
 * Body: { text, sessionId, context? }
 * (For audio, use WebSocket endpoint at /api/voice)
 */
router.post('/voice', async (req, res) => {
  try {
    const { text, sessionId, context } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'text required' });
    }

    // Use Gemini voice session for conversational response
    const session = await aiOrchestrator.startVoiceSession(sessionId || 'default');
    const response = await session.converse(text);

    res.json({
      success: true,
      provider: 'gemini',
      ...response,
    });
  } catch (error: any) {
    // Fallback to CIRCUIT if Gemini unavailable
    try {
      const fallback = await aiOrchestrator.process({
        taskType: 'voice_interaction',
        prompt: req.body.text,
        context: req.body.context,
      });
      res.json(fallback);
    } catch {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

/**
 * GET /api/ai/metrics
 * Get AI orchestrator performance metrics.
 */
router.get('/metrics', (_req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    metrics: aiOrchestrator.getMetrics(),
  });
});

/**
 * POST /api/ai/predict
 * Run predictive analysis pipeline.
 * Body: { historicalData }
 */
router.post('/predict', async (req, res) => {
  try {
    const { historicalData } = req.body;
    if (!historicalData || !Array.isArray(historicalData)) {
      return res.status(400).json({ success: false, error: 'historicalData (array) required' });
    }

    const response = await aiOrchestrator.runPredictiveAnalysis(historicalData);
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ai/security-event
 * Process a real-time security event.
 * Body: { type, severity, details, affectedAssets }
 */
router.post('/security-event', async (req, res) => {
  try {
    const { type, severity, details, affectedAssets } = req.body;
    if (!type || !severity || !details) {
      return res.status(400).json({ success: false, error: 'type, severity, details required' });
    }

    const response = await aiOrchestrator.processSecurityEvent({
      type, severity, details, affectedAssets: affectedAssets || 0,
    });
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
