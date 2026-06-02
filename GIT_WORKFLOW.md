# Git Workflow & Version Control Guide

## 📋 Overview

This document describes the version control strategy for the DrillBit Digital Twin project.

---

## 🌿 Branch Strategy

### Main Branches

#### `main`
- **Purpose**: Stable production releases
- **Protection**: Protected, requires PR approval
- **Deployment**: Production environment
- **Current Version**: v1.0.0

#### `latency-optimization` 
- **Purpose**: Performance optimized version (v2.0.0)
- **Status**: ✅ **Recommended for deployment**
- **Features**: WebSocket, sub-100ms latency
- **Deployment**: Production ready

### Supporting Branches

#### Feature Branches
- **Naming**: `feature/feature-name`
- **Base**: Create from `latency-optimization` or `main`
- **Merge**: Into base branch via PR
- **Lifetime**: Delete after merge

**Example**:
```bash
git checkout latency-optimization
git checkout -b feature/modbus-tcp-integration
# ... make changes ...
git add .
git commit -m "Add Modbus TCP client implementation"
git push origin feature/modbus-tcp-integration
# Create PR on GitHub
```

#### Bugfix Branches
- **Naming**: `bugfix/issue-description`
- **Base**: Create from affected branch
- **Merge**: Into affected branch via PR
- **Lifetime**: Delete after merge

**Example**:
```bash
git checkout latency-optimization
git checkout -b bugfix/websocket-reconnection-issue
# ... fix bug ...
git commit -m "Fix WebSocket reconnection timeout"
git push origin bugfix/websocket-reconnection-issue
```

#### Hotfix Branches
- **Naming**: `hotfix/critical-issue`
- **Base**: Create from `main` or `latency-optimization`
- **Merge**: Into both `main` and `latency-optimization`
- **Priority**: Immediate deployment

---

## 📦 Versioning Strategy

### Semantic Versioning (SemVer)

Format: `MAJOR.MINOR.PATCH`

- **MAJOR** (X.0.0): Breaking changes, incompatible API
- **MINOR** (0.X.0): New features, backward compatible
- **PATCH** (0.0.X): Bug fixes, backward compatible

### Version File

Current version stored in `VERSION` file:
```bash
cat VERSION
# Output: 2.0.0
```

### Version History

| Version | Date | Branch | Description |
|---------|------|--------|-------------|
| 2.0.0 | 2026-03-04 | latency-optimization | WebSocket optimization |
| 1.0.0 | 2026-03-01 | main | Initial release |

---

## 🔄 Git Workflow

### 1. Setting Up Local Repository

```bash
# Clone repository
git clone https://github.com/nayanpatel1986/DRIILBIT_TWIN.git
cd DRIILBIT_TWIN

# Configure Git user
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Check current branch
git branch
# * main

# Switch to optimized version
git checkout latency-optimization
```

### 2. Creating a Feature

```bash
# Start from latest latency-optimization
git checkout latency-optimization
git pull origin latency-optimization

# Create feature branch
git checkout -b feature/safety-analytics

# Make changes...
# (Edit files)

# Stage changes
git add backend/services/safety.py
git add backend/tests/test_safety.py

# Commit with descriptive message
git commit -m "Add kick detection algorithm

- Implement multi-parameter kick detection
- Add unit tests for kick scenarios
- Update analytics engine integration"

# Push to GitHub
git push origin feature/safety-analytics
```

### 3. Creating Pull Request

1. Go to GitHub repository
2. Click "Compare & pull request"
3. Select base branch: `latency-optimization`
4. Fill in PR template:
   - **Title**: Brief description
   - **Description**: Detailed changes, testing done
   - **Related Issues**: Link to issues if applicable
5. Request reviewers
6. Address review comments
7. Merge when approved

### 4. Updating Your Branch

```bash
# Fetch latest changes
git fetch origin

# Rebase on latest latency-optimization
git checkout feature/safety-analytics
git rebase origin/latency-optimization

# Resolve conflicts if any
# (Edit conflicted files)
git add .
git rebase --continue

# Force push (rebase rewrites history)
git push origin feature/safety-analytics --force
```

### 5. Release Process

```bash
# Update VERSION file
echo "2.1.0" > VERSION

# Update CHANGELOG.md
# (Add new version section)

# Commit version bump
git add VERSION CHANGELOG.md
git commit -m "Bump version to 2.1.0"

# Create Git tag
git tag -a v2.1.0 -m "Release v2.1.0: Safety Analytics

- Kick detection algorithm
- Stuck pipe risk assessment
- Real-time alerting system"

# Push tag to GitHub
git push origin v2.1.0

# Create GitHub Release
# Go to GitHub → Releases → Create new release
# Select tag v2.1.0
# Add release notes from RELEASE_NOTES.md
```

---

## 📝 Commit Message Guidelines

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **perf**: Performance improvement
- **refactor**: Code refactoring
- **docs**: Documentation changes
- **test**: Adding/updating tests
- **chore**: Maintenance tasks

### Examples

**Feature**:
```
feat(websocket): Add real-time data broadcasting

- Implement WebSocket server with connection management
- Add automatic reconnection with exponential backoff
- Integrate with analytics engine for data push

Closes #123
```

