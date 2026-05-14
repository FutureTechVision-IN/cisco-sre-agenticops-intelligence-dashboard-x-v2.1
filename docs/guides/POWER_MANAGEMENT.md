# Power Management System for Cisco SRE AgenticOps Dashboard

## Overview

This comprehensive power management system provides **safe shutdown and startup capabilities** with **automatic configuration preservation** for the Cisco SRE AgenticOps Intelligence Dashboard. The system ensures that all critical settings, state information, and operational configurations are maintained across power cycles.

## 🚀 Key Features

### ✅ **Complete Configuration Backup**
- Environment variables and settings preservation
- Database configuration and state capture
- Application configuration files backup
- Network and process state recording
- Timestamped backup versioning with cleanup

### ✅ **Graceful Shutdown System**
- Safe termination of all dashboard processes
- Database connection cleanup
- Temporary file management
- Comprehensive error handling with timeouts
- Verification of clean shutdown completion

### ✅ **Intelligent Startup Restoration**
- Automatic configuration restoration
- System prerequisite verification
- Health checks and readiness validation
- Runtime state management
- Service dependency handling

### ✅ **Comprehensive Monitoring**
- Real-time system status monitoring
- API endpoint health verification
- Resource utilization tracking
- Detailed logging and reporting
- Continuous monitoring capabilities

---

## 📁 System Components

| Script | Purpose | Description |
|--------|---------|-------------|
| `power-off.sh` | **Graceful Shutdown** | Safe system shutdown with configuration backup |
| `power-on.sh` | **Intelligent Startup** | Automatic restoration and startup sequence |
| `system-config.sh` | **Configuration Management** | Backup/restore system configurations |
| `system-status.sh` | **System Monitoring** | Health checks, status reporting, monitoring |

---

## 🔧 Quick Start Guide

### **1. Power Off the System**
```bash
# Normal graceful shutdown
./power-off.sh

# Force shutdown (reduced timeouts)
./power-off.sh force
```

### **2. Power On the System**
```bash
# Normal startup with full restoration
./power-on.sh

# Quick startup (reduced timeouts)
./power-on.sh quick

# Debug startup (verbose output)
./power-on.sh debug
```

### **3. Check System Status**
```bash
# Comprehensive system status
./system-status.sh

# Generate detailed report
./system-status.sh report

# Continuous monitoring
./system-status.sh monitor
```

---

## 📋 Detailed Usage

### Power-Off System (`power-off.sh`)

**Purpose**: Safely shut down the dashboard with complete configuration preservation

**Process Flow**:
1. **Configuration Backup** - Captures current system state
2. **Graceful Shutdown** - Terminates processes safely
3. **Cleanup Operations** - Removes temporary files
4. **State Preservation** - Saves shutdown information
5. **Verification** - Confirms clean shutdown

**Usage**:
```bash
./power-off.sh [option]

Options:
  shutdown, stop, (default)  Normal graceful shutdown
  force                      Force shutdown with reduced timeouts
  help                       Show help message
```

**Example Output**:
```
╔════════════════════════════════════════════════════════════════╗
║           CISCO SRE AGENTICOPS DASHBOARD SHUTDOWN             ║
║                Safe Power-Off System v1.0.0                   ║
╚════════════════════════════════════════════════════════════════╝

ℹ Backing up current system configuration...
✓ Configuration backup completed
ℹ Stopping Cisco SRE AgenticOps Dashboard...
✓ Dashboard stopped successfully
✓ Temporary files cleaned up
✓ Shutdown state saved
✓ Shutdown verification passed

╔════════════════════════════════════════════════════════════════╗
║                    🛑 SHUTDOWN COMPLETED                       ║
║  System is ready for safe power-off                           ║
║  Use './power-on.sh' to restore the system                    ║
╚════════════════════════════════════════════════════════════════╝
```

### Power-On System (`power-on.sh`)

**Purpose**: Intelligent startup with automatic configuration restoration

**Process Flow**:
1. **Prerequisites Check** - Verifies system requirements
2. **State Detection** - Identifies previous shutdown conditions
3. **Configuration Restore** - Loads saved configurations
4. **Environment Setup** - Prepares runtime environment
5. **Service Startup** - Launches dashboard services
6. **Health Verification** - Confirms operational readiness

