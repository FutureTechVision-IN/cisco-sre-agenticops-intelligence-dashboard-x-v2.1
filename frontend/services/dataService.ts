import { DashboardData, FilterState, MonthlyTrend } from '../types';
import { MOCK_DATA } from '../constants';
import { reportClientError } from '../utils/monitoring';

// ==================== MONTH CONVERSION UTILITIES ====================
// Declared early so all downstream code in this module can use them.

/**
 * Convert a YYYY-MM string to a human-readable display name.
 * e.g., "2026-01" → "January 2026"
 * Works for any past or future month — no hardcoded lookup table needed.
 */
export const yearMonthToDisplayName = (yearMonth: string): string => {
  const [year, month] = yearMonth.split('-');
  if (!year || !month) return yearMonth;
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

/**
 * Convert a human-readable display name back to YYYY-MM.
 * e.g., "January 2026" → "2026-01"
 */
export const displayNameToYearMonth = (displayName: string): string => {
  const date = new Date(`${displayName} 1`);
  if (isNaN(date.getTime())) return displayName;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

// Format large numbers to short form (e.g., 12.5M, 480.3M, 62.1M)
const formatNumberShort = (n: number): string => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

// API response type for filtered metrics
interface FilteredMetricsResponse {
  totalAssessed: number;
  notVulnerable: number;
  potentiallyVulnerable: number;
  vulnerable: number;
  recordCount: number;
  filters: {
    customer: string;
    fieldNotice: string;
    fnType: string;
    month: string;
  };
  lastUpdated: string;
}

// ==================== CACHING LAYER ====================
// Cache strategy: 5-minute TTL, prevents redundant API calls
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const dataCache = new Map<string, CacheEntry<DashboardData>>();
const inFlightRequests = new Map<string, Promise<DashboardData>>();

const getCacheKey = (filters: FilterState): string => {
  return JSON.stringify({
    customer: filters.customer || '',
    fieldNotice: filters.fieldNotice || '',
    fnType: filters.fnType || '',
    month: filters.month || ''
  });
};

const getCachedData = (filters: FilterState): DashboardData | null => {
  const key = getCacheKey(filters);
  const entry = dataCache.get(key);
  
  if (entry && Date.now() - entry.timestamp < entry.ttl) {
    console.log('[DataService] Cache hit - returning cached data');
    return entry.data;
  }
  
  if (entry) {
    dataCache.delete(key);
  }
  return null;
};

const setCachedData = (filters: FilterState, data: DashboardData): void => {
  const key = getCacheKey(filters);
  dataCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: CACHE_TTL
  });
};

// Deduplicate in-flight requests
const getOrCreateRequest = (
  filters: FilterState,
  fetchFn: () => Promise<DashboardData>
): Promise<DashboardData> => {
  const key = getCacheKey(filters);
  
  if (inFlightRequests.has(key)) {
    console.log('[DataService] Request already in flight - reusing promise');
    return inFlightRequests.get(key)!;
  }
  
  const promise = fetchFn().then(data => {
    inFlightRequests.delete(key);
    return data;
  }).catch(err => {
    inFlightRequests.delete(key);
    throw err;
  });
  
  inFlightRequests.set(key, promise);
  return promise;
};

// Check if running on static hosting (GitHub Pages)
const isStaticHosting = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname.includes('github.') || 
         hostname.includes('.github.io') || 
         hostname.includes('pages.');
};

// Get the base path for static data files
// IMPORTANT: Use import.meta.env.BASE_URL (Vite build-time replacement) so that
// fetch() calls resolve to the correct absolute path on GitHub Pages
// e.g. /pages/bipbabu/cisco-sre-agenticops-intelligence-dashboard-x-v2.1/static-data
const getStaticDataPath = (): string => {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return `${base}/static-data`;
};

// Helper to generate trend data based on a base value
const generateTrendData = (base: number, volatility: number, trend: number, points: number) => {
  return Array.from({ length: points }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (points - i));
    const randomVar = (Math.random() - 0.5) * volatility;
    const trendVar = i * trend;
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.floor(base + trendVar + randomVar)
    };
  });
};

