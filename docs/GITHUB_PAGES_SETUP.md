# GitHub Pages Configuration & Automated Deployment

---

## Quick Setup (5 Minutes)

### 1. Enable GitHub Pages

In your repository:

```
Settings → Pages → Build and deployment
├─ Source: Deploy from a branch
├─ Branch: gh-pages
└─ Folder: / (root)
```

### 2. Create `gh-pages` Branch

```bash
# Create orphan branch (clean history)
git checkout --orphan gh-pages

# Add documentation
git add docs/
git add README.md
git commit -m "Initial documentation site"

# Push to GitHub
git push -u origin gh-pages

# Switch back to main development
git checkout develop
```

### 3. Access Your Site

GitHub Pages is now live at:
```
https://<username>.github.io/<repo-name>/
```

Example: `https://myorg.github.io/sre-dashboard/`

---

## Automated Documentation Deployment

### GitHub Actions Workflow

Create `.github/workflows/deploy-docs.yml`:

```yaml
name: Deploy Documentation to GitHub Pages

on:
  push:
    branches:
      - master
      - develop
    paths:
      - 'docs/**'
      - '.github/workflows/deploy-docs.yml'

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Checkout gh-pages branch
        uses: actions/checkout@v3
        with:
          ref: gh-pages
          path: gh-pages

      - name: Copy documentation
        run: |
          mkdir -p gh-pages/
          cp -r docs/* gh-pages/ || true
          cp README.md gh-pages/index.md || true
          
      - name: Create index.html for GitHub Pages
        run: |
          cat > gh-pages/index.html << 'EOF'
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SRE Dashboard Documentation</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
              .container { max-width: 900px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
              ul { line-height: 2; }
              a { color: #3498db; text-decoration: none; }
              a:hover { text-decoration: underline; }
              code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>📊 SRE AgenticOps Intelligence Dashboard</h1>
              <p><strong>Documentation & Deployment Guide</strong></p>
              
              <h2>📚 Documentation</h2>
              <ul>
                <li><a href="DEPLOYMENT_GUIDE.md">Deployment Guide</a> - Complete setup instructions</li>
                <li><a href="DATA_FILE_DOCUMENTATION.md">Data File Documentation</a> - CSV structure and integration</li>
                <li><a href="GIT_BRANCH_STRATEGY.md">Git Branch Strategy</a> - Development workflow</li>
                <li><a href="QUALITY_ASSURANCE_GUIDE.md">QA Guide</a> - Testing and verification</li>
                <li><a href="MONTH_FILTER_COMPREHENSIVE_AUDIT.md">Month Filter Audit</a> - Performance and validation</li>
                <li><a href="DROPDOWN_AUDIT_COMPLIANCE_REPORT.md">Dropdown Audit</a> - Data completeness check</li>
                <li><a href="FIELD_NOTICE_FILTERING_RCA_POA_RESOLVED.md">Field Notice Fix Documentation</a> - Issue resolution</li>
              </ul>
              
              <h2>🚀 Quick Start</h2>
              <pre><code># Clone repository
git clone &lt;repo-url&gt;
cd sre-dashboard

# Install and run
./deployment-scripts/start.sh

# Dashboard available at http://localhost:5000
              </code></pre>
              
              <h2>📋 System Requirements</h2>
              <ul>
                <li>Node.js v18+</li>
                <li>PostgreSQL 12+ or Neon serverless</li>
                <li>2GB RAM minimum</li>
                <li>5GB disk space</li>
              </ul>
              
              <h2>📞 Support</h2>
              <p>For issues or questions, refer to the troubleshooting sections in the documentation.</p>
            </div>
          </body>
          </html>
          EOF

      - name: Commit documentation updates
        run: |
          cd gh-pages
          git config user.name "Documentation Bot"
          git config user.email "noreply@github.com"
          git add -A
          
          if git diff --cached --quiet; then
            echo "No changes to commit"
          else
            git commit -m "docs: auto-update from ${GITHUB_SHA:0:7}"
            git push origin gh-pages
          fi

      - name: Setup Pages
        uses: actions/configure-pages@v3

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: 'gh-pages'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v2
```

---

## Pull Request Workflow for Documentation

### Automated PR Script

Create `.github/scripts/create-docs-pr.sh`:

