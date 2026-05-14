# Service Readiness Engineer AgenticOps Intelligence Dashboard - Deployment Package

**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Last Updated:** November 22, 2025

---

## What's Included

This deployment package contains a complete, production-ready Service Readiness Engineer AgenticOps Intelligence Dashboard with:

✅ **Full-Stack Application**
- React frontend with real-time dashboards
- Express.js REST API backend
- PostgreSQL database with 577,605 vulnerability records
- AI/ML predictive analytics engine

✅ **Pre-built Data**
- 98,966+ verified vulnerability records
- 873 customer profiles
- 483 field notices
- Monthly trend aggregations (6 months)
- All data validated & indexed

✅ **Automated Scripts**
- `start.sh` - One-command startup (installs dependencies, seeds DB, starts app)
- `stop.sh` - Graceful shutdown with cleanup
- Complete with error handling & status reporting

✅ **Security & Authentication**
- JWT-based authentication
- 5 user roles with RBAC (admin, user, manager, director, vp)
- PostgreSQL session management
- Bcrypt password hashing

✅ **AI/ML Intelligence**
- Predictive analytics (30-day, quarterly, annual forecasts)
- Anomaly detection with confidence scoring
- Health scoring algorithms
- NLP-based vulnerability pattern analysis
- Risk classification & recommendations

✅ **Reports & Exports**
- PDF intelligence reports with AI/ML sections
- CSV data export with validation
- Comprehensive audit trails

---

## Quick Start (< 2 Minutes)

### Step 1: Prerequisites
```bash
# Verify you have Node.js 18+
node -v    # Should be v18+
npm -v     # Should be v9+
```

### Step 2: Start Application
```bash
# Make scripts executable (one-time)
chmod +x start.sh stop.sh

# Start the dashboard
./start.sh

# Application will be available at: http://localhost:5000
```

### Step 3: Login
```
User: admin
Password: password$$
```

### Step 4: Shutdown (when done)
```bash
./stop.sh
```

---

## System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Node.js | 18 LTS | 20+ LTS |
| RAM | 1 GB | 2-4 GB |
| Storage | 100 MB | 500 MB |
| OS | Linux/macOS/Windows | Linux (production) |
| Database | PostgreSQL 12+ | PostgreSQL 14+ |

---

## Deployment Options

### Option 1: Local Development (Fastest)
```bash
./start.sh
# Visit http://localhost:5000
```

### Option 2: Docker Container
```bash
docker build -t sre-dashboard .
docker run -p 5000:5000 -e DATABASE_URL="..." sre-dashboard
```

### Option 3: Production Linux Server
```bash
# Install Node.js 18+ LTS on your server
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone/extract package
cd /opt/sre-dashboard

# Configure environment
export NODE_ENV=production
export DATABASE_URL="postgresql://..."

# Start with systemd or supervisor
./start.sh &
```

### Option 4: Cisco Internal Cloud
```bash
# Deploy to Cisco Private Cloud or Kubernetes
# Contact: sre-agenticops@cisco.com
```

---

## Environment Configuration

### Essential Variables
```bash
# Database connection (required)
export DATABASE_URL="postgresql://user:pass@host:port/db"

# Session security (required for production)
export SESSION_SECRET="generate-random-string-here"
```

### Optional Variables
```bash
# Email alerts (if using SendGrid)
export SENDGRID_API_KEY="your-sendgrid-key"

# Application environment
export NODE_ENV="production"  # or "development"

# Port (default 5000)
export PORT=3000
```

---

## Default Users (Change These!)

```
admin     | password$$ | Full system access
user      | password$$ | Standard access
manager   | password$$ | Management-level access
director  | password$$ | Director-level access
vp        | password$$ | VP-level access
```

**IMPORTANT:** Change these passwords immediately in production!

---

## Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| **Web Dashboard** | http://localhost:5000 | Real-time KPIs & analytics |
| **API Base** | http://localhost:5000/api | REST API endpoints |
| **PDF Export** | http://localhost:5000/api/export/pdf | Intelligence reports |
| **CSV Export** | http://localhost:5000/api/export/csv | Data download |
| **Health Check** | http://localhost:5000/health | Application status |

---

## API Quick Reference

```bash
# Get monthly trends
curl http://localhost:5000/api/trends/monthly

# Get KPI intelligence
curl http://localhost:5000/api/kpi/comprehensive-intelligence

# Get sample records
curl http://localhost:5000/api/records?limit=100

# Generate PDF report
curl -X POST http://localhost:5000/api/export/pdf \
  -H "Content-Type: application/json" \
  -d '{"title":"Monthly Report"}' \
  --output report.pdf
```

