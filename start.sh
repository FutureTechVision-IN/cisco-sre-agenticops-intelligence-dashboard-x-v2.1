#!/usr/bin/env bash
##############################################################################
# Cisco SRE AgenticOps Intelligence Dashboard – macOS Start Script
# Version: 6.0.0
#
# Architecture (native mode, mirrors Windows start.bat):
#   PRODUCTION  →  single process: node build/index.js
#                  (Express serves static dist/ on $PORT)
#   DEV         →  single process: npx tsx backend/index-dev.ts
#                  (Express + Vite-as-middleware on $PORT; HMR included)
#
# Usage:
#   ./start.sh                  # auto-detect prod vs dev, open Chrome
#   ./start.sh --prod           # force production mode
#   ./start.sh --dev            # force development mode (HMR)
#   ./start.sh --docker         # Docker Compose (all services)
#   ./start.sh --hybrid         # Docker DB + native app
#   ./start.sh --build          # force rebuild before starting
#   ./start.sh --no-health      # skip health check wait
#   ./start.sh --no-open        # skip auto-opening Chrome
#   ./start.sh --port 9000      # override port
##############################################################################

set -euo pipefail

# ─── Colour codes ─────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

# ─── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/startup.log"
PID_FILE="$SCRIPT_DIR/.startup_pids"

# ─── Defaults ─────────────────────────────────────────────────────────────────
MODE="auto"          # auto | native | docker | hybrid
APP_MODE="auto"      # auto | prod | dev  (native only)
FORCE_BUILD=false
SKIP_HEALTH=false
OPEN_BROWSER=true
PORT="${PORT:-5000}"

mkdir -p "$LOG_DIR"

# ─── Logging ──────────────────────────────────────────────────────────────────
log()  { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
info() { log "${GREEN}✅ $*${NC}"; }
warn() { log "${YELLOW}⚠️  $*${NC}"; }
err()  { log "${RED}❌ $*${NC}"; }
step() { log "${BLUE}▶  $*${NC}"; }

# ─── Usage ────────────────────────────────────────────────────────────────────
show_usage() {
    echo -e "${CYAN}Usage: $0 [OPTIONS]${NC}"
    echo
    echo "  --prod        Production mode  (node build/index.js)"
    echo "  --dev         Development mode (tsx + Vite HMR)"
    echo "  --docker      All services via Docker Compose"
    echo "  --hybrid      Docker DB + native app"
    echo "  --build       Force rebuild before start"
    echo "  --no-health   Skip health check"
    echo "  --no-open     Do not open Chrome automatically"
    echo "  --port N      Override port (default: 5000)"
    echo "  -h, --help    Show this help"
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
        --port)       PORT="$2";         shift 2 ;;
        -h|--help)    show_usage;        exit 0 ;;
        *)
            err "Unknown option: $1"
            show_usage; exit 1 ;;
    esac
done

export PORT

# ─── Banner ───────────────────────────────────────────────────────────────────
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║          Cisco SRE AgenticOps Intelligence Dashboard v2.0 (macOS)          ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Helper: check Docker ─────────────────────────────────────────────────────
check_docker() {
    command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1
}

# ─── Helper: find an available port ──────────────────────────────────────────
find_free_port() {
    local p="$1"
    while lsof -iTCP:"$p" -sTCP:LISTEN -t >/dev/null 2>&1; do
        # Skip macOS system ports silently
        ((p++))
    done
    echo "$p"
}

# ─── Helper: wait until a URL responds ────────────────────────────────────────
wait_for_url() {
    local url="$1" retries=30 i=0
    while ! curl -sf "$url" >/dev/null 2>&1; do
        ((i++))
        if [[ $i -ge $retries ]]; then
            warn "Health check timed out for $url"
            return 1
        fi
        sleep 1
    done
    return 0
}

# ─── Helper: open Chrome on macOS ─────────────────────────────────────────────
open_chrome() {
    local url="$1"
    if [[ "$OPEN_BROWSER" != "true" ]]; then return; fi
    sleep 1  # slight delay so server is accepting connections
    if open -a "Google Chrome" "$url" 2>/dev/null; then
        info "Opened Chrome → $url"
    elif open "$url" 2>/dev/null; then
        info "Opened default browser → $url"
    else
        warn "Could not open browser automatically. Visit: $url"
    fi
}

