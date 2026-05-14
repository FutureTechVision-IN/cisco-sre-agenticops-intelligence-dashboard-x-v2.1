/**
 * Cisco SRE ChatBot API Routes
 * RESTful endpoints for ChatGPT-like voice chatbot
 * Integrates exclusively with Cisco CIRCUIT API
 * 
 * Rate Limiting:
 * - Maximum 12-14 concurrent API calls
 * - Per-user limits: 15 requests/minute
 * - Global limits: 60 requests/minute
 * - Circuit breaker for resilience
 * 
 * AIML Features (v2.0):
 * - Executive report generation
 * - Anomaly detection
 * - Field notice comparison
 * - Temporal data processing
 */

import { Router, Request, Response } from 'express';
import { 
  processMessage, 
  getConversationHistory, 
  getContext,
  clearSession,
  getChatbotMetrics,
  ChatMessage,
  ChatbotResponse 
} from './chatbot-service';
import { 
  rateLimiter, 
  RateLimitError, 
  getRateLimitMiddleware, 
  formatRateLimitError 
} from './api-rate-limiter';
import { aimlEngine, CustomerFilter, TemporalFilter } from './aiml-engine';
import { executiveReportGenerator } from './executive-report-generator';
import { kpiStorytellingEngine } from './kpi-storytelling-engine';

const router = Router();

// Apply rate limit headers to all routes
router.use(getRateLimitMiddleware());

// ==========================================
// TYPES
// ==========================================

interface ChatRequest {
  message: string;
  sessionId: string;
  inputType?: 'voice' | 'text';
  dashboardData?: {
    vulnerableCount?: number;
    potentiallyVulnerableCount?: number;
    secureCount?: number;
    fieldNoticeCount?: number;
    topCustomers?: string;
  };
}

interface PreferencesRequest {
  responseStyle?: 'concise' | 'detailed' | 'technical' | 'executive';
  preferredMetrics?: string[];
  voiceEnabled?: boolean;
  autoSpeak?: boolean;
}

// ==========================================
// MIDDLEWARE
// ==========================================

// Request validation middleware
const validateChatRequest = (req: Request, res: Response, next: Function) => {
  const { message, sessionId } = req.body as ChatRequest;
  
  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Message is required and must be a string'
    });
  }

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'SessionId is required and must be a string'
    });
  }

  if (message.length > 5000) {
    return res.status(400).json({
      success: false,
      error: 'Message exceeds maximum length of 5000 characters'
    });
  }

  next();
};

// ==========================================
// ROUTES
// ==========================================

/**
 * GET /api/chatbot/status
 * Get current rate limit and system status
 */
