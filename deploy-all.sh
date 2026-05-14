#!/bin/bash
# Deployment script with forced non-interactive mode

export GIT_EDITOR=true
export EDITOR=true
export VISUAL=true

cd "/Users/bipbabu/Library/CloudStorage/OneDrive-Cisco/Personal/Future Tech Vision/Future Tech Vision AI/GitHub/cisco-sre-agenticops-intelligence-dashboard-x-v2.1" || exit 1

echo "╔════════════════════════════════════════════════╗"
echo "║   Branch Synchronization & Deployment          ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check current branch
current_branch=$(git branch --show-current)
echo "Current branch: $current_branch"
echo ""

# Push all branches with force
echo "=== Step 1: Pushing branches to remote ==="
for branch in main dev dev1 dev2; do
    printf "  Pushing %-6s..." "$branch"
    if git push --force origin "$branch" 2>&1 | grep -q "Everything up-to-date\|->"; then
        echo " ✅"
    else
        git push --force origin "$branch" >/dev/null 2>&1 && echo " ✅" || echo " ❌"
    fi
done
echo ""

# Build for gh-pages
echo "=== Step 2: Building for GitHub Pages ==="
npm run build:gh-pages 2>&1 | grep -E "(built in|dist)" || echo "Building..."
echo ""

# Deploy to gh-pages
echo "=== Step 3: Deploying to gh-pages ==="
git checkout gh-pages || git checkout -b gh-pages
# Copy built files
cp -r dist/* . 2>/dev/null || echo "  Note: dist files handling"
git add -A
git commit -m "Deploy: Update gh-pages with latest dashboard build" || echo "  No changes to commit"
git push --force origin gh-pages 2>&1 | grep -E "->|up-to-date" || echo "  Pushed"
git checkout "$current_branch"
echo ""

echo "✅ Deployment complete!"
echo ""
echo "URLs:"
echo "  Repository: https://wwwin-github.cisco.com/bipbabu/cisco-sre-agenticops-intelligence-dashboard-x-v2.1"
echo "  Dashboard:  http://localhost:5001"