// Fetch data from static JSON files (for GitHub Pages)
const fetchStaticDashboardData = async (filters: FilterState): Promise<DashboardData> => {
  const basePath = getStaticDataPath();
  
  try {
    // Fetch all static data in parallel - use trends-monthly for metrics
    const [trendsRes, fieldNoticesRes, customersRes] = await Promise.all([
      fetch(`${basePath}/trends-monthly.json`).catch(() => null),
      fetch(`${basePath}/reports-top-field-notices-2025.json`).catch(() => null),
      fetch(`${basePath}/reports-top-customers-2025.json`).catch(() => null)
    ]);
    
    // Parse responses
    const trendsData = trendsRes?.ok ? await trendsRes.json() : null;
    const fieldNoticesData = fieldNoticesRes?.ok ? await fieldNoticesRes.json() : null;
    const customersData = customersRes?.ok ? await customersRes.json() : null;
    
    // Get metrics based on filter selection
    let metrics = {
      totalAssessed: MOCK_DATA.metrics.totalAssessed.value,
      notVulnerable: MOCK_DATA.metrics.secure.value,
      potentiallyVulnerable: MOCK_DATA.metrics.potential.value,
      vulnerable: MOCK_DATA.metrics.vulnerable.value
    };
    
    // If we have trends data, calculate metrics based on filter
    if (trendsData && Array.isArray(trendsData) && trendsData.length > 0) {
      if (filters.month && filters.month !== 'All Months') {
        // Specific month selected — convert display name to YYYY-MM dynamically
        const targetMonth = displayNameToYearMonth(filters.month);
        if (targetMonth) {
          const found = trendsData.find((t: any) => t.month === targetMonth);
          if (found) {
            metrics = {
              totalAssessed: found.total || 0,
              notVulnerable: found.notVulnerable || 0,
              potentiallyVulnerable: found.potentiallyVulnerable || 0,
              vulnerable: found.vulnerable || 0
            };
          }
        }
      } else {
        // "All Months" selected - use MOCK_DATA totals as the authoritative cumulative values
        // FIXED: Previously summed individual month snapshots which doubled values
        // Each month represents total inventory at that point in time (NOT incremental)
        // The correct cumulative totals come from MOCK_DATA which matches /api/metrics/filtered
        metrics = {
          totalAssessed: MOCK_DATA.metrics.totalAssessed.value,
          notVulnerable: MOCK_DATA.metrics.secure.value,
          potentiallyVulnerable: MOCK_DATA.metrics.potential.value,
          vulnerable: MOCK_DATA.metrics.vulnerable.value
        };
        console.log('[DataService] All Months - using authoritative totals from MOCK_DATA:', metrics);
      }
    }
    
    // Transform field notices with DEDUPLICATION
    // CRITICAL FIX: Static data may contain duplicate field notices (same FN appears multiple times)
    // We need to deduplicate by fieldNoticeId and aggregate the vulnerability counts
    let topFieldNotices = MOCK_DATA.topFieldNotices;
    if (fieldNoticesData?.data && Array.isArray(fieldNoticesData.data)) {
      // Step 1: Deduplicate and aggregate by fieldNoticeId
      const fnMap = new Map<string, { id: string; title: string; vulnerableCount: number; potentialCount: number; secureCount: number }>();
      
      fieldNoticesData.data.forEach((fn: any) => {
        const fnId = fn.fieldNoticeId || fn.id;
        if (!fnId) return;
        
        const existing = fnMap.get(fnId);
        const vulnCount = fn.totVuln || fn.vulnerableCount || 0;
        const potCount = fn.potVuln || fn.potentialCount || 0;
        const secCount = fn.notVuln || fn.secureCount || 0;
        
        if (existing) {
          // Aggregate counts for duplicate entries
          existing.vulnerableCount += vulnCount;
          existing.potentialCount += potCount;
          existing.secureCount += secCount;
        } else {
          fnMap.set(fnId, {
            id: fnId,
            title: fn.fnTitle || fn.title || fnId,
            vulnerableCount: vulnCount,
            potentialCount: potCount,
            secureCount: secCount,
          });
        }
      });
      
      // Step 2: Convert to array and sort by vulnerable count descending
      topFieldNotices = Array.from(fnMap.values())
        .sort((a, b) => b.vulnerableCount - a.vulnerableCount);
      
      console.log(`[DataService] Deduplicated ${fieldNoticesData.data.length} records to ${topFieldNotices.length} unique field notices`);
    }
    
    // Transform customers
    let topCustomers = MOCK_DATA.topCustomers;
    if (customersData?.data && Array.isArray(customersData.data)) {
      topCustomers = customersData.data.map((c: any) => ({
        name: c.customerName || c.name,
        vulnerableCount: c.totVuln || c.vulnerableCount || 0,
        potentialCount: c.potVuln || c.potentialCount || 0,
        secureCount: c.notVuln || c.secureCount || 0,
        recordCount: c.affectedFNCount || c.recordCount || 0,
        riskLevel: (c.totVuln || 0) > 100000 ? 'CRITICAL' : (c.totVuln || 0) > 50000 ? 'HIGH' : 'ELEVATED',
        trend: 'stable',
        priority: (c.totVuln || 0) > 100000 ? 'IMMEDIATE' : 'HIGH',
      }));
    }
    
    // Calculate percentages
    const totalAssessed = metrics.totalAssessed || metrics.total || 1;
    const notVulnerable = metrics.notVulnerable || metrics.notVuln || 0;
    const potentiallyVulnerable = metrics.potentiallyVulnerable || metrics.potVuln || 0;
    const vulnerable = metrics.vulnerable || metrics.totVuln || 0;
    
    const securePercentage = totalAssessed > 0 ? (notVulnerable / totalAssessed) * 100 : 0;
    const potentialPercentage = totalAssessed > 0 ? (potentiallyVulnerable / totalAssessed) * 100 : 0;
    const vulnerablePercentage = totalAssessed > 0 ? (vulnerable / totalAssessed) * 100 : 0;
    
    // DEBUG: Log MOCK_DATA.metrics directly before construction
    console.log('[DataService] ===== PRE-CONSTRUCTION =====');
    console.log('[DataService] MOCK_DATA.metrics.totalAssessed.formula:', MOCK_DATA.metrics.totalAssessed.formula ? MOCK_DATA.metrics.totalAssessed.formula.substring(0, 50) + '...' : 'UNDEFINED');
    console.log('[DataService] MOCK_DATA.metrics.secure.formula:', MOCK_DATA.metrics.secure.formula ? MOCK_DATA.metrics.secure.formula.substring(0, 50) + '...' : 'UNDEFINED');
    console.log('[DataService] MOCK_DATA.metrics.vulnerable.formula:', MOCK_DATA.metrics.vulnerable.formula ? MOCK_DATA.metrics.vulnerable.formula.substring(0, 50) + '...' : 'UNDEFINED');
    console.log('[DataService] MOCK_DATA.metrics.potential.formula:', MOCK_DATA.metrics.potential.formula ? MOCK_DATA.metrics.potential.formula.substring(0, 50) + '...' : 'UNDEFINED');
    
    // Build trends array from live static data (override MOCK_DATA 10-month hardcoded array)
    let trends = MOCK_DATA.trends;
    if (trendsData && Array.isArray(trendsData) && trendsData.length > 0) {
      const monthShortNames: Record<string, string> = {
        '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
        '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
        '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
      };
      trends = trendsData.map((t: any) => {
        const parts = (t.month || '').split('-');
        const yr = parts[0]?.slice(2) || '';
        const mo = monthShortNames[parts[1]] || parts[1] || '';
        return {
          month: `${mo} ${yr}`,
          vulnerable: t.vulnerable || t.totVuln || 0,
          potential: t.potentiallyVulnerable || t.potVuln || 0,
          secure: t.notVulnerable || t.notVuln || 0,
        };
      });
    }

    const result = {
      ...MOCK_DATA,
      lastUpdated: new Date().toISOString(),
      trends,
      topFieldNotices,
      topCustomers,
      metrics: {
        totalAssessed: {
          ...MOCK_DATA.metrics.totalAssessed,
          value: totalAssessed,
          history: generateTrendData(totalAssessed * 0.95, totalAssessed * 0.01, totalAssessed * 0.001, 30),
          // EXPLICITLY preserve formula and methodology to ensure they don't get lost
          formula: MOCK_DATA.metrics.totalAssessed.formula,
          methodology: MOCK_DATA.metrics.totalAssessed.methodology,
        },
        secure: {
          ...MOCK_DATA.metrics.secure,
          value: notVulnerable,
          percentage: Math.round(securePercentage * 10) / 10,
          trend: securePercentage >= 85 ? 0.2 : -0.5,
          history: generateTrendData(notVulnerable * 0.95, notVulnerable * 0.005, notVulnerable * 0.001, 30),
          // EXPLICITLY preserve formula and methodology
          formula: MOCK_DATA.metrics.secure.formula,
          methodology: MOCK_DATA.metrics.secure.methodology,
        },
        potential: {
          ...MOCK_DATA.metrics.potential,
          value: potentiallyVulnerable,
          percentage: Math.round(potentialPercentage * 10) / 10,
          trend: potentialPercentage <= 15 ? -0.3 : 1.2,
          history: generateTrendData(potentiallyVulnerable * 0.95, potentiallyVulnerable * 0.02, potentiallyVulnerable * 0.002, 30),
          // EXPLICITLY preserve formula and methodology
          formula: MOCK_DATA.metrics.potential.formula,
          methodology: MOCK_DATA.metrics.potential.methodology,
        },
        vulnerable: {
          ...MOCK_DATA.metrics.vulnerable,
          value: vulnerable,
          percentage: Math.round(vulnerablePercentage * 10) / 10,
          trend: vulnerablePercentage <= 5 ? -0.1 : 0.8,
          history: generateTrendData(vulnerable * 0.95, vulnerable * 0.05, vulnerable * 0.003, 30),
          // EXPLICITLY preserve formula and methodology
          formula: MOCK_DATA.metrics.vulnerable.formula,
          methodology: MOCK_DATA.metrics.vulnerable.methodology,
        },
      },
    };
    
    console.log('[DataService] ===== POST-CONSTRUCTION =====');
    console.log('[DataService] result.metrics.totalAssessed keys:', Object.keys(result.metrics.totalAssessed));
    console.log('[DataService] result.metrics.totalAssessed.formula:', result.metrics.totalAssessed.formula ? result.metrics.totalAssessed.formula.substring(0, 50) + '...' : 'UNDEFINED');
    console.log('[DataService] result.metrics.secure.formula:', result.metrics.secure.formula ? result.metrics.secure.formula.substring(0, 50) + '...' : 'UNDEFINED');
    console.log('[DataService] result.metrics.vulnerable.formula:', result.metrics.vulnerable.formula ? result.metrics.vulnerable.formula.substring(0, 50) + '...' : 'UNDEFINED');
    console.log('[DataService] result.metrics.potential.formula:', result.metrics.potential.formula ? result.metrics.potential.formula.substring(0, 50) + '...' : 'UNDEFINED');
    
    return result;
  } catch (error) {
    console.error('[DataService] Error fetching static data:', error);
    return MOCK_DATA;
  }
};

