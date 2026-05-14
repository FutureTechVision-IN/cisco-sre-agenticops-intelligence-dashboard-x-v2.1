import { db } from "./db";
import { fieldNoticeRecords } from "@shared/schema";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { createReadStream } from "fs";
import { parse } from "csv-parse";

const CSV_PATH = path.join(import.meta.dirname, "..", "attached_assets", "filtered_bcs_apr25-sep25_2025_apr-sep_1763810216515.csv");

export async function seedDatabase(): Promise<void> {
  try {
    // Check if data is complete (577,603 total records expected)
    const countResult = await db.select({ count: sql<number>`cast(count(*) as integer)` }).from(fieldNoticeRecords);
    const existingRecordCount = countResult[0]?.count || 0;
    
    if (existingRecordCount >= 570000) {
      console.log(`[SEED] Database fully populated with ${existingRecordCount} records. Skipping seed.`);
      return;
    }
    
    if (existingRecordCount > 0) {
      console.log(`[SEED] Incomplete data detected (${existingRecordCount} records). Clearing and re-importing...`);
      // Clear incomplete data and restart import
      await db.delete(fieldNoticeRecords);
    }

    // Check if CSV file exists
    if (!fs.existsSync(CSV_PATH)) {
      console.log(`[SEED] CSV file not found at ${CSV_PATH}. Skipping seed.`);
      return;
    }

    console.log("[SEED] Starting database seeding from CSV...");
    
    let recordCount = 0;
    let errorCount = 0;
    const batchSize = 1000;
    let batch: any[] = [];

    return new Promise((resolve, reject) => {
      const parser = createReadStream(CSV_PATH)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }));

      parser.on("data", async (record: any) => {
        try {
          // Parse the CSV row
          const fieldNoticeRecord = {
            fieldNoticeId: record.FIELD_NOTICE || "",
            firstPublished: record.FIRST_PUBLISHED ? new Date(record.FIRST_PUBLISHED) : null,
            fnTitle: record.FN_TITLE || "",
            fnType: record.FN_TYPE || null,
            totVuln: parseInt(record.TOT_VULN || "0", 10),
            cvul: parseFloat(record.CVUL || "0"),
            potVuln: parseInt(record.POT_VULN || "0", 10),
            cpVuln: parseFloat(record.CPVUL || "0"),
            notVuln: parseInt(record.NOT_VULN || "0", 10),
            cNotVuln: parseFloat(record.CNVUL || "0"),
            dateImported: record.DATE_IMPORTED || "",
            cpyKey: record.CPYKEY || "",
            customerName: record.CUSTOMER_NAME || "",
          };

          batch.push(fieldNoticeRecord);

          // Insert in batches to avoid memory overload
          if (batch.length >= batchSize) {
            const batchToInsert = [...batch];
            batch = [];
            
            parser.pause();

            try {
              await db.insert(fieldNoticeRecords).values(batchToInsert);
              recordCount += batchToInsert.length;
              console.log(`[SEED] Inserted ${recordCount} records...`);
              parser.resume();
            } catch (err: any) {
              console.error(`[SEED] Batch insert error: ${err.message}`);
              errorCount += batchToInsert.length;
              parser.resume();
            }
          }
        } catch (err: any) {
          errorCount++;
          if (errorCount <= 5) {
            console.error(`[SEED] Record parse error: ${err.message}`);
          }
        }
      });

      parser.on("end", async () => {
        // Insert remaining records
        if (batch.length > 0) {
          try {
            await db.insert(fieldNoticeRecords).values(batch);
            recordCount += batch.length;
          } catch (err: any) {
            console.error(`[SEED] Final batch insert error: ${err.message}`);
            errorCount += batch.length;
          }
        }

        console.log(`[SEED] Database seeding complete!`);
        console.log(`[SEED] Total records inserted: ${recordCount}`);
        if (errorCount > 0) {
          console.log(`[SEED] Records with errors: ${errorCount}`);
        }
        resolve();
      });

      parser.on("error", (err) => {
        console.error(`[SEED] CSV parsing error: ${err.message}`);
        reject(err);
      });
    });
  } catch (error: any) {
    console.error(`[SEED] Database seeding failed: ${error.message}`);
    throw error;
  }
}
