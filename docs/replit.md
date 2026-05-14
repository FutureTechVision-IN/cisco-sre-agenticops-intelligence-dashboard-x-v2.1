# SRE AgenticOps Intelligence Dashboard

## Overview

The SRE AgenticOps Intelligence Dashboard is an enterprise-grade vulnerability analysis platform designed for Cisco Systems. It provides AI/ML-powered intelligence for managing field notices, customer vulnerability assessments, and security insights across a large dataset. The system combines real-time data processing with predictive analytics, anomaly detection, and automated report generation to support Service Readiness Engineering operations.

The platform serves as a comprehensive intelligence center for tracking three vulnerability states (vulnerable, potentially vulnerable, and not vulnerable) across numerous customers and field notices, delivering actionable insights through interactive dashboards, PDF reports, and scheduled email alerts.

## User Preferences

Preferred communication style: Simple, everyday language. Silent admin unlock (no visual click counter).

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **State Management**: TanStack Query (React Query) for server state and caching
- **Styling**: Tailwind CSS with custom design system
- **Form Handling**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization
- **Design System**: Plus Jakarta Sans and JetBrains Mono fonts, blue-based HSL color palette, mobile-first responsive design.

### Backend Architecture

**Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES Modules
- **API Pattern**: RESTful endpoints with JSON responses
- **Session Management**: Express-session with PostgreSQL store
- **Security**: JWT tokens with bcrypt password hashing
- **File Processing**: Node.js streams for large CSV imports
- **Email**: Internal SMTP via nodemailer (no 3rd party services)

**Core Services**:
- **Storage Layer**: In-memory caching with database fallback, metrics aggregation, record CRUD operations.
- **Alert Service**: Internal SMTP email delivery, SHA-256 alert deduplication, severity classification, audit logging, and acknowledgment tracking.
- **Report Service**: Scheduled report generation (weekly/monthly/quarterly/half-yearly/yearly), PDF generation with metrics snapshots, execution history tracking, automatic email delivery.
- **Alert Scheduler**: Cron-based job orchestration for daily report generation, anomaly detection, and threshold monitoring.
- **AI/ML Engine**: ARIMA-based time series forecasting, statistical anomaly detection, NLP analysis of field notice descriptions, health scoring algorithms, confidence interval calculations.
- **PDF Generation**: PDFKit-based document creation with smart pagination, content tracking, and professional formatting.
- **Data Validation**: Automated test suite for data integrity, record count verification, format compliance, and audit trail generation.

### API Optimization Layer (NEW - Nov 23, 2025)

**Rate Limiting & Caching**:
- **Token Bucket Algorithm**: 12 API calls/minute per user with automatic token refill
- **Intelligent Cache**: TTL-based caching with hit tracking and automatic expiration
- **Concurrent User Support**: Fair token distribution across active users
- **Response Time Optimization**: <500ms SLA for cached responses

**Decision Matrix** (`api-integration-matrix.ts`):
- 14 operation categories with API vs built-in recommendations
- Automatic fallback mechanisms when rate limits approached
- Priority-based request handling (high/medium/low)
- Cost-aware operation sequencing

**Monitoring & Analytics** (`api-monitoring.ts`):
- Real-time API usage tracking and analytics
- Cache hit rate monitoring with top-10 endpoint stats
- SLA penetration tracking (% of requests under 500ms)
- Health check system with risk metrics
- Concurrency optimization recommendations

**Middleware Integration**:
- Automatic request tracking and response monitoring
- Cache hit/miss headers in responses
- Response time telemetry per endpoint
- User-based rate limit tracking

### Data Storage

**Database**: PostgreSQL (via Neon serverless)
- **ORM**: Drizzle ORM with type-safe queries
- **Schema**: Extended to include reporting and alerting tables with indexing.
- **Migration Strategy**: Drizzle Kit.

**Schema Design**: Includes tables for Field Notice Records (id, field_notice_id, first_published, fn_title, fn_type, tot_vuln, pot_vuln, not_vuln, cpy_key, customer_name, created_at) and Alerting & Reporting (alerts, alertDeduplication, alertAuditLogs, reports, reportExecutions).

**Data Import**: CSV processing with stream-based parsing, batch insertion, duplicate detection, error logging, and auto-seeding.

### Authentication & Authorization

