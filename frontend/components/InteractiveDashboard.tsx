/**
 * Complete Interactive Dashboard Implementation
 * 
 * Demonstrates full integration of AI/ML interactive cards:
 * - All three card types (Anomalies, Trends, Recommendations)
 * - Shared results state management
 * - Modal result display
 * - Error handling
 * - Loading states
 * 
 * @module frontend/components/InteractiveDashboard
 * @version 1.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import { InteractiveCardWrapper, AnalysisResultsPanel, type AnalysisResult } from './AIMLCardIntegration';
import { AlertCircle, Zap, TrendingUp, Lightbulb } from 'lucide-react';

/**
 * Mock KPI Card Components (replace with actual implementations)
 */
const MockAnomaliesCard: React.FC<any> = ({ anomalies, isLoading, onRefresh }) => (
  <div className="h-full flex flex-col">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-red-500" />
        <h3 className="font-semibold text-slate-900 dark:text-white">Detected Anomalies</h3>
      </div>
      <span className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-full text-sm font-semibold">
        {anomalies?.length || 0}
      </span>
    </div>

    <div className="flex-1 space-y-3 overflow-y-auto">
      {anomalies && anomalies.slice(0, 3).map((anomaly: any, idx: number) => (
        <div
          key={idx}
          className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <p className="font-medium text-slate-900 dark:text-white text-sm">
            {anomaly.customerName || `Anomaly ${idx + 1}`}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Risk Score: <span className="font-semibold">{anomaly.riskScore || 95}/100</span>
            </span>
            <span className="text-xs px-2 py-1 bg-red-200 dark:bg-red-900 text-red-700 dark:text-red-200 rounded font-semibold">
              CRITICAL
            </span>
          </div>
        </div>
      ))}

      {!anomalies || anomalies.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">
          No anomalies detected
        </p>
      )}
    </div>

    <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
      AI-Powered Detection • Click for details
    </p>
  </div>
);

const MockTrendsCard: React.FC<any> = ({ forecasts, isLoading }) => (
  <div className="h-full flex flex-col">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-yellow-500" />
        <h3 className="font-semibold text-slate-900 dark:text-white">Trend Predictions</h3>
      </div>
      <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 rounded-full text-sm font-semibold">
        {forecasts?.length || 0}
      </span>
    </div>

    <div className="flex-1 space-y-3 overflow-y-auto">
      {forecasts && forecasts.slice(0, 2).map((forecast: any, idx: number) => (
        <div
          key={idx}
          className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <p className="font-medium text-slate-900 dark:text-white text-sm">
              {forecast.period || `Period ${idx + 1}`}
            </p>
            <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
              ↗ Rising
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
            Confidence: <span className="font-semibold">{forecast.confidence || 92}%</span>
          </p>
        </div>
      ))}

      {!forecasts || forecasts.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">
          No trend data available
        </p>
      )}
    </div>

    <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
      Holt-Winters Algorithm • Click for details
    </p>
  </div>
);

const MockRecommendationsCard: React.FC<any> = ({ recommendations, isLoading }) => (
  <div className="h-full flex flex-col">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-green-500" />
        <h3 className="font-semibold text-slate-900 dark:text-white">Top Recommendations</h3>
      </div>
      <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-full text-sm font-semibold">
        {recommendations?.length || 0}
      </span>
    </div>

    <div className="flex-1 space-y-3 overflow-y-auto">
      {recommendations && recommendations.slice(0, 3).map((rec: any, idx: number) => (
        <div
          key={idx}
          className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg"
        >
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-green-600 text-white rounded-full text-xs font-bold">
              {rec.rank || idx + 1}
            </span>
            <div className="flex-1">
              <p className="font-medium text-slate-900 dark:text-white text-sm">
                {rec.title || `Recommendation ${idx + 1}`}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Impact: <span className="font-semibold">{rec.impact || 'High'}</span>
              </p>
            </div>
          </div>
        </div>
      ))}

      {!recommendations || recommendations.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400 italic">
          No recommendations available
        </p>
      )}
    </div>

    <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
      AI Ranked Recommendations • Click for details
    </p>
  </div>
);

/**
 * Main Interactive Dashboard Component
 */
export interface InteractiveDashboardProps {
  anomaliesData?: any[];
  trendsData?: any[];
  recommendationsData?: any[];
  onCardAnalysis?: (cardType: string, result: AnalysisResult) => void;
  showDebugInfo?: boolean;
}

