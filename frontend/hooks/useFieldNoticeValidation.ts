/**
 * Field Notice Validation Hook
 * ============================
 * 
 * React hook for validating Field Notice IDs in forms and inputs.
 * Provides real-time validation with user-friendly error messages.
 * 
 * @module hooks/useFieldNoticeValidation
 * @version 1.0.0
 */

import { useState, useCallback, useMemo } from 'react';

// ============================================================================
// VALIDATION CONSTANTS (Client-side mirror of shared validator)
// ============================================================================

/**
 * The canonical regex pattern for valid Field Notice IDs
 * Format: FN + exactly 5 digits (00001-99999)
 */
export const FIELD_NOTICE_REGEX = /^FN[0-9]{5}$/;

/**
 * Invalid patterns that should always be rejected
 */
const INVALID_PATTERNS = [
  /^FN0{5}$/i,           // FN00000 - reserved invalid marker
  /^0+$/,                // All zeros
  /^$/,                  // Empty string
  /^\s*$/,               // Whitespace only
  /^(unknown|invalid|null|none|n\/a|undefined)$/i,  // String nulls
];

/**
 * Error codes for field notice validation
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
 * Result of field notice validation
 */
export interface ValidationResult {
  isValid: boolean;
  formattedId: string | null;
  originalInput: string | null | undefined;
  errorMessage: string | null;
  errorCode: FieldNoticeErrorCode | null;
  wasModified: boolean;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate if a string is a properly formatted Field Notice ID
 */
export function isValidFieldNoticeId(id: string | null | undefined): boolean {
  if (id === null || id === undefined) return false;
  
  const trimmed = id.trim();
  if (!trimmed) return false;
  
  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(trimmed)) return false;
  }
  
  return FIELD_NOTICE_REGEX.test(trimmed);
}

/**
 * Format a field notice ID to the canonical FN##### format
 */
export function formatFieldNoticeId(id: string | null | undefined): string | null {
  if (id === null || id === undefined) return null;
  
  const trimmed = id.trim();
  if (!trimmed) return null;
  
  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(trimmed)) return null;
  }
  
  if (FIELD_NOTICE_REGEX.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  
  const digitMatch = trimmed.match(/(\d+)/);
  if (!digitMatch) return null;
  
  const digits = digitMatch[1];
  if (!digits || /^0+$/.test(digits)) return null;
  
  const numericValue = parseInt(digits, 10);
  if (isNaN(numericValue) || numericValue < 1 || numericValue > 99999) {
    return null;
  }
  
  const formattedDigits = numericValue.toString().padStart(5, '0');
  const formattedId = `FN${formattedDigits}`;
  
  if (formattedId === 'FN00000') return null;
  
  return formattedId;
}

/**
 * Comprehensive validation with detailed result
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
  
  if (id === null || id === undefined) {
    result.errorCode = FieldNoticeErrorCode.NULL_INPUT;
    result.errorMessage = 'Field Notice ID is required';
    return result;
  }
  
  const trimmed = id.trim();
  
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
        result.errorMessage = 'FN00000 is reserved and cannot be used';
      } else {
        result.errorCode = FieldNoticeErrorCode.INVALID_PATTERN;
        result.errorMessage = 'Invalid Field Notice ID';
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
    result.wasModified = true;
    return result;
  }
  
  result.errorCode = FieldNoticeErrorCode.FORMAT_MISMATCH;
  result.errorMessage = 'Field Notice ID must be FN + 5 digits (e.g., FN12345)';
  return result;
}

// ============================================================================
// REACT HOOK
// ============================================================================

export interface UseFieldNoticeValidationOptions {
  /** Whether to auto-format valid inputs */
  autoFormat?: boolean;
  /** Whether to validate on every change (vs only on blur) */
  validateOnChange?: boolean;
  /** Initial value */
  initialValue?: string;
  /** Callback when value changes */
  onChange?: (value: string, isValid: boolean) => void;
}

