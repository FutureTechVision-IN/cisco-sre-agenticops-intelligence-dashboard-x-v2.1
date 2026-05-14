/**
 * Data Validation & Deduplication Middleware
 * Priority 1 Corrections for SRE AgenticOps Intelligence Dashboard
 * 
 * @file frontend/services/dataValidationMiddleware.ts
 * 
 * IMPLEMENTATION GUIDE:
 * This file provides Priority 1 corrections identified in the comprehensive audit:
 * 1. Explicit deduplication to prevent double-counting in aggregations
 * 2. Data validation middleware with industry whitelist, risk score bounds, KAR bounds
 * 3. Type-safe validation with detailed error reporting
 */

import { AccountKARMetrics, ValidationResult } from '../types/index';

/**
 * INDUSTRY WHITELIST
 * Verified industry classifications for all known customers
 * 
 * Corrections Applied:
 * ✓ VODAFONE IRELAND: Telecommunications (NOT Healthcare)
 * ✓ VERIZON WIRELESS: Telecommunications (NOT Healthcare)
 * ✓ HCA HEALTHCARE: Healthcare (CORRECT)
 */
const INDUSTRY_WHITELIST = {
  'WELLS FARGO MASTER ACCOUNT': 'Financial Services',
  'BANK OF AMERICA': 'Financial Services',
  'MORGAN STANLEY - GLOBAL': 'Financial Services',
  'CITIGROUP': 'Financial Services',
  'JPMORGAN CHASE': 'Financial Services',
  'GOLDMAN SACHS': 'Financial Services',
  'NAVY FEDERAL CREDIT UNION': 'Financial Services',
  'FIRST NATIONAL BANK': 'Financial Services',

  'HCA HEALTHCARE': 'Healthcare',
  'GEISINGER HEALTH SYSTEM FOUNDATION': 'Healthcare',
  'NYC HEALTH AND HOSPITALS CORPORATION': 'Healthcare',
  'KAISER PERMANENTE': 'Healthcare',
  'ANTHEM': 'Healthcare',
  'AETNA': 'Healthcare',

  'VODAFONE IRELAND': 'Telecommunications',  // CORRECTION: Was Healthcare, should be Telecommunications (Mobile Network Operator)
  'VERIZON WIRELESS': 'Telecommunications',
  'BT': 'Telecommunications',
  'TELENOR': 'Telecommunications',
  'DEUTSCHE TELEKOM': 'Telecommunications',
  'ORANGE SA': 'Telecommunications',

  'HOME DEPOT USA, INC.': 'Retail',
  'COSTCO WHOLESALE': 'Retail',
  'WALMART': 'Retail',
  'TARGET': 'Retail',
  'LOWE\'S': 'Retail',

  'MICROSOFT': 'Technology',
  'GOOGLE': 'Technology',
  'AMAZON': 'Technology',
  'META': 'Technology',
  'APPLE': 'Technology',
  'IBM': 'Technology',

  'EXXON MOBIL': 'Energy',
  'CHEVRON': 'Energy',
  'SHELL': 'Energy',
  'BP': 'Energy',
  'DUKE ENERGY': 'Energy',
  'BHP BILLITON LTD': 'Energy',  // Added: SMB Energy company

  'GENERAL MOTORS': 'Manufacturing',
  'FORD': 'Manufacturing',
  'BOEING': 'Manufacturing',
  'LOCKHEED MARTIN': 'Manufacturing'
};

// Industry constants for validation
const VALID_INDUSTRIES = [
  'Financial Services',
  'Healthcare',
  'Telecommunications',
  'Retail',
  'Technology',
  'Manufacturing',
  'Energy',
  'Government',
  'General Enterprise'
];

// Compliance framework mapping by industry
const INDUSTRY_COMPLIANCE_MAP: Record<string, string[]> = {
  'Healthcare': ['HIPAA', 'HITECH', 'GDPR'],
  'Financial Services': ['SOX', 'PCI-DSS', 'GLBA', 'FCRA'],
  'Telecommunications': ['FCC', 'TCPA', 'GDPR'],  // VODAFONE IRELAND corrected: FCC/TCPA not HIPAA
  'Retail': ['PCI-DSS', 'ADA', 'GDPR'],
  'Technology': ['GDPR', 'CCPA'],
  'Manufacturing': ['ISO 9001', 'ITAR'],
  'Energy': ['NERC-CIP', 'EIA'],  // BHP BILLITON corrected: NERC-CIP not HIPAA
  'Government': ['FedRAMP', 'FISMA', 'NIST']
};

/**
 * KAR (Key Account Ratio) Bounds Validation
 * Valid range: 0.0 - 100.0
 */
const KAR_BOUNDS = {
  min: 0,
  max: 100,
  default: 50
};

