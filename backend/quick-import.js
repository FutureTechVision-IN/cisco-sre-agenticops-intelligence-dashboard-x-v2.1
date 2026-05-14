const fs = require('fs');
const readline = require('readline');
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function importCSV() {
  const filePath = 'attached_assets/filtered_bcs_apr25-sep25_2025_apr-sep_1763720499192.csv';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  let importCount = 0;
  const batchSize = 500;
  let batch = [];

  console.log('Starting CSV import...');

  for await (const line of rl) {
    lineCount++;
    if (lineCount % 50000 === 0) {
      console.log(`Processing line ${lineCount}...`);
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

      if (batch.length >= batchSize) {
        const values = batch
          .map((r) => `('${r.fieldNoticeId.replace(/'/g, "''")}', ${r.firstPublished ? `'${r.firstPublished}'` : 'NULL'}, '${r.fnTitle.replace(/'/g, "''")}', '${r.fnType.replace(/'/g, "''")}', ${r.totVuln}, ${r.cvul}, ${r.potVuln}, ${r.cpVuln}, ${r.notVuln}, ${r.cNotVuln}, '${r.dateImported.replace(/'/g, "''")}', '${r.cpyKey.replace(/'/g, "''")}', '${r.customerName.replace(/'/g, "''")}')`
          )
          .join(',');

        const query = `INSERT INTO field_notice_records (field_notice_id, first_published, fn_title, fn_type, tot_vuln, cvul, pot_vuln, cp_vuln, not_vuln, c_not_vuln, date_imported, cpy_key, customer_name) VALUES ${values} ON CONFLICT (unique_fn_cpy_customer) DO NOTHING;`;

        try {
          await sql(query);
          importCount += batch.length;
        } catch (err) {
          console.error('Batch error:', err.message);
        }

        batch = [];
      }
    } catch (err) {
      console.error('Parse error at line', lineCount, ':', err.message);
    }
  }

  if (batch.length > 0) {
    const values = batch
      .map((r) => `('${r.fieldNoticeId.replace(/'/g, "''")}', ${r.firstPublished ? `'${r.firstPublished}'` : 'NULL'}, '${r.fnTitle.replace(/'/g, "''")}', '${r.fnType.replace(/'/g, "''")}', ${r.totVuln}, ${r.cvul}, ${r.potVuln}, ${r.cpVuln}, ${r.notVuln}, ${r.cNotVuln}, '${r.dateImported.replace(/'/g, "''")}', '${r.cpyKey.replace(/'/g, "''")}', '${r.customerName.replace(/'/g, "''")}')`
      )
      .join(',');

    const query = `INSERT INTO field_notice_records (field_notice_id, first_published, fn_title, fn_type, tot_vuln, cvul, pot_vuln, cp_vuln, not_vuln, c_not_vuln, date_imported, cpy_key, customer_name) VALUES ${values} ON CONFLICT (unique_fn_cpy_customer) DO NOTHING;`;

    try {
      await sql(query);
      importCount += batch.length;
    } catch (err) {
      console.error('Final batch error:', err.message);
    }
  }

  console.log(`\nImport complete! Loaded ${importCount} records from ${lineCount} lines`);
  process.exit(0);
}

importCSV().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
