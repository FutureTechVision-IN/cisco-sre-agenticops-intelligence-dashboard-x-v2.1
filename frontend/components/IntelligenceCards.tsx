
import React, { useMemo, useState } from 'react';
import { Anomaly, Prediction, Recommendation } from '../types';
import { Card, Badge } from './ui/Card';
import { AlertTriangle, TrendingUp, Sparkles, ChevronRight, Zap, Brain, Activity, Shield, Info } from 'lucide-react';
import { useAnomalyDetection, useTrendForecasting } from '../hooks/useAIEnhancement';
import CalculationMethodologyModal from './CalculationMethodologyModal';

interface AnomaliesProps {
  anomalies: Anomaly[];
  onSelect?: (anomaly: Anomaly) => void;
}

export const AnomaliesCard: React.FC<AnomaliesProps> = ({ anomalies, onSelect }) => {
  // AI/ML Enhancement: Use anomaly detection hook for enhanced insights
  const { enhanced: aiEnhancedAnomalies, isProcessing } = useAnomalyDetection(anomalies, 'medium');
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);

  // Merge AI insights with original anomalies
  const enrichedAnomalies = useMemo(() => {
    return anomalies.map((anomaly, index) => ({
      ...anomaly,
      aiInsight: aiEnhancedAnomalies[index]?.aiAnalysis,
      relatedPatterns: aiEnhancedAnomalies[index]?.additionalInsights?.relatedPatterns || []
    }));
  }, [anomalies, aiEnhancedAnomalies]);

  // Handler for comprehensive summary view
  const handleSummaryClick = () => {
    if (!onSelect || anomalies.length === 0) return;
    
    // Create a comprehensive summary insight
    const summaryInsight: Anomaly = {
      id: 'anomalies-summary',
      entity: `Anomaly Detection Summary (${anomalies.length} Alerts)`,
      severity: 'CRITICAL',
      riskScore: Math.max(...anomalies.map(a => a.riskScore)),
      details: `Comprehensive analysis of ${anomalies.length} detected anomalies across all monitored entities. Critical risk scores identified: ${anomalies.filter(a => a.riskScore >= 90).length} high-priority alerts requiring immediate attention.`,
      timestamp: new Date().toISOString(),
      description: `ML-enhanced anomaly detection identified ${anomalies.length} security events: ${anomalies.filter(a => a.severity === 'CRITICAL').length} CRITICAL, ${anomalies.filter(a => a.severity === 'HIGH').length} HIGH severity. Average risk score: ${Math.round(anomalies.reduce((acc, a) => acc + a.riskScore, 0) / anomalies.length)}/100. Top affected entities: ${anomalies.slice(0, 3).map(a => a.entity).join(', ')}.`,
      metadata: {
        totalAnomalies: anomalies.length,
        criticalCount: anomalies.filter(a => a.severity === 'CRITICAL').length,
        highCount: anomalies.filter(a => a.severity === 'HIGH').length,
        mediumCount: anomalies.filter(a => a.severity === 'MEDIUM').length,
        avgRiskScore: Math.round(anomalies.reduce((acc, a) => acc + a.riskScore, 0) / anomalies.length),
        maxRiskScore: Math.max(...anomalies.map(a => a.riskScore)),
        affectedEntities: anomalies.map(a => a.entity)
      }
    };
    
    console.log('[AnomaliesCard] Summary clicked, showing comprehensive view:', summaryInsight);
    onSelect(summaryInsight);
  };

  return (
    <>
      <Card className="flex flex-col h-full border-t-2 border-t-red-500/50 hover:shadow-lg hover:shadow-red-500/20 transition-all">
      <div className="p-5 border-b border-slate-700/50 flex items-center justify-between bg-red-900/10">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" size={22} />
          <div>
            <h3 className="font-bold text-red-100 tracking-widest uppercase text-base">Detected Anomalies</h3>
            <p className="text-xs text-red-400/80 font-bold uppercase tracking-wider mt-0.5">
              {anomalies.length} Alerts {isProcessing && <span className="animate-pulse">• AI Processing</span>}
            </p>
          </div>
        </div>
        {/* AI Badge + Methodology button */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMethodologyModal(true); }}
            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-300 hover:bg-slate-700/60 transition-all border border-transparent hover:border-slate-600/40 focus:outline-none focus:ring-1 focus:ring-rose-500/50"
            aria-label="View anomaly detection methodology"
            title="Detection Methodology"
          >
            <Info size={12} />
          </button>
          <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 rounded-full">
            <Brain size={12} className="text-red-400" />
            <span className="text-xs font-bold text-red-300 uppercase">ML Enhanced</span>
          </div>
        </div>
      </div>
      <div className="flex-1 p-2 space-y-2">
        {enrichedAnomalies.map(a => (
          <div 
            key={a.id} 
            onClick={(e) => {
              e.stopPropagation();
              console.log('[AnomaliesCard] Item clicked:', a);
              onSelect && onSelect(a);
            }}
            className="p-3 hover:bg-slate-700/50 cursor-pointer rounded border border-transparent hover:border-red-500/30 transition-all border-b border-slate-800/50 last:border-0 group relative overflow-hidden"
            role="button"
            aria-label={`View details for anomaly in ${a.entity}`}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelect && onSelect(a)}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold text-sm text-slate-100 group-hover:text-white transition-colors tracking-wide">{a.entity}</span>
              <ChevronRight size={16} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Badge color="red">{a.severity}</Badge>
              <span className="text-xs font-mono text-slate-300">
                Risk Score: <strong className="text-white">{a.riskScore}/100</strong>
              </span>
              {a.aiInsight && (
                <span className="text-xs font-mono text-cyan-400 flex items-center gap-1">
                  <Activity size={10} />
                  Z: {a.aiInsight.zScore.toFixed(2)}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 group-hover:text-slate-200 leading-snug border-l-2 border-red-500/30 pl-2">
              {a.details}
            </p>
            {/* Field Notice References */}
            {a.fieldNotices && a.fieldNotices.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {a.fieldNotices.map(fn => (
                  <span key={fn} className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full font-mono border border-blue-500/30">
                    {fn}
                  </span>
                ))}
              </div>
            )}
            {/* AI-generated insight */}
            {a.aiInsight && a.aiInsight.isAnomaly && (
              <div className="mt-2 text-xs text-red-300/80 bg-red-500/10 px-2 py-1 rounded flex items-center gap-1">
                <Shield size={10} />
                {a.aiInsight.confidence.toFixed(0)}% confidence • {Math.abs(a.aiInsight.deviation).toFixed(1)}% deviation
              </div>
            )}
            {/* Hover highlight */}
            <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-slate-700/50 text-center">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleSummaryClick();
          }}
          className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center justify-center w-full gap-1 uppercase tracking-wider transition-colors"
          aria-label="View comprehensive anomaly detection summary"
        >
          <Brain size={12} /> AI-Powered Detection • Click for details
        </button>
      </div>
    </Card>

      {/* Calculation Methodology Modal */}
      <CalculationMethodologyModal
        isOpen={showMethodologyModal}
        onClose={() => setShowMethodologyModal(false)}
        methodologyKey="anomalies"
      />
    </>
  );
};

