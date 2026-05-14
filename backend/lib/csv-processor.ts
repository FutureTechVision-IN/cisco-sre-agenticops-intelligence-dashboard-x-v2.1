/**
 * CSV Processor - Data cleaning, deduplication, and validation
 * Handles Field Notice data processing with comprehensive quality assurance
 */

import { parse, stringify } from "csv/sync";
import fs from "fs";
import path from "path";

export interface ProcessingReport {
  totalRecords: number;
  uniqueCustomers: number;
  uniqueFieldNotices: number;
  duplicatesRemoved: number;
  recordsProcessed: number;
  errorsEncountered: number;
  warnings: string[];
  errors: Array<{ rowNumber: number; reason: string; data: any }>;
  fieldNoticeFormattingChanges: number;
  customerStandardizations: number;
  timestamp: string;
}

export interface ProcessedRecord {
  "Field Notice ID": string;
  "Customer Name": string;
  "CPY Key": string;
  "Vulnerable": number;
  "Potentially Vulnerable": number;
  "Not Vulnerable": number;
  "Filter": string;
  "Type": string;
}

/**
 * Standardizes Field Notice ID to FNxxxxx format
 */
function formatFieldNoticeId(id: string): { formatted: string; changed: boolean } {
  if (!id) return { formatted: "", changed: false };
  
  const original = id;
  let formatted = id.toString().trim().toUpperCase();

  // Remove FN prefix if present
  if (formatted.startsWith("FN")) {
    formatted = formatted.substring(2);
  }

  // Extract only digits
  formatted = formatted.replace(/\D/g, "");

  // Pad to 5 digits
  formatted = "FN" + formatted.padStart(5, "0");

  return {
    formatted,
    changed: original.toUpperCase() !== formatted,
  };
}

/**
 * Standardizes customer name formatting
 */
function standardizeCustomerName(name: string): { standardized: string; changed: boolean } {
  if (!name) return { standardized: "", changed: false };

  const original = name;
  // Trim whitespace and normalize
  const standardized = name.trim();

  return {
    standardized,
    changed: original !== standardized,
  };
}

/**
 * Generates filter category based on field notice type and vulnerability
 */
function generateFilter(
  fnType: string,
  totVuln: number,
  potVuln: number
): string {
  const types: string[] = [];

  // By Type
  if (fnType) {
    types.push(fnType);
  }

  // By Severity
  if (totVuln > 0) {
    types.push("Critical");
  } else if (potVuln > 0) {
    types.push("High");
  } else {
    types.push("Info");
  }

  return types.filter(Boolean).join(" | ");
}

/**
 * Processes CSV file with deduplication and standardization
 */
