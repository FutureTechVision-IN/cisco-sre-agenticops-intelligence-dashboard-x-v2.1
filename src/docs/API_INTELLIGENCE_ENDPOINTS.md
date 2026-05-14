# Python AI Engine - Complete API Reference

## Base URL
```
http://localhost:5001
```

## Authentication
Currently no authentication required (secured by network isolation).

## Response Format
All responses include a `status` field indicating success or error.

---

## Core ML Endpoints

### 1. ARIMA Forecasting
```
POST /api/ml/forecast
```

**Request:**
```json
{
  "data": [100, 120, 150, 180, 200],
  "periods": 30,
  "method": "arima"
}
```

**Response:**
```json
{
  "status": "success",
  "method": "ARIMA(1,1,1)",
  "predictions": [220, 240, 255, ...],
  "lower_bound": [180, 195, 210, ...],
  "upper_bound": [260, 285, 300, ...],
  "confidence_level": 0.95,
  "aic": 245.67,
  "bic": 250.45,
  "periods": 30
}
```

---

### 2. Anomaly Detection
```
POST /api/ml/anomaly-detection
```

**Request:**
```json
{
  "data_points": [
    {"value": 100, "score": 50},
    {"value": 5000, "score": 45},
    {"value": 110, "score": 52}
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "total_points": 3,
  "anomalies_detected": 1,
  "anomalies": [
    {
      "index": 1,
      "score": 0.92,
      "severity": "critical",
      "values": {"value": 5000, "score": 45}
    }
  ],
  "contamination_rate": 0.05
}
```

---

### 3. Risk Assessment
```
POST /api/ml/risk-assessment
```

**Request:**
```json
{
  "vulnerable": 9604318,
  "potentially_vulnerable": 40872961,
  "total": 361998616
}
```

**Response:**
```json
{
  "status": "success",
  "risk_score": 15.2,
  "risk_level": "LOW",
  "recommendation": "Monitor and maintain protection",
  "vulnerable_ratio": 0.0265,
  "potentially_vulnerable_ratio": 0.113,
  "confidence": 0.85
}
```

---

### 4. NLP Analysis
```
POST /api/ml/nlp-analysis
```

**Request:**
```json
{
  "text": "Critical security vulnerability in Cisco IOS affecting Nexus switches"
}
```

**Response:**
```json
{
  "status": "success",
  "method": "NLP Keyword Analysis",
  "severity": "critical",
  "urgency_score": 95,
  "affected_components": ["networking", "security"],
  "text_length": 95,
  "confidence": 0.78
}
```

---

## Advanced Intelligence Endpoints

### 5. Vulnerability Trend Analysis
```
POST /api/ml/vulnerability-trend
```

**Request:**
```json
{
  "vulnerable_trend": [2141893, 2891555, 3903599, 5269859, 7114310, 9604318]
}
```

**Response:**
```json
{
  "status": "success",
  "trend_direction": "INCREASING",
  "trend_color": "red",
  "average_velocity": 1495605,
  "average_acceleration": 987233,
  "acceleration_status": "ACCELERATING",
  "trend_strength": 85.4,
  "forecast_next_period": 11099923,
  "confidence": 0.82
}
```

---

### 6. Customer Risk Concentration
```
POST /api/ml/customer-risk-concentration
```

**Request:**
```json
{
  "customer_data": [
    {
      "name": "Tech Industries",
      "vulnerable": 2000000,
      "potentially_vulnerable": 5000000
    },
    {
      "name": "Enterprise Ltd",
      "vulnerable": 1000000,
      "potentially_vulnerable": 3000000
    }
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "total_customers": 873,
  "total_risk": 36542000,
  "top_risk_customers": [...],
  "concentration_ratio": 78.5,
  "herfindahl_index": 0.082,
  "pareto_customers": 52,
  "concentration_level": "HIGH"
}
```

---

### 7. Field Notice Impact
```
POST /api/ml/field-notice-impact
```

**Request:**
```json
{
  "field_notices": [
    {
      "id": "FN12345",
      "title": "Critical IOS Vulnerability",
      "vulnerable_count": 50000,
      "potentially_vulnerable_count": 150000,
      "customer_count": 42,
      "severity": "critical"
    }
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "total_field_notices": 483,
  "total_impact": 40909319,
  "top_impact_notices": [...],
  "high_impact_count": 23,
  "medium_impact_count": 68,
  "low_impact_count": 392,
  "average_impact": 84763,
  "impact_distribution": {"high": 23, "medium": 68, "low": 392}
}
```

---

### 8. Remediation Velocity
```
POST /api/ml/remediation-velocity
```

**Request:**
```json
{
  "historical_data": [
    {"vulnerable": 5000000},
    {"vulnerable": 4800000},
    {"vulnerable": 4500000},
    {"vulnerable": 4200000},
    {"vulnerable": 3900000},
    {"vulnerable": 3600000}
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "current_vulnerable": 3600000,
  "average_remediation_rate": 280000,
  "remediation_status": "ON_TRACK",
  "projected_periods_to_clear": 12.86,
  "total_remediated": 1400000,
  "remediation_efficiency_percent": 28.0,
  "velocity_trend": "STABLE",
  "confidence": 0.80
}
```

---

### 9. Temporal Pattern Detection
```
POST /api/ml/temporal-patterns
```

**Request:**
```json
{
  "time_series_data": [
    {"value": 100},
    {"value": 120},
    {"value": 150},
    {"value": 95},
    {"value": 110},
    {"value": 140}
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "seasonality_strength": "MODERATE",
  "coefficient_of_variation": 0.25,
  "autocorrelation_lag4": 0.68,
  "peak_periods": [2, 5, 8],
  "valley_periods": [0, 3, 6],
  "mean_value": 118.5,
  "std_deviation": 29.6,
  "pattern_type": "SEASONAL",
  "confidence": 0.75
}
```

---

### 10. Predictive Intelligence Summary
```
POST /api/ml/predictive-intelligence
```

**Request:**
```json
{
  "metrics": {
    "vulnerable": 9604318,
    "potentially_vulnerable": 40872961,
    "total": 361998616,
    "trend_data": [2141893, 2891555, 3903599, 5269859, 7114310, 9604318]
  }
}
```

**Response:**
```json
{
  "status": "success",
  "risk_level": "LOW",
  "vulnerability_ratio_percent": 2.65,
  "potentially_vulnerable_ratio_percent": 11.3,
  "trend_direction": "DETERIORATING",
  "key_insights": [
    "Vulnerability trend is worsening - increase remediation efforts"
  ],
  "overall_health_score": 73.5,
  "recommendation_priority": "STANDARD"
}
```

---

## Batch Processing

### Batch Forecast
```
POST /api/ml/batch-forecast
```

**Request:**
```json
[
  {"data": [100, 120, 150], "periods": 30, "method": "arima"},
  {"data": [200, 210, 220], "periods": 30, "method": "exponential_smoothing"}
]
```

**Response:**
```json
{
  "status": "success",
  "results": [...]
}
```

---

## Health Checks

### Service Health
```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "sre-agenticops-ai-engine",
  "version": "1.0.0"
}
```

---

## Error Handling

### Error Response Format
```json
{
  "status": "error",
  "message": "Descriptive error message"
}
```

### Common Errors
- `Need at least 3 data points` - Insufficient data for analysis
- `No customer data provided` - Empty dataset
- `Forecast failed` - Invalid forecast parameters

---

## Rate Limiting
Currently disabled. In production, recommend limiting to 100 requests/minute per client.

---

**API Version**: 1.0.0  
**Last Updated**: November 23, 2025
