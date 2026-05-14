// Unified Server - Serves Frontend + All API Endpoints
// This eliminates CORS and 404 issues by having everything on port 8000

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;
const FRONTEND_PATH = path.join(__dirname, 'dist');
const CSV_PATH = path.join(__dirname, 'data', 'fn_aug25-feb26.csv');

// Cache for CSV data
let csvLastModified = null;
let csvRecords = null;

// MIME types for serving static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.jsx': 'application/javascript',
  '.ts': 'application/javascript',
  '.tsx': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'font/eot'
};

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

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

// Load and parse CSV with caching
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
    if (query.customer && query.customer !== 'All Customers') {
      const customerName = (record.customer_name || '').toLowerCase();
      const searchTerm = query.customer.toLowerCase();
      if (!customerName.includes(searchTerm)) return false;
    }
    if (query.fieldNotice && query.fieldNotice !== 'All Field Notices') {
      if (record.FIELD_NOTICE !== query.fieldNotice) return false;
    }
    if (query.fnType && query.fnType !== 'All Types') {
      if (record.FN_TYPE !== query.fnType) return false;
    }
    if (query.month && query.month !== 'All Months') {
      const recordMonth = record.DATE_IMPORTED ? record.DATE_IMPORTED.substring(0, 7) : '';
      if (recordMonth !== query.month) return false;
    }
    if (query.onlyVulnerable === 'true') {
      const totalVuln = parseInt(record.TOT_VULN) || 0;
      if (totalVuln === 0) return false;
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
    totalAssessed: vulnerable + potential + notVulnerable,
    vulnerable: vulnerable,
    potentiallyVulnerable: potential,
    notVulnerable: notVulnerable,
    recordCount: total,
    lastUpdated: new Date().toISOString()
  };
}

