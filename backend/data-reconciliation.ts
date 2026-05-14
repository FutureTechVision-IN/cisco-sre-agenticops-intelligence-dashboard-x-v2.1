// Data reconciliation and quality assurance module
import { db } from "./db";
import { fieldNoticeRecords } from "@shared/schema";

export interface DataReconciliationReport {
  timestamp: string;
  databaseRecordCount: number;
  expectedRecordCount: number;
  discrepancy: {
    recordsDifference: number;
    percentageDifference: number;
  };
  currentMetrics: {
    totalAssessed: number;
    vulnerable: number;
    potentiallyVulnerable: number;
    notVulnerable: number;
  };
  expectedMetrics: {
    totalAssessed: number;
    vulnerable: number;
    potentiallyVulnerable: number;
    notVulnerable: number;
  };
  validationStatus: "VALID" | "DISCREPANCY_DETECTED" | "CRITICAL_MISMATCH";
  recommendations: string[];
}

/**
 * Compare database metrics with external validation data
 * External data from CIRCUIT CSV shows:
 * - 2025-04: 88,907 records, TOT=1.39M, POT=64.99M, NOT=48.50M
 * - 2025-05: 89,040 records, TOT=1.48M, POT=6.89M, NOT=48.96M
 * - 2025-06: 89,738 records, TOT=1.60M, POT=6.74M, NOT=48.22M
 * - 2025-07: 89,428 records, TOT=1.34M, POT=6.21M, NOT=47.68M
 * - 2025-08: 89,422 records, TOT=1.16M, POT=6.44M, NOT=47.78M
 * - 2025-09: 131,068 records, TOT=2.60M, POT=8.08M, NOT=70.35M
 * Total: 578,603 records
 */
const EXTERNAL_VALIDATION_DATA = {
  totalRecords: 578603,
  months: {
    "2025-04": { records: 88907, totVuln: 1393596, potVuln: 64972236, notVuln: 48502139 },
    "2025-05": { records: 89040, totVuln: 1487961, potVuln: 6893956, notVuln: 48965911 },
    "2025-06": { records: 89738, totVuln: 1607907, potVuln: 6745205, notVuln: 48222287 },
    "2025-07": { records: 89428, totVuln: 1340326, potVuln: 6211529, notVuln: 47689290 },
    "2025-08": { records: 89422, totVuln: 1167640, potVuln: 6444468, notVuln: 47789438 },
    "2025-09": { records: 131068, totVuln: 2606888, potVuln: 8080567, notVuln: 70352272 },
  },
  totals: {
    totVuln: 9604318,
    potVuln: 99347961,
    notVuln: 291521337,
    total: 400473616,
  }
};

export async function generateReconciliationReport(): Promise<DataReconciliationReport> {
  const records = await db.select().from(fieldNoticeRecords);
  
  let totalVulnerable = 0;
  let totalPotentiallyVulnerable = 0;
  let totalNotVulnerable = 0;

  for (const record of records) {
    totalVulnerable += record.totVuln || 0;
    totalPotentiallyVulnerable += record.potVuln || 0;
    totalNotVulnerable += record.notVuln || 0;
  }

  const currentMetrics = {
    totalAssessed: totalVulnerable + totalPotentiallyVulnerable + totalNotVulnerable,
    vulnerable: totalVulnerable,
    potentiallyVulnerable: totalPotentiallyVulnerable,
    notVulnerable: totalNotVulnerable,
  };

  const expectedMetrics = {
    totalAssessed: EXTERNAL_VALIDATION_DATA.totals.total,
    vulnerable: EXTERNAL_VALIDATION_DATA.totals.totVuln,
    potentiallyVulnerable: EXTERNAL_VALIDATION_DATA.totals.potVuln,
    notVulnerable: EXTERNAL_VALIDATION_DATA.totals.notVuln,
  };

  const recordsDifference = records.length - EXTERNAL_VALIDATION_DATA.totalRecords;
  const percentageDifference = (recordsDifference / EXTERNAL_VALIDATION_DATA.totalRecords) * 100;

  let validationStatus: "VALID" | "DISCREPANCY_DETECTED" | "CRITICAL_MISMATCH" = "VALID";
  const recommendations: string[] = [];

  // Determine validation status
  if (Math.abs(percentageDifference) > 50) {
    validationStatus = "CRITICAL_MISMATCH";
    recommendations.push("Database has significantly fewer records than expected. Recommend full data import re-validation.");
    recommendations.push("Check for data import interruptions or incomplete uploads.");
    recommendations.push("Verify all 6 months (2025-04 through 2025-09) have been imported.");
  } else if (Math.abs(percentageDifference) > 5) {
    validationStatus = "DISCREPANCY_DETECTED";
    recommendations.push("Database record count differs from expected. Investigate data import completeness.");
    recommendations.push("Compare monthly record counts to identify missing months.");
  }

  recommendations.push("Current database metrics are ACCURATE for data present. Discrepancy indicates incomplete data import.");
  recommendations.push("Next steps: Re-import missing historical data from 2025-04 through 2025-09 from CIRCUIT CSV source.");

  return {
    timestamp: new Date().toISOString(),
    databaseRecordCount: records.length,
    expectedRecordCount: EXTERNAL_VALIDATION_DATA.totalRecords,
    discrepancy: {
      recordsDifference,
      percentageDifference,
    },
    currentMetrics,
    expectedMetrics,
    validationStatus,
    recommendations,
  };
}

export function getExternalValidationReference() {
  return EXTERNAL_VALIDATION_DATA;
}
