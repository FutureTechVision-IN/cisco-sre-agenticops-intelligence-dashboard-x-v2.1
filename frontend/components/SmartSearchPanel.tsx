import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FilterState, Metric, DEFAULT_FILTER_STATE } from '../types';
import { autocorrect, formatCorrectionHint, type AutocorrectResult } from '../utils/autocorrect';

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
  X, 
  RotateCcw,
  Building2,
  FileText,
  Settings,
  Calendar,
  Loader2,
  Tag,
  ArrowUp,
  ArrowDown,
  CornerDownLeft
} from 'lucide-react';
import { VoiceSearchMic, VoiceSearchResult } from './VoiceSearchMic';

// API response type for search options
interface SearchOptionsResponse {
  customers: string[];
  fieldNotices: string[];
  months: string[];
  fnTypes: { type: string; count: number }[];
}

// Suggestion item interface
interface Suggestion {
  type: 'customer' | 'fieldNotice' | 'fnType' | 'month';
  value: string;
  displayValue: string;
  score: number;
  icon: React.ReactNode;
  category: string;
}

interface Props {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  totalRecords: number;
  onMetricSelect: (metric: Metric) => void;
}

// Debounce hook
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
};

// Fuzzy matching algorithm - returns score (higher = better match)
const fuzzyMatch = (text: string, query: string): number => {
  if (!query) return 0;
  
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact match
  if (textLower === queryLower) return 1000;
  
  // Starts with query
  if (textLower.startsWith(queryLower)) return 900 + (queryLower.length / textLower.length) * 100;
  
  // Contains query as word
  const words = textLower.split(/[\s\-_,]+/);
  for (let i = 0; i < words.length; i++) {
    if (words[i].startsWith(queryLower)) {
      return 800 - i * 10 + (queryLower.length / words[i].length) * 50;
    }
  }
  
  // Contains query anywhere
  const idx = textLower.indexOf(queryLower);
  if (idx !== -1) {
    return 700 - idx + (queryLower.length / textLower.length) * 50;
  }
  
  // Fuzzy character matching
  let score = 0;
  let queryIdx = 0;
  let consecutiveBonus = 0;
  
  for (let i = 0; i < textLower.length && queryIdx < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIdx]) {
      score += 10 + consecutiveBonus;
      consecutiveBonus += 5;
      queryIdx++;
    } else {
      consecutiveBonus = 0;
    }
  }
  
  // Only return score if all query characters were found
  if (queryIdx === queryLower.length) {
    return score * (queryLower.length / textLower.length);
  }
  
  return 0;
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

// Active filter tag component
const FilterTag: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  onRemove: () => void;
}> = ({ label, value, icon, onRemove }) => (
  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-sm">
    <span className="text-cyan-400">{icon}</span>
    <span className="text-slate-300">{label}:</span>
    <span className="text-cyan-300 font-medium max-w-32 truncate">{value}</span>
    <button 
      onClick={onRemove}
      className="ml-1 p-0.5 hover:bg-cyan-500/30 rounded-full transition-colors"
      aria-label={`Remove ${label} filter`}
    >
      <X size={14} className="text-cyan-400" />
    </button>
  </div>
);

