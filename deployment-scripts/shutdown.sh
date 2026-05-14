#!/bin/bash

###############################################################################
# SRE AgenticOps Intelligence Dashboard - Graceful Shutdown Script
# Handles cleanup and safe application termination
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date +'%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date +'%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date +'%Y-%m-%d %H:%M:%S') - $1"
}

# Kill application process
kill_app() {
    log_info "Stopping SRE AgenticOps Dashboard..."
    
    if [ -f .app.pid ]; then
        local pid=$(cat .app.pid)
        if kill -0 "$pid" 2>/dev/null; then
            log_info "Sending SIGTERM to process $pid..."
            kill -TERM "$pid"
            
            # Wait for graceful shutdown (max 30 seconds)
            local count=0
            while kill -0 "$pid" 2>/dev/null && [ $count -lt 30 ]; do
                sleep 1
                count=$((count+1))
            done
            
            if kill -0 "$pid" 2>/dev/null; then
                log_warn "Graceful shutdown timeout, sending SIGKILL..."
                kill -KILL "$pid"
            fi
            
            rm -f .app.pid
            log_info "Process terminated ✓"
        else
            log_warn "Process $pid not running"
            rm -f .app.pid
        fi
    else
        log_warn "No PID file found, attempting to find npm process..."
        pkill -f "node build/index.js" || true
    fi
}

# Cleanup
cleanup() {
    log_info "Performing cleanup..."
    
    # Clear old logs if needed (keep last 10)
    if [ -d "logs" ]; then
        find logs -type f -name "*.log" | sort -r | tail -n +11 | xargs rm -f || true
    fi
    
    log_info "Cleanup complete ✓"
}

main() {
    log_info "=== SRE AgenticOps Dashboard Shutdown ==="
    kill_app
    cleanup
    log_info "=== Shutdown Complete ==="
}

main "$@"
