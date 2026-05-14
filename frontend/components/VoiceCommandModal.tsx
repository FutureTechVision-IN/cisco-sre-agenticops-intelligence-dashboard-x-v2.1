import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, Activity, Check, Brain, ChevronRight, MessageSquare, AlertCircle, TrendingUp, Shield, Users, BarChart2, Target, Zap, AlertTriangle } from 'lucide-react';
import { VoiceScenario, Metric } from '../types';
import { MOCK_VOICE_SCENARIOS, MOCK_DATA } from '../constants';
import { MetricCard } from './MetricCard';
import { PredictionsCard, AnomaliesCard, RecommendationsCard } from './IntelligenceCards';

// Add type definition for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Quick command prompts with icons for better UX
const VOICE_QUICK_COMMANDS = [
  { command: "Show me the trends", icon: TrendingUp, color: 'cyan' },
  { command: "What are the anomalies", icon: AlertTriangle, color: 'amber' },
  { command: "System health status", icon: Shield, color: 'emerald' },
  { command: "Show metrics overview", icon: BarChart2, color: 'blue' },
  { command: "Top customer insights", icon: Users, color: 'purple' },
  { command: "What should I prioritize", icon: Target, color: 'orange' },
];

// Add type definition for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onMetricSelect: (metric: Metric) => void;
}

