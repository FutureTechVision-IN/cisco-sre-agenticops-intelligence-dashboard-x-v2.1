/**
 * Export Validation & Summary Module
 * Validates data integrity before file generation and provides executive summaries
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: ExportSummary;
  dataQuality: DataQualityMetrics;
}

export interface ExportSummary {
  totalRecords: number;
  completenessPercentage: number;
  processedAt: string;
  format: 'csv' | 'pdf' | 'excel';
  title: string;
  keyMetrics: KeyMetric[];
  dataCompleteness: FieldCompleteness[];
}

export interface KeyMetric {
  label: string;
  value: string | number;
  status: 'good' | 'warning' | 'error';
}

export interface FieldCompleteness {
  fieldName: string;
  populatedCount: number;
  totalCount: number;
  completenessPercentage: number;
}

export interface DataQualityMetrics {
  totalFields: number;
  populatedFields: number;
  averageCompleteness: number;
  nullValueCount: number;
  emptyStringCount: number;
  validRecords: number;
  invalidRecords: number;
}

/**
 * Validates export data before generation
 */
export function validateExportData(
  data: any[],
  headers: string[],
  title: string,
  format: 'csv' | 'pdf' | 'excel'
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check 1: Data array exists and is not empty
  if (!data || data.length === 0) {
    errors.push('No data available for export');
  }

  // Check 2: Headers exist
  if (!headers || headers.length === 0) {
    errors.push('No column headers defined');
  }

  // Check 3: Data structure consistency
  if (data && headers && data.length > 0) {
    const firstRow = data[0];
    for (const header of headers) {
      const key = header.replace(/\s+/g, '');
      if (!(key in firstRow) && !(header in firstRow)) {
        warnings.push(`Column "${header}" may not be present in all rows`);
      }
    }
  }

  // Check 4: Validate file format compatibility
  if (!['csv', 'pdf', 'excel'].includes(format)) {
    errors.push(`Invalid file format: ${format}`);
  }

  // Check 5: Data size limits
  const estimatedSize = JSON.stringify(data).length;
  if (estimatedSize > 100 * 1024 * 1024) {
    // 100MB limit
    errors.push('Data exceeds maximum export size (100MB)');
  }

  // Check 6: Special character validation for filenames
  if (title && /[<>:"|?*]/.test(title)) {
    warnings.push('Title contains special characters that may affect file naming');
  }

  // Calculate data quality metrics
  const dataQuality = calculateDataQuality(data, headers);

  // Generate summary
  const summary = generateExportSummary(data, headers, title, format, dataQuality);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary,
    dataQuality,
  };
}

/**
 * Calculates data quality metrics
 */
function calculateDataQuality(data: any[], headers: string[]): DataQualityMetrics {
  if (!data || data.length === 0) {
    return {
      totalFields: 0,
      populatedFields: 0,
      averageCompleteness: 0,
      nullValueCount: 0,
      emptyStringCount: 0,
      validRecords: 0,
      invalidRecords: 0,
    };
  }

  let nullValueCount = 0;
  let emptyStringCount = 0;
  let validRecords = 0;
  let invalidRecords = 0;

  data.forEach((row) => {
    let hasValidFields = false;
    headers.forEach((header) => {
      const key = header.replace(/\s+/g, '');
      const value = row[key] ?? row[header];

      if (value === null || value === undefined) {
        nullValueCount++;
      } else if (value === '') {
        emptyStringCount++;
      } else {
        hasValidFields = true;
      }
    });

    if (hasValidFields) {
      validRecords++;
    } else {
      invalidRecords++;
    }
  });

  const totalFields = data.length * headers.length;
  const populatedFields = totalFields - nullValueCount - emptyStringCount;
  const averageCompleteness =
    totalFields > 0 ? Math.round((populatedFields / totalFields) * 100) : 0;

  return {
    totalFields,
    populatedFields,
    averageCompleteness,
    nullValueCount,
    emptyStringCount,
    validRecords,
    invalidRecords,
  };
}

/**
 * Generates export summary
 */
