
import React, { useState, useCallback } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { SmartSearchPanel } from './components/SmartSearchPanel';
import { MetricCard } from './components/MetricCard';
import { ExtendedKPICard } from './components/ExtendedKPICard';
import { AnomaliesCard, PredictionsCard, RecommendationsCard } from './components/IntelligenceCards';
import { ChartsSection } from './components/ChartsSection';
import { InsightModal } from './components/InsightModal';
import { IntelligenceCenter } from './components/IntelligenceCenter';
import { RecordsPage } from './components/RecordsPage';
import { ReportsPage } from './components/ReportsPage';
import { LoginPage } from './components/LoginPage';
import { UserMenu } from './components/UserMenu';
import { ChatGPTStyleChatbot } from './components/ChatGPTStyleChatbot';
import { EnhancedFilterPanel } from './components/EnhancedFilterPanel';
import { ComprehensiveStatsDashboard } from './components/ComprehensiveStatsDashboard';
import { UnifiedKPIDashboard } from './components/UnifiedKPIDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { fetchDashboardData } from './services/dataService';
import { useFilteredDashboard } from './hooks/useFilteredDashboard';
import { DashboardData, FilterState, Metric, InsightData, Anomaly, Prediction, Recommendation, DEFAULT_FILTER_STATE, ExtendedKPI } from './types';
import { MOCK_DATA } from './constants';
import { Brain, Loader2, CalendarDays, Database, BarChart3, MessageSquare, Activity, Gauge, TrendingUp, Zap } from 'lucide-react';
import './styles/animations.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 30000, // 30 seconds
      refetchInterval: 60000, // Auto-refresh every 60 seconds
    }
  }
});

