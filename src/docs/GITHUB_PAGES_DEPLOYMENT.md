# GitHub Pages Deployment Guide

This guide provides comprehensive instructions for deploying the Cisco SRE AgenticOps Intelligence Dashboard to GitHub Pages as a static site.

## Overview

The dashboard can be deployed to GitHub Pages as a fully static site that replicates the functionality of the server-based application at `http://localhost:8001`. The static deployment:

- Uses pre-exported JSON data files instead of API calls
- Automatically authenticates with a demo user
- Supports all dashboard features including charts, filters, and analytics
- Works without any backend server

## Prerequisites

1. **Node.js 18+** installed on your machine
2. **npm** package manager
3. **Running backend server** (for data export step)
4. **GitHub repository** with Pages enabled

## Deployment Steps

### Step 1: Export Static Data

First, ensure the backend server is running at `http://localhost:8001`:

```bash
# Start the development server
npm run dev
```

In a new terminal, export all API data to static JSON files:

```bash
npm run export:static
```

This creates JSON files in `public/static-data/` containing:
- Filter options (customers, field notices, types)
- Monthly trend data
- KPI analytics and predictions
- Intelligence insights
- Reports data

### Step 2: Build for GitHub Pages

Build the static site with the correct base path:

```bash
npm run build:static
```

This runs Vite with:
- `GITHUB_PAGES=true` - Sets the correct base URL
- `VITE_STATIC_MODE=true` - Enables static data loading

### Step 3: Copy Static Data

Copy the exported data to the build directory:

```bash
cp -r public/static-data build/public/static-data
cp build/public/index.html build/public/404.html
```

The 404.html is needed for SPA routing on GitHub Pages.

### One-Step Build

For convenience, you can run all build steps at once:

```bash
npm run build:github-pages
```

This executes:
1. `npm run export:static` - Export API data
2. `npm run build:static` - Build the static site
3. Copy static data and create 404.html

## GitHub Actions Automated Deployment

The repository includes a GitHub Actions workflow at `.github/workflows/deploy-github-pages.yml` that:

1. Triggers on push to `main` branch or manual dispatch
2. Exports static data from the running server
3. Builds the static site
4. Deploys to GitHub Pages

### Setting Up GitHub Pages

1. Go to your repository Settings > Pages
2. Under "Build and deployment", select **GitHub Actions**
3. The workflow will automatically deploy on each push to `main`

### Manual Deployment

To trigger a manual deployment:

1. Go to Actions tab in your repository
2. Select "Deploy to GitHub Pages" workflow
3. Click "Run workflow"

## Architecture

### Static Data Service

The `frontend/src/lib/static-data-service.ts` provides:

- **Static mode detection**: Automatically detects GitHub Pages environment
- **Data caching**: Caches loaded JSON data in memory
- **API mapping**: Maps API endpoints to static JSON files

### Authentication

In static mode, the dashboard automatically authenticates with a demo user:

```javascript
{
  id: 'static-user',
  username: 'demo',
  email: 'demo@cisco.com',
  role: 'user'
}
```

No login is required for the static deployment.

## File Structure

```
public/static-data/
├── index.json                    # Manifest of all exported data
├── filters.json                  # Filter options
├── metrics-summary.json          # Summary metrics
├── trends-monthly.json           # Monthly trend data
├── trends-monthly-cumulative.json
├── trends-forecast.json          # Forecast predictions
├── intelligence-insights.json    # AI insights
├── kpi-*.json                    # Various KPI analytics
├── reports-*.json                # Reports data
├── sync-status.json              # Sync status
└── filtered/                     # Filtered data by month
    ├── monthly-apr.json
    ├── monthly-may.json
    ├── ...
    ├── top-customers-apr.json
    └── top-field-notices-apr.json
```

## Customization

### Changing the Base Path

The GitHub Pages base path is configured in:

1. **vite.config.ts**:
   ```typescript
   base: process.env.GITHUB_PAGES === "true" 
     ? "/pages/bipbabu/cisco-sre-agenticops-intelligence-dashboard-x/" 
     : "/",
   ```

2. **package.json** scripts:
   ```json
   "build:static": "GITHUB_PAGES=true VITE_STATIC_MODE=true vite build --base=/your-repo-name/"
   ```

### Updating Static Data

To update the static data with fresh exports:

1. Start the development server with current data
2. Run `npm run export:static`
3. Rebuild and redeploy with `npm run build:github-pages`

## Limitations

The static deployment has some limitations compared to the full server version:

- **No real-time data updates**: Data is frozen at export time
- **No user authentication**: Uses demo user only
- **No data mutations**: Cannot add/edit/delete records
- **No AI recommendations**: Gemini API calls are not available
- **Limited filtering**: Only pre-exported filter combinations work

## Troubleshooting

### SPA Routing Issues

If routes like `/intelligence` or `/reports` show 404:
- Ensure 404.html is copied: `cp build/public/index.html build/public/404.html`
- The GitHub Pages deployment includes this automatically

### Static Data Not Loading

If data doesn't load on the static site:
- Check browser console for errors
- Verify `static-data/` folder exists in `build/public/`
- Ensure all JSON files were exported successfully

### Build Errors

If the build fails:
- Run `npm install` to ensure dependencies are current
- Check for TypeScript errors with `npm run check`
- Ensure the export script completed without errors

## Local Testing

To test the static build locally:

```bash
# Preview the static build
npx vite preview --host --base=/

# Or serve with any static server
cd build/public
npx serve .
```

## GitHub Pages URL

After deployment, the dashboard will be available at:

```
https://bipbabu.github.io/pages/cisco-sre-agenticops-intelligence-dashboard-x/
```

Or at your configured GitHub Pages URL.
