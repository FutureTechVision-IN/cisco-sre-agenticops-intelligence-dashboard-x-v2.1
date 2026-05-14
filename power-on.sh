#!/bin/bash

# ============================================================================
# CISCO SRE AGENTICOPS DASHBOARD - INTELLIGENT POWER-ON SYSTEM
# Version: 2.0.0
# Supports: Docker, Native (non-Docker), and Hybrid modes
# Features: Auto-detection, Configuration Restoration, Health Monitoring
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
STARTUP_LOG="${CONFIG_DIR}/startup-$(date +%Y%m%d-%H%M%S).log"
STARTUP_TIMEOUT="${STARTUP_TIMEOUT:-180}"
HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-10}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Ensure config directory exists
mkdir -p "$CONFIG_DIR"

# Logging function
log_startup() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$STARTUP_LOG"
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
        "PROGRESS")
            echo -e "${CYAN}⚡${NC} $message"
            ;;
    esac
}

# Print header
print_header() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║            CISCO SRE AGENTICOPS DASHBOARD STARTUP             ║"
    echo "║             Intelligent Power-On System v2.0.0                ║"
    echo "║                                                                ║"
    echo "║  Supports: Docker | Native | Hybrid Modes (Auto-Detection)   ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
}

# Function to check system prerequisites
check_prerequisites() {
    print_status "INFO" "Checking system prerequisites..."
    log_startup "INFO" "Starting prerequisite checks"
    
    local prereq_failed=false
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version)
        print_status "SUCCESS" "Node.js found: $node_version"
        log_startup "INFO" "Node.js version: $node_version"
    else
        print_status "ERROR" "Node.js not found"
        log_startup "ERROR" "Node.js not installed"
        prereq_failed=true
    fi
    
    # Check npm
    if command -v npm >/dev/null 2>&1; then
        local npm_version=$(npm --version)
        print_status "SUCCESS" "npm found: v$npm_version"
        log_startup "INFO" "npm version: $npm_version"
    else
        print_status "ERROR" "npm not found"
        log_startup "ERROR" "npm not installed"
        prereq_failed=true
    fi
    
    # Check required files
    local required_files=("package.json" "start.sh")
    for file in "${required_files[@]}"; do
        if [[ -f "$file" ]]; then
            print_status "SUCCESS" "Required file found: $file"
            log_startup "INFO" "Found required file: $file"
        else
            print_status "ERROR" "Required file missing: $file"
            log_startup "ERROR" "Missing required file: $file"
            prereq_failed=true
        fi
    done
    
    # Check if PostgreSQL is available
    if command -v psql >/dev/null 2>&1; then
        print_status "SUCCESS" "PostgreSQL client found"
        log_startup "INFO" "PostgreSQL client available"
        
        # Check if PostgreSQL server is running
        if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
            print_status "SUCCESS" "PostgreSQL server is running"
            log_startup "INFO" "PostgreSQL server is ready"
        else
            print_status "WARNING" "PostgreSQL server not running (will use fallback mode)"
            log_startup "WARNING" "PostgreSQL server not ready - fallback mode will be used"
        fi
    else
        print_status "WARNING" "PostgreSQL client not found (will use fallback mode)"
        log_startup "WARNING" "PostgreSQL client not available - fallback mode will be used"
    fi
    
    if [[ "$prereq_failed" == "true" ]]; then
        print_status "ERROR" "Prerequisite checks failed"
        log_startup "ERROR" "Prerequisites check failed"
        return 1
    else
        print_status "SUCCESS" "All prerequisites met"
        log_startup "INFO" "Prerequisites check passed"
        return 0
    fi
}

