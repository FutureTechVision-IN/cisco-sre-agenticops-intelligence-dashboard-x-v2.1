#!/bin/bash

###############################################################################
# SRE AgenticOps Intelligence Dashboard - Production Start Script
# Handles database setup, environment validation, and graceful startup
###############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date +'%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date +'%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date +'%Y-%m-%d %H:%M:%S') - $1"
}

# Check required environment variables
check_env_vars() {
    log_info "Checking environment variables..."
    
    local required_vars=("DATABASE_URL" "NODE_ENV")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        log_info "Required: DATABASE_URL, NODE_ENV"
        log_info "Optional: SMTP_HOST, SMTP_PORT, ALERT_FROM_EMAIL, SENDGRID_API_KEY"
        exit 1
    fi
    
    log_info "Environment variables validated ✓"
}

# Test database connection
test_database() {
    log_info "Testing database connection..."
    
    if ! psql "$DATABASE_URL" -c "SELECT 1" &>/dev/null; then
        log_error "Failed to connect to database"
        log_info "Please verify DATABASE_URL is correct"
        exit 1
    fi
    
    log_info "Database connection successful ✓"
}

# Install dependencies
install_deps() {
    log_info "Installing dependencies..."
    npm install --production
    log_info "Dependencies installed ✓"
}

# Run database migrations
run_migrations() {
    log_info "Running database schema migrations..."
    
    if npm run db:push -- --force; then
        log_info "Database schema synced ✓"
    else
        log_warn "Database schema sync skipped or failed (may already be in sync)"
    fi
}

# Build application
build_app() {
    log_info "Building application..."
    npm run build
    log_info "Application build complete ✓"
}

# Start application
start_app() {
    log_info "Starting SRE AgenticOps Intelligence Dashboard..."
    log_info "Environment: $NODE_ENV"
    log_info "Database: ${DATABASE_URL%@*}@[HIDDEN]"
    
    # Create PID file
    echo $$ > .app.pid
    
    # Start the application
    NODE_ENV="${NODE_ENV:-production}" npm start
}

# Trap signals for graceful shutdown
trap 'log_info "Shutdown signal received"; exit 0' SIGTERM SIGINT

# Main execution
main() {
    log_info "=== SRE AgenticOps Dashboard Startup ==="
    log_info "Node.js version: $(node --version)"
    log_info "npm version: $(npm --version)"
    
    check_env_vars
    test_database
    install_deps
    run_migrations
    build_app
    start_app
}

# Run main function
main "$@"
