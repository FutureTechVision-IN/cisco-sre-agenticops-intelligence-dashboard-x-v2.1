/**
 * Enhanced Voice AI Types
 * 
 * Shared type definitions for the Enhanced Voice AI system
 * Supporting multi-language, conversation context, and advanced analytics
 * 
 * @module VoiceAITypes
 * @version 3.0.0
 */

// ==========================================
// LANGUAGE TYPES
// ==========================================

export type SupportedLanguage = 
  | 'en-US' | 'en-GB' | 'en-AU' | 'en-IN'
  | 'es-ES' | 'es-MX'
  | 'fr-FR' | 'fr-CA'
  | 'de-DE'
  | 'pt-BR' | 'pt-PT'
  | 'it-IT'
  | 'ja-JP'
  | 'zh-CN' | 'zh-TW'
  | 'ko-KR'
  | 'hi-IN'
  | 'ar-SA'
  | 'ru-RU'
  | 'nl-NL'
  | 'sv-SE';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  voiceName: string;
  ssmlLang: string;
}

// ==========================================
// AUDIO QUALITY TYPES
// ==========================================

export interface AudioQualityMetrics {
  signalToNoiseRatio: number;
  backgroundNoiseLevel: 'low' | 'medium' | 'high' | 'very-high';
  speechClarity: number;
  confidence: number;
  recommendedAction?: 'proceed' | 'retry' | 'move-to-quiet-area';
}

// ==========================================
// CONVERSATION TYPES
// ==========================================

export interface ConversationContext {
  conversationId: string;
  messages: ConversationMessage[];
  currentTopic?: string;
  entitiesDiscussed: ExtractedEntity[];
  summaryLevel: 'brief' | 'standard' | 'detailed' | 'comprehensive';
  userPreferences: UserVoicePreferences;
  sessionStartTime: Date;
  lastInteractionTime: Date;
  totalInteractions: number;
  followUpSuggestions: string[];
}

export interface ConversationMessage {
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
  entities?: ExtractedEntity[];
  audioQuality?: AudioQualityMetrics;
}

export interface UserVoicePreferences {
  preferredLanguage: SupportedLanguage;
  speechRate: 'slow' | 'normal' | 'fast';
  voiceStyle: 'professional' | 'friendly' | 'concise';
  detailLevel: 'minimal' | 'standard' | 'detailed';
  enableVisualFeedback: boolean;
  enableSoundEffects: boolean;
}

// ==========================================
// NLP TYPES
// ==========================================

export type VoiceIntent = 
  | 'TREND_ANALYSIS'
  | 'ANOMALY_DETECTION'
  | 'SYSTEM_STATUS'
  | 'METRICS_OVERVIEW'
  | 'CUSTOMER_INSIGHTS'
  | 'PRIORITIZATION'
  | 'EXECUTIVE_SUMMARY'
  | 'FIELD_NOTICE_QUERY'
  | 'VULNERABILITY_REPORT'
  | 'RISK_ASSESSMENT'
  | 'RECOMMENDATION_REQUEST'
  | 'DATA_COMPARISON'
  | 'FORECAST_REQUEST'
  | 'HELP_REQUEST'
  | 'NAVIGATION'
  | 'UNKNOWN';

export interface NLPAnalysis {
  intent: VoiceIntent;
  confidence: number;
  entities: ExtractedEntity[];
  sentiment: 'positive' | 'neutral' | 'negative';
  keywords: string[];
  semanticVector?: number[];
}

export interface ExtractedEntity {
  type: 'customer' | 'fieldNotice' | 'metric' | 'date' | 'number' | 'status' | 'action';
  value: string;
  confidence: number;
  normalized?: string;
}

// ==========================================
// REQUEST/RESPONSE TYPES
// ==========================================

export interface VoiceCommandRequest {
  transcript: string;
  userId?: string;
  sessionId?: string;
  context?: CommandContext;
}

export interface EnhancedVoiceCommandRequest extends VoiceCommandRequest {
  language?: SupportedLanguage;
  audioQuality?: AudioQualityMetrics;
  conversationId?: string;
  followUpTo?: string;
  executiveSummaryDepth?: 'brief' | 'standard' | 'detailed' | 'comprehensive';
  outputFormat?: 'narrative' | 'structured' | 'bullet-points';
  targetAudience?: 'ceo' | 'cto' | 'ciso' | 'operations' | 'technical' | 'general';
}

