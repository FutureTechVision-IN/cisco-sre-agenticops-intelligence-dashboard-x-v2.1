#Requires -Version 5.1

##############################################################################
# Cisco SRE AgenticOps Intelligence Dashboard - Hybrid Stop Script (Windows)
# Supports Docker, Native, and Hybrid modes with explicit control
# Version: 6.0.0 - Windows Server Compatible
# Compatible: PowerShell 5.1 (Windows Server 2016+) and PowerShell 7+
##############################################################################

param(
    [switch]$Docker,
    [switch]$Native,
    [switch]$Hybrid,
    [switch]$All,
    [switch]$Auto,
    [switch]$Force,
    [switch]$NoCleanup,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) {
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$LogFile = Join-Path $ScriptDir "logs\shutdown.log"
$PidFile = Join-Path $ScriptDir ".startup_pids"

$Mode = "auto"
$ForceStop = $Force.IsPresent
$SkipCleanup = $NoCleanup.IsPresent

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
    Write-Host "Usage: .\stop.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Docker      Stop Docker services only"
    Write-Host "  -Native      Stop native services only"
    Write-Host "  -Hybrid      Stop hybrid mode (both Docker DB + native app)"
    Write-Host "  -All         Stop all services (Docker + native)"
    Write-Host "  -Auto        Auto-detect and stop running services (default)"
    Write-Host "  -Force       Force stop without graceful shutdown"
    Write-Host "  -NoCleanup   Skip cleanup of PID files and temp data"
    Write-Host "  -Help        Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\stop.ps1                  Auto-detect and stop"
    Write-Host "  .\stop.ps1 -Docker         Stop Docker services only"
    Write-Host "  .\stop.ps1 -Native         Stop native services only"
    Write-Host "  .\stop.ps1 -All -Force     Force stop everything"
    Write-Host ""
}

function Print-Banner {
    Write-Host ""
    Write-Host "========================================"
    Write-Host "  CISCO SRE AGENTICOPS DASHBOARD"
    Write-Host "  Hybrid Power-Off System"
    Write-Host "  Version 6.0.0"
    Write-Host "========================================"
    Write-Host ""
}

function Test-Docker {
    try {
        $dockerVersion = docker version 2>$null
        if ($LASTEXITCODE -eq 0) {
            docker info 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) {
                return $true
            }
        }
    } catch {}
    return $false
}

function Stop-DockerServices {
    Write-Log "Stopping Docker services..."

    if (-not (Test-Docker)) {
        Write-Log "WARNING: Docker is not available"
        return 0
    }

    $dockerComposeFile = Join-Path $ScriptDir "docker-compose.enhanced.yml"
    if (Test-Path $dockerComposeFile) {
        Write-Log "Stopping Docker Compose services..."

        if ($ForceStop) {
            docker compose -f $dockerComposeFile down --remove-orphans -t 5 2>&1 | Tee-Object -FilePath $LogFile -Append
        } else {
            docker compose -f $dockerComposeFile down 2>&1 | Tee-Object -FilePath $LogFile -Append
            if ($LASTEXITCODE -ne 0) {
                Write-Log "WARNING: Some Docker services may not have stopped cleanly"
            }
        }
        Write-Log "Docker services stopped"
    } else {
        Write-Log "WARNING: Docker Compose file not found"
    }
}

function Get-ProcessByPort {
    param([int]$Port)

    # Primary: Get-NetTCPConnection (WS2012+, may require elevation on some configs)
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction Stop
        foreach ($conn in $connections) {
            $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            if ($process) {
                $pn = $process.ProcessName.ToLower()
                if ($pn -match 'node|npm|vite|tsx' -and $pn -notmatch 'explorer|system') {
                    return $process
                }
            }
        }
    } catch {
        # Fallback: parse netstat -ano (works without elevation on all Windows versions)
        $pattern = ":$Port\s"
        $lines = & netstat -ano 2>$null | Select-String -Pattern $pattern
        foreach ($line in $lines) {
            if ($line -notmatch 'LISTENING|ESTABLISHED') { continue }
            $parts = ($line.Line -split '\s+') | Where-Object { $_ -ne '' }
            if ($parts.Count -lt 5) { continue }
            $pidVal = 0
            if ([int]::TryParse($parts[-1], [ref]$pidVal) -and $pidVal -gt 0) {
                $process = Get-Process -Id $pidVal -ErrorAction SilentlyContinue
                if ($process) {
                    $pn = $process.ProcessName.ToLower()
                    if ($pn -match 'node|npm|vite|tsx' -and $pn -notmatch 'explorer|system') {
                        return $process
                    }
                }
            }
        }
    }
    return $null
}

