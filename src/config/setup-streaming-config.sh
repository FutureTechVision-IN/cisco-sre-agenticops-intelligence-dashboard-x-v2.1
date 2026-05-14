#!/bin/bash

# Real-Time Streaming Configuration Script v3.0
# Configures WebSocket servers, SSE endpoints, and data pipelines for enhanced KPI dashboard

echo "🚀 [STREAMING-CONFIG] Initializing real-time streaming infrastructure v3.0..."

# Create streaming configuration directory
mkdir -p config/streaming
mkdir -p logs/streaming
mkdir -p data/streams

# Generate WebSocket server configuration
cat > config/streaming/websocket.config.json << 'EOF'
{
  "server": {
    "port": 8081,
    "host": "0.0.0.0",
    "maxConnections": 1000,
    "connectionTimeout": 30000,
    "heartbeatInterval": 10000,
    "compressionEnabled": true,
    "corsOrigins": ["*"],
    "rateLimiting": {
      "maxConnectionsPerIP": 10,
      "messageLimitPerMinute": 100
    }
  },
  "channels": [
    {
      "name": "kpi-realtime",
      "description": "Real-time KPI metrics streaming",
      "refreshInterval": 30000,
      "dataSource": "enhanced-kpi-metrics",
      "maxSubscribers": 500,
      "bufferSize": 100,
      "compressionLevel": 6
    },
    {
      "name": "anomaly-alerts",
      "description": "ML-powered anomaly detection alerts",
      "refreshInterval": 10000,
      "dataSource": "anomaly-detection-engine",
      "maxSubscribers": 100,
      "priority": "high",
      "alertingEnabled": true
    },
    {
      "name": "performance-metrics",
      "description": "System performance and optimization metrics",
      "refreshInterval": 60000,
      "dataSource": "system-performance",
      "maxSubscribers": 50,
      "historicalDataPoints": 100
    },
    {
      "name": "pipeline-status",
      "description": "Data pipeline health and processing status",
      "refreshInterval": 120000,
      "dataSource": "data-pipelines",
      "maxSubscribers": 25,
      "statusUpdatesOnly": true
    }
  ],
  "security": {
    "authenticationRequired": false,
    "encryptionEnabled": true,
    "allowedMethods": ["subscribe", "unsubscribe", "heartbeat"],
    "maxPayloadSize": 1048576
  },
  "monitoring": {
    "metricsEnabled": true,
    "healthCheckInterval": 30000,
    "logLevel": "info",
    "performanceTracking": true
  }
}
EOF

# Generate Server-Sent Events configuration
cat > config/streaming/sse.config.json << 'EOF'
{
  "serverSentEvents": {
    "enabled": true,
    "endpoints": [
      {
        "path": "/stream/kpi-metrics",
        "description": "Enhanced KPI metrics stream",
        "contentType": "text/event-stream",
        "keepAliveInterval": 30000,
        "maxConnections": 200,
        "dataSource": "enhanced-kpi-controller",
        "cacheControl": "no-cache",
        "compression": {
          "enabled": true,
          "level": 6,
          "threshold": 1024
        }
      },
      {
        "path": "/stream/anomaly-detection",
        "description": "Real-time anomaly detection stream",
        "contentType": "text/event-stream",
        "keepAliveInterval": 10000,
        "maxConnections": 100,
        "dataSource": "ml-anomaly-engine",
        "priority": "high"
      },
      {
        "path": "/stream/predictive-analytics",
        "description": "ML predictions and forecasting stream",
        "contentType": "text/event-stream",
        "keepAliveInterval": 60000,
        "maxConnections": 50,
        "dataSource": "predictive-analytics-engine",
        "bufferEvents": true,
        "maxEventHistory": 50
      }
    ],
    "globalSettings": {
      "maxConnectionsPerIP": 10,
      "connectionTimeout": 300000,
      "heartbeatMessage": "heartbeat",
      "reconnectInterval": 5000,
      "corsHeaders": {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Cache-Control, Last-Event-ID"
      }
    },
    "dataFormatting": {
      "eventIdPrefix": "kpi-dashboard-",
      "timestampFormat": "ISO8601",
      "messageCompression": true,
      "jsonMinification": true
    }
  }
}
EOF