export const InteractiveDashboard: React.FC<InteractiveDashboardProps> = ({
  anomaliesData = mockAnomaliesData,
  trendsData = mockTrendsData,
  recommendationsData = mockRecommendationsData,
  onCardAnalysis,
  showDebugInfo = false,
}) => {
  // Active analysis result
  const [activeResult, setActiveResult] = useState<AnalysisResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Analysis history
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);

  /**
   * Handle analysis completion
   */
  const handleAnalysisComplete = useCallback((cardType: string) => (result: AnalysisResult) => {
    // Set active result
    setActiveResult(result);
    setShowResults(true);

    // Add to history
    setAnalysisHistory(prev => [result, ...prev].slice(0, 10));

    // Call parent callback if provided
    onCardAnalysis?.(cardType, result);
  }, [onCardAnalysis]);

  /**
   * Handle analysis error
   */
  const handleAnalysisError = useCallback((cardType: string) => (error: Error) => {
    console.error(`Analysis error for ${cardType}:`, error);
  }, []);

  /**
   * Recent analyses summary
   */
  const recentAnalysesSummary = useMemo(() => {
    if (!analysisHistory.length) return null;

    const successCount = analysisHistory.filter(r => r.status === 'success').length;
    const errorCount = analysisHistory.filter(r => r.status === 'error').length;
    const avgTime = analysisHistory.reduce((sum, r) => sum + r.executionTimeMs, 0) / analysisHistory.length;

    return { successCount, errorCount, avgTime };
  }, [analysisHistory]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            AI/ML Interactive Analytics Dashboard
          </h1>
        </div>
        <p className="text-slate-600 dark:text-slate-400">
          Click any card below to trigger AI/ML analysis and view comprehensive insights
        </p>
      </div>

      {/* Statistics Bar */}
      {recentAnalysesSummary && (
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
            <p className="text-sm text-slate-600 dark:text-slate-400">Successful Analyses</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {recentAnalysesSummary.successCount}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
            <p className="text-sm text-slate-600 dark:text-slate-400">Failed Analyses</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {recentAnalysesSummary.errorCount}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
            <p className="text-sm text-slate-600 dark:text-slate-400">Avg. Response Time</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {Math.round(recentAnalysesSummary.avgTime)}ms
            </p>
          </div>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Anomalies Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
          <InteractiveCardWrapper
            cardType="anomalies"
            cardTitle="Detected Anomalies"
            cardData={anomaliesData}
            onAnalysisStart={() => console.log('Anomalies analysis started')}
            onAnalysisComplete={handleAnalysisComplete('anomalies')}
            onAnalysisError={handleAnalysisError('anomalies')}
            showHint={true}
            debounceMs={300}
          >
            <MockAnomaliesCard
              anomalies={anomaliesData}
              isLoading={false}
              onRefresh={() => {}}
            />
          </InteractiveCardWrapper>
        </div>

        {/* Trends Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
          <InteractiveCardWrapper
            cardType="trends"
            cardTitle="Trend Predictions"
            cardData={trendsData}
            onAnalysisStart={() => console.log('Trends analysis started')}
            onAnalysisComplete={handleAnalysisComplete('trends')}
            onAnalysisError={handleAnalysisError('trends')}
            showHint={true}
            debounceMs={300}
          >
            <MockTrendsCard
              forecasts={trendsData}
              isLoading={false}
            />
          </InteractiveCardWrapper>
        </div>

        {/* Recommendations Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-md">
          <InteractiveCardWrapper
            cardType="recommendations"
            cardTitle="Top Recommendations"
            cardData={recommendationsData}
            onAnalysisStart={() => console.log('Recommendations analysis started')}
            onAnalysisComplete={handleAnalysisComplete('recommendations')}
            onAnalysisError={handleAnalysisError('recommendations')}
            showHint={true}
            debounceMs={300}
          >
            <MockRecommendationsCard
              recommendations={recommendationsData}
              isLoading={false}
            />
          </InteractiveCardWrapper>
        </div>
      </div>

      {/* Debug Info (if enabled) */}
      {showDebugInfo && analysisHistory.length > 0 && (
        <div className="mt-8 bg-slate-900 rounded-lg p-4 text-white font-mono text-xs max-h-48 overflow-y-auto">
          <p className="text-cyan-400 mb-2">Analysis History (last 5):</p>
          {analysisHistory.slice(0, 5).map((result, idx) => (
            <div key={idx} className="text-gray-400 mb-1">
              {new Date(result.timestamp).toLocaleTimeString()} - {result.cardType} ({result.status}) - {result.executionTimeMs}ms
            </div>
          ))}
        </div>
      )}

      {/* Results Modal */}
      {showResults && activeResult && (
        <AnalysisResultsPanel
          result={activeResult}
          cardTitle={`${activeResult.cardType.charAt(0).toUpperCase() + activeResult.cardType.slice(1)} Analysis`}
          onClose={() => setShowResults(false)}
        />
      )}
    </div>
  );
};

/**
 * Mock Data
 */
const mockAnomaliesData = [
  {
    customerName: 'DUKE ENERGY',
    riskScore: 100,
    severity: 'CRITICAL',
    description: '294 vulnerabilities found — 279 above the normal baseline',
  },
  {
    customerName: 'SCOTIABANK',
    riskScore: 100,
    severity: 'CRITICAL',
    description: '339 vulnerabilities found — 326 above the normal baseline',
  },
  {
    customerName: 'BRISTOL MYERS SQUIBB',
    riskScore: 100,
    severity: 'CRITICAL',
    description: '11 vulnerabilities found — 10 above the normal baseline',
  },
];

const mockTrendsData = [
  {
    period: '2025-01',
    direction: 'Rising',
    confidence: 92,
    accuracy: 70,
    projectedValue: 27651340,
    drivers: 'Software vulnerabilities trending upward, Hardware vulnerabilities stabilizing',
  },
  {
    period: '2025-02',
    direction: 'Rising',
    confidence: 88,
    accuracy: 70,
    projectedValue: 28000000,
    drivers: 'New vulnerability disclosures, Customer infrastructure growth',
  },
];

const mockRecommendationsData = [
  {
    rank: 1,
    title: 'Customer Priority',
    category: 'CRITICAL',
    points: 95,
    impact: 'High',
    complexity: 'MEDIUM',
    description: 'Immediate engagement with WELLS FARGO, HCA HEALTHCARE, MORGAN STANLEY',
  },
  {
    rank: 2,
    title: 'Vulnerability Management',
    category: 'HIGH',
    points: 75,
    impact: 'Significant',
    complexity: 'MEDIUM',
    description: 'Focus remediation efforts on critical vulnerabilities',
  },
  {
    rank: 3,
    title: 'Enhanced Monitoring',
    category: 'HIGH',
    points: 75,
    impact: 'Significant',
    complexity: 'MEDIUM',
    description: 'Implement monitoring for 689 customers with extreme patterns',
  },
];

export default InteractiveDashboard;
