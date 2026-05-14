/**
 * Advanced ChatGPT-Style Voice Chatbot Component
 * Cisco SRE AgenticOps Intelligence Dashboard
 * 
 * Features:
 * - ChatGPT-like conversational interface
 * - Voice input with Web Speech API
 * - Text-to-speech responses
 * - Rich message rendering (markdown, code, tables)
 * - Suggestion chips and quick actions
 * - Conversation history with context
 * - Cisco CIRCUIT API integration
 * - Advanced 3D Robotic Avatar with lip-sync
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X, Mic, MicOff, Send, User, Volume2, VolumeX,
  RefreshCw, ThumbsUp, ThumbsDown, Copy, Check, ChevronDown,
  MessageSquare, Zap, Shield, TrendingUp, Users, FileText,
  AlertTriangle, BarChart3, Target, Clock, Loader2, Minimize2,
  Maximize2, Settings, HelpCircle, Trash2, Download, ChevronRight,
  Sliders, Star, Square, Brain, Bot
} from 'lucide-react';

// Robotic Avatar for enhanced voice interaction
import { RoboticAvatar, useRobotStateMachine } from './RoboticAvatar';

// Enhanced Voice Synthesis Service
import { 
  VoiceSynthesisService, 
  getVoiceSynthesisService, 
  VoiceProfile,
  VoiceContext 
} from '../services/voiceSynthesisService';
import { VoiceSettingsPanel } from './VoiceSettingsPanel';

// VibeVoice Integration — unified voice pipeline
import { useVibeVoice, VoicePhase } from '../hooks/useVibeVoice';

// Chatbot Data Persistence Service
import {
  ChatbotDataPersistence,
  getChatbotDataPersistence,
  PersistentChatMessage,
  RecoveryReport
} from '../services/chatbotDataPersistence';

// Admin Settings Service
import { getAdminSettingsService } from '../services/adminSettingsService';

// Conversational Intelligence Service
import { 
  getConversationalIntelligence, 
  ConversationalIntelligence,
  ConversationContext,
  ConversationResponse 
} from '../services/conversationalIntelligence';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    inputType?: 'voice' | 'text';
    processingTime?: number;
    model?: string;
    confidence?: number;
  };
  attachments?: MessageAttachment[];
  feedback?: 'positive' | 'negative' | null;
}

interface MessageAttachment {
  type: 'chart' | 'table' | 'metrics' | 'recommendations' | 'workflow' | 'alert';
  data: any;
  title?: string;
}

interface SuggestedAction {
  id: string;
  label: string;
  action: string;
  icon: string;
  priority: 'high' | 'medium' | 'low';
  category: 'query' | 'workflow' | 'navigation' | 'report';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dashboardData?: {
    vulnerableCount?: number;
    potentiallyVulnerableCount?: number;
    secureCount?: number;
    fieldNoticeCount?: number;
    topCustomers?: string;
  };
}

// ==========================================
// QUICK COMMAND PRESETS
// Expanded set of commands organized by category
// ==========================================

const QUICK_COMMANDS = [
  // SRE AgenticOps Intelligence Dashboard Commands
  { text: "Show me the trends", icon: TrendingUp, color: 'blue', category: 'metrics' },
  { text: "What are the anomalies", icon: AlertTriangle, color: 'rose', category: 'security' },
  { text: "System health status", icon: Shield, color: 'emerald', category: 'health' },
  { text: "Show metrics overview", icon: BarChart3, color: 'cyan', category: 'metrics' },
  { text: "Top customer insights", icon: Users, color: 'purple', category: 'customers' },
  { text: "What should I prioritize", icon: Target, color: 'amber', category: 'priorities' },
];

const SUGGESTION_CHIPS = [
  "Executive summary",
  "Risk assessment",
  "Customer analysis",
  "Compare periods",
  "Remediation plan",
  "30-day forecast",
  "Critical items",
  "Field notices",
  "Board report",
  "Export data"
];

const ADVANCED_QUESTIONS = [
  // Executive & Strategic (NEW)
  "Generate board-level security brief",
  "What's the financial impact of current risks?",
  "Create CISO presentation summary",
  "Show business impact assessment",
  
  // ML/AI powered
  "Run predictive analysis for next 90 days",
  "Detect anomalies in recent data",
  "What's driving the vulnerability trend?",
  "Compare current vs historical risk",
  
  // Deep dive
  "Show me the complete risk matrix",
  "Analyze field notices by severity",
  "Which patches should I apply first?",
  "What resources do I need for remediation?"
];

// ==========================================
// MAIN COMPONENT
// ==========================================

export const ChatGPTStyleChatbot: React.FC<Props> = ({ isOpen, onClose, dashboardData }) => {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [suggestions, setSuggestions] = useState<SuggestedAction[]>([]);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(16).fill(0.2));
  const [showRobotMode, setShowRobotMode] = useState(false);
  const [robotAudioLevel, setRobotAudioLevel] = useState(0);
  const [lastSpokenText, setLastSpokenText] = useState('');
  
  // Get initial state from admin settings
  const adminSettingsService = getAdminSettingsService();
  const initialSettings = adminSettingsService.getSettings();
  const [showAdvancedQuestions, setShowAdvancedQuestions] = useState(initialSettings.expandSuggestionsByDefault);
  
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [currentVoiceProfile, setCurrentVoiceProfile] = useState<VoiceProfile | null>(null);
  const [voiceRating, setVoiceRating] = useState<number>(0);
  const [recoveryInProgress, setRecoveryInProgress] = useState(false);
  
  // Conversational state
  const [conversationContext, setConversationContext] = useState<ConversationContext | null>(null);
  const [hasIntroduced, setHasIntroduced] = useState(false);
  const [speechQueueActive, setSpeechQueueActive] = useState(false);
  const [speechErrorCount, setSpeechErrorCount] = useState(0);
  const speechQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);

  // VibeVoice hook — unified ASR + TTS pipeline with streaming
  const vibeVoice = useVibeVoice({
    sessionId,
    autoSpeak,
    enableVibeVoiceTTS: true,
    dashboardData,
    onTranscript: (text) => {
      setInputValue(text);
    },
    onResponse: (text, metadata) => {
      // Response is handled by handleSend flow, this is for WS-driven converse
    },
    onSpeakingStart: () => {
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      robotState.startSpeaking();
    },
    onSpeakingEnd: () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      robotState.goIdle();
    },
    onError: (error) => {
      console.warn('[Chatbot] VibeVoice error:', error);
    },
  });

  // Robot state machine for animated avatar
  const robotState = useRobotStateMachine({
    autoTransition: true,
    thinkingDuration: 3000,
    successDuration: 2000,
  });

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const animationRef = useRef<number>();
  const audioLevelIntervalRef = useRef<NodeJS.Timeout>();

  // Enhanced Voice Synthesis Service (memoized singleton)
  const voiceService = useMemo(() => {
    const service = getVoiceSynthesisService();
    service.onSpeakingStateChange(setIsSpeaking);
    return service;
  }, []);

  // Chatbot Data Persistence Service (memoized singleton)
  const persistenceService = useMemo(() => {
    const service = getChatbotDataPersistence(sessionId);
    
    // Setup recovery callbacks
    service.onDataRestoredCallback((restoredMessages) => {
      console.log('[Chatbot] Data restored via persistence service');
      const convertedMessages: ChatMessage[] = restoredMessages.map(m => ({
        ...m,
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp),
        metadata: m.metadata,
        feedback: m.feedback as 'positive' | 'negative' | null
      }));
      setMessages(convertedMessages);
      setRecoveryInProgress(false);
    });
    
    service.onZeroDataDetectedCallback((report) => {
      console.warn('[Chatbot] Zero data detected:', report);
      if (report.messageCount > 0) {
        console.log('[Chatbot] Recovery successful:', report);
      }
    });
    
    return service;
  }, [sessionId]);

  // Conversational Intelligence Service (memoized singleton)
  const conversationalAI = useMemo(() => {
    const ai = getConversationalIntelligence();
    ai.setSpeechCallbacks({
      onStart: () => setSpeechQueueActive(true),
      onEnd: () => setSpeechQueueActive(false),
      onError: (error) => {
        console.error('[Chatbot] Speech error:', error);
        setSpeechErrorCount(prev => prev + 1);
      }
    });
    return ai;
  }, []);

  // Initialize voice profile
  useEffect(() => {
    if (voiceService) {
      setCurrentVoiceProfile(voiceService.getProfile());
    }
  }, [voiceService]);

  // ==========================================
  // EFFECTS
  // ==========================================

  // Subscribe to admin settings changes
  useEffect(() => {
    const unsubscribe = adminSettingsService.onSettingsChange((newSettings) => {
      setShowAdvancedQuestions(newSettings.expandSuggestionsByDefault);
    });
    return () => unsubscribe();
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Waveform animation
  useEffect(() => {
    if (isListening) {
      const animate = () => {
        setWaveformData(prev => prev.map(() => 0.2 + Math.random() * 0.8));
        setRobotAudioLevel(0.3 + Math.random() * 0.7); // For robot mouth sync
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      setWaveformData(new Array(16).fill(0.2));
      setRobotAudioLevel(0);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isListening]);

  // Robot state synchronization
  useEffect(() => {
    if (isSpeaking) {
      robotState.startSpeaking();
      // Simulate audio level for speaking animation
      audioLevelIntervalRef.current = setInterval(() => {
        setRobotAudioLevel(0.3 + Math.random() * 0.7);
      }, 80);
    } else if (isListening) {
      robotState.startListening();
    } else if (isLoading) {
      robotState.startThinking();
    } else {
      robotState.goIdle();
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
      }
      setRobotAudioLevel(0);
    }
    
    return () => {
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
      }
    };
  }, [isSpeaking, isListening, isLoading]);

  // Welcome message and persistence initialization with conversational AI
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Try to restore messages from persistence
      const storedMessages = persistenceService.getMessages();
      
      if (storedMessages.length > 0) {
        // Restore from persistence
        const convertedMessages: ChatMessage[] = storedMessages.map(m => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(convertedMessages);
        setHasIntroduced(true); // Assume already introduced if restoring
        console.log('[Chatbot] Restored messages from persistence:', convertedMessages.length);
      } else {
        // Get introduction from conversational AI
        const introduction = conversationalAI.getIntroduction();
        setConversationContext(conversationalAI.getContext());
        
        // Show welcome message with Nova's introduction
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          role: 'assistant',
          content: `🧠 **Welcome to SRE AgenticOps**

${introduction.text}

**I can help you with:**
• **Security Analysis** - Vulnerability insights and risk assessment
• **Customer Intelligence** - Risk profiles and impact analysis  
• **Operational Metrics** - Dashboard summaries and trends
• **AI/ML Insights** - Predictive analytics with "wow factor" discoveries
• **Reports** - Executive summaries and exports

Tap microphone to speak or select a command below:`,
          timestamp: new Date(),
          metadata: { model: 'nova-conversational' }
        };
        setMessages([welcomeMessage]);
        setHasIntroduced(true);
        
        // Auto-speak introduction if robot mode is enabled
        if (showRobotMode && autoSpeak) {
          setTimeout(() => {
            speakText(introduction.voiceText, 'introduction friendly');
          }, 500);
        }
        
        // Persist welcome message
        persistenceService.addMessage({
          id: welcomeMessage.id,
          role: welcomeMessage.role,
          content: welcomeMessage.content,
          metadata: welcomeMessage.metadata
        });
      }
    }
  }, [isOpen, persistenceService]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      stopSpeaking();
    }
  }, [isOpen]);

  // ==========================================
  // VOICE FUNCTIONS
  // ==========================================

  const startListening = useCallback(() => {
    // Use VibeVoice-enhanced listening (Web Speech API ASR with VibeVoice state management)
    vibeVoice.startListening();
    setIsListening(true);
    setInputValue('');
    robotState.startListening();
  }, [vibeVoice]);

  // Sync VibeVoice transcript to input
  useEffect(() => {
    const trans = vibeVoice.state.interimTranscript || vibeVoice.state.transcript;
    if (trans && vibeVoice.state.phase === 'listening') {
      setInputValue(trans);
    }
    // Auto-submit when listening ends with a transcript
    if (vibeVoice.state.phase !== 'listening' && vibeVoice.state.transcript) {
      const finalText = vibeVoice.state.transcript;
      if (finalText.trim()) {
        handleSend(finalText, 'voice');
      }
      setIsListening(false);
    }
  }, [vibeVoice.state.transcript, vibeVoice.state.interimTranscript, vibeVoice.state.phase]);

  const stopListening = useCallback(() => {
    vibeVoice.stopListening();
    setIsListening(false);
  }, [vibeVoice]);

  /**
   * Enhanced speech with queue management and error handling
   * Fixes: "Speaking... 🔊 Speaking.." duplicate display issue
   */
  const speakText = useCallback(async (text: string, responseContext?: string) => {
    if (!voiceService) {
      console.warn('[Chatbot] Voice service not available');
      return;
    }

    // Prevent duplicate speech - check if already speaking this text
    if (isSpeakingRef.current && lastSpokenText === text) {
      console.log('[Chatbot] Already speaking this text, skipping duplicate');
      return;
    }

    // Stop any ongoing speech before starting new one
    if (isSpeakingRef.current) {
      voiceService.stop();
      await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause
    }

    // Track speaking state
    isSpeakingRef.current = true;
    setLastSpokenText(text);

    try {
      // Clean text for speech (remove markdown, emojis for cleaner audio)
      const cleanText = text
        .replace(/\*\*([^*]+)\*\*/g, '$1')  // Bold
        .replace(/\*([^*]+)\*/g, '$1')       // Italic
        .replace(/`([^`]+)`/g, '$1')         // Code
        .replace(/#{1,6}\s*/g, '')           // Headers
        .replace(/[🎤🔊🤔💡]/g, '')          // Emojis that cause issues
        .replace(/\.{3,}/g, '...')           // Normalize ellipses
        .trim();

      // Skip if text is too short or empty after cleaning
      if (cleanText.length < 3) {
        console.log('[Chatbot] Text too short to speak');
        isSpeakingRef.current = false;
        return;
      }

      // Auto-detect context from response content for natural voice adaptation
      const context: VoiceContext = voiceService.detectContext(cleanText);
      
      // Enhance context based on response type
      if (responseContext) {
        if (responseContext.includes('executive') || responseContext.includes('summary')) {
          context.type = 'executive';
          context.emotionalTone = 'confident';
        } else if (responseContext.includes('alert') || responseContext.includes('critical')) {
          context.type = 'urgent';
          context.emotionalTone = 'urgent';
        } else if (responseContext.includes('success') || responseContext.includes('resolved')) {
          context.type = 'success';
          context.emotionalTone = 'friendly';
        } else if (responseContext.includes('friendly') || responseContext.includes('introduction')) {
          context.type = 'conversational';
          context.emotionalTone = 'friendly';
        }
      }

      // Use VibeVoice TTS if available (real-time streaming, higher quality)
      // Falls back to browser Web Speech API via vibeVoice.speak() internal fallback chain
      // Chain: WebSocket streaming → REST /api/voice/tts → browser speechSynthesis
      vibeVoice.speak(cleanText);
      setSpeechErrorCount(0);
    } catch (error) {
      console.error('[Chatbot] Error during speech synthesis:', error);
      setSpeechErrorCount(prev => prev + 1);
      
      // Retry logic for transient errors (max 2 retries)
      if (speechErrorCount < 2) {
        console.log('[Chatbot] Retrying speech synthesis...');
        setTimeout(() => {
          speakText(text, responseContext);
        }, 500);
      }
    } finally {
      isSpeakingRef.current = false;
    }
  }, [voiceService, lastSpokenText, speechErrorCount]);

  const stopSpeaking = useCallback(() => {
    try {
      voiceService?.stop();
      vibeVoice.stop(); // Stop VibeVoice streaming TTS
      isSpeakingRef.current = false;
      speechQueueRef.current = []; // Clear queue
    } catch (error) {
      console.error('[Chatbot] Error stopping speech:', error);
    }
    setIsSpeaking(false);
  }, [voiceService, vibeVoice]);

  // Voice rating handler
  const handleVoiceRating = useCallback((rating: number) => {
    setVoiceRating(rating);
    voiceService?.submitRating(rating);
  }, [voiceService]);

  // Handle voice profile change from settings panel
  const handleVoiceProfileChange = useCallback((profile: VoiceProfile) => {
    setCurrentVoiceProfile(profile);
  }, []);

  // ==========================================
  // MESSAGE HANDLING WITH CONVERSATIONAL AI
  // ==========================================

  /**
   * Check if input is a conversational query (greeting, mood, name)
   * that should be handled by the conversational AI locally
   */
  const isConversationalInput = useCallback((text: string): boolean => {
    const lowerText = text.toLowerCase().trim();
    
    // Greetings
    if (/^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening))/.test(lowerText)) {
      return true;
    }
    
    // Mood responses
    if (/^(i'?m\s+(doing\s+)?(great|good|fine|okay|well|bad|terrible)|doing\s+(great|good|fine|okay)|not\s+bad|pretty\s+good)/.test(lowerText)) {
      return true;
    }
    
    // Name introductions
    if (/^(my\s+name\s+is|i'?m\s+\w+$|call\s+me|you\s+can\s+call\s+me)/.test(lowerText)) {
      return true;
    }
    
    // "How are you" type questions back to bot
    if (/^(how\s+are\s+you|what'?s\s+your\s+name|who\s+are\s+you|what\s+can\s+you\s+do)/.test(lowerText)) {
      return true;
    }
    
    // Requests for AI insights
    if (/^(show\s+me\s+(an?\s+)?insight|give\s+me\s+(an?\s+)?wow|impress\s+me|show\s+me\s+something\s+(cool|impressive))/.test(lowerText)) {
      return true;
    }
    
    return false;
  }, []);

  /**
   * Handle conversational inputs locally with the AI
   */
  const handleConversationalInput = useCallback((text: string): ConversationResponse | null => {
    const lowerText = text.toLowerCase().trim();
    
    // Update context with user name if mentioned
    const context = conversationalAI.getContext();
    
    // Handle different conversational inputs
    if (/^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening))/.test(lowerText)) {
      if (!hasIntroduced) {
        return conversationalAI.getIntroduction();
      }
      return conversationalAI.generateResponse(text);
    }
    
    // Mood responses ("I'm doing great", "I'm good", etc.)
    if (/^(i'?m\s+(doing\s+)?(great|good|fine|okay|well|bad|terrible)|doing\s+(great|good|fine|okay)|not\s+bad|pretty\s+good)/.test(lowerText)) {
      return conversationalAI.processMoodResponse(text);
    }
    
    // Name introductions
    if (/^(my\s+name\s+is|i'?m\s+\w+$|call\s+me)/.test(lowerText)) {
      return conversationalAI.processNameResponse(text);
    }
    
    // What can you do / capabilities
    if (/^(what\s+can\s+you\s+do|help|capabilities)/.test(lowerText)) {
      return conversationalAI.generateResponse(text);
    }
    
    // Who are you / what's your name
    if (/^(who\s+are\s+you|what'?s?\s+your\s+name)/.test(lowerText)) {
      const userName = context.userName ? `, ${context.userName}` : '';
      return {
        text: `I'm Nova${userName ? ` and it's great to be working with you${userName}` : ''}! I'm your SRE AgenticOps Intelligence Assistant, powered by advanced AI to help you navigate security metrics, customer risks, and operational intelligence. What would you like to explore?`,
        voiceText: `I'm Nova${userName ? ` and it's great to be working with you${userName}` : ''}! I'm your S.R.E. AgenticOps Intelligence Assistant, powered by advanced A.I. to help you navigate security metrics, customer risks, and operational intelligence. What would you like to explore?`,
        emotionalTone: 'friendly',
        suggestedFollowUps: ['Show me the trends', 'What are the anomalies', 'System health status'],
        contextUpdate: {},
        shouldSpeak: true
      };
    }
    
    // Show me an insight / wow me
    if (/^(show\s+me\s+(an?\s+)?insight|give\s+me\s+(an?\s+)?wow|impress\s+me|show\s+me\s+something)/.test(lowerText)) {
      return conversationalAI.getWowFactorInsight(text);
    }
    
    return null;
  }, [conversationalAI, hasIntroduced]);

  const handleSend = async (text?: string, inputType: 'voice' | 'text' = 'text') => {
    const messageText = text || inputValue.trim();
    if (!messageText || isLoading) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
      metadata: { inputType }
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Persist user message immediately
    persistenceService.addMessage({
      id: userMessage.id,
      role: 'user',
      content: messageText,
      metadata: { inputType }
    });
    
    setInputValue('');
    
    // Check if this is a conversational input that can be handled locally
    if (isConversationalInput(messageText)) {
      const conversationalResponse = handleConversationalInput(messageText);
      
      if (conversationalResponse) {
        // Update conversation context
        if (conversationalResponse.contextUpdate) {
          conversationalAI.updateContext(conversationalResponse.contextUpdate);
          setConversationContext(conversationalAI.getContext());
        }
        
        // Create assistant message from conversational AI
        const assistantMessage: ChatMessage = {
          id: `nova_${Date.now()}`,
          role: 'assistant',
          content: conversationalResponse.text,
          timestamp: new Date(),
          metadata: { 
            model: 'nova-conversational',
            confidence: 1.0 
          }
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        // Persist assistant message
        persistenceService.addMessage({
          id: assistantMessage.id,
          role: 'assistant',
          content: assistantMessage.content,
          metadata: assistantMessage.metadata
        });
        
        // Set follow-up suggestions
        if (conversationalResponse.suggestedFollowUps?.length > 0) {
          setSuggestions(conversationalResponse.suggestedFollowUps.map((label, i) => ({
            id: `suggest_${i}`,
            label,
            action: label,
            icon: 'message',
            priority: 'medium' as const,
            category: 'query' as const
          })));
        }
        
        // Auto-speak if enabled
        if (autoSpeak && conversationalResponse.shouldSpeak) {
          speakText(conversationalResponse.voiceText, conversationalResponse.emotionalTone);
        }
        
        return; // Don't send to API for conversational responses
      }
    }
    
    setIsLoading(true);

    try {
      const response = await fetch('/api/chatbot/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          sessionId,
          inputType,
          dashboardData,
          conversationContext: conversationalAI.getContext() // Include context for API
        })
      });

      const data = await response.json();

      // Handle rate limit errors (429)
      if (response.status === 429) {
        const retryAfter = data.retryAfter || 10;
        const rateLimitMessage: ChatMessage = {
          id: `ratelimit_${Date.now()}`,
          role: 'assistant',
          content: `**Rate Limit Reached**\n\n${data.message || 'Too many requests. Please wait a moment.'}\n\n*Retry in ${retryAfter} seconds...*`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, rateLimitMessage]);
        
        // Persist rate limit message
        persistenceService.addMessage({
          id: rateLimitMessage.id,
          role: 'assistant',
          content: rateLimitMessage.content
        });
        
        // Auto-retry after the specified time
        setTimeout(() => {
          setSuggestions([
            { id: 'retry', label: 'Retry my request', action: 'retry', icon: 'refresh', priority: 'high', category: 'action' as const }
          ]);
        }, retryAfter * 1000);
        return;
      }

      // Handle service unavailable (503) - circuit breaker open
      if (response.status === 503) {
        const serviceMessage: ChatMessage = {
          id: `service_${Date.now()}`,
          role: 'assistant',
          content: `**Service Temporarily Unavailable**\n\n${data.message || 'The AI service is experiencing high load.'}\n\nPlease try again in a moment. Your request has been noted.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, serviceMessage]);
        
        // Persist service message
        persistenceService.addMessage({
          id: serviceMessage.id,
          role: 'assistant',
          content: serviceMessage.content
        });
        return;
      }

      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: data.message?.id || `assistant_${Date.now()}`,
          role: 'assistant',
          content: data.message?.content || 'I processed your request.',
          timestamp: new Date(),
          metadata: data.message?.metadata,
          attachments: data.message?.attachments
        };
        setMessages(prev => [...prev, assistantMessage]);
        setSuggestions(data.suggestions || []);

        // Persist assistant message
        persistenceService.addMessage({
          id: assistantMessage.id,
          role: 'assistant',
          content: assistantMessage.content,
          metadata: assistantMessage.metadata
        });

        // Auto-speak response if enabled (with error handling)
        if (autoSpeak && data.voiceOutput?.text) {
          try {
            speakText(data.voiceOutput.text);
          } catch (voiceError) {
            console.error('[Chatbot] Auto-speak failed:', voiceError);
          }
        }
      } else {
        // Error response from API
        const errorContent = data.suggestion 
          ? `I'm sorry, I encountered an issue: ${data.details || 'Unknown error'}\n\nSuggestion: ${data.suggestion}`
          : `I'm sorry, I encountered an issue processing your request. Please try again.`;
        
        const errorMessage: ChatMessage = {
          id: `error_${Date.now()}`,
          role: 'assistant',
          content: errorContent,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      // Provide more specific error messages
      let errorContent = "I'm having trouble connecting to the server.";
      
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        errorContent = "**Connection Error**\n\nUnable to reach the server. Please check:\n- Your internet connection\n- Server status at port 5050\n\nTry refreshing the page or contact support if the issue persists.";
      } else if (error instanceof Error) {
        errorContent = `**Error**\n\n${error.message}\n\nPlease try again or contact support.`;
      }
      
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: errorContent,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickCommand = (text: string) => {
    setInputValue(text);
    handleSend(text);
  };

  const handleSuggestionClick = (suggestion: SuggestedAction) => {
    handleSend(suggestion.label);
  };

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================

  const copyToClipboard = (text: string, messageId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleFeedback = (messageId: string, type: 'positive' | 'negative') => {
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, feedback: type } : m
    ));
    
    // Update feedback in persistence
    persistenceService.updateMessageFeedback(messageId, type);
    
    // Send feedback to API
    fetch('/api/chatbot/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, sessionId, rating: type === 'positive' ? 1 : -1 })
    }).catch(console.error);
  };

  const clearChat = () => {
    setMessages([]);
    setSuggestions([]);
    
    // Clear via persistence service (creates backup first)
    persistenceService.clearMessages();
    
    fetch(`/api/chatbot/session/${sessionId}`, { method: 'DELETE' }).catch(console.error);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // ==========================================
  // RENDER FUNCTIONS
  // ==========================================

  const renderMarkdown = (content: string) => {
    // Safety check for null/undefined content
    if (!content || typeof content !== 'string') {
      return <span className="text-gray-400">No content available</span>;
    }
    
    try {
      // Simple markdown rendering
      return content
        .split('\n')
        .map((line, i) => {
          // Headers
          if (line.startsWith('### ')) {
            return <h3 key={i} className="text-base font-semibold text-white mt-3 mb-1">{line.replace('### ', '')}</h3>;
          }
          if (line.startsWith('## ')) {
            return <h2 key={i} className="text-lg font-semibold text-white mt-3 mb-1">{line.replace('## ', '')}</h2>;
          }
          if (line.startsWith('# ')) {
            return <h1 key={i} className="text-xl font-bold text-white mt-3 mb-2">{line.replace('# ', '')}</h1>;
          }
          
          // Bullet points
          if (line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ')) {
            const text = line.replace(/^[•\-\*]\s/, '');
            return (
              <div key={i} className="flex items-start gap-2 my-1">
                <span className="text-cyan-400 mt-1">•</span>
                <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(text) }} />
              </div>
            );
          }

          // Empty lines
          if (!line.trim()) {
            return <div key={i} className="h-2" />;
          }

          // Regular paragraphs
          return (
            <p key={i} className="my-1" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} />
          );
        });
    } catch (error) {
      console.error('[Chatbot] Error rendering markdown:', error);
      return <span className="text-gray-300">{content}</span>;
    }
  };

  const formatInlineMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="text-gray-300">$1</em>')
      .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 bg-slate-700 rounded text-cyan-300 text-sm">$1</code>');
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    
    return (
      <div 
        key={message.id}
        className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} mb-4 animate-fadeIn`}
      >
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md ${
          isUser 
            ? 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-purple-500/20' 
            : 'bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 shadow-cyan-500/20'
        }`}>
          {isUser ? <User className="w-4 h-4 text-white" /> : <Brain className="w-4 h-4 text-white" />}
        </div>

        {/* Message Content */}
        <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
          <div className={`inline-block rounded-2xl px-4 py-3 ${
            isUser 
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-md' 
              : 'bg-slate-800/80 border border-slate-700/50 text-gray-200 rounded-bl-md'
          }`}>
            {/* Voice indicator */}
            {message.metadata?.inputType === 'voice' && (
              <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                <Mic className="w-3 h-3" />
                <span>Voice input</span>
              </div>
            )}

            {/* Content */}
            <div className="text-sm leading-relaxed">
              {isUser ? message.content : renderMarkdown(message.content)}
            </div>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.attachments.map((att, i) => (
                  <div key={i} className="p-3 bg-slate-700/50 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">{att.title || att.type}</div>
                    <pre className="text-xs text-gray-300 overflow-x-auto">
                      {JSON.stringify(att.data, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message meta & actions */}
          <div className={`flex items-center gap-2 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
            
            {!isUser && message.id !== 'welcome' && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => copyToClipboard(message.content, message.id)}
                  className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                  title="Copy"
                >
                  {copiedMessageId === message.id ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => speakText(message.content)}
                  className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                  title="Read aloud"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleFeedback(message.id, 'positive')}
                  className={`p-1 transition-colors ${
                    message.feedback === 'positive' ? 'text-green-400' : 'text-gray-500 hover:text-gray-300'
                  }`}
                  title="Helpful"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleFeedback(message.id, 'negative')}
                  className={`p-1 transition-colors ${
                    message.feedback === 'negative' ? 'text-red-400' : 'text-gray-500 hover:text-gray-300'
                  }`}
                  title="Not helpful"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {message.metadata?.model && (
              <span className="text-xs text-gray-600 ml-2">{message.metadata.model}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER
  // ==========================================

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn overflow-y-auto" style={{ paddingTop: '70vh' }}>
      <div 
        className={`relative flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
          rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden transition-all duration-300
          ${isExpanded ? 'w-full h-full max-w-none max-h-none' : 'w-full max-w-2xl h-[85vh] max-h-[800px]'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 
                flex items-center justify-center shadow-lg shadow-cyan-500/25 ring-2 ring-cyan-400/20">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-800 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">SRE AgenticOps</h2>
              <p className="text-xs text-cyan-400/80">Powered by Cisco CIRCUIT AI</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Robot Mode Toggle */}
            <button
              onClick={() => setShowRobotMode(!showRobotMode)}
              className={`p-2 rounded-lg transition-colors ${
                showRobotMode ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 ring-1 ring-cyan-400/30' : 'text-gray-400 hover:text-cyan-400 hover:bg-slate-700'
              }`}
              title={showRobotMode ? 'Hide AI Avatar' : 'Show AI Avatar'}
            >
              <Bot className="w-4 h-4" />
            </button>
            
            {/* Voice Profile Indicator */}
            {currentVoiceProfile && (
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <Mic className="w-3 h-3 text-purple-400" />
                <span className="text-xs text-purple-400">
                  {currentVoiceProfile.name}
                </span>
              </div>
            )}
            
            {/* VibeVoice Status Indicator — always visible */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border ${
              vibeVoice.state.vibeVoiceAvailable && vibeVoice.state.connected
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-cyan-500/10 border-cyan-500/20'
            }`} title={vibeVoice.state.vibeVoiceAvailable ? 'VibeVoice AI Active' : 'VibeVoice AI — Enhanced Voice Ready'}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                vibeVoice.state.vibeVoiceAvailable && vibeVoice.state.connected
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-cyan-400'
              }`} />
              <span className={`text-[10px] font-medium ${
                vibeVoice.state.vibeVoiceAvailable ? 'text-emerald-400' : 'text-cyan-400'
              }`}>VibeVoice AI</span>
            </div>

            {/* Voice Phase Indicator */}
            {vibeVoice.state.phase !== 'idle' && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border ${
                vibeVoice.state.phase === 'listening' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                vibeVoice.state.phase === 'processing' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                vibeVoice.state.phase === 'speaking' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' :
                'bg-gray-500/10 border-gray-500/20 text-gray-400'
              }`}>
                {vibeVoice.state.phase === 'listening' && <Mic className="w-3 h-3 animate-pulse" />}
                {vibeVoice.state.phase === 'processing' && <Loader2 className="w-3 h-3 animate-spin" />}
                {vibeVoice.state.phase === 'speaking' && <Volume2 className="w-3 h-3 animate-pulse" />}
                <span className="text-[10px] font-medium capitalize">{vibeVoice.state.phase}</span>
              </div>
            )}

            {/* Voice Settings Button */}
            <button
              onClick={() => setShowVoiceSettings(true)}
              className="p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
              title="Voice Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setAutoSpeak(!autoSpeak)}
              className={`p-2 rounded-lg transition-colors ${
                autoSpeak ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-gray-300 hover:bg-slate-700'
              }`}
              title={autoSpeak ? 'Auto-speak enabled' : 'Auto-speak disabled'}
            >
              {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={clearChat}
              className="p-2 text-gray-400 hover:text-gray-300 hover:bg-slate-700 rounded-lg transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-gray-300 hover:bg-slate-700 rounded-lg transition-colors"
              title={isExpanded ? 'Minimize' : 'Maximize'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Robot Avatar Mode */}
        {showRobotMode && (
          <div className="relative bg-gradient-to-b from-slate-800/80 to-slate-900/80 border-b border-slate-700/50 overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 
                bg-gradient-radial from-cyan-500/10 via-transparent to-transparent rounded-full" />
              {isListening && (
                <div className="absolute inset-0 bg-cyan-500/5 animate-pulse" />
              )}
              {isSpeaking && (
                <div className="absolute inset-0 bg-purple-500/5 animate-pulse" />
              )}
            </div>
            
            {/* Robot Avatar */}
            <div className="relative flex flex-col items-center justify-center py-6">
              <RoboticAvatar
                state={robotState.state}
                isSpeaking={isSpeaking}
                isListening={isListening}
                audioLevel={robotAudioLevel}
                spokenText={lastSpokenText}
                emotionalState={robotState.emotionalState}
                size="large"
                showEffects={true}
                onInteraction={isListening ? stopListening : startListening}
              />
              
              {/* Status indicator - only show when NOT showing robot or when robot is hidden */}
              <div className={`mt-2 text-xs font-medium transition-colors ${
                isListening ? 'text-cyan-400' : 
                isSpeaking ? 'text-purple-400' : 
                isLoading ? 'text-amber-400' :
                'text-gray-500'
              }`}>
                {isListening ? 'Listening...' : 
                 isSpeaking ? '' :  // Hide this - full bar below shows speaking status
                 isLoading ? 'Processing...' :
                 'Tap to speak'}
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-1">
          {messages.map(message => (
            <div key={message.id} className="group">
              {renderMessage(message)}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span className="text-sm text-gray-400">Processing with deep reasoning...</span>
                </div>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && !isLoading && (
            <div className="flex flex-wrap gap-2 mt-4">
              {suggestions.map(suggestion => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                    transition-all hover:scale-105 ${
                      suggestion.priority === 'high' 
                        ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30' 
                        : suggestion.priority === 'medium'
                        ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                        : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700'
                    }`}
                >
                  <ChevronRight className="w-3 h-3" />
                  {suggestion.label}
                </button>
              ))}
            </div>
          )}

          {/* Quick commands for empty state */}
          {messages.length <= 1 && !isLoading && (
            <div className="mt-6">
              <p className="text-sm text-gray-500 mb-3">Try asking:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {QUICK_COMMANDS.slice(0, showAdvancedQuestions ? QUICK_COMMANDS.length : 6).map((cmd, i) => {
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => handleQuickCommand(cmd.text)}
                      className={`flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50
                        hover:bg-slate-700/50 hover:border-slate-600 transition-all group text-left`}
                    >
                      <div className={`p-2 rounded-lg bg-${cmd.color}-500/20`}>
                        <Icon className={`w-4 h-4 text-${cmd.color}-400`} />
                      </div>
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                        {cmd.text}
                      </span>
                    </button>
                  );
                })}
              </div>
              
              {/* Advanced Questions Section */}
              {showAdvancedQuestions && (
                <div className="mt-4">
                  <p className="text-sm text-cyan-400 mb-3 flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    SRE AgenticOps Analysis:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ADVANCED_QUESTIONS.map((question, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickCommand(question)}
                        className="flex items-center gap-2 p-2.5 rounded-lg bg-purple-900/20 border border-purple-500/30
                          hover:bg-purple-900/40 hover:border-purple-500/50 transition-all text-left"
                      >
                        <Zap className="w-3 h-3 text-purple-400 flex-shrink-0" />
                        <span className="text-xs text-purple-200">{question}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Show More/Less Button */}
              <button
                onClick={() => setShowAdvancedQuestions(!showAdvancedQuestions)}
                className="mt-4 w-full py-2 text-sm text-cyan-400 hover:text-cyan-300 
                  flex items-center justify-center gap-2 transition-colors"
              >
                {showAdvancedQuestions ? (
                  <>Show Less</>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    Show More SRE AgenticOps Analysis
                  </>
                )}
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Voice Indicator */}
        {isListening && (
          <div className="px-5 py-3 border-t border-slate-700/50 bg-slate-800/50">
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-1 h-8">
                {waveformData.map((height, i) => (
                  <div
                    key={i}
                    className="w-1 bg-gradient-to-t from-cyan-500 to-blue-400 rounded-full transition-all duration-75"
                    style={{ height: `${height * 100}%` }}
                  />
                ))}
              </div>
              <span className="text-sm text-cyan-400">Listening...</span>
            </div>
          </div>
        )}

        {/* Speaking Indicator with Enhanced Voice Info */}
        {isSpeaking && (
          <div className="px-5 py-3 border-t border-slate-700/50 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Animated Waveform */}
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div 
                      key={i}
                      className="w-1 bg-purple-400 rounded-full animate-pulse"
                      style={{ 
                        height: `${8 + Math.random() * 12}px`,
                        animationDelay: `${i * 0.1}s`
                      }}
                    />
                  ))}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-purple-300 font-medium">Nova is speaking</span>
                  {currentVoiceProfile && (
                    <span className="text-xs text-gray-500">
                      {currentVoiceProfile.name} • {currentVoiceProfile.accent} accent
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Quick Voice Rating */}
                <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
                  <span>Rate:</span>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => handleVoiceRating(star)}
                      className={`text-sm transition-colors hover:scale-110 ${
                        star <= voiceRating ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={stopSpeaking}
                  className="px-3 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Square className="w-3 h-3" /> Stop
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTION_CHIPS.slice(0, 4).map((chip, i) => (
              <button
                key={i}
                onClick={() => handleQuickCommand(chip)}
                className="px-3 py-1 text-xs bg-slate-700/50 text-gray-400 hover:text-gray-300 
                  hover:bg-slate-700 rounded-full transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-2">
            {/* Mic button */}
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isLoading}
              className={`flex-shrink-0 p-3 rounded-xl transition-all ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-slate-700 text-gray-400 hover:text-cyan-400 hover:bg-slate-600'
              } disabled:opacity-50`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Text input */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your SRE operations..."
                disabled={isListening || isLoading}
                rows={1}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl
                  text-sm text-white placeholder-gray-500 resize-none
                  focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20
                  disabled:opacity-50 transition-all"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>

            {/* Send button */}
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isLoading || isListening}
              className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600
                text-white hover:from-cyan-400 hover:to-blue-500 
                disabled:opacity-50 disabled:cursor-not-allowed transition-all
                shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {/* Footer info */}
          <p className="mt-3 text-center text-xs text-gray-600">
            Powered by Cisco CIRCUIT AI • Your conversations are secure
          </p>
        </div>
      </div>

      {/* Voice Settings Panel */}
      <VoiceSettingsPanel
        isOpen={showVoiceSettings}
        onClose={() => setShowVoiceSettings(false)}
        voiceService={voiceService}
        onProfileChange={handleVoiceProfileChange}
      />

      {/* VibeVoice Voice Selector Overlay */}
      {showVoiceSettings && vibeVoice.voices.length > 0 && (
        <div className="absolute bottom-20 right-4 z-50 bg-slate-800/95 backdrop-blur-sm rounded-xl border border-slate-600/50 p-3 shadow-xl w-64">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">VibeVoice AI Voices</h4>
            <div className={`w-2 h-2 rounded-full ${
              vibeVoice.state.vibeVoiceAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'
            }`} />
          </div>
          {!vibeVoice.state.vibeVoiceAvailable && (
            <p className="text-[10px] text-gray-500 mb-2">Browser voice engine active</p>
          )}
          <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin">{vibeVoice.voices.map((v) => (
              <button
                key={v.id}
                onClick={() => vibeVoice.setVoice(v.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors text-xs ${
                  vibeVoice.state.currentVoice === v.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-gray-300 hover:bg-slate-700/50'
                }`}
              >
                <span className="text-[10px] text-gray-500 uppercase w-5">{v.language}</span>
                <span className="flex-1">{v.label.replace(/_/g, ' ')}</span>
                <span className="text-[10px] text-gray-500">{v.gender === 'male' ? 'M' : v.gender === 'female' ? 'F' : ''}</span>
                {vibeVoice.state.currentVoice === v.id && <Check className="w-3 h-3 text-cyan-400" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatGPTStyleChatbot;
