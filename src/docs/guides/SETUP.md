# SRE AgenticOps Intelligence Dashboard - Complete Setup Guide

**Quick Reference | Production Ready | 577,605 Vulnerability Records**

---

## ⚡ Ultra-Quick Start (5 Minutes)

```bash
# 1. Setup environment
cp .env.example .env
# Edit .env with your database URL

# 2. Start application
./deployment-scripts/start.sh

# 3. Open browser
# http://localhost:5000
```

---

## 📋 What You Get

✅ **Complete full-stack application** ready for production  
✅ **577,605 vulnerability records** from 873 customers  
✅ **Real-time KPI dashboards** with advanced filtering  
✅ **PDF/CSV export** capabilities  
✅ **Email notifications** (SMTP or SendGrid)  
✅ **AI/ML integration** (optional Cisco/Google)  
✅ **Automated reporting** and scheduling  
✅ **GitHub Pages** documentation hosting  

---

## 🚀 Installation Steps

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd sre-dashboard
```

### Step 2: Configure Environment

**Copy template:**
```bash
cp .env.example .env
```

**Edit `.env` with required values:**
```bash
# REQUIRED
DATABASE_URL=postgresql://user:password@host:5432/sre_dashboard
NODE_ENV=production
SESSION_SECRET=<run: openssl rand -base64 32>

# OPTIONAL - Pick one for email
# Option A: SendGrid
SENDGRID_API_KEY=SG.your-key

# Option B: SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=app-password
```

### Step 3: Start Application

```bash
# Make scripts executable (first time only)
chmod +x deployment-scripts/start.sh deployment-scripts/shutdown.sh

# Start
./deployment-scripts/start.sh
```

**Expected output:**
```
[INFO] Starting SRE AgenticOps Intelligence Dashboard...
[INFO] Environment: production
[INFO] Database connection successful ✓
[INFO] Listening on http://0.0.0.0:5000
```

### Step 4: Access Dashboard

Open browser: **http://localhost:5000**

---

## 🗂️ Project Structure

```
sre-dashboard/
├── deployment-scripts/        # Start/shutdown scripts
│   ├── start.sh              # Production startup
│   └── shutdown.sh           # Graceful shutdown
├── docs/                      # Complete documentation
│   ├── DEPLOYMENT_GUIDE.md
│   ├── DATA_FILE_DOCUMENTATION.md
│   ├── GIT_BRANCH_STRATEGY.md
│   ├── QUALITY_ASSURANCE_GUIDE.md
│   ├── GITHUB_PAGES_SETUP.md
│   └── (audit reports)
├── backend/                   # Node.js Express API
│   ├── index-dev.ts          # Development entry
│   ├── index-prod.ts         # Production entry
│   ├── routes.ts             # API endpoints
│   ├── storage.ts            # Database layer
│   └── email-service.ts      # Email handling
├── client/                    # React frontend
│   ├── src/App.tsx           # Main app
│   ├── src/pages/            # Page components
│   └── index.html            # HTML template
├── shared/                    # Shared types
│   └── schema.ts             # Database schema
├── .env.example              # Environment template
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
└── README.md                 # Project overview
```

---

## 🔧 Configuration Options

### Email Setup

**SendGrid (Easiest):**
```bash
SENDGRID_API_KEY=SG.your-sendgrid-key
ALERT_FROM_EMAIL=alerts@company.com
ALERT_RECIPIENTS=admin@company.com
```

**SMTP (Gmail, Outlook, etc):**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=app-password  # Not your regular password
SMTP_SECURE=true
```

### AI/ML Configuration

```bash
# Cisco CIRCUIT AI API
CISCO_CIRCUIT_API_KEY=your-new-rotated-cx-summarize-key
CISCO_CIRCUIT_ENDPOINT=https://circuit.cisco.com/api/v1
```

---

## 📊 Data Integration

**CSV Data File:** `attached_assets/filtered_bcs_apr25-sep25_2025_apr-sep_1763978622704.csv`

The application **automatically loads** this data on startup.

**To manually import:**
```bash
ts-node backend/import-csv.ts <path-to-csv>
```

**Data Stats:**
- Records: 577,605
- Customers: 873
- Field Notices: 956
- Date Range: 2007-2025

---

## ✅ Verify Installation

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM field_notice_records;"

# Test API endpoint
curl http://localhost:5000/api/metrics

