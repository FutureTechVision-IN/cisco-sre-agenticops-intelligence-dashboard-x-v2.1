/**
 * Voice Profile Enhancement - Integration Examples
 * SRE AgenticOps Intelligence Dashboard
 * 
 * Practical code examples for implementing voice enhancement features
 * in different use cases and contexts.
 * 
 * @version 1.0.0
 */

// ==========================================
// EXAMPLE 1: BASIC SETUP AND INITIALIZATION
// ==========================================

/**
 * Initialize voice service with enhanced features
 */
export function initializeEnhancedVoiceService() {
  import { getVoiceSynthesisService } from './voiceSynthesisService';
  
  // Get singleton instance
  const voiceService = getVoiceSynthesisService('nova');
  
  // Enable all enhancements
  voiceService.setEnhancementEnabled(true);
  
  // Set default voice profile
  voiceService.setProfile('nova');
  
  // Set comfortable default settings
  voiceService.updateSettings({
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    emphasis: 0.6,
    breathPauses: true,
    naturalPauses: true
  });
  
  return voiceService;
}

// ==========================================
// EXAMPLE 2: EXECUTIVE BRIEFING
// ==========================================

/**
 * Configuration for professional executive delivery
 * Use case: C-level summaries, board presentations
 */
export async function deliverExecutiveBriefing(
  voiceService: any,
  briefingText: string
) {
  // Configure for executive delivery
  voiceService.setProfile('nova');
  voiceService.setEmotionalTone('confident');
  voiceService.setVoiceAgeGender('mature-male');
  voiceService.setBreathingPattern('measured');
  
  // Apply optimal executive settings
  voiceService.applyNaturalVoiceOptimization('confident', {
    ageCategory: 'mature',
    gender: 'male',
    formantShift: 0.85,
    vocalTractLength: 1.08
  });
  
  // Apply context-aware pronunciation for numbers/metrics
  const contextualText = voiceService.applyPronunciationContext(briefingText);
  
  // Deliver with statement prosody
  const segments = voiceService.applyProsodyPattern(contextualText, 'statement');
  
  // Speak with executive context
  await voiceService.speak(contextualText, {
    type: 'executive',
    emotionalTone: 'confident',
    importance: 'high',
    audience: 'leadership',
    prosodyPattern: 'statement'
  });
  
  // Collect quality metrics
  return voiceService.getAggregatedMetrics();
}

// ==========================================
// EXAMPLE 3: ALERT/WARNING NOTIFICATION
// ==========================================

/**
 * Configuration for urgent alert delivery
 * Use case: Security warnings, critical system alerts
 */
export async function deliverCriticalAlert(
  voiceService: any,
  alertMessage: string
) {
  // Configure for urgent delivery
  voiceService.setProfile('marcus');
  voiceService.setEmotionalTone('excited');
  voiceService.setVoiceAgeGender('adult-male');
  voiceService.setBreathingPattern('excited');
  
  // Apply excited, high-energy settings
  voiceService.updateSettings({
    rate: 1.15,
    pitch: 1.15,
    emphasis: 0.85,
    breathingFrequency: 25
  });
  
  // Add natural hesitations for urgency
  const withHesitations = voiceService.injectNaturalHesitations(
    alertMessage,
    'excited'
  );
  
  // Apply context-aware adjustments for alert keywords
  const contextualAlert = voiceService.applyPronunciationContext(withHesitations);
  
  // Deliver with emphasis prosody
  const segments = voiceService.applyProsodyPattern(contextualAlert, 'emphasis');
  
  // Speak alert
  await voiceService.speak(contextualAlert, {
    type: 'urgent',
    emotionalTone: 'excited',
    importance: 'critical',
    prosodyPattern: 'emphasis'
  });
}

// ==========================================
// EXAMPLE 4: CUSTOMER SERVICE INTERACTION
// ==========================================

/**
 * Configuration for friendly, helpful customer service
 * Use case: Support calls, customer assistance
 */
