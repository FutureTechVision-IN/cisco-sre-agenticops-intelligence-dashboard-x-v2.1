import fs from "fs";
import readline from "readline";
import { db } from "./db";
import { fieldNoticeRecords } from "@shared/schema";

async function forceCompleteImport() {
  const CSV_FILE = "attached_assets/filtered_bcs_apr25-sep25_2025_apr-sep_1763720499192.csv";
  const fileStream = fs.createReadStream(CSV_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  let insertCount = 0;
  let batch: any[] = [];
  const BATCH_SIZE = 2000;

  console.log(`🚀 Force importing ALL CSV records with conflict handling...`);

  for await (const line of rl) {
    lineCount++;
    if (lineCount === 1) continue;

    try {
      const parts = line.split(",");
      if (parts.length < 13) continue;

      batch.push({
        fieldNoticeId: (parts[0] || "").trim(),
        firstPublished: (parts[1] || "").trim() === "0000-00-00 00:00:00" ? null : 
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
          const result = await db.insert(fieldNoticeRecords).values(batch).onConflictDoNothing();
          insertCount += batch.length;
        } catch (err: any) {
          console.warn(`Batch at line ${lineCount} had error:`, err.message.substring(0, 100));
        }
        batch = [];

        if (lineCount % 50000 === 0) {
          console.log(`✓ Processed ${lineCount} lines...`);
        }
      }
    } catch (err) {
      // Skip malformed lines silently
    }
  }

  // Final batch
  if (batch.length > 0) {
    try {
      await db.insert(fieldNoticeRecords).values(batch).onConflictDoNothing();
      insertCount += batch.length;
    } catch (err: any) {
      console.warn(`Final batch error:`, err.message);
    }
  }

  // Get final count
  const finalCount = await db.select({ id: fieldNoticeRecords.id }).from(fieldNoticeRecords);
  const metrics = await db.select({
    totVuln: fieldNoticeRecords.totVuln,
    potVuln: fieldNoticeRecords.potVuln,
    notVuln: fieldNoticeRecords.notVuln,
  }).from(fieldNoticeRecords);

  let sumTot = 0, sumPot = 0, sumNot = 0;
  for (const m of metrics) {
    sumTot += m.totVuln || 0;
    sumPot += m.potVuln || 0;
    sumNot += m.notVuln || 0;
  }

  console.log(`\n✅ IMPORT COMPLETE!`);
  console.log(`   CSV lines processed: ${lineCount}`);
  console.log(`   Records inserted: ${insertCount}`);
  console.log(`   Total in database: ${finalCount.length}`);
  console.log(`   Sum TOT_VULN: ${sumTot}`);
  console.log(`   Sum POT_VULN: ${sumPot}`);
  console.log(`   Sum NOT_VULN: ${sumNot}`);

  process.exit(0);
}

forceCompleteImport().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
