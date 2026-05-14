/**
 * API Integration Decision Matrix
 * Determines optimal approach (API, Cache, or Built-in) for each operation
 * Ensures compliance with 10-12 API calls/min rate limit and <500ms response SLA
 */

interface MatrixEntry {
  operation: string;
  apiEndpoint?: string;
  recommendedApproach: "api" | "cache" | "builtin" | "hybrid";
  priority: "high" | "medium" | "low";
  cacheTTL: number; // seconds, 0 = no cache
  rateLimitCost: number; // tokens consumed
  estimatedResponseTime: number; // ms
  fallback: string;
  conditions: {
    minDataSize?: number;
    maxDataSize?: number;
    frequency?: "high" | "medium" | "low";
  };
  description: string;
}

/**
 * Decision Matrix for all API operations
 */
export const API_DECISION_MATRIX: MatrixEntry[] = [
  // KPI and Metrics
  {
    operation: "get-kpi-metrics",
    apiEndpoint: "cisco-api/kpi-metrics",
    recommendedApproach: "hybrid",
    priority: "high",
    cacheTTL: 300, // 5 min cache
    rateLimitCost: 1,
    estimatedResponseTime: 200,
    fallback: "local_ml_engine",
    conditions: {
      frequency: "high",
    },
    description: "Fetch KPI metrics - cache first, API fallback",
  },

  {
    operation: "get-vulnerability-forecast",
    apiEndpoint: "cisco-api/forecasting",
    recommendedApproach: "cache",
    priority: "high",
    cacheTTL: 600, // 10 min cache
    rateLimitCost: 1,
    estimatedResponseTime: 150,
    fallback: "arima_builtin",
    conditions: {
      frequency: "medium",
    },
    description: "Vulnerability forecast - use built-in ARIMA as primary",
  },

  {
    operation: "get-anomaly-detection",
    apiEndpoint: "cisco-api/anomaly",
    recommendedApproach: "builtin",
    priority: "high",
    cacheTTL: 900, // 15 min cache
    rateLimitCost: 0,
    estimatedResponseTime: 100,
    fallback: "statistical_analysis",
    conditions: {
      frequency: "high",
    },
    description: "Anomaly detection - use built-in ML",
  },

  {
    operation: "get-field-notice-insights",
    apiEndpoint: "cisco-api/fnm/insights",
    recommendedApproach: "hybrid",
    priority: "medium",
    cacheTTL: 1800, // 30 min cache
    rateLimitCost: 2,
    estimatedResponseTime: 300,
    fallback: "local_nlp_engine",
    conditions: {
      frequency: "low",
      maxDataSize: 5000,
    },
    description: "Field notice insights - batch process with cache",
  },

  // Risk and Health Scoring
  {
    operation: "get-health-score",
    apiEndpoint: "cisco-api/health-score",
    recommendedApproach: "cache",
    priority: "high",
    cacheTTL: 600,
    rateLimitCost: 0,
    estimatedResponseTime: 50,
    fallback: "internal_calculation",
    conditions: {
      frequency: "high",
    },
    description: "Health score - calculated internally with caching",
  },

  {
    operation: "get-risk-assessment",
    apiEndpoint: "cisco-api/risk",
    recommendedApproach: "builtin",
    priority: "high",
    cacheTTL: 1200, // 20 min
    rateLimitCost: 0,
    estimatedResponseTime: 80,
    fallback: "scoring_algorithm",
    conditions: {
      frequency: "medium",
    },
    description: "Risk assessment - use built-in scoring",
  },

  // Reporting
  {
    operation: "generate-pdf-report",
    recommendedApproach: "builtin",
    priority: "medium",
    cacheTTL: 3600, // 1 hour
    rateLimitCost: 0,
    estimatedResponseTime: 400,
    fallback: "local_generation",
    conditions: {
      frequency: "low",
    },
    description: "PDF report generation - no API needed",
  },

  {
    operation: "export-csv",
    recommendedApproach: "builtin",
    priority: "medium",
    cacheTTL: 3600,
    rateLimitCost: 0,
    estimatedResponseTime: 250,
    fallback: "local_export",
    conditions: {
      frequency: "low",
    },
    description: "CSV export - process locally",
  },

  // Concurrent Access Optimization
  {
    operation: "get-dashboard-summary",
    recommendedApproach: "cache",
    priority: "high",
    cacheTTL: 300,
    rateLimitCost: 0,
    estimatedResponseTime: 50,
    fallback: "aggregated_local_data",
    conditions: {
      frequency: "high",
    },
    description: "Dashboard summary - aggressive caching for concurrent users",
  },

  {
    operation: "search-records",
    recommendedApproach: "builtin",
    priority: "medium",
    cacheTTL: 120,
    rateLimitCost: 0,
    estimatedResponseTime: 100,
    fallback: "database_search",
    conditions: {
      frequency: "high",
      maxDataSize: 10000,
    },
    description: "Record search - database queries with light caching",
  },

  // Alert and Monitoring
  {
    operation: "detect-alert-triggers",
    recommendedApproach: "builtin",
    priority: "high",
    cacheTTL: 60,
    rateLimitCost: 0,
    estimatedResponseTime: 75,
    fallback: "threshold_check",
    conditions: {
      frequency: "high",
    },
    description: "Alert detection - real-time thresholds",
  },

  {
    operation: "validate-data-quality",
    recommendedApproach: "builtin",
    priority: "medium",
    cacheTTL: 1800,
    rateLimitCost: 0,
    estimatedResponseTime: 150,
    fallback: "local_validation",
    conditions: {
      frequency: "low",
    },
    description: "Data validation - internal suite",
  },

  // Historical Analysis
  {
    operation: "get-trend-analysis",
    recommendedApproach: "cache",
    priority: "medium",
    cacheTTL: 3600,
    rateLimitCost: 1,
    estimatedResponseTime: 200,
    fallback: "builtin_trends",
    conditions: {
      frequency: "low",
    },
    description: "Trend analysis - cache for 1 hour",
  },

  {
    operation: "get-customer-insights",
    recommendedApproach: "hybrid",
    priority: "medium",
    cacheTTL: 1800,
    rateLimitCost: 1,
    estimatedResponseTime: 250,
    fallback: "aggregated_customer_data",
    conditions: {
      frequency: "low",
      maxDataSize: 50000,
    },
    description: "Customer insights - smart caching with API enrichment",
  },
];

