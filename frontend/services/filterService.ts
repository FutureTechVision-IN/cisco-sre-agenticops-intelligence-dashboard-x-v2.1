/**
 * FilterService - Comprehensive filtering business logic for the dashboard
 * Implements singleton pattern for centralized state management
 * Supports single, multiple, and cumulative filtering modes
 * Includes result caching and performance tracking
 */

import { DashboardData, FilterState, DataRecord, Metric, Anomaly, Prediction, Recommendation, MonthlyTrend, FieldNotice, Customer, GrowthMetric, AdvancedMetric } from '../types';

// Filter interfaces
export interface ActiveFilter {
  field: 'customer' | 'fieldNotice' | 'fnType' | 'month';
  value: string;
  displayValue?: string;
}

export type FilterMode = 'cumulative' | 'single' | 'multiple';

export interface FilterContext {
  filtersApplied: ActiveFilter[];
  filterMode: FilterMode;
  totalRecordsBeforeFilter: number;
  totalRecordsAfterFilter: number;
}

export interface FilteredDataState {
  data: DashboardData;
  context: FilterContext;
  timestamp: number;
  calculatedAt: number;
}

interface CacheEntry {
  data: FilteredDataState;
  hits: number;
  lastAccessed: number;
}

/**
 * Core FilterService class - Singleton pattern
 * Manages all filtering operations and data transformations
 */
export class FilterService {
  private static instance: FilterService;
  private cache: Map<string, CacheEntry>;
  private maxCacheSize: number = 50;
  private performanceMetrics: {
    totalOperations: number;
    cacheHits: number;
    cacheMisses: number;
    avgFilterTime: number;
  };

