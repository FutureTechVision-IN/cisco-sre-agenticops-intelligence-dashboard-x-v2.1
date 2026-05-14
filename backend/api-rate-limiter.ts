/**
 * Cisco API Rate Limiter Service
 * Enterprise-grade rate limiting with queue management for Cisco CIRCUIT API
 * 
 * Features:
 * - Maximum 12-14 concurrent API calls enforcement
 * - Request queue with priority support
 * - Exponential backoff retry mechanism
 * - Comprehensive logging and monitoring
 * - Circuit breaker pattern for resilience
 * - Per-user and global rate limiting
 */

// ==========================================
// CONFIGURATION
// ==========================================

interface RateLimiterConfig {
  maxConcurrentCalls: number;
  maxRequestsPerMinute: number;
  maxRequestsPerUser: number;
  retryAttempts: number;
  initialRetryDelay: number;
  maxRetryDelay: number;
  requestTimeout: number;
  queueTimeout: number;
  circuitBreakerThreshold: number;
  circuitBreakerResetTime: number;
}

const DEFAULT_CONFIG: RateLimiterConfig = {
  maxConcurrentCalls: 12, // Primary limit: 12-14 concurrent calls
  maxRequestsPerMinute: 60,
  maxRequestsPerUser: 10, // Per user per minute
  retryAttempts: 3,
  initialRetryDelay: 1000, // 1 second
  maxRetryDelay: 30000, // 30 seconds
  requestTimeout: 30000, // 30 seconds
  queueTimeout: 60000, // 1 minute queue wait
  circuitBreakerThreshold: 5, // Open circuit after 5 consecutive failures
  circuitBreakerResetTime: 60000 // Reset after 1 minute
};

// ==========================================
// TYPES
// ==========================================

interface QueuedRequest {
  id: string;
  userId: string;
  priority: 'high' | 'normal' | 'low';
  requestFn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  createdAt: Date;
  retryCount: number;
  metadata?: Record<string, any>;
}

interface APICallLog {
  id: string;
  userId: string;
  endpoint: string;
  method: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'pending' | 'success' | 'failed' | 'rate_limited' | 'timeout' | 'circuit_open';
  errorMessage?: string;
  retryCount: number;
  queueWaitTime?: number;
}

interface RateLimitStatus {
  currentConcurrent: number;
  maxConcurrent: number;
  queueLength: number;
  requestsThisMinute: number;
  maxPerMinute: number;
  circuitState: 'closed' | 'open' | 'half-open';
  rateLimitedUsers: string[];
  isAcceptingRequests: boolean;
  estimatedWaitTime: number;
}

interface UserRateLimit {
  userId: string;
  requestCount: number;
  windowStart: Date;
  isBlocked: boolean;
  blockExpiresAt?: Date;
}

// ==========================================
// RATE LIMITER CLASS
// ==========================================

