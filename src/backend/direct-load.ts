import fs from "fs";
import readline from "readline";
import { db } from "./db";
import { fieldNoticeRecords } from "@shared/schema";

async function directImport() {
  const CSV_FILE = "attached_assets/filtered_bcs_apr25-sep25_2025_apr-sep_1763720499192.csv";
  const fileStream = fs.createReadStream(CSV_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  let importedCount = 0;
  let batch: any[] = [];
  const BATCH_SIZE = 500;

  console.log("🚀 Starting direct CSV import via Drizzle...");

  for await (const line of rl) {
    lineCount++;
    if (lineCount === 1) continue; // Skip header
    
    if (lineCount % 50000 === 0) {
      console.log(`📊 Processed ${lineCount} lines, imported ${importedCount}...`);
    }

    try {
      const parts = line.split(",");
      if (parts.length < 13) continue;

      batch.push({
        fieldNoticeId: (parts[0] || "").trim(),
        firstPublished: 
          (parts[1] || "").trim() === "0000-00-00 00:00:00" ? null : 
          (parts[1] || "").trim() ? new Date((parts[1] || "").trim()) : null,
        fnTitle: (parts[2] || "").trim(),
        fnType: (parts[3] || "").trim(),
        totVuln: parseInt(parts[4]) || 0,
        potVuln: parseInt(parts[6]) || 0,
        notVuln: parseInt(parts[8]) || 0,
        dateImported: (parts[10] || "").trim(),
        cpyKey: (parts[11] || "").trim(),
        customerName: (parts[12] || "").trim() || "UNKNOWN",
      });

      if (batch.length >= BATCH_SIZE) {
        try {
          await db.insert(fieldNoticeRecords).values(batch).onConflictDoNothing();
          importedCount += batch.length;
        } catch (err) {
          console.warn(`⚠️  Batch error at line ${lineCount}:`, (err as any).message);
        }
        batch = [];
      }
    } catch (err) {
      // Skip malformed lines
    }
  }

  // Final batch
  if (batch.length > 0) {
    try {
      await db.insert(fieldNoticeRecords).values(batch).onConflictDoNothing();
      importedCount += batch.length;
    } catch (err) {
      console.warn(`⚠️  Final batch error:`, (err as any).message);
    }
  }

  // Verify
  const result = await db
    .select({
      total: fieldNoticeRecords.id,
    })
    .from(fieldNoticeRecords);

  console.log(`\n✅ Import complete!`);
  console.log(`   Lines processed: ${lineCount}`);
  console.log(`   Records imported: ${importedCount}`);
  console.log(`   Total in database: ${result.length}`);

  process.exit(0);
}

directImport().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
