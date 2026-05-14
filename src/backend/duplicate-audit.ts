/**
 * Comprehensive Duplicate Audit Service
 * 
 * This service provides a thorough audit of customer records and field notices
 * to identify and eliminate duplicate entries while preserving data integrity.
 * 
 * Audit Criteria:
 * 1. Exact duplicates (all fields match)
 * 2. Customer name variations (normalized matching)
 * 3. Field notice duplicates (same FN + customer in different months)
 * 4. Composite key duplicates (FN + CPYKEY + Customer)
 * 5. Temporal duplicates (same record imported multiple times)
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { normalizeCustomerName, formatFieldNoticeId, categorizeFnType, isValidFieldNotice, INVALID_FN_PATTERN } from './storage';

// Audit statistics interface
export interface DuplicateAuditStats {
  timestamp: string;
  totalRecords: number;
  uniqueRecords: number;
  duplicatesRemoved: number;
  duplicateRate: number;
  
  // Invalid/malformed records
  invalidRecords: {
    emptyFieldNotice: number;
    emptyCustomerName: number;
    emptyCpyKey: number;
    invalidFieldNoticeFormat: number;  // FN00000, etc.
    completelyEmptyRows: number;
    totalInvalid: number;
    sampleInvalidRecords: Array<{
      index: number;
      issue: string;
      fieldNotice: string;
      customerName: string;
    }>;
  };
  
  // Breakdown by duplicate type
  duplicatesByType: {
    exactDuplicates: number;
    customerNameVariations: number;
    compositeKeyDuplicates: number;
    temporalDuplicates: number;
    crossMonthDuplicates: number;
  };
  
  // Customer analysis
  customerAnalysis: {
    totalCustomerRecords: number;
    uniqueCustomers: number;
    customersWithDuplicates: number;
    topDuplicatedCustomers: Array<{
      customerName: string;
      duplicateCount: number;
      variants: string[];
    }>;
  };
  
  // Field notice analysis
  fieldNoticeAnalysis: {
    totalFieldNoticeRecords: number;
    uniqueFieldNotices: number;
    fieldNoticesWithDuplicates: number;
    topDuplicatedFieldNotices: Array<{
      fieldNoticeId: string;
      fnTitle: string;
      duplicateCount: number;
      affectedMonths: string[];
    }>;
  };
  
  // Storage/performance improvements
  improvements: {
    recordsReduced: number;
    storageReductionPercent: number;
    estimatedMemorySaved: string;
    queryPerformanceImprovement: string;
  };
  
  // Actions taken
  auditLog: Array<{
    action: string;
    recordsAffected: number;
    details: string;
    timestamp: string;
  }>;
}

// Raw CSV record type
interface RawRecord {
  FIELD_NOTICE: string;
  FIRST_PUBLISHED: string;
  FN_TITLE: string;
  FN_TYPE: string;
  TOT_VULN: string;
  CVUL: string;
  POT_VULN: string;
  CPVUL: string;
  NOT_VULN: string;
  CNVUL: string;
  DATE_IMPORTED: string;
  CPYKEY: string;
  CUSTOMER_NAME: string;
  [key: string]: string;
}

// Processed record for analysis
interface ProcessedRecord {
  originalIndex: number;
  raw: RawRecord;
  
  // Normalized fields
  fieldNotice: string;
  fieldNoticeFormatted: string;
  fnTitle: string;
  fnType: string;
  fnTypeCategory: string;
  customerName: string;
  normalizedCustomer: string;
  cpyKey: string;
  month: string;
  
  // Numeric values
  totVuln: number;
  potVuln: number;
  notVuln: number;
  total: number;
  
  // Duplicate detection keys
  exactKey: string;         // All fields hash
  compositeKey: string;     // FN + CPYKEY + Customer
  customerFNKey: string;    // Normalized Customer + FN
  temporalKey: string;      // FN + Customer + Values (ignoring month)
}

/**
 * Generate a hash key from all fields for exact duplicate detection
 */
function generateExactKey(record: RawRecord): string {
  return Object.values(record).join('|').toLowerCase().trim();
}

/**
 * Process a raw record into a normalized processed record
 */