export const VoiceCommandModal: React.FC<Props> = ({ isOpen, onClose, onMetricSelect }) => {
  const [state, setState] = useState<'listening' | 'processing' | 'result' | 'error'>('listening');
  const [transcript, setTranscript] = useState('');
  const [scenario, setScenario] = useState<VoiceScenario | null>(null);
  const [isMicActive, setIsMicActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const recognitionRef = useRef<any>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      resetState();
    } else {
      stopListening();
    }
  }, [isOpen]);

  const resetState = () => {
    setState('listening');
    setTranscript('');
    setScenario(null);
    setErrorMsg('');
    setIsMicActive(false);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsMicActive(false);
  };

  const startListening = () => {
    setErrorMsg('');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setErrorMsg("Voice recognition is not supported in this browser. Please use the simulation buttons below.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsMicActive(true);
      setTranscript('');
    };

    recognition.onend = () => {
      setIsMicActive(false);
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      processVoiceCommand(text);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsMicActive(false);
      setErrorMsg("Could not detect speech. Please try again.");
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const processVoiceCommand = (text: string) => {
    setState('processing');
    
    // Simulate processing delay for UX
    setTimeout(() => {
      const lowerText = text.toLowerCase();
      
      // Fuzzy matching logic
      let matchedScenario = MOCK_VOICE_SCENARIOS.find(s => 
        lowerText.includes(s.command.toLowerCase())
      );

      if (!matchedScenario) {
        // Advanced keyword matching
        if (lowerText.includes("wells fargo") || lowerText.includes("customer")) {
            matchedScenario = MOCK_VOICE_SCENARIOS.find(s => s.intent === 'CUSTOMER_INSIGHT');
        } else if (lowerText.includes("health") || lowerText.includes("status") || lowerText.includes("system")) {
            matchedScenario = MOCK_VOICE_SCENARIOS.find(s => s.intent === 'SYSTEM_HEALTH');
        } else if (lowerText.includes("trend") || lowerText.includes("prediction") || lowerText.includes("forecast")) {
            matchedScenario = MOCK_VOICE_SCENARIOS.find(s => s.intent === 'TREND_PREDICTIONS');
        } else if (lowerText.includes("anomaly") || lowerText.includes("alert") || lowerText.includes("detected")) {
            matchedScenario = MOCK_VOICE_SCENARIOS.find(s => s.intent === 'ANOMALY_CHECK');
        } else if (lowerText.includes("vulnerable") || lowerText.includes("asset") || lowerText.includes("show")) {
            matchedScenario = MOCK_VOICE_SCENARIOS.find(s => s.intent === 'METRIC_VIEW');
        }
      }

      if (matchedScenario) {
        setScenario(matchedScenario);
        setState('result');
      } else {
        setErrorMsg(`Command "${text}" not recognized. Please try one of the suggested commands.`);
        setState('listening');
      }
    }, 800);
  };

  const handleSimulatedCommand = (selectedScenario: VoiceScenario) => {
    setState('listening');
    setTranscript('');
    setErrorMsg('');
    
    // Simulate typing effect
    const command = selectedScenario.command;
    let i = 0;
    const typeInterval = setInterval(() => {
      setTranscript(command.substring(0, i + 1));
      i++;
      if (i > command.length) {
        clearInterval(typeInterval);
        setTimeout(() => {
          processVoiceCommand(command);
        }, 300);
      }
    }, 30);
  };

  if (!isOpen) return null;

  const relevantMetrics = scenario?.response.metrics?.map(id => 
    Object.values(MOCK_DATA.metrics).find(m => m.id === id)
  ).filter(Boolean) as Metric[] || [];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-start pt-24 p-4 sm:p-6 lg:p-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-5xl bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col min-h-[50vh] max-h-[85vh] animate-in fade-in zoom-in-95 duration-300">
        
        <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 text-slate-500 hover:text-white transition-colors hover:bg-slate-800 rounded-full">
          <X size={24} />
        </button>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col p-6 relative">
           
           {/* Background Grid */}
           <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

           <div className="flex-1 flex flex-col items-center justify-center min-h-full">
             
             {/* State: Listening (Initial) */}
             {state === 'listening' && !transcript && (
               <div className="w-full max-w-3xl text-center space-y-10 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* Main Mic Button */}
                  <div className="flex flex-col items-center justify-center">
                     <button 
                       onClick={() => isMicActive ? stopListening() : startListening()}
                       className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 mb-6 group ${isMicActive ? 'bg-red-500/20 border-2 border-red-500 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)] scale-110' : 'bg-cyan-500/10 border-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:scale-105 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]'}`}
                     >
                       <Mic size={40} className={`transition-transform duration-300 ${isMicActive ? 'animate-bounce' : 'group-hover:scale-110'}`} />
                     </button>
                     <h3 className="text-2xl font-light text-white mb-2">{isMicActive ? "I'm listening..." : "Ready to listen"}</h3>
                     <p className="text-sm text-slate-400">Click the microphone or try one of the suggestions below</p>
                  </div>

                  {errorMsg && (
                    <div className="bg-red-900/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg flex items-center gap-2 justify-center mx-auto max-w-md">
                      <AlertCircle size={16} /> {errorMsg}
                    </div>
                  )}

                  {/* Try Asking Section - Quick Command Prompts */}
                  <div className="space-y-4 mt-8">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <MessageSquare size={16} />
                      <span className="text-sm font-medium uppercase tracking-wider">Try asking</span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
                      {VOICE_QUICK_COMMANDS.map((cmd, index) => {
                        const Icon = cmd.icon;
                        const colorClasses: Record<string, string> = {
                          cyan: 'border-cyan-500/30 hover:border-cyan-500/60 hover:bg-cyan-500/10 text-cyan-400',
                          amber: 'border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/10 text-amber-400',
                          emerald: 'border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/10 text-emerald-400',
                          blue: 'border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/10 text-blue-400',
                          purple: 'border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/10 text-purple-400',
                          orange: 'border-orange-500/30 hover:border-orange-500/60 hover:bg-orange-500/10 text-orange-400',
                        };
                        
                        return (
                          <button
                            key={index}
                            onClick={() => handleSimulatedCommand(MOCK_VOICE_SCENARIOS.find(s => s.command === cmd.command) || MOCK_VOICE_SCENARIOS[0])}
                            className={`flex items-center gap-2 px-4 py-3 rounded-lg border bg-slate-800/50 transition-all duration-300 hover:scale-[1.02] ${colorClasses[cmd.color] || colorClasses.cyan}`}
                          >
                            <Icon size={18} className="flex-shrink-0" />
                            <span className="text-sm font-medium text-slate-200">{cmd.command}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

               </div>
             )}

             {/* State: Transcript/Processing */}
             {((state === 'listening' && transcript) || state === 'processing') && (
               <div className="flex flex-col items-center justify-center h-full space-y-8 w-full relative z-10">
                  <div className="text-3xl font-light text-white text-center max-w-3xl leading-relaxed">
                    "{transcript}<span className="animate-blink text-cyan-500">_</span>"
                  </div>
                  
                  {state === 'processing' && (
                     <div className="flex flex-col items-center gap-3">
                        <div className="h-1 w-24 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-400 animate-progress-indeterminate" />
                        </div>
                        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-widest animate-pulse">
                           <Brain size={14} /> Analyzing Intent & Context...
                        </div>
                     </div>
                  )}
               </div>
             )}

             {/* State: Result */}
             {state === 'result' && scenario && (
               <div className="w-full flex flex-col space-y-8 animate-in slide-in-from-bottom-4 duration-500 relative z-10 pt-4 pb-4 max-w-4xl mx-auto">
                  
                  {/* AI Response Box */}
                  <div className="flex gap-4 items-start bg-slate-800/60 p-5 rounded-xl border-l-4 border-cyan-500 shadow-lg shrink-0 backdrop-blur-md mx-4 sm:mx-0">
                     <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400 shrink-0 mt-1">
                        <Brain size={24} />
                     </div>
                     <div>
                        <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                          AI Analysis Complete <Check size={14} className="text-emerald-400" />
                        </h3>
                        <p className="text-sm text-slate-200 leading-relaxed font-light">
                          {scenario.response.text}
                        </p>
                     </div>
                  </div>

                  {/* Dynamic Content Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full px-2">
                     {relevantMetrics.map(metric => (
                        <div key={metric.id} className="min-h-[600px] w-full transform transition-all hover:scale-[1.01] duration-300">
                          <MetricCard metric={metric} onClick={onMetricSelect} />
                        </div>
                     ))}
                     
                     {scenario.response.showPredictions && (
                        <div className="min-h-[600px] w-full transform transition-all hover:scale-[1.01] duration-300">
                           <PredictionsCard predictions={MOCK_DATA.predictions} />
                        </div>
                     )}
                     
                     {scenario.response.showAnomalies && (
                        <div className="min-h-[600px] w-full transform transition-all hover:scale-[1.01] duration-300">
                           <AnomaliesCard anomalies={MOCK_DATA.anomalies} />
                        </div>
                     )}
                     
                     {scenario.response.showRecommendations && (
                        <div className="min-h-[600px] w-full transform transition-all hover:scale-[1.01] duration-300">
                           <RecommendationsCard recommendations={MOCK_DATA.recommendations} />
                        </div>
                     )}
                  </div>
                  
                  {/* Action Footer */}
                  <div className="flex justify-center pt-6">
                     <button 
                       onClick={resetState} 
                       className="flex items-center gap-2 px-8 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-full text-sm font-bold text-white transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-105"
                     >
                       <Mic size={18} /> New Command
                     </button>
                  </div>
               </div>
             )}
           </div>

        </div>
        
      </div>
      <style>{`
        @keyframes progress-indeterminate {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 100%; margin-left: 0%; }
          100% { width: 0%; margin-left: 100%; }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 1.5s infinite ease-in-out;
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 1s step-end infinite;
        }
      `}</style>
    </div>
  );
};