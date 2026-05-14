// Complete Backend Server for Cisco SRE Dashboard - FIXED for Dropdown Population
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;
const CSV_PATH = path.join(__dirname, 'data', 'fn_aug25-feb26.csv');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

let csvLastModified = null;
let csvRecords = null;

// Parse CSV line (handle quoted fields)
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
  try {
    if (csvRecords && csvLastModified) {
      const stats = fs.statSync(CSV_PATH);
      if (stats.mtimeMs === csvLastModified) {
        return csvRecords;
      }
    }
    console.log('[CSV] Loading data from', CSV_PATH);
    const content = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = content.split('\n').filter(function(line) { return line.trim(); });
    const headers = parseCSVLine(lines[0]).map(function(h) { return h.trim(); });
    console.log('[CSV] Headers:', headers.join(', '));
    
    const records = lines.slice(1).map(function(line) {
      const values = parseCSVLine(line);
      const record = {};
      headers.forEach(function(header, index) {
        record[header] = values[index] || '';
      });
      return record;
    });
    
    const stats = fs.statSync(CSV_PATH);
    csvLastModified = stats.mtimeMs;
    csvRecords = records;
    console.log('[CSV] Loaded', records.length, 'records');
    return records;
  } catch (error) {
    console.error('[CSV] Error loading data:', error.message);
    return [];
  }
}

// Transform CSV record to frontend format
function transformRecord(csvRecord) {
  return {
    customer: csvRecord.customer_name || '',
    fieldNotice: csvRecord.FIELD_NOTICE || '',
    fnType: csvRecord.FN_TYPE || '',
    month: csvRecord.DATE_IMPORTED ? csvRecord.DATE_IMPORTED.substring(0, 7) : '',
    totVuln: parseInt(csvRecord.TOT_VULN) || 0,
    potVuln: parseInt(csvRecord.POT_VULN) || 0,
    notVuln: parseInt(csvRecord.NOT_VULN) || 0,
    fnTitle: csvRecord.FN_TITLE || '',
    firstPublished: csvRecord.FIRST_PUBLISHED || ''
  };
}

// Filter records based on query parameters
function filterRecords(records, query) {
  return records.filter(function(record) {
    if (query.customer && record.customer_name !== query.customer) return false;
    if (query.fieldNotice && record.FIELD_NOTICE !== query.fieldNotice) return false;
    if (query.fnType && record.FN_TYPE !== query.fnType) return false;
    if (query.month) {
      const recordMonth = record.DATE_IMPORTED ? record.DATE_IMPORTED.substring(0, 7) : '';
      if (recordMonth !== query.month) return false;
    }
    return true;
  });
}

// Calculate metrics from records
function calculateMetrics(records) {
  const total = records.length;
  const vulnerable = records.reduce(function(sum, r) { return sum + (parseInt(r.TOT_VULN) || 0); }, 0);
  const potential = records.reduce(function(sum, r) { return sum + (parseInt(r.POT_VULN) || 0); }, 0);
  const notVulnerable = records.reduce(function(sum, r) { return sum + (parseInt(r.NOT_VULN) || 0); }, 0);
  
  return {
    totalAssessed: total,
    vulnerable: vulnerable,
    potentiallyVulnerable: potential,
    notVulnerable: notVulnerable,
    recordCount: total,
    lastUpdated: new Date().toISOString()
  };
}