function Dashboard() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'intelligence' | 'records' | 'reports' | 'comprehensive-stats' | 'unified-kpi'>('dashboard');
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<InsightData | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Use the enhanced filtering hook - it handles ALL data fetching including initial load
  const {
    filteredData,
    originalData,
    filters,
    applyFilters,
    updateFilter,
    resetFilters,
    isRefreshing,
    isLoading: isFilterLoading,
    filterContext,
    filterSummary,
    activeFilters
  } = useFilteredDashboard(
    null,
    (filterState) => fetchDashboardData(filterState)
  );

  // Initial data load - only run once on mount
  React.useEffect(() => {
    if (!initialLoadComplete) {
      console.log('[Dashboard] Initial load - fetching data with default filters');
      applyFilters(DEFAULT_FILTER_STATE).then(() => {
        console.log('[Dashboard] Initial load complete');
        setInitialLoadComplete(true);
      }).catch(err => {
        console.error('[Dashboard] Initial load failed:', err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading = isFilterLoading || !initialLoadComplete;
  const isError = false;

  // Use filtered data for display, fallback to original if not filtered yet
  const displayData = filteredData || originalData;

  console.log('📊 [Dashboard] RENDER');
  console.log('  displayData total:', displayData?.metrics.totalAssessed.value?.toLocaleString() || 'null');
  console.log('  filteredData total:', filteredData?.metrics.totalAssessed.value?.toLocaleString() || 'null');
  console.log('  originalData total:', originalData?.metrics.totalAssessed.value?.toLocaleString() || 'null');
  console.log('  activeFilters:', activeFilters);
  console.log('  isLoading:', isLoading);
  console.log('  isRefreshing:', isRefreshing);

  // Check if any filter is different from default
  const isFilterActive = activeFilters.length > 0;

  // Wrapper to handle filter updates from SmartSearchPanel
  // This allows the panel to work with either direct state updates or async filter application
  const handleFilterChange = useCallback((newFiltersOrUpdater: FilterState | ((prev: FilterState) => FilterState)) => {
    const newFilters = typeof newFiltersOrUpdater === 'function' 
      ? newFiltersOrUpdater(filters)
      : newFiltersOrUpdater;
    
    console.log('===========================================');
    console.log('[Dashboard] handleFilterChange called');
    console.log('[Dashboard] New filters:', JSON.stringify(newFilters, null, 2));
    console.log('[Dashboard] Previous filters:', JSON.stringify(filters, null, 2));
    console.log('===========================================');
    
    // Apply filters asynchronously (will fetch fresh data from backend)
    // Don't await - let it run in background and React will re-render when state updates
    applyFilters(newFilters)
      .then(() => {
        console.log('[Dashboard] Filter application complete');
      })
      .catch(err => {
        console.error('[Dashboard] Error applying filters:', err);
      });
  }, [filters, applyFilters]);

  // Handlers for converting specific types to generic InsightData
  const handleMetricSelect = (metric: Metric) => {
    const insight: InsightData = {
      title: metric.label,
      value: metric.value,
      subtext: metric.subtext,
      color: metric.color,
      history: metric.history,
      type: 'metric',
      aiAnalysis: `Analysis of ${metric.label} shows a ${metric.trend && metric.trend > 0 ? 'positive' : 'negative'} trend. Correlation with recent patch cycles is high.`,
      recommendations: [
          `Continue monitoring ${metric.label} trends.`,
          "Correlate with related infrastructure changes.",
          "Set new baseline for anomaly detection."
      ],
      tags: [{label: 'CORE METRIC', color: 'blue'}]
    };
    setSelectedInsight(insight);
  };

  const handleAnomalySelect = (anomaly: Anomaly) => {
    console.log('[App] handleAnomalySelect called with:', anomaly);
    const insight = {
      title: anomaly.entity,
      value: `${anomaly.riskScore}/100`,
      subtext: `Severity: ${anomaly.severity}`,
      color: anomaly.severity === 'CRITICAL' ? 'rose' : 'amber',
      type: 'anomaly',
      aiAnalysis: anomaly.details,
      tags: [
        { label: anomaly.severity, color: 'red' },
        { label: 'Risk Score', color: 'amber' }
      ],
      recommendations: [
        "Isolate affected entity immediately",
        "Run deep vulnerability scan",
        "Review access logs for suspicious activity"
      ]
    };
    console.log('[App] Setting selectedInsight to:', insight);
    setSelectedInsight(insight);
  };

  const handlePredictionSelect = (prediction: Prediction) => {
    console.log('[App] handlePredictionSelect called with:', prediction);
    const insight = {
      title: `Forecast: ${prediction.period}`,
      value: `${prediction.confidence}%`,
      subtext: `Trend: ${prediction.trend}`,
      color: prediction.trend === 'RISING' ? 'amber' : 'green',
      type: 'prediction',
      aiAnalysis: prediction.description + ". " + prediction.drivers,
      tags: [
        { label: prediction.trend, color: prediction.trend === 'RISING' ? 'amber' : 'green' },
        { label: 'High Confidence', color: 'blue' }
      ],
      recommendations: [
        "Allocate resources for expected load",
        "Review capacity planning models",
        "Monitor leading indicators"
      ]
    };
    console.log('[App] Setting selectedInsight to:', insight);
    setSelectedInsight(insight);
  };

  const handleRecommendationSelect = (rec: Recommendation) => {
    console.log('[App] handleRecommendationSelect called with:', rec);
    const insight = {
      title: rec.category,
      value: rec.priority,
      subtext: "Action Required",
      color: rec.priority === 'CRITICAL' ? 'rose' : 'amber',
      type: 'recommendation',
      aiAnalysis: rec.action,
      tags: [
        { label: rec.priority, color: rec.priority === 'CRITICAL' ? 'red' : 'amber' }
      ],
      recommendations: [
        "Assign to SRE team",
        "Create ticket in ITSM",
        "Schedule maintenance window"
      ]
    };
    console.log('[App] Setting selectedInsight to:', insight);
    setSelectedInsight(insight);
  };

  // Shared header tab classes to keep consistent sizing/spacing
  const HEADER_TAB_CLASS = 'flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white rounded border transition-all whitespace-nowrap min-w-[140px]';

  if (isLoading && !originalData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 bg-[radial-gradient(ellipse_at_top,rgba(20,40,80,0.4),rgba(15,23,42,0.9))]">
        <div className="text-center">
           <Loader2 className="w-12 h-12 animate-spin text-cyan-500 mx-auto mb-4 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
           <p className="text-cyan-300 font-bold tracking-widest uppercase text-sm">Initializing System Interface...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-red-500 font-bold uppercase tracking-widest">System Failure. Connection Severed.</div>;
  }

  // Render SRE AgenticOps View
  if (currentView === 'intelligence') {
    return <IntelligenceCenter onBack={() => setCurrentView('dashboard')} />;
  }

  // Render Unified KPI View
  if (currentView === 'unified-kpi') {
    return <UnifiedKPIDashboard onBack={() => setCurrentView('dashboard')} dashboardData={displayData} />;
  }

  // Render Records Page View
  if (currentView === 'records') {
    return <RecordsPage onBack={() => setCurrentView('dashboard')} />;
  }

  // Render Reports Page View
  if (currentView === 'reports') {
    return (
      <ReportsPage 
        onBack={() => setCurrentView('dashboard')} 
        onViewRecords={() => setCurrentView('records')}
      />
    );
  }

  // Render Comprehensive Stats Dashboard View
  if (currentView === 'comprehensive-stats') {
    // Ensure we always have valid data - use MOCK_DATA as fallback
    const statsData = displayData || originalData || MOCK_DATA;
    return (
      <ComprehensiveStatsDashboard 
        data={statsData}
        isLoading={isLoading}
        onInsightSelect={(insight) => setSelectedInsight(insight)}
        onClose={() => setCurrentView('dashboard')}
      />
    );
  }

  // Render Unified KPI Dashboard View
  if (currentView === 'unified-kpi') {
    return (
      <UnifiedKPIDashboard 
        data={displayData}
        onInsightSelect={(insight) => setSelectedInsight(insight)}
        onClose={() => setCurrentView('dashboard')}
      />
    );
  }

  // Render Main Dashboard View
  return (
    <div className="min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_at_top,rgba(20,40,80,0.4),rgba(15,23,42,0.9))] text-slate-300 pb-20 font-orbitron selection:bg-cyan-500/30 selection:text-white">
      
      {/* Header */}
      <header className="bg-slate-800/60 backdrop-blur-xl border-b border-slate-700/80 sticky top-0 z-40 shadow-lg">
        <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="whitespace-nowrap">
            <h1 className="text-2xl font-bold text-white tracking-widest drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] uppercase">
              SRE <span className="text-cyan-400">AgenticOps</span> Intelligence Dashboard
            </h1>
            <p className="text-xs text-slate-400 font-medium tracking-[0.2em] mt-1">Cisco Systems, Inc.</p>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3 border-l border-slate-700 pl-6">
                <button
                  onClick={() => setCurrentView('intelligence')}
                  className={`${HEADER_TAB_CLASS} bg-indigo-600/80 hover:bg-indigo-500 border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.4)]`}
                >
                   <Brain className="w-5 h-5 text-white" />
                   <span className="inline-block align-middle uppercase tracking-wider text-xs">Intelligence Center</span>
                </button>

                <button
                  onClick={() => setCurrentView('unified-kpi')}
                  className={`${HEADER_TAB_CLASS} bg-violet-600/80 hover:bg-violet-500 border-violet-400/50 shadow-[0_0_15px_rgba(139,92,246,0.4)]`}
                >
                   <TrendingUp className="w-5 h-5 text-white" />
                   <span className="inline-block align-middle uppercase tracking-wider text-xs">KPI Center</span>
                </button>

                <button
                  onClick={() => setCurrentView('comprehensive-stats')}
                  className={`${HEADER_TAB_CLASS} bg-emerald-600/80 hover:bg-emerald-500 border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]`}
                >
                   <Activity className="w-5 h-5 text-white" />
                   <span className="inline-block align-middle uppercase tracking-wider text-xs">Statistics</span>
                </button>

                <button
                  onClick={() => setCurrentView('reports')}
                  className={`${HEADER_TAB_CLASS} bg-amber-600/80 hover:bg-amber-500 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.4)]`}
                >
                   <BarChart3 className="w-5 h-5 text-white" />
                   <span className="inline-block align-middle uppercase tracking-wider text-xs">Reports</span>
                </button>

                <button
                  onClick={() => setCurrentView('records')}
                  className={`${HEADER_TAB_CLASS} bg-cyan-600/80 hover:bg-cyan-500 border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.4)]`}
                >
                   <Database className="w-5 h-5 text-white" />
                   <span className="inline-block align-middle uppercase tracking-wider text-xs">Records</span>
                </button>

                {/* User Menu */}
                <UserMenu />
             </div>
          </div>
        </div>

        {/* Smart Search Panel - Integrated autocomplete with filters */}
        <SmartSearchPanel 
          filters={filters} 
          setFilters={handleFilterChange} 
          totalRecords={displayData?.metrics.totalAssessed.value || 0}
          onMetricSelect={handleMetricSelect}
        />
        
      </header>

      <main className="px-6 py-8 max-w-[1920px] mx-auto space-y-8">
        
        {/* Row 1: Primary KPI Metrics */}
        {displayData && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <MetricCard metric={displayData.metrics.totalAssessed} onClick={handleMetricSelect} />
            <MetricCard metric={displayData.metrics.secure} onClick={handleMetricSelect} />
            <MetricCard metric={displayData.metrics.potential} onClick={handleMetricSelect} />
            <MetricCard metric={displayData.metrics.vulnerable} onClick={handleMetricSelect} />
          </div>
        )}

        {/* Row 1.5: Extended KPI Cards - Performance Metrics */}
        {displayData?.extendedKPIs && displayData.extendedKPIs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayData.extendedKPIs.map((kpi) => (
              <ExtendedKPICard 
                key={kpi.id} 
                kpi={kpi} 
                onClick={(data) => setSelectedInsight(data)} 
              />
            ))}
          </div>
        )}

        {/* Row 2: Intelligence Layer */}
        {displayData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AnomaliesCard anomalies={displayData.anomalies} onSelect={handleAnomalySelect} />
            <PredictionsCard predictions={displayData.predictions} onSelect={handlePredictionSelect} />
            <RecommendationsCard recommendations={displayData.recommendations} onSelect={handleRecommendationSelect} />
          </div>
        )}

        {/* Row 3 & 4: Charts, Growth Grid & Tables */}
        {displayData && (
          <ChartsSection 
            trends={displayData.trends} 
            topFieldNotices={displayData.topFieldNotices}
            topCustomers={displayData.topCustomers}
            growthMetrics={displayData.growthMetrics}
            advancedMetrics={displayData.advancedMetrics}
            metrics={displayData.metrics}
            onInsightSelect={setSelectedInsight}
            filters={filters}
          />
        )}
      </main>

      {/* Modals */}
      <InsightModal 
        data={selectedInsight} 
        onClose={() => setSelectedInsight(null)} 
      />

      {/* ChatGPT-Style Voice Chatbot */}
      <ChatGPTStyleChatbot
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        dashboardData={{
          vulnerableCount: displayData?.metrics.vulnerable.value,
          potentiallyVulnerableCount: displayData?.metrics.potential.value,
          secureCount: displayData?.metrics.secure.value,
          fieldNoticeCount: displayData?.topFieldNotices?.length,
          topCustomers: displayData?.topCustomers?.slice(0, 5).map(c => c.customerName).join(', ')
        }}
      />

      {/* Floating SRE AgenticOps Button */}
      <button
        onClick={() => setIsChatbotOpen(true)}
        className="fixed bottom-6 right-6 z-50 group"
        title="Open SRE AgenticOps"
      >
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full blur-lg opacity-60 group-hover:opacity-100 transition-opacity animate-pulse" />
          
          {/* Button */}
          <div className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 rounded-full shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all hover:scale-110">
            <Brain className="w-7 h-7 text-white" />
          </div>
          
          {/* Notification dot */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
            <span className="text-[8px] font-bold text-white">AI</span>
          </div>
        </div>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-slate-700">
          <div className="font-semibold">SRE AgenticOps</div>
          <div className="text-cyan-400">Powered by Cisco CIRCUIT AI</div>
          <div className="absolute bottom-0 right-4 translate-y-1/2 w-2 h-2 bg-slate-800 border-r border-b border-slate-700 rotate-45" />
        </div>
      </button>

    </div>
  );
}

// Auth-protected Dashboard wrapper
function AuthenticatedApp() {
  const { isAuthenticated, isLoading, login, error, clearError } = useAuth();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm uppercase tracking-widest">Initializing Secure Session...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <LoginPage 
        onLogin={async (credentials) => {
          clearError();
          await login(credentials);
        }}
        error={error}
        isLoading={isLoading}
      />
    );
  }

  // Show dashboard if authenticated
  return <Dashboard />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </QueryClientProvider>
  );
}