**Strategy**: JWT-based authentication with role-based access control (RBAC).
**User Roles**: `sre-admin`, `sre-manager`, `sre-director`, `sre-vp`, `sre-user`.
**Session Management**: PostgreSQL-backed session store, cookie-based tracking, secure password hashing, session expiration and refresh handling.
**Admin Unlock**: Silent 5-click unlock on admin badge badge to access Configuration section.

### Email & Alerts

**Internal SMTP Only**: Nodemailer integration with configurable SMTP server. Alert types include Proactive, Reactive, and Critical, with deduplication, audit trails, and acknowledgment tracking.

**Email Recipients** (NEW - Nov 23, 2025):
- **Alert Recipients**: Configurable list of emails to receive anomaly and threshold alerts (every 15 min & hourly)
- **Report Recipients**: Configurable list of emails to receive scheduled reports (weekly/monthly/quarterly/half-yearly/yearly)
- Configuration via admin UI with multi-line email input
- Environment variables: `ALERT_RECIPIENTS` and `REPORT_RECIPIENTS` (comma-separated)

### AI/ML Intelligence Features

**Predictive Analytics**: 30-day forecasting with exponential smoothing and confidence intervals.
**Anomaly Detection**: Real-time deviation monitoring, severity classification, root cause analysis, and risk scoring.
**Health Scoring**: Overall health scores per KPI, trend indicators, stability percentages, and predictability scores.
**NLP Analysis**: Field notice text processing, common vulnerability pattern extraction, component-level frequency analysis, and urgency scoring.

### Report Generation System

**PDF Reports**: Professional formatting with branding, smart pagination, AI/ML intelligence sections, and multi-page support.
**Export Formats**: CSV and PDF. Excel export is planned.
**Pre-Export Validation**: Data completeness checks, field-by-field validation, executive summary generation, and quality metrics calculation.

## External Dependencies

### Third-Party Services

**None** (per Cisco policy). All services, including email, are handled internally.

### NPM Packages

**Core Framework**: `express`, `react`, `vite`.
**Database & ORM**: `drizzle-orm`, `@neondatabase/serverless`, `connect-pg-simple`.
**Authentication**: `jsonwebtoken`, `bcryptjs`, `express-session`.
**Email & Scheduling**: `nodemailer`, `node-cron`.
**UI Components**: `@radix-ui/*`, `@tanstack/react-query`, `tailwindcss`.
**Data Processing**: `csv-parse`, `pdfkit`, `drizzle-kit`.
**Development Tools**: `typescript`, `tsx`, `@testing-library/*`.

### Environment Variables

**Required**: `DATABASE_URL`.
**Optional**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`, `ALERT_FROM_EMAIL`, `ALERT_RECIPIENTS`, `REPORT_RECIPIENTS`, `SESSION_SECRET`, `NODE_ENV`.

## Recent Changes (Nov 23, 2025)

### API Optimization Implementation
- Created `server/api-optimizer.ts` with token bucket rate limiter and intelligent caching
- Created `server/api-integration-matrix.ts` with 14-operation decision matrix for API vs built-in
- Created `server/api-monitoring.ts` for usage analytics, health checks, and concurrency optimization
- Updated `server/routes.ts` to integrate optimization middleware and monitoring endpoints
- Implemented automatic cache hit/miss tracking in response headers
- Added `/api/admin/monitoring/*` endpoints for real-time analytics and system health
- Fixed Header.tsx to remove visible click counter for silent admin unlock

### Email Recipient Management (Nov 23, 2025)
- Added Alert Recipients and Report Recipients fields to Configuration UI
- Implemented textarea inputs for multi-line email configuration
- Environment variables `ALERT_RECIPIENTS` and `REPORT_RECIPIENTS` set automatically
- Email config routes updated to persist recipient lists
- Recipients displayed in "Current Configuration" read-only section

## Next Steps (Recommended)

1. **Test Rate Limiting**: Verify 12 API calls/minute enforcement for concurrent users
2. **Monitor Cache Hit Rates**: Use `/api/admin/monitoring/usage-report` to track optimization effectiveness
3. **Optimize High-Cost Operations**: Review Decision Matrix to reduce API call costs for high-frequency operations
4. **Configure Email Recipients**: Add team emails in Configuration > Email Notifications
5. **Performance Tuning**: Adjust cache TTLs based on monitoring analytics
6. **Production Deployment**: Ensure rate limiter and cache are properly distributed across instances