function processRecord(raw: RawRecord, index: number): ProcessedRecord {
  const fieldNotice = raw.FIELD_NOTICE?.trim() || '';
  const customerName = raw.CUSTOMER_NAME?.trim() || '';
  const cpyKey = raw.CPYKEY?.trim() || '';
  const fnType = raw.FN_TYPE?.trim() || '';
  const month = raw.DATE_IMPORTED?.trim() || '';
  
  const normalizedCustomer = normalizeCustomerName(customerName) || customerName;
  const fieldNoticeFormatted = formatFieldNoticeId(fieldNotice);
  const fnTypeCategory = categorizeFnType(fnType);
  
  const totVuln = parseInt(raw.TOT_VULN) || 0;
  const potVuln = parseInt(raw.POT_VULN) || 0;
  const notVuln = parseInt(raw.NOT_VULN) || 0;
  
  return {
    originalIndex: index,
    raw,
    fieldNotice,
    fieldNoticeFormatted,
    fnTitle: raw.FN_TITLE?.trim() || '',
    fnType,
    fnTypeCategory,
    customerName,
    normalizedCustomer,
    cpyKey,
    month,
    totVuln,
    potVuln,
    notVuln,
    total: totVuln + potVuln + notVuln,
    
    // Keys for duplicate detection
    exactKey: generateExactKey(raw),
    compositeKey: `${fieldNotice}|${cpyKey}|${normalizedCustomer}`,
    customerFNKey: `${normalizedCustomer}|${fieldNotice}`,
    temporalKey: `${fieldNotice}|${normalizedCustomer}|${totVuln}|${potVuln}|${notVuln}`,
  };
}

/**
 * Analyze customer name variations
 */
function analyzeCustomerVariations(records: ProcessedRecord[]): Map<string, Set<string>> {
  const normalizedToOriginals = new Map<string, Set<string>>();
  
  for (const record of records) {
    if (!normalizedToOriginals.has(record.normalizedCustomer)) {
      normalizedToOriginals.set(record.normalizedCustomer, new Set());
    }
    normalizedToOriginals.get(record.normalizedCustomer)!.add(record.customerName);
  }
  
  return normalizedToOriginals;
}

/**
 * Find field notices that appear across multiple months for the same customer
 */
function findCrossMonthDuplicates(records: ProcessedRecord[]): Map<string, ProcessedRecord[]> {
  const customerFNGroups = new Map<string, ProcessedRecord[]>();
  
  for (const record of records) {
    const key = record.customerFNKey;
    if (!customerFNGroups.has(key)) {
      customerFNGroups.set(key, []);
    }
    customerFNGroups.get(key)!.push(record);
  }
  
  // Filter to only those with multiple records
  const duplicates = new Map<string, ProcessedRecord[]>();
  const customerFNEntries = Array.from(customerFNGroups.entries());
  for (const [key, group] of customerFNEntries) {
    if (group.length > 1) {
      // Check if they're in different months
      const months = new Set(group.map((r: ProcessedRecord) => r.month));
      if (months.size > 1) {
        duplicates.set(key, group);
      }
    }
  }
  
  return duplicates;
}

/**
 * Run comprehensive duplicate audit
 */
