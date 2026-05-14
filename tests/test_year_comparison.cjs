const fs = require('fs');
const path = require('path');

// Test both with and without year filter
async function testBothScenarios() {
    const csvPath = path.join(process.cwd(), 'attached_assets', 'filtered_bcs_apr25-sep25_2025_apr-sep_1763979225097.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // Test 1: All years (no filter)
    console.log('=== TEST 1: ALL YEARS (NO FILTER) ===');
    const allYearsVulns = {};
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const columns = line.split(',');
        if (columns.length < 5) continue;
        
        const fieldNotice = columns[0]?.trim();
        const totVuln = parseInt(columns[4]) || 0;
        
        if (!fieldNotice || isNaN(totVuln)) continue;
        
        if (!allYearsVulns[fieldNotice]) {
            allYearsVulns[fieldNotice] = {
                totalVulns: 0,
                recordCount: 0,
                title: columns[2]?.trim() || 'Unknown'
            };
        }
        
        allYearsVulns[fieldNotice].totalVulns += totVuln;
        allYearsVulns[fieldNotice].recordCount += 1;
    }
    
    const allYearsTop = Object.entries(allYearsVulns)
        .sort((a, b) => b[1].totalVulns - a[1].totalVulns)
        .slice(0, 10);
        
    allYearsTop.forEach((entry, index) => {
        const [fieldNotice, data] = entry;
        console.log(`${index + 1}. ${fieldNotice}: ${data.totalVulns.toLocaleString()} vulnerabilities (${data.recordCount} records)`);
    });
    
    // Test 2: Year 2025 only
    console.log('\n=== TEST 2: YEAR 2025 ONLY ===');
    const year2025Vulns = {};
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const columns = line.split(',');
        if (columns.length < 11) continue;
        
        const fieldNotice = columns[0]?.trim();
        const totVuln = parseInt(columns[4]) || 0;
        const recordDate = columns[1]?.trim();
        const dateImported = columns[10]?.trim();
        
        if (!fieldNotice || isNaN(totVuln)) continue;
        
        // Filter by year 2025
        const recordYear = recordDate ? recordDate.substring(0, 4) : dateImported?.substring(0, 4);
        if (recordYear !== '2025') continue;
        
        if (!year2025Vulns[fieldNotice]) {
            year2025Vulns[fieldNotice] = {
                totalVulns: 0,
                recordCount: 0,
                title: columns[2]?.trim() || 'Unknown'
            };
        }
        
        year2025Vulns[fieldNotice].totalVulns += totVuln;
        year2025Vulns[fieldNotice].recordCount += 1;
    }
    
    const year2025Top = Object.entries(year2025Vulns)
        .sort((a, b) => b[1].totalVulns - a[1].totalVulns)
        .slice(0, 10);
        
    year2025Top.forEach((entry, index) => {
        const [fieldNotice, data] = entry;
        console.log(`${index + 1}. ${fieldNotice}: ${data.totalVulns.toLocaleString()} vulnerabilities (${data.recordCount} records)`);
    });
    
    // Test 3: What dates do we actually have?
    console.log('\n=== TEST 3: SAMPLE DATE ANALYSIS ===');
    const dateStats = {};
    
    for (let i = 1; i < Math.min(lines.length, 1000); i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const columns = line.split(',');
        if (columns.length < 11) continue;
        
        const recordDate = columns[1]?.trim();
        const dateImported = columns[10]?.trim();
        
        const year1 = recordDate ? recordDate.substring(0, 4) : 'N/A';
        const year2 = dateImported ? dateImported.substring(0, 4) : 'N/A';
        
        const key = `FIRST_PUBLISHED: ${year1}, DATE_IMPORTED: ${year2}`;
        dateStats[key] = (dateStats[key] || 0) + 1;
    }
    
    console.log('Date combinations in first 1000 records:');
    Object.entries(dateStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([combo, count]) => {
            console.log(`${combo}: ${count} records`);
        });
}

testBothScenarios();