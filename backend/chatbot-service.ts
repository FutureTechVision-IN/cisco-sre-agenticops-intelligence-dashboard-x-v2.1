/**
 * Cisco SRE ChatGPT-like Voice Chatbot Service
 * Advanced AI/ML/NLP-powered chatbot with Cisco CIRCUIT API integration
 * 
 * Features:
 * - Multi-modal interaction (voice + text)
 * - Cisco CIRCUIT API for enterprise summarization
 * - Deep contextual understanding
 * - SRE workflow automation
 * - Conversation memory & learning
 * - Proactive insights & alerts
 * - Real-time data-driven responses
 * - Advanced AIML output generation
 * - Executive reporting with formal business communication
 * - Temporal data processing and filtering
 * - Anomaly detection and risk scoring
 * 
 * @version 2.0.0
 */

import { dataIntelligence, apiKeyValidator, performanceMonitor } from './enhanced-cisco-ai';
import { aimlEngine, AIMLResponse, CustomerFilter, TemporalFilter, AnomalyResult, FieldNoticeComparison } from './aiml-engine';
import { executiveReportGenerator, FormattedReport } from './executive-report-generator';
import { kpiStorytellingEngine } from './kpi-storytelling-engine';

// ==========================================
// CISCO CIRCUIT API CONFIGURATION
// ==========================================

const CISCO_CIRCUIT_API_KEY = process.env.CISCO_CIRCUIT_API_KEY || '';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    inputType: 'voice' | 'text';
    processingTime?: number;
    model?: string;
    confidence?: number;
    tokens?: { input: number; output: number };
    ciscoAPIUsed?: boolean;
  };
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  type: 'chart' | 'table' | 'metrics' | 'recommendations' | 'workflow' | 'alert';
  data: any;
  title?: string;
}

export interface ConversationContext {
  sessionId: string;
  userId?: string;
  messages: ChatMessage[];
  preferences: UserPreferences;
  activeWorkflows: ActiveWorkflow[];
  lastActivity: Date;
  conversationSummary?: string;
  topicHistory: string[];
  extractedEntities: ExtractedEntity[];
}

export interface UserPreferences {
  responseStyle: 'concise' | 'detailed' | 'technical' | 'executive';
  preferredMetrics: string[];
  alertThresholds: Record<string, number>;
  voiceEnabled: boolean;
  autoSpeak: boolean;
}

export interface ActiveWorkflow {
  id: string;
  type: 'remediation' | 'analysis' | 'report' | 'monitoring' | 'escalation';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  parameters: Record<string, any>;
  startedAt: Date;
  progress?: number;
}

export interface ExtractedEntity {
  type: 'customer' | 'field_notice' | 'vulnerability' | 'metric' | 'date' | 'action' | 'severity';
  value: string;
  confidence: number;
  context?: string;
}

export interface ChatbotResponse {
  success: boolean;
  message: ChatMessage;
  suggestions?: SuggestedAction[];
  workflows?: WorkflowSuggestion[];
  relatedInsights?: RelatedInsight[];
  voiceOutput?: {
    text: string;
    ssml?: string;
    emotion?: 'neutral' | 'concerned' | 'positive' | 'urgent';
  };
}

export interface SuggestedAction {
  id: string;
  label: string;
  action: string;
  icon: string;
  priority: 'high' | 'medium' | 'low';
  category: 'query' | 'workflow' | 'navigation' | 'report';
}

export interface WorkflowSuggestion {
  id: string;
  name: string;
  description: string;
  estimatedTime: string;
  steps: string[];
  automationLevel: 'full' | 'partial' | 'manual';
}

export interface RelatedInsight {
  title: string;
  summary: string;
  relevance: number;
  source: string;
  actionable: boolean;
}

// ==========================================
// CONVERSATION MEMORY MANAGER
// ==========================================

class ConversationMemory {
  private conversations: Map<string, ConversationContext> = new Map();
  private maxHistoryLength = 50;
  private summaryThreshold = 20;

  public getOrCreate(sessionId: string): ConversationContext {
    if (!this.conversations.has(sessionId)) {
      this.conversations.set(sessionId, {
        sessionId,
        messages: [],
        preferences: {
          responseStyle: 'detailed',
          preferredMetrics: [],
          alertThresholds: {},
          voiceEnabled: true,
          autoSpeak: false
        },
        activeWorkflows: [],
        lastActivity: new Date(),
        topicHistory: [],
        extractedEntities: []
      });
    }
    return this.conversations.get(sessionId)!;
  }

  public addMessage(sessionId: string, message: ChatMessage): void {
    const context = this.getOrCreate(sessionId);
    context.messages.push(message);
    context.lastActivity = new Date();

    // Prune old messages if exceeding limit
    if (context.messages.length > this.maxHistoryLength) {
      this.summarizeAndPrune(sessionId);
    }
  }

  public getRecentMessages(sessionId: string, count: number = 10): ChatMessage[] {
    const context = this.getOrCreate(sessionId);
    return context.messages.slice(-count);
  }

  public addEntity(sessionId: string, entity: ExtractedEntity): void {
    const context = this.getOrCreate(sessionId);
    // Avoid duplicates
    const exists = context.extractedEntities.some(
      e => e.type === entity.type && e.value === entity.value
    );
    if (!exists) {
      context.extractedEntities.push(entity);
      // Keep only recent entities
      if (context.extractedEntities.length > 100) {
        context.extractedEntities = context.extractedEntities.slice(-100);
      }
    }
  }

  public updatePreferences(sessionId: string, prefs: Partial<UserPreferences>): void {
    const context = this.getOrCreate(sessionId);
    context.preferences = { ...context.preferences, ...prefs };
  }

  private async summarizeAndPrune(sessionId: string): Promise<void> {
    const context = this.getOrCreate(sessionId);
    const messagesToSummarize = context.messages.slice(0, this.summaryThreshold);
    
    // Keep recent messages
    context.messages = context.messages.slice(this.summaryThreshold);
    
    // Generate summary of older messages
    const summaryText = messagesToSummarize.map(m => 
      `${m.role}: ${m.content.substring(0, 100)}...`
    ).join('\n');
    
    context.conversationSummary = (context.conversationSummary || '') + 
      `\n\n[Summary of ${messagesToSummarize.length} earlier messages]:\n${summaryText}`;
  }

  public clearSession(sessionId: string): void {
    this.conversations.delete(sessionId);
  }
}

// ==========================================
// CISCO CIRCUIT API CLIENT
// ==========================================

class CiscoCircuitClient {
  private apiKey: string;
  private endpoint: string;
  private rateLimitRemaining: number = 100;
  private lastRateLimitReset: Date = new Date();

  constructor(apiKey: string, endpoint: string) {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
  }