function generateExportSummary(
  data: any[],
  headers: string[],
  title: string,
  format: 'csv' | 'pdf' | 'excel',
  dataQuality: DataQualityMetrics
): ExportSummary {
  // Calculate field completeness
  const fieldCompleteness: FieldCompleteness[] = headers.map((header) => {
    const key = header.replace(/\s+/g, '');
    let populatedCount = 0;

    data.forEach((row) => {
      const value = row[key] ?? row[header];
      if (value !== null && value !== undefined && value !== '') {
        populatedCount++;
      }
    });

    return {
      fieldName: header,
      populatedCount,
      totalCount: data.length,
      completenessPercentage:
        data.length > 0 ? Math.round((populatedCount / data.length) * 100) : 0,
    };
  });

  const keyMetrics: KeyMetric[] = [
    {
      label: 'Total Records',
      value: data.length,
      status: data.length > 0 ? 'good' : 'error',
    },
    {
      label: 'Data Completeness',
      value: `${dataQuality.averageCompleteness}%`,
      status:
        dataQuality.averageCompleteness >= 90
          ? 'good'
          : dataQuality.averageCompleteness >= 70
            ? 'warning'
            : 'error',
    },
    {
      label: 'Valid Records',
      value: dataQuality.validRecords,
      status: dataQuality.invalidRecords === 0 ? 'good' : 'warning',
    },
    {
      label: 'File Format',
      value: format.toUpperCase(),
      status: 'good',
    },
  ];

  return {
    totalRecords: data.length,
    completenessPercentage: dataQuality.averageCompleteness,
    processedAt: new Date().toISOString(),
    format,
    title,
    keyMetrics,
    dataCompleteness: fieldCompleteness,
  };
}

/**
 * Validates PDF generation requirements
 */
export function validatePDFFormat(data: any[], headers: string[]): { valid: boolean; error?: string } {
  if (!data || data.length === 0) {
    return { valid: false, error: 'No data for PDF generation' };
  }

  if (!headers || headers.length === 0) {
    return { valid: false, error: 'No headers for PDF generation' };
  }

  // Check for reasonable data size
  const estimatedSize = JSON.stringify(data).length;
  if (estimatedSize > 50 * 1024 * 1024) {
    return { valid: false, error: 'PDF data exceeds 50MB limit' };
  }

  return { valid: true };
}

/**
 * Validates Excel generation requirements
 */
export function validateExcelFormat(data: any[], headers: string[]): { valid: boolean; error?: string } {
  if (!data || data.length === 0) {
    return { valid: false, error: 'No data for Excel generation' };
  }

  if (!headers || headers.length === 0) {
    return { valid: false, error: 'No headers for Excel generation' };
  }

  // Check row limit (Excel has 1M row limit)
  if (data.length > 1000000) {
    return { valid: false, error: 'Excel cannot handle more than 1 million rows' };
  }

  return { valid: true };
}

/**
 * Formats validation errors for user display
 */
export function formatValidationErrorsForUser(errors: string[]): string {
  if (errors.length === 0) return '';

  return errors
    .map((error, index) => `${index + 1}. ${error}`)
    .join('\n');
}

/**
 * Generates a text summary for the report
 */
export function generateTextSummary(summary: ExportSummary): string {
  const lines = [
    `EXPORT SUMMARY: ${summary.title}`,
    `Generated: ${new Date(summary.processedAt).toLocaleString()}`,
    `Format: ${summary.format.toUpperCase()}`,
    '',
    'KEY METRICS:',
    ...summary.keyMetrics.map((m) => `  • ${m.label}: ${m.value} [${m.status.toUpperCase()}]`),
    '',
    'DATA COMPLETENESS:',
    ...summary.dataCompleteness
      .slice(0, 5)
      .map((f) => `  • ${f.fieldName}: ${f.completenessPercentage}% (${f.populatedCount}/${f.totalCount})`),
    summary.dataCompleteness.length > 5
      ? `  • ... and ${summary.dataCompleteness.length - 5} more fields`
      : '',
    '',
    `Total Records: ${summary.totalRecords}`,
    `Overall Completeness: ${summary.completenessPercentage}%`,
  ];

  return lines.filter(Boolean).join('\n');
}
