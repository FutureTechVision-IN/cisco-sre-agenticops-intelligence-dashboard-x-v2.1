/**
 * Request Optimization Utilities
 * - Selective field retrieval to reduce payload
 * - Request deduplication
 * - Optimized query parameters
 */

import { cacheService } from './cacheService';

/**
 * Optimized fetch with caching and automatic deduplication
 */
export const optimizedFetch = async <T>(
  url: string,
  options?: {
    cacheTTL?: number; // Cache time-to-live in ms (default: 5 minutes)
    deduplicateKey?: string; // Custom cache key for deduplication
    fields?: string[]; // Selective fields to retrieve (reduces payload)
    includeCache?: boolean; // Use cache (default: true)
  }
): Promise<T> => {
  const {
    cacheTTL = 5 * 60 * 1000,
    deduplicateKey = url,
    fields = [],
    includeCache = true
  } = options || {};

  // Check cache first
  if (includeCache) {
    const cached = cacheService.get<T>(deduplicateKey);
    if (cached) {
      console.log(`[optimizedFetch] Cache HIT: ${deduplicateKey}`);
      return cached;
    }
  }

  try {
    // Build URL with selective fields parameter
    const urlObj = new URL(url);
    if (fields.length > 0) {
      urlObj.searchParams.set('fields', fields.join(','));
    }

    console.log(`[optimizedFetch] Fetching: ${deduplicateKey}`);
    const response = await fetch(urlObj.toString());

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as T;

    // Cache the result
    if (includeCache) {
      cacheService.set(deduplicateKey, data, cacheTTL);
      console.log(`[optimizedFetch] Cached: ${deduplicateKey}`);
    }

    return data;
  } catch (error) {
    console.error(`[optimizedFetch] Error fetching ${url}:`, error);
    throw error;
  }
};

/**
 * Batch fetch multiple URLs to reduce network requests
 */
export const batchFetch = async <T>(
  urls: string[],
  options?: {
    cacheTTL?: number;
    fields?: string[];
    parallel?: boolean; // Fetch in parallel (default) or sequentially
  }
): Promise<T[]> => {
  const { parallel = true } = options || {};

  if (parallel) {
    // Fetch all in parallel
    return Promise.all(urls.map(url => optimizedFetch<T>(url, options)));
  } else {
    // Fetch sequentially to avoid network congestion
    const results: T[] = [];
    for (const url of urls) {
      const result = await optimizedFetch<T>(url, options);
      results.push(result);
    }
    return results;
  }
};

/**
 * Build optimized query string with selective fields
 */
export const buildOptimizedQuery = (
  params: Record<string, any>,
  selectiveFields?: string[]
): URLSearchParams => {
  const query = new URLSearchParams();

  // Add standard parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      query.append(key, String(value));
    }
  });

  // Add selective fields
  if (selectiveFields && selectiveFields.length > 0) {
    query.append('fields', selectiveFields.join(','));
  }

  return query;
};

/**
 * Debounce API calls to prevent excessive requests
 */
export const createDebouncedFetch = <T>(
  fetchFn: (args: any) => Promise<T>,
  delay: number = 300
) => {
  let timeoutId: NodeJS.Timeout;
  let lastResult: T | null = null;

  return (args: any): Promise<T> => {
    return new Promise((resolve) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchFn(args).then(result => {
          lastResult = result;
          resolve(result);
        });
      }, delay);
    });
  };
};

/**
 * Invalidate cache for specific patterns
 */
export const invalidateCachePattern = (pattern: string): number => {
  const keys = cacheService.getKeys();
  let invalidatedCount = 0;

  keys.forEach(key => {
    if (key.includes(pattern)) {
      cacheService.delete(key);
      invalidatedCount++;
    }
  });

  console.log(`[cacheService] Invalidated ${invalidatedCount} entries matching "${pattern}"`);
  return invalidatedCount;
};

/**
 * Clear all cache
 */
export const clearAllCache = (): void => {
  cacheService.clear();
  console.log('[cacheService] All cache cleared');
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return cacheService.getStats();
};
