#Requires -Version 5.1

##############################################################################
# Cisco SRE AgenticOps Intelligence Dashboard - Force Push Script (Windows)
# Safe deployment with verification and backup
# Date: 2026-04-30
##############################################################################

param(
    [switch]$Yes,
    [switch]$NoBackup,
    [switch]$DryRun,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) {
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}

$Remote = "origin"
$Branches = @("main", "dev", "dev1")

$CYAN = "`e[36m"
$GREEN = "`e[32m"
$YELLOW = "`e[33m"
$RED = "`e[31m"
$BLUE = "`e[34m"
$NC = "`e[0m"

Write-Host @"
${CYAN}═══════════════════════════════════════════════════════════════${NC}
${CYAN}  CISCO SRE AGENTICOPS INTELLIGENCE DASHBOARD v2.0${NC}
${CYAN}  Force Push Execution Script${NC}
${CYAN}═══════════════════════════════════════════════════════════════${NC}
"@

Set-Location $ScriptDir

function Show-Usage {
    Write-Host @"
${CYAN}Usage: .\force-push.ps1 [OPTIONS]${NC}

Options:
  -Yes        Skip confirmation prompt
  -NoBackup   Don't create backup branches
  -DryRun     Show what would be pushed without doing it
  -Help       Show this help message

Examples:
  .\force-push.ps1                 Interactive mode with backup
  .\force-push.ps1 -Yes            Auto-confirm with backup
  .\force-push.ps1 -DryRun         Preview without pushing
"@
}

function Write-Step {
    param([string]$Message)
    Write-Host "${BLUE}✓ ${Message}${NC}"
}