**Bug Fix**:
```
fix(influx): Reduce query range to improve performance

Changed query range from -24h to -5m to reduce
query time from 200ms to 30ms.

Fixes #456
```

**Performance**:
```
perf(analytics): Optimize polling interval

- Reduce sleep from 1000ms to 50ms
- Add cached timezone offset
- Improve data processing pipeline

Results in 20x faster update rate
```

---

## 🔍 Code Review Checklist

### Before Creating PR

- [ ] Code compiles/runs without errors
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] No sensitive data (passwords, keys) committed
- [ ] Code follows project style guidelines

### Reviewers Check

- [ ] Code is clear and maintainable
- [ ] No obvious bugs or security issues
- [ ] Performance considerations addressed
- [ ] Error handling is appropriate
- [ ] Tests are comprehensive
- [ ] Documentation is accurate

---

## 🚀 Deployment Workflow

### Staging Deployment

```bash
# Deploy feature branch to staging
git checkout feature/safety-analytics
docker-compose -f docker-compose.staging.yml up -d

# Run smoke tests
./scripts/smoke-test.sh

# Monitor logs
docker-compose -f docker-compose.staging.yml logs -f
```

### Production Deployment

```bash
# Merge to latency-optimization via PR
# After PR approval and merge:

git checkout latency-optimization
git pull origin latency-optimization

# Tag release
git tag -a v2.1.0 -m "Release v2.1.0"
git push origin v2.1.0

# Deploy to production
ssh production-server
cd /opt/DRIILBIT_TWIN
git pull origin latency-optimization
docker-compose down
docker-compose build
docker-compose up -d

# Verify deployment
curl http://localhost:8000/health
curl http://localhost:8000/ws/stats
```

---

## 📊 GitHub Repository Management

### Protected Branches

Configure on GitHub Settings → Branches:

**`main` protection rules:**
- ✅ Require pull request reviews (1 reviewer)
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ Include administrators
- ❌ Allow force pushes

**`latency-optimization` protection rules:**
- ✅ Require pull request reviews (1 reviewer)
- ✅ Require status checks to pass
- ✅ Require branches to be up to date

### Labels

Create these labels for issues and PRs:

- `bug` - Bug fixes
- `feature` - New features
- `enhancement` - Improvements
- `documentation` - Documentation updates
- `performance` - Performance optimizations
- `priority:high` - High priority
- `priority:low` - Low priority
- `wip` - Work in progress

### Milestones

Create milestones for releases:

- `v2.1.0` - Safety Analytics (2 weeks)
- `v2.2.0` - ML Integration (1 month)
- `v3.0.0` - Kafka Streaming (3 months)

---

## 🔐 Security Best Practices

### Never Commit

- ❌ Passwords or API keys
- ❌ Database credentials
- ❌ Private SSH keys
- ❌ Environment-specific configs
- ❌ Large binary files

### Use `.gitignore`

```gitignore
# Environment variables
.env
.env.local
.env.production

# Secrets
secrets/
*.key
*.pem

# Database
*.db
*.sqlite

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Build artifacts
dist/
build/
*.pyc
__pycache__/
node_modules/
```

### Secrets Management

Use environment variables:

```bash
# .env.example (commit this)
INFLUX_TOKEN=your-token-here
WITSML_PASSWORD=your-password-here

# .env (DO NOT commit)
INFLUX_TOKEN=actual-secret-token
WITSML_PASSWORD=actual-password
```

---

## 📈 Metrics & Monitoring

### Track These Metrics

```bash
# Commit activity
git log --oneline --since="1 month ago" | wc -l

# Contributors
git shortlog -sn

# Code churn (lines changed)
git log --stat --since="1 month ago"

# Branch age
git for-each-ref --sort=-committerdate refs/heads/ \
  --format='%(committerdate:short) %(refname:short)'
```

---

## 🛠️ Useful Git Commands

### Quick Reference

```bash
# See commit history
git log --oneline --graph --all

# See what changed
git diff

# Undo last commit (keep changes)
git reset --soft HEAD^

# Undo changes to file
git checkout -- filename

# See file at specific commit
git show commit-hash:path/to/file

# Find when bug was introduced
git bisect start
git bisect bad  # Current version has bug
git bisect good v1.0.0  # This version was good

# Stash changes temporarily
git stash
git stash pop

# Clean untracked files
git clean -fd

# See branch differences
git diff main..latency-optimization
```

---

## 📞 Getting Help

### Git Issues

```bash
# Check Git status
git status

# See commit history
git log

# See what you're about to push
git diff origin/branch-name..HEAD
```

### Undo Mistakes

```bash
# Undo last commit, keep changes
git reset --soft HEAD~1

# Undo last commit, discard changes
git reset --hard HEAD~1

# Undo pushed commit
git revert commit-hash
git push origin branch-name
```

### Resources

- [Pro Git Book](https://git-scm.com/book/en/v2)
- [GitHub Docs](https://docs.github.com)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## 📝 Templates

### Pull Request Template

Create `.github/pull_request_template.md`:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Performance improvement
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] CHANGELOG updated
```

### Issue Template

Create `.github/ISSUE_TEMPLATE/bug_report.md`:

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Step 1
2. Step 2
3. ...

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Version: 
- OS: 
- Browser: 
```

---

**Last Updated**: March 2026
**Maintained By**: DrillBit Development Team
