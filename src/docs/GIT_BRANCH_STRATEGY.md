# Git Branch Strategy & GitHub Pages Setup

---

## Branch Structure

### Core Production Branches

```
master (production)
  ├─ main deployment branch
  ├─ protected: require PR reviews
  ├─ protected: require tests pass
  └─ auto-deploy to production on merge

develop (development)
  ├─ integration branch
  ├─ merges from feature branches
  └─ staging environment deployed from this

gh-pages (static hosting)
  ├─ documentation site
  ├─ auto-generated from /docs
  └─ hosted at: https://username.github.io/project
```

### Feature Branches

```
feature/<feature-name>
  └─ branch from: develop
  └─ example: feature/field-notice-filter
  └─ example: feature/email-notifications

bugfix/<issue-name>
  └─ branch from: develop
  └─ example: bugfix/null-customer-handling

hotfix/<issue-name>
  └─ branch from: master
  └─ example: hotfix/database-connection
  └─ merge back to: master AND develop

release/v<version>
  └─ branch from: develop
  └─ example: release/v1.0.0
  └─ merge to: master with tag
```

---

## Workflow

### Creating a Feature Branch

```bash
# Update develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/field-notice-audit

# Make changes
git add .
git commit -m "feat: comprehensive field notice filtering audit"

# Push to remote
git push origin feature/field-notice-audit
```

### Creating Pull Request

```bash
# GitHub CLI
gh pr create --base develop --title "Field Notice Audit" --body "Comprehensive audit and fixes"

# Or via GitHub web interface
# 1. Go to Pull Requests tab
# 2. Click "New Pull Request"
# 3. Select: feature/field-notice-audit -> develop
# 4. Add description
# 5. Request reviewers
# 6. Submit
```

### Merging to Master

```bash
# Only merge develop to master for releases
git checkout master
git pull origin master

# Merge with commit (preserves history)
git merge --no-ff develop -m "Release v1.0.0"

# Create version tag
git tag -a v1.0.0 -m "Production release 1.0.0"

# Push all changes
git push origin master develop --tags
```

---

## Branch Protection Rules

### Master Branch

Enable in GitHub Settings → Branches → Branch protection rules:

- ✅ Require pull request reviews before merging (min 2 approvals)
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Restrict who can push to matching branches
- ✅ Include administrators in restrictions

### Develop Branch

- ✅ Require pull request reviews (min 1 approval)
- ✅ Require status checks to pass
- ✅ Dismiss stale PR approvals when new commits pushed

### Protected Status Checks

```yaml
# In .github/workflows/ci.yml
- TypeScript compilation (npm run check)
- Unit tests (if available)
- Linting (ESLint, Prettier)
- Database migrations compatible
```

---

## Release Process

### 1. Create Release Branch

```bash
git checkout -b release/v1.0.0 develop
```

### 2. Update Version

```bash
# Update package.json
{
  "version": "1.0.0"
}

git commit -am "chore: bump version to 1.0.0"
```

### 3. Create Release PR

```bash
gh pr create --base master --title "Release v1.0.0" \
  --body "Release Notes: Fixed field notice filtering, added email notifications"
```

### 4. Merge & Tag

```bash
# Merge to master (through approved PR)
# Then:
git checkout master
git pull origin master

# Create annotated tag
git tag -a v1.0.0 -m "Production Release v1.0.0"
git push origin master v1.0.0

# Merge back to develop
git checkout develop
git merge master
git push origin develop
```

### 5. GitHub Release

```bash
# Create release notes
gh release create v1.0.0 \
  --title "v1.0.0 - SRE Dashboard Release" \
  --notes "See CHANGELOG.md for details"
```

---

## Automated Workflows

### Suggested GitHub Actions

**.github/workflows/ci.yml** - Continuous Integration

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run check
      - run: npm run build
```

**.github/workflows/deploy.yml** - Automatic Deploy

```yaml
name: Deploy

on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install && npm run build
      - run: npm start
```

---

## GitHub Pages Configuration

### 1. Enable Pages

```bash
# In GitHub repository settings:
# Settings → Pages → Build and deployment
# Source: Deploy from a branch
# Branch: gh-pages
# Folder: / (root)
```

### 2. Configure Branch

```bash
# Create gh-pages branch
git checkout --orphan gh-pages

# Add documentation
git add docs/
git commit -m "Initial documentation site"

# Push to GitHub
git push origin gh-pages
```

### 3. Automated Documentation Deployment

**.github/workflows/docs.yml**

```yaml
name: Deploy Documentation

on:
  push:
    branches: [master, develop]
    paths:
      - 'docs/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Checkout gh-pages
        uses: actions/checkout@v3
        with:
          ref: gh-pages
          path: gh-pages
      
      - name: Copy docs
        run: |
          cp -r docs/* gh-pages/
          
      - name: Commit changes
        run: |
          cd gh-pages
          git config user.name "Documentation Bot"
          git config user.email "bot@example.com"
          git add -A
          git commit -m "Auto-update docs from ${GITHUB_SHA:0:7}"
          git push
```

---

## Commit Message Standards

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style (no logic change)
- `refactor:` Code refactoring
- `perf:` Performance improvement
- `test:` Test additions
- `ci:` CI/CD configuration

### Examples

```
feat(filters): comprehensive month filter audit

Add month filter validation, performance testing, and documentation.
Fixes field notice filtering for historical data (2007-2025).

Fixes #123, Closes #124

feat(email): add simple email notification setup
fix(storage): handle NULL customer names correctly
docs(deployment): complete deployment guide
```

---

## Version Tagging

### Semantic Versioning

```
v<MAJOR>.<MINOR>.<PATCH>

v1.0.0          # Initial release
v1.1.0          # New feature
v1.1.1          # Bug fix
v2.0.0          # Breaking changes
```

### Creating Tags

```bash
# Lightweight tag
git tag v1.0.0

# Annotated tag (recommended)
git tag -a v1.0.0 -m "Version 1.0.0 Release"

# Tag with signature
git tag -s v1.0.0 -m "Signed release"

# Push tags
git push origin --tags
```

---

## Rollback Procedure

### If Merge Breaks Production

```bash
# Revert last commit
git revert HEAD
git push origin master

# Or revert specific merge commit
git revert -m 1 <merge-commit-sha>
git push origin master
```

### Restore Previous Version

```bash
# Checkout previous version
git checkout v0.9.0

# Build and test
npm install && npm run build

# If good, reset master to that tag
git checkout master
git reset --hard v0.9.0
git push origin master --force-with-lease
```

---

## Team Collaboration

### Code Review Checklist

- [ ] Follows commit message standards
- [ ] No console.logs or debug code
- [ ] TypeScript compiles without errors
- [ ] Database changes use ORM (no raw SQL)
- [ ] Tests pass (if applicable)
- [ ] Documentation updated
- [ ] No secrets or API keys committed

### Preventing Secrets

```bash
# Install git-secrets
brew install git-secrets

# Configure
git secrets --install
git secrets --register-aws

# Pre-commit hooks will prevent accidental commits
```

---

**Reference:** GitHub Flow documentation  
**Last Updated:** November 24, 2025
