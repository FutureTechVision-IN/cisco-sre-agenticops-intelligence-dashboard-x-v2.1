# Data Filtering & Integrity Analysis Report
## Cisco SRE AgenticOps Intelligence Dashboard v2.0

**Date:** April 30, 2026  
**Analyst:** Software Systems Analyst  
**Scope:** Windows Deployment - OFFLINE MODE  
**Systems:** Filter Logic, Data Accuracy, System Architecture

---

## Executive Summary

The Cisco SRE AgenticOps Intelligence Dashboard v2.0 Windows deployment operates in **OFFLINE MODE** when backend services are unavailable. The system serves static files from the `dist/` directory and uses pre-computed JSON data from `static-data/` folder. This analysis identifies critical issues in filter logic implementation, data pipeline integrity, and architectural bottlenecks.

**Key Findings:**
- Filter logic is **partially functional** - Customer and FN Type filters work; Field Notice and Time Period filters have issues
- Data accuracy relies on **stale static JSON files** with no real-time updates
- System architecture lacks **proper OFFLINE MODE data pipeline** - falls back to `MOCK_DATA` constants
- Critical disconnect between **filter UI and data source** in OFFLINE MODE

---

## 1. Filter Logic Evaluation

### 1.1 Current Implementation

#### Frontend Filter State Management
**Location:** `frontend/services/dataService.ts`

The filter logic is implemented in `dataService.ts` with the following filter parameters:
- `customer` - Customer name filter
- `fieldNotice` - Field Notice ID filter (format: "FN63046")
- `fnType` - Field Notice Type filter
- `month` - Time Period filter (format: "2026-01" for January 2026)

**Key Code Logic (lines 404-427):**
```typescript
if (filters.customer && filters.customer !== 'All Customers') {
  params.append('customer', filters.customer);
}
if (filters.fieldNotice && filters.fieldNotice !== 'All Field Notices') {
  params.append('fieldNotice', filters.fieldNotice);
}
if (filters.fnType && filters.fnType !== 'All Types') {
  params.append('fnType', filters.fnType);
}
if (filters.month && filters.month !== 'All Months') {
  const backendMonth = displayNameToYearMonth(filters.month);
  params.append('month', backendMonth);
}
```

### 1.2 Issues Identified

#### CRITICAL: OFFLINE MODE Filter Disconnect
**Problem:** When running in OFFLINE MODE (`isStaticHosting()` returns `true`), the system:
1. **Ignores filter parameters** sent to API endpoints
2. **Returns static JSON data** from `static-data/` folder without filtering
3. **Falls back to `MOCK_DATA`** constants when static files unavailable

**Evidence:**
```typescript
// dataService.ts lines 373-390
if (isStaticHosting()) {
  const staticDataPath = getStaticDataPath();
  const metricsRes = await fetch(`${staticDataPath}/index.json`);
  const metrics = await metricsRes.json();
  // Returns MOCK_DATA shape without applying filters
  return {
    ...MOCK_DATA,
    metrics: { ... },
    topFieldNotices: MOCK_DATA.topFieldNotices, // No filtering!
    topCustomers: MOCK_DATA.topCustomers, // No filtering!
  };
}
```

**Impact:**
- User selects "FN63046" from Field Notice filter → **No data change**
- User selects "January 2026" from Time Period → **Shows all-time data**
- KPI cards always show **same values regardless of filter selection**

#### HIGH: Field Notice ID Format Inconsistency
**Problem:** Database stores Field Notice IDs as "FN63046", but backend filtering logic was converting to numeric format incorrectly.

**Backend Code (lines 1037-1105 in `storage.ts`):**
```typescript
// FIXED: Now handles both "FN63046" and "63046" formats
if (filters.fieldNotice) {
  const fnNumber = filters.fieldNotice.replace(/^FN/, '');
  conditions.push(sql`(field_notice_id = ${filters.fieldNotice} OR field_notice_id = ${fnNumber})`);
}
```

**Status:** ✅ Fixed in backend, but **NOT APPLICABLE** in OFFLINE MODE (no backend)

### 1.3 Filter Responsiveness Assessment

| Filter | UI Updates | Backend Query | Data Updates | Status |
|--------|-------------|----------------|---------------|--------|
| Customer | ✅ Yes | ❌ Ignored in OFFLINE | ❌ No | BROKEN |
| Field Notice | ✅ Yes | ❌ Ignored in OFFLINE | ❌ No | BROKEN |
| FN Type | ✅ Yes | ❌ Ignored in OFFLINE | ❌ No | BROKEN |
| Time Period | ✅ Yes | ❌ Ignored in OFFLINE | ❌ No | BROKEN |

