# SRE AgenticOps Intelligence Dashboard - Technical Operations Manual

**Version:** 1.0.0  
**Last Updated:** November 24, 2025  
**Status:** Production Ready  
**Audience:** Operations, DevOps, System Administrators

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [System Overview](#system-overview)
3. [Startup Procedures](#startup-procedures)
4. [Shutdown Procedures](#shutdown-procedures)
5. [Environment Configuration](#environment-configuration)
6. [Health Check Procedures](#health-check-procedures)
7. [Maintenance Operations](#maintenance-operations)
8. [Troubleshooting](#troubleshooting)
9. [Disaster Recovery](#disaster-recovery)

---

## Quick Reference

### Essential Commands

```bash
# Quick Start
npm run dev                    # Development mode
npm start                      # Production mode

# Database Operations
npm run db:push               # Sync database schema
npm run db:pull               # Pull schema from database
npm run db:generate           # Generate migrations

# Scripts
./deployment-scripts/start.sh  # Production startup
./deployment-scripts/shutdown.sh # Production shutdown

# Health Checks
curl http://localhost:5000/health         # API health
curl https://your-domain.com/health       # Production health
```

---

## System Overview

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React)                      │
│         Port 5000 | HTTPS in Production                 │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/REST
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Backend (Express.js)                       │
│    Port 5000 | Environment: NODE_ENV                    │
└──────────────────────┬──────────────────────────────────┘
                       │ TCP Connection
                       ▼
┌─────────────────────────────────────────────────────────┐
│           PostgreSQL Database                           │
│    Connection: DATABASE_URL                             │
│    Neon or Local Instance                               │
└─────────────────────────────────────────────────────────┘
```

### System Components

| Component | Type | Port | Status Check |
|-----------|------|------|--------------|
| Frontend | React App | 5000 | GET / |
| Backend API | Express.js | 5000 | GET /health |
| Database | PostgreSQL | 5432* | Connection string |
| Worker | Node.js | Internal | Process logs |

*Remote database - no local port listening

---

## Startup Procedures

### Development Environment

**Prerequisites:**
- Node.js v18+
- npm v9+
- PostgreSQL connection (local or remote)
- .env file configured

**Startup Steps:**

```bash
# Step 1: Verify prerequisites
node --version          # Should be v18+
npm --version           # Should be v9+
echo $DATABASE_URL      # Should be set in .env

# Step 2: Install dependencies (first time only)
npm install

# Step 3: Sync database schema
npm run db:push

# Step 4: Start development server
npm run dev
```

**Expected Output:**

```
> npm run dev

vite dev
 VITE v5.0.0  ready in 123 ms

➜  Local:   http://localhost:5000/
➜  press h to show help

[Backend] Listening on port 5000
Database connection: OK
✓ All systems operational
```

**Startup Time:** 10-15 seconds

**Verification Steps:**

```bash
# Test in another terminal
curl http://localhost:5000/               # Should return HTML
curl http://localhost:5000/health         # Should return 200 OK
curl http://localhost:5000/api/kpis       # Should return JSON
```

---

### Production Environment

**Prerequisites:**
- Node.js v18+ (production build)
- npm v9+
- PostgreSQL 12+ (remote recommended: Neon)
- Environment variables set
- SSL/TLS certificates (if using custom domain)

**Startup Method 1: Using Deployment Script**

```bash
# Navigate to project root
cd /path/to/sre-dashboard

# Make script executable (first time)
chmod +x deployment-scripts/start.sh

# Start with automatic logging
./deployment-scripts/start.sh

# Expected output
Starting SRE Dashboard...
Environment: production
Database: neon.tech
Port: 5000
Session Secret: ✓ Configured
Build Status: ✓ Complete
Health Check: ✓ Passed
Starting Express Server: ✓ Ready
```

**Startup Method 2: Manual Commands**

```bash
# Set production environment
export NODE_ENV=production

# Set required variables
export DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
export SESSION_SECRET=your-session-secret

# Build application
npm run build

# Start server
npm start
```

**Expected Output:**

```
> npm start

Server running on port 5000
Database: Connected
Health Check: Passed
Ready to accept requests

Log location: /var/log/sre-dashboard/app.log
PID: 12345
```

**Startup Time:** 30-45 seconds (includes build)

---

### Staging Environment

**Configuration:** Similar to production, but with staging database

```bash
# Set environment
export NODE_ENV=staging
export DATABASE_URL=postgresql://user:pass@staging-host/db
export SENDGRID_API_KEY=staging-key

# Start
npm start
```

**Differences from Production:**

| Aspect | Production | Staging |
|--------|-----------|---------|
| Database | prod-db | staging-db |
| API Keys | Prod keys | Test keys |
| Error Reporting | Full | Detailed |
| Logging | Standard | Verbose |
| Performance Monitoring | Enabled | Enabled |

---

## Shutdown Procedures

### Graceful Shutdown (Recommended)

**Using Deployment Script:**

```bash
./deployment-scripts/shutdown.sh
```

**Expected Output:**

```
Stopping SRE Dashboard...
Waiting for connections to close...
Flushing database...
Closing database connection...
Cleanup complete
Terminated successfully
Exit code: 0
```

**Shutdown Time:** 10-30 seconds (depends on active connections)

**What Happens:**

1. **Signal Capture** - Receives SIGTERM
2. **Connection Drain** - Stops accepting new connections
3. **Active Requests** - Waits for completion (max 30 seconds)
4. **Database** - Gracefully closes connection
5. **Session Store** - Flushes session data
6. **Cleanup** - Removes temporary files
7. **Exit** - Process terminates cleanly

### Manual Shutdown

```bash
# Find process
ps aux | grep "node.*start"
# or
lsof -i :5000

# Graceful shutdown (SIGTERM)
kill -15 <PID>

# Force shutdown (SIGKILL - use only if necessary)
kill -9 <PID>
```

### Emergency Shutdown

```bash
# If normal shutdown fails
pkill -f "npm start"
pkill -f "node.*index.js"

# Verify termination
ps aux | grep node
```

⚠️ **WARNING:** Force shutdown may cause data corruption. Use only as last resort.

---

## Environment Configuration

### Environment Variables

**Development (.env)**

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/sre_dev

# Session
SESSION_SECRET=dev-secret-key-change-in-production

# Environment
NODE_ENV=development
PORT=8001

# Cisco CIRCUIT AI API
CISCO_CIRCUIT_API_KEY=your-cisco-circuit-api-key
CISCO_CIRCUIT_ENDPOINT=https://circuit.cisco.com/api/v1

# Optional: Email Delivery
SENDGRID_API_KEY=your-sendgrid-key
SMTP_HOST=smtp.example.com
SMTP_PORT=587
```

**Production (.env)**

```bash
# Database (REQUIRED)
DATABASE_URL=postgresql://prod_user:STRONG_PASSWORD@neon.tech/prod_db?sslmode=require

# Session (REQUIRED - use strong secret)
SESSION_SECRET=$(openssl rand -base64 32)

# Environment
NODE_ENV=production
PORT=8001
SECURE_COOKIES=true
HTTPS_ONLY=true

# Cisco CIRCUIT AI API
CISCO_CIRCUIT_API_KEY=production-circuit-api-key
CISCO_CIRCUIT_ENDPOINT=https://circuit.cisco.com/api/v1
SENDGRID_API_KEY=production-sendgrid-key

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true
```

### Configuration File Locations

| Environment | Config Location | Database | Logs |
|------------|-----------------|----------|------|
| Development | .env | Local or Neon | console |
| Staging | /etc/sre-dashboard/.env.staging | staging-neon | /var/log/sre-dashboard/staging.log |
| Production | /etc/sre-dashboard/.env.prod | prod-neon | /var/log/sre-dashboard/app.log |

---

## Health Check Procedures

### API Health Endpoint

**Endpoint:** `GET /health`

**Request:**
```bash
curl -v http://localhost:5000/health
```

**Success Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-24T10:30:00Z",
  "uptime": 3600,
  "database": "connected",
  "version": "1.0.0"
}
```

**Error Response (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "timestamp": "2025-11-24T10:30:00Z",
  "database": "disconnected",
  "error": "Cannot connect to database"
}
```

---

### Comprehensive Health Check Script

**Script:** `scripts/health-check.sh`

```bash
#!/bin/bash
set -e

echo "=== SRE Dashboard Health Check ==="
echo ""

# Check 1: Server accessibility
echo "1. Server Accessibility"
if curl -s http://localhost:5000 > /dev/null; then
    echo "   ✅ Server responding"
else
    echo "   ❌ Server not responding"
    exit 1
fi

# Check 2: API health
echo "2. API Health Endpoint"
HEALTH=$(curl -s http://localhost:5000/health | jq -r '.status')
if [ "$HEALTH" = "healthy" ]; then
    echo "   ✅ API healthy"
else
    echo "   ❌ API unhealthy: $HEALTH"
    exit 1
fi

# Check 3: Database connection
echo "3. Database Connection"
DB_STATUS=$(curl -s http://localhost:5000/health | jq -r '.database')
if [ "$DB_STATUS" = "connected" ]; then
    echo "   ✅ Database connected"
else
    echo "   ❌ Database disconnected"
    exit 1
fi

# Check 4: Response time
echo "4. Response Time"
RESPONSE_TIME=$(curl -s -w '%{time_total}' http://localhost:5000/health -o /dev/null)
echo "   ⏱️  ${RESPONSE_TIME}s"

# Check 5: SSL/TLS (production only)
if [ "$NODE_ENV" = "production" ]; then
    echo "5. SSL/TLS Certificate"
    echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | \
        openssl x509 -noout -dates
fi

echo ""
echo "✅ All health checks passed"
```

**Run Health Check:**
```bash
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

---

### Diagnostic Commands

**System Resources:**

```bash
# CPU and Memory
ps aux | grep node
top -p <PID>

# Memory usage
free -h
node -e "console.log(Math.round(require('os').freemem() / 1024 / 1024) + 'MB free')"

# Disk space
df -h
```

**Network Diagnostics:**

```bash
# Check port in use
lsof -i :5000
netstat -tulpn | grep :5000

# Network latency
ping localhost
curl -w "@curl-format.txt" http://localhost:5000/health
```

**Database Diagnostics:**

```bash
# Test connection string
psql $DATABASE_URL -c "SELECT 1"

# Connection count
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Active queries
psql $DATABASE_URL -c "SELECT pid, query, query_start FROM pg_stat_activity WHERE state='active';"
```

---

## Maintenance Operations

### Backup Procedures

**Database Backup:**

```bash
# Full backup (all data)
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Compressed backup (for large databases)
pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d).sql.gz

# Backup verification
gunzip < backup-20251124.sql.gz | head -100
```

**Application Backup:**

```bash
# Backup source code
tar -czf backup-app-$(date +%Y%m%d).tar.gz \
    backend/ frontend/ shared/ package.json tsconfig.json

# Backup configuration
tar -czf backup-config-$(date +%Y%m%d).tar.gz .env deployment-scripts/
```

---

### Database Migrations

**Schema Sync (Safe Method):**

```bash
# Check what will change
npm run db:pull

# Apply schema changes
npm run db:push

# Force apply (if normal push fails)
npm run db:push --force

# Verify success
psql $DATABASE_URL -c "\dt"  # List tables
```

**Manual Migration (if needed):**

```bash
# Generate migration script
npm run db:generate

# Review generated SQL in drizzle/ directory
cat drizzle/0001_*.sql

# Apply manually
psql $DATABASE_URL < drizzle/0001_*.sql
```

---

### Log Rotation

**Setup Log Rotation:**

```bash
# Create logrotate config
sudo tee /etc/logrotate.d/sre-dashboard << EOF
/var/log/sre-dashboard/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 app app
    sharedscripts
    postrotate
        /usr/bin/systemctl reload sre-dashboard > /dev/null 2>&1 || true
    endscript
}
EOF

# Test configuration
sudo logrotate -d /etc/logrotate.d/sre-dashboard

# Apply
sudo logrotate /etc/logrotate.d/sre-dashboard
```

**Manual Log Cleanup:**

```bash
# View log sizes
du -sh /var/log/sre-dashboard/*

# Archive old logs
gzip /var/log/sre-dashboard/app.log-20251101

# Delete logs older than 30 days
find /var/log/sre-dashboard -name "*.log" -mtime +30 -delete
```

---

### Performance Monitoring

**Enable Metrics Collection:**

```bash
# Set environment variable
export ENABLE_METRICS=true

# Restart application
./deployment-scripts/shutdown.sh
./deployment-scripts/start.sh
```

**Collect Performance Metrics:**

```bash
# Request metrics
curl http://localhost:5000/metrics | jq '.http_requests'

# Response time distribution
curl http://localhost:5000/metrics | jq '.response_times'

# Database query performance
curl http://localhost:5000/metrics | jq '.database'
```

---

## Troubleshooting

### Common Issues

**Issue: Port 5000 Already in Use**

```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 <PID>

# Or use different port
PORT=5001 npm run dev
```

**Issue: Database Connection Failed**

```bash
# Verify connection string
echo $DATABASE_URL

# Test manually
psql $DATABASE_URL -c "SELECT 1"

# Check environment
set | grep DATABASE_URL
cat .env | grep DATABASE_URL
```

**Issue: Out of Memory**

```bash
# Increase Node heap
NODE_OPTIONS="--max-old-space-size=4096" npm start

# Monitor memory
watch -n 1 'ps aux | grep node'
```

**Issue: Slow Response Times**

```bash
# Check database query performance
npm run db:stats

# Monitor system resources
top -b -n 1 | head -20

# Check network
ping localhost
curl -w "Total: %{time_total}s\n" http://localhost:5000/health
```

---

## Disaster Recovery

### Full System Recovery

**Steps:**

1. **Stop Current Instance**
   ```bash
   ./deployment-scripts/shutdown.sh
   ```

2. **Restore Database**
   ```bash
   psql $DATABASE_URL < backup-latest.sql
   ```

3. **Restore Application**
   ```bash
   tar -xzf backup-app-latest.tar.gz
   npm install
   ```

4. **Verify Configuration**
   ```bash
   npm run db:push
   ```

5. **Start Application**
   ```bash
   ./deployment-scripts/start.sh
   ```

6. **Run Health Checks**
   ```bash
   ./scripts/health-check.sh
   ```

### Rollback Procedure

**Rollback to Previous Version:**

```bash
# View version history
git log --oneline -n 10

# Checkout previous version
git checkout <commit-sha>

# Reinstall dependencies
npm install

# Sync database (if schema changed)
npm run db:push

# Restart
./deployment-scripts/shutdown.sh
./deployment-scripts/start.sh
```

---

## Document Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Nov 24, 2025 | Initial release - Production Ready |

---

**Last Review:** November 24, 2025  
**Next Review:** December 24, 2025  
**Status:** Active - Production Deployment
