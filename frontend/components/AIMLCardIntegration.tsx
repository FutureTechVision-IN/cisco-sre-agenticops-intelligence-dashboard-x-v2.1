/**
 * AI/ML Interactive Card Integration
 * 
 * Seamlessly integrates AI/ML processing into existing KPI cards with:
 * - Click-to-analyze functionality
 * - Real-time processing feedback
 * - Modal result display
 * - Touch and keyboard support
 * - Performance optimization
 * - Error resilience
 * 
 * @module frontend/components/AIMLCardIntegration
 * @version 2.0
 */

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { AlertCircle, ArrowRight, Loader, Zap, RefreshCw, MoreVertical } from 'lucide-react';

/**
 * Loading Overlay Component
 */
const LoadingOverlay = memo(() => (
  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-slate-900/50 to-slate-900/30 flex flex-col items-center justify-center backdrop-blur-sm z-40">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Loader className="w-12 h-12 text-blue-400 animate-spin" strokeWidth={1.5} />
        <Zap className="w-6 h-6 text-yellow-400 absolute top-2 right-0 animate-pulse" />
      </div>
      <div className="text-center">
        <p className="text-white text-sm font-semibold mb-1">AI Analysis in Progress</p>
        <p className="text-slate-300 text-xs">Processing with ML engine...</p>
      </div>
    </div>
  </div>
));

LoadingOverlay.displayName = 'LoadingOverlay';

/**
 * Interactive Card Wrapper Component
 * Enhances existing KPI cards with AI/ML interactivity
 */
export interface InteractiveCardProps {
  cardType: 'anomalies' | 'trends' | 'recommendations';
  cardTitle: string;
  cardData?: Record<string, any>;
  isLoading?: boolean;
  onAnalysisStart?: () => void;
  onAnalysisComplete?: (data: any) => void;
  onAnalysisError?: (error: Error) => void;
  children: React.ReactNode;
  showHint?: boolean;
  debounceMs?: number;
}

export interface AnalysisResult {
  cardType: string;
  status: 'success' | 'error';
  data?: any;
  error?: {
    message: string;
    code: string;
  };
  executionTimeMs: number;
  timestamp: string;
}

