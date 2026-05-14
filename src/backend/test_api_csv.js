const fs = require('fs');
const path = require('path');

async function testCSVFallback() {
    try {
        console.log('Testing CSV parsing logic...');
        
        const csvPath = path.join(process.cwd(), 'attached_assets', 'filtered_bcs_apr25-sep25_2025_apr-sep_1763979225097.csv');
        console.log('CSV Path:', csvPath);
        
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        console.log('CSV Content length:', csvContent.length);
        
        // Test the parsing logic
        const lines = csvContent.split('\n').filter(line => line.trim());
        console.log('Total lines after parsing:', lines.length);
        console.log('First few lines:');
        console.log(lines.slice(0, 3).map((line, i) => `${i}: ${line.substring(0, 100)}...`));
        
        const fieldNoticeData = new Map();
        
        // Skip header line (index 0)
        for (let i = 1; i < Math.min(lines.length, 10); i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            
            const parts = line.split(',');
            if (parts.length < 13) continue;
            
            const recordFieldNotice = parts[0]?.trim();
            const recordDate = parts[1]?.trim();
            const recordTitle = parts[2]?.trim();
            const recordFnType = parts[3]?.trim();
            const recordTotVuln = parseInt(parts[4]) || 0;
            
            console.log(`Line ${i}: FN=${recordFieldNotice}, VulnCount=${recordTotVuln}, Title=${recordTitle?.substring(0, 50)}`);
            
            if (recordTotVuln > 0) {
                if (!fieldNoticeData.has(recordFieldNotice)) {
                    fieldNoticeData.set(recordFieldNotice, {
                        fieldNoticeId: recordFieldNotice,
                        fnTitle: recordTitle || `${recordFieldNotice} - Field Notice`,
                        fnType: recordFnType,
                        totVuln: 0
                    });
                }
                
                const fnData = fieldNoticeData.get(recordFieldNotice);
                fnData.totVuln += recordTotVuln;
            }
        }
        
        console.log('\nField notices with vulnerabilities found:', fieldNoticeData.size);
        for (const [fn, data] of fieldNoticeData.entries()) {
            console.log(`${fn}: ${data.totVuln} vulnerabilities`);
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

testCSVFallback();