export async function runDuplicateAudit(csvPath?: string): Promise<DuplicateAuditStats> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const auditLog: DuplicateAuditStats['auditLog'] = [];
  
  // Use default path if not provided
  const filePath = csvPath || path.join(
    process.cwd(),
    'attached_assets',
    'filtered_bcs_apr25-sep25_2025_apr-sep_1763979225097.csv'
  );
  
  console.log('[AUDIT] Starting comprehensive duplicate audit...');
  console.log(`[AUDIT] CSV Path: ${filePath}`);
  
  auditLog.push({
    action: 'AUDIT_STARTED',
    recordsAffected: 0,
    details: `Starting audit of ${filePath}`,
    timestamp,
  });
  
  // Read and parse CSV
  const csvContent = await fs.readFile(filePath, 'utf-8');
  const rawRecords: RawRecord[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });
  
  console.log(`[AUDIT] Loaded ${rawRecords.length} raw records`);
  
  auditLog.push({
    action: 'DATA_LOADED',
    recordsAffected: rawRecords.length,
    details: `Loaded ${rawRecords.length} raw records from CSV`,
    timestamp: new Date().toISOString(),
  });
  
  // Process all records
  const processedRecords = rawRecords.map((raw, idx) => processRecord(raw, idx));
  
  // ============================================
  // 0. INVALID/MALFORMED RECORDS DETECTION
  // ============================================
  let emptyFieldNotice = 0;
  let emptyCustomerName = 0;
  let emptyCpyKey = 0;
  let invalidFieldNoticeFormat = 0;
  let completelyEmptyRows = 0;
  const sampleInvalidRecords: Array<{ index: number; issue: string; fieldNotice: string; customerName: string }> = [];
  
  // Use the centralized invalid field notice pattern from storage.ts
  // Matches: FN00000, FN0000, FN000, empty, 'unknown', 'invalid', 'null', 'none', 'n/a', etc.
  
  for (const record of processedRecords) {
    const issues: string[] = [];
    
    // Check for empty field notice
    if (!record.fieldNotice || record.fieldNotice.trim() === '') {
      emptyFieldNotice++;
      issues.push('empty_field_notice');
    }
    // Check for invalid field notice format (FN00000, etc.) using centralized pattern
    else if (!isValidFieldNotice(record.fieldNotice)) {
      invalidFieldNoticeFormat++;
      issues.push(`invalid_fn_format: ${record.fieldNotice}`);
    }
    
    // Check for empty customer name
    if (!record.customerName || record.customerName.trim() === '') {
      emptyCustomerName++;
      issues.push('empty_customer_name');
    }
    
    // Check for empty CPYKEY
    if (!record.cpyKey || record.cpyKey.trim() === '') {
      emptyCpyKey++;
      issues.push('empty_cpykey');
    }
    
    // Check for completely empty rows (all key fields empty)
    if ((!record.fieldNotice || record.fieldNotice.trim() === '') &&
        (!record.customerName || record.customerName.trim() === '') &&
        (!record.cpyKey || record.cpyKey.trim() === '')) {
      completelyEmptyRows++;
    }
    
    // Collect sample invalid records (limit to 20)
    if (issues.length > 0 && sampleInvalidRecords.length < 20) {
      sampleInvalidRecords.push({
        index: record.originalIndex,
        issue: issues.join(', '),
        fieldNotice: record.fieldNotice || '(empty)',
        customerName: record.customerName || '(empty)',
      });
    }
  }
  
  const totalInvalid = emptyFieldNotice + invalidFieldNoticeFormat;
  
  console.log(`[AUDIT] Found ${totalInvalid} invalid records:`);
  console.log(`  - Empty Field Notice: ${emptyFieldNotice}`);
  console.log(`  - Invalid FN Format (FN00000, etc.): ${invalidFieldNoticeFormat}`);
  console.log(`  - Empty Customer Name: ${emptyCustomerName}`);
  console.log(`  - Empty CPYKEY: ${emptyCpyKey}`);
  console.log(`  - Completely Empty Rows: ${completelyEmptyRows}`);
  
  auditLog.push({
    action: 'INVALID_RECORDS_DETECTED',
    recordsAffected: totalInvalid,
    details: `Found ${totalInvalid} invalid records: ${emptyFieldNotice} empty FN, ${invalidFieldNoticeFormat} invalid FN format (FN00000, etc.), ${completelyEmptyRows} empty rows`,
    timestamp: new Date().toISOString(),
  });
  
  // Filter out completely invalid records for duplicate analysis
  // Uses the centralized isValidFieldNotice function from storage.ts
  const validRecords = processedRecords.filter(r => 
    r.fieldNotice && r.fieldNotice.trim() !== '' && isValidFieldNotice(r.fieldNotice)
  );
  
  console.log(`[AUDIT] Analyzing ${validRecords.length} valid records for duplicates (excluded ${totalInvalid} invalid FN00000/empty records)`);
  
  // ============================================
  // 1. EXACT DUPLICATES
  // ============================================
  const exactKeyMap = new Map<string, ProcessedRecord[]>();
  for (const record of validRecords) {
    if (!exactKeyMap.has(record.exactKey)) {
      exactKeyMap.set(record.exactKey, []);
    }
    exactKeyMap.get(record.exactKey)!.push(record);
  }
  
  let exactDuplicates = 0;
  const exactKeyEntries = Array.from(exactKeyMap.values());
  for (const group of exactKeyEntries) {
    if (group.length > 1) {
      exactDuplicates += group.length - 1; // Count extras as duplicates
    }
  }
  
  console.log(`[AUDIT] Found ${exactDuplicates} exact duplicates`);
  
  auditLog.push({
    action: 'EXACT_DUPLICATES_DETECTED',
    recordsAffected: exactDuplicates,
    details: `Found ${exactDuplicates} exact duplicate records (all fields identical)`,
    timestamp: new Date().toISOString(),
  });
  
  // ============================================
  // 2. COMPOSITE KEY DUPLICATES (FN + CPYKEY + Customer)
  // ============================================
  const compositeKeyMap = new Map<string, ProcessedRecord[]>();
  for (const record of validRecords) {
    if (!compositeKeyMap.has(record.compositeKey)) {
      compositeKeyMap.set(record.compositeKey, []);
    }
    compositeKeyMap.get(record.compositeKey)!.push(record);
  }
  
  let compositeKeyDuplicates = 0;
  const uniqueCompositeKeys = compositeKeyMap.size;
  const compositeKeyEntries = Array.from(compositeKeyMap.values());
  for (const group of compositeKeyEntries) {
    if (group.length > 1) {
      compositeKeyDuplicates += group.length - 1;
    }
  }
  
  console.log(`[AUDIT] Found ${compositeKeyDuplicates} composite key duplicates (${uniqueCompositeKeys} unique keys)`);
  
  auditLog.push({
    action: 'COMPOSITE_KEY_DUPLICATES_DETECTED',
    recordsAffected: compositeKeyDuplicates,
    details: `Found ${compositeKeyDuplicates} records with duplicate FN+CPYKEY+Customer combination`,
    timestamp: new Date().toISOString(),
  });
  
  // ============================================
  // 3. CUSTOMER NAME VARIATIONS
  // ============================================
  const customerVariations = analyzeCustomerVariations(validRecords);
  let customerNameVariationCount = 0;
  const customersWithVariations: Array<{ customerName: string; variants: string[] }> = [];
  
  const customerVariationEntries = Array.from(customerVariations.entries());
  for (const [normalized, originals] of customerVariationEntries) {
    if (originals.size > 1) {
      customerNameVariationCount += originals.size - 1;
      customersWithVariations.push({
        customerName: normalized,
        variants: Array.from(originals),
      });
    }
  }
  
  console.log(`[AUDIT] Found ${customerNameVariationCount} customer name variations across ${customersWithVariations.length} customers`);
  
  auditLog.push({
    action: 'CUSTOMER_VARIATIONS_DETECTED',
    recordsAffected: customerNameVariationCount,
    details: `Found ${customersWithVariations.length} customers with multiple name variations`,
    timestamp: new Date().toISOString(),
  });
  
  // ============================================
  // 4. CROSS-MONTH DUPLICATES
  // ============================================
  const crossMonthDuplicates = findCrossMonthDuplicates(validRecords);
  let crossMonthDuplicateCount = 0;
  
  const crossMonthEntries = Array.from(crossMonthDuplicates.values());
  for (const group of crossMonthEntries) {
    crossMonthDuplicateCount += group.length - 1;
  }
  
  console.log(`[AUDIT] Found ${crossMonthDuplicateCount} cross-month duplicates across ${crossMonthDuplicates.size} customer-FN pairs`);
  
  auditLog.push({
    action: 'CROSS_MONTH_DUPLICATES_DETECTED',
    recordsAffected: crossMonthDuplicateCount,
    details: `Found ${crossMonthDuplicates.size} customer-FN pairs appearing in multiple months`,
    timestamp: new Date().toISOString(),
  });
  
  // ============================================
  // 5. TEMPORAL DUPLICATES (same values, different import dates)
  // ============================================
  const temporalKeyMap = new Map<string, ProcessedRecord[]>();
  for (const record of validRecords) {
    if (!temporalKeyMap.has(record.temporalKey)) {
      temporalKeyMap.set(record.temporalKey, []);
    }
    temporalKeyMap.get(record.temporalKey)!.push(record);
  }
  
  let temporalDuplicates = 0;
  const temporalKeyEntries = Array.from(temporalKeyMap.values());
  for (const group of temporalKeyEntries) {
    if (group.length > 1) {
      temporalDuplicates += group.length - 1;
    }
  }
  
  console.log(`[AUDIT] Found ${temporalDuplicates} temporal duplicates (same values, different dates)`);
  
  auditLog.push({
    action: 'TEMPORAL_DUPLICATES_DETECTED',
    recordsAffected: temporalDuplicates,
    details: `Found ${temporalDuplicates} records with identical values across different import dates`,
    timestamp: new Date().toISOString(),
  });
  
  // ============================================
  // CUSTOMER ANALYSIS
  // ============================================
  const customerRecordCount = new Map<string, number>();
  for (const record of validRecords) {
    const count = customerRecordCount.get(record.normalizedCustomer) || 0;
    customerRecordCount.set(record.normalizedCustomer, count + 1);
  }
  
  const customersWithDuplicates = Array.from(customerRecordCount.entries())
    .filter(([, count]) => count > 1);
  
  const topDuplicatedCustomers = customersWithDuplicates
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([customerName, count]) => ({
      customerName,
      duplicateCount: count,
      variants: Array.from(customerVariations.get(customerName) || []),
    }));
  
  // ============================================
  // FIELD NOTICE ANALYSIS
  // ============================================
  const fnRecordCount = new Map<string, { count: number; title: string; months: Set<string> }>();
  for (const record of validRecords) {
    const existing = fnRecordCount.get(record.fieldNoticeFormatted) || {
      count: 0,
      title: record.fnTitle,
      months: new Set<string>(),
    };
    existing.count++;
    existing.months.add(record.month);
    fnRecordCount.set(record.fieldNoticeFormatted, existing);
  }
  
  const fnWithDuplicates = Array.from(fnRecordCount.entries())
    .filter(([, data]) => data.count > 1);
  
  const topDuplicatedFieldNotices = fnWithDuplicates
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([fieldNoticeId, data]) => ({
      fieldNoticeId,
      fnTitle: data.title,
      duplicateCount: data.count,
      affectedMonths: Array.from(data.months).sort(),
    }));
  
  // ============================================
  // CALCULATE IMPROVEMENTS
  // ============================================
  const totalDuplicates = compositeKeyDuplicates + totalInvalid; // Include invalid records
  const recordsReduced = totalDuplicates;
  const storageReductionPercent = (recordsReduced / rawRecords.length) * 100;
  
  // Estimate memory saved (rough estimate: ~500 bytes per record)
  const bytesPerRecord = 500;
  const memorySavedBytes = recordsReduced * bytesPerRecord;
  const memorySavedMB = (memorySavedBytes / (1024 * 1024)).toFixed(2);
  
  // Estimate query performance improvement
  const queryImprovement = ((rawRecords.length / uniqueCompositeKeys) - 1) * 100;
  
  console.log(`[AUDIT] Audit completed in ${Date.now() - startTime}ms`);
  
  auditLog.push({
    action: 'AUDIT_COMPLETED',
    recordsAffected: totalDuplicates,
    details: `Audit completed. Identified ${totalDuplicates} problematic records (${totalInvalid} invalid + ${compositeKeyDuplicates} duplicates)`,
    timestamp: new Date().toISOString(),
  });
  
  // ============================================
  // BUILD FINAL REPORT
  // ============================================
  const report: DuplicateAuditStats = {
    timestamp,
    totalRecords: rawRecords.length,
    uniqueRecords: uniqueCompositeKeys,
    duplicatesRemoved: recordsReduced,
    duplicateRate: (recordsReduced / rawRecords.length) * 100,
    
    invalidRecords: {
      emptyFieldNotice,
      emptyCustomerName,
      emptyCpyKey,
      invalidFieldNoticeFormat,
      completelyEmptyRows,
      totalInvalid,
      sampleInvalidRecords,
    },
    
    duplicatesByType: {
      exactDuplicates,
      customerNameVariations: customerNameVariationCount,
      compositeKeyDuplicates,
      temporalDuplicates,
      crossMonthDuplicates: crossMonthDuplicateCount,
    },
    
    customerAnalysis: {
      totalCustomerRecords: validRecords.length,
      uniqueCustomers: customerVariations.size,
      customersWithDuplicates: customersWithDuplicates.length,
      topDuplicatedCustomers,
    },
    
    fieldNoticeAnalysis: {
      totalFieldNoticeRecords: validRecords.length,
      uniqueFieldNotices: fnRecordCount.size,
      fieldNoticesWithDuplicates: fnWithDuplicates.length,
      topDuplicatedFieldNotices,
    },
    
    improvements: {
      recordsReduced,
      storageReductionPercent: Math.round(storageReductionPercent * 100) / 100,
      estimatedMemorySaved: `${memorySavedMB} MB`,
      queryPerformanceImprovement: `${Math.round(queryImprovement)}% faster`,
    },
    
    auditLog,
  };
  
  return report;
}