interface PredictionsProps {
  predictions: Prediction[];
  onSelect?: (prediction: Prediction) => void;
}

export const PredictionsCard: React.FC<PredictionsProps> = ({ predictions, onSelect }) => {
  // AI/ML Enhancement: Use trend forecasting hook for enhanced predictions
  const { enhanced: aiForecastData, isProcessing } = useTrendForecasting(predictions, 7);
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);

  // Merge AI forecasts with original predictions
  const enrichedPredictions = useMemo(() => {
    return predictions.map((prediction, index) => ({
      ...prediction,
      aiForecast: aiForecastData[index]?.forecast,
      riskFactors: aiForecastData[index]?.additionalInsights?.riskFactors || [],
      opportunities: aiForecastData[index]?.additionalInsights?.opportunities || []
    }));
  }, [predictions, aiForecastData]);

  // Handler for comprehensive summary view
  const handleSummaryClick = () => {
    if (!onSelect || predictions.length === 0) return;
    
    // Create a comprehensive summary insight
    const summaryPrediction: Prediction = {
      id: 'predictions-summary',
      period: `Forecast Summary (${predictions.length} Periods)`,
      trend: predictions[0]?.trend || 'Rising',
      confidence: Math.round(predictions.reduce((acc, p) => acc + (p.confidence || 0), 0) / predictions.length * 100) / 100,
      description: `Comprehensive forecast analysis across ${predictions.length} time periods. Average confidence: ${Math.round(predictions.reduce((acc, p) => acc + (p.confidence || 0), 0) / predictions.length * 100)}%. Primary trends: ${predictions.filter(p => p.trend === 'Rising').length} rising, ${predictions.filter(p => p.trend === 'Falling').length} falling, ${predictions.filter(p => p.trend === 'Stable').length} stable forecasts.`,
      drivers: `Aggregated forecast drivers: ${predictions.map(p => p.drivers).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3).join('; ')}`,
      value: predictions.reduce((acc, p) => acc + (p.value || 0), 0),
      accuracy: Math.round(predictions.reduce((acc, p) => acc + (p.accuracy || 0), 0) / predictions.length),
      metadata: {
        totalForecasts: predictions.length,
        avgConfidence: Math.round(predictions.reduce((acc, p) => acc + (p.confidence || 0), 0) / predictions.length * 100),
        risingTrends: predictions.filter(p => p.trend === 'Rising').length,
        fallingTrends: predictions.filter(p => p.trend === 'Falling').length,
        stableTrends: predictions.filter(p => p.trend === 'Stable').length,
        forecastPeriods: predictions.map(p => p.period)
      }
    };
    
    console.log('[PredictionsCard] Summary clicked, showing comprehensive view:', summaryPrediction);
    onSelect(summaryPrediction);
  };

  return (
    <>
      <Card className="flex flex-col h-full border-t-2 border-t-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/20 transition-all">
      <div className="p-5 border-b border-slate-700/50 flex items-center justify-between bg-cyan-900/10">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" size={22} />
          <div>
            <h3 className="font-bold text-cyan-100 tracking-widest uppercase text-base">Trend Predictions</h3>
            <p className="text-xs text-cyan-400/80 font-bold uppercase tracking-wider mt-0.5">
              {predictions.length} Forecasts {isProcessing && <span className="animate-pulse">• ML Processing</span>}
            </p>
          </div>
        </div>
        {/* AI Badge + Methodology button */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMethodologyModal(true); }}
            className="p-1.5 rounded-lg text-slate-600 hover:text-cyan-300 hover:bg-slate-700/60 transition-all border border-transparent hover:border-slate-600/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            aria-label="View trend prediction methodology"
            title="Prediction Methodology"
          >
            <Info size={12} />
          </button>
          <div className="flex items-center gap-1 px-2 py-1 bg-cyan-500/20 rounded-full">
            <Brain size={12} className="text-cyan-400" />
            <span className="text-xs font-bold text-cyan-300 uppercase">Holt-Winters</span>
          </div>
        </div>
      </div>
      <div className="flex-1 p-2 space-y-2">
        {enrichedPredictions.map(p => (
          <div 
            key={p.id} 
            onClick={(e) => {
              e.stopPropagation();
              console.log('[PredictionsCard] Item clicked:', p);
              onSelect && onSelect(p);
            }}
            className="p-3 hover:bg-slate-700/50 cursor-pointer rounded border border-transparent hover:border-cyan-500/30 transition-all border-b border-slate-800/50 last:border-0 group relative overflow-hidden"
            role="button"
            aria-label={`View forecast details for ${p.period}`}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelect && onSelect(p)}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-base text-white">{p.period}</span>
              <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                {p.aiForecast?.trend === 'RISING' ? '▲' : p.aiForecast?.trend === 'FALLING' ? '▼' : '●'} {p.trend === 'RISING' ? 'Rising' : p.trend}
              </div>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-300 uppercase tracking-wider">
                Confidence: <span className="text-cyan-300 font-bold">{p.confidence.toFixed(1)}%</span>
              </span>
              {p.aiForecast && (
                <span className="text-xs text-purple-400 flex items-center gap-1">
                  <Activity size={10} />
                  Accuracy: {p.aiForecast.accuracy.toFixed(0)}%
                </span>
              )}
            </div>
            <p className="text-sm text-slate-200 group-hover:text-white leading-snug mb-2 font-medium">{p.description}</p>
            <p className="text-xs text-slate-400 leading-snug italic border-l-2 border-cyan-500/30 pl-2">
              {p.drivers}
            </p>
            {/* Field Notice References */}
            {p.fieldNotices && p.fieldNotices.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {p.fieldNotices.map(fn => (
                  <span key={fn} className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full font-mono border border-blue-500/30">
                    {fn}
                  </span>
                ))}
              </div>
            )}
            {/* AI-generated forecast insight */}
            {p.aiForecast && (
              <div className="mt-2 text-xs text-cyan-300/80 bg-cyan-500/10 px-2 py-1 rounded flex items-center gap-1">
                <TrendingUp size={10} />
                {p.aiForecast.methodology} • Trend Strength: {p.aiForecast.trendStrength.toFixed(1)}%
                {p.aiForecast.seasonality.detected && ' • Seasonality Detected'}
              </div>
            )}
            <ChevronRight size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            {/* Hover highlight */}
            <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-slate-700/50 text-center">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleSummaryClick();
          }}
          className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center justify-center w-full gap-1 uppercase tracking-wider transition-colors"
          aria-label="View comprehensive forecast summary"
        >
          <Brain size={12} /> Exponential Smoothing • Click for details
        </button>
      </div>
    </Card>

      {/* Calculation Methodology Modal */}
      <CalculationMethodologyModal
        isOpen={showMethodologyModal}
        onClose={() => setShowMethodologyModal(false)}
        methodologyKey="predictions"
      />
    </>
  );
};

