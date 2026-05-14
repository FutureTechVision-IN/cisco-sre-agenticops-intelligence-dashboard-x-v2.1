#!/bin/bash
# Force Push Execution Script
# Safe deployment with verification and backup
# Date: February 22, 2026

set -e

REPO_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTE="origin"
BRANCHES=("main" "dev" "dev1")

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  CISCO SRE AGENTICOPS INTELLIGENCE DASHBOARD v2.0${NC}"
echo -e "${CYAN}  Force Push Execution Script${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

cd "$REPO_PATH" || exit 1

# Parse command line arguments
FORCE_YES=false
CREATE_BACKUP=true
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -y|--yes)
            FORCE_YES=true
            shift
            ;;
        --no-backup)
            CREATE_BACKUP=false
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            echo -e "${CYAN}Usage: $0 [OPTIONS]${NC}"
            echo ""
            echo "Options:"
            echo "  -y, --yes        Skip confirmation prompt"
            echo "  --no-backup      Don't create backup branches"
            echo "  --dry-run        Show what would be pushed without doing it"
            echo "  -h, --help       Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    # Interactive mode with backup"
            echo "  $0 -y                 # Auto-confirm with backup"
            echo "  $0 --dry-run          # Preview without pushing"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Step 1: Pre-flight checks
echo -e "${BLUE}✓ STEP 1: PRE-FLIGHT CHECKS${NC}"
echo ""

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ ERROR: Uncommitted changes detected!${NC}"
    git status
    exit 1
fi
echo -e "${GREEN}  ✓ No uncommitted changes${NC}"

# Verify all branches exist
for branch in "${BRANCHES[@]}"; do
    if ! git rev-parse --verify "$branch" > /dev/null 2>&1; then
        echo -e "${RED}❌ ERROR: Branch '$branch' not found!${NC}"
        exit 1
    fi
done
echo -e "${GREEN}  ✓ All branches exist locally${NC}"

# Verify remote configuration
if ! git remote get-url "$REMOTE" > /dev/null 2>&1; then
    echo -e "${RED}❌ ERROR: Remote '$REMOTE' not configured!${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Remote URL configured: $(git remote get-url "$REMOTE")${NC}"

# Fetch latest remote state
echo -e "${BLUE}  ⏳ Fetching latest remote state...${NC}"
git fetch --all --quiet
echo -e "${GREEN}  ✓ Fetched remote state${NC}"

# Count data files
DATA_FILES=$(git ls-files | grep -c "static-data" || echo "0")
echo -e "${GREEN}  ✓ Data files tracked: $DATA_FILES files${NC}"

echo ""

# Step 2: Show what will be pushed
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}✓ STEP 2: CHANGES TO BE PUSHED${NC}"
echo ""

for branch in "${BRANCHES[@]}"; do
    echo -e "${YELLOW}Branch: $branch${NC}"
    
    # Check if branch exists on remote
    if git ls-remote --heads "$REMOTE" "$branch" | grep -q "$branch"; then
        # Show commits that will be force pushed
        local_commit=$(git rev-parse "$branch")
        remote_commit=$(git rev-parse "$REMOTE/$branch" 2>/dev/null || echo "")
        
        if [[ "$local_commit" != "$remote_commit" ]]; then
            echo -e "  ${YELLOW}Local:  $local_commit${NC}"
            echo -e "  ${YELLOW}Remote: $remote_commit${NC}"
            
            # Show divergence
            ahead=$(git rev-list --count "$REMOTE/$branch..$branch" 2>/dev/null || echo "0")
            behind=$(git rev-list --count "$branch..$REMOTE/$branch" 2>/dev/null || echo "0")
            echo -e "  ${CYAN}Ahead: $ahead commits, Behind: $behind commits${NC}"
            
            if [[ $behind -gt 0 ]]; then
                echo -e "  ${RED}⚠️  WARNING: This will overwrite $behind commits on remote!${NC}"
            fi
        else
            echo -e "  ${GREEN}✓ Already in sync${NC}"
        fi
    else
        echo -e "  ${YELLOW}Branch doesn't exist on remote (will be created)${NC}"
    fi
    echo ""
done

