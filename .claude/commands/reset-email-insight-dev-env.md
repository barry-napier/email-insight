# Reset Email Insight Development Environment

## Introduction
Reset and prepare the Email Insight development environment for the next development cycle. This command performs comprehensive cleanup, updates dependencies, resets databases, validates environment health, and prepares the workspace for implementing the next phase or issue in the roadmap.

## Prerequisites
- Previous development cycle completed (PR merged to main)
- Access to all Email Insight services and databases
- Development environment properly configured
- Backup of critical data if needed

## Reset Scope
<reset_scope> $ARGUMENTS </reset_scope>
*Arguments: `full` (complete reset), `partial` (preserve data), `phase-transition` (prepare for next phase)*

## Main Tasks

### 1. Pre-Reset Validation & Backup

**Current State Assessment:**
- [ ] Check current branch status: `git status && git branch -a`
- [ ] Identify any uncommitted changes that need preservation
- [ ] Document current development environment state
- [ ] List running services and their status
- [ ] Check database content that might need backup

**Critical Data Backup:**
```bash
echo "💾 Creating development environment backup..."

# Create backup directory with timestamp
BACKUP_DIR="backups/dev-env-$(date +%Y%m%d-%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup database
echo "Backing up SQLite database..."
if [ -f "database/email-insight.db" ]; then
    cp database/email-insight.db $BACKUP_DIR/
    echo "✅ Database backed up"
fi

# Backup environment configuration
echo "Backing up environment configuration..."
cp .env.local $BACKUP_DIR/ 2>/dev/null || echo "No .env.local found"
cp .env.development $BACKUP_DIR/ 2>/dev/null || echo "No .env.development found"

# Backup logs if they contain important information
echo "Backing up recent logs..."
mkdir -p $BACKUP_DIR/logs
cp -r logs/* $BACKUP_DIR/logs/ 2>/dev/null || echo "No logs directory found"

echo "✅ Backup completed in $BACKUP_DIR"
```

**Service Status Documentation:**
- [ ] Document currently running Docker containers
- [ ] List active Node.js processes and ports
- [ ] Record database connection status
- [ ] Note any custom configuration or modifications
- [ ] Save current dependency versions for reference

### 2. Service Shutdown & Cleanup

**Graceful Service Shutdown:**
```bash
echo "⏹️  Shutting down all Email Insight services..."

# Stop development servers
echo "Stopping development servers..."
pkill -f "npm run dev" 2>/dev/null || echo "No npm dev servers running"
pkill -f "next dev" 2>/dev/null || echo "No Next.js dev servers running"
pkill -f "hono serve" 2>/dev/null || echo "No Hono servers running"

# Stop Docker services if using Docker
echo "Stopping Docker services..."
if [ -f "docker-compose.dev.yml" ]; then
    docker-compose -f docker-compose.dev.yml down
    echo "✅ Docker services stopped"
fi

# Stop database services
echo "Stopping database services..."
pkill -f "sqlite" 2>/dev/null || echo "No SQLite processes running"

# Clear any background jobs or processes
echo "Clearing background processes..."
jobs -p | xargs -r kill 2>/dev/null || echo "No background jobs to kill"

echo "✅ All services shut down gracefully"
```

**Process and Port Cleanup:**
- [ ] Kill any orphaned Node.js processes
- [ ] Free up development ports (3000, 3001, 5432, etc.)
- [ ] Clear any stuck background jobs or cron tasks
- [ ] Remove temporary files and lock files
- [ ] Clean up any Docker volumes or networks if applicable

### 3. Git Repository Reset & Cleanup

**Git Repository Cleanup:**
```bash
echo "🧹 Cleaning up Git repository..."

# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Delete merged feature branches
echo "Removing merged feature branches..."
git branch --merged main | grep -v "main\|master" | xargs -n 1 git branch -d 2>/dev/null || echo "No merged branches to delete"

# Clean up remote tracking branches
git remote prune origin

# Remove untracked files and directories
echo "Cleaning untracked files..."
git clean -fd

# Reset any uncommitted changes (with confirmation)
if [ "$(git status --porcelain)" ]; then
    echo "⚠️  Uncommitted changes detected. Resetting to clean state..."
    git reset --hard HEAD
    echo "✅ Repository reset to clean state"
fi

# Update Git hooks if they exist
if [ -d ".git/hooks" ]; then
    echo "Updating Git hooks..."
    cp .githooks/* .git/hooks/ 2>/dev/null || echo "No custom Git hooks found"
fi

echo "✅ Git repository cleaned and updated"
```

