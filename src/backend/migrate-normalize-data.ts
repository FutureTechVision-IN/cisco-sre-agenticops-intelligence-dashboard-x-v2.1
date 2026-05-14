/**
 * Database Migration: Normalize Customer Names and Field Notice IDs
 * 
 * This script applies data quality fixes to existing database records:
 * 1. Removes leading quotes from customer names
 * 2. Filters out invalid customer names (numeric-only, < 2 chars)
 * 3. Ensures all field notice IDs have FN prefix
 * 4. Standardizes whitespace in customer names
 */

import { db } from "./db";
import { sql } from "drizzle-orm";
import { normalizeCustomerName, formatFieldNoticeId } from "./storage";

interface MigrationStats {
  totalRecords: number;
  customersNormalized: number;
  fieldNoticesFormatted: number;
  recordsDeleted: number;
  errors: number;
}

async function migrateData(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalRecords: 0,
    customersNormalized: 0,
    fieldNoticesFormatted: 0,
    recordsDeleted: 0,
    errors: 0,
  };

  console.log("🔧 Starting database migration...\n");

  try {
    // Get total record count
    const countResult = await db.execute(sql`SELECT COUNT(*) as total FROM field_notice_records`);
    stats.totalRecords = Number(countResult.rows[0]?.total) || 0;
    console.log(`📊 Total records to process: ${stats.totalRecords.toLocaleString()}\n`);

    // Step 1: Normalize customer names
    console.log("Step 1: Normalizing customer names...");
    const customerUpdateResult = await db.execute(sql`
      UPDATE field_notice_records
      SET customer_name = TRIM(BOTH '"''' FROM customer_name)
      WHERE customer_name LIKE '"%' OR customer_name LIKE '''%'
        OR customer_name != TRIM(customer_name)
    `);
    stats.customersNormalized = Number((customerUpdateResult as any).rowCount) || 0;
    console.log(`   ✓ Normalized ${stats.customersNormalized.toLocaleString()} customer names\n`);

    // Step 2: Delete invalid customer records (numeric-only, < 2 chars)
    console.log("Step 2: Removing invalid customer records...");
    const deleteResult = await db.execute(sql`
      DELETE FROM field_notice_records
      WHERE customer_name ~ '^\\d+(\\.\\d+)?$'
         OR LENGTH(TRIM(customer_name)) < 2
         OR customer_name IS NULL
         OR customer_name = ''
    `);
    stats.recordsDeleted = Number((deleteResult as any).rowCount) || 0;
    console.log(`   ✓ Deleted ${stats.recordsDeleted.toLocaleString()} invalid records\n`);

    // Step 3: Format field notice IDs to add FN prefix
    console.log("Step 3: Formatting field notice IDs...");
    const fnUpdateResult = await db.execute(sql`
      UPDATE field_notice_records
      SET field_notice_id = 'FN' || field_notice_id
      WHERE field_notice_id ~ '^\\d{5}$'
        AND field_notice_id NOT LIKE 'FN%'
    `);
    stats.fieldNoticesFormatted = Number((fnUpdateResult as any).rowCount) || 0;
    console.log(`   ✓ Formatted ${stats.fieldNoticesFormatted.toLocaleString()} field notice IDs\n`);

    // Step 4: Verify results
    console.log("Step 4: Verifying migration...");
    
    // Check for remaining issues
    const validationQueries = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM field_notice_records WHERE customer_name LIKE '"%'`),
      db.execute(sql`SELECT COUNT(*) as count FROM field_notice_records WHERE customer_name ~ '^\\d+(\\.\\d+)?$'`),
      db.execute(sql`SELECT COUNT(*) as count FROM field_notice_records WHERE field_notice_id ~ '^\\d{5}$' AND field_notice_id NOT LIKE 'FN%'`),
      db.execute(sql`SELECT COUNT(*) as count FROM field_notice_records`),
    ]);

    const remainingQuotes = Number(validationQueries[0].rows[0]?.count) || 0;
    const remainingNumeric = Number(validationQueries[1].rows[0]?.count) || 0;
    const remainingUnformatted = Number(validationQueries[2].rows[0]?.count) || 0;
    const finalCount = Number(validationQueries[3].rows[0]?.count) || 0;

    console.log("   Validation Results:");
    console.log(`   - Records with leading quotes: ${remainingQuotes}`);
    console.log(`   - Records with numeric customer names: ${remainingNumeric}`);
    console.log(`   - Records with unformatted field notice IDs: ${remainingUnformatted}`);
    console.log(`   - Total records after migration: ${finalCount.toLocaleString()}\n`);

    if (remainingQuotes === 0 && remainingNumeric === 0 && remainingUnformatted === 0) {
      console.log("   ✅ Migration validation PASSED - No issues detected\n");
    } else {
      console.log("   ⚠️  Migration validation found remaining issues\n");
    }

  } catch (error) {
    console.error("❌ Migration error:", error);
    stats.errors++;
    throw error;
  }

  return stats;
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║     DATABASE MIGRATION: NORMALIZE CUSTOMER NAMES & FN IDs     ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  try {
    const stats = await migrateData();

    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║                    MIGRATION SUMMARY                           ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");
    console.log(`Total Records Processed:     ${stats.totalRecords.toLocaleString()}`);
    console.log(`Customer Names Normalized:   ${stats.customersNormalized.toLocaleString()}`);
    console.log(`Field Notice IDs Formatted:  ${stats.fieldNoticesFormatted.toLocaleString()}`);
    console.log(`Invalid Records Deleted:     ${stats.recordsDeleted.toLocaleString()}`);
    console.log(`Errors Encountered:          ${stats.errors}`);
    console.log("\n✅ Migration completed successfully!\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
main();