**Root Cause:** `isStaticHosting()` detection does not implement filtering logic for static data.

---

## 2. Data Accuracy Investigation

### 2.1 Data Pipeline Architecture

#### Normal Mode (Backend Available):
```
CSV Files (attached_assets/)
    ↓
backend/storage.ts (PostgreSQL Database)
    ↓
backend/csv-data-service.ts (CSV Cache Fallback)
    ↓
API Endpoints (/api/metrics/filtered, /api/field-notices)
    ↓
frontend/dataService.ts (5-minute cache)
    ↓
Dashboard UI Components
```

#### OFFLINE MODE (Current Deployment):
```
static-data/*.json (Pre-computed JSON files)
    ↓
frontend/dataService.ts (isStaticHosting() check)
    ↓
MOCK_DATA constants (Fallback)
    ↓
Dashboard UI Components
```

### 2.2 Data Staleness Issues

#### CRITICAL: Static Data Never Updates
**Location:** `frontend/public/static-data/`

The OFFLINE MODE serves pre-computed JSON files that:
- Are generated at **build time** (when `npm run build` was executed)
- Contain **hardcoded data** from `MOCK_DATA` constants
- Have **no mechanism for refresh** without rebuilding

**Evidence Files:**
- `static-data/index.json` - Contains metrics snapshot
- `static-data/trends-monthly.json` - Contains 10-month trend data
- `static-data/top-field-notices.json` - Static field notice list

#### Cache Layer Analysis

**Frontend Cache (dataService.ts):**
- **TTL:** 5 minutes (300,000 ms)
- **Issue:** Cache key includes filter parameters, but OFFLINE MODE bypasses filtering
- **Code:** `const CACHE_TTL = 5 * 60 * 1000; // 5 minutes`

**Backend CSV Cache (csv-data-service.ts):**
- **Check:** File modification time (`fs.statSync().mtimeMs`)
- **Issue:** Not applicable in OFFLINE MODE (no backend)

### 2.3 Data Accuracy Verification

#### KPI Metrics Accuracy
When filters are applied in OFFLINE MODE:
- **Vulnerable Assets:** Always shows `12,543,224` (from MOCK_DATA)
- **Potentially Vulnerable:** Always shows `8,291,456` (from MOCK_DATA)
- **Not Vulnerable:** Always shows `79,165,320` (from MOCK_DATA)
- **Total Assessed:** Always shows `100,000,000` (from MOCK_DATA)

**Verification Method:**
```typescript
// MOCK_DATA.metrics from constants.ts
totalAssessed: { value: 100000000, ... }
vulnerable: { value: 12543224, ... }
potential: { value: 8291456, ... }
secure: { value: 79165320, ... }
```

**Finding:** These values **DO NOT** match any real-time or recent data. They are hardcoded constants.

#### Risk Score Accuracy
Risk scores are **not calculated** in OFFLINE MODE. The dashboard displays static values from `MOCK_DATA.extendedKPIs`.

---

## 3. System Architecture Analysis

### 3.1 Architecture Diagram (OFFLINE MODE)

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Browser (localhost:8000)                      │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  start.ps1 -Native                                          │  │
│  │    ↓                                                        │  │
│  │  serve-dist.cjs (Node.js static server)                      │  │
│  │    ↓                                                        │  │
│  │  dist/ (Production build - HTML, JS, CSS)                   │  │
│  │    ↓                                                        │  │
│  │  index-CCkznM8L.js (Compiled React app)                    │  │
│  │    ↓                                                        │  │
│  │  dataService.ts (API abstraction layer)                      │  │
│  │    ↓                                                        │  │
│  │  isStaticHosting() = true (localhost detection)              │  │
│  │    ↓                                                        │  │
│  │  fetch('/static-data/index.json') → MOCK_DATA fallback      │  │
│  │    ↓                                                        │  │
│  │  Dashboard Components (KPI cards, charts, tables)           │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Static Data Sources:                                              │
│  • dist/static-data/index.json (metrics)                          │
│  • dist/static-data/trends-monthly.json (trends)                 │
│  • MOCK_DATA constants (fallback)                                │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Weak Links Identified

#### WEAK LINK 1: No Backend = No Filtering
**Location:** `frontend/services/dataService.ts` lines 373-390

**Issue:** The `isStaticHosting()` function treats all static hosting the same way, whether it's GitHub Pages or local OFFLINE MODE.

**Current Code:**
```typescript
const isStaticHosting = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname.includes('github.') || 
         hostname.includes('.github.io') || 
         hostname.includes('pages.') ||
         hostname === 'localhost' ||
         hostname === '127.0.0.1' ||
         window.location.port === '8000' ||
         window.location.port === '8001';
};
```

