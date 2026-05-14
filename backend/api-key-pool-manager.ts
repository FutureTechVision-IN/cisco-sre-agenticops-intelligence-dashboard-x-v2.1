/**
 * API Key Pool Manager
 * 
 * Manages multiple API keys with load balancing and automatic failover
 * Enables higher throughput by distributing requests across keys
 * 
 * Example: 2 keys × 12 calls/min = 24 calls/min total capacity
 */

import crypto from 'crypto';

interface KeyPoolEntry {
  keyId: string;
  apiKey: string;
  status: 'active' | 'inactive' | 'rate-limited' | 'error';
  rateLimitBucket: {
    tokens: number;
    lastRefill: number;
    maxTokens: number;
    refillRate: number; // tokens per second
  };
  metrics: {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    lastUsed: number;
    averageResponseTime: number;
  };
  priority: number; // Higher priority keys used first
}

interface LoadBalancingStrategy {
  strategy: 'round-robin' | 'least-loaded' | 'weighted' | 'priority';
  stickySession?: boolean; // Use same key for same user
}

export class APIKeyPoolManager {
  private keyPool: Map<string, KeyPoolEntry> = new Map();
  private roundRobinIndex: number = 0;
  private readonly DEFAULT_RATE_LIMIT = 12; // calls per minute
  private readonly REFILL_RATE = 12 / 60; // tokens per second

  /**
   * Add API key to the pool
   */
  addKey(
    keyId: string,
    apiKey: string,
    options: {
      priority?: number;
      maxTokens?: number;
      status?: 'active' | 'inactive';
    } = {}
  ): void {
    const entry: KeyPoolEntry = {
      keyId,
      apiKey,
      status: options.status || 'active',
      rateLimitBucket: {
        tokens: options.maxTokens || this.DEFAULT_RATE_LIMIT,
        lastRefill: Date.now() / 1000,
        maxTokens: options.maxTokens || this.DEFAULT_RATE_LIMIT,
        refillRate: this.REFILL_RATE,
      },
      metrics: {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        lastUsed: 0,
        averageResponseTime: 0,
      },
      priority: options.priority || 1,
    };

    this.keyPool.set(keyId, entry);
    console.log(`[KEY-POOL] Added key ${keyId} to pool (priority: ${entry.priority}, limit: ${entry.rateLimitBucket.maxTokens}/min)`);
  }

  /**
   * Remove key from pool
   */
  removeKey(keyId: string): boolean {
    const removed = this.keyPool.delete(keyId);
    if (removed) {
      console.log(`[KEY-POOL] Removed key ${keyId} from pool`);
    }
    return removed;
  }

  /**
   * Get next available API key using specified strategy
   */
  getNextKey(
    userId?: string,
    strategy: LoadBalancingStrategy = { strategy: 'least-loaded' }
  ): { keyId: string; apiKey: string } | null {
    const activeKeys = Array.from(this.keyPool.values()).filter(
      (entry) => entry.status === 'active'
    );

    if (activeKeys.length === 0) {
      console.warn('[KEY-POOL] No active keys available');
      return null;
    }

    // Refill all buckets
    this.refillAllBuckets();

    let selectedKey: KeyPoolEntry | null = null;

    switch (strategy.strategy) {
      case 'round-robin':
        selectedKey = this.getRoundRobinKey(activeKeys);
        break;

      case 'least-loaded':
        selectedKey = this.getLeastLoadedKey(activeKeys);
        break;

      case 'weighted':
        selectedKey = this.getWeightedKey(activeKeys);
        break;

      case 'priority':
        selectedKey = this.getPriorityKey(activeKeys);
        break;

      default:
        selectedKey = this.getLeastLoadedKey(activeKeys);
    }

    if (!selectedKey) {
      console.warn('[KEY-POOL] No key available with remaining tokens');
      return null;
    }

    return {
      keyId: selectedKey.keyId,
      apiKey: selectedKey.apiKey,
    };
  }

  /**
   * Round-robin key selection
   */
  private getRoundRobinKey(activeKeys: KeyPoolEntry[]): KeyPoolEntry | null {
    // Filter keys with available tokens
    const availableKeys = activeKeys.filter((k) => k.rateLimitBucket.tokens >= 1);
    
    if (availableKeys.length === 0) return null;

    const key = availableKeys[this.roundRobinIndex % availableKeys.length];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % availableKeys.length;
    return key;
  }