**Usage**:
```bash
./power-on.sh [option]

Options:
  startup, start, (default)  Normal startup sequence
  quick                      Quick startup with reduced timeouts
  debug                      Enable debug output
  help                       Show help message
```

**Example Output**:
```
╔════════════════════════════════════════════════════════════════╗
║            CISCO SRE AGENTICOPS DASHBOARD STARTUP             ║
║             Intelligent Power-On System v1.0.0                ║
╚════════════════════════════════════════════════════════════════╝

✓ All prerequisites met
ℹ Previous shutdown detected: 2025-11-24T21:45:30Z
✓ Configuration restored successfully
✓ Runtime environment prepared
⚡ Launching dashboard using start.sh...
✓ Dashboard process started
✓ Dashboard is responding (HTTP 200)
✓ API endpoints are accessible

╔════════════════════════════════════════════════════════════════╗
║                    🚀 STARTUP COMPLETED                        ║
║  📊 Dashboard URL: http://localhost:8000                       ║
║  🔌 API Endpoints: http://localhost:8000/api                   ║
║  📋 Intelligence: http://localhost:8000/api/intelligence       ║
║  System is fully operational and ready for use                ║
╚════════════════════════════════════════════════════════════════╝
```

### System Configuration Management (`system-config.sh`)

**Purpose**: Advanced configuration backup and restoration capabilities

**Usage**:
```bash
./system-config.sh [command]

Commands:
  backup              Capture current system configuration
  restore [file]      Restore system configuration
  verify              Verify current system state
  list                List available backup files
  cleanup             Remove old backup files
```

**Examples**:
```bash
# Create a backup
./system-config.sh backup

# Restore from latest backup
./system-config.sh restore

# List all available backups
./system-config.sh list

# Verify system state
./system-config.sh verify
```

### System Status Monitoring (`system-status.sh`)

**Purpose**: Comprehensive system health monitoring and reporting

**Usage**:
```bash
./system-status.sh [command] [options]

Commands:
  status, check, (default)  Show comprehensive system status
  report                    Generate detailed JSON report
  monitor [interval]        Continuous monitoring
  logs                      Show recent system logs
```

**Examples**:
```bash
# Check system status
./system-status.sh

# Generate detailed report
./system-status.sh report

# Monitor every 5 seconds
./system-status.sh monitor 5

# View recent logs
./system-status.sh logs
```

---

## 📊 Configuration Storage

### **Backup Location**
All system configurations are stored in: `./config/system-state/`

### **Backup Files**
- `system-backup-YYYYMMDD-HHMMSS.json` - Timestamped backups
- `latest-backup.json` - Most recent backup (symlink)
- `runtime-state.json` - Current runtime information
- `shutdown-state.json` - Last shutdown information

### **Backup Content**
- **Environment Variables** - All system and application variables
- **Application Configuration** - package.json, .env, config files
- **Database State** - Connection info and table structure
- **Process Information** - Running services and PIDs
- **Network Configuration** - Port assignments and connections
- **Metadata** - Timestamps, hostnames, user information

### **Automatic Cleanup**
- Keeps the **10 most recent backups**
- Removes log files older than **7 days**
- Cleans temporary files during shutdown

---

## 🔍 Health Monitoring

### **Process Monitoring**
- Dashboard application processes
- Start script processes  
- Database server status
- CPU and memory usage tracking

### **Network Monitoring**
- Port availability (5000, 5432, 6379, 8000)
- Service binding verification
- Process-to-port mapping

### **API Health Checks**
- Dashboard homepage accessibility
- API endpoint responsiveness
- Authentication system status
- Intelligence service availability
- Response time measurements

### **Resource Monitoring**
- Disk space utilization
- Memory usage statistics
- System load averages
- Node.js/npm version verification

---

## 📝 Logging System

### **Log Files**
- `startup.log` - Startup sequence events
- `shutdown.log` - Shutdown procedure events  
- `status.log` - System status checks
- `system-state.log` - Configuration management events

### **Log Levels**
- **INFO** - Normal operational events
- **WARNING** - Non-critical issues
- **ERROR** - Critical errors requiring attention
- **DEBUG** - Detailed troubleshooting information

### **Log Rotation**
- Automatic cleanup of old logs
- Configurable retention periods
- Size-based rotation support

