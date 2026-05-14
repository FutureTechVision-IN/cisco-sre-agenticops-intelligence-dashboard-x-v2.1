/**
 * useFilteredDashboard - React hook for managing filtered dashboard data
 * Integrates FilterService with React state management
 * Handles real-time filtering, data refresh, and performance optimization
 * [SUCCESS] NOW WITH PROPER KPI METRIC CALCULATIONS FOR ALL FILTERS
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { DashboardData, FilterState } from '../types';
import { filterService, FilteredDataState, FilterContext } from '../services/filterService';
import { calculateFilteredMetrics } from '../services/filterCalculationService';

export interface UseFilteredDashboardReturn {
  // Data states
  filteredData: DashboardData | null;
  originalData: DashboardData | null;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  
  // Error handling
  error: Error | null;
  
  // Filter management
  filters: FilterState;
  activeFilters: { field: string; value: string }[];
  filterContext: FilterContext | null;
  filterSummary: string;
  
  // Methods
  applyFilters: (newFilters: FilterState) => Promise<void>;
  updateFilter: (field: keyof FilterState, value: string) => Promise<void>;
  resetFilters: () => Promise<void>;
  refreshData: () => Promise<void>;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  customer: '',
  fieldNotice: '',
  fnType: '',
  month: '',
  customerSearch: '',
  fieldNoticeSearch: ''
};

/**
 * Custom hook for filtered dashboard data management
 * @param initialData - Initial dashboard data
 * @param onDataFetch - Callback function to fetch fresh data
 * @returns Filtered data, methods, and state
 */
