/**
 * Enhanced Voice Assistant Component v3.0
 * 
 * Enterprise-grade voice AI interface with advanced capabilities:
 * - Multi-language support with real-time switching
 * - Audio quality indicators and noise reduction feedback
 * - Conversation history with context awareness
 * - Interactive data discussion with follow-up suggestions
 * - C-level executive summaries with audience selection
 * - Visual feedback and waveform visualization
 * 
 * @component EnhancedVoiceAssistant
 * @version 3.0.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  MessageSquare,
  Globe,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Brain,
  Target,
  Users,
  Shield,
  ChevronRight,
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Settings,
  History,
  Zap,
  BarChart2,
  Radio,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Languages,
  Clock,
  Star,
  Award,
  Info,
} from 'lucide-react';

// Utility function for conditional class names
const cn = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// ==========================================
// TYPE DEFINITIONS
// ==========================================

interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
}

interface AudioQualityMetrics {
  signalToNoiseRatio: number;
  backgroundNoiseLevel: 'low' | 'medium' | 'high' | 'very-high';
  speechClarity: number;
  confidence: number;
  recommendedAction?: 'proceed' | 'retry' | 'move-to-quiet-area';
}

interface ConversationMessage {
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
}

interface FollowUpQuestion {
  questionId: string;
  question: string;
  category: string;
  priority: number;
}

interface QualityMetrics {
  accuracy: number;
  responseTime: number;
  confidenceScore: number;
  qualityGrade: string;
}

interface EnhancedExecutiveSummary {
  headline: string;
  keyInsights: string[];
  executiveNarrative: string;
  audienceSpecificSummary: Record<string, string>;
  actionableInsights: Array<{
    priority: string;
    insight: string;
    recommendedAction: string;
  }>;
  riskAssessment: {
    level: string;
    score: number;
    trend: string;
  };
  metrics: Array<{
    label: string;
    value: string;
    status: string;
    change?: string;
  }>;
}

interface VoiceAIResponse {
  success: boolean;
  transcript: string;
  nlpAnalysis: {
    intent: string;
    confidence: number;
    entities: Array<{
      type: string;
      value: string;
    }>;
    sentiment: string;
    keywords: string[];
  };
  response: {
    text: string;
    ssml?: string;
    visualContent?: any;
    actions?: Array<{
      label: string;
      action: string;
      priority: string;
    }>;
    followUp?: string;
  };
  enhancedExecutiveSummary?: EnhancedExecutiveSummary;
  qualityMetrics: QualityMetrics;
  followUpQuestions?: FollowUpQuestion[];
  conversationContext?: {
    conversationId: string;
    totalInteractions: number;
    followUpSuggestions: string[];
  };
}

interface EnhancedVoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (view: string) => void;
  className?: string;
}

// ==========================================
// CONSTANTS
// ==========================================

const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en-US', name: 'English (US)', nativeName: 'English' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English' },
  { code: 'es-ES', name: 'Spanish (Spain)', nativeName: 'Espanol' },
  { code: 'es-MX', name: 'Spanish (Mexico)', nativeName: 'Espanol (Mexico)' },
  { code: 'fr-FR', name: 'French (France)', nativeName: 'Francais' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Portugues' },
  { code: 'it-IT', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية' },
  { code: 'ru-RU', name: 'Russian', nativeName: 'Русский' },
  { code: 'nl-NL', name: 'Dutch', nativeName: 'Nederlands' },
];

const AUDIENCE_OPTIONS = [
  { value: 'general', label: 'General', icon: Users },
  { value: 'ceo', label: 'CEO', icon: Award },
  { value: 'cto', label: 'CTO', icon: Brain },
  { value: 'ciso', label: 'CISO', icon: Shield },
  { value: 'operations', label: 'Operations', icon: Activity },
  { value: 'technical', label: 'Technical', icon: Zap },
];

const SUMMARY_DEPTH_OPTIONS = [
  { value: 'brief', label: 'Brief', description: '2-3 sentences' },
  { value: 'standard', label: 'Standard', description: 'Key points' },
  { value: 'detailed', label: 'Detailed', description: 'Full analysis' },
  { value: 'comprehensive', label: 'Comprehensive', description: 'Complete report' },
];

const QUICK_COMMANDS = [
  { command: "Executive Summary", icon: Star, color: 'purple', intent: 'EXECUTIVE_SUMMARY' },
  { command: "Show me the trends", icon: TrendingUp, color: 'cyan', intent: 'TREND_ANALYSIS' },
  { command: "What are the anomalies", icon: AlertTriangle, color: 'amber', intent: 'ANOMALY_DETECTION' },
  { command: "System health status", icon: Activity, color: 'emerald', intent: 'SYSTEM_STATUS' },
  { command: "Show metrics overview", icon: BarChart2, color: 'blue', intent: 'METRICS_OVERVIEW' },
  { command: "Top customer insights", icon: Users, color: 'pink', intent: 'CUSTOMER_INSIGHTS' },
  { command: "What should I prioritize", icon: Target, color: 'orange', intent: 'PRIORITIZATION' },
  { command: "Risk Assessment", icon: Shield, color: 'red', intent: 'RISK_ASSESSMENT' },
];

// "Try asking:" contextual suggestions for SRE AgenticOps
const TRY_ASKING_SUGGESTIONS = [
  { 
    category: 'Executive', 
    icon: Award,
    color: 'purple',
    suggestions: [
      "Generate C-level executive summary",
      "What's our enterprise risk score?",
    ]
  },
  { 
    category: 'Security', 
    icon: Shield,
    color: 'red',
    suggestions: [
      "What are today's critical vulnerabilities?",
      "Analyze our security posture",
    ]
  },
  { 
    category: 'Dashboard', 
    icon: BarChart2,
    color: 'cyan',
    suggestions: [
      "Show me the dashboard summary",
      "Compare to last month",
    ]
  },
  { 
    category: 'Customers', 
    icon: Users,
    color: 'pink',
    suggestions: [
      "Which customers have the highest risk?",
      "Show customer risk breakdown",
    ]
  },
  { 
    category: 'Predictive', 
    icon: TrendingUp,
    color: 'emerald',
    suggestions: [
      "Predict next month's vulnerabilities",
      "Show 30-day forecast",
    ]
  },
  { 
    category: 'Advanced', 
    icon: Brain,
    color: 'amber',
    suggestions: [
      "Run predictive analysis for next 90 days",
      "Detect anomalies in recent data",
    ]
  },
];

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

const getQualityGradeColor = (grade: string): string => {
  const gradeColors: Record<string, string> = {
    'A+': 'text-emerald-500',
    'A': 'text-green-500',
    'B+': 'text-lime-500',
    'B': 'text-yellow-500',
    'C+': 'text-orange-500',
    'C': 'text-amber-600',
    'needs-improvement': 'text-red-500',
  };
  return gradeColors[grade] || 'text-gray-500';
};

const getNoiseIcon = (level: string) => {
  const icons: Record<string, React.ReactNode> = {
    'low': <SignalHigh className="h-4 w-4 text-emerald-500" />,
    'medium': <SignalMedium className="h-4 w-4 text-yellow-500" />,
    'high': <SignalLow className="h-4 w-4 text-orange-500" />,
    'very-high': <Signal className="h-4 w-4 text-red-500" />,
  };
  return icons[level] || icons['medium'];
};

const getRiskLevelColor = (level: string): string => {
  const colors: Record<string, string> = {
    'critical': 'bg-red-500',
    'high': 'bg-orange-500',
    'medium': 'bg-yellow-500',
    'low': 'bg-green-500',
  };
  return colors[level] || colors['medium'];
};

// ==========================================
// MAIN COMPONENT
// ==========================================

const EnhancedVoiceAssistant: React.FC<EnhancedVoiceAssistantProps> = ({
  isOpen,
  onClose,
  onNavigate,
  className,
}) => {
  // State
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'responding' | 'result'>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState<VoiceAIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiceOutput, setVoiceOutput] = useState(true);
  const [audioQuality, setAudioQuality] = useState<AudioQualityMetrics | null>(null);
  
  // Enhanced State
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-US');
  const [targetAudience, setTargetAudience] = useState<string>('general');
  const [summaryDepth, setSummaryDepth] = useState<string>('standard');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedSummary, setExpandedSummary] = useState(false);

  // Refs
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = selectedLanguage;

        recognitionRef.current.onresult = (event: any) => {
          const currentTranscript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');
          setTranscript(currentTranscript);
        };

        recognitionRef.current.onend = () => {
          if (status === 'listening' && transcript) {
            processVoiceCommand(transcript);
          } else if (status === 'listening') {
            setStatus('idle');
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setError(`Speech recognition error: ${event.error}`);
          setStatus('idle');
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedLanguage]);

  // Update recognition language when changed
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = selectedLanguage;
    }
  }, [selectedLanguage]);

  // Waveform visualization
  const startWaveformAnimation = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      const drawWaveform = () => {
        if (!analyserRef.current || !waveformCanvasRef.current) return;
        
        const canvas = waveformCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        // Calculate average for SNR estimation
        const avgAmplitude = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
        const maxAmplitude = Math.max(...dataArray);
        const estimatedSNR = maxAmplitude > 0 ? 20 * Math.log10(maxAmplitude / Math.max(avgAmplitude, 1)) : 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
          
          const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
          gradient.addColorStop(0, '#06b6d4');
          gradient.addColorStop(0.5, '#3b82f6');
          gradient.addColorStop(1, '#8b5cf6');
          
          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
          x += barWidth;
        }

        // Update audio quality estimate
        const snrValue = Math.max(10, Math.min(35, 15 + estimatedSNR * 0.5));
        const clarity = Math.min(0.99, 0.7 + (avgAmplitude / 255) * 0.3);
        
        setAudioQuality({
          signalToNoiseRatio: Math.round(snrValue * 10) / 10,
          backgroundNoiseLevel: snrValue >= 25 ? 'low' : snrValue >= 15 ? 'medium' : snrValue >= 10 ? 'high' : 'very-high',
          speechClarity: Math.round(clarity * 100) / 100,
          confidence: clarity,
          recommendedAction: snrValue >= 15 ? 'proceed' : snrValue >= 10 ? 'retry' : 'move-to-quiet-area',
        });

        animationFrameRef.current = requestAnimationFrame(drawWaveform);
      };

      drawWaveform();
    } catch (error) {
      console.error('Error starting waveform:', error);
    }
  }, []);

  const stopWaveformAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  }, []);

  // Start listening
  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      setStatus('listening');
      setTranscript('');
      setError(null);
      setResponse(null);
      recognitionRef.current.start();
      startWaveformAnimation();
    } else {
      setError('Speech recognition not supported in this browser');
    }
  }, [startWaveformAnimation]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    stopWaveformAnimation();
    if (transcript) {
      setStatus('processing');
    } else {
      setStatus('idle');
    }
  }, [transcript, stopWaveformAnimation]);

  // Retry state for exponential backoff
  const [retryCount, setRetryCount] = useState(0);
  const [processingStage, setProcessingStage] = useState<'nlp' | 'intent' | 'reasoning' | 'response'>('nlp');
  const maxRetries = 3;

  // Process voice command with retry logic and exponential backoff
  const processVoiceCommand = async (text: string, attempt = 0): Promise<void> => {
    const startTime = performance.now();
    setStatus('processing');
    setProcessingStage('nlp');
    stopWaveformAnimation();
    setError(null);

    // AbortController for request cancellation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout per attempt for complex queries

    try {
      console.log(`[SRE-AGENTICOPS] Processing attempt ${attempt + 1}/${maxRetries + 1}: "${text.substring(0, 50)}..."`);
      
      // Stage progression simulation for UX
      const stageInterval = setInterval(() => {
        setProcessingStage(prev => {
          if (prev === 'nlp') return 'intent';
          if (prev === 'intent') return 'reasoning';
          if (prev === 'reasoning') return 'response';
          return 'response';
        });
      }, 300);

      const response = await fetch('/api/voice-ai/v3/process', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Request-ID': `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
        body: JSON.stringify({
          transcript: text,
          language: selectedLanguage,
          audioQuality,
          conversationId,
          executiveSummaryDepth: summaryDepth,
          targetAudience,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      clearInterval(stageInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data: VoiceAIResponse = await response.json();
      const processingTime = performance.now() - startTime;
      
      console.log(`[VOICE-AI] Success in ${processingTime.toFixed(0)}ms - Intent: ${data.nlpAnalysis?.intent}`);
      
      setResponse(data);
      setStatus('result');
      setRetryCount(0);

      // Update conversation context
      if (data.conversationContext?.conversationId) {
        setConversationId(data.conversationContext.conversationId);
      }

      // Add to conversation history
      setConversationHistory(prev => [
        ...prev,
        {
          messageId: `user_${Date.now()}`,
          role: 'user',
          content: text,
          timestamp: new Date(),
        },
        {
          messageId: `assistant_${Date.now()}`,
          role: 'assistant',
          content: data.response.text,
          timestamp: new Date(),
          intent: data.nlpAnalysis.intent,
        },
      ]);

      // Speak response
      if (voiceOutput && data.response.text) {
        speakResponse(data.response.text);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      const isAborted = error instanceof Error && error.name === 'AbortError';
      const isNetworkError = error instanceof TypeError && error.message.includes('fetch');
      
      console.error(`[VOICE-AI] Error on attempt ${attempt + 1}:`, error);

      // Retry with exponential backoff if retries remaining
      if (attempt < maxRetries && (isAborted || isNetworkError || (error instanceof Error && error.message.includes('Server error')))) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 8000); // Max 8 seconds
        console.log(`[VOICE-AI] Retrying in ${backoffDelay}ms...`);
        setRetryCount(attempt + 1);
        setError(`Request failed. Retrying... (${attempt + 1}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return processVoiceCommand(text, attempt + 1);
      }

      // All retries exhausted or non-retryable error
      const errorMessage = isAborted 
        ? 'Request timed out. Please try again with a simpler query.'
        : isNetworkError 
        ? 'Network error. Please check your connection.'
        : error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred.';
      
      setError(errorMessage);
      setStatus('idle');
      setRetryCount(0);
    }
  };

  // Extended timeout with better UX - 45s max for complex queries
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (status === 'processing') {
      timeoutId = setTimeout(() => {
        console.warn('[SRE-AGENTICOPS] Global timeout - resetting to idle');
        setStatus('idle');
        setError('Request timed out. The AI engine may be processing a complex query. Please try again or simplify your request.');
        setRetryCount(0);
      }, 45000); // Increased to 45 seconds for complex queries
    }
    return () => clearTimeout(timeoutId);
  }, [status]);


  // Speak response - doesn't change main status, uses separate isSpeaking state
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window && text) {
      try {
        setIsSpeaking(true);
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = selectedLanguage;
        utterance.rate = 0.95;
        utterance.pitch = 1;
        
        // Select appropriate voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => 
          v.lang.startsWith(selectedLanguage.split('-')[0]) && 
          v.name.toLowerCase().includes('neural')
        ) || voices.find(v => v.lang.startsWith(selectedLanguage.split('-')[0]));
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        
        synthRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        
        // Safety timeout - stop after 30 seconds max
        setTimeout(() => {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
          }
        }, 30000);
      } catch (err) {
        console.warn('[VOICE] Speech synthesis error:', err);
        setIsSpeaking(false);
      }
    }
  };

  // Handle quick command
  const handleQuickCommand = (command: string) => {
    setTranscript(command);
    processVoiceCommand(command);
  };

  // Handle follow-up question
  const handleFollowUp = (question: string) => {
    setTranscript(question);
    processVoiceCommand(question);
  };

  // Submit feedback
  const submitFeedback = async (feedback: 'positive' | 'negative') => {
    try {
      await fetch('/api/voice-ai/v3/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          feedback,
          feedbackType: feedback,
          rating: feedback === 'positive' ? 5 : 2,
        }),
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  // Reset conversation
  const resetConversation = () => {
    setConversationId(null);
    setConversationHistory([]);
    setResponse(null);
    setTranscript('');
    setStatus('idle');
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-end justify-center pb-4 bg-black/50 backdrop-blur-sm overflow-y-auto",
      className
    )} style={{ paddingTop: '70vh' }}>
      <div className="relative w-full max-w-4xl max-h-[60vh] overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700/50 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Brain className="h-6 w-6 text-cyan-400" />
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">SRE AgenticOps Voice AI</h2>
              <p className="text-xs text-cyan-400/80">Powered by Cisco CIRCUIT AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="relative">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="appearance-none bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName}
                  </option>
                ))}
              </select>
              <Languages className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            
            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                showSettings ? "bg-cyan-500/20 text-cyan-400" : "hover:bg-gray-700 text-gray-400"
              )}
            >
              <Settings className="h-5 w-5" />
            </button>
            
            {/* History Button */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                showHistory ? "bg-purple-500/20 text-purple-400" : "hover:bg-gray-700 text-gray-400"
              )}
            >
              <History className="h-5 w-5" />
            </button>
            
            {/* Voice Output Toggle */}
            <button
              onClick={() => setVoiceOutput(!voiceOutput)}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              {voiceOutput ? (
                <Volume2 className="h-5 w-5 text-cyan-400" />
              ) : (
                <VolumeX className="h-5 w-5 text-gray-400" />
              )}
            </button>
            
            {/* Close Button - Prominent with hover effects */}
            <button
              onClick={onClose}
              className="p-2.5 rounded-lg bg-gray-800 hover:bg-red-500/20 border border-gray-700 hover:border-red-500/50 transition-all duration-200 group"
              aria-label="Close SRE AgenticOps"
              title="Close (Esc)"
            >
              <X className="h-5 w-5 text-gray-400 group-hover:text-red-400 transition-colors" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 border-b border-gray-700/50 bg-gray-800/50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Target Audience</label>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCE_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setTargetAudience(option.value)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors",
                        targetAudience === option.value
                          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                          : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                      )}
                    >
                      <option.icon className="h-3 w-3" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Summary Depth</label>
                <div className="flex flex-wrap gap-2">
                  {SUMMARY_DEPTH_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setSummaryDepth(option.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs transition-colors",
                        summaryDepth === option.value
                          ? "bg-purple-500/20 text-purple-400 border border-purple-500/50"
                          : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                      )}
                      title={option.description}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Panel */}
        {showHistory && conversationHistory.length > 0 && (
          <div className="p-4 border-b border-gray-700/50 bg-gray-800/50 max-h-40 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-300">Conversation History</h3>
              <button
                onClick={resetConversation}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Reset
              </button>
            </div>
            <div className="space-y-2">
              {conversationHistory.slice(-6).map((msg, idx) => (
                <div
                  key={msg.messageId}
                  className={cn(
                    "text-xs p-2 rounded",
                    msg.role === 'user' ? "bg-cyan-500/10 text-cyan-300" : "bg-gray-700/50 text-gray-300"
                  )}
                >
                  <span className="text-gray-500 text-xs">
                    {msg.role === 'user' ? 'You' : 'AI'} •{' '}
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                  <p className="mt-0.5 line-clamp-2">{msg.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Audio Quality Indicator */}
          {status === 'listening' && audioQuality && (
            <div className="mb-4 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getNoiseIcon(audioQuality.backgroundNoiseLevel)}
                  <div>
                    <p className="text-xs text-gray-400">Audio Quality</p>
                    <p className="text-sm text-white">
                      SNR: {audioQuality.signalToNoiseRatio}dB • Clarity: {Math.round(audioQuality.speechClarity * 100)}%
                    </p>
                  </div>
                </div>
                {audioQuality.recommendedAction !== 'proceed' && (
                  <span className={cn(
                    "text-xs px-2 py-1 rounded",
                    audioQuality.recommendedAction === 'retry' ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"
                  )}>
                    {audioQuality.recommendedAction === 'retry' ? 'Consider retrying' : 'Move to quieter area'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Waveform Canvas */}
          {status === 'listening' && (
            <div className="mb-4">
              <canvas
                ref={waveformCanvasRef}
                width={800}
                height={100}
                className="w-full h-24 rounded-lg bg-gray-800/50"
              />
            </div>
          )}

          {/* Status Display */}
          <div className="text-center mb-6">
            {status === 'idle' && (
              <div className="space-y-4">
                {/* "Try asking:" section */}
                <div className="text-left">
                  <p className="text-cyan-400 font-medium mb-3 flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Try asking:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {TRY_ASKING_SUGGESTIONS.slice(0, 3).map((category, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className={cn(
                          "flex items-center gap-1.5 text-xs font-medium",
                          category.color === 'purple' ? 'text-purple-400' :
                          category.color === 'red' ? 'text-red-400' :
                          category.color === 'cyan' ? 'text-cyan-400' :
                          category.color === 'pink' ? 'text-pink-400' :
                          category.color === 'emerald' ? 'text-emerald-400' : 'text-amber-400'
                        )}>
                          <category.icon className="h-3 w-3" />
                          {category.category}
                        </div>
                        {category.suggestions.slice(0, 1).map((suggestion, sIdx) => (
                          <button
                            key={sIdx}
                            onClick={() => handleQuickCommand(suggestion)}
                            className="w-full text-left text-xs text-gray-400 hover:text-white hover:bg-gray-800/50 p-2 rounded-lg transition-colors border border-transparent hover:border-gray-700/50"
                          >
                            "{suggestion}"
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Language indicator */}
                <p className="text-xs text-gray-500">
                  Or tap the microphone to speak • Language: {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}
                </p>
              </div>
            )}
            {status === 'listening' && (
              <div className="flex flex-col items-center">
                <Radio className="h-8 w-8 text-cyan-400 animate-pulse mb-2" />
                <p className="text-cyan-400">Listening...</p>
                {transcript && (
                  <p className="mt-2 text-white bg-gray-800 rounded-lg px-4 py-2 max-w-md">
                    "{transcript}"
                  </p>
                )}
              </div>
            )}
            {status === 'processing' && (
              <div className="flex flex-col items-center py-8">
                <Brain className="h-12 w-12 text-cyan-400 animate-pulse mb-4" />
                <p className="text-lg text-cyan-400 font-medium">SRE AgenticOps Processing...</p>
                {retryCount > 0 && (
                  <p className="text-xs text-amber-400 mt-1">Retry attempt {retryCount}/{maxRetries}</p>
                )}
                {/* Enhanced Progress Indicator with Stage Tracking */}
                <div className="mt-6 w-full max-w-md px-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span>AI/ML Deep Analysis Pipeline</span>
                    <span className="text-purple-400 font-mono">~1-2s</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-4">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 via-purple-500 to-amber-500 rounded-full transition-all duration-300"
                      style={{ 
                        width: processingStage === 'nlp' ? '25%' : 
                               processingStage === 'intent' ? '50%' : 
                               processingStage === 'reasoning' ? '75%' : '100%'
                      }} 
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className={cn(
                      "text-center p-2 rounded-lg transition-all duration-300",
                      processingStage === 'nlp' ? "bg-emerald-500/20 ring-1 ring-emerald-500/50" : "bg-gray-800/50"
                    )}>
                      <div className={cn(
                        "w-3 h-3 rounded-full mx-auto mb-1",
                        processingStage === 'nlp' ? "bg-emerald-500 animate-pulse" : 
                        ['intent', 'reasoning', 'response'].includes(processingStage) ? "bg-emerald-500" : "bg-gray-600"
                      )} />
                      <span className={processingStage === 'nlp' ? "text-emerald-400 font-medium" : "text-gray-500"}>NLP</span>
                    </div>
                    <div className={cn(
                      "text-center p-2 rounded-lg transition-all duration-300",
                      processingStage === 'intent' ? "bg-cyan-500/20 ring-1 ring-cyan-500/50" : "bg-gray-800/50"
                    )}>
                      <div className={cn(
                        "w-3 h-3 rounded-full mx-auto mb-1",
                        processingStage === 'intent' ? "bg-cyan-500 animate-pulse" : 
                        ['reasoning', 'response'].includes(processingStage) ? "bg-cyan-500" : "bg-gray-600"
                      )} />
                      <span className={processingStage === 'intent' ? "text-cyan-400 font-medium" : "text-gray-500"}>Intent</span>
                    </div>
                    <div className={cn(
                      "text-center p-2 rounded-lg transition-all duration-300",
                      processingStage === 'reasoning' ? "bg-purple-500/20 ring-1 ring-purple-500/50" : "bg-gray-800/50"
                    )}>
                      <div className={cn(
                        "w-3 h-3 rounded-full mx-auto mb-1",
                        processingStage === 'reasoning' ? "bg-purple-500 animate-pulse" : 
                        processingStage === 'response' ? "bg-purple-500" : "bg-gray-600"
                      )} />
                      <span className={processingStage === 'reasoning' ? "text-purple-400 font-medium" : "text-gray-500"}>Reasoning</span>
                    </div>
                    <div className={cn(
                      "text-center p-2 rounded-lg transition-all duration-300",
                      processingStage === 'response' ? "bg-amber-500/20 ring-1 ring-amber-500/50" : "bg-gray-800/50"
                    )}>
                      <div className={cn(
                        "w-3 h-3 rounded-full mx-auto mb-1",
                        processingStage === 'response' ? "bg-amber-500 animate-pulse" : "bg-gray-600"
                      )} />
                      <span className={processingStage === 'response' ? "text-amber-400 font-medium" : "text-gray-500"}>Response</span>
                    </div>
                  </div>
                </div>
                {/* Cancel Button */}
                <button
                  onClick={() => {
                    setStatus('idle');
                    setError(null);
                    setRetryCount(0);
                  }}
                  className="mt-6 px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
            {isSpeaking && status === 'result' && (
              <div className="flex items-center justify-center gap-2 py-2 px-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                <Volume2 className="h-5 w-5 text-emerald-400 animate-pulse" />
                <p className="text-sm text-emerald-400">Speaking response...</p>
              </div>
            )}
          </div>

          {/* Results Section */}
          {status === 'result' && response && (
            <div className="space-y-4">
              {/* Intelligent Alert Banner - Priority-based notification */}
              {response.enhancedExecutiveSummary?.riskAssessment && (
                <div className={cn(
                  "rounded-lg p-3 border flex items-center gap-3",
                  response.enhancedExecutiveSummary.riskAssessment.level === 'critical' 
                    ? "bg-red-500/10 border-red-500/30" :
                  response.enhancedExecutiveSummary.riskAssessment.level === 'high'
                    ? "bg-orange-500/10 border-orange-500/30" :
                  response.enhancedExecutiveSummary.riskAssessment.level === 'medium'
                    ? "bg-yellow-500/10 border-yellow-500/30" :
                    "bg-emerald-500/10 border-emerald-500/30"
                )}>
                  <div className={cn(
                    "p-2 rounded-lg",
                    response.enhancedExecutiveSummary.riskAssessment.level === 'critical' 
                      ? "bg-red-500/20" :
                    response.enhancedExecutiveSummary.riskAssessment.level === 'high'
                      ? "bg-orange-500/20" :
                    response.enhancedExecutiveSummary.riskAssessment.level === 'medium'
                      ? "bg-yellow-500/20" : "bg-emerald-500/20"
                  )}>
                    <AlertTriangle className={cn(
                      "h-5 w-5",
                      response.enhancedExecutiveSummary.riskAssessment.level === 'critical' 
                        ? "text-red-400" :
                      response.enhancedExecutiveSummary.riskAssessment.level === 'high'
                        ? "text-orange-400" :
                      response.enhancedExecutiveSummary.riskAssessment.level === 'medium'
                        ? "text-yellow-400" : "text-emerald-400"
                    )} />
                  </div>
                  <div className="flex-1">
                    <p className={cn(
                      "text-sm font-medium",
                      response.enhancedExecutiveSummary.riskAssessment.level === 'critical' 
                        ? "text-red-400" :
                      response.enhancedExecutiveSummary.riskAssessment.level === 'high'
                        ? "text-orange-400" :
                      response.enhancedExecutiveSummary.riskAssessment.level === 'medium'
                        ? "text-yellow-400" : "text-emerald-400"
                    )}>
                      {response.enhancedExecutiveSummary.riskAssessment.level.toUpperCase()} Priority Alert
                    </p>
                    <p className="text-xs text-gray-400">
                      Risk Score: {response.enhancedExecutiveSummary.riskAssessment.score}/100 • Trend: {response.enhancedExecutiveSummary.riskAssessment.trend}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-full font-medium",
                      response.enhancedExecutiveSummary.riskAssessment.level === 'critical' 
                        ? "bg-red-500/20 text-red-300" :
                      response.enhancedExecutiveSummary.riskAssessment.level === 'high'
                        ? "bg-orange-500/20 text-orange-300" :
                      response.enhancedExecutiveSummary.riskAssessment.level === 'medium'
                        ? "bg-yellow-500/20 text-yellow-300" : "bg-emerald-500/20 text-emerald-300"
                    )}>
                      {response.enhancedExecutiveSummary.riskAssessment.level === 'critical' ? 'Immediate Action' :
                       response.enhancedExecutiveSummary.riskAssessment.level === 'high' ? 'Action Required' :
                       response.enhancedExecutiveSummary.riskAssessment.level === 'medium' ? 'Monitor Closely' : 'On Track'}
                    </span>
                  </div>
                </div>
              )}

              {/* Response Text - MOVED TO TOP for better UX */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-medium text-white">Response</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {response.response.text}
                </p>
              </div>

              {/* Enhanced Executive Summary - SECOND for visibility */}
              {response.enhancedExecutiveSummary && (
                <div className="bg-gradient-to-br from-purple-900/30 to-cyan-900/30 rounded-lg p-4 border border-purple-500/20">
                  <button
                    onClick={() => setExpandedSummary(!expandedSummary)}
                    className="w-full flex items-center justify-between mb-3"
                  >
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-purple-400" />
                      <span className="font-medium text-white">Executive Summary</span>
                      <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                        {targetAudience.toUpperCase()}
                      </span>
                    </div>
                    {expandedSummary ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </button>

                  {/* Headline */}
                  <h3 className="text-lg font-semibold text-cyan-300 mb-3">
                    {response.enhancedExecutiveSummary.headline}
                  </h3>

                  {/* Risk Assessment Badge */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium text-white flex items-center gap-2",
                      getRiskLevelColor(response.enhancedExecutiveSummary.riskAssessment.level)
                    )}>
                      <Shield className="h-3 w-3" />
                      Risk: {response.enhancedExecutiveSummary.riskAssessment.level.toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-400">
                      Score: {response.enhancedExecutiveSummary.riskAssessment.score}/100 •
                      Trend: {response.enhancedExecutiveSummary.riskAssessment.trend}
                    </span>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {response.enhancedExecutiveSummary.metrics.map((metric, idx) => (
                      <div key={idx} className="bg-gray-800/50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-400">{metric.label}</p>
                        <p className={cn(
                          "text-lg font-bold",
                          metric.status === 'good' ? "text-emerald-400" :
                          metric.status === 'warning' ? "text-yellow-400" : "text-red-400"
                        )}>
                          {metric.value}
                        </p>
                        {metric.change && (
                          <p className={cn(
                            "text-xs",
                            metric.change.startsWith('+') ? "text-emerald-400" : "text-red-400"
                          )}>
                            {metric.change}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {expandedSummary && (
                    <>
                      {/* Key Insights */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Key Insights</h4>
                        <ul className="space-y-1">
                          {response.enhancedExecutiveSummary.keyInsights.map((insight, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-400">
                              <Zap className="h-3 w-3 text-cyan-400 mt-1 flex-shrink-0" />
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Audience-Specific Summary */}
                      {response.enhancedExecutiveSummary.audienceSpecificSummary[targetAudience] && (
                        <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Info className="h-4 w-4 text-cyan-400" />
                            <span className="text-sm font-medium text-white">
                              Tailored for {targetAudience.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300">
                            {response.enhancedExecutiveSummary.audienceSpecificSummary[targetAudience]}
                          </p>
                        </div>
                      )}

                      {/* Actionable Insights */}
                      {response.enhancedExecutiveSummary.actionableInsights?.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-300 mb-2">Action Items</h4>
                          <div className="space-y-2">
                            {response.enhancedExecutiveSummary.actionableInsights.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="flex items-start gap-2 p-2 bg-gray-800/50 rounded-lg">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-xs font-medium",
                                  item.priority === 'critical' ? "bg-red-500/20 text-red-400" :
                                  item.priority === 'high' ? "bg-orange-500/20 text-orange-400" :
                                  item.priority === 'medium' ? "bg-yellow-500/20 text-yellow-400" :
                                  "bg-green-500/20 text-green-400"
                                )}>
                                  {item.priority}
                                </span>
                                <div className="flex-1">
                                  <p className="text-sm text-white">{item.insight}</p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    Action: {item.recommendedAction}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Follow-up Questions */}
              {response.followUpQuestions && response.followUpQuestions.length > 0 && (
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-medium text-white">Suggested Follow-ups</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {response.followUpQuestions.slice(0, 4).map((q) => (
                      <button
                        key={q.questionId}
                        onClick={() => handleFollowUp(q.question)}
                        className="px-3 py-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-sm text-gray-300 hover:text-white transition-colors text-left"
                      >
                        {q.question}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SRE AgenticOps Analysis - ALWAYS EXPANDED for full visibility */}
              <div className="bg-gradient-to-br from-gray-800/50 to-cyan-900/20 rounded-lg border border-cyan-500/30 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-cyan-500/10 border-b border-cyan-500/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/20 rounded-lg">
                      <Brain className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">SRE AgenticOps Analysis</h3>
                      <p className="text-xs text-cyan-400/80">Powered by Cisco CIRCUIT AI</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs px-3 py-1 rounded-full font-medium",
                      response.nlpAnalysis.confidence > 0.85 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                      response.nlpAnalysis.confidence > 0.7 ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                      "bg-red-500/20 text-red-400 border border-red-500/30"
                    )}>
                      {Math.round(response.nlpAnalysis.confidence * 100)}% Confidence
                    </span>
                  </div>
                </div>
                
                {/* Analysis Content - Always Visible */}
                <div className="p-4 space-y-4">
                  {/* Intent & Sentiment Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Detected Intent</p>
                      <p className="text-sm font-medium text-cyan-400">{response.nlpAnalysis.intent}</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Sentiment</p>
                      <p className={cn(
                        "text-sm font-medium",
                        response.nlpAnalysis.sentiment === 'positive' ? "text-emerald-400" :
                        response.nlpAnalysis.sentiment === 'negative' ? "text-red-400" : "text-yellow-400"
                      )}>{response.nlpAnalysis.sentiment}</p>
                    </div>
                  </div>
                  
                  {/* Keywords */}
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Extracted Keywords</p>
                    <div className="flex flex-wrap gap-2">
                      {response.nlpAnalysis.keywords.map((keyword, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-gray-700/50 text-gray-300 rounded-lg text-xs border border-gray-600/30 hover:border-cyan-500/30 transition-colors">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Quality Metrics */}
                  {response.qualityMetrics && (
                    <div className="flex items-center justify-between pt-3 border-t border-gray-700/30">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-400" />
                          <span className="text-xs text-gray-400">Quality Grade:</span>
                          <span className={cn("text-sm font-bold", getQualityGradeColor(response.qualityMetrics.qualityGrade))}>
                            {response.qualityMetrics.qualityGrade}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-xs text-gray-400">Response Time:</span>
                          <span className="text-sm font-medium text-white">{response.qualityMetrics.responseTime}ms</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => submitFeedback('positive')}
                          className="p-2 rounded-lg bg-gray-700/50 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-colors"
                          title="Helpful response"
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => submitFeedback('negative')}
                          className="p-2 rounded-lg bg-gray-700/50 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                          title="Not helpful"
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {response.response.actions && response.response.actions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {response.response.actions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => onNavigate?.(action.action)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                        action.priority === 'high'
                          ? "bg-cyan-500 hover:bg-cyan-600 text-white"
                          : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                      )}
                    >
                      {action.label}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Commands - Show when idle */}
          {status === 'idle' && (
            <div>
              <p className="text-xs text-gray-500 mb-3 text-center">Quick Commands</p>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_COMMANDS.map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickCommand(cmd.command)}
                    className="flex flex-col items-center p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors group"
                  >
                    <cmd.icon className={cn(
                      "h-5 w-5 mb-1.5 transition-colors",
                      `text-${cmd.color}-400 group-hover:text-${cmd.color}-300`
                    )} />
                    <span className="text-xs text-gray-400 group-hover:text-white text-center">
                      {cmd.command}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer with Microphone */}
        <div className="p-4 border-t border-gray-700/50 bg-gray-800/30">
          <div className="flex items-center justify-center">
            <button
              onClick={status === 'listening' ? stopListening : startListening}
              disabled={status === 'processing'}
              className={cn(
                "relative w-16 h-16 rounded-full transition-all duration-300 flex items-center justify-center",
                status === 'listening'
                  ? "bg-red-500 hover:bg-red-600 animate-pulse shadow-lg shadow-red-500/50"
                  : status === 'processing'
                  ? "bg-gray-700 cursor-not-allowed"
                  : "bg-gradient-to-br from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 shadow-lg shadow-cyan-500/30"
              )}
            >
              {status === 'listening' ? (
                <MicOff className="h-7 w-7 text-white" />
              ) : status === 'processing' ? (
                <Brain className="h-7 w-7 text-purple-400 animate-pulse" />
              ) : isSpeaking ? (
                <Volume2 className="h-7 w-7 text-emerald-400 animate-pulse" />
              ) : (
                <Mic className="h-7 w-7 text-white" />
              )}
              
              {/* Ripple Effect */}
              {status === 'listening' && (
                <>
                  <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20" />
                  <span className="absolute inset-0 rounded-full bg-red-400 animate-pulse opacity-10" />
                </>
              )}
            </button>
          </div>
          
          {/* Status Text with Intelligent Suggestions */}
          <div className="text-center mt-2">
            {status === 'idle' && (
              <p className="text-xs text-gray-500">Tap to speak or select a suggestion above</p>
            )}
            {status === 'listening' && (
              <p className="text-xs text-cyan-400 font-medium">Listening... Tap to stop</p>
            )}
            {status === 'processing' && (
              <p className="text-xs text-purple-400 font-medium">Processing your request...</p>
            )}
            {status === 'result' && (
              <div className="space-y-3">
                {/* Try asking suggestions */}
                <div className="text-left bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
                  <p className="text-xs text-cyan-400 font-medium mb-2 flex items-center gap-1.5">
                    <Zap className="h-3 w-3" />
                    Try asking:
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {TRY_ASKING_SUGGESTIONS.slice(0, 2).flatMap(cat => 
                      cat.suggestions.slice(0, 1).map((suggestion, idx) => (
                        <button
                          key={`${cat.category}-${idx}`}
                          onClick={() => handleQuickCommand(suggestion)}
                          className="text-left text-xs text-gray-400 hover:text-white p-2 rounded bg-gray-700/30 hover:bg-gray-700/50 transition-colors truncate"
                        >
                          {suggestion}
                        </button>
                      ))
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500">Or tap the microphone to ask another question</p>
              </div>
            )}
          </div>
          
          {/* Conversation Stats */}
          {conversationHistory.length > 0 && (
            <div className="flex items-center justify-center gap-4 mt-2">
              <span className="text-xs text-gray-500">
                <Clock className="h-3 w-3 inline mr-1" />
                {conversationHistory.length / 2} exchanges
              </span>
              {conversationId && (
                <span className="text-xs text-gray-500">
                  Session active
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedVoiceAssistant;
