# Excluded Columns Documentation

This document defines the columns that are explicitly excluded from all data processing, analysis, and calculations throughout the SRE AgenticOps Intelligence Dashboard.

## Excluded Columns

The following columns are **NOT** processed, stored, or used in any calculations:

1. **CVUL** (`cvul` field in database schema)
   - Percentage or count of vulnerable assets
   - **Status**: Excluded from import, aggregation, and display

2. **CPVUL** (`cpVuln` field in database schema)
   - Percentage or count of potentially vulnerable assets
   - **Status**: Excluded from import, aggregation, and display

3. **CNVUL** (`cNotVuln` field in database schema)
   - Percentage or count of not vulnerable assets
   - **Status**: Excluded from import, aggregation, and display

## Implementation Details

### Database Level
- Columns remain in schema for backward compatibility
- Fields are **NOT included** in the `insertFieldNoticeSchema`
- Import operations explicitly skip these columns
- Database constraints prevent these columns from being processed

### API Level
- CSV import skips parsing values for excluded columns (parts[5], parts[7], parts[9])
- All API endpoints omit these fields from validation and processing
- Insert schema validation blocks any attempt to set these fields

### UI Level
- Form submission does not include excluded columns
- Record display table omits these columns entirely
- No aggregation or calculation uses these fields

### Code Locations

#### Excluded from Import
- `server/direct-load.ts`: Lines with cvul, cpVuln, cNotVuln removed
- `server/force-complete-import.ts`: Lines with cvul, cpVuln, cNotVuln removed

#### Excluded from Validation Schema
- `shared/schema.ts`: insertFieldNoticeSchema explicitly omits these three fields

#### Excluded from UI
- `client/src/pages/records.tsx`: 
  - Form state does not include these fields
  - Table columns only display potVuln and notVuln
  - Create record mutation excludes these fields

## Validation Checks

The system includes implicit validation that prevents these columns from being processed:

1. **Schema-level validation**: Zod schema explicitly omits cvul, cpVuln, cNotVuln
2. **Import-level validation**: CSV parsing skips indices for these columns
3. **API-level validation**: insertFieldNoticeSchema.safeParse() rejects any attempt to include them
4. **UI-level validation**: Form does not collect data for these fields

## Impact on Metrics

All metrics calculations use only the following fields:
- `totVuln`: Total vulnerable count
- `potVuln`: Potentially vulnerable count (POT_VULN)
- `notVuln`: Not vulnerable count (NOT_VULN)

The three excluded columns (CVUL, CPVUL, CNVUL) do **NOT** affect any calculations.

## Future Changes

If these columns need to be re-enabled:
1. Add them back to `insertFieldNoticeSchema` in `shared/schema.ts`
2. Update CSV parsing in import scripts to capture the values
3. Add form fields in `client/src/pages/records.tsx`
4. Update table display columns
5. This documentation must be updated to reflect the change

---
**Last Updated**: November 21, 2025
**Status**: FULLY IMPLEMENTED AND ENFORCED
