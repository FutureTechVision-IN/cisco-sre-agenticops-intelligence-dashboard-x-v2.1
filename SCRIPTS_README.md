# Dashboard Startup Scripts

This project provides platform-specific startup scripts for running the Cisco SRE AgenticOps Intelligence Dashboard.

## Scripts Overview

| Platform | Script | Description |
|----------|--------|-------------|
| macOS/Linux | `start.sh` | Bash script with auto-detect, Docker, native, hybrid, and rebuild modes |
| Windows | `start.ps1` | PowerShell script with auto-detect, Docker, native, hybrid, and rebuild modes |

## Quick Start

### macOS / Linux

```bash
# Auto-detect and start
./start.sh

# Full Docker mode
./start.sh --docker

# Native Node.js (no Docker)
./start.sh --native

# Hybrid mode (Docker DB + native dashboard)
./start.sh --hybrid

# Rebuild and start Docker
./start.sh --docker --build
```

### Windows

```powershell
# Auto-detect and start
.\start.ps1

# Full Docker mode
.\start.ps1 -Docker

# Native Node.js (no Docker)
.\start.ps1 -Native

# Hybrid mode (Docker DB + native dashboard)
.\start.ps1 -Hybrid

# Rebuild and start Docker
.\start.ps1 -Docker -Build
```

## Stopping the Dashboard

### macOS / Linux

```bash
# Auto-detect and stop
./stop.sh

# Stop all services
./stop.sh --all --force
```

### Windows

```powershell
# Auto-detect and stop
.\stop.ps1

# Stop all services
.\stop.ps1 -All -Force
```

## Mode Details

### Auto-detect Mode
Automatically detects if Docker is available and running. If Docker is available, uses Docker mode; otherwise falls back to native Node.js mode.

### Docker Mode (`--docker` / `-Docker`)
Runs the entire dashboard stack (frontend, backend, databases) in Docker containers using docker-compose.

### Native Mode (`--native` / `-Native`)
Runs the dashboard using local Node.js installation without Docker. Suitable for development on machines without Docker.

### Hybrid Mode (`--hybrid` / `-Hybrid`)
Uses Docker for database containers (PostgreSQL, Redis) while running the dashboard frontend and backend natively. Best of both worlds for development.

## Prerequisites

### macOS / Linux
- Bash shell
- Node.js 18+ (for native mode)
- Docker (for Docker/hybrid modes)
- npm

### Windows
- PowerShell 5.1+
- Node.js 18+ (for native mode)
- Docker Desktop (for Docker/hybrid modes)
- npm

## Troubleshooting

### Windows: Path Issues with Spaces
If your project path contains spaces (e.g., `E:\My Projects\cisco-sre...`), the PowerShell scripts handle this automatically by using proper quoting and temporary batch files.

### Windows: Execution Policy
If you get a script execution error, run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Docker Not Available
When Docker is not available, the scripts automatically fall back to native mode if using auto-detect, or you can explicitly use `-Native`.

## Force Push Script

For deployment, use the force-push script:

### macOS / Linux
```bash
./force-push.sh                    # Interactive with backup
./force-push.sh -y                 # Auto-confirm with backup
./force-push.sh --dry-run          # Preview only
```

### Windows
```powershell
.\force-push.ps1                   # Interactive with backup
.\force-push.ps1 -Yes              # Auto-confirm with backup
.\force-push.ps1 -DryRun           # Preview only
```

## Notes

- The macOS scripts (`start.sh`, `stop.sh`, `force-push.sh`) use bash and are NOT compatible with Windows Command Prompt or PowerShell
- The Windows scripts (`start.ps1`, `stop.ps1`, `force-push.ps1`) use PowerShell and are NOT compatible with macOS/Linux bash
- Both sets of scripts provide equivalent functionality for their respective platforms
- Logs are written to the `logs/` directory
- PID files are stored in `.startup_pids` for tracking running processes