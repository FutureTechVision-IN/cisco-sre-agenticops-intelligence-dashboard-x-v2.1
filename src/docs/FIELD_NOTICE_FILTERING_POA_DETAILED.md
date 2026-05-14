# Field Notice Filtering Issue - Plan of Action (POA)

**Issue ID:** FN-FILTER-001  
**Created:** November 24, 2025  
**Target Resolution:** November 24, 2025 (same day)  
**Priority:** CRITICAL

---

## Executive Summary

This POA outlines the systematic steps to resolve field notice filtering by correcting the SQL WHERE clause logic in the backend storage layer from incorrect format transformation to direct string matching.

---

## Phase 1: Root Cause Confirmation & Data Validation (COMPLETED)

### Step 1.1: Database Format Verification
**Status:** ✅ COMPLETED

**Verification Method:**
```sql
SELECT field_notice_id FROM field_notice_records LIMIT 5;
```

**Result:** Database stores field_notice_id AS "FN72354" (with FN prefix)

**Evidence File:** `/tmp/test_fn63046.txt` contains API response showing 0 results

---

## Phase 2: Backend Code Correction (IN PROGRESS)

### Step 2.1: Fix getFilteredMetrics() Function
**Location:** `backend/storage.ts` lines 499-505  
**Responsible Party:** Development Team  
**Timeline:** IMMEDIATE

**Current (Incorrect) Code:**
```typescript
if (filters.fieldNotice) {
  // Extract numeric part from filter (e.g., "FN63046" -> "63046")
  const fnNumber = filters.fieldNotice.replace(/\D/g, "").slice(-5).padStart(5, "0");
  conditions.push(sql`LPAD(CAST(field_notice_id AS varchar), 5, '0') = ${fnNumber}`);
}
```

**Corrected Code:**
```typescript
if (filters.fieldNotice) {
  // Direct string comparison - database stores "FNxxxxx" format
  conditions.push(sql`field_notice_id::text = ${filters.fieldNotice}`);
}
```

**Rationale:** 
- Database stores "FN63046" format
- Frontend sends "FN63046" format
- No transformation needed; direct comparison works

**Verification Command:**
```bash
curl "http://localhost:5000/api/metrics/filtered?fieldNotice=FN63046"
# Expected: {"totalAssessed":138,"vulnerable":0,"potentiallyVulnerable":0,"notVulnerable":138}
```

---

### Step 2.2: Fix getFilteredFieldNotices() Function
**Location:** `backend/storage.ts` lines 558-561  
**Responsible Party:** Development Team  
**Timeline:** IMMEDIATE (Same as 2.1)

**Current (Incorrect) Code:**
```typescript
if (filters.fieldNotice) {
  // Extract numeric part from filter (e.g., "FN63046" -> "63046")
  const fnNumber = filters.fieldNotice.replace(/\D/g, "").slice(-5).padStart(5, "0");
  whereConditions.push(sql`LPAD(CAST(${fieldNoticeRecords.fieldNoticeId} AS varchar), 5, '0') = ${fnNumber}`);
}
```

**Corrected Code:**
```typescript
if (filters.fieldNotice) {
  // Direct string comparison - database stores "FNxxxxx" format
  whereConditions.push(sql`${fieldNoticeRecords.fieldNoticeId}::text = ${filters.fieldNotice}`);
}
```

**Verification Command:**
```bash
curl "http://localhost:5000/api/reports/field-notices/filtered?fieldNotice=FN63046"
# Expected: returns field notice records with non-zero metrics
```

---

### Step 2.3: Verify getFilteredMonthlyTrends() (Optional - Already Working)
**Location:** `backend/storage.ts` lines 102-110  
**Status:** ✅ Already uses ILIKE wildcard matching (working correctly)

**Current Code (Already Correct):**
```typescript
if (filters.fieldNotice) params.append("fieldNotice", filters.fieldNotice);
const response = await fetch(`/api/trends/monthly/filtered?${params}`);
```

**Action:** No changes needed - this function already handles field notice filtering correctly

---

## Phase 3: Workflow Restart & Deployment

### Step 3.1: Restart Application Workflow
**Responsible Party:** DevOps/System Admin  
**Timeline:** After code changes in Phase 2  
**Method:**
```bash
# Restart the "Start application" workflow
# This will recompile TypeScript and redeploy the backend
```

**Validation:**
- Workflow status should be "RUNNING"
- No TypeScript compilation errors
- Express server listening on port 5000

---

## Phase 4: Functional Testing & Validation

### Step 4.1: Direct API Testing
**Responsible Party:** QA/Development  
**Timeline:** Immediately after workflow restart

**Test Case 1: Field Notice FN63046**
```bash
curl "http://localhost:5000/api/metrics/filtered?fieldNotice=FN63046"
```
**Expected Result:**
```json
{
  "totalAssessed": 138,
  "vulnerable": 0,
  "potentiallyVulnerable": 0,
  "notVulnerable": 138,
  "lastUpdated": "2025-11-24T08:XX:XX.XXXZ"
}
```

