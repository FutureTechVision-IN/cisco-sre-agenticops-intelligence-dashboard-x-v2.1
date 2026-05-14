#!/usr/bin/env bash
##############################################################################
# Cisco SRE AgenticOps Intelligence Dashboard – Cross-Platform Start Script
# Version: 7.0.0 (macOS/Linux)
#
# Architecture (native mode):
#   PRODUCTION  →  single process: node build/index.js
#                  (Express serves static dist/ on $PORT)
#   DEV         →  single process: npx tsx backend/index-dev.ts
#                  (Express + Vite-as-middleware on $PORT; HMR included)
#
# Port Management:
#   - Default port: 8000 (overridable via --port or PORT env var)
#   - Automatic fallback: if default port is occupied, tries 8080, then
#     incrementally scans until a free port is found.
#   - macOS AirPlay (ControlCenter) on *:5000 is not a concern since
#     default is now 8000.
#
# Usage:
#   ./start.sh                  # auto-detect prod vs dev, open browser
#   ./start.sh --prod           # force production mode
#   ./start.sh --dev            # force development mode (HMR)
#   ./start.sh --docker         # Docker Compose (all services)
#   ./start.sh --hybrid         # Docker DB + native app
#   ./start.sh --build          # force rebuild before starting
#   ./start.sh --no-health      # skip health check wait
#   ./start.sh --no-open        # skip auto-opening browser
#   ./start.sh --port 9000      # override port (disables auto-fallback)
##############################################################################

set -euo pipefail

# ─── Colour codes ─────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

# ─── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/startup.log"
PID_FILE="$SCRIPT_DIR/.dashboard.pid"

# ─── Defaults ─────────────────────────────────────────────────────────────────
MODE="auto"          # auto | native | docker | hybrid
APP_MODE="auto"      # auto | prod | dev  (native only)
FORCE_BUILD=false
SKIP_HEALTH=false
OPEN_BROWSER=true
PORT="${PORT:-8000}"
PORT_EXPLICIT=false  # true if user passed --port; disables auto-fallback
FALLBACK_PORTS=(8080 9000 3000 5000)

mkdir -p "$LOG_DIR"

# ─── Logging ──────────────────────────────────────────────────────────────────
log()  { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
info() { log "${GREEN}[OK]   $*${NC}"; }
warn() { log "${YELLOW}[WARN] $*${NC}"; }
err()  { log "${RED}[ERR]  $*${NC}"; }
step() { log "${BLUE}[>]    $*${NC}"; }

# ─── Usage ────────────────────────────────────────────────────────────────────
show_usage() {
    echo -e "${CYAN}Usage: $0 [OPTIONS]${NC}"
    echo
    echo "  --prod        Production mode  (node build/index.js)"
    echo "  --dev         Development mode (tsx + Vite HMR)"
    echo "  --native      Force native mode (skip Docker detection)"
    echo "  --docker      All services via Docker Compose"
    echo "  --hybrid      Docker DB + native app"
    echo "  --build       Force rebuild before start"
    echo "  --no-health   Skip health check"
    echo "  --no-open     Do not open browser automatically"
    echo "  --port N      Override port (default: 8000; disables auto-fallback)"
    echo "  -h, --help    Show this help"
    echo
    echo "Environment variables:"
    echo "  PORT          Default port (same as --port)"
    echo "  NODE_ENV      Force production/development"
}

# ─── Argument parsing ─────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case $1 in
        --prod)       APP_MODE="prod";   MODE="native"; shift ;;
        --dev)        APP_MODE="dev";    MODE="native"; shift ;;
        --native)     MODE="native";     shift ;;
        --docker)     MODE="docker";     shift ;;
        --hybrid)     MODE="hybrid";     shift ;;
        --build)      FORCE_BUILD=true;  shift ;;
        --no-health)  SKIP_HEALTH=true;  shift ;;
        --no-open)    OPEN_BROWSER=false; shift ;;
        --port)       PORT="$2"; PORT_EXPLICIT=true; shift 2 ;;
        -h|--help)    show_usage;        exit 0 ;;
        *)
            err "Unknown option: $1"
            show_usage; exit 1 ;;
    esac
