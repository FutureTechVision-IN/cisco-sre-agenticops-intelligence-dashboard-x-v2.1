# Shutdown Procedures - Graceful Termination Guide

**Version:** 1.0.0  
**Last Updated:** November 24, 2025

---

## Quick Reference

| Method | Command | Time | Recommended |
|--------|---------|------|-------------|
| Graceful (Recommended) | `./deployment-scripts/shutdown.sh` | 10-30s | ✅ Production |
| SIGTERM | `kill -15 <PID>` | 10-30s | ✅ Standard |
| SIGKILL | `kill -9 <PID>` | 1-2s | ❌ Emergency only |

---

## Graceful Shutdown (Recommended)

### Using Deployment Script

```bash
# Method 1: Using script (recommended)
./deployment-scripts/shutdown.sh

# Expected output:
# Stopping SRE Dashboard...
# Waiting for connections to close...
# Active connections: 3
# Active connections: 1
# Flushing database...
# Closing database connection...
# Cleanup complete
# Process 12345 terminated successfully
# Exit code: 0
```

**What Happens During Graceful Shutdown:**

```
1. Signal Received
   └─ SIGTERM received

2. Stop Accepting New Requests
   └─ New requests return 503 Service Unavailable

3. Drain Active Connections
   ├─ Wait for current requests to complete
   ├─ Max wait: 30 seconds
   └─ Timeout returns partial data

4. Flush Session Data
   └─ Save any pending session information

5. Close Database
   ├─ Commit pending transactions
   ├─ Close connection pool
   └─ Verify clean close

6. Cleanup
   ├─ Remove temporary files
   ├─ Close file handles
   └─ Release system resources

7. Exit
   └─ Process terminates with exit code 0
```

**Shutdown Time Breakdown:**

| Stage | Time | Notes |
|-------|------|-------|
| Signal reception | <1s | Immediate |
| Connection drain | 5-15s | Depends on active requests |
| Database flush | 2-5s | Transaction commitment |
| Cleanup | 1-3s | Resource release |
| **Total** | **10-30s** | Typical: 15s |

---

## Manual Shutdown Methods

### Method 1: SIGTERM (Graceful)

```bash
# 1. Find the process ID
ps aux | grep "npm start"
# Output:
# user 12345 0.1 0.5 987654 12345 ... npm start

# 2. Send SIGTERM signal (graceful shutdown)
kill -15 12345

# 3. Verify termination (wait 10-30 seconds)
ps aux | grep 12345
# Should return nothing when complete

# 4. Check exit code
echo $?
# 0 = graceful shutdown
```

### Method 2: Multiple Process Termination

```bash
# Kill all Node.js processes from this user
killall -15 node

# Or more specifically
pkill -f "npm start"
pkill -f "node.*dist/index.js"

# Verify
ps aux | grep node
```

### Method 3: Port-Based Termination

```bash
# Find process using port 5000
lsof -i :5000 | grep LISTEN
# Output:
# node 12345 user 18u IPv4 ... TCP localhost:5000 (LISTEN)

# Kill that process
kill -15 12345

# Alternative: One-liner
kill -15 $(lsof -t -i :5000)
```

---

## Emergency/Force Shutdown

### When Graceful Shutdown Fails

```bash
# Warning: Only use if graceful shutdown hangs

# 1. Attempt graceful again (wait 60 seconds)
kill -15 <PID>
sleep 60

# 2. Check if process still running
ps aux | grep <PID>

# 3. If still running, force kill
kill -9 <PID>

# 4. Verify termination
ps aux | grep <PID>
# Should return nothing

# 5. Check port is released
lsof -i :5000
# Should return nothing
```

### Force Shutdown Commands

```bash
# Option 1: Kill specific PID
kill -9 12345

# Option 2: Kill by process name
killall -9 node

# Option 3: Kill by port
kill -9 $(lsof -t -i :5000)

# Option 4: Kill all npm processes
pkill -9 npm

# Verify
sleep 2
ps aux | grep -E "node|npm" | grep -v grep
```

⚠️ **WARNING:** Force shutdown (`kill -9`) may cause:
- Incomplete database transactions
- Corrupted session data
- File handle leaks
- Loss of in-flight requests

---

## Shutdown for Systemd Service

### Using Systemd

```bash
# Stop the service
sudo systemctl stop sre-dashboard

# Expected output:
# ● sre-dashboard.service - SRE Dashboard
#    Loaded: loaded
#    Active: inactive (dead)

# Verify stopped
sudo systemctl is-active sre-dashboard
# Output: inactive

# View shutdown logs
sudo journalctl -u sre-dashboard -n 20
```

### Service Configuration for Graceful Shutdown

```bash
# View current service file
sudo cat /etc/systemd/system/sre-dashboard.service

# Ensure these settings:
# [Service]
# Type=simple
# KillMode=mixed              # SIGTERM then SIGKILL
# TimeoutStopSec=30           # Wait 30 seconds before SIGKILL
# ExecStop=...                # (optional) custom stop command
```