export async function deliverCustomerServiceResponse(
  voiceService: any,
  responseText: string,
  customerContext?: { issue: string; status: string }
) {
  // Configure for friendly delivery
  voiceService.setProfile('sophia');
  voiceService.setEmotionalTone('happy');
  voiceService.setVoiceAgeGender('young-female');
  voiceService.setBreathingPattern('casual');
  
  // Apply warm, approachable settings
  voiceService.updateSettings({
    rate: 1.08,
    pitch: 1.1,
    emphasis: 0.7,
    breathingFrequency: 40
  });
  
  // Add natural hesitations for conversational tone
  const conversational = voiceService.injectNaturalHesitations(
    responseText,
    'happy'
  );
  
  // Speak response
  await voiceService.speak(conversational, {
    type: 'conversational',
    emotionalTone: 'friendly',
    importance: 'medium',
    audience: 'general',
    prosodyPattern: 'continuation'
  });
}

// ==========================================
// EXAMPLE 5: TECHNICAL EXPLANATION
// ==========================================

/**
 * Configuration for technical content delivery
 * Use case: Architecture briefs, technical documentation
 */
export async function explainTechnicalConcept(
  voiceService: any,
  technicalContent: string
) {
  // Configure for technical clarity
  voiceService.setProfile('aria');
  voiceService.setEmotionalTone('serious');
  voiceService.setVoiceAgeGender('adult-female');
  voiceService.setBreathingPattern('formal');
  
  // Slower, careful delivery for technical content
  voiceService.updateSettings({
    rate: 0.95,
    pitch: 1.05,
    emphasis: 0.65,
    breathingFrequency: 50
  });
  
  // Apply context-aware pronunciation
  // This will slow down acronyms and technical terms
  const technicallyAdjusted = voiceService.applyPronunciationContext(technicalContent);
  
  // Speak with continuation prosody for flowing explanation
  const segments = voiceService.applyProsodyPattern(
    technicallyAdjusted,
    'continuation'
  );
  
  // Deliver technical content
  await voiceService.speak(technicallyAdjusted, {
    type: 'conversational',
    emotionalTone: 'serious',
    importance: 'high',
    audience: 'technical',
    prosodyPattern: 'continuation'
  });
}

// ==========================================
// EXAMPLE 6: QUESTION DELIVERY WITH RISING INTONATION
// ==========================================

/**
 * Deliver questions with natural rising intonation
 * Use case: Interactive dialogs, clarification requests
 */
export async function askQuestion(
  voiceService: any,
  questionText: string,
  context: 'supportive' | 'serious' | 'curious' = 'curious'
) {
  // Configure based on question context
  const emotionMap = {
    supportive: 'friendly' as const,
    serious: 'concerned' as const,
    curious: 'neutral' as const
  };
  
  voiceService.setEmotionalTone(emotionMap[context]);
  
  // Apply question prosody (rising pitch)
  const segments = voiceService.applyProsodyPattern(questionText, 'question');
  
  // Deliver question
  await voiceService.speak(questionText, {
    type: 'conversational',
    emotionalTone: emotionMap[context],
    prosodyPattern: 'question'
  });
}

// ==========================================
// EXAMPLE 7: DYNAMIC VOICE QUALITY ANALYSIS
// ==========================================

/**
 * Analyze and improve voice quality in real-time
 */
export function analyzeAndImproveVoiceQuality(voiceService: any): {
  issues: string[];
  recommendations: string[];
  improvements: number;
} {
  // Analyze current voice
  const analysis = voiceService.analyzeVoiceQuality();
  
  console.log(`Voice robotic severity: ${analysis.severityScore}/100`);
  console.log('Issues detected:', analysis.factors);
  console.log('Recommendations:', analysis.recommendations);
  
  // Auto-apply improvements if severity > 50
  if (analysis.severityScore > 50) {
    // Enable all enhancements
    voiceService.setEnhancementEnabled(true);
    
    // Apply natural settings
    voiceService.applyNaturalVoiceOptimization('neutral');
    
    // Set good breathing
    voiceService.setBreathingPattern('natural');
    
    // Return improvement estimate
    return {
      issues: Object.entries(analysis.factors)
        .filter(([_, v]) => v)
        .map(([k]) => k),
      recommendations: analysis.recommendations,
      improvements: Math.max(0, 100 - analysis.severityScore)
    };
  }
  
  return {
    issues: [],
    recommendations: [],
    improvements: 100
  };
}

// ==========================================
// EXAMPLE 8: A/B TESTING SETUP
// ==========================================

/**
 * Configure A/B test comparing standard vs. enhanced voice
 */