// Filter Select Component
const FilterSelect: React.FC<{ 
  value: string; 
  onChange: (val: string) => void; 
  options: string[]; 
  label: string;
  count: number;
  icon?: React.ReactNode;
  isLoading?: boolean;
}> = ({ value, onChange, options, label, count, icon, isLoading }) => (
  <div className="w-full">
    <div className="flex justify-between items-center mb-1.5 px-1">
      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
        {icon}
        {label}
      </label>
      <span className="text-xs font-mono text-cyan-400 font-bold bg-cyan-900/20 px-2 py-0.5 rounded flex items-center gap-1">
        {isLoading ? <Loader2 size={10} className="animate-spin" /> : count}
      </span>
    </div>
    <div className="relative group">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full bg-slate-800/80 border border-slate-600 text-slate-200 text-sm rounded-md px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 transition-all cursor-pointer hover:border-slate-500 shadow-inner"
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

export const SmartSearchPanel: React.FC<Props> = ({ filters, setFilters, totalRecords, onMetricSelect }) => {
  const [searchInput, setSearchInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [biTextQuery, setBiTextQuery] = useState('');
  const [autocorrectHint, setAutocorrectHint] = useState<AutocorrectResult | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // Debounced search for performance
  const debouncedSearch = useDebounce(searchInput, 150);
  
  // Helper function to fetch static filter data
  const fetchStaticFilters = async (): Promise<SearchOptionsResponse> => {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const response = await fetch(`${base}/static-data/filters.json`);
    if (!response.ok) throw new Error('Failed to fetch static filters');
    const data = await response.json();
    // Transform to expected format
    // data.fnTypes may be string[] (API) or {type,count,color}[] (static filters.json)
    return {
      customers: data.customers || [],
      fieldNotices: data.fieldNotices || [],
      months: data.months || [],
      fnTypes: (data.fnTypes || []).map((t: any) =>
        typeof t === 'string' ? { type: t, count: 0 } : { type: String(t.type ?? t), count: t.count ?? 0 }
      )
    };
  };

  // Fetch dynamic filter options from API or static files
  const [searchOptions, setSearchOptions] = useState<SearchOptionsResponse | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [searchOptionsError, setSearchOptionsError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    const fetchOptions = async () => {
      console.log('[SmartSearchPanel] Fetching filter options...');
      setIsLoadingOptions(true);
      setSearchOptionsError(null);
      
      try {
        // Use static data for GitHub Pages
        if (isStaticHosting()) {
          console.log('[SmartSearchPanel] Static hosting detected, using static filters');
          const staticData = await fetchStaticFilters();
          if (!cancelled) {
            setSearchOptions(staticData);
            setIsLoadingOptions(false);
          }
          return;
        }
        
        // Try API first, fallback to static data if API fails
        try {
          console.log('[SmartSearchPanel] Fetching from /api/search/options');
          const response = await fetch('/api/search/options');
          console.log('[SmartSearchPanel] API response status:', response.status);
          
          if (!response.ok) {
            console.log('[SmartSearchPanel] API failed, falling back to static filters');
            const staticData = await fetchStaticFilters();
            if (!cancelled) {
              setSearchOptions(staticData);
              setIsLoadingOptions(false);
            }
            return;
          }
          
          const data = await response.json();
          console.log('[SmartSearchPanel] API data received:', {
            customers: data.customers?.length || 0,
            fieldNotices: data.fieldNotices?.length || 0,
            months: data.months?.length || 0,
            fnTypes: data.fnTypes?.length || 0
          });
          
          if (data.error || !data.customers?.length) {
            console.log('[SmartSearchPanel] API returned empty/error, falling back to static filters');
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
          console.log('[SmartSearchPanel] API error, falling back to static filters:', apiError);
          const staticData = await fetchStaticFilters();
          if (!cancelled) {
            setSearchOptions(staticData);
            setIsLoadingOptions(false);
          }
        }
      } catch (error) {
        console.error('[SmartSearchPanel] Error fetching options:', error);
        if (!cancelled) {
          setSearchOptionsError(error instanceof Error ? error : new Error(String(error)));
          setIsLoadingOptions(false);
        }
      }
    };
    
    fetchOptions();
    
    return () => { cancelled = true; };
  }, []);

  // Cascading filter options: when filters change, refetch available options
  // so dropdowns only show valid combinations based on the current filter state
  useEffect(() => {
    // Skip on static hosting or if initial options haven't loaded yet
    if (isStaticHosting() || !searchOptions) return;

    const hasActiveFilters = (
      (filters.customer && filters.customer !== 'All Customers') ||
      (filters.fieldNotice && filters.fieldNotice !== 'All Field Notices') ||
      (filters.fnType && filters.fnType !== 'All Types') ||
      (filters.month && filters.month !== '' && filters.month !== 'All Months')
    );

    // Only cascade when there's at least one active filter
    if (!hasActiveFilters) return;

    let cancelled = false;
    const fetchCascadingOptions = async () => {
      try {
        const params = new URLSearchParams();
        if (filters.customer && filters.customer !== 'All Customers') {
          params.append('customer', filters.customer);
        }
        if (filters.fieldNotice && filters.fieldNotice !== 'All Field Notices') {
          params.append('fieldNotice', filters.fieldNotice);
        }
        if (filters.fnType && filters.fnType !== 'All Types') {
          params.append('fnType', filters.fnType);
        }
        if (filters.month && filters.month !== '' && filters.month !== 'All Months') {
          params.append('month', filters.month);
        }
        
        const response = await fetch(`/api/search/options/filtered?${params.toString()}`);
        if (!response.ok) return; // Silently fail - keep existing options

        const data = await response.json();
        if (!cancelled && data.customers) {
          setSearchOptions(prev => prev ? {
            ...prev,
            customers: data.customers || prev.customers,
            fieldNotices: data.fieldNotices || prev.fieldNotices,
            months: data.months || prev.months,
            fnTypes: (data.fnTypes || prev.fnTypes).map((t: any) =>
              typeof t === 'string' ? { type: t, count: 0 } : { type: String(t.type ?? t), count: t.count ?? 0 }
            ),
          } : prev);
        }
      } catch (e) {
        // Silently fail - keep existing options
        console.warn('[SmartSearchPanel] Cascading filter fetch failed:', e);
      }
    };

    fetchCascadingOptions();
    return () => { cancelled = true; };
  }, [filters.customer, filters.fieldNotice, filters.fnType, filters.month]);

  // Debug logging
  console.log('[SmartSearchPanel] searchOptions state:', {
    hasData: !!searchOptions,
    isLoading: isLoadingOptions,
    error: searchOptionsError?.message,
    customerCount: searchOptions?.customers?.length ?? 0,
    fieldNoticeCount: searchOptions?.fieldNotices?.length ?? 0,
    monthCount: searchOptions?.months?.length ?? 0,
    fnTypeCount: searchOptions?.fnTypes?.length ?? 0
  });
  
  // Extract counts
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
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const formatted = searchOptions.months.sort().map(m => {
      const [year, month] = m.split('-');
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    });
    return ['All Months', ...formatted];
  }, [searchOptions?.months]);
  
  // Format month for display
  const formatMonth = useCallback((month: string): string => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const [year, m] = month.split('-');
    return `${monthNames[parseInt(m) - 1]} ${year}`;
  }, []);
  
  // Generate suggestions based on search input
  const suggestions = useMemo((): Suggestion[] => {
    if (!debouncedSearch.trim() || !searchOptions) return [];
    
    const query = debouncedSearch.trim();
    const results: Suggestion[] = [];
    
    // Search customers
    searchOptions.customers?.forEach(customer => {
      const score = fuzzyMatch(customer, query);
      if (score > 0) {
        results.push({
          type: 'customer',
          value: customer,
          displayValue: customer,
          score,
          icon: <Building2 size={14} />,
          category: 'Customers'
        });
      }
    });
    
    // Search field notices
    searchOptions.fieldNotices?.forEach(fn => {
      const score = fuzzyMatch(fn, query);
      if (score > 0) {
        results.push({
          type: 'fieldNotice',
          value: fn,
          displayValue: fn,
          score,
          icon: <FileText size={14} />,
          category: 'Field Notices'
        });
      }
    });
    
    // Search FN types
    searchOptions.fnTypes?.forEach(fnType => {
      const score = fuzzyMatch(fnType.type, query);
      if (score > 0) {
        results.push({
          type: 'fnType',
          value: fnType.type,
          displayValue: `${fnType.type} (${fnType.count.toLocaleString()} records)`,
          score,
          icon: <Settings size={14} />,
          category: 'FN Types'
        });
      }
    });
    
    // Search months
    searchOptions.months?.forEach(month => {
      const formatted = formatMonth(month);
      const score = Math.max(fuzzyMatch(month, query), fuzzyMatch(formatted, query));
      if (score > 0) {
        results.push({
          type: 'month',
          value: formatted,
          displayValue: formatted,
          score,
          icon: <Calendar size={14} />,
          category: 'Time Periods'
        });
      }
    });
    
    // Sort by score (highest first) and limit to top 15 results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);
  }, [debouncedSearch, searchOptions, formatMonth]);
  
  // Group suggestions by category
  const groupedSuggestions = useMemo(() => {
    const groups: Record<string, Suggestion[]> = {};
    suggestions.forEach(s => {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    });
    return groups;
  }, [suggestions]);
  
  // Handle suggestion selection
  const handleSelectSuggestion = useCallback((suggestion: Suggestion) => {
    switch (suggestion.type) {
      case 'customer':
        setFilters(prev => ({ ...prev, customer: suggestion.value }));
        break;
      case 'fieldNotice':
        setFilters(prev => ({ ...prev, fieldNotice: suggestion.value }));
        break;
      case 'fnType':
        setFilters(prev => ({ ...prev, fnType: suggestion.value }));
        break;
      case 'month':
        setFilters(prev => ({ ...prev, month: suggestion.value }));
        break;
    }
    setSearchInput('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
  }, [setFilters]);
  
  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // BI command detection: if Enter is pressed with a BI-style query, send it to VoiceSearchMic
    if (e.key === 'Enter' && searchInput.trim()) {
      const t = searchInput.toLowerCase();

      // Run autocorrect on the raw input
      const acResult = autocorrect(searchInput.trim());
      const correctedInput = acResult.wasChanged ? acResult.corrected : searchInput.trim();
      const ct = correctedInput.toLowerCase();

      // Show autocorrect hint if corrections were made
      if (acResult.wasChanged) {
        setAutocorrectHint(acResult);
        setSearchInput(correctedInput);
      } else {
        setAutocorrectHint(null);
      }

      const isBICommand = /\btop\b.*\b(customer|field|notice|fn)/i.test(ct) ||
        /\b(extreme|critical|high.?risk|metric|summary|overview|dashboard|status)\b/i.test(ct) ||
        /\b(show|list|get|find|display)\b.*\b(customer|field|notice|metric|vuln)/i.test(ct);
      if (isBICommand) {
        e.preventDefault();
        // Trigger BI query via VoiceSearchMic textQuery prop (use corrected text)
        setBiTextQuery(correctedInput + '#' + Date.now());
        setShowSuggestions(false);
        return;
      }
    }

    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && searchInput.trim()) {
        setShowSuggestions(true);
        setSelectedIndex(0);
        e.preventDefault();
      }
      return;
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
      case 'Tab':
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault();
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
    }
  }, [showSuggestions, suggestions, selectedIndex, handleSelectSuggestion, searchInput, setBiTextQuery, setAutocorrectHint]);
  
  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionsRef.current) {
      const items = suggestionsRef.current.querySelectorAll('[data-suggestion-item]');
      items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);
  
  // Show suggestions when typing
  useEffect(() => {
    if (debouncedSearch.trim() && suggestions.length > 0) {
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  }, [debouncedSearch, suggestions.length]);
  
  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current && !inputRef.current.contains(e.target as Node) &&
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Check active filters
  const activeFilters = useMemo(() => {
    const active: { key: keyof FilterState; label: string; value: string; icon: React.ReactNode }[] = [];
    
    if (filters.customer !== 'All Customers') {
      active.push({ key: 'customer', label: 'Customer', value: filters.customer, icon: <Building2 size={10} /> });
    }
    if (filters.fieldNotice !== 'All Field Notices') {
      active.push({ key: 'fieldNotice', label: 'Field Notice', value: filters.fieldNotice, icon: <FileText size={10} /> });
    }
    if (filters.fnType !== 'All Types') {
      active.push({ key: 'fnType', label: 'Type', value: filters.fnType, icon: <Settings size={10} /> });
    }
    if (filters.month !== 'All Months') {
      active.push({ key: 'month', label: 'Period', value: filters.month, icon: <Calendar size={10} /> });
    }
    
    return active;
  }, [filters]);
  
  const hasActiveFilters = activeFilters.length > 0;
  
  // Remove specific filter
  const removeFilter = useCallback((key: keyof FilterState) => {
    const defaults: Record<string, string> = {
      customer: 'All Customers',
      fieldNotice: 'All Field Notices',
      fnType: 'All Types',
      month: 'All Months'
    };
    setFilters(prev => ({ ...prev, [key]: defaults[key as string] ?? prev[key] }));
  }, [setFilters]);
  
  // Reset all filters
  const handleResetAll = useCallback(() => {
    setFilters(DEFAULT_FILTER_STATE);
    setSearchInput('');
  }, [setFilters]);
  
  // Highlight matching text in suggestions
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <span key={i} className="text-cyan-300 font-semibold bg-cyan-500/20 rounded px-0.5">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
      <div className="px-4 sm:px-6 py-4">
        {/* Main Search Row */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Container */}
          <div className="flex-1 flex items-center gap-3">
            {/* Advanced Voice Search Mic */}
            <VoiceSearchMic
              customers={searchOptions?.customers || []}
              fieldNotices={searchOptions?.fieldNotices || []}
              fnTypes={searchOptions?.fnTypes?.map(t => t.type) || []}
              months={monthOptions.filter(m => m !== 'All Months')}
              textQuery={biTextQuery}
              onResult={(result: VoiceSearchResult) => {
                // Apply the first matched customer
                if (result.matchedCustomers.length > 0) {
                  setFilters(prev => ({ ...prev, customer: result.matchedCustomers[0] }));
                }
                // Apply the first matched field notice
                if (result.matchedFieldNotices.length > 0) {
                  setFilters(prev => ({ ...prev, fieldNotice: result.matchedFieldNotices[0] }));
                }
                // Apply the first matched FN type
                if (result.matchedFnTypes.length > 0) {
                  setFilters(prev => ({ ...prev, fnType: result.matchedFnTypes[0] }));
                }
                // Apply the first matched month
                if (result.matchedMonths.length > 0) {
                  setFilters(prev => ({ ...prev, month: result.matchedMonths[0] }));
                }
                // Handle reset intent
                if (result.intent === 'reset_filters') {
                  setFilters(DEFAULT_FILTER_STATE);
                  setSearchInput('');
                }
              }}
              onTranscript={(text) => setSearchInput(text)}
            />
            
            {/* Smart Search Input */}
            <div className="flex-1 relative">
              <div className={`relative flex items-center bg-slate-800/80 border rounded-xl transition-all ${
                isFocused 
                  ? 'border-cyan-500 ring-2 ring-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.15)]' 
                  : 'border-slate-600 hover:border-slate-500'
              }`}>
                <Search size={18} className={`ml-4 shrink-0 transition-colors ${isFocused ? 'text-cyan-400' : 'text-slate-500'}`} />
                
                <input
                  ref={inputRef}
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search customers, field notices, types, or time periods..."
                  className="flex-1 bg-transparent text-slate-200 text-sm px-3 py-3.5 focus:outline-none placeholder-slate-500"
                  aria-label="Smart search"
                  aria-autocomplete="list"
                  aria-controls="search-suggestions"
                  aria-expanded={showSuggestions}
                  role="combobox"
                />
                
                {/* Clear button */}
                {searchInput && (
                  <button
                    onClick={() => {
                      setSearchInput('');
                      inputRef.current?.focus();
                    }}
                    className="p-2 mr-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                    aria-label="Clear search"
                  >
                    <X size={16} className="text-slate-400" />
                  </button>
                )}
              </div>

              {/* Autocorrect Hint */}
              {autocorrectHint && autocorrectHint.wasChanged && (
                <div className="absolute top-full left-0 right-0 mt-1 px-4 py-2 bg-amber-900/40 border border-amber-700/40 rounded-lg backdrop-blur-sm z-60 flex items-center gap-2 text-xs">
                  <span className="text-amber-400 font-medium shrink-0">Auto-corrected:</span>
                  <span className="text-slate-400 line-through truncate">{autocorrectHint.original}</span>
                  <span className="text-slate-500">&rarr;</span>
                  <span className="text-emerald-300 font-medium truncate">{autocorrectHint.corrected}</span>
                  <button
                    onClick={() => { setSearchInput(autocorrectHint.original); setAutocorrectHint(null); }}
                    className="ml-auto text-[10px] text-slate-500 hover:text-slate-300 shrink-0 underline"
                  >Undo</button>
                  <button
                    onClick={() => setAutocorrectHint(null)}
                    className="text-slate-500 hover:text-slate-300 shrink-0 p-0.5"
                    aria-label="Dismiss"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              
              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  id="search-suggestions"
                  role="listbox"
                  className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50 max-h-80 overflow-y-auto"
                >
                  {/* Keyboard hint */}
                  <div className="px-3 py-2 bg-slate-700/50 border-b border-slate-600 flex items-center justify-between">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">
                      {suggestions.length} result{suggestions.length !== 1 ? 's' : ''} found
                    </span>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><ArrowUp size={10} /><ArrowDown size={10} /> Navigate</span>
                      <span className="flex items-center gap-1"><CornerDownLeft size={10} /> Select</span>
                    </div>
                  </div>
                  
                  {/* Grouped suggestions */}
                  {Object.entries(groupedSuggestions).map(([category, items]) => (
                    <div key={category}>
                      <div className="px-3 py-1.5 bg-slate-900/50 text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-0">
                        {category}
                      </div>
                      {items.map((suggestion, idx) => {
                        const globalIndex = suggestions.indexOf(suggestion);
                        return (
                          <button
                            key={`${suggestion.type}-${suggestion.value}`}
                            data-suggestion-item
                            role="option"
                            aria-selected={selectedIndex === globalIndex}
                            onClick={() => handleSelectSuggestion(suggestion)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                              selectedIndex === globalIndex
                                ? 'bg-cyan-500/20 text-white'
                                : 'text-slate-300 hover:bg-slate-700/50'
                            }`}
                          >
                            <span className={`shrink-0 ${selectedIndex === globalIndex ? 'text-cyan-400' : 'text-slate-500'}`}>
                              {suggestion.icon}
                            </span>
                            <span className="flex-1 text-sm truncate">
                              {highlightMatch(suggestion.displayValue, debouncedSearch)}
                            </span>
                            {selectedIndex === globalIndex && (
                              <span className="text-xs text-cyan-400 bg-cyan-500/20 px-1.5 py-0.5 rounded">
                                Press Enter
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
              
              {/* No results message */}
              {showSuggestions && debouncedSearch.trim() && suggestions.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl shadow-black/50 p-4 z-50">
                  <div className="flex items-center gap-3 text-slate-400">
                    <Search size={20} className="text-slate-500" />
                    <div>
                      <p className="text-sm">No results found for "{debouncedSearch}"</p>
                      <p className="text-xs text-slate-500 mt-1">Try different keywords or check spelling</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                onClick={handleResetAll}
                className="hidden sm:flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 rounded-xl border border-cyan-500/50 shadow-lg transition-all shrink-0"
                aria-label="Reset all filters"
              >
                <RotateCcw size={16} />
                <span className="hidden lg:inline uppercase tracking-wider">Reset</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Dropdown Filters Row */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(() => {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('[🔍 SmartSearchPanel DEBUG] DROPDOWN RENDERING');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('[DEBUG] searchOptions:', searchOptions);
            console.log('[DEBUG] customerOptions:', customerOptions);
            console.log('[DEBUG] fieldNoticeOptions:', fieldNoticeOptions);
            console.log('[DEBUG] fnTypeOptions:', fnTypeOptions);
            console.log('[DEBUG] monthOptions:', monthOptions);
            console.log('[DEBUG] filters:', filters);
            console.log('[DEBUG] customerCount:', customerCount);
            console.log('[DEBUG] fieldNoticeCount:', fieldNoticeCount);
            console.log('[DEBUG] monthCount:', monthCount);
            console.log('[DEBUG] fnTypeCount:', fnTypeCount);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            return null;
          })()}
          <FilterSelect 
            label="Customer"
            count={customerCount}
            value={filters.customer}
            onChange={(val) => {
              console.log('[🔧 SmartSearchPanel DEBUG] Customer filter changed:', val);
              setFilters(prev => ({...prev, customer: val}));
            }}
            options={customerOptions}
            icon={<Building2 size={10} />}
            isLoading={isLoadingOptions}
          />
          <FilterSelect 
            label="Field Notice"
            count={fieldNoticeCount}
            value={filters.fieldNotice}
            onChange={(val) => {
              console.log('[🔧 SmartSearchPanel DEBUG] Field Notice filter changed:', val);
              setFilters(prev => ({...prev, fieldNotice: val}));
            }}
            options={fieldNoticeOptions}
            icon={<FileText size={10} />}
            isLoading={isLoadingOptions}
          />
          <FilterSelect 
            label="FN Type"
            count={fnTypeCount}
            value={filters.fnType}
            onChange={(val) => {
              console.log('[🔧 SmartSearchPanel DEBUG] FN Type filter changed:', val);
              setFilters(prev => ({...prev, fnType: val}));
            }}
            options={fnTypeOptions}
            icon={<Settings size={10} />}
            isLoading={isLoadingOptions}
          />
          <FilterSelect 
            label="Time Period"
            count={monthCount}
            value={filters.month ? formatDisplayMonth(filters.month) : ''}
            onChange={(val) => {
              console.log('[🔧 SmartSearchPanel DEBUG] Time Period filter changed:', val);
              // Convert display format "August 2025" back to "2025-08"
              const converted = convertDisplayToMonthFormat(val);
              console.log('[🔧 SmartSearchPanel DEBUG] Converted Time Period:', converted);
              setFilters(prev => ({...prev, month: converted}));
            }}
            options={monthOptions}
            icon={<Calendar size={10} />}
            isLoading={isLoadingOptions}
          />
        </div>
        
        {/* Active Filters Row */}
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Tag size={14} className="text-slate-500" />
            <span className="text-xs text-slate-500 uppercase tracking-wider mr-1">Active:</span>
            {activeFilters.map((filter) => (
              <FilterTag
                key={filter.key}
                label={filter.label}
                value={filter.value}
                icon={filter.icon}
                onRemove={() => removeFilter(filter.key)}
              />
            ))}
            
            {/* Mobile Reset */}
            <button
              onClick={handleResetAll}
              className="sm:hidden flex items-center gap-1 px-2 py-1 text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors"
            >
              <RotateCcw size={12} />
              Clear All
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

export default SmartSearchPanel;
