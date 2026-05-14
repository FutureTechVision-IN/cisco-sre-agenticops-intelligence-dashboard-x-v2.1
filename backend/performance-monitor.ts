/**
 * Performance Monitoring Service
 * Tracks response times, cache hits, and API performance metrics
 * Target: ≤500ms response times for all endpoints
 */

interface PerformanceMetric {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: number;
  cacheHit: boolean;
  dataSize: number;
}

interface EndpointStats {
  endpoint: string;
  method: string;
  requestCount: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  cacheHitRate: number;
  avgDataSize: number;
  errorRate: number;
  successCount: number;
  errorCount: number;
}

interface PerformanceReport {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  summary: {
    totalRequests: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    overallCacheHitRate: number;
    errorRate: number;
    slowRequestCount: number;  // Requests > 500ms
    slowEndpoints: string[];   // Endpoints averaging > 500ms
  };
  endpoints: EndpointStats[];
  alerts: PerformanceAlert[];
}

interface PerformanceAlert {
  type: 'slow_response' | 'high_error_rate' | 'low_cache_hit' | 'memory_high';
  severity: 'warning' | 'critical';
  message: string;
  endpoint?: string;
  value: number;
  threshold: number;
  timestamp: string;
}

// Performance thresholds
const THRESHOLDS = {
  RESPONSE_TIME_WARNING: 300,    // ms
  RESPONSE_TIME_CRITICAL: 500,   // ms
  ERROR_RATE_WARNING: 5,         // %
  ERROR_RATE_CRITICAL: 10,       // %
  CACHE_HIT_WARNING: 70,         // %
  CACHE_HIT_CRITICAL: 50,        // %
  MEMORY_WARNING: 80,            // % of heap
  MEMORY_CRITICAL: 90,           // % of heap
};

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetricsSize: number = 10000;  // Keep last 10k metrics
  private alerts: PerformanceAlert[] = [];
  private maxAlertsSize: number = 100;
  private startTime: number = Date.now();

  /**
   * Record a performance metric for an API request
   */
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now(),
    };
    
    this.metrics.push(fullMetric);
    
    // Trim old metrics to prevent memory bloat
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize);
    }
    
    // Check for performance alerts
    this.checkAlerts(fullMetric);
  }

  /**
   * Check if the metric triggers any alerts
   */
  private checkAlerts(metric: PerformanceMetric): void {
    // Slow response alert
    if (metric.responseTime > THRESHOLDS.RESPONSE_TIME_CRITICAL) {
      this.addAlert({
        type: 'slow_response',
        severity: 'critical',
        message: `Slow response detected: ${metric.endpoint} took ${metric.responseTime}ms`,
        endpoint: metric.endpoint,
        value: metric.responseTime,
        threshold: THRESHOLDS.RESPONSE_TIME_CRITICAL,
        timestamp: new Date().toISOString(),
      });
    } else if (metric.responseTime > THRESHOLDS.RESPONSE_TIME_WARNING) {
      this.addAlert({
        type: 'slow_response',
        severity: 'warning',
        message: `Response time warning: ${metric.endpoint} took ${metric.responseTime}ms`,
        endpoint: metric.endpoint,
        value: metric.responseTime,
        threshold: THRESHOLDS.RESPONSE_TIME_WARNING,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Add an alert with deduplication
   */
  private addAlert(alert: PerformanceAlert): void {
    // Deduplicate: don't add same alert type for same endpoint within 1 minute
    const recentCutoff = Date.now() - 60000;
    const isDuplicate = this.alerts.some(
      a => a.type === alert.type && 
           a.endpoint === alert.endpoint && 
           new Date(a.timestamp).getTime() > recentCutoff
    );
    
    if (!isDuplicate) {
      this.alerts.push(alert);
      
      // Trim old alerts
      if (this.alerts.length > this.maxAlertsSize) {
        this.alerts = this.alerts.slice(-this.maxAlertsSize);
      }
      
      // Log critical alerts
      if (alert.severity === 'critical') {
        console.error(`[PERF-ALERT] ${alert.message}`);
      }
    }
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sortedArr: number[], p: number): number {
    if (sortedArr.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArr.length) - 1;
    return sortedArr[Math.max(0, index)];
  }

  /**
   * Get statistics for a specific endpoint
   */
  getEndpointStats(endpoint: string, periodMs: number = 3600000): EndpointStats | null {
    const cutoff = Date.now() - periodMs;
    const metrics = this.metrics.filter(
      m => m.endpoint === endpoint && m.timestamp > cutoff
    );
    
    if (metrics.length === 0) return null;
    
    const responseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);
    const successCount = metrics.filter(m => m.statusCode < 400).length;
    const cacheHits = metrics.filter(m => m.cacheHit).length;
    
    return {
      endpoint,
      method: metrics[0].method,
      requestCount: metrics.length,
      avgResponseTime: Math.round(responseTimes.reduce((a, b) => a + b, 0) / metrics.length),
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p50ResponseTime: this.percentile(responseTimes, 50),
      p95ResponseTime: this.percentile(responseTimes, 95),
      p99ResponseTime: this.percentile(responseTimes, 99),
      cacheHitRate: Math.round((cacheHits / metrics.length) * 100),
      avgDataSize: Math.round(metrics.reduce((a, m) => a + m.dataSize, 0) / metrics.length),
      errorRate: Math.round(((metrics.length - successCount) / metrics.length) * 100),
      successCount,
      errorCount: metrics.length - successCount,
    };
  }

  /**
   * Get all endpoint statistics
   */
  getAllEndpointStats(periodMs: number = 3600000): EndpointStats[] {
    const cutoff = Date.now() - periodMs;
    const relevantMetrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    // Group by endpoint
    const endpointGroups = new Map<string, PerformanceMetric[]>();
    for (const metric of relevantMetrics) {
      const group = endpointGroups.get(metric.endpoint) || [];
      group.push(metric);
      endpointGroups.set(metric.endpoint, group);
    }
    
    // Calculate stats for each endpoint
    const stats: EndpointStats[] = [];
    const entries = Array.from(endpointGroups.entries());
    for (const [endpoint, metrics] of entries) {
      const stat = this.getEndpointStats(endpoint, periodMs);
      if (stat) stats.push(stat);
    }
    
    return stats.sort((a, b) => b.requestCount - a.requestCount);
  }

  /**
   * Generate a comprehensive performance report
   */
  generateReport(periodMs: number = 3600000): PerformanceReport {
    const now = Date.now();
    const cutoff = now - periodMs;
    const relevantMetrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    if (relevantMetrics.length === 0) {
      return {
        generatedAt: new Date().toISOString(),
        periodStart: new Date(cutoff).toISOString(),
        periodEnd: new Date(now).toISOString(),
        summary: {
          totalRequests: 0,
          avgResponseTime: 0,
          p95ResponseTime: 0,
          overallCacheHitRate: 0,
          errorRate: 0,
          slowRequestCount: 0,
          slowEndpoints: [],
        },
        endpoints: [],
        alerts: this.getRecentAlerts(periodMs),
      };
    }
    
    // Calculate summary
    const responseTimes = relevantMetrics.map(m => m.responseTime).sort((a, b) => a - b);
    const cacheHits = relevantMetrics.filter(m => m.cacheHit).length;
    const errors = relevantMetrics.filter(m => m.statusCode >= 400).length;
    const slowRequests = relevantMetrics.filter(m => m.responseTime > THRESHOLDS.RESPONSE_TIME_CRITICAL);
    
    // Find slow endpoints (avg > 500ms)
    const endpointStats = this.getAllEndpointStats(periodMs);
    const slowEndpoints = endpointStats
      .filter(e => e.avgResponseTime > THRESHOLDS.RESPONSE_TIME_CRITICAL)
      .map(e => e.endpoint);
    
    return {
      generatedAt: new Date().toISOString(),
      periodStart: new Date(cutoff).toISOString(),
      periodEnd: new Date(now).toISOString(),
      summary: {
        totalRequests: relevantMetrics.length,
        avgResponseTime: Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length),
        p95ResponseTime: this.percentile(responseTimes, 95),
        overallCacheHitRate: Math.round((cacheHits / relevantMetrics.length) * 100),
        errorRate: Math.round((errors / relevantMetrics.length) * 100),
        slowRequestCount: slowRequests.length,
        slowEndpoints,
      },
      endpoints: endpointStats,
      alerts: this.getRecentAlerts(periodMs),
    };
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(periodMs: number = 3600000): PerformanceAlert[] {
    const cutoff = Date.now() - periodMs;
    return this.alerts.filter(a => new Date(a.timestamp).getTime() > cutoff);
  }

  /**
   * Get memory usage stats
   */
  getMemoryStats(): {
    heapUsed: number;
    heapTotal: number;
    heapUsedPercent: number;
    rss: number;
    external: number;
  } {
    const mem = process.memoryUsage();
    return {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),      // MB
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),    // MB
      heapUsedPercent: Math.round((mem.heapUsed / mem.heapTotal) * 100),
      rss: Math.round(mem.rss / 1024 / 1024),                // MB
      external: Math.round(mem.external / 1024 / 1024),      // MB
    };
  }

  /**
   * Get uptime stats
   */
  getUptimeStats(): {
    uptimeMs: number;
    uptimeHours: number;
    startTime: string;
    metricsCollected: number;
  } {
    const uptimeMs = Date.now() - this.startTime;
    return {
      uptimeMs,
      uptimeHours: Math.round(uptimeMs / 3600000 * 100) / 100,
      startTime: new Date(this.startTime).toISOString(),
      metricsCollected: this.metrics.length,
    };
  }

  /**
   * Check system health and return overall status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: {
      name: string;
      status: 'pass' | 'warn' | 'fail';
      message: string;
    }[];
  } {
    const checks: { name: string; status: 'pass' | 'warn' | 'fail'; message: string }[] = [];
    
    // Check response times
    const report = this.generateReport(300000); // Last 5 minutes
    if (report.summary.avgResponseTime > THRESHOLDS.RESPONSE_TIME_CRITICAL) {
      checks.push({
        name: 'response_time',
        status: 'fail',
        message: `Avg response time ${report.summary.avgResponseTime}ms exceeds ${THRESHOLDS.RESPONSE_TIME_CRITICAL}ms`,
      });
    } else if (report.summary.avgResponseTime > THRESHOLDS.RESPONSE_TIME_WARNING) {
      checks.push({
        name: 'response_time',
        status: 'warn',
        message: `Avg response time ${report.summary.avgResponseTime}ms exceeds ${THRESHOLDS.RESPONSE_TIME_WARNING}ms`,
      });
    } else {
      checks.push({
        name: 'response_time',
        status: 'pass',
        message: `Avg response time ${report.summary.avgResponseTime}ms is within threshold`,
      });
    }
    
    // Check error rate
    if (report.summary.errorRate > THRESHOLDS.ERROR_RATE_CRITICAL) {
      checks.push({
        name: 'error_rate',
        status: 'fail',
        message: `Error rate ${report.summary.errorRate}% exceeds ${THRESHOLDS.ERROR_RATE_CRITICAL}%`,
      });
    } else if (report.summary.errorRate > THRESHOLDS.ERROR_RATE_WARNING) {
      checks.push({
        name: 'error_rate',
        status: 'warn',
        message: `Error rate ${report.summary.errorRate}% exceeds ${THRESHOLDS.ERROR_RATE_WARNING}%`,
      });
    } else {
      checks.push({
        name: 'error_rate',
        status: 'pass',
        message: `Error rate ${report.summary.errorRate}% is within threshold`,
      });
    }
    
    // Check cache hit rate
    if (report.summary.overallCacheHitRate < THRESHOLDS.CACHE_HIT_CRITICAL && report.summary.totalRequests > 10) {
      checks.push({
        name: 'cache_hit_rate',
        status: 'fail',
        message: `Cache hit rate ${report.summary.overallCacheHitRate}% below ${THRESHOLDS.CACHE_HIT_CRITICAL}%`,
      });
    } else if (report.summary.overallCacheHitRate < THRESHOLDS.CACHE_HIT_WARNING && report.summary.totalRequests > 10) {
      checks.push({
        name: 'cache_hit_rate',
        status: 'warn',
        message: `Cache hit rate ${report.summary.overallCacheHitRate}% below ${THRESHOLDS.CACHE_HIT_WARNING}%`,
      });
    } else {
      checks.push({
        name: 'cache_hit_rate',
        status: 'pass',
        message: `Cache hit rate ${report.summary.overallCacheHitRate}% is healthy`,
      });
    }
    
    // Check memory usage
    const mem = this.getMemoryStats();
    if (mem.heapUsedPercent > THRESHOLDS.MEMORY_CRITICAL) {
      checks.push({
        name: 'memory_usage',
        status: 'fail',
        message: `Heap usage ${mem.heapUsedPercent}% exceeds ${THRESHOLDS.MEMORY_CRITICAL}%`,
      });
    } else if (mem.heapUsedPercent > THRESHOLDS.MEMORY_WARNING) {
      checks.push({
        name: 'memory_usage',
        status: 'warn',
        message: `Heap usage ${mem.heapUsedPercent}% exceeds ${THRESHOLDS.MEMORY_WARNING}%`,
      });
    } else {
      checks.push({
        name: 'memory_usage',
        status: 'pass',
        message: `Heap usage ${mem.heapUsedPercent}% is healthy`,
      });
    }
    
    // Determine overall status
    const hasFails = checks.some(c => c.status === 'fail');
    const hasWarns = checks.some(c => c.status === 'warn');
    
    return {
      status: hasFails ? 'unhealthy' : hasWarns ? 'degraded' : 'healthy',
      checks,
    };
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.metrics = [];
    this.alerts = [];
    this.startTime = Date.now();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Express middleware for automatic performance monitoring
 */
export function performanceMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    
    // Track if this is a cache hit (set by route handlers)
    req.performanceContext = {
      cacheHit: false,
      dataSize: 0,
    };
    
    // Override json to capture data size
    res.json = function(data: any) {
      const stringified = JSON.stringify(data);
      req.performanceContext.dataSize = stringified.length;
      return originalJson(data);
    };
    
    // Override send to capture data size
    res.send = function(data: any) {
      if (typeof data === 'string') {
        req.performanceContext.dataSize = data.length;
      } else if (Buffer.isBuffer(data)) {
        req.performanceContext.dataSize = data.length;
      }
      return originalSend(data);
    };
    
    // Record metric on response finish
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      
      // Only track API endpoints
      if (req.path.startsWith('/api/')) {
        performanceMonitor.recordMetric({
          endpoint: req.path,
          method: req.method,
          responseTime,
          statusCode: res.statusCode,
          cacheHit: req.performanceContext.cacheHit,
          dataSize: req.performanceContext.dataSize,
        });
      }
    });
    
    next();
  };
}

/**
 * Helper to mark a request as a cache hit
 */
export function markCacheHit(req: any): void {
  if (req.performanceContext) {
    req.performanceContext.cacheHit = true;
  }
}

export { THRESHOLDS };