  /**
   * Select key with most available tokens (least loaded)
   */
  private getLeastLoadedKey(activeKeys: KeyPoolEntry[]): KeyPoolEntry | null {
    const availableKeys = activeKeys.filter((k) => k.rateLimitBucket.tokens >= 1);
    
    if (availableKeys.length === 0) return null;

    return availableKeys.reduce((prev, current) =>
      current.rateLimitBucket.tokens > prev.rateLimitBucket.tokens ? current : prev
    );
  }

  /**
   * Weighted selection based on available tokens
   */
  private getWeightedKey(activeKeys: KeyPoolEntry[]): KeyPoolEntry | null {
    const availableKeys = activeKeys.filter((k) => k.rateLimitBucket.tokens >= 1);
    
    if (availableKeys.length === 0) return null;

    const totalTokens = availableKeys.reduce(
      (sum, key) => sum + key.rateLimitBucket.tokens,
      0
    );

    let random = Math.random() * totalTokens;
    
    for (const key of availableKeys) {
      random -= key.rateLimitBucket.tokens;
      if (random <= 0) return key;
    }

    return availableKeys[0];
  }

  /**
   * Select highest priority key with available tokens
   */
  private getPriorityKey(activeKeys: KeyPoolEntry[]): KeyPoolEntry | null {
    const availableKeys = activeKeys
      .filter((k) => k.rateLimitBucket.tokens >= 1)
      .sort((a, b) => b.priority - a.priority);
    
    return availableKeys[0] || null;
  }

  /**
   * Refill token buckets for all keys
   */
  private refillAllBuckets(): void {
    const now = Date.now() / 1000;

    this.keyPool.forEach((entry) => {
      const timePassed = now - entry.rateLimitBucket.lastRefill;
      entry.rateLimitBucket.tokens = Math.min(
        entry.rateLimitBucket.maxTokens,
        entry.rateLimitBucket.tokens + timePassed * entry.rateLimitBucket.refillRate
      );
      entry.rateLimitBucket.lastRefill = now;
    });
  }

  /**
   * Consume tokens from a specific key
   */
  consumeToken(keyId: string, tokens: number = 1): boolean {
    const entry = this.keyPool.get(keyId);
    if (!entry) return false;

    this.refillAllBuckets();

    if (entry.rateLimitBucket.tokens >= tokens) {
      entry.rateLimitBucket.tokens -= tokens;
      entry.metrics.totalCalls++;
      entry.metrics.lastUsed = Date.now();
      return true;
    }

    console.warn(`[KEY-POOL] Insufficient tokens for key ${keyId}: ${entry.rateLimitBucket.tokens} < ${tokens}`);
    return false;
  }

  /**
   * Record call metrics for a key
   */
  recordMetrics(
    keyId: string,
    success: boolean,
    responseTime: number
  ): void {
    const entry = this.keyPool.get(keyId);
    if (!entry) return;

    if (success) {
      entry.metrics.successfulCalls++;
    } else {
      entry.metrics.failedCalls++;
      
      // Auto-disable key after too many failures
      if (entry.metrics.failedCalls > 10 && 
          entry.metrics.failedCalls / entry.metrics.totalCalls > 0.5) {
        entry.status = 'error';
        console.error(`[KEY-POOL] Auto-disabled key ${keyId} due to high failure rate`);
      }
    }

    // Update average response time
    const totalResponseTime = entry.metrics.averageResponseTime * (entry.metrics.totalCalls - 1);
    entry.metrics.averageResponseTime = (totalResponseTime + responseTime) / entry.metrics.totalCalls;
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): {
    totalKeys: number;
    activeKeys: number;
    totalCapacity: number;
    availableTokens: number;
    poolUtilization: number;
    keyStats: Array<{
      keyId: string;
      status: string;
      availableTokens: number;
      maxTokens: number;
      totalCalls: number;
      successRate: number;
      avgResponseTime: number;
    }>;
  } {
    this.refillAllBuckets();

    const activeKeys = Array.from(this.keyPool.values()).filter(
      (k) => k.status === 'active'
    );

    const totalCapacity = activeKeys.reduce(
      (sum, key) => sum + key.rateLimitBucket.maxTokens,
      0
    );

    const availableTokens = activeKeys.reduce(
      (sum, key) => sum + key.rateLimitBucket.tokens,
      0
    );

    const keyStats = Array.from(this.keyPool.values()).map((entry) => ({
      keyId: entry.keyId.substring(0, 20) + '...',
      status: entry.status,
      availableTokens: Math.floor(entry.rateLimitBucket.tokens),
      maxTokens: entry.rateLimitBucket.maxTokens,
      totalCalls: entry.metrics.totalCalls,
      successRate: entry.metrics.totalCalls > 0
        ? (entry.metrics.successfulCalls / entry.metrics.totalCalls) * 100
        : 0,
      avgResponseTime: Math.round(entry.metrics.averageResponseTime),
    }));

    return {
      totalKeys: this.keyPool.size,
      activeKeys: activeKeys.length,
      totalCapacity,
      availableTokens: Math.floor(availableTokens),
      poolUtilization: totalCapacity > 0 ? ((totalCapacity - availableTokens) / totalCapacity) * 100 : 0,
      keyStats,
    };
  }

