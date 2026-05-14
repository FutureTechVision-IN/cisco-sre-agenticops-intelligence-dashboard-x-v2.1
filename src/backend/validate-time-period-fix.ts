/**
 * Validation Script for Time Period Selection Fix
 * Tests all 18 month combinations to ensure the fix works everywhere
 * Run with: npx tsx server/validate-time-period-fix.ts
 */

import { storage } from "./storage";

const MONTHS_TO_TEST = [
  '2024-04', '2024-05', '2024-06', '2024-07', '2024-08', '2024-09',
  '2024-10', '2024-11', '2024-12',
  '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
  '2025-07', '2025-08', '2025-09'
];

interface ValidationResult {
  month: string;
  status: 'PASS' | 'FAIL';
  metrics: {
    totalAssessed: number;
    vulnerable: number;
    potentiallyVulnerable: number;
    notVulnerable: number;
  };
  errors?: string[];
}

async function validateAllMonths(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  console.log('\n=== TIME PERIOD SELECTION VALIDATION ===\n');
  console.log(`Testing ${MONTHS_TO_TEST.length} months (Apr 2024 - Sep 2025)\n`);

  for (const month of MONTHS_TO_TEST) {
    const errors: string[] = [];
    
    try {
      const metrics = await storage.getFilteredMetrics({ month });
      
      // Validate metrics object
      if (!metrics) {
        errors.push('Metrics object is null or undefined');
      } else {
        // Check for required fields
        if (typeof metrics.total !== 'number') {
          errors.push(`Invalid total: ${metrics.total} (expected number)`);
        }
        if (typeof metrics.vulnerable !== 'number') {
          errors.push(`Invalid vulnerable: ${metrics.vulnerable} (expected number)`);
        }
        if (typeof metrics.potentiallyVulnerable !== 'number') {
          errors.push(`Invalid potentiallyVulnerable: ${metrics.potentiallyVulnerable} (expected number)`);
        }
        if (typeof metrics.notVulnerable !== 'number') {
          errors.push(`Invalid notVulnerable: ${metrics.notVulnerable} (expected number)`);
        }

        // Check for NaN values
        if (Number.isNaN(metrics.total)) {
          errors.push('CRITICAL: total is NaN');
        }
        if (Number.isNaN(metrics.vulnerable)) {
          errors.push('CRITICAL: vulnerable is NaN');
        }
        if (Number.isNaN(metrics.potentiallyVulnerable)) {
          errors.push('CRITICAL: potentiallyVulnerable is NaN');
        }
        if (Number.isNaN(metrics.notVulnerable)) {
          errors.push('CRITICAL: notVulnerable is NaN');
        }

        // Check math: sum should equal total
        const calculated = metrics.vulnerable + metrics.potentiallyVulnerable + metrics.notVulnerable;
        if (calculated !== metrics.total) {
          errors.push(`Math error: ${metrics.vulnerable} + ${metrics.potentiallyVulnerable} + ${metrics.notVulnerable} = ${calculated}, but total is ${metrics.total}`);
        }

        // Check for negative values
        if (metrics.total < 0 || metrics.vulnerable < 0 || metrics.potentiallyVulnerable < 0 || metrics.notVulnerable < 0) {
          errors.push('CRITICAL: Negative metric values detected');
        }
      }

      const status = errors.length === 0 ? 'PASS' : 'FAIL';
      const result: ValidationResult = {
        month,
        status,
        metrics: {
          totalAssessed: metrics?.total || 0,
          vulnerable: metrics?.vulnerable || 0,
          potentiallyVulnerable: metrics?.potentiallyVulnerable || 0,
          notVulnerable: metrics?.notVulnerable || 0,
        },
        ...(errors.length > 0 && { errors }),
      };
      
      results.push(result);
      
      const icon = status === 'PASS' ? '✅' : '❌';
      const total = result.metrics.totalAssessed;
      const pct = total > 0 ? ((result.metrics.potentiallyVulnerable / total) * 100).toFixed(1) : '0';
      
      console.log(`${icon} ${month}: ${total.toLocaleString()} total, ${result.metrics.potentiallyVulnerable.toLocaleString()} potentially vulnerable (${pct}%)`);
      
      if (errors.length > 0) {
        errors.forEach(err => console.log(`   ⚠️  ${err}`));
      }
    } catch (error) {
      console.error(`❌ ${month}: Exception thrown`);
      console.error(`   ${error instanceof Error ? error.message : String(error)}`);
      
      results.push({
        month,
        status: 'FAIL',
        metrics: { totalAssessed: 0, vulnerable: 0, potentiallyVulnerable: 0, notVulnerable: 0 },
        errors: [error instanceof Error ? error.message : String(error)],
      });
    }
  }

  // Summary
  console.log('\n=== VALIDATION SUMMARY ===\n');
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  
  console.log(`✅ Passed: ${passCount}/${MONTHS_TO_TEST.length}`);
  console.log(`❌ Failed: ${failCount}/${MONTHS_TO_TEST.length}`);
  
  if (failCount === 0) {
    console.log('\n🎉 ALL TESTS PASSED - Time period selection fix is working correctly!\n');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED - Issues detected in time period filtering\n');
  }

  // Special September 2025 verification (the specific failing case from the bug report)
  console.log('=== SEPTEMBER 2025 VERIFICATION (Bug Report Case) ===\n');
  const sep2025 = results.find(r => r.month === '2025-09');
  if (sep2025) {
    console.log(`Month: ${sep2025.month}`);
    console.log(`Status: ${sep2025.status}`);
    console.log(`Total Assessed: ${sep2025.metrics.totalAssessed.toLocaleString()}`);
    console.log(`Vulnerable: ${sep2025.metrics.vulnerable}`);
    console.log(`Potentially Vulnerable: ${sep2025.metrics.potentiallyVulnerable.toLocaleString()}`);
    console.log(`Not Vulnerable: ${sep2025.metrics.notVulnerable}`);
    console.log(`Expected: 5,698 potentially vulnerable assets with 0 vulnerable\n`);
    
    if (sep2025.metrics.potentiallyVulnerable === 5698 && sep2025.metrics.vulnerable === 0) {
      console.log('✅ September 2025 displaying CORRECT data (5,698 potentially vulnerable)\n');
    } else {
      console.log('❌ September 2025 data mismatch - fix may not be working\n');
    }
  }

  return results;
}

// Run validation
validateAllMonths()
  .then(results => {
    process.exit(results.every(r => r.status === 'PASS') ? 0 : 1);
  })
  .catch(error => {
    console.error('Validation script error:', error);
    process.exit(1);
  });
