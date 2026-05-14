/**
 * Field Notice ID Validator
 * =========================
 * 
 * SPECIFICATION:
 * Field Notice IDs MUST follow the format: "FN" followed by exactly 5 digits
 * Examples: FN12345, FN00001, FN99999
 * 
 * INVALID Examples:
 * - FN00000 (all zeros - reserved as invalid marker)
 * - FN1234 (only 4 digits)
 * - FN123456 (6 digits)
 * - 12345 (missing FN prefix)
 * - FNabcde (non-numeric)
 * - null, undefined, empty string
 * 
 * @module field-notice-validator
 * @version 2.0.0
 * @author SRE AgenticOps Team
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * The canonical regex pattern for valid Field Notice IDs
 * Format: FN + exactly 5 digits (00001-99999)
 * FN00000 is explicitly invalid (reserved as null/invalid marker)
 */
export const FIELD_NOTICE_REGEX = /^FN[0-9]{5}$/;

/**
 * Pattern to extract numeric portion from various input formats
 */
export const NUMERIC_EXTRACTION_REGEX = /(\d+)/;

/**
 * Invalid Field Notice patterns that should always be rejected
 */
export const INVALID_PATTERNS = [
  /^FN0{5}$/i,           // FN00000 - reserved invalid marker
  /^0+$/,                // All zeros
  /^$/,                  // Empty string
  /^\s*$/,               // Whitespace only
  /^(unknown|invalid|null|none|n\/a|undefined)$/i,  // String nulls
  /^FN0*$/i,             // FN with only zeros
];

/**
 * Maximum allowed Field Notice number (99999)
 */
export const MAX_FN_NUMBER = 99999;

/**
 * Minimum allowed Field Notice number (1 - FN00000 is invalid)
 */
export const MIN_FN_NUMBER = 1;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of field notice validation
 */
export interface ValidationResult {
  /** Whether the input is valid */
  isValid: boolean;
  /** The formatted field notice ID (null if invalid) */
  formattedId: string | null;
  /** Original input value */
  originalInput: string | null | undefined;
  /** Human-readable error message if invalid */
  errorMessage: string | null;
  /** Error code for programmatic handling */
  errorCode: FieldNoticeErrorCode | null;
  /** Whether the value was modified during formatting */
  wasModified: boolean;
}

/**
 * Error codes for field notice validation failures
 */
export enum FieldNoticeErrorCode {
  NULL_INPUT = 'FN_ERR_NULL',
  EMPTY_INPUT = 'FN_ERR_EMPTY',
  NO_DIGITS = 'FN_ERR_NO_DIGITS',
  ALL_ZEROS = 'FN_ERR_ALL_ZEROS',
  INVALID_PATTERN = 'FN_ERR_INVALID_PATTERN',
  FORMAT_MISMATCH = 'FN_ERR_FORMAT_MISMATCH',
  RESERVED_VALUE = 'FN_ERR_RESERVED',
}

/**
 * Field notice compliance metrics
 */
export interface ComplianceMetrics {
  totalProcessed: number;
  validCount: number;
  invalidCount: number;
  correctedCount: number;
  rejectedCount: number;
  complianceRate: number;
  timestamp: string;
  invalidPatterns: Record<string, number>;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates if a string is a properly formatted Field Notice ID
 * 
 * @param id - The field notice ID to validate
 * @returns true if valid, false otherwise
 * 
 * @example
 * isValidFieldNoticeId('FN12345') // true
 * isValidFieldNoticeId('FN00000') // false
 * isValidFieldNoticeId('FN1234')  // false
 */
export function isValidFieldNoticeId(id: string | null | undefined): boolean {
  if (id === null || id === undefined) return false;
  
  const trimmed = id.trim();
  if (!trimmed) return false;
  
  // Check against invalid patterns
  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(trimmed)) return false;
  }
  
  // Must match exact format: FN + 5 digits
  return FIELD_NOTICE_REGEX.test(trimmed);
}

/**
 * Comprehensive validation with detailed result
 * 
 * @param id - The field notice ID to validate
 * @returns ValidationResult with detailed information
 */
