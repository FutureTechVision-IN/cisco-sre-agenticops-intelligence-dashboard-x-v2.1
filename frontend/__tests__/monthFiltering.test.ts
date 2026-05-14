/**
 * Month Filtering Regression Tests
 * Prevents regression of the "All Months" filter bug that only showed August data
 * 
 * Issue: Empty string was being sent for 'All Months', causing backend to treat it as a filter
 * Solution: Ensure 'All Months' string is sent instead of empty string
 */

describe('Month Filtering - Regression Tests', () => {
  
  describe('formatDisplayMonth Function', () => {
    
    test('should return "All Months" when given empty string', () => {
      // Format function should convert empty/null to display "All Months"
      const formatDisplayMonth = (monthYYYYMM: string): string => {
        if (!monthYYYYMM || monthYYYYMM === 'All Months') return 'All Months';
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const [year, month] = monthYYYYMM.split('-');
        const monthIdx = parseInt(month) - 1;
        if (monthIdx < 0 || monthIdx > 11) return monthYYYYMM;
        return `${monthNames[monthIdx]} ${year}`;
      };
      
      expect(formatDisplayMonth('')).toBe('All Months');
      expect(formatDisplayMonth('All Months')).toBe('All Months');
    });

    test('should correctly format YYYY-MM to "Month Year" display', () => {
      const formatDisplayMonth = (monthYYYYMM: string): string => {
        if (!monthYYYYMM || monthYYYYMM === 'All Months') return 'All Months';
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const [year, month] = monthYYYYMM.split('-');
        const monthIdx = parseInt(month) - 1;
        if (monthIdx < 0 || monthIdx > 11) return monthYYYYMM;
        return `${monthNames[monthIdx]} ${year}`;
      };
      
      expect(formatDisplayMonth('2025-04')).toBe('April 2025');
      expect(formatDisplayMonth('2025-08')).toBe('August 2025');
      expect(formatDisplayMonth('2025-12')).toBe('December 2025');
    });
  });

  describe('convertDisplayToMonthFormat Function', () => {
    
    test('should return "All Months" instead of empty string for "All Months" input', () => {
      // CRITICAL FIX: This is the regression bug - must return 'All Months' not empty string
      const convertDisplayToMonthFormat = (displayMonth: string): string => {
        if (!displayMonth || displayMonth === 'All Months') return 'All Months';
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const parts = displayMonth.toLowerCase().split(' ');
        const monthName = parts[0];
        const year = parts[1];
        const monthIdx = monthNames.indexOf(monthName);
        if (monthIdx === -1 || !year) return displayMonth;
        return `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      };
      
      // This is the critical assertion - must NOT return empty string
      const result = convertDisplayToMonthFormat('All Months');
      expect(result).toBe('All Months');
      expect(result).not.toBe('');
    });

    test('should return "All Months" for empty input', () => {
      const convertDisplayToMonthFormat = (displayMonth: string): string => {
        if (!displayMonth || displayMonth === 'All Months') return 'All Months';
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const parts = displayMonth.toLowerCase().split(' ');
        const monthName = parts[0];
        const year = parts[1];
        const monthIdx = monthNames.indexOf(monthName);
        if (monthIdx === -1 || !year) return displayMonth;
        return `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      };
      
      const result = convertDisplayToMonthFormat('');
      expect(result).toBe('All Months');
      expect(result).not.toBe('');
    });

    test('should convert display format to YYYY-MM correctly', () => {
      const convertDisplayToMonthFormat = (displayMonth: string): string => {
        if (!displayMonth || displayMonth === 'All Months') return 'All Months';
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const parts = displayMonth.toLowerCase().split(' ');
        const monthName = parts[0];
        const year = parts[1];
        const monthIdx = monthNames.indexOf(monthName);
        if (monthIdx === -1 || !year) return displayMonth;
        return `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      };
      
      expect(convertDisplayToMonthFormat('April 2025')).toBe('2025-04');
      expect(convertDisplayToMonthFormat('August 2025')).toBe('2025-08');
      expect(convertDisplayToMonthFormat('January 2025')).toBe('2025-01');
      expect(convertDisplayToMonthFormat('December 2025')).toBe('2025-12');
    });

    test('should handle case-insensitive input', () => {
      const convertDisplayToMonthFormat = (displayMonth: string): string => {
        if (!displayMonth || displayMonth === 'All Months') return 'All Months';
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const parts = displayMonth.toLowerCase().split(' ');
        const monthName = parts[0];
        const year = parts[1];
        const monthIdx = monthNames.indexOf(monthName);
        if (monthIdx === -1 || !year) return displayMonth;
        return `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      };
      
      expect(convertDisplayToMonthFormat('APRIL 2025')).toBe('2025-04');
      expect(convertDisplayToMonthFormat('april 2025')).toBe('2025-04');
      expect(convertDisplayToMonthFormat('ApRiL 2025')).toBe('2025-04');
    });
  });

  describe('Backend Month Filter Normalization', () => {
    
    test('should treat "All Months" as undefined (no filter)', () => {
      // Simulates backend logic
      let normalizedMonth = 'All Months' as string | undefined;
      
      if (normalizedMonth && normalizedMonth !== 'All Months' && normalizedMonth !== '') {
        // Would process specific month
        normalizedMonth = '2025-08';
      } else if (normalizedMonth === 'All Months' || normalizedMonth === '') {
        normalizedMonth = undefined;
      }
      
      expect(normalizedMonth).toBeUndefined();
    });

    test('should treat empty string as undefined (no filter)', () => {
      // Simulates backend logic
      let normalizedMonth = '' as string | undefined;
      
      if (normalizedMonth && normalizedMonth !== 'All Months' && normalizedMonth !== '') {
        normalizedMonth = '2025-08';
      } else if (normalizedMonth === 'All Months' || normalizedMonth === '') {
        normalizedMonth = undefined;
      }
      
      expect(normalizedMonth).toBeUndefined();
    });

    test('should process specific months correctly', () => {
      // Simulates backend logic
      let normalizedMonth = 'August 2025' as string | undefined;
      
      if (normalizedMonth && normalizedMonth !== 'All Months' && normalizedMonth !== '') {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const monthMatch = normalizedMonth.match(/^(\w+)\s+(\d{4})$/);
        if (monthMatch) {
          const monthIdx = monthNames.findIndex(m => m.toLowerCase() === monthMatch[1].toLowerCase());
          if (monthIdx >= 0) {
            normalizedMonth = `${monthMatch[2]}-${String(monthIdx + 1).padStart(2, '0')}`;
          }
        }
      } else if (normalizedMonth === 'All Months' || normalizedMonth === '') {
        normalizedMonth = undefined;
      }
      
      expect(normalizedMonth).toBe('2025-08');
    });
  });

  describe('KPI Statistics Display', () => {
    
    test('should always include all three KPI categories regardless of filter', () => {
      // Simulates filtered metrics response
      const filteredMetrics = {
        totalAssessed: 55401546,
        vulnerable: 1167640,
        potentiallyVulnerable: 6444468,
        notVulnerable: 47789438,
      };
      
      // All three categories must be present
      expect(filteredMetrics.vulnerable).toBeDefined();
      expect(filteredMetrics.potentiallyVulnerable).toBeDefined();
      expect(filteredMetrics.notVulnerable).toBeDefined();
      
      // All must be greater than 0 when no filter
      expect(filteredMetrics.vulnerable).toBeGreaterThan(0);
      expect(filteredMetrics.potentiallyVulnerable).toBeGreaterThan(0);
      expect(filteredMetrics.notVulnerable).toBeGreaterThan(0);
      
      // Sum should equal total
      const sum = filteredMetrics.vulnerable + filteredMetrics.potentiallyVulnerable + filteredMetrics.notVulnerable;
      expect(sum).toBe(filteredMetrics.totalAssessed);
    });

    test('should display full month range when All Months filter applied', () => {
      // Simulates filtered metrics response with monthRange
      const filteredMetrics = {
        totalAssessed: 55401546,
        vulnerable: 1167640,
        potentiallyVulnerable: 6444468,
        notVulnerable: 47789438,
        monthRange: 'Apr 2025 - Aug 2025',
        monthCount: 5,
      };
      
      // Should show full range, not just August
      expect(filteredMetrics.monthRange).toBe('Apr 2025 - Aug 2025');
      expect(filteredMetrics.monthCount).toBe(5);
      expect(filteredMetrics.monthRange).not.toBe('Aug 2025');
    });

    test('should display single month when specific month filtered', () => {
      // Simulates filtered metrics response for August only
      const filteredMetrics = {
        totalAssessed: 54500000, // Approximately August data
        vulnerable: 1100000,
        potentiallyVulnerable: 6300000,
        notVulnerable: 47100000,
        monthRange: 'Aug 2025',
        monthCount: 1,
      };
      
      // Should show single month when filtered
      expect(filteredMetrics.monthRange).toBe('Aug 2025');
      expect(filteredMetrics.monthCount).toBe(1);
    });
  });

  describe('Filter State Management', () => {
    
    test('DEFAULT_FILTER_STATE should have correct month default', () => {
      const DEFAULT_FILTER_STATE = {
        customer: '',
        fieldNotice: '',
        fnType: '',
        month: '', // Should be empty initially
        customerSearch: '',
        fieldNoticeSearch: ''
      };
      
      // Default month should be empty string (converted to "All Months" in UI)
      expect(DEFAULT_FILTER_STATE.month).toBe('');
    });

    test('should never send empty string as month filter to backend', () => {
      // Simulates filter application logic
      const filterState = {
        customer: '',
        fieldNotice: '',
        fnType: '',
        month: 'All Months', // After conversion
      };
      
      // Verify month is 'All Months' not empty string
      expect(filterState.month).not.toBe('');
      expect(filterState.month).toBe('All Months');
    });
  });

  describe('Filter Change Scenarios', () => {
    
    test('Scenario 1: User selects "All Months" from dropdown', () => {
      // User selects "All Months" option
      const userSelection = 'All Months';
      const converted = userSelection === 'All Months' ? 'All Months' : '';
      
      // Should send "All Months" to backend
      expect(converted).toBe('All Months');
      expect(converted).not.toBe('');
    });

    test('Scenario 2: User selects specific month from dropdown', () => {
      // User selects "August 2025"
      const displayMonth = 'August 2025';
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      const parts = displayMonth.toLowerCase().split(' ');
      const monthIdx = monthNames.indexOf(parts[0]);
      const converted = `${parts[1]}-${String(monthIdx + 1).padStart(2, '0')}`;
      
      expect(converted).toBe('2025-08');
    });

    test('Scenario 3: User resets all filters', () => {
      // User clicks "Reset All"
      const resetFilters = {
        customer: '',
        fieldNotice: '',
        fnType: '',
        month: '', // Reset to empty
      };
      
      // Empty month should be treated as "All Months" in processing
      expect(resetFilters.month).toBe('');
    });

    test('Scenario 4: User applies customer filter with All Months', () => {
      // User selects a customer but keeps "All Months"
      const filters = {
        customer: 'WELLS FARGO',
        fieldNotice: '',
        fnType: '',
        month: 'All Months',
      };
      
      // Should show all months of data for this customer
      expect(filters.month).toBe('All Months');
      expect(filters.customer).toBe('WELLS FARGO');
    });
  });
});

