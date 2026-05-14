/**
 * useAIEnhancement Hook
 * 
 * Custom React hook for integrating AI/ML enhancements into dashboard components.
 * Provides real-time data processing, anomaly detection, and trend forecasting.
 * 
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  AIMLEnhancementService, 
  RealTimeProcessor,
  type EnhancedAnomalyData,
  type EnhancedPredictionData,
  type EnhancedRecommendationData,
  type KPIEnhancement
} from '../services/aiMLService';
import type { Anomaly, Prediction, Recommendation, Metric } from '../types';

// ==================== TYPES ====================

export interface AIEnhancementState {
  isProcessing: boolean;
  lastProcessed: Date | null;
  processedCount: number;
  errors: string[];
}

export interface UseAIEnhancementOptions {
  enableRealTime?: boolean;
  refreshInterval?: number;  // ms
  sensitivity?: 'low' | 'medium' | 'high';
  forecastHorizon?: number;  // days
}

export interface AIEnhancedData {
  anomalies: EnhancedAnomalyData[];
  predictions: EnhancedPredictionData[];
  recommendations: EnhancedRecommendationData[];
  kpiEnhancements: Map<string, KPIEnhancement>;
  state: AIEnhancementState;
}

// ==================== SINGLETON SERVICE ====================

let aiServiceInstance: AIMLEnhancementService | null = null;
let realTimeProcessorInstance: RealTimeProcessor | null = null;

const getAIService = (): AIMLEnhancementService => {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIMLEnhancementService();
  }
  return aiServiceInstance;
};

const getRealTimeProcessor = (): RealTimeProcessor => {
  if (!realTimeProcessorInstance) {
    realTimeProcessorInstance = new RealTimeProcessor();
  }
  return realTimeProcessorInstance;
};

// ==================== MAIN HOOK ====================

export const useAIEnhancement = (
  data: {
    anomalies?: Anomaly[];
    predictions?: Prediction[];
    recommendations?: Recommendation[];
    metrics?: Metric[];
  },
  options: UseAIEnhancementOptions = {}
): AIEnhancedData => {
  const {
    enableRealTime = true,
    refreshInterval = 30000,
    sensitivity = 'medium',
    forecastHorizon = 7
  } = options;

  const aiService = getAIService();
  const realTimeProcessor = getRealTimeProcessor();

  const [enhancedAnomalies, setEnhancedAnomalies] = useState<EnhancedAnomalyData[]>([]);
  const [enhancedPredictions, setEnhancedPredictions] = useState<EnhancedPredictionData[]>([]);
  const [enhancedRecommendations, setEnhancedRecommendations] = useState<EnhancedRecommendationData[]>([]);
  const [kpiEnhancements, setKpiEnhancements] = useState<Map<string, KPIEnhancement>>(new Map());
  const [state, setState] = useState<AIEnhancementState>({
    isProcessing: false,
    lastProcessed: null,
    processedCount: 0,
    errors: []
  });

  const processingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Process anomalies with AI enhancement
  const processAnomalies = useCallback(() => {
    if (!data.anomalies || data.anomalies.length === 0) return;

    try {
      const enhanced = data.anomalies.map(anomaly => 
        aiService.enhanceAnomalyData(anomaly, sensitivity)
      );
      setEnhancedAnomalies(enhanced);
    } catch (error) {
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, `Anomaly processing error: ${error}`]
      }));
    }
  }, [data.anomalies, aiService, sensitivity]);

  // Process predictions with AI enhancement
  const processPredictions = useCallback(() => {
    if (!data.predictions || data.predictions.length === 0) return;

    try {
      const enhanced = data.predictions.map(prediction => 
        aiService.enhancePredictionData(prediction, forecastHorizon)
      );
      setEnhancedPredictions(enhanced);
    } catch (error) {
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, `Prediction processing error: ${error}`]
      }));
    }
  }, [data.predictions, aiService, forecastHorizon]);

  // Process recommendations with AI enhancement
  const processRecommendations = useCallback(() => {
    if (!data.recommendations || data.recommendations.length === 0) return;

    try {
      const enhanced = data.recommendations.map(recommendation => 
        aiService.enhanceRecommendationData(recommendation)
      );
      setEnhancedRecommendations(enhanced);
    } catch (error) {
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, `Recommendation processing error: ${error}`]
      }));
    }
  }, [data.recommendations, aiService]);

  // Process KPI metrics with AI enhancement
  const processMetrics = useCallback(() => {
    if (!data.metrics || data.metrics.length === 0) return;

    try {
      const enhancementsMap = new Map<string, KPIEnhancement>();
      
      data.metrics.forEach(metric => {
        const enhancement = aiService.getKPIEnhancements(
          metric.id,
          metric.history || [],
          { sensitivity, forecastHorizon }
        );
        enhancementsMap.set(metric.id, enhancement);
      });
      
      setKpiEnhancements(enhancementsMap);
    } catch (error) {
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, `KPI processing error: ${error}`]
      }));
    }
  }, [data.metrics, aiService, sensitivity, forecastHorizon]);

  // Main processing function
  const processAllData = useCallback(async () => {
    if (processingRef.current) return;
    
    processingRef.current = true;
    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      processAnomalies();
      processPredictions();
      processRecommendations();
      processMetrics();

      setState(prev => ({
        ...prev,
        isProcessing: false,
        lastProcessed: new Date(),
        processedCount: prev.processedCount + 1
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isProcessing: false,
        errors: [...prev.errors, `Processing error: ${error}`]
      }));
    } finally {
      processingRef.current = false;
    }
  }, [processAnomalies, processPredictions, processRecommendations, processMetrics]);

  // Initial processing
  useEffect(() => {
    processAllData();
  }, [data.anomalies, data.predictions, data.recommendations, data.metrics]);

  // Real-time processing setup
  useEffect(() => {
    if (!enableRealTime) return;

    // Set up data change callback
    const handleDataChange = () => {
      processAllData();
    };

    realTimeProcessor.subscribe('all', handleDataChange);

    // Set up interval for periodic refresh
    intervalRef.current = setInterval(() => {
      processAllData();
    }, refreshInterval);

    return () => {
      realTimeProcessor.unsubscribe('all', handleDataChange);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enableRealTime, refreshInterval, processAllData, realTimeProcessor]);

  return {
    anomalies: enhancedAnomalies,
    predictions: enhancedPredictions,
    recommendations: enhancedRecommendations,
    kpiEnhancements,
    state
  };
};

// ==================== SPECIALIZED HOOKS ====================

/**
 * Hook for anomaly detection only
 */
