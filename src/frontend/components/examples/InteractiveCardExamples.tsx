/**
 * Interactive Card Examples
 * 
 * Demonstrates various usage patterns for the InteractiveCardWrapper component
 * with different card types and AI/ML capabilities.
 * 
 * @module InteractiveCardExamples
 */

import React, { useState } from 'react';
import { InteractiveCardWrapper, type CardData, type AIProcessingResult } from '../InteractiveCardWrapper';
import { MetricCard } from '../MetricCard';
import { AnomaliesCard, PredictionsCard, RecommendationsCard } from '../IntelligenceCards';
import { KPICardInteractive } from '../KPICardInteractive';
import type { Metric, Anomaly, Prediction, Recommendation } from '../../types';

// ==========================================
// EXAMPLE 1: Basic Metric Card with AI
// ==========================================

export const InteractiveMetricCardExample: React.FC<{ metric: Metric }> = ({ metric }) => {
  const cardData: CardData = {
    id: metric.id,
    type: 'metric',
    title: metric.label,
    data: metric,
    metadata: {
      timestamp: new Date().toISOString(),
      source: 'dashboard',
    },
  };

  // Custom AI processing handler
  const handleAIProcess = async (data: CardData): Promise<AIProcessingResult> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate insights based on metric type
    const insights = [
      `${data.title} shows a ${metric.trend && metric.trend > 0 ? 'positive' : 'negative'} trend of ${Math.abs(metric.trend || 0)}%`,
      `Current value of ${metric.value.toLocaleString()} is ${metric.percentage}% of the target`,
      `Historical analysis indicates ${metric.value > 1000000 ? 'high' : 'moderate'} impact level`,
    ];
    
    const recommendations = [
      metric.percentage && metric.percentage < 80 
        ? 'Consider increasing security measures to improve this metric'
        : 'Maintain current security protocols',
      'Schedule quarterly review of asset vulnerability assessments',
      'Implement automated monitoring for real-time alerts',
    ];
    
    return {
      success: true,
      insights,
      recommendations,
      metadata: {
        processingTime: 1500,
        model: 'metric-analyzer-v1',
        confidence: 92.5,
      },
    };
  };

  return (
    <InteractiveCardWrapper
      cardData={cardData}
      onAIProcess={handleAIProcess}
      ariaLabel={`Analyze ${metric.label} with AI`}
      showAIBadge={true}
      enableTouch={true}
      enableKeyboard={true}
    >
      <MetricCard metric={metric} onClick={() => console.log('Metric clicked')} />
    </InteractiveCardWrapper>
  );
};

// ==========================================
// EXAMPLE 2: Anomaly Card with API Integration
// ==========================================

export const InteractiveAnomalyCardExample: React.FC<{ anomalies: Anomaly[] }> = ({ anomalies }) => {
  const cardData: CardData = {
    id: 'anomalies-card',
    type: 'anomaly',
    title: 'Anomaly Detection',
    data: anomalies,
    metadata: {
      detectionMethod: 'z-score',
      sensitivity: 'high',
    },
  };

  return (
    <InteractiveCardWrapper
      cardData={cardData}
      aiProcessingEndpoint="/api/ai/analyze-anomalies"
      ariaLabel="Analyze detected anomalies with AI"
    >
      <AnomaliesCard 
        anomalies={anomalies} 
        onSelect={(a) => console.log('Anomaly selected:', a)}
      />
    </InteractiveCardWrapper>
  );
};

// ==========================================
// EXAMPLE 3: Prediction Card with Custom Visualization
// ==========================================

