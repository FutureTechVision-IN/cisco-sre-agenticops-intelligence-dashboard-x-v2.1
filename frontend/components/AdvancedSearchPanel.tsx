import React, { useState, useCallback, useMemo } from 'react';

// Check if running on static hosting (GitHub Pages)
const isStaticHosting = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname.includes('github.') || 
         hostname.includes('.github.io') || 
         hostname.includes('pages.');
};

import { 
  Search, 
  Filter, 
  ChevronDown, 
  X, 
  RefreshCw, 
  Download, 
  AlertCircle, 
  Loader2,
  Calendar,
  Building2,
  FileText,
  Settings,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { SearchResult, SearchFilters, SearchState, FieldNoticeCategory } from '../types/search';

interface AdvancedSearchPanelProps {
  onBack: () => void;
}

// Debounce hook for search input
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
};

export const AdvancedSearchPanel: React.FC<AdvancedSearchPanelProps> = ({ onBack }) => {
  // Search state
  const [searchState, setSearchState] = useState<SearchState>({
    isLoading: false,
    error: null,
    results: [],
    totalCount: 0,
    currentPage: 1,
    pageSize: 25,
    sortField: 'fieldNotice',
    sortOrder: 'asc'
  });

  // Filter state
  const [filters, setFilters] = useState<SearchFilters>({
    customerName: '',
    fieldNotice: '',
    fnType: 'All Types',
    month: '',
    showOnlyVulnerable: false
  });

  // Available filter options (loaded from API)
  const [filterOptions, setFilterOptions] = useState<{
    customers: string[];
    fieldNotices: string[];
    months: string[];
    fnTypes: FieldNoticeCategory[];
  }>({
    customers: [],
    fieldNotices: [],
    months: [],
    fnTypes: [
      { type: 'Hardware', count: 0, color: '#8b5cf6' },
      { type: 'Software', count: 0, color: '#06b6d4' }
    ]
  });

  // Debounced search values
  const debouncedCustomer = useDebounce(filters.customerName, 300);
  const debouncedFieldNotice = useDebounce(filters.fieldNotice, 300);

  // Load filter options on mount
  React.useEffect(() => {
    loadFilterOptions();
  }, []);

  // Auto-search when debounced filters change
  React.useEffect(() => {
    console.log('[FILTER-EFFECT] Triggering search due to filter change:', {
      debouncedCustomer,
      debouncedFieldNotice,
      fnType: filters.fnType,
      month: filters.month,
      showOnlyVulnerable: filters.showOnlyVulnerable
    });
    if (debouncedCustomer || debouncedFieldNotice || filters.fnType !== 'All Types' || filters.month) {
      performSearch();
    }
  }, [debouncedCustomer, debouncedFieldNotice, filters.fnType, filters.month, filters.showOnlyVulnerable]);

  const loadFilterOptions = async () => {
    try {
      console.log('[DEBUG] loadFilterOptions() called');
      console.log('[DEBUG] isStaticHosting():', isStaticHosting());

      // Helper to fetch and parse static filters
      const fetchStaticFilters = async () => {
        try {
          const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
          const url = `${base}/static-data/filters.json`;
          console.log('[DEBUG] Fetching static filters from:', url);
          
          const response = await fetch(url);
          console.log('[DEBUG] Static fetch status:', response.status);
          console.log('[DEBUG] Static Content-Type:', response.headers.get('content-type'));
          
          if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch static filters`);
          
          const text = await response.text();
          console.log('[DEBUG] Static response (first 200 chars):', text.substring(0, 200));
          
          // Check if response is HTML instead of JSON
          if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
            console.error('[DEBUG] ERROR: Received HTML instead of JSON!');
            throw new Error('Received HTML instead of JSON');
          }
          
          const data = JSON.parse(text);
          console.log('[DEBUG] Static data parsed successfully:', {
            customers: data.customers?.length || 0,
            fieldNotices: data.fieldNotices?.length || 0,
            months: data.months?.length || 0,
            fnTypes: data.fnTypes?.length || 0
          });
          
          return {
            customers: data.customers || [],
            fieldNotices: data.fieldNotices || [],
            months: data.months || [],
            fnTypes: (data.fnTypes || []).map((t: string) => ({ 
              type: t, 
              count: 0, 
              color: t === 'Hardware' ? '#8b5cf6' : '#06b6d4' 
            }))
          };
        } catch (error) {
          console.error('[DEBUG] fetchStaticFilters failed:', error);
          throw error;
        }
      };

      // Use static data for GitHub Pages
      if (isStaticHosting()) {
        console.log('[DEBUG] Static hosting detected, using static filters');
        const staticData = await fetchStaticFilters();
        console.log('[DEBUG] Setting filterOptions with static data:', {
          customers: staticData.customers.length,
          fieldNotices: staticData.fieldNotices.length,
          months: staticData.months.length
        });
        setFilterOptions(staticData);
        return;
      }

      // Try API first, fallback to static data
      try {
        console.log('[DEBUG] Attempting API fetch: /api/search/options');
        const response = await fetch('/api/search/options');
        console.log('[DEBUG] API response status:', response.status);
        console.log('[DEBUG] API Content-Type:', response.headers.get('content-type'));
        
        if (!response.ok) {
          console.log('[AdvancedSearchPanel] API failed (status ' + response.status + '), falling back to static filters');
          const staticData = await fetchStaticFilters();
          console.log('[DEBUG] Setting filterOptions with fallback data');
          setFilterOptions(staticData);
          return;
        }
        
        const data = await response.json();
        console.log('[DEBUG] API data received:', {
          customers: data.customers?.length || 0,
          fieldNotices: data.fieldNotices?.length || 0,
          months: data.months?.length || 0,
          fnTypes: data.fnTypes?.length || 0
        });
        
        if (data.error || !data.customers?.length) {
          console.log('[AdvancedSearchPanel] API returned empty/error, falling back to static filters');
          const staticData = await fetchStaticFilters();
          setFilterOptions(staticData);
          return;
        }
        
        const newOptions = {
          customers: data.customers || [],
          fieldNotices: data.fieldNotices || [],
          months: data.months || [],
          fnTypes: Array.isArray(data.fnTypes) && data.fnTypes.length > 0
            ? data.fnTypes.map((t: any) => typeof t === 'string'
                ? { type: t, count: 0, color: t === 'Hardware' ? '#8b5cf6' : '#06b6d4' }
                : t)
            : filterOptions.fnTypes
        };
        
        console.log('[DEBUG] Setting filterOptions with API data:', {
          customers: newOptions.customers.length,
          fieldNotices: newOptions.fieldNotices.length,
          months: newOptions.months.length
        });
        setFilterOptions(newOptions);
        
      } catch (apiError) {
        console.log('[AdvancedSearchPanel] API error, falling back to static filters:', apiError);
        const staticData = await fetchStaticFilters();
        console.log('[DEBUG] Setting filterOptions with fallback after API error');
        setFilterOptions(staticData);
      }
    } catch (error) {
      console.error('[DEBUG] Failed to load filter options:', error);
    }
  };

  const performSearch = async (page: number = 1) => {
    console.log('[PERFORM-SEARCH] Starting search with filters:', {
      customer: debouncedCustomer,
      fieldNotice: debouncedFieldNotice,
      fnType: filters.fnType,
      month: filters.month,
      showOnlyVulnerable: filters.showOnlyVulnerable,
      page,
      pageSize: searchState.pageSize,
      sortField: searchState.sortField,
      sortOrder: searchState.sortOrder
    });
    
    setSearchState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const params = new URLSearchParams();
      if (debouncedCustomer) params.append('customer', debouncedCustomer);
      if (debouncedFieldNotice) params.append('fieldNotice', debouncedFieldNotice);
      if (filters.fnType !== 'All Types') params.append('fnType', filters.fnType);
      if (filters.month) params.append('month', filters.month);
      if (filters.showOnlyVulnerable) params.append('onlyVulnerable', 'true');
      params.append('page', String(page));
      params.append('pageSize', String(searchState.pageSize));
      params.append('sortField', searchState.sortField);
      params.append('sortOrder', searchState.sortOrder);

      const url = `/api/search?${params.toString()}`;
      console.log('[PERFORM-SEARCH] API URL:', url);
      
      const response = await fetch(url);
      
      console.log('[PERFORM-SEARCH] API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('[PERFORM-SEARCH] API response data:', {
        resultsCount: data.results?.length || 0,
        totalCount: data.totalCount || 0
      });
      
      setSearchState(prev => ({
        ...prev,
        isLoading: false,
        results: data.results || [],
        totalCount: data.totalCount || 0,
        currentPage: page,
        error: null
      }));
      
      console.log('[PERFORM-SEARCH] Search state updated with results');
    } catch (error) {
      console.error('[PERFORM-SEARCH] Search error:', error);
      setSearchState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      }));
    }
  };

  // Debug: Monitor searchState changes
  React.useEffect(() => {
    console.log('[SEARCH-STATE] searchState updated:', {
      isLoading: searchState.isLoading,
      resultsCount: searchState.results?.length || 0,
      totalCount: searchState.totalCount,
      currentPage: searchState.currentPage,
      error: searchState.error
    });
  }, [searchState]);

  // Debug: Monitor filterOptions state changes
  React.useEffect(() => {
    console.log('[STATE-CHANGE] filterOptions updated:', {
      customers: filterOptions.customers?.length || 0,
      fieldNotices: filterOptions.fieldNotices?.length || 0,
      months: filterOptions.months?.length || 0,
      fnTypes: filterOptions.fnTypes?.length || 0
    });
    console.log('[STATE-CHANGE] Sample customers:', filterOptions.customers?.slice(0, 3));
    console.log('[STATE-CHANGE] Sample months:', filterOptions.months?.slice(0, 3));
  }, [filterOptions]);

  const handleClearFilters = () => {
    setFilters({
      customerName: '',
      fieldNotice: '',
      fnType: 'All Types',
      month: '',
      showOnlyVulnerable: false
    });
    setSearchState(prev => ({
      ...prev,
      results: [],
      totalCount: 0,
      currentPage: 1
    }));
  };

  const handleSort = (field: string) => {
    const newOrder = searchState.sortField === field && searchState.sortOrder === 'asc' ? 'desc' : 'asc';
    setSearchState(prev => ({
      ...prev,
      sortField: field,
      sortOrder: newOrder
    }));
    // Re-fetch with new sort
    if (searchState.results.length > 0) {
      performSearch(1);
    }
  };

  const handleExportResults = async () => {
    if (searchState.results.length === 0) return;

    const params = new URLSearchParams();
    if (debouncedCustomer) params.append('customer', debouncedCustomer);
    if (debouncedFieldNotice) params.append('fieldNotice', debouncedFieldNotice);
    if (filters.fnType !== 'All Types') params.append('fnType', filters.fnType);
    if (filters.month) params.append('month', filters.month);
    params.append('format', 'csv');

    try {
      const response = await fetch(`/api/search/export?${params.toString()}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `search-results-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const totalPages = Math.ceil(searchState.totalCount / searchState.pageSize);
  const hasActiveFilters = filters.customerName || filters.fieldNotice || filters.fnType !== 'All Types' || filters.month;

  return (
    <div className="min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_at_top,rgba(20,40,80,0.4),rgba(15,23,42,0.9))] text-slate-300">
      {/* Header */}
      <header className="bg-slate-800/60 backdrop-blur-xl border-b border-slate-700/80 sticky top-0 z-40">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} className="text-cyan-400" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Search size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-wider">Advanced Search</h1>
                <p className="text-xs text-slate-400">Search customers, field notices, and vulnerabilities</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                <X size={14} />
                Clear Filters
              </button>
            )}
            <button
              onClick={() => performSearch(1)}
              disabled={searchState.isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {searchState.isLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Search
            </button>
            {searchState.results.length > 0 && (
              <button
                onClick={handleExportResults}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs font-medium transition-colors"
              >
                <Download size={14} />
                Export CSV
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Search Filters Section */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={16} className="text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Search Filters</h2>
            {hasActiveFilters && (
              <span className="ml-2 px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
                Active
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Customer Name Search */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Building2 size={12} />
                Customer Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.customerName}
                  onChange={(e) => setFilters(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="Search customers..."
                  className="w-full bg-slate-900/50 border border-slate-600 text-slate-200 text-sm rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all placeholder-slate-500"
                />
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
              <p className="text-xs text-slate-500">Partial match supported</p>
            </div>

            {/* Field Notice Search */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <FileText size={12} />
                Field Notice
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.fieldNotice}
                  onChange={(e) => setFilters(prev => ({ ...prev, fieldNotice: e.target.value }))}
                  placeholder="e.g., FN70496, FN72270..."
                  className="w-full bg-slate-900/50 border border-slate-600 text-slate-200 text-sm rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all placeholder-slate-500"
                />
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
              <p className="text-xs text-slate-500">Partial match supported</p>
            </div>

            {/* FN Type Filter */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Settings size={12} />
                FN Type Category
              </label>
              <div className="relative">
                {console.log('[RENDER] FN Type dropdown - filterOptions.fnTypes:', filterOptions.fnTypes)}
                <select
                  value={filters.fnType}
                  onChange={(e) => setFilters(prev => ({ ...prev, fnType: e.target.value }))}
                  className="appearance-none w-full bg-slate-900/50 border border-slate-600 text-slate-200 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all cursor-pointer"
                >
                  <option value="All Types">All Types</option>
                  {filterOptions.fnTypes.map(cat => {
                    console.log('[RENDER] FN Type option:', cat.type);
                    return <option key={cat.type} value={cat.type}>{cat.type}</option>;
                  })}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
              {/* Type Badges */}
              <div className="flex gap-2 mt-1">
                {filterOptions.fnTypes.map(cat => (
                  <span 
                    key={cat.type}
                    className="px-2 py-0.5 text-xs font-medium rounded-full"
                    style={{ backgroundColor: cat.color + '20', color: cat.color }}
                  >
                    {cat.type}: {cat.count.toLocaleString()}
                  </span>
                ))}
              </div>
            </div>

            {/* Month Filter */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <Calendar size={12} />
                Data Month
              </label>
              <div className="relative">
                {console.log('[RENDER] Month dropdown - filterOptions.months:', filterOptions.months)}
                <select
                  value={filters.month}
                  onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
                  className="appearance-none w-full bg-slate-900/50 border border-slate-600 text-slate-200 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all cursor-pointer"
                >
                  <option value="">All Available Months</option>
                  {filterOptions.months.map(month => {
                    console.log('[RENDER] Month option:', month);
                    return <option key={month} value={month}>{month}</option>;
                  })}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
              <p className="text-xs text-slate-500">
                {filterOptions.months.length} months available
                {console.log('[RENDER] Months count display:', filterOptions.months.length)}
              </p>
            </div>
          </div>

          {/* Additional Filter Options */}
          <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showOnlyVulnerable}
                onChange={(e) => setFilters(prev => ({ ...prev, showOnlyVulnerable: e.target.checked }))}
                className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-0"
              />
              <span className="text-xs text-slate-300">Show only records with vulnerabilities</span>
            </label>

            {searchState.totalCount > 0 && (
              <div className="text-xs text-slate-400">
                Found <span className="text-cyan-400 font-bold">{searchState.totalCount.toLocaleString()}</span> matching records
              </div>
            )}
          </div>
        </div>

        {/* Data Availability Info */}
        <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info size={16} className="text-cyan-400 mt-0.5 shrink-0" />
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Data Availability</h3>
              <div className="flex flex-wrap gap-2">
                {filterOptions.months.length > 0 ? (
                  filterOptions.months.map(month => (
                    <span key={month} className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs font-mono rounded">
                      {month}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 text-xs">Loading available data months...</span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Data is refreshed periodically. Contact admin for historical data requests.
              </p>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
          {/* Results Header */}
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Search Results
              {searchState.totalCount > 0 && (
                <span className="ml-2 text-cyan-400 font-mono text-xs">
                  ({searchState.totalCount.toLocaleString()})
                </span>
              )}
            </h2>
            
            {/* Pagination Info */}
            {totalPages > 1 && (
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-400">
                  Page {searchState.currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => performSearch(searchState.currentPage - 1)}
                    disabled={searchState.currentPage === 1 || searchState.isLoading}
                    className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => performSearch(searchState.currentPage + 1)}
                    disabled={searchState.currentPage === totalPages || searchState.isLoading}
                    className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Loading State */}
          {searchState.isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={40} className="text-cyan-400 animate-spin mb-4" />
              <p className="text-sm text-slate-400">Searching records...</p>
            </div>
          )}

          {/* Error State */}
          {searchState.error && !searchState.isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <AlertCircle size={40} className="text-red-400 mb-4" />
              <p className="text-sm text-red-400 mb-2">Search Failed</p>
              <p className="text-xs text-slate-500">{searchState.error}</p>
              <button
                onClick={() => performSearch(1)}
                className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs transition-colors"
              >
                Retry Search
              </button>
            </div>
          )}

          {/* Empty State */}
          {!searchState.isLoading && !searchState.error && searchState.results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <Search size={40} className="text-slate-600 mb-4" />
              <p className="text-sm text-slate-400 mb-2">
                {hasActiveFilters ? 'No results found' : 'Enter search criteria to begin'}
              </p>
              <p className="text-xs text-slate-500 max-w-md text-center">
                {hasActiveFilters 
                  ? 'Try adjusting your filters or using different search terms'
                  : 'Search by customer name, field notice ID, type, or month to find matching records'
                }
              </p>
            </div>
          )}

          {/* Results Table */}
          {!searchState.isLoading && !searchState.error && searchState.results.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <SortableHeader
                      label="Customer"
                      field="customerName"
                      currentSort={searchState.sortField}
                      currentOrder={searchState.sortOrder}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Field Notice"
                      field="fieldNotice"
                      currentSort={searchState.sortField}
                      currentOrder={searchState.sortOrder}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="FN Type"
                      field="fnType"
                      currentSort={searchState.sortField}
                      currentOrder={searchState.sortOrder}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Month"
                      field="month"
                      currentSort={searchState.sortField}
                      currentOrder={searchState.sortOrder}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Vulnerable"
                      field="totVuln"
                      currentSort={searchState.sortField}
                      currentOrder={searchState.sortOrder}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Potential"
                      field="potVuln"
                      currentSort={searchState.sortField}
                      currentOrder={searchState.sortOrder}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Secure"
                      field="notVuln"
                      currentSort={searchState.sortField}
                      currentOrder={searchState.sortOrder}
                      onSort={handleSort}
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {searchState.results.map((result, idx) => (
                    <tr 
                      key={`${result.fieldNotice}-${result.customerName}-${idx}`}
                      className="hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-slate-200">{result.customerName}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-cyan-400">{result.fieldNotice}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span 
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            result.fnType === 'Hardware' 
                              ? 'bg-purple-500/20 text-purple-400' 
                              : 'bg-cyan-500/20 text-cyan-400'
                          }`}
                        >
                          {result.fnType || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400 font-mono">{result.month}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-mono ${result.totVuln > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                          {result.totVuln?.toLocaleString() || '0'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-mono ${result.potVuln > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                          {result.potVuln?.toLocaleString() || '0'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-green-400">
                          {result.notVuln?.toLocaleString() || '0'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Bottom Pagination */}
          {totalPages > 1 && !searchState.isLoading && (
            <div className="px-6 py-4 border-t border-slate-700/50 flex items-center justify-between bg-slate-900/30">
              <div className="text-xs text-slate-500">
                Showing {((searchState.currentPage - 1) * searchState.pageSize) + 1} - {Math.min(searchState.currentPage * searchState.pageSize, searchState.totalCount)} of {searchState.totalCount.toLocaleString()} results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => performSearch(1)}
                  disabled={searchState.currentPage === 1}
                  className="px-3 py-1.5 text-xs bg-slate-700/50 hover:bg-slate-700 rounded-lg disabled:opacity-50 transition-colors"
                >
                  First
                </button>
                <button
                  onClick={() => performSearch(searchState.currentPage - 1)}
                  disabled={searchState.currentPage === 1}
                  className="px-3 py-1.5 text-xs bg-slate-700/50 hover:bg-slate-700 rounded-lg disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <span className="px-4 py-1.5 text-xs bg-cyan-600/20 text-cyan-400 rounded-lg font-mono">
                  {searchState.currentPage}
                </span>
                <button
                  onClick={() => performSearch(searchState.currentPage + 1)}
                  disabled={searchState.currentPage === totalPages}
                  className="px-3 py-1.5 text-xs bg-slate-700/50 hover:bg-slate-700 rounded-lg disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
                <button
                  onClick={() => performSearch(totalPages)}
                  disabled={searchState.currentPage === totalPages}
                  className="px-3 py-1.5 text-xs bg-slate-700/50 hover:bg-slate-700 rounded-lg disabled:opacity-50 transition-colors"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Sortable Header Component
interface SortableHeaderProps {
  label: string;
  field: string;
  currentSort: string;
  currentOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  field,
  currentSort,
  currentOrder,
  onSort
}) => {
  const isActive = currentSort === field;
  
  return (
    <th 
      className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-cyan-400 transition-colors group"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        <ArrowUpDown 
          size={12} 
          className={`transition-all ${
            isActive 
              ? 'text-cyan-400' 
              : 'text-slate-600 group-hover:text-slate-400'
          } ${isActive && currentOrder === 'desc' ? 'rotate-180' : ''}`}
        />
      </div>
    </th>
  );
};

export default AdvancedSearchPanel;