/**
 * Get deduplicated records (merging strategy: keep first, sum values if different)
 */
export async function getDeduplicatedRecords(csvPath?: string): Promise<{
  records: RawRecord[];
  mergeLog: Array<{
    primaryRecord: number;
    mergedRecords: number[];
    action: string;
  }>;
}> {
  const filePath = csvPath || path.join(
    process.cwd(),
    'attached_assets',
    'filtered_bcs_apr25-sep25_2025_apr-sep_1763979225097.csv'
  );
  
  // Read and parse CSV
  const csvContent = await fs.readFile(filePath, 'utf-8');
  const rawRecords: RawRecord[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });
  
  // Process all records
  const processedRecords = rawRecords.map((raw, idx) => processRecord(raw, idx));
  
  // Group by composite key
  const compositeKeyMap = new Map<string, ProcessedRecord[]>();
  for (const record of processedRecords) {
    if (!compositeKeyMap.has(record.compositeKey)) {
      compositeKeyMap.set(record.compositeKey, []);
    }
    compositeKeyMap.get(record.compositeKey)!.push(record);
  }
  
  const deduplicatedRecords: RawRecord[] = [];
  const mergeLog: Array<{
    primaryRecord: number;
    mergedRecords: number[];
    action: string;
  }> = [];
  
  // Process each group
  const dedupCompositeEntries = Array.from(compositeKeyMap.entries());
  for (const [key, group] of dedupCompositeEntries) {
    if (group.length === 1) {
      // No duplicates, keep as is
      deduplicatedRecords.push(group[0].raw);
    } else {
      // Multiple records - merge them
      // Strategy: Keep first record, preserve max values for vulnerability counts
      const primary = group[0];
      const mergedIndices = group.slice(1).map((r: ProcessedRecord) => r.originalIndex);
      
      // Find max values across all duplicates
      let maxTotVuln = primary.totVuln;
      let maxPotVuln = primary.potVuln;
      let maxNotVuln = primary.notVuln;
      
      for (const dup of group.slice(1)) {
        maxTotVuln = Math.max(maxTotVuln, dup.totVuln);
        maxPotVuln = Math.max(maxPotVuln, dup.potVuln);
        maxNotVuln = Math.max(maxNotVuln, dup.notVuln);
      }
      
      // Create merged record
      const mergedRecord: RawRecord = {
        ...primary.raw,
        TOT_VULN: String(maxTotVuln),
        POT_VULN: String(maxPotVuln),
        NOT_VULN: String(maxNotVuln),
      };
      
      deduplicatedRecords.push(mergedRecord);
      
      mergeLog.push({
        primaryRecord: primary.originalIndex,
        mergedRecords: mergedIndices,
        action: `Merged ${group.length} records for ${key}. Max values: TOT_VULN=${maxTotVuln}, POT_VULN=${maxPotVuln}, NOT_VULN=${maxNotVuln}`,
      });
    }
  }
  
  return {
    records: deduplicatedRecords,
    mergeLog,
  };
}

/**
 * Validate a new record against existing data for duplicates
 */
export function validateNewRecord(
  newRecord: RawRecord,
  existingCompositeKeys: Set<string>
): {
  isDuplicate: boolean;
  duplicateType: string | null;
  recommendation: string;
} {
  const processed = processRecord(newRecord, 0);
  
  if (existingCompositeKeys.has(processed.compositeKey)) {
    return {
      isDuplicate: true,
      duplicateType: 'composite_key',
      recommendation: `Record with FN=${processed.fieldNotice}, CPYKEY=${processed.cpyKey}, Customer=${processed.normalizedCustomer} already exists. Consider merging instead of inserting.`,
    };
  }
  
  return {
    isDuplicate: false,
    duplicateType: null,
    recommendation: 'Record is unique and can be safely inserted.',
  };
}

/**
 * Get all existing composite keys for validation
 */
export async function getExistingCompositeKeys(csvPath?: string): Promise<Set<string>> {
  const filePath = csvPath || path.join(
    process.cwd(),
    'attached_assets',
    'filtered_bcs_apr25-sep25_2025_apr-sep_1763979225097.csv'
  );
  
  const csvContent = await fs.readFile(filePath, 'utf-8');
  const rawRecords: RawRecord[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });
  
  const keys = new Set<string>();
  for (const raw of rawRecords) {
    const fieldNotice = raw.FIELD_NOTICE?.trim() || '';
    const customerName = raw.CUSTOMER_NAME?.trim() || '';
    const cpyKey = raw.CPYKEY?.trim() || '';
    const normalizedCustomer = normalizeCustomerName(customerName) || customerName;
    const compositeKey = `${fieldNotice}|${cpyKey}|${normalizedCustomer}`;
    keys.add(compositeKey);
  }
  
  return keys;
}