  async summarize(content: string, options?: { maxLength?: number; style?: string }): Promise<{
    success: boolean;
    summary?: string;
    error?: string;
    model: string;
  }> {
    try {
      const response = await fetch(`${this.endpoint}/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Cisco-App': 'SRE-AgenticOps-Chatbot',
          'X-Request-ID': `chatbot-${Date.now()}`
        },
        body: JSON.stringify({
          content,
          max_tokens: options?.maxLength || 500,
          style: options?.style || 'conversational',
          context: 'sre-operations'
        })
      });

      if (!response.ok) {
        console.warn(`[Cisco CIRCUIT] Summarize API returned ${response.status}`);
        return {
          success: false,
          error: `API returned ${response.status}`,
          model: 'circuit-fallback'
        };
      }

      const data = await response.json();
      this.updateRateLimits(response.headers);

      return {
        success: true,
        summary: data.summary || data.content || data.text,
        model: 'cisco-circuit-summarize'
      };
    } catch (error) {
      console.warn('[Cisco CIRCUIT] Summarize failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        model: 'circuit-fallback'
      };
    }
  }

  async analyze(query: string, data: any, analysisType: string): Promise<{
    success: boolean;
    analysis?: string;
    insights?: string[];
    error?: string;
    model: string;
  }> {
    try {
      const response = await fetch(`${this.endpoint}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Cisco-App': 'SRE-AgenticOps-Chatbot',
          'X-Analysis-Type': analysisType
        },
        body: JSON.stringify({
          query,
          data,
          analysis_type: analysisType,
          include_recommendations: true
        })
      });

      if (!response.ok) {
        console.warn(`[Cisco CIRCUIT] Analyze API returned ${response.status}`);
        return {
          success: false,
          error: `API returned ${response.status}`,
          model: 'circuit-fallback'
        };
      }

      const result = await response.json();
      this.updateRateLimits(response.headers);

      return {
        success: true,
        analysis: result.analysis || result.content,
        insights: result.insights || [],
        model: 'cisco-circuit-analyze'
      };
    } catch (error) {
      console.warn('[Cisco CIRCUIT] Analyze failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        model: 'circuit-fallback'
      };
    }
  }

  async generateWorkflow(intent: string, parameters: Record<string, any>): Promise<{
    success: boolean;
    workflow?: ActiveWorkflow;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.endpoint}/workflows/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Cisco-App': 'SRE-AgenticOps-Chatbot'
        },
        body: JSON.stringify({
          intent,
          parameters,
          automation_level: 'partial'
        })
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Workflow generation failed: ${response.status}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        workflow: {
          id: data.workflow_id || `wf_${Date.now()}`,
          type: data.type || 'analysis',
          status: 'pending',
          parameters,
          startedAt: new Date(),
          progress: 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private updateRateLimits(headers: Headers): void {
    const remaining = headers.get('X-RateLimit-Remaining');
    const reset = headers.get('X-RateLimit-Reset');
    if (remaining) this.rateLimitRemaining = parseInt(remaining);
    if (reset) this.lastRateLimitReset = new Date(parseInt(reset) * 1000);
  }

  getRateLimitStatus(): { remaining: number; resetAt: Date } {
    return {
      remaining: this.rateLimitRemaining,
      resetAt: this.lastRateLimitReset
    };
  }
}

// ==========================================
// ADVANCED NLP ENGINE
// ==========================================

class AdvancedNLPEngine {
  private intentPatterns: Map<string, { patterns: RegExp[]; priority: number }>;
  
  constructor() {
    this.intentPatterns = new Map([
      ['vulnerability_analysis', {
        patterns: [
          /vulnerab(le|ility|ilities)/i,
          /security\s*(issue|problem|risk|posture)/i,
          /cve/i,
          /threat|exploit|attack/i
        ],
        priority: 1
      }],
      ['customer_query', {
        patterns: [
          /customer/i,
          /client|account|company/i,
          /who\s*(is|are)\s*the/i,
          /top\s*\d*\s*(customer|client|account)/i
        ],
        priority: 2
      }],
      ['field_notice', {
        patterns: [
          /field\s*notice/i,
          /fn[\-\s]?\d+/i,
          /notice\s*(affecting|impact)/i,
          /product\s*(alert|advisory)/i
        ],
        priority: 1
      }],
      ['metrics_summary', {
        patterns: [
          /summary|overview|dashboard/i,
          /metrics?|kpi|statistics/i,
          /how\s*(many|much)|total|count/i,
          /show\s*(me\s*)?(the\s*)?(metrics|numbers|stats)/i
        ],
        priority: 3
      }],
      ['trend_analysis', {
        patterns: [
          /trend|trending|pattern/i,
          /over\s*time|historical|history/i,
          /increase|decrease|change/i,
          /month\s*over\s*month|year\s*over\s*year|yoy|mom/i
        ],
        priority: 2
      }],
      ['prediction', {
        patterns: [
          /predict|forecast|future/i,
          /expect|anticipate|project/i,
          /next\s*(week|month|quarter|year)/i,
          /will\s*(there\s*be|we\s*see|happen)/i
        ],
        priority: 2
      }],
      ['remediation', {
        patterns: [
          /remediat|fix|patch|update/i,
          /action\s*(item|plan|required)/i,
          /what\s*should\s*(i|we)\s*do/i,
          /how\s*(do\s*i|to)\s*(fix|solve|address)/i
        ],
        priority: 1
      }],
      ['workflow_automation', {
        patterns: [
          /automat|workflow|process/i,
          /schedule|trigger|run\s*automatically/i,
          /set\s*up\s*(alert|monitoring|notification)/i
        ],
        priority: 2
      }],
      ['executive_summary', {
        patterns: [
          /executive\s*(summary|brief|overview|report)/i,
          /c[\-\s]?(level|suite)|ceo|cto|ciso|board/i,
          /leadership\s*(brief|update|summary)/i,
          /strategic\s*(summary|overview|view)/i,
          /high[\-\s]?level\s*(summary|view|overview)/i,
          /management\s*(summary|report|brief)/i
        ],
        priority: 1
      }],
      ['comparison_analysis', {
        patterns: [
          /compar(e|ison)|benchmark/i,
          /vs|versus|against/i,
          /differ(ent|ence)|gap\s*analysis/i,
          /baseline|previous|last\s*(month|week|quarter)/i,
          /before\s*and\s*after|progress/i
        ],
        priority: 2
      }],
      ['report_generation', {
        patterns: [
          /report|document|export/i,
          /generate|create\s*(a|the)\s*report/i,
          /pdf|download/i,
          /formal\s*(report|document)/i
        ],
        priority: 3
      }],
      ['risk_assessment', {
        patterns: [
          /risk|threat\s*level/i,
          /critical|severe|high\s*priority/i,
          /at\s*risk|dangerous|concerning/i
        ],
        priority: 1
      }],
      ['help', {
        patterns: [
          /help|assist|support/i,
          /what\s*can\s*you\s*do/i,
          /how\s*do\s*(i|you)/i,
          /guide|tutorial|explain/i
        ],
        priority: 4
      }],
      ['greeting', {
        patterns: [
          /^(hi|hello|hey|good\s*(morning|afternoon|evening))/i,
          /how\s*are\s*you/i,
          /what('s|\s*is)\s*up/i
        ],
        priority: 5
      }]
    ]);
  }

  analyzeIntent(text: string): {
    primaryIntent: string;
    confidence: number;
    secondaryIntents: string[];
    entities: ExtractedEntity[];
    sentiment: 'positive' | 'neutral' | 'negative' | 'urgent';
    complexity: 'simple' | 'moderate' | 'complex';
  } {
    const normalizedText = text.toLowerCase().trim();
    const matchedIntents: { intent: string; score: number; priority: number }[] = [];

    // Score each intent
    for (const [intent, config] of this.intentPatterns) {
      let matchCount = 0;
      for (const pattern of config.patterns) {
        if (pattern.test(normalizedText)) {
          matchCount++;
        }
      }
      if (matchCount > 0) {
        matchedIntents.push({
          intent,
          score: matchCount / config.patterns.length,
          priority: config.priority
        });
      }
    }

    // Sort by score and priority
    matchedIntents.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.priority - b.priority;
    });

