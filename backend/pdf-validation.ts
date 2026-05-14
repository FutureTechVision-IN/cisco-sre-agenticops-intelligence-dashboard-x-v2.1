/**
 * PDF Report Validation - Detects and prevents blank pages
 * Ensures document integrity and optimal pagination
 */

import PDFDocument from "pdfkit";

export interface PDFValidationResult {
  isValid: boolean;
  pageCount: number;
  blankPages: number[];
  issuesFound: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Validate PDF for blank pages and formatting issues
 */
export function validatePDFReport(pageBreakdown: { page: number; hasContent: boolean; contentHeight: number }[]): PDFValidationResult {
  const result: PDFValidationResult = {
    isValid: true,
    pageCount: pageBreakdown.length,
    blankPages: [],
    issuesFound: [],
    warnings: [],
    recommendations: [],
  };

  // Check for blank pages
  pageBreakdown.forEach(page => {
    if (!page.hasContent) {
      result.blankPages.push(page.page);
      result.isValid = false;
      result.issuesFound.push(`Page ${page.page} is blank (content height: ${page.contentHeight}px)`);
    }

    // Warning for sparse content
    if (page.contentHeight < 50 && page.hasContent) {
      result.warnings.push(`Page ${page.page} has minimal content (${page.contentHeight}px)`);
      result.recommendations.push(`Consider consolidating content on page ${page.page}`);
    }
  });

  // Ensure no consecutive blank pages
  for (let i = 0; i < result.blankPages.length - 1; i++) {
    if (result.blankPages[i + 1] - result.blankPages[i] === 1) {
      result.issuesFound.push(`Consecutive blank pages detected: ${result.blankPages[i]} and ${result.blankPages[i + 1]}`);
    }
  }

  // Final validation
  if (result.blankPages.length === 0) {
    result.isValid = true;
  }

  return result;
}

/**
 * Log PDF validation results
 */
export function logValidationResults(validation: PDFValidationResult): void {
  console.log("[PDF Validation] Report Summary:");
  console.log(`  Total Pages: ${validation.pageCount}`);
  console.log(`  Blank Pages: ${validation.blankPages.length}`);
  console.log(`  Validation Status: ${validation.isValid ? "✅ PASSED" : "❌ FAILED"}`);

  if (validation.issuesFound.length > 0) {
    console.log("\n⚠️  Issues Found:");
    validation.issuesFound.forEach(issue => console.log(`    - ${issue}`));
  }

  if (validation.warnings.length > 0) {
    console.log("\n⚠️  Warnings:");
    validation.warnings.forEach(warning => console.log(`    - ${warning}`));
  }

  if (validation.recommendations.length > 0) {
    console.log("\n💡 Recommendations:");
    validation.recommendations.forEach(rec => console.log(`    - ${rec}`));
  }
}