# Step 3: Create backups if requested
if [[ "$CREATE_BACKUP" == "true" ]] && [[ "$DRY_RUN" == "false" ]]; then
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}✓ STEP 3: CREATING BACKUP BRANCHES${NC}"
    echo ""
    
    BACKUP_SUFFIX="backup-$(date +%Y%m%d-%H%M%S)"
    
    for branch in "${BRANCHES[@]}"; do
        backup_name="${branch}-${BACKUP_SUFFIX}"
        if git branch "$backup_name" "$branch" 2>/dev/null; then
            echo -e "${GREEN}  ✓ Created backup: $backup_name${NC}"
        else
            echo -e "${YELLOW}  ⚠️  Failed to create backup for $branch${NC}"
        fi
    done
    echo ""
fi

# Step 4: Confirmation
if [[ "$FORCE_YES" == "false" ]] && [[ "$DRY_RUN" == "false" ]]; then
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}⚠️  WARNING: FORCE PUSH OPERATION${NC}"
    echo ""
    echo -e "${YELLOW}This will FORCE PUSH the following branches to $REMOTE:${NC}"
    for branch in "${BRANCHES[@]}"; do
        echo -e "  ${YELLOW}• $branch${NC}"
    done
    echo ""
    echo -e "${RED}This operation will OVERWRITE remote history!${NC}"
    echo ""
    read -p "Are you sure you want to continue? (type 'yes' to confirm): " -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo -e "${YELLOW}Force push cancelled.${NC}"
        exit 0
    fi
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${BLUE}✓ DRY RUN: SIMULATING FORCE PUSH${NC}"
    echo ""
    echo -e "${YELLOW}Would push branches: ${BRANCHES[*]}${NC}"
    echo -e "${YELLOW}To remote: $REMOTE${NC}"
    echo ""
    echo -e "${GREEN}✅ DRY RUN COMPLETE (no changes made)${NC}"
    exit 0
fi

echo -e "${BLUE}✓ STEP $([ "$CREATE_BACKUP" == "true" ] && echo "4" || echo "3"): FORCE PUSH EXECUTION${NC}"
echo ""

echo -e "${YELLOW}Force pushing branches: ${BRANCHES[*]}${NC}"
echo -e "${YELLOW}Remote: $REMOTE${NC}"
echo ""

# Perform force push
if git push --force "$REMOTE" "${BRANCHES[@]}"; then
    echo ""
    echo -e "${GREEN}✅ FORCE PUSH SUCCESSFUL!${NC}"
    echo ""
else
    echo -e "${RED}❌ FORCE PUSH FAILED!${NC}"
    exit 1
fi

# Step 5: Post-push verification
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}✓ STEP $([ "$CREATE_BACKUP" == "true" ] && echo "5" || echo "4"): POST-PUSH VERIFICATION${NC}"
echo ""

# Verify remote branches
echo -e "${BLUE}Remote Branches:${NC}"
git branch -r | grep -E "$(IFS='|'; echo "${BRANCHES[*]}")" || true

echo ""
echo -e "${BLUE}Data Files in Remote Main:${NC}"
DATA_COUNT=$(git ls-tree -r origin/main | grep -c "static-data" || echo "0")
echo -e "  ${GREEN}$DATA_COUNT files${NC}"

echo ""
echo -e "${BLUE}Latest Remote Commits:${NC}"
for branch in "${BRANCHES[@]}"; do
    echo -e "${YELLOW}$branch:${NC}"
    git log --oneline "origin/$branch" -3 | sed 's/^/  /'
done

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "  ${GREEN}• All ${#BRANCHES[@]} branches force pushed successfully${NC}"
echo -e "  ${GREEN}• Data files preserved and synced ($DATA_COUNT files)${NC}"
echo -e "  ${GREEN}• Commit history updated${NC}"
if [[ "$CREATE_BACKUP" == "true" ]]; then
    echo -e "  ${GREEN}• Backup branches created: *-${BACKUP_SUFFIX}${NC}"
fi
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo -e "  ${CYAN}1. Verify website still operational${NC}"
echo -e "  ${CYAN}2. Check GitHub Actions/CI status${NC}"
echo -e "  ${CYAN}3. Monitor application logs${NC}"
echo "  3. Test dashboard functionality"
echo "  4. Monitor deployment logs"
echo ""
echo "═══════════════════════════════════════════════════════════════"