# Function to detect previous shutdown state
detect_shutdown_state() {
    print_status "INFO" "Detecting previous shutdown state..."
    log_startup "INFO" "Checking for previous shutdown state"
    
    if [[ -f "$CONFIG_DIR/shutdown-state.json" ]]; then
        local shutdown_time=$(jq -r '.shutdown_time // "unknown"' "$CONFIG_DIR/shutdown-state.json" 2>/dev/null)
        local shutdown_status=$(jq -r '.status // "unknown"' "$CONFIG_DIR/shutdown-state.json" 2>/dev/null)
        local shutdown_reason=$(jq -r '.reason // "unknown"' "$CONFIG_DIR/shutdown-state.json" 2>/dev/null)
        
        print_status "INFO" "Previous shutdown detected: $shutdown_time"
        print_status "INFO" "Shutdown status: $shutdown_status"
        print_status "INFO" "Shutdown reason: $shutdown_reason"
        
        log_startup "INFO" "Previous shutdown found - time: $shutdown_time, status: $shutdown_status, reason: $shutdown_reason"
        
        if [[ "$shutdown_status" == "clean_shutdown" ]]; then
            print_status "SUCCESS" "Previous shutdown was clean"
            log_startup "INFO" "Previous shutdown was clean"
            return 0
        else
            print_status "WARNING" "Previous shutdown may not have been clean"
            log_startup "WARNING" "Previous shutdown status indicates potential issues"
            return 1
        fi
    else
        print_status "INFO" "No previous shutdown state found (fresh start)"
        log_startup "INFO" "No shutdown state file found - assuming fresh start"
        return 0
    fi
}

# Function to restore system configuration
restore_configuration() {
    print_status "INFO" "Restoring system configuration..."
    log_startup "INFO" "Starting configuration restoration"
    
    if [[ -f "$SCRIPT_DIR/system-config.sh" ]]; then
        if "$SCRIPT_DIR/system-config.sh" restore; then
            print_status "SUCCESS" "Configuration restored successfully"
            log_startup "INFO" "Configuration restoration successful"
            return 0
        else
            print_status "WARNING" "Configuration restoration failed, continuing with defaults"
            log_startup "WARNING" "Configuration restoration failed - using defaults"
            return 1
        fi
    else
        print_status "WARNING" "system-config.sh not found, skipping restoration"
        log_startup "WARNING" "system-config.sh not found - configuration restoration skipped"
        return 1
    fi
}

# Function to prepare environment
prepare_environment() {
    print_status "INFO" "Preparing runtime environment..."
    log_startup "INFO" "Setting up runtime environment"
    
    # Set default environment variables if not already set
    export NODE_ENV="${NODE_ENV:-production}"
    export PORT="${PORT:-8000}"
    
    # Set DATABASE_URL if not already set
    if [[ -z "${DATABASE_URL:-}" ]]; then
        export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cisco_sre_dashboard"
        print_status "INFO" "Set default DATABASE_URL"
        log_startup "INFO" "Set default DATABASE_URL"
    fi
    
    # Create runtime state file
    local runtime_state='{}'
    runtime_state=$(echo "$runtime_state" | jq --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '.startup_time = $ts')
    runtime_state=$(echo "$runtime_state" | jq --arg user "$(whoami)" '.started_by = $user')
    runtime_state=$(echo "$runtime_state" | jq --arg host "$(hostname)" '.hostname = $host')
    runtime_state=$(echo "$runtime_state" | jq --arg env "$NODE_ENV" '.environment = $env')
    runtime_state=$(echo "$runtime_state" | jq --arg port "$PORT" '.port = $port')
    runtime_state=$(echo "$runtime_state" | jq '.status = "starting"')
    runtime_state=$(echo "$runtime_state" | jq --arg version "1.0.0" '.version = $version')
    
    echo "$runtime_state" | jq '.' > "$CONFIG_DIR/runtime-state.json"
    
    print_status "SUCCESS" "Runtime environment prepared"
    log_startup "INFO" "Runtime environment setup completed"
}

