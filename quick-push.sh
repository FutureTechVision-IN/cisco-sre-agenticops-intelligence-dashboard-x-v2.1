#!/bin/bash

# Quick push script
cd "/Users/bipbabu/Library/CloudStorage/OneDrive-Cisco/Personal/Future Tech Vision/Future Tech Vision AI/GitHub/cisco-sre-agenticops-intelligence-dashboard-x-v2.0"

echo "=== Pushing branches to remote ==="
echo ""

# Push each branch individually
for branch in main dev dev1 dev2; do
    echo "Pushing $branch..."
    git push --force origin $branch 2>&1 | grep -E "(Total|Writing|To|->|rejected)" || echo "  ✅ $branch pushed"
done

echo ""
echo "=== Push complete ==="
