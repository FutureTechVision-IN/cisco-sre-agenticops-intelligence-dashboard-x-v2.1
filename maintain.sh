#!/bin/bash

##############################################################################
# Cisco SRE AgenticOps Intelligence Dashboard - Maintenance Script
# Comprehensive system maintenance, cleanup, and health checks
# Version: 1.0.0
##############################################################################

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/maintenance.log"

# Ensure logs directory exists
mkdir -p "$SCRIPT_DIR/logs"

# Logging function
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

print_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║           🔧 CISCO SRE AGENTICOPS DASHBOARD - MAINTENANCE SYSTEM            ║"
    echo "║                              Version 1.0.0                                   ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

show_usage() {
    echo -e "${CYAN}Usage: $0 [COMMAND] [OPTIONS]${NC}"
    echo
    echo "Commands:"
    echo "  health          Run comprehensive health checks"
    echo "  clean           Clean build artifacts and temp files"
    echo "  deps            Update and audit dependencies"
    echo "  logs            Manage and clean log files"
    echo "  docker          Docker system cleanup"
    echo "  git             Git repository maintenance"
    echo "  full            Run full maintenance (all above)"
    echo "  status          Show system status"
    echo
    echo "Options:"
    echo "  --force         Force operations without confirmation"
    echo "  --verbose       Show detailed output"
    echo "  -h, --help      Show this help message"
    echo
    echo "Examples:"
    echo "  $0 health              # Run health checks"
    echo "  $0 clean --force       # Clean without confirmation"
    echo "  $0 full                # Full maintenance cycle"
    echo
}

# Health check: Node.js and npm
check_node_health() {
    log "${BLUE}🔍 Checking Node.js environment...${NC}"
    
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version)
        log "${GREEN}  ✅ Node.js: $node_version${NC}"
    else
        log "${RED}  ❌ Node.js not found${NC}"
        return 1
    fi
    
    if command -v npm >/dev/null 2>&1; then
        local npm_version=$(npm --version)
        log "${GREEN}  ✅ npm: $npm_version${NC}"
    else
        log "${RED}  ❌ npm not found${NC}"
        return 1
    fi
    
    return 0
}

# Health check: Dependencies
check_dependencies() {
    log "${BLUE}🔍 Checking project dependencies...${NC}"
    
    if [[ ! -d "$SCRIPT_DIR/node_modules" ]]; then
        log "${YELLOW}  ⚠️  node_modules not found${NC}"
        return 1
    fi
    
    # Check for critical dependencies
    local critical_deps=("vite" "tsx" "react" "typescript")
    local missing=()
    
    for dep in "${critical_deps[@]}"; do
        if [[ ! -d "$SCRIPT_DIR/node_modules/$dep" ]]; then
            missing+=("$dep")
        fi
    done
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        log "${YELLOW}  ⚠️  Missing dependencies: ${missing[*]}${NC}"
        return 1
    fi
    
    log "${GREEN}  ✅ All critical dependencies installed${NC}"
    return 0
}

# Health check: Docker
check_docker_health() {
    log "${BLUE}🔍 Checking Docker environment...${NC}"
    
    if ! command -v docker >/dev/null 2>&1; then
        log "${YELLOW}  ⚠️  Docker not installed${NC}"
        return 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        log "${YELLOW}  ⚠️  Docker daemon not running${NC}"
        return 1
    fi
    
    local docker_version=$(docker --version)
    log "${GREEN}  ✅ Docker: $docker_version${NC}"
    
    # Check Docker Compose
    if docker compose version >/dev/null 2>&1; then
        local compose_version=$(docker compose version --short)
        log "${GREEN}  ✅ Docker Compose: $compose_version${NC}"
    else
        log "${YELLOW}  ⚠️  Docker Compose not available${NC}"
    fi
    
    return 0
}

