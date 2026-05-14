/**
 * In-Memory Cache Implementation with TTL
 * Provides fast access to frequently requested data
 * 
 * Features:
 * - TTL-based expiration
 * - Automatic cleanup of expired entries
 * - Memory-efficient with size limits
 * - Type-safe with generics
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

class InMemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private hits: number = 0;
  private misses: number = 0;
  private maxSize: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
    // Run cleanup every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data as T;
  }

  /**
   * Set a value in cache with TTL (in milliseconds)
   */
  set<T>(key: string, data: T, ttlMs: number = 300000): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now(),
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string): number {
    let deleted = 0;
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    
    return deleted;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
    };
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let expired = 0;
    
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        expired++;
      }
    }
    
    if (expired > 0) {
      console.log(`[CACHE] Cleaned up ${expired} expired entries`);
    }
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldest(): void {
    let oldest: { key: string; createdAt: number } | null = null;
    
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (!oldest || entry.createdAt < oldest.createdAt) {
        oldest = { key, createdAt: entry.createdAt };
      }
    }
    
    if (oldest) {
      this.cache.delete(oldest.key);
    }
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Singleton instance with reasonable defaults
export const cache = new InMemoryCache(500);

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  // Metrics and trends - 5 minutes (data doesn't change frequently)
  METRICS: 5 * 60 * 1000,
  TRENDS: 5 * 60 * 1000,
  
  // Field notices and customers - 10 minutes
  FIELD_NOTICES: 10 * 60 * 1000,
  CUSTOMERS: 10 * 60 * 1000,
  
  // Filter options - 15 minutes (dropdown options)
  FILTER_OPTIONS: 15 * 60 * 1000,
  
  // Cumulative data - 30 minutes (rarely changes)
  CUMULATIVE: 30 * 60 * 1000,
  
  // Intelligence/AI insights - 10 minutes
  INTELLIGENCE: 10 * 60 * 1000,
  
  // CSV parsed data - 30 minutes (expensive to parse)
  CSV_DATA: 30 * 60 * 1000,
};

// Helper function to generate cache keys
export function generateCacheKey(prefix: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return prefix;
  }
  
  // Sort keys for consistent cache key generation
  const sortedParams = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  
  return sortedParams ? `${prefix}:${sortedParams}` : prefix;
}

// Decorator-style caching wrapper
export async function withCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // Check cache first
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  // Fetch fresh data
  const data = await fetcher();
  
  // Store in cache
  cache.set(key, data, ttl);
  
  return data;
}

export default cache;
