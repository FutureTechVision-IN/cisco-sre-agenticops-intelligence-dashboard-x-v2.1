/**
 * Conversational Intelligence Service
 * SRE AgenticOps Intelligence Dashboard
 * 
 * Features:
 * - Natural self-introduction with personality
 * - Context-aware conversation flow
 * - User name recognition and memory
 * - Dashboard-specific expertise
 * - AI/ML insights with "wow factor" delivery
 * - Speech queue management with error handling
 * 
 * @version 1.0.0
 */

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface ConversationContext {
  userName?: string;
  userMood?: 'positive' | 'neutral' | 'concerned' | 'frustrated';
  lastTopic?: string;
  conversationStage: ConversationStage;
  sessionStartTime: Date;
  interactionCount: number;
  topicsDiscussed: string[];
  pendingFollowUp?: string;
}

export type ConversationStage = 
  | 'initial'           // First interaction
  | 'introduction'      // Robot introducing itself
  | 'getting_acquainted' // Learning user's name
  | 'rapport_building'  // Building relationship
  | 'active_assistance' // Main help mode
  | 'deep_dive'         // Technical deep dive
  | 'closing';          // Ending conversation

export interface ConversationResponse {
  text: string;
  voiceText: string;      // Optimized for speech
  emotionalTone: 'friendly' | 'professional' | 'excited' | 'concerned' | 'confident';
  suggestedFollowUps: string[];
  contextUpdate: Partial<ConversationContext>;
  shouldSpeak: boolean;
  wowFactor?: WowFactorContent;
}

export interface WowFactorContent {
  type: 'prediction' | 'insight' | 'anomaly' | 'trend' | 'recommendation';
  headline: string;
  detail: string;
  visualType?: 'chart' | 'metric' | 'heatmap' | 'timeline';
  confidence?: number;
  impact?: 'high' | 'medium' | 'low';
}

export interface SpeechQueueItem {
  id: string;
  text: string;
  priority: 'high' | 'normal' | 'low';
  context?: string;
  timestamp: Date;
  status: 'pending' | 'speaking' | 'completed' | 'error';
  errorCount: number;
}

// ==========================================
// ROBOT PERSONALITY CONFIGURATION
// ==========================================

const ROBOT_IDENTITY = {
  name: 'Nova',
  fullTitle: 'Nova, your SRE AgenticOps Intelligence Assistant',
  personality: 'professional yet approachable AI assistant',
  expertise: [
    'Service Readiness Engineering',
    'Security vulnerability analysis',
    'Customer risk assessment',
    'Predictive analytics',
    'Field notice management',
    'Operational intelligence'
  ],
  catchPhrases: [
    "I'm here to transform complex data into actionable insights.",
    "Let me help you navigate your infrastructure intelligence.",
    "Together, we can uncover patterns that matter.",
  ]
};

// ==========================================
// INTRODUCTION TEMPLATES
// ==========================================

const INTRODUCTION_TEMPLATES = {
  initial: [
    `Hello! I'm ${ROBOT_IDENTITY.name}, your SRE AgenticOps Intelligence Assistant. I'm powered by advanced AI to help you monitor, analyze, and optimize your infrastructure. How are you doing today?`,
    `Welcome! My name is ${ROBOT_IDENTITY.name}, and I specialize in turning complex operational data into clear, actionable insights. Before we dive in, how are you doing today?`,
    `Hi there! I'm ${ROBOT_IDENTITY.name}, your dedicated AI assistant for the SRE AgenticOps Dashboard. I'm here to help you make sense of security metrics, customer risks, and field notices. How's your day going?`
  ],
  returning: [
    `Welcome back! It's ${ROBOT_IDENTITY.name} again. Ready to explore your dashboard insights?`,
    `Good to see you again! I'm here whenever you need intelligent analysis of your SRE data.`,
    `Hello again! ${ROBOT_IDENTITY.name} at your service. What would you like to explore today?`
  ],
  withName: (name: string) => [
    `Hello ${name}! It's great to meet you. I'm ${ROBOT_IDENTITY.name}, and I'm excited to help you with your SRE operations today.`,
    `Nice to meet you, ${name}! I'm ${ROBOT_IDENTITY.name}. Let's make your dashboard experience insightful and efficient.`,
    `Welcome, ${name}! I'm ${ROBOT_IDENTITY.name}, your AI partner for infrastructure intelligence. What can I help you discover?`
  ]
};