/**
 * Risk Score Bounds Validation
 * Valid range: 0 - 100
 * 
 * Thresholds:
 * - CRITICAL: 90-100 (>100k vulnerabilities)
 * - HIGH: 70-89 (50k-100k vulnerabilities)
 * - ELEVATED: 50-69 (<50k vulnerabilities)
 * - BASELINE: 0-49 (minimal exposure)
 */
const RISK_SCORE_BOUNDS = {
  min: 0,
  max: 100,
  critical: { min: 90, max: 100 },
  high: { min: 70, max: 89 },
  elevated: { min: 50, max: 69 },
  baseline: { min: 0, max: 49 }
};

// ============================================================================
// 1. DEDUPLICATION SERVICE
// ============================================================================

/**
 * Deduplicates customers by name, removing exact duplicates
 * CORRECTION 1.1: Explicit deduplication to prevent double-counting
 * 
 * @param customers - Array of customer accounts
 * @returns Deduplicated array with unique customers
 * 
 * Example:
 * Input: [
 *   { name: 'WELLS FARGO', id: 1, vulnerabilities: 100000 },
 *   { name: 'WELLS FARGO', id: 2, vulnerabilities: 150000 },  // Duplicate
 *   { name: 'HCA HEALTHCARE', id: 3, vulnerabilities: 50000 }
 * ]
 * Output: [
 *   { name: 'WELLS FARGO', id: 1, vulnerabilities: 100000 },  // First occurrence kept
 *   { name: 'HCA HEALTHCARE', id: 3, vulnerabilities: 50000 }
 * ]
 * 
 * Business Logic:
 * - Uses Set to track seen customer names
 * - Preserves first occurrence of duplicate names
 * - Maintains original order
 * - Prevents aggregation errors in KPI calculations
 */
export function deduplicateCustomers(
  customers: Array<{ name: string; [key: string]: any }>
): Array<{ name: string; [key: string]: any }> {
  const seen = new Set<string>();
  const deduplicated: typeof customers = [];

  for (const customer of customers) {
    const normalizedName = customer.name.trim().toUpperCase();
    
    if (!seen.has(normalizedName)) {
      seen.add(normalizedName);
      deduplicated.push(customer);
    }
  }

  return deduplicated;
}

/**
 * Deduplicates by multiple fields (name + ID combination)
 * More aggressive deduplication for exact match detection
 * 
 * @param items - Array of items to deduplicate
 * @param fields - Fields to use for deduplication
 * @returns Deduplicated array
 */
export function deduplicateByFields<T extends Record<string, any>>(
  items: T[],
  fields: (keyof T)[]
): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = fields.map(f => String(item[f])).join('|');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Reports deduplication statistics for audit trail
 * 
 * @param original - Original array
 * @param deduplicated - Deduplicated array
 * @returns Statistics object
 */
export function getDeduplicationStats(
  original: any[],
  deduplicated: any[]
): {
  originalCount: number;
  deduplicatedCount: number;
  duplicatesRemoved: number;
  removalPercentage: number;
} {
  const duplicatesRemoved = original.length - deduplicated.length;
  return {
    originalCount: original.length,
    deduplicatedCount: deduplicated.length,
    duplicatesRemoved,
    removalPercentage: original.length > 0 
      ? Math.round((duplicatesRemoved / original.length) * 100 * 100) / 100
      : 0
  };
}

// ============================================================================
// 2. VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Comprehensive data validation for account records
 * CORRECTION 1.2: Data validation middleware with bounds checking
 * 
 * Validates:
 * ✓ Industry classification against whitelist
 * ✓ Risk score within bounds (0-100)
 * ✓ KAR ratio within bounds (0-100)
 * ✓ Required fields presence
 * ✓ Data type correctness
 * 
 * @param account - Account to validate
 * @returns ValidationResult with errors and warnings
 * 
 * Example Usage:
 * const account = {
 *   accountName: 'WELLS FARGO MASTER ACCOUNT',
 *   industry: 'Financial Services',
 *   riskScore: 95,
 *   currentRatio: 3.4
 * };
 * 
 * const result = validateAccount(account);
 * if (!result.isValid) {
 *   console.error(result.errors);
 * }
 */
