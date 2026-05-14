#!/bin/bash

# ============================================================================
# CISCO SRE AGENTICOPS DASHBOARD - SAFE POWER-OFF SYSTEM
# Version: 2.0.0
# Supports: Docker, Native (non-Docker), and Hybrid modes
# Features: Graceful Shutdown, Configuration Preservation, State Backup
# ============================================================================

set -euo pipefail

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Load unified configuration if available
CONFIG_FILE="${PROJECT_ROOT}/config/hybrid-system.conf"
if [[ -f "$CONFIG_FILE" ]]; then
    # shellcheck source=/dev/null
    source "$CONFIG_FILE"
fi

# Fallback configuration
CONFIG_DIR="${STATE_DIR:-./config/system-state}"
SHUTDOWN_LOG="${CONFIG_DIR}/shutdown-$(date +%Y%m%d-%H%M%S).log"
SHUTDOWN_TIMEOUT="${SHUTDOWN_TIMEOUT:-60}"
GRACEFUL_TIMEOUT="${GRACEFUL_SHUTDOWN_TIMEOUT:-30}"
FORCE_TIMEOUT="${FORCE_KILL_TIMEOUT:-10}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure config directory exists
mkdir -p "$CONFIG_DIR"

# Logging function
log_shutdown() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$SHUTDOWN_LOG"
}

# Print colored output
print_status() {
    local level="$1"
    local message="$2"
    case "$level" in
        "INFO")
            echo -e "${BLUE}ℹ${NC} $message"
            ;;
        "SUCCESS")
            echo -e "${GREEN}✓${NC} $message"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}✗${NC} $message"
            ;;
    esac
}

# Print header
print_header() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║           CISCO SERVICE READINESS ENGINEER AGENTICOPS DASHBOARD SHUTDOWN             ║"
    echo "║                Safe Power-Off System v2.0.0                   ║"
    echo "║                                                                ║"
    echo "║  Supports: Docker | Native | Hybrid Modes (Auto-Detection)   ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
}

# Function to get running processes
get_dashboard_processes() {
    pgrep -f "node.*build/index.js" 2>/dev/null || true
}

get_start_script_processes() {
    pgrep -f "./start.sh" 2>/dev/null || true
}

# Function to backup current configuration
backup_current_state() {
    print_status "INFO" "Backing up current system configuration..."
    log_shutdown "INFO" "Starting configuration backup before shutdown"
    
    if [[ -f "$SCRIPT_DIR/system-config.sh" ]]; then
        if "$SCRIPT_DIR/system-config.sh" backup; then
            print_status "SUCCESS" "Configuration backup completed"
            log_shutdown "INFO" "Configuration backup successful"
            return 0
        else
            print_status "ERROR" "Configuration backup failed"
            log_shutdown "ERROR" "Configuration backup failed"
            return 1
        fi
    else
        print_status "WARNING" "system-config.sh not found, skipping backup"
        log_shutdown "WARNING" "system-config.sh not found, backup skipped"
        return 1
    fi
}

