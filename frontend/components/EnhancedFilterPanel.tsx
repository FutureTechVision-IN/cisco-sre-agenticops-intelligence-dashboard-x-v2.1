/**
 * EnhancedFilterPanel - Advanced UI component for filter management
 * Features: Active filter tags, filter dropdowns, real-time refresh, loading indicators
 */

import React, { useState, useMemo } from 'react';
import { X, RefreshCw, RotateCcw, Loader2, Filter, Sparkles } from 'lucide-react';
import { FilterState, DashboardData } from '../types';
import { AdvancedSearchDropdown, DropdownOption } from './AdvancedSearchDropdown';

interface Props {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  activeFilterCount: number;
  filterSummary: string;
  isRefreshing: boolean;
  isLoading: boolean;
  onResetFilters: () => void;
  onRefresh: () => Promise<void>;
  data?: DashboardData;
  onFilterChange?: (field: keyof FilterState, value: string) => void;
  enableAdvancedSearch?: boolean;
}

/**
 * FilterSelect component - Advanced search dropdown for filters
 */
const FilterSelect: React.FC<{
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  isLoading?: boolean;
}> = ({ label, value, options, onChange, isLoading }) => {
  // Convert string options to DropdownOption format
  const dropdownOptions: DropdownOption[] = options.map(opt => ({
    label: opt,
    value: opt
  }));

  return (
    <AdvancedSearchDropdown
      label={label}
      options={dropdownOptions}
      value={value}
      onChange={(val) => onChange(Array.isArray(val) ? val[0] : val)}
      multiSelect={false}
      isLoading={isLoading}
      searchPlaceholder={`Search ${label.toLowerCase()}...`}
      clearLabel={`Clear ${label.toLowerCase()}`}
    />
  );
};

/**
 * FilterTag component - Display active filter with remove button
 */
const FilterTag: React.FC<{
  field: string;
  value: string;
  onRemove: () => void;
  isLoading?: boolean;
}> = ({ field, value, onRemove, isLoading }) => (
  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-full text-sm text-slate-700 hover:from-cyan-100 hover:to-blue-100 transition-all">
    <span className="font-medium">{field}:</span>
    <span className="text-slate-600">{value}</span>
    <button
      onClick={onRemove}
      disabled={isLoading}
      className="ml-1 p-0.5 hover:bg-cyan-200 rounded-full transition-colors disabled:opacity-50"
      aria-label={`Remove ${field} filter`}
    >
      <X className="w-4 h-4" />
    </button>
  </div>
);

/**
 * Enhanced Filter Panel Component
 */