# Function to start dashboard services
start_dashboard() {
    print_status "INFO" "Starting Cisco SRE AgenticOps Dashboard..."
    log_startup "INFO" "Starting dashboard application"
    
    # Check if already running
    if pgrep -f "node.*build/index.js" >/dev/null 2>&1; then
        print_status "WARNING" "Dashboard appears to be already running"
        log_startup "WARNING" "Dashboard process already detected"
        return 0
    fi
    
    # Determine which start script to use
    local start_script=""
    if [[ -f "./scripts/start-enhanced.sh" ]] && [[ -x "./scripts/start-enhanced.sh" ]]; then
        start_script="./scripts/start-enhanced.sh"
    elif [[ -f "./start.sh" ]] && [[ -x "./start.sh" ]]; then
        start_script="./start.sh"
    fi
    
    if [[ -n "$start_script" ]]; then
        print_status "PROGRESS" "Launching dashboard using $start_script..."
        log_startup "INFO" "Executing $start_script script"
        
        # Run start script in background
        nohup "$start_script" > "$CONFIG_DIR/dashboard-startup.log" 2>&1 &
        local start_pid=$!
        
        print_status "SUCCESS" "Dashboard startup initiated (PID: $start_pid)"
        log_startup "INFO" "Dashboard startup script launched with PID: $start_pid"
        
        # Wait for the dashboard to be ready
        print_status "PROGRESS" "Waiting for dashboard to be ready..."
        local count=0
        while [[ $count -lt $STARTUP_TIMEOUT ]]; do
            if pgrep -f "node.*build/index.js" >/dev/null 2>&1; then
                print_status "SUCCESS" "Dashboard process started"
                log_startup "INFO" "Dashboard process is now running"
                break
            fi
            
            sleep 2
            ((count += 2))
            
            if [[ $((count % 10)) -eq 0 ]]; then
                print_status "PROGRESS" "Still waiting for dashboard... (${count}s)"
            fi
        done
        
        if [[ $count -ge $STARTUP_TIMEOUT ]]; then
            print_status "ERROR" "Dashboard startup timeout"
            log_startup "ERROR" "Dashboard startup timed out after ${STARTUP_TIMEOUT}s"
            return 1
        fi
        
        return 0
    else
        print_status "ERROR" "No start script found (start.sh or scripts/start-enhanced.sh)"
        log_startup "ERROR" "Start script not available"
        return 1
    fi
}

# Function to verify dashboard health
verify_dashboard_health() {
    print_status "INFO" "Verifying dashboard health..."
    log_startup "INFO" "Starting dashboard health verification"
    
    local health_checks=0
    local max_checks=$HEALTH_CHECK_RETRIES
    
    while [[ $health_checks -lt $max_checks ]]; do
        ((health_checks++))
        
        print_status "PROGRESS" "Health check attempt $health_checks/$max_checks"
        
        # Check if process is running
        if ! pgrep -f "node.*build/index.js" >/dev/null 2>&1; then
            print_status "WARNING" "Dashboard process not found"
            log_startup "WARNING" "Dashboard process not running during health check $health_checks"
            sleep 3
            continue
        fi
        
        # Check HTTP endpoint
        local http_status=""
        if http_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT:-8000}/" 2>/dev/null); then
            if [[ "$http_status" == "200" ]]; then
                print_status "SUCCESS" "Dashboard is responding (HTTP $http_status)"
                log_startup "INFO" "Dashboard health check passed - HTTP $http_status"
                
                # Check API endpoint
                if curl -s -f "http://localhost:${PORT:-8000}/api/health" >/dev/null 2>&1; then
                    print_status "SUCCESS" "API endpoints are accessible"
                    log_startup "INFO" "API health check passed"
                    return 0
                else
                    print_status "WARNING" "API endpoints not yet ready"
                    log_startup "WARNING" "API endpoints not ready during health check $health_checks"
                fi
            else
                print_status "WARNING" "Dashboard returned HTTP $http_status"
                log_startup "WARNING" "Dashboard returned HTTP $http_status during health check $health_checks"
            fi
        else
            print_status "WARNING" "Dashboard not responding to HTTP requests"
            log_startup "WARNING" "Dashboard not responding to HTTP during health check $health_checks"
        fi
        
        if [[ $health_checks -lt $max_checks ]]; then
            sleep 5
        fi
    done
    
    print_status "ERROR" "Dashboard health verification failed"
    log_startup "ERROR" "Dashboard health verification failed after $max_checks attempts"
    return 1
}

# Function to update startup state
update_startup_state() {
    local status="$1"
    
    if [[ -f "$CONFIG_DIR/runtime-state.json" ]]; then
        local runtime_state=$(cat "$CONFIG_DIR/runtime-state.json")
        runtime_state=$(echo "$runtime_state" | jq --arg status "$status" '.status = $status')
        
        if [[ "$status" == "running" ]]; then
            runtime_state=$(echo "$runtime_state" | jq --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '.ready_time = $ts')
        fi
        
        echo "$runtime_state" | jq '.' > "$CONFIG_DIR/runtime-state.json"
        log_startup "INFO" "Updated startup state to: $status"
    fi
}

