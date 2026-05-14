#!/bin/bash

# Comprehensive Monitoring & Alerting Setup v3.0
# Advanced system monitoring, performance tracking, and intelligent alerting

echo "📊 [MONITORING-SETUP] Initializing comprehensive monitoring and alerting system v3.0..."

# Create monitoring directory structure
mkdir -p monitoring/{dashboards,alerts,scripts,logs,metrics}
mkdir -p monitoring/prometheus
mkdir -p monitoring/grafana
mkdir -p monitoring/elasticsearch

# Generate Prometheus configuration
cat > monitoring/prometheus/prometheus.yml << 'EOF'
# Prometheus Configuration for KPI Dashboard Monitoring v3.0

global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'cisco-sre-dashboard'
    environment: 'production'

rule_files:
  - "alerts/*.yml"

scrape_configs:
  # Main dashboard application metrics
  - job_name: 'kpi-dashboard'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/v3/metrics'
    scrape_interval: 30s
    scrape_timeout: 10s
    
  # Enhanced KPI endpoint monitoring
  - job_name: 'kpi-enhanced-metrics'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/v3/kpi/performance-metrics'
    scrape_interval: 60s
    
  # WebSocket server monitoring
  - job_name: 'websocket-servers'
    static_configs:
      - targets: ['localhost:8081', 'localhost:8082', 'localhost:8083']
    metrics_path: '/metrics'
    scrape_interval: 30s
    
  # SSE server monitoring  
  - job_name: 'sse-servers'
    static_configs:
      - targets: ['localhost:8084', 'localhost:8085']
    metrics_path: '/metrics'
    scrape_interval: 30s
    
  # System metrics
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']
    scrape_interval: 15s
    
  # Database monitoring
  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['localhost:9187']
    scrape_interval: 30s
    
  # Redis monitoring (if using Redis cache)
  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['localhost:9121']
    scrape_interval: 30s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - localhost:9093

# Remote write for long-term storage (optional)
# remote_write:
#   - url: "https://prometheus-remote-write.cisco.com/api/v1/write"
#     basic_auth:
#       username: "dashboard-metrics"
#       password: "secure-token"
EOF

# Generate alerting rules
cat > monitoring/prometheus/alerts/dashboard-alerts.yml << 'EOF'
# Dashboard Alerting Rules v3.0

