/**
 * Advanced Voice Assistant Component
 * Enterprise-grade voice AI with Siri/Alexa-like experience
 * Features: NLP, Deep Learning, Context Awareness, Executive Summaries
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Mic, MicOff, Brain, Sparkles, Activity, Check, ChevronRight, 
  MessageSquare, AlertCircle, Loader2, Volume2, VolumeX, Zap, 
  TrendingUp, Shield, Users, Target, AlertTriangle, BarChart3,
  FileText, Clock, ThumbsUp, ThumbsDown, RefreshCw, Download,
  Lightbulb, Radio
} from 'lucide-react';
import { Metric } from '../types';
import { MOCK_DATA } from '../constants';
import { MetricCard } from './MetricCard';
import { PredictionsCard, AnomaliesCard, RecommendationsCard } from './IntelligenceCards';
import { Card, Badge, ProgressBar } from './ui/Card';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

interface VoiceAIResponse {
  success: boolean;
  transcript: string;
  nlpAnalysis: {
    intent: string;
    confidence: number;
    entities: Array<{ type: string; value: string; confidence: number }>;
    sentiment: 'positive' | 'neutral' | 'negative';
    keywords: string[];
  };
  response: {
    text: string;
    ssml?: string;
    visualContent?: {
      type: string;
      data: any;
      metrics?: string[];
      showPredictions?: boolean;
      showAnomalies?: boolean;
      showRecommendations?: boolean;
    };
    actions?: Array<{ label: string; action: string; priority: string }>;
    followUp?: string;
  };
  executiveSummary?: {
    headline: string;
    keyInsights: string[];
    riskAssessment: { level: string; score: number; trend: string };
    recommendations: { immediate: string[]; shortTerm: string[]; longTerm: string[] };
    metrics: Array<{ label: string; value: string | number; change?: string; status: string }>;
    generatedAt: string;
    confidence: number;
  };
  processingTime: number;
  modelInfo: { nlp: string; reasoning: string; version: string };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onMetricSelect: (metric: Metric) => void;
}

// Quick command configurations
const QUICK_COMMANDS = [
  { 
    command: "Show me the trends", 
    icon: TrendingUp, 
    color: 'cyan',
    description: 'Vulnerability trends & predictions'
  },
  { 
    command: "What are the anomalies", 
    icon: AlertTriangle, 
    color: 'amber',
    description: 'Detected anomalies'
  },
  { 
    command: "System health status", 
    icon: Activity, 
    color: 'emerald',
    description: 'ML pipeline & system status'
  },
  { 
    command: "Show metrics overview", 
    icon: BarChart3, 
    color: 'blue',
    description: 'KPI dashboard'
  },
  { 
    command: "Top customer insights", 
    icon: Users, 
    color: 'purple',
    description: 'Customer risk analysis'
  },
  { 
    command: "What should I prioritize", 
    icon: Target, 
    color: 'rose',
    description: 'AI recommendations'
  },
];

// ==========================================
// MAIN COMPONENT
// ==========================================

export const AdvancedVoiceAssistant: React.FC<Props> = ({ isOpen, onClose, onMetricSelect }) => {
  // State management
  const [state, setState] = useState<'idle' | 'listening' | 'processing' | 'responding' | 'result'>('idle');
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState<VoiceAIResponse | null>(null);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(32).fill(0.1));
  
  // Refs
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const animationRef = useRef<number>();

  // ==========================================
  // EFFECTS
  // ==========================================

  useEffect(() => {
    if (isOpen) {
      resetState();
    } else {
      stopListening();
      stopSpeaking();
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isOpen]);

  // Waveform animation when listening
  useEffect(() => {
    if (isMicActive) {
      const animate = () => {
        setWaveformData(prev => prev.map(() => 0.1 + Math.random() * 0.9));
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      setWaveformData(new Array(32).fill(0.1));
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isMicActive]);

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================

  const resetState = () => {
    setState('idle');
    setTranscript('');
    setAiResponse(null);
    setErrorMsg('');
    setIsMicActive(false);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsMicActive(false);
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  // ==========================================
  // VOICE RECOGNITION
  // ==========================================

  const startListening = useCallback(() => {
    setErrorMsg('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setErrorMsg("Voice recognition not supported. Use the quick commands below.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsMicActive(true);
      setState('listening');
      setTranscript('');
    };

    recognition.onend = () => {
      setIsMicActive(false);
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcriptText = event.results[current][0].transcript;
      setTranscript(transcriptText);
      
      if (event.results[current].isFinal) {
        processVoiceCommand(transcriptText);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsMicActive(false);
      if (event.error === 'no-speech') {
        setErrorMsg("No speech detected. Please try again.");
      } else {
        setErrorMsg("Could not detect speech. Try using quick commands.");
      }
      setState('idle');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  // ==========================================
  // AI PROCESSING
  // ==========================================

  const processVoiceCommand = async (text: string) => {
    setState('processing');
    setCommandHistory(prev => [...prev, text]);

    try {
      const response = await fetch('/api/voice-ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          sessionId,
          context: {
            previousCommands: commandHistory.slice(-5),
            timeOfDay: new Date().toLocaleTimeString(),
          },
        }),
      });

      if (!response.ok) throw new Error('API request failed');
      
      const data: VoiceAIResponse = await response.json();
      
      setState('responding');
      setAiResponse(data);
      
      // Text-to-speech for response
      speakResponse(data.response.text);
      
      // Transition to result after speaking animation
      setTimeout(() => setState('result'), 1500);
      
    } catch (error) {
      console.error('Voice AI processing error:', error);
      setErrorMsg('Failed to process command. Please try again.');
      setState('idle');
    }
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      stopSpeaking();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      // Try to get a natural voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        v.name.includes('Samantha') || 
        v.name.includes('Google') ||
        v.name.includes('Natural')
      );
      if (preferredVoice) utterance.voice = preferredVoice;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      
      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  // ==========================================
  // SIMULATED COMMANDS
  // ==========================================

  const handleQuickCommand = (command: string) => {
    setState('listening');
    setTranscript('');
    
    // Typing animation effect
    let i = 0;
    const typeInterval = setInterval(() => {
      setTranscript(command.substring(0, i + 1));
      i++;
      if (i > command.length) {
        clearInterval(typeInterval);
        setTimeout(() => processVoiceCommand(command), 300);
      }
    }, 25);
  };

  const handleFeedback = async (positive: boolean) => {
    try {
      await fetch('/api/voice-ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          feedback: positive ? 'positive' : 'negative',
          commandId: aiResponse?.transcript,
        }),
      });
    } catch (e) {
      console.error('Feedback error:', e);
    }
  };

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  const getRelevantMetrics = (): Metric[] => {
    if (!aiResponse?.response.visualContent?.metrics) return [];
    return aiResponse.response.visualContent.metrics
      .map(id => Object.values(MOCK_DATA.metrics).find(m => m.id === id))
      .filter(Boolean) as Metric[];
  };

  const getIntentIcon = (intent: string) => {
    const icons: Record<string, React.ElementType> = {
      'TREND_ANALYSIS': TrendingUp,
      'ANOMALY_DETECTION': AlertTriangle,
      'SYSTEM_STATUS': Activity,
      'METRICS_OVERVIEW': BarChart3,
      'CUSTOMER_INSIGHTS': Users,
      'PRIORITIZATION': Target,
      'EXECUTIVE_SUMMARY': FileText,
      'VULNERABILITY_REPORT': Shield,
      'RISK_ASSESSMENT': AlertCircle,
      'RECOMMENDATION_REQUEST': Lightbulb,
      'FORECAST_REQUEST': TrendingUp,
    };
    return icons[intent] || Brain;
  };

  if (!isOpen) return null;

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-start pt-16 p-4 sm:p-6 lg:p-8">
      {/* Backdrop with gradient */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-slate-950/95 via-slate-900/95 to-slate-950/95 backdrop-blur-2xl"
        onClick={onClose}
      />

      {/* Main Container */}
      <div className="relative w-full max-w-6xl bg-slate-900/80 border border-cyan-500/30 rounded-3xl shadow-[0_0_80px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col min-h-[60vh] max-h-[90vh] animate-in fade-in zoom-in-95 duration-300 backdrop-blur-xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Brain size={20} className="text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                AI Voice Assistant
                <Badge color="blue">Enterprise</Badge>
              </h2>
              <p className="text-xs text-slate-400">Powered by Advanced NLP & Deep Learning</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isSpeaking && (
              <button 
                onClick={stopSpeaking}
                className="p-2 rounded-lg bg-slate-800 text-cyan-400 hover:bg-slate-700 transition-colors"
                title="Stop speaking"
              >
                <VolumeX size={18} />
              </button>
            )}
            <button 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:text-white transition-colors hover:bg-slate-800 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative">
          
          {/* Background Effects */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-radial from-cyan-500/5 via-transparent to-transparent pointer-events-none" />

          <div className="flex-1 flex flex-col items-center justify-center min-h-full p-6 relative z-10">
            
            {/* ==================== IDLE STATE ==================== */}
            {state === 'idle' && !transcript && (
              <div className="w-full max-w-4xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* AI Orb with Waveform */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative mb-6">
                    {/* Outer glow rings */}
                    <div className="absolute inset-0 w-32 h-32 rounded-full bg-cyan-500/10 animate-ping" style={{ animationDuration: '3s' }} />
                    <div className="absolute inset-2 w-28 h-28 rounded-full bg-cyan-500/5 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                    
                    {/* Main button */}
                    <button 
                      onClick={startListening}
                      className="relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 group bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-cyan-500/50 hover:border-cyan-400 hover:scale-105 hover:shadow-[0_0_50px_rgba(6,182,212,0.4)]"
                    >
                      <div className="absolute inset-1 rounded-full bg-gradient-to-br from-cyan-600/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Mic size={36} className="text-cyan-400 group-hover:text-cyan-300 transition-colors z-10" />
                    </button>
                  </div>
                  
                  <h3 className="text-2xl font-light text-white mb-2">
                    <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                      How can I help you today?
                    </span>
                  </h3>
                  <p className="text-sm text-slate-400 max-w-md">
                    Tap the microphone to speak, or select a quick command below
                  </p>
                </div>

                {/* Error Message */}
                {errorMsg && (
                  <div className="bg-red-900/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl flex items-center gap-2 justify-center mx-auto max-w-md animate-in fade-in duration-300">
                    <AlertCircle size={16} /> {errorMsg}
                  </div>
                )}

                {/* Quick Commands Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto">
                  {QUICK_COMMANDS.map((cmd, idx) => {
                    const Icon = cmd.icon;
                    const colorClasses: Record<string, string> = {
                      cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/50',
                      amber: 'text-amber-400 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50',
                      emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50',
                      blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50',
                      purple: 'text-purple-400 bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-500/50',
                      rose: 'text-rose-400 bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-500/50',
                    };
                    
                    return (
                      <button 
                        key={idx}
                        onClick={() => handleQuickCommand(cmd.command)}
                        className={`p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 group flex items-center gap-4 text-left ${colorClasses[cmd.color]}`}
                      >
                        <div className="p-2.5 rounded-lg bg-slate-800/50 group-hover:scale-110 transition-transform">
                          <Icon size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-white block truncate">"{cmd.command}"</span>
                          <span className="text-xs text-slate-400">{cmd.description}</span>
                        </div>
                        <ChevronRight size={16} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
                      </button>
                    );
                  })}
                </div>

                {/* AI Capabilities Badge */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700/50">
                    <Sparkles size={12} className="text-cyan-400" />
                    <span className="text-xs text-slate-400">NLP Intent Recognition</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700/50">
                    <Brain size={12} className="text-purple-400" />
                    <span className="text-xs text-slate-400">Deep Learning Analytics</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700/50">
                    <Zap size={12} className="text-amber-400" />
                    <span className="text-xs text-slate-400">Real-time Processing</span>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== LISTENING STATE ==================== */}
            {state === 'listening' && (
              <div className="flex flex-col items-center justify-center space-y-8 w-full animate-in fade-in duration-300">
                
                {/* Listening Animation */}
                <div className="relative">
                  {/* Pulsing rings */}
                  <div className="absolute inset-0 w-40 h-40 rounded-full border-2 border-cyan-500/30 animate-ping" style={{ animationDuration: '1.5s' }} />
                  <div className="absolute inset-4 w-32 h-32 rounded-full border-2 border-cyan-500/20 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
                  
                  {/* Main orb */}
                  <button 
                    onClick={stopListening}
                    className="relative w-32 h-32 rounded-full flex items-center justify-center bg-gradient-to-br from-red-600 to-red-700 border-2 border-red-400 shadow-[0_0_40px_rgba(239,68,68,0.5)] hover:scale-95 transition-transform"
                  >
                    <MicOff size={40} className="text-white" />
                  </button>
                </div>

                {/* Waveform Visualization */}
                <div className="flex items-center justify-center gap-1 h-16">
                  {waveformData.map((height, i) => (
                    <div 
                      key={i}
                      className="w-1.5 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-full transition-all duration-75"
                      style={{ height: `${height * 60}px` }}
                    />
                  ))}
                </div>

                <div className="text-center">
                  <h3 className="text-2xl font-light text-white mb-2">Listening...</h3>
                  <p className="text-sm text-slate-400">Speak your command clearly</p>
                </div>

                {/* Live Transcript */}
                {transcript && (
                  <div className="text-xl font-light text-white text-center max-w-2xl bg-slate-800/50 px-6 py-4 rounded-xl border border-slate-700/50">
                    "{transcript}<span className="animate-pulse text-cyan-400">|</span>"
                  </div>
                )}
              </div>
            )}

            {/* ==================== PROCESSING STATE ==================== */}
            {state === 'processing' && (
              <div className="flex flex-col items-center justify-center space-y-8 w-full animate-in fade-in duration-300">
                
                {/* Processing Animation */}
                <div className="relative w-32 h-32">
                  {/* Rotating rings */}
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-500 animate-spin" style={{ animationDuration: '1s' }} />
                  <div className="absolute inset-3 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
                  <div className="absolute inset-6 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" style={{ animationDuration: '2s' }} />
                  
                  {/* Center brain icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Brain size={36} className="text-cyan-400 animate-pulse" />
                  </div>
                </div>

                {/* Transcript */}
                <div className="text-2xl font-light text-white text-center max-w-2xl">
                  "{transcript}"
                </div>

                {/* Processing Steps */}
                <div className="flex flex-col items-center gap-3">
                  <div className="h-1.5 w-48 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 animate-progress-indeterminate" />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-cyan-400 font-medium animate-pulse">
                    <Sparkles size={14} />
                    Analyzing with Advanced NLP & ML...
                  </div>
                </div>

                {/* Processing indicators */}
                <div className="flex items-center gap-6 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Intent Recognition
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
                    Entity Extraction
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
                    Context Analysis
                  </div>
                </div>
              </div>
            )}

            {/* ==================== RESPONDING STATE ==================== */}
            {state === 'responding' && aiResponse && (
              <div className="flex flex-col items-center justify-center space-y-6 w-full animate-in fade-in duration-300">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Volume2 size={32} className="text-white animate-pulse" />
                  </div>
                </div>
                <div className="text-lg text-cyan-300 font-medium animate-pulse">
                  Generating Response...
                </div>
              </div>
            )}

            {/* ==================== RESULT STATE ==================== */}
            {state === 'result' && aiResponse && (
              <div className="w-full flex flex-col space-y-6 animate-in slide-in-from-bottom-4 duration-500 px-2">
                
                {/* SRE AgenticOps Analysis Banner */}
                <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                      {React.createElement(getIntentIcon(aiResponse.nlpAnalysis.intent), { size: 24 })}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detected Intent</span>
                        <Badge color={aiResponse.nlpAnalysis.confidence > 0.8 ? 'green' : 'amber'}>
                          {(aiResponse.nlpAnalysis.confidence * 100).toFixed(0)}% Confidence
                        </Badge>
                      </div>
                      <span className="text-sm font-medium text-white">{aiResponse.nlpAnalysis.intent.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {aiResponse.processingTime}ms
                    </span>
                    <span className="flex items-center gap-1">
                      <Brain size={12} />
                      {aiResponse.modelInfo.nlp}
                    </span>
                  </div>
                </div>

                {/* AI Response Card */}
                <Card className="p-6 border-l-4 border-l-cyan-500 bg-slate-800/60">
                  <div className="flex gap-4">
                    <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl text-cyan-400 shrink-0">
                      <Brain size={28} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-sm font-bold text-cyan-300 uppercase tracking-wider">AI Analysis Complete</h3>
                        <Check size={16} className="text-emerald-400" />
                        {isSpeaking && <Volume2 size={14} className="text-cyan-400 animate-pulse" />}
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed">
                        {aiResponse.response.text}
                      </p>
                      
                      {/* Follow-up suggestion */}
                      {aiResponse.response.followUp && (
                        <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                          <p className="text-xs text-cyan-400 italic">Note: {aiResponse.response.followUp}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Executive Summary (if available) */}
                {aiResponse.executiveSummary && (
                  <Card className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-amber-500/30">
                    <div className="flex items-center gap-3 mb-4">
                      <FileText size={20} className="text-amber-400" />
                      <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">C-Level Executive Summary</h3>
                      <Badge color="amber">{aiResponse.executiveSummary.confidence}% Confidence</Badge>
                    </div>
                    
                    <h4 className="text-lg font-bold text-white mb-4">{aiResponse.executiveSummary.headline}</h4>
                    
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                      {aiResponse.executiveSummary.metrics.map((metric, i) => (
                        <div key={i} className="bg-slate-800/50 rounded-lg p-3 text-center">
                          <div className="text-xs text-slate-400 mb-1">{metric.label}</div>
                          <div className="text-lg font-bold text-white">{metric.value}</div>
                          {metric.change && (
                            <div className={`text-xs font-medium ${metric.change.startsWith('+') ? 'text-emerald-400' : metric.change.startsWith('-') ? 'text-red-400' : 'text-slate-400'}`}>
                              {metric.change}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Key Insights */}
                    <div className="space-y-2 mb-4">
                      <h5 className="text-xs font-bold text-slate-400 uppercase">Key Insights</h5>
                      <ul className="space-y-1.5">
                        {aiResponse.executiveSummary.keyInsights.slice(0, 3).map((insight, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                            <Sparkles size={14} className="text-cyan-400 mt-0.5 shrink-0" />
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Risk Assessment */}
                    <div className="flex items-center gap-4 p-3 bg-slate-900/50 rounded-lg">
                      <div className="text-center">
                        <div className="text-xs text-slate-400 mb-1">Risk Score</div>
                        <div className={`text-2xl font-bold ${
                          aiResponse.executiveSummary.riskAssessment.score < 50 ? 'text-emerald-400' :
                          aiResponse.executiveSummary.riskAssessment.score < 75 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {aiResponse.executiveSummary.riskAssessment.score}/100
                        </div>
                      </div>
                      <div className="h-10 w-px bg-slate-700" />
                      <div>
                        <Badge color={
                          aiResponse.executiveSummary.riskAssessment.level === 'low' ? 'green' :
                          aiResponse.executiveSummary.riskAssessment.level === 'medium' ? 'amber' : 'red'
                        }>
                          {aiResponse.executiveSummary.riskAssessment.level.toUpperCase()} RISK
                        </Badge>
                        <div className="text-xs text-slate-400 mt-1">
                          Trend: {aiResponse.executiveSummary.riskAssessment.trend}
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Visual Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {getRelevantMetrics().map(metric => (
                    <div key={metric.id} className="transform transition-all hover:scale-[1.01] duration-300">
                      <MetricCard metric={metric} onClick={onMetricSelect} />
                    </div>
                  ))}
                  
                  {aiResponse.response.visualContent?.showPredictions && (
                    <div className="transform transition-all hover:scale-[1.01] duration-300">
                      <PredictionsCard predictions={MOCK_DATA.predictions} />
                    </div>
                  )}
                  
                  {aiResponse.response.visualContent?.showAnomalies && (
                    <div className="transform transition-all hover:scale-[1.01] duration-300">
                      <AnomaliesCard anomalies={MOCK_DATA.anomalies} />
                    </div>
                  )}
                  
                  {aiResponse.response.visualContent?.showRecommendations && (
                    <div className="transform transition-all hover:scale-[1.01] duration-300">
                      <RecommendationsCard recommendations={MOCK_DATA.recommendations} />
                    </div>
                  )}
                </div>

                {/* Suggested Actions */}
                {aiResponse.response.actions && aiResponse.response.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {aiResponse.response.actions.map((action, i) => (
                      <button 
                        key={i}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          action.priority === 'high' 
                            ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Action Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Was this helpful?</span>
                    <button 
                      onClick={() => handleFeedback(true)}
                      className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      <ThumbsUp size={16} />
                    </button>
                    <button 
                      onClick={() => handleFeedback(false)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <ThumbsDown size={16} />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {/* Export functionality */}}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 border border-slate-700 transition-colors"
                    >
                      <Download size={16} /> Export
                    </button>
                    <button 
                      onClick={resetState} 
                      className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg text-sm font-bold text-white transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-105"
                    >
                      <Mic size={18} /> New Command
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes progress-indeterminate {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 1.5s infinite ease-in-out;
        }
        .bg-gradient-radial {
          background: radial-gradient(ellipse at center, var(--tw-gradient-from) 0%, var(--tw-gradient-to) 70%);
        }
      `}</style>
    </div>
  );
};

export default AdvancedVoiceAssistant;