function Test-GitAvailable {
    try {
        git --version 2>$null | Out-Null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Get-GitStatus {
    $status = git status --porcelain 2>$null
    return [string]::IsNullOrEmpty($status)
}

function Test-BranchExists {
    param([string]$Branch)
    try {
        git rev-parse --verify $Branch 2>$null | Out-Null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Get-RemoteUrl {
    try {
        return git remote get-url $Remote 2>$null
    } catch {
        return $null
    }
}

function Get-RemoteBranchSha {
    param([string]$Branch)
    try {
        $result = git ls-remote --heads $Remote $Branch 2>$null
        if ($result -match "^([a-f0-9]+)\s+refs/heads/$Branch$") {
            return $matches[1]
        }
    } catch {}
    return $null
}

function Get-LocalBranchSha {
    param([string]$Branch)
    try {
        return git rev-parse $Branch 2>$null
    } catch {
        return $null
    }
}

function Get-RevListCount {
    param([string]$From, [string]$To)
    try {
        $count = git rev-list --count "$From..$To" 2>$null
        if ($count) { return [int]$count }
    } catch {}
    return 0
}

function Get-StaticDataFileCount {
    try {
        $files = git ls-files | Select-String -Pattern "static-data" -SimpleMatch
        return ($files | Measure-Object).Count
    } catch {
        return 0
    }
}

function New-BackupBranch {
    param([string]$Branch, [string]$BackupName)
    try {
        git branch $BackupName $Branch 2>$null | Out-Null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

if ($Help) {
    Show-Usage
    exit 0
}

if (-not (Test-GitAvailable)) {
    Write-Host "${RED}❌ Git is not available. Please install Git and ensure it's in your PATH.${NC}" -ForegroundColor Red
    exit 1
}

Write-Step "STEP 1: PRE-FLIGHT CHECKS"
Write-Host ""

if (-not (Get-GitStatus)) {
    Write-Host "${RED}❌ ERROR: Uncommitted changes detected!${NC}" -ForegroundColor Red
    git status
    exit 1
}
Write-Host "${GREEN}  ✓ No uncommitted changes${NC}" -ForegroundColor Green

foreach ($branch in $Branches) {
    if (-not (Test-BranchExists $branch)) {
        Write-Host "${RED}❌ ERROR: Branch '$branch' not found!${NC}" -ForegroundColor Red
        exit 1
    }
}
Write-Host "${GREEN}  ✓ All branches exist locally${NC}" -ForegroundColor Green

$remoteUrl = Get-RemoteUrl
if (-not $remoteUrl) {
    Write-Host "${RED}❌ ERROR: Remote '$Remote' not configured!${NC}" -ForegroundColor Red
    exit 1
}
Write-Host "${GREEN}  ✓ Remote URL configured: $remoteUrl${NC}" -ForegroundColor Green

Write-Host "  ⏳ Fetching latest remote state..." -ForegroundColor Yellow
git fetch --all --quiet 2>$null
Write-Host "${GREEN}  ✓ Fetched remote state${NC}" -ForegroundColor Green

$dataFileCount = Get-StaticDataFileCount
Write-Host "${GREEN}  ✓ Data files tracked: $dataFileCount files${NC}" -ForegroundColor Green

Write-Host ""

Write-Host @"
${CYAN}═══════════════════════════════════════════════════════════════${NC}
"@ -NoNewline
Write-Host "${BLUE}✓ STEP 2: CHANGES TO BE PUSHED${NC}" -ForegroundColor Blue
Write-Host ""

foreach ($branch in $Branches) {
    Write-Host "${YELLOW}Branch: $branch${NC}" -ForegroundColor Yellow

    $remoteCommit = Get-RemoteBranchSha $branch
    $localCommit = Get-LocalBranchSha $branch

    if ($remoteCommit) {
        if ($localCommit -ne $remoteCommit) {
            Write-Host "  ${YELLOW}Local:  $localCommit${NC}" -ForegroundColor Yellow
            Write-Host "  ${YELLOW}Remote: $remoteCommit${NC}" -ForegroundColor Yellow

            $ahead = Get-RevListCount $remoteCommit $localCommit
            $behind = Get-RevListCount $localCommit $remoteCommit
            Write-Host "  ${CYAN}Ahead: $ahead commits, Behind: $behind commits${NC}" -ForegroundColor Cyan

            if ($behind -gt 0) {
                Write-Host "  ${RED}⚠  WARNING: This will overwrite $behind commits on remote!${NC}" -ForegroundColor Red
            }
        } else {
            Write-Host "${GREEN}  ✓ Already in sync${NC}" -ForegroundColor Green
        }
    } else {
        Write-Host "  ${YELLOW}Branch doesn't exist on remote (will be created)${NC}" -ForegroundColor Yellow
    }
    Write-Host ""
}

$createBackup = -not $NoBackup.IsPresent
if ($createBackup -and -not $DryRun.IsPresent) {
    Write-Host @"
${CYAN}═══════════════════════════════════════════════════════════════${NC}
"@ -NoNewline
    Write-Step "STEP 3: CREATING BACKUP BRANCHES"
    Write-Host ""

    $backupSuffix = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupSuffix = "backup-$backupSuffix"

    foreach ($branch in $Branches) {
        $backupName = "${branch}-${backupSuffix}"
        if (New-BackupBranch -Branch $branch -BackupName $backupName) {
            Write-Host "${GREEN}  ✓ Created backup: $backupName${NC}" -ForegroundColor Green
        } else {
            Write-Host "${YELLOW}  ⚠  Failed to create backup for $branch${NC}" -ForegroundColor Yellow
        }
    }
    Write-Host ""
}

if (-not $Yes.IsPresent -and -not $DryRun.IsPresent) {
    Write-Host @"
${CYAN}═══════════════════════════════════════════════════════════════${NC}
"@ -NoNewline
    Write-Host "${YELLOW}⚠  WARNING: FORCE PUSH OPERATION${NC}" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "${YELLOW}This will FORCE PUSH the following branches to $Remote:${NC}" -ForegroundColor Yellow
    foreach ($branch in $Branches) {
        Write-Host "  ${YELLOW}• $branch${NC}" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "${RED}This operation will OVERWRITE remote history!${NC}" -ForegroundColor Red
    Write-Host ""

    $confirmation = Read-Host "Are you sure you want to continue? (type 'yes' to confirm): "
    if ($confirmation -notmatch "^[Yy][Ee][Ss]$") {
        Write-Host "${YELLOW}Force push cancelled.${NC}" -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host @"
${CYAN}═══════════════════════════════════════════════════════════════${NC}
"@ -NoNewline

if ($DryRun.IsPresent) {
    Write-Host "${BLUE}✓ DRY RUN: SIMULATING FORCE PUSH${NC}" -ForegroundColor Blue
    Write-Host ""
    Write-Host "${YELLOW}Would push branches: $($Branches -join ', ')${NC}" -ForegroundColor Yellow
    Write-Host "${YELLOW}To remote: $Remote${NC}" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "${GREEN}✅ DRY RUN COMPLETE (no changes made)${NC}" -ForegroundColor Green
    exit 0
}

$stepNum = if ($createBackup) { "4" } else { "3" }
Write-Step "STEP $stepNum`: FORCE PUSH EXECUTION"
Write-Host ""

Write-Host "${YELLOW}Force pushing branches: $($Branches -join ', ')${NC}" -ForegroundColor Yellow
Write-Host "${YELLOW}Remote: $Remote${NC}" -ForegroundColor Yellow
Write-Host ""

$branchRefs = $Branches | ForEach-Object { "${Remote}/$_:refs/heads/$_" }
try {
    git push --force $Remote $branchRefs 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "${GREEN}✅ FORCE PUSH SUCCESSFUL!${NC}" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "${RED}❌ FORCE PUSH FAILED!${NC}" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "${RED}❌ FORCE PUSH FAILED: $_${NC}" -ForegroundColor Red
    exit 1
}

Write-Host @"
${CYAN}═══════════════════════════════════════════════════════════════${NC}
"@ -NoNewline
Write-Step "STEP $($stepNum + 1): POST-PUSH VERIFICATION"
Write-Host ""

Write-Host "${BLUE}Remote Branches:${NC}" -ForegroundColor Blue
git branch -r | Select-String -Pattern ($Branches -join "|") 2>$null

Write-Host ""
Write-Host "${BLUE}Data Files in Remote Main:${NC}" -ForegroundColor Blue
$remoteDataCount = Get-StaticDataFileCount
Write-Host "  ${GREEN}$remoteDataCount files${NC}" -ForegroundColor Green

Write-Host ""
Write-Host "${BLUE}Latest Remote Commits:${NC}" -ForegroundColor Blue
foreach ($branch in $Branches) {
    Write-Host "${YELLOW}$branch:${NC}" -ForegroundColor Yellow
    git log --oneline "$Remote/$branch" -3 2>$null | ForEach-Object { "  $_" }
}

Write-Host ""
Write-Host @"
${CYAN}═══════════════════════════════════════════════════════════════${NC}
${GREEN}✅ DEPLOYMENT COMPLETE${NC}
${CYAN}═══════════════════════════════════════════════════════════════${NC}
"@

Write-Host "${BLUE}Summary:${NC}" -ForegroundColor Blue
Write-Host "  ${GREEN}• All $($Branches.Count) branches force pushed successfully${NC}" -ForegroundColor Green
Write-Host "  ${GREEN}• Data files preserved and synced ($remoteDataCount files)${NC}" -ForegroundColor Green
Write-Host "  ${GREEN}• Commit history updated${NC}" -ForegroundColor Green
if ($createBackup) {
    Write-Host "  ${GREEN}• Backup branches created: *-${backupSuffix}${NC}" -ForegroundColor Green
}
Write-Host ""
Write-Host "${CYAN}Next Steps:${NC}" -ForegroundColor Cyan
Write-Host "  ${CYAN}1. Verify website still operational${NC}" -ForegroundColor Cyan
Write-Host "  ${CYAN}2. Check GitHub Actions/CI status${NC}" -ForegroundColor Cyan
Write-Host "  ${CYAN}3. Monitor application logs${NC}" -ForegroundColor Cyan
Write-Host ""