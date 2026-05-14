#!/bin/bash
PROJ_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJ_DIR"
# Load .env
set -a
source .env
set +a
echo "[restart-backend] CSV_START_MONTH=$CSV_START_MONTH"
echo "[restart-backend] Starting tsx backend/index-dev.ts on PORT=$PORT"
exec ./node_modules/.bin/tsx backend/index-dev.ts