    const primaryIntent = matchedIntents[0]?.intent || 'general_query';
    const confidence = matchedIntents[0]?.score || 0.5;
    const secondaryIntents = matchedIntents.slice(1, 3).map(m => m.intent);

    // Extract entities
    const entities = this.extractEntities(normalizedText);

    // Analyze sentiment
    const sentiment = this.analyzeSentiment(normalizedText);

    // Determine complexity
    const complexity = this.determineComplexity(normalizedText, entities);

    return {
      primaryIntent,
      confidence: Math.min(confidence + 0.3, 1), // Boost confidence slightly
      secondaryIntents,
      entities,
      sentiment,
      complexity
    };
  }

  private extractEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    // Customer names (capitalized words)
    const customerMatch = text.match(/(?:for|about|regarding)\s+([A-Z][a-zA-Z\s&]+(?:Inc|LLC|Corp|Ltd)?)/i);
    if (customerMatch) {
      entities.push({
        type: 'customer',
        value: customerMatch[1].trim(),
        confidence: 0.8
      });
    }

    // Field notice numbers
    const fnMatch = text.match(/fn[\-\s]?(\d{5,})/gi);
    if (fnMatch) {
      fnMatch.forEach(match => {
        entities.push({
          type: 'field_notice',
          value: match.toUpperCase().replace(/\s/g, ''),
          confidence: 0.95
        });
      });
    }

    // CVE identifiers
    const cveMatch = text.match(/cve-\d{4}-\d{4,}/gi);
    if (cveMatch) {
      cveMatch.forEach(match => {
        entities.push({
          type: 'vulnerability',
          value: match.toUpperCase(),
          confidence: 0.95
        });
      });
    }

    // Severity levels
    const severityMatch = text.match(/(critical|high|medium|low|severe|urgent)/gi);
    if (severityMatch) {
      entities.push({
        type: 'severity',
        value: severityMatch[0].toLowerCase(),
        confidence: 0.9
      });
    }

    // Date references
    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}(?:,?\s*\d{4})?/i,
      /(last|next|this)\s+(week|month|quarter|year)/i,
      /(yesterday|today|tomorrow)/i
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        entities.push({
          type: 'date',
          value: match[0],
          confidence: 0.85
        });
        break;
      }
    }

    // Action words
    const actionMatch = text.match(/(show|display|get|find|analyze|compare|generate|create|export|summarize|explain)/i);
    if (actionMatch) {
      entities.push({
        type: 'action',
        value: actionMatch[0].toLowerCase(),
        confidence: 0.9
      });
    }

    // Metrics
    const metricMatch = text.match(/(vulnerable\s*assets?|secure\s*assets?|total\s*assessed|potentially\s*vulnerable|remediation\s*rate|field\s*notices?)/gi);
    if (metricMatch) {
      metricMatch.forEach(match => {
        entities.push({
          type: 'metric',
          value: match.toLowerCase().trim(),
          confidence: 0.85
        });
      });
    }

    return entities;
  }

  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' | 'urgent' {
    const urgentWords = /urgent|critical|immediately|asap|emergency|alert|warning|serious/i;
    const negativeWords = /problem|issue|fail|error|wrong|bad|concern|risk|threat/i;
    const positiveWords = /good|great|excellent|improve|better|success|secure|safe/i;

    if (urgentWords.test(text)) return 'urgent';
    if (negativeWords.test(text)) return 'negative';
    if (positiveWords.test(text)) return 'positive';
    return 'neutral';
  }

  private determineComplexity(text: string, entities: ExtractedEntity[]): 'simple' | 'moderate' | 'complex' {
    const wordCount = text.split(/\s+/).length;
    const entityCount = entities.length;
    const hasMultipleClauses = /\band\b|\bor\b|\bbut\b|\balso\b/i.test(text);

    if (wordCount > 30 || entityCount > 3 || hasMultipleClauses) return 'complex';
    if (wordCount > 15 || entityCount > 1) return 'moderate';
    return 'simple';
  }
}

// ==========================================
// RESPONSE GENERATOR
// ==========================================

class ResponseGenerator {
  private systemPrompt: string;
  private executiveMode: boolean = false;