# Function to display startup summary
display_summary() {
    local success="$1"
    local dashboard_url="http://localhost:${PORT:-8000}"
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    if [[ "$success" == "true" ]]; then
        echo "║                    🚀 STARTUP COMPLETED                        ║"
        echo "║                                                                ║"
        echo "║  ✓ Prerequisites verified                                      ║"
        echo "║  ✓ Configuration restored                                      ║"
        echo "║  ✓ Environment prepared                                        ║"
        echo "║  ✓ Dashboard services started                                  ║"
        echo "║  ✓ Health verification passed                                  ║"
        echo "║                                                                ║"
        printf "║  📊 Dashboard URL: %-40s ║\n" "$dashboard_url"
        echo "║  🔌 API Endpoints: $dashboard_url/api                    ║"
        echo "║  📋 Intelligence: $dashboard_url/api/intelligence      ║"
        echo "║                                                                ║"
        echo "║  System is fully operational and ready for use                ║"
        echo "║  Use './power-off.sh' to safely shutdown the system           ║"
    else
        echo "║                    ⚠ STARTUP INCOMPLETE                        ║"
        echo "║                                                                ║"
        echo "║  Some startup steps may have failed.                          ║"
        echo "║  Check logs: $STARTUP_LOG"
        printf "║  %-62s ║\n" ""
        echo "║  Manual intervention may be required.                         ║"
        echo "║  Try running './start.sh' directly for more details.          ║"
    fi
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
}

# Signal handlers
trap 'log_startup "WARNING" "Startup interrupted by signal"; exit 1' INT TERM

# Main startup sequence
main() {
    local overall_success=true
    
    print_header
    log_startup "INFO" "=== STARTUP SEQUENCE INITIATED ==="
    
    # Step 1: Check prerequisites
    if ! check_prerequisites; then
        overall_success=false
        display_summary "$overall_success"
        return 1
    fi
    
    # Step 2: Detect shutdown state
    detect_shutdown_state
    
    # Step 3: Restore configuration
    restore_configuration
    
    # Step 4: Prepare environment
    prepare_environment
    update_startup_state "preparing"
    
    # Step 5: Start dashboard
    update_startup_state "starting"
    if ! start_dashboard; then
        overall_success=false
    fi
    
    # Step 6: Verify health (only if startup was successful)
    if [[ "$overall_success" == "true" ]]; then
        update_startup_state "verifying"
        if ! verify_dashboard_health; then
            overall_success=false
        fi
    fi
    
    # Update final state
    if [[ "$overall_success" == "true" ]]; then
        update_startup_state "running"
    else
        update_startup_state "failed"
    fi
    
    # Display summary
    display_summary "$overall_success"
    
    log_startup "INFO" "=== STARTUP SEQUENCE COMPLETED ==="
    
    if [[ "$overall_success" == "true" ]]; then
        log_startup "INFO" "Startup completed successfully"
        
        # Clean up old shutdown state
        if [[ -f "$CONFIG_DIR/shutdown-state.json" ]]; then
            rm -f "$CONFIG_DIR/shutdown-state.json"
            log_startup "INFO" "Cleaned up previous shutdown state"
        fi
        
        exit 0
    else
        log_startup "ERROR" "Startup completed with errors"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-startup}" in
    "startup"|"start"|"")
        main
        ;;
    "quick"|"fast")
        STARTUP_TIMEOUT=30
        HEALTH_CHECK_RETRIES=3
        print_status "INFO" "Quick startup mode enabled"
        main
        ;;
    "debug"|"verbose")
        set -x
        print_status "INFO" "Debug mode enabled"
        main
        ;;
    "help"|"--help"|"-h")
        echo "Power-On System v1.0.0"
        echo ""
        echo "Usage: $0 [option]"
        echo ""
        echo "Options:"
        echo "  startup, start, (default)  Normal startup sequence"
        echo "  quick                      Quick startup with reduced timeouts"
        echo "  debug                      Enable debug output"
        echo "  help                       Show this help message"
        echo ""
        echo "The startup process includes:"
        echo "  1. System prerequisite verification"
        echo "  2. Previous shutdown state detection"
        echo "  3. Configuration restoration"
        echo "  4. Runtime environment preparation"
        echo "  5. Dashboard service startup"
        echo "  6. Health verification and readiness checks"
        ;;
    *)
        print_status "ERROR" "Unknown option: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac