<#
.SYNOPSIS
    Cisco SRE AgenticOps Intelligence Dashboard - Cross-Platform Start Script
    Version: 7.0.0 (Windows)

.DESCRIPTION
    Architecture (native mode):
      PRODUCTION  ->  single process: node build\index.js
                     (Express serves static dist\ on $PORT)
      DEV         ->  single process: npx tsx backend\index-dev.ts
                     (Express + Vite-as-middleware on $PORT; HMR included)

    Port Management:
      - Default port: 5000 (overridable via -Port or PORT env var)
      - Automatic fallback: if default port is occupied, tries 8000, then
        incrementally scans until a free port is found.

.PARAMETER Prod
    Force production mode (node build\index.js)
.PARAMETER Dev
    Force development mode (tsx + Vite HMR)
.PARAMETER Native
    Force native mode (skip Docker detection)
.PARAMETER Docker
    All services via Docker Compose
.PARAMETER Hybrid
    Docker DB + native app
.PARAMETER Build
    Force rebuild before start
.PARAMETER NoHealth
    Skip health check wait
.PARAMETER NoOpen
    Do not open browser automatically
.PARAMETER Port
    Override port (default: 5000; disables auto-fallback)
.PARAMETER Help
    Show help

.EXAMPLE
    .\start.ps1                 # auto-detect prod vs dev
    .\start.ps1 -Prod           # production mode
    .\start.ps1 -Dev            # development mode (HMR)
    .\start.ps1 -Port 9000      # override port
#>
[CmdletBinding()]
param(
    [switch]$Prod,
    [switch]$Dev,
    [switch]$Native,
    [switch]$Docker,
    [switch]$Hybrid,
    [switch]$Build,
    [switch]$NoHealth,
    [switch]$NoOpen,
    [int]$Port = 0,
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ─── Paths ────────────────────────────────────────────────────────────────────
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$LogDir    = Join-Path $ScriptDir "logs"
$LogFile   = Join-Path $LogDir "startup.log"
$PidFile   = Join-Path $ScriptDir ".dashboard.pid"

# Ensure logs directory exists
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

# ─── Defaults ─────────────────────────────────────────────────────────────────
$script:Mode          = "auto"     # auto | native | docker | hybrid
$script:AppMode       = "auto"     # auto | prod | dev
$script:ForceBuild    = $Build.IsPresent
$script:SkipHealth    = $NoHealth.IsPresent
$script:OpenBrowser   = -not $NoOpen.IsPresent
$script:PortExplicit  = $false
$script:ServerPort    = 5000
$script:FallbackPorts = @(8000, 8080, 9000, 3000)

# Resolve port priority: -Port param > PORT env > default 5000
if ($Port -gt 0) {
    $script:ServerPort   = $Port
    $script:PortExplicit = $true
} elseif ($env:PORT) {
    $script:ServerPort = [int]$env:PORT
}

# Resolve mode
if ($Docker)     { $script:Mode = "docker" }
elseif ($Hybrid) { $script:Mode = "hybrid" }
elseif ($Native) { $script:Mode = "native" }

if ($Prod)       { $script:AppMode = "prod";  $script:Mode = "native" }
elseif ($Dev)    { $script:AppMode = "dev";   $script:Mode = "native" }

# ─── Logging ──────────────────────────────────────────────────────────────────
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $entry = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $entry -ErrorAction SilentlyContinue

    switch ($Level) {
        "OK"   { Write-Host "  [OK]   $Message" -ForegroundColor Green }
        "WARN" { Write-Host "  [WARN] $Message" -ForegroundColor Yellow }
        "ERR"  { Write-Host "  [ERR]  $Message" -ForegroundColor Red }
        "STEP" { Write-Host "  [>]    $Message" -ForegroundColor Blue }
        default { Write-Host "  $Message" }
    }
}

# ─── Usage ────────────────────────────────────────────────────────────────────
if ($Help) {
    Get-Help $MyInvocation.MyCommand.Definition -Detailed
    exit 0
}

