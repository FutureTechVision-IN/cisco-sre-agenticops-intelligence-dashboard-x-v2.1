const fs = require('fs');
const csvPath = 'attached_assets/filtered_bcs_apr25-sep25_2025_apr-sep_1763979225097.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());

const fieldNoticeData = new Map();

// Process first 5000 lines to avoid memory issues
for (let i = 1; i < Math.min(lines.length, 5000); i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  
  const parts = line.split(',');
  if (parts.length < 13) continue;
  
  const recordFieldNotice = parts[0]?.trim();
  const recordTotVuln = parseInt(parts[4]) || 0;
  const recordTitle = parts[2]?.trim() || '';
  const recordFnType = parts[3]?.trim() || '';
  
  if (!fieldNoticeData.has(recordFieldNotice)) {
    fieldNoticeData.set(recordFieldNotice, {
      fieldNoticeId: recordFieldNotice,
      fnTitle: recordTitle,
      fnType: recordFnType,
      totVuln: 0
    });
  }
  
  const fnData = fieldNoticeData.get(recordFieldNotice);
  fnData.totVuln += recordTotVuln;
  if (!fnData.fnTitle && recordTitle) {
    fnData.fnTitle = recordTitle;
  }
  if (!fnData.fnType && recordFnType) {
    fnData.fnType = recordFnType;
  }
}

const result = Array.from(fieldNoticeData.values())
  .sort((a, b) => b.totVuln - a.totVuln)
  .slice(0, 10);

console.log('Top 10 Field Notices by Vulnerability Count (from CSV sample):');
result.forEach((fn, i) => {
  console.log(`${i+1}. ${fn.fieldNoticeId}: ${fn.totVuln} vulnerabilities - ${fn.fnType}`);
});