export async function setupABTestComparison(
  voiceService: any,
  testText: string
): Promise<{
  controlSample: string;
  treatmentSample: string;
  testResults: any;
}> {
  import { TestSessionManager } from './voiceQualityTesting';
  
  const sessionManager = new TestSessionManager();
  
  // Create test samples
  const samples = [
    {
      sampleId: 'control_1',
      text: testText,
      profileId: 'nova',
      sampleType: 'control' as const,
      duration: 5
    },
    {
      sampleId: 'treatment_1',
      text: testText,
      profileId: 'nova',
      sampleType: 'treatment' as const,
      emotionalTone: 'neutral',
      duration: 5
    }
  ];
  
  // Create session
  const session = sessionManager.createSession(
    'ab',
    samples,
    5,  // 5 raters
    'Comparison of standard vs. enhanced voice synthesis'
  );
  
  // Control group: baseline
  voiceService.setABTestGroup('control');
  await voiceService.speak(testText);
  
  // Treatment group: with enhancements
  voiceService.setABTestGroup('enhanced');
  voiceService.setEmotionalTone('neutral');
  voiceService.applyNaturalVoiceOptimization('neutral');
  await voiceService.speak(testText);
  
  // Simulate rater preferences
  const controlScores = [3.5, 3.2, 3.8, 3.4, 3.6];
  const treatmentScores = [4.2, 4.5, 4.1, 4.3, 4.4];
  
  // Analyze results
  import { ABTestAnalyzer } from './voiceQualityTesting';
  
  const prefs = ABTestAnalyzer.calculatePreferences(controlScores, treatmentScores);
  const tTest = ABTestAnalyzer.performPairedTTest(controlScores, treatmentScores);
  const effectSize = ABTestAnalyzer.calculateEffectSize(controlScores, treatmentScores);
  
  return {
    controlSample: 'control_1',
    treatmentSample: 'treatment_1',
    testResults: {
      preferences: prefs,
      significance: tTest.pValue < 0.05,
      pValue: tTest.pValue,
      effectSize: effectSize,
      conclusion: tTest.pValue < 0.05 
        ? `Enhancement is statistically significant (p=${tTest.pValue.toFixed(4)})`
        : 'No statistically significant improvement'
    }
  };
}

// ==========================================
// EXAMPLE 9: CONTEXT-AWARE VOICE ADAPTATION
// ==========================================

/**
 * Automatically adapt voice based on message content
 */
export async function adaptiveVoiceDelivery(
  voiceService: any,
  message: string
) {
  // Detect context from message
  const context = voiceService.detectContext(message);
  
  console.log(`Detected context: ${context.type}`);
  console.log(`Emotional tone: ${context.emotionalTone}`);
  
  // Select voice profile based on context
  let profile = 'nova';
  let emotional = 'neutral' as const;
  
  if (context.type === 'urgent') {
    profile = 'marcus';
    emotional = 'excited';
  } else if (context.type === 'success') {
    profile = 'sophia';
    emotional = 'happy';
  } else if (context.type === 'warning') {
    profile = 'aria';
    emotional = 'concerned';
  }
  
  // Apply adaptive settings
  voiceService.setProfile(profile);
  voiceService.setEmotionalTone(emotional);
  voiceService.applyNaturalVoiceOptimization(emotional);
  
  // Apply context modulation
  const settings = voiceService.applyContextModulation(context);
  
  // Deliver
  await voiceService.speak(message, context);
}

// ==========================================
// EXAMPLE 10: FULL CONVERSATION FLOW
// ==========================================

/**
 * Complete conversation with multiple turns,
 * each with appropriate voice settings
 */
export async function conductConversation(voiceService: any) {
  // Greeting - friendly
  await deliverCustomerServiceResponse(
    voiceService,
    "Hello! I'm your AI assistant. How can I help you today?"
  );
  
  // Wait for user input...
  const userMessage = "I need to understand our system performance";
  
  // Response 1 - Adaptive based on content
  if (userMessage.includes('performance')) {
    // Use serious, technical tone
    await explainTechnicalConcept(
      voiceService,
      "Let me explain our performance metrics. We monitor CPU utilization, memory usage, and network throughput across all systems."
    );
  }
  
  // Follow-up question - Use rising intonation
  await askQuestion(
    voiceService,
    "Would you like me to explain how we handle load balancing?",
    'curious'
  );
  
  // Critical alert during conversation
  // Interrupt with alert
  await deliverCriticalAlert(
    voiceService,
    "Attention! We've detected a critical security vulnerability in one of your systems!"
  );
  
  // Resolution - Professional close
  await deliverExecutiveBriefing(
    voiceService,
    "I've initiated the security patch deployment. Your systems are now protected."
  );
  
  // Get metrics for the entire conversation
  const metrics = voiceService.getAggregatedMetrics();
  console.log('Conversation quality metrics:', metrics);
}