**Branch and Remote Validation:**
- [ ] Verify main branch is up to date with origin
- [ ] Confirm no stale feature branches remain
- [ ] Validate Git repository is in clean state
- [ ] Check that .gitignore is properly configured
- [ ] Ensure Git hooks are properly installed

### 4. Dependency Management & Updates

**Node.js Dependency Reset:**
```bash
echo "📦 Resetting and updating dependencies..."

# Clear npm cache
echo "Clearing npm cache..."
npm cache clean --force

# Remove node_modules and package-lock.json
echo "Removing existing node_modules..."
rm -rf node_modules package-lock.json

# For frontend directory if separate
if [ -d "frontend" ]; then
    cd frontend
    rm -rf node_modules package-lock.json
    cd ..
fi

# Fresh install of dependencies
echo "Installing fresh dependencies..."
npm install

# Install frontend dependencies if separate
if [ -d "frontend" ]; then
    cd frontend
    npm install
    cd ..
fi

# Update dependencies to latest compatible versions
echo "Checking for dependency updates..."
npm outdated || echo "Dependencies check completed"

# Run security audit
echo "Running security audit..."
npm audit --audit-level high

echo "✅ Dependencies reset and updated"
```

**Development Tools Update:**
- [ ] Update TypeScript to latest compatible version
- [ ] Update ESLint and Prettier configurations
- [ ] Update testing frameworks (Jest, Playwright)
- [ ] Update build tools and bundlers
- [ ] Verify all development scripts still work

### 5. Database Reset & Migration

**Database Environment Reset:**
```bash
echo "🗄️  Resetting database environment..."

# Determine reset scope
case "$1" in
    "full")
        echo "Performing FULL database reset - all data will be lost"
        # Remove existing database
        rm -f database/email-insight.db
        rm -f database/email-insight.db-wal
        rm -f database/email-insight.db-shm
        echo "✅ Database files removed"
        ;;
    "partial")
        echo "Performing PARTIAL database reset - preserving user data"
        # Reset only specific tables while preserving core data
        sqlite3 database/email-insight.db "DELETE FROM emails WHERE created_at < datetime('now', '-30 days');"
        sqlite3 database/email-insight.db "DELETE FROM analytics_cache;"
        sqlite3 database/email-insight.db "DELETE FROM temp_sync_data;"
        echo "✅ Database partially cleaned"
        ;;
    "phase-transition")
        echo "Preparing database for phase transition"
        # Keep all data but reset temporary/cache tables
        sqlite3 database/email-insight.db "DELETE FROM analytics_cache;"
        sqlite3 database/email-insight.db "DELETE FROM background_jobs WHERE status = 'completed';"
        echo "✅ Database prepared for next phase"
        ;;
    *)
        echo "Using default partial reset"
        sqlite3 database/email-insight.db "DELETE FROM analytics_cache;"
        echo "✅ Database caches cleared"
        ;;
esac
```

**Database Migration and Setup:**
```bash
# Run database migrations to ensure schema is current
echo "Running database migrations..."
npm run db:migrate

# Seed database with fresh development data
echo "Seeding database with development data..."
npm run db:seed:dev

# Run database optimization
echo "Optimizing database..."
sqlite3 database/email-insight.db "VACUUM; ANALYZE;"

# Verify database health
echo "Verifying database health..."
npm run db:health-check

echo "✅ Database reset and optimized"
```

**FTS5 Search Index Reset:**
- [ ] Rebuild FTS5 search indexes for optimal performance
- [ ] Verify search functionality works correctly
- [ ] Clear any cached search results
- [ ] Optimize search index for current data volume

### 6. Configuration & Environment Reset

**Environment Configuration Reset:**
```bash
echo "⚙️  Resetting environment configuration..."

# Copy template environment files
echo "Setting up environment files..."
if [ -f ".env.template" ]; then
    cp .env.template .env.local
    echo "✅ .env.local created from template"
fi

if [ -f ".env.development.template" ]; then
    cp .env.development.template .env.development
    echo "✅ .env.development created from template"
fi

# Validate environment variables
echo "Validating environment configuration..."
npm run env:validate || echo "⚠️  Environment validation issues detected"

# Reset API keys and tokens (prompt for new values if needed)
echo "🔐 Resetting API credentials..."
echo "Please update the following in .env.local:"
echo "  - GOOGLE_CLIENT_ID"
echo "  - GOOGLE_CLIENT_SECRET" 
echo "  - JWT_SECRET (generate new)"
echo "  - DATABASE_URL"
```

