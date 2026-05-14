# Field Notice Filtering Issue - Root Cause Analysis & Plan of Action

**Date:** November 24, 2025  
**Issue:** Field notice filtering returns 0 results when user selects any field notice from dropdown  
**Status:** Under Resolution  
**Author:** SRE Dashboard Development Team

---

## EXECUTIVE SUMMARY

Users cannot filter dashboard metrics by field notice. When selecting a field notice (e.g., "FN63398") from the dropdown, all KPI metrics display 0 regardless of actual data availability. The root cause is a **data format mismatch**: the dropdown displays formatted field notice IDs that don't match the actual database-stored values due to ID transformation logic.

---

## ROOT CAUSE ANALYSIS (RCA)

### Problem Statement
- **Symptom:** All metrics show 0 when field notice filter is applied
- **Impact:** Dashboard filtering feature is non-functional; users cannot analyze data by specific field notices
- **Severity:** CRITICAL (core functionality broken)
- **Affected Components:** 
  - Frontend: FilterPanel dropdown selection
  - Backend: `getFilteredMetrics()`, `getFilteredFieldNotices()`, `getFilteredCustomers()` functions
  - Data Layer: field_notice_records table in PostgreSQL

### Investigation Findings

#### 1. **Database Data Format Issue**
- Database stores 956 distinct field_notice_id values across 577,603 records
- **Two formats coexist**:
  - 446,535 records with "FN" prefix stored: `field_notice_id = "FN70597"`
  - 131,068 records without prefix stored: `field_notice_id = "62840"`
- No consistent naming convention across the dataset

#### 2. **ID Formatting Function Mismatch**
- `formatFieldNoticeId()` function (storage.ts:7-24) transforms ALL IDs to `"FNxxxxx"` format:
  - Extracts digits: `"FN70597"` → `"70597"`
  - Takes last 5 digits: `"12370597"` → `"70597"`
  - Pads to 5 digits: `"123"` → `"00123"`
  - Adds prefix: `"70597"` → `"FN70597"`
- This function is used for DROPDOWN DISPLAY only

#### 3. **The Filtering Logic Breakdown**
- **Process Flow:**
  1. Backend calls `getFilterOptions()` to populate dropdown
  2. Raw IDs from DB are formatted using `formatFieldNoticeId()` for display
  3. User selects formatted ID from dropdown (e.g., "FN63398")
  4. Frontend sends this formatted ID to filter API
  5. Backend filtering attempts to match formatted ID against database
  6. **FAILURE POINT:** Formatted ID "FN63398" doesn't exist as-is in database
     - DB may have "63398" (plain) OR "FN63398" (prefixed) OR "163398" (raw, formats to FN63398)
     - The last 5 digits logic can create ambiguous matches

#### 4. **Previous Fix Attempts and Why They Failed**
- **Attempt 1:** Stripped "FN" and used `eq()` operator
  - ❌ Failed because 446K records are stored WITH "FN" prefix
- **Attempt 2:** Used SQL `SUBSTRING()` in Drizzle template
  - ❌ Failed because Drizzle SQL templates don't properly handle dynamic string functions
- **Attempt 3:** Used `IN` clause for both formats `IN ('FN63398', '63398')`
  - ❌ Failed because formatted ID may not match either stored format exactly

#### 5. **Data Integrity Root Cause**
The fundamental issue: **The formatted display ID is not guaranteed to have a corresponding raw ID in the database**

Example scenario:
- Raw DB ID: `"9663398"` (7 digits)
- Formatted for display: Takes last 5 → `"63398"` → displays as `"FN63398"`
- But if only `"9663398"` exists (not `"63398"` alone), filtering for `"FN63398"` fails

---

## CONTRIBUTING FACTORS

### Factor 1: Inconsistent Database Storage
- **Impact:** HIGH
- **Cause:** Data imported from multiple sources with different ID formatting standards
- **Why it matters:** Prevents simple string matching

### Factor 2: Lossy Formatting Function
- **Impact:** HIGH  
- **Cause:** `formatFieldNoticeId()` uses `slice(-5)` which loses information about the full ID
- **Why it matters:** Multiple different raw IDs can format to the same display ID, creating ambiguity

### Factor 3: Mismatch Between Display and Filter Logic
- **Impact:** CRITICAL
- **Cause:** Display uses formatted IDs but filter logic tries to match against raw IDs
- **Why it matters:** The two operations don't share the same reference point

### Factor 4: No Reverse Mapping
- **Impact:** MEDIUM
- **Cause:** No mechanism to reverse a formatted ID back to its original database value
- **Why it matters:** Once formatted, ID cannot be reliably traced back to source records

---

## SOLUTION APPROACH

### Core Fix Strategy: **Format-Based Filtering**

Instead of trying to reverse-engineer formatted IDs, apply the same formatting logic on BOTH sides of the comparison:

1. **Keep display formatting as-is** (use `formatFieldNoticeId()` for dropdown)
2. **Apply same formatting in database query** 
3. **Compare formatted values** instead of raw values
4. **This guarantees consistency** because both undergo identical transformation