# Expected: JSON with totalAssessed > 0
```

---

## 🛑 Stop Application

```bash
# Graceful shutdown
./deployment-scripts/shutdown.sh

# Or manual
pkill -f "node build/index.js"
```

---

## 📖 Full Documentation

All comprehensive guides are available in `docs/`:

| Document | Purpose |
|----------|---------|
| **DEPLOYMENT_GUIDE.md** | Complete installation & production setup |
| **DATA_FILE_DOCUMENTATION.md** | CSV structure & integration |
| **GIT_BRANCH_STRATEGY.md** | Development workflow & branching |
| **QUALITY_ASSURANCE_GUIDE.md** | Testing & verification |
| **GITHUB_PAGES_SETUP.md** | Static site hosting |

---

## 🐛 Troubleshooting

### Database Connection Failed
```bash
# Verify DATABASE_URL
echo $DATABASE_URL

# Test manually
psql $DATABASE_URL -c "SELECT 1"
```

### Port 5000 Already in Use
```bash
# Find process
lsof -i :5000

# Kill it
kill -9 <PID>
```

### Application Won't Start
```bash
# Check detailed error
NODE_DEBUG=* ./deployment-scripts/start.sh

# Check logs
tail -50 logs/app-*.log
```

**See QUALITY_ASSURANCE_GUIDE.md for full troubleshooting.**

---

## 🚀 Production Deployment

For production environments, see **DEPLOYMENT_GUIDE.md** for:
- PM2 process manager setup
- systemd service configuration
- Docker containerization
- Nginx reverse proxy
- SSL/TLS certificate setup
- Database backups
- Monitoring & alerting

---

## 📝 Git Workflow

### Core Branches
- **master** - Production-ready code
- **develop** - Development/staging
- **gh-pages** - Documentation hosting
- **feature/*** - Feature branches
- **bugfix/*** - Bug fixes

### Creating Feature Branch
```bash
git checkout -b feature/my-feature develop
# Make changes
git commit -m "feat: add my feature"
git push origin feature/my-feature
# Create PR on GitHub
```

**See GIT_BRANCH_STRATEGY.md for complete workflow.**

---

## ✨ Key Features

### Dashboard Features
- ✅ Real-time KPI cards (total, secure, vulnerable, potentially vulnerable)
- ✅ Advanced filtering (month, customer, field notice, type)
- ✅ Top field notices analytics
- ✅ Top customers analytics
- ✅ Trend indicators
- ✅ Export to PDF/CSV

### Backend Features
- ✅ RESTful API with 20+ endpoints
- ✅ Session-based authentication
- ✅ Database transactions
- ✅ Error handling & logging
- ✅ Query optimization

### Data Management
- ✅ 577,605 records from 873 customers
- ✅ 18-month historical data
- ✅ Automatic deduplication
- ✅ Data validation
- ✅ Audit logging

---

## 📊 System Requirements

- **Node.js:** v18+ (v20 recommended)
- **npm:** v9+
- **PostgreSQL:** 12+ or Neon serverless
- **Memory:** 2GB minimum (4GB recommended for production)
- **Disk:** 5GB available
- **OS:** Linux, macOS, or Windows (WSL2)

---

## 🎓 Learning Resources

- See `docs/` for comprehensive guides
- API documentation in routes.ts
- Component documentation in client/src/
- Database schema in shared/schema.ts

---

## 📞 Support

**Documentation:** See `docs/` directory  
**Issues:** Check QUALITY_ASSURANCE_GUIDE.md troubleshooting  
**Logs:** `tail -100 logs/app-*.log`  
**Database:** `psql $DATABASE_URL` for direct queries  

---

## ✅ Installation Checklist

- [ ] Environment variables configured (.env)
- [ ] Database connection verified
- [ ] npm dependencies installed
- [ ] Application starts without errors
- [ ] Dashboard loads in browser
- [ ] Filters working (month, customer, field notice)
- [ ] PDF export working
- [ ] CSV export working
- [ ] No console errors

---

## 🎉 You're Ready!

Your SRE AgenticOps Intelligence Dashboard is now running and ready for use.

**Next Steps:**
1. Explore the dashboard at http://localhost:5000
2. Test different filters and exports
3. Configure email notifications
4. Set up automated reporting
5. Deploy to production (see DEPLOYMENT_GUIDE.md)

---

**Status:** ✅ Production Ready  
**Last Updated:** November 24, 2025  
**Version:** 1.0
