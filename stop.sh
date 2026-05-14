#!/usr/bin/env bash
##############################################################################
# Cisco SRE AgenticOps Intelligence Dashboard – macOS Stop Script
# Version: 6.0.0
#
# Usage:
#   ./stop.sh              # stop all dashboard processes
#   ./stop.sh --docker     # stop Docker Compose services
#   ./stop.sh --all        # stop both native processes and Docker
#   ./stop.sh -h           # help
##############################################################################

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/shutdown.log"
PID_FILE="$SCRIPT_DIR/.startup_pids"

mkdir -p "$LOG_DIR"

log()  { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
info() { log "${GREEN}✅ $*${NC}"; }
warn() { log "${YELLOW}⚠️  $*${NC}"; }
step() { log "${BLUE}▶  $*${NC}"; }

STOP_DOCKER=false
STOP_ALL=false

show_usage() {
    echo -e "${CYAN}Usage: $0 [OPTIONS]${NC}"
    echo
    echo "  --docker   Stop Docker Compose services"
    echo "  --all      Stop native processes AND Docker services"
    echo "  -h, --help Show this help"
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --docker) STOP_DOCKER=true; shift ;;
        --all)    STOP_ALL=true; shift ;;
        -h|--help) show_usage; exit 0 ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_usage; exit 1 ;;
    esac
done

# ─── Stop native processes ────────────────────────────────────────────────────
stop_native() {
    step "Stopping native dashboard processes..."
    local stopped=false

    # 1. Gracefully terminate tracked PIDs from start.sh
    if [[ -f "$PID_FILE" ]]; then
        while IFS=: read -r _name pid; do
            if kill -0 "$pid" 2>/dev/null; then
                step "Stopping $_name (PID $pid)..."
                kill -TERM "$pid" 2>/dev/null || true
                # Wait up to 5 s for graceful shutdown
                local i=0
                while kill -0 "$pid" 2>/dev/null && (( i < 5 )); do
                    sleep 1; ((i++))
                done
                kill -KILL "$pid" 2>/dev/null || true
                stopped=true
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
        info "PID-tracked processes stopped"
    fi

    # 2. Kill any remaining dashboard processes by name pattern
    for pattern in "node build/index" "tsx.*backend/index" "vite.*--host"; do
        if pkill -TERM -f "$pattern" 2>/dev/null; then
            stopped=true
        fi
    done

    # 3. Release dashboard ports (only kill node/tsx/vite, not macOS system services)
    for _p in 8000 5000 3000 3001 5173; do
        local _pids
        _pids=$(lsof -iTCP:"$_p" -sTCP:LISTEN -t 2>/dev/null \
            | xargs -I{} sh -c 'ps -p {} -o comm= 2>/dev/null | grep -qE "^node$|^tsx$|npm" && echo {}' \
            2>/dev/null || true)
        if [[ -n "$_pids" ]]; then
            echo "$_pids" | xargs kill -TERM 2>/dev/null || true
            stopped=true
        fi
    done

    sleep 1

    if [[ "$stopped" == "true" ]]; then
        info "Native processes stopped"
    else
        info "No native dashboard processes were running"
    fi
}

# ─── Stop Docker services ─────────────────────────────────────────────────────
stop_docker() {
    if ! command -v docker >/dev/null 2>&1; then
        warn "Docker not found – skipping"
        return
    fi
    step "Stopping Docker Compose services..."
    (cd "$SCRIPT_DIR" && docker compose -f docker-compose.enhanced.yml down 2>&1) \
        | tee -a "$LOG_FILE" || warn "docker compose down returned non-zero (services may already be stopped)"
    info "Docker services stopped"
}

# ─── Final port check ─────────────────────────────────────────────────────────
check_ports_free() {
    local any_open=false
    for _p in 8000 3000 5173; do
        if lsof -iTCP:"$_p" -sTCP:LISTEN -t >/dev/null 2>&1; then
            local proc
            proc=$(lsof -iTCP:"$_p" -sTCP:LISTEN -n -P 2>/dev/null | awk 'NR>1 {print $1, $2}' | head -1)
            warn "Port $_p still in use: $proc"
            any_open=true
        fi
    done
    [[ "$any_open" == "false" ]] && info "All dashboard ports are now free"
}

# ─── Main ─────────────────────────────────────────────────────────────────────
main() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║           Cisco SRE AgenticOps Intelligence Dashboard – Shutdown            ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    if [[ "$STOP_ALL" == "true" ]]; then
        stop_native
        stop_docker
    elif [[ "$STOP_DOCKER" == "true" ]]; then
        stop_docker
    else
        stop_native
    fi

    check_ports_free

    echo
    echo -e "${GREEN}✅ Dashboard stopped.${NC}"
    echo -e "${CYAN}   To restart:  ./start.sh${NC}"
    echo
}

trap 'log "${YELLOW}Stop script interrupted${NC}"' INT TERM
main "$@"
