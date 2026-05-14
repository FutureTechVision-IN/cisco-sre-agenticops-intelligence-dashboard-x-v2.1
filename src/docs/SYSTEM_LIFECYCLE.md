# Cisco SRE AgenticOps Dashboard - System Lifecycle Management

## Overview

This document provides comprehensive guidance for managing the Cisco SRE AgenticOps Intelligence Dashboard's lifecycle operations, including startup, shutdown, and monitoring across Docker, Native, and Hybrid deployment modes.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Deployment Modes](#deployment-modes)
3. [Startup Commands](#startup-commands)
4. [Shutdown Commands](#shutdown-commands)
5. [Configuration](#configuration)
6. [Health Monitoring](#health-monitoring)
7. [Troubleshooting](#troubleshooting)
8. [Testing](#testing)
9. [Best Practices](#best-practices)

---

## Quick Start

### Starting the Dashboard

```bash
# Recommended: Use the enhanced startup script (auto-detects mode)
./scripts/start-enhanced.sh

# Or use the power-on system (includes configuration restoration)
./power-on.sh

# Legacy: Use the original start script
./start.sh
```

### Stopping the Dashboard

```bash
# Recommended: Use the enhanced shutdown script
./scripts/stop-enhanced.sh

# Or use the power-off system (includes state backup)
./power-off.sh

# Legacy: Use the original stop script
./stop.sh
```

---

## Deployment Modes

The system supports three deployment modes:

### 1. Docker Mode (Recommended for Production)

Uses Docker Compose to orchestrate all services:
- Dashboard application
- PostgreSQL database
- Redis cache
- AI Engine

```bash
# Force Docker mode
./scripts/start-enhanced.sh --docker
```

**Advantages:**
- Isolated environment
- Easy scaling
- Consistent across machines
- Built-in health checks

### 2. Native Mode (Development)

Runs services directly on the host machine:
- Node.js for the dashboard
- Local PostgreSQL/Redis (if available)
- Fallback data when databases unavailable

```bash
# Force Native mode
./scripts/start-enhanced.sh --native
```

**Advantages:**
- Faster development cycle
- Direct debugging access
- No Docker overhead
- Works without Docker installed

### 3. Hybrid Mode

Combines Docker for infrastructure with native application:
- Docker: PostgreSQL, Redis
- Native: Dashboard application

```bash
# Force Hybrid mode
./scripts/start-enhanced.sh --hybrid
```

**Advantages:**
- Best of both worlds
- Production-like databases
- Development-friendly application

### Auto-Detection

By default, the system auto-detects the best mode:

1. If Docker is available and running → **Docker Mode**
2. If Docker is unavailable → **Native Mode**

---

## Startup Commands

### Enhanced Start Script (`scripts/start-enhanced.sh`)

The primary startup script with full feature support.

```bash
./scripts/start-enhanced.sh [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--docker` | Force Docker mode |
| `--native` | Force native mode |
| `--hybrid` | Force hybrid mode |
| `--port PORT` | Override dashboard port (default: 8000) |
| `--debug` | Enable debug output |
| `--quick` | Quick startup (reduced timeouts) |
| `--skip-health` | Skip health checks |
| `--help` | Show help message |

**Examples:**

```bash
# Standard startup
./scripts/start-enhanced.sh

# Start on different port
./scripts/start-enhanced.sh --port 3000

# Quick startup for development
./scripts/start-enhanced.sh --native --quick

# Debug mode with verbose output
./scripts/start-enhanced.sh --debug
```

### Power-On System (`power-on.sh`)

Intelligent startup with configuration restoration.

```bash
./power-on.sh [option]
```

**Options:**

| Option | Description |
|--------|-------------|
| `startup` (default) | Normal startup sequence |
| `quick` | Reduced timeouts |
| `debug` | Enable debug output |
| `help` | Show help message |

**Features:**
- Detects previous shutdown state
- Restores saved configuration
- Verifies prerequisites
- Health verification after startup

---

## Shutdown Commands

### Enhanced Stop Script (`scripts/stop-enhanced.sh`)

The primary shutdown script with graceful termination.

```bash
./scripts/stop-enhanced.sh [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--force, -f` | Force shutdown (minimal timeouts) |
| `--debug` | Enable debug output |
| `--skip-backup` | Skip pre-shutdown state backup |
| `--skip-cleanup` | Skip cleanup operations |
| `--reason MSG` | Specify shutdown reason |
| `--help` | Show help message |

**Examples:**

```bash
# Standard graceful shutdown
./scripts/stop-enhanced.sh

# Force immediate shutdown
./scripts/stop-enhanced.sh --force

# Shutdown with custom reason
./scripts/stop-enhanced.sh --reason "maintenance"
```

### Power-Off System (`power-off.sh`)

Safe shutdown with configuration preservation.

```bash
./power-off.sh [option]
```

**Options:**

| Option | Description |
|--------|-------------|
| `shutdown` (default) | Normal graceful shutdown |
| `force` | Force shutdown |
| `help` | Show help message |

**Features:**
- Backs up current configuration
- Graceful process termination
- Temporary file cleanup
- Shutdown state preservation

---

## Configuration

### Unified Configuration File

Location: `config/hybrid-system.conf`

This file contains all tunable parameters for both Docker and Native modes.

### Key Configuration Sections

#### Network Configuration

```bash
export DASHBOARD_PORT="${DASHBOARD_PORT:-8000}"
export POSTGRES_PORT="${POSTGRES_PORT:-5432}"
export REDIS_PORT="${REDIS_PORT:-6379}"
export AI_ENGINE_PORT="${AI_ENGINE_PORT:-5001}"
```

#### Execution Mode

```bash
# AUTO: Auto-detect (Docker preferred)
# DOCKER: Force Docker mode
# NATIVE: Force native mode
# HYBRID: Docker databases + native app
export EXECUTION_MODE="${EXECUTION_MODE:-AUTO}"
```

#### Resource Limits

```bash
# Docker
export DOCKER_CPU_LIMIT="${DOCKER_CPU_LIMIT:-2.0}"
export DOCKER_MEMORY_LIMIT="${DOCKER_MEMORY_LIMIT:-4G}"

# Node.js
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"
```

#### Timeouts

```bash
export STARTUP_TIMEOUT="${STARTUP_TIMEOUT:-180}"
export SHUTDOWN_TIMEOUT="${SHUTDOWN_TIMEOUT:-60}"
export GRACEFUL_SHUTDOWN_TIMEOUT="${GRACEFUL_SHUTDOWN_TIMEOUT:-30}"
```

### Environment Variables

Override any configuration via environment variables:

```bash
# Example: Custom port
DASHBOARD_PORT=3000 ./scripts/start-enhanced.sh

# Example: Force native mode
EXECUTION_MODE=NATIVE ./power-on.sh
```

---

## Health Monitoring

### Health Check Endpoints

| Endpoint | Description |
|----------|-------------|
| `http://localhost:8000/` | Dashboard UI |
| `http://localhost:8000/api/health` | API health status |
| `http://localhost:8000/api/reports/*` | Data endpoints |

### Manual Health Check

```bash
# Check if dashboard is responding
curl http://localhost:8000/

# Check API health
curl http://localhost:8000/api/health

# Check specific endpoint
curl http://localhost:8000/api/reports/top-field-notices?limit=5
```

### Docker Health Status

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' cisco-sre-dashboard

# View container logs
docker logs cisco-sre-dashboard

# Follow logs in real-time
docker logs -f cisco-sre-dashboard
```

---

## Troubleshooting

### Common Issues

#### Port Already in Use

**Symptom:** "Port 8000 is already in use"

**Solution:**
```bash
# Find process using port
lsof -i :8000

# Kill the process
kill -9 <PID>

# Or use a different port
./scripts/start-enhanced.sh --port 3001
```

#### Docker Not Running

**Symptom:** "Cannot connect to Docker daemon"

**Solution:**
```bash
# Start Docker Desktop (macOS)
open -a Docker

# Or use native mode
./scripts/start-enhanced.sh --native
```

#### Database Connection Failed

**Symptom:** "ECONNREFUSED 127.0.0.1:5432"

**Solution:**
1. In Docker mode: Containers will start PostgreSQL automatically
2. In Native mode: System uses fallback static data

#### Build Not Found

**Symptom:** "dist/index.js not found"

**Solution:**
```bash
# Install dependencies and build
npm install
npm run build
```

### Checking Logs

```bash
# Startup logs
cat logs/startup-*.log

# System logs
cat logs/system.log

# Shutdown logs
cat logs/shutdown-*.log
```

### State Files

```bash
# Check startup state
cat config/system-state/startup-state.json

# Check shutdown state
cat config/system-state/shutdown-state.json
```

---

## Testing

### Running the Test Suite

```bash
# Run all tests (excluding lifecycle)
./scripts/test-system-lifecycle.sh

# Run specific test categories
./scripts/test-system-lifecycle.sh --prerequisites
./scripts/test-system-lifecycle.sh --config
./scripts/test-system-lifecycle.sh --ports
./scripts/test-system-lifecycle.sh --docker
./scripts/test-system-lifecycle.sh --native

# Run lifecycle integration tests (starts/stops services)
./scripts/test-system-lifecycle.sh --lifecycle
```

### Test Categories

| Category | Description |
|----------|-------------|
| Prerequisites | Node.js, npm, Docker availability |
| Configuration | Config file validity, variables |
| Scripts | Help commands, syntax |
| Ports | Port availability status |
| Docker | Docker Compose, containers |
| Native | Node modules, build artifacts |
| Lifecycle | Full start/stop cycle |

---

## Best Practices

### For Production

1. **Use Docker Mode** for consistent environments
2. **Set proper resource limits** in configuration
3. **Enable health checks** (default)
4. **Configure backup on shutdown** (default)
5. **Monitor logs** for issues

### For Development

1. **Use Native Mode** for faster iteration
2. **Use `--quick` flag** for faster startup
3. **Use `--debug` flag** when debugging
4. **Use `--skip-health`** for rapid testing

### General

1. **Always use graceful shutdown** when possible
2. **Review state files** after issues
3. **Keep logs** for debugging
4. **Run tests** after changes
5. **Use configuration file** instead of hardcoding

---

## File Reference

| File | Purpose |
|------|---------|
| `config/hybrid-system.conf` | Unified configuration |
| `scripts/start-enhanced.sh` | Enhanced startup script |
| `scripts/stop-enhanced.sh` | Enhanced shutdown script |
| `power-on.sh` | Intelligent startup with restore |
| `power-off.sh` | Safe shutdown with backup |
| `start.sh` | Legacy startup script |
| `stop.sh` | Legacy shutdown script |
| `scripts/test-system-lifecycle.sh` | Test suite |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 5.0.0 | 2025 | Enhanced hybrid support, unified config |
| 4.0.0 | 2024 | Docker mode improvements |
| 3.0.0 | 2024 | Initial hybrid support |

---

## Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review logs in `logs/` directory
3. Run the test suite
4. Check state files in `config/system-state/`

---

*Last Updated: January 2025*