# ─── Helper: kill any project processes already on the relevant ports ─────────
stop_existing() {
    step "Stopping any existing dashboard processes..."
    # Stop by PID file
    if [[ -f "$PID_FILE" ]]; then
        while IFS=: read -r _name pid; do
            kill -TERM "$pid" 2>/dev/null || true
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi
    # Graceful sweep by process name
    pkill -TERM -f "node build/index" 2>/dev/null || true
    pkill -TERM -f "tsx.*backend/index" 2>/dev/null || true
    # Kill project node/tsx/vite processes on known ports (avoids macOS system services)
    for _p in 8000 5000 5001 3000 3001 5173; do
        local _pids
        _pids=$(lsof -iTCP:"$_p" -sTCP:LISTEN -t 2>/dev/null | xargs -I{} sh -c \
            'ps -p {} -o comm= 2>/dev/null | grep -qE "node|tsx|vite|npm" && echo {}' || true)
        [[ -n "$_pids" ]] && echo "$_pids" | xargs kill -TERM 2>/dev/null || true
    done
    sleep 1
    info "Existing processes stopped"
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
    # Ensure PORT is always exported (command-line wins over .env)
    export PORT
    # macOS: if port 5000 is occupied, check whether it's only the AirPlay Receiver
    # (ControlCenter). Our Express server binds to 127.0.0.1 specifically, so it
    # can coexist with ControlCenter which binds to *:5000.
    if [[ "$PORT" == "5000" ]] && lsof -iTCP:5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        local _non_system
        _non_system=$(lsof -iTCP:5000 -sTCP:LISTEN 2>/dev/null \
            | awk 'NR>1 {print $1}' | grep -vE '^ControlCe$' | head -1 || true)
        if [[ -n "$_non_system" ]]; then
            warn "Port 5000 is in use by $_non_system – force-killing"
            lsof -iTCP:5000 -sTCP:LISTEN 2>/dev/null \
                | awk 'NR>1 {print $1, $2}' | grep -vE '^ControlCe ' \
                | awk '{print $2}' | sort -u | xargs kill -9 2>/dev/null || true
            sleep 1
        fi
        # ControlCenter (AirPlay) on *:5000 is fine — our server binds 127.0.0.1:5000
        if lsof -iTCP:5000 -sTCP:LISTEN 2>/dev/null | awk 'NR>1 {print $1}' | grep -vqE '^ControlCe$'; then
            err "Cannot free port 5000. Another process is still listening."
            exit 1
        fi
        info "Port 5000 is available (macOS AirPlay on *:5000 will coexist with 127.0.0.1 binding)"
    fi
}

