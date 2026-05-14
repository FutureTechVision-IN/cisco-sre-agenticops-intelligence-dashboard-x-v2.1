#Requires -Version 5.1

##############################################################################
# Cisco SRE AgenticOps Intelligence Dashboard - Hybrid Start Script (Windows)
# Supports Docker, Native, and Hybrid modes with explicit control
# Version: 6.0.0 - Windows Server Compatible
# Compatible: PowerShell 5.1 (Windows Server 2016+) and PowerShell 7+
##############################################################################

param(
    [switch]$Docker,
    [switch]$Native,
    [switch]$Hybrid,
    [switch]$Auto,
    [switch]$Build,
    [switch]$NoHealth,
    [switch]$Help,
    [ValidateRange(1, 65535)]
    [int]$Port = 0
)

$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) {
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$LogFile = Join-Path $ScriptDir "logs\startup.log"
$PidFile = Join-Path $ScriptDir ".startup_pids"

$Mode = "auto"
$ForceBuild = $Build.IsPresent
$SkipHealthCheck = $NoHealth.IsPresent

if (-not (Test-Path (Join-Path $ScriptDir "logs"))) {
    New-Item -ItemType Directory -Path (Join-Path $ScriptDir "logs") -Force | Out-Null
}

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-Host $logMessage
    Add-Content -Path $LogFile -Value $logMessage -Encoding UTF8
}

function Show-Usage {
    Write-Host ""
    Write-Host "Usage: .\start.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Docker      Start with Docker (containers only)"
    Write-Host "  -Native      Start without Docker (native Node.js)"
    Write-Host "  -Hybrid      Start hybrid mode (Docker DB + native app)"
    Write-Host "  -Auto        Auto-detect best mode (default)"
    Write-Host "  -Build       Force rebuild Docker images"
    Write-Host "  -NoHealth    Skip health checks"
    Write-Host "  -Port N      Override HTTP port (default: 8000)"
    Write-Host "  -Help        Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\start.ps1                 Auto-detect and start"
    Write-Host "  .\start.ps1 -Docker          Start with Docker"
    Write-Host "  .\start.ps1 -Native         Start without Docker"
    Write-Host "  .\start.ps1 -Hybrid         Docker DB + native dashboard"
    Write-Host "  .\start.ps1 -Docker -Build  Rebuild and start Docker"
    Write-Host ""
}

function Print-Banner {
    Write-Host ""
    Write-Host "========================================"
    Write-Host "  Cisco SRE AgenticOps Intelligence Dashboard v2.0"
    Write-Host "  Hybrid Power-On System | Version 6.0.0"
    Write-Host "========================================"
    Write-Host ""
}

function Test-Docker {
    try {
        $dockerVersion = docker version 2>$null
        if ($LASTEXITCODE -eq 0) {
            $dockerInfo = docker info 2>$null
            if ($LASTEXITCODE -eq 0) {
                return $true
            } else {
                Write-Log "WARNING: Docker is installed but not running"
                return $false
            }
        }
    } catch {
        Write-Log "WARNING: Docker is not available"
    }
    return $false
}