export interface CommandContext {
  previousCommands?: string[];
  userPreferences?: Record<string, any>;
  currentView?: string;
  timeOfDay?: string;
  selectedFilters?: Record<string, string>;
}

// ==========================================
// RESPONSE TYPES
// ==========================================

export interface VoiceResponse {
  text: string;
  ssml?: string;
  visualContent?: VisualContent;
  actions?: SuggestedAction[];
  followUp?: string;
}

export interface VisualContent {
  type: 'metrics' | 'chart' | 'table' | 'summary' | 'recommendations';
  data: any;
  metrics?: string[];
  showPredictions?: boolean;
  showAnomalies?: boolean;
  showRecommendations?: boolean;
}

export interface SuggestedAction {
  label: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AIResponse {
  success: boolean;
  transcript: string;
  nlpAnalysis: NLPAnalysis;
  response: VoiceResponse;
  executiveSummary?: ExecutiveSummary;
  processingTime: number;
  modelInfo: {
    nlp: string;
    reasoning: string;
    version: string;
  };
}

export interface EnhancedAIResponse extends AIResponse {
  conversationContext?: Partial<ConversationContext>;
  enhancedExecutiveSummary?: EnhancedExecutiveSummary;
  deepReasoningInsights?: DeepReasoningInsights;
  qualityMetrics: ResponseQualityMetrics;
  multiLanguageResponse?: MultiLanguageResponse;
  interactiveElements?: InteractiveElement[];
  followUpQuestions?: FollowUpQuestion[];
}

// ==========================================
// EXECUTIVE SUMMARY TYPES
// ==========================================

export interface ExecutiveSummary {
  headline: string;
  keyInsights: string[];
  riskAssessment: {
    level: 'critical' | 'high' | 'medium' | 'low';
    score: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  metrics: {
    label: string;
    value: string | number;
    change?: string;
    status: 'good' | 'warning' | 'critical';
  }[];
  generatedAt: string;
  confidence: number;
}

export interface EnhancedExecutiveSummary extends ExecutiveSummary {
  executiveNarrative: string;
  audienceSpecificSummary: {
    ceo: string;
    cto: string;
    ciso: string;
    operations: string;
    technical: string;
  };
  visualizationRecommendations: string[];
  comparativeAnalysis?: {
    vsLastPeriod: string;
    vsIndustryBenchmark: string;
    vsTargets: string;
  };
  actionableInsights: ActionableInsight[];
  decisionMatrix?: DecisionMatrixEntry[];
  riskScenarios: RiskScenario[];
  deepAnalytics: {
    bayesianProbabilities?: Record<string, number>;
    causalFactors?: string[];
    predictedOutcomes?: PredictedOutcome[];
    uncertaintyBounds?: { lower: number; upper: number; confidence: number };
  };
}

export interface ActionableInsight {
  priority: 'critical' | 'high' | 'medium' | 'low';
  insight: string;
  impact: string;
  recommendedAction: string;
  estimatedEffort: 'minimal' | 'moderate' | 'significant' | 'major';
  deadline?: string;
  owner?: string;
  dependencies?: string[];
}

export interface DecisionMatrixEntry {
  decision: string;
  options: {
    option: string;
    score: number;
    pros: string[];
    cons: string[];
    riskLevel: 'low' | 'medium' | 'high';
  }[];
  recommendedOption: string;
  confidenceLevel: number;
}

export interface RiskScenario {
  scenario: string;
  probability: number;
  impact: 'catastrophic' | 'severe' | 'moderate' | 'minor' | 'negligible';
  mitigationStrategies: string[];
  earlyWarningIndicators: string[];
}

export interface PredictedOutcome {
  outcome: string;
  probability: number;
  timeframe: string;
  drivingFactors: string[];
  uncertaintyLevel: 'low' | 'medium' | 'high';
}

// ==========================================
// DEEP REASONING TYPES
// ==========================================

export interface DeepReasoningInsights {
  bayesianAnalysis?: {
    keyProbabilities: Record<string, number>;
    posteriorUpdates: string[];
    uncertaintyQuantification: string;
  };
  causalAnalysis?: {
    rootCauses: string[];
    causalChain: string[];
    interventionRecommendations: string[];
  };
  temporalPatterns?: {
    trends: string[];
    seasonality: string[];
    anomalies: string[];
  };
  gameTheoretic?: {
    optimalStrategies: string[];
    competitiveAnalysis: string;
    equilibriumState: string;
  };
}

// ==========================================
// QUALITY METRICS TYPES
// ==========================================

export interface ResponseQualityMetrics {
  accuracy: number;
  responseTime: number;
  confidenceScore: number;
  relevanceScore: number;
  completenessScore: number;
  qualityGrade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'needs-improvement';
}

// ==========================================
// MULTI-LANGUAGE TYPES
// ==========================================

export interface MultiLanguageResponse {
  primaryLanguage: SupportedLanguage;
  translations: Partial<Record<SupportedLanguage, {
    text: string;
    ssml?: string;
    confidence: number;
  }>>;
}

// ==========================================
// INTERACTIVE ELEMENT TYPES
// ==========================================

export interface InteractiveElement {
  elementId: string;
  type: 'chart' | 'table' | 'metric-card' | 'drill-down' | 'filter' | 'comparison';
  label: string;
  description: string;
  voiceCommand: string;
  dataBindings: Record<string, string>;
}

export interface FollowUpQuestion {
  questionId: string;
  question: string;
  category: 'clarification' | 'deep-dive' | 'comparison' | 'action' | 'prediction';
  priority: number;
  expectedValueAdd: string;
}

// ==========================================
// FEEDBACK TYPES
// ==========================================

export interface VoiceFeedback {
  conversationId?: string;
  messageId?: string;
  feedback: 'positive' | 'negative';
  feedbackType?: string;
  correction?: string;
  rating?: number;
  suggestions?: string;
}

// ==========================================
// ANALYTICS TYPES
// ==========================================

export interface VoiceAnalytics {
  period: string;
  totalRequests: number;
  averageResponseTime: number;
  averageAccuracy: number;
  qualityGradeDistribution: Record<string, number>;
  topIntents: Array<{
    intent: string;
    count: number;
    percentage: number;
  }>;
  languageUsage: Record<string, number>;
  audienceDistribution: Record<string, number>;
  satisfactionScore: number;
  feedbackCount: number;
}

// ==========================================
// CAPABILITY TYPES
// ==========================================

export interface VoiceAICapabilities {
  languages: {
    supported: number;
    list: string[];
    default: string;
  };
  intents: Array<{
    id: string;
    description: string;
    examples: string[];
  }>;
  features: {
    nlp: {
      intentRecognition: boolean;
      entityExtraction: boolean;
      sentimentAnalysis: boolean;
      contextAwareness: boolean;
      multiLanguage: boolean;
      conversationMemory: boolean;
    };
    ai: {
      deepLearning: boolean;
      adaptiveLearning: boolean;
      executiveSummaries: boolean;
      predictiveAnalytics: boolean;
      bayesianReasoning: boolean;
      causalDiscovery: boolean;
      temporalPatterns: boolean;
      gameTheoreticAnalysis: boolean;
    };
    audio: {
      qualityAnalysis: boolean;
      noiseReduction: boolean;
      speechClarity: boolean;
      signalToNoiseRatio: boolean;
    };
    conversation: {
      contextPersistence: boolean;
      followUpSuggestions: boolean;
      interactiveElements: boolean;
      historyRetrieval: boolean;
      sessionExpiry: string;
    };
    executive: {
      audienceSpecific: string[];
      depthLevels: string[];
      decisionMatrices: boolean;
      riskScenarios: boolean;
      actionableInsights: boolean;
    };
    quality: {
      targetAccuracy: string;
      targetResponseTime: string;
      qualityGrading: boolean;
      confidenceScoring: boolean;
    };
  };
}

// ==========================================
// HEALTH CHECK TYPES
// ==========================================

export interface VoiceAIHealthStatus {
  success: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  services: {
    nlpEngine: 'operational' | 'degraded' | 'down';
    deepReasoningEngine: 'operational' | 'degraded' | 'down';
    conversationManager: 'operational' | 'degraded' | 'down';
    audioAnalyzer: 'operational' | 'degraded' | 'down';
    executiveSummaryGenerator: 'operational' | 'degraded' | 'down';
  };
  uptime: number;
  memory: {
    used: number;
    total: number;
    unit: string;
  };
}
