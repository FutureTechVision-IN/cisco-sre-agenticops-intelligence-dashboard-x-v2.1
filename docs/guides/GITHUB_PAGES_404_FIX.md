# GitHub Pages 404 Error Resolution

## Issue Summary
**Date**: November 26, 2025  
**Status**: ✅ RESOLVED

### Problem
The dashboard deployed to GitHub Pages at `https://wwwin-github.cisco.com/pages/bipbabu/cisco-sre-agenticops-intelligence-dashboard-x/` was experiencing 404 errors for:
1. JavaScript bundle: `/assets/index-XYxL3djB.js` (404 Not Found)
2. CSS stylesheet: `/assets/index-DGz5QKQ2.css` (404 Not Found)

### Root Cause
The Vite build configuration was using absolute paths starting with `/` for asset references. This works for root-level deployments but **fails for GitHub Pages subdirectory deployments**.

**Why it failed:**
- Generated HTML referenced: `/assets/index-XYxL3djB.js`
- Browser tried to load from: `https://wwwin-github.cisco.com/assets/index-XYxL3djB.js`
- Actual location: `https://wwwin-github.cisco.com/pages/bipbabu/cisco-sre-agenticops-intelligence-dashboard-x/assets/index-XYxL3djB.js`

The `/assets/` path resolved to the domain root instead of the repository subdirectory.

## Solution

### 1. Updated Vite Configuration
Modified `vite.config.ts` to include a `base` path for production builds:

```typescript
export default defineConfig({
  // ... other config
  base: process.env.NODE_ENV === "production" 
    ? "/pages/bipbabu/cisco-sre-agenticops-intelligence-dashboard-x/" 
    : "/",
  // ... rest of config
});
```

### 2. Verification
After rebuild, asset references now correctly include the full path:
- **Before**: `href="/assets/index-DGz5QKQ2.css"`
- **After**: `href="/pages/bipbabu/cisco-sre-agenticops-intelligence-dashboard-x/assets/index-DGz5QKQ2.css"`

### 3. Deployment Steps
```bash
# 1. Update vite.config.ts with base path
# 2. Rebuild production assets
NODE_ENV=production npm run build

# 3. Deploy to gh-pages
git checkout gh-pages
rm -f index.html favicon.png
rm -rf assets/
cp build/public/index.html .
cp build/public/favicon.png .
cp -r build/public/assets .

# 4. Commit and push
git add -A
git commit -m "Fix: Update asset paths for GitHub Pages subdirectory deployment"
git push origin gh-pages
```

## Technical Details

### File Modified
- **File**: `vite.config.ts`
- **Lines Changed**: 3 (added base path configuration)
- **Commit**: `7f33014` (main), `1f2e2b7` (gh-pages)

### Asset Path Examples
| Asset Type | New Path |
|-----------|----------|
| JavaScript | `/pages/bipbabu/cisco-sre-agenticops-intelligence-dashboard-x/assets/index-XYxL3djB.js` |
| CSS | `/pages/bipbabu/cisco-sre-agenticops-intelligence-dashboard-x/assets/index-DGz5QKQ2.css` |
| Favicon | `/pages/bipbabu/cisco-sre-agenticops-intelligence-dashboard-x/favicon.png` |

## Testing

### Local Development
The `base` path only applies to production builds (`NODE_ENV=production`), so local development continues to work normally at `http://localhost:5000/`.

### GitHub Pages Deployment
1. **URL**: `https://wwwin-github.cisco.com/pages/bipbabu/cisco-sre-agenticops-intelligence-dashboard-x/`
2. **Expected Result**: All assets load successfully (200 OK status)
3. **Browser Console**: No 404 errors
4. **UI Rendering**: Complete dashboard with styles and interactivity

## Prevention

### For Future Deployments
Always configure the `base` path in `vite.config.ts` when deploying to:
- GitHub Pages (non-root)
- Subdirectories on any hosting platform
- Reverse proxy paths

### Configuration Template
```typescript
base: process.env.NODE_ENV === "production" 
  ? "/your-subdirectory-path/" 
  : "/",
```

## Related Documentation
- Vite Base Path: https://vite.dev/config/shared-options.html#base
- GitHub Pages: https://docs.github.com/en/pages

## Git LFS Issue (Bonus Fix)
During deployment, encountered Git LFS issue where remote repository doesn't support LFS:
- **Error**: `Git LFS is disabled for your instance`
- **Solution**: Ran `git lfs uninstall` to migrate files to normal Git storage
- **Result**: Push succeeded without LFS

---
**Status**: Dashboard now loads correctly with all assets at GitHub Pages URL ✅