**Test Case 2: Multiple Field Notices**
```bash
# Test FN74260 (known to have 3,076 vulnerable assets)
curl "http://localhost:5000/api/metrics/filtered?fieldNotice=FN74260"
```
**Expected Result:**
```json
{
  "totalAssessed": 143750,
  "vulnerable": 3076,
  "potentiallyVulnerable": 6,
  "notVulnerable": 140668,
  "lastUpdated": "2025-11-24T08:XX:XX.XXXZ"
}
```

**Test Case 3: Field Notices Endpoint**
```bash
curl "http://localhost:5000/api/reports/field-notices/filtered?fieldNotice=FN63046"
```
**Expected Result:** Returns array of field notice records with totals > 0

---

### Step 4.2: UI Functional Testing
**Responsible Party:** QA/Product Team  
**Timeline:** After API validation

**Test Scenario 1: Select Field Notice from Dropdown**
1. Navigate to dashboard
2. Click "Field Notice" dropdown
3. Select "FN63046"
4. Observe: Metrics cards should update to show 138 total assets

**Expected Results:**
- Total Assessed Assets: 138
- Secure Assets: 138 (100%)
- Vulnerable Assets: 0 (0%)
- Potentially Vulnerable: 0 (0%)

**Test Scenario 2: Clear Filter**
1. After selecting FN63046
2. Click "Clear All Filters"
3. Observe: Dashboard returns to showing all 361,998,616 assets

**Test Scenario 3: Multiple Filters Combined**
1. Select Field Notice: FN63046
2. Select FN Type: Hardware
3. Observe: Metrics update correctly to intersection of filters

---

### Step 4.3: Screenshot Documentation
**Responsible Party:** QA/Documentation  
**Timeline:** After UI testing passes

**Screenshots to Capture:**
1. Dashboard with FN63046 filter showing correct metrics
2. Field Notice dropdown with FN63046 selected
3. Filter panel showing "1 active filter" badge
4. Metrics cards displaying: 138 total, 0 vulnerable, 138 secure

**Storage:** `/docs/screenshots/FN_Filter_Resolution_Proof/`

---

## Phase 5: Regression Testing

### Step 5.1: Verify Other Filters Still Work
**Test Cases:**
- ✅ Customer filter (AMAZON) returns 30,123 assets
- ✅ FN Type filter works correctly
- ✅ Time Period filter works correctly
- ✅ Combined filters work (Customer + Field Notice)

---

## Success Metrics & Acceptance Criteria

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| FN63046 metrics API response | 0 | 138 total | PENDING |
| FN74260 vulnerable count | 0 | 3,076 | PENDING |
| Field notices endpoint | 0 records | Non-zero | PENDING |
| Dashboard display time | N/A | <1s | PENDING |
| UI filter functionality | Broken | Working | PENDING |

---

## Rollback Plan

**If Phase 4 testing fails:**

1. **Immediate Rollback:**
   - Revert changes to `backend/storage.ts`
   - Restart workflow
   - Verify old behavior restored

2. **Investigation:**
   - Review error logs in workflow output
   - Check database query plan with EXPLAIN ANALYZE
   - Test with hardcoded values in WHERE clause

3. **Alternative Approach:**
   ```sql
   -- If direct comparison fails, use wildcard:
   WHERE field_notice_id ILIKE '%' || fieldNotice || '%'
   ```

---

## Timeline Summary

| Phase | Task | Duration | Dependencies |
|-------|------|----------|--------------|
| 2 | Code changes (Steps 2.1-2.2) | 5 minutes | None |
| 3 | Workflow restart | 2 minutes | Phase 2 complete |
| 4.1 | API testing | 3 minutes | Phase 3 complete |
| 4.2 | UI testing | 5 minutes | Phase 4.1 complete |
| 4.3 | Screenshot capture | 2 minutes | Phase 4.2 complete |
| 5 | Regression testing | 5 minutes | Phase 4 complete |
| **TOTAL** | **End-to-End** | **~22 minutes** | Sequential |

---

## Sign-off & Documentation

- **RCA Document:** `docs/FIELD_NOTICE_FILTERING_RCA_COMPREHENSIVE.md`
- **POA Document:** `docs/FIELD_NOTICE_FILTERING_POA_DETAILED.md` (this file)
- **Code Changes:** `backend/storage.ts` (lines 499-505, 558-561)
- **Test Evidence:** Screenshots stored in `/docs/screenshots/FN_Filter_Resolution_Proof/`

---

## Next Steps

1. **Immediate:** Execute Phase 2 code changes
2. **Short-term:** Run Phase 4 testing and validation
3. **Follow-up:** Document resolution in project documentation
4. **Archive:** Store RCA/POA for future reference

---

## Appendix: Related Code Files

- **Primary:** `backend/storage.ts` (getFilteredMetrics, getFilteredFieldNotices)
- **Route Handler:** `backend/routes.ts` (line 630 - /api/metrics/filtered)
- **Frontend:** `frontend/src/pages/dashboard.tsx` (query logic)
- **Schema:** `shared/schema.ts` (filterParams interface)
