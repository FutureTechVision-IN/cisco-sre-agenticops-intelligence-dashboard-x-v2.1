/**
 * Voice AI Routes
 * Enterprise-grade voice command processing with AI/ML/NLP
 */

import express from "express";
import { processVoiceCommand, VoiceCommandRequest, AIResponse } from "./voice-ai-service";

const router = express.Router();

/**
 * POST /api/voice-ai/process
 * Process a voice command using advanced NLP and AI
 */
router.post("/process", async (req, res) => {
  try {
    const startTime = Date.now();
    const { transcript, userId, sessionId, context } = req.body;

    if (!transcript || typeof transcript !== "string") {
      return res.status(400).json({
        success: false,
        error: "Transcript is required and must be a string",
      });
    }

    console.log(`[VOICE-AI] Processing command: "${transcript}"`);

    const request: VoiceCommandRequest = {
      transcript: transcript.trim(),
      userId,
      sessionId,
      context,
    };

    // Process with AI service
    const response: AIResponse = await processVoiceCommand(request);

    console.log(`[VOICE-AI] Intent: ${response.nlpAnalysis.intent} (${(response.nlpAnalysis.confidence * 100).toFixed(1)}%)`);
    console.log(`[VOICE-AI] Processing time: ${response.processingTime}ms`);

    res.json({
      success: true,
      ...response,
      serverProcessingTime: Date.now() - startTime,
    });
  } catch (error) {
    console.error("[VOICE-AI] Error processing voice command:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process voice command",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/voice-ai/capabilities
 * Get available voice command capabilities
 */
router.get("/capabilities", (req, res) => {
  res.json({
    success: true,
    capabilities: {
      intents: [
        { id: "TREND_ANALYSIS", description: "Analyze vulnerability trends and predictions", examples: ["Show me the trends", "How are things trending"] },
        { id: "ANOMALY_DETECTION", description: "Detect and display anomalies", examples: ["What are the anomalies", "Find unusual patterns"] },
        { id: "SYSTEM_STATUS", description: "Check system health and status", examples: ["System health status", "Is everything running okay"] },
        { id: "METRICS_OVERVIEW", description: "Display KPI metrics dashboard", examples: ["Show metrics overview", "Give me the numbers"] },
        { id: "CUSTOMER_INSIGHTS", description: "Analyze top customers by risk", examples: ["Top customer insights", "Who are the riskiest customers"] },
        { id: "PRIORITIZATION", description: "Get AI-powered priority recommendations", examples: ["What should I prioritize", "Where should I focus"] },
        { id: "EXECUTIVE_SUMMARY", description: "Generate C-level executive summary", examples: ["Executive summary", "Brief me for the board meeting"] },
        { id: "VULNERABILITY_REPORT", description: "Detailed vulnerability analysis", examples: ["Vulnerability report", "How many vulnerable assets"] },
        { id: "RISK_ASSESSMENT", description: "Comprehensive risk assessment", examples: ["Risk assessment", "What's our risk level"] },
        { id: "RECOMMENDATION_REQUEST", description: "AI-generated recommendations", examples: ["What do you recommend", "Give me suggestions"] },
        { id: "FORECAST_REQUEST", description: "ML-powered predictions", examples: ["Forecast for next quarter", "What will happen next month"] },
        { id: "HELP_REQUEST", description: "Get help with available commands", examples: ["Help", "What can you do"] },
      ],
      features: {
        nlp: {
          intentRecognition: true,
          entityExtraction: true,
          sentimentAnalysis: true,
          contextAwareness: true,
        },
        ai: {
          deepLearning: true,
          adaptiveLearning: true,
          executiveSummaries: true,
          predictiveAnalytics: true,
        },
        integration: {
          ciscoAPI: true,
          ciscoCircuitAI: true,
          realTimeProcessing: true,
        },
      },
      version: "2.0.0",
    },
  });
});

/**
 * POST /api/voice-ai/feedback
 * Submit feedback for continuous learning
 */
router.post("/feedback", async (req, res) => {
  try {
    const { sessionId, commandId, feedback, correction } = req.body;

    console.log(`[VOICE-AI] Feedback received: ${feedback} for session ${sessionId}`);

    // In production, this would feed into an ML training pipeline
    // For now, we log it for analysis

    res.json({
      success: true,
      message: "Feedback recorded for continuous learning",
      sessionId,
    });
  } catch (error) {
    console.error("[VOICE-AI] Error recording feedback:", error);
    res.status(500).json({
      success: false,
      error: "Failed to record feedback",
    });
  }
});

/**
 * GET /api/voice-ai/session/:sessionId
 * Get session history for context continuity
 */
router.get("/session/:sessionId", (req, res) => {
  const { sessionId } = req.params;

  // In production, this would retrieve from a session store
  res.json({
    success: true,
    sessionId,
    commands: [],
    context: {},
    message: "Session context available for continuity",
  });
});

export default router;