# Function to gracefully stop dashboard
stop_dashboard() {
    print_status "INFO" "Stopping Cisco SRE AgenticOps Dashboard..."
    log_shutdown "INFO" "Initiating dashboard shutdown"
    
    local dashboard_pids=$(get_dashboard_processes)
    local start_pids=$(get_start_script_processes)
    
    if [[ -z "$dashboard_pids" && -z "$start_pids" ]]; then
        print_status "INFO" "Dashboard is not running"
        log_shutdown "INFO" "No dashboard processes found"
        return 0
    fi
    
    # Stop start.sh processes first
    if [[ -n "$start_pids" ]]; then
        print_status "INFO" "Stopping start script processes..."
        for pid in $start_pids; do
            if kill -TERM "$pid" 2>/dev/null; then
                log_shutdown "INFO" "Sent SIGTERM to start.sh process $pid"
                print_status "SUCCESS" "Sent shutdown signal to start.sh (PID: $pid)"
            fi
        done
        
        # Wait for start.sh to stop
        local count=0
        while [[ $count -lt $SHUTDOWN_TIMEOUT ]] && [[ -n "$(get_start_script_processes)" ]]; do
            sleep 1
            ((count++))
            if [[ $((count % 5)) -eq 0 ]]; then
                print_status "INFO" "Waiting for start.sh to stop... (${count}s)"
            fi
        done
        
        # Force kill if necessary
        local remaining_start_pids=$(get_start_script_processes)
        if [[ -n "$remaining_start_pids" ]]; then
            print_status "WARNING" "Force stopping remaining start.sh processes..."
            for pid in $remaining_start_pids; do
                kill -KILL "$pid" 2>/dev/null || true
                log_shutdown "WARNING" "Force killed start.sh process $pid"
            done
        fi
    fi
    
    # Stop dashboard processes
    if [[ -n "$dashboard_pids" ]]; then
        print_status "INFO" "Stopping dashboard application..."
        for pid in $dashboard_pids; do
            if kill -TERM "$pid" 2>/dev/null; then
                log_shutdown "INFO" "Sent SIGTERM to dashboard process $pid"
                print_status "SUCCESS" "Sent shutdown signal to dashboard (PID: $pid)"
            fi
        done
        
        # Wait for graceful shutdown
        local count=0
        while [[ $count -lt $SHUTDOWN_TIMEOUT ]] && [[ -n "$(get_dashboard_processes)" ]]; do
            sleep 1
            ((count++))
            if [[ $((count % 5)) -eq 0 ]]; then
                print_status "INFO" "Waiting for graceful shutdown... (${count}s)"
            fi
        done
        
        # Force kill if necessary
        local remaining_pids=$(get_dashboard_processes)
        if [[ -n "$remaining_pids" ]]; then
            print_status "WARNING" "Force stopping remaining dashboard processes..."
            for pid in $remaining_pids; do
                kill -KILL "$pid" 2>/dev/null || true
                log_shutdown "WARNING" "Force killed dashboard process $pid"
            done
            
            # Final check
            sleep 2
            if [[ -n "$(get_dashboard_processes)" ]]; then
                print_status "ERROR" "Some processes could not be stopped"
                log_shutdown "ERROR" "Failed to stop some dashboard processes"
                return 1
            fi
        fi
    fi
    
    print_status "SUCCESS" "Dashboard stopped successfully"
    log_shutdown "INFO" "Dashboard shutdown completed"
    return 0
}

# Function to cleanup temporary files
cleanup_temp_files() {
    print_status "INFO" "Cleaning up temporary files..."
    log_shutdown "INFO" "Starting temporary file cleanup"
    
    local cleaned_count=0
    
    # Remove log files older than 7 days
    if find "$CONFIG_DIR" -name "*.log" -mtime +7 -type f 2>/dev/null | xargs rm -f 2>/dev/null; then
        ((cleaned_count++))
    fi
    
    # Remove old backup files (keep only 10 most recent)
    if [[ -f "$SCRIPT_DIR/system-config.sh" ]]; then
        "$SCRIPT_DIR/system-config.sh" cleanup 2>/dev/null || true
        ((cleaned_count++))
    fi
    
    # Remove any .tmp files
    if find . -name "*.tmp" -type f 2>/dev/null | xargs rm -f 2>/dev/null; then
        ((cleaned_count++))
    fi
    
    # Remove dashboard.log if it exists
    if [[ -f "dashboard.log" ]]; then
        rm -f "dashboard.log"
        ((cleaned_count++))
    fi
    
    if [[ $cleaned_count -gt 0 ]]; then
        print_status "SUCCESS" "Temporary files cleaned up"
        log_shutdown "INFO" "Temporary file cleanup completed"
    else
        print_status "INFO" "No temporary files to clean up"
        log_shutdown "INFO" "No temporary files found for cleanup"
    fi
}

# Function to save shutdown state
save_shutdown_state() {
    print_status "INFO" "Saving shutdown state..."
    log_shutdown "INFO" "Saving shutdown state information"
    
    local shutdown_state='{}'
    shutdown_state=$(echo "$shutdown_state" | jq --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '.shutdown_time = $ts')
    shutdown_state=$(echo "$shutdown_state" | jq --arg user "$(whoami)" '.shutdown_by = $user')
    shutdown_state=$(echo "$shutdown_state" | jq --arg host "$(hostname)" '.hostname = $host')
    shutdown_state=$(echo "$shutdown_state" | jq '.status = "clean_shutdown"')
    shutdown_state=$(echo "$shutdown_state" | jq --arg reason "${SHUTDOWN_REASON:-manual}" '.reason = $reason')
    shutdown_state=$(echo "$shutdown_state" | jq --arg version "1.0.0" '.version = $version')
    
    echo "$shutdown_state" | jq '.' > "$CONFIG_DIR/shutdown-state.json"
    
    print_status "SUCCESS" "Shutdown state saved"
    log_shutdown "INFO" "Shutdown state saved successfully"
}

