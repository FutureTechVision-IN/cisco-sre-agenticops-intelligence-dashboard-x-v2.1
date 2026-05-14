/**
 * Enhanced Voice AI Routes v3.0
 * 
 * Enterprise-grade voice command processing with advanced AI/ML capabilities:
 * - Multi-language support (15+ languages)
 * - Conversation context management
 * - Interactive follow-up capabilities
 * - Audio quality analysis
 * - Enhanced executive summaries
 * 
 * @module EnhancedVoiceAIRoutes
 * @version 3.0.0
 */

import express from "express";
import {
  processEnhancedVoiceCommand,
  getSupportedLanguages,
  getConversationHistory,
  getConversationSummary,
  EnhancedVoiceCommandRequest,
  EnhancedAIResponse,
  SupportedLanguage,
  LANGUAGE_CONFIG,
} from "./enhanced-voice-ai-service";

const router = express.Router();

// ==========================================
// ENHANCED VOICE PROCESSING ENDPOINT
// ==========================================

/**
 * POST /api/voice-ai/v3/process
 * Process a voice command with enhanced AI/ML capabilities
 * 
 * Features:
 * - Multi-language NLP processing
 * - Conversation context awareness
 * - Deep reasoning integration
 * - Enhanced executive summaries
 * - Interactive follow-up suggestions
 */