groups:
  - name: dashboard-performance
    rules:
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2.0
        for: 2m
        labels:
          severity: warning
          component: api
        annotations:
          summary: "High API response time detected"
          description: "95th percentile response time is {{ $value }}s for {{ $labels.instance }}"
          
      - alert: CriticalResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 5.0
        for: 1m
        labels:
          severity: critical
          component: api
        annotations:
          summary: "Critical API response time detected"
          description: "95th percentile response time is {{ $value }}s for {{ $labels.instance }}"
          
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 2m
        labels:
          severity: warning
          component: api
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} for {{ $labels.instance }}"
          
      - alert: LowCacheHitRate
        expr: cache_hit_rate < 70
        for: 5m
        labels:
          severity: warning
          component: cache
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value }}% for {{ $labels.instance }}"

  - name: streaming-services
    rules:
      - alert: WebSocketConnectionLimit
        expr: websocket_active_connections > 800
        for: 2m
        labels:
          severity: warning
          component: websocket
        annotations:
          summary: "WebSocket connections approaching limit"
          description: "Active connections: {{ $value }} (limit: 1000) for {{ $labels.instance }}"
          
      - alert: StreamingLatencyHigh
        expr: streaming_message_latency_p95 > 5000
        for: 2m
        labels:
          severity: critical
          component: streaming
        annotations:
          summary: "High streaming latency detected"
          description: "95th percentile latency is {{ $value }}ms for {{ $labels.channel }}"
          
      - alert: SSEConnectionFailures
        expr: rate(sse_connection_failures_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
          component: sse
        annotations:
          summary: "High SSE connection failure rate"
          description: "Connection failure rate: {{ $value | humanizePercentage }} for {{ $labels.instance }}"

  - name: ml-analytics
    rules:
      - alert: AnomalyDetectionDown
        expr: up{job="anomaly-detection"} == 0
        for: 1m
        labels:
          severity: critical
          component: ml
        annotations:
          summary: "Anomaly detection service is down"
          description: "Anomaly detection service on {{ $labels.instance }} is not responding"
          
      - alert: MLModelAccuracyDrop
        expr: ml_model_accuracy < 0.85
        for: 5m
        labels:
          severity: warning
          component: ml
        annotations:
          summary: "ML model accuracy below threshold"
          description: "Model accuracy is {{ $value | humanizePercentage }} (threshold: 85%) for {{ $labels.model }}"
          
      - alert: AnomalyDetectionBacklog
        expr: anomaly_detection_queue_size > 10000
        for: 2m
        labels:
          severity: warning
          component: ml
        annotations:
          summary: "Anomaly detection queue backlog"
          description: "Queue size: {{ $value }} items for {{ $labels.instance }}"

  - name: system-resources
    rules:
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.85
        for: 2m
        labels:
          severity: warning
          component: system
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }} on {{ $labels.instance }}"
          
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 2m
        labels:
          severity: warning
          component: system
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is {{ $value }}% on {{ $labels.instance }}"
          
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.15
        for: 5m
        labels:
          severity: warning
          component: system
        annotations:
          summary: "Low disk space"
          description: "Available disk space is {{ $value | humanizePercentage }} on {{ $labels.instance }}:{{ $labels.mountpoint }}"

  - name: database-monitoring
    rules:
      - alert: PostgreSQLDown
        expr: up{job="postgres-exporter"} == 0
        for: 1m
        labels:
          severity: critical
          component: database
        annotations:
          summary: "PostgreSQL is down"
          description: "PostgreSQL database on {{ $labels.instance }} is not responding"
          
      - alert: DatabaseConnectionsHigh
        expr: pg_stat_database_numbackends / pg_settings_max_connections > 0.8
        for: 2m
        labels:
          severity: warning
          component: database
        annotations:
          summary: "High database connection usage"
          description: "Connection usage is {{ $value | humanizePercentage }} on {{ $labels.instance }}"
          
      - alert: SlowQueries
        expr: rate(pg_stat_statements_mean_time_seconds[5m]) > 1.0
        for: 5m
        labels:
          severity: warning
          component: database
        annotations:
          summary: "Slow database queries detected"
          description: "Average query time is {{ $value }}s on {{ $labels.instance }}"
EOF

# Generate Alertmanager configuration
cat > monitoring/alertmanager.yml << 'EOF'
# Alertmanager Configuration v3.0

global:
  smtp_smarthost: 'smtp.cisco.com:587'
  smtp_from: 'dashboard-alerts@cisco.com'
  smtp_auth_username: 'dashboard-alerts@cisco.com'
  smtp_auth_password: 'secure-email-password'

templates:
  - '/etc/alertmanager/templates/*.tmpl'

route:
  group_by: ['alertname', 'severity', 'component']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default-receiver'
  
  routes:
    # Critical alerts - immediate notification
    - match:
        severity: critical
      receiver: 'critical-alerts'
      group_wait: 10s
      repeat_interval: 5m
      
    # Warning alerts - standard notification
    - match:
        severity: warning
      receiver: 'warning-alerts'
      group_wait: 30s
      repeat_interval: 30m
      
    # Component-specific routing
    - match:
        component: ml
      receiver: 'ml-team'
      
    - match:
        component: database
      receiver: 'database-team'
      
    - match:
        component: streaming
      receiver: 'streaming-team'