export const InteractiveCardWrapper = memo<InteractiveCardProps>(
  ({
    cardType,
    cardTitle,
    cardData,
    isLoading: initialIsLoading = false,
    onAnalysisStart,
    onAnalysisComplete,
    onAnalysisError,
    children,
    showHint = true,
    debounceMs = 300,
  }) => {
    const [state, setState] = useState({
      isLoading: initialIsLoading,
      isHovering: false,
      showMenu: false,
      error: null as string | null,
    });

    const abortRef = useRef<AbortController>();
    const debounceRef = useRef<NodeJS.Timeout>();
    const cardRef = useRef<HTMLDivElement>(null);
    const isProcessing = useRef(false);

    /**
     * Execute AI/ML analysis
     */
    const executeAnalysis = useCallback(async () => {
      if (isProcessing.current) return;

      isProcessing.current = true;
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        showMenu: false,
      }));

      onAnalysisStart?.();

      try {
        abortRef.current = new AbortController();
        const startTime = performance.now();

        const response = await fetch('/api/ml/analyze/comprehensive', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Card-Type': cardType,
          },
          signal: abortRef.current.signal,
        });

        const endTime = performance.now();

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Server error: ${response.statusText}`
          );
        }

        const data = await response.json();

        const result: AnalysisResult = {
          cardType,
          status: 'success',
          data: data.analysis || data,
          executionTimeMs: Math.round(endTime - startTime),
          timestamp: new Date().toISOString(),
        };

        setState(prev => ({
          ...prev,
          isLoading: false,
        }));

        onAnalysisComplete?.(result);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';

        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));

        onAnalysisError?.(
          error instanceof Error
            ? error
            : new Error(errorMessage)
        );
      } finally {
        isProcessing.current = false;
      }
    }, [cardType, onAnalysisStart, onAnalysisComplete, onAnalysisError]);

    /**
     * Debounced handler for click events
     */
    const handleCardClick = useCallback(
      (e: React.MouseEvent | React.KeyboardEvent) => {
        // Handle keyboard
        if ('key' in e) {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
        } else if ((e as React.MouseEvent).button !== 0) {
          // Only left mouse button
          return;
        }

        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(executeAnalysis, debounceMs);
      },
      [executeAnalysis, debounceMs]
    );

    /**
     * Handle manual refresh
     */
    const handleRefresh = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        executeAnalysis();
      },
      [executeAnalysis]
    );

    /**
     * Toggle menu
     */
    const handleToggleMenu = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      setState(prev => ({
        ...prev,
        showMenu: !prev.showMenu,
      }));
    }, []);

    /**
     * Export analysis data
     */
    const handleExport = useCallback(async () => {
      try {
        const response = await fetch(
          `/api/ml/analyze/comprehensive?format=json`,
          { headers: { 'X-Card-Type': cardType } }
        );
        const data = await response.json();

        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ml-analysis-${cardType}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setState(prev => ({ ...prev, showMenu: false }));
      } catch (error) {
        console.error('Export failed:', error);
        setState(prev => ({
          ...prev,
          error: 'Failed to export analysis',
        }));
      }
    }, [cardType]);

    /**
     * Copy to clipboard
     */
    const handleCopy = useCallback(async () => {
      try {
        const response = await fetch('/api/ml/analyze/comprehensive', {
          headers: { 'X-Card-Type': cardType },
        });
        const data = await response.json();

        await navigator.clipboard.writeText(JSON.stringify(data, null, 2));

        setState(prev => ({ ...prev, showMenu: false }));

        // Show brief confirmation
        const originalText = 'Copied!';
        setTimeout(() => {
          setState(prev => ({ ...prev, error: null }));
        }, 2000);
      } catch (error) {
        console.error('Copy failed:', error);
        setState(prev => ({
          ...prev,
          error: 'Failed to copy analysis',
        }));
      }
    }, [cardType]);

    /**
     * Cleanup on unmount
     */
    useEffect(() => {
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (abortRef.current) abortRef.current.abort();
      };
    }, []);

    /**
     * Close menu when clicking outside
     */
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          state.showMenu &&
          cardRef.current &&
          !cardRef.current.contains(e.target as Node)
        ) {
          setState(prev => ({ ...prev, showMenu: false }));
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [state.showMenu]);

    return (
      <div
        ref={cardRef}
        onClick={handleCardClick}
        onKeyDown={handleCardClick}
        onMouseEnter={() =>
          setState(prev => ({ ...prev, isHovering: true }))
        }
        onMouseLeave={() =>
          setState(prev => ({ ...prev, isHovering: false, showMenu: false }))
        }
        role="button"
        tabIndex={0}
        aria-label={`Interactive ${cardType} card - Click to analyze with AI/ML`}
        aria-busy={state.isLoading}
        className={`relative group transition-all duration-300 cursor-pointer rounded-lg
          ${
            state.isHovering
              ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 shadow-xl'
              : 'shadow-md hover:shadow-lg'
          }
          ${state.isLoading ? 'ring-2 ring-blue-400' : ''}
        `}
      >
        {/* Card Content */}
        <div className={state.isLoading ? 'opacity-60 pointer-events-none' : ''}>
          {children}
        </div>

        {/* Loading Overlay */}
        {state.isLoading && <LoadingOverlay />}

        {/* Hover Hint */}
        {state.isHovering && !state.isLoading && showHint && (
          <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-blue-600/20 to-transparent flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold shadow-lg">
              <Zap className="w-4 h-4" />
              AI Analysis
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {state.isHovering && !state.isLoading && (
          <div className="absolute top-3 right-3 flex gap-2 z-30">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              aria-label="Refresh analysis"
              className="p-2 rounded-lg bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 shadow-md transition-all duration-200 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Menu Button */}
            <div className="relative">
              <button
                onClick={handleToggleMenu}
                aria-label="Card options"
                className="p-2 rounded-lg bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 shadow-md transition-all duration-200 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Dropdown Menu */}
              {state.showMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
                  <button
                    onClick={handleExport}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 transition-colors"
                  >
                    📥 Export JSON
                  </button>
                  <button
                    onClick={handleCopy}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 transition-colors border-t border-slate-200 dark:border-slate-700"
                  >
                    📋 Copy Results
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Indicator */}
        {state.error && (
          <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-950 rounded-lg shadow-md">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-xs text-red-700 dark:text-red-300 font-medium">
              {state.error}
            </span>
          </div>
        )}
      </div>
    );
  }
);

InteractiveCardWrapper.displayName = 'InteractiveCardWrapper';

/**
 * Analysis Results Display Component
 */
export interface AnalysisResultsProps {
  result: AnalysisResult;
  onClose: () => void;
  cardTitle: string;
}

export const AnalysisResultsPanel = memo<AnalysisResultsProps>(
  ({ result, onClose, cardTitle }) => {
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 dark:from-slate-800 to-slate-50 dark:to-slate-900">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {cardTitle} - AI/ML Analysis Results
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Processed in {result.executionTimeMs}ms •{' '}
                {new Date(result.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="Close results"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {result.status === 'error' && result.error ? (
              <div className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-600 p-4 rounded">
                <h3 className="font-semibold text-red-900 dark:text-red-200 mb-1">
                  Analysis Failed
                </h3>
                <p className="text-red-800 dark:text-red-300 text-sm">
                  {result.error.message}
                </p>
              </div>
            ) : result.data ? (
              <>
                {/* Summary Stats */}
                {(result.data.similarFieldNotices ||
                  result.data.detectedAnomalies ||
                  result.data.trendPredictions ||
                  result.data.recommendations) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {result.data.similarFieldNotices && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Similar FNs
                        </p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {result.data.similarFieldNotices.length}
                        </p>
                      </div>
                    )}
                    {result.data.detectedAnomalies && (
                      <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Anomalies
                        </p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {result.data.detectedAnomalies.length}
                        </p>
                      </div>
                    )}
                    {result.data.trendPredictions && (
                      <div className="bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-lg">
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Trends
                        </p>
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                          {result.data.trendPredictions.length}
                        </p>
                      </div>
                    )}
                    {result.data.recommendations && (
                      <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Recommendations
                        </p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {result.data.recommendations.length}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Detailed Results */}
                {result.data.similarFieldNotices && (
                  <ResultSection
                    title="Similar Field Notices"
                    icon="🔗"
                    items={result.data.similarFieldNotices}
                    expanded={expandedSection === 'similar'}
                    onToggle={() =>
                      setExpandedSection(
                        expandedSection === 'similar' ? null : 'similar'
                      )
                    }
                    renderItem={item => (
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {item.fieldNoticeId}: {item.similarityScore}%
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {item.justification}
                        </p>
                      </div>
                    )}
                  />
                )}

                {result.data.detectedAnomalies && (
                  <ResultSection
                    title="Detected Anomalies"
                    icon="⚠️"
                    items={result.data.detectedAnomalies}
                    expanded={expandedSection === 'anomalies'}
                    onToggle={() =>
                      setExpandedSection(
                        expandedSection === 'anomalies' ? null : 'anomalies'
                      )
                    }
                    renderItem={item => (
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {item.customerName} • Risk: {item.riskScore}/100
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {item.description}
                        </p>
                      </div>
                    )}
                  />
                )}

                {result.data.trendPredictions && (
                  <ResultSection
                    title="Trend Predictions"
                    icon="📈"
                    items={result.data.trendPredictions}
                    expanded={expandedSection === 'trends'}
                    onToggle={() =>
                      setExpandedSection(
                        expandedSection === 'trends' ? null : 'trends'
                      )
                    }
                    renderItem={item => (
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {item.period}: {item.direction}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Confidence: {item.confidence}%
                        </p>
                      </div>
                    )}
                  />
                )}

                {result.data.recommendations && (
                  <ResultSection
                    title="Recommendations"
                    icon="💡"
                    items={result.data.recommendations}
                    expanded={expandedSection === 'recommendations'}
                    onToggle={() =>
                      setExpandedSection(
                        expandedSection === 'recommendations'
                          ? null
                          : 'recommendations'
                      )
                    }
                    renderItem={item => (
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {item.title}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {item.description}
                        </p>
                      </div>
                    )}
                  />
                )}
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }
);

AnalysisResultsPanel.displayName = 'AnalysisResultsPanel';

/**
 * Result Section Component
 */
interface ResultSectionProps<T> {
  title: string;
  icon: string;
  items: T[];
  expanded: boolean;
  onToggle: () => void;
  renderItem: (item: T) => React.ReactNode;
}

const ResultSection = memo<ResultSectionProps<any>>(
  ({ title, icon, items, expanded, onToggle, renderItem }) => (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {title}
          </h3>
          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
            {items.length}
          </span>
        </div>
        <span className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {expanded && (
        <div className="px-4 py-3 space-y-3 bg-white dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
          {items.slice(0, 5).map((item, idx) => (
            <div key={idx} className="pb-3 border-b border-slate-200 dark:border-slate-700 last:pb-0 last:border-0">
              {renderItem(item)}
            </div>
          ))}
          {items.length > 5 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              ... and {items.length - 5} more
            </p>
          )}
        </div>
      )}
    </div>
  )
);

ResultSection.displayName = 'ResultSection';

export default {
  InteractiveCardWrapper,
  AnalysisResultsPanel,
  LoadingOverlay,
};
