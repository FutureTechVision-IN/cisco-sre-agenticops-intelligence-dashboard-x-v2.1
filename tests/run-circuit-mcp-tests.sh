#!/usr/bin/env bash
# =============================================================================
# CIRCUIT MCP Intelligence — Automated API Test Runner
# Usage: bash tests/run-circuit-mcp-tests.sh [base_url]
# Default base URL: http://localhost:3000
# =============================================================================
set -euo pipefail

BASE="${1:-http://localhost:3000}/api/circuit"
PASS=0
FAIL=0
SKIP=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}PASS${NC}: $1"; ((PASS++)); }
fail() { echo -e "  ${RED}FAIL${NC}: $1 — expected: $2 | got: $3"; ((FAIL++)); }
skip() { echo -e "  ${YELLOW}SKIP${NC}: $1 — $2"; ((SKIP++)); }

json_get() {
  python3 -c "import sys,json; d=json.load(sys.stdin); print($1)" 2>/dev/null || echo "PARSE_ERROR"
}

echo "============================================================"
echo " CIRCUIT MCP Intelligence — Automated Test Suite"
echo " Target: $BASE"
echo " Date:   $(date)"
echo "============================================================"

# --- Prerequisite: env vars set ---
echo ""
echo "--- Prerequisites ---"
if [[ -z "${CISCO_CIRCUIT_API_KEY:-}" ]]; then
  skip "CISCO_CIRCUIT_API_KEY set" "env var NOT set — some tests will use fallback mode"
else
  pass "CISCO_CIRCUIT_API_KEY set"
fi

if [[ -z "${CISCO_CIRCUIT_WORKFLOW_KEY:-}" ]]; then
  skip "CISCO_CIRCUIT_WORKFLOW_KEY set" "env var NOT set — some tests will use fallback mode"
else
  pass "CISCO_CIRCUIT_WORKFLOW_KEY set"
fi

# --- Authentication ---
echo ""
echo "--- API Key Authentication Tests ---"

STATUS_RESP=$(curl -s "$BASE/keys/status")
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/keys/status")

if [[ "$STATUS_CODE" == "200" ]]; then pass "keys/status returns 200"; else fail "keys/status returns 200" "200" "$STATUS_CODE"; fi

TOTAL_KEYS=$(echo "$STATUS_RESP" | json_get "d.get('keys',{}).get('totalKeys',0)")
if [[ "$TOTAL_KEYS" == "2" ]]; then pass "totalKeys equals 2"; else fail "totalKeys equals 2" "2" "$TOTAL_KEYS"; fi