# ─── Banner ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  Cisco SRE AgenticOps Intelligence Dashboard v2.1" -ForegroundColor Cyan
Write-Host "  Startup Script v7.0.0 | Windows $($PSVersionTable.PSVersion)" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# ─── Helper: Test Docker ──────────────────────────────────────────────────────
function Test-DockerRunning {
    try {
        $null = docker info 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

# ─── Port detection: is a port available? ─────────────────────────────────────
function Test-PortAvailable {
    param([int]$TestPort)
    try {
        $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $TestPort)
        $listener.Start()
        $listener.Stop()
        return $true
    } catch {
        return $false
    }
}

# ─── Port resolution: find a usable port with fallback logic ──────────────────
function Resolve-Port {
    # If the requested port is available, use it
    if (Test-PortAvailable $script:ServerPort) {
        return
    }

    # If user explicitly chose a port, try to free it
    if ($script:PortExplicit) {
        Write-Log "Port $($script:ServerPort) is in use. Attempting to free it..." "WARN"
        Free-Port $script:ServerPort
        Start-Sleep -Seconds 2
        if (Test-PortAvailable $script:ServerPort) {
            Write-Log "Port $($script:ServerPort) freed successfully" "OK"
            return
        }
        Write-Log "Cannot free port $($script:ServerPort). Another process is still listening." "ERR"
        # Show what's using the port
        netstat -ano | Select-String ":$($script:ServerPort)" | Select-Object -First 5
        exit 1
    }

    # Auto-fallback: try each candidate
    Write-Log "Default port $($script:ServerPort) is occupied - scanning fallback ports..." "WARN"
    foreach ($candidate in $script:FallbackPorts) {
        if ($candidate -eq $script:ServerPort) { continue }
        if (Test-PortAvailable $candidate) {
            Write-Log "Using fallback port $candidate" "OK"
            $script:ServerPort = $candidate
            return
        }
    }

    # Last resort: scan from 8001 upward
    for ($scan = 8001; $scan -lt 9100; $scan++) {
        if (Test-PortAvailable $scan) {
            Write-Log "Using dynamically found port $scan" "OK"
            $script:ServerPort = $scan
            return
        }
    }

    Write-Log "No available port found in range 5000-9100" "ERR"
    exit 1
}

# ─── Free a specific port (only kills node/tsx/npm processes) ─────────────────
function Free-Port {
    param([int]$FreePortNum)
    try {
        $connections = Get-NetTCPConnection -LocalPort $FreePortNum -State Listen -ErrorAction SilentlyContinue
        if (-not $connections) { return }

        foreach ($conn in $connections) {
            $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            if (-not $proc) { continue }
            # Only kill node/tsx/npm processes (never system services)
            if ($proc.ProcessName -match '^(node|tsx|npm)$') {
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {
        # Port query may fail on older Windows versions; continue silently
    }
}

# ─── Wait until a URL responds ────────────────────────────────────────────────
function Wait-ForUrl {
    param([string]$Url, [int]$Retries = 30)
    $i = 0
    while ($i -lt $Retries) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
            if ($response.StatusCode -eq 200) { return $true }
        } catch {
            # Not ready yet
        }
        if (($i % 10) -eq 9) {
            Write-Log "  Still waiting... ($($i + 1)/${Retries}s)" "INFO"
        }
        Start-Sleep -Seconds 1
        $i++
    }
    return $false
}

# ─── Open browser ─────────────────────────────────────────────────────────────
function Open-DashboardBrowser {
    param([string]$Url)
    if (-not $script:OpenBrowser) { return }
    Start-Sleep -Seconds 1
    try {
        # Try Chrome first, then default browser
        $chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
        if (Test-Path $chrome) {
            Start-Process $chrome -ArgumentList $Url
        } else {
            Start-Process $Url
        }
    } catch {
        # Silently ignore browser open failures
    }
}

# ─── Stop existing dashboard processes (idempotent) ───────────────────────────
function Stop-ExistingDashboard {
    Write-Log "Checking for existing dashboard processes..." "STEP"
    $stopped = $false

    # 1. Stop by PID file
    if (Test-Path $PidFile) {
        Get-Content $PidFile | ForEach-Object {
            $pid = $_.Trim()
            if ($pid -and ($pid -match '^\d+$')) {
                try {
                    $proc = Get-Process -Id ([int]$pid) -ErrorAction SilentlyContinue
                    if ($proc) {
                        Stop-Process -Id ([int]$pid) -Force -ErrorAction SilentlyContinue
                        $stopped = $true
                    }
                } catch { }
            }
        }
        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    }

    # 2. Kill by process pattern (node serving our build)
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -match "build[/\\]index\.js|backend[/\\]index-dev"
    } | ForEach-Object {
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        $stopped = $true
    }

    # 3. Free dashboard ports (only node/tsx processes)
    foreach ($p in @(5000, 8000, 8080, 3000, 5173)) {
        Free-Port $p
    }

    if ($stopped) {
        Start-Sleep -Seconds 1
        Write-Log "Previous dashboard processes stopped" "OK"
    } else {
        Write-Log "No existing dashboard processes found" "OK"
    }
}

# ─── Load .env ────────────────────────────────────────────────────────────────
function Import-Environment {
    $envFile = Join-Path $ScriptDir ".env"
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            $line = $_.Trim()
            if ($line -eq '' -or $line.StartsWith('#')) { return }
            $eqIdx = $line.IndexOf('=')
            if ($eqIdx -lt 1) { return }
            $key   = $line.Substring(0, $eqIdx).Trim()
            $value = $line.Substring($eqIdx + 1).Trim()
            # Strip surrounding quotes
            if (($value.Length -ge 2) -and
                (($value[0] -eq '"' -and $value[-1] -eq '"') -or
                 ($value[0] -eq "'" -and $value[-1] -eq "'"))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            # Only set if not already present
            if (-not [System.Environment]::GetEnvironmentVariable($key)) {
                [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
            }
        }
        Write-Log "Loaded .env" "OK"
    }

    # Ensure NODE_ENV is set
    if (-not $env:NODE_ENV) { $env:NODE_ENV = "production" }
}

# ─── Ensure dependencies installed ───────────────────────────────────────────
function Ensure-Dependencies {
    $nodeModulesPath = Join-Path $ScriptDir "node_modules"
    if (-not (Test-Path $nodeModulesPath)) {
        Write-Log "node_modules not found - running npm install..." "STEP"
        Push-Location $ScriptDir
        & npm install --omit=dev 2>&1 | Tee-Object -FilePath $LogFile -Append
        Pop-Location
        Write-Log "Dependencies installed" "OK"
    }
}

# ─── Auto-detect prod vs dev ──────────────────────────────────────────────────
function Detect-AppMode {
    if ($script:AppMode -eq "auto") {
        $buildEntry = Join-Path $ScriptDir "build\index.js"
        $distPath   = Join-Path $ScriptDir "dist"
        if ((Test-Path $buildEntry) -and (Test-Path $distPath)) {
            $script:AppMode = "prod"
        } else {
            $script:AppMode = "dev"
        }
    }
}

# ─── PRODUCTION native start ──────────────────────────────────────────────────
function Start-ProductionServer {
    Write-Log "Starting PRODUCTION server on port $($script:ServerPort)..." "STEP"

    $buildEntry = Join-Path $ScriptDir "build\index.js"
    $distPath   = Join-Path $ScriptDir "dist"

    if ($script:ForceBuild -or (-not (Test-Path $buildEntry)) -or (-not (Test-Path $distPath))) {
        Write-Log "Building frontend + backend..." "STEP"
        Push-Location $ScriptDir
        & npm run build 2>&1 | Tee-Object -FilePath $LogFile -Append
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Build failed - check $LogFile" "ERR"
            Pop-Location
            exit 1
        }
        Pop-Location
        Write-Log "Build complete" "OK"
    }

    $env:NODE_ENV = "production"
    $env:PORT     = $script:ServerPort.ToString()

    # Pre-create log files
    $stdoutLog = Join-Path $LogDir "server.log"
    $stderrLog = Join-Path $LogDir "server_err.log"
    if (-not (Test-Path $stdoutLog)) { $null = New-Item -ItemType File -Path $stdoutLog -Force }
    if (-not (Test-Path $stderrLog)) { $null = New-Item -ItemType File -Path $stderrLog -Force }

    # Remove old PID file
    if (Test-Path $PidFile) { Remove-Item $PidFile -Force }

    $proc = Start-Process `
        -FilePath     "node" `
        -ArgumentList @("build\index.js") `
        -WorkingDirectory $ScriptDir `
        -WindowStyle  Hidden `
        -PassThru `
        -RedirectStandardOutput $stdoutLog `
        -RedirectStandardError  $stderrLog

    if (-not $proc) {
        Write-Log "Failed to spawn Node.js process" "ERR"
        exit 1
    }

    "$($proc.Id)" | Set-Content -Path $PidFile -Encoding UTF8
    Write-Log "Server process spawned (PID $($proc.Id))" "OK"

    $url = "http://127.0.0.1:$($script:ServerPort)"

    if (-not $script:SkipHealth) {
        Write-Log "Waiting for server at $url (up to 60s)..." "STEP"
        $healthy = Wait-ForUrl "$url/api/data/health" 60
        if ($proc.HasExited) {
            Write-Log "Server exited unexpectedly (code $($proc.ExitCode))" "ERR"
            Get-Content $stderrLog -Tail 10 -ErrorAction SilentlyContinue | ForEach-Object { Write-Log "  $_" "ERR" }
            exit 1
        }
        if ($healthy) {
            Write-Log "Server is healthy" "OK"
        } else {
            Write-Log "Health check timed out - server may still be loading data" "WARN"
        }
    }

    Show-Status "PRODUCTION" $url $proc.Id
    Open-DashboardBrowser $url
}

# ─── DEVELOPMENT native start ─────────────────────────────────────────────────
function Start-DevelopmentServer {
    Write-Log "Starting DEVELOPMENT server on port $($script:ServerPort) (HMR enabled)..." "STEP"

    $env:NODE_ENV = "development"
    $env:PORT     = $script:ServerPort.ToString()

    $stdoutLog = Join-Path $LogDir "server.log"
    $stderrLog = Join-Path $LogDir "server_err.log"
    if (-not (Test-Path $stdoutLog)) { $null = New-Item -ItemType File -Path $stdoutLog -Force }
    if (-not (Test-Path $stderrLog)) { $null = New-Item -ItemType File -Path $stderrLog -Force }

    if (Test-Path $PidFile) { Remove-Item $PidFile -Force }

    $proc = Start-Process `
        -FilePath     "cmd.exe" `
        -ArgumentList "/c", "npx tsx backend\index-dev.ts" `
        -WorkingDirectory $ScriptDir `
        -WindowStyle  Hidden `
        -PassThru `
        -RedirectStandardOutput $stdoutLog `
        -RedirectStandardError  $stderrLog

    if (-not $proc) {
        Write-Log "Failed to spawn dev server process" "ERR"
        exit 1
    }

    "$($proc.Id)" | Set-Content -Path $PidFile -Encoding UTF8
    Write-Log "Dev server spawned (PID $($proc.Id))" "OK"

    $url = "http://127.0.0.1:$($script:ServerPort)"

    if (-not $script:SkipHealth) {
        Write-Log "Waiting for dev server at $url (up to 30s)..." "STEP"
        $healthy = Wait-ForUrl $url 30
        if ($healthy) {
            Write-Log "Dev server ready (HMR active)" "OK"
        } else {
            Write-Log "Dev server did not respond in time" "WARN"
        }
    }

    Show-Status "DEVELOPMENT (HMR)" $url $proc.Id
    Open-DashboardBrowser $url
}