export async function processCSVFile(
  filePath: string
): Promise<{ records: ProcessedRecord[]; report: ProcessingReport }> {
  const report: ProcessingReport = {
    totalRecords: 0,
    uniqueCustomers: 0,
    uniqueFieldNotices: 0,
    duplicatesRemoved: 0,
    recordsProcessed: 0,
    errorsEncountered: 0,
    warnings: [],
    errors: [],
    fieldNoticeFormattingChanges: 0,
    customerStandardizations: 0,
    timestamp: new Date().toISOString(),
  };

  try {
    // Read file
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });

    report.totalRecords = records.length;
    const processedRecords: ProcessedRecord[] = [];
    const seenCombinations = new Set<string>();

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNumber = i + 2; // Account for header

      try {
        // Extract and clean fields
        const fnId = row["Field Notice ID"] || row["FN"] || row["fieldNoticeId"] || "";
        const customerName =
          row["Customer Name"] || row["Customer"] || row["customerName"] || "";
        const cpyKey = row["CPY Key"] || row["CPY"] || row["cpyKey"] || "";
        const totVuln = parseInt(row["Vulnerable"] || row["totVuln"] || "0", 10);
        const potVuln = parseInt(
          row["Potentially Vulnerable"] || row["potVuln"] || "0",
          10
        );
        const notVuln = parseInt(row["Not Vulnerable"] || row["notVuln"] || "0", 10);
        const fnType = row["Type"] || row["fnType"] || "";

        // Validate required fields
        if (!fnId || !customerName) {
          report.errors.push({
            rowNumber,
            reason: "Missing required fields (FN ID or Customer Name)",
            data: row,
          });
          report.errorsEncountered++;
          continue;
        }

        // Format Field Notice ID
        const fnFormatted = formatFieldNoticeId(fnId);
        if (fnFormatted.changed) {
          report.fieldNoticeFormattingChanges++;
        }

        // Standardize Customer Name
        const custStandardized = standardizeCustomerName(customerName);
        if (custStandardized.changed) {
          report.customerStandardizations++;
        }

        // Create composite key for deduplication
        const compositeKey = `${fnFormatted.formatted}#${cpyKey}#${custStandardized.standardized}`;

        // Check for duplicates
        if (seenCombinations.has(compositeKey)) {
          report.duplicatesRemoved++;
          report.warnings.push(
            `Duplicate found: ${compositeKey} (row ${rowNumber})`
          );
          continue;
        }

        seenCombinations.add(compositeKey);

        // Generate filter
        const filter = generateFilter(fnType, totVuln, potVuln);

        // Create processed record
        const processedRecord: ProcessedRecord = {
          "Field Notice ID": fnFormatted.formatted,
          "Customer Name": custStandardized.standardized,
          "CPY Key": cpyKey,
          "Vulnerable": totVuln,
          "Potentially Vulnerable": potVuln,
          "Not Vulnerable": notVuln,
          "Filter": filter,
          "Type": fnType,
        };

        processedRecords.push(processedRecord);
        report.recordsProcessed++;
      } catch (error) {
        report.errors.push({
          rowNumber,
          reason: error instanceof Error ? error.message : "Unknown error",
          data: row,
        });
        report.errorsEncountered++;
      }
    }

    // Calculate statistics
    const uniqueCustomers = new Set(
      processedRecords.map((r) => r["Customer Name"])
    );
    const uniqueFieldNotices = new Set(
      processedRecords.map((r) => r["Field Notice ID"])
    );

    report.uniqueCustomers = uniqueCustomers.size;
    report.uniqueFieldNotices = uniqueFieldNotices.size;

    // Add summary warnings
    if (report.duplicatesRemoved > 0) {
      report.warnings.push(
        `${report.duplicatesRemoved} duplicate records removed`
      );
    }
    if (report.fieldNoticeFormattingChanges > 0) {
      report.warnings.push(
        `${report.fieldNoticeFormattingChanges} Field Notice IDs reformatted`
      );
    }
    if (report.customerStandardizations > 0) {
      report.warnings.push(
        `${report.customerStandardizations} Customer names standardized`
      );
    }

    return { records: processedRecords, report };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    report.errors.push({
      rowNumber: 0,
      reason: `File processing failed: ${errorMessage}`,
      data: {},
    });
    report.errorsEncountered++;
    return { records: [], report };
  }
}

/**
 * Writes processed records to CSV file
 */
export function writeProcessedCSV(
  records: ProcessedRecord[],
  outputPath: string
): void {
  const csv = stringify(records, {
    header: true,
    columns: [
      "Field Notice ID",
      "Customer Name",
      "CPY Key",
      "Vulnerable",
      "Potentially Vulnerable",
      "Not Vulnerable",
      "Filter",
      "Type",
    ],
  });

  fs.writeFileSync(outputPath, csv, "utf-8");
}

/**
 * Generates processing report as text
 */
export function generateReportText(report: ProcessingReport): string {
  const lines = [
    "═══════════════════════════════════════════════════════════════════════",
    "                     CSV PROCESSING REPORT",
    "═══════════════════════════════════════════════════════════════════════",
    "",
    `Timestamp: ${report.timestamp}`,
    "",
    "SUMMARY STATISTICS:",
    "─────────────────────────────────────────────────────────────────────",
    `  Total Records Processed:       ${report.totalRecords}`,
    `  Successfully Processed:        ${report.recordsProcessed}`,
    `  Records with Errors:           ${report.errorsEncountered}`,
    `  Unique Customers:              ${report.uniqueCustomers}`,
    `  Unique Field Notices:          ${report.uniqueFieldNotices}`,
    "",
    "DATA QUALITY IMPROVEMENTS:",
    "─────────────────────────────────────────────────────────────────────",
    `  Duplicates Removed:            ${report.duplicatesRemoved}`,
    `  Field Notice IDs Reformatted:  ${report.fieldNoticeFormattingChanges}`,
    `  Customer Names Standardized:   ${report.customerStandardizations}`,
    "",
  ];

  if (report.warnings.length > 0) {
    lines.push("WARNINGS:");
    lines.push("─────────────────────────────────────────────────────────────────────");
    for (const warning of report.warnings) {
      lines.push(`  ⚠ ${warning}`);
    }
    lines.push("");
  }

  if (report.errors.length > 0) {
    lines.push("ERRORS:");
    lines.push("─────────────────────────────────────────────────────────────────────");
    for (const error of report.errors.slice(0, 10)) {
      lines.push(`  Row ${error.rowNumber}: ${error.reason}`);
      if (Object.keys(error.data).length > 0) {
        lines.push(
          `    Data: ${JSON.stringify(error.data).substring(0, 100)}...`
        );
      }
    }
    if (report.errors.length > 10) {
      lines.push(`  ... and ${report.errors.length - 10} more errors`);
    }
    lines.push("");
  }

  lines.push("═══════════════════════════════════════════════════════════════════════");

  return lines.join("\n");
}
