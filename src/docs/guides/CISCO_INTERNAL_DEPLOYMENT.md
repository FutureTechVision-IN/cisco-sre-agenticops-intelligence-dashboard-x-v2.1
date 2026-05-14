# Cisco SRE AgenticOps Intelligence Dashboard - Internal Deployment

## Overview
This is a **Cisco-internal-only application** for Service Readiness Engineering and security operations. All external 3rd party services have been removed and replaced with Cisco internal infrastructure.

## ✅ Changes Made

### 1. Replaced External AI Service
- **Removed**: Google Gemini API
- **Added**: Cisco CIRCUIT AI API
- **API Key**: configured via `CISCO_CIRCUIT_API_KEY` environment variable (see `.env.example`)
- **Endpoint**: `https://circuit.cisco.com/api/v1`
- **File**: `backend/cisco-circuit.ts` (renamed from `gemini.ts`)

### 2. Removed External Deployment Platforms
**Deleted all references to:**
- ❌ Replit
- ❌ Railway.app
- ❌ Render.com
- ❌ Vercel
- ❌ Heroku
- ❌ Google Cloud / Gemini

**Files Removed:**
- `railway.json`
- `render.yaml`
- `DEPLOYMENT_OPTIONS.md`
- `replit.md`
- Replit vite plugins from `vite.config.ts`

### 3. Package Updates
- **Removed**: `@google/genai` (62 packages uninstalled)
- **Updated**: `package.json` and `package-lock.json`

### 4. Configuration Updates
- **Updated**: `.env.example` with Cisco-only variables
- **API Integration**: All AI features now use Cisco CIRCUIT API
- **Removed**: All external service environment variables

## 🔧 Environment Variables

```bash
# Cisco CIRCUIT API Configuration
CISCO_CIRCUIT_API_KEY=<your-cx-summarize-key>        # rotate if compromised
CISCO_CIRCUIT_WORKFLOW_KEY=<your-workflow-key>       # rotate if compromised
CISCO_CIRCUIT_ENDPOINT=https://circuit.cisco.com/api/v1

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cisco_sre_dashboard

# Server Configuration
PORT=8001
NODE_ENV=production

# Session Secret (change in production)
SESSION_SECRET=cisco-sre-dashboard-secret-key-change-in-production
```

## 🚀 Deployment Options for Cisco Internal Infrastructure

### Option 1: Cisco Private Cloud
Deploy to Cisco's internal private cloud infrastructure:
- Use Cisco DevOps pipeline
- Connect to internal PostgreSQL service
- Use Cisco internal DNS for routing
- Requires Cisco VPN for access

### Option 2: On-Premises Cisco Data Center
Deploy to physical servers in Cisco data centers:
- Coordinate with Cisco IT Infrastructure team
- Use internal load balancers
- Connect to internal database clusters
- Full control over deployment

### Option 3: Cisco Kubernetes Cluster
Deploy as containerized application:
```bash
# Build Docker image
docker build -t cisco-sre-dashboard:1.1.0 .

# Deploy to Cisco K8s cluster
kubectl apply -f cisco-k8s-deployment.yaml
```

### Option 4: Local Development (Current)
- ✅ Currently running on `http://localhost:8001`
- ✅ Full functionality with PostgreSQL
- ✅ Access via Cisco VPN
- ✅ No external dependencies

## 📊 Cisco CIRCUIT API Integration

### Endpoints Integrated

1. **Text Summarization**
   - Endpoint: `/api/v1/summarize`
   - Used for: Vulnerability analysis summaries

2. **Analysis**
   - Endpoint: `/api/v1/analyze`
   - Used for: Security risk assessment

3. **Recommendations**
   - Endpoint: `/api/v1/recommendations`
   - Used for: AI-powered security recommendations

### API Features
- ✅ Cisco authentication
- ✅ Internal network only
- ✅ Fallback logic if API unavailable
- ✅ Automatic error handling

## 🔐 Security

### Cisco Internal Only
- All services run on Cisco internal network
- No external API calls
- No 3rd party data transmission
- Cisco VPN required for access

### Data Privacy
- All vulnerability data stays within Cisco network
- No external AI services process Cisco data
- Database hosted on Cisco internal infrastructure
- Complies with Cisco security policies

## 📝 Next Steps

### For Production Deployment:

1. **Contact Cisco IT**
   - Submit deployment request to Cisco DevOps team
   - Request internal database provisioning
   - Obtain production SSL certificates

2. **Update Configuration**
   - Set production `CISCO_CIRCUIT_API_KEY`
   - Configure production database URL
   - Update `SESSION_SECRET`
   - Set `NODE_ENV=production`

3. **Network Setup**
   - Configure internal DNS entry
   - Set up load balancing
   - Enable Cisco VPN access rules
   - Configure firewall rules

4. **Monitoring**
   - Set up Cisco AppDynamics monitoring
   - Configure Splunk logging
   - Enable Cisco ThousandEyes monitoring
   - Set up alert notifications

## 📞 Support

### Cisco Internal Contacts:
- **DevOps Team**: Submit ticket via Cisco IT portal
- **Database Team**: For PostgreSQL provisioning
- **Network Team**: For DNS and routing
- **Security Team**: For security approval

### Application Support:
- **Repository**: Cisco internal GitHub Enterprise
- **Documentation**: This file and related docs
- **Issues**: Use GitHub Issues in internal repo

---

## ✅ Verification Checklist

- [x] All external service references removed
- [x] Google Gemini replaced with Cisco CIRCUIT API
- [x] Replit dependencies removed
- [x] Railway/Render configs deleted
- [x] Environment variables updated
- [x] Package dependencies cleaned
- [x] API key updated to Cisco CIRCUIT
- [x] All functionality tested locally
- [x] Documentation updated

---

**Status**: Ready for Cisco internal deployment  
**Version**: 1.1.0  
**Last Updated**: November 26, 2025  
**Cisco Confidential**
