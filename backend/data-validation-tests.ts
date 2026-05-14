/**
 * Data Validation Tests Module
 *
 * Runs a suite of validation checks against the loaded dataset to ensure
 * data integrity, format compliance, and spec-adherence.
 */

import { getMetricsFromCache, getAllRecordsFromCache } from "./csv-data-service";

export interface ValidationTestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: unknown;
}

export interface ValidationReport {
  timestamp: string;
  allPassed: boolean;
  results: ValidationTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

/**
 * Run all validation tests against the current dataset.
 * Returns a structured report with individual test results.
 */
export async function runAllValidationTests(): Promise<ValidationReport> {
  const results: ValidationTestResult[] = [];

  // Test 1: Data availability
  try {
    const records = await getAllRecordsFromCache();
    const hasData = records && records.length > 0;
    results.push({
      name: "Data Availability",
      passed: hasData,
      message: hasData
        ? `Dataset loaded with ${records.length} records`
        : "No data available in cache",
    });
  } catch (error) {
    results.push({
      name: "Data Availability",
      passed: false,
      message: `Failed to access data: ${(error as Error).message}`,
    });
  }

  // Test 2: Metrics calculation integrity
  try {
    const metrics = await getMetricsFromCache();
    const metricsValid = metrics !== null && metrics !== undefined;
    results.push({
      name: "Metrics Calculation",
      passed: metricsValid,
      message: metricsValid
        ? "Metrics computed successfully"
        : "Metrics returned null/undefined",
    });
  } catch (error) {
    results.push({
      name: "Metrics Calculation",
      passed: false,
      message: `Metrics computation error: ${(error as Error).message}`,
    });
  }

  // Test 3: Record schema validation (spot-check first 100 records)
  try {
    const records = await getAllRecordsFromCache();
    const sample = (records || []).slice(0, 100);
    const requiredFields = ["fieldNoticeId", "fnTitle", "fnType"];
    let schemaErrors = 0;

    for (const record of sample) {
      for (const field of requiredFields) {
        if (!(field in (record as Record<string, unknown>))) {
          schemaErrors++;
          break;
        }
      }
    }

    const passed = schemaErrors === 0;
    results.push({
      name: "Schema Validation",
      passed,
      message: passed
        ? `All sampled records contain required fields`
        : `${schemaErrors} records missing required fields`,
    });
  } catch (error) {
    results.push({
      name: "Schema Validation",
      passed: false,
      message: `Schema validation error: ${(error as Error).message}`,
    });
  }

  // Test 4: No duplicate field notice IDs
  try {
    const records = await getAllRecordsFromCache();
    const ids = (records || []).map(
      (r: Record<string, unknown>) => (r as { fieldNoticeId?: string }).fieldNoticeId
    ).filter(Boolean);
    const uniqueIds = new Set(ids);
    const hasDuplicates = ids.length !== uniqueIds.size;
    results.push({
      name: "Duplicate Detection",
      passed: !hasDuplicates,
      message: hasDuplicates
        ? `Found ${ids.length - uniqueIds.size} duplicate field notice IDs`
        : "No duplicate field notice IDs detected",
    });
  } catch (error) {
    results.push({
      name: "Duplicate Detection",
      passed: false,
      message: `Duplicate check error: ${(error as Error).message}`,
    });
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  return {
    timestamp: new Date().toISOString(),
    allPassed: failed === 0,
    results,
    summary: {
      total: results.length,
      passed,
      failed,
    },
  };
}
