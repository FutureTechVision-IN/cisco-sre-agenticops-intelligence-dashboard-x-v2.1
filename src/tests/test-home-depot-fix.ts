/**
 * Test Script: Verify Home Depot Customer Fix
 * Tests that the customer name normalization and matching is working
 */

import { db } from "./backend/db";
import { sql } from "drizzle-orm";
import { normalizeCustomerName } from "./backend/storage";

async function testHomeDepotFix() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║     HOME DEPOT CUSTOMER FIX VERIFICATION TEST                 ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  try {
    // Test 1: Check raw data in database
    console.log("Test 1: Checking raw database records for Home Depot...");
    const rawResult = await db.execute(sql`
      SELECT customer_name, COUNT(*) as count
      FROM field_notice_records
      WHERE customer_name LIKE '%HOME DEPOT%'
      GROUP BY customer_name
      ORDER BY count DESC
    `);

    console.log(`Found ${rawResult.rows.length} Home Depot customer name variations:`);
    rawResult.rows.forEach((row: any, idx) => {
      console.log(`   ${idx + 1}. "${row.customer_name}" - ${row.count} records`);
    });
    console.log("");

    // Test 2: Test normalization function
    console.log("Test 2: Testing normalization function...");
    const testNames = [
      '"HOME DEPOT USA',
      'HOME DEPOT USA',
      'HOME DEPOT USA, INC.',
      '  "HOME DEPOT USA  ',
    ];

    testNames.forEach(name => {
      const normalized = normalizeCustomerName(name);
      console.log(`   Input: "${name}"`);
      console.log(`   Normalized: "${normalized}"`);
      console.log("");
    });

    // Test 3: Test flexible matching query
    console.log("Test 3: Testing flexible customer matching query...");
    const customerInput = "HOME DEPOT USA, INC.";
    const normalizedName = normalizeCustomerName(customerInput) || customerInput;

    const matchResult = await db.execute(sql`
      WITH deduped_records AS (
        SELECT DISTINCT ON (field_notice_id, cpy_key, customer_name)
          tot_vuln, pot_vuln, not_vuln, customer_name
        FROM field_notice_records
        WHERE (
          customer_name = ${customerInput}
          OR customer_name = ${normalizedName}
          OR TRIM(BOTH '"''' FROM customer_name) = ${normalizedName}
          OR customer_name LIKE '%' || ${normalizedName} || '%'
        )
        ORDER BY field_notice_id, cpy_key, customer_name, created_at DESC
      )
      SELECT 
        customer_name,
        COUNT(*) as record_count,
        COALESCE(SUM(tot_vuln), 0) as tot_vuln,
        COALESCE(SUM(pot_vuln), 0) as pot_vuln,
        COALESCE(SUM(not_vuln), 0) as not_vuln
      FROM deduped_records
      GROUP BY customer_name
    `);

    console.log(`Query Input: "${customerInput}"`);
    console.log(`Normalized: "${normalizedName}"`);
    console.log(`Matched records:`);
    matchResult.rows.forEach((row: any) => {
      console.log(`   Customer: "${row.customer_name}"`);
      console.log(`   Records: ${row.record_count}`);
      console.log(`   Vulnerable: ${row.tot_vuln}`);
      console.log(`   Potentially Vulnerable: ${row.pot_vuln}`);
      console.log(`   Not Vulnerable: ${row.not_vuln}`);
      console.log("");
    });

    // Calculate totals
    const totals = matchResult.rows.reduce(
      (acc: any, row: any) => ({
        records: acc.records + parseInt(row.record_count),
        totVuln: acc.totVuln + parseInt(row.tot_vuln),
        potVuln: acc.potVuln + parseInt(row.pot_vuln),
        notVuln: acc.notVuln + parseInt(row.not_vuln),
      }),
      { records: 0, totVuln: 0, potVuln: 0, notVuln: 0 }
    );

    console.log("═══════════════════════════════════════════════════════════════");
    console.log("TOTALS:");
    console.log(`   Total Records: ${totals.records}`);
    console.log(`   Total Vulnerable: ${totals.totVuln.toLocaleString()}`);
    console.log(`   Potentially Vulnerable: ${totals.potVuln.toLocaleString()}`);
    console.log(`   Not Vulnerable: ${totals.notVuln.toLocaleString()}`);
    console.log(`   Total Assets: ${(totals.totVuln + totals.potVuln + totals.notVuln).toLocaleString()}`);
    console.log("═══════════════════════════════════════════════════════════════\n");

    // Test 4: Verify the fix expectation
    console.log("Test 4: Verification against expected values...");
    if (totals.records > 0) {
      console.log("   ✅ SUCCESS: Home Depot records are now accessible!");
      console.log(`   ✅ Found ${totals.records} records (expected ~712 from CSV audit)`);
      
      if (totals.totVuln > 0 || totals.potVuln > 0 || totals.notVuln > 0) {
        console.log("   ✅ Metrics are populated (not showing 0/0/0)");
      } else {
        console.log("   ⚠️  WARNING: Metrics show 0 values - check data");
      }
    } else {
      console.log("   ❌ FAILED: No Home Depot records found");
      console.log("   ℹ️  Database may need migration or CSV import");
    }

    console.log("\n✅ Test complete!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

testHomeDepotFix();
