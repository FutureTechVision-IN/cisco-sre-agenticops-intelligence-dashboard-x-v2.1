import fs from "fs";
import readline from "readline";
import { db } from "./db";
import { fieldNoticeRecords } from "@shared/schema";

async function finishImport() {
  const CSV_FILE = "attached_assets/filtered_bcs_apr25-sep25_2025_apr-sep_1763720499192.csv";
  
  // Get existing records to know where to resume
  const existing = await db.select({ fieldNoticeId: fieldNoticeRecords.fieldNoticeId, cpyKey: fieldNoticeRecords.cpyKey, customerName: fieldNoticeRecords.customerName }).from(fieldNoticeRecords);
  const existingSet = new Set(existing.map(r => `${r.fieldNoticeId}|${r.cpyKey}|${r.customerName}`));
  
  console.log(`📊 Database has ${existingSet.size} records. Resuming import...`);

  const fileStream = fs.createReadStream(CSV_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  let skipped = 0;
  let imported = 0;
  let batch: any[] = [];
  const BATCH_SIZE = 1000;

  for await (const line of rl) {
    lineCount++;
    if (lineCount === 1) continue;

    try {
      const parts = line.split(",");
      if (parts.length < 13) continue;

      const fn = (parts[0] || "").trim();
      const cpy = (parts[11] || "").trim();
      const cust = (parts[12] || "").trim() || "UNKNOWN";
      const key = `${fn}|${cpy}|${cust}`;

      // Skip if already exists
      if (existingSet.has(key)) {
        skipped++;
        continue;
      }

      batch.push({
        fieldNoticeId: fn,
        firstPublished: 
          (parts[1] || "").trim() === "0000-00-00 00:00:00" ? null : 
          (parts[1] || "").trim() ? new Date((parts[1] || "").trim()) : null,
        fnTitle: (parts[2] || "").trim(),
        fnType: (parts[3] || "").trim(),
        totVuln: parseInt(parts[4]) || 0,
        cvul: parseFloat(parts[5]) || 0,
        potVuln: parseInt(parts[6]) || 0,
        cpVuln: parseFloat(parts[7]) || 0,
        notVuln: parseInt(parts[8]) || 0,
        cNotVuln: parseFloat(parts[9]) || 0,
        dateImported: (parts[10] || "").trim(),
        cpyKey: cpy,
        customerName: cust,
      });

      if (batch.length >= BATCH_SIZE) {
        try {
          await db.insert(fieldNoticeRecords).values(batch);
          imported += batch.length;
          if (lineCount % 100000 === 0) {
            console.log(`✓ Line ${lineCount}: imported ${imported}, skipped ${skipped}`);
          }
        } catch (err) {
          console.warn(`⚠️  Batch error:`, (err as any).message);
        }
        batch = [];
      }
    } catch (err) {
      // Skip malformed
    }
  }

  // Final batch
  if (batch.length > 0) {
    try {
      await db.insert(fieldNoticeRecords).values(batch);
      imported += batch.length;
    } catch (err) {
      console.warn(`⚠️  Final batch error:`, (err as any).message);
    }
  }

  const finalCount = await db.select({ id: fieldNoticeRecords.id }).from(fieldNoticeRecords);
  
  console.log(`\n✅ IMPORT COMPLETE!`);
  console.log(`   Total records in database: ${finalCount.length}`);
  console.log(`   New records imported: ${imported}`);
  console.log(`   Already existed: ${skipped}`);

  process.exit(0);
}

finishImport().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
