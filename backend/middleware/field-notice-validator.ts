/**
 * Field Notice Validation Middleware
 * ===================================
 * 
 * Express middleware for validating Field Notice IDs in API requests.
 * Ensures all field notices follow the required format: FN + exactly 5 digits
 * 
 * @module middleware/field-notice-validator
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import {
  validateFieldNoticeId,
  formatFieldNoticeId,
  isValidFieldNoticeId,
  batchValidate,
  calculateComplianceMetrics,
  FieldNoticeErrorCode,
  type ValidationResult,
} from '@shared/field-notice-validator';

// ============================================================================
// TYPES
// ============================================================================

interface ValidationOptions {
  /** Whether to reject requests with invalid FN IDs (default: true) */
  strict?: boolean;
  /** Whether to auto-format valid but non-standard IDs (default: true) */
  autoFormat?: boolean;
  /** Field name in request body/params that contains the FN ID */
  fieldName?: string;
  /** Whether to log validation failures (default: true) */
  logFailures?: boolean;
}

interface ValidatedRequest extends Request {
  /** Original field notice ID before validation/formatting */
  originalFieldNoticeId?: string;
  /** Formatted/validated field notice ID */
  validatedFieldNoticeId?: string | null;
  /** Full validation result */
  fieldNoticeValidation?: ValidationResult;
}

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Middleware to validate a single Field Notice ID from request params
 * 
 * @param options - Validation options
 * @returns Express middleware function
 * 
 * @example
 * router.get('/field-notices/:fieldNoticeId', 
 *   validateFieldNoticeParam(), 
 *   getFieldNoticeHandler
 * );
 */
export function validateFieldNoticeParam(options: ValidationOptions = {}) {
  const {
    strict = true,
    autoFormat = true,
    fieldName = 'fieldNoticeId',
    logFailures = true,
  } = options;

  return (req: ValidatedRequest, res: Response, next: NextFunction) => {
    const rawId = req.params[fieldName];
    
    // Store original value
    req.originalFieldNoticeId = rawId;
    
    // Validate
    const result = validateFieldNoticeId(rawId);
    req.fieldNoticeValidation = result;
    
    if (!result.isValid) {
      if (logFailures) {
        console.warn(`[FN Validation] Invalid Field Notice ID in params: "${rawId}" - ${result.errorMessage}`);
      }
      
      if (strict) {
        return res.status(400).json({
          error: 'Invalid Field Notice ID',
          message: result.errorMessage,
          errorCode: result.errorCode,
          receivedValue: rawId,
          expectedFormat: 'FN + exactly 5 digits (e.g., FN12345)',
        });
      }
    }
    
    // Set validated/formatted ID
    if (autoFormat && result.formattedId) {
      req.validatedFieldNoticeId = result.formattedId;
      req.params[fieldName] = result.formattedId;
    } else {
      req.validatedFieldNoticeId = rawId;
    }
    
    next();
  };
}

/**
 * Middleware to validate Field Notice ID from request body
 * 
 * @param options - Validation options
 * @returns Express middleware function
 */
export function validateFieldNoticeBody(options: ValidationOptions = {}) {
  const {
    strict = true,
    autoFormat = true,
    fieldName = 'fieldNoticeId',
    logFailures = true,
  } = options;

  return (req: ValidatedRequest, res: Response, next: NextFunction) => {
    const rawId = req.body?.[fieldName];
    
    // Skip if field not present (let other validators handle required fields)
    if (rawId === undefined) {
      return next();
    }
    
    req.originalFieldNoticeId = rawId;
    
    const result = validateFieldNoticeId(rawId);
    req.fieldNoticeValidation = result;
    
    if (!result.isValid) {
      if (logFailures) {
        console.warn(`[FN Validation] Invalid Field Notice ID in body: "${rawId}" - ${result.errorMessage}`);
      }
      
      if (strict) {
        return res.status(400).json({
          error: 'Invalid Field Notice ID',
          field: fieldName,
          message: result.errorMessage,
          errorCode: result.errorCode,
          receivedValue: rawId,
          expectedFormat: 'FN + exactly 5 digits (e.g., FN12345)',
        });
      }
    }
    
    if (autoFormat && result.formattedId) {
      req.validatedFieldNoticeId = result.formattedId;
      req.body[fieldName] = result.formattedId;
    }
    
    next();
  };
}

/**
 * Middleware to validate Field Notice ID from query params
 * 
 * @param options - Validation options
 * @returns Express middleware function
 */