const server = http.createServer(function(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }
  
  const parsedUrl = new URL(req.url, 'http://' + req.headers.host);
  const pathname = parsedUrl.pathname;
  const query = Object.fromEntries(parsedUrl.searchParams);
  
  Object.keys(corsHeaders).forEach(function(key) {
    res.setHeader(key, corsHeaders[key]);
  });
  
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const records = loadCSVData();
    
    // Status endpoint
    if (pathname === '/api/status') {
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'online',
        timestamp: new Date().toISOString(),
        csv: { loaded: true, recordCount: records.length, lastModified: csvLastModified }
      }));
      return;
    }
    
    // Metrics filtered endpoint
    if (pathname === '/api/metrics/filtered') {
      const filtered = filterRecords(records, query);
      const metrics = calculateMetrics(filtered);
      res.writeHead(200);
      res.end(JSON.stringify(metrics));
      return;
    }
    
    // Records endpoint - CRITICAL for dropdown population
    if (pathname === '/api/records') {
      const pageSize = parseInt(query.pageSize) || 10000;
      const filtered = filterRecords(records, query);
      const pagedRecords = filtered.slice(0, pageSize).map(transformRecord);
      
      res.writeHead(200);
      res.end(JSON.stringify({
        records: pagedRecords,
        total: filtered.length,
        page: 1,
        pageSize: pageSize
      }));
      return;
    }
    
    // Filter options endpoint
    if (pathname === '/api/filter-options') {
      const customers = Array.from(new Set(records.map(function(r) { return r.customer_name; }))).filter(Boolean).sort();
      const fieldNotices = Array.from(new Set(records.map(function(r) { return r.FIELD_NOTICE; }))).filter(Boolean).sort();
      const fnTypes = Array.from(new Set(records.map(function(r) { return r.FN_TYPE; }))).filter(Boolean).sort();
      const months = Array.from(new Set(records.map(function(r) { return r.DATE_IMPORTED ? r.DATE_IMPORTED.substring(0, 7) : ''; }))).filter(Boolean).sort();
      
      res.writeHead(200);
      res.end(JSON.stringify({
        customers: customers,
        fieldNotices: fieldNotices,
        fnTypes: fnTypes,
        months: months
      }));
      return;
    }
    
    // Top field notices endpoint
    if (pathname === '/api/reports/top-field-notices') {
      const filtered = filterRecords(records, query);
      const noticeMap = {};
      
      filtered.forEach(function(record) {
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
        noticeMap[fn].totVuln += (parseInt(record.TOT_VULN) || 0);
        noticeMap[fn].potVuln += (parseInt(record.POT_VULN) || 0);
        noticeMap[fn].notVuln += (parseInt(record.NOT_VULN) || 0);
      });
      
      const notices = Object.values(noticeMap)
        .sort(function(a, b) { return b.totVuln - a.totVuln; })
        .slice(0, parseInt(query.limit) || 10);
      
      res.writeHead(200);
      res.end(JSON.stringify({ data: notices, count: notices.length }));
      return;
    }
    
    // Top customers endpoint
    if (pathname === '/api/reports/top-customers') {
      const filtered = filterRecords(records, query);
      const customerMap = {};
      
      filtered.forEach(function(record) {
        const cust = record.customer_name;
        if (!cust) return;
        
        if (!customerMap[cust]) {
          customerMap[cust] = {
            customerName: cust,
            totVuln: 0,
            potVuln: 0,
            notVuln: 0
          };
        }
        customerMap[cust].totVuln += (parseInt(record.TOT_VULN) || 0);
        customerMap[cust].potVuln += (parseInt(record.POT_VULN) || 0);
        customerMap[cust].notVuln += (parseInt(record.NOT_VULN) || 0);
      });
      
      const customers = Object.values(customerMap)
        .sort(function(a, b) { return b.totVuln - a.totVuln; })
        .slice(0, parseInt(query.limit) || 10);
      
      res.writeHead(200);
      res.end(JSON.stringify({ data: customers, count: customers.length }));
      return;
    }
    
    // Trends endpoint
    if (pathname === '/api/trends/monthly' || pathname === '/api/trends/monthly/filtered') {
      const filtered = filterRecords(records, query);
      const monthMap = {};
      
      filtered.forEach(function(record) {
        const month = record.DATE_IMPORTED ? record.DATE_IMPORTED.substring(0, 7) : '';
        if (!month) return;
        
        if (!monthMap[month]) {
          monthMap[month] = { month: month, vulnerable: 0, potentiallyVulnerable: 0, notVulnerable: 0, total: 0 };
        }
        
        monthMap[month].vulnerable += (parseInt(record.TOT_VULN) || 0);
        monthMap[month].potentiallyVulnerable += (parseInt(record.POT_VULN) || 0);
        monthMap[month].notVulnerable += (parseInt(record.NOT_VULN) || 0);
        monthMap[month].total += 1;
      });
      
      const trends = Object.values(monthMap).sort(function(a, b) { return a.month.localeCompare(b.month); });
      
      res.writeHead(200);
      res.end(JSON.stringify(trends));
      return;
    }
    
    // Intelligence live feed endpoint - return mock data for now
    if (pathname === '/api/intelligence/live-feed') {
      res.writeHead(200);
      res.end(JSON.stringify({
        feed: [
          { id: 1, message: 'System operational', timestamp: new Date().toISOString() }
        ]
      }));
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

server.listen(PORT, '0.0.0.0', function() {
  console.log('[SERVER] Cisco SRE Dashboard API running on http://localhost:' + PORT);
  console.log('[SERVER] CSV data:', CSV_PATH);
  console.log('[SERVER] Endpoints available:');
  console.log('  - /api/status');
  console.log('  - /api/metrics/filtered');
  console.log('  - /api/records (CRITICAL for dropdowns)');
  console.log('  - /api/filter-options');
  console.log('  - /api/reports/top-field-notices');
  console.log('  - /api/reports/top-customers');
  console.log('  - /api/trends/monthly');
  console.log('  - /api/intelligence/live-feed');
});