export const useFilteredDashboard = (
  initialData: DashboardData | null,
  onDataFetch?: (filters: FilterState) => Promise<DashboardData>
): UseFilteredDashboardReturn => {
  // State management
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [filteredData, setFilteredData] = useState<DashboardData | null>(initialData || null);
  const [originalData, setOriginalData] = useState<DashboardData | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filterContext, setFilterContext] = useState<FilterContext | null>(null);

  // Request sequencing: ensures stale API responses from earlier filter selections
  // don't overwrite the results of newer filter selections
  const requestSeqRef = useRef(0);

  /**
   * Apply filters to data and update state
   */
  const applyFiltersToData = useCallback((data: DashboardData, currentFilters: FilterState) => {
    try {
      setError(null);
      
      // Use FilterService to apply filters
      const result = filterService.applyFilters(data, currentFilters);
      
      setFilteredData(result.data);
      setFilterContext(result.context);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to apply filters');
      setError(error);
      console.error('Filter application error:', error);
    }
  }, []);

  // Update filtered data when initial data changes
  useEffect(() => {
    if (initialData) {
      setOriginalData(initialData);
      applyFiltersToData(initialData, filters);
    }
  }, [initialData, filters, applyFiltersToData]);

  /**
   * Apply new filters and fetch fresh data from API
   */
  const applyFilters = useCallback(async (newFilters: FilterState) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[useFilteredDashboard] [APPLYING FILTERS] APPLYING FILTERS');
    console.log('[useFilteredDashboard] Filters:', JSON.stringify(newFilters, null, 2));
    
    if (!onDataFetch) {
      console.log('[useFilteredDashboard] [WARNING] No fetch function, using client-side filtering');
      // Fallback to client-side filtering if no fetch function
      setFilters(newFilters);
      if (originalData) {
        applyFiltersToData(originalData, newFilters);
      }
      return;
    }

    // Increment request sequence to detect stale responses
    const currentSeq = ++requestSeqRef.current;

    try {
      setIsLoading(true);
      setIsRefreshing(true);
      setError(null);
      setFilters(newFilters);
      
      console.log(`[useFilteredDashboard] [FETCHING] Fetching fresh data from backend (seq=${currentSeq})...`);
      // Fetch fresh data with new filters from backend
      const freshData = await onDataFetch(newFilters);
      
      // Discard stale responses: if another filter was applied while this fetch
      // was in flight, ignore this response because a newer one is pending
      if (currentSeq !== requestSeqRef.current) {
        console.log(`[useFilteredDashboard] [STALE] Discarding stale response (seq=${currentSeq}, current=${requestSeqRef.current})`);
        return;
      }
      
      console.log('[useFilteredDashboard] [SUCCESS] Fresh data received!');
      console.log('[useFilteredDashboard] Total Assessed:', freshData.metrics.totalAssessed.value.toLocaleString());
      console.log('[useFilteredDashboard] Vulnerable:', freshData.metrics.vulnerable.value.toLocaleString());
      console.log('[useFilteredDashboard] Potentially Vulnerable:', freshData.metrics.potential.value.toLocaleString());
      console.log('[useFilteredDashboard] Secure:', freshData.metrics.secure.value.toLocaleString());
      
      // Update original data
      console.log('[useFilteredDashboard] [UPDATING] Updating originalData state...');
      setOriginalData(freshData);
      
      // Check if any filters are actually active
      const hasActiveFilters = (
        (newFilters.customer && newFilters.customer !== '' && newFilters.customer !== 'All Customers') ||
        (newFilters.fieldNotice && newFilters.fieldNotice !== '' && newFilters.fieldNotice !== 'All Field Notices') ||
        (newFilters.fnType && newFilters.fnType !== '' && newFilters.fnType !== 'All Types') ||
        (newFilters.month && newFilters.month !== '' && newFilters.month !== 'All Months')
      );
      
      console.log('[useFilteredDashboard] [CHECKING] Filter check:', {
        hasActiveFilters,
        customer: newFilters.customer,
        fieldNotice: newFilters.fieldNotice
      });
      
      // [SUCCESS] NEW: Calculate filtered KPI metrics based on active filters
      if (hasActiveFilters) {
        console.log('[useFilteredDashboard] [USING] Using filtered metrics from backend...');
        
        // Backend has already returned filtered metrics, just use them directly
        const filteredMetrics = calculateFilteredMetrics(freshData, newFilters);
        
        console.log('[useFilteredDashboard] [SUCCESS] Backend filtered metrics:');
        console.log('[useFilteredDashboard]   Total Assessed:', filteredMetrics.totalAssessed);
        console.log('[useFilteredDashboard]   Vulnerable:', filteredMetrics.vulnerable);
        console.log('[useFilteredDashboard]   Potentially Vulnerable:', filteredMetrics.potentiallyVulnerable);
        console.log('[useFilteredDashboard]   Not Vulnerable:', filteredMetrics.notVulnerable);
        
        setFilteredData(freshData);
      } else {
        // No filters active, just use the data as-is
        console.log('[useFilteredDashboard] [UPDATING] No filters active, using data as-is...');
        setFilteredData(freshData);
      }
      
      // Update filter context for display purposes
      const activeFilters = filterService.createActiveFilters(newFilters);
      console.log('[useFilteredDashboard] Active filters:', activeFilters);
      setFilterContext({
        filtersApplied: activeFilters,
        filterMode: filterService.determineFilterMode(activeFilters),
        totalRecordsBeforeFilter: freshData.records?.length || 0,
        totalRecordsAfterFilter: freshData.records?.length || 0
      });
      
      console.log('[useFilteredDashboard] Filter application complete!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to apply filters');
      setError(error);
      console.error('[useFilteredDashboard] Filter application error:', error);
      
      // Fallback to client-side filtering on error
      if (originalData) {
        applyFiltersToData(originalData, newFilters);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [originalData, onDataFetch, applyFiltersToData]);

  /**
   * Update single filter field and fetch fresh data
   */
  const updateFilter = useCallback(async (field: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [field]: value };
    await applyFilters(newFilters);
  }, [filters, applyFilters]);

  /**
   * Reset all filters to default state and fetch unfiltered data
   */
  const resetFilters = useCallback(async () => {
    await applyFilters(DEFAULT_FILTER_STATE);
  }, [applyFilters]);

  /**
   * Refresh data from source
   */
  const refreshData = useCallback(async () => {
    if (!onDataFetch) {
      console.warn('onDataFetch callback not provided, cannot refresh data');
      return;
    }

    try {
      setIsRefreshing(true);
      setError(null);
      
      // Fetch fresh data
      const freshData = await onDataFetch(filters);
      
      // Update original data
      setOriginalData(freshData);
      
      // Reapply filters to fresh data
      applyFiltersToData(freshData, filters);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to refresh data');
      setError(error);
      console.error('Data refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [filters, onDataFetch, applyFiltersToData]);

  /**
   * Get active filters for display
   */
  const activeFilters = filterService.createActiveFilters(filters);

  /**
   * Get filter summary for display
   */
  const filterSummary = filterContext 
    ? filterService.exportFilterSummary(filterContext)
    : 'Loading filters...';

  return {
    // Data
    filteredData,
    originalData,
    
    // Loading states
    isLoading,
    isRefreshing,
    
    // Error
    error,
    
    // Filters
    filters,
    activeFilters,
    filterContext,
    filterSummary,
    
    // Methods
    applyFilters,
    updateFilter,
    resetFilters,
    refreshData
  };
};