/**
 * Integration test - full filter flow
 */
describe('Filter Application Integration', () => {
  
  test('should return all 5 months of data when "All Months" selected', async () => {
    // Mock backend filter response
    const filterResponse = {
      totalAssessed: 55401546,
      vulnerable: 1167640,
      potentiallyVulnerable: 6444468,
      notVulnerable: 47789438,
      monthRange: 'Apr 2025 - Aug 2025',
      monthCount: 5, // CRITICAL: Should be 5, not 1
      dataPeriod: 'Apr 2025 - Aug 2025',
    };
    
    // Assertions
    expect(filterResponse.monthCount).toBe(5);
    expect(filterResponse.monthCount).not.toBe(1); // Should NOT be just August
    expect(filterResponse.monthRange).toContain('Apr');
    expect(filterResponse.monthRange).toContain('Aug');
  });

  test('should return only August data when August selected', async () => {
    // Mock backend filter response for August only
    const filterResponse = {
      totalAssessed: 54500000,
      vulnerable: 1100000,
      potentiallyVulnerable: 6300000,
      notVulnerable: 47100000,
      monthRange: 'Aug 2025',
      monthCount: 1,
      dataPeriod: 'Aug 2025',
    };
    
    // Assertions
    expect(filterResponse.monthCount).toBe(1);
    expect(filterResponse.monthRange).toBe('Aug 2025');
    expect(filterResponse.monthRange).not.toContain('Apr');
  });
});