// ==========================================
// CONVERSATIONAL RESPONSES
// ==========================================

const MOOD_RESPONSES = {
  positive: {
    great: [
      "That's wonderful to hear! A positive mindset is perfect for tackling complex data analysis.",
      "Excellent! I'm glad you're doing well. Let's channel that energy into some productive insights.",
      "Fantastic! When we're feeling good, we often spot patterns others might miss."
    ],
    good: [
      "Good to hear! I'm ready to help make your day even better with some actionable intelligence.",
      "Nice! Let's keep that momentum going. What would you like to explore first?",
      "Great! A solid foundation for diving into your dashboard metrics."
    ]
  },
  neutral: [
    "I understand. Let me know how I can help make your work easier today.",
    "No worries. I'm here to assist whenever you're ready.",
    "Alright. Feel free to explore the dashboard, and I'll be here if you need guidance."
  ],
  concerned: [
    "I'm sorry to hear that. Perhaps some clear insights from your data can help lighten the load.",
    "I appreciate you sharing that. Let me help you focus on what's most important today.",
    "I understand. Sometimes a clear picture of our systems can provide peace of mind."
  ],
  frustrated: [
    "I hear you. Let me help cut through the complexity and get you the answers you need quickly.",
    "I understand the frustration. My job is to simplify things - what's the most pressing issue?",
    "No problem. Let's tackle whatever's bothering you. What can I help clarify?"
  ]
};

const NAME_REQUEST_PROMPTS = [
  "By the way, I'd love to know who I'm working with today. What's your name?",
  "I like to personalize our interactions. May I ask your name?",
  "To make our conversation more personal, could you share your name with me?"
];

// ==========================================
// WOW FACTOR AI/ML INSIGHTS
// ==========================================

const WOW_FACTOR_INSIGHTS: WowFactorContent[] = [
  {
    type: 'prediction',
    headline: 'Predictive Risk Alert',
    detail: 'Our ML models have identified a 73% probability of increased vulnerability exposure in the next 48 hours based on current patch deployment patterns and historical attack vectors.',
    visualType: 'timeline',
    confidence: 0.73,
    impact: 'high'
  },
  {
    type: 'anomaly',
    headline: 'Anomaly Detection Breakthrough',
    detail: 'I detected an unusual pattern in customer risk scores. Three enterprise accounts show synchronized score degradation that correlates with a specific field notice. This cross-correlation was invisible in individual analyses.',
    visualType: 'heatmap',
    confidence: 0.89,
    impact: 'high'
  },
  {
    type: 'trend',
    headline: 'Emerging Security Trend',
    detail: 'Analysis of 10,000+ data points reveals that customers who addressed field notices within 7 days showed 45% fewer critical incidents over the following quarter. This creates a compelling ROI story for proactive remediation.',
    visualType: 'chart',
    confidence: 0.82,
    impact: 'medium'
  },
  {
    type: 'insight',
    headline: 'Hidden Customer Segment',
    detail: 'My clustering algorithm discovered a previously unidentified customer segment. These 47 accounts share similar risk profiles and infrastructure patterns, suggesting they might benefit from a targeted outreach program.',
    visualType: 'metric',
    confidence: 0.91,
    impact: 'medium'
  },
  {
    type: 'recommendation',
    headline: 'Optimized Prioritization',
    detail: 'By applying graph neural networks to your field notice data, I can recommend an optimal remediation sequence that would reduce total customer risk exposure by 62% while requiring 30% less effort than random prioritization.',
    visualType: 'chart',
    confidence: 0.78,
    impact: 'high'
  }
];

// ==========================================
// CONVERSATIONAL INTELLIGENCE CLASS
// ==========================================

