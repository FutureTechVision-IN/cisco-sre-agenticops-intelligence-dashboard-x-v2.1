/**
 * Enhanced Cisco API Client with Multi-Key Load Balancing
 * 
 * Automatically distributes requests across multiple API keys
 * to achieve higher throughput (e.g., 2 keys = 24 calls/min)
 */

import { getKeyPoolManager } from './api-key-pool-manager';
import { apiOptimizer } from './api-optimizer';
import { DecisionMatrix } from './api-integration-matrix';

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  responseTime?: number;
  usedKey?: string;
}

export class EnhancedCiscoAPIClient {
  private baseURL: string = 'https://api.cisco.com/sre';
  private readonly REQUEST_TIMEOUT = 10000;

  /**
   * Make API call with automatic key selection from pool
   */
  async makeRequest<T>(
    endpoint: string,
    operation: string,
    userId: string = 'system',
    params: Record<string, any> = {}
  ): Promise<APIResponse<T>> {
    const startTime = Date.now();

    try {
      // Check decision matrix
      const decision = DecisionMatrix.getEntry(operation);
      if (!decision) {
        return {
          success: false,
          error: `Unknown operation: ${operation}`,
        };
      }

      // Check cache first
      const cacheKey = apiOptimizer.getCacheKey(endpoint, params);
      const cached = apiOptimizer.getFromCache(cacheKey);

      if (cached) {
        console.log(`[CISCO-API] Cache HIT for ${operation}`);
        return {
          success: true,
          data: cached,
          cached: true,
          responseTime: Date.now() - startTime,
        };
      }

      // Get next available key from pool
      const keyPool = getKeyPoolManager();
      const keyInfo = keyPool.getNextKey(userId, { strategy: 'least-loaded' });

      if (!keyInfo) {
        // No keys available - check when next token will be available
        const waitTime = keyPool.getTimeUntilAvailable();
        return {
          success: false,
          error: `Rate limit exceeded across all API keys. Next token available in ${Math.ceil(waitTime / 1000)}s`,
        };
      }

      // Consume token
      const consumed = keyPool.consumeToken(keyInfo.keyId);
      if (!consumed) {
        return {
          success: false,
          error: 'Failed to acquire token from key pool',
        };
      }

      // Make API call
      console.log(`[CISCO-API] Using key ${keyInfo.keyId.substring(0, 20)}... for ${operation}`);
      const response = await this.callCiscoAPI<T>(endpoint, params, keyInfo.apiKey);

      if (response) {
        const responseTime = Date.now() - startTime;

        // Record success metrics
        keyPool.recordMetrics(keyInfo.keyId, true, responseTime);

        // Cache the result
        apiOptimizer.setCache(cacheKey, response, decision.cacheTTL);

        return {
          success: true,
          data: response,
          cached: false,
          responseTime,
          usedKey: keyInfo.keyId.substring(0, 20) + '...',
        };
      }

      // Record failure
      keyPool.recordMetrics(keyInfo.keyId, false, Date.now() - startTime);

      return {
        success: false,
        error: 'Failed to fetch from Cisco API',
      };
    } catch (error) {
      console.error(`[CISCO-API] Error for ${operation}:`, error);
      return {
        success: false,
        error: `API request failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Call Cisco API with specific key
   */
  private async callCiscoAPI<T>(
    endpoint: string,
    params: Record<string, any>,
    apiKey: string
  ): Promise<T | null> {
    try {
      const url = new URL(`${this.baseURL}${endpoint}`);

      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'SRE-AgenticOps/2.0-MultiKey',
        },
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT),
      });

      if (!response.ok) {
        console.error(`[CISCO-API] HTTP ${response.status}: ${response.statusText}`);
        return null;
      }

      return await response.json() as T;
    } catch (error) {
      console.error('[CISCO-API] Request error:', error);
      return null;
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    return getKeyPoolManager().getPoolStats();
  }
}

// Export singleton
let enhancedClient: EnhancedCiscoAPIClient | null = null;

export function getEnhancedCiscoClient(): EnhancedCiscoAPIClient {
  if (!enhancedClient) {
    enhancedClient = new EnhancedCiscoAPIClient();
  }
  return enhancedClient;
}