function Import-Environment {
    Write-Log "Loading environment configuration..."

    foreach ($envFile in @((Join-Path $ScriptDir ".env"), (Join-Path $ScriptDir ".env.docker"))) {
        if (-not (Test-Path $envFile)) { continue }
        $label = Split-Path $envFile -Leaf
        Get-Content $envFile | ForEach-Object {
            $line = $_.Trim()
            # Skip blank lines and comments
            if ($line -eq '' -or $line.StartsWith('#')) { return }
            $eqIdx = $line.IndexOf('=')
            if ($eqIdx -lt 1) { return }
            $key   = $line.Substring(0, $eqIdx).Trim()
            $value = $line.Substring($eqIdx + 1).Trim()
            # Strip surrounding single or double quotes
            if (($value.Length -ge 2) -and
                (($value[0] -eq '"'  -and $value[-1] -eq '"') -or
                 ($value[0] -eq "'" -and $value[-1] -eq "'"))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            # Only set if not already present in the process environment
            if (-not [System.Environment]::GetEnvironmentVariable($key)) {
                [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
            }
        }
        Write-Log "Loaded $label configuration"
    }

    if (-not $env:NODE_ENV)     { $env:NODE_ENV     = "production" }
    if (-not $env:PORT)         { $env:PORT          = "8000" }
    if (-not $env:DATABASE_URL) {
        $env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/cisco_sre_dashboard"
    }
    # SESSION_SECRET must be provided via .env - no insecure hardcoded fallback
}

function Test-PortAvailable {
    param([int]$Port)
    try {
        $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $Port)
        $listener.Start()
        $listener.Stop()
        return $true
    } catch {
        return $false
    }
}

function Find-AvailablePort {
    param([int]$StartPort)
    $port = $StartPort
    $maxPort = $StartPort + 100

    while ($port -lt $maxPort) {
        if (Test-PortAvailable $port) {
            return $port
        }
        $port++
    }
    return $StartPort
}

function Start-DockerServices {
    Write-Log "Starting services with Docker..."

    $dockerComposeFile = Join-Path $ScriptDir "docker-compose.enhanced.yml"
    $dashboardImage = "cisco-sre/dashboard"

    if ($ForceBuild -or -not (docker images | Select-String -Pattern $dashboardImage)) {
        $dockerfile = Join-Path $ScriptDir "Dockerfile.dashboard"
        if (Test-Path $dockerfile) {
            Write-Log "Building dashboard image..."
            docker build -f $dockerfile -t "$dashboardImage:latest" $ScriptDir 2>&1 | Tee-Object -FilePath $LogFile -Append
        }
    }

    Write-Log "Starting Docker Compose services..."
    docker compose -f $dockerComposeFile up -d 2>&1 | Tee-Object -FilePath $LogFile -Append

    if (-not $SkipHealthCheck) {
        Write-Log "Waiting for services to become ready..."
        Start-Sleep -Seconds 10
    }

    Write-Log "Docker services started"
}

function Start-Hybrid {
    Write-Log "Starting hybrid mode (Docker DB + Native Dashboard)..."

    if (-not (Test-Docker)) {
        Write-Log "ERROR: Docker required for hybrid mode (database containers)"
        Write-Log "Falling back to native mode..."
        Start-NativeDashboard
        return
    }

    $dockerComposeFile = Join-Path $ScriptDir "docker-compose.enhanced.yml"
    Write-Log "Starting database services with Docker..."
    docker compose -f $dockerComposeFile up -d postgres redis 2>&1 | Tee-Object -FilePath $LogFile -Append

    Write-Log "Waiting for databases to become ready..."
    Start-Sleep -Seconds 5

    $postgresRunning = docker ps | Select-String -Pattern "postgres"
    if (-not $postgresRunning) {
        Write-Log "ERROR: PostgreSQL container failed to start"
        return 1
    }

    $redisRunning = docker ps | Select-String -Pattern "redis"
    if (-not $redisRunning) {
        Write-Log "ERROR: Redis container failed to start"
        return 1
    }

    Write-Log "Database containers are running"

    $env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/cisco_sre_dashboard"
    $env:REDIS_URL = "redis://localhost:6379"

    Start-NativeDashboard
}

function Test-CommandAvailable {
    param([string]$Command)
    try {
        $null = Get-Command $Command -ErrorAction SilentlyContinue
        return $true
    } catch {
        return $false
    }
}

function Test-NpmExecAvailable {
    param([string]$Package)
    try {
        $result = npm exec -- $Package --version 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Start-ProductionServer {
    # Single-process production server: node build\index.js on $Port.
    # This is the primary mode for Windows Server deployments.
    $buildEntry = Join-Path $ScriptDir "build\index.js"
    $serverPort = if ($Port -gt 0) { $Port } elseif ($env:PORT) { [int]$env:PORT } else { 8000 }

    Write-Log "Starting production server on port $serverPort..."

    if (Test-Path $PidFile) { Remove-Item $PidFile -Force }

    # Inherit environment to child process via current process scope
    $env:NODE_ENV = "production"
    $env:PORT     = $serverPort.ToString()

    $stdoutLog = Join-Path $ScriptDir "logs\server.log"
    $stderrLog = Join-Path $ScriptDir "logs\server_err.log"

    # Pre-create log files - avoids Start-Process redirect error on PS 5.1
    if (-not (Test-Path $stdoutLog)) { $null = New-Item -ItemType File -Path $stdoutLog -Force }
    if (-not (Test-Path $stderrLog)) { $null = New-Item -ItemType File -Path $stderrLog -Force }

    $proc = Start-Process `
        -FilePath     "node" `
        -ArgumentList @("build\index.js") `
        -WorkingDirectory $ScriptDir `
        -WindowStyle  Hidden `
        -PassThru `
        -RedirectStandardOutput $stdoutLog `
        -RedirectStandardError  $stderrLog

    if (-not $proc) {
        Write-Log "ERROR: Failed to spawn Node.js process"
        return 1
    }

    "server:$($proc.Id)" | Add-Content -Path $PidFile -Encoding UTF8
    Write-Log "Server process spawned (PID $($proc.Id))"

    if ($SkipHealthCheck) {
        Write-Host ""
        Write-Log "========================================"
        Write-Log "Dashboard Starting (health check skipped)"
        Write-Log "========================================"
        Write-Log "URL:  http://localhost:$serverPort"
        Write-Host ""
        return 0
    }

    # Poll /api/data/health - allow up to 60 s for the 531K-record CSV to load
    Write-Log "Waiting for server to become healthy (up to 60 s)..."
    $maxWait = 60
    $waited  = 0
    while ($waited -lt $maxWait) {
        if ($proc.HasExited) {
            Write-Log "ERROR: Server exited unexpectedly (code $($proc.ExitCode))"
            Write-Log "stdout log: $stdoutLog"
            Write-Log "stderr log: $stderrLog"
            Get-Content $stdoutLog -Tail 20 -ErrorAction SilentlyContinue | ForEach-Object { Write-Log "  $_" }
            Get-Content $stderrLog -Tail 10 -ErrorAction SilentlyContinue | ForEach-Object { Write-Log "  $_" }
            return 1
        }
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:$serverPort/api/data/health" `
                -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
            if ($r.StatusCode -eq 200) {
                Write-Host ""
                Write-Log "========================================"
                Write-Log "Dashboard Started Successfully!"
                Write-Log "========================================"
                Write-Host ""
                Write-Log "URL:     http://localhost:$serverPort"
                Write-Log "Mode:    Production  (node build\index.js)"
                Write-Log "Dataset: fn_aug25-feb26.csv  (531,844 records)"
                Write-Log "PID:     $($proc.Id)"
                Write-Log "Stop:    .\stop.ps1"
                Write-Log "Logs:    $ScriptDir\logs\"
                Write-Host ""
                return 0
            }
        } catch {
            # Server not yet healthy - keep waiting
        }
        if (($waited % 10) -eq 9) {
            Write-Log "  Still waiting... ($($waited + 1)/$maxWait s) - CSV dataset may still be loading"
        }
        Start-Sleep -Seconds 1
        $waited++
    }

    Write-Log "WARNING: Server started but health check timed out after ${maxWait}s"
    Write-Log "The server may still be loading the dataset. Check: http://localhost:$serverPort"
    Write-Log "Run '.\stop.ps1' to shut down if needed."
    return 0
}

function Start-NativeDashboard {
    Set-Location $ScriptDir

    Write-Log "Checking dependencies..."

    $nodeModulesPath = Join-Path $ScriptDir "node_modules"
    $distPath = Join-Path $ScriptDir "dist"

    # Check if we have a production build that we can serve offline
    $hasDistBuild = Test-Path (Join-Path $distPath "index.html")

    if (-not (Test-Path $nodeModulesPath) -and -not $hasDistBuild) {
        Write-Log "ERROR: node_modules not found and no production build available."
        Write-Log "Please run 'npm install' first or ensure dist/ folder exists."
        return 1
    }

    # Try to use npm exec for Vite/TSX
    $canUseVite = $false
    $canUseTsx = $false

    if (Test-Path $nodeModulesPath) {
        $vitePath = Join-Path $nodeModulesPath "vite\package.json"
        $tsxPath = Join-Path $nodeModulesPath "tsx\package.json"

        # Check if vite and tsx packages are actually installed (not just empty directories)
        if (Test-Path $vitePath) { $canUseVite = $true }
        if (Test-Path $tsxPath) { $canUseTsx = $true }
    }

    # PRODUCTION MODE: compiled server present and not explicitly in development mode.
    # This is the standard path for Windows Server deployments.
    $buildEntry = Join-Path $ScriptDir "build\index.js"
    if ((Test-Path $buildEntry) -and ($env:NODE_ENV -ne "development")) {
        Write-Log "Production build detected - launching production server"
        return (Start-ProductionServer)
    }

    # OFFLINE MODE: If no vite/tsx but we have a dist build, serve it statically
    if (-not $canUseVite -or -not $canUseTsx) {
        if ($hasDistBuild) {
            Write-Log "OFFLINE MODE: Vite/TSX not available, serving production build from dist/"
            return (Start-OfflineMode)
        } else {
            Write-Log "ERROR: Cannot start. Vite/TSX not installed and no production build found."
            Write-Log "Network appears to be unavailable for npm install."
            Write-Log "Please provide offline access to npm packages or the dist/ build folder."
            return 1
        }
    }

    Write-Log "Dependencies verified - Vite and TSX are available"

    $FrontendPort = Find-AvailablePort 5173
    $BackendPort = 3000

    $env:PORT = $BackendPort.ToString()
    $env:VITE_PORT = $FrontendPort.ToString()

    if (Test-Path $PidFile) {
        Remove-Item $PidFile -Force
    }

    Write-Log "Starting frontend development server on port $FrontendPort..."
    $viteLog = Join-Path $ScriptDir "logs\frontend.log"
    $viteErrLog = Join-Path $ScriptDir "logs\frontend_err.log"

    # Try npm exec first (handles path issues better)
    $viteCmd = "npm exec -- vite dev --port $FrontendPort"
    $viteProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $viteCmd -WorkingDirectory $ScriptDir -NoNewWindow -PassThru -RedirectStandardOutput $viteLog -RedirectStandardError $viteErrLog
    "frontend:$($viteProcess.Id)" | Add-Content -Path $PidFile

    Write-Log "Waiting for frontend to initialize..."
    Start-Sleep -Seconds 3

    if ($viteProcess.HasExited) {
        Write-Log "ERROR: Frontend failed to start"
        Write-Log "Check logs: $viteLog"
        Get-Content $viteLog -Tail 20
        return 1
    }

    Write-Log "Starting backend server on port $BackendPort..."
    $backendLog = Join-Path $ScriptDir "logs\backend.log"
    $backendErrLog = Join-Path $ScriptDir "logs\backend_err.log"
    $env:PORT = $BackendPort.ToString()
    $env:NODE_ENV = "development"

    # Try npm exec first (handles path issues better)
    $tsxCmd = "npm exec -- tsx backend/index-dev.ts"
    $backendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $tsxCmd -WorkingDirectory $ScriptDir -NoNewWindow -PassThru -RedirectStandardOutput $backendLog -RedirectStandardError $backendErrLog
    "backend:$($backendProcess.Id)" | Add-Content -Path $PidFile

    Write-Log "Waiting for services to initialize..."
    $maxWait = 30
    $waited = 0
    $frontendReady = $false
    $backendReady = $false

    while ($waited -lt $maxWait) {
        if (-not $frontendReady) {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:$FrontendPort" -TimeoutSec 2 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    Write-Log "Frontend is ready on port $FrontendPort (PID: $($viteProcess.Id))"
                    $frontendReady = $true
                }
            } catch {}
        }

        if (-not $backendReady) {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:$BackendPort" -TimeoutSec 2 -ErrorAction SilentlyContinue
                if ($response.StatusCode -eq 200) {
                    Write-Log "Backend is ready on port $BackendPort (PID: $($backendProcess.Id))"
                    $backendReady = $true
                }
            } catch {}
        }

        if ($frontendReady -and $backendReady) {
            break
        }

        Start-Sleep -Seconds 1
        $waited++
    }

    if ($frontendReady -and $backendReady) {
        Write-Host ""
        Write-Log "========================================"
        Write-Log "Dashboard Started Successfully!"
        Write-Log "========================================"
        Write-Host ""
        if ($frontendReady) { Write-Log "Frontend:  http://localhost:$FrontendPort" }
        if ($backendReady) { Write-Log "Backend:   http://localhost:$BackendPort" }
        Write-Host ""
        Write-Log "Use '.\stop.ps1' to shutdown all services"
        Write-Log "Logs: $ScriptDir\logs\"
        Write-Host ""
        return 0
    } else {
        Write-Log "========================================"
        Write-Log "ERROR: Dashboard Failed to Start"
        Write-Log "========================================"
        Write-Log "Check detailed logs:"
        Write-Log "   Frontend: $viteLog"
        Write-Log "   Backend:  $backendLog"
        return 1
    }
}