**Configuration File Reset:**
- [ ] Reset TypeScript configuration to project defaults
- [ ] Update ESLint and Prettier configurations
- [ ] Reset Jest and Playwright test configurations
- [ ] Update Docker configurations if applicable
- [ ] Verify all configuration files are properly formatted

### 7. Development Server Validation

**Service Health Checks:**
```bash
echo "🔍 Validating development environment health..."

# Start backend development server
echo "Starting backend server..."
npm run dev:backend &
BACKEND_PID=$!
sleep 5

# Check backend health
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend server healthy"
else
    echo "❌ Backend server not responding"
fi

# Start frontend development server
echo "Starting frontend server..."
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..
sleep 5

# Check frontend health
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend server healthy"
else
    echo "❌ Frontend server not responding"
fi

# Stop test servers
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || echo "Servers stopped"

echo "✅ Development servers validated"
```

**Quality Gates Validation:**
```bash
echo "Running quality gates validation..."

# Lint check
npm run lint
if [ $? -eq 0 ]; then
    echo "✅ Linting passed"
else
    echo "❌ Linting issues detected"
fi

# Type checking
npm run type-check
if [ $? -eq 0 ]; then
    echo "✅ Type checking passed"
else
    echo "❌ Type checking issues detected"
fi

# Test suite
npm test
if [ $? -eq 0 ]; then
    echo "✅ Test suite passed"
else
    echo "❌ Test failures detected"
fi

# Build check
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
fi
```

### 8. Next Phase Preparation

**Roadmap Analysis & Phase Preparation:**
- [ ] Review current phase completion status in `/docs/roadmap.md`
- [ ] Identify next priority issues from roadmap
- [ ] Prepare development environment for next phase requirements
- [ ] Update documentation to reflect current project state
- [ ] Set up monitoring and logging for new phase

**Agent Coordination Setup:**
```markdown
# Development Environment Ready for Next Phase

## Environment Status
**Reset Completed**: $(date)
**Reset Scope**: [full/partial/phase-transition]
**Git Branch**: main (latest)
**Dependencies**: Updated and secure
**Database**: [Reset/Preserved] and optimized
**Services**: All healthy and responsive

## Current Phase Status
**Phase [X]**: ✅ Completed and merged
**Phase [X+1]**: 🚀 Ready to begin

## Next Phase Preparation
**Lead Agent**: @agent-[name] for next priority issue
**Prerequisites**: All dependencies met
**Environment**: Fully prepared and validated

## Development Readiness Checklist
- ✅ Git repository clean and updated
- ✅ Dependencies fresh and secure
- ✅ Database optimized and healthy
- ✅ Configuration reset and validated
- ✅ Development servers tested
- ✅ Quality gates passing
- ✅ Documentation updated
- ✅ Next phase requirements analyzed

## Recommended Next Steps
1. Review roadmap for next priority issue
2. Run `analyze-email-insight-github-issue [next-issue-number]`
3. Begin implementation with `implement-email-insight-github-issue [next-issue-number]`

## Environment Metrics
- Build Time: [X]s (optimized)
- Test Suite Runtime: [X]s
- Development Server Startup: [X]s
- Database Query Performance: [X]ms average
```

### 9. Team Notification & Documentation

**Reset Completion Report:**
```bash
# Generate reset completion report
cat << EOF > dev-env-reset-report.md
# Email Insight Development Environment Reset Report

## Reset Summary
**Date**: $(date)
**Scope**: $1
**Duration**: [tracked during reset]
**Status**: ✅ Completed Successfully

## Actions Performed
- 🧹 Git repository cleaned and updated
- 📦 Dependencies reset and updated
- 🗄️ Database $([ "$1" = "full" ] && echo "fully reset" || echo "optimized")
- ⚙️ Configuration files reset
- 🔍 Health checks passed
- 📊 Quality gates validated

## Environment Health
- **Git Status**: Clean, on main branch
- **Dependencies**: $(npm list --depth=0 | grep -c "─")+ packages installed
- **Database**: Healthy, $(sqlite3 database/email-insight.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "N/A") tables
- **Build Status**: ✅ Successful
- **Test Status**: ✅ All passing

## Next Phase Readiness
**Ready for**: Next roadmap phase implementation
**Blockers**: None identified
**Recommendations**: Begin next priority issue analysis

---
Environment ready for productive development! 🚀
EOF

echo "✅ Reset report generated: dev-env-reset-report.md"
```