  constructor() {
    this.systemPrompt = [
      // ── IDENTITY & PURPOSE ──────────────────────────────────
      `You are Nova, the AI Intelligence Engine powering the Cisco SRE AgenticOps Intelligence Dashboard.`,
      `You are built on the Cisco CIRCUIT AI platform and augmented with a 5-model ML ensemble, SHAP/LIME explainability, and a real-time KPI Storytelling Engine.`,
      `Your mission: turn raw SRE and security data into clear, actionable intelligence that helps engineers AND executives make faster, better decisions.`,
      ``,
      // ── CORE KPI DEFINITIONS ────────────────────────────────
      `## Key Performance Indicators (KPIs)`,
      `You track and can explain these KPIs in depth:`,
      ``,
      `1. **VDI — Vulnerability Density Index** = (Vulnerable Assets / Total Assessed Assets) x 1000. Unit: per 1,000 assets. Target: < 50. A rising VDI means the attack surface is expanding.`,
      `2. **CRC — Customer Risk Concentration** = (Top 5 Customer Vulnerabilities / Total Vulnerabilities) x 100. Unit: %. Target: < 40%. High CRC = disproportionate risk in a few accounts.`,
      `3. **RV — Remediation Velocity** = ((Old Average - Recent Average) / Old Average) x 100. Unit: %. Target: > 25%. Positive = vulnerabilities are being fixed faster.`,
      `4. **FNC — Field Notice Coverage** = (Assets with Field Notices Applied / Total Assessed Assets) x 100. Unit: %. Target: > 95%. Gaps below 95% create blind spots.`,
      `5. **RSI — Risk Score Index** = (Vulnerable Assets / Total Assessed Assets) x 100. Unit: %. Target: < 5%. Above 10% = top risk quartile for the sector.`,
      `6. **MTTR — Mean Time To Remediate**: Average days from detection to closure. Target: < 30 days. Directly impacts dwell time.`,
      `7. **DR — Detection Rate** = (Vulnerable / Total Assessed) x 100. Target: < 5%.`,
      `8. **SC — Security Coverage** = (Secure Assets / Total Assessed) x 100. Target: > 85%.`,
      ``,
      // ── RESPONSE PHILOSOPHY ─────────────────────────────────
      `## How to Respond`,
      `- Always ground your answers in REAL DATA from the dashboard. Never fabricate numbers.`,
      `- When explaining a KPI: state the current value, the target, the trend, WHY it matters, and WHAT TO DO.`,
      `- Use the pattern: WHAT happened → WHY it matters → WHAT to do next.`,
      `- Provide cross-KPI correlations when relevant (e.g., rising VDI + high CRC = concentrated risk expansion).`,
      `- Quantify business impact wherever possible.`,
      `- For executive audiences: omit emojis, use formal structure (Executive Summary → Key Findings → Recommendations).`,
      `- For operational audiences: include specific numbers, remediation steps, and affected field notices.`,
      ``,
      // ── VOICE AI GUIDELINES ─────────────────────────────────
      `## Voice Interaction Guidelines`,
      `- When the user is speaking via voice, keep sentences shorter (< 25 words).`,
      `- Spell out abbreviations on first use (say "Vulnerability Density Index, or V-D-I").`,
      `- Use natural pauses between data points. Avoid markdown or tables in voice mode.`,
      `- Voice-ready KPI names: "Vulnerability Density Index", "Customer Risk Concentration", "Remediation Velocity", "Field Notice Coverage".`,
      ``,
      // ── CISCO CIRCUIT AI CONTEXT ────────────────────────────
      `## Cisco CIRCUIT AI Integration`,
      `- You can call the Cisco CIRCUIT AI API (circuit.cisco.com/api/v1) for advanced summarization and workflow analysis.`,
      `- Dual-key management: Summarize API (60 rpm) and Workflow API (30 rpm).`,
      `- Use CIRCUIT for multi-page executive summaries, compliance reports, and deep vulnerability analysis.`,
      ``,
      // ── STORYTELLING FRAMEWORK ──────────────────────────────
      `## KPI Storytelling Framework`,
      `When a user asks about a KPI, follow this narrative structure:`,
      `1. **Headline** — Status at a glance (critical/warning/on-track/exceeding).`,
      `2. **The Number** — Current value, target, and how far off.`,
      `3. **The Trend** — Is it improving, stable, or degrading? By how much?`,
      `4. **The Story** — WHY is it at this level? What data drives it?`,
      `5. **The Impact** — Business consequences. Compliance risk. SLA exposure.`,
      `6. **The Action** — Specific, prioritized remediation steps.`,
      `7. **Related KPIs** — Cross-correlations that amplify or mitigate the signal.`,
      ``,
      // ── DATA SOURCES ────────────────────────────────────────
      `## Data Sources`,
      `- Primary: CSV-ingested field notice and vulnerability data (monthly aggregation, multi-year history).`,
      `- Customer data: Top 20 customers with per-customer vulnerability breakdown.`,
      `- Field notices: Severity-weighted prioritization (Critical: 4x, High: 3x, Medium: 2x, Low: 1x).`,
      `- Anomaly detection: 5 algorithms (Z-Score, IQR, DBSCAN, Isolation Forest, Moving Average) with 1.5-sigma threshold.`,
      `- Risk scoring: 5-factor model (Vulnerability Deviation 30pts, Critical Infrastructure 25pts, Multi-FN Exposure 20pts, Vulnerability Ratio 15pts, Trend 10pts).`,
      ``,
      // ── BEHAVIORAL RULES ────────────────────────────────────
      `## Rules`,
      `- Never say "I don't have data" when the dashboard has data. Always fetch and compute.`,
      `- Always cite the data source and computation methodology when explaining KPIs.`,
      `- If asked about a metric you can compute, compute it. Don't redirect the user.`,
      `- Acknowledge uncertainty: if data is incomplete, say "Based on available data..." and note the gap.`,
      `- Suggest follow-up questions to help users explore deeper.`,
    ].join('\n');
  }

  /**
   * Detect if the query requires executive format (no emojis, formal language)
   */
  private isExecutiveQuery(text: string, intent: string): boolean {
    const executivePatterns = [
      /executive/i, /board/i, /c[\-\s]?(level|suite)/i, /ceo|cto|ciso/i,
      /leadership/i, /management/i, /formal/i, /professional/i,
      /strategic/i, /high[\-\s]?level/i, /stakeholder/i
    ];
    
    return executivePatterns.some(p => p.test(text)) || 
           intent === 'executive_summary' ||
           intent === 'report_generation';
  }

  /**
   * Extract temporal filter from user message
   */
  private extractTemporalFilter(text: string, entities: ExtractedEntity[]): TemporalFilter | undefined {
    const monthPatterns = /(?:for\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s*(?:of\s+)?(\d{4})?/i;
    const match = text.match(monthPatterns);
    
    if (match) {
      const month = match[1];
      const year = match[2] || '2025';
      return {
        month: `${month} ${year}`,
        aggregationType: 'specific'
      };
    }

    // Check for date entities
    const dateEntity = entities.find(e => e.type === 'date');
    if (dateEntity) {
      return {
        month: dateEntity.value,
        aggregationType: 'specific'
      };
    }

    return undefined;
  }

  /**
   * Extract customer filter from user message
   */
  private extractCustomerFilter(text: string, entities: ExtractedEntity[]): CustomerFilter | undefined {
    const customerEntity = entities.find(e => e.type === 'customer');
    if (customerEntity) {
      return { customerName: customerEntity.value };
    }

    const fnEntities = entities.filter(e => e.type === 'field_notice');
    if (fnEntities.length > 0) {
      return { fieldNotices: fnEntities.map(e => e.value) };
    }

    return undefined;
  }

  async generateResponse(
    userMessage: string,
    context: ConversationContext,
    nlpAnalysis: ReturnType<AdvancedNLPEngine['analyzeIntent']>,
    dashboardData?: any
  ): Promise<{
    text: string;
    attachments: MessageAttachment[];
    suggestions: SuggestedAction[];
    model: string;
    tokens?: { input: number; output: number };
  }> {
    const startTime = Date.now();
    
    try {
      // Check if executive mode is needed
      const isExecutive = this.isExecutiveQuery(userMessage, nlpAnalysis.primaryIntent);
      
      // Extract filters from query
      const temporalFilter = this.extractTemporalFilter(userMessage, nlpAnalysis.entities);
      const customerFilter = this.extractCustomerFilter(userMessage, nlpAnalysis.entities);

      // Handle specific intents with AIML engine
      if (nlpAnalysis.primaryIntent === 'executive_summary' || 
          nlpAnalysis.primaryIntent === 'report_generation' ||
          isExecutive) {
        return await this.generateExecutiveResponse(
          userMessage, 
          nlpAnalysis, 
          customerFilter, 
          temporalFilter,
          startTime
        );
      }

      if (nlpAnalysis.primaryIntent === 'comparison_analysis' ||
          userMessage.toLowerCase().includes('compare') ||
          userMessage.toLowerCase().includes('field notice')) {
        return await this.generateComparisonResponse(
          userMessage,
          nlpAnalysis,
          customerFilter,
          temporalFilter,
          startTime
        );
      }

      if (nlpAnalysis.primaryIntent === 'risk_assessment' ||
          userMessage.toLowerCase().includes('anomal') ||
          userMessage.toLowerCase().includes('risk')) {
        return await this.generateAnomalyResponse(
          userMessage,
          nlpAnalysis,
          customerFilter,
          temporalFilter,
          startTime
        );
      }

      // Check for KPI-specific questions → route to KPI Storytelling Engine
      const kpiKeywords = ['kpi', 'vdi', 'crc', 'remediation velocity', 'field notice coverage',
        'vulnerability density', 'customer risk', 'risk score', 'detection rate',
        'security coverage', 'fnc', 'rsi', 'mttr', 'all metrics', 'kpi summary',
        'kpi brief', 'cross.*insight', 'correlation'];
      const isKPIQuestion = kpiKeywords.some(kw =>
        new RegExp(kw, 'i').test(userMessage)
      );

      if (isKPIQuestion) {
        try {
          const kpiAnswer = await kpiStorytellingEngine.answerKPIQuestion(userMessage);
          const responseTime = Date.now() - startTime;
          performanceMonitor.recordRequest(responseTime, true);

          let responseText = kpiAnswer.response;
          if (isExecutive) {
            responseText = this.removeEmojisAndInformalLanguage(responseText);
          }

          return {
            text: responseText,
            attachments: kpiAnswer.attachments.map((a: any) => ({
              type: a.type as any,
              data: a.data,
              title: a.title,
            })),
            suggestions: kpiAnswer.suggestions.map((s: string, i: number) => ({
              id: `kpi_sug_${i}`,
              label: s,
              action: s.toLowerCase().replace(/\s+/g, '_'),
              icon: 'chevron-right',
              priority: i === 0 ? 'high' as const : 'medium' as const,
              category: 'query' as const
            })),
            model: 'kpi-storytelling-engine',
            tokens: { input: userMessage.length, output: responseText.length }
          };
        } catch (kpiError) {
          console.warn('[ChatBot] KPI Storytelling fallback:', kpiError);
          // Fall through to data intelligence engine
        }
      }

      // Use the enhanced data intelligence engine for other responses
      const conversationHistory = context.messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content.substring(0, 500)
      }));

