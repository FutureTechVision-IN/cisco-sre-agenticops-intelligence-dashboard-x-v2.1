/**
 * PDF Report Testing & Validation Utility
 * Verifies blank page elimination across different report types
 */

import { PDFReportOptimizer } from './pdf-optimizer';
import { validatePDFReport, logValidationResults, PDFValidationResult } from './pdf-validation';

export interface TestReport {
  name: string;
  headers: string[];
  dataSize: 'small' | 'medium' | 'large';
  expectedPages: number;
  description: string;
}

export const TEST_REPORTS: TestReport[] = [
  {
    name: "Field Notices - Small",
    headers: ["fieldNoticeId", "fnTitle", "totVuln", "potVuln", "notVuln"],
    dataSize: "small",
    expectedPages: 1,
    description: "10 field notice records - fits on single page"
  },
  {
    name: "Field Notices - Medium",
    headers: ["fieldNoticeId", "fnTitle", "totVuln", "potVuln", "notVuln"],
    dataSize: "medium",
    expectedPages: 2,
    description: "50 field notice records - spans multiple pages"
  },
  {
    name: "Customers - Medium",
    headers: ["customerName", "totVuln", "potVuln", "notVuln", "recordCount"],
    dataSize: "medium",
    expectedPages: 1,
    description: "20 customer records with intelligence section"
  },
  {
    name: "Large Report",
    headers: ["id", "name", "value1", "value2", "value3", "value4"],
    dataSize: "large",
    expectedPages: 3,
    description: "100+ records with full intelligence analysis"
  }
];

/**
 * Generate test data based on size
 */
function generateTestData(size: 'small' | 'medium' | 'large', headers: string[]): any[] {
  const counts = { small: 10, medium: 50, large: 100 };
  const count = counts[size];
  
  return Array.from({ length: count }, (_, i) => {
    const row: any = {};
    headers.forEach(header => {
      if (header.includes('name') || header.includes('Title') || header.includes('id')) {
        row[header] = `${header}-${i + 1}`;
      } else if (header.includes('Vuln') || header.includes('Count') || header.includes('value')) {
        row[header] = Math.floor(Math.random() * 100000);
      } else {
        row[header] = `data-${i + 1}`;
      }
    });
    return row;
  });
}

/**
 * Run comprehensive PDF validation tests
 */
export async function runPDFTests(): Promise<void> {
  console.log("\n" + "=".repeat(70));
  console.log("🧪 PDF REPORT BLANK PAGE TEST SUITE");
  console.log("=".repeat(70) + "\n");

  let totalTests = 0;
  let passedTests = 0;
  const results: { report: TestReport; valid: boolean; pages: number; issues: string[] }[] = [];

  for (const testReport of TEST_REPORTS) {
    totalTests++;
    console.log(`📋 Testing: ${testReport.name}`);
    console.log(`   Description: ${testReport.description}`);

    const optimizer = new PDFReportOptimizer(`test-${testReport.name}.pdf`);
    const testData = generateTestData(testReport.dataSize, testReport.headers);

    try {
      // Add content
      optimizer.addHeader(testReport.name);
      optimizer.addDataTable(testReport.headers, testData);
      optimizer.finalize();

      // Validate
      const breakdown = optimizer.getPageBreakdown();
      const validation = validatePDFReport(breakdown);
      
      const actualPages = breakdown.length;
      const isValid = validation.isValid && actualPages === testReport.expectedPages;

      if (isValid) {
        passedTests++;
        console.log(`   ✅ PASS - ${actualPages} page(s), no blank pages`);
      } else {
        console.log(`   ❌ FAIL - Expected ${testReport.expectedPages} pages, got ${actualPages}`);
        console.log(`   Issues: ${validation.issuesFound.join(', ')}`);
      }

      results.push({
        report: testReport,
        valid: isValid,
        pages: actualPages,
        issues: validation.issuesFound
      });

    } catch (error) {
      console.log(`   ❌ ERROR - ${error instanceof Error ? error.message : 'Unknown error'}`);
      results.push({
        report: testReport,
        valid: false,
        pages: 0,
        issues: ['Generation error']
      });
    }

    console.log();
  }

  // Summary
  console.log("=".repeat(70));
  console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} tests passed`);
  console.log("=".repeat(70) + "\n");

  if (passedTests === totalTests) {
    console.log("✅ ALL TESTS PASSED - Blank page issue is permanently resolved!");
  } else {
    console.log(`⚠️  ${totalTests - passedTests} test(s) failed - review issues above`);
  }
}

// Run if executed directly
if (require.main === module) {
  runPDFTests().catch(console.error);
}
