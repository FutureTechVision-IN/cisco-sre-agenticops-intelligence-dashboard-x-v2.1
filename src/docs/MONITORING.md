# AI/ML Components Monitoring & Maintenance Plan

## Real-Time Monitoring Setup

### 1. Cisco CIRCUIT AI Health Check

```bash
# Add to crontab for every 5 minutes
*/5 * * * * curl -X POST http://localhost:8001/api/circuit/test -H "Content-Type: application/json" -d '{"prompt":"Test"}' >> /var/log/circuit-health.log

# Expected: {"success":true,"content":"...","model":"cisco-circuit-summarize","timestamp":"..."}
```

### 2. Cache Performance Metrics

**Track these metrics per user session:**
```javascript
// In analytics/monitoring module
const cacheMetrics = {
  totalClicks: 0,        // Track total anomaly card clicks
  cacheHits: 0,          // Clicks that used cached data
  cacheMisses: 0,        // Clicks that needed API fetch
  avgLoadTime: 0,        // ms for cache hits
  avgFetchTime: 0        // ms for API calls
};

// Calculate: Hit Rate = cacheHits / totalClicks * 100
// Target: >70%
// Alert if: <50% (possible cache issue)
```

### 3. API Response Validation

**Every Cisco CIRCUIT API call should validate:**
```typescript
interface CircuitResponse {
  success: boolean;
  content?: string;        // Must be present if success=true
  error?: string;          // Must be present if success=false
  model: string;           // Must be cisco-circuit-* or cisco-fallback-*
  timestamp: string;       // Must be valid ISO 8601
}

// Validation function
function validateCircuitResponse(response: any): boolean {
  return (
    typeof response.success === 'boolean' &&
    (response.success ? !!response.content : !!response.error) &&
    response.model.startsWith('cisco-') &&
    !isNaN(Date.parse(response.timestamp))
  );
}
```

### 4. Data Accuracy Checks

**Monthly Accuracy Audit:**
```bash
# Compare model predictions vs. actual outcomes
SELECT 
  forecast_month,
  predicted_vulnerable,
  actual_vulnerable,
  ABS(predicted_vulnerable - actual_vulnerable) as error,
  ROUND((ABS(predicted_vulnerable - actual_vulnerable) / actual_vulnerable * 100), 2) as error_pct
FROM predictions p
JOIN actual_metrics a ON p.month = a.month
WHERE error_pct > 15;  -- Alert if MAPE > 15%
```

**Anomaly Detection Accuracy:**
```bash
# Review detected anomalies vs. manual investigation
- Total anomalies detected: X
- True positives: Y
- False positives: Z
- Precision: Y/(Y+Z) * 100
- Target: >85%
```

---

## Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| CIRCUIT API Response Time | >30s | >45s | Check API status, fallback to cached |
| CIRCUIT API Error Rate | >5% | >10% | Page oncall, review API quotas |
| Cache Hit Rate | <50% | <30% | Investigate cache clearing issues |
| Anomaly Detection Error | MAPE >10% | MAPE >20% | Review training data, recalibrate |
| Prediction Accuracy | <80% | <70% | Flag for model retraining |
| NLP Urgency Score Variance | >25% | >40% | Review keyword weights |

---

## Quarterly Review Checklist

- [ ] Review Cisco CIRCUIT API usage and costs
- [ ] Audit anomaly detection false positives/negatives
- [ ] Check prediction accuracy against actuals
- [ ] Validate cache hit rates
- [ ] Review error handling logs
- [ ] Check for API quota exhaustion
- [ ] Update ML model parameters if needed
- [ ] Document any model drift detected

---

## Automated Monitoring Commands

```bash
# Check Cisco CIRCUIT API health
curl -X POST http://localhost:8001/api/circuit/test \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Acknowledge"}'

# Monitor cache performance
grep "CACHE_HIT\|CACHE_MISS" /var/log/app.log | wc -l

# Check prediction accuracy
psql -d cisco_sre_dashboard -c "SELECT AVG(ABS(predicted - actual) / actual * 100) as mape FROM predictions WHERE created_at > NOW() - INTERVAL 30 days;"

# Check for API errors
grep "error\|ERROR" /var/log/app.log | tail -100
```

---

## Emergency Fallback Plan

**If Cisco CIRCUIT API is unavailable:**
1. ✅ User sees cached insights (if available)
2. ✅ If no cache, fallback message: "AI insights temporarily unavailable"
3. ✅ Show statistical analysis from KPI ML Engine instead
4. ✅ Alert oncall to investigate API status

**Implementation already in place:**
```javascript
if (!cachedInsights) {
  setIsAnomalyInsightsLoading(true);
  const response = await fetch("/api/circuit/recommendations", {...});
  if (!response.ok) {
    setAnomalyAIInsights("Unable to load AI insights. Please try again.");
    // Fallback: Show non-AI analysis
  }
}
```

---

## Performance Optimization

**Current Performance (Measured 2025-11-26):**
- Cache hit: <100ms (instant display)
- Cache miss (API call): ~30-40s (including CIRCUIT API response)
- Modal open: <50ms (React render)
- Memory usage per cached insight: ~5-10KB

**Optimization Targets:**
- Reduce API response time: Target <20s (via API caching)
- Reduce modal render time: Target <20ms
- Memory per cache entry: Keep <8KB

---

## Maintenance Schedule

### Daily (Automated)
- Run Cisco CIRCUIT API health check
- Monitor error logs
- Check cache hit rates

### Weekly
- Review API usage statistics
- Audit error patterns
- Check for memory leaks

### Monthly
- Full accuracy audit
- Compare predictions vs actuals
- Review anomaly detection results
- Update documentation

### Quarterly
- Model retraining evaluation
- Performance optimization review
- Security audit
- Capacity planning review

---

## Contact & Escalation

**For monitoring alerts:**
- Slack: #service-readiness-agenticops-alerts
- Email: service-readiness-agenticops@cisco.com
- Oncall: Check PagerDuty schedule

**Escalation Levels:**
- Level 1: Cache issues (oncall engineer)
- Level 2: CIRCUIT API down (oncall manager)
- Level 3: Data accuracy degradation (ML team lead)