export function validateFieldNoticeId(id: string | null | undefined): ValidationResult {
  const result: ValidationResult = {
    isValid: false,
    formattedId: null,
    originalInput: id,
    errorMessage: null,
    errorCode: null,
    wasModified: false,
  };
  
  // Check for null/undefined
  if (id === null || id === undefined) {
    result.errorCode = FieldNoticeErrorCode.NULL_INPUT;
    result.errorMessage = 'Field Notice ID is required and cannot be null or undefined';
    return result;
  }
  
  const trimmed = id.trim();
  
  // Check for empty string
  if (!trimmed) {
    result.errorCode = FieldNoticeErrorCode.EMPTY_INPUT;
    result.errorMessage = 'Field Notice ID cannot be empty';
    return result;
  }
  
  // Check against invalid patterns
  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(trimmed)) {
      if (/^FN0{5}$/i.test(trimmed)) {
        result.errorCode = FieldNoticeErrorCode.RESERVED_VALUE;
        result.errorMessage = 'FN00000 is a reserved value and cannot be used as a valid Field Notice ID';
      } else {
        result.errorCode = FieldNoticeErrorCode.INVALID_PATTERN;
        result.errorMessage = `Invalid Field Notice ID pattern: "${trimmed}"`;
      }
      return result;
    }
  }
  
  // Check if already in correct format
  if (FIELD_NOTICE_REGEX.test(trimmed)) {
    result.isValid = true;
    result.formattedId = trimmed.toUpperCase();
    result.wasModified = trimmed !== result.formattedId;
    return result;
  }
  
  // Attempt to format
  const formatted = formatFieldNoticeId(trimmed);
  if (formatted) {
    result.isValid = true;
    result.formattedId = formatted;
    result.wasModified = trimmed !== formatted;
    return result;
  }
  
  // Could not format
  result.errorCode = FieldNoticeErrorCode.FORMAT_MISMATCH;
  result.errorMessage = `Field Notice ID must follow format "FN" + 5 digits (e.g., FN12345). Received: "${trimmed}"`;
  return result;
}

/**
 * Format a field notice ID to the canonical FN##### format
 * 
 * Handles various input formats:
 * - "12345" -> "FN12345"
 * - "FN 12345" -> "FN12345"
 * - "fn12345" -> "FN12345"
 * - "FN# 12345" -> "FN12345"
 * - "62840" -> "FN62840"
 * 
 * @param id - The raw field notice ID
 * @returns Formatted ID or null if cannot be formatted
 */
export function formatFieldNoticeId(id: string | null | undefined): string | null {
  if (id === null || id === undefined) return null;
  
  const trimmed = id.trim();
  if (!trimmed) return null;
  
  // Check invalid patterns first
  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(trimmed)) return null;
  }
  
  // If already in correct format, return uppercase
  if (FIELD_NOTICE_REGEX.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  
  // Extract digits from the input
  const digitMatch = trimmed.match(NUMERIC_EXTRACTION_REGEX);
  if (!digitMatch) return null;
  
  const digits = digitMatch[1];
  if (!digits || digits.length === 0) return null;
  
  // Check if all zeros
  if (/^0+$/.test(digits)) return null;
  
  // Parse as number and validate range
  const numericValue = parseInt(digits, 10);
  if (isNaN(numericValue) || numericValue < MIN_FN_NUMBER || numericValue > MAX_FN_NUMBER) {
    return null;
  }
  
  // Format to exactly 5 digits with leading zeros
  const formattedDigits = numericValue.toString().padStart(5, '0');
  const formattedId = `FN${formattedDigits}`;
  
  // Final validation
  if (formattedId === 'FN00000') return null;
  
  return formattedId;
}

/**
 * Strict validation - only accepts already-formatted IDs
 * Does NOT attempt to fix/format the input
 * 
 * @param id - The field notice ID to validate strictly
 * @returns true only if ID is already in correct FN##### format
 */
export function isStrictlyValidFieldNoticeId(id: string | null | undefined): boolean {
  if (!id) return false;
  const trimmed = id.trim();
  return FIELD_NOTICE_REGEX.test(trimmed) && trimmed !== 'FN00000';
}