---

## 🔧 Troubleshooting

### **Common Issues**

#### **Shutdown Problems**
```bash
# If normal shutdown fails, use force mode
./power-off.sh force

# Check for remaining processes
./system-status.sh

# Manual process cleanup
pkill -f "node.*build/index.js"
```

#### **Startup Problems**
```bash
# Use debug mode for detailed output
./power-on.sh debug

# Check prerequisites
./system-status.sh

# Manual startup
./start.sh
```

#### **Configuration Issues**
```bash
# Verify system configuration
./system-config.sh verify

# List available backups
./system-config.sh list

# Restore from specific backup
./system-config.sh restore config/system-state/system-backup-20251124-214530.json
```

### **Log Analysis**
```bash
# View recent startup logs
tail -50 config/system-state/startup.log

# View recent shutdown logs  
tail -50 config/system-state/shutdown.log

# Monitor logs in real-time
tail -f config/system-state/startup.log
```

### **Recovery Procedures**

#### **Emergency Recovery**
1. **Stop all processes**: `pkill -f "node.*build/index.js"`
2. **Check system status**: `./system-status.sh`
3. **Restore configuration**: `./system-config.sh restore`
4. **Restart system**: `./power-on.sh`

#### **Database Issues**
1. **Check PostgreSQL**: `pg_isready -h localhost -p 5432`
2. **Restart PostgreSQL**: System-dependent
3. **Use fallback mode**: Dashboard supports database-less operation
4. **Check logs**: Review database connection errors

---

## ⚙️ Advanced Configuration

### **Environment Variables**
```bash
# Startup timeout (seconds)
export STARTUP_TIMEOUT=120

# Shutdown timeout (seconds)  
export SHUTDOWN_TIMEOUT=30

# Health check retries
export HEALTH_CHECK_RETRIES=10

# Custom port
export PORT=8000

# Database URL
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cisco_sre_dashboard"
```

### **Custom Backup Retention**
Edit `system-config.sh` to modify backup retention:
```bash
# Keep last N backups (default: 10)
local count=0
while IFS= read -r backup; do
    ((count++))
    if [[ $count -gt 15 ]]; then  # Keep 15 instead of 10
        rm -f "$backup"
    fi
done
```

---

## 🔐 Security Considerations

### **File Permissions**
All scripts should have appropriate execute permissions:
```bash
chmod +x power-off.sh power-on.sh system-config.sh system-status.sh
```

### **Backup Security**
- Backup files contain sensitive configuration data
- Ensure proper file permissions on config directory
- Consider encryption for sensitive environments

### **Process Management**
- Scripts use process termination signals (SIGTERM, SIGKILL)
- Timeout mechanisms prevent hung processes
- Verification steps ensure clean shutdown

---

## 📈 Performance Optimization

### **Startup Performance**
- Use `quick` mode for faster startup: `./power-on.sh quick`
- Parallel health checks reduce startup time
- Configurable timeout values for different environments

### **Monitoring Overhead**
- Adjustable monitoring intervals
- Lightweight status checks
- Optional detailed reporting

---

## 🔄 Integration

### **CI/CD Integration**
```bash
# In deployment scripts
./power-off.sh          # Safe shutdown
./power-on.sh quick     # Fast startup
./system-status.sh      # Verify deployment
```

### **Automated Monitoring**
```bash
# Cron job for periodic health checks
*/5 * * * * /path/to/system-status.sh >> /var/log/dashboard-monitor.log
```

### **Load Balancer Integration**
- Use health check endpoints: `http://localhost:8000/api/health`
- Monitor startup/shutdown states
- Implement graceful traffic migration

---

## 📞 Support

### **Getting Help**
```bash
# Script-specific help
./power-off.sh help
./power-on.sh help
./system-config.sh help
./system-status.sh help
```

### **System Information**
```bash
# Generate comprehensive report
./system-status.sh report

# View system logs
./system-status.sh logs

# Real-time monitoring
./system-status.sh monitor
```

---

## 📄 License

This power management system is part of the Cisco SRE AgenticOps Intelligence Dashboard project and follows the same licensing terms.

---

**🚀 Ready to use! Start with `./power-on.sh` to bring up your dashboard system safely.**