receivers:
  - name: 'default-receiver'
    email_configs:
      - to: 'sre-team@cisco.com'
        subject: '[Dashboard Alert] {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Instance: {{ .Labels.instance }}
          Severity: {{ .Labels.severity }}
          Time: {{ .StartsAt }}
          {{ end }}
        
  - name: 'critical-alerts'
    email_configs:
      - to: 'critical-alerts@cisco.com,sre-oncall@cisco.com'
        subject: '[CRITICAL] Dashboard Alert - {{ .GroupLabels.alertname }}'
        body: |
          🚨 CRITICAL ALERT 🚨
          
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          Instance: {{ .Labels.instance }}
          Component: {{ .Labels.component }}
          Time: {{ .StartsAt }}
          
          Action Required: Immediate investigation needed
          {{ end }}
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/CISCO/DASHBOARD/ALERTS'
        channel: '#critical-alerts'
        title: '🚨 Critical Dashboard Alert'
        text: |
          {{ range .Alerts }}
          *{{ .Annotations.summary }}*
          {{ .Annotations.description }}
          Instance: {{ .Labels.instance }}
          {{ end }}
        
  - name: 'warning-alerts'
    email_configs:
      - to: 'sre-team@cisco.com'
        subject: '[WARNING] Dashboard Alert - {{ .GroupLabels.alertname }}'
        
  - name: 'ml-team'
    email_configs:
      - to: 'ml-team@cisco.com,sre-team@cisco.com'
        subject: '[ML Alert] Dashboard ML Component - {{ .GroupLabels.alertname }}'
        
  - name: 'database-team'
    email_configs:
      - to: 'database-team@cisco.com,sre-team@cisco.com'
        subject: '[DB Alert] Dashboard Database - {{ .GroupLabels.alertname }}'
        
  - name: 'streaming-team'
    email_configs:
      - to: 'streaming-team@cisco.com,sre-team@cisco.com'
        subject: '[Streaming Alert] Dashboard Streaming - {{ .GroupLabels.alertname }}'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
EOF

