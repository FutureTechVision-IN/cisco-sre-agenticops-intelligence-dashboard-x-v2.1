# Startup Procedures - Detailed Guide

**Version:** 1.0.0  
**Last Updated:** November 24, 2025

---

## Quick Start Comparison

| Environment | Command | Time | Use Case |
|-------------|---------|------|----------|
| Development | `npm run dev` | 10-15s | Local development |
| Staging | `npm start` with staging DB | 30-45s | QA testing |
| Production | `./deployment-scripts/start.sh` | 30-45s | Live environment |

---

## Development Startup

### Complete Setup (First Time)

```bash
# 1. Clone or navigate to project
cd /path/to/sre-dashboard

# 2. Create environment file
cp .env.example .env

# 3. Edit .env with local database (optional)
# DATABASE_URL=postgresql://user:pass@localhost:5432/sre_dev

# 4. Install dependencies
npm install
# Output:
# up to date in 2.3s
# 98 packages, 0 vulnerabilities

# 5. Sync database schema
npm run db:push
# Output:
# ✓ drizzle push
# 0 schema changes

# 6. Start development server
npm run dev
# Output:
# ➜  Local:   http://localhost:5000/
# ➜  press h to show help
```

### Quick Restart (Subsequent Times)

```bash
# Simply run
npm run dev

# Expected output
 VITE v5.0.0  ready in 123 ms
➜  Local:   http://localhost:5000/
```

### Verify Development Startup

```bash
# In another terminal, test endpoints
curl http://localhost:5000/               # Returns HTML
curl http://localhost:5000/health         # Returns JSON
curl http://localhost:5000/api/kpis       # Returns KPI data
```

---

## Production Startup (Recommended Method)

### Using Deployment Script

```bash
# 1. Navigate to project
cd /path/to/sre-dashboard

# 2. Set production environment
export NODE_ENV=production

# 3. Set database connection
export DATABASE_URL=postgresql://prod_user:PASSWORD@neon.tech/prod_db?sslmode=require

# 4. Set session secret
export SESSION_SECRET=$(openssl rand -base64 32)

# 5. Make script executable (first time only)
chmod +x deployment-scripts/start.sh

# 6. Start application
./deployment-scripts/start.sh

# Expected output:
# Starting SRE Dashboard...
# Environment: production
# Database: neon.tech
# Port: 5000
# Session Secret: ✓ Configured
# Build Status: ✓ Complete
# Health Check: ✓ Passed
# Starting Express Server: ✓ Ready
```

### Manual Production Startup

```bash
# 1. Set all environment variables
export NODE_ENV=production
export DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
export SESSION_SECRET=your-secure-secret

# 2. Build application
npm run build
# Output:
# vite v5.0.0 building for production...
# ✓ 245 modules transformed.
# dist/index.html           1.23 kB
# dist/index.js            245.67 kB
# ✓ built in 23.45s

# 3. Start server
npm start
# Output:
# Server running on port 5000
# Database: Connected
# Health Check: Passed
# Ready to accept requests
```

---

## Staging Startup

### Using Staging Configuration

```bash
# 1. Navigate to project
cd /path/to/sre-dashboard

# 2. Set staging environment
export NODE_ENV=staging

# 3. Set staging database
export DATABASE_URL=postgresql://staging_user:PASS@staging-neon.tech/staging_db?sslmode=require

# 4. Set staging secrets
export SESSION_SECRET=$(openssl rand -base64 32)
export SENDGRID_API_KEY=staging-sendgrid-key  # Test key

# 5. Start
npm start

# Expected output (similar to production)
# Server running on port 5000
# Environment: staging
# Database: Connected (staging-db)
# Ready for QA testing
```

---

## Startup Sequence by Component

### System Initialization Order