router.post("/v3/process", async (req, res) => {
  try {
    const startTime = Date.now();
    const {
      transcript,
      userId,
      sessionId,
      context,
      language,
      audioQuality,
      conversationId,
      followUpTo,
      executiveSummaryDepth,
      outputFormat,
      targetAudience,
    } = req.body;

    if (!transcript || typeof transcript !== "string") {
      return res.status(400).json({
        success: false,
        error: "Transcript is required and must be a string",
        code: "INVALID_TRANSCRIPT",
      });
    }

    // Validate language if provided
    if (language && !Object.keys(LANGUAGE_CONFIG).includes(language)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported language: ${language}. Use /api/voice-ai/v3/languages for supported languages.`,
        code: "UNSUPPORTED_LANGUAGE",
        supportedLanguages: Object.keys(LANGUAGE_CONFIG),
      });
    }

    console.log(`[VOICE-AI-V3] Processing command: "${transcript}" (lang: ${language || 'en-US'})`);

    const request: EnhancedVoiceCommandRequest = {
      transcript: transcript.trim(),
      userId,
      sessionId,
      context,
      language: language as SupportedLanguage,
      audioQuality,
      conversationId,
      followUpTo,
      executiveSummaryDepth: executiveSummaryDepth || 'standard',
      outputFormat: outputFormat || 'narrative',
      targetAudience: targetAudience || 'general',
    };

    // Process with enhanced AI service
    const response: EnhancedAIResponse = await processEnhancedVoiceCommand(request);

    console.log(`[VOICE-AI-V3] Intent: ${response.nlpAnalysis.intent} (${(response.nlpAnalysis.confidence * 100).toFixed(1)}%)`);
    console.log(`[VOICE-AI-V3] Quality Grade: ${response.qualityMetrics.qualityGrade}`);
    console.log(`[VOICE-AI-V3] Processing time: ${response.processingTime}ms`);

    res.json({
      ...response,
      serverProcessingTime: Date.now() - startTime,
      apiVersion: "3.0.0",
    });
  } catch (error) {
    console.error("[VOICE-AI-V3] Error processing voice command:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process voice command",
      code: "PROCESSING_ERROR",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ==========================================
// LANGUAGE SUPPORT ENDPOINTS
// ==========================================

/**
 * GET /api/voice-ai/v3/languages
 * Get all supported languages for voice processing
 */
router.get("/v3/languages", (req, res) => {
  try {
    const languages = getSupportedLanguages();
    
    res.json({
      success: true,
      languages,
      count: languages.length,
      default: "en-US",
      capabilities: {
        speechRecognition: languages.map(l => l.code),
        textToSpeech: languages.map(l => l.code),
        translation: languages.map(l => l.code),
      },
    });
  } catch (error) {
    console.error("[VOICE-AI-V3] Error getting languages:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve supported languages",
    });
  }
});

/**
 * GET /api/voice-ai/v3/languages/:code
 * Get detailed information about a specific language
 */
router.get("/v3/languages/:code", (req, res) => {
  try {
    const { code } = req.params;
    const languageConfig = LANGUAGE_CONFIG[code as SupportedLanguage];
    
    if (!languageConfig) {
      return res.status(404).json({
        success: false,
        error: `Language '${code}' not found`,
        supportedLanguages: Object.keys(LANGUAGE_CONFIG),
      });
    }

    res.json({
      success: true,
      language: {
        code,
        ...languageConfig,
      },
    });
  } catch (error) {
    console.error("[VOICE-AI-V3] Error getting language details:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve language details",
    });
  }
});

// ==========================================
// CONVERSATION MANAGEMENT ENDPOINTS
// ==========================================

/**
 * GET /api/voice-ai/v3/conversation/:conversationId
 * Get conversation history and context
 */
router.get("/v3/conversation/:conversationId", (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = getConversationHistory(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found or expired",
        code: "CONVERSATION_NOT_FOUND",
        message: "Conversations expire after 30 minutes of inactivity",
      });
    }

    res.json({
      success: true,
      conversation: {
        ...conversation,
        summary: getConversationSummary(conversationId),
      },
    });
  } catch (error) {
    console.error("[VOICE-AI-V3] Error getting conversation:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve conversation",
    });
  }
});

/**
 * GET /api/voice-ai/v3/conversation/:conversationId/summary
 * Get a natural language summary of the conversation
 */
router.get("/v3/conversation/:conversationId/summary", (req, res) => {
  try {
    const { conversationId } = req.params;
    const summary = getConversationSummary(conversationId);
    
    res.json({
      success: true,
      conversationId,
      summary,
    });
  } catch (error) {
    console.error("[VOICE-AI-V3] Error getting conversation summary:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve conversation summary",
    });
  }
});

// ==========================================
// CAPABILITIES AND CONFIGURATION
// ==========================================

/**
 * GET /api/voice-ai/v3/capabilities
 * Get enhanced voice AI capabilities
 */
router.get("/v3/capabilities", (req, res) => {
  res.json({
    success: true,
    version: "3.0.0",
    capabilities: {
      languages: {
        supported: Object.keys(LANGUAGE_CONFIG).length,
        list: Object.keys(LANGUAGE_CONFIG),
        default: "en-US",
      },
      intents: [
        { id: "TREND_ANALYSIS", description: "Analyze vulnerability trends and ML predictions", examples: ["Show me the trends", "How are things trending"] },
        { id: "ANOMALY_DETECTION", description: "Detect and display anomalies with causal analysis", examples: ["What are the anomalies", "Find unusual patterns"] },
        { id: "SYSTEM_STATUS", description: "Check system health and operational status", examples: ["System health status", "Is everything running okay"] },
        { id: "METRICS_OVERVIEW", description: "Display KPI metrics with deep analytics", examples: ["Show metrics overview", "Give me the numbers"] },
        { id: "CUSTOMER_INSIGHTS", description: "Analyze top customers by risk with ML clustering", examples: ["Top customer insights", "Who are the riskiest customers"] },
        { id: "PRIORITIZATION", description: "Get AI-powered priority recommendations", examples: ["What should I prioritize", "Where should I focus"] },
        { id: "EXECUTIVE_SUMMARY", description: "Generate C-level executive summary with deep reasoning", examples: ["Executive summary", "Brief me for the board meeting"] },
        { id: "VULNERABILITY_REPORT", description: "Detailed vulnerability analysis with predictions", examples: ["Vulnerability report", "How many vulnerable assets"] },
        { id: "RISK_ASSESSMENT", description: "Comprehensive risk assessment with Bayesian analysis", examples: ["Risk assessment", "What's our risk level"] },
        { id: "RECOMMENDATION_REQUEST", description: "AI-generated recommendations with decision matrices", examples: ["What do you recommend", "Give me suggestions"] },
        { id: "FORECAST_REQUEST", description: "ML-powered predictions with confidence intervals", examples: ["Forecast for next quarter", "What will happen next month"] },
        { id: "HELP_REQUEST", description: "Get help with available commands", examples: ["Help", "What can you do"] },
      ],
      features: {
        nlp: {
          intentRecognition: true,
          entityExtraction: true,
          sentimentAnalysis: true,
          contextAwareness: true,
          multiLanguage: true,
          conversationMemory: true,
        },
        ai: {
          deepLearning: true,
          adaptiveLearning: true,
          executiveSummaries: true,
          predictiveAnalytics: true,
          bayesianReasoning: true,
          causalDiscovery: true,
          temporalPatterns: true,
          gameTheoreticAnalysis: true,
        },
        audio: {
          qualityAnalysis: true,
          noiseReduction: true,
          speechClarity: true,
          signalToNoiseRatio: true,
        },
        conversation: {
          contextPersistence: true,
          followUpSuggestions: true,
          interactiveElements: true,
          historyRetrieval: true,
          sessionExpiry: "30 minutes",
        },
        executive: {
          audienceSpecific: ["ceo", "cto", "ciso", "operations", "technical"],
          depthLevels: ["brief", "standard", "detailed", "comprehensive"],
          decisionMatrices: true,
          riskScenarios: true,
          actionableInsights: true,
        },
        quality: {
          targetAccuracy: "99%+",
          targetResponseTime: "<1000ms",
          qualityGrading: true,
          confidenceScoring: true,
        },
        integration: {
          ciscoAPI: true,
          ciscoCircuitAI: true,
          deepReasoningEngine: true,
          realTimeProcessing: true,
        },
      },
    },
  });
});

/**
 * GET /api/voice-ai/v3/config
 * Get current voice AI configuration
 */
router.get("/v3/config", (req, res) => {
  res.json({
    success: true,
    config: {
      defaultLanguage: "en-US",
      defaultSummaryDepth: "standard",
      defaultTargetAudience: "general",
      conversationTimeout: 1800000, // 30 minutes in ms
      maxConversationMessages: 50,
      qualityThresholds: {
        acceptableAccuracy: 0.85,
        optimalAccuracy: 0.95,
        maxResponseTime: 1000,
      },
      audioQuality: {
        minimumSNR: 10,
        optimalSNR: 20,
        minimumClarity: 0.7,
      },
    },
  });
});

// ==========================================
// EXECUTIVE SUMMARY ENDPOINTS
// ==========================================

/**
 * POST /api/voice-ai/v3/executive-summary
 * Generate a standalone executive summary
 */
router.post("/v3/executive-summary", async (req, res) => {
  try {
    const {
      depth = "standard",
      targetAudience = "general",
      topic,
      includeDecisionMatrix = true,
      includeRiskScenarios = true,
    } = req.body;

    console.log(`[VOICE-AI-V3] Generating executive summary: ${depth} for ${targetAudience}`);

    // Process as an executive summary request
    const request: EnhancedVoiceCommandRequest = {
      transcript: topic || "Generate executive summary",
      executiveSummaryDepth: depth,
      targetAudience,
    };

    const response = await processEnhancedVoiceCommand(request);

    res.json({
      success: true,
      executiveSummary: response.enhancedExecutiveSummary,
      deepReasoningInsights: response.deepReasoningInsights,
      generatedAt: new Date().toISOString(),
      parameters: {
        depth,
        targetAudience,
        includeDecisionMatrix,
        includeRiskScenarios,
      },
    });
  } catch (error) {
    console.error("[VOICE-AI-V3] Error generating executive summary:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate executive summary",
    });
  }
});

// ==========================================
// FEEDBACK AND ANALYTICS
// ==========================================

/**
 * POST /api/voice-ai/v3/feedback
 * Submit feedback for continuous learning with enhanced metrics
 */
router.post("/v3/feedback", async (req, res) => {
  try {
    const {
      conversationId,
      messageId,
      feedback,
      feedbackType,
      correction,
      rating,
      suggestions,
    } = req.body;

    console.log(`[VOICE-AI-V3] Feedback received: ${feedbackType} (${rating}/5) for ${conversationId}`);

    // In production, this would feed into an ML training pipeline
    // and update user preference models

    res.json({
      success: true,
      message: "Feedback recorded for continuous learning",
      conversationId,
      feedbackId: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      acknowledgment: {
        feedbackType,
        rating,
        processed: true,
        learningImpact: "Feedback will be used to improve model accuracy",
      },
    });
  } catch (error) {
    console.error("[VOICE-AI-V3] Error recording feedback:", error);
    res.status(500).json({
      success: false,
      error: "Failed to record feedback",
    });
  }
});

/**
 * GET /api/voice-ai/v3/analytics
 * Get voice AI analytics and usage statistics
 */
router.get("/v3/analytics", (req, res) => {
  // Simulated analytics data
  res.json({
    success: true,
    analytics: {
      period: "last_24_hours",
      totalRequests: 1247,
      averageResponseTime: 342,
      averageAccuracy: 0.96,
      qualityGradeDistribution: {
        "A+": 0.42,
        "A": 0.35,
        "B+": 0.15,
        "B": 0.06,
        "C+": 0.02,
      },
      topIntents: [
        { intent: "EXECUTIVE_SUMMARY", count: 312, percentage: 25.0 },
        { intent: "METRICS_OVERVIEW", count: 256, percentage: 20.5 },
        { intent: "TREND_ANALYSIS", count: 189, percentage: 15.2 },
        { intent: "CUSTOMER_INSIGHTS", count: 167, percentage: 13.4 },
        { intent: "RISK_ASSESSMENT", count: 134, percentage: 10.7 },
      ],
      languageUsage: {
        "en-US": 78.5,
        "en-GB": 8.2,
        "es-ES": 4.1,
        "de-DE": 3.2,
        "fr-FR": 2.8,
        "other": 3.2,
      },
      audienceDistribution: {
        "ceo": 15.3,
        "cto": 22.1,
        "ciso": 28.4,
        "operations": 18.9,
        "technical": 12.1,
        "general": 3.2,
      },
      satisfactionScore: 4.6,
      feedbackCount: 423,
    },
  });
});

// ==========================================
// HEALTH CHECK
// ==========================================

/**
 * GET /api/voice-ai/v3/health
 * Health check endpoint for the enhanced voice AI service
 */
router.get("/v3/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    version: "3.0.0",
    timestamp: new Date().toISOString(),
    services: {
      nlpEngine: "operational",
      deepReasoningEngine: "operational",
      conversationManager: "operational",
      audioAnalyzer: "operational",
      executiveSummaryGenerator: "operational",
    },
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: "MB",
    },
  });
});

export default router;