### Why This Works
- User selects "FN63398" (formatted for display)
- Backend receives "FN63398"
- Backend formats ALL database `field_notice_id` values the same way
- Backend compares formatted(DB value) == "FN63398"
- Matches any raw ID that formats to "FN63398" (whether it's "63398", "FN63398", "163398", etc.)
- No ambiguity, no data loss

---

## PLAN OF ACTION (POA)

### Phase 1: Code Implementation (Immediate)

#### Step 1.1: Update Backend Filtering Functions
**File:** `backend/storage.ts`  
**Functions to update:**
- `getFilteredMetrics()` (line ~498)
- `getFilteredFieldNotices()` (line ~549)
- `getFilteredCustomers()` (line ~608)

**Changes:**
Replace format-stripping logic with format-comparison logic:

```typescript
if (filters.fieldNotice) {
  // Apply same formatting to database values for comparison
  // This ensures we match any raw ID that formats to the selected value
  conditions.push(
    sql`${sql.raw(`CASE WHEN ${fieldNoticeRecords.fieldNoticeId} ILIKE 'FN%' THEN ${fieldNoticeRecords.fieldNoticeId} ELSE 'FN' || LPAD(SUBSTRING(${fieldNoticeRecords.fieldNoticeId}, -5), 5, '0') END`)} = ${filters.fieldNotice}`
  );
}
```

OR simpler approach using JavaScript:
- Fetch raw IDs that format to the selected formatted ID
- Use those in the IN clause

**Timeline:** 30 minutes  
**Owner:** Backend Developer  
**Success Metric:** Field notice filter returns data > 0 for test case "FN63398"

#### Step 1.2: Test the Fix
**Command:** Test filtered metrics endpoint with field notice parameter
```bash
curl "http://localhost:5000/api/metrics/filtered?fieldNotice=FN62840"
# Expected: Returns metrics with vulnerable/potentiallyVulnerable/notVulnerable > 0
```

**Timeline:** 10 minutes  
**Owner:** QA/Developer  
**Success Metric:** API returns non-zero metric values

#### Step 1.3: Deploy and Verify
**Steps:**
1. Restart application workflow
2. Navigate to dashboard
3. Select field notice from dropdown
4. Verify KPI cards display data
5. Verify Top Field Notices table populates
6. Verify Top Customers by FN table populates

**Timeline:** 5 minutes  
**Owner:** Developer  
**Success Metric:** All UI elements show data instead of 0

### Phase 2: Data Quality Validation (Short-term)

#### Step 2.1: Document Current Data State
**Query:** Count distribution of field notice ID formats
```sql
SELECT 
  COUNT(DISTINCT field_notice_id) as total_unique,
  SUM(CASE WHEN field_notice_id ILIKE 'FN%' THEN 1 ELSE 0 END) as with_fn_prefix,
  SUM(CASE WHEN field_notice_id NOT ILIKE 'FN%' THEN 1 ELSE 0 END) as without_fn_prefix
FROM field_notice_records;
```

**Timeline:** 5 minutes  
**Owner:** Data Engineer

#### Step 2.2: Add Data Validation Test
**Create:** Automated test that validates field notice dropdown can be filtered  
**Test Case:** For each unique formatted field notice in dropdown, verify filtering returns > 0 results  
**Timeline:** 1 hour  
**Owner:** QA

### Phase 3: Long-term Prevention (Future)

#### Step 3.1: Standardize Field Notice IDs (Optional, Data Cleanup)
- Decide on single format standard (recommend: with "FN" prefix for consistency)
- Plan data migration to normalize all IDs
- This removes ambiguity and prevents future issues

#### Step 3.2: Add Logging/Monitoring
- Log when field notice filter is applied
- Monitor if formatted IDs occasionally don't match expected data
- Set up alerts if filter returns 0 results

#### Step 3.3: Improve Function Documentation
- Document `formatFieldNoticeId()` behavior and limitations
- Document that filtering uses format-based comparison
- Add examples in code comments

---

## SUCCESS METRICS

| Metric | Target | Measurement |
|--------|--------|-------------|
| Field notice filter returns data | 100% | UI shows metrics > 0 when FN filter applied |
| All dropdown options filterable | 100% | Can filter by each unique FN in dropdown |
| API response time | < 500ms | Measure `/api/metrics/filtered` response |
| Customer metrics display | > 0 | Top Customers table shows data when FN filter applied |
| Field notices table display | > 0 | Top Field Notices table shows data when FN filter applied |

---

## ROLLBACK PLAN

If the fix introduces new issues:
1. Revert changes to `backend/storage.ts` filtering functions
2. Restore previous filtering logic
3. Return to showing 0 results (known broken state)
4. Re-assess approach

---

## LESSONS LEARNED

1. **Data consistency matters:** Mixed ID formats in database require format-aware filtering
2. **Formatting has consequences:** Functions that transform data for display shouldn't be used for filtering without careful mapping
3. **Test filtering edge cases:** Should have tested with actual formatted dropdown values earlier
4. **Document data assumptions:** Need clear documentation of field notice ID formats and validation rules

---

## OPEN QUESTIONS FOR PRODUCT TEAM

1. Should field notice IDs be standardized to single format? (Recommendation: Yes, use "FN" prefix)
2. When will historical data be cleaned up to have consistent formatting?
3. Should we add data validation on import to prevent future format inconsistencies?

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-24  
**Status:** READY FOR IMPLEMENTATION