```
1. Environment Variables Validation
   ├─ NODE_ENV check
   ├─ DATABASE_URL validation
   └─ SESSION_SECRET verification

2. Database Connection (5-10 seconds)
   ├─ Connection pool initialization
   ├─ Schema validation
   └─ Health check query

3. Application Build (if production)
   ├─ TypeScript compilation
   ├─ Asset bundling
   └─ Cache invalidation

4. Server Startup (1-3 seconds)
   ├─ Port binding
   ├─ Express initialization
   └─ Middleware setup

5. Health Check (automatic)
   ├─ Database connectivity
   ├─ API responsiveness
   └─ Session store connectivity

TOTAL TIME: 10-45 seconds (depending on environment)
```

---

## Startup Troubleshooting

### Database Connection Issues

**Error:** `ECONNREFUSED - Connection refused`

```bash
# 1. Verify DATABASE_URL is set
echo $DATABASE_URL

# 2. Test connection manually
psql $DATABASE_URL -c "SELECT 1"

# 3. If Neon: Check connection string includes ?sslmode=require

# 4. If local: Ensure PostgreSQL is running
pg_isready -d $DATABASE_URL
```

### Port Already in Use

**Error:** `EADDRINUSE - Port 5000 already in use`

```bash
# 1. Find process using port
lsof -i :5000
# Output:
# COMMAND    PID  USER  FD  TYPE DEVICE SIZE NODE NAME
# node     12345  user  18u IPv4 abcdef    0t0  TCP localhost:5000

# 2. Kill process
kill -15 12345

# 3. Or use different port
PORT=5001 npm run dev
```

### Missing Dependencies

**Error:** `Cannot find module 'express'`

```bash
# Reinstall dependencies
npm install --no-save

# Clear cache if issues persist
npm cache clean --force
npm install
```

---

## Startup Performance Optimization

### Cold Start (First Run)

```bash
# Typical timing breakdown:
npm install          # ~30-60 seconds
npm run db:push      # ~5-10 seconds
npm run dev          # ~10-15 seconds
                     # TOTAL: 45-85 seconds
```

### Warm Start (Subsequent Runs)

```bash
# Typical timing breakdown:
npm run dev          # ~10-15 seconds (cached)
                     # TOTAL: 10-15 seconds
```

### Production Build Optimization

```bash
# Pre-build in advance
npm run build

# Production startup becomes faster
npm start            # ~5-10 seconds (no build needed)
```

---

## Startup Verification Checklist

After startup completes, verify:

- [ ] No error messages in console
- [ ] Server reports "ready to accept requests"
- [ ] Port 5000 is listening (or configured port)
- [ ] Database connection shows "Connected"
- [ ] Health endpoint returns 200 OK
- [ ] API endpoints responding with data
- [ ] No warnings about missing environment variables
- [ ] Process is running in background
- [ ] Log file being written (if configured)

---

## Systemd Service Setup (Production)

### Create Service File

```bash
sudo tee /etc/systemd/system/sre-dashboard.service << EOF
[Unit]
Description=SRE AgenticOps Intelligence Dashboard
After=network.target postgresql.service

[Service]
Type=simple
User=app
WorkingDirectory=/opt/sre-dashboard
EnvironmentFile=/etc/sre-dashboard/.env.prod

ExecStart=/usr/bin/node /opt/sre-dashboard/dist/index.js
Restart=always
RestartSec=10

StandardOutput=append:/var/log/sre-dashboard/app.log
StandardError=append:/var/log/sre-dashboard/app.log

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable sre-dashboard
sudo systemctl start sre-dashboard

# Check status
sudo systemctl status sre-dashboard
```

### Service Management

```bash
# Start service
sudo systemctl start sre-dashboard

# Stop service
sudo systemctl stop sre-dashboard

# Restart service
sudo systemctl restart sre-dashboard

# View logs
sudo journalctl -u sre-dashboard -f
```

---

## Expected Startup Times

| Component | Environment | Time | Notes |
|-----------|-------------|------|-------|
| Dependencies Install | All | 30-60s | First run only |
| Database Schema Sync | All | 5-10s | Incremental |
| Build | Production | 15-30s | Optimization |
| Server Start | Dev | 10-15s | With hot-reload |
| Server Start | Prod | 5-10s | Pre-built |
| First Request | Any | 50-100ms | Initial connection |

---

**Version:** 1.0.0  
**Updated:** November 24, 2025  
**Status:** Production Ready