/**
 * Batch validate multiple field notice IDs
 * 
 * @param ids - Array of field notice IDs to validate
 * @returns Array of validation results
 */
export function batchValidate(ids: (string | null | undefined)[]): ValidationResult[] {
  return ids.map(validateFieldNoticeId);
}

/**
 * Filter array to only valid field notice IDs
 * 
 * @param ids - Array of potential field notice IDs
 * @param format - Whether to format valid IDs (default: true)
 * @returns Array of valid (and optionally formatted) field notice IDs
 */
export function filterValidFieldNotices(ids: (string | null | undefined)[], format = true): string[] {
  const results: string[] = [];
  
  for (const id of ids) {
    if (format) {
      const formatted = formatFieldNoticeId(id);
      if (formatted) results.push(formatted);
    } else {
      if (isValidFieldNoticeId(id)) results.push(id!.trim());
    }
  }
  
  return results;
}

// ============================================================================
// COMPLIANCE TRACKING
// ============================================================================

/**
 * Track compliance metrics for a batch of field notice IDs
 * 
 * @param ids - Array of field notice IDs to analyze
 * @returns Compliance metrics
 */
export function calculateComplianceMetrics(ids: (string | null | undefined)[]): ComplianceMetrics {
  const metrics: ComplianceMetrics = {
    totalProcessed: ids.length,
    validCount: 0,
    invalidCount: 0,
    correctedCount: 0,
    rejectedCount: 0,
    complianceRate: 0,
    timestamp: new Date().toISOString(),
    invalidPatterns: {},
  };
  
  for (const id of ids) {
    const result = validateFieldNoticeId(id);
    
    if (result.isValid) {
      metrics.validCount++;
      if (result.wasModified) {
        metrics.correctedCount++;
      }
    } else {
      metrics.invalidCount++;
      metrics.rejectedCount++;
      
      // Track invalid patterns
      const pattern = result.errorCode || 'UNKNOWN';
      metrics.invalidPatterns[pattern] = (metrics.invalidPatterns[pattern] || 0) + 1;
    }
  }
  
  metrics.complianceRate = metrics.totalProcessed > 0 
    ? (metrics.validCount / metrics.totalProcessed) * 100 
    : 0;
  
  return metrics;
}

// ============================================================================
// ERROR MESSAGES
// ============================================================================

/**
 * Get user-friendly error message for a validation error code
 */
export function getErrorMessage(code: FieldNoticeErrorCode): string {
  const messages: Record<FieldNoticeErrorCode, string> = {
    [FieldNoticeErrorCode.NULL_INPUT]: 'Field Notice ID is required',
    [FieldNoticeErrorCode.EMPTY_INPUT]: 'Field Notice ID cannot be empty',
    [FieldNoticeErrorCode.NO_DIGITS]: 'Field Notice ID must contain numeric digits',
    [FieldNoticeErrorCode.ALL_ZEROS]: 'Field Notice ID cannot be all zeros',
    [FieldNoticeErrorCode.INVALID_PATTERN]: 'Field Notice ID contains an invalid pattern',
    [FieldNoticeErrorCode.FORMAT_MISMATCH]: 'Field Notice ID must follow format: FN + 5 digits (e.g., FN12345)',
    [FieldNoticeErrorCode.RESERVED_VALUE]: 'FN00000 is a reserved value and cannot be used',
  };
  
  return messages[code] || 'Invalid Field Notice ID';
}

// ============================================================================
// EXPORTS FOR BACKWARD COMPATIBILITY
// ============================================================================

// Re-export with legacy names for backward compatibility
export const isValidFieldNotice = isValidFieldNoticeId;
export const INVALID_FN_PATTERN = INVALID_PATTERNS[0]; // Primary invalid pattern

export default {
  isValidFieldNoticeId,
  validateFieldNoticeId,
  formatFieldNoticeId,
  isStrictlyValidFieldNoticeId,
  batchValidate,
  filterValidFieldNotices,
  calculateComplianceMetrics,
  getErrorMessage,
  FIELD_NOTICE_REGEX,
  FieldNoticeErrorCode,
};