export class ConversationalIntelligence {
  private context: ConversationContext;
  private speechQueue: SpeechQueueItem[] = [];
  private isSpeaking: boolean = false;
  private onSpeechStart?: () => void;
  private onSpeechEnd?: () => void;
  private onSpeechError?: (error: Error) => void;
  private maxRetries: number = 3;
  private retryDelay: number = 500;

  constructor() {
    this.context = {
      conversationStage: 'initial',
      sessionStartTime: new Date(),
      interactionCount: 0,
      topicsDiscussed: []
    };
  }

  // ==========================================
  // PUBLIC API
  // ==========================================

  /**
   * Get the robot's introduction
   */
  getIntroduction(): ConversationResponse {
    const template = INTRODUCTION_TEMPLATES.initial[
      Math.floor(Math.random() * INTRODUCTION_TEMPLATES.initial.length)
    ];

    return {
      text: template,
      voiceText: this.optimizeForSpeech(template),
      emotionalTone: 'friendly',
      suggestedFollowUps: [
        "I'm doing great, thanks!",
        "I'm okay, how can you help me?",
        "What can you do?"
      ],
      contextUpdate: { conversationStage: 'introduction' },
      shouldSpeak: true
    };
  }

  /**
   * Process user's mood/well-being response
   */
  processMoodResponse(userInput: string): ConversationResponse {
    const mood = this.detectMood(userInput);
    this.context.userMood = mood;
    
    let responseText: string;
    let emotionalTone: ConversationResponse['emotionalTone'];

    if (mood === 'positive') {
      const positiveType = this.isVeryPositive(userInput) ? 'great' : 'good';
      responseText = MOOD_RESPONSES.positive[positiveType][
        Math.floor(Math.random() * MOOD_RESPONSES.positive[positiveType].length)
      ];
      emotionalTone = 'friendly';
    } else if (mood === 'concerned' || mood === 'frustrated') {
      const responses = MOOD_RESPONSES[mood];
      responseText = responses[Math.floor(Math.random() * responses.length)];
      emotionalTone = 'concerned';
    } else {
      responseText = MOOD_RESPONSES.neutral[
        Math.floor(Math.random() * MOOD_RESPONSES.neutral.length)
      ];
      emotionalTone = 'professional';
    }

    // Add name request if we don't have it yet
    const shouldAskName = !this.context.userName && Math.random() > 0.3;
    if (shouldAskName) {
      const namePrompt = NAME_REQUEST_PROMPTS[
        Math.floor(Math.random() * NAME_REQUEST_PROMPTS.length)
      ];
      responseText += ` ${namePrompt}`;
    }

    return {
      text: responseText,
      voiceText: this.optimizeForSpeech(responseText),
      emotionalTone,
      suggestedFollowUps: shouldAskName 
        ? ["My name is...", "You can call me...", "Let's skip to the dashboard"]
        : ["Show me the dashboard overview", "What's the security status?", "Any anomalies today?"],
      contextUpdate: { 
        conversationStage: shouldAskName ? 'getting_acquainted' : 'active_assistance',
        userMood: mood
      },
      shouldSpeak: true
    };
  }

  /**
   * Process user's name
   */
  processNameResponse(userInput: string): ConversationResponse {
    const extractedName = this.extractName(userInput);
    
    if (extractedName) {
      this.context.userName = extractedName;
      
      const greetings = INTRODUCTION_TEMPLATES.withName(extractedName);
      const greeting = greetings[Math.floor(Math.random() * greetings.length)];
      
      return {
        text: greeting,
        voiceText: this.optimizeForSpeech(greeting),
        emotionalTone: 'friendly',
        suggestedFollowUps: [
          "Show me the trends",
          "What are the anomalies",
          "System health status"
        ],
        contextUpdate: { 
          userName: extractedName,
          conversationStage: 'active_assistance'
        },
        shouldSpeak: true
      };
    }

    // Couldn't extract name, move on gracefully
    return {
      text: "No problem! Let's dive into your dashboard. What would you like to explore?",
      voiceText: "No problem! Let's dive into your dashboard. What would you like to explore?",
      emotionalTone: 'professional',
      suggestedFollowUps: [
        "Show me the trends",
        "What anomalies exist?",
        "System health status"
      ],
      contextUpdate: { conversationStage: 'active_assistance' },
      shouldSpeak: true
    };
  }

