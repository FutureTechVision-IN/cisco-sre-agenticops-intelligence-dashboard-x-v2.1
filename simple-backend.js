// Simple Backend Server for Cisco SRE Dashboard
// This is a JavaScript workaround since tsx is not available
// Serves API endpoints needed for online mode

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Configuration
const PORT = process.env.PORT || 5000;
const CSV_PATH = path.join(__dirname, 'data', 'fn_aug25-feb26.csv');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Cache for CSV data
let csvCache = null;
let csvLastModified = null;

// Parse CSV line
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Load and parse CSV
function loadCSVData() {
  if (csvCache && csvLastModified) {
    const stats = fs.statSync(CSV_PATH);
    if (stats.mtimeMs === csvLastModified) {
      return csvCache;
    }
  }
  
  console.log('[CSV] Loading data from', CSV_PATH);
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = parseCSVLine(lines[0]);
  
  const records = lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    return record;
  });
  
  const stats = fs.statSync(CSV_PATH);
  csvLastModified = stats.mtimeMs;
  csvCache = records;
  
  console.log(`[CSV] Loaded ${records.length} records`);
  return records;
}

// Filter records based on query parameters
function filterRecords(records, query) {
  return records.filter(record => {
    if (query.customer && record.CUSTOMER_NAME !== query.customer) return false;
    if (query.fieldNotice && record.FIELD_NOTICE !== query.fieldNotice) return false;
    if (query.fnType && record.FN_TYPE !== query.fnType) return false;
    if (query.month) {
      const recordMonth = record.DATE_IMPORTED?.substring(0, 7);
      if (recordMonth !== query.month) return false;
    }
    return true;
  });
}

// Calculate metrics from records
function calculateMetrics(records) {
  const total = records.length;
  const vulnerable = records.reduce((sum, r) => sum + (parseInt(r.TOT_VULN) || 0), 0);
  const potential = records.reduce((sum, r) => sum + (parseInt(r.POT_VULN) || 0), 0);
  const notVulnerable = records.reduce((sum, r) => sum + (parseInt(r.NOT_VULN) || 0), 0);
  
  return {
    totalAssessed: total,
    vulnerable,
    potentiallyVulnerable: potential,
    notVulnerable,
    recordCount: total,
    lastUpdated: new Date().toISOString()
  };
}

// Get unique values for filters
function getFilterOptions(records) {
  const customers = [...new Set(records.map(r => r.CUSTOMER_NAME))].filter(Boolean).sort();
  const fieldNotices = [...new Set(records.map(r => r.FIELD_NOTICE))].filter(Boolean).sort();
  const fnTypes = [...new Set(records.map(r => r.FN_TYPE))].filter(Boolean).sort();
  const months = [...new Set(records.map(r => r.DATE_IMPORTED?.substring(0, 7)))].filter(Boolean).sort();
  
  return { customers, fieldNotices, fnTypes, months };
}

// Create server
const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }
  
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;
  
  // Add CORS headers
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key]);
  });
  
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const records = loadCSVData();
    
    // API endpoints
    if (pathname === '/api/status') {
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'online',
        timestamp: new Date().toISOString(),
        csv: {
          loaded: true,
          recordCount: records.length,
          lastModified: csvLastModified
        }
      }));
      return;
    }
    
    if (pathname === '/api/metrics/filtered') {
      const filtered = filterRecords(records, query);
      const metrics = calculateMetrics(filtered);
      res.writeHead(200);
      res.end(JSON.stringify(metrics));
      return;
    }
    
    if (pathname === '/api/reports/top-field-notices') {
      const filtered = filterRecords(records, query);
      const noticeMap = {};
      
      filtered.forEach(record => {
        const fn = record.FIELD_NOTICE;
        if (!noticeMap[fn]) {
          noticeMap[fn] = {
            fieldNoticeId: fn,
            fnTitle: record.FN_TITLE || fn,
            totVuln: 0,
            potVuln: 0,
            notVuln: 0
          };
        }
        noticeMap[fn].totVuln += parseInt(record.TOT_VULN) || 0;
        noticeMap[fn].potVuln += parseInt(record.POT_VULN) || 0;
        noticeMap[fn].notVuln += parseInt(record.NOT_VULN) || 0;
      });
      
      const notices = Object.values(noticeMap)
        .sort((a, b) => b.totVuln - a.totVuln)
        .slice(0, parseInt(query.limit) || 10);
      
      res.writeHead(200);
      res.end(JSON.stringify({ data: notices, count: notices.length }));
      return;
    }
    
    if (pathname === '/api/reports/top-customers') {
      const filtered = filterRecords(records, query);
      const customerMap = {};
      
      filtered.forEach(record => {
        const cust = record.CUSTOMER_NAME;
        if (!customerMap[cust]) {
          customerMap[cust] = {
            customerName: cust,
            totVuln: 0,
            potVuln: 0,
            notVuln: 0
          };
        }
        customerMap[cust].totVuln += parseInt(record.TOT_VULN) || 0;
        customerMap[cust].potVuln += parseInt(record.POT_VULN) || 0;
        customerMap[cust].notVuln += parseInt(record.NOT_VULN) || 0;
      });
      
      const customers = Object.values(customerMap)
        .sort((a, b) => b.totVuln - a.totVuln)
        .slice(0, parseInt(query.limit) || 10);
      
      res.writeHead(200);
      res.end(JSON.stringify({ data: customers, count: customers.length }));
      return;
    }
    
    if (pathname === '/api/trends/monthly' || pathname === '/api/trends/monthly/filtered') {
      const filtered = filterRecords(records, query);
      const monthMap = {};
      
      filtered.forEach(record => {
        const month = record.DATE_IMPORTED?.substring(0, 7);
        if (!month) return;
        
        if (!monthMap[month]) {
          monthMap[month] = { month, vulnerable: 0, potentiallyVulnerable: 0, notVulnerable: 0, total: 0 };
        }
        
        monthMap[month].vulnerable += parseInt(record.TOT_VULN) || 0;
        monthMap[month].potentiallyVulnerable += parseInt(record.POT_VULN) || 0;
        monthMap[month].notVulnerable += parseInt(record.NOT_VULN) || 0;
        monthMap[month].total += 1;
      });
      
      const trends = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
      
      res.writeHead(200);
      res.end(JSON.stringify(trends));
      return;
    }
    
    if (pathname === '/api/filter-options') {
      const options = getFilterOptions(records);
      res.writeHead(200);
      res.end(JSON.stringify(options));
      return;
    }
    
    // 404 for unknown API routes
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found', path: pathname }));
    
  } catch (error) {
    console.error('[API Error]', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] Cisco SRE Dashboard API running on http://localhost:${PORT}`);
  console.log(`[SERVER] CSV data: ${CSV_PATH}`);
  console.log(`[SERVER] Endpoints available:`);
  console.log(`  - /api/status`);
  console.log(`  - /api/metrics/filtered`);
  console.log(`  - /api/reports/top-field-notices`);
  console.log(`  - /api/reports/top-customers`);
  console.log(`  - /api/trends/monthly`);
  console.log(`  - /api/filter-options`);
});