export function validateFieldNoticeQuery(options: ValidationOptions = {}) {
  const {
    strict = true,
    autoFormat = true,
    fieldName = 'fieldNotice',
    logFailures = true,
  } = options;

  return (req: ValidatedRequest, res: Response, next: NextFunction) => {
    const rawId = req.query[fieldName] as string | undefined;
    
    // Skip if field not present
    if (!rawId) {
      return next();
    }
    
    req.originalFieldNoticeId = rawId;
    
    const result = validateFieldNoticeId(rawId);
    req.fieldNoticeValidation = result;
    
    if (!result.isValid) {
      if (logFailures) {
        console.warn(`[FN Validation] Invalid Field Notice ID in query: "${rawId}" - ${result.errorMessage}`);
      }
      
      if (strict) {
        return res.status(400).json({
          error: 'Invalid Field Notice ID',
          field: fieldName,
          message: result.errorMessage,
          errorCode: result.errorCode,
          receivedValue: rawId,
          expectedFormat: 'FN + exactly 5 digits (e.g., FN12345)',
        });
      }
    }
    
    if (autoFormat && result.formattedId) {
      req.validatedFieldNoticeId = result.formattedId;
      (req.query as Record<string, string>)[fieldName] = result.formattedId;
    }
    
    next();
  };
}

/**
 * Middleware to validate multiple Field Notice IDs in request body array
 * 
 * @param options - Validation options with additional arrayFieldName
 * @returns Express middleware function
 */
export function validateFieldNoticeArray(options: ValidationOptions & { arrayFieldName?: string } = {}) {
  const {
    strict = true,
    autoFormat = true,
    arrayFieldName = 'fieldNotices',
    logFailures = true,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const rawIds = req.body?.[arrayFieldName];
    
    if (!rawIds) {
      return next();
    }
    
    if (!Array.isArray(rawIds)) {
      return res.status(400).json({
        error: 'Invalid request format',
        field: arrayFieldName,
        message: `Expected ${arrayFieldName} to be an array`,
      });
    }
    
    const results = batchValidate(rawIds);
    const invalidResults = results.filter(r => !r.isValid);
    
    if (invalidResults.length > 0 && strict) {
      if (logFailures) {
        console.warn(`[FN Validation] ${invalidResults.length} invalid Field Notice IDs in array`);
      }
      
      return res.status(400).json({
        error: 'Invalid Field Notice IDs',
        field: arrayFieldName,
        message: `${invalidResults.length} of ${rawIds.length} Field Notice IDs are invalid`,
        invalidIds: invalidResults.map(r => ({
          value: r.originalInput,
          error: r.errorMessage,
          errorCode: r.errorCode,
        })),
        expectedFormat: 'FN + exactly 5 digits (e.g., FN12345)',
      });
    }
    
    if (autoFormat) {
      req.body[arrayFieldName] = results
        .filter(r => r.isValid)
        .map(r => r.formattedId);
    }
    
    next();
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sanitize and validate a field notice ID - can be used directly in route handlers
 */
export function sanitizeFieldNoticeId(id: string | null | undefined): string | null {
  return formatFieldNoticeId(id);
}

/**
 * Get compliance metrics for a batch operation
 */
export function getComplianceMetrics(ids: (string | null | undefined)[]) {
  return calculateComplianceMetrics(ids);
}

/**
 * Log validation compliance for monitoring
 */
export function logComplianceMetrics(context: string, ids: (string | null | undefined)[]) {
  const metrics = calculateComplianceMetrics(ids);
  
  console.log(`[FN Compliance] ${context}:`, {
    total: metrics.totalProcessed,
    valid: metrics.validCount,
    invalid: metrics.invalidCount,
    corrected: metrics.correctedCount,
    complianceRate: `${metrics.complianceRate.toFixed(2)}%`,
    timestamp: metrics.timestamp,
  });
  
  if (Object.keys(metrics.invalidPatterns).length > 0) {
    console.log(`[FN Compliance] Invalid patterns:`, metrics.invalidPatterns);
  }
  
  return metrics;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ValidatedRequest,
  ValidationOptions,
  isValidFieldNoticeId,
  validateFieldNoticeId,
  formatFieldNoticeId,
  FieldNoticeErrorCode,
};

export default {
  validateFieldNoticeParam,
  validateFieldNoticeBody,
  validateFieldNoticeQuery,
  validateFieldNoticeArray,
  sanitizeFieldNoticeId,
  getComplianceMetrics,
  logComplianceMetrics,
};