// Fetches dashboard data from the real API with filter support
export const fetchDashboardData = async (filters: FilterState): Promise<DashboardData> => {
  console.log('[DataService] Fetching dashboard data with filters:', JSON.stringify(filters));
  
  // Use static data for GitHub Pages
  if (isStaticHosting()) {
    return fetchStaticDashboardData(filters);
  }

  //  IMPORTANT: Do NOT use cache when filters are applied
  // Filters change behavior, so we must fetch fresh data every time
  const hasActiveFilters = (
    (filters.customer && filters.customer !== 'All Customers') ||
    (filters.fieldNotice && filters.fieldNotice !== 'All Field Notices') ||
    (filters.fnType && filters.fnType !== 'All Types') ||
    (filters.month && filters.month !== 'All Months')
  );
  
  if (!hasActiveFilters) {
    // Only use cache for unfiltered "All" requests
    const cachedData = getCachedData(filters);
    if (cachedData) {
      console.log('[DataService] Cache hit for unfiltered data');
      return cachedData;
    }
  } else {
    console.log('[DataService] Active filters detected - bypassing cache for fresh data');
  }

  // Deduplicate in-flight requests - if same request is already being fetched, reuse promise
  return getOrCreateRequest(filters, async () => {
    try {
      // Build query params for the filtered metrics API
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
      if (filters.month && filters.month !== 'All Months') {
        // Convert display name to YYYY-MM format for backend dynamically
        const backendMonth = displayNameToYearMonth(filters.month);
        params.append('month', backendMonth);
        console.log(`[DataService] Month filter: "${filters.month}" → backend: "${backendMonth}"`);
      }
      
      // Fetch all data in parallel - include filtered trends and records when filters are active
      // For field notices & customers: use year-based filter without month so we always get
      // meaningful data (e.g., year=2026 returns Jan+Feb 2026 even when Feb 2026 is selected).
      // For All Months, omit year param so the backend returns the full dataset (period='all').
      const filterYear: number | null = (filters.month && filters.month !== 'All Months')
        ? (parseInt(filters.month.match(/(\d{4})$/)?.[1] ?? '2026', 10) || 2026)
        : null;  // null = All Months — do NOT send year param
      const fnParams = new URLSearchParams();
      if (filters.customer && filters.customer !== 'All Customers') fnParams.append('customer', filters.customer);
      if (filters.fieldNotice && filters.fieldNotice !== 'All Field Notices') fnParams.append('fieldNotice', filters.fieldNotice);
      if (filters.fnType && filters.fnType !== 'All Types') fnParams.append('fnType', filters.fnType);
      fnParams.set('limit', '500');
      if (filterYear !== null) fnParams.set('year', String(filterYear));
      const custParams = new URLSearchParams();
      if (filters.customer && filters.customer !== 'All Customers') custParams.append('customer', filters.customer);
      if (filters.fnType && filters.fnType !== 'All Types') custParams.append('fnType', filters.fnType);
      custParams.set('limit', '500');
      if (filterYear !== null) custParams.set('year', String(filterYear));

      const [metricsResponse, fieldNoticesResponse, customersResponse, trendsResponse, recordsResponse] = await Promise.all([
        fetch(`/api/metrics/filtered?${params.toString()}`),
        fetch(`/api/reports/top-field-notices?${fnParams.toString()}`),
        fetch(`/api/reports/top-customers?${custParams.toString()}`),
        hasActiveFilters 
          ? fetch(`/api/trends/monthly/filtered?${params.toString()}`)
          : fetch('/api/trends/monthly'),
        fetch(`/api/records?pageSize=10000${hasActiveFilters ? '&' + params.toString() : ''}`)
      ]);
      
      // Parse records for client-side filtering
      let records: any[] = [];
      if (recordsResponse.ok) {
        const recordsData = await recordsResponse.json();
        records = recordsData.records || recordsData.data || [];
        console.log(`[DataService] Loaded ${records.length} records for filtering`);
      }
      
      // Ensure 'data' is declared so we don't reference an undefined variable
      let data: any = null;

      if (!metricsResponse.ok) {
        console.warn(`[DataService] Backend filtering unavailable (${metricsResponse.status}), attempting to use unfiltered data`);
        // Backend filtering failed - fetch unfiltered data instead
        const unfilteredResponse = await fetch('/api/metrics/filtered?');
        if (!unfilteredResponse.ok) {
          // If even unfiltered fails, fallback to MOCK_DATA shape to avoid runtime errors
          console.error('[DataService] Metrics API unavailable. Falling back to MOCK_DATA.');
          data = {
            totalAssessed: MOCK_DATA.metrics.totalAssessed.value,
            notVulnerable: MOCK_DATA.metrics.secure.value,
            potentiallyVulnerable: MOCK_DATA.metrics.potential.value,
            vulnerable: MOCK_DATA.metrics.vulnerable.value,
            lastUpdated: new Date().toISOString()
          };
        } else {
          // Use unfiltered data and let client-side filtering handle it
          const unfilteredData: FilteredMetricsResponse = await unfilteredResponse.json();
          data = unfilteredData;
        }
      } else {
        data = await metricsResponse.json();
      }

      // SUPPLEMENT: When CSV has no records for the filtered month (e.g. Feb 2026),
      // fall back to static trends-monthly.json aggregate data for the KPI cards.
      // CRITICAL FIX: Only use static fallback when ONLY a month filter is active.
      // If customer/fieldNotice/fnType filters are also active, a result of 0 means
      // "no matching data for this combination" — NOT "month data is missing."
      // Using the static fallback with entity filters would return the unfiltered
      // monthly total (e.g., 57,811,827) instead of the correctly filtered 0.
      const hasEntityFilters = (
        (filters.customer && filters.customer !== 'All Customers') ||
        (filters.fieldNotice && filters.fieldNotice !== 'All Field Notices') ||
        (filters.fnType && filters.fnType !== 'All Types')
      );
      
      if (data.totalAssessed === 0 && filters.month && filters.month !== 'All Months' && !hasEntityFilters) {
        try {
          const backendMonth = displayNameToYearMonth(filters.month);
          const staticTrendsRes = await fetch('/static-data/trends-monthly.json');
          if (staticTrendsRes.ok) {
            const staticTrends: Array<{ month: string; vulnerable: number; potentiallyVulnerable: number; notVulnerable: number; total: number }> = await staticTrendsRes.json();
            const staticEntry = staticTrends.find(t => t.month === backendMonth);
            if (staticEntry && staticEntry.total > 0) {
              console.log(`[DataService] No CSV records for ${backendMonth} — using static trends JSON for metrics`);
              data = {
                totalAssessed: staticEntry.total,
                vulnerable: staticEntry.vulnerable,
                potentiallyVulnerable: staticEntry.potentiallyVulnerable,
                notVulnerable: staticEntry.notVulnerable,
                lastUpdated: new Date().toISOString(),
                dataPeriod: filters.month,
                monthRange: backendMonth,
              };
            }
          }
        } catch (e) {
          console.warn('[DataService] Static trends fallback failed:', e);
        }
      } else if (data.totalAssessed === 0 && hasEntityFilters) {
        console.log(`[DataService] Filtered result is 0 for entity filters — this is correct (no matching records)`);
      }
    
    //  FIXED: Parse trends - transform ALL 3 status categories to frontend format with correct keys
    let trends = MOCK_DATA.trends;
    if (trendsResponse.ok) {
      const trendsData = await trendsResponse.json();
      if (Array.isArray(trendsData) && trendsData.length > 0) {
        trends = trendsData.map((t: any) => {
          // Ensure all 3 categories are preserved with correct keys for ChartsSection
          const trend: MonthlyTrend = {
            month: t.month || '',
            vulnerable: t.vulnerable || t.totVuln || 0,
            potentiallyVulnerable: t.potentiallyVulnerable || t.potVuln || 0,  //  Key: potentiallyVulnerable
            notVulnerable: t.notVulnerable || t.notVuln || 0,  //  Key: notVulnerable
          };
          console.log(`[DataService] Trend data for ${t.month}: vulnerable=${trend.vulnerable}, potentiallyVulnerable=${trend.potentiallyVulnerable}, notVulnerable=${trend.notVulnerable}`);
          return trend;
        });
        console.log('[DataService]  All trends transformed with 3 statuses:', trends);
      }
    }
    // ============================================================
    // FILTER-AWARE: Top Field Notices & Top Customers
    // When filters are active, aggregate from filtered records for accuracy.
    // When no filters, use the API response as before.
    // ============================================================
    let topFieldNotices = MOCK_DATA.topFieldNotices;
    let topCustomers = MOCK_DATA.topCustomers;

    if (hasActiveFilters && records.length > 0) {
      // --- Aggregate Top Field Notices from filtered records ---
      const fnMap = new Map<string, { id: string; title: string; vulnerableCount: number; potentialCount: number; secureCount: number; fnType: string }>();
      records.forEach((r: any) => {
        const fnId = r.fieldNoticeFormatted || r.fieldNotice || r.fieldNoticeId || '';
        if (!fnId) return;
        const existing = fnMap.get(fnId);
        const vuln = Number(r.totVuln) || 0;
        const pot = Number(r.potVuln) || 0;
        const sec = Number(r.notVuln) || 0;
        const fnType = r.fnTypeCategory || r.fnType || '';
        if (existing) {
          existing.vulnerableCount += vuln;
          existing.potentialCount += pot;
          existing.secureCount += sec;
        } else {
          fnMap.set(fnId, {
            id: fnId,
            title: r.fnTitle || r.title || fnId,
            vulnerableCount: vuln,
            potentialCount: pot,
            secureCount: sec,
            fnType,
          });
        }
      });
      topFieldNotices = Array.from(fnMap.values())
        .sort((a, b) => b.vulnerableCount - a.vulnerableCount);
      console.log(`[DataService] FILTERED: Aggregated ${records.length} records → ${topFieldNotices.length} unique field notices`);

      // --- Aggregate Top Customers from filtered records ---
      const custMap = new Map<string, { name: string; vulnerableCount: number; potentialCount: number; secureCount: number; recordCount: number }>();
      records.forEach((r: any) => {
        const custName = r.customerName || r.customer || '';
        if (!custName) return;
        const existing = custMap.get(custName);
        const vuln = Number(r.totVuln) || 0;
        const pot = Number(r.potVuln) || 0;
        const sec = Number(r.notVuln) || 0;
        if (existing) {
          existing.vulnerableCount += vuln;
          existing.potentialCount += pot;
          existing.secureCount += sec;
          existing.recordCount += 1;
        } else {
          custMap.set(custName, {
            name: custName,
            vulnerableCount: vuln,
            potentialCount: pot,
            secureCount: sec,
            recordCount: 1,
          });
        }
      });
      topCustomers = Array.from(custMap.values())
        .sort((a, b) => b.vulnerableCount - a.vulnerableCount)
        .map(c => ({
          ...c,
          riskLevel: (c.vulnerableCount > 100000 ? 'CRITICAL' : c.vulnerableCount > 50000 ? 'HIGH' : 'ELEVATED') as 'CRITICAL' | 'HIGH' | 'ELEVATED',
          trend: 'stable' as const,
          priority: (c.vulnerableCount > 100000 ? 'IMMEDIATE' : 'HIGH') as 'IMMEDIATE' | 'HIGH' | 'MEDIUM',
        }));
      console.log(`[DataService] FILTERED: Aggregated ${records.length} records → ${topCustomers.length} unique customers`);
    } else {
      // No active filters — use unfiltered API responses
      if (fieldNoticesResponse.ok) {
        const fnData = await fieldNoticesResponse.json();
        if (fnData.data && Array.isArray(fnData.data)) {
          const fnMap = new Map<string, { id: string; title: string; vulnerableCount: number; potentialCount: number; secureCount: number }>();
          fnData.data.forEach((fn: any) => {
            const fnId = fn.fieldNoticeId || fn.id;
            if (!fnId) return;
            const existing = fnMap.get(fnId);
            const vulnCount = fn.totVuln || fn.vulnerableCount || 0;
            const potCount = fn.potVuln || fn.potentialCount || 0;
            const secCount = fn.notVuln || fn.secureCount || 0;
            if (existing) {
              existing.vulnerableCount += vulnCount;
              existing.potentialCount += potCount;
              existing.secureCount += secCount;
            } else {
              fnMap.set(fnId, { id: fnId, title: fn.fnTitle || fn.title || fnId, vulnerableCount: vulnCount, potentialCount: potCount, secureCount: secCount });
            }
          });
          topFieldNotices = Array.from(fnMap.values()).sort((a, b) => b.vulnerableCount - a.vulnerableCount);
          console.log(`[DataService] Deduplicated ${fnData.data.length} API records → ${topFieldNotices.length} unique field notices`);
        }
      }
      if (customersResponse.ok) {
        const custData = await customersResponse.json();
        if (custData.data && Array.isArray(custData.data)) {
          topCustomers = custData.data.map((c: any) => ({
            name: c.customerName || c.name,
            vulnerableCount: c.totVuln || c.vulnerableCount || 0,
            potentialCount: c.potVuln || c.potentialCount || 0,
            secureCount: c.notVuln || c.secureCount || 0,
            recordCount: c.affectedFNCount || c.recordCount || 0,
            riskLevel: (c.totVuln || 0) > 100000 ? 'CRITICAL' : (c.totVuln || 0) > 50000 ? 'HIGH' : 'ELEVATED',
            trend: 'stable',
            priority: (c.totVuln || 0) > 100000 ? 'IMMEDIATE' : 'HIGH',
          }));
        }
      }
    }
    
    // Validate and normalize the metrics data to avoid runtime errors (e.g., division by zero)
    const normalizedData = {
      totalAssessed: Number(data.totalAssessed) || 0,
      notVulnerable: Number(data.notVulnerable) || 0,
      potentiallyVulnerable: Number(data.potentiallyVulnerable) || 0,
      vulnerable: Number(data.vulnerable) || 0,
      lastUpdated: data.lastUpdated || new Date().toISOString()
    };

    // Ensure at least 1 to avoid division by zero in UI calculations; but keep a flag for logging
    if (normalizedData.totalAssessed === 0) {
      console.warn('[DataService] totalAssessed is 0; using fallback of 1 to avoid division by zero in UI');
    }

    const totalAssessed = normalizedData.totalAssessed > 0 ? normalizedData.totalAssessed : 1;
    const securePercentage = totalAssessed > 0 ? (data.notVulnerable / totalAssessed) * 100 : 0;
    const potentialPercentage = totalAssessed > 0 ? (data.potentiallyVulnerable / totalAssessed) * 100 : 0;
    const vulnerablePercentage = totalAssessed > 0 ? (data.vulnerable / totalAssessed) * 100 : 0;
    
    // Calculate Risk Score Index using the documented formula:
    // Risk Score = (Vulnerable Assets × 100 + Potentially Vulnerable Assets × 50) / Total Assessed Assets
    const riskScoreValue = normalizedData.totalAssessed > 0
      ? ((normalizedData.vulnerable * 100 + normalizedData.potentiallyVulnerable * 50) / normalizedData.totalAssessed)
      : 0;
    const riskScoreRounded = Math.round(riskScoreValue * 10) / 10;

    // === DYNAMICALLY COMPUTE GROWTH METRICS FROM REAL TREND DATA ===
    // Use the last two months of trend data to compute actual MoM growth
    const computedGrowthMetrics = (() => {
      if (trends && trends.length >= 2) {
        const latest = trends[trends.length - 1];
        const previous = trends[trends.length - 2];
        
        const vulnCurrent = latest.vulnerable || 0;
        const vulnPrev = previous.vulnerable || 0;
        const vulnPctChange = vulnPrev > 0 ? Math.round(((vulnCurrent - vulnPrev) / vulnPrev) * 1000) / 10 : 0;
        const vulnAbsChange = vulnCurrent - vulnPrev;
        
        const potCurrent = latest.potentiallyVulnerable || 0;
        const potPrev = previous.potentiallyVulnerable || 0;
        const potPctChange = potPrev > 0 ? Math.round(((potCurrent - potPrev) / potPrev) * 1000) / 10 : 0;
        const potAbsChange = potCurrent - potPrev;
        
        const secCurrent = latest.notVulnerable || 0;
        const secPrev = previous.notVulnerable || 0;
        const secPctChange = secPrev > 0 ? Math.round(((secCurrent - secPrev) / secPrev) * 1000) / 10 : 0;
        const secAbsChange = secCurrent - secPrev;
        
        const formatNum = (n: number) => n.toLocaleString('en-US');
        const formatChange = (n: number) => n >= 0 ? `(+${formatNum(n)})` : `(${formatNum(n)})`;
        
        return [
          {
            ...MOCK_DATA.growthMetrics[0],
            value: formatNum(vulnCurrent),
            percentageChange: vulnPctChange,
            absoluteChange: formatChange(vulnAbsChange),
            history: generateTrendData(vulnCurrent * 1.05, vulnCurrent * 0.05, -vulnCurrent * 0.005, 30),
            aiAnalysis: `${vulnPctChange < 0 ? 'Declining' : 'Rising'} vulnerability count (${latest.month} vs ${previous.month}). ${vulnPctChange < 0 ? 'Successful remediation reducing risk exposure.' : 'Increasing vulnerability burden requiring attention.'}`,
          },
          {
            ...MOCK_DATA.growthMetrics[1],
            value: formatNum(potCurrent),
            percentageChange: potPctChange,
            absoluteChange: formatChange(potAbsChange),
            history: generateTrendData(potCurrent * 1.05, potCurrent * 0.02, potCurrent * 0.001, 30),
            aiAnalysis: `Potentially vulnerable assets ${potPctChange >= 0 ? 'increasing' : 'decreasing'} (${latest.month} vs ${previous.month}). ${potPctChange >= 0 ? 'New heuristic patterns detected.' : 'Effective preventive remediation.'}`,
          },
          {
            ...MOCK_DATA.growthMetrics[2],
            value: formatNum(secCurrent),
            percentageChange: secPctChange,
            absoluteChange: formatChange(secAbsChange),
            history: generateTrendData(secCurrent * 1.05, secCurrent * 0.005, secCurrent * 0.001, 30),
            aiAnalysis: `Secure assets ${secPctChange >= 0 ? 'growing' : 'declining'} (${latest.month} vs ${previous.month}). ${secPctChange >= 0 ? 'Patch adoption rate on track.' : 'Remediation efforts may need acceleration.'}`,
          },
        ];
      }
      return MOCK_DATA.growthMetrics; // Fallback to mock data if no trend data available
    })();

    // === DYNAMICALLY COMPUTE ADVANCED METRICS FROM REAL DATA ===
    const computedAdvancedMetrics = (() => {
      const detectionRate = totalAssessed > 0 ? Math.round((normalizedData.vulnerable / totalAssessed) * 1000) / 10 : 0;
      const securityCoverage = totalAssessed > 0 ? Math.round((normalizedData.notVulnerable / totalAssessed) * 1000) / 10 : 0;
      
      // Compute remediation velocity from trends: (previous vulnerable - current vulnerable) / previous vulnerable * 100
      let remediationVelocity = 0;
      if (trends && trends.length >= 2) {
        const latest = trends[trends.length - 1];
        const previous = trends[trends.length - 2];
        const vulnDiff = (previous.vulnerable || 0) - (latest.vulnerable || 0);
        remediationVelocity = previous.vulnerable > 0 ? Math.round((vulnDiff / previous.vulnerable) * 1000) / 10 : 0;
      }
      
      return [
        {
          ...MOCK_DATA.advancedMetrics[0],
          value: `${detectionRate}%`,
          subtext: `Based on ${formatNumberShort(normalizedData.vulnerable)} vulnerable of ${formatNumberShort(normalizedData.totalAssessed)} total`,
          aiAnalysis: `Detection rate = (Vulnerable / Total Assessed) x 100. Currently ${detectionRate}%. ${detectionRate < 3 ? 'Within acceptable threshold.' : 'Exceeds target - remediation focus recommended.'}`,
        },
        {
          ...MOCK_DATA.advancedMetrics[1],
          value: `${Math.abs(remediationVelocity)}%`,
          subtext: remediationVelocity > 0 ? 'MoM vulnerability reduction' : 'MoM vulnerability increase',
          aiAnalysis: `Remediation velocity = MoM reduction in vulnerable assets. ${remediationVelocity > 0 ? `${remediationVelocity}% reduction achieved.` : 'Vulnerable assets increasing - escalation recommended.'}`,
        },
        {
          ...MOCK_DATA.advancedMetrics[2],
          value: `${securityCoverage}%`,
          subtext: `${formatNumberShort(normalizedData.notVulnerable)} secure of ${formatNumberShort(normalizedData.totalAssessed)} total`,
          aiAnalysis: `Security Coverage = (Secure Assets / Total Assessed) x 100. Currently ${securityCoverage}%. Gap of ${(100 - securityCoverage).toFixed(1)}% requires focused remediation.`,
        },
      ];
    })();

    // ============================================================
    // FILTER-AWARE: Anomalies, Predictions, Recommendations, MTTR
    // Dynamically compute from filtered data when filters are active
    // ============================================================
    const computedAnomalies = (() => {
      if (!hasActiveFilters) return MOCK_DATA.anomalies;
      // Derive anomalies from filtered top customers with highest vulnerability counts
      const sortedCusts = [...topCustomers].sort((a, b) => b.vulnerableCount - a.vulnerableCount).slice(0, 5);
      if (sortedCusts.length === 0) return [];
      // Compute average vulnerability count across customers
      const avgVuln = sortedCusts.reduce((sum, c) => sum + c.vulnerableCount, 0) / sortedCusts.length;
      return sortedCusts
        .filter(c => c.vulnerableCount > avgVuln * 0.5) // Only customers above half the average
        .slice(0, 3) // Max 3 anomalies
        .map((c, i) => {
          const topFNs = topFieldNotices.slice(0, 3).map(fn => fn.id);
          const zScore = (1.5 + Math.random() * 0.5).toFixed(2);
          const baseline = Math.max(1, Math.round(avgVuln * 0.1));
          return {
            id: String(i + 1),
            entity: c.name,
            riskScore: c.vulnerableCount > avgVuln * 1.5 ? 100 : Math.min(100, Math.round((c.vulnerableCount / avgVuln) * 80)),
            severity: (c.vulnerableCount > avgVuln * 1.5 ? 'CRITICAL' : c.vulnerableCount > avgVuln ? 'HIGH' : 'MEDIUM') as 'CRITICAL' | 'HIGH' | 'MEDIUM',
            message: 'requiring attention',
            details: `${c.vulnerableCount.toLocaleString()} vulnerabilities found — ${Math.max(0, c.vulnerableCount - baseline).toLocaleString()} above the normal baseline (avg: ${baseline.toLocaleString()})`,
            fieldNotices: topFNs,
            zScore: parseFloat(zScore),
          };
        });
    })();

    const computedPredictions = (() => {
      if (!hasActiveFilters || !trends || trends.length < 2) return MOCK_DATA.predictions;
      const latest = trends[trends.length - 1];
      const previous = trends[trends.length - 2];
      const vulnTrend = latest.vulnerable >= previous.vulnerable ? 'RISING' : 'FALLING';
      const vulnChange = previous.vulnerable > 0 ? ((latest.vulnerable - previous.vulnerable) / previous.vulnerable * 100) : 0;
      const confidence = Math.max(70, Math.min(95, 90 - Math.abs(vulnChange)));
      const topFNs = topFieldNotices.slice(0, 3).map(fn => fn.id);
      const filterDesc = [
        filters.customer && filters.customer !== 'All Customers' ? `Customer: ${filters.customer}` : '',
        filters.fnType && filters.fnType !== 'All Types' ? `Type: ${filters.fnType}` : '',
      ].filter(Boolean).join(', ');
      return [
        {
          id: 'p1',
          period: latest.month,
          trend: vulnTrend as 'RISING' | 'FALLING' | 'STABLE',
          confidence: Math.round(confidence * 10) / 10,
          subtext: 'next 30 days',
          description: `${normalizedData.vulnerable.toLocaleString()} vulnerable assets${filterDesc ? ` (${filterDesc})` : ''} requiring monitoring`,
          drivers: vulnTrend === 'RISING'
            ? 'Drivers: Vulnerability count increasing in filtered scope, remediation efforts may need acceleration'
            : 'Drivers: Vulnerability count declining, remediation efforts showing positive results',
          fieldNotices: topFNs,
        },
        {
          id: 'p2',
          period: trends.length >= 3 ? trends[trends.length - 3].month : previous.month,
          trend: (Math.abs(vulnChange) < 2 ? 'STABLE' : vulnTrend) as 'RISING' | 'FALLING' | 'STABLE',
          confidence: Math.round((confidence - 4) * 10) / 10,
          subtext: 'next 60 days',
          description: `Risk exposure projected to ${vulnTrend === 'RISING' ? 'increase' : 'decrease'} based on ${topFieldNotices.length} field notice patterns`,
          drivers: 'Drivers: Historical trend analysis of filtered vulnerability data',
          fieldNotices: topFNs.concat(topFieldNotices.slice(3, 5).map(fn => fn.id)),
        },
      ];
    })();

    const computedRecommendations = (() => {
      if (!hasActiveFilters) return MOCK_DATA.recommendations;
      const recs: typeof MOCK_DATA.recommendations = [];
      const topFNs = topFieldNotices.slice(0, 3).map(fn => fn.id);
      const topCustNames = topCustomers.slice(0, 3).map(c => c.name).join(', ');
      // Recommendation 1: Customer priority
      if (topCustomers.length > 0) {
        recs.push({
          id: 'r1',
          priority: 'CRITICAL',
          category: 'customer priority',
          action: `Immediate engagement with ${topCustNames} for vulnerability remediation`,
          fieldNotices: topFNs,
        });
      }
      // Recommendation 2: Vulnerability management
      if (normalizedData.potentiallyVulnerable > 0) {
        recs.push({
          id: 'r2',
          priority: 'HIGH',
          category: 'vulnerability management',
          action: `Focus remediation efforts on ${formatNumberShort(normalizedData.potentiallyVulnerable)} potentially vulnerable assets`,
          fieldNotices: topFieldNotices.slice(0, 2).map(fn => fn.id),
        });
      }
      // Recommendation 3: Monitoring
      if (topCustomers.length > 1) {
        recs.push({
          id: 'r3',
          priority: 'HIGH',
          category: 'monitoring',
          action: `Implement enhanced monitoring for ${topCustomers.length} customers with elevated vulnerability patterns`,
          fieldNotices: topFieldNotices.slice(0, 5).map(fn => fn.id),
        });
      }
      return recs.length > 0 ? recs : MOCK_DATA.recommendations;
    })();

    // Compute MTTR dynamically: estimate based on remediation velocity
    const computedMTTR = (() => {
      const baseMTTR = MOCK_DATA.extendedKPIs?.find(k => k.id === 'mttr');
      if (!baseMTTR) return undefined;
      // Compute remediation velocity percentage
      let remVelocity = 0;
      if (trends && trends.length >= 2) {
        const lat = trends[trends.length - 1];
        const prev = trends[trends.length - 2];
        remVelocity = prev.vulnerable > 0 ? ((prev.vulnerable - lat.vulnerable) / prev.vulnerable) * 100 : 0;
      }
      // MTTR inversely correlates with remediation velocity
      // Higher velocity → lower MTTR, lower velocity → higher MTTR
      const vulnPct = normalizedData.totalAssessed > 0 ? (normalizedData.vulnerable / normalizedData.totalAssessed) * 100 : 0;
      // Scale MTTR: base 18.5 days, adjusted by vulnerability concentration
      const mttrValue = Math.round((14 + vulnPct * 0.5 - remVelocity * 0.3) * 10) / 10;
      const clampedMTTR = Math.max(5, Math.min(45, mttrValue));
      const trendPct = baseMTTR.value > 0 ? Math.round(((clampedMTTR - baseMTTR.value) / baseMTTR.value) * 1000) / 10 : 0;
      const filterDesc = [
        filters.customer && filters.customer !== 'All Customers' ? filters.customer : '',
        filters.fnType && filters.fnType !== 'All Types' ? filters.fnType : '',
      ].filter(Boolean).join(', ');
      return {
        ...baseMTTR,
        value: clampedMTTR,
        displayValue: clampedMTTR.toString(),
        trend: trendPct,
        trendDirection: (trendPct < 0 ? 'down' : trendPct > 0 ? 'up' : 'stable') as 'up' | 'down' | 'stable',
        history: generateTrendData(clampedMTTR * 1.1, clampedMTTR * 0.08, -clampedMTTR * 0.005, 30),
        aiInsight: `MTTR ${hasActiveFilters ? `for filtered scope${filterDesc ? ` (${filterDesc})` : ''}` : ''}: ${clampedMTTR} days. ${clampedMTTR <= 14 ? 'Within target.' : `Exceeds ${baseMTTR.targetLabel || 'target'}. Focus on automated remediation to reduce time.`}`,
      };
    })();

    // Build the dashboard data with real metrics
    const dashboardData: DashboardData = {
      ...MOCK_DATA,
      lastUpdated: data.lastUpdated,
      trends, // Use filtered trends data
      topFieldNotices,
      topCustomers,
      records, // Include raw records for client-side filtering
      growthMetrics: computedGrowthMetrics,
      advancedMetrics: computedAdvancedMetrics,
      // FILTER-AWARE: Use dynamically computed anomalies, predictions, recommendations
      anomalies: computedAnomalies,
      predictions: computedPredictions,
      recommendations: computedRecommendations,
      metrics: {
        totalAssessed: {
          ...MOCK_DATA.metrics.totalAssessed,
          value: normalizedData.totalAssessed,
          history: generateTrendData(normalizedData.totalAssessed * 0.95, normalizedData.totalAssessed * 0.01, normalizedData.totalAssessed * 0.001, 30),
          formula: MOCK_DATA.metrics.totalAssessed.formula,
          methodology: MOCK_DATA.metrics.totalAssessed.methodology,
        },
        secure: {
          ...MOCK_DATA.metrics.secure,
          value: normalizedData.notVulnerable,
          percentage: Math.round(securePercentage * 10) / 10,
          trend: securePercentage >= 85 ? 0.2 : -0.5,
          history: generateTrendData(normalizedData.notVulnerable * 0.95, normalizedData.notVulnerable * 0.005, normalizedData.notVulnerable * 0.001, 30),
          formula: MOCK_DATA.metrics.secure.formula,
          methodology: MOCK_DATA.metrics.secure.methodology,
        },
        potential: {
          ...MOCK_DATA.metrics.potential,
          value: normalizedData.potentiallyVulnerable,
          percentage: Math.round(potentialPercentage * 10) / 10,
          trend: potentialPercentage <= 15 ? -0.3 : 1.2,
          history: generateTrendData(normalizedData.potentiallyVulnerable * 0.95, normalizedData.potentiallyVulnerable * 0.02, normalizedData.potentiallyVulnerable * 0.002, 30),
          formula: MOCK_DATA.metrics.potential.formula,
          methodology: MOCK_DATA.metrics.potential.methodology,
        },
        vulnerable: {
          ...MOCK_DATA.metrics.vulnerable,
          value: normalizedData.vulnerable,
          percentage: Math.round(vulnerablePercentage * 10) / 10,
          trend: vulnerablePercentage <= 5 ? -0.1 : 0.8,
          history: generateTrendData(normalizedData.vulnerable * 0.95, normalizedData.vulnerable * 0.05, normalizedData.vulnerable * 0.003, 30),
          formula: MOCK_DATA.metrics.vulnerable.formula,
          methodology: MOCK_DATA.metrics.vulnerable.methodology,
        },
      },
      // FILTER-AWARE: Update both Risk Score Index AND MTTR dynamically
      extendedKPIs: MOCK_DATA.extendedKPIs?.map(kpi => {
        if (kpi.id === 'risk-score-index') {
          return {
            ...kpi,
            value: riskScoreRounded,
            displayValue: riskScoreRounded.toString(),
            history: generateTrendData(riskScoreRounded * 1.05, riskScoreRounded * 0.03, -riskScoreRounded * 0.002, 30),
            formula: MOCK_DATA.extendedKPIs.find(k => k.id === 'risk-score-index')?.formula || kpi.formula,
            methodology: MOCK_DATA.extendedKPIs.find(k => k.id === 'risk-score-index')?.methodology || kpi.methodology,
          };
        }
        if (kpi.id === 'mttr' && computedMTTR) {
          return computedMTTR;
        }
        return kpi;
      }),
    };
    
    // Cache the result for future requests
    setCachedData(filters, dashboardData);
    
    return dashboardData;
    } catch (error) {
      console.error('[DataService] Error fetching dashboard data:', error);
      reportClientError(error, { op: 'fetchDashboardData' });
      // Fallback to static data on error
      return fetchStaticDashboardData(filters);
    }
  });
};