**Problem:** Returns `MOCK_DATA` without any filtering logic for static data.

#### WEAK LINK 2: Static Data Not Filterable
**Issue:** The `static-data/*.json` files contain **pre-aggregated** data that cannot be filtered client-side.

**Example:** `static-data/index.json` contains:
```json
{
  "totalAssessed": 100000000,
  "vulnerable": 12543224,
  ...
}
```

There's no raw record data to filter against.

#### WEAK LINK 3: MOCK_DATA Dependencies
**Location:** `frontend/constants.ts`

The system heavily relies on `MOCK_DATA` constants:
- 28+ references in `dataService.ts`
- Used as fallback for ALL API calls in OFFLINE MODE
- Contains hardcoded values that don't reflect real data

### 3.3 Bottlenecks

| Bottleneck | Location | Impact | Priority |
|------------|----------|--------|----------|
| No filtering in OFFLINE MODE | dataService.ts:373 | High - Filters don't work | CRITICAL |
| Stale static data | static-data/*.json | High - No data refresh | HIGH |
| MOCK_DATA fallback | constants.ts | Medium - Fake values | MEDIUM |
| 5-minute cache TTL | dataService.ts:56 | Low - Acceptable for offline | LOW |

---

## 4. Recommendations

### 4.1 Immediate Fixes (CRITICAL)

#### Fix 1: Implement Client-Side Filtering for Static Data
**Target:** `frontend/services/dataService.ts`

**Approach:**
1. Create `static-data/raw-records.json` with full dataset
2. Implement filtering logic in `dataService.ts` for OFFLINE MODE
3. Use Web Workers for performance if dataset is large

**Estimated Time:** 4 hours

#### Fix 2: Update Static Data Generation
**Target:** Build process / `npm run build`

**Approach:**
1. Add build step to generate filterable static data
2. Include raw records JSON (compressed)
3. Generate filtered variants for common filter combinations

**Estimated Time:** 2 hours

### 4.2 Short-Term Improvements (HIGH)

#### Improve 1: Add "Offline Mode" Warning Banner
**Target:** `frontend/components/Dashboard.tsx`

**Approach:**
```tsx
{isStaticHosting() && (
  <div className="bg-yellow-600 text-white p-2 text-center text-sm">
    ⚠️ OFFLINE MODE: Data is static and filters are not applied. Connect to backend for real-time data.
  </div>
)}
```

#### Improve 2: Disable Filters in OFFLINE MODE
**Approach:** Show filters but display tooltip explaining they don't work in OFFLINE MODE.

### 4.3 Long-Term Architecture Changes

#### Proposal: Hybrid Static + API Mode
Instead of completely bypassing filters in OFFLINE MODE:
1. Serve static data as baseline
2. Allow user to upload CSV for local processing
3. Use IndexedDB to store and query data client-side

---

## 5. Testing Recommendations

### 5.1 Filter Logic Tests
```typescript
// frontend/__tests__/filtering.test.ts
describe('Filter Logic in OFFLINE MODE', () => {
  it('should display warning banner when filters are applied', () => {
    // Test that banner appears
  });
  
  it('should disable filter dropdowns in OFFLINE MODE', () => {
    // Test dropdowns are disabled/read-only
  });
});
```

### 5.2 Data Accuracy Tests
- Cross-reference `MOCK_DATA` values against known good data
- Verify static JSON files contain expected structure
- Test cache invalidation after TTL expires

---

## 6. Conclusion

The Windows deployment of Cisco SRE AgenticOps Intelligence Dashboard v2.0 in OFFLINE MODE has **critical filter logic issues**. The primary root cause is the complete disconnect between the filter UI and the data source when running without a backend.

**Critical Issues Summary:**
1. ❌ Filters DO NOT work in OFFLINE MODE
2. ❌ Data is STATIC and NEVER updates
3. ❌ KPI metrics are HARDCODED values from MOCK_DATA
4. ❌ No mechanism exists for client-side filtering

**Priority Actions:**
1. **IMMEDIATE:** Add warning banner about OFFLINE MODE limitations
2. **SHORT-TERM:** Implement static data filtering or disable filters
3. **LONG-TERM:** Re-architect OFFLINE MODE to support local data processing

**Assessment Verdict:** The system is **NOT SUITABLE for production use in OFFLINE MODE** without significant enhancements to the data pipeline and filter logic implementation.

---

**Report Status:** FINAL  
**Next Review:** After implementing Fix 1 and Fix 2  
**Analyst Sign-off:** Software Systems Analyst  
