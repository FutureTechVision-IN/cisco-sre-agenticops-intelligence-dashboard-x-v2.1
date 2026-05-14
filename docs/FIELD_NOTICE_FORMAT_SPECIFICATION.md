# Field Notice Format Specification

## Overview

This document defines the canonical format and validation rules for Field Notice IDs used throughout the Cisco SRE AgenticOps Intelligence Dashboard.

## Format Specification

### Required Format

```
FN + exactly 5 digits
```

**Pattern:** `^FN[0-9]{5}$`

### Examples

| Valid IDs | Invalid IDs | Reason |
|-----------|-------------|--------|
| FN70496 | FN00000 | Reserved invalid marker |
| FN72524 | FN1234 | Only 4 digits |
| FN12345 | FN123456 | 6 digits |
| FN00001 | 12345 | Missing FN prefix |
| FN99999 | FNABCDE | Non-numeric characters |

### Reserved Values

- **FN00000**: Reserved as an invalid/null marker. This ID should never appear in production data.

### Valid Range

- Minimum: `FN00001`
- Maximum: `FN99999`

## Validation Implementation

### Shared Validation Module

Location: `shared-types/field-notice-validator.ts`

Key exports:
- `FIELD_NOTICE_REGEX`: Pattern `/^FN[0-9]{5}$/`
- `isValidFieldNoticeId(id)`: Boolean validation
- `validateFieldNoticeId(id)`: Comprehensive validation with error codes
- `formatFieldNoticeId(id)`: Auto-format to correct pattern
- `batchValidate(ids)`: Validate multiple IDs
- `calculateComplianceMetrics(ids)`: Track validation compliance

### Error Codes

| Code | Description |
|------|-------------|
| `FN_ERR_NULL` | Input is null or undefined |
| `FN_ERR_EMPTY` | Input is empty string |
| `FN_ERR_NO_DIGITS` | Input has no numeric digits |
| `FN_ERR_ALL_ZEROS` | All digits are zeros |
| `FN_ERR_INVALID_PATTERN` | Matches invalid pattern |
| `FN_ERR_FORMAT_MISMATCH` | Does not match FN##### format |
| `FN_ERR_RESERVED` | FN00000 reserved value |

## Validation Layers

### 1. Database Layer

**File:** `migrations/0001_field_notice_format_constraint.sql`

PostgreSQL CHECK constraint:
```sql
ALTER TABLE field_notice_records
ADD CONSTRAINT chk_field_notice_id_format 
CHECK (is_valid_field_notice_id(field_notice_id));
```

### 2. Schema Layer (Zod)

**File:** `shared-types/schema.ts`

```typescript
export const fieldNoticeIdSchema = z.string()
  .trim()
  .toUpperCase()
  .regex(FIELD_NOTICE_ID_REGEX, {
    message: "Field Notice ID must be 'FN' followed by exactly 5 digits"
  })
  .refine(val => val !== 'FN00000', {
    message: "FN00000 is a reserved value and cannot be used"
  });
```

### 3. Backend Middleware

**File:** `backend/middleware/field-notice-validator.ts`

Middleware functions:
- `validateFieldNoticeParam()`: Validate URL params
- `validateFieldNoticeBody()`: Validate request body
- `validateFieldNoticeQuery()`: Validate query params
- `validateFieldNoticeArray()`: Validate arrays

### 4. Frontend Validation

**Files:**
- `frontend/hooks/useFieldNoticeValidation.ts`: React hook
- `frontend/components/ui/field-notice-input.tsx`: Input component

## Auto-Formatting Rules

The `formatFieldNoticeId()` function automatically corrects common input variations:

| Input | Output |
|-------|--------|
| `fn12345` | `FN12345` |
| `12345` | `FN12345` |
| `FN 12345` | `FN12345` |
| `FN#12345` | `FN12345` |
| `1` | `FN00001` |
| `99` | `FN00099` |
| `99999` | `FN99999` |
| `0` | `null` (invalid) |
| `100000` | `null` (exceeds max) |

## Data Audit Results (December 8, 2025)

### Top 10 Field Notices by Vulnerability Count

Based on analysis of `data/filtered_bcs_apr25-aug25_2025.csv`:

| Rank | Field Notice | Title | Vulnerable | Pot. Vuln | Not Vuln |
|------|--------------|-------|------------|-----------|----------|
| 1 | FN70496 | IP Phones Certificate Expiry | 3,249,961 | 0 | 0 |
| 2 | FN70546 | Webex Calling HW Compatibility | 2,496,281 | 0 | 0 |
| 3 | FN70464 | ASR 900/NCS 4200 Fan Failure | 222,554 | 0 | 0 |
| 4 | FN72270 | PAK Licenses Deprecation | 194,379 | 0 | 0 |
| 5 | FN72399 | Catalyst 2960X Counter Issue | 147,036 | 13,208 | 2,639,929 |
| 6 | FN64190 | IOS XE Show Commands Issue | 127,277 | 105 | 5,238,409 |
| 7 | FN72294 | PAK Licenses Deprecation | 113,128 | 0 | 0 |
| 8 | FN70320 | Nexus BIOS Password Bypass | 69,203 | 7,810 | 1,294,700 |
| 9 | FN74186 | Nexus Dashboard Operations | 49,085 | 0 | 314,550 |
| 10 | FN64131 | RSP720 Battery Discharge | 29,942 | 0 | 0 |

### Important Note

**FN72524** (Software Upgrade/Downgrade Issue) has **0 vulnerable devices** (TOT_VULN=0). It only has NOT_VULN (secure) counts, which is why it does NOT appear in the Top 10 by vulnerability count.

## Testing

Test file: `backend/__tests__/field-notice-validator.test.ts`

Run tests:
```bash
npm test -- field-notice-validator.test.ts
```

## Compliance Monitoring

Use the `calculateComplianceMetrics()` function to track format compliance:

```typescript
const metrics = calculateComplianceMetrics(ids);
console.log(`Compliance Rate: ${metrics.complianceRate}%`);
console.log(`Valid: ${metrics.validCount}, Invalid: ${metrics.invalidCount}`);
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | Dec 8, 2025 | Complete validation system, data audit, Top 10 fix |
| 1.0.0 | Nov 2025 | Initial implementation |

---

*This specification is maintained by the SRE AgenticOps Team.*
