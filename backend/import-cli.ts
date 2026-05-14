import { db } from "./db";
import { fieldNoticeRecords } from "../shared/schema";
import * as fs from "fs";

async function clearAndImport() {
  console.log("🔥 CLEARING OLD DATA AND IMPORTING CLEANED RECORDS\n");

  try {
    // Step 1: Clear all old records
    console.log("Step 1: Clearing database...");
    const deleted = await db.delete(fieldNoticeRecords);
    console.log("✅ Old records deleted\n");

    // Step 2: Read and parse CSV
    console.log("Step 2: Parsing cleaned CSV...");
    const csvPath = "/home/runner/workspace/attached_assets/processed_cleaned.csv";
    const fileContent = fs.readFileSync(csvPath, "utf-8");
    const lines = fileContent.split("\n").filter(l => l.trim());

    const records: any[] = [];
    let headerMap = {} as any;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Parse CSV properly
      const fields: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          if (inQuotes && line[j + 1] === '"') {
            current += '"';
            j++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          fields.push(current);
          current = "";
        } else {
          current += char;
        }
      }
      fields.push(current);

      if (i === 0) {
        // Header row
        headerMap = {
          fn: fields.indexOf("Field Notice ID"),
          customer: fields.indexOf("Customer Name"),
          cpyKey: fields.indexOf("CPY Key"),
          totVuln: fields.indexOf("Vulnerable"),
          potVuln: fields.indexOf("Potentially Vulnerable"),
          notVuln: fields.indexOf("Not Vulnerable"),
          type: fields.indexOf("Type"),
          title: fields.indexOf("Title"),
        };
        continue;
      }

      const record = {
        fieldNoticeId: fields[headerMap.fn]?.replace(/^"|"$/g, "") || "",
        customerName: fields[headerMap.customer]?.replace(/^"|"$/g, "") || "",
        cpyKey: fields[headerMap.cpyKey]?.replace(/^"|"$/g, "") || "",
        totVuln: parseInt(fields[headerMap.totVuln]?.replace(/^"|"$/g, "") || "0") || 0,
        potVuln: parseInt(fields[headerMap.potVuln]?.replace(/^"|"$/g, "") || "0") || 0,
        notVuln: parseInt(fields[headerMap.notVuln]?.replace(/^"|"$/g, "") || "0") || 0,
        fnType: fields[headerMap.type]?.replace(/^"|"$/g, "") || "",
        fnTitle: fields[headerMap.title]?.replace(/^"|"$/g, "") || "",
        firstPublished: new Date(),
        createdAt: new Date(),
      };

      records.push(record);
    }

    console.log(`✅ Parsed ${records.length} records\n`);

    // Step 3: Batch insert
    console.log("Step 3: Importing records...");
    const batchSize = 2000;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await db.insert(fieldNoticeRecords).values(batch);
      console.log(`   ✅ Inserted ${Math.min(i + batchSize, records.length)}/${records.length}`);
    }

    // Step 4: Verify
    console.log("\nStep 4: Verifying...");
    const allRecords = await db.select().from(fieldNoticeRecords);
    const customers = new Set(allRecords.map(r => r.customerName));
    const fieldNotices = new Set(allRecords.map(r => r.fieldNoticeId));
    const fnTypes = new Set(allRecords.map(r => r.fnType));

    console.log(`\n✅ FINAL METRICS:`);
    console.log(`   Total Records: ${allRecords.length}`);
    console.log(`   Unique Customers: ${customers.size}`);
    console.log(`   Unique Field Notices: ${fieldNotices.size}`);
    console.log(`   FN Types: ${Array.from(fnTypes).join(", ")}`);
    console.log(`   Unique FN Types: ${fnTypes.size}`);

    if (customers.size === 873 && fieldNotices.size === 483 && fnTypes.size === 2) {
      console.log("\n🎉 SUCCESS! Data integrity verified - 873 customers, 483 field notices, only Hardware/Software!");
    }

    process.exit(0);
  } catch (error) {
    console.error("ERROR:", error);
    process.exit(1);
  }
}

clearAndImport();