# ─── DOCKER start ─────────────────────────────────────────────────────────────
function Start-DockerServices {
    if (-not (Test-DockerRunning)) {
        Write-Log "Docker is not running. Start Docker Desktop first." "ERR"
        exit 1
    }
    Write-Log "Starting services with Docker Compose..." "STEP"

    $composeFile = Join-Path $ScriptDir "docker-compose.enhanced.yml"
    $buildArg = if ($script:ForceBuild) { "--build" } else { "" }

    Push-Location $ScriptDir
    if ($buildArg) {
        docker compose -f $composeFile up -d --build 2>&1 | Tee-Object -FilePath $LogFile -Append
    } else {
        docker compose -f $composeFile up -d 2>&1 | Tee-Object -FilePath $LogFile -Append
    }
    Pop-Location

    $url = "http://127.0.0.1:$($script:ServerPort)"
    if (-not $script:SkipHealth) {
        Write-Log "Waiting for Docker services..." "STEP"
        $null = Wait-ForUrl "$url/api/data/health" 30
    }
    Write-Log "Docker services started" "OK"
    Show-Status "DOCKER" $url "container"
    Open-DashboardBrowser $url
}

# ─── HYBRID start ─────────────────────────────────────────────────────────────
function Start-HybridMode {
    if (-not (Test-DockerRunning)) {
        Write-Log "Docker unavailable - falling back to native mode" "WARN"
        Detect-AppMode
        if ($script:AppMode -eq "prod") { Start-ProductionServer } else { Start-DevelopmentServer }
        return
    }
    Write-Log "Starting hybrid mode (Docker DB + native app)..." "STEP"

    $composeFile = Join-Path $ScriptDir "docker-compose.enhanced.yml"
    Push-Location $ScriptDir
    docker compose -f $composeFile up -d postgres redis 2>&1 | Tee-Object -FilePath $LogFile -Append
    Pop-Location

    Write-Log "Waiting for PostgreSQL..." "STEP"
    Start-Sleep -Seconds 8

    $pgRunning = docker ps | Select-String -Pattern "postgres"
    if (-not $pgRunning) {
        Write-Log "PostgreSQL container failed to start" "ERR"
        exit 1
    }
    $env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/cisco_sre_dashboard"
    $env:REDIS_URL    = "redis://localhost:6379"
    Write-Log "Database containers running" "OK"

    Detect-AppMode
    if ($script:AppMode -eq "prod") { Start-ProductionServer } else { Start-DevelopmentServer }
}

