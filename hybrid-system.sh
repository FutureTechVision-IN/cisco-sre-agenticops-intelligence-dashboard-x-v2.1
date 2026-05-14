#!/bin/bash

##############################################################################
# Cisco SRE AgenticOps Intelligence Dashboard - Hybrid Startup/Shutdown System
# Intelligently determines execution path based on Docker container status
# Version: 1.0.0 - Intelligent Hybrid Control System
##############################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/hybrid-system.log"
DOCKER_COMPOSE_FILE="$SCRIPT_DIR/docker-compose.enhanced.yml"
DASHBOARD_CONTAINER_PATTERN="cisco-sre.*dashboard"
DASHBOARD_SERVICE_NAME="dashboard"

# Ensure logs directory exists
mkdir -p "$LOG_DIR"

# ============================================================================
# LOGGING FUNCTIONS
# ============================================================================

log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local color=""
    local prefix=""
    
    case "$level" in
        "INFO")    color="$BLUE";    prefix="ℹ️ " ;;
        "SUCCESS") color="$GREEN";   prefix="✅" ;;
        "WARN")    color="$YELLOW";  prefix="⚠️ " ;;
        "ERROR")   color="$RED";     prefix="❌" ;;
        "DEBUG")   color="$MAGENTA"; prefix="🔍" ;;
        "STEP")    color="$CYAN";    prefix="▶️ " ;;
        *)         color="$NC";      prefix="  " ;;
    esac
    
    # Console output with colors
    echo -e "${color}[$timestamp] $prefix $message${NC}"
    
    # Log file output (no colors)
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

log_separator() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >> "$LOG_FILE"
}

# ============================================================================
# BANNER FUNCTIONS
# ============================================================================

print_banner() {
    local mode="$1"
    local mode_text=""
    local mode_emoji=""
    
    case "$mode" in
        "start")    mode_text="STARTUP SYSTEM";    mode_emoji="🚀" ;;
        "stop")     mode_text="SHUTDOWN SYSTEM";   mode_emoji="🛑" ;;
        "restart")  mode_text="RESTART SYSTEM";    mode_emoji="🔄" ;;
        "status")   mode_text="STATUS CHECK";      mode_emoji="📊" ;;
        *)          mode_text="HYBRID SYSTEM";     mode_emoji="⚡" ;;
    esac
    
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                   ${mode_emoji} CISCO SRE AGENTICOPS DASHBOARD                      ║"
    echo "║                        Intelligent Hybrid Control System                     ║"
    echo "║                              ${mode_text}                               ║"
    echo "║                              Version 1.0.0                                  ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# ============================================================================
# DOCKER STATUS DETECTION
# ============================================================================

# Check if Docker daemon is available and running
check_docker_daemon() {
    log "DEBUG" "Checking Docker daemon status..."
    
    if ! command -v docker >/dev/null 2>&1; then
        log "WARN" "Docker is not installed on this system"
        return 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        log "WARN" "Docker is installed but daemon is not running"
        return 1
    fi
    
    log "SUCCESS" "Docker daemon is available and running"
    return 0
}

# Check if dashboard container is running
check_dashboard_container_running() {
    log "DEBUG" "Checking if dashboard container is running..."
    
    # Use docker ps to check for running containers matching our pattern
    local running_containers=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E "$DASHBOARD_CONTAINER_PATTERN" || true)
    
    if [[ -n "$running_containers" ]]; then
        log "SUCCESS" "Dashboard container is running: $running_containers"
        return 0
    else
        log "INFO" "No dashboard container is currently running"
        return 1
    fi
}

# Check if any project containers exist (running or stopped)
check_containers_exist() {
    log "DEBUG" "Checking for any existing project containers..."
    
    local all_containers=$(docker ps -a --format '{{.Names}}' 2>/dev/null | grep -E "$DASHBOARD_CONTAINER_PATTERN" || true)
    
    if [[ -n "$all_containers" ]]; then
        log "INFO" "Found existing containers: $all_containers"
        return 0
    else
        log "INFO" "No project containers found"
        return 1
    fi
}

# Get detailed container status
get_container_status() {
    log "STEP" "Gathering container status information..."
    echo ""
    
    if ! check_docker_daemon; then
        echo -e "${YELLOW}Docker Status: NOT AVAILABLE${NC}"
        return 1
    fi
    
    echo -e "${BOLD}Container Status:${NC}"
    echo ""
    
    # Check docker-compose services
    if [[ -f "$DOCKER_COMPOSE_FILE" ]]; then
        log "DEBUG" "Checking docker-compose services..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" ps 2>/dev/null || {
            log "WARN" "Could not get docker-compose status"
        }
    fi
    
    echo ""
    return 0
}