interface RecommendationsProps {
  recommendations: Recommendation[];
  onSelect?: (recommendation: Recommendation) => void;
}

export const RecommendationsCard: React.FC<RecommendationsProps> = ({ recommendations, onSelect }) => {
  // AI/ML Enhancement: Calculate priority scores for recommendations
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);
  const enrichedRecommendations = useMemo(() => {
    return recommendations.map(rec => {
      let aiPriorityScore = 50;
      if (rec.priority === 'CRITICAL') aiPriorityScore = 95;
      else if (rec.priority === 'HIGH') aiPriorityScore = 75;
      else if (rec.priority === 'MEDIUM') aiPriorityScore = 55;
      
      return {
        ...rec,
        aiPriorityScore,
        implementationComplexity: rec.category.toLowerCase().includes('patch') ? 'LOW' : 
          rec.category.toLowerCase().includes('upgrade') ? 'HIGH' : 'MEDIUM',
        estimatedImpact: rec.priority === 'CRITICAL' ? 'High' : rec.priority === 'HIGH' ? 'Significant' : 'Moderate'
      };
    });
  }, [recommendations]);

  // Handler for comprehensive summary view
  const handleSummaryClick = () => {
    if (!onSelect || recommendations.length === 0) return;
    
    // Create a comprehensive summary insight
    const summaryRecommendation: Recommendation = {
      id: 'recommendations-summary',
      priority: 'CRITICAL',
      category: `Action Plan Summary (${recommendations.length} Items)`,
      action: `Comprehensive remediation strategy covering ${recommendations.length} prioritized recommendations. ${recommendations.filter(r => r.priority === 'CRITICAL').length} critical actions, ${recommendations.filter(r => r.priority === 'HIGH').length} high-priority tasks, ${recommendations.filter(r => r.priority === 'MEDIUM').length} medium-priority items.`,
      estimatedImpact: 'Critical',
      implementationComplexity: 'MEDIUM',
      description: `AI-ranked action plan aggregating ${recommendations.length} security recommendations across multiple categories: ${recommendations.map(r => r.category).filter((v, i, a) => a.indexOf(v) === i).join(', ')}. Prioritized by risk impact, urgency, and implementation feasibility.`,
      metadata: {
        totalRecommendations: recommendations.length,
        criticalCount: recommendations.filter(r => r.priority === 'CRITICAL').length,
        highCount: recommendations.filter(r => r.priority === 'HIGH').length,
        mediumCount: recommendations.filter(r => r.priority === 'MEDIUM').length,
        categories: recommendations.map(r => r.category).filter((v, i, a) => a.indexOf(v) === i),
        avgPriorityScore: Math.round(enrichedRecommendations.reduce((acc, r) => acc + r.aiPriorityScore, 0) / enrichedRecommendations.length)
      }
    };
    
    console.log('[RecommendationsCard] Summary clicked, showing comprehensive view:', summaryRecommendation);
    onSelect(summaryRecommendation);
  };

  return (
    <>
      <Card className="flex flex-col h-full border-t-2 border-t-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/20 transition-all">

      <div className="p-5 border-b border-slate-700/50 flex items-center justify-between bg-emerald-900/10">
        <div className="flex items-center gap-2">
          <Sparkles className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" size={22} />
          <div>
            <h3 className="font-bold text-emerald-100 tracking-widest uppercase text-base">Top Recommendations</h3>
            <p className="text-xs text-emerald-400/80 font-bold uppercase tracking-wider mt-0.5">{recommendations.length} Actions prioritized by AI</p>
          </div>
        </div>
        {/* AI Badge + Methodology button */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMethodologyModal(true); }}
            className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-300 hover:bg-slate-700/60 transition-all border border-transparent hover:border-slate-600/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            aria-label="View AI recommendation scoring methodology"
            title="Recommendation Methodology"
          >
            <Info size={12} />
          </button>
          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 rounded-full">
            <Brain size={12} className="text-emerald-400" />
            <span className="text-xs font-bold text-emerald-300 uppercase">AI Ranked</span>
          </div>
        </div>
      </div>
      <div className="flex-1 p-2 space-y-2">
        {enrichedRecommendations.map((r, index) => (
          <div 
            key={r.id} 
            onClick={(e) => {
              e.stopPropagation();
              console.log('[RecommendationsCard] Item clicked:', r);
              onSelect && onSelect(r);
            }}
            className="p-3 hover:bg-slate-700/50 cursor-pointer rounded border border-transparent hover:border-emerald-500/30 transition-all border-b border-slate-800/50 last:border-0 group relative overflow-hidden"
            role="button"
            aria-label={`View recommendation details for ${r.category}`}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelect && onSelect(r)}
          >
            <div className="flex flex-col gap-1 mb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Badge color={r.priority === 'CRITICAL' ? 'red' : 'amber'} className="w-fit">{r.priority}</Badge>
                  {/* AI Priority Rank */}
                  <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                    #{index + 1} • {r.aiPriorityScore}pts
                  </span>
                </div>
                <Zap size={14} className="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider group-hover:text-white transition-colors">{r.category}</span>
            </div>
            <p className="text-sm text-slate-200 group-hover:text-white leading-snug">{r.action}</p>
            {/* Field Notice References */}
            {r.fieldNotices && r.fieldNotices.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {r.fieldNotices.map(fn => (
                  <span key={fn} className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full font-mono border border-blue-500/30">
                    {fn}
                  </span>
                ))}
              </div>
            )}
            {/* AI-generated insight */}
            <div className="mt-2 text-xs text-emerald-300/80 bg-emerald-500/10 px-2 py-1 rounded flex items-center gap-2">
              <Shield size={10} />
              <span>Impact: {r.estimatedImpact}</span>
              <span>•</span>
              <span>Complexity: {r.implementationComplexity}</span>
            </div>
            {/* Hover highlight */}
            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-slate-700/50 text-center">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleSummaryClick();
          }}
          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center justify-center w-full gap-1 uppercase tracking-wider transition-colors"
          aria-label="View comprehensive recommendations summary"
        >
          <Brain size={12} /> Intelligent Prioritization • Click for details
        </button>
      </div>
    </Card>

      {/* Calculation Methodology Modal */}
      <CalculationMethodologyModal
        isOpen={showMethodologyModal}
        onClose={() => setShowMethodologyModal(false)}
        methodologyKey="recommendations"
      />
    </>
  );
};
