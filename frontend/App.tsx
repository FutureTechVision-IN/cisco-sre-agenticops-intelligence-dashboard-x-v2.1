
import React, { useState, useCallback, useRef } from 'react';
import { SmartSearchPanel } from './components/SmartSearchPanel';
import { MetricCard } from './components/MetricCard';
import { ExtendedKPICard } from './components/ExtendedKPICard';
import { ChartsSection } from './components/ChartsSection';
import AIIntelligenceLiveFeed from './components/AIIntelligenceLiveFeed';
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
import { MLMonitoringDashboard } from './components/MLMonitoringDashboard';
import { VulnerabilityReductionTracker } from './components/VulnerabilityReductionTracker';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LatestMonthProvider, useLatestMonth } from './contexts/LatestMonthContext';
import { fetchDashboardData } from './services/dataService';
import { useFilteredDashboard } from './hooks/useFilteredDashboard';
import { DataHealthIndicator } from './components/DataHealthIndicator';
import { DashboardData, FilterState, Metric, InsightData, Anomaly, Prediction, Recommendation, DEFAULT_FILTER_STATE, ExtendedKPI } from './types';
import { MOCK_DATA } from './constants';
import { Brain, Loader2, Database, BarChart3, Activity, Gauge, TrendingUp, Shield } from 'lucide-react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ThemeToggle } from './components/ThemeToggle';
import './styles/index.css';
import './styles/theme-system.css';
import './styles/animations.css';

