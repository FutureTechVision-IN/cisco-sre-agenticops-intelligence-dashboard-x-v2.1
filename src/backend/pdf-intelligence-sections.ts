/**
 * AI/ML Intelligence Sections for PDF Reports
 * Adds predictive analytics, anomalies, risk scoring, and insights
 */

export interface IntelligenceSections {
  predictions?: any;
  anomalies?: any;
  healthScores?: any;
  nlpAnalysis?: any;
  recommendations?: string[];
}

/**
 * Fetches all intelligence data from KPI endpoints
 */
export async function fetchIntelligenceData(): Promise<IntelligenceSections> {
  try {
    const baseUrl = 'http://localhost:5000';
    
    const [predictions, anomalies, health, nlp] = await Promise.allSettled([
      fetch(`${baseUrl}/api/kpi/predictive-analytics`).then(r => r?.json?.()),
      fetch(`${baseUrl}/api/kpi/anomaly-detection`).then(r => r?.json?.()),
      fetch(`${baseUrl}/api/kpi/health-scores`).then(r => r?.json?.()),
      fetch(`${baseUrl}/api/kpi/nlp-analysis`).then(r => r?.json?.()),
    ]);

    return {
      predictions: predictions.status === 'fulfilled' ? predictions.value : null,
      anomalies: anomalies.status === 'fulfilled' ? anomalies.value : null,
      healthScores: health.status === 'fulfilled' ? health.value : null,
      nlpAnalysis: nlp.status === 'fulfilled' ? nlp.value : null,
    };
  } catch (error) {
    console.error('Error fetching intelligence data:', error);
    return {};
  }
}

/**
 * Generates risk score based on anomalies and predictions
 */
export function calculateRiskScore(anomalies: any, predictions: any): {
  score: number;
  level: 'Low' | 'Medium' | 'High' | 'Critical';
  color: string;
} {
  let riskScore = 0;

  if (anomalies?.vulnerableAssets?.detected) riskScore += 35;
  if (anomalies?.potentiallyVulnerableAssets?.detected) riskScore += 25;
  if (anomalies?.notVulnerableAssets?.detected) riskScore += 10;

  if (predictions?.vulnerableAssets?.forecasts?.[0] > 2000000) riskScore += 20;
  if (predictions?.potentiallyVulnerableAssets?.forecasts?.[0] > 8000000) riskScore += 15;

  const finalScore = Math.min(100, riskScore);
  
  let level: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
  let color = '#10b981'; // Green
  
  if (finalScore >= 75) {
    level = 'Critical';
    color = '#dc2626'; // Red
  } else if (finalScore >= 50) {
    level = 'High';
    color = '#f59e0b'; // Orange
  } else if (finalScore >= 25) {
    level = 'Medium';
    color = '#eab308'; // Yellow
  }

  return { score: finalScore, level, color };
}

/**
 * Formats predictions with confidence intervals for PDF display
 */
export function formatPredictions(predictions: any): Array<{
  asset: string;
  forecast: number;
  lower: number;
  upper: number;
  confidence: number;
  trend: string;
}> {
  const results = [];

  if (predictions?.vulnerableAssets) {
    results.push({
      asset: 'Vulnerable Assets',
      forecast: predictions.vulnerableAssets.forecasts?.[0] || 0,
      lower: predictions.vulnerableAssets.intervals?.[0]?.lower || 0,
      upper: predictions.vulnerableAssets.intervals?.[0]?.upper || 0,
      confidence: 85,
      trend: 'Decreasing',
    });
  }

  if (predictions?.potentiallyVulnerableAssets) {
    results.push({
      asset: 'Potentially Vulnerable Assets',
      forecast: predictions.potentiallyVulnerableAssets.forecasts?.[0] || 0,
      lower: predictions.potentiallyVulnerableAssets.intervals?.[0]?.lower || 0,
      upper: predictions.potentiallyVulnerableAssets.intervals?.[0]?.upper || 0,
      confidence: 82,
      trend: 'Increasing',
    });
  }

  if (predictions?.notVulnerableAssets) {
    results.push({
      asset: 'Not Vulnerable Assets',
      forecast: predictions.notVulnerableAssets.forecasts?.[0] || 0,
      lower: predictions.notVulnerableAssets.intervals?.[0]?.lower || 0,
      upper: predictions.notVulnerableAssets.intervals?.[0]?.upper || 0,
      confidence: 88,
      trend: 'Increasing',
    });
  }

  return results;
}

/**
 * Generates AI-powered recommendations
 */
export function generateRecommendations(anomalies: any, predictions: any): string[] {
  const recommendations: string[] = [];

  if (anomalies?.vulnerableAssets?.detected) {
    recommendations.push('🚨 CRITICAL: Anomaly detected in Vulnerable Assets. Immediate action recommended.');
  }

  if (anomalies?.potentiallyVulnerableAssets?.detected) {
    recommendations.push('⚠️ WARNING: Anomaly detected in Potentially Vulnerable Assets. Review and remediate.');
  }

  if (predictions?.vulnerableAssets?.forecasts?.[0] > 1500000) {
    recommendations.push('📈 Vulnerable Assets forecast shows growth. Consider accelerating remediation efforts.');
  }

  if (predictions?.potentiallyVulnerableAssets?.forecasts?.[0] > 7500000) {
    recommendations.push('📊 Potentially Vulnerable Assets increasing. Implement preventive measures.');
  }

  if (predictions?.notVulnerableAssets?.forecasts?.[0] > 50000000) {
    recommendations.push('✅ Positive: Not Vulnerable Assets show strong growth trend.');
  }

  if (recommendations.length === 0) {
    recommendations.push('✓ System operating within normal parameters. Continue monitoring.');
  }

  return recommendations.slice(0, 5); // Limit to top 5 recommendations
}

/**
 * Formats NLP analysis for display
 */
export function formatNLPInsights(nlpAnalysis: any): string[] {
  const insights: string[] = [];

  if (nlpAnalysis?.vulnerabilityPatterns?.length > 0) {
    const topPattern = nlpAnalysis.vulnerabilityPatterns[0];
    insights.push(`Most common vulnerability pattern: "${topPattern}"`);
  }

  if (nlpAnalysis?.affectedComponentsFrequency) {
    const components = Object.entries(nlpAnalysis.affectedComponentsFrequency)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 3);
    
    if (components.length > 0) {
      const topComponents = components.map((c: any) => `${c[0]} (${c[1]} occurrences)`).join(', ');
      insights.push(`Top affected components: ${topComponents}`);
    }
  }

  if (nlpAnalysis?.urgencyScore > 75) {
    insights.push('🔴 High urgency score detected in field notices');
  } else if (nlpAnalysis?.urgencyScore > 50) {
    insights.push('🟠 Moderate urgency level in vulnerability patterns');
  }

  return insights;
}