# ============================================================================
# STARTUP OPERATIONS
# ============================================================================

# Docker rebuild and restart
docker_rebuild_restart() {
    log "STEP" "Executing Docker rebuild and restart sequence..."
    log_separator
    
    # Step 1: Stop existing containers gracefully
    log "INFO" "Stopping existing containers..."
    if docker-compose -f "$DOCKER_COMPOSE_FILE" down 2>&1 | tee -a "$LOG_FILE"; then
        log "SUCCESS" "Containers stopped successfully"
    else
        log "WARN" "Some containers may not have stopped cleanly, continuing..."
    fi
    
    # Step 2: Rebuild the dashboard with latest changes
    log "STEP" "Rebuilding dashboard container with latest changes..."
    if docker-compose -f "$DOCKER_COMPOSE_FILE" build $DASHBOARD_SERVICE_NAME 2>&1 | tee -a "$LOG_FILE"; then
        log "SUCCESS" "Dashboard rebuilt successfully"
    else
        log "ERROR" "Dashboard rebuild failed!"
        return 1
    fi
    
    # Step 3: Start all services
    log "STEP" "Starting all services..."
    if docker-compose -f "$DOCKER_COMPOSE_FILE" up -d 2>&1 | tee -a "$LOG_FILE"; then
        log "SUCCESS" "All services started successfully"
    else
        log "ERROR" "Failed to start services!"
        return 1
    fi
    
    # Step 4: Verify containers are running
    log "STEP" "Verifying container status..."
    sleep 3  # Wait for containers to initialize
    
    if check_dashboard_container_running; then
        log "SUCCESS" "Dashboard container is running and healthy"
    else
        log "ERROR" "Dashboard container failed to start!"
        return 1
    fi
    
    # Step 5: Health check
    log "STEP" "Performing health check..."
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health 2>/dev/null | grep -q "200\|404"; then
            log "SUCCESS" "Dashboard is responding on port 8000"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            log "WARN" "Health check timed out, but container is running"
        fi
        
        log "DEBUG" "Health check attempt $attempt/$max_attempts..."
        sleep 1
        ((attempt++))
    done
    
    return 0
}

# Regular startup via start.sh
regular_startup() {
    log "STEP" "Executing regular startup sequence via start.sh..."
    log_separator
    
    if [[ ! -f "$SCRIPT_DIR/start.sh" ]]; then
        log "ERROR" "start.sh not found in $SCRIPT_DIR"
        return 1
    fi
    
    if [[ ! -x "$SCRIPT_DIR/start.sh" ]]; then
        log "INFO" "Making start.sh executable..."
        chmod +x "$SCRIPT_DIR/start.sh"
    fi
    
    log "INFO" "Executing start.sh..."
    if "$SCRIPT_DIR/start.sh" 2>&1 | tee -a "$LOG_FILE"; then
        log "SUCCESS" "start.sh completed successfully"
        return 0
    else
        local exit_code=$?
        log "ERROR" "start.sh failed with exit code: $exit_code"
        return $exit_code
    fi
}

# Main startup logic - intelligent path determination
do_startup() {
    print_banner "start"
    log "STEP" "Initiating intelligent startup sequence..."
    log "INFO" "Log file: $LOG_FILE"
    log_separator
    
    local docker_available=false
    local container_running=false
    
    # Step 1: Check Docker status
    log "STEP" "Step 1: Checking Docker environment..."
    if check_docker_daemon; then
        docker_available=true
        
        # Step 2: Check if container is already running
        log "STEP" "Step 2: Checking container status..."
        if check_dashboard_container_running; then
            container_running=true
        fi
    fi
    
    # Step 3: Determine execution path
    log "STEP" "Step 3: Determining execution path..."
    log_separator
    
    if $docker_available; then
        if $container_running; then
            log "INFO" "🐳 Docker container is RUNNING"
            log "INFO" "→ Execution Path: Docker Rebuild & Restart"
            log_separator
            docker_rebuild_restart
        else
            log "INFO" "🐳 Docker is available but container is NOT running"
            log "INFO" "→ Execution Path: Docker Rebuild & Start"
            log_separator
            docker_rebuild_restart
        fi
    else
        log "INFO" "🖥️  Docker is NOT available"
        log "INFO" "→ Execution Path: Regular Startup (start.sh)"
        log_separator
        regular_startup
    fi
    
    local result=$?
    log_separator
    
    if [[ $result -eq 0 ]]; then
        echo ""
        echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║                    🎉 STARTUP COMPLETED SUCCESSFULLY!                       ║${NC}"
        echo -e "${GREEN}║                    Dashboard: http://localhost:8000                         ║${NC}"
        echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
        log "SUCCESS" "System startup completed successfully"
    else
        echo ""
        echo -e "${RED}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║                         ❌ STARTUP FAILED!                                   ║${NC}"
        echo -e "${RED}║                    Check logs: $LOG_FILE                                     ║${NC}"
        echo -e "${RED}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
        log "ERROR" "System startup failed"
    fi
    
    return $result
}

