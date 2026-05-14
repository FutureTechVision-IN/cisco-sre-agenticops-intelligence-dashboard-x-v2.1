# Cisco SRE AgenticOps Intelligence Dashboard

**Version**: 1.0.0  
**Last Updated**: November 22, 2025

A comprehensive AI/ML-powered vulnerability analysis and intelligence platform for Cisco enterprise SRE teams, featuring JWT authentication, role-based access control, PDF report generation, and real-time predictive analytics.

## 🎯 Overview

The Cisco SRE AgenticOps Intelligence Dashboard provides enterprise-grade vulnerability intelligence with:

- **98,966 database records** with comprehensive vulnerability data (April 2025)
- **Five user roles** with granular permissions (sre-admin, sre-user, sre-manager, sre-director, sre-vp)
- **AI/ML predictive analytics** with ARIMA forecasting and anomaly detection
- **PDF report generation** with professional formatting, AI intelligence sections, and page optimization
- **JWT token-based authentication** with secure session management
- **Multi-state vulnerability tracking** (totVuln, potVuln, notVuln)
- **GitHub Pages hosting** with automated deployment

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm 10+
- Git
- PostgreSQL (or access to Neon PostgreSQL)

### Installation

```bash
# Clone the repository
git clone https://wwwin-github.cisco.com/bipbabu/cisco-sre-agenticops-intelligence-dashboard-x.git
cd cisco-sre-agenticops-intelligence-dashboard-x

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Initialize database
npm run db:push

# Start development server
npm run dev
```