**Team Communication:**
- [ ] Send Slack/team notification about environment reset
- [ ] Update project status in management tools
- [ ] Notify relevant stakeholders about readiness for next phase
- [ ] Update development timeline if reset identified any issues

### 10. Final Validation & Handoff

**Complete Environment Validation:**
```bash
echo "🎯 Final environment validation..."

# Run comprehensive health check
npm run health-check:full

# Verify all critical paths work
npm run smoke-test:dev

# Check integration with external services
npm run integration-test:auth

# Validate monitoring and logging
npm run test:monitoring

echo "✅ Environment fully validated and ready"
```

**Development Handoff Checklist:**
- [ ] All services healthy and responsive
- [ ] Quality gates passing consistently
- [ ] Documentation updated and accurate
- [ ] Next phase requirements understood
- [ ] Development team notified
- [ ] Environment monitoring active
- [ ] Backup procedures tested
- [ ] Rollback procedures documented

## Reset Report Template

```markdown
# Email Insight Development Environment Reset Complete

## 🎯 Reset Summary
**Date**: [timestamp]
**Scope**: [full/partial/phase-transition]
**Duration**: [X minutes]
**Status**: ✅ Successfully Completed

## 🧹 Cleanup Actions Performed
- **Git Repository**: Cleaned, updated to latest main
- **Dependencies**: Reset and updated ([X] packages)
- **Database**: [Fully reset/Optimized/Cache cleared]
- **Configuration**: Reset to defaults, validated
- **Services**: All stopped, cleaned, and restarted

## 📊 Environment Health Status
**Development Servers:**
- Backend (port 3001): ✅ Healthy
- Frontend (port 3000): ✅ Healthy
- Database: ✅ Healthy and optimized

**Quality Gates:**
- Linting: ✅ No errors
- Type Checking: ✅ No errors  
- Tests: ✅ [X]/[Y] passing
- Build: ✅ Successful ([X]s)

**Performance Metrics:**
- Build Time: [X]s (↑/↓ [Y]s from baseline)
- Test Suite: [X]s (↑/↓ [Y]s from baseline)
- Dev Server Start: [X]s

## 🚀 Next Phase Readiness
**Phase [X]**: ✅ Completed and merged to main
**Phase [X+1]**: 🎯 Ready to begin

**Prerequisites Met:**
- ✅ Environment optimized for performance
- ✅ All dependencies updated and secure
- ✅ Database schema current with migrations
- ✅ Configuration validated and secure
- ✅ Quality gates established and passing

## 📋 Recommended Next Actions
1. **Review Roadmap**: Check `/docs/roadmap.md` for next priority
2. **Select Issue**: Choose next issue from Phase [X+1]
3. **Analyze Issue**: Run `analyze-email-insight-github-issue [issue-number]`
4. **Begin Implementation**: Use appropriate agent for implementation

## 🔧 Environment Configuration
**Node.js Version**: [version]
**npm Version**: [version]
**TypeScript**: [version]
**Database**: SQLite (optimized)
**Test Framework**: Jest + Playwright

**Key Dependencies Updated:**
- [dependency]: [old-version] → [new-version]
- [dependency]: [old-version] → [new-version]

---

🎉 **Development environment is optimized and ready for productive development!**

**Next Steps**: Ready to implement Phase [X+1] features with optimal performance and reliability.

🤖 Generated with [Claude Code](https://claude.ai/code)
```

## Command Usage Examples

### Full Environment Reset
```bash
reset-email-insight-dev-env full
```

### Partial Reset (Preserve Data)
```bash
reset-email-insight-dev-env partial
```

### Phase Transition Reset
```bash
reset-email-insight-dev-env phase-transition
```

### Quick Cache Clear
```bash
reset-email-insight-dev-env cache-only
```

## Success Criteria
- Development environment completely reset and optimized
- All services healthy and responsive
- Quality gates passing consistently
- Database optimized for performance
- Dependencies updated and secure
- Git repository clean and up to date
- Next phase requirements prepared
- Complete documentation and reporting
- Team notified and ready for next development cycle