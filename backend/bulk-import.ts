import fs from "fs";
import readline from "readline";
import { db } from "./db";
import { fieldNoticeRecords } from "@shared/schema";
import { sql } from "drizzle-orm";

async function importCSV() {
  const filePath = "attached_assets/filtered_bcs_apr25-sep25_2025_apr-sep_1763720499192.csv";
  
  if (!fs.existsSync(filePath)) {
    console.error("CSV file not found");
    process.exit(1);
  }

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  let importCount = 0;
  let duplicateCount = 0;
  const batchSize = 100;
  const batch: any[] = [];

  console.log("Starting CSV import...");

  for await (const line of rl) {
    lineCount++;
    if (lineCount % 10000 === 0) {
      console.log(`Processed ${lineCount} lines...`);
    }

    // Skip header
    if (lineCount === 1) continue;

    try {
      const parts = line.split(",");
      if (parts.length < 13) continue;

      // Parse the record carefully
      const firstPublished = parts[1]?.trim();
      const dateStr = firstPublished === "0000-00-00 00:00:00" || !firstPublished ? null : firstPublished;

      const record = {
        fieldNoticeId: parts[0]?.trim() || "",
        firstPublished: dateStr ? new Date(dateStr) : null,
        fnTitle: parts[2]?.trim() || "",
        fnType: parts[3]?.trim() || "",
        totVuln: parseInt(parts[4]) || 0,
        cvul: parseFloat(parts[5]) || 0,
        potVuln: parseInt(parts[6]) || 0,
        cpVuln: parseFloat(parts[7]) || 0,
        notVuln: parseInt(parts[8]) || 0,
        cNotVuln: parseFloat(parts[9]) || 0,
        dateImported: parts[10]?.trim() || "",
        cpyKey: parts[11]?.trim() || "",
        customerName: parts[12]?.trim() || "UNKNOWN",
      };

      batch.push(record);

      if (batch.length >= batchSize) {
        try {
          // Use raw SQL to handle conflicts
          const values = batch
            .map(
              (r, i) => `(
              '${r.fieldNoticeId.replace(/'/g, "''")}',
              ${r.firstPublished ? `'${r.firstPublished.toISOString()}'` : "NULL"},
              '${r.fnTitle.replace(/'/g, "''")}',
              '${r.fnType.replace(/'/g, "''")}',
              ${r.totVuln},
              ${r.cvul},
              ${r.potVuln},
              ${r.cpVuln},
              ${r.notVuln},
              ${r.cNotVuln},
              '${r.dateImported.replace(/'/g, "''")}',
              '${r.cpyKey.replace(/'/g, "''")}',
              '${r.customerName.replace(/'/g, "''")}'
            )`
            )
            .join(",");

          const query = `
            INSERT INTO field_notice_records (
              field_notice_id, first_published, fn_title, fn_type,
              tot_vuln, cvul, pot_vuln, cp_vuln, not_vuln, c_not_vuln,
              date_imported, cpy_key, customer_name
            ) VALUES ${values}
            ON CONFLICT (unique_fn_cpy_customer) DO NOTHING
          `;

          const result = await db.execute(sql.raw(query));
          importCount += batch.length;
        } catch (err) {
          console.error("Batch insert error:", err);
        }

        batch.length = 0;
      }
    } catch (error) {
      console.warn("Error processing line", lineCount, error);
    }
  }

  // Insert remaining batch
  if (batch.length > 0) {
    try {
      const values = batch
        .map(
          (r) => `(
          '${r.fieldNoticeId.replace(/'/g, "''")}',
          ${r.firstPublished ? `'${r.firstPublished.toISOString()}'` : "NULL"},
          '${r.fnTitle.replace(/'/g, "''")}',
          '${r.fnType.replace(/'/g, "''")}',
          ${r.totVuln},
          ${r.cvul},
          ${r.potVuln},
          ${r.cpVuln},
          ${r.notVuln},
          ${r.cNotVuln},
          '${r.dateImported.replace(/'/g, "''")}',
          '${r.cpyKey.replace(/'/g, "''")}',
          '${r.customerName.replace(/'/g, "''")}'
        )`
        )
        .join(",");

      const query = `
        INSERT INTO field_notice_records (
          field_notice_id, first_published, fn_title, fn_type,
          tot_vuln, cvul, pot_vuln, cp_vuln, not_vuln, c_not_vuln,
          date_imported, cpy_key, customer_name
        ) VALUES ${values}
        ON CONFLICT (unique_fn_cpy_customer) DO NOTHING
      `;

      const result = await db.execute(sql.raw(query));
      importCount += batch.length;
    } catch (err) {
      console.error("Final batch error:", err);
    }
  }

  console.log("\n=== Import Complete ===");
  console.log(`Total lines processed: ${lineCount}`);
  console.log(`Records imported: ${importCount}`);
  console.log("========================\n");

  process.exit(0);
}

importCSV().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