The application will be available at `http://localhost:5000`

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [User Roles & Permissions](#user-roles--permissions)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## ✨ Features

### Authentication & Security
- **JWT Token Authentication**: Secure, stateless session management
- **Role-Based Access Control (RBAC)**: Five distinct user roles with fine-grained permissions
- **Bcrypt Password Hashing**: Industry-standard password security
- **Session Management**: Express session with PostgreSQL store
- **MFA Ready**: Framework for multi-factor authentication

### Data & Analytics
- **Comprehensive Vulnerability Database**: 98,966+ records with multi-dimensional tracking
- **AI/ML Intelligence Engine**:
  - ARIMA time-series forecasting for 30-day predictions
  - Anomaly detection with statistical analysis
  - System health scoring (0-100)
  - Risk assessment and trend analysis
- **NLP-Powered Analysis**: Pattern detection from vulnerability notices
- **Monthly Trend Tracking**: Historical data for long-term analysis

### Reporting
- **PDF Report Generation**:
  - Professional formatting with Cisco branding
  - Executive summaries with AI intelligence
  - Multi-page pagination with correct numbering
  - Data tables with automatic formatting
  - No blank pages (optimized page management)
- **Export Formats**: PDF, Excel, CSV
- **Custom Report Filtering**: By customer, field notice, vulnerability status
- **Intelligence Sections**: Risk scores, predictions, anomalies, recommendations

### Dashboard & Visualization
- **Real-time Metrics Dashboard**: Current vulnerability state overview
- **Interactive Charts**: Recharts for trend visualization
- **Data Tables**: Sortable, filterable, searchable
- **Status Indicators**: Color-coded vulnerability levels
- **System Health Metrics**: Overall platform status

### Infrastructure
- **PostgreSQL Backend**: Reliable data persistence with Drizzle ORM
- **Express Server**: High-performance Node.js API
- **React Frontend**: Modern, responsive UI with Tailwind CSS
- **GitHub Pages Hosting**: Static site deployment
- **GitHub Actions CI/CD**: Automated testing and deployment

## 🏗️ Architecture

### Technology Stack

```
Frontend:
├── React 19 - UI framework
├── Vite - Build tool
├── Tailwind CSS - Styling
├── Recharts - Data visualization
├── Wouter - Client-side routing
└── React Hook Form - Form management

Backend:
├── Express.js - API server
├── Drizzle ORM - Database access
├── PostgreSQL - Data persistence
├── JWT - Token authentication
├── PDFKit - PDF generation
└── Node Cron - Scheduled tasks

DevOps:
├── GitHub Actions - CI/CD pipeline
├── GitHub Pages - Static hosting
└── Docker-ready configuration
```

### Directory Structure

```
.
├── client/                    # React frontend
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable components
│   │   └── App.tsx          # Main app file
│   └── index.html           # Entry point
├── server/                    # Express backend
│   ├── index-dev.ts         # Development server
│   ├── index-prod.ts        # Production server
│   ├── routes.ts            # API routes
│   ├── storage.ts           # Database layer
│   ├── pdf-optimizer.ts     # PDF generation
│   ├── ml-enhanced.ts       # ML/AI engine
│   └── ...
├── shared/                    # Shared code
│   └── schema.ts            # Database schema (Drizzle)
├── scripts/                   # Deployment & utility scripts
│   ├── deploy.sh            # Main deployment script
│   └── sync-branches.sh      # Branch sync utility
├── .github/
│   └── workflows/           # GitHub Actions CI/CD
│       ├── ci-cd.yml        # Test & build pipeline
│       └── deploy-gh-pages.yml # Pages deployment
└── package.json             # Dependencies & scripts
```

## 👥 User Roles & Permissions

### 1. SRE Admin (`sre-admin`)
- **Access Level**: Full system access
- **Permissions**:
  - View all vulnerability data
  - Generate all report types
  - Manage users and roles
  - Access audit logs
  - Reset user passwords and MFA
  - System configuration
- **Default Email**: `admin@cisco.com`

### 2. SRE User (`sre-user`)
- **Access Level**: Read-only data access
- **Permissions**:
  - View vulnerability dashboards
  - Generate standard reports
  - Export data (PDF, Excel, CSV)
  - View trends and analytics
- **Default Email**: `user@cisco.com`

### 3. SRE Manager (`sre-manager`)
- **Access Level**: Team management
- **Permissions**:
  - Manage team access
  - Generate team reports
  - View team metrics
  - Create custom dashboards
  - Team-level exports
- **Default Email**: `manager@cisco.com`

### 4. SRE Director (`sre-director`)
- **Access Level**: Executive oversight
- **Permissions**:
  - View executive dashboards
  - Generate executive reports
  - View historical trends
  - Access strategic insights
  - Board-level reporting
- **Default Email**: `director@cisco.com`

### 5. SRE VP (`sre-vp`)
- **Access Level**: Executive leadership
- **Permissions**:
  - All system access (equivalent to admin)
  - Strategic decision support
  - Budget and investment insights
  - Cross-team visibility
- **Default Email**: `vp@cisco.com`

**Default Password for All Users**: `password$$`
(Change immediately in production)

## 🚀 Deployment

### Branch Structure

```
Master Branch (Production)
├── Stable releases only
├── Requires PR review & CI/CD pass
└── Deployed to production

Dev Branch (Development)
├── Active development
├── Direct commits and feature PRs
└── Tested in staging

GH-Pages Branch (GitHub Pages)
├── Static site assets
├── Automatic deployment
└── Live at GitHub Pages URL
```

### Automated Deployment

The deployment system includes comprehensive automation:

```bash
# Check deployment status
./scripts/deploy.sh status

# Sync dev and master branches
./scripts/deploy.sh sync-branches

# Create release PR (dev → master)
./scripts/deploy.sh create-release

# Deploy to GitHub Pages
./scripts/deploy.sh deploy-pages

# Full deployment pipeline
./scripts/deploy.sh full-deploy
```

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

### GitHub Actions CI/CD

Automated workflows handle:
- **Testing & Building**: On every push and PR
- **Code Quality**: Dependency checks, code analysis
- **Staging Deployment**: Automatic dev deployment
- **GitHub Pages**: Automatic static site deployment
- **Release Management**: Version tracking and tagging

See `.github/workflows/` for workflow definitions.

### Deployment URLs

- **Production**: https://wwwin-github.cisco.com/bipbabu/cisco-sre-agenticops-intelligence-dashboard-x/
- **GitHub Pages**: https://wwwin-github.cisco.com/pages/bipbabu/cisco-sre-agenticops-intelligence-dashboard-x/

## 📡 API Documentation

### Authentication

All API requests require JWT token in `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

### Key Endpoints

#### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh token

#### Vulnerability Data
- `GET /api/data/vulnerabilities` - Get all vulnerabilities
- `GET /api/data/monthly-trends` - Get trend data
- `GET /api/data/field-notices` - Get field notices
- `GET /api/data/customers` - Get customer data

#### Reports
- `POST /api/export/pdf` - Generate PDF report
- `POST /api/export/excel` - Generate Excel report
- `POST /api/export/csv` - Generate CSV report
- `POST /api/export/report/optimized` - AI-enhanced report

#### Analytics
- `GET /api/analytics/intelligence` - AI/ML intelligence
- `GET /api/analytics/predictions` - 30-day forecasts
- `GET /api/analytics/anomalies` - Anomaly detection

#### Admin
- `GET /api/admin/users` - List users (admin only)
- `POST /api/admin/reset-password` - Reset password (admin only)
- `GET /api/admin/audit-logs` - View audit logs (admin only)

## 🛠️ Development

### Setup Development Environment

```bash
# Install dependencies
npm install

# Create development environment file
cp .env.example .env.local

# Initialize database
npm run db:push

# Start development server (both frontend and backend)
npm run dev
```

The application runs on `http://localhost:5000`

### Development Scripts

```bash
# Development mode (frontend + backend)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run check

# Database operations
npm run db:push                # Push schema changes
npm run db:push --force        # Force push (careful!)
```

### Adding Features

1. **Database Schema**: Edit `shared/schema.ts`
2. **Storage Layer**: Update `server/storage.ts`
3. **API Routes**: Add to `server/routes.ts`
4. **Frontend**: Create in `client/src/pages/`

### Code Style

- TypeScript for type safety
- Tailwind CSS for styling
- React hooks for state management
- Drizzle ORM for database queries

## 📊 Data Import

The application includes 98,966 vulnerability records (April 2025 data).

Data structure:
- **Field Notices**: CVE-related information
- **Customers**: Enterprise accounts with vulnerability counts
- **Monthly Trends**: Time-series vulnerability data
- **Components**: Cisco product lines and components

For detailed data specifications, see data documentation files.

## 🔐 Security Best Practices

1. **Environment Variables**: Store secrets in `.env.local` (dev) or GitHub Secrets (production)
2. **Password Policy**: Enforce strong passwords in production
3. **JWT Secrets**: Use strong, random secrets
4. **HTTPS**: Always use HTTPS in production
5. **CORS**: Configure appropriately for your domain
6. **Database**: Use encrypted connections (Neon PostgreSQL)
7. **Audit Logging**: Review audit logs regularly

## 📈 Performance Optimization

### PDF Generation
- **Unified page management**: Prevents blank pages
- **Smart page breaks**: Calculates space efficiently
- **Content tracking**: Monitors page content height
- **Validation framework**: Detects quality issues

### Database
- **Indexed queries**: Fast lookups
- **Connection pooling**: Efficient resource usage
- **Transactions**: Data consistency

### Frontend
- **Code splitting**: Optimize bundle size
- **Lazy loading**: Load components on demand
- **Caching**: Browser and server-side caching

## 🐛 Troubleshooting

### Common Issues

#### Application won't start
```bash
# Clear cache and reinstall
rm -rf node_modules dist .cache
npm install
npm run dev
```

#### Database connection fails
```bash
# Verify DATABASE_URL is set
echo $DATABASE_URL

# Push schema if database is empty
npm run db:push
```

#### PDF generation fails
```bash
# Check Node environment
node -v

# Verify PDFKit is installed
npm ls pdfkit

# Clear temp files
rm -f *.pdf
```

#### Port 5000 already in use
```bash
# Find process using port 5000
lsof -i :5000

# Kill process (macOS/Linux)
kill -9 <PID>
```

### Getting Help

1. Check [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for deployment issues
2. Review [BLANK_PAGES_RESOLUTION.md](BLANK_PAGES_RESOLUTION.md) for PDF issues
3. Check GitHub Issues for known problems
4. Review application logs in `.github/workflows/` artifacts

## 📝 Contributing

### Guidelines

1. Fork the repository
2. Create feature branch from `dev`
3. Make changes with clear commit messages
4. Test thoroughly
5. Create pull request to `dev`
6. Wait for code review and CI/CD pass
7. Merge when approved

### Commit Message Format

```
type: brief description

Optional longer description explaining the change,
its motivation, and any breaking changes.

Fixes #issue-number
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## 📄 Documentation

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Deployment procedures
- [BLANK_PAGES_RESOLUTION.md](BLANK_PAGES_RESOLUTION.md) - PDF optimization details
- [SOLUTION_SUMMARY.md](SOLUTION_SUMMARY.md) - Solutions overview

## 📦 Dependencies

### Core
- `express`: Web framework
- `react`: UI library
- `drizzle-orm`: ORM
- `pdfkit`: PDF generation

### Authentication
- `jsonwebtoken`: JWT tokens
- `bcryptjs`: Password hashing
- `passport`: Auth strategies
- `express-session`: Session management

### UI
- `tailwindcss`: Styling
- `recharts`: Charts
- `radix-ui`: Component library
- `lucide-react`: Icons

### Database
- `@neondatabase/serverless`: PostgreSQL client
- `drizzle-zod`: Schema validation

Full list in `package.json`

## 📞 Support

- **Repository**: https://wwwin-github.cisco.com/bipbabu/cisco-sre-agenticops-intelligence-dashboard-x
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

## 📜 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

Built for Cisco Systems enterprise SRE teams with enterprise-grade security, scalability, and intelligence.

---

**Last Updated**: November 22, 2025  
**Version**: 1.0.0  
**Status**: Production Ready