router.get('/status', (req: Request, res: Response) => {
  const status = rateLimiter.getStatus();
  const metrics = rateLimiter.getMetrics();

  res.json({
    success: true,
    status: {
      ...status,
      metrics: {
        totalRequests: metrics.totalRequests,
        successRate: metrics.successRate.toFixed(1) + '%',
        avgResponseTime: Math.round(metrics.averageResponseTime) + 'ms',
        avgQueueWaitTime: Math.round(metrics.averageQueueWaitTime) + 'ms'
      }
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/chatbot/message
 * Process a chat message and return AI response
 * Rate limited: 12-14 concurrent calls max
 */
router.post('/message', validateChatRequest, async (req: Request, res: Response) => {
  const startTime = Date.now();
  const userId = req.body.sessionId || req.ip || 'anonymous';
  
  try {
    const { message, sessionId, inputType, dashboardData } = req.body as ChatRequest;
    
    console.log(`[ChatBot API] Processing ${inputType || 'text'} message for session: ${sessionId.substring(0, 20)}...`);

    // Execute with rate limiting
    const response: ChatbotResponse = await rateLimiter.executeWithRateLimit(
      () => processMessage(message, sessionId, inputType || 'text', dashboardData),
      {
        userId,
        endpoint: '/api/chatbot/message',
        priority: 'normal'
      }
    );

    const processingTime = Date.now() - startTime;
    console.log(`[ChatBot API] Response generated in ${processingTime}ms`);

    // Add rate limit info to response
    const status = rateLimiter.getStatus();

    res.json({
      success: response.success,
      message: response.message,
      suggestions: response.suggestions,
      voiceOutput: response.voiceOutput,
      relatedInsights: response.relatedInsights,
      meta: {
        processingTime,
        timestamp: new Date().toISOString(),
        rateLimit: {
          remaining: status.maxConcurrent - status.currentConcurrent,
          queueLength: status.queueLength
        }
      }
    });

  } catch (error) {
    console.error('[ChatBot API] Error:', error);
    
    // Handle rate limit errors specially
    if (error instanceof RateLimitError) {
      return res.status(429).json({
        ...formatRateLimitError(error),
        meta: {
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Handle other errors
    res.status(500).json({
      success: false,
      error: 'Failed to process message',
      details: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Please try again in a moment. If the problem persists, contact support.'
    });
  }
});

/**
 * POST /api/chatbot/voice
 * Process a voice command (optimized for voice input)
 */
router.post('/voice', validateChatRequest, async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { message, sessionId, dashboardData } = req.body as ChatRequest;
    
    console.log(`[ChatBot API] Processing voice command for session: ${sessionId.substring(0, 20)}...`);

    const response = await processMessage(
      message,
      sessionId,
      'voice',
      dashboardData
    );

    const processingTime = Date.now() - startTime;

    // Return optimized response for voice
    res.json({
      success: response.success,
      transcript: message,
      response: {
        text: response.voiceOutput?.text || response.message.content,
        emotion: response.voiceOutput?.emotion || 'neutral',
        fullContent: response.message.content,
        attachments: response.message.attachments
      },
      suggestions: response.suggestions?.slice(0, 3), // Limit for voice UI
      meta: {
        processingTime,
        model: response.message.metadata?.model,
        confidence: response.message.metadata?.confidence,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[ChatBot API] Voice error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process voice command'
    });
  }
});

/**
 * GET /api/chatbot/history/:sessionId
 * Get conversation history for a session
 */
router.get('/history/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const history = getConversationHistory(sessionId);
    
    res.json({
      success: true,
      sessionId,
      messages: history.slice(-limit),
      total: history.length
    });

  } catch (error) {
    console.error('[ChatBot API] History error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve conversation history'
    });
  }
});

/**
 * GET /api/chatbot/context/:sessionId
 * Get full conversation context including entities and preferences
 */
router.get('/context/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const context = getContext(sessionId);
    
    res.json({
      success: true,
      context: {
        sessionId: context.sessionId,
        messageCount: context.messages.length,
        preferences: context.preferences,
        activeWorkflows: context.activeWorkflows,
        topicHistory: context.topicHistory,
        extractedEntities: context.extractedEntities.slice(-20),
        lastActivity: context.lastActivity,
        hasSummary: !!context.conversationSummary
      }
    });

  } catch (error) {
    console.error('[ChatBot API] Context error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve context'
    });
  }
});

/**
 * PUT /api/chatbot/preferences/:sessionId
 * Update user preferences for a session
 */
router.put('/preferences/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const preferences = req.body as PreferencesRequest;
    
    // Validate preferences
    if (preferences.responseStyle && 
        !['concise', 'detailed', 'technical', 'executive'].includes(preferences.responseStyle)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid responseStyle value'
      });
    }

    const context = getContext(sessionId);
    const updatedPrefs = { ...context.preferences, ...preferences };
    
    // Note: In a real implementation, this would update the preferences
    // For now, we'll just return success
    
    res.json({
      success: true,
      preferences: updatedPrefs
    });

  } catch (error) {
    console.error('[ChatBot API] Preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
});

/**
 * DELETE /api/chatbot/session/:sessionId
 * Clear/delete a conversation session
 */
router.delete('/session/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    clearSession(sessionId);
    
    res.json({
      success: true,
      message: 'Session cleared successfully'
    });

  } catch (error) {
    console.error('[ChatBot API] Session delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear session'
    });
  }
});

/**
 * GET /api/chatbot/metrics
 * Get chatbot usage metrics (admin endpoint)
 */
