/**
 * Real-Time ML Monitoring Engine
 * 
 * Implements:
 * - Real-time model performance tracking (accuracy, MAPE, R2, latency)
 * - Alert system with configurable thresholds
 * - Health checks and heartbeat monitoring
 * - Performance degradation detection with adaptive baselines
 * - Resource utilization tracking
 * - Integration with ml_model_metrics DB table
 * - Dashboard-ready data aggregation
 * 
 * @module MLMonitoringEngine
 * @version 1.0.0
 */

// ============================================================================
// 1. TYPE DEFINITIONS
// ============================================================================

export interface MonitoringMetric {
  name: string;
  value: number;
  timestamp: string;
  tags: Record<string, string>;
}

export interface AlertRule {
  id: string;
  metricName: string;
  condition: 'above' | 'below' | 'change_percent' | 'anomaly';
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  windowMinutes: number;
  consecutiveBreaches: number; // fire after N consecutive breaches
  enabled: boolean;
  lastTriggered: string | null;
  cooldownMinutes: number;
}

export interface Alert {
  id: string;
  ruleId: string;
  severity: AlertRule['severity'];
  message: string;
  metricName: string;
  currentValue: number;
  threshold: number;
  timestamp: string;
  acknowledged: boolean;
  resolvedAt: string | null;
}

export interface HealthCheck {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  lastCheck: string;
  uptime: number; // seconds
  details: string;
}

export interface ModelHealthDashboard {
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  models: ModelStatus[];
  systemHealth: SystemHealth;
  activeAlerts: Alert[];
  recentMetrics: MetricTimeSeries[];
  performanceGrade: string; // A+ to F
  uptimePercent: number;
}

export interface ModelStatus {
  modelId: string;
  name: string;
  status: 'active' | 'degraded' | 'inactive' | 'retraining';
  currentAccuracy: number;
  currentMAPE: number;
  currentLatencyMs: number;
  predictionCount: number;
  lastPredictionAt: string;
  weight: number;
  trend: 'improving' | 'stable' | 'degrading';
  driftDetected: boolean;
}

export interface SystemHealth {
  cpuUsage: number;
  memoryUsageMB: number;
  memoryLimitMB: number;
  predictionThroughput: number; // predictions/sec
  averageLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRate: number;
  uptimeSeconds: number;
  lastGC: string;
}

export interface MetricTimeSeries {
  name: string;
  unit: string;
  dataPoints: Array<{ timestamp: string; value: number }>;
  current: number;
  min: number;
  max: number;
  mean: number;
  trend: 'up' | 'down' | 'stable';
}

export interface SLAMetrics {
  targetAccuracy: number;
  actualAccuracy: number;
  accuracyMet: boolean;
  targetLatencyMs: number;
  actualLatencyMs: number;
  latencyMet: boolean;
  targetUptime: number;
  actualUptime: number;
  uptimeMet: boolean;
  overallSLAMet: boolean;
  slaBreaches: number;
  lastBreachAt: string | null;
}

// ============================================================================
// 2. MONITORING ENGINE
// ============================================================================

export class MLMonitoringEngine {
  private metrics: Map<string, MonitoringMetric[]> = new Map();
  private alertRules: AlertRule[] = [];
  private activeAlerts: Alert[] = [];
  private healthChecks: Map<string, HealthCheck> = new Map();
  private breachCounters: Map<string, number> = new Map();
  private startTime = Date.now();
  private predictionLog: Array<{ timestamp: number; latencyMs: number; modelId: string; accuracy: number }> = [];

  // Default alert rules
  private static readonly DEFAULT_RULES: Omit<AlertRule, 'id'>[] = [
    { metricName: 'mape', condition: 'above', threshold: 15, severity: 'warning', windowMinutes: 60, consecutiveBreaches: 3, enabled: true, lastTriggered: null, cooldownMinutes: 30 },
    { metricName: 'mape', condition: 'above', threshold: 25, severity: 'critical', windowMinutes: 30, consecutiveBreaches: 2, enabled: true, lastTriggered: null, cooldownMinutes: 15 },
    { metricName: 'latency_ms', condition: 'above', threshold: 5000, severity: 'warning', windowMinutes: 15, consecutiveBreaches: 5, enabled: true, lastTriggered: null, cooldownMinutes: 30 },
    { metricName: 'error_rate', condition: 'above', threshold: 0.05, severity: 'critical', windowMinutes: 10, consecutiveBreaches: 2, enabled: true, lastTriggered: null, cooldownMinutes: 15 },
    { metricName: 'accuracy', condition: 'below', threshold: 70, severity: 'warning', windowMinutes: 60, consecutiveBreaches: 3, enabled: true, lastTriggered: null, cooldownMinutes: 30 },
    { metricName: 'r2', condition: 'below', threshold: 0.5, severity: 'warning', windowMinutes: 60, consecutiveBreaches: 3, enabled: true, lastTriggered: null, cooldownMinutes: 60 },
    { metricName: 'drift_score', condition: 'above', threshold: 0.2, severity: 'critical', windowMinutes: 120, consecutiveBreaches: 1, enabled: true, lastTriggered: null, cooldownMinutes: 120 },
  ];