# Function to verify clean shutdown
verify_shutdown() {
    print_status "INFO" "Verifying clean shutdown..."
    log_shutdown "INFO" "Starting shutdown verification"
    
    local verification_failed=false
    
    # Check for remaining dashboard processes
    local remaining_dashboard=$(get_dashboard_processes)
    if [[ -n "$remaining_dashboard" ]]; then
        print_status "ERROR" "Dashboard processes still running: $remaining_dashboard"
        log_shutdown "ERROR" "Dashboard processes still running after shutdown"
        verification_failed=true
    fi
    
    # Check for remaining start script processes
    local remaining_start=$(get_start_script_processes)
    if [[ -n "$remaining_start" ]]; then
        print_status "ERROR" "Start script processes still running: $remaining_start"
        log_shutdown "ERROR" "Start script processes still running after shutdown"
        verification_failed=true
    fi
    
    # Check if ports are free
    local port_checks=(5000 8000)
    for port in "${port_checks[@]}"; do
        if netstat -tuln 2>/dev/null | grep -q ":${port} " && ! netstat -tuln 2>/dev/null | grep ":${port} " | grep -q "postgres\|redis"; then
            print_status "WARNING" "Port $port may still be in use by dashboard"
            log_shutdown "WARNING" "Port $port appears to be in use after shutdown"
        fi
    done
    
    if [[ "$verification_failed" == "true" ]]; then
        print_status "ERROR" "Shutdown verification failed"
        log_shutdown "ERROR" "Shutdown verification failed"
        return 1
    else
        print_status "SUCCESS" "Shutdown verification passed"
        log_shutdown "INFO" "Shutdown verification successful"
        return 0
    fi
}

# Function to display shutdown summary
display_summary() {
    local success="$1"
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    if [[ "$success" == "true" ]]; then
        echo "║                    🛑 SHUTDOWN COMPLETED                       ║"
        echo "║                                                                ║"
        echo "║  ✓ Configuration backed up                                     ║"
        echo "║  ✓ Dashboard processes stopped                                 ║"
        echo "║  ✓ Temporary files cleaned                                     ║"
        echo "║  ✓ Shutdown state saved                                        ║"
        echo "║  ✓ Verification passed                                         ║"
        echo "║                                                                ║"
        echo "║  System is ready for safe power-off                           ║"
        echo "║  Use './power-on.sh' to restore the system                    ║"
    else
        echo "║                    ⚠ SHUTDOWN INCOMPLETE                       ║"
        echo "║                                                                ║"
        echo "║  Some shutdown steps may have failed.                         ║"
        echo "║  Check logs: $SHUTDOWN_LOG"
        printf "║  %-62s ║\n" ""
        echo "║  Manual intervention may be required.                         ║"
    fi
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
}

# Signal handlers
trap 'log_shutdown "WARNING" "Shutdown interrupted by signal"; exit 1' INT TERM

# Main shutdown sequence
main() {
    local overall_success=true
    
    print_header
    log_shutdown "INFO" "=== SHUTDOWN SEQUENCE STARTED ==="
    
    # Step 1: Backup configuration
    if ! backup_current_state; then
        overall_success=false
    fi
    
    # Step 2: Stop dashboard
    if ! stop_dashboard; then
        overall_success=false
    fi
    
    # Step 3: Cleanup temporary files
    cleanup_temp_files
    
    # Step 4: Save shutdown state
    save_shutdown_state
    
    # Step 5: Verify shutdown
    if ! verify_shutdown; then
        overall_success=false
    fi
    
    # Display summary
    display_summary "$overall_success"
    
    log_shutdown "INFO" "=== SHUTDOWN SEQUENCE COMPLETED ==="
    
    if [[ "$overall_success" == "true" ]]; then
        log_shutdown "INFO" "Shutdown completed successfully"
        exit 0
    else
        log_shutdown "ERROR" "Shutdown completed with errors"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-shutdown}" in
    "shutdown"|"stop"|"")
        main
        ;;
    "force")
        SHUTDOWN_TIMEOUT=5
        FORCE_TIMEOUT=2
        export SHUTDOWN_REASON="force"
        print_status "WARNING" "Force shutdown mode enabled"
        main
        ;;
    "help"|"--help"|"-h")
        echo "Graceful Shutdown System v1.0.0"
        echo ""
        echo "Usage: $0 [option]"
        echo ""
        echo "Options:"
        echo "  shutdown, stop, (default)  Normal graceful shutdown"
        echo "  force                      Force shutdown with reduced timeouts"
        echo "  help                       Show this help message"
        echo ""
        echo "The shutdown process includes:"
        echo "  1. Configuration backup"
        echo "  2. Graceful process termination"
        echo "  3. Temporary file cleanup"
        echo "  4. Shutdown state preservation"
        echo "  5. Verification of clean shutdown"
        ;;
    *)
        print_status "ERROR" "Unknown option: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac