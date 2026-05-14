/**
 * Unified Cache Layer
 * Supports Redis with automatic fallback to in-memory cache
 * Provides consistent interface for caching across the application
 */

import { createClient, RedisClientType } from 'redis';

// Cache entry with metadata
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

// Cache configuration
interface CacheConfig {
  redisUrl?: string;
  defaultTTL: number;  // milliseconds
  maxMemoryCacheSize: number;  // max entries in memory cache
  compressionEnabled: boolean;
}

// Cache statistics
interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalEntries: number;
  memoryUsageBytes: number;
  redisConnected: boolean;
  mode: 'redis' | 'memory' | 'hybrid';
}

class CacheLayer {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private redisClient: RedisClientType | null = null;
  private redisConnected: boolean = false;
  private config: CacheConfig;
  private stats = { hits: 0, misses: 0 };
  
  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      redisUrl: process.env.REDIS_URL || undefined,
      defaultTTL: 5 * 60 * 1000,  // 5 minutes default
      maxMemoryCacheSize: 1000,
      compressionEnabled: true,
      ...config,
    };
    
    // Initialize Redis if URL is provided
    if (this.config.redisUrl) {
      this.initRedis();
    } else {
      console.log('[CACHE] Running in memory-only mode (no REDIS_URL provided)');
    }
  }

  /**
   * Initialize Redis connection
   */
  private async initRedis(): Promise<void> {
    try {
      this.redisClient = createClient({
        url: this.config.redisUrl,
      });
      
      this.redisClient.on('error', (err) => {
        console.error('[CACHE] Redis error:', err.message);
        this.redisConnected = false;
      });
      
      this.redisClient.on('connect', () => {
        console.log('[CACHE] Redis connected');
        this.redisConnected = true;
      });
      
      this.redisClient.on('reconnecting', () => {
        console.log('[CACHE] Redis reconnecting...');
      });
      
      await this.redisClient.connect();
    } catch (error) {
      console.error('[CACHE] Failed to connect to Redis, using memory cache:', 
        error instanceof Error ? error.message : String(error));
      this.redisClient = null;
      this.redisConnected = false;
    }
  }

  /**
   * Generate a cache key with namespace
   */
  private generateKey(namespace: string, key: string): string {
    return `cisco-sre:${namespace}:${key}`;
  }

  /**
   * Set a value in cache
   */
  async set<T>(
    namespace: string, 
    key: string, 
    value: T, 
    ttlMs: number = this.config.defaultTTL
  ): Promise<void> {
    const fullKey = this.generateKey(namespace, key);
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttlMs,
      hits: 0,
    };
    
    // Always set in memory cache
    this.setInMemory(fullKey, entry);
    
    // Also set in Redis if available
    if (this.redisConnected && this.redisClient) {
      try {
        await this.redisClient.setEx(
          fullKey,
          Math.ceil(ttlMs / 1000),
          JSON.stringify(entry)
        );
      } catch (error) {
        console.error('[CACHE] Redis set error:', error);
      }
    }
  }

  /**
   * Set in memory cache with LRU eviction
   */
  private setInMemory<T>(key: string, entry: CacheEntry<T>): void {
    // Evict oldest entries if at capacity
    if (this.memoryCache.size >= this.config.maxMemoryCacheSize) {
      const oldest = this.findOldestEntry();
      if (oldest) {
        this.memoryCache.delete(oldest);
      }
    }
    
    this.memoryCache.set(key, entry);
  }

  /**
   * Find the oldest (least recently used) entry
   */
  private findOldestEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    const entries = Array.from(this.memoryCache.entries());
    for (const [key, entry] of entries) {
      // Consider both timestamp and hits for LRU
      const score = entry.timestamp + (entry.hits * 10000);
      if (score < oldestTime) {
        oldestTime = score;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }

  /**
   * Get a value from cache
   */
  async get<T>(namespace: string, key: string): Promise<T | null> {
    const fullKey = this.generateKey(namespace, key);
    
    // Check memory cache first
    const memEntry = this.memoryCache.get(fullKey);
    if (memEntry) {
      // Check if expired
      if (Date.now() - memEntry.timestamp < memEntry.ttl) {
        memEntry.hits++;
        this.stats.hits++;
        return memEntry.data as T;
      } else {
        // Expired, remove it
        this.memoryCache.delete(fullKey);
      }
    }
    
    // Try Redis if available
    if (this.redisConnected && this.redisClient) {
      try {
        const redisValue = await this.redisClient.get(fullKey);
        if (redisValue) {
          const entry: CacheEntry<T> = JSON.parse(redisValue);
          // Refresh memory cache
          this.setInMemory(fullKey, entry);
          this.stats.hits++;
          return entry.data;
        }
      } catch (error) {
        console.error('[CACHE] Redis get error:', error);
      }
    }
    
    this.stats.misses++;
    return null;
  }

  /**
   * Get or set pattern - returns cached value or computes and caches
   */
  async getOrSet<T>(
    namespace: string,
    key: string,
    compute: () => Promise<T> | T,
    ttlMs: number = this.config.defaultTTL
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(namespace, key);
    if (cached !== null) {
      return cached;
    }
    
    // Compute the value
    const value = await compute();
    
    // Store in cache
    await this.set(namespace, key, value, ttlMs);
    
    return value;
  }

  /**
   * Delete a value from cache
   */
  async delete(namespace: string, key: string): Promise<void> {
    const fullKey = this.generateKey(namespace, key);
    
    this.memoryCache.delete(fullKey);
    
    if (this.redisConnected && this.redisClient) {
      try {
        await this.redisClient.del(fullKey);
      } catch (error) {
        console.error('[CACHE] Redis delete error:', error);
      }
    }
  }

  /**
   * Clear all entries in a namespace
   */
  async clearNamespace(namespace: string): Promise<void> {
    const prefix = this.generateKey(namespace, '');
    
    // Clear from memory
    const keys = Array.from(this.memoryCache.keys());
    for (const key of keys) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }
    
    // Clear from Redis
    if (this.redisConnected && this.redisClient) {
      try {
        const redisKeys = await this.redisClient.keys(`${prefix}*`);
        if (redisKeys.length > 0) {
          await this.redisClient.del(redisKeys);
        }
      } catch (error) {
        console.error('[CACHE] Redis clear error:', error);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    if (this.redisConnected && this.redisClient) {
      try {
        const keys = await this.redisClient.keys('cisco-sre:*');
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      } catch (error) {
        console.error('[CACHE] Redis clear all error:', error);
      }
    }
    
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    
    // Estimate memory usage (rough calculation)
    let memoryUsageBytes = 0;
    const entries = Array.from(this.memoryCache.entries());
    for (const [key, entry] of entries) {
      memoryUsageBytes += key.length * 2;  // UTF-16
      memoryUsageBytes += JSON.stringify(entry.data).length * 2;
    }
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: totalRequests > 0 ? Math.round((this.stats.hits / totalRequests) * 100) : 0,
      totalEntries: this.memoryCache.size,
      memoryUsageBytes,
      redisConnected: this.redisConnected,
      mode: this.redisConnected ? 'hybrid' : 'memory',
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    memory: { status: 'ok' | 'error'; entries: number };
    redis: { status: 'ok' | 'disconnected' | 'not_configured' };
  }> {
    const memoryStatus = { status: 'ok' as const, entries: this.memoryCache.size };
    
    let redisStatus: 'ok' | 'disconnected' | 'not_configured' = 'not_configured';
    if (this.redisClient) {
      if (this.redisConnected) {
        try {
          await this.redisClient.ping();
          redisStatus = 'ok';
        } catch {
          redisStatus = 'disconnected';
        }
      } else {
        redisStatus = 'disconnected';
      }
    }
    
    return {
      healthy: memoryStatus.status === 'ok',
      memory: memoryStatus,
      redis: { status: redisStatus },
    };
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.redisClient = null;
      this.redisConnected = false;
    }
  }
}

// Singleton instance with default config
export const cacheLayer = new CacheLayer();

// Cache namespaces for the application
export const CACHE_NAMESPACES = {
  METRICS: 'metrics',
  TRENDS: 'trends',
  FIELD_NOTICES: 'field-notices',
  CUSTOMERS: 'customers',
  FILTERS: 'filters',
  REPORTS: 'reports',
  INTELLIGENCE: 'intelligence',
} as const;

// TTL presets in milliseconds
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000,      // 1 minute
  MEDIUM: 5 * 60 * 1000,     // 5 minutes (default)
  LONG: 30 * 60 * 1000,      // 30 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
} as const;

/**
 * Generate a cache key from filter parameters
 */
export function generateFilterKey(filters: Record<string, any>): string {
  const sortedKeys = Object.keys(filters).sort();
  const parts = sortedKeys
    .filter(k => filters[k] !== undefined && filters[k] !== null)
    .map(k => `${k}:${filters[k]}`);
  
  return parts.length > 0 ? parts.join('|') : 'all';
}

export { CacheLayer };