done

# ─── Banner ───────────────────────────────────────────────────────────────────
echo -e "${CYAN}"
echo "=================================================================="
echo "  Cisco SRE AgenticOps Intelligence Dashboard v2.1"
echo "  Startup Script v7.0.0 | $(uname -s) $(uname -m)"
echo "=================================================================="
echo -e "${NC}"

# ─── Helper: check Docker ─────────────────────────────────────────────────────
check_docker() {
    command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1
}

# ─── Port detection: is a port available for use? ─────────────────────────────
# Returns 0 if port is AVAILABLE, 1 if blocked.
# On macOS, ControlCenter (AirPlay) binding *:5000 is not considered blocking
# because our server binds 127.0.0.1 specifically.
is_port_available() {
    local p="$1"
    # No listener at all → available
    if ! lsof -iTCP:"$p" -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    fi
    # On macOS: check if the ONLY listener is ControlCenter (AirPlay Receiver)
    local non_system
    non_system=$(lsof -iTCP:"$p" -sTCP:LISTEN 2>/dev/null \
        | awk 'NR>1 {print $1}' | grep -cvE '^ControlCe$' || true)
    if [[ "$non_system" == "0" ]]; then
        # Only AirPlay on this port; we can coexist on 127.0.0.1
        return 0
    fi
    return 1
}

# ─── Port resolution: find a usable port with fallback logic ──────────────────
resolve_port() {
    # If the requested port is available, use it
    if is_port_available "$PORT"; then
        return
    fi

    # If user explicitly chose a port, try to free it (only kills our processes)
    if [[ "$PORT_EXPLICIT" == "true" ]]; then
        warn "Port $PORT is in use. Attempting to free it..."
        free_port "$PORT"
        if is_port_available "$PORT"; then
            info "Port $PORT freed successfully"
            return
        fi
        err "Cannot free port $PORT. Another process is still listening."
        lsof -iTCP:"$PORT" -sTCP:LISTEN -n -P 2>/dev/null | head -5
        exit 1
    fi

    # Auto-fallback: try each candidate
    warn "Default port $PORT is occupied — scanning fallback ports..."
    for candidate in "${FALLBACK_PORTS[@]}"; do
        if [[ "$candidate" == "$PORT" ]]; then continue; fi
        if is_port_available "$candidate"; then
            info "Using fallback port $candidate"
            PORT="$candidate"
            return
        fi
    done

    # Last resort: scan from 8001 upward
    local scan=8001
    while [[ $scan -lt 9100 ]]; do
        if is_port_available "$scan"; then
            info "Using dynamically found port $scan"
            PORT="$scan"
            return
        fi
        ((scan++))
    done

    err "No available port found in range 8000-9100"
    exit 1
}

# ─── Free a specific port (only kills node/tsx/vite processes) ────────────────
free_port() {
    local p="$1"
    local pids
    pids=$(lsof -iTCP:"$p" -sTCP:LISTEN -t 2>/dev/null || true)
    [[ -z "$pids" ]] && return 0

    # Only kill node/tsx/vite/npm processes (never system services)
    for pid in $pids; do
        local cmd
        cmd=$(ps -p "$pid" -o comm= 2>/dev/null || true)
        if echo "$cmd" | grep -qE '^(node|tsx|npm|vite)$'; then
            kill -TERM "$pid" 2>/dev/null || true
        fi
    done
    sleep 2

    # Force-kill remaining (same filter)
    pids=$(lsof -iTCP:"$p" -sTCP:LISTEN -t 2>/dev/null || true)
    for pid in $pids; do
        local cmd
        cmd=$(ps -p "$pid" -o comm= 2>/dev/null || true)
        if echo "$cmd" | grep -qE '^(node|tsx|npm|vite)$'; then
            kill -9 "$pid" 2>/dev/null || true
        fi
    done
    sleep 1
}

# ─── Wait until a URL responds ────────────────────────────────────────────────
wait_for_url() {
    local url="$1" retries="${2:-30}" i=0
    while ! curl -sf "$url" >/dev/null 2>&1; do
        ((i++))
        if [[ $i -ge $retries ]]; then
            return 1
        fi
        if (( i % 5 == 0 )); then
            log "  Still waiting... ($i/${retries}s)"
        fi
        sleep 1
    done
    return 0
}

