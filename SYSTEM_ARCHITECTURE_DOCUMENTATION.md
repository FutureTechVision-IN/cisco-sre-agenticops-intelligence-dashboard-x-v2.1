# CISCO SRE AGENTICOPS INTELLIGENCE DASHBOARD v2.0
## Comprehensive System Architecture Documentation

**Document Version**: 1.0.0  
**Last Updated**: January 7, 2026  
**Classification**: Technical Architecture  
**Audience**: Technical & Non-Technical Stakeholders  

---

## 📑 Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Component Architecture](#component-architecture)
4. [Data Flow Diagrams](#data-flow-diagrams)
5. [Infrastructure Requirements](#infrastructure-requirements)
6. [Security & Compliance](#security--compliance)
7. [Alert & Notification Framework](#alert--notification-framework)
8. [Critical Enhancements Roadmap](#critical-enhancements-roadmap)
9. [Change Log](#change-log)

---

## Executive Summary

The Cisco SRE AgenticOps Intelligence Dashboard is an **enterprise-grade, AI-powered vulnerability intelligence platform** designed to provide Service Readiness Engineering (SRE) teams with real-time visibility into security posture across distributed infrastructure. This document provides comprehensive technical architecture specifications, security considerations, and strategic enhancements for stakeholder review.

### Key Capabilities
- **280+ Million** assets monitored across multiple customers
- **446,535+** vulnerability records processed in real-time
- **500+** Cisco field notices tracked and analyzed
- **AI/ML-powered** predictive analytics and anomaly detection
- **Multi-role** access control with granular permissions
- **Enterprise-grade** security with JWT authentication and encryption

### Strategic Value
- **Risk Reduction**: Early vulnerability detection and rapid remediation tracking
- **Operational Excellence**: Actionable intelligence for service readiness engineer decision-making
- **Compliance Assurance**: Comprehensive audit trails and reporting
- **Cost Optimization**: Efficient resource allocation through predictive analytics

---

## System Overview

### 1.1 Architecture Paradigm

The system follows a **three-tier distributed architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION TIER                             │
│  (React 19 Frontend with Vite + TypeScript)                         │
└────────────────────┬────────────────────────────────────────────────┘
                     │ REST API (HTTP/HTTPS)
┌────────────────────▼────────────────────────────────────────────────┐
│                      SERVICE TIER                                    │
│  (Express.js Backend with Node.js Runtime)                          │
│  - API Gateway & Route Management                                   │
│  - Business Logic & Data Aggregation                                │
│  - AI/ML Intelligence Engine                                        │
│  - Authentication & Authorization                                   │
└────────────────────┬────────────────────────────────────────────────┘
                     │ ORM Interface (Drizzle)
┌────────────────────▼────────────────────────────────────────────────┐
│                      DATA TIER                                       │
│  - PostgreSQL Database (Primary)                                    │
│  - CSV Data Cache (Secondary)                                       │
│  - Static JSON Exports (GitHub Pages Mode)                          │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack Summary

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 19.2.0 | UI Framework |
| | TypeScript | 5.6.3 | Type Safety |
| | Vite | 7.2.4 | Build Tooling |
| | TailwindCSS | 4.1.14 | Styling |
| | Recharts | 2.15.4 | Data Visualization |
| **Backend** | Express.js | 4.21.2 | Web Server |
| | Node.js | 20.x+ | Runtime |
| | TypeScript | 5.6.3 | Type Safety |
| | Drizzle ORM | 0.39.1 | Database Access |
| **Database** | PostgreSQL | 14+ | Primary Data Store |
| | Neon Serverless | Latest | Cloud-hosted Option |
| **AI/ML** | Cisco CIRCUIT API | Enterprise | LLM Integration |
| | ARIMA | Native | Time Series Forecasting |
| | Isolation Forest | Native | Anomaly Detection |
| **DevOps** | Docker | Latest | Containerization |
| | GitHub Actions | Native | CI/CD Pipeline |
| | GitHub Pages | Native | Static Hosting |

---

## Component Architecture

### 2.1 Frontend Component Hierarchy

```
App (Root)
├── AuthProvider (Context - Session Management)
├── AuthenticatedApp (Protected Wrapper)
└── Dashboard (Main Application)
    ├── Header
    │   ├── Logo & Branding
    │   ├── Navigation Menu
    │   └── User Profile
    │
    ├── SidePanel
    │   └── FilterPanel
    │       ├── Customer Filter
    │       ├── Field Notice Filter
    │       ├── Type Filter
    │       └── Month Range Filter
    │
    ├── MainContent
    │   ├── UnifiedKPIDashboard (Primary KPI Section)
    │   │   ├── Core Metrics Overview
    │   │   │   ├── MetricCard (Total Assessed)
    │   │   │   ├── MetricCard (Secure Assets)
    │   │   │   ├── MetricCard (Potentially Vulnerable)
    │   │   │   └── MetricCard (Vulnerable Assets)
    │   │   │
    │   │   ├── Key Performance Indicators (4 New KPIs)
    │   │   │   ├── KPICard (Vulnerability Detection Rate)
    │   │   │   ├── KPICard (Remediation Velocity)
    │   │   │   ├── KPICard (Security Coverage)
    │   │   │   └── KPICard (Field Notice Coverage)
    │   │   │
    │   │   ├── Extended Performance Metrics
    │   │   │   └── ExtendedKPICard[] (Custom Metrics)
    │   │   │
    │   │   └── KPI Modal (Detailed Analysis)
    │   │       ├── Overview Tab
    │   │       ├── Trend Analysis Tab
    │   │       ├── Benchmarks Tab
    │   │       └── Methodology Tab
    │   │
    │   ├── Intelligence Layer
    │   │   ├── AnomaliesCard (Detected Anomalies)
    │   │   ├── PredictionsCard (AI Forecasts)
    │   │   └── RecommendationsCard (Action Items)
    │   │
    │   ├── ChartsSection (Analytics)
    │   │   ├── MonthlyComparisonChart (Stacked Bar)
    │   │   ├── AssetTrendChart (Area Chart)
    │   │   ├── RiskConcentrationRadar (5-Point Radar)
    │   │   ├── RemediationVelocityCard (Sparkline)
    │   │   ├── VulnerabilityDistribution (Progress Bars)
    │   │   ├── TopFieldNoticesTable
    │   │   └── TopCustomersTable
    │   │
    │   ├── IntelligenceCenter
    │   │   ├── AIInsights (Markdown Rendering)
    │   │   ├── InsightModal (Detail View)
    │   │   └── AnomalyDetail (Trend Analysis)
    │   │
    │   └── ChatGPT-StyleChatbot
    │       ├── MessageList
    │       ├── Input Area
    │       └── VoiceInterface
    │
    └── Footer
        └── System Status & Info
```

### 2.2 Backend Route Architecture

```
Express Application
│
├── Authentication Routes (/api/auth)
│   ├── POST /login - JWT token generation
│   ├── GET /me - Current user session
│   └── POST /logout - Session termination
│
├── Metrics Routes (/api/metrics)
│   ├── GET /summary - Aggregate vulnerability counts
│   ├── GET /filtered - Filtered metrics by combinations
│   └── GET /extended - Extended KPI data
│
├── Trends Routes (/api/trends)
│   ├── GET /monthly - Monthly trend data
│   ├── GET /monthly/filtered - Filtered trends
│   ├── GET /monthly/cumulative - Cumulative trends
│   ├── GET /forecast - ARIMA predictions (30-day)
│   └── GET /anomalies - Detected anomalies
│
├── Reports Routes (/api/reports)
│   ├── GET /top-field-notices - Ranked field notices
│   ├── GET /top-customers - Ranked customers by risk
│   └── GET /pdf - PDF report generation
│
├── AI/ML Routes (/api/ai-ml)
│   ├── GET /intelligence/insights - AI-generated insights
│   ├── POST /chat - Chatbot endpoint
│   ├── GET /anomaly-detection - Anomaly analysis
│   └── GET /predictive-analytics - Forecast data
│
├── KPI Routes (/api/kpi)
│   ├── GET /comprehensive-intelligence - All KPI data
│   ├── GET /predictive-analytics - KPI forecasts
│   ├── GET /anomaly-detection - KPI anomalies
│   ├── GET /health-scores - System health metrics
│   ├── GET /vulnerability-trend - Vulnerability trends
│   └── GET /customer-risk-concentration - Customer risk data
│
├── Filter Routes (/api/filters)
│   ├── GET / - Available filter options
│   └── GET /search - Dynamic search results
│
├── Admin Routes (/api/admin) [Protected]
│   ├── User Management
│   ├── Data Imports
│   └── System Configuration
│
└── Health Routes (/api/health)
    └── GET / - System status & uptime
```

### 2.3 Database Schema Overview

```
PostgreSQL Tables:

1. users
   ├── id (UUID, PK)
   ├── email (VARCHAR UNIQUE)
   ├── passwordHash (VARCHAR)
   ├── role (VARCHAR - sre-admin, sre-user, sre-manager, etc.)
   ├── name (VARCHAR)
   ├── isActive (BOOLEAN)
   ├── createdAt (TIMESTAMP)
   └── updatedAt (TIMESTAMP)

2. sessions
   ├── sid (VARCHAR, PK)
   ├── userId (UUID, FK→users)
   ├── token (TEXT - JWT)
   ├── expiresAt (TIMESTAMP)
   ├── lastActivity (TIMESTAMP)
   └── metadata (JSONB)

3. audit_logs
   ├── id (UUID, PK)
   ├── userId (UUID, FK→users)
   ├── action (VARCHAR)
   ├── resourceType (VARCHAR)
   ├── resourceId (VARCHAR)
   ├── changes (JSONB)
   ├── ipAddress (VARCHAR)
   └── timestamp (TIMESTAMP)

4. vulnerability_records (Optional - for CSV data cache)
   ├── id (UUID, PK)
   ├── customerName (VARCHAR)
   ├── fieldNoticeId (VARCHAR)
   ├── fnTitle (TEXT)
   ├── bcsMonth (VARCHAR)
   ├── totVuln (INTEGER)
   ├── potVuln (INTEGER)
   ├── notVuln (INTEGER)
   ├── serialNum (VARCHAR)
   └── assetId (VARCHAR)

5. alert_configurations
   ├── id (UUID, PK)
   ├── name (VARCHAR)
   ├── alertType (VARCHAR)
   ├── triggerCondition (JSONB)
   ├── notificationChannels (JSONB)
   ├── recipientList (JSONB)
   ├── isActive (BOOLEAN)
   └── createdAt (TIMESTAMP)
```

### 2.4 Data Processing Pipeline

```
Raw Data Input
├── CSV Files (attached_assets/)
├── API Responses (Cisco CIRCUIT)
└── Real-time Metrics

    ↓

Data Ingestion Layer
├── CSV Parser (csv-parse v6.4.1)
├── Data Validator
└── Deduplication Engine

    ↓

Business Logic Layer
├── CSV Data Service
│   ├── Record Cache (446,535 rows)
│   ├── Aggregation Engine
│   │   ├── By Customer
│   │   ├── By Field Notice
│   │   ├── By Month
│   │   └── By Type
│   └── Filtering Engine
│
├── ML Intelligence Engine
│   ├── ARIMA Forecasting (30-day)
│   ├── Anomaly Detection (Z-score + Isolation Forest)
│   ├── Trend Analysis (Slope, Volatility)
│   └── Risk Scoring
│
└── AI Integration Layer
    ├── Cisco CIRCUIT API (Enterprise LLM)
    ├── Prompt Engineering
    ├── Response Templating
    └── Context Injection

    ↓

Caching & Optimization
├── In-Memory Cache (Node.js)
├── Response Compression (gzip)
├── Query Optimization
└── Rate Limiting (API Gateway)

    ↓

Output & Distribution
├── REST API Response
├── JSON Static Files (GitHub Pages)
├── PDF Reports (PDFKit)
└── Email Notifications (Nodemailer)
```

---

## Data Flow Diagrams

### 3.1 User Request Flow

```
┌──────────────────┐
│   User Action    │  (Filter change, page navigation, KPI click)
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│  React Component (Event Handler)             │
│  - Validates input                           │
│  - Updates local state                       │
│  - Triggers React Query                      │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│  React Query Hook (useQuery/useMutation)    │
│  - Serializes request                        │
│  - Manages cache key                         │
│  - Handles retry logic                       │
└────────┬─────────────────────────────────────┘
         │
         ▼ HTTP Request (GET/POST)
┌──────────────────────────────────────────────┐
│  Express API Gateway                         │
│  ├── Request logging                         │
│  ├── Auth middleware (JWT verification)      │
│  ├── Rate limiting                           │
│  └── Route dispatcher                        │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│  Route Handler                               │
│  ├── Parameter validation                    │
│  ├── Authorization check                     │
│  └── Service layer invocation                │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│  Business Logic Services                     │
│  ├── CSV Data Service (filtering/aggregation)│
│  ├── ML System (analytics/predictions)       │
│  ├── AI Service (Cisco CIRCUIT integration)  │
│  └── Cache management                        │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│  Data Layer                                  │
│  ├── PostgreSQL queries (ORM)                │
│  ├── CSV cache lookups                       │
│  ├── Static JSON files                       │
│  └── External API calls                      │
└────────┬─────────────────────────────────────┘
         │
         ▼ Data retrieval
┌──────────────────────────────────────────────┐
│  Response Compilation                        │
│  ├── Data aggregation                        │
│  ├── Sorting/filtering                       │
│  ├── Pagination                              │
│  └── Metadata injection                      │
└────────┬─────────────────────────────────────┘
         │
         ▼ HTTP Response (JSON)
┌──────────────────────────────────────────────┐
│  React Query Cache Update                    │
│  ├── Store response data                     │
│  ├── Update cache keys                       │
│  ├── Mark as fresh                           │
│  └── Schedule revalidation                   │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│  Component Re-render                         │
│  ├── Update state with new data              │
│  ├── Run useEffect hooks                     │
│  ├── Trigger animations                      │
│  └── Re-render JSX                           │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│  User Interface Update                       │
│  ├── Display new data                        │
│  ├── Update charts                           │
│  ├── Refresh metrics                         │
│  └── Show loading states                     │
└──────────────────────────────────────────────┘
```

### 3.2 Data Aggregation Flow

```
Raw CSV Data (446,535 records)
├── Customer Name Field
├── Field Notice ID Field
├── Month Field
├── Vulnerability Counts (totVuln, potVuln, notVuln)
├── Serial Numbers
└── Asset IDs

    ↓ [CSV Parser & Deduplication]

Cache Layer (In-Memory)
├── Deduplicated Records (~440k after dedup)
├── Index by Customer (20 unique values)
├── Index by Field Notice (500+ FNs)
├── Index by Month (12 months history)
└── Index by Type (various vulnerability types)

    ↓ [Filtering Engine]

Dynamic Filtering (Multiple Filters)
├── Customer Selection
├── Field Notice Selection
├── Date Range Selection
└── Type Filter

    ↓ [Aggregation Engine]

Query Results
├── Metric Aggregation
│   ├── SUM(totVuln) = Total Vulnerable Count
│   ├── SUM(potVuln) = Total Potentially Vulnerable
│   ├── SUM(notVuln) = Total Secure Count
│   └── Total Assets = Sum of all vulnerability categories
│
├── Trend Aggregation
│   ├── GROUP BY Month
│   ├── Monthly totVuln trend
│   ├── Monthly potVuln trend
│   ├── Monthly notVuln trend
│   └── Month-over-month changes
│
├── Top-N Analysis
│   ├── Top 20 Customers by Vulnerability Count
│   ├── Top Field Notices by Asset Impact
│   ├── Risk concentration radar data
│   └── Growth metrics
│
└── Statistical Analysis
    ├── Standard Deviation
    ├── Trend slope (positive/negative)
    ├── Volatility measures
    └── Baseline metrics

    ↓ [Response Serialization]

JSON Response
├── Metrics summary
├── Trend data
├── Top lists
├── Filter metadata
└── Timestamp & versioning
```

### 3.3 AI/ML Analysis Pipeline

```
Dashboard Data (Real-time)
├── Historical monthly trends
├── Current metrics
├── Customer profiles
└── Field notice metadata

    ↓ [ARIMA Forecasting]

Time Series Analysis
├── Seasonal decomposition
├── Trend extraction
├── Pattern identification
└── 30-day projection

    ↓ Output: Forecast with confidence intervals
    
├── Vulnerable Assets Forecast
├── Potentially Vulnerable Forecast
├── Secure Assets Forecast
└── Confidence intervals (95%, 80%, 60%)

    ↓ [Anomaly Detection]

Statistical Analysis
├── Z-score calculation (mean ± 3σ)
├── Isolation Forest (random forests)
├── Time-based anomalies
├── Value-based anomalies
└── Contextual anomalies

    ↓ Output: Anomalies list with severity scores

├── Spikes in vulnerability counts
├── Unusual customer patterns
├── Unexpected trend reversals
└── Rapid changes in security posture

    ↓ [Risk Scoring]

Multi-dimensional Risk Assessment
├── Infrastructure criticality
├── Customer breadth (affected count)
├── Cascading failure risk
├── Compliance exposure
└── Device volume impact

    ↓ Output: Risk scores (0-100 scale)

    ↓ [Cisco CIRCUIT AI Integration]

Enterprise LLM Processing
├── Context injection (metrics + anomalies)
├── Prompt templating
├── Response generation
├── Recommendation synthesis
└── Insight summarization

    ↓ Output: Human-readable analysis

├── Key findings
├── Actionable recommendations
├── Risk assessment narrative
└── Remediation suggestions

    ↓ [Caching & Distribution]

Results Storage
├── In-memory cache (60-second TTL)
├── JSON export (static files)
├── PDF generation (reports)
└── Real-time API responses
```

---

## Infrastructure Requirements

### 4.1 Compute Requirements

#### Development Environment
```
CPU:     4 cores minimum (8 cores recommended)
RAM:     8 GB minimum (16 GB recommended)
Storage: 20 GB SSD (for dependencies, data, logs)
Network: 10 Mbps minimum internet connection
OS:      macOS, Linux, or Windows with WSL2
```

#### Production Environment
```
Frontend Server (Vite SPA):
├── CPU:     2-4 cores
├── RAM:     2-4 GB
├── Storage: 500 MB (build artifacts)
└── Bandwidth: 10 Mbps egress

Backend Server (Node.js/Express):
├── CPU:     4-8 cores (auto-scaling capable)
├── RAM:     8-16 GB (for caching)
├── Storage: 10 GB (logs, temporary files)
├── Bandwidth: 50 Mbps I/O
└── Process: PM2 or similar (process manager)

Database Server (PostgreSQL):
├── CPU:     8-16 cores (dedicated)
├── RAM:     16-32 GB (working set)
├── Storage: 100+ GB SSD (data + indexes + WAL)
├── I/O:     High-performance storage (IOPS 5000+)
└── Backup:  Daily snapshots, point-in-time recovery
```

### 4.2 Network Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    INTERNET                             │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              LOAD BALANCER (TLS/SSL)                    │
│  ├── HTTP → HTTPS redirection                           │
│  ├── Rate limiting (100 req/sec per IP)                 │
│  ├── DDoS protection                                    │
│  └── Health checks (backend)                            │
└────────────────────┬────────────────────────────────────┘
                     │
     ┌───────────────┼───────────────┐
     │               │               │
     ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Frontend    │ │ Frontend    │ │ Frontend    │
│ Server 1    │ │ Server 2    │ │ Server 3    │
│ (React SPA) │ │ (React SPA) │ │ (React SPA) │
└─────────────┘ └─────────────┘ └─────────────┘

Backend API Tier (Internal Network):
┌──────────────────────────────────────────────────┐
│    API LOAD BALANCER (Internal)                  │
└────────────────┬─────────────────────────────────┘
     ┌───────────┼───────────┐
     │           │           │
     ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│Backend 1 │ │Backend 2 │ │Backend 3 │
│(Express) │ │(Express) │ │(Express) │
└────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │
     └────────┬───┴────────────┘
              │
     ┌────────▼────────┐
     │   Connection    │
     │   Pool (5-20)   │
     └────────┬────────┘
              │
     ┌────────▼──────────────┐
     │  PostgreSQL (Primary) │
     └───────────────────────┘
              │
     ┌────────▼────────────────┐
     │ PostgreSQL (Standby -   │
     │ Read Replicas)          │
     └────────────────────────┘
```

### 4.3 Data Storage Tiers

```
Tier 1: Hot Data (In-Memory Cache)
├── Cache: Redis or Node.js memory
├── TTL: 60 seconds
├── Size: ~50 MB (aggregated summaries)
├── Purpose: API response optimization
└── Access: Sub-millisecond latency

Tier 2: Warm Data (PostgreSQL)
├── Database: Primary PostgreSQL instance
├── Size: 10-50 GB (full datasets)
├── Retention: 24-36 months
├── Indexing: Customer, Field Notice, Month, Type
├── Purpose: Persistent storage & queries
└── Access: 1-5 second latency

Tier 3: Cold Data (Archive/Backup)
├── Storage: S3 or similar object store
├── Format: Compressed archives
├── Retention: 7+ years (compliance)
├── Purpose: Historical analysis, audit
└── Access: On-demand (5-30 seconds)

Static Files (GitHub Pages Mode):
├── Format: Pre-computed JSON files
├── Size: 5-20 MB
├── Refresh: Daily batch processing
├── Purpose: Offline/static hosting
└── Access: Immediate (CDN cached)
```

### 4.4 External Dependencies

```
Cisco CIRCUIT API
├── Endpoint: https://api.circuit.cisco.com
├── Authentication: API Key (enterprise key)
├── Rate Limit: 100 requests/minute (configurable)
├── Timeout: 30 seconds per request
├── Purpose: LLM-powered insights & analysis
└── Fallback: Graceful degradation if unavailable

Email Service (Optional)
├── Provider: SMTP-compatible (Sendgrid, AWS SES, etc.)
├── Rate Limit: 100 emails/minute
├── Timeout: 5 seconds per message
├── Purpose: Report delivery, alerts
└── Fallback: In-app notifications

GitHub Integration (Optional)
├── API: GitHub REST API v3
├── Purpose: GitHub Pages deployment
├── Rate Limit: 60 requests/hour (unauthenticated)
└── Fallback: Manual deployment

Web Speech API
├── Provider: Browser native
├── Purpose: Voice input/output
├── Fallback: Text-based interface
└── Availability: Chrome, Edge, Safari
```

---

## Security & Compliance

### 5.1 Authentication & Authorization

```
Authentication Layer:
├── JWT Token-Based Auth
│   ├── Token Format: RS256 (RSA)
│   ├── Expiration: 24 hours
│   ├── Refresh Token: 7 days
│   ├── Payload: User ID, role, permissions
│   └── Storage: HttpOnly cookies (secure)
│
├── Password Security
│   ├── Hashing: bcryptjs (10 salt rounds)
│   ├── Validation: Minimum 12 characters
│   └── Policy: Uppercase + lowercase + number + symbol
│
└── Session Management
    ├── Store: PostgreSQL (connect-pg-simple)
    ├── TTL: 24 hours (idle)
    ├── Tracking: Last activity timestamp
    └── Invalidation: Logout + device wipe

Authorization Layer:
├── Role-Based Access Control (RBAC)
│   ├── sre-admin: Full system access
│   ├── sre-user: Read-only access
│   ├── sre-manager: Read + report generation
│   ├── sre-director: Dashboards + strategic insights
│   └── sre-vp: Executive dashboards
│
├── Endpoint Protection
│   ├── Middleware: Auth middleware on all routes
│   ├── Scope: Verify role → permissions
│   ├── Resource Filtering: User data isolation
│   └── Audit: Log all authorization decisions
│
└── Data Access Control
    ├── Row-level Security (RLS) for multi-tenant scenarios
    ├── Customer isolation (filter by user's customers)
    ├── Field notice restrictions (if applicable)
    └── Time-based access (if applicable)
```

### 5.2 Data Protection

```
In-Transit Encryption:
├── Protocol: TLS 1.3 minimum
├── Certificate: HTTPS with valid SSL/TLS cert
├── Cipher Suites: Strong ciphers (AES-256-GCM)
├── HSTS: Enabled (Strict-Transport-Security header)
└── Certificate Pinning: Optional (high-security deployments)

At-Rest Encryption:
├── Database Encryption: PostgreSQL pgcrypto extension
├── Sensitive Fields: Encrypted (API keys, passwords)
├── Backup Encryption: AES-256 encryption
├── Log Files: Encrypted storage
└── File Upload: Encrypted temporary storage

API Security:
├── Rate Limiting: 100 requests/minute per IP
├── CORS: Whitelist approved origins
├── Input Validation: Strict schema validation
├── SQL Injection Prevention: Parameterized queries (Drizzle ORM)
├── XSS Prevention: Content Security Policy (CSP) headers
└── CSRF Protection: Token-based (SameSite cookies)

Secrets Management:
├── API Keys: Environment variables (not in code)
├── Rotation: Every 90 days (mandatory)
├── Audit Trail: Log all secret access
├── Access Control: Restrict to authorized services
└── Vault: Optional (HashiCorp Vault, AWS Secrets Manager)
```

### 5.3 Compliance Requirements

```
General Data Protection Regulation (GDPR):
├── Consent: Explicit opt-in for data collection
├── Right to Access: User data export capability
├── Right to Deletion: Data erasure (soft delete)
├── Data Breach Notification: 72-hour requirement
├── Data Processing Agreement: In place
└── Data Retention: Configurable policies

Health Insurance Portability & Accountability (HIPAA):
├── Requirement: If handling healthcare data
├── Encryption: Required for all data
├── Access Control: Role-based + MFA
├── Audit Logs: Comprehensive logging (2+ years)
├── Business Associate Agreement: Required
└── Risk Assessment: Annual security assessment

Payment Card Industry (PCI-DSS):
├── Requirement: If processing payment data
├── Network Segmentation: Isolated payment processing
├── Encryption: 256-bit minimum
├── Access Control: Principle of least privilege
├── Vulnerability Management: Quarterly scans
└── Incident Response: 48-hour notification

Service Organization Control (SOC) 2:
├── Type II Audit: Annual or bi-annual
├── Trust Principles: Security, availability, integrity
├── Configuration: Service-level SLAs (99.9% uptime)
├── Change Management: Documented procedures
└── Incident Management: Response procedures in place

Cisco Security Standards:
├── Internal Compliance: Follow Cisco security guidelines
├── Code Review: Security-focused peer review
├── Dependency Scanning: Regular vulnerability scans
├── Penetration Testing: Annual assessments
└── Data Residency: Cisco data center requirements
```

### 5.4 Audit & Logging

```
Audit Logging:
├── Login Events
│   ├── Timestamp, user ID, IP address
│   ├── Success/failure status
│   ├── Reason (if failure)
│   └── Retention: 2 years
│
├── Data Access
│   ├── API calls (GET requests)
│   ├── Report generations
│   ├── Data exports
│   └── Retention: 1 year (non-sensitive), 2 years (sensitive)
│
├── Administrative Actions
│   ├── User management (CRUD)
│   ├── Permission changes
│   ├── Configuration changes
│   ├── System maintenance
│   └── Retention: 2+ years
│
└── Security Events
    ├── Failed authentication attempts
    ├── Rate limit violations
    ├── Unusual data access patterns
    ├── Certificate expiration warnings
    └── Retention: 2 years

Log Management:
├── Centralized Logging: ELK stack, CloudWatch, or Splunk
├── Real-time Alerts: Anomaly detection & correlation
├── Log Encryption: In transit + at rest
├── Log Retention: Configurable per event type
├── Compliance Archival: Immutable archive
└── Analysis: Regular security reviews

Monitoring & Alerting:
├── Performance Metrics
│   ├── API response times (< 2 seconds)
│   ├── Database query times (< 1 second)
│   ├── Error rates (< 0.1%)
│   └── Threshold: Alert if exceeded
│
├── Security Events
│   ├── Failed logins (5+ attempts)
│   ├── Rate limit breaches
│   ├── Privilege escalation attempts
│   └── Alert: Immediate notification
│
└── System Health
    ├── Disk usage (alert at 80%)
    ├── Memory usage (alert at 85%)
    ├── CPU usage (alert at 90%)
    └── Database connectivity (continuous)
```

---

## Alert & Notification Framework

### 6.1 Alert Classification & Criteria

#### 6.1.1 Manager-Level Alerts (Operational)

**Purpose**: Enable managers to monitor team performance and asset security status

| Alert Name | Trigger Condition | Threshold | Notification Frequency | Channel |
|------------|-----------------|-----------|----------------------|---------|
| **Vulnerable Asset Spike** | Daily increase in vulnerable count | >15% day-over-day | Immediate | Email, SMS |
| **High-Risk Field Notice** | Field notice affects >50 customers | >50 affected | Immediate | Dashboard, Email |
| **Remediation Delay** | Vulnerability unresolved >30 days | 30+ days old | Daily (if ongoing) | Email |
| **Customer Risk Alert** | Customer vulnerability exposure | >70 on 0-100 scale | Immediate | Email |
| **Potential Vulnerability Growth** | Potentially vulnerable assets increasing | >20% growth | Daily | Email |
| **Asset Coverage Gap** | Assets not covered by field notices | <80% coverage | Weekly | Email |
| **SLA Breach Risk** | On track to miss remediation SLA | Risk >50% | Immediate | Dashboard |
| **Team Workload Capacity** | Active vulnerabilities requiring attention | >500 items | Daily | Email |

#### 6.1.2 Leadership Team Alerts (Strategic)

**Purpose**: Provide executives with strategic insights and organization-wide risk assessment

| Alert Name | Trigger Condition | Threshold | Notification Frequency | Channel |
|------------|-----------------|-----------|----------------------|---------|
| **Organization Risk Posture** | Overall vulnerability trend analysis | Risk trend shift | Daily (Executive Dashboard) | Dashboard |
| **Enterprise Vulnerability Forecast** | 30-day ARIMA prediction | Negative trend predicted | Weekly | Email, Executive Report |
| **Critical Field Notice Impact** | Field notice affecting infrastructure | >10,000 assets | Immediate | Email, Escalation Call |
| **Customer Satisfaction Risk** | Multiple high-risk customers | >3 customers in red | Daily | Executive Dashboard |
| **Compliance Risk Indicator** | Vulnerability metrics vs. compliance req. | Below threshold | Weekly | Compliance Report |
| **Budget Impact Forecast** | Remediation cost projection | >$5M forecasted | Monthly | Financial Report |
| **Vendor/Partner Risk** | Third-party exposure | Critical finding | Immediate | Email |
| **Anomaly Detection Alert** | Statistical deviation from baseline | >3σ deviation | Immediate | Executive Dashboard |

#### 6.1.3 Service Readiness Engineer Technical Alerts (Tactical)

**Purpose**: Enable technical teams to respond to system health and performance issues

| Alert Name | Trigger Condition | Threshold | Notification Frequency | Channel |
|------------|-----------------|-----------|----------------------|---------|
| **System Health Degradation** | API availability drop | <99.0% | Immediate | PagerDuty, Slack |
| **Database Performance** | Query response time increase | >5 seconds p95 | Immediate | Slack, Dashboard |
| **Cache Hit Rate Low** | Cache effectiveness | <70% hit rate | 5-minute intervals | Monitoring Dashboard |
| **Memory Utilization** | RAM usage on backend servers | >85% | Immediate | Slack, PagerDuty |
| **Error Rate Spike** | API error rate increase | >1% (500+ errors) | Immediate | PagerDuty |
| **AI/ML Service Latency** | Cisco CIRCUIT API response time | >10 seconds | Immediate | Slack |
| **Data Pipeline Failure** | CSV data import failure | Import timeout | Immediate | Email, Slack |
| **SSL/TLS Certificate** | Certificate expiration warning | <30 days to expiry | Weekly | Email |
| **Dependency Vulnerability** | Known CVE in dependencies | Critical severity | Immediate | Email, Dashboard |
| **Storage Capacity** | Disk usage on database server | >80% | Daily | Email |
| **Backup Failure** | Database backup job failure | Failed job | Immediate | Email, PagerDuty |
| **API Rate Limit** | Upstream API rate limits | Approaching limit | Hourly | Slack |

### 6.2 Alert Escalation Paths

```
Severity Levels:
├── CRITICAL (P1)
│   ├── SLA Response: 15 minutes
│   ├── Resolution Target: 1 hour
│   ├── Escalation: Immediate to on-call engineer
│   ├── Channels: PagerDuty + SMS + Call
│   └── Examples: System outage, data loss risk, security breach
│
├── HIGH (P2)
│   ├── SLA Response: 30 minutes
│   ├── Resolution Target: 4 hours
│   ├── Escalation: On-call engineer + team lead
│   ├── Channels: Slack, Email, Dashboard
│   └── Examples: API degradation, high error rates, performance issues
│
├── MEDIUM (P3)
│   ├── SLA Response: 2 hours
│   ├── Resolution Target: 1 business day
│   ├── Escalation: Team lead review
│   ├── Channels: Email, Dashboard
│   └── Examples: Minor issues, non-critical alerts, warnings
│
└── LOW (P4)
    ├── SLA Response: 1 business day
    ├── Resolution Target: 1 week
    ├── Escalation: Backlog item
    ├── Channels: Dashboard, weekly report
    └── Examples: Informational, future improvements
```

### 6.3 Notification Delivery Channels

```
Channel Configuration:

Email (SMTP):
├── Service: SMTP relay (Sendgrid, AWS SES)
├── Recipients: Individual users + distribution lists
├── Template: HTML formatted with branding
├── Retry: 3 attempts over 30 minutes
├── Rate Limit: 100 emails/minute
└── Latency: 30-60 seconds

SMS (Emergency):
├── Service: Twilio or similar provider
├── Recipients: On-call engineers only
├── Format: Concise with link to dashboard
├── Retry: Immediate retry if failed
├── Rate Limit: 10 SMS/minute per user
└── Latency: 5-15 seconds

Slack Integration:
├── Channel: #sre-alerts (critical alerts)
├── Thread: Organized by severity/category
├── Format: Slack blocks with rich formatting
├── Retry: Slack webhook retry (5 attempts)
├── Rate Limit: Per workspace limits
└── Latency: 1-5 seconds

PagerDuty Integration:
├── Service: On-call scheduling
├── Trigger: Critical/High severity alerts
├── Escalation: Policy-driven escalation
├── Acknowledgment: Required for critical
├── Retention: 30-day incident history
└── Latency: 1-3 seconds

Dashboard Notifications:
├── Type: In-app toast notifications
├── Duration: 5 seconds (auto-dismiss)
├── Persistence: Alert history panel
├── Action: 1-click acknowledgment
└── Latency: Real-time

Executive Report (Daily):
├── Format: PDF email + web portal
├── Recipients: C-level executives
├── Content: Summary of top issues + KPIs
├── Frequency: 8:00 AM daily
└── Personalization: By department/region
```

### 6.4 Response Protocols

```
Manager-Level Alert Response:
1. Receive notification (email/SMS/dashboard)
2. Log into dashboard to view details
3. Review affected assets/customers
4. Escalate to technical team if needed
5. Track remediation progress
6. Update stakeholders on status

Leadership-Level Alert Response:
1. Daily executive dashboard review (8:00 AM)
2. Weekly risk posture report (Friday 5:00 PM)
3. Escalation: Review monthly trends
4. Action: Strategic planning meetings
5. Reporting: Board-level updates (quarterly)

Service Readiness Engineer Technical Response:
1. Alert notification (PagerDuty/Slack)
2. Acknowledge alert (<5 minutes)
3. Investigate root cause (<15 minutes)
4. Implement fix or mitigation
5. Verify resolution (system health)
6. Post-incident review (24 hours)
7. Documentation (runbook update)
8. Prevention (change to prevent recurrence)
```

### 6.5 Implementation Architecture

```
Alert System Components:

Frontend (React):
├── AlertProvider (Context API)
├── Toast Notifications
├── Alert History Panel
├── Configuration UI (Admin only)
└── Preference Management

Backend (Express):
├── Alert Configuration Service
│   ├── CRUD operations
│   ├── Validation & testing
│   └── Scheduling
│
├── Alert Evaluation Engine
│   ├── Metric polling (every 60 seconds)
│   ├── Threshold comparison
│   ├── Anomaly detection
│   └── Condition evaluation
│
├── Notification Service
│   ├── Channel routing
│   ├── Template rendering
│   ├── Delivery management
│   └── Retry logic
│
├── Escalation Service
│   ├── On-call schedule lookup
│   ├── Escalation policy execution
│   ├── SLA tracking
│   └── Acknowledgment tracking
│
└── Audit & History
    ├── Alert event logging
    ├── Delivery confirmation
    ├── Response tracking
    └── Analytics (alert frequency, response time)

Database Schema:
├── alert_configurations
│   ├── id, name, type, condition
│   ├── notification_channels, recipients
│   ├── is_active, created_by, created_at
│   └── updated_at
│
├── alert_history
│   ├── id, config_id, triggered_at
│   ├── condition_values, status
│   └── acknowledged_by, acknowledged_at
│
├── alert_deliveries
│   ├── id, alert_history_id, channel
│   ├── recipient, status, sent_at
│   └── delivery_error (if failed)
│
└── on_call_schedules
    ├── id, user_id, start_time, end_time
    ├── timezone, contact_methods
    └── escalation_policy_id
```

---

## Critical Enhancements Roadmap

### 7.1 High-Priority Enhancements (Q1 2026)

#### 7.1.1 Real-Time Alerting Engine (Priority: CRITICAL)

**Business Impact**: Enables immediate response to security threats

**Scope**:
- Implement WebSocket real-time alert delivery
- Add alert acknowledgment & snooze functionality
- Create alert management UI (create, edit, disable)
- Integrate with PagerDuty, Slack, email

**Technical Requirements**:
- WebSocket library (Socket.io or native WebSocket)
- Message queue (Redis pub/sub or RabbitMQ)
- Scheduled task runner (node-cron enhancement)
- Notification service (Twilio, SMTP, Slack API)

**Estimated Timeline**: 4-6 weeks  
**Resource Requirements**: 2 engineers (backend + frontend)  
**Estimated Cost**: $40-60K

**Implementation Phases**:
```
Phase 1 (Week 1-2): Backend Infrastructure
├── WebSocket server setup
├── Message queue implementation
├── Notification service integration
└── Database schema updates

Phase 2 (Week 2-3): Alert Evaluation Engine
├── Metric monitoring loop
├── Threshold evaluation
├── Anomaly detection integration
└── Alert triggering logic

Phase 3 (Week 3-4): Notification Delivery
├── Multi-channel routing
├── Template rendering
├── Retry logic implementation
└── Delivery confirmation tracking

Phase 4 (Week 4-5): Frontend UI
├── Alert configuration form
├── Alert history view
├── Notification preferences
└── Real-time notification display

Phase 5 (Week 5-6): Testing & Hardening
├── Integration testing
├── Load testing (1000+ concurrent alerts)
├── Failover testing
└── Production deployment
```

#### 7.1.2 Advanced Role-Based Access Control (RBAC) (Priority: HIGH)

**Business Impact**: Improve security posture and compliance

**Scope**:
- Granular permission system (not just roles)
- Resource-level access control
- Audit all access decisions
- User activity tracking per customer/field-notice

**Current Roles**:
```
sre-admin    - Full system access
sre-user     - Read-only access
sre-manager  - Read + reports
sre-director - Strategic dashboards
sre-vp       - Executive dashboards
```

**Enhanced Permissions**:
```
Metrics
├── view_summary
├── view_details
├── view_customer_metrics
└── view_trends

Reports
├── generate_pdf
├── export_csv
├── schedule_reports
└── share_reports

Administration
├── manage_users
├── configure_alerts
├── manage_integrations
└── view_audit_logs

Customers (Multi-tenant)
├── view_own_customers
├── view_all_customers
├── edit_customer_config
└── manage_assignments

Field Notices
├── view_all
├── view_assigned_only
├── update_status
└── manage_relationships
```

**Estimated Timeline**: 3-4 weeks  
**Resource Requirements**: 2 engineers  
**Estimated Cost**: $30-40K

#### 7.1.3 Multi-Tenant Customer Isolation (Priority: HIGH)

**Business Impact**: Support multiple organizations within single deployment

**Scope**:
- Data isolation by customer/organization
- Row-level security (RLS) in PostgreSQL
- Customer-specific dashboards
- Billing/usage tracking per customer

**Implementation**:
```
Customer Association:
├── Add customer_id to all data tables
├── Enforce filter on all queries
├── Customer-specific API keys
└── Tenant context in JWT token

Data Isolation:
├── PostgreSQL RLS policies
├── Automatic customer filtering
├── Prevent cross-customer access
└── Audit isolation violations

UI Customization:
├── Customer logo/branding
├── Custom dashboard views
├── Customer-specific KPIs
└── Billing information display
```

**Estimated Timeline**: 4-6 weeks  
**Resource Requirements**: 3 engineers (DB + backend + frontend)  
**Estimated Cost**: $50-70K

### 7.2 Medium-Priority Enhancements (Q2 2026)

#### 7.2.1 Advanced Anomaly Detection (Priority: MEDIUM)

**Business Impact**: Detect abnormal patterns automatically

**Scope**:
- Machine learning-based anomaly detection
- Contextual anomaly identification
- Customizable anomaly thresholds
- Anomaly trend analysis

**Algorithms**:
- Isolation Forest (current implementation)
- DBSCAN (density-based clustering)
- Autoencoders (deep learning)
- Time-series specific (Prophet, LSTM)

**Estimated Timeline**: 6-8 weeks  
**Resource Requirements**: 2 ML engineers + 1 backend engineer  
**Estimated Cost**: $60-80K

#### 7.2.2 Predictive Risk Scoring (Priority: MEDIUM)

**Business Impact**: Predict future vulnerabilities

**Scope**:
- Customer risk score projection (30-90 days)
- Field notice impact prediction
- Remediation timeline estimation
- Customer likelihood to improve ranking

**Models**:
- Linear regression (remediation velocity)
- Gradient boosting (customer risk)
- Time-series forecasting (enhancement)
- Classification models (improvement likelihood)

**Estimated Timeline**: 4-6 weeks  
**Resource Requirements**: 1 ML engineer + 1 backend engineer  
**Estimated Cost**: $40-60K

#### 7.2.3 Integration Framework (Priority: MEDIUM)

**Business Impact**: Connect to external systems

**Scope**:
- Webhook support for external callbacks
- API for third-party integrations
- OAuth 2.0 authentication for partners
- Integration marketplace (app store)

**Integrations**:
- ITSM (ServiceNow, Jira Service Desk)
- Ticketing (Jira, GitHub Issues)
- Monitoring (DataDog, New Relic)
- Communication (Microsoft Teams, Slack)
- SIEM (Splunk, ELK)

**Estimated Timeline**: 6-8 weeks  
**Resource Requirements**: 2 backend engineers  
**Estimated Cost**: $50-70K

### 7.3 Lower-Priority Enhancements (Q3 2026)

#### 7.3.1 Advanced Visualization & Analytics

**Business Impact**: Better insights through data visualization

**Scope**:
- Interactive maps (geographic distribution)
- Sankey diagrams (vulnerability flow)
- Heat maps (risk concentration)
- Custom chart builder

**Libraries**:
- Visx (low-level building blocks)
- Plotly (advanced charts)
- Observable Plot (statistical graphics)
- Deck.gl (large-scale mapping)

**Estimated Timeline**: 4-6 weeks  
**Resource Requirements**: 2 frontend engineers  
**Estimated Cost**: $30-50K

#### 7.3.2 AI/ML Model Training Pipeline

**Business Impact**: Continuously improve predictions

**Scope**:
- Automated model retraining (weekly)
- Model performance tracking
- A/B testing for models
- Model versioning & rollback

**Implementation**:
- MLflow (model tracking)
- Scikit-learn/TensorFlow (training)
- Airflow (orchestration)
- Model registry

**Estimated Timeline**: 6-8 weeks  
**Resource Requirements**: 2 ML engineers  
**Estimated Cost**: $60-80K

#### 7.3.3 Mobile Application

**Business Impact**: Access dashboard on mobile devices

**Scope**:
- React Native or Flutter app
- Push notifications
- Offline support
- Touch-optimized UI

**Estimated Timeline**: 8-10 weeks  
**Resource Requirements**: 2 mobile engineers  
**Estimated Cost**: $50-80K

### 7.4 Enhancement Prioritization Matrix

```
Impact vs. Effort Analysis:

                    HIGH EFFORT
                        ↑
                        │
    Placeholder    ├─────────────────┤
    Future Tasks   │                 │
                   │   Real-Time     │ Advanced ML
                   │   Alerting      │ Training
                   │   (Quick Win)   │ Pipeline
                   │                 │
    MEDIUM EFFORT  ├─────────────────┤
                   │   Advanced      │ Mobile App
                   │   Anomaly       │
                   │   Detection     │
                   │   Risk Scoring  │
                   │                 │
    LOW EFFORT     ├─────────────────┤
                   │   Visualization │
                   │   RBAC          │
                   │                 │
                   └────────────────→ HIGH IMPACT
```

### 7.5 Technical Debt & Refactoring

**Priority Areas**:
1. **Test Coverage**: Increase from 45% to 80%+ (2-3 weeks)
2. **Code Organization**: Refactor component structure (2 weeks)
3. **Performance**: Optimize bundle size, reduce re-renders (2 weeks)
4. **Documentation**: Update architecture docs, add ADRs (1 week)
5. **Dependency Updates**: Keep packages current (ongoing)

---

## Change Log

### Version 1.0.0 (January 7, 2026)
- **Initial Release**: Comprehensive system architecture documentation
- **Components**:
  - System Overview & Architecture Diagrams
  - Component Hierarchy & Data Flow
  - Infrastructure Requirements
  - Security & Compliance Framework
  - Alert & Notification System Specifications
  - Critical Enhancements Roadmap
- **Status**: Ready for stakeholder review

### Version 0.9.0 (Draft)
- Initial documentation framework
- Architecture analysis
- Component specifications

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| **SRE** | Service Readiness Engineer - operational engineering role |
| **KPI** | Key Performance Indicator - quantifiable metric |
| **JWT** | JSON Web Token - authentication mechanism |
| **RBAC** | Role-Based Access Control - permission system |
| **ARIMA** | AutoRegressive Integrated Moving Average - forecasting model |
| **RLS** | Row-Level Security - database access control |
| **TTL** | Time To Live - cache expiration time |
| **ORM** | Object-Relational Mapping - database abstraction |
| **SLA** | Service Level Agreement - uptime/performance guarantee |
| **CSP** | Content Security Policy - security header |
| **API Key** | Authentication credential for API access |
| **Anomaly** | Deviation from expected pattern |
| **Field Notice** | Cisco notification of product issues/vulnerabilities |

---

## Appendix B: Acronyms

| Acronym | Expansion |
|---------|-----------|
| **REST** | Representational State Transfer |
| **HTTPS** | HyperText Transfer Protocol Secure |
| **TLS** | Transport Layer Security |
| **SQL** | Structured Query Language |
| **JSON** | JavaScript Object Notation |
| **XML** | eXtensible Markup Language |
| **CORS** | Cross-Origin Resource Sharing |
| **XSS** | Cross-Site Scripting |
| **CSRF** | Cross-Site Request Forgery |
| **GDPR** | General Data Protection Regulation |
| **HIPAA** | Health Insurance Portability & Accountability Act |
| **PCI-DSS** | Payment Card Industry Data Security Standard |
| **SOC 2** | Service Organization Control Level 2 |
| **MFA** | Multi-Factor Authentication |
| **SSO** | Single Sign-On |
| **ITSM** | IT Service Management |
| **SIEM** | Security Information & Event Management |

---

## Document Review & Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Technical Lead | TBD | | |
| Security Lead | TBD | | |
| Product Manager | TBD | | |
| Executive Sponsor | TBD | | |

---

**Document End**  
For questions or updates, contact the Development Team.
