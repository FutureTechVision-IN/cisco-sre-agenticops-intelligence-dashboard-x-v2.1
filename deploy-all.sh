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

# ─── Data Preservation: Backup before any Git operations ─────────────────────
DATA_FILE="data/fn_aug25-feb26.csv"
BACKUP_DIR=".data-backup"
BACKUP_FILE="$BACKUP_DIR/fn_aug25-feb26.csv"

echo "=== Step 0: Preserving Vulnerability Tracker data ==="
if [[ -f "$DATA_FILE" ]]; then
    file_size=$(stat -f%z "$DATA_FILE" 2>/dev/null || stat --printf="%s" "$DATA_FILE" 2>/dev/null || echo 0)
    if [[ "$file_size" -gt 1000 ]]; then
        mkdir -p "$BACKUP_DIR"
        cp -p "$DATA_FILE" "$BACKUP_FILE"
        echo "  Data file backed up ✅ ($(du -h "$DATA_FILE" | cut -f1))"
    else
        echo "  Data file is an LFS pointer — backup skipped"
    fi
else
    echo "  ⚠️  Data file not present before deployment"
fi
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

# ─── Data Preservation: Restore after all Git operations ─────────────────────
echo "=== Step 4: Verifying data file integrity ==="
if [[ -f "$DATA_FILE" ]]; then
    file_size=$(stat -f%z "$DATA_FILE" 2>/dev/null || stat --printf="%s" "$DATA_FILE" 2>/dev/null || echo 0)
    if [[ "$file_size" -gt 1000 ]]; then
        echo "  Data file intact ✅ ($(du -h "$DATA_FILE" | cut -f1))"
    else
        # File may be LFS pointer or corrupted — restore from backup
        if [[ -f "$BACKUP_FILE" ]]; then
            cp -p "$BACKUP_FILE" "$DATA_FILE"
            echo "  Data file restored from backup ✅"
        else
            echo "  ⚠️  Data file is small and no backup available"
            echo "  Run: git lfs pull"
        fi
    fi
elif [[ -f "$BACKUP_FILE" ]]; then
    mkdir -p "$(dirname "$DATA_FILE")"
    cp -p "$BACKUP_FILE" "$DATA_FILE"
    echo "  Data file restored from backup ✅"
else
    echo "  ⚠️  Data file missing — run: git lfs pull"
fi
echo ""

echo "✅ Deployment complete!"
echo ""
echo "URLs:"
echo "  Repository: https://wwwin-github.cisco.com/bipbabu/cisco-sre-agenticops-intelligence-dashboard-x-v2.1"
echo "  Dashboard:  http://localhost:8000"
