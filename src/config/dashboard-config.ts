/**
 * Enhanced Dashboard Configuration Manager v3.0
 * Centralized configuration for KPI dashboard, real-time streaming, and ML analytics
 */

import fs from 'fs';
import path from 'path';

interface DatabaseConfig {
  connectionString: string;
  poolSize: number;
  timeoutMs: number;
  retryAttempts: number;
  enableDeduplication: boolean;
  queryOptimization: boolean;
}

interface CacheConfig {
  provider: 'memory' | 'redis' | 'hybrid';
  defaultTTL: number;
  maxSize: number;
  compressionEnabled: boolean;
  cleanupInterval: number;
  hitRateTarget: number;
}

interface StreamingConfig {
  enabled: boolean;
  refreshInterval: number;
  maxConnections: number;
  heartbeatInterval: number;
  bufferSize: number;
  compressionLevel: number;
}

interface MLConfig {
  anomalyDetection: {
    enabled: boolean;
    algorithms: string[];
    sensitivityLevel: number;
    minimumDataPoints: number;
    confidenceThreshold: number;
  };
  predictiveAnalytics: {
    enabled: boolean;
    forecastHorizon: number;
    ensembleModels: string[];
    retrainingInterval: number;
    accuracyThreshold: number;
  };
  modelPersistence: {
    enabled: boolean;
    saveInterval: number;
    modelPath: string;
    versioningEnabled: boolean;
  };
}

interface PerformanceConfig {
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    historyRetention: number;
    alertThresholds: {
      responseTime: number;
      errorRate: number;
      memoryUsage: number;
      cpuUsage: number;
    };
  };
  optimization: {
    queryBatching: boolean;
    responseCompression: boolean;
    lazyLoading: boolean;
    prefetching: boolean;
  };
}

interface SecurityConfig {
  rateLimiting: {
    globalLimit: number;
    windowSize: number;
    excludePatterns: string[];
  };
  cors: {
    origins: string[];
    methods: string[];
    credentials: boolean;
  };
  headers: {
    securityHeaders: boolean;
    customHeaders: Record<string, string>;
  };
}

interface DashboardConfig {
  version: string;
  environment: 'development' | 'staging' | 'production';
  database: DatabaseConfig;
  cache: CacheConfig;
  streaming: StreamingConfig;
  ml: MLConfig;
  performance: PerformanceConfig;
  security: SecurityConfig;
  features: {
    realTimeKPIs: boolean;
    anomalyDetection: boolean;
    predictiveAnalytics: boolean;
    performanceMonitoring: boolean;
    dataPipelines: boolean;
    advancedCaching: boolean;
  };
}