# ============================================================================
# SHUTDOWN OPERATIONS
# ============================================================================

# Docker shutdown
docker_shutdown() {
    log "STEP" "Executing Docker shutdown sequence..."
    log_separator
    
    if [[ -f "$DOCKER_COMPOSE_FILE" ]]; then
        log "INFO" "Stopping Docker Compose services..."
        if docker-compose -f "$DOCKER_COMPOSE_FILE" down 2>&1 | tee -a "$LOG_FILE"; then
            log "SUCCESS" "Docker services stopped successfully"
        else
            log "WARN" "Some Docker services may not have stopped cleanly"
        fi
    else
        log "WARN" "Docker Compose file not found, attempting direct container stop..."
        local containers=$(docker ps -q --filter "name=$DASHBOARD_CONTAINER_PATTERN" 2>/dev/null || true)
        if [[ -n "$containers" ]]; then
            docker stop $containers 2>&1 | tee -a "$LOG_FILE" || true
            log "SUCCESS" "Containers stopped"
        fi
    fi
    
    return 0
}

# Regular shutdown via stop.sh
regular_shutdown() {
    log "STEP" "Executing regular shutdown sequence via stop.sh..."
    log_separator
    
    if [[ ! -f "$SCRIPT_DIR/stop.sh" ]]; then
        log "ERROR" "stop.sh not found in $SCRIPT_DIR"
        return 1
    fi
    
    if [[ ! -x "$SCRIPT_DIR/stop.sh" ]]; then
        log "INFO" "Making stop.sh executable..."
        chmod +x "$SCRIPT_DIR/stop.sh"
    fi
    
    log "INFO" "Executing stop.sh..."
    if "$SCRIPT_DIR/stop.sh" 2>&1 | tee -a "$LOG_FILE"; then
        log "SUCCESS" "stop.sh completed successfully"
        return 0
    else
        local exit_code=$?
        log "ERROR" "stop.sh failed with exit code: $exit_code"
        return $exit_code
    fi
}

# Main shutdown logic
do_shutdown() {
    print_banner "stop"
    log "STEP" "Initiating intelligent shutdown sequence..."
    log "INFO" "Log file: $LOG_FILE"
    log_separator
    
    local docker_available=false
    local container_running=false
    
    # Check Docker status
    log "STEP" "Step 1: Checking Docker environment..."
    if check_docker_daemon; then
        docker_available=true
        if check_dashboard_container_running; then
            container_running=true
        fi
    fi
    
    # Always use stop.sh first for consistency, then ensure Docker is clean
    log "STEP" "Step 2: Executing primary shutdown..."
    log_separator
    
    regular_shutdown
    local stop_result=$?
    
    # Fallback: If Docker containers are still running, stop them
    if $docker_available && check_dashboard_container_running; then
        log "STEP" "Step 3: Fallback - Docker containers still running, forcing stop..."
        docker_shutdown
    else
        log "INFO" "Step 3: No fallback needed - all services stopped"
    fi
    
    # Verify shutdown
    log "STEP" "Step 4: Verifying shutdown..."
    if $docker_available; then
        if check_dashboard_container_running; then
            log "WARN" "Some containers may still be running"
        else
            log "SUCCESS" "All containers stopped successfully"
        fi
    fi
    
    log_separator
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    🛑 SHUTDOWN COMPLETED SUCCESSFULLY!                       ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    log "SUCCESS" "System shutdown completed"
    
    return 0
}