---

## Key Features

### 📊 Real-Time Dashboard
- KPI metrics updated every 5 minutes
- Vulnerability trend visualization
- Customer impact analysis
- Asset health scoring

### 🤖 AI/ML Intelligence
- Predictive forecasting (exponential smoothing)
- Anomaly detection with confidence scoring
- Health score calculations (stability, predictability, trend)
- Pattern analysis from 483 field notices

### 📈 Comprehensive Reports
- PDF generation with intelligence sections
- CSV exports with validation
- Executive summaries
- Risk assessments & recommendations

### 👥 User Management
- 5 roles with granular permissions
- Session-based authentication
- Activity logging
- Password management

---

## Troubleshooting

### "Port 5000 already in use"
```bash
# Find and stop the process
lsof -i :5000
kill -9 <PID>

# Or use different port
PORT=3000 ./start.sh
```

### "Database connection failed"
```bash
# Verify DATABASE_URL
echo $DATABASE_URL

# Test connection manually
psql $DATABASE_URL -c "SELECT 1"
```

### "npm install fails"
```bash
# Clear cache and retry
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### "Application won't start"
```bash
# Check Node.js version
node -v  # Must be 18+

# Check disk space
df -h    # Need at least 1GB free

# Check logs
npm start  # See error output
```

---

## Performance Metrics

**Current Dataset:**
- Records: 577,605 vulnerability entries
- Customers: 873 unique organizations
- Field Notices: 483 CVE/security notices
- Time Span: 6 months (June - November 2025)
- Total Assets Tracked: 362 million

**Expected Performance:**
- API response time: <500ms (95th percentile)
- PDF generation: 2-5 seconds
- Data import (first run): 2-5 minutes
- Memory usage: 300-500 MB baseline

---

## Security Checklist

Before going to production:

- [ ] Change all default user passwords
- [ ] Set strong `SESSION_SECRET`
- [ ] Configure proper `DATABASE_URL` with authentication
- [ ] Enable HTTPS/TLS (reverse proxy with SSL)
- [ ] Restrict database access (firewall rules)
- [ ] Set `NODE_ENV=production`
- [ ] Enable regular backups
- [ ] Configure monitoring/alerting
- [ ] Review API rate limiting
- [ ] Test authentication flows
- [ ] Audit user permissions
- [ ] Document deployment topology

---

## Backup & Recovery

### Backup Database
```bash
# Create SQL dump
pg_dump $DATABASE_URL > backup.sql

# Or use native PostgreSQL backup
pg_dump -Fc $DATABASE_URL > backup.dump
```

### Restore Database
```bash
# From SQL dump
psql $DATABASE_URL < backup.sql

# From native dump
pg_restore -d $DATABASE_URL backup.dump
```

### Reset to Clean State
```bash
# WARNING: Deletes all data
npm run db:push -- --force

# Reimport from CSV
npm run seed
```

---

## Monitoring & Maintenance

### Daily Checks
- Application running: `curl http://localhost:5000/health`
- Database responsive: `curl http://localhost:5000/api/records/count`
- Disk space available: `df -h`

### Weekly Maintenance
- Review application logs
- Verify backups completed
- Check database performance
- Monitor prediction accuracy (Intelligence dashboard)

### Monthly Review
- Update dependencies: `npm update`
- Review security logs
- Assess prediction accuracy trends
- Plan data retention policy

---

## Support Resources

- **Documentation:** See `DEPLOYMENT_GUIDE.md`
- **Audit Reports:** See `AI_ML_SYSTEM_AUDIT_REPORT.md`
- **Audit Verification:** See `COMPREHENSIVE_AI_ML_AUDIT_FINAL.md`
- **Data Validation:** See `DATA_VALIDATION_REPORT.md`
- **External Comparison:** See `EXTERNAL_VS_DATABASE_COMPARISON.md`

---

## Next Steps

1. ✅ **Run the application:** `./start.sh`
2. ✅ **Login:** admin / password$$
3. ✅ **Explore dashboard:** View KPIs and trends
4. ✅ **Generate reports:** Create PDF/CSV exports
5. ✅ **Review intelligence:** Check AI/ML predictions
6. ✅ **Change passwords:** Update default credentials
7. ✅ **Configure production:** Set environment variables
8. ✅ **Deploy:** Use to production server

---

**Ready to go!** Run `./start.sh` and visit http://localhost:5000

For detailed setup instructions, see `DEPLOYMENT_GUIDE.md`