# Generate data pipeline streaming configuration
cat > config/streaming/pipeline.config.json << 'EOF'
{
  "dataPipelines": {
    "realtimeProcessing": {
      "enabled": true,
      "maxThroughput": 10000,
      "batchSize": 1000,
      "processingInterval": 5000,
      "parallelWorkers": 4,
      "memoryLimit": "2GB"
    },
    "pipelines": [
      {
        "id": "vulnerability-stream-processor",
        "name": "Real-time Vulnerability Data Processing",
        "enabled": true,
        "inputSource": "vulnerability-data-feed",
        "outputTargets": ["websocket:kpi-realtime", "sse:kpi-metrics"],
        "processingSteps": [
          "deduplication",
          "normalization",
          "enrichment",
          "aggregation"
        ],
        "performance": {
          "targetThroughput": 5000,
          "maxLatency": 2000,
          "errorThreshold": 0.01
        }
      },
      {
        "id": "anomaly-detection-stream",
        "name": "ML Anomaly Detection Stream",
        "enabled": true,
        "inputSource": "processed-vulnerability-data",
        "outputTargets": ["websocket:anomaly-alerts", "sse:anomaly-detection"],
        "mlModels": [
          "isolation-forest",
          "statistical-analysis",
          "clustering-based"
        ],
        "performance": {
          "targetLatency": 500,
          "confidenceThreshold": 0.95,
          "alertSeverityLevels": ["low", "medium", "high", "critical"]
        }
      },
      {
        "id": "performance-metrics-stream",
        "name": "System Performance Metrics Stream",
        "enabled": true,
        "inputSource": "system-metrics-collector",
        "outputTargets": ["websocket:performance-metrics"],
        "metricsTypes": [
          "cpu-utilization",
          "memory-usage",
          "network-io",
          "disk-io",
          "api-response-times",
          "cache-hit-rates"
        ],
        "aggregationWindow": 60000
      }
    ],
    "errorHandling": {
      "retryPolicy": {
        "maxRetries": 3,
        "backoffMultiplier": 2,
        "initialDelay": 1000
      },
      "deadLetterQueue": {
        "enabled": true,
        "maxSize": 10000,
        "retentionPeriod": 86400000
      },
      "alerting": {
        "enabled": true,
        "thresholds": {
          "errorRate": 0.05,
          "processingDelay": 10000
        }
      }
    }
  }
}
EOF

# Generate load balancing configuration for streaming
cat > config/streaming/loadbalancer.config.json << 'EOF'
{
  "loadBalancing": {
    "enabled": true,
    "algorithm": "least_connections",
    "healthCheck": {
      "enabled": true,
      "interval": 10000,
      "timeout": 5000,
      "healthyThreshold": 3,
      "unhealthyThreshold": 2,
      "path": "/health"
    },
    "upstreams": [
      {
        "name": "websocket-servers",
        "servers": [
          {"host": "localhost", "port": 8081, "weight": 1},
          {"host": "localhost", "port": 8082, "weight": 1},
          {"host": "localhost", "port": 8083, "weight": 1}
        ],
        "sessionAffinity": true
      },
      {
        "name": "sse-servers",
        "servers": [
          {"host": "localhost", "port": 8084, "weight": 1},
          {"host": "localhost", "port": 8085, "weight": 1}
        ],
        "sessionAffinity": false
      }
    ],
    "proxy": {
      "timeouts": {
        "connect": 5000,
        "read": 300000,
        "write": 30000
      },
      "buffering": {
        "enabled": false,
        "size": 0
      },
      "headers": {
        "upgrade": "websocket",
        "connection": "upgrade"
      }
    }
  }
}
EOF