# ─── Ensure dependencies installed ───────────────────────────────────────────
ensure_deps() {
    if [[ ! -d "$SCRIPT_DIR/node_modules" ]]; then
        step "node_modules not found – running npm install..."
        (cd "$SCRIPT_DIR" && npm install) | tee -a "$LOG_FILE"
        info "Dependencies installed"
    fi
    # Put local .bin on PATH so npx fallback is never needed at runtime
    export PATH="$SCRIPT_DIR/node_modules/.bin:$PATH"
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
# Mirrors Windows: node build/index.js on $PORT
# Single process — Express serves static dist/ AND the API.
start_prod() {
    step "Starting PRODUCTION server (node build/index.js) on port $PORT..."

    if [[ "$FORCE_BUILD" == "true" || ! -f "$SCRIPT_DIR/build/index.js" || ! -d "$SCRIPT_DIR/dist" ]]; then
        step "Building frontend + backend..."
        (cd "$SCRIPT_DIR" && npm run build:prod) 2>&1 | tee -a "$LOG_FILE" || {
            err "Build failed – check $LOG_FILE"
            exit 1
        }
        info "Build complete"
    fi

    > "$PID_FILE"
    NODE_ENV=production nohup node "$SCRIPT_DIR/build/index.js" \
        > "$LOG_DIR/server.log" 2>&1 &
    local pid=$!
    echo "server:$pid" >> "$PID_FILE"
    disown "$pid" 2>/dev/null || true

    local host="127.0.0.1"
    local url="http://${host}:$PORT"
    if [[ "$SKIP_HEALTH" != "true" ]]; then
        step "Waiting for server to be ready at $url..."
        if wait_for_url "$url"; then
            info "Server is ready"
        else
            err "Server did not respond in time – see $LOG_DIR/server.log"
            tail -20 "$LOG_DIR/server.log"
            exit 1
        fi
    fi

    print_status "PRODUCTION" "$url" "$pid"
    open_chrome "$url"
}

# ─── DEVELOPMENT native start ─────────────────────────────────────────────────
# Mirrors Windows dev path: tsx backend/index-dev.ts
# Single process — Express embeds Vite as middleware (HMR included).
start_dev() {
    step "Starting DEVELOPMENT server (tsx backend/index-dev.ts) on port $PORT..."

    > "$PID_FILE"
    NODE_ENV=development nohup \
        "$SCRIPT_DIR/node_modules/.bin/tsx" backend/index-dev.ts \
        > "$LOG_DIR/server.log" 2>&1 &
    local pid=$!
    echo "server:$pid" >> "$PID_FILE"
    disown "$pid" 2>/dev/null || true

    local host="127.0.0.1"
    local url="http://${host}:$PORT"
    if [[ "$SKIP_HEALTH" != "true" ]]; then
        step "Waiting for Vite dev server to be ready at $url (HMR enabled)..."
        if wait_for_url "$url"; then
            info "Dev server is ready (HMR active)"
        else
            err "Dev server did not respond – see $LOG_DIR/server.log"
            tail -30 "$LOG_DIR/server.log"
            exit 1
        fi
    fi

    print_status "DEVELOPMENT (HMR)" "$url" "$pid"
    open_chrome "$url"
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

    local docker_port
    docker_port=$(docker compose -f docker-compose.enhanced.yml port dashboard 5000 2>/dev/null \
        | cut -d: -f2 || echo "$PORT")
    local url="http://127.0.0.1:${docker_port:-$PORT}"

    if [[ "$SKIP_HEALTH" != "true" ]]; then
        step "Waiting for Docker services..."
        wait_for_url "$url" || warn "Docker health check timed out"
    fi
    info "Docker services started"
    print_status "DOCKER" "$url" "—"
    open_chrome "$url"
}

# ─── HYBRID start ─────────────────────────────────────────────────────────────
start_hybrid() {
    if ! check_docker; then
        warn "Docker unavailable – falling back to native mode"
        detect_app_mode
        [[ "$APP_MODE" == "prod" ]] && start_prod || start_dev
        return
    fi
    step "Starting hybrid mode (Docker DB + native app)..."
    (cd "$SCRIPT_DIR" && docker compose -f docker-compose.enhanced.yml up -d postgres redis) \
        2>&1 | tee -a "$LOG_FILE"

    step "Waiting 8 s for PostgreSQL to accept connections..."
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

# ─── Final status box ─────────────────────────────────────────────────────────
print_status() {
    local mode="$1" url="$2" pid="$3"
    echo
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  Dashboard RUNNING  –  $url${NC}"
    echo -e "${CYAN}  Mode: $mode   PID: $pid   Port: $PORT${NC}"
    echo -e "${CYAN}  Logs: $LOG_DIR/${NC}"
    echo -e "${YELLOW}  Stop:  ./stop.sh${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
}

# ─── Main ─────────────────────────────────────────────────────────────────────
main() {
    stop_existing
    load_env
    ensure_deps

    # Auto-detect top-level mode
    if [[ "$MODE" == "auto" ]]; then
        if check_docker; then MODE="native"; fi  # prefer native on Mac for quick iteration
        MODE="native"
    fi

    log "${CYAN}▶  Mode: $MODE${NC}"

    case "$MODE" in
        native)
            detect_app_mode
            log "${CYAN}▶  App mode: $APP_MODE${NC}"
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