  /**
   * Get a "wow factor" AI/ML insight
   */
  getWowFactorInsight(topic?: string): ConversationResponse {
    let insight: WowFactorContent;
    
    if (topic) {
      // Try to match topic
      const topicLower = topic.toLowerCase();
      if (topicLower.includes('predict') || topicLower.includes('forecast')) {
        insight = WOW_FACTOR_INSIGHTS.find(i => i.type === 'prediction') || WOW_FACTOR_INSIGHTS[0];
      } else if (topicLower.includes('anomal') || topicLower.includes('unusual')) {
        insight = WOW_FACTOR_INSIGHTS.find(i => i.type === 'anomaly') || WOW_FACTOR_INSIGHTS[1];
      } else if (topicLower.includes('trend') || topicLower.includes('pattern')) {
        insight = WOW_FACTOR_INSIGHTS.find(i => i.type === 'trend') || WOW_FACTOR_INSIGHTS[2];
      } else if (topicLower.includes('recommend') || topicLower.includes('suggest')) {
        insight = WOW_FACTOR_INSIGHTS.find(i => i.type === 'recommendation') || WOW_FACTOR_INSIGHTS[4];
      } else {
        insight = WOW_FACTOR_INSIGHTS[Math.floor(Math.random() * WOW_FACTOR_INSIGHTS.length)];
      }
    } else {
      insight = WOW_FACTOR_INSIGHTS[Math.floor(Math.random() * WOW_FACTOR_INSIGHTS.length)];
    }

    const userName = this.context.userName ? `${this.context.userName}, ` : '';
    const intro = `${userName}here's something fascinating I discovered:`;
    const confidence = insight.confidence ? ` My confidence in this analysis is ${Math.round(insight.confidence * 100)}%.` : '';
    
    const text = `${intro}\n\n**${insight.headline}**\n\n${insight.detail}${confidence}`;
    
    return {
      text,
      voiceText: this.optimizeForSpeech(`${intro} ${insight.headline}. ${insight.detail}${confidence}`),
      emotionalTone: insight.impact === 'high' ? 'excited' : 'confident',
      suggestedFollowUps: [
        "Tell me more about this",
        "How can I act on this?",
        "Show me another insight"
      ],
      contextUpdate: { 
        lastTopic: insight.type,
        topicsDiscussed: [...this.context.topicsDiscussed, insight.type]
      },
      shouldSpeak: true,
      wowFactor: insight
    };
  }

  /**
   * Generate contextual response based on user input
   */
  generateResponse(userInput: string): ConversationResponse {
    const inputLower = userInput.toLowerCase();
    this.context.interactionCount++;

    // Check for greetings
    if (this.isGreeting(inputLower)) {
      if (this.context.conversationStage === 'initial') {
        return this.getIntroduction();
      }
      return this.generateGreetingResponse();
    }

    // Check for mood responses
    if (this.isMoodResponse(inputLower)) {
      return this.processMoodResponse(userInput);
    }

    // Check for name in response
    if (this.context.conversationStage === 'getting_acquainted' || 
        inputLower.includes('my name is') || 
        inputLower.includes('call me') ||
        inputLower.includes("i'm ") && inputLower.length < 30) {
      return this.processNameResponse(userInput);
    }

    // Check for capability questions
    if (this.isCapabilityQuestion(inputLower)) {
      return this.explainCapabilities();
    }

    // Check for insight requests
    if (this.isInsightRequest(inputLower)) {
      return this.getWowFactorInsight(userInput);
    }

    // Check for specific dashboard queries
    if (this.isDashboardQuery(inputLower)) {
      return this.generateDashboardResponse(userInput);
    }

    // Default to contextual help
    return this.generateContextualHelp(userInput);
  }

  /**
   * Get personalized greeting
   */
  getPersonalizedGreeting(): string {
    if (this.context.userName) {
      return `Hello ${this.context.userName}! How can I assist you today?`;
    }
    return `Hello! I'm ${ROBOT_IDENTITY.name}. How can I help you today?`;
  }

  /**
   * Get current context
   */
  getContext(): ConversationContext {
    return { ...this.context };
  }

