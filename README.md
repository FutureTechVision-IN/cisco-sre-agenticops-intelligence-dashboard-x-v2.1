# 🚀 Cisco SRE AgenticOps Intelligence Dashboard v2.0

<div align="center">

![Cisco](https://img.shields.io/badge/Cisco-1BA0D7?style=for-the-badge&logo=cisco&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_7-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**Enterprise-Grade Security Vulnerability Intelligence Platform with AI-Powered Analytics**

[Live Demo](https://bipbabu.github.io/cisco-sre-agenticops-intelligence-dashboard-x-v2.0) · [Documentation](#-documentation) · [Features](#-key-features) · [Architecture](#-system-architecture)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
- [Dashboard Components](#-dashboard-components)
- [AI/ML Capabilities](#-aiml-capabilities)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

The **Cisco SRE AgenticOps Intelligence Dashboard** is a comprehensive, enterprise-grade security vulnerability management and intelligence platform. Built for Service Readiness Engineering (SRE) teams, it provides real-time visibility into security posture across millions of assets, with advanced AI-powered analytics, predictive forecasting, and actionable recommendations.

### Key Statistics
- **280+ Million** assets monitored
- **446,535** CSV records processed in real-time
- **500+** field notices tracked
- **Multi-customer** support with granular filtering

---

## ✨ Key Features

### 🔒 Security Intelligence
- **Real-time Vulnerability Tracking**: Monitor vulnerable, potentially vulnerable, and secure assets
- **Field Notice Management**: Track and analyze 500+ Cisco field notices
- **Customer Risk Assessment**: Top 20 customers by vulnerability exposure
- **Multi-dimensional Filtering**: Filter by customer, field notice, type, and month

### 🤖 AI-Powered Assistant (ChatGPT-Style)
- **Conversational Interface**: Natural language queries for security insights
- **Voice Input/Output**: Web Speech API integration for hands-free operation
- **Cisco CIRCUIT API**: Enterprise AI integration for intelligent responses
- **Context-Aware Suggestions**: Smart follow-up recommendations
- **Rich Message Rendering**: Markdown, code blocks, tables, and charts

### 📊 Advanced Analytics
- **ARIMA Forecasting**: 30-day predictive trend analysis
- **Anomaly Detection**: Statistical deviation identification using Z-score and Isolation Forest
- **Remediation Velocity**: Track security improvement rates
- **Risk Concentration Radar**: Visual representation of customer risk distribution

### 📈 Interactive Dashboards
- **KPI Cards**: Total assets, secure, potentially vulnerable, vulnerable counts
- **Monthly Comparison Analysis**: Stacked bar charts with filter reflection
- **Asset Trend Overview**: Area charts with cumulative/incremental views
- **Growth Metrics**: Month-over-month change tracking
- **Advanced KPI Cards**: Risk concentration radar, remediation velocity sparklines

### 🎛️ Filter System
- **Dynamic Filtering**: Real-time data refresh based on filter combinations
- **Filter Indicators**: Visual badges showing active filters on all charts
- **Persistent State**: Filter selections maintained across navigation
- **Search Functionality**: Autocomplete for customers and field notices

### 📑 Reporting & Export
- **PDF Reports**: Intelligence reports with AI-generated insights
- **CSV Export**: Download filtered data for external analysis
- **Excel Export**: Formatted spreadsheets with charts
- **Scheduled Reports**: Automated email delivery

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CISCO SRE AGENTICOPS                              │
│                    INTELLIGENCE DASHBOARD ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRESENTATION LAYER                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Dashboard  │  │ Intelligence │  │   Reports    │  │   Records    │    │
│  │    Main      │  │    Center    │  │    Page      │  │    Page      │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │                 │             │
│  ┌──────┴─────────────────┴─────────────────┴─────────────────┴───────┐    │
│  │                     REACT COMPONENTS (v19.2.0)                      │    │
│  ├─────────────────────────────────────────────────────────────────────┤    │
│  │  ChartsSection │ MetricCard │ SmartSearchPanel │ ChatGPTStyleChatbot│    │
│  │  InsightModal  │ FilterPanel │ IntelligenceCards │ AdvancedVoice    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│  ┌─────────────────────────────────┴─────────────────────────────────┐     │
│  │                    UI COMPONENT LIBRARY                            │     │
│  │  Radix UI │ Recharts 2.15 │ Lucide Icons │ Tailwind CSS 4.1       │     │
│  └───────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              STATE MANAGEMENT                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │  React Query    │  │   Auth Context  │  │    Local State (useState)   │ │
│  │  (TanStack v5)  │  │   (JWT-based)   │  │   Filters, Views, Modals    │ │
│  │  - Caching      │  │   - Login/out   │  │   - Customer selection      │ │
│  │  - Refetching   │  │   - Session     │  │   - Field notice filter     │ │
│  │  - Mutations    │  │   - Tokens      │  │   - Month/Type filters      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SERVICE LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │   Data Service   │  │  Chatbot Service │  │    AI/ML Service         │  │
│  │  - fetchDashboard│  │  - sendMessage   │  │  - analyzeTrend          │  │
│  │  - filteredMetrics│  │  - voiceInput   │  │  - generateForecast      │  │
│  │  - filteredTrends│  │  - CIRCUIT API   │  │  - detectAnomaly         │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY (Express.js)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         REST API ENDPOINTS                              │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │  GET  /api/metrics/summary        │  Aggregate vulnerability metrics   │ │
│  │  GET  /api/metrics/filtered       │  Filtered metrics by combination   │ │
│  │  GET  /api/trends/monthly         │  Monthly trend data                │ │
│  │  GET  /api/trends/monthly/filtered│  Filtered monthly trends           │ │
│  │  GET  /api/reports/top-field-notices │ Top FNs by vulnerability       │ │
│  │  GET  /api/reports/top-customers  │  Top customers by risk             │ │
│  │  GET  /api/filters                │  Available filter options          │ │
│  │  POST /api/chat                   │  AI chatbot endpoint               │ │
│  │  GET  /api/intelligence/insights  │  AI-generated insights             │ │
│  │  POST /api/auth/login             │  JWT authentication                │ │
│  │  GET  /api/auth/me                │  Current user session              │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────────────┐ │
│  │   Rate Limiter   │  │   Auth Middleware │  │    Response Compression  │ │
│  └──────────────────┘  └──────────────────┘  └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BUSINESS LOGIC LAYER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CSV DATA SERVICE (csv-data-service.ts)            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────────┐  │   │
│  │  │ Record Cache │  │ Deduplication│  │   Aggregation Engine      │  │   │
│  │  │ 446,535 rows │  │ by SerialNo  │  │   - By Month              │  │   │
│  │  │ In-memory    │  │ + AssetId    │  │   - By Customer           │  │   │
│  │  └──────────────┘  └──────────────┘  │   - By Field Notice       │  │   │
│  │                                       └───────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                 ENHANCED CISCO AI (enhanced-cisco-ai.ts)             │   │
│  │  ┌──────────────────┐  ┌───────────────────────────────────────┐   │   │
│  │  │ CIRCUIT API Key  │  │     Data Intelligence Engine          │   │   │
│  │  │ Validator        │  │     - Real-time metrics injection     │   │   │
│  │  │                  │  │     - Response templating             │   │   │
│  │  │ API Key:         │  │     - Follow-up suggestions           │   │   │
│  │  │ egai-prd-cx-...  │  │     - Context-aware responses         │   │   │
│  │  └──────────────────┘  └───────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ML INTELLIGENCE ENGINE (ml-system.ts)             │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐    │   │
│  │  │ ARIMA Forecast │  │ Anomaly Detect │  │ Trend Analysis     │    │   │
│  │  │ - 30-day pred  │  │ - Z-score      │  │ - Slope calculation│    │   │
│  │  │ - Confidence   │  │ - Isolation    │  │ - Volatility       │    │   │
│  │  │   intervals    │  │   Forest       │  │ - Breakout prob    │    │   │
│  │  └────────────────┘  └────────────────┘  └────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      PRIMARY DATA SOURCE                             │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │  CSV File: filtered_bcs_apr25-sep25_2025_apr-sep_*.csv      │    │   │
│  │  │  Location: attached_assets/                                  │    │   │
│  │  │  Records: 446,535 | Assets: 280,958,889                      │    │   │
│  │  │                                                               │    │   │
│  │  │  Columns:                                                     │    │   │
│  │  │  - customerName, fieldNoticeId, fnTitle, fnType              │    │   │
│  │  │  - bcsMonth, totVuln, potVuln, notVuln, serialNum, assetId   │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    STATIC DATA (GitHub Pages Mode)                   │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │  Location: static-data/                                      │    │   │
│  │  │  - metrics-summary.json    │ - trends-monthly.json           │    │   │
│  │  │  - filters.json            │ - trends-forecast.json          │    │   │
│  │  │  - field-notices.json      │ - intelligence-insights.json    │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    DATABASE (Optional - PostgreSQL)                  │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │  ORM: Drizzle ORM v0.39                                      │    │   │
│  │  │  Tables: users, sessions, audit_logs                         │    │   │
│  │  │  Connection: Neon Serverless PostgreSQL                      │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL INTEGRATIONS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────────────┐ │
│  │ Cisco CIRCUIT AI │  │ Web Speech API   │  │    Email Service          │ │
│  │ - Summarization  │  │ - Voice Input    │  │    (Nodemailer)           │ │
│  │ - NLP Processing │  │ - TTS Output     │  │    - Scheduled reports    │ │
│  │ - Q&A            │  │ - Recognition    │  │    - Alert notifications  │ │
│  └──────────────────┘  └──────────────────┘  └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Interaction → React Component → Service Layer → Express API → Data Layer
       ↓                                                              ↓
   Filter Change                                              CSV Cache/DB
       ↓                                                              ↓
   useQuery Hook ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← Aggregated Data
       ↓
   Component Re-render with Filtered Data
```

---

## 🛠️ Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI Framework |
| TypeScript | 5.6.3 | Type Safety |
| Vite | 7.2.4 | Build Tool |
| TanStack React Query | 5.60.5 | Data Fetching & Caching |
| Recharts | 2.15.4 | Charts & Visualizations |
| Tailwind CSS | 4.1.14 | Styling |
| Radix UI | Latest | Accessible Components |
| Lucide React | 0.545.0 | Icons |
| Wouter | 3.3.5 | Routing |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Express.js | 4.21.2 | Web Server |
| TypeScript | 5.6.3 | Type Safety |
| Drizzle ORM | 0.39.1 | Database ORM |
| csv-parse | 6.4.1 | CSV Processing |
| jsonwebtoken | 9.0.2 | Authentication |
| bcryptjs | 3.0.3 | Password Hashing |
| node-cron | 4.2.1 | Scheduled Tasks |

### AI/ML
| Technology | Purpose |
|------------|---------|
| Cisco CIRCUIT API | Enterprise AI Integration |
| ARIMA | Time Series Forecasting |
| Isolation Forest | Anomaly Detection |
| Web Speech API | Voice Recognition & TTS |

### DevOps
| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| GitHub Pages | Static Hosting |
| GitHub Actions | CI/CD |
| Jest | Testing |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20.x or higher
- npm 10.x or higher
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/bipbabu/cisco-sre-agenticops-intelligence-dashboard-x-v2.0.git
cd cisco-sre-agenticops-intelligence-dashboard-x-v2.0

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:8000 in your browser
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=8000
NODE_ENV=development

# Database (Optional)
DATABASE_URL=postgresql://user:password@host:5432/database

# Cisco CIRCUIT API
CISCO_CIRCUIT_API_KEY=your-api-key-here

# JWT Authentication
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# Email Service (Optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
```

### Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run lint         # Run ESLint
npm run export:static # Export static data for GitHub Pages
npm run deploy       # Deploy to GitHub Pages
```

---

## 📊 Dashboard Components

### Main Dashboard
- **KPI Cards**: Total Assessed Assets, Secure Assets, Potentially Vulnerable, Vulnerable
- **Intelligence Cards**: Detected Anomalies, Trend Predictions, Top Recommendations
- **Growth Metrics**: Vulnerable Growth, Potentially Vulnerable Growth, Secure Assets Growth
- **Advanced Metrics**: Vulnerability Detection Rate, Remediation Velocity, Security Coverage

### Charts Section
- **Monthly Comparison Analysis**: Stacked bar chart with filter indicators
- **Asset Trend Overview**: Area chart with cumulative/incremental toggle
- **Risk Concentration Radar**: Top 5 customers by vulnerability exposure
- **Remediation Velocity Card**: Sparkline showing improvement velocity
- **Vulnerability Distribution**: Progress bars showing percentage breakdown

### Tables
- **Top Field Notices**: Ranked by vulnerability count with export functionality
- **Top Customers**: Ranked by risk exposure with detailed metrics

### Intelligence Center
- **AI-Powered Insights**: ARIMA forecasts, anomaly detection
- **Vulnerability Trend Analysis**: Slope, volatility, breakout probability
- **Remediation Analytics**: Efficiency scores, projected clearance
- **Real-time Status**: System health, API connectivity, data integrity

---

## 🤖 AI/ML Capabilities

### Cisco CIRCUIT Integration
- Natural language processing for security queries
- Context-aware response generation
- Real-time data injection into responses
- Follow-up suggestion generation

### Predictive Analytics
- **ARIMA Forecasting**: 30-day vulnerability trend predictions
- **Confidence Intervals**: Upper and lower bounds at 95% confidence
- **Trend Analysis**: Slope, acceleration, volatility metrics

### Anomaly Detection
- **Z-score Analysis**: Statistical deviation detection (>2σ)
- **Isolation Forest**: Unsupervised anomaly identification
- **Sensitivity Levels**: Configurable detection thresholds

### Voice Interface
- **Speech Recognition**: Web Speech API for voice commands
- **Text-to-Speech**: Verbal response delivery
- **Command Processing**: Natural language query interpretation

---

## 📡 API Reference

### Metrics Endpoints
```
GET /api/metrics/summary
GET /api/metrics/filtered?customer=X&fieldNotice=Y&fnType=Z&month=W
```

### Trends Endpoints
```
GET /api/trends/monthly
GET /api/trends/monthly/filtered?customer=X&fieldNotice=Y
GET /api/trends/monthly/cumulative
GET /api/trends/forecast
```

### Reports Endpoints
```
GET /api/reports/top-field-notices?limit=500&year=2025
GET /api/reports/top-customers?limit=500&year=2025
GET /api/reports/field-notices/filtered
GET /api/reports/customers/filtered
```

### Intelligence Endpoints
```
GET /api/intelligence/insights
GET /api/kpi/comprehensive-intelligence
GET /api/kpi/predictive-analytics
GET /api/kpi/anomaly-detection
```

### Chat Endpoint
```
POST /api/chat
Body: { "message": "What is the current vulnerability rate?" }
```

### Authentication
```
POST /api/auth/login
GET /api/auth/me
POST /api/auth/logout
```

---

## 🚢 Deployment

### GitHub Pages (Static Mode)
```bash
npm run build:gh-pages
npm run deploy:gh-pages
```

### Docker
```bash
docker build -t cisco-sre-dashboard .
docker run -p 8000:8000 cisco-sre-dashboard
```

### Docker Compose
```bash
docker-compose up -d
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **Cisco Future Tech Vision AI Team**
- **SRE AgenticOps Intelligence Division**

---

## 🙏 Acknowledgments

- Cisco Systems, Inc.
- CIRCUIT AI Team
- React & Vite Communities
- Open Source Contributors

---

<div align="center">

**Built with ❤️ by Cisco Future Tech Vision AI**

© 2025 Cisco Systems, Inc. All Rights Reserved.

</div>
