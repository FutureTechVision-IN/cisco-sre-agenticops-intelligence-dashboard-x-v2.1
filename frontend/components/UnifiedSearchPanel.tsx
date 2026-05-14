import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FilterState, Metric, DEFAULT_FILTER_STATE } from '../types';

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
  Mic, 
  ChevronDown, 
  ChevronUp, 
  X, 
  RotateCcw,
  Filter,
  Building2,
  FileText,
  Settings,
  Calendar,
  AlertTriangle,
  Sparkles,
  Loader2
} from 'lucide-react';


// API response type for search options
interface SearchOptionsResponse {
  customers: string[];
  fieldNotices: string[];
  months: string[];
  fnTypes: { type: string; count: number }[];
}

interface Props {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  totalRecords: number;
  onMetricSelect: (metric: Metric) => void;
}

// Debounce hook for search inputs
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
};

// Convert YYYY-MM format to display format "Month Year"
const formatDisplayMonth = (monthYYYYMM: string): string => {
  if (!monthYYYYMM || monthYYYYMM === 'All Months') return '';
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const [year, month] = monthYYYYMM.split('-');
  const monthIdx = parseInt(month) - 1;
  if (monthIdx < 0 || monthIdx > 11) return monthYYYYMM;
  return `${monthNames[monthIdx]} ${year}`;
};

// Convert display format "Month Year" to YYYY-MM
const convertDisplayToMonthFormat = (displayMonth: string): string => {
  if (!displayMonth || displayMonth === 'All Months') return '';
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const parts = displayMonth.toLowerCase().split(' ');
  const monthName = parts[0];
  const year = parts[1];
  const monthIdx = monthNames.indexOf(monthName);
  if (monthIdx === -1 || !year) return displayMonth; // Return as-is if can't parse
  return `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
};

// Filter Select Component
const FilterSelect: React.FC<{ 
  value: string; 
  onChange: (val: string) => void; 
  options: string[]; 
  label: string;
  count: number;
  icon?: React.ReactNode;
  disabled?: boolean;
  isLoading?: boolean;
}> = ({ value, onChange, options, label, count, icon, disabled, isLoading }) => (
  <div className="w-full">
    <div className="flex justify-between items-center mb-1 px-1">
      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
        {icon}
        {label}
      </label>
      <span className="text-xs font-mono text-cyan-400 font-bold bg-cyan-900/20 px-1.5 rounded flex items-center gap-1">
        {isLoading ? <Loader2 size={8} className="animate-spin" /> : count}
      </span>
    </div>
    <div className="relative group">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`appearance-none w-full bg-slate-800/80 border border-slate-600 text-slate-200 text-xs rounded-md px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-all cursor-pointer hover:border-slate-500 shadow-inner ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-slate-800 text-slate-200">{opt}</option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  </div>
);

// Search Input Component
const SearchInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  label: string;
  icon?: React.ReactNode;
  hint?: string;
}> = ({ value, onChange, placeholder, label, icon, hint }) => (
  <div className="w-full">
    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
      {icon}
      {label}
    </label>
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-900/50 border border-slate-600 text-slate-200 text-xs rounded-md px-3 py-2.5 pr-8 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-all placeholder-slate-500"
      />
      <Search size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
    </div>
    {hint && <p className="text-xs text-slate-500 mt-0.5 px-1">{hint}</p>}
  </div>
);