export const useAnomalyDetection = (
  anomalies: Anomaly[],
  sensitivity: 'low' | 'medium' | 'high' = 'medium'
): { enhanced: EnhancedAnomalyData[]; isProcessing: boolean } => {
  const [enhanced, setEnhanced] = useState<EnhancedAnomalyData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!anomalies || anomalies.length === 0) return;

    setIsProcessing(true);
    const aiService = getAIService();

    try {
      const result = anomalies.map(a => aiService.enhanceAnomalyData(a, sensitivity));
      setEnhanced(result);
    } catch (error) {
      console.error('Anomaly detection error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [anomalies, sensitivity]);

  return { enhanced, isProcessing };
};

/**
 * Hook for trend forecasting only
 */
export const useTrendForecasting = (
  predictions: Prediction[],
  horizonDays: number = 7
): { enhanced: EnhancedPredictionData[]; isProcessing: boolean } => {
  const [enhanced, setEnhanced] = useState<EnhancedPredictionData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!predictions || predictions.length === 0) return;

    setIsProcessing(true);
    const aiService = getAIService();

    try {
      const result = predictions.map(p => aiService.enhancePredictionData(p, horizonDays));
      setEnhanced(result);
    } catch (error) {
      console.error('Trend forecasting error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [predictions, horizonDays]);

  return { enhanced, isProcessing };
};

/**
 * Hook for KPI enhancement
 */
export const useKPIEnhancement = (
  metrics: Metric[],
  options?: { sensitivity?: 'low' | 'medium' | 'high'; forecastHorizon?: number }
): { enhancements: Map<string, KPIEnhancement>; isProcessing: boolean } => {
  const [enhancements, setEnhancements] = useState<Map<string, KPIEnhancement>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);

  const { sensitivity = 'medium', forecastHorizon = 7 } = options || {};

  useEffect(() => {
    if (!metrics || metrics.length === 0) return;

    setIsProcessing(true);
    const aiService = getAIService();

    try {
      const enhancementsMap = new Map<string, KPIEnhancement>();
      
      metrics.forEach(metric => {
        const enhancement = aiService.getKPIEnhancements(
          metric.id,
          metric.history || [],
          { sensitivity, forecastHorizon }
        );
        enhancementsMap.set(metric.id, enhancement);
      });
      
      setEnhancements(enhancementsMap);
    } catch (error) {
      console.error('KPI enhancement error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [metrics, sensitivity, forecastHorizon]);

  return { enhancements, isProcessing };
};

/**
 * Hook for real-time processing status
 */
export const useRealTimeStatus = (): {
  isActive: boolean;
  queueSize: number;
  processingRate: number;
  lastUpdate: Date | null;
} => {
  const [status, setStatus] = useState({
    isActive: false,
    queueSize: 0,
    processingRate: 0,
    lastUpdate: null as Date | null
  });

  useEffect(() => {
    const processor = getRealTimeProcessor();
    
    const updateStatus = () => {
      setStatus({
        isActive: processor.isActive(),
        queueSize: processor.getQueueSize(),
        processingRate: processor.getProcessingRate(),
        lastUpdate: new Date()
      });
    };

    const interval = setInterval(updateStatus, 1000);
    updateStatus();

    return () => clearInterval(interval);
  }, []);

  return status;
};

export default useAIEnhancement;
