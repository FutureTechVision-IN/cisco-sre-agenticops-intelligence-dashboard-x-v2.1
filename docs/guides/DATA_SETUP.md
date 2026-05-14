# 📊 Data Setup Guide - Cisco SRE AgenticOps Intelligence Dashboard

## Overview

This document describes how to handle large data files for the Cisco SRE AgenticOps Intelligence Dashboard. Due to GitHub Enterprise file size limitations (100MB max), large datasets are managed separately from the main repository.

## 🚨 Important Notice

**Git LFS is disabled** on Cisco GitHub Enterprise for security compliance. Large data files must be managed through alternative secure channels.

## 📁 Data File Structure

```
data/
├── vulnerability_data.csv              # 94MB - Main vulnerability dataset
├── processed/
│   ├── vulnerability_data_cleaned.csv  # 82MB - Processed data
│   └── rejected_rows.csv              # 18MB - Validation rejects
└── samples/                           # Sample data for testing

attached_assets/
├── filtered_bcs_apr25-sep25_2025_apr-sep_1763810216515.csv  # 125MB
├── filtered_bcs_apr25-sep25_2025_apr-sep_1763934328424.csv  # 125MB  
├── filtered_bcs_apr25-sep25_2025_apr-sep_1763978174804.csv  # 125MB
├── filtered_bcs_apr25-sep25_2025_apr-sep_1763978622704.csv  # 125MB
└── filtered_bcs_apr25-sep25_2025_apr-sep_1763979225097.csv  # 125MB
```

## 🔽 Data Download Methods

### Method 1: Automated Download Script

```bash
# Run the automated download script
./scripts/download-data.sh

# This script will:
# - Check for existing data files
# - Provide download instructions
# - Validate data integrity
# - Display setup status
```

### Method 2: Manual Download from Cisco Systems

#### Option A: Cisco SharePoint/OneDrive
1. Navigate to: `https://cisco.sharepoint.com/sre-data/`
2. Download files to appropriate directories
3. Verify file integrity

#### Option B: Cisco Internal Storage
```bash
# Connect to Cisco VPN
# Access secure file server
scp user@cisco-data-server:/data/sre-dashboard/* ./data/
```

#### Option C: Cisco Artifactory
```bash
# Using Cisco Artifactory
curl -u username:token \
  "https://artifactory.cisco.com/sre-data/vulnerability_data.csv" \
  -o data/vulnerability_data.csv
```

### Method 3: Generate Sample Data (For Testing)

```bash
# Create sample datasets for development/testing
./scripts/generate-sample-data.sh

# This creates smaller, representative datasets:
# - vulnerability_data_sample.csv (5MB)
# - filtered_bcs_sample.csv (10MB)
```

## 🔐 Security Considerations

### Data Classification
- **Confidential**: All vulnerability data
- **Internal Use**: BCS filtered datasets  
- **Restricted**: Contains security-sensitive information

### Access Controls
- **VPN Required**: All data downloads require Cisco VPN
- **Authentication**: Use Cisco SSO credentials
- **Audit Trail**: All access is logged
- **Encryption**: Data encrypted in transit and at rest

### Compliance Requirements
- **Data Retention**: Follow Cisco data retention policies
- **Geographic Restrictions**: Data may have regional access limits
- **Export Controls**: Some datasets subject to export regulations

## 🛠️ Setup Instructions

### 1. Initial Setup
```bash
# Clone the repository (code only)
git clone git@cisco-dashboard-github:bipbabu/cisco-sre-agenticops-intelligence-dashboard-x.git
cd cisco-sre-agenticops-intelligence-dashboard-x

# Download data files
./scripts/download-data.sh
```

### 2. Verify Data Integrity
```bash
# Check file sizes and checksums
./scripts/verify-data-integrity.sh

# Expected file sizes:
# vulnerability_data.csv: 94MB
# vulnerability_data_cleaned.csv: 82MB
# Each filtered_bcs_*.csv: 125MB
```

### 3. Configure Data Sources
```bash
# Update data configuration
cp config/data.example.json config/data.json
# Edit paths and connection details
```

### 4. Test Dashboard
```bash
# Start dashboard with sample data
./start.sh --sample-data

# Or start with full dataset
./start.sh --production
```

## 📈 Data Management Workflow

### For Developers
1. **Development**: Use sample data (`--sample-data` flag)
2. **Testing**: Use subset of production data
3. **Production**: Full dataset with proper security clearance

### For Data Updates
```bash
# 1. Update source data in secure location
# 2. Run data processing pipeline
./scripts/process-vulnerability-data.sh

# 3. Generate filtered datasets
./scripts/generate-filtered-bcs.sh

# 4. Upload to secure storage
./scripts/upload-to-secure-storage.sh
```

### For Backup and Recovery
```bash
# Backup current data
./scripts/backup-data.sh

# Restore from backup
./scripts/restore-data.sh --date 2025-11-25
```

## 🚨 Troubleshooting

### Common Issues

**Issue**: Files not downloading
```bash
# Solution: Check VPN and credentials
./scripts/check-connectivity.sh
```

**Issue**: Data integrity errors  
```bash
# Solution: Re-download corrupted files
./scripts/download-data.sh --force-refresh
```

**Issue**: Insufficient disk space
```bash
# Solution: Clean up old data
./scripts/cleanup-old-data.sh
```

### Support Contacts

- **Data Access Issues**: sre-data-support@cisco.com
- **Security Questions**: security-ops@cisco.com  
- **Technical Support**: sre-dashboard-support@cisco.com

## 📋 Data Dictionary

### vulnerability_data.csv
- **Records**: ~500,000 vulnerability entries
- **Fields**: CVE ID, CVSS Score, Affected Systems, Remediation Status
- **Update Frequency**: Daily
- **Retention**: 2 years

### filtered_bcs_*.csv  
- **Records**: ~1,000,000 BCS entries per file
- **Time Range**: April 2025 - September 2025
- **Fields**: System ID, Location, Performance Metrics, Anomaly Indicators
- **Update Frequency**: Weekly

## 🔄 Automation

### Scheduled Data Sync
```bash
# Setup automated data synchronization
crontab -e

# Add daily sync at 2 AM
0 2 * * * /path/to/cisco-sre-dashboard/scripts/sync-data.sh
```

### Monitoring Data Freshness  
```bash
# Check data age and trigger alerts
./scripts/monitor-data-freshness.sh

# Alerts sent to: sre-alerts@cisco.com
```

## 📚 Additional Resources

- [Cisco Data Governance Policy](https://cisco.com/policies/data-governance)
- [SRE Dashboard Documentation](./README.md)
- [API Documentation](./docs/API.md)
- [Security Best Practices](./docs/SECURITY.md)

---

**Last Updated**: November 25, 2025  
**Version**: 1.0  
**Owner**: SRE Team, Cisco Systems