// Static file server
function serveStaticFile(req, res) {
  let filePath = path.join(FRONTEND_PATH, req.url === '/' ? 'index.html' : req.url);
  
  // Security: prevent directory traversal
  if (!filePath.startsWith(FRONTEND_PATH)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  } catch (e) {
    // If file not found, try index.html (for SPA routing)
    if (e.code === 'ENOENT' && req.url !== '/index.html') {
      try {
        const indexContent = fs.readFileSync(path.join(FRONTEND_PATH, 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexContent);
      } catch (e2) {
        res.writeHead(404);
        res.end('Not Found');
      }
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  }
}

const server = http.createServer(function(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;
  
  // Log all incoming requests
  console.log(`[REQUEST] ${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    Object.keys(corsHeaders).forEach(function(key) {
      res.setHeader(key, corsHeaders[key]);
    });
    res.writeHead(200);
    res.end();
    return;
  }
  
  // API endpoints
  if (pathname.startsWith('/api/')) {
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
      
      // Data health endpoint (for useDataSync hook)
      if (pathname === '/api/data/health') {
        res.writeHead(200);
        res.end(JSON.stringify({
          status: 'healthy',
          loaded: true,
          recordCount: records.length,
          customerCount: Array.from(new Set(records.map(function(r) { return r.customer_name; }))).length,
          fieldNoticeCount: Array.from(new Set(records.map(function(r) { return r.FIELD_NOTICE; }))).length,
          monthCount: Array.from(new Set(records.map(function(r) { return r.DATE_IMPORTED ? r.DATE_IMPORTED.substring(0, 7) : ''; }))).filter(Boolean).length,
          dataRange: 'August 2025 - February 2026',
          coveragePercent: 100,
          lastLoaded: new Date().toISOString(),
          validationErrors: []
        }));
        return;
      }
      
      // Data refresh endpoint (for useDataSync hook)
      if (pathname === '/api/data/refresh') {
        // Reload CSV data
        csvRecords = null;
        csvLastModified = null;
        const reloaded = loadCSVData();
        res.writeHead(200);
        res.end(JSON.stringify({
          message: 'Data refreshed successfully',
          recordCount: reloaded.length,
          timestamp: new Date().toISOString()
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
      if (pathname === '/api/filter-options' || pathname === '/api/search/options') {
        const customers = Array.from(new Set(records.map(function(r) { return r.customer_name; }))).filter(Boolean).sort();
        const fieldNotices = Array.from(new Set(records.map(function(r) { return r.FIELD_NOTICE; }))).filter(Boolean).sort();
        const fnTypes = Array.from(new Set(records.map(function(r) { return r.FN_TYPE; }))).filter(Boolean).sort();
        const months = Array.from(new Set(records.map(function(r) { return r.DATE_IMPORTED ? r.DATE_IMPORTED.substring(0, 7) : ''; }))).filter(Boolean).sort();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          customers: customers,
          fieldNotices: fieldNotices,
          fnTypes: fnTypes,
          months: months
        }));
        return;
      }
      
      // Search endpoint with filtering and pagination
      if (pathname === '/api/search') {
        const filtered = filterRecords(records, query);
        
        const page = parseInt(query.page) || 1;
        const pageSize = parseInt(query.pageSize) || 25;
        const sortField = query.sortField || 'lastSeen';
        const sortOrder = query.sortOrder || 'desc';
        
        // Sort results
        const sorted = filtered.sort(function(a, b) {
          let valA, valB;
          
          if (sortField === 'customer') {
            valA = a.customer_name || '';
            valB = b.customer_name || '';
            return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
          
          if (sortField === 'fieldNotice') {
            valA = a.FIELD_NOTICE || '';
            valB = b.FIELD_NOTICE || '';
            return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
          
          if (sortField === 'lastSeen') {
            valA = a.DATE_IMPORTED || '';
            valB = b.DATE_IMPORTED || '';
            // Parse dates like "2025-08-15"
            const dateA = valA ? new Date(valA) : new Date(0);
            const dateB = valB ? new Date(valB) : new Date(0);
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
          }
          
          return 0;
        });
        
        // Paginate
        const start = (page - 1) * pageSize;
        const paginated = sorted.slice(start, start + pageSize);
        
        console.log(`[API-SEARCH] Query: customer=${query.customer}, fieldNotice=${query.fieldNotice}, fnType=${query.fnType}, month=${query.month}`);
        console.log(`[API-SEARCH] Results: ${filtered.length} total, returning ${paginated.length} for page ${page}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          results: paginated,
          totalCount: filtered.length
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
      
      // Intelligence live feed endpoint
      if (pathname === '/api/intelligence/live-feed') {
        res.writeHead(200);
        res.end(JSON.stringify({
          feed: [
            { id: 1, message: 'System operational - All data loaded from CSV', timestamp: new Date().toISOString(), type: 'info' },
            { id: 2, message: records.length + ' records available for analysis', timestamp: new Date().toISOString(), type: 'data' }
          ],
          status: 'active',
          lastUpdate: new Date().toISOString()
        }));
        return;
      }
      
      // Chatbot session endpoint (mock)
      if (pathname.startsWith('/api/chatbot/session/')) {
        res.writeHead(200);
        res.end(JSON.stringify({
          sessionId: pathname.split('/').pop(),
          messages: [],
          created: new Date().toISOString()
        }));
        return;
      }
      
      // Chatbot message endpoint (mock)
      if (pathname === '/api/chatbot/message') {
        let body = '';
        req.on('data', function(chunk) { body += chunk; });
        req.on('end', function() {
          const data = JSON.parse(body || '{}');
          res.writeHead(200);
          res.end(JSON.stringify({
            id: Date.now(),
            response: 'Thank you for your message. The dashboard is now running in online mode with live data from CSV.',
            timestamp: new Date().toISOString()
          }));
        });
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
    return;
  }
  
  // Serve static files for non-API requests
  serveStaticFile(req, res);
});

server.listen(PORT, '0.0.0.0', function() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     Cisco SRE AgenticOps Intelligence Dashboard               ║');
  console.log('║     UNIFIED SERVER - All-in-One Solution                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('[SERVER] Running on http://localhost:' + PORT);
  console.log('[SERVER] Frontend served from:', FRONTEND_PATH);
  console.log('[SERVER] CSV data:', CSV_PATH);
  console.log('');
  console.log('[SERVER] Available API endpoints:');
  console.log('  ✓ /api/status');
  console.log('  ✓ /api/metrics/filtered');
  console.log('  ✓ /api/records (CRITICAL for dropdowns)');
  console.log('  ✓ /api/filter-options');
  console.log('  ✓ /api/reports/top-field-notices');
  console.log('  ✓ /api/reports/top-customers');
  console.log('  ✓ /api/trends/monthly');
  console.log('  ✓ /api/intelligence/live-feed');
  console.log('  ✓ /api/chatbot/* (mock)');
  console.log('');
  console.log('[SERVER] Frontend will be available at: http://localhost:' + PORT);
  console.log('[SERVER] Opening dashboard...');
  console.log('');
  
  // Pre-load CSV data
  loadCSVData();
});
