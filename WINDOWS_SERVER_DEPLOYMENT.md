# Windows Server Deployment Guide

**SRE AgenticOps Intelligence Dashboard — Windows Server 2016/2019/2022**

---

## Table of Contents

1. [Browser Support Matrix](#1-browser-support-matrix)
2. [Windows Server Prerequisites](#2-windows-server-prerequisites)
3. [Installation](#3-installation)
4. [Deployment Modes](#4-deployment-modes)
5. [IIS Configuration](#5-iis-configuration)
6. [Firewall & Security Policy](#6-firewall--security-policy)
7. [Environment Variables on Windows](#7-environment-variables-on-windows)
8. [Running as a Windows Service](#8-running-as-a-windows-service)
9. [Troubleshooting Common Windows Issues](#9-troubleshooting-common-windows-issues)
10. [Cross-Platform Testing](#10-cross-platform-testing)
11. [macOS-Specific Notes](#11-macos-specific-notes)

---

## 1. Browser Support Matrix

| Browser | Platform | Minimum Version | Status |
|---|---|---|---|
| Microsoft Edge (Chromium) | Windows | 90+ | **Supported** — primary browser |
| Google Chrome | Windows / macOS | 90+ | **Supported** |
| Mozilla Firefox | Windows / macOS | 90+ | **Supported** |
| Safari | macOS / iOS | 15+ | **Supported** |
| Microsoft Edge (EdgeHTML) | Windows | any | Not supported |
| Internet Explorer | Windows | any | **Not supported** — React 19 requires ES2015+ |

> **Important:** IE11 is end-of-life (June 2022) and is incompatible with React 19. If IE11 is required by policy, the dashboard cannot run in it. Use Microsoft Edge (Chromium) instead — it is available on all Windows Server versions via the [official MSI](https://www.microsoft.com/en-us/edge/business/download).

---

## 2. Windows Server Prerequisites

### Mandatory
- **Windows Server 2016, 2019, or 2022** (x64)
- **Node.js 18 LTS or later** — download from https://nodejs.org/en/download/
  - Install for all users; ensure `node` and `npm` are in the system `PATH`
  - Verify: `node -v && npm -v`
- **npm 9+** (bundled with Node 18)

### Optional (for IIS reverse proxy mode)
- **IIS 10** with features:
  - Web Server (IIS) → Common HTTP Features
  - Web Server (IIS) → Application Development → CGI (for iisnode, if used)
  - **Application Request Routing (ARR) 3.0** — install from Web Platform Installer
  - **URL Rewrite Module 2.1** — install from Web Platform Installer
- **Web Platform Installer** — https://www.iis.net/downloads/microsoft/web-platform-installer

### Optional (for process management)
- **PM2** — `npm install -g pm2` (recommended for auto-restart on crash / reboot)
- **WinSW** — Windows Service Wrapper for running Node.js as a Windows Service

---

## 3. Installation

### 3.1 Clone or copy the project

```bat
cd C:\inetpub\apps
git clone https://github.com/FutureTechVision-IN/cisco-sre-agenticops-intelligence-dashboard-x-v2.1.git
cd cisco-sre-agenticops-intelligence-dashboard-x-v2.1
```

Or copy the deployment package (`.zip`) and extract it.

### 3.2 Install dependencies

```bat
npm install --production=false
```

> **PATH length on Windows:** If you encounter `ENAMETOOLONG` errors, enable long paths:
> ```powershell
> # Run as Administrator
> Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
>   -Name LongPathsEnabled -Value 1
> ```
> Then restart the terminal.

### 3.3 Build the project

```bat
npm run build
```

This produces:
- `dist/` — compiled React SPA (static files)
- `build/index.js` — compiled Node.js production server

### 3.4 Configure environment variables

Copy `.env.example` to `.env` and edit:

```bat
copy .env.example .env
notepad .env
```

Minimum `.env` for production:

```env
NODE_ENV=production
PORT=8000
SESSION_SECRET=<random-64-char-string>
```

Generate a secure session secret in PowerShell:
```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

### 3.5 Start the server

```bat
start.bat --native
```

Or directly:
```bat
set NODE_ENV=production
set PORT=8000
node build\index.js
```

---

## 4. Deployment Modes

### Mode A: Node.js standalone (recommended for most deployments)

Node.js serves both the static `dist/` files and the `/api/*` routes directly.

```
Client → Node.js (port 8000) → dist/ + API
```

Start with:
```bat
node build\index.js
```

Access at `http://<server-ip>:8000`.

### Mode B: IIS reverse proxy (required if IIS is mandated by IT policy)

IIS handles incoming traffic on port 80/443 and proxies to Node.js on 8000.

```
Client → IIS (port 80/443) → Node.js (localhost:8000)
```

See [Section 5](#5-iis-configuration) for full IIS setup.

### Mode C: Docker (requires Docker Desktop or Docker Engine on Windows Server)

```bat
docker compose -f docker-compose.production.yml up -d
```

---

## 5. IIS Configuration

### 5.1 Enable required IIS features

Run in PowerShell (Administrator):

```powershell
Import-Module ServerManager
Install-WindowsFeature -Name Web-Server, Web-Common-Http, Web-Static-Content,
  Web-Default-Doc, Web-Http-Errors, Web-Http-Redirect,
  Web-Http-Logging, Web-Request-Monitor,
  Web-Security, Web-Filtering,
  Web-Performance, Web-Stat-Compression, Web-Dyn-Compression
```

### 5.2 Install ARR and URL Rewrite

Download and install:
- URL Rewrite: https://www.iis.net/downloads/microsoft/url-rewrite
- ARR 3.0: https://www.iis.net/downloads/microsoft/application-request-routing

Then enable ARR proxy in IIS Manager:
1. Open **IIS Manager** → select server node
2. Double-click **Application Request Routing Cache**
3. Click **Server Proxy Settings** on the right
4. Check **Enable proxy** → Apply

### 5.3 Deploy the web.config

The `web.config` in the project root handles all routing rules. Copy it to the IIS site root directory. If you are serving `dist/` directly from IIS, copy `web.config` into `dist/` as well.

### 5.4 Create the IIS Site

```powershell
# Run as Administrator
New-WebSite -Name "SREDashboard" -Port 80 `
  -PhysicalPath "C:\inetpub\apps\cisco-sre-agenticops-intelligence-dashboard-x-v2.1" `
  -Force
```

For HTTPS (recommended for production):
```powershell
# Bind an SSL certificate first, then:
New-WebBinding -Name "SREDashboard" -Protocol https -Port 443 `
  -SslFlags 0 -IPAddress "*"
```

### 5.5 WebSocket support

Ensure WebSocket Protocol feature is enabled:
```powershell
Install-WindowsFeature Web-WebSockets
```

This is required for the voice assistant WebSocket (`/ws/voice`) to function.

### 5.6 Application Pool settings

```powershell
# Create a dedicated app pool running under LocalSystem or a service account
New-WebAppPool -Name "SREDashboardPool"
Set-ItemProperty IIS:\AppPools\SREDashboardPool -name processModel.identityType -value 4
Set-ItemProperty IIS:\AppPools\SREDashboardPool -name managedRuntimeVersion -value ""
Set-WebConfigurationProperty -pspath IIS:\ `
  -filter "system.applicationHost/applicationPools/add[@name='SREDashboardPool']/recycling/periodicRestart" `
  -name time -value "00:00:00"
```

---

## 6. Firewall & Security Policy

### 6.1 Windows Firewall rules

Allow inbound traffic on the application port:

```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "SRE Dashboard (HTTP)" `
  -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow

# If using IIS on port 80:
New-NetFirewallRule -DisplayName "SRE Dashboard (IIS HTTP)" `
  -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# If using HTTPS (port 443):
New-NetFirewallRule -DisplayName "SRE Dashboard (IIS HTTPS)" `
  -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

### 6.2 Antivirus exclusions

Windows Defender / corporate AV may scan `node_modules/` and CSV data files on every read, causing severe performance degradation with the 129 MB CSV. Add exclusions:

```powershell
Add-MpPreference -ExclusionPath "C:\inetpub\apps\cisco-sre-agenticops-intelligence-dashboard-x-v2.1\node_modules"
Add-MpPreference -ExclusionPath "C:\inetpub\apps\cisco-sre-agenticops-intelligence-dashboard-x-v2.1\data"
Add-MpPreference -ExclusionExtension ".csv"
```

### 6.3 Content Security Policy

The dashboard requires these CSP directives (already set by the Node.js server via headers):

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self' ws: wss:;
img-src 'self' data: blob:;
```

If additional content sources are needed (e.g., an internal CDN), add them to the `connect-src` directive.

### 6.4 Enterprise Group Policy considerations

Some enterprise environments enforce:
- **No external DNS** — the Orbitron font loads from `fonts.googleapis.com`. If external DNS is blocked, the fallback system font (`Segoe UI` on Windows) will be used automatically.
- **Disabled Web Speech API** — the voice assistant silently disables itself when the API is unavailable.
- **Strict CSP via Group Policy** — ensure the CSP headers from the server are not overridden by GPO.

---

## 7. Environment Variables on Windows

### Setting variables for the current session (cmd)

```bat
set NODE_ENV=production
set PORT=8000
set SESSION_SECRET=your-secret-here
node build\index.js
```

### Setting persistent system variables (PowerShell, Administrator)

```powershell
[Environment]::SetEnvironmentVariable("NODE_ENV", "production", "Machine")
[Environment]::SetEnvironmentVariable("PORT", "8000", "Machine")
[Environment]::SetEnvironmentVariable("SESSION_SECRET", "your-secret-here", "Machine")
```

### Using a .env file (recommended)

The application reads `.env` automatically via `dotenv`. Keep `.env` out of version control; use `.env.example` as a template.

```env
NODE_ENV=production
PORT=8000
HOST=0.0.0.0
SESSION_SECRET=<generate-with-powershell>
# Optional: restrict CSV date range
# CSV_START_MONTH=2025-08
# CSV_RECENT_MONTHS=6
```

---

## 8. Running as a Windows Service

### Option A: PM2 (recommended)

```bat
npm install -g pm2
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

PM2 will auto-generate a Windows startup script. Follow its instructions.

To check status:
```bat
pm2 status
pm2 logs sre-dashboard
```

### Option B: NSSM (Non-Sucking Service Manager)

1. Download NSSM from https://nssm.cc/download
2. Install:
```bat
nssm install SREDashboard "C:\Program Files\nodejs\node.exe" "C:\inetpub\apps\cisco-sre-agenticops-intelligence-dashboard-x-v2.1\build\index.js"
nssm set SREDashboard AppDirectory "C:\inetpub\apps\cisco-sre-agenticops-intelligence-dashboard-x-v2.1"
nssm set SREDashboard AppEnvironmentExtra "NODE_ENV=production" "PORT=8000"
nssm set SREDashboard Start SERVICE_AUTO_START
nssm start SREDashboard
```

### Option C: Windows Task Scheduler

Create a task that runs `start.bat --native` at system startup as a background task under a dedicated service account.

---

## 9. Troubleshooting Common Windows Issues

### `'node' is not recognized as an internal or external command`

Node.js is not in the system PATH. Fix:
1. Reinstall Node.js using the Windows MSI installer
2. Check "Add to PATH" during installation
3. Restart the command prompt or machine

### `ENOENT: no such file or directory` on CSV path

Windows paths use backslashes. The application uses `path.join()` throughout which handles this. However, if you manually set `CSV_FILE_PATH` in `.env`, use forward slashes or escape backslashes:

```env
CSV_FILE_PATH=data/fn_aug25-feb26.csv
# or
CSV_FILE_PATH=C:\\inetpub\\apps\\dashboard\\data\\fn_aug25-feb26.csv
```

### `EADDRINUSE: address already in use :::8000`

Another process is using port 8000:
```bat
netstat -ano | findstr :8000
taskkill /F /PID <pid>
```

### `HTTP Error 502.3 - Bad Gateway` in IIS

The Node.js server is not running or not listening on port 8000. Check:
1. `node build\index.js` is running
2. `netstat -an | findstr 8000` shows `LISTENING`
3. ARR proxy is enabled in IIS Manager

### `HTTP Error 404.0 - Not Found` for SPA routes (e.g., `/dashboard/kpi`)

The URL Rewrite SPA fallback rule is not active. Verify:
1. URL Rewrite Module 2.1 is installed
2. `web.config` is in the IIS site root
3. The site's app pool has read access to `web.config`

### Charts / SVG not rendering (blank white boxes)

This is typically caused by overly aggressive CSP in IIS or enterprise proxy:
- Ensure `img-src 'self' data: blob:;` is in the CSP header
- SVG `data:` URIs are used by Recharts for some chart elements

### Font displays as Times New Roman / system default

Google Fonts CDN is blocked by the network. The fallback font stack (`Segoe UI` on Windows, `-apple-system` on macOS) will be used. This is expected behaviour and does not affect functionality.

### Session expires immediately on refresh

The session `SECRET` must be set to a non-default value and must not change between restarts. Set `SESSION_SECRET` in `.env` or as a system environment variable.

### `NODE_ENV is not recognized` in cmd.exe

Use `set` before the command, not `export`:
```bat
set NODE_ENV=production && node build\index.js
```

The project uses `cross-env` in `package.json` scripts to handle this automatically.

---

## 10. Cross-Platform Testing

### Running the Playwright test suite

Ensure the server is running first, then:

```bat
REM On Windows
npm run test:e2e:cross-platform

REM Test specific browsers
npm run test:e2e:edge
npm run test:e2e:chromium
npm run test:e2e:firefox

REM View the HTML report
npm run test:e2e:report
```

### Running the compatibility check script

```bat
npm run compat:check
```

This runs `scripts/qa/cross-platform-compat-check.mjs` which performs a Node.js-only compatibility audit without requiring a browser.

### CI/CD on Windows runners (GitHub Actions)

```yaml
# .github/workflows/cross-platform.yml
jobs:
  test-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npx playwright install --with-deps chromium msedge firefox
      - run: npm run test:e2e:cross-platform
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:8000
          CI: true
```

---

## 11. macOS-Specific Notes

### Safari compatibility

- Safari requires `font-display: swap` for web fonts (already set in the Google Fonts URL)
- Safari does not support `scrollbar-width` / `scrollbar-color` CSS — the `-webkit-scrollbar` rules handle this
- Web Speech API in Safari requires `https://` — the voice assistant disables itself on `http://` origins

### macOS file system (case-sensitive)

macOS default HFS+ is case-insensitive. Development on macOS may mask import casing bugs that would break on Windows Server (NTFS, case-insensitive) or Linux (case-sensitive). All imports in the project use consistent casing.

### Starting on macOS

```bash
# Development
npm run dev

# Production (same build as Windows)
npm run build && npm start
```

### Running tests on macOS

All Playwright tests work on macOS. To test Safari specifically:
```bash
npm run test:e2e:webkit
```

To simulate Windows Edge on macOS (same Chromium engine, different UA):
```bash
npm run test:e2e:edge
```
> Note: Edge channel must be installed on macOS for the Edge Playwright project to run. If not installed, use `test:e2e:chromium` instead.

---

*Last updated: Cross-platform compatibility implementation*
*Applies to: Dashboard v2.0, Node.js 18+, React 19, Vite 6, Tailwind CSS v4*
