/**
 * Interactive Card Wrapper with AI/ML Enhancement
 * 
 * Universal wrapper component that adds advanced AI/ML capabilities to any card:
 * - Click handler with AI/ML processing
 * - Visual feedback (hover, loading, success/error states)
 * - Modal/overlay display for AI results
 * - Accessibility (ARIA, keyboard navigation)
 * - Performance optimization (debouncing, event delegation)
 * - Touch support for mobile
 * - Error handling with retry logic
 * 
 * @module InteractiveCardWrapper
 * @version 1.0.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Brain, Loader2, AlertCircle, CheckCircle, X, RefreshCw, Maximize2, TrendingUp } from 'lucide-react';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface CardData {
  id: string;
  type: 'metric' | 'anomaly' | 'prediction' | 'recommendation' | 'kpi' | 'field-notice';
  title: string;
  data: any;
  metadata?: Record<string, any>;
}

export interface AIProcessingResult {
  success: boolean;
  insights: string[];
  recommendations: string[];
  visualizations?: any[];
  metadata: {
    processingTime: number;
    model: string;
    confidence: number;
  };
  error?: string;
}

export interface InteractiveCardWrapperProps {
  children: React.ReactNode;
  cardData: CardData;
  onAIProcess?: (data: CardData) => Promise<AIProcessingResult>;
  aiProcessingEndpoint?: string;
  className?: string;
  disabled?: boolean;
  debounceMs?: number;
  showAIBadge?: boolean;
  enableTouch?: boolean;
  enableKeyboard?: boolean;
  ariaLabel?: string;
}

// ==========================================
// DEBOUNCE UTILITY
// ==========================================

function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export const InteractiveCardWrapper: React.FC<InteractiveCardWrapperProps> = ({
  children,
  cardData,
  onAIProcess,
  aiProcessingEndpoint = '/api/ai/process',
  className = '',
  disabled = false,
  debounceMs = 300,
  showAIBadge = true,
  enableTouch = true,
  enableKeyboard = true,
  ariaLabel,
}) => {
  // State management
  const [isProcessing, setIsProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [aiResult, setAiResult] = useState<AIProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;
  
  // ==========================================
  // AI PROCESSING LOGIC
  // ==========================================
  
  const processWithAI = useCallback(async (data: CardData): Promise<AIProcessingResult> => {
    const startTime = performance.now();
    
    try {
      // Use custom handler if provided
      if (onAIProcess) {
        return await onAIProcess(data);
      }
      
      // Otherwise, call API endpoint
      const response = await fetch(aiProcessingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardType: data.type,
          cardId: data.id,
          data: data.data,
          metadata: data.metadata,
        }),
        signal: AbortSignal.timeout(30000), // 30s timeout
      });
      
      if (!response.ok) {
        throw new Error(`AI processing failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      const processingTime = performance.now() - startTime;
      
      return {
        ...result,
        success: true,
        metadata: {
          ...result.metadata,
          processingTime,
        },
      };
    } catch (err) {
      const processingTime = performance.now() - startTime;
      
      // Return error result
      return {
        success: false,
        insights: [],
        recommendations: [],
        error: err instanceof Error ? err.message : 'Unknown error occurred',
        metadata: {
          processingTime,
          model: 'error',
          confidence: 0,
        },
      };
    }
  }, [onAIProcess, aiProcessingEndpoint]);
  
  // ==========================================
  // CLICK HANDLER WITH RETRY LOGIC
  // ==========================================
  
  const handleClick = useCallback(async () => {
    if (disabled || isProcessing) return;
    
    setIsProcessing(true);
    setError(null);
    retryCountRef.current = 0;
    
    const attemptProcessing = async (): Promise<AIProcessingResult> => {
      try {
        const result = await processWithAI(cardData);
        
        // If failed and retries available, retry
        if (!result.success && retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          console.log(`[InteractiveCardWrapper] Retry ${retryCountRef.current}/${MAX_RETRIES}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCountRef.current)); // Exponential backoff
          return attemptProcessing();
        }
        
        return result;
      } catch (err) {
        throw err;
      }
    };
    
    try {
      const result = await attemptProcessing();
      
      if (result.success) {
        setAiResult(result);
        setShowModal(true);
        setError(null);
      } else {
        setError(result.error || 'Processing failed');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process card data';
      setError(errorMsg);
      console.error('[InteractiveCardWrapper] Error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [disabled, isProcessing, cardData, processWithAI]);
  
  // Debounced click handler
  const debouncedHandleClick = useDebounce(handleClick, debounceMs);
  
  // ==========================================
  // KEYBOARD NAVIGATION
  // ==========================================
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!enableKeyboard || disabled) return;
    
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    } else if (e.key === 'Escape' && showModal) {
      setShowModal(false);
    }
  }, [enableKeyboard, disabled, handleClick, showModal]);
  
  // ==========================================
  // TOUCH SUPPORT
  // ==========================================
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableTouch || disabled) return;
    setTouchStartTime(Date.now());
  }, [enableTouch, disabled]);
  
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enableTouch || disabled) return;
    
    const touchDuration = Date.now() - touchStartTime;
    
    // Only trigger if touch was quick (< 500ms) to differentiate from scroll
    if (touchDuration < 500) {
      e.preventDefault();
      debouncedHandleClick();
    }
  }, [enableTouch, disabled, touchStartTime, debouncedHandleClick]);
  
  // ==========================================
  // MODAL CLOSE HANDLER
  // ==========================================
  
  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, []);
  
  // ==========================================
  // ESCAPE KEY LISTENER FOR MODAL
  // ==========================================
  
  useEffect(() => {
    if (!showModal) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showModal]);
  
  // ==========================================
  // RENDER
  // ==========================================
  
  return (
    <>
      {/* Interactive Card Container */}
      <div
        ref={cardRef}
        className={`
          interactive-card-wrapper relative
          ${isProcessing ? 'processing' : ''}
          ${isHovered || isFocused ? 'hovered' : ''}
          ${disabled ? 'disabled cursor-not-allowed opacity-60' : 'cursor-pointer'}
          ${className}
        `}
        onClick={disabled ? undefined : debouncedHandleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label={ariaLabel || `Analyze ${cardData.title} with AI`}
        aria-busy={isProcessing}
        aria-disabled={disabled}
        aria-expanded={showModal}
      >
        {/* Original Card Content */}
        {children}
        
        {/* AI Badge */}
        {showAIBadge && !disabled && (
          <div
            className={`
              absolute top-2 right-2 z-10
              flex items-center gap-1.5 px-2 py-1
              rounded-full backdrop-blur-sm
              transition-all duration-300
              ${isProcessing 
                ? 'bg-cyan-500/30 border border-cyan-400/50 scale-110' 
                : isHovered || isFocused
                  ? 'bg-cyan-500/20 border border-cyan-400/30'
                  : 'bg-slate-800/60 border border-slate-600/30 opacity-70'
              }
            `}
            aria-hidden="true"
          >
            {isProcessing ? (
              <>
                <Loader2 size={12} className="text-cyan-400 animate-spin" />
                <span className="text-xs font-bold text-cyan-300 uppercase">Analyzing</span>
              </>
            ) : (
              <>
                <Brain size={12} className="text-cyan-400" />
                <span className="text-xs font-bold text-slate-300 uppercase">AI</span>
              </>
            )}
          </div>
        )}
        
        {/* Error Indicator */}
        {error && !isProcessing && (
          <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center gap-2 px-3 py-2 bg-red-500/20 border border-red-400/30 rounded-lg backdrop-blur-sm">
            <AlertCircle size={14} className="text-red-400" />
            <span className="text-xs text-red-300 flex-1">{error}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setError(null);
                handleClick();
              }}
              className="text-xs text-red-300 hover:text-red-200 flex items-center gap-1"
              aria-label="Retry AI processing"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        )}
        
        {/* Hover/Focus Visual Feedback */}
        {(isHovered || isFocused) && !disabled && !isProcessing && (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-lg pointer-events-none transition-opacity duration-300" />
            <div className="absolute inset-0 border-2 border-cyan-500/30 rounded-lg pointer-events-none transition-opacity duration-300" />
          </>
        )}
        
        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm rounded-lg flex items-center justify-center z-20 animate-in fade-in duration-300">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={32} className="text-cyan-400 animate-spin" />
              <p className="text-xs text-cyan-300 font-bold uppercase tracking-wider">AI Processing</p>
            </div>
          </div>
        )}
      </div>
      
      {/* AI Results Modal/Overlay */}
      {showModal && aiResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-result-title"
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl animate-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-slate-700 bg-slate-900/95 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
                  <Brain size={24} className="text-cyan-400" />
                </div>
                <div>
                  <h2 id="ai-result-title" className="text-xl font-bold text-white">
                    AI Analysis Results
                  </h2>
                  <p className="text-sm text-slate-400">
                    {cardData.title} • {aiResult.metadata.model} • {aiResult.metadata.confidence.toFixed(0)}% confidence
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Success Indicator */}
              <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <CheckCircle size={20} className="text-emerald-400" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-300">Analysis Complete</p>
                  <p className="text-xs text-emerald-400/80">
                    Processed in {aiResult.metadata.processingTime.toFixed(0)}ms
                  </p>
                </div>
              </div>
              
              {/* Insights Section */}
              {aiResult.insights.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <TrendingUp size={18} className="text-cyan-400" />
                    Key Insights
                  </h3>
                  <div className="space-y-2">
                    {aiResult.insights.map((insight, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg"
                      >
                        <p className="text-sm text-slate-200 leading-relaxed">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Recommendations Section */}
              {aiResult.recommendations.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <Maximize2 size={18} className="text-emerald-400" />
                    Recommendations
                  </h3>
                  <div className="space-y-2">
                    {aiResult.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
                      >
                        <p className="text-sm text-emerald-200 leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Visualizations */}
              {aiResult.visualizations && aiResult.visualizations.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-white mb-3">Visualizations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiResult.visualizations.map((viz, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg"
                      >
                        {/* Render visualization data here */}
                        <pre className="text-xs text-slate-400 overflow-auto">
                          {JSON.stringify(viz, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="sticky bottom-0 p-6 border-t border-slate-700 bg-slate-900/95 backdrop-blur-sm">
              <button
                onClick={handleCloseModal}
                className="w-full py-3 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400 rounded-lg font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Custom Styles */}
      <style jsx>{`
        .interactive-card-wrapper {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .interactive-card-wrapper:not(.disabled):hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        
        .interactive-card-wrapper:not(.disabled):active {
          transform: translateY(-2px);
        }
        
        .interactive-card-wrapper.processing {
          pointer-events: none;
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        
        @keyframes shine {
          0% {
            transform: translateX(-100%) skewX(-12deg);
          }
          100% {
            transform: translateX(200%) skewX(-12deg);
          }
        }
        
        .animate-shine {
          animation: shine 1.5s ease-in-out;
        }
      `}</style>
    </>
  );
};

export default InteractiveCardWrapper;