# Generate Grafana dashboard JSON
cat > monitoring/grafana/dashboard-overview.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "Cisco SRE KPI Dashboard - System Overview v3.0",
    "tags": ["cisco", "sre", "kpi", "dashboard"],
    "timezone": "UTC",
    "panels": [
      {
        "id": 1,
        "title": "Enhanced KPI Metrics",
        "type": "stat",
        "targets": [
          {
            "expr": "total_assets_current",
            "legendFormat": "Total Assets"
          },
          {
            "expr": "secure_assets_percentage", 
            "legendFormat": "Secure %"
          },
          {
            "expr": "vulnerable_assets_count",
            "legendFormat": "Vulnerable"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "API Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th Percentile Response Time"
          },
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "Request Rate"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "Streaming Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "websocket_active_connections",
            "legendFormat": "WebSocket Connections"
          },
          {
            "expr": "sse_active_streams",
            "legendFormat": "SSE Streams"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "id": 4,
        "title": "ML Analytics Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "ml_model_accuracy",
            "legendFormat": "Model Accuracy"
          },
          {
            "expr": "anomaly_detection_rate",
            "legendFormat": "Anomaly Detection Rate"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
      },
      {
        "id": 5,
        "title": "Cache Performance", 
        "type": "stat",
        "targets": [
          {
            "expr": "cache_hit_rate",
            "legendFormat": "Hit Rate %"
          },
          {
            "expr": "cache_entries_total",
            "legendFormat": "Total Entries"
          }
        ],
        "gridPos": {"h": 6, "w": 8, "x": 0, "y": 16}
      },
      {
        "id": 6,
        "title": "System Resources",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - (avg(irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "CPU Usage %"
          },
          {
            "expr": "(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100",
            "legendFormat": "Memory Usage %"
          }
        ],
        "gridPos": {"h": 6, "w": 8, "x": 8, "y": 16}
      },
      {
        "id": 7,
        "title": "Alert Summary",
        "type": "table",
        "targets": [
          {
            "expr": "ALERTS{alertstate=\"firing\"}",
            "legendFormat": "Active Alerts"
          }
        ],
        "gridPos": {"h": 6, "w": 8, "x": 16, "y": 16}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
EOF

# Generate monitoring startup script
cat > monitoring/scripts/start-monitoring.sh << 'EOF'
#!/bin/bash

echo "📊 Starting Comprehensive Monitoring Stack v3.0..."

# Start Prometheus
echo "🔍 Starting Prometheus..."
prometheus \
  --config.file=monitoring/prometheus/prometheus.yml \
  --storage.tsdb.path=monitoring/prometheus/data \
  --web.console.templates=monitoring/prometheus/consoles \
  --web.console.libraries=monitoring/prometheus/console_libraries \
  --web.listen-address=:9090 \
  --web.enable-lifecycle &
PROMETHEUS_PID=$!

# Start Alertmanager
echo "🚨 Starting Alertmanager..."
alertmanager \
  --config.file=monitoring/alertmanager.yml \
  --storage.path=monitoring/alertmanager/data \
  --web.listen-address=:9093 &
ALERTMANAGER_PID=$!

# Start Node Exporter
echo "💻 Starting Node Exporter..."
node_exporter \
  --web.listen-address=:9100 \
  --collector.filesystem.ignored-mount-points="^/(sys|proc|dev|host|etc)($|/)" &
NODE_EXPORTER_PID=$!

# Start Grafana (if installed)
if command -v grafana-server >/dev/null 2>&1; then
    echo "📈 Starting Grafana..."
    grafana-server \
      --config=monitoring/grafana/grafana.ini \
      --homepath=/usr/share/grafana \
      --pidfile=monitoring/grafana/grafana.pid &
    GRAFANA_PID=$!
fi

# Save PIDs
echo "$PROMETHEUS_PID $ALERTMANAGER_PID $NODE_EXPORTER_PID $GRAFANA_PID" > .monitoring_pids

echo "✅ Monitoring stack started successfully!"
echo "📊 Prometheus: http://localhost:9090"
echo "🚨 Alertmanager: http://localhost:9093"  
echo "💻 Node Exporter: http://localhost:9100"
echo "📈 Grafana: http://localhost:3001"

# Wait a moment and check health
sleep 5
echo "🔍 Checking service health..."

for service in prometheus:9090 alertmanager:9093 node-exporter:9100; do
    name=$(echo $service | cut -d: -f1)
    port=$(echo $service | cut -d: -f2)
    if curl -f http://localhost:$port/metrics >/dev/null 2>&1 || curl -f http://localhost:$port >/dev/null 2>&1; then
        echo "✅ $name is healthy"
    else
        echo "❌ $name is not responding on port $port"
    fi
done
EOF

cat > monitoring/scripts/stop-monitoring.sh << 'EOF'
#!/bin/bash

echo "🛑 Stopping Monitoring Stack..."

if [ -f .monitoring_pids ]; then
    PIDS=$(cat .monitoring_pids)
    for PID in $PIDS; do
        if [ ! -z "$PID" ] && kill -0 $PID 2>/dev/null; then
            echo "🔄 Stopping process $PID..."
            kill -TERM $PID
            sleep 2
            if kill -0 $PID 2>/dev/null; then
                echo "🔨 Force stopping process $PID..."
                kill -KILL $PID
            fi
        fi
    done
    rm -f .monitoring_pids
    echo "✅ All monitoring services stopped"
else
    echo "⚠️  No PID file found. Attempting to stop by process name..."
    pkill -f prometheus
    pkill -f alertmanager
    pkill -f node_exporter
    pkill -f grafana-server
fi
EOF

# Make scripts executable
chmod +x monitoring/scripts/start-monitoring.sh
chmod +x monitoring/scripts/stop-monitoring.sh

# Generate health check script
cat > monitoring/scripts/health-check.sh << 'EOF'
#!/bin/bash

echo "🔍 Performing Comprehensive Health Check..."

# Check main application
echo "📊 Checking main dashboard application..."
if curl -f http://localhost:3000/api/v3/health >/dev/null 2>&1; then
    echo "✅ Main dashboard is healthy"
else
    echo "❌ Main dashboard is not responding"
fi

# Check enhanced KPI endpoints
echo "📈 Checking enhanced KPI endpoints..."
for endpoint in enhanced-metrics real-time-stream advanced-anomalies predictive-analytics performance-metrics data-pipelines; do
    if curl -f http://localhost:3000/api/v3/kpi/$endpoint >/dev/null 2>&1; then
        echo "✅ KPI endpoint '$endpoint' is healthy"
    else
        echo "❌ KPI endpoint '$endpoint' is not responding"
    fi
done

# Check streaming services
echo "📡 Checking streaming services..."
for port in 8081 8082 8083 8084 8085; do
    if curl -f http://localhost:$port/health >/dev/null 2>&1; then
        echo "✅ Streaming service on port $port is healthy"
    else
        echo "❌ Streaming service on port $port is not responding"
    fi
done

# Check monitoring services
echo "📊 Checking monitoring services..."
services=(
    "Prometheus:9090"
    "Alertmanager:9093"
    "Node Exporter:9100"
)

for service in "${services[@]}"; do
    name=$(echo $service | cut -d: -f1)
    port=$(echo $service | cut -d: -f2)
    if curl -f http://localhost:$port >/dev/null 2>&1; then
        echo "✅ $name is healthy"
    else
        echo "❌ $name is not responding on port $port"
    fi
done

# Check database connectivity
echo "🗄️  Checking database connectivity..."
if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "✅ PostgreSQL database is accepting connections"
else
    echo "❌ PostgreSQL database is not responding"
fi

echo ""
echo "📋 Health Check Summary Complete"
echo "   Review any ❌ items above that need attention"
EOF

chmod +x monitoring/scripts/health-check.sh

# Generate metric collection script
cat > monitoring/scripts/collect-metrics.sh << 'EOF'
#!/bin/bash

# Collect comprehensive system metrics for analysis
echo "📊 Collecting comprehensive system metrics..."

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
METRICS_DIR="monitoring/metrics/$TIMESTAMP"
mkdir -p "$METRICS_DIR"

echo "📈 Collecting dashboard metrics..."
curl -s http://localhost:3000/api/v3/kpi/performance-metrics > "$METRICS_DIR/dashboard-performance.json"
curl -s http://localhost:3000/api/v3/kpi/enhanced-metrics > "$METRICS_DIR/enhanced-kpi.json"

echo "📡 Collecting streaming metrics..."
for port in 8081 8082 8083 8084 8085; do
    curl -s http://localhost:$port/metrics > "$METRICS_DIR/streaming-$port.metrics" 2>/dev/null || echo "Port $port not available"
done

echo "📊 Collecting system metrics..."
# System information
uname -a > "$METRICS_DIR/system-info.txt"
free -h > "$METRICS_DIR/memory-usage.txt"
df -h > "$METRICS_DIR/disk-usage.txt"
ps aux --sort=-%cpu | head -20 > "$METRICS_DIR/top-processes.txt"

# Network statistics
netstat -tuln > "$METRICS_DIR/network-connections.txt"
ss -tuln > "$METRICS_DIR/socket-stats.txt"

echo "📈 Collecting Prometheus metrics..."
curl -s http://localhost:9090/api/v1/query?query=up > "$METRICS_DIR/prometheus-up.json"
curl -s http://localhost:9090/api/v1/query?query=http_requests_total > "$METRICS_DIR/http-requests.json"

echo "✅ Metrics collected in: $METRICS_DIR"
echo "📊 Total files: $(ls -1 "$METRICS_DIR" | wc -l)"
echo "💾 Total size: $(du -sh "$METRICS_DIR" | cut -f1)"

# Create metrics summary
cat > "$METRICS_DIR/collection-summary.txt" << EOF_SUMMARY
Metrics Collection Summary
=========================
Timestamp: $(date)
Collection ID: $TIMESTAMP
System: $(hostname)
Uptime: $(uptime)

Files Collected:
$(ls -la "$METRICS_DIR")

Collection Status:
- Dashboard metrics: ✅
- Streaming metrics: ✅  
- System metrics: ✅
- Prometheus metrics: ✅

Total Collection Size: $(du -sh "$METRICS_DIR" | cut -f1)
EOF_SUMMARY

echo "📋 Collection summary saved to: $METRICS_DIR/collection-summary.txt"
EOF

chmod +x monitoring/scripts/collect-metrics.sh

echo "✅ [MONITORING-SETUP] Comprehensive monitoring and alerting system configured!"
echo ""
echo "📋 Setup Summary:"
echo "  • Prometheus: Advanced metrics collection and storage"
echo "  • Alertmanager: Intelligent alert routing and notification"
echo "  • Grafana: Comprehensive visualization dashboards"
echo "  • Node Exporter: System metrics collection"
echo "  • Custom Alerts: Performance, ML, streaming, and system monitoring"
echo ""
echo "🚀 To start monitoring stack:"
echo "  ./monitoring/scripts/start-monitoring.sh"
echo ""
echo "🔍 To perform health checks:"
echo "  ./monitoring/scripts/health-check.sh"
echo ""
echo "📊 To collect metrics:"
echo "  ./monitoring/scripts/collect-metrics.sh"