/**
 * API Session Tracker Routes
 * ============================================================================
 * REST endpoints for the API Session Tracker admin module.
 *
 * Routes:
 *   GET  /api/admin/session-tracker/summary     - Session overview
 *   GET  /api/admin/session-tracker/logs        - Paginated, filtered logs
 *   GET  /api/admin/session-tracker/metrics     - Provider metrics
 *   GET  /api/admin/session-tracker/timeline    - Time-series data
 *   GET  /api/admin/session-tracker/ai-insights - AI model usage patterns
 *   POST /api/admin/session-tracker/clear       - Clear log history
 */

import { Router } from 'express';
import { apiSessionTracker, type TrackerFilters, type APIProvider, type CallStatus } from './api-session-tracker';

const router = Router();

/**
 * GET /summary
 * High-level session overview with Circuit API prioritization
 */
router.get('/summary', (_req, res) => {
  try {
    const summary = apiSessionTracker.getSessionSummary();
    res.json({ success: true, ...summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /logs
 * Paginated, filterable API call logs
 * Query params: provider, status, dateFrom, dateTo, endpoint, minDuration, maxDuration, taskType, page, pageSize
 */
router.get('/logs', (req, res) => {
  try {
    const filters: TrackerFilters = {};

    if (req.query.provider) filters.provider = req.query.provider as APIProvider;
    if (req.query.status) filters.status = req.query.status as CallStatus;
    if (req.query.dateFrom) filters.dateFrom = parseInt(req.query.dateFrom as string);
    if (req.query.dateTo) filters.dateTo = parseInt(req.query.dateTo as string);
    if (req.query.endpoint) filters.endpoint = req.query.endpoint as string;
    if (req.query.minDuration) filters.minDuration = parseInt(req.query.minDuration as string);
    if (req.query.maxDuration) filters.maxDuration = parseInt(req.query.maxDuration as string);
    if (req.query.taskType) filters.taskType = req.query.taskType as string;

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 200);

    const result = apiSessionTracker.getLogs(filters, page, pageSize);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /metrics
 * Provider-level aggregate metrics
 * Query params: provider (optional), window (ms, default 1h)
 */
router.get('/metrics', (req, res) => {
  try {
    const provider = req.query.provider as APIProvider | undefined;
    const windowMs = parseInt(req.query.window as string) || 3600000;
    const metrics = apiSessionTracker.getProviderMetrics(provider, windowMs);
    res.json({ success: true, metrics });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /timeline
 * Time-series call volume data for charts
 * Query params: window (ms), bucket (ms)
 */
router.get('/timeline', (req, res) => {
  try {
    const windowMs = parseInt(req.query.window as string) || 3600000;
    const bucketMs = parseInt(req.query.bucket as string) || 60000;
    const timeline = apiSessionTracker.getTimeline(windowMs, bucketMs);
    res.json({ success: true, timeline });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /ai-insights
 * AI model usage patterns and intelligence analysis
 */
router.get('/ai-insights', (_req, res) => {
  try {
    const insights = apiSessionTracker.getAIUsageInsights();
    res.json({ success: true, ...insights });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /clear
 * Clear all session tracker logs (admin action)
 */
router.post('/clear', (_req, res) => {
  try {
    apiSessionTracker.clear();
    apiSessionTracker.seedSampleData();
    res.json({ success: true, message: 'Session tracker logs cleared and sample data reseeded' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