---

## Cleanup Processes During Shutdown

### Automatic Cleanup

The shutdown script automatically:

- [ ] Closes all database connections
- [ ] Commits pending transactions
- [ ] Flushes session store
- [ ] Closes file handles
- [ ] Removes temporary files
- [ ] Clears in-memory caches
- [ ] Releases ports
- [ ] Releases network connections

### Manual Cleanup (if needed)

```bash
# 1. Find and remove temporary files
rm -rf /tmp/sre-dashboard-*

# 2. Clear session data (if using Redis)
redis-cli FLUSHDB

# 3. Check for orphaned processes
ps aux | grep -i dashboard
ps aux | grep -i sre

# 4. Verify ports are released
netstat -tulpn | grep 5000
lsof -i :5000  # Should return nothing

# 5. Check database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
# Should return 0 (or 1 if you're connected)
```

---

## Database Consistency Before Shutdown

### Pre-Shutdown Verification

```bash
# 1. Check for active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE state='active';"

# 2. Check for pending transactions
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state='idle in transaction';"

# 3. Verify no locks
psql $DATABASE_URL -c "SELECT * FROM pg_locks WHERE NOT granted;"

# 4. Check database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size(current_database()));"
```

### Safe Shutdown Sequence

```bash
# 1. Stop accepting new requests (application level)
# Done automatically by shutdown script

# 2. Wait for active queries (15-20 seconds)
sleep 20

# 3. Verify queries completed
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
# Should return 1 (just your connection)

# 4. Stop application
./deployment-scripts/shutdown.sh

# 5. Verify database clean
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
# Should return 0 or 1 depending on connection
```

---

## Shutdown Procedures by Scenario

### Scenario 1: Scheduled Maintenance

```bash
# 1. Announce downtime
echo "Maintenance window: 2025-11-24 22:00-22:30 UTC"

# 2. Stop accepting new requests
./deployment-scripts/shutdown.sh

# 3. Perform maintenance
# (database updates, patching, etc.)

# 4. Restart
./deployment-scripts/start.sh

# 5. Verify health
curl http://localhost:5000/health
```

### Scenario 2: Blue-Green Deployment

```bash
# 1. Start new instance (green)
./deployment-scripts/start.sh  # on new server

# 2. Verify health
curl http://new-server:5000/health

# 3. Switch traffic to new instance
# (load balancer configuration)

# 4. Shutdown old instance (blue)
./deployment-scripts/shutdown.sh  # on old server

# 5. Confirm traffic switched
curl http://new-server:5000/health
```

### Scenario 3: Emergency Restart

```bash
# 1. Graceful shutdown (allow 30 seconds)
./deployment-scripts/shutdown.sh

# 2. Check if stopped
ps aux | grep "npm start" | grep -v grep
# If still running, wait another 10 seconds

# 3. If still hanging, force shutdown
kill -9 $(lsof -t -i :5000) 2>/dev/null || true

# 4. Restart immediately
./deployment-scripts/start.sh

# 5. Verify health
curl http://localhost:5000/health
```

---

## Shutdown Verification Checklist

After shutdown, verify:

- [ ] Process not running: `ps aux | grep npm` (no results)
- [ ] Port released: `lsof -i :5000` (no results)
- [ ] No database locks: `psql ... SELECT * FROM pg_locks;` (empty)
- [ ] Session data saved: Check session store
- [ ] Logs closed: `lsof | grep app.log` (no active writes)
- [ ] No zombie processes: `ps aux | grep <defunct>`
- [ ] Exit code 0: `echo $?` (should be 0)

---

## Troubleshooting Shutdown Issues

### Process Won't Shutdown

```bash
# 1. Check what's holding it up
lsof -p <PID>

# 2. Check active connections
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"

# 3. Check open files
ls -la /proc/<PID>/fd/

# 4. Force if necessary
kill -9 <PID>
```

### Port Still in Use After Shutdown

```bash
# 1. Find what's using the port
lsof -i :5000

# 2. Check if it's a zombie process
ps aux | grep -i defunct

# 3. Force release
fuser -k 5000/tcp

# 4. Restart to rebind
./deployment-scripts/start.sh
```

### Database Lock After Shutdown

```bash
# 1. List active locks
psql $DATABASE_URL -c "SELECT * FROM pg_locks WHERE NOT granted;"

# 2. Kill stuck connection
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query ~ 'OLD_QUERY';"

# 3. Restart database connection
psql $DATABASE_URL -c "SELECT 1;"
```

---

## Expected Shutdown Times

| Scenario | Time | Status |
|----------|------|--------|
| No active connections | 5-10s | ✅ Fast |
| Few active connections (<5) | 10-20s | ✅ Normal |
| Many active connections (>20) | 20-30s | ⚠️ Slower |
| Slow queries running | 20-30s | ⚠️ Timeout imminent |
| Hanging process | 30s+ then force | ❌ Emergency fallback |

---

**Version:** 1.0.0  
**Updated:** November 24, 2025  
**Status:** Production Ready