# ─── Open browser (macOS / Linux) ─────────────────────────────────────────────
open_browser() {
    local url="$1"
    [[ "$OPEN_BROWSER" != "true" ]] && return 0
    sleep 1
    if [[ "$(uname)" == "Darwin" ]]; then
        open -a "Google Chrome" "$url" 2>/dev/null \
            || open "$url" 2>/dev/null \
            || true
    else
        xdg-open "$url" 2>/dev/null || true
    fi
}

# ─── Stop existing dashboard processes (idempotent) ───────────────────────────
stop_existing() {
    step "Checking for existing dashboard processes..."
    local stopped=false

    # 1. Stop by PID file
    if [[ -f "$PID_FILE" ]]; then
        while IFS= read -r pid; do
            [[ -z "$pid" ]] && continue
            if kill -0 "$pid" 2>/dev/null; then
                kill -TERM "$pid" 2>/dev/null || true
                stopped=true
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi

    # 2. Graceful sweep by process pattern
    pkill -TERM -f "node build/index" 2>/dev/null && stopped=true || true
    pkill -TERM -f "tsx.*backend/index" 2>/dev/null && stopped=true || true

    # 3. Free dashboard ports (only node/tsx/vite processes)
    for p in 5000 8000 8080 3000 5173; do
        free_port "$p"
    done

    if [[ "$stopped" == "true" ]]; then
        sleep 1
        info "Previous dashboard processes stopped"
    else
        info "No existing dashboard processes found"
    fi
}

# ─── Load .env ────────────────────────────────────────────────────────────────
load_env() {
    if [[ -f "$SCRIPT_DIR/.env" ]]; then
        set -a
        # shellcheck disable=SC1091
        source "$SCRIPT_DIR/.env"
        set +a
        info "Loaded .env"
    fi
    # CLI --port wins over .env PORT
    export PORT
    export NODE_ENV="${NODE_ENV:-production}"
}

# ─── Ensure dependencies installed ───────────────────────────────────────────
ensure_deps() {
    if [[ ! -d "$SCRIPT_DIR/node_modules" ]]; then
        step "node_modules not found — running npm install..."
        (cd "$SCRIPT_DIR" && npm install --omit=dev) 2>&1 | tee -a "$LOG_FILE"
        info "Dependencies installed"
    fi
    export PATH="$SCRIPT_DIR/node_modules/.bin:$PATH"
}

# ─── Verify secrets module is loadable ────────────────────────────────────────
verify_secrets_module() {
    local secrets_path="$SCRIPT_DIR/scripts/secrets/load-secrets.mjs"
    step "Verifying secrets module is loadable..."
    if [[ ! -f "$secrets_path" ]]; then
        err "Secrets module not found at: $secrets_path"
        err "Create it or remove the import from backend/index-dev.ts"
        exit 1
    fi
    # Verify it can be parsed by Node.js
    if node --check "$secrets_path" 2>/dev/null; then
        info "Secrets module loaded successfully"
    else
        warn "Secrets module has syntax issues — startup may fail"
    fi
}

