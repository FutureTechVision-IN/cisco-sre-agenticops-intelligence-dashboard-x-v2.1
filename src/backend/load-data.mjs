import fs from 'fs';
import readline from 'readline';

const CSV_FILE = 'attached_assets/filtered_bcs_apr25-sep25_2025_apr-sep_1763720499192.csv';
const API_URL = 'http://localhost:5000/api/field-notices/import';
const BATCH_SIZE = 1000;

async function importCSV() {
  const fileStream = fs.createReadStream(CSV_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  let batch = [];
  let totalImported = 0;

  console.log('Starting CSV import via API...');

  for await (const line of rl) {
    lineCount++;
    if (lineCount % 100000 === 0) {
      console.log(`Processed ${lineCount} lines...`);
    }

    if (lineCount === 1) continue; // Skip header

    try {
      const parts = line.split(',');
      if (parts.length < 13) continue;

      batch.push({
        fieldNoticeId: (parts[0] || '').trim(),
        firstPublished: (parts[1] || '').trim() === '0000-00-00 00:00:00' ? null : (parts[1] || '').trim(),
        fnTitle: (parts[2] || '').trim(),
        fnType: (parts[3] || '').trim(),
        totVuln: parseInt(parts[4]) || 0,
        cvul: parseFloat(parts[5]) || 0,
        potVuln: parseInt(parts[6]) || 0,
        cpVuln: parseFloat(parts[7]) || 0,
        notVuln: parseInt(parts[8]) || 0,
        cNotVuln: parseFloat(parts[9]) || 0,
        dateImported: (parts[10] || '').trim(),
        cpyKey: (parts[11] || '').trim(),
        customerName: (parts[12] || '').trim() || 'UNKNOWN',
      });

      if (batch.length >= BATCH_SIZE) {
        try {
          const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ records: batch }),
          });

          const result = await response.json();
          totalImported += result.imported || 0;
          console.log(`Batch ${Math.floor(lineCount / BATCH_SIZE)}: imported=${result.imported}, duplicates=${result.duplicates}, errors=${result.errors}`);
        } catch (err) {
          console.error('API call failed:', err.message);
        }

        batch = [];
      }
    } catch (err) {
      console.error(`Error at line ${lineCount}:`, err.message);
    }
  }

  // Final batch
  if (batch.length > 0) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: batch }),
      });

      const result = await response.json();
      totalImported += result.imported || 0;
      console.log(`Final batch: imported=${result.imported}, duplicates=${result.duplicates}, errors=${result.errors}`);
    } catch (err) {
      console.error('Final API call failed:', err.message);
    }
  }

  console.log(`\n✓ Import complete! Total imported: ${totalImported} records`);
  process.exit(0);
}

importCSV().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