  /**
   * Get specific key metrics
   */
  getKeyMetrics(keyId: string) {
    const entry = this.keyPool.get(keyId);
    if (!entry) return null;

    this.refillAllBuckets();

    return {
      keyId,
      status: entry.status,
      rateLimitBucket: {
        availableTokens: Math.floor(entry.rateLimitBucket.tokens),
        maxTokens: entry.rateLimitBucket.maxTokens,
        utilizationPercent: ((entry.rateLimitBucket.maxTokens - entry.rateLimitBucket.tokens) / entry.rateLimitBucket.maxTokens) * 100,
      },
      metrics: {
        ...entry.metrics,
        successRate: entry.metrics.totalCalls > 0
          ? (entry.metrics.successfulCalls / entry.metrics.totalCalls) * 100
          : 0,
      },
    };
  }

  /**
   * Update key status
   */
  updateKeyStatus(keyId: string, status: 'active' | 'inactive' | 'rate-limited' | 'error'): boolean {
    const entry = this.keyPool.get(keyId);
    if (!entry) return false;

    entry.status = status;
    console.log(`[KEY-POOL] Updated key ${keyId} status to ${status}`);
    return true;
  }

  /**
   * Get all keys in pool
   */
  getAllKeys(): Array<{
    keyId: string;
    status: string;
    priority: number;
  }> {
    return Array.from(this.keyPool.values()).map((entry) => ({
      keyId: entry.keyId,
      status: entry.status,
      priority: entry.priority,
    }));
  }

  /**
   * Clear all metrics
   */
  resetMetrics(): void {
    this.keyPool.forEach((entry) => {
      entry.metrics = {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        lastUsed: 0,
        averageResponseTime: 0,
      };
    });
    console.log('[KEY-POOL] Reset all metrics');
  }

  /**
   * Get estimated time until tokens available
   */
  getTimeUntilAvailable(requiredTokens: number = 1): number {
    this.refillAllBuckets();

    const activeKeys = Array.from(this.keyPool.values()).filter(
      (k) => k.status === 'active'
    );

    // If any key has enough tokens now, return 0
    if (activeKeys.some((k) => k.rateLimitBucket.tokens >= requiredTokens)) {
      return 0;
    }

    // Find the key that will have tokens soonest
    const timesToRefill = activeKeys.map((key) => {
      const tokensNeeded = requiredTokens - key.rateLimitBucket.tokens;
      return tokensNeeded / key.rateLimitBucket.refillRate;
    });

    return Math.min(...timesToRefill) * 1000; // Convert to milliseconds
  }
}

// Singleton instance
let keyPoolManager: APIKeyPoolManager | null = null;

export function getKeyPoolManager(): APIKeyPoolManager {
  if (!keyPoolManager) {
    keyPoolManager = new APIKeyPoolManager();
  }
  return keyPoolManager;
}

export function initializeKeyPool(keys: Array<{ keyId: string; apiKey: string; priority?: number }>): void {
  const pool = getKeyPoolManager();
  keys.forEach((key) => {
    pool.addKey(key.keyId, key.apiKey, { priority: key.priority || 1 });
  });
  console.log(`[KEY-POOL] Initialized pool with ${keys.length} keys`);
}