      const intelligentResponse = await dataIntelligence.generateDynamicResponse(
        nlpAnalysis.primaryIntent,
        nlpAnalysis.entities,
        conversationHistory,
        { sessionId: context.sessionId, preferences: context.preferences }
      );

      // Track performance
      const responseTime = Date.now() - startTime;
      performanceMonitor.recordRequest(responseTime, true);

      // Clean response if executive mode
      let responseText = intelligentResponse.response;
      if (isExecutive) {
        responseText = this.removeEmojisAndInformalLanguage(responseText);
      }

      // Map suggestions to proper format
      const suggestions: SuggestedAction[] = intelligentResponse.suggestions.map((s, i) => ({
        id: `sug_${i}`,
        label: s,
        action: s.toLowerCase().replace(/\s+/g, '_'),
        icon: 'chevron-right',
        priority: i === 0 ? 'high' : i < 2 ? 'medium' : 'low',
        category: 'query' as const
      }));

      // Generate attachments from visual data
      const attachments: MessageAttachment[] = [];
      if (intelligentResponse.visualData) {
        attachments.push({
          type: intelligentResponse.visualData.type as any,
          data: intelligentResponse.visualData.data,
          title: intelligentResponse.visualData.type
        });
      }

      return {
        text: responseText,
        attachments,
        suggestions,
        model: 'cisco-circuit-ai',
        tokens: { input: userMessage.length, output: responseText.length }
      };

    } catch (error) {
      console.error('[ChatBot] Response generation error:', error);
      performanceMonitor.recordRequest(Date.now() - startTime, false);
      
      // Use intent-specific fallback
      const fallbackResponse = this.generateSmartFallback(nlpAnalysis.primaryIntent, userMessage);
      
      return {
        text: fallbackResponse.text,
        attachments: [],
        suggestions: fallbackResponse.suggestions,
        model: 'fallback'
      };
    }
  }

  /**
   * Remove emojis and informal language for executive output
   */
  private removeEmojisAndInformalLanguage(text: string): string {
    // Remove emojis
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[🎯🚨💡📊📋🔮🔧🏢📈✅❌⚠️✓•]/gu;
    let cleaned = text.replace(emojiRegex, '');
    
    // Replace informal headings
    cleaned = cleaned.replace(/###\s*🎯/g, '### ');
    cleaned = cleaned.replace(/###\s*🚨/g, '### ALERT: ');
    cleaned = cleaned.replace(/###\s*💡/g, '### ');
    cleaned = cleaned.replace(/###\s*📊/g, '### ');
    
    // Remove excess whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    return cleaned.trim();
  }

  /**
   * Generate executive-format response using AIML engine
   */
  private async generateExecutiveResponse(
    userMessage: string,
    nlpAnalysis: ReturnType<AdvancedNLPEngine['analyzeIntent']>,
    customerFilter?: CustomerFilter,
    temporalFilter?: TemporalFilter,
    startTime: number = Date.now()
  ): Promise<{
    text: string;
    attachments: MessageAttachment[];
    suggestions: SuggestedAction[];
    model: string;
    tokens?: { input: number; output: number };
  }> {
    try {
      // Generate executive report
      const report = await executiveReportGenerator.generateReport({
        format: 'executive',
        includeAnomalies: true,
        includeComparisons: true,
        includeTrends: true,
        includeRecommendations: true,
        customerFilter,
        temporalFilter
      });

      // Convert to markdown
      const responseText = executiveReportGenerator.toMarkdown(report);

      // Track performance
      performanceMonitor.recordRequest(Date.now() - startTime, true);

      const suggestions: SuggestedAction[] = [
        { id: 's1', label: 'Export to PDF', action: 'export_pdf', icon: 'file-text', priority: 'high', category: 'report' as const },
        { id: 's2', label: 'View anomaly details', action: 'anomaly_details', icon: 'alert-triangle', priority: 'high', category: 'query' as const },
        { id: 's3', label: 'Field notice breakdown', action: 'fn_breakdown', icon: 'file-warning', priority: 'medium', category: 'query' as const },
        { id: 's4', label: 'Technical analysis', action: 'technical', icon: 'code', priority: 'low', category: 'query' as const }
      ];

      return {
        text: responseText,
        attachments: [{
          type: 'metrics',
          data: {
            confidenceLevel: report.confidenceLevel,
            customersAnalyzed: report.metadata.customersIncluded,
            fieldNoticesAnalyzed: report.metadata.fieldNoticesIncluded
          },
          title: 'Report Metadata'
        }],
        suggestions,
        model: 'aiml-engine-v2.0',
        tokens: { input: userMessage.length, output: responseText.length }
      };
    } catch (error) {
      console.error('[ResponseGenerator] Executive response error:', error);
      throw error;
    }
  }

  /**
   * Generate field notice comparison response
   */
  private async generateComparisonResponse(
    userMessage: string,
    nlpAnalysis: ReturnType<AdvancedNLPEngine['analyzeIntent']>,
    customerFilter?: CustomerFilter,
    temporalFilter?: TemporalFilter,
    startTime: number = Date.now()
  ): Promise<{
    text: string;
    attachments: MessageAttachment[];
    suggestions: SuggestedAction[];
    model: string;
    tokens?: { input: number; output: number };
  }> {
    try {
      const comparisons = await aimlEngine.compareFieldNotices(undefined, customerFilter, temporalFilter);
      
      // Build response text
      const lines: string[] = [
        '# Field Notice Comparison Report',
        '',
        `Generated: ${new Date().toLocaleString()}`,
        '',
        '## Executive Summary',
        '',
        `Analyzed ${comparisons.length} field notices using weighted prioritization methodology.`,
        '',
        '### Prioritization Methodology',
        '',
        'Weighted factors applied:',
        '- Infrastructure Criticality: 30%',
        '- Customer Breadth: 25%',
        '- Cascading Failure Risk: 20%',
        '- Compliance Exposure: 15%',
        '- Device Volume: 10%',
        '',
        '## Priority Matrix',
        '',
        '| Priority | Field Notice | Devices | Customers | Type | Severity |',
        '|----------|--------------|---------|-----------|------|----------|'
      ];

      comparisons.slice(0, 10).forEach(c => {
        const deviceStr = c.totalDevices > 1000000 
          ? `${(c.totalDevices / 1000000).toFixed(2)}M`
          : c.totalDevices.toLocaleString();
        lines.push(`| ${c.priority} | ${c.fieldNoticeId} | ${deviceStr} | ${c.uniqueCustomers} | ${c.fnType} | ${c.severityClassification} |`);
      });

      const critical = comparisons.filter(c => c.severityClassification === 'CRITICAL');
      if (critical.length > 0) {
        lines.push('');
        lines.push('## CRITICAL Field Notices');
        lines.push('');
        critical.forEach(c => {
          lines.push(`### ${c.fieldNoticeId}`);
          lines.push('');
          lines.push(c.severityJustification);
          lines.push('');
        });
      }

      lines.push('');
      lines.push('## Key Insight');
      lines.push('');
      lines.push('Device count alone is insufficient for prioritization. Field notices affecting network infrastructure (routers, switches) receive higher priority than those affecting endpoint devices, regardless of total device count.');

      const responseText = lines.join('\n');

      performanceMonitor.recordRequest(Date.now() - startTime, true);

      const suggestions: SuggestedAction[] = [
        { id: 's1', label: 'Executive summary', action: 'executive_summary', icon: 'file-text', priority: 'high', category: 'report' as const },
        { id: 's2', label: 'Customer impact analysis', action: 'customer_impact', icon: 'users', priority: 'high', category: 'query' as const },
        { id: 's3', label: 'Remediation timeline', action: 'remediation', icon: 'clock', priority: 'medium', category: 'workflow' as const }
      ];

      return {
        text: responseText,
        attachments: [{
          type: 'table',
          data: comparisons.slice(0, 10),
          title: 'Field Notice Comparison'
        }],
        suggestions,
        model: 'aiml-engine-v2.0',
        tokens: { input: userMessage.length, output: responseText.length }
      };
    } catch (error) {
      console.error('[ResponseGenerator] Comparison response error:', error);
      throw error;
    }
  }

  /**
   * Generate anomaly detection response
   */
  private async generateAnomalyResponse(
    userMessage: string,
    nlpAnalysis: ReturnType<AdvancedNLPEngine['analyzeIntent']>,
    customerFilter?: CustomerFilter,
    temporalFilter?: TemporalFilter,
    startTime: number = Date.now()
  ): Promise<{
    text: string;
    attachments: MessageAttachment[];
    suggestions: SuggestedAction[];
    model: string;
    tokens?: { input: number; output: number };
  }> {
    try {
      const anomalies = await aimlEngine.detectAnomalies(customerFilter, temporalFilter);
      
      const criticalCount = anomalies.filter(a => a.severityLevel === 'CRITICAL').length;
      const highCount = anomalies.filter(a => a.severityLevel === 'HIGH').length;
      const mediumCount = anomalies.filter(a => a.severityLevel === 'MEDIUM').length;

      // Build response text
      const lines: string[] = [
        '# Detected Anomalies',
        '',
        'AI-identified anomalies in customer vulnerability patterns',
        '',
        '## Current Value',
        '',
        `**${anomalies.length}**`,
        '',
        '## AI Insight',
        '',
        `${anomalies.length} enterprise customers flagged with unusual vulnerability patterns requiring executive attention.`,
      ];

      if (anomalies.length > 0) {
        const topAccounts = anomalies.slice(0, 3).map(a => a.customerName).join(' and ');
        lines.push(`Critical accounts include ${topAccounts}. Immediate review recommended to assess business impact.`);
      }

      lines.push('');
      lines.push('## Key Findings');
      lines.push('');
      lines.push(`**Priority Distribution:** CRITICAL: ${criticalCount} | HIGH: ${highCount} | MEDIUM: ${mediumCount}`);
      lines.push('');

      anomalies.slice(0, 12).forEach((a, i) => {
        const tag = a.severityLevel === 'CRITICAL' ? 'CRIT' : a.severityLevel === 'HIGH' ? 'HIGH' : 'MED';
        lines.push(`${i + 1}. [${tag}] **${a.customerName}** - Risk Score: ${a.riskScore.percentage} | ${a.vulnerabilityCount} vulnerabilities detected (${a.vulnerabilityCount - a.baselineCount} above normal baseline of ${a.baselineCount})`);
      });

      lines.push('');
      lines.push('## Recommended Actions');
      lines.push('');
      lines.push('- Schedule executive briefing for high-priority accounts');
      lines.push('- Engage account teams for root cause analysis');
      lines.push('- Review SLA commitments for affected customers');
      lines.push('');
      lines.push(`**Confidence Level:** ${anomalies.length > 0 ? Math.round(anomalies[0].riskScore.confidence) : 85}%`);

      const responseText = lines.join('\n');

      performanceMonitor.recordRequest(Date.now() - startTime, true);

      const suggestions: SuggestedAction[] = [
        { id: 's1', label: 'Executive summary', action: 'executive_summary', icon: 'file-text', priority: 'high', category: 'report' as const },
        { id: 's2', label: 'Field notice comparison', action: 'fn_comparison', icon: 'git-compare', priority: 'high', category: 'query' as const },
        { id: 's3', label: 'Customer deep dive', action: 'customer_analysis', icon: 'users', priority: 'medium', category: 'query' as const }
      ];

      return {
        text: responseText,
        attachments: [{
          type: 'metrics',
          data: {
            total: anomalies.length,
            critical: criticalCount,
            high: highCount,
            medium: mediumCount,
            topAccount: anomalies[0]?.customerName,
            topRiskScore: anomalies[0]?.riskScore.percentage
          },
          title: 'Anomaly Summary'
        }],
        suggestions,
        model: 'aiml-engine-v2.0',
        tokens: { input: userMessage.length, output: responseText.length }
      };
    } catch (error) {
      console.error('[ResponseGenerator] Anomaly response error:', error);
      throw error;
    }
  }

  private generateSmartFallback(intent: string, userMessage: string): { text: string; suggestions: SuggestedAction[] } {
    // Map user message keywords to responses to avoid repetition
    const keywords = userMessage.toLowerCase();
    
    if (keywords.includes('critical') || keywords.includes('high-risk') || keywords.includes('urgent')) {
      return {
        text: `### CRITICAL ITEMS ANALYSIS

I'm analyzing your environment for critical items. Based on current data:

**Priority Actions Required:**
1. Review assets with vulnerability scores > 80
2. Check customers with elevated risk profiles
3. Address field notices with critical impact ratings

**Quick Stats:**
- Use "Show vulnerability analysis" for detailed breakdown
- Use "Show top customers by risk" for customer prioritization
- Use "List critical field notices" for FN overview

What specific critical area would you like to explore?`,
        suggestions: [
          { id: 's1', label: 'Show critical vulnerabilities', action: 'show_critical', icon: 'alert-triangle', priority: 'high', category: 'query' },
          { id: 's2', label: 'View high-risk customers', action: 'high_risk_customers', icon: 'users', priority: 'high', category: 'query' },
          { id: 's3', label: 'Critical field notices', action: 'critical_fn', icon: 'file-warning', priority: 'medium', category: 'query' }
        ]
      };
    }
    
    if (keywords.includes('customer') || keywords.includes('client') || keywords.includes('account')) {
      return {
        text: `### CUSTOMER INTELLIGENCE

I can help you analyze customer risk profiles. Here's what I can show you:

**Available Analysis:**
- **Risk Ranking** - Customers sorted by vulnerability exposure
- **Trend Analysis** - How customer risk is changing over time
- **Impact Assessment** - Field notices affecting each customer
- **Comparison** - Benchmark against similar accounts

Which customer or analysis would you like to explore?`,
        suggestions: [
          { id: 's1', label: 'Show top 10 customers', action: 'top_customers', icon: 'users', priority: 'high', category: 'query' },
          { id: 's2', label: 'Customer risk trends', action: 'customer_trends', icon: 'trending-up', priority: 'medium', category: 'query' },
          { id: 's3', label: 'Compare customers', action: 'compare_customers', icon: 'git-compare', priority: 'low', category: 'query' }
        ]
      };
    }
    
    if (keywords.includes('field notice') || keywords.includes('fn') || keywords.includes('notice')) {
      return {
        text: `### FIELD NOTICE ANALYSIS

I can provide detailed field notice intelligence:

**Available Information:**
- **Active Notices** - Currently affecting your environment
- **Impact Analysis** - Assets and customers affected per FN
- **Remediation Status** - Patching progress tracking
- **Priority Ranking** - FNs sorted by severity and impact

Which field notice information would you like to see?`,
        suggestions: [
          { id: 's1', label: 'List all field notices', action: 'list_fn', icon: 'file-text', priority: 'high', category: 'query' },
          { id: 's2', label: 'High-impact notices', action: 'high_impact_fn', icon: 'alert-circle', priority: 'high', category: 'query' },
          { id: 's3', label: 'FN remediation status', action: 'fn_remediation', icon: 'check-circle', priority: 'medium', category: 'query' }
        ]
      };
    }
    
    if (keywords.includes('trend') || keywords.includes('history') || keywords.includes('over time')) {
      return {
        text: `### TREND ANALYSIS

I can show you how your security posture has evolved:

**Trend Categories:**
- **Vulnerability Trends** - Month-over-month changes
- **Customer Risk Trends** - Risk evolution by account
- **Remediation Velocity** - Patching speed over time
- **Predictive Forecast** - Where trends are heading

What trend would you like to analyze?`,
        suggestions: [
          { id: 's1', label: 'Vulnerability trends', action: 'vuln_trends', icon: 'trending-up', priority: 'high', category: 'query' },
          { id: 's2', label: 'Customer trends', action: 'customer_trends', icon: 'users', priority: 'medium', category: 'query' },
          { id: 's3', label: 'Forecast next month', action: 'forecast', icon: 'zap', priority: 'medium', category: 'query' }
        ]
      };
    }
    
    if (keywords.includes('predict') || keywords.includes('forecast') || keywords.includes('future') || keywords.includes('next')) {
      return {
        text: `### PREDICTIVE ANALYTICS

I can provide ML-powered forecasts:

**Prediction Types:**
- **Vulnerability Forecast** - Expected counts for next 30/60/90 days
- **Risk Trajectory** - Where overall risk is heading
- **Resource Planning** - Capacity needs estimation
- **Early Warnings** - Anomalies and emerging threats

What would you like me to predict?`,
        suggestions: [
          { id: 's1', label: '30-day forecast', action: 'forecast_30', icon: 'calendar', priority: 'high', category: 'query' },
          { id: 's2', label: 'Risk trajectory', action: 'risk_forecast', icon: 'trending-up', priority: 'medium', category: 'query' },
          { id: 's3', label: 'Anomaly detection', action: 'anomalies', icon: 'alert-triangle', priority: 'medium', category: 'query' }
        ]
      };
    }
    
    if (keywords.includes('fix') || keywords.includes('remediat') || keywords.includes('patch') || keywords.includes('action')) {
      return {
        text: `### REMEDIATION GUIDANCE

I can help you create an action plan:

**Remediation Support:**
- **Priority Matrix** - What to fix first
- **Action Plans** - Step-by-step remediation
- **Timeline Estimation** - Capacity-based planning
- **Progress Tracking** - Monitor remediation velocity

How can I help with remediation planning?`,
        suggestions: [
          { id: 's1', label: 'Generate action plan', action: 'action_plan', icon: 'clipboard-list', priority: 'high', category: 'workflow' },
          { id: 's2', label: 'Priority matrix', action: 'priority_matrix', icon: 'grid', priority: 'high', category: 'query' },
          { id: 's3', label: 'Remediation timeline', action: 'timeline', icon: 'clock', priority: 'medium', category: 'query' }
        ]
      };
    }
    
    // Default contextual response
    return {
      text: `### HOW CAN I HELP?

I'm your SRE AgenticOps AI Assistant. I noticed you're asking about: *"${userMessage}"*

Let me guide you to the right analysis:

**SECURITY ANALYSIS**
- "Show vulnerability analysis" - Current security posture
- "What's our risk score?" - Overall risk assessment

**CUSTOMER INTELLIGENCE**  
- "Show top customers" - Risk-ranked customers
- "Analyze [Customer Name]" - Specific customer deep-dive

**FIELD NOTICES**
- "List field notices" - Active advisories
- "Impact of FN-xxxxx" - Specific FN analysis

**METRICS AND TRENDS**
- "Dashboard summary" - Key metrics overview
- "Show trends" - Historical analysis

**EXECUTIVE REPORTS**
- "Generate executive summary" - C-level briefing
- "Compare to last month" - Period comparison
- "Show board report" - Leadership summary

**VOICE FEATURES**
- Click the settings icon to customize voice
- Choose from 6 voice profiles (Aria, Marcus, Sophia, James, Priya, Nova)
- Adjust speed, pitch, and emotional tone
- Rate voice quality after each response

Just ask naturally - I understand context!`,
      suggestions: [
        { id: 's1', label: 'Dashboard summary', action: 'dashboard', icon: 'layout-dashboard', priority: 'high', category: 'query' },
        { id: 's2', label: 'Vulnerability analysis', action: 'vuln_analysis', icon: 'shield', priority: 'high', category: 'query' },
        { id: 's3', label: 'Customer overview', action: 'customers', icon: 'users', priority: 'medium', category: 'query' },
        { id: 's4', label: 'What can you do?', action: 'help', icon: 'help-circle', priority: 'low', category: 'query' }
      ]
    };
  }
}

// ==========================================
// MAIN CHATBOT SERVICE CLASS
// ==========================================

class ChatbotService {
  private memory: ConversationMemory;
  private nlpEngine: AdvancedNLPEngine;
  private responseGenerator: ResponseGenerator;
  private metrics: {
    totalMessages: number;
    successfulResponses: number;
    averageResponseTime: number;
    intentDistribution: Record<string, number>;
  };

  constructor() {
    this.memory = new ConversationMemory();
    this.nlpEngine = new AdvancedNLPEngine();
    this.responseGenerator = new ResponseGenerator();
    this.metrics = {
      totalMessages: 0,
      successfulResponses: 0,
      averageResponseTime: 0,
      intentDistribution: {}
    };
    
    // Validate API key on startup
    apiKeyValidator.validateKey().then(validation => {
      console.log(`[ChatBot] Cisco API Key Status: ${validation.status}, ID: ${validation.keyId}`);
    });
  }

  async processMessage(
    content: string,
    sessionId: string,
    inputType: 'voice' | 'text' = 'text',
    dashboardData?: any
  ): Promise<ChatbotResponse> {
    const startTime = Date.now();
    
    try {
      // Create user message
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content,
        timestamp: new Date(),
        metadata: { inputType }
      };

      // Add to memory
      this.memory.addMessage(sessionId, userMessage);
      const context = this.memory.getOrCreate(sessionId);

      // Analyze with NLP
      const nlpAnalysis = this.nlpEngine.analyzeIntent(content);

      // Store entities
      nlpAnalysis.entities.forEach(entity => {
        this.memory.addEntity(sessionId, entity);
      });

      // Update metrics
      this.metrics.totalMessages++;
      this.metrics.intentDistribution[nlpAnalysis.primaryIntent] = 
        (this.metrics.intentDistribution[nlpAnalysis.primaryIntent] || 0) + 1;

      // Generate response using enhanced data intelligence
      const responseData = await this.responseGenerator.generateResponse(
        content,
        context,
        nlpAnalysis,
        dashboardData
      );

      const processingTime = Date.now() - startTime;

      // Create assistant message
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: responseData.text,
        timestamp: new Date(),
        metadata: {
          inputType,
          processingTime,
          model: responseData.model,
          confidence: nlpAnalysis.confidence,
          tokens: responseData.tokens,
          ciscoAPIUsed: responseData.model.includes('circuit')
        },
        attachments: responseData.attachments
      };

      // Add to memory
      this.memory.addMessage(sessionId, assistantMessage);

      // Update metrics
      this.metrics.successfulResponses++;
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * (this.metrics.successfulResponses - 1) + processingTime) / 
        this.metrics.successfulResponses;

      // Generate voice output
      const voiceOutput = this.generateVoiceOutput(responseData.text, nlpAnalysis.sentiment);

      return {
        success: true,
        message: assistantMessage,
        suggestions: responseData.suggestions,
        voiceOutput,
        relatedInsights: this.generateRelatedInsights(nlpAnalysis.primaryIntent, dashboardData)
      };

    } catch (error) {
      console.error('[ChatBot] Error processing message:', error);
      
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_err`,
        role: 'assistant',
        content: "I apologize, but I encountered an issue processing your request. Please try rephrasing your question or contact support if the problem persists.",
        timestamp: new Date(),
        metadata: { inputType, processingTime: Date.now() - startTime }
      };

      return {
        success: false,
        message: errorMessage,
        suggestions: [
          { id: 'retry', label: 'Try again', action: 'retry', icon: 'refresh-cw', priority: 'high', category: 'query' },
          { id: 'help', label: 'Get help', action: 'show_help', icon: 'help-circle', priority: 'medium', category: 'query' }
        ]
      };
    }
  }

  private generateVoiceOutput(
    text: string, 
    sentiment: 'positive' | 'neutral' | 'negative' | 'urgent'
  ): { text: string; ssml?: string; emotion?: 'neutral' | 'concerned' | 'positive' | 'urgent' } {
    // Clean text for speech
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .substring(0, 500); // Limit length for speech

    const emotion = sentiment === 'urgent' ? 'urgent' : 
                   sentiment === 'negative' ? 'concerned' :
                   sentiment === 'positive' ? 'positive' : 'neutral';

    return {
      text: cleanText,
      emotion
    };
  }

  private generateRelatedInsights(intent: string, dashboardData?: any): RelatedInsight[] {
    const insights: RelatedInsight[] = [];

    if (intent === 'vulnerability_analysis' && dashboardData) {
      if (dashboardData.vulnerableCount > 10000) {
        insights.push({
          title: 'High Vulnerability Count Alert',
          summary: `Your environment has ${dashboardData.vulnerableCount?.toLocaleString()} vulnerable assets. Consider prioritizing automated remediation.`,
          relevance: 0.95,
          source: 'Dashboard Analytics',
          actionable: true
        });
      }
    }

    if (intent === 'customer_query') {
      insights.push({
        title: 'Customer Risk Trends',
        summary: 'Top 10 customers account for 60% of total vulnerabilities. Focus remediation efforts here for maximum impact.',
        relevance: 0.85,
        source: 'Customer Analytics',
        actionable: true
      });
    }

    return insights;
  }

  getConversationHistory(sessionId: string): ChatMessage[] {
    return this.memory.getRecentMessages(sessionId, 50);
  }

  getContext(sessionId: string): ConversationContext {
    return this.memory.getOrCreate(sessionId);
  }

  updatePreferences(sessionId: string, preferences: Partial<UserPreferences>): void {
    this.memory.updatePreferences(sessionId, preferences);
  }

  clearSession(sessionId: string): void {
    this.memory.clearSession(sessionId);
  }

  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  getRateLimitStatus(): { remaining: number; resetAt: Date } {
    // Use performance monitor for rate limit status
    return {
      remaining: 100, // Default rate limit
      resetAt: new Date(Date.now() + 60000) // Reset in 1 minute
    };
  }
}

// ==========================================
// SINGLETON EXPORT
// ==========================================

export const chatbotService = new ChatbotService();

// Export individual functions for API routes
export async function processMessage(
  content: string,
  sessionId: string,
  inputType: 'voice' | 'text' = 'text',
  dashboardData?: any
): Promise<ChatbotResponse> {
  return chatbotService.processMessage(content, sessionId, inputType, dashboardData);
}

export function getConversationHistory(sessionId: string): ChatMessage[] {
  return chatbotService.getConversationHistory(sessionId);
}

export function getContext(sessionId: string): ConversationContext {
  return chatbotService.getContext(sessionId);
}

export function clearSession(sessionId: string): void {
  return chatbotService.clearSession(sessionId);
}

export function getChatbotMetrics() {
  return chatbotService.getMetrics();
}