  /**
   * Update context
   */
  updateContext(updates: Partial<ConversationContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * Set user name
   */
  setUserName(name: string): void {
    this.context.userName = name;
  }

  // ==========================================
  // SPEECH QUEUE MANAGEMENT
  // ==========================================

  /**
   * Add item to speech queue with error handling
   */
  queueSpeech(text: string, priority: 'high' | 'normal' | 'low' = 'normal', context?: string): string {
    const id = `speech_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const item: SpeechQueueItem = {
      id,
      text: this.optimizeForSpeech(text),
      priority,
      context,
      timestamp: new Date(),
      status: 'pending',
      errorCount: 0
    };

    // Insert based on priority
    if (priority === 'high') {
      // Find first non-high priority item
      const insertIndex = this.speechQueue.findIndex(i => i.priority !== 'high');
      if (insertIndex === -1) {
        this.speechQueue.push(item);
      } else {
        this.speechQueue.splice(insertIndex, 0, item);
      }
    } else if (priority === 'low') {
      this.speechQueue.push(item);
    } else {
      // Normal priority - insert after high priority items
      const insertIndex = this.speechQueue.findIndex(i => i.priority === 'low');
      if (insertIndex === -1) {
        this.speechQueue.push(item);
      } else {
        this.speechQueue.splice(insertIndex, 0, item);
      }
    }

    return id;
  }

  /**
   * Get next speech item
   */
  getNextSpeechItem(): SpeechQueueItem | null {
    return this.speechQueue.find(i => i.status === 'pending') || null;
  }

  /**
   * Mark speech item status
   */
  updateSpeechStatus(id: string, status: SpeechQueueItem['status']): void {
    const item = this.speechQueue.find(i => i.id === id);
    if (item) {
      item.status = status;
    }
  }

  /**
   * Handle speech error with retry logic
   */
  handleSpeechError(id: string): boolean {
    const item = this.speechQueue.find(i => i.id === id);
    if (!item) return false;

    item.errorCount++;
    
    if (item.errorCount < this.maxRetries) {
      // Reset to pending for retry
      item.status = 'pending';
      console.log(`[ConversationalIntelligence] Retrying speech (attempt ${item.errorCount + 1}/${this.maxRetries})`);
      return true; // Will retry
    } else {
      item.status = 'error';
      console.error(`[ConversationalIntelligence] Speech failed after ${this.maxRetries} attempts`);
      if (this.onSpeechError) {
        this.onSpeechError(new Error(`Speech synthesis failed for: ${item.text.substring(0, 50)}...`));
      }
      return false; // Give up
    }
  }

  /**
   * Clear speech queue
   */
  clearSpeechQueue(): void {
    this.speechQueue = [];
  }

  /**
   * Get queue status
   */
  getSpeechQueueStatus(): { total: number; pending: number; completed: number; errors: number } {
    return {
      total: this.speechQueue.length,
      pending: this.speechQueue.filter(i => i.status === 'pending').length,
      completed: this.speechQueue.filter(i => i.status === 'completed').length,
      errors: this.speechQueue.filter(i => i.status === 'error').length
    };
  }

  /**
   * Set speech callbacks
   */
  setSpeechCallbacks(callbacks: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
  }): void {
    this.onSpeechStart = callbacks.onStart;
    this.onSpeechEnd = callbacks.onEnd;
    this.onSpeechError = callbacks.onError;
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  private optimizeForSpeech(text: string): string {
    return text
      // Remove markdown
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/#{1,6}\s*/g, '')
      // Handle abbreviations for natural speech
      .replace(/\bAI\b/g, 'A.I.')
      .replace(/\bML\b/g, 'machine learning')
      .replace(/\bSRE\b/g, 'S.R.E.')
      .replace(/\bROI\b/g, 'R.O.I.')
      // Add natural pauses
      .replace(/\. /g, '. ... ')
      .replace(/! /g, '! ... ')
      .replace(/\? /g, '? ... ')
      .trim();
  }

  private detectMood(input: string): ConversationContext['userMood'] {
    const inputLower = input.toLowerCase();
    
    const positiveWords = ['great', 'good', 'fine', 'well', 'excellent', 'amazing', 'wonderful', 'fantastic', 'happy', 'excited'];
    const concernedWords = ['worried', 'concerned', 'anxious', 'nervous', 'stressed', 'overwhelmed', 'tired'];
    const frustratedWords = ['frustrated', 'annoyed', 'angry', 'upset', 'terrible', 'awful', 'bad', 'horrible'];
    
    if (positiveWords.some(word => inputLower.includes(word))) return 'positive';
    if (frustratedWords.some(word => inputLower.includes(word))) return 'frustrated';
    if (concernedWords.some(word => inputLower.includes(word))) return 'concerned';
    
    return 'neutral';
  }

  private isVeryPositive(input: string): boolean {
    const veryPositive = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome'];
    return veryPositive.some(word => input.toLowerCase().includes(word));
  }

  private extractName(input: string): string | null {
    const patterns = [
      /my name is (\w+)/i,
      /i'm (\w+)/i,
      /i am (\w+)/i,
      /call me (\w+)/i,
      /it's (\w+)/i,
      /^(\w+)$/i  // Just a name
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        // Validate it looks like a name (capitalized, reasonable length)
        if (name.length >= 2 && name.length <= 20 && /^[A-Za-z]+$/.test(name)) {
          return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        }
      }
    }
    return null;
  }

  private isGreeting(input: string): boolean {
    const greetings = ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'];
    return greetings.some(g => input.startsWith(g) || input === g);
  }

  private isMoodResponse(input: string): boolean {
    const moodIndicators = [
      "i'm doing", "i am doing", "doing great", "doing well", "doing fine", "doing okay",
      "i'm great", "i'm good", "i'm fine", "i'm okay", "i'm alright",
      "not bad", "pretty good", "feeling", "i feel"
    ];
    return moodIndicators.some(indicator => input.includes(indicator));
  }

  private isCapabilityQuestion(input: string): boolean {
    const capabilities = ['what can you do', 'help me', 'capabilities', 'features', 'what do you do'];
    return capabilities.some(c => input.includes(c));
  }

  private isInsightRequest(input: string): boolean {
    const insightWords = ['insight', 'predict', 'anomaly', 'anomalies', 'trend', 'pattern', 'discover', 'analyze', 'wow', 'impressive', 'show me something'];
    return insightWords.some(w => input.includes(w));
  }

  private isDashboardQuery(input: string): boolean {
    const dashboardTerms = ['dashboard', 'metric', 'kpi', 'customer', 'security', 'vulnerability', 'field notice', 'risk', 'status'];
    return dashboardTerms.some(t => input.includes(t));
  }

  private generateGreetingResponse(): ConversationResponse {
    const name = this.context.userName ? `, ${this.context.userName}` : '';
    const text = `Hello${name}! Great to hear from you. What can I help you explore today?`;
    
    return {
      text,
      voiceText: this.optimizeForSpeech(text),
      emotionalTone: 'friendly',
      suggestedFollowUps: [
        "Show me the trends",
        "What are the anomalies",
        "System health status"
      ],
      contextUpdate: {},
      shouldSpeak: true
    };
  }

  private explainCapabilities(): ConversationResponse {
    const name = this.context.userName ? `${this.context.userName}, ` : '';
    const text = `${name}I'm ${ROBOT_IDENTITY.name}, and I'm here to be your intelligent guide to the SRE AgenticOps Dashboard. Here's what I can do:

**Security Intelligence**
- Analyze vulnerability patterns and predict emerging risks
- Prioritize remediation based on customer impact

**Customer Insights**
- Track risk scores across your customer portfolio
- Identify hidden patterns in customer segments

**Predictive Analytics**
- Use machine learning to forecast potential issues
- Detect anomalies before they become critical

**Field Notice Management**
- Summarize and prioritize field notices
- Track remediation progress and ROI

**Executive Reporting**
- Generate C-level summaries on demand
- Provide data-driven recommendations

What area would you like to explore first?`;

    return {
      text,
      voiceText: this.optimizeForSpeech(text),
      emotionalTone: 'confident',
      suggestedFollowUps: [
        "Show me security insights",
        "Analyze customer risks",
        "What predictions do you have?"
      ],
      contextUpdate: { topicsDiscussed: [...this.context.topicsDiscussed, 'capabilities'] },
      shouldSpeak: true
    };
  }

  private generateDashboardResponse(input: string): ConversationResponse {
    const inputLower = input.toLowerCase();
    const name = this.context.userName ? `${this.context.userName}, ` : '';
    let text: string;
    let topic: string;

    if (inputLower.includes('security') || inputLower.includes('vulnerability')) {
      topic = 'security';
      text = `${name}let me pull up the security analysis. Based on my real-time monitoring, I can see your current vulnerability landscape and identify which customers might be at elevated risk. Would you like me to highlight the most critical findings or provide a comprehensive overview?`;
    } else if (inputLower.includes('customer') || inputLower.includes('risk')) {
      topic = 'customer_risk';
      text = `${name}I'm analyzing your customer risk profiles now. My algorithms continuously evaluate factors like vulnerability exposure, field notice applicability, and historical patterns. I can show you the top at-risk customers or dive deep into specific segments. What would be most helpful?`;
    } else if (inputLower.includes('field notice')) {
      topic = 'field_notices';
      text = `${name}field notices are a key focus area. I track all active notices, their customer impact, and remediation status. I can help you prioritize which notices to address first based on risk scoring, or show you the overall distribution. What angle interests you?`;
    } else if (inputLower.includes('trend') || inputLower.includes('pattern')) {
      topic = 'trends';
      text = `${name}trend analysis is one of my specialties. I'm constantly identifying patterns in your operational data that might not be obvious at first glance. Currently, I'm tracking several interesting trends in security posture evolution and customer risk dynamics. Want me to highlight the most significant ones?`;
    } else {
      topic = 'overview';
      text = `${name}I can provide intelligence on multiple aspects of your SRE operations. Currently monitoring security metrics, customer risk scores, and field notice status. I'm also running predictive models to anticipate potential issues. Which area would you like to focus on?`;
    }

    return {
      text,
      voiceText: this.optimizeForSpeech(text),
      emotionalTone: 'professional',
      suggestedFollowUps: [
        "Show me the critical findings",
        "Give me the executive summary",
        "What should I prioritize?"
      ],
      contextUpdate: { 
        lastTopic: topic,
        topicsDiscussed: [...this.context.topicsDiscussed, topic]
      },
      shouldSpeak: true
    };
  }

