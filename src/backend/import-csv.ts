import fs from "fs";
import readline from "readline";
import { db } from "./db";
import { fieldNoticeRecords } from "@shared/schema";
import { sql } from "drizzle-orm";
import { normalizeCustomerName, formatFieldNoticeId } from "./storage";

async function importCSV(filePath: string) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  let importCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;
  const batchSize = 500;
  let batch: any[] = [];

  console.log("Starting CSV import...");

  for await (const line of rl) {
    lineCount++;

    // Skip header
    if (lineCount === 1) continue;

    try {
      const parts = line.split(",");

      if (parts.length < 13) {
        errorCount++;
        continue;
      }

      // Apply data normalization during import
      const rawCustomerName = parts[12]?.trim() || "UNKNOWN";
      const normalizedCustomer = normalizeCustomerName(rawCustomerName);
      
      // Skip records with invalid customer names
      if (!normalizedCustomer) {
        errorCount++;
        continue;
      }

      const record = {
        fieldNoticeId: formatFieldNoticeId(parts[0]?.trim()),
        firstPublished: parts[1]?.trim() === "0000-00-00 00:00:00" ? null : (parts[1]?.trim() || null),
        fnTitle: parts[2]?.trim(),
        fnType: parts[3]?.trim(),
        totVuln: parseInt(parts[4]) || 0,
        cvul: parseFloat(parts[5]) || 0,
        potVuln: parseInt(parts[6]) || 0,
        cpVuln: parseFloat(parts[7]) || 0,
        notVuln: parseInt(parts[8]) || 0,
        cNotVuln: parseFloat(parts[9]) || 0,
        dateImported: parts[10]?.trim(),
        cpyKey: parts[11]?.trim(),
        customerName: normalizedCustomer,
      };

      // Check for duplicates before adding to batch
      const existing = await db
        .select()
        .from(fieldNoticeRecords)
        .where(
          sql`${fieldNoticeRecords.fieldNoticeId} = ${record.fieldNoticeId} 
              AND ${fieldNoticeRecords.cpyKey} = ${record.cpyKey} 
              AND ${fieldNoticeRecords.customerName} = ${record.customerName}`
        )
        .limit(1);

      if (existing.length > 0) {
        duplicateCount++;
        continue;
      }

      batch.push(record);

      if (batch.length >= batchSize) {
        await db.insert(fieldNoticeRecords).values(batch);
        importCount += batch.length;
        batch = [];

        const progress = ((lineCount / 577604) * 100).toFixed(2);
        console.log(`Progress: ${progress}% (${importCount} imported)`);
      }
    } catch (error) {
      errorCount++;
      if (errorCount % 1000 === 0) {
        console.warn(`Errors so far: ${errorCount}`);
      }
    }
  }

  // Insert remaining batch
  if (batch.length > 0) {
    await db.insert(fieldNoticeRecords).values(batch);
    importCount += batch.length;
  }

  console.log("\n=== Import Complete ===");
  console.log(`Total lines processed: ${lineCount}`);
  console.log(`Records imported: ${importCount}`);
  console.log(`Duplicates skipped: ${duplicateCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log("========================\n");

  process.exit(0);
}

const csvFile = process.argv[2] || "attached_assets/filtered_bcs_apr25-sep25_2025_apr-sep_1763720499192.csv";

if (!fs.existsSync(csvFile)) {
  console.error(`CSV file not found: ${csvFile}`);
  process.exit(1);
}

importCSV(csvFile).catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