/**
 * Matrix accessor class
 */
export class DecisionMatrix {
  /**
   * Find matrix entry by operation
   */
  static getEntry(operation: string): MatrixEntry | undefined {
    return API_DECISION_MATRIX.find((entry) => entry.operation === operation);
  }

  /**
   * Get all API operations
   */
  static getAPIOperations(): MatrixEntry[] {
    return API_DECISION_MATRIX.filter((entry) => entry.rateLimitCost > 0);
  }

  /**
   * Get total potential API cost for a set of operations
   */
  static calculateTotalCost(operations: string[]): number {
    return operations.reduce((total, op) => {
      const entry = this.getEntry(op);
      return total + (entry?.rateLimitCost || 0);
    }, 0);
  }

  /**
   * Get recommended operations that consume no API tokens
   */
  static getFreeTier(): MatrixEntry[] {
    return API_DECISION_MATRIX.filter((entry) => entry.rateLimitCost === 0);
  }

  /**
   * Check if operation is feasible within rate limit
   */
  static isFeasible(
    operation: string,
    remainingTokens: number,
    maxResponseTimeMs: number = 500
  ): boolean {
    const entry = this.getEntry(operation);
    if (!entry) return false;

    const tokenFeasible = entry.rateLimitCost <= remainingTokens;
    const timeFeasible = entry.estimatedResponseTime <= maxResponseTimeMs;

    return tokenFeasible && timeFeasible;
  }

  /**
   * Get alternatives for an operation
   */
  static getAlternatives(operation: string): MatrixEntry[] {
    const entry = this.getEntry(operation);
    if (!entry) return [];

    // Return entries with similar priority that are cheaper
    return API_DECISION_MATRIX.filter(
      (e) =>
        e.priority === entry.priority &&
        e.rateLimitCost < entry.rateLimitCost &&
        e.operation !== operation
    );
  }

  /**
   * Get stats for rate limiting analysis
   */
  static getMatrixStats(): Record<string, any> {
    const stats = {
      totalOperations: API_DECISION_MATRIX.length,
      apiOperations: 0,
      cachedOperations: 0,
      builtinOperations: 0,
      hybridOperations: 0,
      totalCost: 0,
      averageCost: 0,
      avgResponseTime: 0,
      byApproach: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
    };

    for (const entry of API_DECISION_MATRIX) {
      if (entry.rateLimitCost > 0) stats.apiOperations++;
      if (entry.cacheTTL > 0) stats.cachedOperations++;
      if (entry.recommendedApproach === "builtin") stats.builtinOperations++;
      if (entry.recommendedApproach === "hybrid") stats.hybridOperations++;

      stats.totalCost += entry.rateLimitCost;
      stats.avgResponseTime += entry.estimatedResponseTime;

      stats.byApproach[entry.recommendedApproach] =
        (stats.byApproach[entry.recommendedApproach] || 0) + 1;
      stats.byPriority[entry.priority] = (stats.byPriority[entry.priority] || 0) + 1;
    }

    stats.averageCost = Number((stats.totalCost / API_DECISION_MATRIX.length).toFixed(2));
    stats.avgResponseTime = Math.round(
      stats.avgResponseTime / API_DECISION_MATRIX.length
    );

    return stats;
  }
}