export class CiscoAPIRateLimiter {
  private config: RateLimiterConfig;
  private activeRequests: Map<string, APICallLog> = new Map();
  private requestQueue: QueuedRequest[] = [];
  private callHistory: APICallLog[] = [];
  private userLimits: Map<string, UserRateLimit> = new Map();
  private consecutiveFailures: number = 0;
  private circuitState: 'closed' | 'open' | 'half-open' = 'closed';
  private circuitOpenedAt?: Date;
  private isProcessingQueue: boolean = false;
  private minuteWindowStart: Date = new Date();
  private requestsThisMinute: number = 0;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupInterval();
    this.startQueueProcessor();
    console.log(`[RateLimiter] Initialized with max ${this.config.maxConcurrentCalls} concurrent calls`);
  }

  // ==========================================
  // PUBLIC API
  // ==========================================

  /**
   * Execute an API call with rate limiting and retry logic
   */
  async executeWithRateLimit<T>(
    requestFn: () => Promise<T>,
    options: {
      userId: string;
      endpoint?: string;
      priority?: 'high' | 'normal' | 'low';
      metadata?: Record<string, any>;
    }
  ): Promise<T> {
    const { userId, endpoint = 'unknown', priority = 'normal', metadata } = options;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check circuit breaker
    if (this.circuitState === 'open') {
      if (this.shouldResetCircuit()) {
        this.circuitState = 'half-open';
        console.log('[RateLimiter] Circuit breaker entering half-open state');
      } else {
        const error = new RateLimitError(
          'Circuit breaker is open due to repeated failures. Please try again later.',
          'CIRCUIT_OPEN',
          this.getEstimatedWaitTime()
        );
        this.logAPICall(requestId, userId, endpoint, 'POST', 'circuit_open', error.message);
        throw error;
      }
    }

    // Check user rate limit
    if (!this.checkUserRateLimit(userId)) {
      const userLimit = this.userLimits.get(userId);
      const waitTime = userLimit?.blockExpiresAt 
        ? userLimit.blockExpiresAt.getTime() - Date.now() 
        : 60000;
      
      const error = new RateLimitError(
        `You've exceeded the rate limit. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
        'USER_RATE_LIMIT',
        waitTime
      );
      this.logAPICall(requestId, userId, endpoint, 'POST', 'rate_limited', error.message);
      throw error;
    }

    // Check global rate limit
    if (!this.checkGlobalRateLimit()) {
      const waitTime = 60000 - (Date.now() - this.minuteWindowStart.getTime());
      const error = new RateLimitError(
        'Global rate limit reached. Please try again in a moment.',
        'GLOBAL_RATE_LIMIT',
        waitTime
      );
      this.logAPICall(requestId, userId, endpoint, 'POST', 'rate_limited', error.message);
      throw error;
    }

    // Check if we can execute immediately or need to queue
    if (this.activeRequests.size < this.config.maxConcurrentCalls) {
      return this.executeRequest(requestId, userId, endpoint, requestFn, metadata);
    }

    // Queue the request
    return this.queueRequest(requestId, userId, priority, requestFn, metadata);
  }

  /**
   * Get current rate limit status
   */
  getStatus(): RateLimitStatus {
    const rateLimitedUsers = Array.from(this.userLimits.entries())
      .filter(([_, limit]) => limit.isBlocked)
      .map(([userId]) => userId);

    return {
      currentConcurrent: this.activeRequests.size,
      maxConcurrent: this.config.maxConcurrentCalls,
      queueLength: this.requestQueue.length,
      requestsThisMinute: this.requestsThisMinute,
      maxPerMinute: this.config.maxRequestsPerMinute,
      circuitState: this.circuitState,
      rateLimitedUsers,
      isAcceptingRequests: this.circuitState !== 'open' && 
        this.requestsThisMinute < this.config.maxRequestsPerMinute,
      estimatedWaitTime: this.getEstimatedWaitTime()
    };
  }

  /**
   * Get API call history for monitoring
   */
  getCallHistory(options?: { 
    userId?: string; 
    status?: APICallLog['status']; 
    limit?: number 
  }): APICallLog[] {
    let history = [...this.callHistory];

    if (options?.userId) {
      history = history.filter(log => log.userId === options.userId);
    }

    if (options?.status) {
      history = history.filter(log => log.status === options.status);
    }

    return history.slice(-(options?.limit || 100));
  }

  /**
   * Get performance metrics
   */
  getMetrics(): {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    averageQueueWaitTime: number;
    p95ResponseTime: number;
    errorsByType: Record<string, number>;
  } {
    const completed = this.callHistory.filter(log => log.status !== 'pending');
    const successful = completed.filter(log => log.status === 'success');
    const durations = successful.map(log => log.duration || 0).filter(d => d > 0);
    const queueWaits = completed.map(log => log.queueWaitTime || 0).filter(w => w > 0);

    const errorsByType: Record<string, number> = {};
    completed.filter(log => log.status !== 'success').forEach(log => {
      errorsByType[log.status] = (errorsByType[log.status] || 0) + 1;
    });

    return {
      totalRequests: completed.length,
      successRate: completed.length > 0 ? (successful.length / completed.length) * 100 : 100,
      averageResponseTime: durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : 0,
      averageQueueWaitTime: queueWaits.length > 0
        ? queueWaits.reduce((a, b) => a + b, 0) / queueWaits.length
        : 0,
      p95ResponseTime: this.calculatePercentile(durations, 95),
      errorsByType
    };
  }

  /**
   * Reset rate limits for a specific user
   */
  resetUserLimit(userId: string): void {
    this.userLimits.delete(userId);
    console.log(`[RateLimiter] Reset rate limit for user: ${userId}`);
  }

  /**
   * Force reset the circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitState = 'closed';
    this.consecutiveFailures = 0;
    this.circuitOpenedAt = undefined;
    console.log('[RateLimiter] Circuit breaker manually reset');
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  private async executeRequest<T>(
    requestId: string,
    userId: string,
    endpoint: string,
    requestFn: () => Promise<T>,
    metadata?: Record<string, any>,
    retryCount: number = 0,
    queueWaitTime: number = 0
  ): Promise<T> {
    const startTime = new Date();
    
    // Log request start
    const log: APICallLog = {
      id: requestId,
      userId,
      endpoint,
      method: 'POST',
      startTime,
      status: 'pending',
      retryCount,
      queueWaitTime
    };
    this.activeRequests.set(requestId, log);
    this.callHistory.push(log);
    this.incrementUserCount(userId);
    this.requestsThisMinute++;

    try {
      // Execute with timeout
      const result = await this.withTimeout(requestFn(), this.config.requestTimeout);
      
      // Success
      const endTime = new Date();
      log.endTime = endTime;
      log.duration = endTime.getTime() - startTime.getTime();
      log.status = 'success';
      
      // Reset circuit breaker on success
      if (this.circuitState === 'half-open') {
        this.circuitState = 'closed';
        this.consecutiveFailures = 0;
        console.log('[RateLimiter] Circuit breaker closed after successful request');
      }
      this.consecutiveFailures = 0;

      return result;

    } catch (error: any) {
      const endTime = new Date();
      log.endTime = endTime;
      log.duration = endTime.getTime() - startTime.getTime();
      log.errorMessage = error.message;

      // Handle different error types
      if (error.name === 'TimeoutError') {
        log.status = 'timeout';
      } else if (error.code === 'RATE_LIMIT' || error.status === 429) {
        log.status = 'rate_limited';
      } else {
        log.status = 'failed';
      }

      // Update circuit breaker
      this.handleFailure();

      // Retry logic
      if (retryCount < this.config.retryAttempts && this.shouldRetry(error)) {
        const delay = this.calculateRetryDelay(retryCount);
        console.log(`[RateLimiter] Retrying request ${requestId} in ${delay}ms (attempt ${retryCount + 1})`);
        
        await this.delay(delay);
        return this.executeRequest(
          requestId,
          userId,
          endpoint,
          requestFn,
          metadata,
          retryCount + 1,
          queueWaitTime
        );
      }

      throw error;

    } finally {
      this.activeRequests.delete(requestId);
      this.processQueue();
    }
  }

  private queueRequest<T>(
    requestId: string,
    userId: string,
    priority: 'high' | 'normal' | 'low',
    requestFn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: requestId,
        userId,
        priority,
        requestFn,
        resolve,
        reject,
        createdAt: new Date(),
        retryCount: 0,
        metadata
      };

      // Insert based on priority
      const insertIndex = this.findInsertIndex(priority);
      this.requestQueue.splice(insertIndex, 0, queuedRequest);

      console.log(`[RateLimiter] Request ${requestId} queued (position: ${insertIndex + 1}, queue size: ${this.requestQueue.length})`);

      // Set queue timeout
      setTimeout(() => {
        const index = this.requestQueue.findIndex(r => r.id === requestId);
        if (index !== -1) {
          this.requestQueue.splice(index, 1);
          reject(new RateLimitError(
            'Request timed out while waiting in queue',
            'QUEUE_TIMEOUT',
            0
          ));
        }
      }, this.config.queueTimeout);
    });
  }

  private findInsertIndex(priority: 'high' | 'normal' | 'low'): number {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const targetPriority = priorityOrder[priority];
    
    for (let i = 0; i < this.requestQueue.length; i++) {
      const itemPriority = priorityOrder[this.requestQueue[i].priority];
      if (itemPriority > targetPriority) {
        return i;
      }
    }
    return this.requestQueue.length;
  }

  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    }, 100);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (
        this.requestQueue.length > 0 &&
        this.activeRequests.size < this.config.maxConcurrentCalls &&
        this.circuitState !== 'open'
      ) {
        const request = this.requestQueue.shift();
        if (!request) break;

        const queueWaitTime = Date.now() - request.createdAt.getTime();

        // Execute the queued request
        this.executeRequest(
          request.id,
          request.userId,
          'queued',
          request.requestFn,
          request.metadata,
          request.retryCount,
          queueWaitTime
        )
          .then(request.resolve)
          .catch(request.reject);
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private checkUserRateLimit(userId: string): boolean {
    let userLimit = this.userLimits.get(userId);
    const now = new Date();

    if (!userLimit) {
      userLimit = {
        userId,
        requestCount: 0,
        windowStart: now,
        isBlocked: false
      };
      this.userLimits.set(userId, userLimit);
    }

    // Check if blocked
    if (userLimit.isBlocked) {
      if (userLimit.blockExpiresAt && now >= userLimit.blockExpiresAt) {
        userLimit.isBlocked = false;
        userLimit.requestCount = 0;
        userLimit.windowStart = now;
      } else {
        return false;
      }
    }

    // Check if window expired
    const windowDuration = now.getTime() - userLimit.windowStart.getTime();
    if (windowDuration >= 60000) {
      userLimit.requestCount = 0;
      userLimit.windowStart = now;
    }

    // Check if limit exceeded
    if (userLimit.requestCount >= this.config.maxRequestsPerUser) {
      userLimit.isBlocked = true;
      userLimit.blockExpiresAt = new Date(now.getTime() + 60000);
      console.log(`[RateLimiter] User ${userId} rate limited for 60 seconds`);
      return false;
    }

    return true;
  }

  private incrementUserCount(userId: string): void {
    const userLimit = this.userLimits.get(userId);
    if (userLimit) {
      userLimit.requestCount++;
    }
  }

  private checkGlobalRateLimit(): boolean {
    const now = new Date();
    const windowDuration = now.getTime() - this.minuteWindowStart.getTime();

    if (windowDuration >= 60000) {
      this.minuteWindowStart = now;
      this.requestsThisMinute = 0;
    }

    return this.requestsThisMinute < this.config.maxRequestsPerMinute;
  }

  private handleFailure(): void {
    this.consecutiveFailures++;

    if (this.consecutiveFailures >= this.config.circuitBreakerThreshold) {
      if (this.circuitState !== 'open') {
        this.circuitState = 'open';
        this.circuitOpenedAt = new Date();
        console.log(`[RateLimiter] Circuit breaker OPENED after ${this.consecutiveFailures} consecutive failures`);
      }
    }
  }

  /**
   * Log an API call for tracking and debugging
   */
  private logAPICall(
    requestId: string,
    userId: string,
    endpoint: string,
    method: string,
    status: 'pending' | 'success' | 'failed' | 'rate_limited' | 'timeout' | 'circuit_open',
    errorMessage?: string
  ): void {
    const log: APICallLog = {
      id: requestId,
      userId,
      endpoint,
      method,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      status,
      errorMessage
    };
    this.callHistory.push(log);
    
    // Keep only last 1000 entries
    if (this.callHistory.length > 1000) {
      this.callHistory = this.callHistory.slice(-1000);
    }
    
    console.log(`[RateLimiter] API Call logged: ${requestId} - ${status}${errorMessage ? ` (${errorMessage})` : ''}`);
  }

  private shouldResetCircuit(): boolean {
    if (!this.circuitOpenedAt) return false;
    
    const elapsed = Date.now() - this.circuitOpenedAt.getTime();
    return elapsed >= this.config.circuitBreakerResetTime;
  }

  private shouldRetry(error: any): boolean {
    // Don't retry rate limit errors
    if (error.code === 'RATE_LIMIT' || error.status === 429) {
      return false;
    }
    
    // Don't retry client errors (4xx except 429)
    if (error.status >= 400 && error.status < 500 && error.status !== 429) {
      return false;
    }

    // Retry network errors and server errors
    return true;
  }

  private calculateRetryDelay(retryCount: number): number {
    const delay = this.config.initialRetryDelay * Math.pow(2, retryCount);
    // Add jitter (±20%)
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);
    return Math.min(delay + jitter, this.config.maxRetryDelay);
  }

  private getEstimatedWaitTime(): number {
    if (this.circuitState === 'open' && this.circuitOpenedAt) {
      const remaining = this.config.circuitBreakerResetTime - 
        (Date.now() - this.circuitOpenedAt.getTime());
      return Math.max(0, remaining);
    }

    if (this.requestQueue.length === 0 && this.activeRequests.size < this.config.maxConcurrentCalls) {
      return 0;
    }

    // Estimate based on average response time and queue position
    const metrics = this.getMetrics();
    const avgResponseTime = metrics.averageResponseTime || 1000;
    const queuePosition = this.requestQueue.length;
    const slotsAvailable = this.config.maxConcurrentCalls - this.activeRequests.size;

    if (slotsAvailable > 0) {
      return 0;
    }

    return Math.ceil((queuePosition / this.config.maxConcurrentCalls) * avgResponseTime);
  }

  private withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const error = new Error('Request timed out');
        error.name = 'TimeoutError';
        reject(error);
      }, timeout);

      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private startCleanupInterval(): void {
    // Clean up old history entries every 5 minutes
    setInterval(() => {
      const cutoff = Date.now() - 3600000; // Keep 1 hour of history
      this.callHistory = this.callHistory.filter(
        log => log.startTime.getTime() > cutoff
      );
    }, 300000);
  }
}

// ==========================================
// CUSTOM ERROR CLASS
// ==========================================

export class RateLimitError extends Error {
  code: string;
  retryAfter: number;

  constructor(message: string, code: string, retryAfter: number) {
    super(message);
    this.name = 'RateLimitError';
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

// ==========================================
// SINGLETON INSTANCE
// ==========================================

export const rateLimiter = new CiscoAPIRateLimiter({
  maxConcurrentCalls: 12, // Enforce 12-14 concurrent calls limit
  maxRequestsPerMinute: 60,
  maxRequestsPerUser: 15,
  retryAttempts: 3,
  initialRetryDelay: 1000,
  maxRetryDelay: 30000,
  requestTimeout: 30000,
  queueTimeout: 60000,
  circuitBreakerThreshold: 5,
  circuitBreakerResetTime: 60000
});

// ==========================================
// HELPER FUNCTIONS FOR ROUTES
// ==========================================

export function getRateLimitMiddleware() {
  return async (req: any, res: any, next: any) => {
    const userId = req.session?.userId || req.ip || 'anonymous';
    const status = rateLimiter.getStatus();

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': status.maxConcurrent.toString(),
      'X-RateLimit-Remaining': Math.max(0, status.maxConcurrent - status.currentConcurrent).toString(),
      'X-RateLimit-Reset': Math.ceil((60000 - (Date.now() % 60000)) / 1000).toString(),
      'X-RateLimit-Queue': status.queueLength.toString()
    });

    // Check if we should reject the request
    if (status.circuitState === 'open') {
      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable',
        message: 'The API is currently experiencing issues. Please try again later.',
        retryAfter: Math.ceil(status.estimatedWaitTime / 1000)
      });
    }

    next();
  };
}

export function formatRateLimitError(error: RateLimitError) {
  return {
    success: false,
    error: 'Rate limit exceeded',
    message: error.message,
    code: error.code,
    retryAfter: Math.ceil(error.retryAfter / 1000)
  };
}

console.log('[RateLimiter] Service initialized with 12-14 concurrent call limit');