export const EnhancedFilterPanel: React.FC<Props> = ({
  filters,
  setFilters,
  activeFilterCount,
  filterSummary,
  isRefreshing,
  isLoading,
  onResetFilters,
  onRefresh,
  data,
  onFilterChange,
  enableAdvancedSearch = true
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Extract unique values for filter options
  const filterOptions = useMemo(() => {
    if (!data) {
      return {
        customers: [],
        fieldNotices: [],
        fnTypes: [],
        months: []
      };
    }

    const records = data.records || [];

    return {
      customers: Array.from(new Set(
        records
          .map(item => (item as any).customer)
          .filter(Boolean)
          .sort()
      )),
      fieldNotices: Array.from(new Set(
        records
          .map(item => (item as any).fieldNotice)
          .filter(Boolean)
          .sort()
      )),
      fnTypes: Array.from(new Set(
        records
          .map(item => (item as any).fnType)
          .filter(Boolean)
          .sort()
      )),
      months: Array.from(new Set(
        records
          .map(item => (item as any).month)
          .filter(Boolean)
          .sort()
      ))
    };
  }, [data]);

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange?.(field, value);
  };

  const handleRemoveFilter = (field: keyof FilterState) => {
    const newFilters = { ...filters, [field]: '' };
    setFilters(newFilters);
    onFilterChange?.(field, '');
  };

  // Get active filters for tag display
  const activeFilters: Array<{ field: keyof FilterState; value: string }> = [];
  if (filters.customer) activeFilters.push({ field: 'customer', value: filters.customer });
  if (filters.fieldNotice) activeFilters.push({ field: 'fieldNotice', value: filters.fieldNotice });
  if (filters.fnType) activeFilters.push({ field: 'fnType', value: filters.fnType });
  if (filters.month) activeFilters.push({ field: 'month', value: filters.month });

  return (
    <div className="w-full bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg">
            <Filter className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Advanced Filters</h3>
            <p className="text-xs text-gray-600">
              {activeFilterCount > 0 ? (
                <>
                  <span className="font-semibold text-cyan-600">{activeFilterCount}</span>
                  <span> filter{activeFilterCount !== 1 ? 's' : ''} applied</span>
                </>
              ) : (
                'No filters applied - showing all data'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={() => {
              onRefresh().catch(err => console.error('Refresh failed:', err));
            }}
            disabled={isLoading || isRefreshing}
            className="p-2 hover:bg-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh data"
            aria-label="Refresh data"
          >
            {isRefreshing ? (
              <Loader2 className="w-5 h-5 text-cyan-600 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5 text-gray-600 hover:text-cyan-600 transition-colors" />
            )}
          </button>

          {/* Reset Filters Button */}
          {activeFilterCount > 0 && (
            <button
              onClick={onResetFilters}
              disabled={isLoading || isRefreshing}
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Reset all filters"
              aria-label="Reset all filters"
            >
              <RotateCcw className="w-4 h-4 inline mr-1" />
              Reset
            </button>
          )}

          {/* Toggle Advanced View */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`p-2 rounded-lg transition-colors ${
              showAdvanced
                ? 'bg-cyan-100 text-cyan-700'
                : 'hover:bg-white text-gray-600'
            }`}
            title={showAdvanced ? 'Hide filters' : 'Show filters'}
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Active Filters Tags */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-200">
          {activeFilters.map((filter) => (
            <FilterTag
              key={filter.field}
              field={filter.field}
              value={filter.value}
              onRemove={() => handleRemoveFilter(filter.field)}
              isLoading={isLoading || isRefreshing}
            />
          ))}
        </div>
      )}

      {/* Filter Summary */}
      {activeFilterCount > 0 && (
        <div className="mb-4 p-3 bg-cyan-50 border border-cyan-200 rounded-lg text-sm text-cyan-800">
          <p className="font-medium">{filterSummary}</p>
        </div>
      )}

      {/* Filter Controls - Collapsible */}
      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
          <FilterSelect
            label="Customer"
            value={filters.customer || ''}
            options={filterOptions.customers}
            onChange={(value) => handleFilterChange('customer', value)}
            isLoading={isLoading || isRefreshing}
          />

          <FilterSelect
            label="Field Notice"
            value={filters.fieldNotice || ''}
            options={filterOptions.fieldNotices}
            onChange={(value) => handleFilterChange('fieldNotice', value)}
            isLoading={isLoading || isRefreshing}
          />

          <FilterSelect
            label="Type"
            value={filters.fnType || ''}
            options={filterOptions.fnTypes}
            onChange={(value) => handleFilterChange('fnType', value)}
            isLoading={isLoading || isRefreshing}
          />

          <FilterSelect
            label="Month"
            value={filters.month || ''}
            options={filterOptions.months}
            onChange={(value) => handleFilterChange('month', value)}
            isLoading={isLoading || isRefreshing}
          />
        </div>
      )}

      {/* Loading Indicator */}
      {(isLoading || isRefreshing) && (
        <div className="mt-4 flex items-center justify-center gap-2 text-cyan-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">
            {isRefreshing ? 'Refreshing data...' : 'Applying filters...'}
          </span>
        </div>
      )}
    </div>
  );
};

export default EnhancedFilterPanel;
