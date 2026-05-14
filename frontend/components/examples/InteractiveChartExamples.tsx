/**
 * Interactive Chart Examples - Quick Reference
 * 
 * Demonstrates various usage patterns for the InteractiveChartWrapper component
 * with different chart types and configurations.
 */

import React, { useState } from 'react';
import { InteractiveChartWrapper, type ChartData, type AIAnalysisResult } from '../InteractiveChartWrapper';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useChartTheme, CHART_ACCENT_COLORS } from '../../hooks/useChartTheme';

// ==========================================
// EXAMPLE 1: Basic Asset Trend Chart
// ==========================================

export const BasicAssetTrendExample: React.FC = () => {
  const chartTheme = useChartTheme();
  const mockData = [
    { month: '2025-01', vulnerable: 12000, secure: 45000, potential: 8000 },
    { month: '2025-02', vulnerable: 13500, secure: 46000, potential: 7500 },
    { month: '2025-03', vulnerable: 11000, secure: 48000, potential: 7000 },
  ];

  const chartData: ChartData = {
    id: 'asset-trend-basic',
    type: 'trend',
    title: 'Asset Security Trend',
    data: mockData,
    metadata: {
      timeframe: 'monthly',
      dataPoints: mockData.length,
      categories: ['Vulnerable', 'Secure', 'Potentially Vulnerable'],
    },
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold text-white mb-4">Basic Asset Trend with AI Analysis</h2>
      
      <InteractiveChartWrapper
        chartData={chartData}
        onAnalysisComplete={(result) => {
          console.log('Analysis Complete:', result);
          alert(`Analysis complete! Confidence: ${result.metadata.confidence.toFixed(1)}%`);
        }}
        showAIHint={true}
      >
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-white mb-4">Asset Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
              <XAxis dataKey="month" stroke={chartTheme.axisStroke} />
              <YAxis stroke={chartTheme.axisStroke} />
              <Tooltip />
              <Area type="monotone" dataKey="vulnerable" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
              <Area type="monotone" dataKey="potential" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
              <Area type="monotone" dataKey="secure" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </InteractiveChartWrapper>
    </div>
  );
};

// ==========================================
// EXAMPLE 2: With Insight Integration
// ==========================================

export const WithInsightIntegrationExample: React.FC = () => {
  const chartTheme = useChartTheme();
  const [currentInsight, setCurrentInsight] = useState<string | null>(null);

  const mockData = [
    { month: 'Jan', value: 25000 },
    { month: 'Feb', value: 28000 },
    { month: 'Mar', value: 32000 },
    { month: 'Apr', value: 29000 },
  ];

  const chartData: ChartData = {
    id: 'vulnerability-trend',
    type: 'trend',
    title: 'Vulnerability Trend',
    data: mockData,
  };

  const handleAnalysisComplete = (result: AIAnalysisResult) => {
    // Extract key insight
    const mainInsight = result.analysis.insights[0];
    setCurrentInsight(mainInsight);

    // You could also send to a parent dashboard component
    console.log('Send to insight panel:', {
      title: 'Vulnerability Analysis',
      severity: result.analysis.anomalies.severity,
      value: `${result.metadata.confidence.toFixed(1)}%`,
      explanation: result.analysis.insights.join(' '),
      recommendation: result.analysis.recommendations[0]?.action,
    });
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold text-white mb-4">Chart with Insight Integration</h2>
      
      {currentInsight && (
        <div className="mb-4 p-4 bg-cyan-500/20 border border-cyan-500/50 rounded-lg">
          <p className="text-sm text-cyan-300">{currentInsight}</p>
        </div>
      )}

      <InteractiveChartWrapper
        chartData={chartData}
        onAnalysisComplete={handleAnalysisComplete}
        onAnalysisError={(error) => {
          console.error('Analysis failed:', error);
          setCurrentInsight('Analysis failed. Please try again.');
        }}
      >
        <div className="bg-slate-800 rounded-lg p-6">
          <h3 className="text-white mb-4">Click to Analyze Trends</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
              <XAxis dataKey="month" stroke={chartTheme.axisStroke} />
              <YAxis stroke={chartTheme.axisStroke} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </InteractiveChartWrapper>
    </div>
  );
};

// ==========================================
// EXAMPLE 3: Disabled State
// ==========================================

