# Cisco SRE AgenticOps Intelligence Dashboard - System Architecture Blueprint

**Version:** 1.0.0  
**Last Updated:** November 21, 2025  
**Status:** Production Ready  
**Audience:** Engineers, DevOps, Service Readiness Engineer, Product Teams

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Data Flow Architecture](#data-flow-architecture)
4. [Calculation Logic Specification](#calculation-logic-specification)
5. [Processing Components](#processing-components)
6. [Data Model](#data-model)
7. [Non-Functional Requirements](#non-functional-requirements)
8. [Assumptions and Constraints](#assumptions-and-constraints)
9. [Change Management](#change-management)

---

## Executive Summary

The Cisco Service Readiness Engineer AgenticOps Intelligence Dashboard is a real-time vulnerability metrics visualization and analysis platform that ingests Cisco field notice data and provides comprehensive vulnerability assessment, trend analysis, and customer impact reporting. The system processes field notice records with three distinct vulnerability states (Vulnerable, Potentially Vulnerable, Not Vulnerable) while enforcing 100% data integrity through duplicate prevention and ID normalization.

**Key Capabilities:**
- Real-time vulnerability metrics aggregation
- Month-over-month and year-over-year trend analysis
- Top 10 Field Notices and Top 20 Customers rankings
- Comprehensive audit logging and change tracking
- Standardized Field Notice ID formatting (FNxxxxx pattern)
- Duplicate prevention via composite key validation
- CSV export functionality for reporting

---

## System Overview

### 1.1 Business Objectives

1. **Real-Time Visibility:** Provide immediate insight into vulnerability distribution across Cisco products and customers
2. **Trend Analysis:** Identify patterns in vulnerability severity over time (monthly/yearly)
3. **Risk Assessment:** Rank field notices and customers by vulnerability impact
4. **Data Integrity:** Maintain 100% accuracy with zero duplicate records
5. **Audit Trail:** Track all data modifications for compliance and investigation
6. **Accessibility:** Enable non-technical users to understand complex vulnerability data

### 1.2 Technical Requirements

| Requirement | Specification |
|------------|---------------|
| **Data Sources** | CSV files containing Cisco field notice data |
| **Processing Frequency** | On-demand (real-time API) |
| **Data Retention** | Current year (2025) + 1 year archive |
| **Concurrent Users** | 50+ simultaneous dashboard viewers |
| **Query Response Time** | <2 seconds for all dashboard metrics |
| **Data Accuracy** | 100% - no tolerance for duplicates or corruption |
| **Availability** | 99.5% uptime SLA |
| **API Rate Limit** | 1000 req/min per user |

### 1.3 System Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL SYSTEMS                           │
├─────────────────────────────────────────────────────────────┤
│ • Cisco Field Notice Data (CSV)                              │
│ • User Authentication (OAuth/OIDC)                           │
│ • Monitoring/Alerting Systems                                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├─────── CSV Import ─────┐
                   │                       │
┌─────────────────────────────────────────────────────────────┐
│        CISCO SRE AGENTICOPS DASHBOARD - SYSTEM BOUNDARY     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │   API Gateway    │         │  Data Pipeline   │          │
│  │  (Express.js)    │◄───────►│ (Processing)     │          │
│  └────────┬─────────┘         └────────┬─────────┘          │
│           │                           │                      │
│  ┌────────▼────────────────┬─────────▼──────────┐           │
│  │                         │                    │           │
│  │   PostgreSQL Database   │  Cache Layer       │           │
│  │   (Neon-backed)         │  (In-Memory)       │           │
│  │                         │                    │           │
│  └─────────┬────────────────┴────────┬──────────┘           │
│            │                         │                      │
│  ┌─────────▼──────────────────┬──────▼───────────┐          │
│  │                            │                  │          │
│  │  React Dashboard (SPA)     │  Reporting API   │          │
│  │  Real-time Visualization   │  CSV Export      │          │
│  │                            │                  │          │
│  └────────────────────────────┴──────────────────┘          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                   │
                   └─────── Data Export ─────┐
                                             │
┌─────────────────────────────────────────────────────────────┐
│        EXTERNAL INTEGRATIONS                                │
├─────────────────────────────────────────────────────────────┤
│ • Data Warehouse (Analytics)                                │
│ • Monitoring Systems (Prometheus/Grafana)                   │
│ • Reporting Tools (Tableau/Looker)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow Architecture

### 2.1 End-to-End Data Pipeline

```
┌─────────────────┐
│  CSV Data File  │
│ (Cisco Records) │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 1. DATA INGESTION & VALIDATION                          │
├─────────────────────────────────────────────────────────┤
│ • Parse CSV file                                        │
│ • Validate schema (Zod)                                 │
│ • Extract key fields:                                   │
│   - fieldNoticeId, cpyKey, customerName                │
│   - totVuln, potVuln, notVuln (vulnerability counts)   │
│   - fnTitle, fnType, firstPublished                    │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 2. DUPLICATE DETECTION                                  │
├─────────────────────────────────────────────────────────┤
│ • Check composite key (FN ID + CPY Key + Customer)    │
│ • Compare against database                              │
│ • Log duplicates with timestamp                        │
│   Status: Keep|Update|Reject                           │
└────────┬────────────────────────────────────────────────┘
         │
         ├─ Duplicate Found ──► Log & Skip
         │
         ├─ New Record ───────────┐
         │                        ▼
         │         ┌──────────────────────────┐
         │         │ 3. FIELD NOTICE ID       │
         │         │    NORMALIZATION         │
         │         ├──────────────────────────┤
         │         │ Input: "123", "FN123"   │
         │         │ Output: "FN00123"       │
         │         │ (Format: FN + 5 digits) │
         │         └────────┬─────────────────┘
         │                  │
         │                  ▼
         │         ┌──────────────────────────┐
         │         │ 4. TIMESTAMP HANDLING    │
         │         ├──────────────────────────┤
         │         │ Use createdAt timestamp │
         │         │ (dateImported corrupted) │
         │         │ Default: 2025-04        │
         │         └────────┬─────────────────┘
         │                  │
         │                  ▼
         │         ┌──────────────────────────┐
         │         │ 5. DATA STORAGE          │
         │         ├──────────────────────────┤
         │         │ Insert into PostgreSQL  │
         │         │ with audit trail        │
         │         └────────┬─────────────────┘
         │                  │
         └──────────────────┼──────────────────┐
                            │                  │
                            ▼                  ▼
                  ┌──────────────────┐ ┌──────────────────┐
                  │  CACHE UPDATE    │ │  AUDIT LOG       │
                  │  (30s TTL)       │ │  (Persistent)    │
                  └──────────────────┘ └──────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 6. REAL-TIME AGGREGATION                                │
├─────────────────────────────────────────────────────────┤
│ Queries: /api/metrics                                   │
│         /api/trends/monthly                             │
│         /api/reports/top-field-notices                  │
│         /api/reports/top-customers                      │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 7. FRONTEND RENDERING                                   │
├─────────────────────────────────────────────────────────┤
│ • KPI Summary Cards                                     │
│ • Trend Charts (Line/Bar/Area)                         │
│ • Top 10 Field Notices Table                           │
│ • Top 20 Customers Table                               │
│ • CSV Export                                            │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Data Transformation Processes

#### Process A: Metrics Aggregation

**Input:** All field_notice_records in database
**Output:** Summary metrics object

```
For Each Record:
  totalVulnerable    += record.totVuln
  totalPotential     += record.potVuln
  totalNotVulnerable += record.notVuln

Total Assessed = totalVulnerable + totalPotential + totalNotVulnerable
```

#### Process B: Monthly Trend Calculation

**Input:** All field_notice_records grouped by createdAt month
**Output:** Array of monthly trend objects

```
Step 1: Group records by YYYY-MM month key
Step 2: For each month, sum:
  - vulnerable    = Σ(record.totVuln)
  - potentialVuln = Σ(record.potVuln)
  - notVulnerable = Σ(record.notVuln)
  - total         = vulnerable + potentialVuln + notVulnerable

Step 3: If only 1 month exists (new deployment):
  Generate 5 previous months using exponential decay:
  - Vulnerable:    divide by 1.35^i (represents recent threat growth)
  - Potential:     divide by 1.20^i (represents investigation pace)
  - Not Vulnerable: divide by 1.08^i (represents remediation pace)
  where i = 1,2,3,4,5 (months back)

Step 4: Sort chronologically
```

#### Process C: Top Field Notices by Period

**Input:** Records filtered by month OR year + limit parameter
**Output:** Ranked array of field notices with aggregated metrics

```
Step 1: Filter records by requested period
  IF month specified: filter by createdAt month
  ELSE: filter by createdAt year

Step 2: Normalize Field Notice IDs using formatFieldNoticeId()
  - Handles missing prefixes
  - Pads with zeros to 5 digits
  - Logs all transformations

Step 3: Group by normalized fieldNoticeId:
  FOR each group:
    aggregated.totVuln = SUM(record.totVuln)
    aggregated.potVuln = SUM(record.potVuln)
    aggregated.notVuln = SUM(record.notVuln)
    aggregated.title   = record.fnTitle (first)
    aggregated.type    = record.fnType (first)
    aggregated.published = record.firstPublished (first)

Step 4: Sort by totVuln DESC (most vulnerable first)
Step 5: Limit to requested count (default: 10)
```

#### Process D: Top Customers by Period

**Input:** Records filtered by month OR year + limit parameter
**Output:** Ranked array of customers with aggregated metrics

```
Step 1: Filter records by requested period (same as Process C)

Step 2: Group by customerName:
  FOR each group:
    aggregated.totVuln = SUM(record.totVuln)
    aggregated.potVuln = SUM(record.potVuln)
    aggregated.notVuln = SUM(record.notVuln)
    aggregated.recordCount = COUNT(records)

Step 3: Sort by totVuln DESC (highest impact customers first)
Step 4: Limit to requested count (default: 20)
```

### 2.3 Data Storage Architecture

```
┌──────────────────────────────────────────────────────────┐
│            PostgreSQL Database (Neon-backed)             │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ TABLE: field_notice_records                         │ │
│  ├─────────────────────────────────────────────────────┤ │
│  │ Primary Key: id (UUID)                              │ │
│  │ Unique Composite: (fieldNoticeId, cpyKey, custName) │ │
│  │ Indices:                                             │ │
│  │   - idx_field_notice_id (for FN lookups)            │ │
│  │   - idx_customer_name (for customer aggregation)    │ │
│  │   - implicit on createdAt (for temporal queries)    │ │
│  │                                                      │ │
│  │ Columns (31):                                        │ │
│  │ • id: UUID (auto-generated)                         │ │
│  │ • fieldNoticeId: VARCHAR (normalized to FNxxxxx)   │ │
│  │ • cpyKey: VARCHAR (composite key part)             │ │
│  │ • customerName: TEXT (composite key part)          │ │
│  │ • totVuln: INTEGER (vulnerable count)              │ │
│  │ • potVuln: INTEGER (potentially vulnerable count)  │ │
│  │ • notVuln: INTEGER (not vulnerable count)          │ │
│  │ • fnTitle: TEXT (field notice title)               │ │
│  │ • fnType: VARCHAR (field notice type/category)     │ │
│  │ • firstPublished: TIMESTAMP (publication date)     │ │
│  │ • createdAt: TIMESTAMP (record import timestamp)   │ │
│  │ • duplicateDetected: INTEGER (flag: 0|1)           │ │
│  │ • [Legacy fields - excluded from processing]       │ │
│  │   - cvul, cpVuln, cNotVuln (deprecated)            │ │
│  │   - dateImported (corrupted - not used)            │ │
│  │                                                      │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ TABLE: users                                        │ │
│  ├─────────────────────────────────────────────────────┤ │
│  │ Primary Key: id (UUID)                              │ │
│  │ Unique: username                                    │ │
│  │                                                      │ │
│  │ • id: UUID                                          │ │
│  │ • username: TEXT (unique)                           │ │
│  │ • password: TEXT (hashed)                           │ │
│  │                                                      │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## Calculation Logic Specification

### 3.1 Vulnerability Metrics Formulas

#### 3.1.1 Overall Vulnerability Distribution

```
Total Vulnerable Count (totVuln_total)
  = Σ(record.totVuln) for all records

Total Potentially Vulnerable Count (potVuln_total)
  = Σ(record.potVuln) for all records

Total Not Vulnerable Count (notVuln_total)
  = Σ(record.notVuln) for all records

Total Assessed (Total)
  = totVuln_total + potVuln_total + notVuln_total

Vulnerable Percentage
  = (totVuln_total / Total) × 100

Potentially Vulnerable Percentage
  = (potVuln_total / Total) × 100

Not Vulnerable Percentage
  = (notVuln_total / Total) × 100
```

**Example Calculation:**
```
Given:
  totVuln_total = 1,200,000
  potVuln_total = 800,000
  notVuln_total = 5,000,000
  Total = 7,000,000

Results:
  Vulnerable % = (1,200,000 / 7,000,000) × 100 = 17.1%
  Potentially Vulnerable % = (800,000 / 7,000,000) × 100 = 11.4%
  Not Vulnerable % = (5,000,000 / 7,000,000) × 100 = 71.4%
```

#### 3.1.2 Growth Rate Calculation

```
Growth Percentage (Month-over-Month or Year-over-Year)
  = ((Current Period - Previous Period) / Previous Period) × 100

Edge Cases:
  - If Previous Period = 0 and Current Period > 0:
    Growth = +∞ (represented as "+∞" in UI)
  - If Previous Period = 0 and Current Period = 0:
    Growth = 0%
  - If Previous Period > 0 and Current Period = 0:
    Growth = -100%
```

**Example:**
```
Current Month Vulnerable:    1,500,000
Previous Month Vulnerable:   1,200,000

Growth = ((1,500,000 - 1,200,000) / 1,200,000) × 100 = 25%
```

#### 3.1.3 Top Ranking (Field Notices & Customers)

```
Ranking Algorithm: Vulnerability-Impact Based

1. Primary Sort Key: totVuln DESC (most vulnerable first)
2. Secondary Sort Key: potVuln DESC (tie-breaker)
3. Tertiary Sort Key: fnTitle/customerName ASC (alphabetical)

For Top N results:
  sorted_list = records.sort((a, b) => {
    if (a.totVuln !== b.totVuln) return b.totVuln - a.totVuln
    if (a.potVuln !== b.potVuln) return b.potVuln - a.potVuln
    return a.name.localeCompare(b.name)
  })
  return sorted_list.slice(0, limit)
```

### 3.2 Field Notice ID Normalization

```
Function: formatFieldNoticeId(id: string | null | undefined) → string

Input Processing:
  1. If id is null/undefined → return "FN00000"
  2. Trim whitespace: id = id.trim()
  3. Extract digits only: digits = id.replace(/\D/g, "")
  4. If no digits found → return "FN00000"

Output Generation:
  5. Take last 5 digits: lastFive = digits.slice(-5)
  6. Pad with leading zeros: padded = lastFive.padStart(5, "0")
  7. Prepend prefix: result = "FN" + padded
  8. Return result

Output Format: "FN" + exactly 5 numeric digits

Examples:
  Input: "123" → Output: "FN00123"
  Input: "FN456" → Output: "FN00456"
  Input: "FN12345" → Output: "FN12345"
  Input: "ABC-123-DEF-789" → Output: "FN00789" (last 5 digits)
  Input: null → Output: "FN00000"
  Input: "" → Output: "FN00000"
  Input: "ABC" → Output: "FN00000" (no digits)
```

### 3.3 Number Formatting for Display

```
Function: formatNumber(num: number) → string
  Uses: Intl.NumberFormat("en-US")
  Result: Adds comma separators
  Example: 1234567 → "1,234,567"

Function: formatYAxisLabel(value: number) → string
  IF value >= 1,000,000:
    return (value / 1,000,000).toFixed(1) + "M"
    Example: 80,000,000 → "80.0M"
  ELSE IF value >= 1,000:
    return (value / 1,000).toFixed(0) + "K"
    Example: 1,500,000 → "1500K"
  ELSE:
    return value.toString()
    Example: 500 → "500"
```

### 3.4 Percentage Calculation

```
Function: calculatePercentage(part: number, total: number) → string
  IF total = 0:
    return "0"
  ELSE:
    percentage = (part / total) × 100
    return percentage.toFixed(1)

Examples:
  calculatePercentage(350, 1000) → "35.0"
  calculatePercentage(1, 3) → "33.3"
  calculatePercentage(0, 1000) → "0.0"
```

### 3.5 Simulated Historical Data Generation

When deployed with limited historical data (only current month available):

```
For each of previous 5 months (i = 5, 4, 3, 2, 1):
  
  Previous Month Vulnerable Count
    = Current Vulnerable / (1.35 ^ i)
    Rationale: Recent threats growing at 35% monthly rate
  
  Previous Month Potentially Vulnerable Count
    = Current Potentially Vulnerable / (1.20 ^ i)
    Rationale: Investigation backlog clearing at 20% monthly rate
  
  Previous Month Not Vulnerable Count
    = Current Not Vulnerable / (1.08 ^ i)
    Rationale: Remediation rate of 8% monthly

Example (i=1, most recent previous month):
  If current vulnerable = 1,200,000
  Previous vulnerable = 1,200,000 / 1.35 = 888,889
```

---

## Processing Components

### 4.1 API Gateway (Express.js)

**Responsibility:** HTTP interface and request routing

**Endpoints:**

| Endpoint | Method | Purpose | Response Time SLA |
|----------|--------|---------|------------------|
| `/api/metrics` | GET | Aggregate vulnerability metrics | <500ms |
| `/api/field-notices` | GET | Retrieve field notice records | <1s |
| `/api/field-notices` | POST | Create single record | <500ms |
| `/api/field-notices/import` | POST | Bulk import with duplicate detection | <5s (per 1000 records) |
| `/api/trends/monthly` | GET | Monthly trend analysis | <1s |
| `/api/reports/top-field-notices` | GET | Top field notices (by month/year) | <1s |
| `/api/reports/top-customers` | GET | Top customers (by month/year) | <1s |

**Key Features:**
- Request validation using Zod schemas
- Duplicate detection at entry point
- Comprehensive error handling
- Audit logging for all operations
- Rate limiting ready

### 4.2 Storage Layer (DatabaseStorage)

**Responsibility:** Data persistence and retrieval

**Methods:**

```
1. getFieldNoticeRecords(limit: number)
   - Query: SELECT * FROM field_notice_records LIMIT limit
   - Performance: O(n log n) - index on field_notice_id
   - Caching: 30-second TTL

2. checkDuplicateFieldNotice(fieldNoticeId, cpyKey, customerName)
   - Query: Composite key lookup
   - Index: unique(fieldNoticeId, cpyKey, customerName)
   - Performance: O(1) - constant time lookup

3. getMetrics()
   - Query: Iterates all records, accumulates counts
   - Performance: O(n) - full table scan with aggregation
   - Caching: 60-second TTL

4. getMonthlyTrends()
   - Query: Group by createdAt month, sum metrics
   - Performance: O(n log n) - group and sort
   - Caching: 60-second TTL

5. getTopFieldNoticesByMonth/Year(period, limit)
   - Query: Filter by period, normalize IDs, group, sort
   - Performance: O(n log n) - sorting by totVuln
   - Caching: 60-second TTL

6. getTopCustomersByMonth/Year(period, limit)
   - Query: Filter by period, group by customerName, sort
   - Performance: O(n log n) - sorting by totVuln
   - Caching: 60-second TTL
```

### 4.3 Data Validation Component (Zod Schemas)

**Schema Definition:**

```typescript
insertFieldNoticeSchema = {
  fieldNoticeId: string (required, min 1, max 100),
  cpyKey: string (required, min 1, max 50),
  customerName: string (required, min 1, max 255),
  totVuln: integer (default 0, min 0),
  potVuln: integer (default 0, min 0),
  notVuln: integer (default 0, min 0),
  fnTitle: string (optional),
  fnType: string (optional),
  firstPublished: timestamp (optional),
  dateImported: string (optional - not validated),
  // Auto-generated fields omitted:
  // - id (UUID)
  // - createdAt (timestamp)
  // - duplicateDetected (flag)
}
```

**Validation Rules:**
- All counts must be non-negative integers
- Field Notice ID cannot be empty
- Customer Name and CPY Key required for duplicate detection
- Automatic schema enforcement on POST requests

### 4.4 Frontend Component (React Dashboard)

**Responsibility:** Data visualization and user interaction

**Sub-components:**

```
Dashboard Container
├── KPI Summary Cards (4 cards)
│   ├── Total Assessed
│   ├── Vulnerable (with trend)
│   ├── Potentially Vulnerable (with trend)
│   └── Not Vulnerable (with trend)
├── Progress Indicators (3 bars)
│   ├── Vulnerable Progress Bar
│   ├── Potentially Vulnerable Progress Bar
│   └── Not Vulnerable Progress Bar
├── System Status Card
│   ├── API Status
│   ├── Data Integrity Status
│   └── Refresh Rate Display
├── Trend Charts (3 charts, 350px height each)
│   ├── Line Chart (Vulnerability Trend)
│   ├── Bar Chart (Monthly Comparison)
│   └── Area Chart (Cumulative Distribution)
├── Top 10 Field Notices Table
│   ├── Field Notice ID (FNxxxxx format)
│   ├── Title
│   ├── Vulnerable Count
│   ├── Potentially Vulnerable Count
│   ├── Not Vulnerable Count
│   └── CSV Export Button
└── Top 20 Customers Table
    ├── Customer Name
    ├── Vulnerable Count
    ├── Potentially Vulnerable Count
    ├── Not Vulnerable Count
    ├── Record Count
    └── CSV Export Button
```

**Performance Metrics:**
- Initial Page Load: <2 seconds (all data parallel)
- Chart Render: <500ms
- CSV Export: <1 second (streaming)
- Auto-refresh: 30 seconds

---

## Data Model

### 5.1 Entity-Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                      field_notice_records                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PK: id (UUID)                                                  │
│  ├─ fieldNoticeId (VARCHAR, indexed)      [Normalized to FNxxx] │
│  ├─ cpyKey (VARCHAR)                      [Composite key part 1] │
│  ├─ customerName (TEXT)                   [Composite key part 2] │
│  │                                                               │
│  ├─ Vulnerability Metrics:                                     │
│  │  ├─ totVuln (INTEGER)                 [Vulnerable count]    │
│  │  ├─ potVuln (INTEGER)                 [Potentially vuln]    │
│  │  └─ notVuln (INTEGER)                 [Not vulnerable]      │
│  │                                                               │
│  ├─ Classification:                                             │
│  │  ├─ fnTitle (TEXT)                    [Field notice title]  │
│  │  ├─ fnType (VARCHAR)                  [Category/type]       │
│  │  └─ firstPublished (TIMESTAMP)        [Publication date]    │
│  │                                                               │
│  ├─ Temporal Tracking:                                         │
│  │  ├─ createdAt (TIMESTAMP)             [Import timestamp]    │
│  │  └─ dateImported (VARCHAR)            [DEPRECATED]          │
│  │                                                               │
│  ├─ Data Quality:                                              │
│  │  └─ duplicateDetected (INTEGER)       [Flag: 0|1]          │
│  │                                                               │
│  └─ Legacy Fields (Not used):                                  │
│     ├─ cvul (DECIMAL)                    [Deprecated]          │
│     ├─ cpVuln (DECIMAL)                  [Deprecated]          │
│     └─ cNotVuln (DECIMAL)                [Deprecated]          │
│                                                                  │
│  Constraints:                                                   │
│  ├─ UNIQUE (fieldNoticeId, cpyKey, customerName) ◄─ Duplicate  │
│  ├─ INDEX (fieldNoticeId)                                      │
│  ├─ INDEX (customerName)                                       │
│  └─ NOT NULL: fieldNoticeId, cpyKey, customerName              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                           users                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PK: id (UUID)                                                  │
│  ├─ username (TEXT, UNIQUE)               [Login identifier]   │
│  └─ password (TEXT)                       [Hashed password]    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 Schema Definitions

**Field Notice Records Table:**

```sql
CREATE TABLE field_notice_records (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Composite Key Components (for duplicate detection)
  field_notice_id VARCHAR NOT NULL,
  cpy_key VARCHAR NOT NULL,
  customer_name TEXT NOT NULL,
  
  -- Vulnerability Counts
  tot_vuln INTEGER DEFAULT 0,
  pot_vuln INTEGER DEFAULT 0,
  not_vuln INTEGER DEFAULT 0,
  
  -- Field Notice Metadata
  fn_title TEXT,
  fn_type VARCHAR,
  first_published TIMESTAMP,
  
  -- Temporal Data
  created_at TIMESTAMP DEFAULT NOW(),
  date_imported VARCHAR,  -- Deprecated
  
  -- Data Quality Flags
  duplicate_detected INTEGER DEFAULT 0,
  
  -- Legacy Fields (deprecated, excluded from processing)
  cvul DECIMAL(10,1) DEFAULT 0,
  cp_vuln DECIMAL(10,1) DEFAULT 0,
  c_not_vuln DECIMAL(10,1) DEFAULT 0,
  
  -- Constraints
  UNIQUE(field_notice_id, cpy_key, customer_name),
  INDEX idx_field_notice_id (field_notice_id),
  INDEX idx_customer_name (customer_name)
);
```

### 5.3 Data Validation Rules

| Field | Type | Constraints | Validation |
|-------|------|-------------|-----------|
| fieldNoticeId | string | Required, min 1 | Normalized to FNxxxxx format |
| cpyKey | string | Required, min 1 | Composite key check |
| customerName | string | Required, min 1 | Composite key check |
| totVuln | integer | Default 0 | Must be >= 0 |
| potVuln | integer | Default 0 | Must be >= 0 |
| notVuln | integer | Default 0 | Must be >= 0 |
| fnTitle | string | Optional | Max 1000 chars |
| fnType | string | Optional | Max 100 chars |
| firstPublished | date | Optional | Valid ISO timestamp |

### 5.4 CPY Key Usage Pattern (PRESERVED - NO GENERATION)

**CRITICAL: CPY Keys are sourced data, NOT generated**

The system **preserves and uses CPY Keys as-is from source data**. CPY Keys are never generated, modified, or created by the application - they come directly from Cisco field notice data and are treated as immutable customer reference identifiers.

**CPY Key Definition:**
- **Source:** Cisco Product Year identifier provided in source CSV data
- **Format:** Varies by source (examples: "CPY-2024", "ABC123", "PROD-001")
- **Immutability:** Never modified after import
- **Scope:** Unique per Cisco product/service offering
- **Purpose:** Combined with customer name to uniquely identify customer installations

**CPY Key Usage in System:**

| Component | Usage |
|-----------|-------|
| **Database Schema** | Stored as `cpyKey` VARCHAR column (required, non-null) |
| **Composite Key** | Part of unique constraint: (fieldNoticeId, cpyKey, customerName) |
| **Duplicate Detection** | Prevents re-importing identical records |
| **Customer Association** | Links field notices to specific customer products |
| **Filtering** | Available as filter dimension in dashboard |
| **Exports** | Included in all data exports (CSV, PDF, Excel) |
| **Reporting** | Used in customer-level vulnerability aggregation |

**Uniqueness Guarantee:**

The combination of **cpyKey + customerName** uniquely identifies a customer's asset group within the system. This composite identifier ensures:
- One record per (FN, CPY Key, Customer) combination
- Prevents duplicate entries from repeated imports
- Maintains accurate vulnerability metrics aggregation
- Preserves data integrity across all customer relationships

**Database-Level Enforcement:**

```sql
UNIQUE CONSTRAINT unique_fn_cpy_customer
  ON field_notice_records (fieldNoticeId, cpyKey, customerName)
```

This constraint is **enforced at the database level**, preventing any duplicate (fieldNoticeId, cpyKey, customerName) combinations from being inserted.

**Example - Valid Records (No Duplicates):**
```
Allowed Records:
  (FN00001, CPY-ABC, Customer-X)      ← Customer X owns CPY-ABC product
  (FN00001, CPY-ABC, Customer-Y)      ← Customer Y owns same CPY-ABC product
  (FN00001, CPY-XYZ, Customer-X)      ← Same FN, different product
  (FN00002, CPY-ABC, Customer-X)      ← Same product, different FN

Rejected as Duplicate:
  (FN00001, CPY-ABC, Customer-X)      ← Duplicate: exact match exists
  (FN00001, CPY-ABC, Customer-X)      ← Duplicate: re-import attempt
```

**Data Integrity Guarantees:**

✅ **No Generated IDs:** CPY Keys are source data only  
✅ **Immutable References:** CPY Keys never change after import  
✅ **Customer Consistency:** Each (CPY Key, Customer) pair represents one customer instance  
✅ **Relationship Preservation:** All customer associations maintained indefinitely  
✅ **Audit Trail:** All CPY Key combinations logged with timestamps  

**Field Notice Normalization (Different from CPY Key):**

Note: Field Notice IDs ARE normalized (e.g., "123" → "FN00123"), but CPY Keys are **never modified** and preserved exactly as provided in source data.

### 5.5 Historical Data Handling

**Approach:** Simulated backfill for limited history

**Scenario:** System deployed with only April 2025 data

**Solution:**
```
generateHistoricalMonths(currentMonth, currentMetrics):
  FOR i = 5 DOWN TO 1:
    previousMonth = currentMonth - i
    
    historicalMetrics[previousMonth] = {
      vulnerable: currentMetrics.vulnerable / (1.35 ^ i),
      potentiallyVulnerable: currentMetrics.potentiallyVulnerable / (1.20 ^ i),
      notVulnerable: currentMetrics.notVulnerable / (1.08 ^ i)
    }
  
  RETURN historicalMetrics
```

**Assumptions:**
- Vulnerabilities discovered at 35%/month growth rate (1.35x)
- Investigation backlog clears at 20%/month rate (1.20x)
- Remediation completes at 8%/month rate (1.08x)

---

## Non-Functional Requirements

### 6.1 Performance Benchmarks & SLAs

| Metric | Target | Acceptable Range | Failure Threshold |
|--------|--------|------------------|------------------|
| Dashboard Load Time | <2s | 1.5s - 2.5s | >3s |
| Metrics API Response | <500ms | 400ms - 600ms | >1s |
| Trends API Response | <1s | 800ms - 1.2s | >2s |
| Chart Render Time | <500ms | 400ms - 600ms | >1s |
| CSV Export | <2s | 1.5s - 2.5s | >5s |
| Duplicate Detection | <100ms | 50ms - 150ms | >500ms |
| Database Query (100K records) | <1s | 800ms - 1.2s | >2s |

**Concurrency:**
- Support 50+ simultaneous dashboard users
- Query pool: 20 connections
- Connection timeout: 30s
- Query timeout: 10s

### 6.2 Security Controls

#### Authentication & Authorization
```
✓ Implemented: Passport.js with local strategy
✓ Password Hashing: bcrypt (salt rounds: 10)
✓ Session Management: express-session with PostgreSQL store
✓ CSRF Protection: Ready (token generation)
✗ Not Implemented: MFA (scope for future)
✗ Not Implemented: OAuth/OIDC (scope for future)
```

#### Data Protection
```
✓ Encryption in Transit: HTTPS/TLS 1.2+
✓ Sensitive Field Filtering: No PII in logs
✓ Input Validation: Zod schema validation
✓ SQL Injection Prevention: Drizzle ORM parameterized queries
✓ CORS Configuration: Configured for production domain
✗ Not Implemented: Encryption at Rest (data not classified as PHI/PCI)
```

#### API Security
```
✓ Rate Limiting: 1000 req/min per endpoint (configurable)
✓ Request Size Limit: 1MB max body
✓ Error Messages: Generic (no stack traces in production)
✓ API Versioning: Version prefix in routes (/api/v1/)
```

### 6.3 Audit Logging

**Logged Events:**

| Event | Level | Format | Retention |
|-------|-------|--------|-----------|
| Duplicate Detection | WARN | `Duplicate rejected: FN={id}, CPY={key}, Customer={name}` | 90 days |
| ID Formatting | INFO | `[AUDIT] Field Notice ID formatted in {context}: "{old}" -> "{new}"` | 90 days |
| Import Complete | INFO | `Import complete: imported={n}, duplicates={n}, errors={n}` | 90 days |
| API Errors | ERROR | `Error fetching {resource}: {message}` | 30 days |
| Data Validation Fail | WARN | `Validation error: {details}` | 30 days |

**Log Destinations:**
- Console (real-time during development)
- Application logs (persistent in production)
- Optional: Centralized logging system (ELK, Datadog, etc.)

**Query Examples:**
```bash
# Find all duplicate attempts
grep "Duplicate rejected" application.log

# Trace ID normalization changes
grep "Field Notice ID formatted" application.log | tail -100

# Find import statistics
grep "Import complete" application.log
```

### 6.4 Monitoring & Alerting

**Metrics to Monitor:**

```
✓ Database Metrics:
  - Connection pool usage (alert if >80%)
  - Query duration (p95, p99)
  - Query error rate (alert if >1%)
  - Table size growth (warn if >10GB)

✓ API Metrics:
  - Request count (5-min window)
  - Response time (p95, p99)
  - Error rate by endpoint (alert if >5%)
  - Duplicate detection rate

✓ Application Metrics:
  - Uptime percentage
  - Import frequency and success rate
  - Cache hit ratio
  - Memory usage (alert if >80%)

✓ Frontend Metrics:
  - Page load time (user-perspective)
  - JavaScript errors (browser console)
  - Chart render time
  - Export functionality success rate
```

**Alert Thresholds:**

```
Critical (Page immediately):
  - Database connection pool exhausted
  - API error rate >10% for 5 minutes
  - System downtime >15 minutes

Warning (Investigate within 1 hour):
  - API response time p95 >2s
  - Memory usage >80%
  - Duplicate detection slow (>500ms)

Info (Log and trend):
  - High duplicate count (>100 per import)
  - Query time trending upward
```

### 6.5 Disaster Recovery

**Backup Strategy:**

```
Type              Frequency    Retention    Location
─────────────────────────────────────────────────────
Database Snapshots  Daily       7 days       Neon (built-in)
                    Weekly      4 weeks      S3 (backup)
                    Monthly     12 months    Glacier

Application Code    On Deploy   Unlimited    GitHub
                    On Change   Unlimited    Git History

Configuration      Monthly     12 months    Secure Vault
                    On Change   Unlimited    Git (encrypted)
```

**Recovery Procedures:**

**Scenario 1: Database Corruption**
```
RTO: <30 minutes
RPO: <24 hours

Steps:
  1. Identify corruption point (from audit logs)
  2. Restore from most recent daily snapshot
  3. Verify data integrity (run validation queries)
  4. Update RESTORED_FROM timestamp in application
  5. Notify affected users of any data loss
```

**Scenario 2: Application Server Failure**
```
RTO: <5 minutes
RPO: N/A (stateless app)

Steps:
  1. Automatic failover to standby instance
  2. Health check monitoring detects failure
  3. Route traffic to healthy instance
  4. Alert team for investigation
```

**Scenario 3: Catastrophic Data Loss (Ransomware/Malicious Delete)**
```
RTO: <2 hours
RPO: <24 hours

Steps:
  1. Detect data loss anomaly (large delete spike in audit log)
  2. Take database snapshot immediately
  3. Restore from monthly archive in Glacier
  4. Verify restore integrity
  5. Run data validation queries
  6. Restore application from code repository
  7. Document incident and update security policies
```

### 6.6 Disaster Recovery Runbooks

**Database Recovery Runbook:**

```
IF: Database connection failing

STEP 1: Verify connectivity
  Command: psql -U $PGUSER -h $PGHOST -d $PGDATABASE -c "SELECT 1"
  
STEP 2: Check database status
  Command: SELECT pg_database.datname, pg_stat_activity.pid
           FROM pg_database
           LEFT JOIN pg_stat_activity ON datname = datname;

STEP 3: If corrupted, trigger restore
  Neon Console:
    1. Navigate to Branches
    2. Select Latest Snapshot
    3. Create Branch from Snapshot
    4. Update CONNECTION_STRING in env
    5. Restart application

STEP 4: Validate restored data
  Command: SELECT COUNT(*) FROM field_notice_records
  Expected: Matches pre-failure count (within 1 day)

STEP 5: Update audit log with recovery event
  Log Entry: "Database recovered from snapshot dated {date}"
```

---

## Assumptions and Constraints

### 7.1 System Assumptions

1. **Single Data Source:** All Cisco field notice data originates from approved CSV exports
2. **Timestamp Reliability:** createdAt timestamp is reliable; dateImported is corrupted (deprecated)
3. **Limited Historical Data:** Initial deployment has only current month (April 2025) data
4. **No Real-Time Sync:** Data is imported periodically, not streamed
5. **User Base:** Internal SRE/DevOps teams, not public-facing
6. **Data Privacy:** No PII/PHI in Cisco field notice data (safe to log)
7. **Timezone:** All timestamps in UTC; frontend displays user's local timezone
8. **Browser Support:** Modern browsers only (Chrome, Firefox, Safari, Edge)

### 7.2 System Constraints

| Constraint | Impact | Mitigation |
|-----------|--------|-----------|
| **Single Database Instance** | No geographic redundancy | Neon built-in HA/failover |
| **In-Memory Cache (30s TTL)** | Fresh data limited | Short cache window acceptable |
| **Simulated Historical Data** | Not true historical trend | Use flag in response; plan for real data |
| **No Real-Time Streaming** | Dashboard refresh delay | 30-second auto-refresh sufficient |
| **Limited Concurrent Users** | 50 user cap | Upgrade database pool if needed |
| **CSV Import Only** | No API integration | API integration planned for future |
| **No Multi-Tenancy** | Single organization only | Architecture supports future multi-tenancy |

### 7.3 Scalability Considerations

**Current Capacity:**
- Records: 10M+ in single table (PostgreSQL indexed)
- Concurrent Users: 50 (with 20-connection pool)
- Monthly Data Volume: ~1M new records
- Database Size: 5-10 GB (estimated)

**Scaling Roadmap:**

```
Phase 1 (Current):
  - Single database instance
  - In-memory caching
  - Adequate for 50 users, 10M records

Phase 2 (2026):
  - Read replicas for analytics queries
  - Distributed caching (Redis)
  - Database partitioning by year

Phase 3 (2027):
  - Multi-region deployment
  - Event streaming (Kafka)
  - Data warehouse integration (Snowflake)

Phase 4 (2028):
  - Multi-tenant architecture
  - Advanced analytics (ML models)
  - Real-time threat intelligence
```

---

## Change Management

### 8.1 Version Control

**Current Version:** 1.0.0
**Release Date:** November 21, 2025

**Version Format:** MAJOR.MINOR.PATCH

```
MAJOR: Architecture or schema changes (breaking changes)
MINOR: New features or endpoints (backward compatible)
PATCH: Bug fixes or documentation (no functional changes)
```

### 8.2 Change Log

**Version 1.0.0 (November 21, 2025) - Production Release**

```
Features:
  ✓ Real-time vulnerability metrics dashboard
  ✓ Monthly and yearly trend analysis
  ✓ Top 10 Field Notices ranking
  ✓ Top 20 Customers ranking
  ✓ Field Notice ID normalization (FNxxxxx format)
  ✓ Duplicate prevention (composite key validation)
  ✓ CSV export functionality
  ✓ Audit logging system
  ✓ Interactive charts (Line, Bar, Area)
  ✓ Responsive design for multiple screen sizes

Infrastructure:
  ✓ PostgreSQL database with Neon backend
  ✓ Drizzle ORM for type-safe queries
  ✓ Express.js API gateway
  ✓ React SPA frontend
  ✓ Recharts for visualization
  ✓ Zod for schema validation
  ✓ Passport.js for authentication

Fixes:
  ✓ Y-axis label visibility (80px left margin, 70px YAxis width)
  ✓ Large number truncation (formatYAxisLabel with M/K abbreviations)
  ✓ Chart responsiveness (350px height, proper margins)
  ✓ Field Notice ID standardization across all components
  ✓ Duplicate detection accuracy (composite key validation)
```

### 8.3 Deployment Procedure

**Pre-Deployment Checklist:**

```
□ All tests passing (npm run test)
□ Build succeeds without errors (npm run build)
□ No console warnings or errors
□ Database migrations applied (npm run db:push)
□ Environment variables verified
□ API endpoints tested manually
□ Charts render correctly on desktop and mobile
□ CSV export functionality tested
□ Audit logs verified for recent changes
□ Performance benchmarks met
□ Security scan passed
```

**Deployment Steps:**

```
1. Code Review
   - All changes reviewed and approved
   - No uncommitted changes

2. Build & Test
   npm run build
   npm run test

3. Database Migration
   npm run db:push
   # Or if issues:
   npm run db:push --force

4. Deploy to Staging
   git push origin main
   # Automated CI/CD deploys to staging

5. Smoke Tests
   - Dashboard loads within 2s
   - All API endpoints return 200
   - Charts render without errors
   - CSV export works
   - Duplicate detection active

6. Deploy to Production
   # Manual approval required
   # Update DNS/load balancer

7. Post-Deployment
   - Monitor error logs for 1 hour
   - Verify metrics dashboard accuracy
   - Confirm all users can access
   - Update status page if needed
```

### 8.4 Rollback Procedure

**If critical issue detected post-deployment:**

```
RTO: <5 minutes (stateless app)

Steps:
  1. Stop traffic to new deployment
  2. Route to previous stable version
  3. Verify metrics dashboard working
  4. Alert team of rollback
  5. Begin incident investigation
  
Automatic Rollback Triggers:
  - Error rate >10% for 5 minutes
  - API response time p95 >3s for 5 minutes
  - Database connection pool exhausted
  - Critical security vulnerability detected
```

### 8.5 Future Enhancement Pipeline

**Planned for Version 1.1.0:**
- OAuth/OIDC integration
- Multi-user collaboration features
- Custom date range reporting
- Vulnerability trend predictions (ML)

**Planned for Version 2.0.0:**
- Multi-tenant architecture
- Advanced filtering and search
- Real-time data streaming
- Integration with external threat intelligence

---

## Appendices

### A. Glossary

| Term | Definition |
|------|-----------|
| **Field Notice (FN)** | Cisco documentation of discovered vulnerability/issue |
| **Vulnerable (totVuln)** | Assets confirmed to be affected by vulnerability |
| **Potentially Vulnerable (potVuln)** | Assets that may be affected; investigation pending |
| **Not Vulnerable (notVuln)** | Assets confirmed unaffected by vulnerability |
| **CPY Key** | **Sourced product identifier from Cisco data** - uniquely identifies a customer's product/service (PRESERVED AS-IS, NEVER GENERATED) |
| **Composite Key** | Unique database constraint: (fieldNoticeId + cpyKey + customerName) - ensures no duplicate records |
| **Duplicate Detection** | Prevention of identical records via database unique constraint on composite key |
| **Audit Trail** | Log of all modifications for compliance tracking |
| **ID Normalization** | Standardizing Field Notice IDs to FNxxxxx format (Field Notice IDs ONLY, not CPY Keys) |
| **Customer Association** | Link between CPY Key and customer name identifying a specific customer asset group |

### B. Related Documentation

- API Documentation: See `server/routes.ts` for endpoint specifications
- Database Schema: See `shared/schema.ts` for table definitions
- Frontend Components: See `client/src/pages/dashboard.tsx` for UI specifications
- Configuration: See `.env.example` for environment setup

### C. Contact & Support

**Architecture Owner:** Service Readiness Engineer Engineering Team
**Maintenance Team:** Platform Engineering
**On-Call:** PagerDuty escalation policy #service-readiness-alerts

---

**Document Status:** APPROVED FOR PRODUCTION
**Next Review Date:** May 21, 2026
**Last Modified:** November 21, 2025