export const InteractivePredictionCardExample: React.FC<{ predictions: Prediction[] }> = ({ predictions }) => {
  const cardData: CardData = {
    id: 'predictions-card',
    type: 'prediction',
    title: 'Trend Predictions',
    data: predictions,
    metadata: {
      forecastMethod: 'holt-winters',
      horizon: 7,
    },
  };

  const handleAIProcess = async (data: CardData): Promise<AIProcessingResult> => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const insights = [
      'Vulnerability trend analysis indicates 15% increase over next 30 days',
      'Seasonal pattern detected with peak periods during month-end',
      'Confidence interval: 87-93% for 7-day forecast',
    ];
    
    const recommendations = [
      'Increase security patching frequency during projected peak periods',
      'Allocate additional resources for vulnerability remediation',
      'Implement predictive alerting based on trend forecasts',
    ];
    
    // Include visualization data
    const visualizations = [
      {
        type: 'line-chart',
        data: predictions.map(p => ({
          period: p.period,
          value: 100 + Math.random() * 50,
          confidence: p.confidence,
        })),
      },
    ];
    
    return {
      success: true,
      insights,
      recommendations,
      visualizations,
      metadata: {
        processingTime: 2000,
        model: 'forecast-engine-v2',
        confidence: 89.3,
      },
    };
  };

  return (
    <InteractiveCardWrapper
      cardData={cardData}
      onAIProcess={handleAIProcess}
      ariaLabel="Analyze trend predictions with AI"
      debounceMs={500}
    >
      <PredictionsCard 
        predictions={predictions} 
        onSelect={(p) => console.log('Prediction selected:', p)}
      />
    </InteractiveCardWrapper>
  );
};

// ==========================================
// EXAMPLE 4: KPI Card with Field Notice Analysis
// ==========================================

export const InteractiveKPICardExample: React.FC<{ 
  fieldNoticeId: string;
  fieldNoticeTitle: string;
  fieldNotices?: any[];
}> = ({ fieldNoticeId, fieldNoticeTitle, fieldNotices }) => {
  const cardData: CardData = {
    id: `kpi-${fieldNoticeId}`,
    type: 'kpi',
    title: fieldNoticeTitle,
    data: {
      fieldNoticeId,
      fieldNoticeTitle,
      fieldNotices,
    },
    metadata: {
      analysisType: 'key-account-ratio',
      includeComparison: true,
    },
  };

  const handleAIProcess = async (data: CardData): Promise<AIProcessingResult> => {
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const insights = [
      `Field Notice ${fieldNoticeId} impacts 801 key accounts with 72,111 vulnerabilities`,
      'Average risk score is 2.0/100 across all affected accounts',
      'Top affected account: JELA (CONTACT FOBUTTRY) with risk score 100/100',
      'Geographic distribution shows 60% concentration in EMEA region',
    ];
    
    const recommendations_enhanced = [
      'Prioritize remediation for 480 accounts with risk scores >75',
      'Implement targeted communication plan for critical infrastructure customers',
      'Schedule emergency patching window for top 10 affected accounts',
      'Deploy automated vulnerability scanning for affected device types',
    ];
    
    // Include field notice comparison data
    const visualizations = [
      {
        type: 'bar-chart',
        data: [
          { category: 'Critical', count: 162 },
          { category: 'High', count: 319 },
          { category: 'Medium', count: 240 },
          { category: 'Low', count: 80 },
        ],
      },
    ];
    
    return {
      success: true,
      insights,
      recommendations: recommendations_enhanced,
      visualizations,
      metadata: {
        processingTime: 2500,
        model: 'field-notice-analyzer-v3',
        confidence: 91.2,
      },
    };
  };

  return (
    <InteractiveCardWrapper
      cardData={cardData}
      onAIProcess={handleAIProcess}
      ariaLabel={`Analyze ${fieldNoticeTitle} with AI`}
      debounceMs={400}
    >
      <KPICardInteractive
        fieldNoticeId={fieldNoticeId}
        fieldNoticeTitle={fieldNoticeTitle}
        fieldNotices={fieldNotices}
      />
    </InteractiveCardWrapper>
  );
};

export default {
  InteractiveMetricCardExample,
  InteractiveAnomalyCardExample,
  InteractivePredictionCardExample,
  InteractiveKPICardExample,
};
