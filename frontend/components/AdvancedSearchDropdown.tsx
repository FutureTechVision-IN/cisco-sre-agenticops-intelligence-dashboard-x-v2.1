/**
 * Advanced Search Dropdown Component
 * 
 * Features:
 * - Search-as-you-type filtering
 * - Multi-select capability with checkboxes
 * - Clear selection option
 * - Visual grouping and hierarchy
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - ARIA labels for accessibility
 * - Responsive design for mobile/tablet/desktop
 * - Result count display
 * 
 * @module frontend/components/AdvancedSearchDropdown
 * @version 1.0
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';

export interface GroupedOption {
  group?: string;
  options: DropdownOption[];
}

export interface DropdownOption {
  label: string;
  value: string;
}

export interface AdvancedSearchDropdownProps {
  label: string;
  options: DropdownOption[] | GroupedOption[];
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  multiSelect?: boolean;
  searchPlaceholder?: string;
  clearLabel?: string;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  maxHeight?: string;
  showGroupLabels?: boolean;
}

/**
 * Check if options array contains grouped options
 */
const isGroupedOptions = (
  options: DropdownOption[] | GroupedOption[]
): options is GroupedOption[] => {
  return Array.isArray(options) && options.length > 0 && 'group' in (options[0] as any);
};

/**
 * Flatten grouped options to single array for searching
 */
const flattenOptions = (options: DropdownOption[] | GroupedOption[]): DropdownOption[] => {
  if (isGroupedOptions(options)) {
    return options.flatMap(g => g.options);
  }
  return options as DropdownOption[];
};

/**
 * Advanced Search Dropdown Component
 */