# ─── Verify critical backend modules exist ────────────────────────────────────
verify_backend_modules() {
    local missing=()
    local critical_modules=(
        "backend/data-validation-tests.ts"
        "backend/routes.ts"
        "backend/app.ts"
        "backend/index-dev.ts"
    )
    for mod in "${critical_modules[@]}"; do
        if [[ ! -f "$SCRIPT_DIR/$mod" ]]; then
            missing+=("$mod")
        fi
    done
    if [[ ${#missing[@]} -gt 0 ]]; then
        err "Missing critical backend modules:"
        for m in "${missing[@]}"; do
            err "  - $m"
        done
        exit 1
    fi
}

# ─── Verify Vulnerability Tracker data file ───────────────────────────────────
verify_data_file() {
    local data_file="$SCRIPT_DIR/data/fn_aug25-feb26.csv"
    local backup_file="$SCRIPT_DIR/.data-backup/fn_aug25-feb26.csv"
    local min_size=1000  # LFS pointer files are ~130 bytes

    step "Verifying Vulnerability Tracker data file..."

    if [[ -f "$data_file" ]]; then
        local file_size
        file_size=$(stat -f%z "$data_file" 2>/dev/null || stat --printf="%s" "$data_file" 2>/dev/null || echo 0)
        if [[ "$file_size" -gt "$min_size" ]]; then
            info "Data file present ($(du -h "$data_file" | cut -f1))"
            # Refresh backup
            mkdir -p "$SCRIPT_DIR/.data-backup"
            cp -p "$data_file" "$backup_file" 2>/dev/null || true
            return 0
        fi
        # Might be an LFS pointer — try pulling
        warn "Data file appears to be an LFS pointer. Pulling from LFS..."
        (cd "$SCRIPT_DIR" && git lfs pull --include="data/fn_aug25-feb26.csv" 2>/dev/null) || true
        file_size=$(stat -f%z "$data_file" 2>/dev/null || stat --printf="%s" "$data_file" 2>/dev/null || echo 0)
        if [[ "$file_size" -gt "$min_size" ]]; then
            info "Data file pulled from LFS ($(du -h "$data_file" | cut -f1))"
            return 0
        fi
    fi

    # File missing or still a pointer — try backup restore
    if [[ -f "$backup_file" ]]; then
        step "Restoring data file from local backup..."
        mkdir -p "$SCRIPT_DIR/data"
        cp -p "$backup_file" "$data_file"
        info "Data file restored from backup"
        return 0
    fi

    # No backup either — warn but don't block (static-data JSON provides fallback)
    warn "Data file not found: $data_file"
    warn "The Vulnerability Tracker will use static data as fallback."
    warn "To restore: place fn_aug25-feb26.csv in the data/ directory,"
    warn "  or run: git lfs pull"
}

# ─── Auto-detect prod vs dev ──────────────────────────────────────────────────
detect_app_mode() {
    if [[ "$APP_MODE" == "auto" ]]; then
        if [[ -f "$SCRIPT_DIR/build/index.js" && -d "$SCRIPT_DIR/dist" ]]; then
            APP_MODE="prod"
        else
            APP_MODE="dev"
        fi
    fi
}

# ─── PRODUCTION native start ──────────────────────────────────────────────────
start_prod() {
    step "Starting PRODUCTION server on port $PORT..."

    if [[ "$FORCE_BUILD" == "true" || ! -f "$SCRIPT_DIR/build/index.js" || ! -d "$SCRIPT_DIR/dist" ]]; then
        step "Building frontend + backend..."
        (cd "$SCRIPT_DIR" && npm run build) 2>&1 | tee -a "$LOG_FILE" || {
            err "Build failed — check $LOG_FILE"
            exit 1
        }
        info "Build complete"
    fi

    export NODE_ENV=production
    export PORT

    nohup node "$SCRIPT_DIR/build/index.js" \
        > "$LOG_DIR/server.log" 2>&1 &
    local pid=$!
    echo "$pid" > "$PID_FILE"
    disown "$pid" 2>/dev/null || true

    local url="http://127.0.0.1:$PORT"
    if [[ "$SKIP_HEALTH" != "true" ]]; then
        step "Waiting for server at $url (up to 60s)..."
        if wait_for_url "$url/api/data/health" 60; then
            info "Server is healthy"
        else
            err "Server did not respond — see $LOG_DIR/server.log"
            tail -20 "$LOG_DIR/server.log" 2>/dev/null
            exit 1
        fi
    fi

    print_status "PRODUCTION" "$url" "$pid"
    open_browser "$url"
}

# ─── DEVELOPMENT native start ─────────────────────────────────────────────────
start_dev() {
    step "Starting DEVELOPMENT server on port $PORT (HMR enabled)..."

    export NODE_ENV=development
    export PORT

    nohup npx tsx "$SCRIPT_DIR/backend/index-dev.ts" \
        > "$LOG_DIR/server.log" 2>&1 &
    local pid=$!
    echo "$pid" > "$PID_FILE"
    disown "$pid" 2>/dev/null || true

    local url="http://127.0.0.1:$PORT"
    if [[ "$SKIP_HEALTH" != "true" ]]; then
        step "Waiting for dev server at $url (up to 30s)..."
        if wait_for_url "$url" 30; then
            info "Dev server ready (HMR active)"
        else
            err "Dev server did not respond — see $LOG_DIR/server.log"
            tail -30 "$LOG_DIR/server.log" 2>/dev/null
            exit 1
        fi
    fi

    print_status "DEVELOPMENT (HMR)" "$url" "$pid"
    open_browser "$url"
}

# ─── DOCKER start ─────────────────────────────────────────────────────────────
start_docker() {
    if ! check_docker; then
        err "Docker is not running. Start Docker Desktop first."
        exit 1
    fi
    step "Starting services with Docker Compose..."
    local compose_args=()
    [[ "$FORCE_BUILD" == "true" ]] && compose_args+=(--build)
    (cd "$SCRIPT_DIR" && docker compose -f docker-compose.enhanced.yml up -d "${compose_args[@]}") \
        2>&1 | tee -a "$LOG_FILE"

    local url="http://127.0.0.1:$PORT"
    if [[ "$SKIP_HEALTH" != "true" ]]; then
        step "Waiting for Docker services..."
        wait_for_url "$url/api/data/health" 30 || warn "Docker health check timed out"
    fi
    info "Docker services started"
    print_status "DOCKER" "$url" "container"
    open_browser "$url"
}

# ─── HYBRID start ─────────────────────────────────────────────────────────────
start_hybrid() {
    if ! check_docker; then
        warn "Docker unavailable — falling back to native mode"
        detect_app_mode
        [[ "$APP_MODE" == "prod" ]] && start_prod || start_dev
        return
    fi
    step "Starting hybrid mode (Docker DB + native app)..."
    (cd "$SCRIPT_DIR" && docker compose -f docker-compose.enhanced.yml up -d postgres redis) \
        2>&1 | tee -a "$LOG_FILE"

    step "Waiting for PostgreSQL..."
    sleep 8

    if ! docker ps | grep -q "postgres"; then
        err "PostgreSQL container failed to start"
        exit 1
    fi
    export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cisco_sre_dashboard"
    export REDIS_URL="redis://localhost:6379"
    info "Database containers running"

    detect_app_mode
    [[ "$APP_MODE" == "prod" ]] && start_prod || start_dev
}

# ─── Status display ──────────────────────────────────────────────────────────
print_status() {
    local mode="$1" url="$2" pid="$3"
    echo
    echo -e "${GREEN}=================================================================="
    echo -e "  Dashboard Started Successfully"
    echo -e "==================================================================${NC}"
    echo -e "  ${BOLD}URL:${NC}   $url"
    echo -e "  ${BOLD}Mode:${NC}  $mode"
    echo -e "  ${BOLD}PID:${NC}   $pid"
    echo -e "  ${BOLD}Port:${NC}  $PORT"
    echo -e "  ${BOLD}Logs:${NC}  $LOG_DIR/"
    echo -e "  ${BOLD}Stop:${NC}  ./stop.sh"
    echo -e "${GREEN}==================================================================${NC}"
    echo
}

# ─── Main ─────────────────────────────────────────────────────────────────────
main() {
    stop_existing
    load_env
    verify_secrets_module
    verify_backend_modules
    verify_data_file
    resolve_port
    ensure_deps

    export PORT
    step "Resolved port: $PORT"

    # Auto-detect top-level mode
    if [[ "$MODE" == "auto" ]]; then
        MODE="native"
    fi

    log "Mode: $MODE | Port: $PORT"

    case "$MODE" in
        native)
            detect_app_mode
            log "App mode: $APP_MODE"
            [[ "$APP_MODE" == "prod" ]] && start_prod || start_dev
            ;;
        docker)  start_docker  ;;
        hybrid)  start_hybrid  ;;
        *)
            err "Unknown mode: $MODE"
            exit 1 ;;
    esac
}

trap 'log "${YELLOW}Script interrupted${NC}"' INT TERM
main "$@"