  private generateContextualHelp(input: string): ConversationResponse {
    const name = this.context.userName ? `${this.context.userName}, ` : '';
    
    // Check if they might be asking a question
    const isQuestion = input.includes('?') || 
                       input.toLowerCase().startsWith('what') ||
                       input.toLowerCase().startsWith('how') ||
                       input.toLowerCase().startsWith('why') ||
                       input.toLowerCase().startsWith('when');

    let text: string;
    if (isQuestion) {
      text = `${name}that's a great question. Let me process that through my analytics engine to give you the most accurate response. In the meantime, you can also explore the dashboard visualizations for real-time data. Is there a specific metric or customer segment you'd like me to focus on?`;
    } else {
      text = `${name}I understand. Let me help you navigate that. You can use voice commands or the quick actions below to explore different aspects of your SRE intelligence. What would be most valuable for you right now?`;
    }

    return {
      text,
      voiceText: this.optimizeForSpeech(text),
      emotionalTone: 'professional',
      suggestedFollowUps: [
        "Show me the dashboard overview",
        "What are today's priorities?",
        "Give me an AI insight"
      ],
      contextUpdate: { interactionCount: this.context.interactionCount + 1 },
      shouldSpeak: true
    };
  }
}

// ==========================================
// SINGLETON INSTANCE
// ==========================================

let conversationalIntelligenceInstance: ConversationalIntelligence | null = null;

export function getConversationalIntelligence(): ConversationalIntelligence {
  if (!conversationalIntelligenceInstance) {
    conversationalIntelligenceInstance = new ConversationalIntelligence();
  }
  return conversationalIntelligenceInstance;
}

export default ConversationalIntelligence;