function Stop-ProcessByPort {
    param(
        [int]$Port,
        [int]$Timeout = 10
    )

    $process = Get-ProcessByPort $Port
    if (-not $process) {
        return 0
    }

    $processIds = @()
    # Collect PIDs via Get-NetTCPConnection; fall back to netstat for non-admin contexts
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction Stop
        foreach ($conn in $connections) {
            $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            if ($proc) { $processIds += $proc.Id }
        }
    } catch {
        $pattern = ":$Port\s"
        $lines = & netstat -ano 2>$null | Select-String -Pattern $pattern
        foreach ($line in $lines) {
            if ($line -notmatch 'LISTENING|ESTABLISHED') { continue }
            $parts = ($line.Line -split '\s+') | Where-Object { $_ -ne '' }
            if ($parts.Count -lt 5) { continue }
            $pidVal = 0
            if ([int]::TryParse($parts[-1], [ref]$pidVal) -and $pidVal -gt 0) {
                $processIds += $pidVal
            }
        }
    }
    $processIds = $processIds | Select-Object -Unique

    Write-Log "Stopping project process on port $Port (Process IDs: $($processIds -join ', '))..."

    if ($ForceStop) {
        foreach ($procId in $processIds) {
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
        Write-Log "Process force terminated"
        return 0
    }

    foreach ($procId in $processIds) {
        Stop-Process -Id $procId -ErrorAction SilentlyContinue
    }

    $waited = 0
    while ($waited -lt $Timeout) {
        $stillRunning = $false
        foreach ($procId in $processIds) {
            if (Get-Process -Id $procId -ErrorAction SilentlyContinue) {
                $stillRunning = $true
                break
            }
        }
        if (-not $stillRunning) {
            Write-Log "Process stopped gracefully"
            return 0
        }
        Start-Sleep -Seconds 1
        $waited++
    }

    Write-Log "Force terminating process..."
    foreach ($procId in $processIds) {
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
    Write-Log "Process force terminated"
}

function Stop-NativeServices {
    Write-Log "Stopping native services..."

    if (Test-Path $PidFile) {
        $pidLines = Get-Content $PidFile
        foreach ($line in $pidLines) {
            if ($line -match "^([^:]+):(.+)$") {
                $serviceName = $matches[1]
                $processId = [int]$matches[2]

                if (Get-Process -Id $processId -ErrorAction SilentlyContinue) {
                    Write-Log "Stopping $serviceName (Process ID: $processId)..."

                    if ($ForceStop) {
                        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                        Write-Log "$serviceName force terminated"
                    } else {
                        Stop-Process -Id $processId -ErrorAction SilentlyContinue
                        Start-Sleep -Seconds 1

                        if (Get-Process -Id $processId -ErrorAction SilentlyContinue) {
                            Write-Log "Force terminating $serviceName..."
                            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                        } else {
                            Write-Log "$serviceName stopped gracefully"
                        }
                    }
                }
            }
        }
        Write-Log "Native services stopped"
    }

    $commonPorts = @(8000, 5000, 3000, 3001, 5173)
    foreach ($port in $commonPorts) {
        Stop-ProcessByPort $port
    }
}

function Stop-BackgroundProcesses {
    Write-Log "Stopping background processes..."

    $nodeProcesses = Get-Process | Where-Object {
        $_.ProcessName.ToLower() -match "node|npm|vite|tsx" -and
        $_.ProcessName.ToLower() -notmatch "explorer|system|sql"
    }

    foreach ($proc in $nodeProcesses) {
        if ($ForceStop) {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        } else {
            Stop-Process -Id $proc.Id -ErrorAction SilentlyContinue
        }
    }

    Write-Log "Background processes cleaned up"
}

function Detect-RunningServices {
    $dockerRunning = $false
    $nativeRunning = $false

    if (Test-Docker) {
        $composeResult = docker compose -f (Join-Path $ScriptDir "docker-compose.enhanced.yml") ps 2>$null
        if ($composeResult -match "Up|running") {
            $dockerRunning = $true
        }
    }

    if (Test-Path $PidFile) {
        $pidLines = Get-Content $PidFile
        foreach ($line in $pidLines) {
            if ($line -match "^[^:]+:(\d+)$") {
                $processId = [int]$matches[1]
                if (Get-Process -Id $processId -ErrorAction SilentlyContinue) {
                    $nativeRunning = $true
                    break
                }
            }
        }
    }

    $commonPorts = @(8000, 5000, 3000, 3001, 5173)
    foreach ($port in $commonPorts) {
        $proc = Get-ProcessByPort $port
        if ($proc) {
            $nativeRunning = $true
            break
        }
    }

    if ($dockerRunning -and $nativeRunning) {
        return "all"
    } elseif ($dockerRunning) {
        return "docker"
    } elseif ($nativeRunning) {
        return "native"
    } else {
        return "none"
    }
}

function Show-FinalStatus {
    Write-Host ""
    Write-Log "Final Status Check (Mode: $Mode):"

    $remainingProcesses = $false

    if (Test-Docker) {
        $composeResult = docker compose -f (Join-Path $ScriptDir "docker-compose.enhanced.yml") ps 2>$null
        if ($composeResult -match "Up|running") {
            Write-Log "WARNING: Some Docker services may still be running"
            $remainingProcesses = $true
        }
    }

    $commonPorts = @(8000, 5000, 3000, 3001, 5173)
    foreach ($port in $commonPorts) {
        $proc = Get-ProcessByPort $port
        if ($proc) {
            Write-Log "WARNING: Port $port still has project processes running"
            $remainingProcesses = $true
        }
    }

    if (-not $remainingProcesses) {
        Write-Log "All services stopped successfully!"
    } else {
        Write-Log "WARNING: Some services may still be running"
        Write-Log "Try: .\stop.ps1 -All -Force"
    }
    Write-Host ""
}

function Remove-PidFile {
    param([string]$Path)
    if (Test-Path $Path) {
        Remove-Item $Path -Force -ErrorAction SilentlyContinue
    }
}

function Cleanup {
    if ($SkipCleanup) {
        Write-Log "WARNING: Skipping cleanup as requested"
        return 0
    }

    Write-Log "Final cleanup..."
    Remove-PidFile $PidFile
    Write-Log "Cleanup complete"
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
    elseif ($All) { $Mode = "all" }
    elseif ($Auto) { $Mode = "auto" }

    if ($Mode -eq "auto") {
        $detectedMode = Detect-RunningServices
        if ($detectedMode -eq "none") {
            Write-Log "No running services detected"
            Write-Host "Use '.\start.ps1' to power on"
            exit 0
        }
        $Mode = $detectedMode
    }

    $modeUpper = $Mode.ToUpper()
    Write-Log "Stopping in ${modeUpper} mode"

    switch ($Mode) {
        "docker" { Stop-DockerServices }
        "native" {
            Stop-NativeServices
            Stop-BackgroundProcesses
        }
        "hybrid" {
            Stop-NativeServices
            Stop-DockerServices
            Stop-BackgroundProcesses
        }
        "all" {
            Stop-NativeServices
            Stop-DockerServices
            Stop-BackgroundProcesses
        }
        "none" {
            Write-Log "No services to stop"
        }
        default {
            Write-Log "ERROR: Unknown mode: $Mode"
            exit 1
        }
    }

    Show-FinalStatus
    Cleanup
}

Main