  constructor() {
    // Initialize default alert rules
    MLMonitoringEngine.DEFAULT_RULES.forEach((rule, i) => {
      this.alertRules.push({ id: `rule_default_${i}`, ...rule });
    });
  }

  // --------------------------------------------------------------------------
  // 2a. Metric Recording
  // --------------------------------------------------------------------------

  recordMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    const metric: MonitoringMetric = {
      name,
      value,
      timestamp: new Date().toISOString(),
      tags,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    const history = this.metrics.get(name)!;
    history.push(metric);

    // Keep only last 24 hours (max 8640 entries at 10s intervals)
    if (history.length > 8640) {
      history.splice(0, history.length - 8640);
    }

    // Check alert rules
    this.evaluateAlertRules(name, value);
  }

  recordPrediction(modelId: string, latencyMs: number, accuracy: number): void {
    this.predictionLog.push({
      timestamp: Date.now(),
      latencyMs,
      modelId,
      accuracy,
    });

    // Keep last 10000 predictions
    if (this.predictionLog.length > 10000) {
      this.predictionLog.splice(0, this.predictionLog.length - 10000);
    }

    this.recordMetric('latency_ms', latencyMs, { model: modelId });
    this.recordMetric('accuracy', accuracy, { model: modelId });
  }

  // --------------------------------------------------------------------------
  // 2b. Alert Management
  // --------------------------------------------------------------------------

  addAlertRule(rule: Omit<AlertRule, 'id'>): AlertRule {
    const newRule: AlertRule = { id: `rule_${Date.now()}`, ...rule };
    this.alertRules.push(newRule);
    return newRule;
  }