function Start-OfflineMode {
    $distPath = Join-Path $ScriptDir "dist"
    $port = Find-AvailablePort 8000

    Write-Log "Starting offline static server on port $port..."
    Write-Log "Serving production build from: $distPath"

    $mimeTypes = @{
        '.html' = 'text/html'
        '.css'  = 'text/css'
        '.js'   = 'application/javascript'
        '.json' = 'application/json'
        '.png'  = 'image/png'
        '.jpg'  = 'image/jpeg'
        '.svg'  = 'image/svg+xml'
        '.ico'  = 'image/x-icon'
        '.woff' = 'font/woff'
        '.woff2'= 'font/woff2'
        '.ttf'  = 'font/ttf'
        '.mp3'  = 'audio/mpeg'
        '.wav'  = 'audio/wav'
    }

    # Use the pre-built offline server script
    $serverScriptPath = Join-Path $ScriptDir "serve-dist.cjs"

    # Update the path in the server script to use the correct dist directory
    $distPathForJS = $distPath -replace "\\", "/"
    $serverContent = Get-Content $serverScriptPath -Raw
    $serverContent = $serverContent -replace "d='[^']*'", "d='$distPathForJS'"
    $serverContent | Out-File -FilePath $serverScriptPath -Encoding UTF8 -Force

    $serverLog = Join-Path $ScriptDir "logs\offline.log"
    $serverErrLog = Join-Path $ScriptDir "logs\offline_err.log"

    # Pass port as command-line argument for reliability
    $cmdArgs = "/c node " + '"' + $serverScriptPath + '"' + " $port"
    $serverProcess = Start-Process -FilePath "cmd.exe" -ArgumentList $cmdArgs -WorkingDirectory $ScriptDir -NoNewWindow -PassThru -RedirectStandardOutput $serverLog -RedirectStandardError $serverErrLog

    if ($serverProcess -and -not $serverProcess.HasExited) {
        "offline:$($serverProcess.Id)" | Add-Content -Path $PidFile
        Write-Log "Waiting for server to initialize..."
        Start-Sleep -Seconds 3

        $maxWait = 10
        $waited = 0
        $serverStarted = $false
        
        while ($waited -lt $maxWait -and -not $serverStarted) {
            try {
                # Use simple TCP client to check if port is listening
                $tcpClient = New-Object System.Net.Sockets.TcpClient
                $result = $tcpClient.BeginConnect('localhost', $port, $null, $null)
                $wait = $result.AsyncWaitHandle.WaitOne(2000, $false)
                
                if ($wait) {
                    $tcpClient.EndConnect($result)
                    $tcpClient.Close()
                    $serverStarted = $true
                    break
                }
                $tcpClient.Close()
            } catch {
                # Server not ready yet
            }
            Start-Sleep -Seconds 1
            $waited++
        }
        
        if ($serverStarted) {
            Write-Host ""
            Write-Log "========================================"
            Write-Log "Dashboard Started in OFFLINE MODE!"
            Write-Log "========================================"
            Write-Host ""
            Write-Log "Dashboard: http://localhost:$port"
            Write-Log "Mode:      Static files from dist/"
            Write-Log "Note:      No API backend - static data only"
            Write-Host ""
            Write-Log "Use '.\stop.ps1' to shutdown"
            return 0
        }
    }

    Write-Log "ERROR: Failed to start offline server"
    return 1
}

function Start-AutoDetect {
    if (Test-Docker) {
        Write-Log "Docker is available and running"
        return "docker"
    } else {
        Write-Log "Docker not available, using native mode"
        return "native"
    }
}

function Main {
    Print-Banner

    if ($Help) {
        Show-Usage
        exit 0
    }

    if ($Docker) { $Mode = "docker" }
    elseif ($Native) { $Mode = "native" }
    elseif ($Hybrid) { $Mode = "hybrid" }
    elseif ($Auto) { $Mode = "auto" }

    Import-Environment

    # -Port CLI argument takes precedence over .env PORT
    if ($Port -gt 0) { $env:PORT = $Port.ToString() }

    if ($Mode -eq "auto") {
        $Mode = Start-AutoDetect
    }

    $modeUpper = $Mode.ToUpper()
    Write-Log "Starting in ${modeUpper} mode"

    switch ($Mode) {
        "docker" { Start-DockerServices }
        "native" { Start-NativeDashboard }
        "hybrid" { Start-Hybrid }
        default {
            Write-Log "ERROR: Unknown mode: $Mode"
            exit 1
        }
    }
}

Main