```bash
#!/bin/bash

# Pull latest develop
git fetch origin develop
git checkout develop

# Create branch
BRANCH="docs/update-$(date +%s)"
git checkout -b $BRANCH

# Ensure docs are current
cp -r docs/* gh-pages/ 2>/dev/null || true

# Commit if changed
if ! git diff --quiet; then
  git add .
  git commit -m "docs: update documentation site"
  git push origin $BRANCH
  
  # Create PR via GitHub CLI
  gh pr create \
    --base gh-pages \
    --title "Auto: Update Documentation Site" \
    --body "Automated documentation update
    
Triggered by: Documentation changes in develop branch
Date: $(date)

Please review and merge to deploy updated docs."
    
  echo "✅ PR created successfully"
else
  echo "ℹ️  No documentation changes to deploy"
fi
```

### Schedule PR Creation

In `.github/workflows/scheduled-docs-pr.yml`:

```yaml
name: Scheduled Documentation Update

on:
  schedule:
    - cron: '0 0 * * 0'  # Every Sunday at midnight UTC
  workflow_dispatch:     # Manual trigger

jobs:
  create-pr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Create documentation PR
        run: |
          git config user.name "Docs Bot"
          git config user.email "docs@example.com"
          
          BRANCH="docs/update-$(date +%s)"
          git checkout -b $BRANCH develop
          
          # Update docs from source
          cp -r docs/* ./
          
          git add -A
          git commit -m "docs: scheduled documentation update" || exit 0
          git push origin $BRANCH
          
          # Create PR
          gh pr create \
            --base gh-pages \
            --title "Scheduled: Documentation Update" \
            --body "Automated weekly documentation update"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Documentation Structure

Organize docs for optimal GitHub Pages display:

```
docs/
├── README.md                                # Home page
├── DEPLOYMENT_GUIDE.md                      # Getting started
├── DATA_FILE_DOCUMENTATION.md               # Data reference
├── GIT_BRANCH_STRATEGY.md                   # Development workflow
├── QUALITY_ASSURANCE_GUIDE.md               # Testing
├── MONTH_FILTER_COMPREHENSIVE_AUDIT.md      # Feature audit
├── DROPDOWN_AUDIT_COMPLIANCE_REPORT.md      # Data audit
├── FIELD_NOTICE_FILTERING_RCA_POA_RESOLVED.md  # Issue resolution
├── _config.yml                              # Jekyll config (optional)
└── assets/
    ├── images/
    ├── screenshots/
    └── diagrams/
```

### Jekyll Configuration (Optional)

Create `docs/_config.yml` for better formatting:

```yaml
theme: jekyll-theme-minimal
title: SRE AgenticOps Dashboard
description: Documentation and deployment guides
show_downloads: false
github:
  is_project_page: true
  repository_url: https://github.com/yourusername/sre-dashboard

nav:
  - title: Deployment
    url: DEPLOYMENT_GUIDE.md
  - title: Data Reference
    url: DATA_FILE_DOCUMENTATION.md
  - title: Git Workflow
    url: GIT_BRANCH_STRATEGY.md
  - title: QA & Testing
    url: QUALITY_ASSURANCE_GUIDE.md
```

---

## Custom Domain (Optional)

### Point Custom Domain to GitHub Pages

1. **DNS Configuration:**
   - Go to your domain registrar (GoDaddy, Namecheap, etc.)
   - Add DNS records:
   ```
   A record    185.199.108.153
   A record    185.199.109.153
   A record    185.199.110.153
   A record    185.199.111.153
   CNAME       <username>.github.io
   ```

2. **GitHub Configuration:**
   - Go to Settings → Pages → Custom domain
   - Enter: `docs.example.com`
   - Enforce HTTPS (auto-provisioned by GitHub)

3. **Verify:**
   ```bash
   nslookup docs.example.com
   # Should resolve to 185.199.108.153
   ```

---

## Rollback Capability

If documentation changes break something:

```bash
# View commit history
git log gh-pages --oneline -10

# Revert to previous version
git revert <commit-sha>
git push origin gh-pages

# Or reset to specific commit
git reset --hard <commit-sha>
git push origin gh-pages --force-with-lease
```

---

## Validation Checklist

- [ ] GitHub Pages enabled in Settings
- [ ] `gh-pages` branch created
- [ ] GitHub Pages workflow exists
- [ ] Site accessible at `https://<username>.github.io/<repo>/`
- [ ] Documentation displays correctly
- [ ] Links work (relative paths)
- [ ] Images load (if included)
- [ ] Auto-deployment working on commit

---

## Monitoring & Analytics

### GitHub Pages Analytics

GitHub automatically provides:
- Page views (check Settings → Pages → Analytics)
- Popular pages
- Referrers
- Traffic sources

### Custom Analytics (Optional)

Add Google Analytics to `docs/_includes/analytics.html`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

---

**Status:** ✅ GitHub Pages fully configured  
**Last Updated:** November 24, 2025  
**Auto-Deploy:** Enabled