// ==========================================
// EXAMPLE 11: VOICE QUALITY MONITORING
// ==========================================

/**
 * Monitor voice quality over time and alert if degradation detected
 */
export function setupVoiceQualityMonitoring(
  voiceService: any,
  degradationThreshold: number = 20  // Points
) {
  let lastMetrics = voiceService.getAggregatedMetrics();
  let qualityTrend: number[] = [lastMetrics.avgUserRating || 0];
  
  const monitoringInterval = setInterval(() => {
    const currentMetrics = voiceService.getAggregatedMetrics();
    
    // Calculate quality score (0-100)
    const qualityScore = (currentMetrics.avgUserRating || 3) * 20;
    qualityTrend.push(qualityScore);
    
    // Keep only last 10 measurements
    if (qualityTrend.length > 10) {
      qualityTrend.shift();
    }
    
    // Check for degradation
    const avgRecent = qualityTrend.reduce((a, b) => a + b, 0) / qualityTrend.length;
    const avgPrevious = (lastMetrics.avgUserRating || 3) * 20;
    const degradation = avgPrevious - avgRecent;
    
    if (degradation > degradationThreshold) {
      console.warn(`Voice quality degradation detected: ${degradation.toFixed(1)} points`);
      
      // Auto-correct
      console.log('Applying voice optimization...');
      voiceService.applyNaturalVoiceOptimization('neutral');
    }
    
    lastMetrics = currentMetrics;
  }, 30000);  // Check every 30 seconds
  
  return () => clearInterval(monitoringInterval);
}

// ==========================================
// EXAMPLE 12: VOICE PRESET MANAGER
// ==========================================

/**
 * Manage and switch between pre-configured voice presets
 */
export const VOICE_PRESETS = {
  executiveBriefing: {
    profile: 'nova',
    emotionalTone: 'confident' as const,
    ageGender: 'mature-male',
    breathing: 'measured' as const,
    rate: 0.92,
    pitch: 0.95,
    emphasis: 0.6
  },
  technicalSupport: {
    profile: 'aria',
    emotionalTone: 'serious' as const,
    ageGender: 'adult-female',
    breathing: 'formal' as const,
    rate: 0.95,
    pitch: 1.05,
    emphasis: 0.65
  },
  customerService: {
    profile: 'sophia',
    emotionalTone: 'happy' as const,
    ageGender: 'young-female',
    breathing: 'casual' as const,
    rate: 1.08,
    pitch: 1.1,
    emphasis: 0.7
  },
  securityAlert: {
    profile: 'marcus',
    emotionalTone: 'excited' as const,
    ageGender: 'adult-male',
    breathing: 'excited' as const,
    rate: 1.15,
    pitch: 1.15,
    emphasis: 0.85
  }
};

/**
 * Apply preset to voice service
 */
export function applyVoicePreset(
  voiceService: any,
  presetName: keyof typeof VOICE_PRESETS
) {
  const preset = VOICE_PRESETS[presetName];
  
  voiceService.setProfile(preset.profile);
  voiceService.setEmotionalTone(preset.emotionalTone);
  voiceService.setVoiceAgeGender(preset.ageGender);
  voiceService.setBreathingPattern(preset.breathing);
  voiceService.updateSettings({
    rate: preset.rate,
    pitch: preset.pitch,
    emphasis: preset.emphasis
  });
  
  console.log(`Applied voice preset: ${presetName}`);
}

export default {
  initializeEnhancedVoiceService,
  deliverExecutiveBriefing,
  deliverCriticalAlert,
  deliverCustomerServiceResponse,
  explainTechnicalConcept,
  askQuestion,
  analyzeAndImproveVoiceQuality,
  setupABTestComparison,
  adaptiveVoiceDelivery,
  conductConversation,
  setupVoiceQualityMonitoring,
  applyVoicePreset,
  VOICE_PRESETS
};