  private constructor() {
    this.cache = new Map();
    this.performanceMetrics = {
      totalOperations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      avgFilterTime: 0
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(): FilterService {
    if (!FilterService.instance) {
      FilterService.instance = new FilterService();
    }
    return FilterService.instance;
  }

  /**
   * Extract active filters from FilterState
   */
  createActiveFilters(filters: FilterState): ActiveFilter[] {
    const active: ActiveFilter[] = [];

    if (filters.customer && filters.customer !== '' && filters.customer !== 'All Customers') {
      active.push({ field: 'customer', value: filters.customer, displayValue: filters.customer });
    }
    if (filters.fieldNotice && filters.fieldNotice !== '' && filters.fieldNotice !== 'All Field Notices') {
      active.push({ field: 'fieldNotice', value: filters.fieldNotice, displayValue: filters.fieldNotice });
    }
    if (filters.fnType && filters.fnType !== '' && filters.fnType !== 'All Types') {
      active.push({ field: 'fnType', value: filters.fnType, displayValue: filters.fnType });
    }
    if (filters.month && filters.month !== '' && filters.month !== 'All Months') {
      active.push({ field: 'month', value: filters.month, displayValue: filters.month });
    }

    return active;
  }

  /**
   * Determine filter mode based on active filters count
   */
  determineFilterMode(activeFilters: ActiveFilter[]): FilterMode {
    if (activeFilters.length === 0) return 'cumulative';
    if (activeFilters.length === 1) return 'single';
    return 'multiple';
  }

  /**
   * Main filtering method - applies all filters and recalculates metrics
   */
  applyFilters(originalData: DashboardData, filters: FilterState): FilteredDataState {
    const startTime = performance.now();

    // Check cache first
    const cacheKey = this.generateCacheKey(filters);
    const cachedEntry = this.getCachedFilteredData(cacheKey);
    if (cachedEntry) {
      this.performanceMetrics.cacheHits++;
      return cachedEntry.data;
    }

    this.performanceMetrics.cacheMisses++;

    // Create active filters
    const activeFilters = this.createActiveFilters(filters);
    const mode = this.determineFilterMode(activeFilters);

    // Validate filters
    if (!this.validateFilters(activeFilters)) {
      throw new Error('Invalid filter configuration');
    }

    // Deep copy original data
    let filteredData = this.deepCopyDashboardData(originalData);
    const originalRecordCount = filteredData.records?.length || 0;

    console.log('[FilterService] Starting filter application:', {
      activeFilters,
      mode,
      originalRecordCount
    });

    if (activeFilters.length > 0 && filteredData.records && filteredData.records.length > 0) {
      // Debug: Log sample records before filtering
      console.log('[FilterService] Sample records before filtering:', {
        sampleCount: Math.min(3, filteredData.records.length),
        samples: filteredData.records.slice(0, 3).map(r => ({
          customer: r.customerName || r.customer || r.CUSTOMER_NAME,
          fnType: r.fnType || r.FN_TYPE,
          fieldNotice: r.fieldNoticeId || r.FIELD_NOTICE,
          month: r.month || r.DATE_IMPORTED
        }))
      });

      // Filter records based on active filters (AND logic for multi-filter)
      console.log('[FilterService] Applying filters:', activeFilters.map(f => ({ field: f.field, value: f.value })));
      
      filteredData.records = filteredData.records.filter(record => {
        // ALL filters must match (AND logic)
        const matches = activeFilters.every(filter => {
          const matchResult = this.matchesFilter(record, filter);
          if (!matchResult) {
            console.log(`[FilterService] Record does NOT match ${filter.field}:${filter.value}`, {
              recordValue: record[filter.field === 'customer' ? 'customerName' : filter.field === 'fnType' ? 'fnType' : filter.field === 'month' ? 'month' : 'fieldNoticeId'],
              filterValue: filter.value
            });
          }
          return matchResult;
        });
        return matches;
      });

      console.log('[FilterService] Records after filtering:', filteredData.records.length, 'from', originalRecordCount);

      // CRITICAL: Do NOT recalculate metrics based on limited client-side records!
      // The API has already applied filters and returned correct metrics in the data.
      // Client-side records are just a limited subset for display/drill-down.
      // Recalculating metrics from these limited records overwrites the correct API metrics.
      console.log('[FilterService]   SKIPPING metric recalculation - using backend-calculated metrics');
      console.log('[FilterService] Reason: Client-side records are limited subset (pageSize=10000), backend has complete data');
      // DO NOT uncomment: filteredData = this.recalculateAllMetrics(filteredData, activeFilters, filters);
    }

    // Create filtered data state
    const filteredDataState: FilteredDataState = {
      data: filteredData,
      context: {
        filtersApplied: activeFilters,
        filterMode: mode,
        totalRecordsBeforeFilter: originalRecordCount,
        totalRecordsAfterFilter: filteredData.records?.length || 0
      },
      timestamp: Date.now(),
      calculatedAt: performance.now()
    };

    // Cache the result
    this.cacheFilteredData(cacheKey, filteredDataState);

    // Track performance
    const endTime = performance.now();
    const filterTime = endTime - startTime;
    this.performanceMetrics.totalOperations++;
    this.performanceMetrics.avgFilterTime = 
      (this.performanceMetrics.avgFilterTime * (this.performanceMetrics.totalOperations - 1) + filterTime) / 
      this.performanceMetrics.totalOperations;

    console.log('[FilterService] Filter application complete:', {
      filterTime: filterTime.toFixed(2) + 'ms',
      recordsFiltered: filteredDataState.context.totalRecordsAfterFilter,
      newTotal: filteredData.metrics?.totalAssessed?.value
    });

    return filteredDataState;
  }

  /**
   * Check if a record matches a filter
   */
  private matchesFilter(record: any, filter: ActiveFilter): boolean {
    const value = filter.value.toLowerCase().trim();
    
    switch (filter.field) {
      case 'customer':
        const customerName = (record.customerName || record.customer || record.CUSTOMER_NAME || '').toLowerCase().trim();
        return customerName.includes(value) || customerName === value;
        
      case 'fieldNotice':
        const fieldNotice = (record.fieldNoticeId || record.fieldNotice || record.fnId || record.FIELD_NOTICE || record.FN_ID || '').toLowerCase().trim();
        return fieldNotice.includes(value) || fieldNotice === value;
        
      case 'fnType':
        // Handle Hardware/Software types
        const fnType = (record.fnType || record.type || record.FN_TYPE || '').toLowerCase().trim();
        const filterValue = value.toLowerCase().trim();
        // Match exact type: "Hardware" or "Software"
        return fnType === filterValue || fnType.includes(filterValue);
        
      case 'month':
        // Month mapping: "April 2025" -> "2025-04", "August 2025" -> "2025-08", etc.
        const monthNameToNumber: Record<string, string> = {
          'january': '01',
          'february': '02',
          'march': '03',
          'april': '04',
          'may': '05',
          'june': '06',
          'july': '07',
          'august': '08',
          'september': '09',
          'october': '10',
          'november': '11',
          'december': '12',
        };
        
        // Parse filter value to extract month and year
        let targetMonthYYYYMM = '';
        const lowerValue = value.toLowerCase();
        
        // Check if it's in "Month Year" format (e.g., "april 2025")
        for (const [monthName, monthNum] of Object.entries(monthNameToNumber)) {
          if (lowerValue.includes(monthName)) {
            const yearMatch = lowerValue.match(/20\d{2}/);
            if (yearMatch) {
              targetMonthYYYYMM = `${yearMatch[0]}-${monthNum}`;
              break;
            } else {
              // Default to 2025 if no year specified
              targetMonthYYYYMM = `2025-${monthNum}`;
              break;
            }
          }
        }
        
        // If no name-based match, try direct YYYY-MM format
        if (!targetMonthYYYYMM && value.match(/^\d{4}-\d{2}$/)) {
          targetMonthYYYYMM = value;
        }
        
        // Check record month field - should be in "YYYY-MM" format
        const recordMonth = (record.month || record.dateImported || record.DATE_IMPORTED || '').trim();
        
        // Match on YYYY-MM format
        if (targetMonthYYYYMM) {
          const matches = recordMonth === targetMonthYYYYMM || recordMonth.startsWith(targetMonthYYYYMM);
          return matches;
        }
        
        // Fallback if we couldn't parse the month
        return recordMonth.includes(value);
        
      default:
        return true;
    }
  }

  /**
   * Recalculate all metrics based on filtered records
   */
  private recalculateAllMetrics(data: DashboardData, activeFilters: ActiveFilter[], filters: FilterState): DashboardData {
    const recalculated = this.deepCopyDashboardData(data);
    const records = recalculated.records || [];

    if (records.length === 0) {
      // No records - zero out metrics but PRESERVE formula and methodology
      console.log('[FilterService] No records found for filters, zeroing metrics');
      recalculated.metrics = {
        totalAssessed: { ...recalculated.metrics.totalAssessed, value: 0, percentage: 0, formula: recalculated.metrics.totalAssessed.formula, methodology: recalculated.metrics.totalAssessed.methodology },
        secure: { ...recalculated.metrics.secure, value: 0, percentage: 0, formula: recalculated.metrics.secure.formula, methodology: recalculated.metrics.secure.methodology },
        potential: { ...recalculated.metrics.potential, value: 0, percentage: 0, formula: recalculated.metrics.potential.formula, methodology: recalculated.metrics.potential.methodology },
        vulnerable: { ...recalculated.metrics.vulnerable, value: 0, percentage: 0, formula: recalculated.metrics.vulnerable.formula, methodology: recalculated.metrics.vulnerable.methodology }
      };
      return recalculated;
    }

    // Calculate totals from filtered records
    let totalVulnerable = 0;
    let totalPotential = 0;
    let totalSecure = 0;

    records.forEach(record => {
      totalVulnerable += record.totVuln || record.vulnerable || record.vulnerableCount || 0;
      totalPotential += record.potVuln || record.potentiallyVulnerable || record.potentialCount || 0;
      totalSecure += record.notVuln || record.notVulnerable || record.secureCount || 0;
    });

    const totalAssessed = totalVulnerable + totalPotential + totalSecure;

    console.log('[FilterService] Recalculated totals:', {
      records: records.length,
      totalAssessed,
      totalVulnerable,
      totalPotential,
      totalSecure
    });

    // Calculate percentages
    const vulnerablePercentage = totalAssessed > 0 ? (totalVulnerable / totalAssessed) * 100 : 0;
    const potentialPercentage = totalAssessed > 0 ? (totalPotential / totalAssessed) * 100 : 0;
    const securePercentage = totalAssessed > 0 ? (totalSecure / totalAssessed) * 100 : 0;

    // Update metrics - EXPLICITLY preserve formula and methodology
    recalculated.metrics = {
      totalAssessed: {
        ...recalculated.metrics.totalAssessed,
        value: totalAssessed,
        subtext: `Across ${records.length} filtered records`,
        // EXPLICITLY preserve formula and methodology
        formula: recalculated.metrics.totalAssessed.formula,
        methodology: recalculated.metrics.totalAssessed.methodology,
      },
      secure: {
        ...recalculated.metrics.secure,
        value: totalSecure,
        percentage: Math.round(securePercentage * 10) / 10,
        // EXPLICITLY preserve formula and methodology
        formula: recalculated.metrics.secure.formula,
        methodology: recalculated.metrics.secure.methodology,
      },
      potential: {
        ...recalculated.metrics.potential,
        value: totalPotential,
        percentage: Math.round(potentialPercentage * 10) / 10,
        // EXPLICITLY preserve formula and methodology
        formula: recalculated.metrics.potential.formula,
        methodology: recalculated.metrics.potential.methodology,
      },
      vulnerable: {
        ...recalculated.metrics.vulnerable,
        value: totalVulnerable,
        percentage: Math.round(vulnerablePercentage * 10) / 10,
        // EXPLICITLY preserve formula and methodology
        formula: recalculated.metrics.vulnerable.formula,
        methodology: recalculated.metrics.vulnerable.methodology,
      }
    };

    // Filter and update top customers - with deduplication
    if (recalculated.topCustomers && recalculated.topCustomers.length > 0) {
      const customerFilter = activeFilters.find(f => f.field === 'customer');
      
      // First, deduplicate customers by name and aggregate their counts
      const custMap = new Map<string, { 
        name: string; vuln: number; pot: number; sec: number; recordCount: number;
        riskLevel: string; trend: string; priority: string 
      }>();
      
      recalculated.topCustomers.forEach(c => {
        const existing = custMap.get(c.name);
        if (existing) {
          // Aggregate counts for duplicates
          existing.vuln += c.vulnerableCount || 0;
          existing.pot += c.potentialCount || 0;
          existing.sec += c.secureCount || 0;
          existing.recordCount += c.recordCount || 0;
        } else {
          custMap.set(c.name, {
            name: c.name,
            vuln: c.vulnerableCount || 0,
            pot: c.potentialCount || 0,
            sec: c.secureCount || 0,
            recordCount: c.recordCount || 0,
            riskLevel: c.riskLevel || 'ELEVATED',
            trend: c.trend || 'stable',
            priority: c.priority || 'MEDIUM'
          });
        }
      });
      
      // If we have filtered records, recalculate from them instead
      if (records.length > 0) {
        const custCounts = new Map<string, { vuln: number; pot: number; sec: number; recordCount: number }>();
        records.forEach(r => {
          const custName = r.customer || r.customerName || '';
          if (custName) {
            const existing = custCounts.get(custName) || { vuln: 0, pot: 0, sec: 0, recordCount: 0 };
            existing.vuln += r.totVuln || 0;
            existing.pot += r.potVuln || 0;
            existing.sec += r.notVuln || 0;
            existing.recordCount += 1;
            custCounts.set(custName, existing);
          }
        });
        
        // Update custMap with record-based counts
        custCounts.forEach((counts, custName) => {
          const existing = custMap.get(custName);
          if (existing) {
            existing.vuln = counts.vuln;
            existing.pot = counts.pot;
            existing.sec = counts.sec;
            existing.recordCount = counts.recordCount;
          }
        });
      }
      
      // Convert map back to array
      let deduplicatedCustomers = Array.from(custMap.values()).map(c => ({
        name: c.name,
        vulnerableCount: c.vuln,
        potentialCount: c.pot,
        secureCount: c.sec,
        recordCount: c.recordCount,
        riskLevel: c.riskLevel as 'CRITICAL' | 'HIGH' | 'ELEVATED',
        trend: c.trend as 'increasing' | 'stable' | 'decreasing',
        priority: c.priority as 'IMMEDIATE' | 'HIGH' | 'MEDIUM'
      }));
      
      // Apply customer filter if present
      if (customerFilter) {
        deduplicatedCustomers = deduplicatedCustomers.filter(c => 
          c.name.toLowerCase().includes(customerFilter.value.toLowerCase())
        );
      }
      
      // Sort by vulnerable count descending
      deduplicatedCustomers.sort((a, b) => b.vulnerableCount - a.vulnerableCount);
      
      recalculated.topCustomers = deduplicatedCustomers;
    }

    // Filter and update top field notices - rebuild from filtered records
    if (activeFilters.length > 0 && records.length > 0) {
      // When filters are active, rebuild field notices entirely from filtered records
      const fnCounts = new Map<string, { id: string; title: string; vuln: number; pot: number; sec: number }>();
      
      records.forEach(r => {
        const fnId = r.fieldNotice || r.fieldNoticeId || '';
        if (fnId) {
          const existing = fnCounts.get(fnId) || { 
            id: fnId, 
            title: this.getFieldNoticeTitle(fnId, recalculated.topFieldNotices), 
            vuln: 0, 
            pot: 0, 
            sec: 0 
          };
          existing.vuln += r.totVuln || 0;
          existing.pot += r.potVuln || 0;
          existing.sec += r.notVuln || 0;
          fnCounts.set(fnId, existing);
        }
      });
      
      // Convert to array
      let filteredFNs = Array.from(fnCounts.values()).map(fn => ({
        id: fn.id,
        title: fn.title || `${fn.id} - Field Notice`,
        vulnerableCount: fn.vuln,
        potentialCount: fn.pot,
        secureCount: fn.sec
      }));
      
      // Sort by vulnerable count descending
      filteredFNs.sort((a, b) => b.vulnerableCount - a.vulnerableCount);
      
      recalculated.topFieldNotices = filteredFNs;
      
      console.log('[FilterService] Field notices rebuilt from filtered records:', {
        count: filteredFNs.length,
        sample: filteredFNs[0]
      });
    } else if (recalculated.topFieldNotices && recalculated.topFieldNotices.length > 0) {
      // No filters - just deduplicate original field notices
      const fnMap = new Map<string, { id: string; title: string; vuln: number; pot: number; sec: number }>();
      
      recalculated.topFieldNotices.forEach(fn => {
        const existing = fnMap.get(fn.id);
        if (existing) {
          existing.vuln += fn.vulnerableCount || 0;
          existing.pot += fn.potentialCount || 0;
          existing.sec += fn.secureCount || 0;
        } else {
          fnMap.set(fn.id, {
            id: fn.id,
            title: fn.title,
            vuln: fn.vulnerableCount || 0,
            pot: fn.potentialCount || 0,
            sec: fn.secureCount || 0
          });
        }
      });
      
      let deduplicatedFNs = Array.from(fnMap.values()).map(fn => ({
        id: fn.id,
        title: fn.title,
        vulnerableCount: fn.vuln,
        potentialCount: fn.pot,
        secureCount: fn.sec
      }));
      
      deduplicatedFNs.sort((a, b) => b.vulnerableCount - a.vulnerableCount);
      recalculated.topFieldNotices = deduplicatedFNs;
    }

    // Scale and filter trends based on filtered data ratio
    if (recalculated.trends && recalculated.trends.length > 0) {
      const monthFilter = activeFilters.find(f => f.field === 'month');
      const ratio = 554966657 > 0 ? totalAssessed / 554966657 : 0;
      
      if (monthFilter) {
        // Filter to specific month
        recalculated.trends = recalculated.trends.filter(t => 
          t.month.toLowerCase().includes(monthFilter.value.toLowerCase())
        );
      }
      
      // Scale trend values based on filtered data ratio
      if (activeFilters.length > 0) {
        recalculated.trends = recalculated.trends.map(t => ({
          ...t,
          vulnerable: Math.round(t.vulnerable * ratio),
          potential: Math.round(t.potential * ratio),
          secure: Math.round(t.secure * ratio)
        }));
      }
    }

    // Store original total for ratio calculations
    const originalTotal = 554966657; // Original unfiltered total

    // Update growth metrics based on filtered data
    if (recalculated.growthMetrics && recalculated.growthMetrics.length > 0) {
      recalculated.growthMetrics = recalculated.growthMetrics.map(gm => {
        // Scale the value based on the ratio
        const scaledValue = this.scaleGrowthMetric(gm, totalAssessed, originalTotal);
        
        // Also scale the absolute change if present
        let scaledAbsoluteChange = gm.absoluteChange;
        if (gm.absoluteChange) {
          const match = gm.absoluteChange.match(/\(([+-]?[\d,]+)\)/);
          if (match) {
            const absValue = parseInt(match[1].replace(/,/g, ''), 10);
            const ratio = originalTotal > 0 ? totalAssessed / originalTotal : 0;
            const scaledAbs = Math.round(absValue * ratio);
            const sign = scaledAbs >= 0 ? '+' : '';
            scaledAbsoluteChange = `(${sign}${scaledAbs.toLocaleString()})`;
          }
        }
        
        return {
          ...gm,
          value: scaledValue,
          absoluteChange: scaledAbsoluteChange
        };
      });
    }

    // Update advanced metrics
    if (recalculated.advancedMetrics && recalculated.advancedMetrics.length > 0) {
      recalculated.advancedMetrics = recalculated.advancedMetrics.map(am => ({
        ...am,
        value: this.scaleAdvancedMetric(am, totalAssessed, originalTotal, totalVulnerable, totalSecure)
      }));
    }

    // Update extended KPIs based on filtered data
    if (recalculated.extendedKPIs && recalculated.extendedKPIs.length > 0) {
      const ratio = originalTotal > 0 ? totalAssessed / originalTotal : 0;
      recalculated.extendedKPIs = recalculated.extendedKPIs.map(kpi => {
        if (kpi.id === 'risk-score-index') {
          // Risk score increases with higher vulnerability ratio
          const vulnRatio = totalAssessed > 0 ? totalVulnerable / totalAssessed : 0;
          const newScore = Math.min(100, Math.max(0, vulnRatio * 1000 + 50)); // Scale appropriately
          return {
            ...kpi,
            value: Math.round(newScore * 10) / 10,
            displayValue: (Math.round(newScore * 10) / 10).toString()
          };
        } else if (kpi.id === 'mttr') {
          // MTTR scales inversely with filter scope (smaller scope = potentially faster remediation)
          const scaledMTTR = kpi.value * (1 + (1 - ratio) * 0.3);
          return {
            ...kpi,
            value: Math.round(scaledMTTR * 10) / 10,
            displayValue: (Math.round(scaledMTTR * 10) / 10).toString()
          };
        }
        return kpi;
      });
    }

    // Filter anomalies if customer filter is active
    if (recalculated.anomalies && recalculated.anomalies.length > 0) {
      const customerFilter = activeFilters.find(f => f.field === 'customer');
      if (customerFilter) {
        recalculated.anomalies = recalculated.anomalies.filter(a => 
          a.entity.toLowerCase().includes(customerFilter.value.toLowerCase())
        );
      }
    }

    return recalculated;
  }

  /**
   * Scale growth metric based on filtered data proportion
   */
  private scaleGrowthMetric(metric: GrowthMetric, filteredTotal: number, originalTotal: number): number | string {
    const ratio = originalTotal > 0 ? filteredTotal / originalTotal : 0;
    
    if (typeof metric.value === 'string') {
      // Parse string like "1,167,640" to number
      const numValue = parseInt(metric.value.replace(/,/g, ''), 10);
      if (!isNaN(numValue)) {
        const scaled = Math.round(numValue * ratio);
        return scaled.toLocaleString(); // Return formatted string
      }
      return metric.value;
    }
    
    return Math.round(metric.value * ratio);
  }
  /**
   * Scale advanced metric based on filtered data
   */
  private scaleAdvancedMetric(metric: AdvancedMetric, filteredTotal: number, originalTotal: number, filteredVulnerable: number, filteredSecure: number): string {
    const ratio = originalTotal > 0 ? filteredTotal / originalTotal : 0;
    
    // Vulnerability Detection Rate - recalculate based on filtered data
    if (metric.label.includes('Detection Rate')) {
      const rate = filteredTotal > 0 ? (filteredVulnerable / filteredTotal) * 100 : 0;
      return rate.toFixed(1) + '%';
    }
    
    // Security Coverage - recalculate based on filtered data
    if (metric.label.includes('Security Coverage')) {
      const coverage = filteredTotal > 0 ? (filteredSecure / filteredTotal) * 100 : 0;
      return coverage.toFixed(1) + '%';
    }
    
    // Keep other percentage-based metrics as is
    if (metric.value.includes('%')) return metric.value;
    return metric.value;
  }

  /**
   * Validate filter configuration
   */
  private validateFilters(activeFilters: ActiveFilter[]): boolean {
    // All active filters must have valid fields and non-empty values
    return activeFilters.every(f => 
      ['customer', 'fieldNotice', 'fnType', 'month'].includes(f.field) && 
      f.value && 
      f.value.trim().length > 0
    );
  }

  /**
   * Get field notice title from original data or generate default
   */
  private getFieldNoticeTitle(fnId: string, topFieldNotices?: Array<{ id: string; title: string }>): string {
    // First try to find in existing top field notices
    if (topFieldNotices) {
      const existing = topFieldNotices.find(fn => fn.id === fnId);
      if (existing?.title) return existing.title;
    }
    // Return the ID as a default title
    return fnId;
  }

  /**
   * Generate cache key from filter state
   */
  generateCacheKey(filters: FilterState): string {
    const parts = [
      filters.customer || 'nc',
      filters.fieldNotice || 'nc',
      filters.fnType || 'nc',
      filters.month || 'nc'
    ];
    return `filter_${parts.join('_')}`;
  }

  /**
   * Cache filtered data with LRU eviction
   */
  cacheFilteredData(key: string, data: FilteredDataState): void {
    // If cache is full, remove least recently used entry
    if (this.cache.size >= this.maxCacheSize) {
      let lruKey: string | null = null;
      let lruTime = Infinity;

      for (const [k, entry] of this.cache.entries()) {
        if (entry.lastAccessed < lruTime) {
          lruTime = entry.lastAccessed;
          lruKey = k;
        }
      }

      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }

    this.cache.set(key, {
      data,
      hits: 0,
      lastAccessed: Date.now()
    });
  }

  /**
   * Retrieve cached filtered data
   */
  getCachedFilteredData(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (entry) {
      entry.hits++;
      entry.lastAccessed = Date.now();
      return entry;
    }
    return null;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheSize: this.cache.size,
      cacheHitRate: this.performanceMetrics.totalOperations > 0
        ? (this.performanceMetrics.cacheHits / this.performanceMetrics.totalOperations * 100).toFixed(2) + '%'
        : 'N/A'
    };
  }

  /**
   * Generate filter summary for UI display
   */
  exportFilterSummary(context: FilterContext | null): string {
    if (!context || !context.filtersApplied || context.filtersApplied.length === 0) {
      return 'No filters applied - showing all data';
    }

    const filterStrings = context.filtersApplied.map(f => `${f.field}: ${f.value}`);
    return `Filtering by ${filterStrings.join(', ')} (${context.filterMode} mode)`;
  }

  /**
   * Deep copy dashboard data
   */
  private deepCopyDashboardData(data: DashboardData): DashboardData {
    return JSON.parse(JSON.stringify(data));
  }
}

// Export singleton instance
export const filterService = FilterService.getInstance();