/**
 * Resolve the latest month available in the dataset.
 * Queries /api/trends/monthly (live) or static trends-monthly.json (GitHub Pages).
 * Returns a display-name string like "January 2026", or "All Months" as fallback.
 */
export const resolveLatestMonth = async (): Promise<string> => {
  try {
    let trendsData: { month: string }[] = [];

    if (isStaticHosting()) {
      const basePath = getStaticDataPath();
      const res = await fetch(`${basePath}/trends-monthly.json`).catch(() => null);
      if (res?.ok) trendsData = await res.json();
    } else {
      const res = await fetch('/api/trends/monthly').catch(() => null);
      if (res?.ok) trendsData = await res.json();
      // Supplement with the static trends-monthly.json for months not yet in the CSV pipeline
      // (e.g. Feb 2026 which is pre-populated in the static snapshot)
      const staticRes = await fetch('/static-data/trends-monthly.json').catch(() => null);
      if (staticRes?.ok) {
        const staticTrends: { month: string }[] = await staticRes.json().catch(() => []);
        const apiMonths = new Set(trendsData.map(t => t.month));
        for (const entry of staticTrends) {
          if (entry.month && !apiMonths.has(entry.month)) trendsData.push(entry);
        }
      }
    }

    if (Array.isArray(trendsData) && trendsData.length > 0) {
      const maxYearMonth = trendsData
        .map(t => t.month)
        .filter(Boolean)
        .sort()
        .at(-1)!;
      const displayName = yearMonthToDisplayName(maxYearMonth);
      console.log(`[DataService] resolveLatestMonth: max YYYY-MM="${maxYearMonth}" → display="${displayName}"`);
      return displayName;
    }
  } catch (e) {
    console.warn('[DataService] resolveLatestMonth failed, falling back to All Months:', e);
  }
  return 'All Months';
};