export const UnifiedSearchPanel: React.FC<Props> = ({ filters, setFilters, totalRecords, onMetricSelect }) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  // Helper function to fetch static filter data
  const fetchStaticFilters = async (): Promise<SearchOptionsResponse> => {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const response = await fetch(`${base}/static-data/filters.json`);
    if (!response.ok) throw new Error('Failed to fetch static filters');
    const data = await response.json();
    return {
      customers: data.customers || [],
      fieldNotices: data.fieldNotices || [],
      months: data.months || [],
      fnTypes: (data.fnTypes || []).map((t: string) => ({ type: t, count: 0 }))
    };
  };

  // Fetch dynamic filter counts from API or static files
  const [searchOptions, setSearchOptions] = useState<SearchOptionsResponse | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  useEffect(() => {
    let cancelled = false;
    
    const fetchOptions = async () => {
      setIsLoadingOptions(true);
      
      try {
        // Use static data for GitHub Pages
        if (isStaticHosting()) {
          const staticData = await fetchStaticFilters();
          if (!cancelled) {
            setSearchOptions(staticData);
            setIsLoadingOptions(false);
          }
          return;
        }
        
        // Try API first, fallback to static data if API fails
        try {
          const response = await fetch('/api/search/options');
          if (!response.ok) {
            const staticData = await fetchStaticFilters();
            if (!cancelled) {
              setSearchOptions(staticData);
              setIsLoadingOptions(false);
            }
            return;
          }
          
          const data = await response.json();
          if (data.error || !data.customers?.length) {
            const staticData = await fetchStaticFilters();
            if (!cancelled) {
              setSearchOptions(staticData);
              setIsLoadingOptions(false);
            }
            return;
          }
          
          if (!cancelled) {
            setSearchOptions(data);
            setIsLoadingOptions(false);
          }
        } catch (apiError) {
          const staticData = await fetchStaticFilters();
          if (!cancelled) {
            setSearchOptions(staticData);
            setIsLoadingOptions(false);
          }
        }
      } catch (error) {
        console.error('[UnifiedSearchPanel] Error fetching options:', error);
        if (!cancelled) {
          setIsLoadingOptions(false);
        }
      }
    };
    
    fetchOptions();
    
    return () => { cancelled = true; };
  }, []);
  
  // Extract counts from API response
  const customerCount = searchOptions?.customers?.length ?? 0;
  const fieldNoticeCount = searchOptions?.fieldNotices?.length ?? 0;
  const fnTypeCount = searchOptions?.fnTypes?.length ?? 0;
  const monthCount = searchOptions?.months?.length ?? 0;
  
  // Build dynamic dropdown options from API data
  const customerOptions = useMemo(() => {
    if (!searchOptions?.customers?.length) return ['All Customers'];
    return ['All Customers', ...searchOptions.customers.sort()];
  }, [searchOptions?.customers]);
  
  const fieldNoticeOptions = useMemo(() => {
    if (!searchOptions?.fieldNotices?.length) return ['All Field Notices'];
    return ['All Field Notices', ...searchOptions.fieldNotices.sort()];
  }, [searchOptions?.fieldNotices]);
  
  const fnTypeOptions = useMemo(() => {
    if (!searchOptions?.fnTypes?.length) return ['All Types'];
    return ['All Types', ...searchOptions.fnTypes.map(t => t.type)];
  }, [searchOptions?.fnTypes]);
  
  const monthOptions = useMemo(() => {
    if (!searchOptions?.months?.length) return ['All Months'];
    // Format months nicely (2025-04 -> April 2025)
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const formatted = searchOptions.months.sort().map(m => {
      const [year, month] = m.split('-');
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    });
    return ['All Months', ...formatted];
  }, [searchOptions?.months]);
  
  // Local state for text inputs (debounced)
  const [customerSearchInput, setCustomerSearchInput] = useState(filters.customerSearch || '');
  const [fieldNoticeSearchInput, setFieldNoticeSearchInput] = useState(filters.fieldNoticeSearch || '');
  
  // Debounced values
  const debouncedCustomerSearch = useDebounce(customerSearchInput, 300);
  const debouncedFieldNoticeSearch = useDebounce(fieldNoticeSearchInput, 300);
  
  // Sync debounced values to filters
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      customerSearch: debouncedCustomerSearch,
    }));
  }, [debouncedCustomerSearch, setFilters]);
  
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      fieldNoticeSearch: debouncedFieldNoticeSearch,
    }));
  }, [debouncedFieldNoticeSearch, setFilters]);
  
  // Check if any filter is active
  const hasActiveFilters = 
    filters.customer !== DEFAULT_FILTER_STATE.customer ||
    filters.fieldNotice !== DEFAULT_FILTER_STATE.fieldNotice ||
    filters.fnType !== DEFAULT_FILTER_STATE.fnType ||
    filters.month !== DEFAULT_FILTER_STATE.month ||
    (filters.customerSearch && filters.customerSearch.trim() !== '') ||
    (filters.fieldNoticeSearch && filters.fieldNoticeSearch.trim() !== '') ||
    filters.showOnlyVulnerable;
    
  // Check if advanced search is active
  const hasAdvancedFilters = 
    (filters.customerSearch && filters.customerSearch.trim() !== '') ||
    (filters.fieldNoticeSearch && filters.fieldNoticeSearch.trim() !== '') ||
    filters.showOnlyVulnerable;
  
  // Count active filters
  const activeFilterCount = [
    filters.customer !== DEFAULT_FILTER_STATE.customer,
    filters.fieldNotice !== DEFAULT_FILTER_STATE.fieldNotice,
    filters.fnType !== DEFAULT_FILTER_STATE.fnType,
    filters.month !== DEFAULT_FILTER_STATE.month,
    filters.customerSearch && filters.customerSearch.trim() !== '',
    filters.fieldNoticeSearch && filters.fieldNoticeSearch.trim() !== '',
    filters.showOnlyVulnerable,
  ].filter(Boolean).length;
  
  // Reset all filters
  const handleResetAll = useCallback(() => {
    setFilters(DEFAULT_FILTER_STATE);
    setCustomerSearchInput('');
    setFieldNoticeSearchInput('');
  }, [setFilters]);
  
  // Clear only advanced search
  const handleClearAdvanced = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      customerSearch: '',
      fieldNoticeSearch: '',
      showOnlyVulnerable: false,
    }));
    setCustomerSearchInput('');
    setFieldNoticeSearchInput('');
  }, [setFilters]);
  
  // Auto-expand advanced section if advanced filters are active
  useEffect(() => {
    if (hasAdvancedFilters && !isAdvancedOpen) {
      setIsAdvancedOpen(true);
    }
  }, [hasAdvancedFilters]);
  
  // Validation: Check for conflicts between dropdown and text search
  const hasCustomerConflict = filters.customer !== 'All Customers' && customerSearchInput.trim() !== '';
  const hasFieldNoticeConflict = filters.fieldNotice !== 'All Field Notices' && fieldNoticeSearchInput.trim() !== '';

  return (
    <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
      {/* Main Filter Row */}
      <div className="px-6 py-4">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          
          {/* Left: Voice & Search Toggle */}
          <div className="flex items-center gap-4 xl:w-72 shrink-0">
            <button 
              disabled
              className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-700 text-slate-400 cursor-not-allowed opacity-50"
              title="Voice search available in main dashboard"
            >
              <Mic size={24} />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-widest">Unified Search</span>
                {activeFilterCount > 0 && (
                  <span className="px-1.5 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 rounded-full">
                    {activeFilterCount} active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-tight mt-1">
                Use dropdowns or text search to filter data
              </p>
            </div>
          </div>

          {/* Center: Basic Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
            <FilterSelect 
              label="Customer"
              count={customerCount}
              value={filters.customer}
              onChange={(val) => setFilters(prev => ({...prev, customer: val}))}
              options={customerOptions}
              icon={<Building2 size={10} />}
              disabled={customerSearchInput.trim() !== ''}
              isLoading={isLoadingOptions}
            />
            <FilterSelect 
              label="Field Notice"
              count={fieldNoticeCount}
              value={filters.fieldNotice}
              onChange={(val) => setFilters(prev => ({...prev, fieldNotice: val}))}
              options={fieldNoticeOptions}
              icon={<FileText size={10} />}
              disabled={fieldNoticeSearchInput.trim() !== ''}
              isLoading={isLoadingOptions}
            />
            <FilterSelect 
              label="FN Type"
              count={fnTypeCount}
              value={filters.fnType}
              onChange={(val) => setFilters(prev => ({...prev, fnType: val}))}
              options={fnTypeOptions}
              icon={<Settings size={10} />}
              isLoading={isLoadingOptions}
            />
            <FilterSelect 
              label="Time Period"
              count={monthCount}
              value={filters.month ? formatDisplayMonth(filters.month) : ''}
              onChange={(val) => {
                // Convert display format "August 2025" back to "2025-08"
                const converted = convertDisplayToMonthFormat(val);
                setFilters(prev => ({...prev, month: converted}));
              }}
              options={monthOptions}
              icon={<Calendar size={10} />}
              isLoading={isLoadingOptions}
            />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-md border transition-all ${
                isAdvancedOpen || hasAdvancedFilters
                  ? 'bg-purple-600/20 border-purple-500/50 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                  : 'bg-slate-800/50 border-slate-600 text-slate-300 hover:border-slate-500'
              }`}
            >
              <Sparkles size={14} />
              <span className="hidden sm:inline uppercase tracking-wider">Advanced</span>
              {isAdvancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {hasActiveFilters && (
              <button
                onClick={handleResetAll}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold bg-rose-600/20 border border-rose-500/50 text-rose-300 rounded-md hover:bg-rose-600/30 transition-all"
              >
                <RotateCcw size={14} />
                <span className="hidden sm:inline uppercase tracking-wider">Reset All</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Advanced Search Section (Collapsible) */}
      {isAdvancedOpen && (
        <div className="px-6 py-4 bg-slate-800/30 border-t border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-purple-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Advanced Text Search</span>
              {hasAdvancedFilters && (
                <span className="px-1.5 py-0.5 text-xs font-bold bg-purple-500/20 text-purple-400 rounded">
                  ACTIVE
                </span>
              )}
            </div>
            {hasAdvancedFilters && (
              <button
                onClick={handleClearAdvanced}
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                <X size={12} />
                Clear Advanced
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Customer Text Search */}
            <div>
              <SearchInput
                value={customerSearchInput}
                onChange={setCustomerSearchInput}
                placeholder="Type customer name..."
                label="Customer Search"
                icon={<Building2 size={10} />}
                hint="Partial match supported"
              />
              {hasCustomerConflict && (
                <div className="flex items-center gap-1 mt-1 text-amber-400 text-xs">
                  <AlertTriangle size={10} />
                  <span>Dropdown will be ignored when text search is active</span>
                </div>
              )}
            </div>
            
            {/* Field Notice Text Search */}
            <div>
              <SearchInput
                value={fieldNoticeSearchInput}
                onChange={setFieldNoticeSearchInput}
                placeholder="e.g., FN70496, FN72270..."
                label="Field Notice Search"
                icon={<FileText size={10} />}
                hint="Partial match supported"
              />
              {hasFieldNoticeConflict && (
                <div className="flex items-center gap-1 mt-1 text-amber-400 text-xs">
                  <AlertTriangle size={10} />
                  <span>Dropdown will be ignored when text search is active</span>
                </div>
              )}
            </div>
            
            {/* Show Only Vulnerable Checkbox */}
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer py-2">
                <input
                  type="checkbox"
                  checked={filters.showOnlyVulnerable || false}
                  onChange={(e) => setFilters(prev => ({...prev, showOnlyVulnerable: e.target.checked}))}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-600 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-0"
                />
                <span className="text-xs text-slate-300">Show only records with vulnerabilities</span>
              </label>
            </div>
            
            {/* Filter Summary */}
            <div className="flex items-end">
              <div className="bg-slate-900/50 rounded-md p-3 w-full">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Active Filters</div>
                <div className="text-lg font-bold text-cyan-400 font-mono">
                  {activeFilterCount} <span className="text-xs text-slate-500 font-normal">/ 7</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Search Priority Info */}
          <div className="mt-4 p-3 bg-slate-900/30 rounded-md border border-slate-700/50">
            <div className="flex items-start gap-2">
              <Filter size={14} className="text-cyan-400 mt-0.5 shrink-0" />
              <div className="text-xs text-slate-400">
                <strong className="text-slate-300">Filter Priority:</strong> Text search fields take precedence over dropdown selections. 
                When a text search is active, the corresponding dropdown is disabled. 
                Use "Reset All" to clear both basic and advanced filters simultaneously.
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UnifiedSearchPanel;