router.get('/metrics', (req: Request, res: Response) => {
  try {
    const metrics = getChatbotMetrics();
    
    res.json({
      success: true,
      metrics: {
        ...metrics,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[ChatBot API] Metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metrics'
    });
  }
});

/**
 * GET /api/chatbot/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'SRE ChatBot',
    version: '2.0.0',
    features: {
      voiceEnabled: true,
      textEnabled: true,
      ciscoCircuitAPI: true,
      contextAware: true,
      multiSession: true
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/chatbot/quick-action
 * Execute a quick action/command
 */
router.post('/quick-action', async (req: Request, res: Response) => {
  try {
    const { action, sessionId, parameters } = req.body;
    
    if (!action || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Action and sessionId are required'
      });
    }

    // Map quick actions to natural language queries
    const actionQueries: Record<string, string> = {
      'show_critical_vulns': 'Show me all critical vulnerabilities that need immediate attention',
      'show_trends': 'What are the current vulnerability trends?',
      'show_overview': 'Give me a summary of the dashboard metrics',
      'view_risk_profile': `Show me the risk profile${parameters?.customer ? ` for ${parameters.customer}` : ''}`,
      'generate_remediation': 'Generate a remediation plan for critical vulnerabilities',
      'export_vuln_report': 'Help me export a vulnerability report',
      'compare_periods': 'Compare this month to last month',
      'show_help': 'What can you help me with?'
    };

    const query = actionQueries[action] || `Execute action: ${action}`;
    
    const response = await processMessage(
      query,
      sessionId,
      'text',
      parameters?.dashboardData
    );

    res.json({
      success: response.success,
      action,
      message: response.message,
      suggestions: response.suggestions
    });

  } catch (error) {
    console.error('[ChatBot API] Quick action error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute quick action'
    });
  }
});

/**
 * POST /api/chatbot/feedback
 * Submit feedback for a response
 */
router.post('/feedback', (req: Request, res: Response) => {
  try {
    const { messageId, sessionId, rating, feedback } = req.body;
    
    if (!messageId || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'MessageId and sessionId are required'
      });
    }

    // In a real implementation, this would store feedback for model improvement
    console.log(`[ChatBot Feedback] Session ${sessionId}, Message ${messageId}: Rating ${rating}, Feedback: ${feedback}`);

    res.json({
      success: true,
      message: 'Feedback received. Thank you for helping improve the service!'
    });

  } catch (error) {
    console.error('[ChatBot API] Feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback'
    });
  }
});

/**
 * GET /api/chatbot/rate-limit
 * Get detailed rate limit information
 */