VALIDATE_RESP=$(curl -s "$BASE/keys/validate")
CX_VALID=$(echo "$VALIDATE_RESP" | python3 -c "
import sys,json
d=json.load(sys.stdin)
keys = d.get('keys',[])
cx = next((k for k in keys if k.get('domain')=='cx'), None)
print(cx.get('structureValid','?') if cx else 'NOT_FOUND')
" 2>/dev/null || echo "PARSE_ERROR")
if [[ "$CX_VALID" == "True" ]]; then pass "CX key structureValid"; else fail "CX key structureValid" "True" "$CX_VALID"; fi

OPS_VALID=$(echo "$VALIDATE_RESP" | python3 -c "
import sys,json
d=json.load(sys.stdin)
keys = d.get('keys',[])
ops = next((k for k in keys if k.get('domain')=='operations'), None)
print(ops.get('structureValid','?') if ops else 'NOT_FOUND')
" 2>/dev/null || echo "PARSE_ERROR")
if [[ "$OPS_VALID" == "True" ]]; then pass "Operations key structureValid"; else fail "Operations key structureValid" "True" "$OPS_VALID"; fi

# --- ML Pipeline ---
echo ""
echo "--- ML Pipeline Tests ---"

PIPELINE_RESP=$(curl -s "$BASE/pipeline/run")

PIPE_SUCCESS=$(echo "$PIPELINE_RESP" | json_get "str(d.get('success',False))")
if [[ "$PIPE_SUCCESS" == "True" ]]; then pass "Pipeline returns success:true"; else fail "Pipeline returns success" "True" "$PIPE_SUCCESS"; fi

STAGE_COUNT=$(echo "$PIPELINE_RESP" | json_get "len(d.get('pipelineStages',[]))")
if [[ "$STAGE_COUNT" == "6" ]]; then pass "Pipeline has 6 stages"; else fail "Pipeline has 6 stages" "6" "$STAGE_COUNT"; fi

# Cache test (second call)
PIPELINE_RESP2=$(curl -s "$BASE/pipeline/run")
CACHED=$(echo "$PIPELINE_RESP2" | json_get "str(d.get('cached',False))")
if [[ "$CACHED" == "True" ]]; then pass "Second pipeline call is cached"; else fail "Second pipeline call is cached" "True" "$CACHED"; fi

# --- Insights ---
echo ""
echo "--- Insights & Analytics Tests ---"

INSIGHTS_RESP=$(curl -s "$BASE/insights")
INSIGHTS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/insights")

if [[ "$INSIGHTS_CODE" == "200" ]]; then pass "insights returns 200"; else fail "insights returns 200" "200" "$INSIGHTS_CODE"; fi

HAS_RISK=$(echo "$INSIGHTS_RESP" | json_get "'compositeScore' in json.dumps(d)")
if [[ "$HAS_RISK" == "True" ]]; then pass "insights has riskAssessment.compositeScore"; else fail "insights has compositeScore" "True" "$HAS_RISK"; fi

PRED_COUNT=$(echo "$INSIGHTS_RESP" | json_get "len(d.get('predictions',[]))")
if [[ "$PRED_COUNT" -ge 3 ]] 2>/dev/null; then pass "insights has >= 3 predictions"; else fail "insights has >= 3 predictions" ">=3" "$PRED_COUNT"; fi

# --- Monitoring ---
echo ""
echo "--- Monitoring Tests ---"

MON_RESP=$(curl -s "$BASE/monitoring")
HAS_TOTAL=$(echo "$MON_RESP" | json_get "'totalCalls' in d")
if [[ "$HAS_TOTAL" == "True" ]]; then pass "monitoring has totalCalls"; else fail "monitoring has totalCalls" "True" "$HAS_TOTAL"; fi

HOURLY=$(echo "$MON_RESP" | json_get "len(d.get('hourlyDistribution',[]))")
if [[ "$HOURLY" == "24" ]]; then pass "monitoring has 24 hourly buckets"; else fail "monitoring has 24 hourly buckets" "24" "$HOURLY"; fi

# --- Security ---
echo ""
echo "--- Security Tests ---"

KEY_LEAK=$(curl -s "$BASE/keys/validate" | grep -c "egai-prd-" 2>/dev/null || echo "0")
if [[ "$KEY_LEAK" == "0" ]]; then pass "No raw keys in /keys/validate response"; else fail "No raw keys in response" "0 matches" "$KEY_LEAK matches"; fi

KEY_LEAK2=$(curl -s "$BASE/insights" | grep -c "egai-prd-" 2>/dev/null || echo "0")
if [[ "$KEY_LEAK2" == "0" ]]; then pass "No raw keys in /insights response"; else fail "No raw keys in /insights response" "0 matches" "$KEY_LEAK2 matches"; fi

# --- Performance ---
echo ""
echo "--- Performance Tests ---"

START_MS=$(($(date +%s%N)/1000000))
curl -s "$BASE/insights" > /dev/null
END_MS=$(($(date +%s%N)/1000000))
LATENCY=$((END_MS - START_MS))
if [[ $LATENCY -lt 200 ]]; then pass "insights cached latency < 200ms (${LATENCY}ms)"; else fail "insights cached latency < 200ms" "<200ms" "${LATENCY}ms"; fi

# --- Summary ---
echo ""
echo "============================================================"
echo " RESULTS: ${PASS} PASSED | ${FAIL} FAILED | ${SKIP} SKIPPED"
TOTAL=$((PASS + FAIL))
echo " Total run: $TOTAL tests"
echo "============================================================"

if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}ALL TESTS PASSED${NC}"
  exit 0
else
  echo -e "${RED}${FAIL} TEST(S) FAILED${NC}"
  exit 1
fi