# Health check: Git
check_git_health() {
    log "${BLUE}🔍 Checking Git repository...${NC}"
    
    if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        log "${RED}  ❌ Not a Git repository${NC}"
        return 1
    fi
    
    # Check for uncommitted changes
    if [[ -n "$(git status --porcelain)" ]]; then
        local changed_files=$(git status --porcelain | wc -l | xargs)
        log "${YELLOW}  ⚠️  $changed_files uncommitted changes${NC}"
    else
        log "${GREEN}  ✅ Working directory clean${NC}"
    fi
    
    # Check current branch
    local current_branch=$(git branch --show-current)
    log "${CYAN}  ℹ️  Current branch: $current_branch${NC}"
    
    # Check remote tracking
    if git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
        local remote_branch=$(git rev-parse --abbrev-ref --symbolic-full-name @{u})
        log "${GREEN}  ✅ Tracking: $remote_branch${NC}"
    else
        log "${YELLOW}  ⚠️  No upstream branch configured${NC}"
    fi
    
    return 0
}

# Health check: Ports
check_ports() {
    log "${BLUE}🔍 Checking port availability...${NC}"
    
    local ports=(3000 5000 8000 5432 6379)
    local occupied=()
    
    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            local process=$(lsof -Pi :$port -sTCP:LISTEN -t | head -1)
            local process_name=$(ps -p $process -o comm= 2>/dev/null || echo "unknown")
            occupied+=("$port ($process_name)")
        fi
    done
    
    if [[ ${#occupied[@]} -gt 0 ]]; then
        log "${YELLOW}  ⚠️  Ports in use: ${occupied[*]}${NC}"
    else
        log "${GREEN}  ✅ All common ports available${NC}"
    fi
    
    return 0
}

# Health check: Disk space
check_disk_space() {
    log "${BLUE}🔍 Checking disk space...${NC}"
    
    local project_size=$(du -sh "$SCRIPT_DIR" 2>/dev/null | cut -f1)
    log "${CYAN}  ℹ️  Project size: $project_size${NC}"
    
    if [[ -d "$SCRIPT_DIR/node_modules" ]]; then
        local node_modules_size=$(du -sh "$SCRIPT_DIR/node_modules" 2>/dev/null | cut -f1)
        log "${CYAN}  ℹ️  node_modules: $node_modules_size${NC}"
    fi
    
    if [[ -d "$SCRIPT_DIR/build" ]]; then
        local build_size=$(du -sh "$SCRIPT_DIR/build" 2>/dev/null | cut -f1)
        log "${CYAN}  ℹ️  build: $build_size${NC}"
    fi
    
    return 0
}

# Run all health checks
run_health_checks() {
    log "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
    log "${MAGENTA}🏥 RUNNING COMPREHENSIVE HEALTH CHECKS${NC}"
    log "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
    echo
    
    local checks_passed=0
    local checks_total=6
    
    check_node_health && ((checks_passed++)) || true
    echo
    check_dependencies && ((checks_passed++)) || true
    echo
    check_docker_health && ((checks_passed++)) || true
    echo
    check_git_health && ((checks_passed++)) || true
    echo
    check_ports && ((checks_passed++)) || true
    echo
    check_disk_space && ((checks_passed++)) || true
    echo
    
    log "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
    log "${CYAN}Health Check Results: $checks_passed/$checks_total passed${NC}"
    log "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
    
    return 0
}

# Clean build artifacts
clean_build_artifacts() {
    log "${BLUE}🧹 Cleaning build artifacts...${NC}"
    
    local cleaned=0
    
    if [[ -d "$SCRIPT_DIR/build" ]]; then
        rm -rf "$SCRIPT_DIR/build"
        log "${GREEN}  ✅ Removed build/${NC}"
        ((cleaned++))
    fi
    
    if [[ -d "$SCRIPT_DIR/dist" ]]; then
        rm -rf "$SCRIPT_DIR/dist"
        log "${GREEN}  ✅ Removed dist/${NC}"
        ((cleaned++))
    fi
    
    if [[ -d "$SCRIPT_DIR/.vite" ]]; then
        rm -rf "$SCRIPT_DIR/.vite"
        log "${GREEN}  ✅ Removed .vite/${NC}"
        ((cleaned++))
    fi
    
    if [[ $cleaned -eq 0 ]]; then
        log "${CYAN}  ℹ️  No build artifacts to clean${NC}"
    fi
    
    return 0
}

# Clean log files
clean_logs() {
    log "${BLUE}🧹 Cleaning old log files...${NC}"
    
    if [[ ! -d "$SCRIPT_DIR/logs" ]]; then
        log "${CYAN}  ℹ️  No logs directory${NC}"
        return 0
    fi
    
    # Keep logs from last 7 days
    local log_count=$(find "$SCRIPT_DIR/logs" -name "*.log" -mtime +7 | wc -l | xargs)
    
    if [[ $log_count -gt 0 ]]; then
        find "$SCRIPT_DIR/logs" -name "*.log" -mtime +7 -delete
        log "${GREEN}  ✅ Removed $log_count old log files${NC}"
    else
        log "${CYAN}  ℹ️  No old log files to clean${NC}"
    fi
    
    return 0
}

# Clean temp files
clean_temp_files() {
    log "${BLUE}🧹 Cleaning temporary files...${NC}"
    
    local cleaned=0
    
    # Remove PID files
    if [[ -f "$SCRIPT_DIR/.startup_pids" ]]; then
        rm -f "$SCRIPT_DIR/.startup_pids"
        ((cleaned++))
    fi
    
    # Remove cache directories
    if [[ -d "$SCRIPT_DIR/.cache" ]]; then
        rm -rf "$SCRIPT_DIR/.cache"
        ((cleaned++))
    fi
    
    # Remove macOS files
    find "$SCRIPT_DIR" -name ".DS_Store" -delete 2>/dev/null || true
    
    if [[ $cleaned -gt 0 ]]; then
        log "${GREEN}  ✅ Cleaned $cleaned temp items${NC}"
    else
        log "${CYAN}  ℹ️  No temp files to clean${NC}"
    fi
    
    return 0
}

# Run cleanup
run_cleanup() {
    log "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
    log "${MAGENTA}🧹 RUNNING CLEANUP OPERATIONS${NC}"
    log "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
    echo
    
    clean_build_artifacts
    echo
    clean_logs
    echo
    clean_temp_files
    echo
    
    log "${GREEN}✅ Cleanup complete${NC}"
    return 0
}

# Update dependencies
update_dependencies() {
    log "${BLUE}📦 Checking for dependency updates...${NC}"
    
    if ! command -v npm >/dev/null 2>&1; then
        log "${RED}  ❌ npm not found${NC}"
        return 1
    fi
    
    log "${CYAN}  ℹ️  Running npm outdated...${NC}"
    npm outdated || true
    
    log "${YELLOW}  💡 Run 'npm update' to update dependencies${NC}"
    log "${YELLOW}  💡 Run 'npm audit' to check for vulnerabilities${NC}"
    
    return 0
}

# Audit dependencies
audit_dependencies() {
    log "${BLUE}🔒 Auditing dependencies for vulnerabilities...${NC}"
    
    if ! command -v npm >/dev/null 2>&1; then
        log "${RED}  ❌ npm not found${NC}"
        return 1
    fi
    
    if npm audit --audit-level=moderate; then
        log "${GREEN}  ✅ No vulnerabilities found${NC}"
    else
        log "${YELLOW}  ⚠️  Vulnerabilities detected${NC}"
        log "${YELLOW}  💡 Run 'npm audit fix' to fix them${NC}"
    fi
    
    return 0
}

# Docker cleanup
docker_cleanup() {
    log "${BLUE}🐳 Docker system cleanup...${NC}"
    
    if ! command -v docker >/dev/null 2>&1; then
        log "${YELLOW}  ⚠️  Docker not installed${NC}"
        return 0
    fi
    
    if ! docker info >/dev/null 2>&1; then
        log "${YELLOW}  ⚠️  Docker daemon not running${NC}"
        return 0
    fi
    
    log "${CYAN}  ℹ️  Pruning unused Docker resources...${NC}"
    
    # Remove dangling images
    docker image prune -f 2>&1 | grep -v "^$" | sed 's/^/    /'
    
    # Remove unused volumes
    docker volume prune -f 2>&1 | grep -v "^$" | sed 's/^/    /'
    
    log "${GREEN}  ✅ Docker cleanup complete${NC}"
    return 0
}

# Git maintenance
git_maintenance() {
    log "${BLUE}🔧 Git repository maintenance...${NC}"
    
    if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        log "${YELLOW}  ⚠️  Not a Git repository${NC}"
        return 0
    fi
    
    log "${CYAN}  ℹ️  Running git gc...${NC}"
    git gc --auto --quiet
    
    log "${CYAN}  ℹ️  Pruning remote tracking branches...${NC}"
    git remote prune origin
    
    log "${GREEN}  ✅ Git maintenance complete${NC}"
    return 0
}

# Show system status
show_status() {
    log "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
    log "${MAGENTA}📊 SYSTEM STATUS${NC}"
    log "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
    echo
    
    # Running processes
    log "${BLUE}Running Services:${NC}"
    if [[ -f "$SCRIPT_DIR/.startup_pids" ]]; then
        while IFS=: read -r service_name pid; do
            if kill -0 "$pid" 2>/dev/null; then
                log "${GREEN}  ✅ $service_name (PID: $pid)${NC}"
            else
                log "${YELLOW}  ⚠️  $service_name (not running)${NC}"
            fi
        done < "$SCRIPT_DIR/.startup_pids"
    else
        log "${CYAN}  ℹ️  No services tracked${NC}"
    fi
    
    echo
    
    # Docker status
    if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
        log "${BLUE}Docker Containers:${NC}"
        if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -v NAMES | grep -q .; then
            docker ps --format "  {{.Names}}: {{.Status}}"
        else
            log "${CYAN}  ℹ️  No running containers${NC}"
        fi
    fi
    
    echo
    
    # Git status
    if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        log "${BLUE}Git Repository:${NC}"
        log "${CYAN}  Branch: $(git branch --show-current)${NC}"
        
        local uncommitted=$(git status --porcelain | wc -l | xargs)
        if [[ $uncommitted -gt 0 ]]; then
            log "${YELLOW}  Uncommitted: $uncommitted files${NC}"
        else
            log "${GREEN}  Clean working directory${NC}"
        fi
    fi
    
    return 0
}

# Full maintenance
run_full_maintenance() {
    log "${MAGENTA}╔══════════════════════════════════════════════════════════╗${NC}"
    log "${MAGENTA}║        🔧 FULL MAINTENANCE CYCLE INITIATED              ║${NC}"
    log "${MAGENTA}╚══════════════════════════════════════════════════════════╝${NC}"
    echo
    
    run_health_checks
    echo
    run_cleanup
    echo
    update_dependencies
    echo
    audit_dependencies
    echo
    docker_cleanup
    echo
    git_maintenance
    echo
    
    log "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    log "${GREEN}║        ✅ FULL MAINTENANCE COMPLETE                     ║${NC}"
    log "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    
    return 0
}

# Main execution
main() {
    print_banner
    
    local command="${1:-}"
    
    if [[ -z "$command" ]]; then
        show_usage
        exit 0
    fi
    
    case "$command" in
        health)
            run_health_checks
            ;;
        clean)
            run_cleanup
            ;;
        deps)
            update_dependencies
            echo
            audit_dependencies
            ;;
        logs)
            clean_logs
            ;;
        docker)
            docker_cleanup
            ;;
        git)
            git_maintenance
            ;;
        full)
            run_full_maintenance
            ;;
        status)
            show_status
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown command: $command${NC}"
            echo
            show_usage
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"