# ─── Status display ──────────────────────────────────────────────────────────
function Show-Status {
    param([string]$Mode, [string]$Url, $Pid)
    Write-Host ""
    Write-Host "==================================================================" -ForegroundColor Green
    Write-Host "  Dashboard Started Successfully" -ForegroundColor Green
    Write-Host "==================================================================" -ForegroundColor Green
    Write-Host "  URL:   $Url"
    Write-Host "  Mode:  $Mode"
    Write-Host "  PID:   $Pid"
    Write-Host "  Port:  $($script:ServerPort)"
    Write-Host "  Logs:  $LogDir\"
    Write-Host "  Stop:  .\stop.ps1"
    Write-Host "==================================================================" -ForegroundColor Green
    Write-Host ""
}

# ─── Main ─────────────────────────────────────────────────────────────────────
function Main {
    Stop-ExistingDashboard
    Import-Environment
    Resolve-Port
    Ensure-Dependencies

    Write-Log "Resolved port: $($script:ServerPort)" "STEP"

    # Auto-detect top-level mode
    if ($script:Mode -eq "auto") { $script:Mode = "native" }

    Write-Log "Mode: $($script:Mode) | Port: $($script:ServerPort)" "INFO"

    switch ($script:Mode) {
        "native" {
            Detect-AppMode
            Write-Log "App mode: $($script:AppMode)" "INFO"
            if ($script:AppMode -eq "prod") { Start-ProductionServer } else { Start-DevelopmentServer }
        }
        "docker" { Start-DockerServices }
        "hybrid" { Start-HybridMode }
        default  {
            Write-Log "Unknown mode: $($script:Mode)" "ERR"
            exit 1
        }
    }
}

Main