export class DashboardConfigManager {
  private static instance: DashboardConfigManager;
  private config: DashboardConfig;
  private configPath: string;
  private watchers: Map<string, Function[]> = new Map();

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'config', 'dashboard.config.json');
    this.config = this.loadConfiguration();
  }

  /**
   * Singleton instance getter
   */
  static getInstance(configPath?: string): DashboardConfigManager {
    if (!DashboardConfigManager.instance) {
      DashboardConfigManager.instance = new DashboardConfigManager(configPath);
    }
    return DashboardConfigManager.instance;
  }

  /**
   * Load configuration with environment-specific overrides
   */
  private loadConfiguration(): DashboardConfig {
    console.log('[CONFIG] Loading dashboard configuration...');

    // Default configuration
    const defaultConfig: DashboardConfig = {
      version: '3.0',
      environment: (process.env.NODE_ENV as any) || 'development',
      database: {
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/dashboard',
        poolSize: parseInt(process.env.DB_POOL_SIZE || '20'),
        timeoutMs: parseInt(process.env.DB_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '3'),
        enableDeduplication: process.env.DB_ENABLE_DEDUPLICATION !== 'false',
        queryOptimization: process.env.DB_QUERY_OPTIMIZATION !== 'false'
      },
      cache: {
        provider: (process.env.CACHE_PROVIDER as any) || 'memory',
        defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '300000'), // 5 minutes
        maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000'),
        compressionEnabled: process.env.CACHE_COMPRESSION !== 'false',
        cleanupInterval: parseInt(process.env.CACHE_CLEANUP_INTERVAL || '60000'),
        hitRateTarget: parseFloat(process.env.CACHE_HIT_RATE_TARGET || '85.0')
      },
      streaming: {
        enabled: process.env.STREAMING_ENABLED !== 'false',
        refreshInterval: parseInt(process.env.STREAMING_REFRESH_INTERVAL || '30000'),
        maxConnections: parseInt(process.env.STREAMING_MAX_CONNECTIONS || '100'),
        heartbeatInterval: parseInt(process.env.STREAMING_HEARTBEAT_INTERVAL || '10000'),
        bufferSize: parseInt(process.env.STREAMING_BUFFER_SIZE || '1024'),
        compressionLevel: parseInt(process.env.STREAMING_COMPRESSION_LEVEL || '6')
      },
      ml: {
        anomalyDetection: {
          enabled: process.env.ML_ANOMALY_DETECTION !== 'false',
          algorithms: ['IsolationForest', 'StatisticalAnalysis', 'ClusteringBased'],
          sensitivityLevel: parseFloat(process.env.ML_ANOMALY_SENSITIVITY || '0.95'),
          minimumDataPoints: parseInt(process.env.ML_ANOMALY_MIN_POINTS || '30'),
          confidenceThreshold: parseFloat(process.env.ML_ANOMALY_CONFIDENCE || '0.9')
        },
        predictiveAnalytics: {
          enabled: process.env.ML_PREDICTIONS !== 'false',
          forecastHorizon: parseInt(process.env.ML_FORECAST_HORIZON || '6'),
          ensembleModels: ['LinearRegression', 'RandomForest', 'ARIMA', 'NeuralNetwork'],
          retrainingInterval: parseInt(process.env.ML_RETRAIN_INTERVAL || '86400000'), // 24 hours
          accuracyThreshold: parseFloat(process.env.ML_ACCURACY_THRESHOLD || '0.85')
        },
        modelPersistence: {
          enabled: process.env.ML_MODEL_PERSISTENCE !== 'false',
          saveInterval: parseInt(process.env.ML_SAVE_INTERVAL || '3600000'), // 1 hour
          modelPath: process.env.ML_MODEL_PATH || './models',
          versioningEnabled: process.env.ML_VERSIONING !== 'false'
        }
      },
      performance: {
        monitoring: {
          enabled: process.env.PERFORMANCE_MONITORING !== 'false',
          metricsInterval: parseInt(process.env.PERF_METRICS_INTERVAL || '60000'),
          historyRetention: parseInt(process.env.PERF_HISTORY_RETENTION || '86400000'), // 24 hours
          alertThresholds: {
            responseTime: parseInt(process.env.PERF_ALERT_RESPONSE_TIME || '1000'),
            errorRate: parseFloat(process.env.PERF_ALERT_ERROR_RATE || '0.05'),
            memoryUsage: parseFloat(process.env.PERF_ALERT_MEMORY || '0.85'),
            cpuUsage: parseFloat(process.env.PERF_ALERT_CPU || '0.80')
          }
        },
        optimization: {
          queryBatching: process.env.PERF_QUERY_BATCHING !== 'false',
          responseCompression: process.env.PERF_COMPRESSION !== 'false',
          lazyLoading: process.env.PERF_LAZY_LOADING !== 'false',
          prefetching: process.env.PERF_PREFETCHING !== 'false'
        }
      },
      security: {
        rateLimiting: {
          globalLimit: parseInt(process.env.SECURITY_RATE_LIMIT || '12'),
          windowSize: parseInt(process.env.SECURITY_RATE_WINDOW || '60000'),
          excludePatterns: (process.env.SECURITY_RATE_EXCLUDE || '').split(',').filter(Boolean)
        },
        cors: {
          origins: (process.env.SECURITY_CORS_ORIGINS || '*').split(','),
          methods: (process.env.SECURITY_CORS_METHODS || 'GET,POST,PUT,DELETE,OPTIONS').split(','),
          credentials: process.env.SECURITY_CORS_CREDENTIALS === 'true'
        },
        headers: {
          securityHeaders: process.env.SECURITY_HEADERS !== 'false',
          customHeaders: this.parseCustomHeaders(process.env.SECURITY_CUSTOM_HEADERS || '')
        }
      },
      features: {
        realTimeKPIs: process.env.FEATURE_REALTIME_KPIS !== 'false',
        anomalyDetection: process.env.FEATURE_ANOMALY_DETECTION !== 'false',
        predictiveAnalytics: process.env.FEATURE_PREDICTIVE_ANALYTICS !== 'false',
        performanceMonitoring: process.env.FEATURE_PERFORMANCE_MONITORING !== 'false',
        dataPipelines: process.env.FEATURE_DATA_PIPELINES !== 'false',
        advancedCaching: process.env.FEATURE_ADVANCED_CACHING !== 'false'
      }
    };

    // Load file-based configuration if exists
    let fileConfig = {};
    if (fs.existsSync(this.configPath)) {
      try {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        fileConfig = JSON.parse(configData);
        console.log('[CONFIG] ✓ Loaded configuration from file:', this.configPath);
      } catch (error) {
        console.warn('[CONFIG] Failed to load configuration file:', error);
      }
    }

    // Merge configurations (file overrides defaults, environment overrides file)
    const mergedConfig = this.deepMerge(defaultConfig, fileConfig);
    
    console.log(`[CONFIG] ✓ Configuration loaded for environment: ${mergedConfig.environment}`);
    
    return mergedConfig;
  }

  /**
   * Get complete configuration
   */
  getConfig(): DashboardConfig {
    return { ...this.config };
  }

  /**
   * Get specific configuration section
   */
  getSection<K extends keyof DashboardConfig>(section: K): DashboardConfig[K] {
    return this.config[section];
  }

  /**
   * Get nested configuration value
   */
  get<T = any>(path: string): T {
    return path.split('.').reduce((obj, key) => obj && obj[key], this.config as any);
  }

  /**
   * Update configuration value
   */
  set(path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.config as any);
    
    target[lastKey] = value;
    
    // Notify watchers
    this.notifyWatchers(path, value);
  }

  /**
   * Watch for configuration changes
   */
  watch(path: string, callback: (newValue: any, oldValue: any) => void): void {
    if (!this.watchers.has(path)) {
      this.watchers.set(path, []);
    }
    this.watchers.get(path)!.push(callback);
  }

  /**
   * Save current configuration to file
   */
  save(): void {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      console.log('[CONFIG] ✓ Configuration saved to file:', this.configPath);
    } catch (error) {
      console.error('[CONFIG] Failed to save configuration:', error);
    }
  }

  /**
   * Reload configuration from file and environment
   */
  reload(): void {
    const oldConfig = { ...this.config };
    this.config = this.loadConfiguration();
    
    console.log('[CONFIG] ✓ Configuration reloaded');
    
    // Notify all watchers of changes
    this.notifyAllWatchers(oldConfig, this.config);
  }

  /**
   * Validate configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate database configuration
    if (!this.config.database.connectionString) {
      errors.push('Database connection string is required');
    }

    if (this.config.database.poolSize < 1 || this.config.database.poolSize > 100) {
      errors.push('Database pool size must be between 1 and 100');
    }

    // Validate cache configuration
    if (this.config.cache.defaultTTL < 1000) {
      errors.push('Cache TTL must be at least 1000ms');
    }

    if (this.config.cache.maxSize < 10) {
      errors.push('Cache max size must be at least 10');
    }

    // Validate ML configuration
    if (this.config.ml.anomalyDetection.sensitivityLevel < 0 || this.config.ml.anomalyDetection.sensitivityLevel > 1) {
      errors.push('ML anomaly sensitivity must be between 0 and 1');
    }

    // Validate performance thresholds
    const thresholds = this.config.performance.monitoring.alertThresholds;
    if (thresholds.errorRate < 0 || thresholds.errorRate > 1) {
      errors.push('Error rate threshold must be between 0 and 1');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get configuration summary for monitoring
   */
  getSummary(): any {
    return {
      version: this.config.version,
      environment: this.config.environment,
      features: this.config.features,
      status: {
        databaseEnabled: !!this.config.database.connectionString,
        cacheEnabled: this.config.cache.provider !== 'memory',
        streamingEnabled: this.config.streaming.enabled,
        mlEnabled: this.config.ml.anomalyDetection.enabled || this.config.ml.predictiveAnalytics.enabled,
        performanceMonitoring: this.config.performance.monitoring.enabled
      },
      limits: {
        rateLimitPerMinute: this.config.security.rateLimiting.globalLimit,
        maxCacheSize: this.config.cache.maxSize,
        maxStreamingConnections: this.config.streaming.maxConnections
      }
    };
  }

  /**
   * Create configuration templates for different environments
   */
  static createTemplate(environment: 'development' | 'staging' | 'production'): DashboardConfig {
    const manager = new DashboardConfigManager();
    const template = manager.getConfig();
    
    // Environment-specific adjustments
    switch (environment) {
      case 'development':
        template.performance.monitoring.enabled = false;
        template.security.rateLimiting.globalLimit = 60; // More lenient for dev
        template.cache.provider = 'memory';
        break;
        
      case 'staging':
        template.performance.monitoring.enabled = true;
        template.security.rateLimiting.globalLimit = 30;
        template.cache.provider = 'redis';
        break;
        
      case 'production':
        template.performance.monitoring.enabled = true;
        template.security.rateLimiting.globalLimit = 12;
        template.cache.provider = 'redis';
        template.ml.modelPersistence.enabled = true;
        break;
    }
    
    template.environment = environment;
    return template;
  }

  // Private utility methods

  private deepMerge(target: any, source: any): any {
    if (typeof target !== 'object' || typeof source !== 'object') {
      return source;
    }

    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key] !== null) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  private parseCustomHeaders(headersString: string): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (!headersString) return headers;
    
    try {
      const pairs = headersString.split(';');
      pairs.forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value) {
          headers[key.trim()] = value.trim();
        }
      });
    } catch (error) {
      console.warn('[CONFIG] Failed to parse custom headers:', error);
    }
    
    return headers;
  }

  private notifyWatchers(path: string, newValue: any): void {
    const watchers = this.watchers.get(path);
    if (watchers) {
      watchers.forEach(callback => {
        try {
          callback(newValue, undefined);
        } catch (error) {
          console.error('[CONFIG] Watcher callback error:', error);
        }
      });
    }
  }

  private notifyAllWatchers(oldConfig: DashboardConfig, newConfig: DashboardConfig): void {
    // Compare configurations and notify relevant watchers
    this.watchers.forEach((callbacks, path) => {
      const oldValue = this.getValueByPath(oldConfig, path);
      const newValue = this.getValueByPath(newConfig, path);
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        callbacks.forEach(callback => {
          try {
            callback(newValue, oldValue);
          } catch (error) {
            console.error('[CONFIG] Watcher callback error:', error);
          }
        });
      }
    });
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }
}

export default DashboardConfigManager;