export const DisabledChartExample: React.FC = () => {
  const chartTheme = useChartTheme();
  const [isDisabled, setIsDisabled] = useState(true);

  const mockData = [
    { period: 'Q1', count: 1500 },
    { period: 'Q2', count: 1800 },
    { period: 'Q3', count: 1600 },
  ];

  const chartData: ChartData = {
    id: 'quarterly-analysis',
    type: 'comparison',
    title: 'Quarterly Analysis',
    data: mockData,
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold text-white mb-4">Conditional AI Analysis</h2>
      
      <button
        onClick={() => setIsDisabled(!isDisabled)}
        className="mb-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
      >
        {isDisabled ? 'Enable AI Analysis' : 'Disable AI Analysis'}
      </button>

      <InteractiveChartWrapper
        chartData={chartData}
        disabled={isDisabled}
        showAIHint={!isDisabled}
      >
        <div className={`bg-slate-800 rounded-lg p-6 ${isDisabled ? 'opacity-50' : ''}`}>
          <h3 className="text-white mb-4">
            {isDisabled ? 'Analysis Disabled' : 'Click to Analyze'}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
              <XAxis dataKey="period" stroke={chartTheme.axisStroke} />
              <YAxis stroke={chartTheme.axisStroke} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </InteractiveChartWrapper>
    </div>
  );
};

// ==========================================
// EXAMPLE 4: Multiple Charts with Shared State
// ==========================================

export const MultipleChartsExample: React.FC = () => {
  const chartTheme = useChartTheme();
  const [latestResult, setLatestResult] = useState<AIAnalysisResult | null>(null);

  const chartData1: ChartData = {
    id: 'chart-1',
    type: 'trend',
    title: 'Vulnerabilities Over Time',
    data: [
      { month: 'Jan', value: 150 },
      { month: 'Feb', value: 180 },
      { month: 'Mar', value: 165 },
    ],
  };

  const chartData2: ChartData = {
    id: 'chart-2',
    type: 'distribution',
    title: 'Asset Distribution',
    data: [
      { category: 'Critical', count: 45 },
      { category: 'High', count: 120 },
      { category: 'Medium', count: 300 },
    ],
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold text-white mb-4">Multiple Charts with Shared Results</h2>

      {latestResult && (
        <div className="mb-4 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
          <h3 className="text-white font-bold mb-2">Latest Analysis: {latestResult.chartType}</h3>
          <p className="text-sm text-blue-300">
            Trend: {latestResult.analysis.trends.direction} • 
            Confidence: {latestResult.metadata.confidence.toFixed(1)}%
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <InteractiveChartWrapper
          chartData={chartData1}
          onAnalysisComplete={setLatestResult}
        >
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-white text-sm mb-3">{chartData1.title}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData1.data}>
                <XAxis dataKey="month" stroke={chartTheme.axisStroke} fontSize={10} />
                <YAxis stroke={chartTheme.axisStroke} fontSize={10} />
                <Area type="monotone" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </InteractiveChartWrapper>

        <InteractiveChartWrapper
          chartData={chartData2}
          onAnalysisComplete={setLatestResult}
        >
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-white text-sm mb-3">{chartData2.title}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData2.data}>
                <XAxis dataKey="category" stroke={chartTheme.axisStroke} fontSize={10} />
                <YAxis stroke={chartTheme.axisStroke} fontSize={10} />
                <Area type="monotone" dataKey="count" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </InteractiveChartWrapper>
      </div>
    </div>
  );
};

// ==========================================
// EXAMPLE 5: Custom Debounce and Touch Settings
// ==========================================

export const CustomConfigExample: React.FC = () => {
  const chartTheme = useChartTheme();
  const mockData = [
    { x: 1, y: 100 },
    { x: 2, y: 150 },
    { x: 3, y: 120 },
    { x: 4, y: 180 },
  ];

  const chartData: ChartData = {
    id: 'custom-config-chart',
    type: 'trend',
    title: 'Custom Configuration Demo',
    data: mockData,
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold text-white mb-4">Custom Configuration</h2>

      <InteractiveChartWrapper
        chartData={chartData}
        debounceMs={500}
        enableTouch={true}
        showAIHint={true}
        className="rounded-2xl"
        ariaLabel="Custom configured chart - Double click protection enabled"
        onAnalysisComplete={(result) => {
          console.log('Custom config analysis:', result);
        }}
      >
        <div className="bg-slate-800 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-white font-bold">Settings Applied:</h3>
            <ul className="text-sm text-slate-400 mt-2 space-y-1">
              <li>• Debounce: 500ms (slower, prevents accidental double-clicks)</li>
              <li>• Touch: Enabled (mobile-friendly)</li>
              <li>• AI Hint: Visible on hover</li>
              <li>• Custom border radius</li>
            </ul>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
              <XAxis dataKey="x" stroke={chartTheme.axisStroke} />
              <YAxis stroke={chartTheme.axisStroke} />
              <Tooltip />
              <Area type="monotone" dataKey="y" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </InteractiveChartWrapper>
    </div>
  );
};

// ==========================================
// COMPLETE DEMO DASHBOARD
// ==========================================

export const CompleteDemoDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Interactive Chart AI/ML Examples
          </h1>
          <p className="text-slate-400">
            Click any chart to trigger AI analysis with comprehensive insights
          </p>
        </div>

        <BasicAssetTrendExample />
        <WithInsightIntegrationExample />
        <DisabledChartExample />
        <MultipleChartsExample />
        <CustomConfigExample />
      </div>
    </div>
  );
};

export default CompleteDemoDashboard;
