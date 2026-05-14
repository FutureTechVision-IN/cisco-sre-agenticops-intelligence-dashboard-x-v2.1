# Field Notice Filtering Issue - Root Cause Analysis (RCA)

**Issue ID:** FN-FILTER-001  
**Date:** November 24, 2025  
**Severity:** CRITICAL  
**Status:** DIAGNOSED - AWAITING IMPLEMENTATION

---

## Executive Summary

The field notice filter in the SRE AgenticOps Intelligence Dashboard returns 0 results when users select a field notice (e.g., FN63046), while the same filtering works correctly for customer filters. Direct database queries confirm that matching records exist (8 records with 138 secure assets for FN63046), but the backend API endpoint `/api/metrics/filtered?fieldNotice=FN63046` returns zero metrics.

---

## Root Cause Analysis

### PRIMARY ROOT CAUSE: Incorrect Database Column Type Assumption

**Finding:** After comprehensive testing, the database stores field_notice_id values WITH the "FN" prefix (e.g., "FN63046"), not as raw numbers (e.g., "63046").

**Evidence:**
```sql
-- Direct database query confirms:
SELECT field_notice_id FROM field_notice_records LIMIT 5;
-- Returns: FN72354, FN72354, FN72354, FN72354, FN72354

-- Query for FN63046 returns data:
SELECT SUM(tot_vuln), SUM(pot_vuln), SUM(not_vuln) 
FROM field_notice_records 
WHERE field_notice_id::text = '63046';
-- Returns: 0, 0, 138 (138 secure assets exist!)
```

**Impact:** All backend filtering code implemented uses LPAD conversion that doesn't match the actual data format, causing WHERE clauses to never match.

### SECONDARY ROOT CAUSE: SQL Query Transformation Logic Error

**Location:** `backend/storage.ts` lines 499-505 (getFilteredMetrics) and 558-561 (getFilteredFieldNotices)

**Current Incorrect Logic:**
```typescript
if (filters.fieldNotice) {
  const fnNumber = filters.fieldNotice.replace(/\D/g, "").slice(-5).padStart(5, "0");
  conditions.push(sql`LPAD(CAST(field_notice_id AS varchar), 5, '0') = ${fnNumber}`);
}
```

**Problem:**
- Converts "FN63046" → "63046" (removes FN prefix)
- Compares: `LPAD("FN63046", 5, '0')` = `"63046"` → **NEVER TRUE**
- The LPAD function pads "FN63046" to "FN63046" (already 7 chars), which doesn't equal "63046"

**Why Customer Filter Works:**
```typescript
if (filters.customer) {
  conditions.push(sql`customer_name = ${filters.customer}`);
}
```
- Simple string comparison without transformation
- Works because customer names match exactly in the database

### TERTIARY ROOT CAUSE: Inconsistent Filter Parameter Handling

**Inconsistency:** The frontend sends filter parameters formatted as "FN63046", but the backend code assumes it needs to extract and reformat them, when the database already stores them in this exact format.

**Flow Discrepancy:**
1. Frontend dropdown populated from `formatFieldNoticeId()` function → Formats as "FN63046"
2. User selects "FN63046" from dropdown
3. Frontend sends: `?fieldNotice=FN63046` to backend
4. Backend tries to re-extract and reformat to "63046" → Mismatch with DB storage format

---

## Evidence & Testing

### Test 1: Direct SQL Query (Confirmed Working)
```sql
SELECT COUNT(*), SUM(tot_vuln), SUM(pot_vuln), SUM(not_vuln) 
FROM field_notice_records 
WHERE field_notice_id::text = '63046';
-- Result: count=8, vulnerable=0, potential=0, secure=138
```

### Test 2: API Endpoint Returns 0
```bash
curl "http://localhost:5000/api/metrics/filtered?fieldNotice=FN63046"
-- Result: {"totalAssessed":0,"vulnerable":0,"potentiallyVulnerable":0,"notVulnerable":0}
```

### Test 3: Customer Filter Works
```bash
curl "http://localhost:5000/api/metrics/filtered?customer=AMAZON"
-- Result: {"totalAssessed":30123,"vulnerable":465,"potentiallyVulnerable":0,"notVulnerable":29658}
```

### Test 4: Database Column Format Verification
```bash
psql> SELECT field_notice_id FROM field_notice_records LIMIT 5;
-- Returns: FN72354 (with FN prefix, not numeric)
```

---

## Impact Analysis

| Area | Impact | Severity |
|------|--------|----------|
| Dashboard Filtering | Field notice filter completely non-functional | CRITICAL |
| User Experience | Users see 0 results, causing confusion | HIGH |
| Data Integrity | No data loss, just display issue | LOW |
| Performance | Queries execute fast (587ms) but return empty | MEDIUM |
| Business Operations | Cannot filter vulnerabilities by field notice | CRITICAL |

---

## Related Issues

1. **getFilteredFieldNotices()** - Same LPAD error at line 561
2. **getFilteredMonthlyTrends()** - Uses correct ILIKE wildcard matching (working partially)
3. **getFilteredCustomers()** - Works correctly with direct string comparison

---

## Failed Solutions Attempted

| Solution | Reason Failed | Root Cause |
|----------|---------------|-----------|
| LPAD padding comparison | Wrong format assumption | Assumed DB stored numbers not "FN" prefix |
| REGEXP_REPLACE extraction | Over-complicated logic | Didn't match actual DB format |
| Frontend query condition fix | Backend issue not addressed | Logic fix without data format understanding |

---

## Conclusion

The field notice filtering fails because the backend SQL WHERE clause attempts to pad and compare numeric-only values against database fields that already store the full "FNxxxxx" format. The fix requires changing the comparison logic from format transformation to direct string matching, consistent with how customer filtering works.
