/**
 * Cache Service - Optimize API performance with intelligent caching
 * Implements LRU (Least Recently Used) cache with TTL (Time To Live)
 * Reduces redundant API calls and network overhead
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
}

class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, hitRate: 0 };
  private maxSize: number = 100; // Maximum cache entries

  /**
   * Get cached value if exists and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    this.stats.hits++;
    this.updateHitRate();
    return entry.data;
  }

  /**
   * Set cached value with TTL
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    // Implement LRU eviction when cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Remove oldest entry (first one)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Clear specific cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, hitRate: 0 };
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache size
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Get cached keys
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Export singleton instance
export const cacheService = new CacheService();
export default cacheService;