export const AdvancedSearchDropdown: React.FC<AdvancedSearchDropdownProps> = ({
  label,
  options,
  value = multiSelect ? [] : '',
  onChange,
  multiSelect = false,
  searchPlaceholder = 'Search...',
  clearLabel = 'Clear Selection',
  isLoading = false,
  disabled = false,
  className = '',
  maxHeight = '400px',
  showGroupLabels = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsListRef = useRef<HTMLDivElement>(null);

  // Ensure value is an array for consistency
  const selectedValues = useMemo(() => {
    if (multiSelect) {
      return Array.isArray(value) ? value : (value ? [value as string] : []);
    }
    return Array.isArray(value) ? value : (value ? [value as string] : []);
  }, [value, multiSelect]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    const flatOptions = flattenOptions(options);
    if (!searchQuery.trim()) {
      return options;
    }

    const query = searchQuery.toLowerCase();
    const filtered = flatOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        opt.value.toLowerCase().includes(query)
    );

    // Rebuild grouped structure if original was grouped
    if (isGroupedOptions(options)) {
      const grouped: GroupedOption[] = [];
      (options as GroupedOption[]).forEach(group => {
        const groupOptions = group.options.filter(opt =>
          filtered.some(f => f.value === opt.value)
        );
        if (groupOptions.length > 0) {
          grouped.push({ group: group.group, options: groupOptions });
        }
      });
      return grouped.length > 0 ? grouped : [];
    }

    return filtered;
  }, [searchQuery, options]);

  // Flatten filtered options for keyboard navigation
  const flatFilteredOptions = useMemo(
    () => flattenOptions(filteredOptions),
    [filteredOptions]
  );

  // Count results
  const resultCount = flatFilteredOptions.length;

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        setIsOpen(true);
        return;
      }

      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev =>
            prev < flatFilteredOptions.length - 1 ? prev + 1 : 0
          );
          break;

        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev =>
            prev > 0 ? prev - 1 : flatFilteredOptions.length - 1
          );
          break;

        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0) {
            handleOptionSelect(flatFilteredOptions[highlightedIndex].value);
          }
          break;

        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;

        case 'Tab':
          setIsOpen(false);
          break;
      }
    },
    [isOpen, highlightedIndex, flatFilteredOptions]
  );

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && optionsListRef.current) {
      const highlightedElement = optionsListRef.current.querySelector(
        `[data-index="${highlightedIndex}"]`
      );
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  /**
   * Handle option selection
   */
  const handleOptionSelect = (selectedValue: string) => {
    if (multiSelect) {
      const newValues = selectedValues.includes(selectedValue)
        ? selectedValues.filter(v => v !== selectedValue)
        : [...selectedValues, selectedValue];
      onChange(newValues);
    } else {
      onChange(selectedValue);
      setIsOpen(false);
      setSearchQuery('');
    }
    setHighlightedIndex(-1);
  };

  /**
   * Handle clear selection
   */
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(multiSelect ? [] : '');
    setSearchQuery('');
    setHighlightedIndex(-1);
  };

  /**
   * Get display text for selected values
   */
  const getDisplayText = () => {
    if (!selectedValues.length) {
      return `Select ${label.toLowerCase()}...`;
    }

    if (!multiSelect) {
      const selected = flattenOptions(options).find(
        opt => opt.value === selectedValues[0]
      );
      return selected?.label || 'Selected';
    }

    if (selectedValues.length === 1) {
      const selected = flattenOptions(options).find(
        opt => opt.value === selectedValues[0]
      );
      return selected?.label || 'Selected';
    }

    return `${selectedValues.length} ${label.toLowerCase()} selected`;
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`} ref={dropdownRef}>
      {/* Label */}
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
        {label}
      </label>

      {/* Button/Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className="relative px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left flex items-center justify-between"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${label} search dropdown`}
      >
        <span className="truncate text-gray-700">{getDisplayText()}</span>
        <div className="flex items-center gap-2 ml-2">
          {selectedValues.length > 0 && (
            <button
              onClick={handleClear}
              className="p-0.5 hover:bg-gray-100 rounded transition-colors"
              aria-label={`Clear ${label.toLowerCase()}`}
              title={clearLabel}
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200 sticky top-0 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                aria-label="Search options"
              />
            </div>

            {/* Result Count */}
            {resultCount > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                {resultCount} {resultCount === 1 ? 'result' : 'results'} found
              </p>
            )}
          </div>

          {/* Options List */}
          {resultCount > 0 ? (
            <div
              ref={optionsListRef}
              className="overflow-y-auto"
              style={{ maxHeight }}
              role="listbox"
            >
              {isGroupedOptions(filteredOptions) ? (
                // Grouped Options
                filteredOptions.map((group, groupIdx) => (
                  <div key={groupIdx}>
                    {showGroupLabels && group.group && (
                      <div className="px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-50 uppercase tracking-wide sticky top-0">
                        {group.group}
                      </div>
                    )}
                    {group.options.map((option, optIdx) => {
                      const globalIndex = flatFilteredOptions.indexOf(option);
                      const isSelected = selectedValues.includes(option.value);
                      const isHighlighted = globalIndex === highlightedIndex;

                      return (
                        <button
                          key={option.value}
                          onClick={() => handleOptionSelect(option.value)}
                          onMouseEnter={() => setHighlightedIndex(globalIndex)}
                          data-index={globalIndex}
                          className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                            isHighlighted
                              ? 'bg-cyan-50 text-cyan-900'
                              : 'text-gray-700 hover:bg-gray-50'
                          } ${isSelected ? 'bg-cyan-100' : ''}`}
                          role="option"
                          aria-selected={isSelected}
                        >
                          {multiSelect && (
                            <div
                              className={`w-4 h-4 border border-gray-300 rounded flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-cyan-600 border-cyan-600'
                                  : 'border-gray-300'
                              }`}
                            >
                              {isSelected && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                          )}
                          <span className="flex-1">{option.label}</span>
                          {!multiSelect && isSelected && (
                            <Check className="w-4 h-4 text-cyan-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              ) : (
                // Flat Options
                flatFilteredOptions.map((option, idx) => {
                  const isSelected = selectedValues.includes(option.value);
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <button
                      key={option.value}
                      onClick={() => handleOptionSelect(option.value)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      data-index={idx}
                      className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                        isHighlighted
                          ? 'bg-cyan-50 text-cyan-900'
                          : 'text-gray-700 hover:bg-gray-50'
                      } ${isSelected ? 'bg-cyan-100' : ''}`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      {multiSelect && (
                        <div
                          className={`w-4 h-4 border border-gray-300 rounded flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-cyan-600 border-cyan-600'
                              : 'border-gray-300'
                          }`}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                      )}
                      <span className="flex-1">{option.label}</span>
                      {!multiSelect && isSelected && (
                        <Check className="w-4 h-4 text-cyan-600" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            // No Results
            <div className="px-3 py-6 text-center text-sm text-gray-500">
              <p>No results found for "{searchQuery}"</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          )}

          {/* Clear All (Multi-Select) */}
          {multiSelect && selectedValues.length > 0 && (
            <div className="border-t border-gray-200 p-3 sticky bottom-0 bg-white">
              <button
                onClick={handleClear}
                className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                aria-label={`Clear all ${label.toLowerCase()} selections`}
              >
                {clearLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedSearchDropdown;