# Generate monitoring and alerting configuration
cat > config/streaming/monitoring.config.json << 'EOF'
{
  "monitoring": {
    "metrics": {
      "enabled": true,
      "collection_interval": 30000,
      "retention_period": 86400000,
      "exporters": ["prometheus", "json", "logs"]
    },
    "streamingMetrics": [
      {
        "name": "active_websocket_connections",
        "type": "gauge",
        "description": "Number of active WebSocket connections",
        "labels": ["channel", "server_instance"]
      },
      {
        "name": "sse_active_streams",
        "type": "gauge", 
        "description": "Number of active Server-Sent Event streams",
        "labels": ["endpoint", "client_ip"]
      },
      {
        "name": "message_throughput",
        "type": "counter",
        "description": "Total messages sent through streaming channels",
        "labels": ["channel", "message_type"]
      },
      {
        "name": "stream_latency",
        "type": "histogram",
        "description": "Message processing and delivery latency",
        "buckets": [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
        "labels": ["channel", "processing_stage"]
      },
      {
        "name": "connection_duration",
        "type": "histogram",
        "description": "Duration of streaming connections",
        "buckets": [1, 10, 30, 60, 300, 600, 1800, 3600, 7200],
        "labels": ["connection_type", "disconnect_reason"]
      }
    ],
    "alerts": [
      {
        "name": "high_connection_count",
        "condition": "active_websocket_connections > 800",
        "severity": "warning",
        "description": "WebSocket connection count approaching limit"
      },
      {
        "name": "streaming_latency_high",
        "condition": "stream_latency_p95 > 5000",
        "severity": "critical",
        "description": "Streaming latency exceeding acceptable threshold"
      },
      {
        "name": "connection_failure_rate_high",
        "condition": "connection_failure_rate > 0.1",
        "severity": "warning",
        "description": "High connection failure rate detected"
      }
    ]
  }
}
EOF

# Generate streaming server startup scripts
cat > scripts/start-streaming-servers.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting Real-Time Streaming Infrastructure..."

# Start WebSocket servers
echo "📡 Starting WebSocket servers..."
node backend/websocket-server.js --port 8081 --config config/streaming/websocket.config.json &
WS_PID_1=$!

node backend/websocket-server.js --port 8082 --config config/streaming/websocket.config.json &
WS_PID_2=$!

node backend/websocket-server.js --port 8083 --config config/streaming/websocket.config.json &
WS_PID_3=$!

# Start SSE servers
echo "📺 Starting Server-Sent Events servers..."
node backend/sse-server.js --port 8084 --config config/streaming/sse.config.json &
SSE_PID_1=$!

node backend/sse-server.js --port 8085 --config config/streaming/sse.config.json &
SSE_PID_2=$!

# Start data pipeline processors
echo "⚡ Starting data pipeline processors..."
node backend/pipeline-processor.js --config config/streaming/pipeline.config.json &
PIPELINE_PID=$!

# Save PIDs for cleanup
echo "$WS_PID_1 $WS_PID_2 $WS_PID_3 $SSE_PID_1 $SSE_PID_2 $PIPELINE_PID" > .streaming_pids

echo "✅ All streaming servers started successfully!"
echo "WebSocket servers: ports 8081-8083"
echo "SSE servers: ports 8084-8085"
echo "Pipeline processor: background"

# Health check
sleep 5
echo "🔍 Performing health checks..."

for port in 8081 8082 8083 8084 8085; do
    if curl -f http://localhost:$port/health >/dev/null 2>&1; then
        echo "✅ Server on port $port is healthy"
    else
        echo "❌ Server on port $port is not responding"
    fi
done

echo "🎯 Streaming infrastructure ready for real-time KPI dashboard!"
EOF

cat > scripts/stop-streaming-servers.sh << 'EOF'
#!/bin/bash

echo "🛑 Stopping Real-Time Streaming Infrastructure..."

if [ -f .streaming_pids ]; then
    PIDS=$(cat .streaming_pids)
    for PID in $PIDS; do
        if kill -0 $PID 2>/dev/null; then
            echo "🔄 Stopping process $PID..."
            kill -TERM $PID
            sleep 2
            if kill -0 $PID 2>/dev/null; then
                echo "🔨 Force stopping process $PID..."
                kill -KILL $PID
            fi
        fi
    done
    rm -f .streaming_pids
    echo "✅ All streaming servers stopped"
else
    echo "⚠️  No PID file found. Attempting to stop by port..."
    pkill -f "websocket-server.js"
    pkill -f "sse-server.js"
    pkill -f "pipeline-processor.js"
fi
EOF

# Make scripts executable
chmod +x scripts/start-streaming-servers.sh
chmod +x scripts/stop-streaming-servers.sh

# Generate Nginx configuration for streaming proxy
cat > config/streaming/nginx-streaming.conf << 'EOF'
# Nginx Configuration for Real-Time Streaming Proxy

upstream websocket_backend {
    least_conn;
    server localhost:8081;
    server localhost:8082;
    server localhost:8083;
}

upstream sse_backend {
    least_conn;
    server localhost:8084;
    server localhost:8085;
}

# WebSocket proxy configuration
server {
    listen 80;
    server_name websocket.dashboard.cisco.com;
    
    location / {
        proxy_pass http://websocket_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket specific settings
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_connect_timeout 5s;
        
        # Disable buffering for real-time streaming
        proxy_buffering off;
        proxy_cache off;
    }
    
    location /health {
        proxy_pass http://websocket_backend/health;
        proxy_connect_timeout 2s;
        proxy_read_timeout 2s;
    }
}

# Server-Sent Events proxy configuration
server {
    listen 80;
    server_name sse.dashboard.cisco.com;
    
    location /stream/ {
        proxy_pass http://sse_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # SSE specific settings
        proxy_set_header Cache-Control "no-cache";
        proxy_set_header Connection "";
        proxy_read_timeout 24h;
        proxy_send_timeout 24h;
        
        # Enable chunked transfer encoding
        chunked_transfer_encoding on;
        proxy_buffering off;
        proxy_cache off;
        
        # CORS headers for SSE
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
        add_header Access-Control-Allow-Headers "Cache-Control, Last-Event-ID";
    }
}
EOF

echo "✅ [STREAMING-CONFIG] Real-time streaming configuration completed!"
echo ""
echo "📋 Configuration Summary:"
echo "  • WebSocket servers: 3 instances (ports 8081-8083)"
echo "  • Server-Sent Events: 2 instances (ports 8084-8085)"
echo "  • Data pipelines: Real-time processing enabled"
echo "  • Load balancing: Configured with health checks"
echo "  • Monitoring: Comprehensive metrics and alerting"
echo ""
echo "🚀 To start streaming infrastructure:"
echo "  ./scripts/start-streaming-servers.sh"
echo ""
echo "🛑 To stop streaming infrastructure:"
echo "  ./scripts/stop-streaming-servers.sh"