# ============================================================================
# RESTART OPERATION
# ============================================================================

do_restart() {
    print_banner "restart"
    log "STEP" "Initiating restart sequence (shutdown + startup)..."
    log_separator
    
    # Shutdown first
    log "INFO" "Phase 1: Shutdown..."
    do_shutdown
    
    # Small delay between shutdown and startup
    log "INFO" "Waiting 2 seconds before startup..."
    sleep 2
    
    # Startup
    log "INFO" "Phase 2: Startup..."
    do_startup
    
    return $?
}

# ============================================================================
# STATUS OPERATION
# ============================================================================

do_status() {
    print_banner "status"
    log "STEP" "Gathering system status..."
    log_separator
    
    echo -e "${BOLD}System Status Report${NC}"
    echo -e "${BOLD}═══════════════════${NC}"
    echo ""
    
    # Docker status
    echo -e "${BOLD}Docker Environment:${NC}"
    if check_docker_daemon; then
        echo -e "  Docker Daemon: ${GREEN}Running${NC}"
        
        if check_dashboard_container_running; then
            echo -e "  Dashboard Container: ${GREEN}Running${NC}"
        else
            if check_containers_exist; then
                echo -e "  Dashboard Container: ${YELLOW}Stopped${NC}"
            else
                echo -e "  Dashboard Container: ${RED}Not Found${NC}"
            fi
        fi
    else
        echo -e "  Docker Daemon: ${RED}Not Available${NC}"
    fi
    
    echo ""
    
    # Container details
    if check_docker_daemon; then
        echo -e "${BOLD}Container Details:${NC}"
        docker-compose -f "$DOCKER_COMPOSE_FILE" ps 2>/dev/null || echo "  Unable to retrieve container details"
    fi
    
    echo ""
    
    # Port status
    echo -e "${BOLD}Port Status:${NC}"
    for port in 8000 5001 5432 6379; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "  Port $port: ${GREEN}In Use${NC}"
        else
            echo -e "  Port $port: ${YELLOW}Available${NC}"
        fi
    done
    
    echo ""
    log "SUCCESS" "Status check completed"
    
    return 0
}

# ============================================================================
# HELP
# ============================================================================

print_help() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                   CISCO SRE AGENTICOPS HYBRID SYSTEM                         ║"
    echo "║                              Command Reference                               ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo -e "${BOLD}USAGE:${NC}"
    echo "  ./hybrid-system.sh [COMMAND]"
    echo ""
    echo -e "${BOLD}COMMANDS:${NC}"
    echo -e "  ${GREEN}start${NC}     Start the system (intelligent Docker detection)"
    echo -e "  ${GREEN}stop${NC}      Stop the system (graceful shutdown with fallback)"
    echo -e "  ${GREEN}restart${NC}   Stop and start the system"
    echo -e "  ${GREEN}status${NC}    Show current system status"
    echo -e "  ${GREEN}help${NC}      Show this help message"
    echo ""
    echo -e "${BOLD}INTELLIGENT STARTUP BEHAVIOR:${NC}"
    echo "  • If Docker container is RUNNING → Rebuild & Restart"
    echo "  • If Docker is available but container is stopped → Rebuild & Start"
    echo "  • If Docker is NOT available → Execute start.sh"
    echo ""
    echo -e "${BOLD}INTELLIGENT SHUTDOWN BEHAVIOR:${NC}"
    echo "  • Always executes stop.sh first for consistency"
    echo "  • Fallback: Forces Docker container stop if still running"
    echo ""
    echo -e "${BOLD}LOG FILE:${NC}"
    echo "  $LOG_FILE"
    echo ""
}

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

main() {
    local command="${1:-help}"
    
    # Initialize log file with session marker
    echo "" >> "$LOG_FILE"
    echo "================================================================================" >> "$LOG_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] NEW SESSION - Command: $command" >> "$LOG_FILE"
    echo "================================================================================" >> "$LOG_FILE"
    
    case "$command" in
        start|up)
            do_startup
            ;;
        stop|down)
            do_shutdown
            ;;
        restart|reload)
            do_restart
            ;;
        status|ps)
            do_status
            ;;
        help|-h|--help)
            print_help
            ;;
        *)
            echo -e "${RED}Unknown command: $command${NC}"
            echo ""
            print_help
            exit 1
            ;;
    esac
    
    exit $?
}

# Run main with all arguments
main "$@"