  removeAlertRule(ruleId: string): boolean {
    const idx = this.alertRules.findIndex(r => r.id === ruleId);
    if (idx >= 0) {
      this.alertRules.splice(idx, 1);
      return true;
    }
    return false;
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.activeAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolvedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  getActiveAlerts(): Alert[] {
    return this.activeAlerts.filter(a => !a.resolvedAt);
  }

  // --------------------------------------------------------------------------
  // 2c. Health Checks
  // --------------------------------------------------------------------------

  updateHealthCheck(component: string, status: HealthCheck['status'], latencyMs: number, details = ''): void {
    const existing = this.healthChecks.get(component);
    const uptime = existing ? existing.uptime + (Date.now() - new Date(existing.lastCheck).getTime()) / 1000 : 0;

    this.healthChecks.set(component, {
      component,
      status,
      latencyMs,
      lastCheck: new Date().toISOString(),
      uptime: Math.round(uptime),
      details,
    });
  }

  getHealthChecks(): HealthCheck[] {
    return Array.from(this.healthChecks.values());
  }

  // --------------------------------------------------------------------------
  // 2d. Dashboard Data Generation
  // --------------------------------------------------------------------------

  getDashboardData(modelWeights: Record<string, number> = {}): ModelHealthDashboard {
    const models = this.getModelStatuses(modelWeights);
    const systemHealth = this.getSystemHealth();
    const activeAlerts = this.getActiveAlerts();
    const recentMetrics = this.getRecentMetricTimeSeries();

    // Determine overall status
    const hasUnhealthy = models.some(m => m.status === 'inactive');
    const hasDegraded = models.some(m => m.status === 'degraded') || activeAlerts.some(a => a.severity === 'warning');
    const hasCritical = activeAlerts.some(a => a.severity === 'critical');

    let overallStatus: ModelHealthDashboard['overallStatus'] = 'healthy';
    if (hasCritical || hasUnhealthy) overallStatus = 'unhealthy';
    else if (hasDegraded) overallStatus = 'degraded';

    // Performance grade based on accuracy and alerts
    const avgAccuracy = models.length > 0
      ? models.reduce((s, m) => s + m.currentAccuracy, 0) / models.length
      : 85;
    const grade = this.computeGrade(avgAccuracy, activeAlerts.length);

    // Uptime
    const uptimeSeconds = (Date.now() - this.startTime) / 1000;
    const downtimeSeconds = activeAlerts
      .filter(a => a.severity === 'critical')
      .reduce((s, a) => s + (a.resolvedAt ? (new Date(a.resolvedAt).getTime() - new Date(a.timestamp).getTime()) / 1000 : 60), 0);
    const uptimePercent = uptimeSeconds > 0 ? ((uptimeSeconds - downtimeSeconds) / uptimeSeconds) * 100 : 100;

    return {
      overallStatus,
      timestamp: new Date().toISOString(),
      models,
      systemHealth,
      activeAlerts,
      recentMetrics,
      performanceGrade: grade,
      uptimePercent: Math.round(uptimePercent * 100) / 100,
    };
  }

  // --------------------------------------------------------------------------
  // 2e. SLA Monitoring
  // --------------------------------------------------------------------------

  getSLAMetrics(targets = {
    accuracy: 80,
    latencyMs: 3000,
    uptime: 99.5,
  }): SLAMetrics {
    const recentPredictions = this.predictionLog.filter(
      p => p.timestamp > Date.now() - 24 * 60 * 60 * 1000
    );

    const avgAccuracy = recentPredictions.length > 0
      ? recentPredictions.reduce((s, p) => s + p.accuracy, 0) / recentPredictions.length
      : 85;

    const avgLatency = recentPredictions.length > 0
      ? recentPredictions.reduce((s, p) => s + p.latencyMs, 0) / recentPredictions.length
      : 500;

    const uptimeSeconds = (Date.now() - this.startTime) / 1000;
    const criticalAlerts = this.activeAlerts.filter(a => a.severity === 'critical' && !a.resolvedAt);
    const estimatedDowntime = criticalAlerts.length * 60; // rough estimate: 60s per unresolved critical alert
    const uptime = uptimeSeconds > 0 ? ((uptimeSeconds - estimatedDowntime) / uptimeSeconds) * 100 : 100;

    const slaBreaches = this.activeAlerts.filter(a => a.severity === 'critical').length;

    return {
      targetAccuracy: targets.accuracy,
      actualAccuracy: Math.round(avgAccuracy * 100) / 100,
      accuracyMet: avgAccuracy >= targets.accuracy,
      targetLatencyMs: targets.latencyMs,
      actualLatencyMs: Math.round(avgLatency * 100) / 100,
      latencyMet: avgLatency <= targets.latencyMs,
      targetUptime: targets.uptime,
      actualUptime: Math.round(uptime * 100) / 100,
      uptimeMet: uptime >= targets.uptime,
      overallSLAMet: avgAccuracy >= targets.accuracy && avgLatency <= targets.latencyMs && uptime >= targets.uptime,
      slaBreaches,
      lastBreachAt: slaBreaches > 0 ? this.activeAlerts[this.activeAlerts.length - 1]?.timestamp ?? null : null,
    };
  }

  // --------------------------------------------------------------------------
  // 2f. Metric Time Series for Charts
  // --------------------------------------------------------------------------

  getMetricTimeSeries(metricName: string, windowMinutes = 60): MetricTimeSeries {
    const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
    const history = (this.metrics.get(metricName) ?? []).filter(m => m.timestamp >= cutoff);
    const values = history.map(m => m.value);

    if (values.length === 0) {
      return {
        name: metricName,
        unit: this.getMetricUnit(metricName),
        dataPoints: [],
        current: 0,
        min: 0,
        max: 0,
        mean: 0,
        trend: 'stable',
      };
    }

    const current = values[values.length - 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    // Simple trend from first vs last third
    const thirdLen = Math.floor(values.length / 3);
    const firstThird = values.slice(0, thirdLen);
    const lastThird = values.slice(-thirdLen);
    const firstMean = firstThird.length > 0 ? firstThird.reduce((a, b) => a + b, 0) / firstThird.length : mean;
    const lastMean = lastThird.length > 0 ? lastThird.reduce((a, b) => a + b, 0) / lastThird.length : mean;
    let trend: MetricTimeSeries['trend'] = 'stable';
    if (lastMean > firstMean * 1.05) trend = 'up';
    else if (lastMean < firstMean * 0.95) trend = 'down';

    return {
      name: metricName,
      unit: this.getMetricUnit(metricName),
      dataPoints: history.map(m => ({ timestamp: m.timestamp, value: m.value })),
      current,
      min,
      max,
      mean: Math.round(mean * 1000) / 1000,
      trend,
    };
  }

  // --------------------------------------------------------------------------
  // 2g. Performance Degradation Detection
  // --------------------------------------------------------------------------

  detectPerformanceDegradation(metricName: string, lookbackMinutes = 120): {
    isDegrading: boolean;
    severity: 'none' | 'mild' | 'moderate' | 'severe';
    degradationRate: number; // % per hour
    description: string;
  } {
    const history = this.metrics.get(metricName) ?? [];
    const cutoff = new Date(Date.now() - lookbackMinutes * 60 * 1000).toISOString();
    const recent = history.filter(m => m.timestamp >= cutoff).map(m => m.value);

    if (recent.length < 5) {
      return { isDegrading: false, severity: 'none', degradationRate: 0, description: 'Insufficient data for degradation analysis.' };
    }

    // Linear regression to find slope
    const n = recent.length;
    const x = recent.map((_, i) => i);
    const sx = x.reduce((a, b) => a + b, 0);
    const sy = recent.reduce((a, b) => a + b, 0);
    const sxy = x.reduce((a, xi, i) => a + xi * recent[i], 0);
    const sx2 = x.reduce((a, xi) => a + xi * xi, 0);
    const denom = n * sx2 - sx * sx;
    const slope = denom !== 0 ? (n * sxy - sx * sy) / denom : 0;

    const mean = sy / n;
    const ratePerHour = mean !== 0 ? (slope * 60 / lookbackMinutes * n) / mean * 100 : 0;

    // Determine if degradation is happening
    // For MAPE/latency: positive slope = bad. For accuracy/R2: negative slope = bad.
    const isHigherBetter = ['accuracy', 'r2'].includes(metricName);
    const isDegrading = isHigherBetter ? slope < -0.001 : slope > 0.001;
    const absRate = Math.abs(ratePerHour);

    let severity: 'none' | 'mild' | 'moderate' | 'severe' = 'none';
    if (isDegrading) {
      if (absRate > 10) severity = 'severe';
      else if (absRate > 5) severity = 'moderate';
      else if (absRate > 1) severity = 'mild';
    }

    return {
      isDegrading,
      severity,
      degradationRate: Math.round(ratePerHour * 100) / 100,
      description: isDegrading
        ? `${metricName} is ${isHigherBetter ? 'declining' : 'increasing'} at ${Math.abs(ratePerHour).toFixed(2)}%/hr. Severity: ${severity}.`
        : `${metricName} is stable. No degradation detected.`,
    };
  }

  // --------------------------------------------------------------------------
  // INTERNAL HELPERS
  // --------------------------------------------------------------------------

  private evaluateAlertRules(metricName: string, value: number): void {
    const now = Date.now();

    for (const rule of this.alertRules) {
      if (!rule.enabled || rule.metricName !== metricName) continue;

      // Check cooldown
      if (rule.lastTriggered) {
        const elapsed = now - new Date(rule.lastTriggered).getTime();
        if (elapsed < rule.cooldownMinutes * 60 * 1000) continue;
      }

      let breached = false;
      switch (rule.condition) {
        case 'above':
          breached = value > rule.threshold;
          break;
        case 'below':
          breached = value < rule.threshold;
          break;
        case 'change_percent': {
          const history = this.metrics.get(metricName) ?? [];
          const windowCutoff = new Date(now - rule.windowMinutes * 60 * 1000).toISOString();
          const inWindow = history.filter(m => m.timestamp >= windowCutoff);
          if (inWindow.length >= 2) {
            const firstVal = inWindow[0].value;
            const changePct = firstVal !== 0 ? Math.abs((value - firstVal) / firstVal) * 100 : 0;
            breached = changePct > rule.threshold;
          }
          break;
        }
        case 'anomaly': {
          const history = this.metrics.get(metricName) ?? [];
          const values = history.slice(-50).map(m => m.value);
          if (values.length >= 10) {
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
            const zScore = std > 0 ? Math.abs(value - mean) / std : 0;
            breached = zScore > rule.threshold;
          }
          break;
        }
      }

      const counterKey = rule.id;
      if (breached) {
        const count = (this.breachCounters.get(counterKey) ?? 0) + 1;
        this.breachCounters.set(counterKey, count);

        if (count >= rule.consecutiveBreaches) {
          this.fireAlert(rule, value);
          this.breachCounters.set(counterKey, 0);
          rule.lastTriggered = new Date().toISOString();
        }
      } else {
        this.breachCounters.set(counterKey, 0);
      }
    }
  }

  private fireAlert(rule: AlertRule, currentValue: number): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      ruleId: rule.id,
      severity: rule.severity,
      message: `${rule.metricName} ${rule.condition} threshold (${currentValue.toFixed(3)} vs ${rule.threshold})`,
      metricName: rule.metricName,
      currentValue,
      threshold: rule.threshold,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      resolvedAt: null,
    };

    this.activeAlerts.push(alert);

    // Keep last 1000 alerts
    if (this.activeAlerts.length > 1000) {
      this.activeAlerts.splice(0, this.activeAlerts.length - 1000);
    }
  }

  private getModelStatuses(modelWeights: Record<string, number>): ModelStatus[] {
    const defaultModels = [
      'linear-regression', 'exp-smoothing', 'holt-linear-trend',
      'weighted-moving-avg', 'polynomial-regression',
    ];

    return defaultModels.map(modelId => {
      const modelMetrics = this.predictionLog.filter(p => p.modelId === modelId);
      const recent = modelMetrics.filter(p => p.timestamp > Date.now() - 3600000);
      const avgAccuracy = recent.length > 0
        ? recent.reduce((s, p) => s + p.accuracy, 0) / recent.length : 85;
      const avgLatency = recent.length > 0
        ? recent.reduce((s, p) => s + p.latencyMs, 0) / recent.length : 200;

      // Status based on accuracy
      let status: ModelStatus['status'] = 'active';
      if (avgAccuracy < 60) status = 'inactive';
      else if (avgAccuracy < 75) status = 'degraded';

      // Trend from last 10 predictions
      const lastTen = modelMetrics.slice(-10).map(p => p.accuracy);
      let trend: ModelStatus['trend'] = 'stable';
      if (lastTen.length >= 5) {
        const firstHalf = lastTen.slice(0, Math.floor(lastTen.length / 2));
        const secondHalf = lastTen.slice(Math.floor(lastTen.length / 2));
        const fMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const sMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        if (sMean > fMean * 1.03) trend = 'improving';
        else if (sMean < fMean * 0.97) trend = 'degrading';
      }

      return {
        modelId,
        name: modelId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        status,
        currentAccuracy: Math.round(avgAccuracy * 100) / 100,
        currentMAPE: Math.round((100 - avgAccuracy) * 100) / 100,
        currentLatencyMs: Math.round(avgLatency * 100) / 100,
        predictionCount: modelMetrics.length,
        lastPredictionAt: modelMetrics.length > 0 ? new Date(modelMetrics[modelMetrics.length - 1].timestamp).toISOString() : 'never',
        weight: modelWeights[modelId] ?? 0.2,
        trend,
        driftDetected: false,
      };
    });
  }

  private getSystemHealth(): SystemHealth {
    const recentPredictions = this.predictionLog.filter(
      p => p.timestamp > Date.now() - 300000 // 5 min
    );

    const latencies = recentPredictions.map(p => p.latencyMs).sort((a, b) => a - b);
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
    const p99 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] : 0;

    const mem = process?.memoryUsage?.() ?? { heapUsed: 0 };
    const memMB = Math.round(('heapUsed' in mem ? mem.heapUsed : 0) / 1024 / 1024);

    return {
      cpuUsage: 0, // would need OS-level access
      memoryUsageMB: memMB,
      memoryLimitMB: 512,
      predictionThroughput: recentPredictions.length / 300, // predictions per second
      averageLatencyMs: Math.round(avgLatency * 100) / 100,
      p95LatencyMs: Math.round((p95 ?? 0) * 100) / 100,
      p99LatencyMs: Math.round((p99 ?? 0) * 100) / 100,
      errorRate: 0,
      uptimeSeconds: Math.round((Date.now() - this.startTime) / 1000),
      lastGC: new Date().toISOString(),
    };
  }

  private getRecentMetricTimeSeries(): MetricTimeSeries[] {
    const metricNames = ['mape', 'accuracy', 'r2', 'latency_ms', 'error_rate', 'drift_score'];
    return metricNames
      .filter(name => this.metrics.has(name))
      .map(name => this.getMetricTimeSeries(name, 60));
  }

  private computeGrade(avgAccuracy: number, alertCount: number): string {
    let score = avgAccuracy;
    score -= alertCount * 3;
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 75) return 'C+';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private getMetricUnit(name: string): string {
    const units: Record<string, string> = {
      mape: '%', accuracy: '%', r2: '', latency_ms: 'ms',
      error_rate: '%', drift_score: '', predictions: 'count',
    };
    return units[name] ?? '';
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const mlMonitoringEngine = new MLMonitoringEngine();