export interface UseFieldNoticeValidationReturn {
  /** Current input value */
  value: string;
  /** Set the input value */
  setValue: (value: string) => void;
  /** Whether the current value is valid */
  isValid: boolean;
  /** Error message (null if valid) */
  errorMessage: string | null;
  /** Error code (null if valid) */
  errorCode: FieldNoticeErrorCode | null;
  /** Formatted ID (null if invalid) */
  formattedId: string | null;
  /** Whether the value has been modified from input */
  wasModified: boolean;
  /** Full validation result */
  validationResult: ValidationResult;
  /** Clear the input */
  clear: () => void;
  /** Manually trigger validation */
  validate: () => ValidationResult;
  /** Handle input change event */
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Handle input blur event */
  handleBlur: () => void;
  /** Whether the input has been touched (blurred at least once) */
  isTouched: boolean;
  /** Reset to initial state */
  reset: () => void;
}

/**
 * React hook for Field Notice ID validation
 * 
 * @example
 * const {
 *   value,
 *   handleChange,
 *   handleBlur,
 *   isValid,
 *   errorMessage,
 *   formattedId,
 * } = useFieldNoticeValidation();
 * 
 * return (
 *   <div>
 *     <input 
 *       value={value}
 *       onChange={handleChange}
 *       onBlur={handleBlur}
 *       placeholder="FN12345"
 *     />
 *     {errorMessage && <span className="error">{errorMessage}</span>}
 *   </div>
 * );
 */
export function useFieldNoticeValidation(
  options: UseFieldNoticeValidationOptions = {}
): UseFieldNoticeValidationReturn {
  const {
    autoFormat = true,
    validateOnChange = true,
    initialValue = '',
    onChange,
  } = options;

  const [value, setValueInternal] = useState(initialValue);
  const [isTouched, setIsTouched] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult>(() =>
    validateFieldNoticeId(initialValue || null)
  );

  const setValue = useCallback((newValue: string) => {
    setValueInternal(newValue);
    
    if (validateOnChange || isTouched) {
      const result = validateFieldNoticeId(newValue || null);
      setValidationResult(result);
      
      if (onChange) {
        onChange(autoFormat && result.formattedId ? result.formattedId : newValue, result.isValid);
      }
    }
  }, [validateOnChange, isTouched, autoFormat, onChange]);

  const validate = useCallback(() => {
    const result = validateFieldNoticeId(value || null);
    setValidationResult(result);
    return result;
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, [setValue]);

  const handleBlur = useCallback(() => {
    setIsTouched(true);
    const result = validateFieldNoticeId(value || null);
    setValidationResult(result);
    
    // Auto-format on blur if valid
    if (autoFormat && result.formattedId && result.isValid) {
      setValueInternal(result.formattedId);
    }
  }, [value, autoFormat]);

  const clear = useCallback(() => {
    setValueInternal('');
    setValidationResult(validateFieldNoticeId(null));
  }, []);

  const reset = useCallback(() => {
    setValueInternal(initialValue);
    setIsTouched(false);
    setValidationResult(validateFieldNoticeId(initialValue || null));
  }, [initialValue]);

  // Derived values
  const isValid = validationResult.isValid;
  const errorMessage = isTouched ? validationResult.errorMessage : null;
  const errorCode = isTouched ? validationResult.errorCode : null;
  const formattedId = validationResult.formattedId;
  const wasModified = validationResult.wasModified;

  return {
    value,
    setValue,
    isValid,
    errorMessage,
    errorCode,
    formattedId,
    wasModified,
    validationResult,
    clear,
    validate,
    handleChange,
    handleBlur,
    isTouched,
    reset,
  };
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

export interface FieldNoticeInputProps {
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  placeholder?: string;
  className?: string;
  errorClassName?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

// Export default hook
export default useFieldNoticeValidation;