export function validateAccount(account: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validation 1: Required fields
  if (!account.accountName || typeof account.accountName !== 'string') {
    errors.push('Missing or invalid accountName field');
  }

  if (!account.industry || typeof account.industry !== 'string') {
    errors.push('Missing or invalid industry field');
  }

  if (account.riskScore === undefined || typeof account.riskScore !== 'number') {
    errors.push('Missing or invalid riskScore field');
  }

  if (account.currentRatio === undefined || typeof account.currentRatio !== 'number') {
    errors.push('Missing or invalid currentRatio (KAR) field');
  }

  // Validation 2: Industry whitelist check
  if (account.industry) {
    const normalizedName = account.accountName?.trim().toUpperCase() || '';
    const expectedIndustry = INDUSTRY_WHITELIST[normalizedName];
    
    if (expectedIndustry && account.industry !== expectedIndustry) {
      errors.push(
        `Industry mismatch for ${normalizedName}: ` +
        `expected "${expectedIndustry}", got "${account.industry}"`
      );
    }

    if (!VALID_INDUSTRIES.includes(account.industry)) {
      errors.push(
        `Invalid industry "${account.industry}". ` +
        `Valid industries: ${VALID_INDUSTRIES.join(', ')}`
      );
    }
  }

  // Validation 3: Risk score bounds
  if (typeof account.riskScore === 'number') {
    if (account.riskScore < RISK_SCORE_BOUNDS.min || 
        account.riskScore > RISK_SCORE_BOUNDS.max) {
      errors.push(
        `Risk score ${account.riskScore} out of bounds [${RISK_SCORE_BOUNDS.min}-${RISK_SCORE_BOUNDS.max}]`
      );
    }

    // Validate risk score tier consistency
    if (account.totalVulnerabilities !== undefined) {
      const expectedTier = getRiskScoreTier(account.totalVulnerabilities);
      const actualTier = getRiskScoreTier(account.riskScore);
      
      if (expectedTier !== actualTier) {
        warnings.push(
          `Risk score (${account.riskScore}) tier mismatch with vulnerabilities ` +
          `(${account.totalVulnerabilities}). Expected tier ${expectedTier}, got ${actualTier}`
        );
      }
    }
  }

  // Validation 4: KAR ratio bounds
  if (typeof account.currentRatio === 'number') {
    if (account.currentRatio < KAR_BOUNDS.min || 
        account.currentRatio > KAR_BOUNDS.max) {
      errors.push(
        `KAR ratio ${account.currentRatio} out of bounds [${KAR_BOUNDS.min}-${KAR_BOUNDS.max}]`
      );
    }
  }

  // Validation 5: Numeric fields non-negative
  const numericFields = [
    'totalVulnerabilities',
    'potentialVulnerabilities',
    'secureAssets',
    'impactedDevices',
    'accountSize'
  ];

  for (const field of numericFields) {
    if (account[field] !== undefined && typeof account[field] === 'number') {
      if (account[field] < 0) {
        errors.push(`${field} cannot be negative (got ${account[field]})`);
      }
    }
  }

  // Validation 6: Consistency checks
  if (account.totalVulnerabilities !== undefined && 
      account.potentialVulnerabilities !== undefined) {
    if (account.totalVulnerabilities + account.potentialVulnerabilities > 
        Number.MAX_SAFE_INTEGER) {
      warnings.push('Total + Potential vulnerabilities exceed safe integer limit');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    timestamp: new Date().toISOString(),
    accountName: account.accountName,
    validatedFields: Object.keys(account)
  };
}

/**
 * Batch validation for multiple accounts
 * 
 * @param accounts - Array of accounts to validate
 * @returns Array of validation results with summary
 */
export function validateAccountBatch(
  accounts: any[]
): {
  results: ValidationResult[];
  summary: {
    totalAccounts: number;
    validAccounts: number;
    invalidAccounts: number;
    totalErrors: number;
    totalWarnings: number;
    validationRate: number;
  };
} {
  const results = accounts.map(acc => validateAccount(acc));
  
  const validAccounts = results.filter(r => r.isValid).length;
  const invalidAccounts = results.filter(r => !r.isValid).length;
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

  return {
    results,
    summary: {
      totalAccounts: accounts.length,
      validAccounts,
      invalidAccounts,
      totalErrors,
      totalWarnings,
      validationRate: accounts.length > 0 
        ? Math.round((validAccounts / accounts.length) * 100 * 100) / 100
        : 0
    }
  };
}

/**
 * Auto-correction for known validation errors
 * Attempts to fix common data quality issues
 * 
 * @param account - Account with potential issues
 * @returns Corrected account and correction report
 */
export function autoCorrectAccount(
  account: any
): {
  correctedAccount: any;
  corrections: string[];
} {
  const correctedAccount = { ...account };
  const corrections: string[] = [];

  // Correction 1: Industry normalization
  const normalizedName = account.accountName?.trim().toUpperCase() || '';
  const expectedIndustry = INDUSTRY_WHITELIST[normalizedName];
  
  if (expectedIndustry && account.industry !== expectedIndustry) {
    corrections.push(
      `Corrected industry: "${account.industry}" → "${expectedIndustry}"`
    );
    correctedAccount.industry = expectedIndustry;
  }

  // Correction 2: Risk score bounds clamping
  if (typeof account.riskScore === 'number') {
    const clamped = Math.max(
      RISK_SCORE_BOUNDS.min,
      Math.min(RISK_SCORE_BOUNDS.max, account.riskScore)
    );
    if (clamped !== account.riskScore) {
      corrections.push(
        `Clamped risk score: ${account.riskScore} → ${clamped}`
      );
      correctedAccount.riskScore = clamped;
    }
  }

  // Correction 3: KAR ratio bounds clamping
  if (typeof account.currentRatio === 'number') {
    const clamped = Math.max(
      KAR_BOUNDS.min,
      Math.min(KAR_BOUNDS.max, account.currentRatio)
    );
    if (clamped !== account.currentRatio) {
      corrections.push(
        `Clamped KAR ratio: ${account.currentRatio} → ${clamped}`
      );
      correctedAccount.currentRatio = clamped;
    }
  }

  // Correction 4: Negative value replacement
  const numericFields = [
    'totalVulnerabilities',
    'potentialVulnerabilities',
    'secureAssets',
    'impactedDevices'
  ];

  for (const field of numericFields) {
    if (correctedAccount[field] !== undefined && correctedAccount[field] < 0) {
      corrections.push(`Replaced negative ${field}: ${correctedAccount[field]} → 0`);
      correctedAccount[field] = 0;
    }
  }

  // Correction 5: Industry validation
  if (correctedAccount.industry && !VALID_INDUSTRIES.includes(correctedAccount.industry)) {
    corrections.push(
      `Invalid industry "${correctedAccount.industry}" → "General Enterprise"`
    );
    correctedAccount.industry = 'General Enterprise';
  }

  return {
    correctedAccount,
    corrections
  };
}

// ============================================================================
// 3. COMPLIANCE FRAMEWORK VALIDATION
// ============================================================================

/**
 * Maps account industry to applicable compliance frameworks
 * 
 * @param industry - Industry classification
 * @returns Array of applicable compliance frameworks
 */
export function getComplianceFrameworks(industry: string): string[] {
  return INDUSTRY_COMPLIANCE_MAP[industry] || [];
}

/**
 * Validates compliance framework coverage for account
 * 
 * @param account - Account to validate
 * @returns Compliance validation result
 */
export function validateComplianceCoverage(account: any): {
  industry: string;
  applicableFrameworks: string[];
  coverage: number;
  missingFrameworks: string[];
} {
  const applicableFrameworks = getComplianceFrameworks(account.industry);
  const implemented = account.complianceFrameworks || [];
  const missingFrameworks = applicableFrameworks.filter(
    f => !implemented.includes(f)
  );

  return {
    industry: account.industry,
    applicableFrameworks,
    coverage: applicableFrameworks.length > 0 
      ? Math.round(((applicableFrameworks.length - missingFrameworks.length) / 
          applicableFrameworks.length) * 100)
      : 100,
    missingFrameworks
  };
}

// ============================================================================
// 4. HELPER FUNCTIONS
// ============================================================================

/**
 * Determines risk score tier based on vulnerability count
 * 
 * Thresholds:
 * - CRITICAL: >100k vulnerabilities → risk score 90-100
 * - HIGH: 50k-100k vulnerabilities → risk score 70-89
 * - ELEVATED: <50k vulnerabilities → risk score 50-69
 * - BASELINE: 0 vulnerabilities → risk score 0-49
 */
function getRiskScoreTier(value: number): string {
  if (value > 100000) return 'CRITICAL';
  if (value >= 50000) return 'HIGH';
  if (value > 0) return 'ELEVATED';
  return 'BASELINE';
}

/**
 * Calculates KAR with proper error handling
 */
export function calculateKARSafe(
  recordCount: number,
  vulnerabilityCount: number
): number {
  if (recordCount < 0 || vulnerabilityCount < 0) {
    console.warn('Negative values provided to KAR calculation');
    return KAR_BOUNDS.default;
  }

  if (vulnerabilityCount === 0) {
    return KAR_BOUNDS.default;
  }

  const result = (recordCount / vulnerabilityCount) * 100;
  return Math.min(KAR_BOUNDS.max, Math.max(KAR_BOUNDS.min, result));
}

/**
 * Gets industry for account with fallback
 */
export function getIndustryOrDefault(
  account: any,
  fallback: string = 'General Enterprise'
): string {
  if (account.industry && VALID_INDUSTRIES.includes(account.industry)) {
    return account.industry;
  }
  return fallback;
}

/**
 * Normalizes account name for comparison
 */
export function normalizeAccountName(name: string): string {
  return name.trim().toUpperCase();
}

export {
  INDUSTRY_WHITELIST,
  VALID_INDUSTRIES,
  INDUSTRY_COMPLIANCE_MAP,
  KAR_BOUNDS,
  RISK_SCORE_BOUNDS
};
