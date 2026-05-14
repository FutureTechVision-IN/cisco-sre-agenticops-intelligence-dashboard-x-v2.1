/**
 * Field Notice Validator Test Suite
 * ==================================
 * 
 * Comprehensive tests for the Field Notice ID validation system.
 * Tests cover: validation, formatting, edge cases, and compliance tracking.
 * 
 * Run: npm test -- field-notice-validator.test.ts
 */

import {
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
  MAX_FN_NUMBER,
  MIN_FN_NUMBER,
} from '../shared-types/field-notice-validator';

describe('Field Notice Validator', () => {
  
  // ===========================================================================
  // VALID INPUT TESTS
  // ===========================================================================
  
  describe('isValidFieldNoticeId', () => {
    
    describe('valid inputs', () => {
      test.each([
        'FN12345',
        'FN00001',
        'FN99999',
        'FN70496',
        'FN72524',
        'fn12345', // lowercase should be accepted
        ' FN12345 ', // with whitespace
      ])('should return true for valid ID: %s', (id) => {
        expect(isValidFieldNoticeId(id)).toBe(true);
      });
    });
    
    describe('invalid inputs', () => {
      test.each([
        ['FN00000', 'reserved invalid marker'],
        ['FN0000', 'only 4 digits'],
        ['FN1234', 'only 4 digits'],
        ['FN123456', '6 digits'],
        ['12345', 'missing FN prefix'],
        ['FN', 'no digits'],
        ['FNABCDE', 'non-numeric'],
        ['', 'empty string'],
        ['  ', 'whitespace only'],
        ['unknown', 'string null'],
        ['null', 'string null'],
        ['undefined', 'string null'],
        ['n/a', 'string null'],
        ['none', 'string null'],
        ['invalid', 'string null'],
      ])('should return false for %s (%s)', (id) => {
        expect(isValidFieldNoticeId(id)).toBe(false);
      });
      
      test('should return false for null', () => {
        expect(isValidFieldNoticeId(null)).toBe(false);
      });
      
      test('should return false for undefined', () => {
        expect(isValidFieldNoticeId(undefined)).toBe(false);
      });
    });
  });
  
  // ===========================================================================
  // FORMAT TESTS
  // ===========================================================================
  
  describe('formatFieldNoticeId', () => {
    
    describe('successful formatting', () => {
      test.each([
        ['FN12345', 'FN12345'],
        ['fn12345', 'FN12345'],
        ['12345', 'FN12345'],
        ['FN 12345', 'FN12345'],
        ['FN#12345', 'FN12345'],
        ['  FN12345  ', 'FN12345'],
        ['70496', 'FN70496'],
        ['1', 'FN00001'],
        ['99', 'FN00099'],
        ['999', 'FN00999'],
        ['9999', 'FN09999'],
        ['99999', 'FN99999'],
      ])('should format %s to %s', (input, expected) => {
        expect(formatFieldNoticeId(input)).toBe(expected);
      });
    });
    
    describe('failed formatting (returns null)', () => {
      test.each([
        ['FN00000', 'reserved value'],
        ['0', 'single zero'],
        ['00000', 'all zeros'],
        ['FNABCDE', 'no digits'],
        ['', 'empty string'],
        ['unknown', 'string null'],
        ['100000', 'exceeds max'],
        ['-1', 'negative number'],
      ])('should return null for %s (%s)', (input) => {
        expect(formatFieldNoticeId(input)).toBeNull();
      });
      
      test('should return null for null input', () => {
        expect(formatFieldNoticeId(null)).toBeNull();
      });
      
      test('should return null for undefined input', () => {
        expect(formatFieldNoticeId(undefined)).toBeNull();
      });
    });
  });
  
  // ===========================================================================
  // VALIDATION RESULT TESTS
  // ===========================================================================
  
  describe('validateFieldNoticeId', () => {
    
    test('should return valid result for correct format', () => {
      const result = validateFieldNoticeId('FN12345');
      
      expect(result.isValid).toBe(true);
      expect(result.formattedId).toBe('FN12345');
      expect(result.errorMessage).toBeNull();
      expect(result.errorCode).toBeNull();
    });
    
    test('should return valid result and wasModified=true for formattable input', () => {
      const result = validateFieldNoticeId('fn12345');
      
      expect(result.isValid).toBe(true);
      expect(result.formattedId).toBe('FN12345');
      expect(result.wasModified).toBe(true);
    });
    
    test('should return NULL_INPUT error for null', () => {
      const result = validateFieldNoticeId(null);
      
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(FieldNoticeErrorCode.NULL_INPUT);
      expect(result.errorMessage).toBeTruthy();
    });
    
    test('should return EMPTY_INPUT error for empty string', () => {
      const result = validateFieldNoticeId('');
      
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(FieldNoticeErrorCode.EMPTY_INPUT);
    });
    
    test('should return RESERVED_VALUE error for FN00000', () => {
      const result = validateFieldNoticeId('FN00000');
      
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(FieldNoticeErrorCode.RESERVED_VALUE);
    });
    
    test('should return FORMAT_MISMATCH for unformattable input', () => {
      const result = validateFieldNoticeId('INVALID');
      
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(FieldNoticeErrorCode.FORMAT_MISMATCH);
    });
    
    test('should preserve originalInput in result', () => {
      const input = '  FN12345  ';
      const result = validateFieldNoticeId(input);
      
      expect(result.originalInput).toBe(input);
    });
  });
  
  // ===========================================================================
  // STRICT VALIDATION TESTS
  // ===========================================================================
  
  describe('isStrictlyValidFieldNoticeId', () => {
    
    test('should return true only for exact format', () => {
      expect(isStrictlyValidFieldNoticeId('FN12345')).toBe(true);
    });
    
    test('should return false for formattable but not exact format', () => {
      expect(isStrictlyValidFieldNoticeId('12345')).toBe(false);
      expect(isStrictlyValidFieldNoticeId('fn12345')).toBe(false);
    });
    
    test('should return false for FN00000', () => {
      expect(isStrictlyValidFieldNoticeId('FN00000')).toBe(false);
    });
  });
  
  // ===========================================================================
  // BATCH VALIDATION TESTS
  // ===========================================================================
  
  describe('batchValidate', () => {
    
    test('should validate array of IDs', () => {
      const ids = ['FN12345', 'invalid', 'FN00001', null];
      const results = batchValidate(ids);
      
      expect(results).toHaveLength(4);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(false);
      expect(results[2].isValid).toBe(true);
      expect(results[3].isValid).toBe(false);
    });
    
    test('should handle empty array', () => {
      const results = batchValidate([]);
      expect(results).toHaveLength(0);
    });
  });
  
  // ===========================================================================
  // FILTER TESTS
  // ===========================================================================
  
  describe('filterValidFieldNotices', () => {
    
    test('should filter and format valid IDs', () => {
      const ids = ['FN12345', 'invalid', '70496', null, 'FN00000'];
      const result = filterValidFieldNotices(ids);
      
      expect(result).toEqual(['FN12345', 'FN70496']);
    });
    
    test('should not format when format=false', () => {
      const ids = ['FN12345', '70496'];
      const result = filterValidFieldNotices(ids, false);
      
      expect(result).toEqual(['FN12345']);
    });
    
    test('should handle all invalid inputs', () => {
      const ids = ['invalid', 'FN00000', null, undefined];
      const result = filterValidFieldNotices(ids);
      
      expect(result).toEqual([]);
    });
  });
  
  // ===========================================================================
  // COMPLIANCE METRICS TESTS
  // ===========================================================================
  
  describe('calculateComplianceMetrics', () => {
    
    test('should calculate correct metrics', () => {
      const ids = ['FN12345', 'FN00001', 'invalid', null, '70496'];
      const metrics = calculateComplianceMetrics(ids);
      
      expect(metrics.totalProcessed).toBe(5);
      expect(metrics.validCount).toBe(3); // FN12345, FN00001, 70496 (formattable)
      expect(metrics.invalidCount).toBe(2); // invalid, null
      expect(metrics.correctedCount).toBe(1); // 70496 was formatted
      expect(metrics.rejectedCount).toBe(2);
      expect(metrics.complianceRate).toBe(60); // 3/5 * 100
      expect(metrics.timestamp).toBeTruthy();
    });
    
    test('should track invalid patterns', () => {
      const ids = [null, '', 'invalid'];
      const metrics = calculateComplianceMetrics(ids);
      
      expect(metrics.invalidPatterns).toBeDefined();
      expect(Object.keys(metrics.invalidPatterns).length).toBeGreaterThan(0);
    });
    
    test('should handle empty array', () => {
      const metrics = calculateComplianceMetrics([]);
      
      expect(metrics.totalProcessed).toBe(0);
      expect(metrics.complianceRate).toBe(0);
    });
    
    test('should handle 100% compliance', () => {
      const ids = ['FN12345', 'FN00001', 'FN99999'];
      const metrics = calculateComplianceMetrics(ids);
      
      expect(metrics.complianceRate).toBe(100);
      expect(metrics.invalidCount).toBe(0);
    });
  });
  
  // ===========================================================================
  // ERROR MESSAGE TESTS
  // ===========================================================================
  
  describe('getErrorMessage', () => {
    
    test.each([
      [FieldNoticeErrorCode.NULL_INPUT, 'required'],
      [FieldNoticeErrorCode.EMPTY_INPUT, 'empty'],
      [FieldNoticeErrorCode.NO_DIGITS, 'numeric'],
      [FieldNoticeErrorCode.ALL_ZEROS, 'zeros'],
      [FieldNoticeErrorCode.INVALID_PATTERN, 'invalid'],
      [FieldNoticeErrorCode.FORMAT_MISMATCH, 'FN'],
      [FieldNoticeErrorCode.RESERVED_VALUE, 'reserved'],
    ])('should return appropriate message for %s', (code, expectedSubstring) => {
      const message = getErrorMessage(code);
      expect(message.toLowerCase()).toContain(expectedSubstring);
    });
  });
  
  // ===========================================================================
  // REGEX PATTERN TESTS
  // ===========================================================================
  
  describe('FIELD_NOTICE_REGEX', () => {
    
    test('should match valid patterns', () => {
      expect(FIELD_NOTICE_REGEX.test('FN12345')).toBe(true);
      expect(FIELD_NOTICE_REGEX.test('FN00001')).toBe(true);
      expect(FIELD_NOTICE_REGEX.test('FN99999')).toBe(true);
    });
    
    test('should not match invalid patterns', () => {
      expect(FIELD_NOTICE_REGEX.test('FN1234')).toBe(false);
      expect(FIELD_NOTICE_REGEX.test('FN123456')).toBe(false);
      expect(FIELD_NOTICE_REGEX.test('12345')).toBe(false);
      expect(FIELD_NOTICE_REGEX.test('fn12345')).toBe(false); // case sensitive
    });
  });
  
  // ===========================================================================
  // CONSTANTS TESTS
  // ===========================================================================
  
  describe('Constants', () => {
    
    test('should have correct MIN/MAX values', () => {
      expect(MIN_FN_NUMBER).toBe(1);
      expect(MAX_FN_NUMBER).toBe(99999);
    });
  });
  
  // ===========================================================================
  // EDGE CASE TESTS
  // ===========================================================================
  
  describe('Edge Cases', () => {
    
    test('should handle very long numeric strings', () => {
      expect(formatFieldNoticeId('123456789012345')).toBeNull();
    });
    
    test('should handle special characters', () => {
      expect(isValidFieldNoticeId('FN!@#$%')).toBe(false);
      expect(formatFieldNoticeId('FN!@#12345')).toBe('FN12345');
    });
    
    test('should handle mixed case consistently', () => {
      expect(formatFieldNoticeId('Fn12345')).toBe('FN12345');
      expect(formatFieldNoticeId('fN12345')).toBe('FN12345');
    });
    
    test('should handle unicode characters', () => {
      expect(isValidFieldNoticeId('FN١٢٣٤٥')).toBe(false); // Arabic numerals
      expect(formatFieldNoticeId('FN①②③④⑤')).toBeNull(); // Circled numbers
    });
    
    test('should handle leading zeros in numeric-only input', () => {
      expect(formatFieldNoticeId('00123')).toBe('FN00123');
      expect(formatFieldNoticeId('00001')).toBe('FN00001');
    });
    
    test('should reject values at boundaries', () => {
      // Min boundary
      expect(formatFieldNoticeId('0')).toBeNull(); // Below min
      expect(formatFieldNoticeId('1')).toBe('FN00001'); // At min
      
      // Max boundary
      expect(formatFieldNoticeId('99999')).toBe('FN99999'); // At max
      expect(formatFieldNoticeId('100000')).toBeNull(); // Above max
    });
  });
  
  // ===========================================================================
  // REAL-WORLD DATA TESTS
  // ===========================================================================
  
  describe('Real-world Field Notice IDs', () => {
    
    const realIds = [
      'FN70496',
      'FN72524',
      'FN70546',
      'FN70549',
      'FN71695',
      'FN72580',
      'FN72584',
      'FN72513',
      'FN72506',
      'FN72518',
    ];
    
    test('should validate all real Field Notice IDs', () => {
      realIds.forEach(id => {
        expect(isValidFieldNoticeId(id)).toBe(true);
        expect(formatFieldNoticeId(id)).toBe(id);
      });
    });
    
    test('should calculate 100% compliance for real IDs', () => {
      const metrics = calculateComplianceMetrics(realIds);
      expect(metrics.complianceRate).toBe(100);
    });
  });
});
