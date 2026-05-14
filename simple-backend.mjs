// Simple Backend Server for Cisco SRE Dashboard
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;
const CSV_PATH = path.join(__dirname, 'data', 'fn_aug25-feb26.csv');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

let csvLastModified = null;
let csvRecords = null;

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
    const lines = content.split('\n').filter(line => line.trim());
    const headers = parseCSVLine(lines[0]).map(h => h.trim());
    console.log('[CSV] Headers:', headers.join(', '));
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
    csvRecords = records;
    console.log('[CSV] Loaded', records.length, 'records');
    return records;
  } catch (error) {
    console.error('[CSV] Error loading data:', error.message);
    return [];
  }
}

function filterRecords(records, query) {
  return records.filter(record => {
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

function calculateMetrics(records) {
  const total = records.length;
  const vulnerable = records.reduce((sum, r) => sum + (parseInt(r.TOT_VULN) || 0), 0);
  const potential = records.reduce((sum, r) => sum + (parseInt(r.POT_VULN) || 0), 0);
  const notVulnerable = records.reduce((sum, r) => sum + (parseInt(r.NOT_VULN) || 0), 0);
  
  const metrics = {
    totalAssessed: total,
    vulnerable: vulnerable,
    potentiallyVulnerable: potential,
    notVulnerable: notVulnerable,
    recordCount: total,
    lastUpdated: new Date().toISOString()
  };
  return metrics;
}

function getFilterOptions(records) {
  const customers = [...new Set(records.map(r => r.customer_name))].filter(Boolean).sort();
  const fieldNotices = [...new Set(records.map(r => r.FIELD_NOTICE))].filter(Boolean).sort();
  const fnTypes = [...new Set(records.map(r => r.FN_TYPE))].filter(Boolean).sort();
  const months = [...new Set(records.map(r => r.DATE_IMPORTED ? r.DATE_IMPORTED.substring(0, 7) : ''))].filter(Boolean).sort();
  
  return {
    customers: customers,
    fieldNotices: fieldNotices,
    fnTypes: fnTypes,
    months: months
  };
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }
  
  const parsedUrl = new URL(req.url, 'http://' + req.headers.host);
  const pathname = parsedUrl.pathname;
  const query = Object.fromEntries(parsedUrl.searchParams);
  
  Object.keys(corsHeaders).forEach(key => {
    res.setHeader(key, corsHeaders[key]);
  });
  
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const records = loadCSVData();
    
    if (pathname === '/api/status') {
      const status = {
        status: 'online',
        timestamp: new Date().toISOString(),
        csv: {
          loaded: true,
          recordCount: records.length,
          lastModified: csvLastModified
        }
      };
      res.writeHead(200);
      res.end(JSON.stringify(status));
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
      
      const response = { data: notices, count: notices.length };
      res.writeHead(200);
      res.end(JSON.stringify(response));
      return;
    }
    
    if (pathname === '/api/reports/top-customers') {
      const filtered = filterRecords(records, query);
      const customerMap = {};
      
      filtered.forEach(record => {
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
        customerMap[cust].totVuln += parseInt(record.TOT_VULN) || 0;
        customerMap[cust].potVuln += parseInt(record.POT_VULN) || 0;
        customerMap[cust].notVuln += parseInt(record.NOT_VULN) || 0;
      });
      
      const customers = Object.values(customerMap)
        .sort((a, b) => b.totVuln - a.totVuln)
        .slice(0, parseInt(query.limit) || 10);
      
      const response = { data: customers, count: customers.length };
      res.writeHead(200);
      res.end(JSON.stringify(response));
      return;
    }
    
    if (pathname === '/api/trends/monthly' || pathname === '/api/trends/monthly/filtered') {
      const filtered = filterRecords(records, query);
      const monthMap = {};
      
      filtered.forEach(record => {
        const month = record.DATE_IMPORTED ? record.DATE_IMPORTED.substring(0, 7) : '';
        if (!month) return;
        
        if (!monthMap[month]) {
          monthMap[month] = {
            month: month,
            vulnerable: 0,
            potentiallyVulnerable: 0,
            notVulnerable: 0,
            total: 0
          };
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
    
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found', path: pathname }));
    
  } catch (error) {
    console.error('[API Error]', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('[SERVER] Cisco SRE Dashboard API running on http://localhost:' + PORT);
  console.log('[SERVER] CSV data:', CSV_PATH);
  console.log('[SERVER] Endpoints available:');
  console.log('  - /api/status');
  console.log('  - /api/metrics/filtered');
  console.log('  - /api/reports/top-field-notices');
  console.log('  - /api/reports/top-customers');
  console.log('  - /api/trends/monthly');
  console.log('  - /api/filter-options');
});