router.get('/rate-limit', (req: Request, res: Response) => {
  const status = rateLimiter.getStatus();
  const metrics = rateLimiter.getMetrics();

  res.json({
    success: true,
    rateLimit: {
      concurrent: {
        current: status.currentConcurrent,
        max: status.maxConcurrent,
        available: status.maxConcurrent - status.currentConcurrent
      },
      queue: {
        length: status.queueLength,
        estimatedWaitTime: status.estimatedWaitTime
      },
      perMinute: {
        used: status.requestsThisMinute,
        max: status.maxPerMinute,
        remaining: status.maxPerMinute - status.requestsThisMinute
      },
      circuit: {
        state: status.circuitState,
        isAccepting: status.isAcceptingRequests
      },
      blockedUsers: status.rateLimitedUsers.length
    },
    performance: {
      totalRequests: metrics.totalRequests,
      successRate: `${metrics.successRate.toFixed(1)}%`,
      avgResponseTime: `${Math.round(metrics.averageResponseTime)}ms`,
      p95ResponseTime: `${Math.round(metrics.p95ResponseTime)}ms`,
      avgQueueWait: `${Math.round(metrics.averageQueueWaitTime)}ms`,
      errorsByType: metrics.errorsByType
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/chatbot/history/calls
 * Get API call history for debugging
 */
router.get('/history/calls', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const status = req.query.status as string;
  const userId = req.query.userId as string;

  const history = rateLimiter.getCallHistory({
    userId,
    status: status as any,
    limit
  });

  res.json({
    success: true,
    count: history.length,
    calls: history.map(call => ({
      id: call.id,
      userId: call.userId.substring(0, 20) + '...',
      endpoint: call.endpoint,
      status: call.status,
      duration: call.duration ? `${call.duration}ms` : 'pending',
      queueWait: call.queueWaitTime ? `${call.queueWaitTime}ms` : 'N/A',
      retryCount: call.retryCount,
      timestamp: call.startTime.toISOString(),
      error: call.errorMessage
    })),
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/chatbot/admin/reset-limit
 * Admin endpoint to reset rate limits
 */
router.post('/admin/reset-limit', (req: Request, res: Response) => {
  const { userId, resetCircuit } = req.body;

  if (userId) {
    rateLimiter.resetUserLimit(userId);
  }

  if (resetCircuit) {
    rateLimiter.resetCircuitBreaker();
  }

  res.json({
    success: true,
    message: userId 
      ? `Rate limit reset for user: ${userId}`
      : resetCircuit 
        ? 'Circuit breaker reset'
        : 'No action taken',
    status: rateLimiter.getStatus()
  });
});

// ==========================================
// AIML ENGINE ROUTES (v2.0)
// ==========================================

/**
 * POST /api/chatbot/aiml/executive-summary
 * Generate executive summary report
 */
router.post('/aiml/executive-summary', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { customerFilter, temporalFilter, format } = req.body;
    
    const report = await executiveReportGenerator.generateReport({
      format: format || 'executive',
      includeAnomalies: true,
      includeComparisons: true,
      includeTrends: true,
      includeRecommendations: true,
      customerFilter,
      temporalFilter
    });

    const markdown = executiveReportGenerator.toMarkdown(report);

    res.json({
      success: true,
      report: {
        title: report.title,
        subtitle: report.subtitle,
        markdown,
        html: executiveReportGenerator.toHTML(report),
        sections: report.sections,
        confidenceLevel: report.confidenceLevel,
        metadata: report.metadata
      },
      processingTime: Date.now() - startTime
    });
  } catch (error) {
    console.error('[ChatBot API] Executive summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate executive summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/chatbot/aiml/anomalies
 * Detect anomalies in customer vulnerability patterns
 */
router.post('/aiml/anomalies', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { customerFilter, temporalFilter } = req.body;
    
    const anomalies = await aimlEngine.detectAnomalies(customerFilter, temporalFilter);

    const summary = {
      total: anomalies.length,
      critical: anomalies.filter(a => a.severityLevel === 'CRITICAL').length,
      high: anomalies.filter(a => a.severityLevel === 'HIGH').length,
      medium: anomalies.filter(a => a.severityLevel === 'MEDIUM').length,
      topAccount: anomalies[0]?.customerName,
      topRiskScore: anomalies[0]?.riskScore.percentage
    };

    res.json({
      success: true,
      summary,
      anomalies,
      processingTime: Date.now() - startTime
    });
  } catch (error) {
    console.error('[ChatBot API] Anomaly detection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect anomalies',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/chatbot/aiml/field-notice-comparison
 * Compare and prioritize field notices
 */
router.post('/aiml/field-notice-comparison', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { fieldNoticeIds, customerFilter, temporalFilter } = req.body;
    
    const comparisons = await aimlEngine.compareFieldNotices(
      fieldNoticeIds,
      customerFilter,
      temporalFilter
    );

    const summary = {
      total: comparisons.length,
      critical: comparisons.filter(c => c.severityClassification === 'CRITICAL').length,
      high: comparisons.filter(c => c.severityClassification === 'HIGH').length,
      medium: comparisons.filter(c => c.severityClassification === 'MEDIUM').length,
      topPriority: comparisons[0]?.fieldNoticeId,
      topScore: comparisons[0]?.weightedScore
    };

    res.json({
      success: true,
      summary,
      comparisons,
      processingTime: Date.now() - startTime
    });
  } catch (error) {
    console.error('[ChatBot API] Field notice comparison error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare field notices',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/chatbot/aiml/generate
 * Generate comprehensive AIML response
 */
router.post('/aiml/generate', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { query, format, customerFilter, temporalFilter, includeAnomalies, includeComparisons } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    const response = await aimlEngine.generateAIMLResponse(query, {
      format: format || 'executive',
      customerFilter,
      temporalFilter,
      includeAnomalies: includeAnomalies !== false,
      includeComparisons: includeComparisons !== false
    });

    res.json({
      success: true,
      response: {
        content: response.content,
        format: response.format,
        sections: response.sections,
        insights: response.insights,
        recommendations: response.recommendations,
        confidence: response.confidence
      },
      anomalies: response.anomalies,
      comparisons: response.comparisons,
      metadata: response.metadata,
      processingTime: Date.now() - startTime
    });
  } catch (error) {
    console.error('[ChatBot API] AIML generate error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AIML response',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/chatbot/aiml/latest-month
 * Get data for the latest available month
 */
router.get('/aiml/latest-month', async (req: Request, res: Response) => {
  try {
    const data = await aimlEngine.getLatestMonthData();

    res.json({
      success: true,
      month: data.month,
      recordCount: data.records.length,
      summary: {
        vulnerable: data.records.reduce((sum, r) => sum + r.totVuln, 0),
        potentiallyVulnerable: data.records.reduce((sum, r) => sum + r.potVuln, 0),
        secure: data.records.reduce((sum, r) => sum + r.notVuln, 0)
      }
    });
  } catch (error) {
    console.error('[ChatBot API] Latest month error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get latest month data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==========================================
// KPI STORYTELLING ENGINE ENDPOINTS
// ==========================================

/**
 * GET /api/chatbot/kpi/story
 * Full KPI intelligence briefing with narratives
 */
router.get('/kpi/story', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const story = await kpiStorytellingEngine.generateFullStory();

    res.json({
      success: true,
      generatedAt: story.generatedAt,
      overallHealth: story.overallHealth,
      overallScore: story.overallScore,
      executiveSummary: story.executiveSummary,
      kpiSnapshots: story.kpiSnapshots,
      narratives: story.narratives,
      crossInsights: story.crossInsights,
      voiceBriefing: story.voiceBriefing,
      processingTime: Date.now() - startTime
    });
  } catch (error) {
    console.error('[ChatBot API] KPI story error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate KPI story',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/chatbot/kpi/definitions
 * List all KPI definitions with formulas and targets
 */
router.get('/kpi/definitions', (req: Request, res: Response) => {
  res.json({
    success: true,
    kpis: kpiStorytellingEngine.getAllKPIDefinitions(),
    count: kpiStorytellingEngine.getAllKPIDefinitions().length
  });
});

/**
 * GET /api/chatbot/kpi/:kpiId
 * Deep dive into a specific KPI
 */
router.get('/kpi/:kpiId', async (req: Request, res: Response) => {
  try {
    const { kpiId } = req.params;
    const definition = kpiStorytellingEngine.getKPIDefinition(kpiId);

    if (!definition) {
      return res.status(404).json({
        success: false,
        error: `KPI '${kpiId}' not found`,
        availableKPIs: kpiStorytellingEngine.getAllKPIDefinitions().map(k => k.id)
      });
    }

    const snapshots = await kpiStorytellingEngine.computeSnapshots();
    const snapshot = snapshots.find(s => s.kpiId === kpiId);

    if (!snapshot) {
      return res.status(500).json({
        success: false,
        error: `Could not compute snapshot for KPI '${kpiId}'`
      });
    }

    const narrative = await (kpiStorytellingEngine as any).generateNarrative(snapshot);

    res.json({
      success: true,
      definition,
      snapshot,
      narrative
    });
  } catch (error) {
    console.error('[ChatBot API] KPI detail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get KPI details',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/chatbot/kpi/ask
 * Ask a natural language question about KPIs
 */
router.post('/kpi/ask', async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Request body must include a "question" string'
      });
    }

    const startTime = Date.now();
    const answer = await kpiStorytellingEngine.answerKPIQuestion(question);

    res.json({
      success: true,
      response: answer.response,
      voiceResponse: answer.voiceResponse,
      attachments: answer.attachments,
      suggestions: answer.suggestions,
      processingTime: Date.now() - startTime
    });
  } catch (error) {
    console.error('[ChatBot API] KPI ask error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to answer KPI question',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/chatbot/kpi/voice-briefing
 * Voice-optimized KPI briefing (TTS-ready)
 */
router.get('/kpi/voice-briefing', async (req: Request, res: Response) => {
  try {
    const story = await kpiStorytellingEngine.generateFullStory();

    res.json({
      success: true,
      voiceBriefing: story.voiceBriefing,
      overallHealth: story.overallHealth,
      overallScore: story.overallScore,
      kpiCount: story.kpiSnapshots.length,
      criticalCount: story.kpiSnapshots.filter(s => s.status === 'critical').length,
      generatedAt: story.generatedAt
    });
  } catch (error) {
    console.error('[ChatBot API] Voice briefing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate voice briefing',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