function Dashboard() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'intelligence' | 'records' | 'reports' | 'comprehensive-stats' | 'unified-kpi' | 'ml-monitoring' | 'vulnerability-reduction'>('dashboard');
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<InsightData | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // ML Analysis state
  const [mlAnalysis, setMlAnalysis] = useState<any>(null);
  const [isMlLoading, setIsMlLoading] = useState(false);
  const [mlError, setMlError] = useState<string | null>(null);
  const mlAbortRef = useRef<AbortController | null>(null);
  const mlDebounceRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch comprehensive ML analysis from backend.
   * Debounced + abortable to prevent redundant requests.
   */
  const triggerMLAnalysis = useCallback(() => {
    // Cancel previous debounce
    if (mlDebounceRef.current) clearTimeout(mlDebounceRef.current);
    // Abort in-flight ML request
    if (mlAbortRef.current) mlAbortRef.current.abort();

    setMlAnalysis(null);
    setMlError(null);
    setIsMlLoading(true);

    mlDebounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      mlAbortRef.current = controller;
      try {
        const res = await fetch('/api/ml/analyze/comprehensive', {
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`ML API error: ${res.status}`);
        const json = await res.json();
        setMlAnalysis(json.analysis || json);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setMlError(err?.message || 'ML analysis failed');
        }
      } finally {
        setIsMlLoading(false);
      }
    }, 200);
  }, []);

  // Resolve latest month from dataset — used to auto-apply the filter on initial load
  const { latestMonth, isResolving: isLatestMonthResolving } = useLatestMonth();

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

  // Initial data load — start with All Months (DEFAULT_FILTER_STATE) so KPIs show the
  // full dataset total. The user can then narrow to a specific month via the filter panel.
  React.useEffect(() => {
    if (!initialLoadComplete && !isLatestMonthResolving) {
      const initialFilters = { ...DEFAULT_FILTER_STATE };
      console.log(`[Dashboard] Initial load — applying All Months default filter`);
      applyFilters(initialFilters).then(() => {
        console.log('[Dashboard] Initial load complete');
        setInitialLoadComplete(true);
      }).catch(err => {
        console.error('[Dashboard] Initial load failed:', err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLatestMonthResolving, latestMonth]);

  const isLoading = isFilterLoading || !initialLoadComplete || isLatestMonthResolving;
  const isError = false;

  // Use filtered data for display, fallback to original if not filtered yet
  const displayData = filteredData || originalData;

  console.log('📊 [Dashboard] RENDER');
  console.log('  displayData total:', displayData?.metrics.totalAssessed.value?.toLocaleString() || 'null');
  console.log('  displayData formula:', displayData?.metrics.totalAssessed.formula ? displayData.metrics.totalAssessed.formula.substring(0, 50) : 'UNDEFINED');
  console.log('  filteredData total:', filteredData?.metrics.totalAssessed.value?.toLocaleString() || 'null');
  console.log('  filteredData formula:', filteredData?.metrics.totalAssessed.formula ? filteredData.metrics.totalAssessed.formula.substring(0, 50) : 'UNDEFINED');
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
    console.log('[App] ========== handleMetricSelect CALLED ==========');
    console.log('[App] Metric label:', metric.label);
    console.log('[App] Metric has formula?', !!metric.formula, '| Value:', metric.formula);
    console.log('[App] Metric has methodology?', !!metric.methodology, '| Value:', metric.methodology ? metric.methodology.substring(0, 80) + '...' : 'UNDEFINED');
    
    const insight: InsightData = {
      title: metric.label,
      value: metric.value,
      subtext: metric.subtext,
      color: metric.color,
      history: metric.history,
      type: 'metric',
      formula: metric.formula || 'Formula not specified',
      methodology: metric.methodology || 'Methodology not specified',
      aiAnalysis: `Analysis of ${metric.label} shows a ${metric.trend && metric.trend > 0 ? 'positive' : 'negative'} trend. Correlation with recent patch cycles is high.`,
      recommendations: [
          `Continue monitoring ${metric.label} trends.`,
          "Correlate with related infrastructure changes.",
          "Set new baseline for anomaly detection."
      ],
      tags: [{label: 'CORE METRIC', color: 'blue'}]
    };
    
    console.log('[App] InsightData created with formula:', insight.formula ? insight.formula.substring(0, 80) + '...' : 'UNDEFINED');
    console.log('[App] ========== END handleMetricSelect ==========');
    
    setSelectedInsight(insight);
    triggerMLAnalysis();
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
      formula: 'Anomaly Score = (Deviation from Baseline × Severity Weight × Confidence Factor) / 100',
      methodology: 'Anomaly detection uses machine learning algorithms to identify deviations from established baseline patterns. The system analyzes historical data, applies statistical models, and weights anomalies based on severity, confidence level, and potential business impact. Each anomaly is scored on a 0-100 scale where higher values indicate greater deviation from normal behavior.',
      dataSources: ['Real-time Telemetry Feed', 'ML Analytics Engine', 'Historical Baseline Database', 'Threat Intelligence Platform'],
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
    triggerMLAnalysis();
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
      formula: 'Forecast Confidence = (Historical Accuracy × Pattern Strength × Data Quality) / 100',
      methodology: 'Predictive analytics leverages time-series forecasting models trained on historical trends, seasonal patterns, and external factors. The confidence score reflects the statistical accuracy of the prediction based on data quality, pattern consistency, and historical validation. Forecasts are continuously updated as new data becomes available.',
      dataSources: ['Time-Series Database', 'Predictive ML Models', 'Historical Trend Archive', 'External Factor Feeds'],
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
    triggerMLAnalysis();
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
      formula: 'Priority Score = (Risk Impact × Urgency × Implementation Feasibility) / 100',
      methodology: 'Recommendations are generated using a multi-factor prioritization algorithm that evaluates risk impact, urgency level, and implementation feasibility. Each recommendation is ranked based on potential security improvement, resource requirements, and alignment with organizational risk tolerance. Priority scores guide remediation sequencing.',
      dataSources: ['Risk Assessment Engine', 'Resource Planning System', 'Vulnerability Database', 'Remediation Playbooks'],
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
    triggerMLAnalysis();
  };

  // Shared header tab classes
  const HEADER_TAB_CLASS = 'flex shrink-0 items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-bold text-white rounded border transition-all whitespace-nowrap uppercase tracking-wider';

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

  // Render Vulnerability Reduction Tracker View
  if (currentView === 'vulnerability-reduction') {
    return <VulnerabilityReductionTracker onBack={() => setCurrentView('dashboard')} />;
  }

  // Render ML Monitoring Dashboard View
  if (currentView === 'ml-monitoring') {
    return <MLMonitoringDashboard onBack={() => setCurrentView('dashboard')} />;
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
    <div className="min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_at_top,rgba(20,40,80,0.4),rgba(15,23,42,0.9))] text-slate-300 pb-20 selection:bg-cyan-500/30 selection:text-white">
      
      {/* Header */}
      <header className="bg-slate-800/60 backdrop-blur-xl border-b border-slate-700/80 sticky top-0 z-40 shadow-lg overflow-x-hidden">

        {/* Row 1 — Brand bar: title, subtitle, health indicator, utilities */}
        <div className="px-5 pt-3 pb-2 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Title + Subtitle */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-wider sm:tracking-widest leading-tight break-words">
                SRE <span className="text-cyan-400">AgenticOps</span> Intelligence Dashboard
              </h1>
              <p className="text-xs text-slate-400 font-medium tracking-[0.2em] mt-0.5">Cisco Systems, Inc.</p>
            </div>
            <div className="shrink-0 max-w-full">
              <DataHealthIndicator />
            </div>
          </div>

          {/* Right: Theme toggle + User menu */}
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle size="sm" />
            <UserMenu collapsed={true} />
          </div>
        </div>

        {/* Row 2 — Navigation bar: all view tabs on one dedicated row */}
        <div className="px-5 pb-2.5 max-w-full overflow-x-auto">
          <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCurrentView('intelligence')}
            className={`${HEADER_TAB_CLASS} bg-indigo-700 hover:bg-indigo-600 border-indigo-500/70 shadow-[0_0_15px_rgba(67,56,202,0.35)]`}
          >
            <Brain className="w-4 h-4 text-white" />
            <span>Intelligence Center</span>
          </button>

          <button
            onClick={() => setCurrentView('unified-kpi')}
            className={`${HEADER_TAB_CLASS} bg-violet-600/80 hover:bg-violet-500 border-violet-400/50 shadow-[0_0_15px_rgba(139,92,246,0.4)]`}
          >
            <TrendingUp className="w-4 h-4 text-white" />
            <span>KPI Center</span>
          </button>

          <button
            onClick={() => setCurrentView('ml-monitoring')}
            className={`${HEADER_TAB_CLASS} bg-rose-600/80 hover:bg-rose-500 border-rose-400/50 shadow-[0_0_15px_rgba(244,63,94,0.4)]`}
          >
            <Gauge className="w-4 h-4 text-white" />
            <span>ML Monitor</span>
          </button>

          <button
            onClick={() => setCurrentView('comprehensive-stats')}
            className={`${HEADER_TAB_CLASS} bg-emerald-600/80 hover:bg-emerald-500 border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]`}
          >
            <Activity className="w-4 h-4 text-white" />
            <span>Statistics</span>
          </button>

          <button
            onClick={() => setCurrentView('reports')}
            className={`${HEADER_TAB_CLASS} bg-amber-600/80 hover:bg-amber-500 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.4)]`}
          >
            <BarChart3 className="w-4 h-4 text-white" />
            <span>Reports</span>
          </button>

          <button
            onClick={() => setCurrentView('records')}
            className={`${HEADER_TAB_CLASS} bg-cyan-600/80 hover:bg-cyan-500 border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.4)]`}
          >
            <Database className="w-4 h-4 text-white" />
            <span>Records</span>
          </button>

          <button
            onClick={() => setCurrentView('vulnerability-reduction')}
            className={`${HEADER_TAB_CLASS} bg-teal-600/80 hover:bg-teal-500 border-teal-400/50 shadow-[0_0_15px_rgba(20,184,166,0.4)]`}
          >
            <Shield className="w-4 h-4 text-white" />
            <span>Vuln Tracker</span>
          </button>
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

        {/* AI Intelligence Live Feed — passes active filters so month/customer selection scopes the analysis */}
        <AIIntelligenceLiveFeed filters={filters} />

        {/* Row 4 & 5: Charts, Growth Grid & Tables */}
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
        onClose={() => {
          setSelectedInsight(null);
          setMlAnalysis(null);
          setMlError(null);
          setIsMlLoading(false);
          if (mlAbortRef.current) mlAbortRef.current.abort();
          if (mlDebounceRef.current) clearTimeout(mlDebounceRef.current);
        }}
        mlAnalysis={mlAnalysis}
        isMlLoading={isMlLoading}
        mlError={mlError}
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
            <span className="text-[10px] font-bold text-white">AI</span>
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
    <ThemeProvider>
      <AuthProvider>
        <LatestMonthProvider>
          <AuthenticatedApp />
        </LatestMonthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
