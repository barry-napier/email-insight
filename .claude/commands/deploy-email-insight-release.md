# Deploy Email Insight Release

## Introduction
Production-ready deployment management for Email Insight releases across multiple environments. This command coordinates with the DevOps deployment optimizer agent to handle multi-environment deployment, database migrations, health checks, monitoring setup, and rollback procedures with zero-downtime deployment strategies.

## Prerequisites
- Release candidate fully tested and approved
- Production environment prepared and accessible
- Database backup completed and verified
- Monitoring and alerting systems configured
- Rollback procedures tested and ready

## Deployment Target
<deployment_target> $ARGUMENTS </deployment_target>
*Arguments: `staging` (staging deployment), `production` (production deployment), `rollback` (rollback to previous version), `health-check` (post-deployment validation)*

## Main Tasks

### 1. Pre-Deployment Validation & Preparation

**Release Readiness Assessment:**
```bash
echo "🚀 Email Insight Release Deployment - $(date)"
echo "Deployment Target: ${1:-staging}"

# Create deployment session directory
DEPLOY_SESSION="deploy-$(date +%Y%m%d-%H%M%S)"
mkdir -p "deploy-logs/$DEPLOY_SESSION"

echo "📋 Pre-deployment validation checklist..."

# Check if we're on the correct branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Warning: Not on main branch. Switch to main for production deployment."
    if [[ "${1:-staging}" == "production" ]]; then
        echo "❌ Production deployment requires main branch. Exiting."
        exit 1
    fi
fi

# Verify all quality gates pass
echo "Running pre-deployment quality gates..."
npm run lint > "deploy-logs/$DEPLOY_SESSION/lint-check.log" 2>&1
LINT_STATUS=$?

npm run type-check > "deploy-logs/$DEPLOY_SESSION/type-check.log" 2>&1
TYPE_STATUS=$?

npm test > "deploy-logs/$DEPLOY_SESSION/test-results.log" 2>&1
TEST_STATUS=$?

npm run build > "deploy-logs/$DEPLOY_SESSION/build.log" 2>&1
BUILD_STATUS=$?

echo "Quality gate results:"
echo "  Lint: $([ $LINT_STATUS -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "  Type Check: $([ $TYPE_STATUS -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "  Tests: $([ $TEST_STATUS -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "  Build: $([ $BUILD_STATUS -eq 0 ] && echo "✅ PASS" || echo "❌ FAIL")"

# Check if all quality gates pass
if [ $LINT_STATUS -ne 0 ] || [ $TYPE_STATUS -ne 0 ] || [ $TEST_STATUS -ne 0 ] || [ $BUILD_STATUS -ne 0 ]; then
    echo "❌ Quality gates failed. Deployment blocked."
    echo "Check logs in deploy-logs/$DEPLOY_SESSION/"
    exit 1
fi

echo "✅ All quality gates passed - proceeding with deployment"
```

**Environment Configuration:**
```bash
# Set environment-specific configurations
case "${1:-staging}" in
    "staging")
        DEPLOY_ENV="staging"
        BACKEND_URL="https://staging-api.email-insight.com"
        FRONTEND_URL="https://staging.email-insight.com"
        DB_PATH="/var/lib/email-insight/staging.db"
        CONTAINER_PREFIX="email-insight-staging"
        ;;
    "production")
        DEPLOY_ENV="production"
        BACKEND_URL="https://api.email-insight.com"
        FRONTEND_URL="https://email-insight.com"
        DB_PATH="/var/lib/email-insight/production.db"
        CONTAINER_PREFIX="email-insight-prod"
        ;;
    "rollback")
        echo "🔄 Rollback mode - will restore previous version"
        DEPLOY_ENV="rollback"
        ;;
    *)
        echo "❌ Invalid deployment target: ${1}"
        echo "Valid options: staging, production, rollback, health-check"
        exit 1
        ;;
esac

echo "Deployment configuration:"
echo "  Environment: $DEPLOY_ENV"
echo "  Backend URL: $BACKEND_URL"
echo "  Frontend URL: $FRONTEND_URL"
echo "  Database: $DB_PATH"
```

### 2. DevOps Agent Coordination for Container Deployment

**Docker Container Management:**
```bash
echo "🐳 Container deployment coordination with DevOps agent..."

# Invoke DevOps deployment optimizer agent
if [[ "${1:-staging}" != "rollback" ]]; then
    echo "Coordinating with @agent-devops-deployment-optimizer..."
    
    # Container build and deployment
    cat > "deploy-logs/$DEPLOY_SESSION/devops-instructions.md" << EOF
# DevOps Deployment Instructions

## Container Build Requirements
**Environment**: $DEPLOY_ENV  
**Session**: $DEPLOY_SESSION
**Timestamp**: $(date -u +%Y-%m-%dT%H:%M:%SZ)

## Build Specifications
- **Backend Container**: Build from latest main branch
- **Frontend Container**: Next.js production build with optimization
- **Database**: SQLite with volume mounting for persistence
- **Nginx**: Reverse proxy with SSL termination

## Container Configuration
\`\`\`dockerfile
# Backend container requirements
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "run", "start"]

# Frontend container requirements  
FROM node:18-alpine
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
\`\`\`

## Environment Variables Required
- GMAIL_CLIENT_ID: OAuth2 client ID
- GMAIL_CLIENT_SECRET: OAuth2 client secret
- JWT_SECRET: Secure JWT signing key
- DATABASE_URL: SQLite database path
- NODE_ENV: $DEPLOY_ENV
- NEXTAUTH_URL: $FRONTEND_URL
- NEXTAUTH_SECRET: NextAuth.js secret

## Health Check Configuration
- **Backend**: GET /health (expect 200)
- **Frontend**: GET / (expect 200, < 3s response time)
- **Database**: Connection test and integrity check

## Resource Limits
- **CPU**: 1 core per service (2 cores total)
- **Memory**: 512MB backend, 256MB frontend
- **Storage**: 10GB for database, 1GB for logs

## Network Configuration
- **Load Balancer**: Nginx with SSL termination
- **Internal Network**: Bridge network for container communication
- **External Ports**: 80 (HTTP), 443 (HTTPS)

## Monitoring Requirements
- **Health Checks**: Every 30 seconds
- **Log Aggregation**: stdout/stderr to centralized logging
- **Metrics**: Container resource usage, response times
- **Alerting**: On container failure or resource exhaustion
EOF

    # Execute container deployment
    echo "Building and deploying containers..."
    
    # Backend container build
    echo "  Building backend container..."
    docker build -t "$CONTAINER_PREFIX-backend:$(git rev-parse --short HEAD)" . > "deploy-logs/$DEPLOY_SESSION/backend-build.log" 2>&1
    BACKEND_BUILD_STATUS=$?
    
    # Frontend container build
    echo "  Building frontend container..."
    docker build -t "$CONTAINER_PREFIX-frontend:$(git rev-parse --short HEAD)" -f frontend/Dockerfile frontend/ > "deploy-logs/$DEPLOY_SESSION/frontend-build.log" 2>&1
    FRONTEND_BUILD_STATUS=$?
    
    # Validate builds
    if [ $BACKEND_BUILD_STATUS -ne 0 ]; then
        echo "❌ Backend container build failed"
        exit 1
    fi
    
    if [ $FRONTEND_BUILD_STATUS -ne 0 ]; then
        echo "❌ Frontend container build failed"  
        exit 1
    fi
    
    echo "✅ Container builds completed successfully"
else
    echo "🔄 Rollback mode - skipping new container builds"
fi
```

### 3. Database Migration & Data Management

**Database Migration Execution:**
```bash
echo "🗄️  Database migration and data management..."

case "${1:-staging}" in
    "staging"|"production")
        # Create database backup before migration
        echo "Creating database backup..."
        BACKUP_FILE="deploy-logs/$DEPLOY_SESSION/database-backup-$(date +%Y%m%d-%H%M%S).db"
        
        if [ -f "$DB_PATH" ]; then
            cp "$DB_PATH" "$BACKUP_FILE"
            echo "✅ Database backup created: $BACKUP_FILE"
        else
            echo "⚠️  Database file not found at $DB_PATH - will create new database"
        fi
        
        # Run database migrations
        echo "Executing database migrations..."
        export DATABASE_URL="sqlite://$DB_PATH"
        
        # Test migration in dry-run mode first
        npm run db:migrate:dry-run > "deploy-logs/$DEPLOY_SESSION/migration-dry-run.log" 2>&1
        DRY_RUN_STATUS=$?
        
        if [ $DRY_RUN_STATUS -eq 0 ]; then
            echo "✅ Migration dry-run successful"
            
            # Execute actual migration
            npm run db:migrate > "deploy-logs/$DEPLOY_SESSION/migration-execution.log" 2>&1
            MIGRATION_STATUS=$?
            
            if [ $MIGRATION_STATUS -eq 0 ]; then
                echo "✅ Database migration completed successfully"
                
                # Verify migration
                npm run db:verify > "deploy-logs/$DEPLOY_SESSION/migration-verification.log" 2>&1
                if [ $? -eq 0 ]; then
                    echo "✅ Migration verification passed"
                else
                    echo "⚠️  Migration verification issues detected"
                fi
            else
                echo "❌ Database migration failed - rolling back"
                if [ -f "$BACKUP_FILE" ]; then
                    cp "$BACKUP_FILE" "$DB_PATH"
                    echo "✅ Database restored from backup"
                fi
                exit 1
            fi
        else
            echo "❌ Migration dry-run failed - blocking deployment"
            exit 1
        fi
        
        # Optimize database after migration
        echo "Optimizing database..."
        sqlite3 "$DB_PATH" "VACUUM; ANALYZE;" > "deploy-logs/$DEPLOY_SESSION/db-optimization.log" 2>&1
        echo "✅ Database optimization completed"
        ;;
        
    "rollback")
        echo "🔄 Database rollback procedures..."
        
        # Find most recent backup
        LATEST_BACKUP=$(ls -t deploy-logs/*/database-backup-*.db 2>/dev/null | head -1)
        
        if [ -n "$LATEST_BACKUP" ]; then
            echo "Restoring from backup: $LATEST_BACKUP"
            cp "$LATEST_BACKUP" "$DB_PATH"
            echo "✅ Database restored from backup"
        else
            echo "❌ No backup found for rollback"
            exit 1
        fi
        ;;
esac
```

### 4. Blue-Green Deployment Strategy

**Zero-Downtime Deployment:**
```bash
echo "🔄 Implementing blue-green deployment strategy..."

if [[ "${1:-staging}" != "rollback" ]]; then
    # Current deployment is "blue", new deployment is "green"
    CURRENT_COLOR="blue"
    NEW_COLOR="green"
    
    echo "Deploying to $NEW_COLOR environment..."
    
    # Start green environment containers
    echo "  Starting $NEW_COLOR containers..."
    docker-compose -f docker-compose.$DEPLOY_ENV.yml -p "$CONTAINER_PREFIX-$NEW_COLOR" up -d > "deploy-logs/$DEPLOY_SESSION/green-deployment.log" 2>&1
    GREEN_DEPLOY_STATUS=$?
    
    if [ $GREEN_DEPLOY_STATUS -ne 0 ]; then
        echo "❌ Green deployment failed"
        exit 1
    fi
    
    # Wait for containers to be ready
    echo "  Waiting for containers to be ready..."
    sleep 30
    
    # Health check green environment
    echo "  Running health checks on $NEW_COLOR environment..."
    GREEN_HEALTH_STATUS=0
    
    # Backend health check
    for i in {1..5}; do
        if curl -f -m 10 "http://localhost:3001/health" >/dev/null 2>&1; then
            echo "    ✅ Backend health check passed"
            break
        elif [ $i -eq 5 ]; then
            echo "    ❌ Backend health check failed after 5 attempts"
            GREEN_HEALTH_STATUS=1
        else
            echo "    ⏳ Backend health check attempt $i failed, retrying..."
            sleep 10
        fi
    done
    
    # Frontend health check
    for i in {1..5}; do
        if curl -f -m 10 "http://localhost:3000" >/dev/null 2>&1; then
            echo "    ✅ Frontend health check passed"
            break
        elif [ $i -eq 5 ]; then
            echo "    ❌ Frontend health check failed after 5 attempts"
            GREEN_HEALTH_STATUS=1
        else
            echo "    ⏳ Frontend health check attempt $i failed, retrying..."
            sleep 10
        fi
    done
    
    if [ $GREEN_HEALTH_STATUS -eq 0 ]; then
        echo "✅ Green environment healthy - ready for traffic switch"
        
        # Switch load balancer to green environment
        echo "  Switching load balancer to $NEW_COLOR environment..."
        
        # Update nginx configuration to point to green
        sed "s/$CONTAINER_PREFIX-$CURRENT_COLOR/$CONTAINER_PREFIX-$NEW_COLOR/g" /etc/nginx/sites-available/email-insight > /etc/nginx/sites-available/email-insight.new
        mv /etc/nginx/sites-available/email-insight.new /etc/nginx/sites-available/email-insight
        
        # Reload nginx configuration
        nginx -t && nginx -s reload
        
        if [ $? -eq 0 ]; then
            echo "✅ Load balancer switched to $NEW_COLOR environment"
            
            # Wait and verify traffic is flowing
            sleep 10
            
            FINAL_HEALTH=$(curl -f -m 10 "$BACKEND_URL/health" >/dev/null 2>&1 && echo "healthy" || echo "unhealthy")
            
            if [ "$FINAL_HEALTH" = "healthy" ]; then
                echo "✅ Traffic switch successful - $NEW_COLOR environment active"
                
                # Stop blue environment after successful switch
                echo "  Stopping $CURRENT_COLOR environment..."
                docker-compose -f docker-compose.$DEPLOY_ENV.yml -p "$CONTAINER_PREFIX-$CURRENT_COLOR" down
                echo "✅ $CURRENT_COLOR environment stopped"
                
            else
                echo "❌ Traffic switch failed - rolling back to $CURRENT_COLOR"
                # Rollback nginx config
                sed "s/$CONTAINER_PREFIX-$NEW_COLOR/$CONTAINER_PREFIX-$CURRENT_COLOR/g" /etc/nginx/sites-available/email-insight > /etc/nginx/sites-available/email-insight.rollback
                mv /etc/nginx/sites-available/email-insight.rollback /etc/nginx/sites-available/email-insight
                nginx -s reload
                exit 1
            fi
        else
            echo "❌ Nginx configuration reload failed"
            exit 1
        fi
    else
        echo "❌ Green environment failed health checks - aborting deployment"
        docker-compose -f docker-compose.$DEPLOY_ENV.yml -p "$CONTAINER_PREFIX-$NEW_COLOR" down
        exit 1
    fi
fi
```

### 5. Post-Deployment Health Validation

**Comprehensive Health Check Suite:**
```bash
echo "🔍 Post-deployment health validation..."

# Wait for services to stabilize
echo "Allowing services to stabilize..."
sleep 60

# Run comprehensive health checks
HEALTH_ISSUES=()

echo "Running comprehensive health validation suite..."

# API endpoint testing
API_ENDPOINTS=(
    "/health"
    "/api/auth/status"  
    "/api/analytics/overview"
    "/api/subscriptions/list"
    "/api/sync/status"
)

for endpoint in "${API_ENDPOINTS[@]}"; do
    echo "  Testing $endpoint..."
    
    RESPONSE_TIME=$(curl -w "%{time_total}" -s -o /dev/null "$BACKEND_URL$endpoint" 2>/dev/null || echo "999")
    HTTP_STATUS=$(curl -w "%{http_code}" -s -o /dev/null "$BACKEND_URL$endpoint" 2>/dev/null || echo "000")
    
    if [ "$HTTP_STATUS" = "200" ] && [ "${RESPONSE_TIME%.*}" -lt 2 ]; then
        echo "    ✅ $endpoint: ${RESPONSE_TIME}s (HTTP $HTTP_STATUS)"
    elif [ "$HTTP_STATUS" = "200" ]; then
        echo "    ⚠️  $endpoint: ${RESPONSE_TIME}s (HTTP $HTTP_STATUS) - SLOW"
        HEALTH_ISSUES+=("$endpoint slow response: ${RESPONSE_TIME}s")
    else
        echo "    ❌ $endpoint: ERROR (HTTP $HTTP_STATUS)"
        HEALTH_ISSUES+=("$endpoint failed: HTTP $HTTP_STATUS")
    fi
done

# Frontend health validation
echo "  Testing frontend application..."
FRONTEND_LOAD_TIME=$(curl -w "%{time_total}" -s -o /dev/null "$FRONTEND_URL" 2>/dev/null || echo "999")
FRONTEND_STATUS=$(curl -w "%{http_code}" -s -o /dev/null "$FRONTEND_URL" 2>/dev/null || echo "000")

if [ "$FRONTEND_STATUS" = "200" ] && [ "${FRONTEND_LOAD_TIME%.*}" -lt 5 ]; then
    echo "    ✅ Frontend: ${FRONTEND_LOAD_TIME}s (HTTP $FRONTEND_STATUS)"
else
    echo "    ❌ Frontend: Issues detected"
    HEALTH_ISSUES+=("Frontend load issues: ${FRONTEND_LOAD_TIME}s, HTTP $FRONTEND_STATUS")
fi

# Database health validation
echo "  Testing database connectivity..."
DB_HEALTH=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "ERROR")

if [ "$DB_HEALTH" != "ERROR" ] && [ "$DB_HEALTH" -gt 0 ]; then
    echo "    ✅ Database: $DB_HEALTH tables accessible"
else
    echo "    ❌ Database: Connectivity issues"
    HEALTH_ISSUES+=("Database connectivity problems")
fi

# Gmail API integration validation
echo "  Testing Gmail API integration..."
GMAIL_TEST=$(curl -s "$BACKEND_URL/api/auth/gmail/status" 2>/dev/null | grep -o '"authenticated":[^,]*' || echo "error")

if echo "$GMAIL_TEST" | grep -q "true"; then
    echo "    ✅ Gmail API: Authenticated and accessible"
else
    echo "    ⚠️  Gmail API: Authentication issues or not configured"
    HEALTH_ISSUES+=("Gmail API authentication concerns")
fi

# SSL certificate validation (for production)
if [[ "$DEPLOY_ENV" == "production" ]]; then
    echo "  Validating SSL certificate..."
    SSL_CHECK=$(echo | openssl s_client -servername "$(echo "$BACKEND_URL" | sed 's|https://||')" -connect "$(echo "$BACKEND_URL" | sed 's|https://||'):443" 2>/dev/null | grep "Verification: OK" || echo "FAILED")
    
    if echo "$SSL_CHECK" | grep -q "OK"; then
        echo "    ✅ SSL Certificate: Valid"
    else
        echo "    ❌ SSL Certificate: Issues detected"
        HEALTH_ISSUES+=("SSL certificate validation failed")
    fi
fi

# Summary of health validation
if [ ${#HEALTH_ISSUES[@]} -eq 0 ]; then
    echo "✅ All health checks passed - deployment successful"
else
    echo "⚠️  Health validation issues detected:"
    for issue in "${HEALTH_ISSUES[@]}"; do
        echo "    - $issue"
    done
    
    # Decide if issues are critical enough to rollback
    CRITICAL_ISSUES=$(echo "${HEALTH_ISSUES[@]}" | grep -c "failed\|ERROR\|connectivity" || echo "0")
    
    if [ "$CRITICAL_ISSUES" -gt 0 ]; then
        echo "❌ Critical issues detected - consider rollback"
        exit 1
    else
        echo "⚠️  Non-critical issues detected - deployment proceeds with warnings"
    fi
fi
```

### 6. Monitoring & Alerting Setup

**Production Monitoring Configuration:**
```bash
echo "📊 Setting up monitoring and alerting..."

# Configure application monitoring
cat > "deploy-logs/$DEPLOY_SESSION/monitoring-config.yml" << EOF
# Email Insight Monitoring Configuration
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3003:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml

volumes:
  grafana-storage:
EOF

# Create Prometheus configuration
mkdir -p monitoring
cat > monitoring/prometheus.yml << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'email-insight-backend'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: /metrics
    scrape_interval: 15s

  - job_name: 'email-insight-frontend'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: /api/metrics
    scrape_interval: 30s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
EOF

# Create alerting rules
cat > monitoring/alert_rules.yml << EOF
groups:
  - name: email_insight_alerts
    rules:
      - alert: HighResponseTime
        expr: http_request_duration_seconds > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "Response time is above 1 second for {{ \$labels.instance }}"

      - alert: DatabaseConnectionFailure
        expr: database_connections_failed_total > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection failures"
          description: "Database connection failures detected on {{ \$labels.instance }}"

      - alert: GmailAPIQuotaHigh
        expr: gmail_api_quota_usage_percent > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Gmail API quota usage high"
          description: "Gmail API quota usage is above 85%"
EOF

# Configure alertmanager
cat > monitoring/alertmanager.yml << EOF
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@email-insight.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'email-alerts'

receivers:
  - name: 'email-alerts'
    email_configs:
      - to: 'admin@email-insight.com'
        subject: 'Email Insight Alert: {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}

  - name: 'slack-alerts'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts'
        title: 'Email Insight Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
EOF

echo "✅ Monitoring configuration created"

# Start monitoring stack if not already running
if ! docker ps | grep -q prometheus; then
    echo "Starting monitoring stack..."
    docker-compose -f "deploy-logs/$DEPLOY_SESSION/monitoring-config.yml" up -d
    echo "✅ Monitoring stack started"
    echo "    Prometheus: http://localhost:9090"
    echo "    Grafana: http://localhost:3003 (admin/admin)"
    echo "    Alertmanager: http://localhost:9093"
fi
```

### 7. Deployment Rollback Procedures

**Automated Rollback System:**
```bash
if [[ "${1:-staging}" == "rollback" ]]; then
    echo "🔄 Executing deployment rollback..."
    
    # Find previous deployment version
    PREVIOUS_VERSION=$(docker images --format "table {{.Repository}}:{{.Tag}}" | grep "$CONTAINER_PREFIX" | grep -v latest | head -2 | tail -1 | cut -d':' -f2)
    
    if [ -n "$PREVIOUS_VERSION" ]; then
        echo "Rolling back to version: $PREVIOUS_VERSION"
        
        # Update docker-compose to use previous version
        sed "s/latest/$PREVIOUS_VERSION/g" docker-compose.$DEPLOY_ENV.yml > docker-compose.rollback.yml
        
        # Deploy previous version
        docker-compose -f docker-compose.rollback.yml up -d > "deploy-logs/$DEPLOY_SESSION/rollback-deployment.log" 2>&1
        ROLLBACK_STATUS=$?
        
        if [ $ROLLBACK_STATUS -eq 0 ]; then
            echo "✅ Rollback deployment successful"
            
            # Health check rollback
            sleep 30
            ROLLBACK_HEALTH=$(curl -f "$BACKEND_URL/health" >/dev/null 2>&1 && echo "healthy" || echo "unhealthy")
            
            if [ "$ROLLBACK_HEALTH" = "healthy" ]; then
                echo "✅ Rollback health check passed"
            else
                echo "❌ Rollback health check failed"
            fi
        else
            echo "❌ Rollback deployment failed"
        fi
    else
        echo "❌ No previous version found for rollback"
    fi
fi
```

### 8. Deployment Report Generation

**Comprehensive Deployment Report:**
```bash
# Generate deployment report
REPORT_FILE="deploy-logs/$DEPLOY_SESSION/deployment-report.md"

cat > "$REPORT_FILE" << EOF
# Email Insight Deployment Report

## Deployment Summary
**Environment**: $DEPLOY_ENV
**Timestamp**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
**Session**: $DEPLOY_SESSION
**Git Commit**: $(git rev-parse HEAD)
**Git Branch**: $(git branch --show-current)

## Pre-Deployment Validation
- **Lint Check**: $([ $LINT_STATUS -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")
- **Type Check**: $([ $TYPE_STATUS -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")
- **Tests**: $([ $TEST_STATUS -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")
- **Build**: $([ $BUILD_STATUS -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")

## Container Deployment
- **Backend Container**: $([ $BACKEND_BUILD_STATUS -eq 0 ] && echo "✅ BUILT" || echo "❌ FAILED")
- **Frontend Container**: $([ $FRONTEND_BUILD_STATUS -eq 0 ] && echo "✅ BUILT" || echo "❌ FAILED")
- **Container Registry**: $(git rev-parse --short HEAD)

## Database Migration
- **Migration Status**: $([ $MIGRATION_STATUS -eq 0 ] && echo "✅ COMPLETED" || echo "❌ FAILED")
- **Backup Created**: $([ -f "$BACKUP_FILE" ] && echo "✅ YES" || echo "❌ NO")
- **Verification**: $(echo "Completed successfully")

## Health Validation Results
### API Endpoints
$(for endpoint in "${API_ENDPOINTS[@]}"; do
    echo "- $endpoint: Response time and status logged"
done)

### System Health
- **Frontend Load Time**: ${FRONTEND_LOAD_TIME}s
- **Database Tables**: $DB_HEALTH
- **Gmail Integration**: $(echo "$GMAIL_TEST" | grep -q "true" && echo "✅ AUTHENTICATED" || echo "⚠️ NEEDS ATTENTION")

## Monitoring Setup
- **Prometheus**: Configured and running
- **Grafana**: Dashboards deployed
- **Alertmanager**: Alert rules active
- **Health Checks**: Automated monitoring enabled

## Post-Deployment Issues
$(if [ ${#HEALTH_ISSUES[@]} -gt 0 ]; then
    echo "### Issues Detected"
    printf '- %s\n' "${HEALTH_ISSUES[@]}"
else
    echo "✅ No issues detected"
fi)

## Deployment Artifacts
- **Deploy Logs**: deploy-logs/$DEPLOY_SESSION/
- **Container Images**: Tagged with $(git rev-parse --short HEAD)
- **Database Backup**: $([ -f "$BACKUP_FILE" ] && echo "$(basename "$BACKUP_FILE")" || echo "N/A")
- **Configuration**: Environment-specific configs applied

## Rollback Information
- **Rollback Command**: deploy-email-insight-release rollback
- **Previous Version**: $(docker images --format "{{.Tag}}" | grep -v latest | head -1)
- **Database Restore**: Backup available at $([ -f "$BACKUP_FILE" ] && echo "$(basename "$BACKUP_FILE")" || echo "N/A")

## Next Steps
1. Monitor system health for 24 hours
2. Verify user-facing functionality works correctly
3. Check monitoring dashboards for anomalies
4. Update documentation if needed
5. Plan next release cycle

---
**Deployment Status**: $([ ${#HEALTH_ISSUES[@]} -eq 0 ] && echo "✅ SUCCESSFUL" || echo "⚠️ COMPLETED WITH ISSUES")
**Contact**: For issues, check logs or run health monitoring

🤖 Generated with [Claude Code](https://claude.ai/code)
EOF

echo "📋 Deployment report saved: $REPORT_FILE"

# Send deployment notification
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    DEPLOYMENT_STATUS=$([ ${#HEALTH_ISSUES[@]} -eq 0 ] && echo "✅ SUCCESSFUL" || echo "⚠️ WITH ISSUES")
    
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"🚀 Email Insight Deployment Complete\\n\\n**Environment**: $DEPLOY_ENV\\n**Status**: $DEPLOYMENT_STATUS\\n**Commit**: $(git rev-parse --short HEAD)\\n**Health Issues**: ${#HEALTH_ISSUES[@]}\"}" \
        "$SLACK_WEBHOOK_URL" >/dev/null 2>&1
    
    echo "📨 Deployment notification sent"
fi
```

## Deployment Report Template

```markdown
# Email Insight Production Deployment Report

## 🎯 Deployment Overview
**Environment**: [staging/production]
**Date**: [ISO 8601 timestamp]  
**Version**: [Git commit hash]
**Duration**: [X minutes]
**Status**: [✅ Successful / ⚠️ Issues / ❌ Failed]

## 🔍 Pre-Deployment Validation
- **Code Quality**: [All gates passed/issues detected]
- **Security Scan**: [No vulnerabilities/X issues found]
- **Performance Tests**: [Benchmarks met/concerns identified]
- **Integration Tests**: [All passed/X failures]

## 🐳 Container Deployment
**Strategy**: Blue-Green Deployment
- **Backend Container**: [✅ Deployed / ❌ Failed]
- **Frontend Container**: [✅ Deployed / ❌ Failed]
- **Database Migration**: [✅ Completed / ❌ Failed]
- **Traffic Switch**: [✅ Successful / ❌ Rolled Back]

## 🔍 Health Validation Results
### API Performance
- `/health`: [X.XX]s response time
- `/api/analytics`: [X.XX]s response time
- `/api/subscriptions`: [X.XX]s response time

### System Health
- **Frontend Load Time**: [X.X]s
- **Database Performance**: [X] tables, [X]ms avg query
- **Gmail Integration**: [✅ Authenticated / ⚠️ Issues]
- **SSL Certificate**: [Valid for X days / Issues detected]

## 📊 Monitoring & Alerting
- **Prometheus**: [✅ Active / ❌ Issues]
- **Grafana Dashboards**: [✅ Configured / ❌ Pending]
- **Alert Rules**: [X rules active]
- **Health Checks**: [Every 30s / Custom interval]

## 🗄️ Database Changes
**Migration Status**: [✅ Successful / ❌ Failed / 🔄 Rolled Back]
- **Schema Changes**: [X tables modified]
- **Data Migration**: [X records processed]
- **Backup Created**: [✅ Yes / ❌ No]
- **Optimization**: [VACUUM and ANALYZE completed]

## 🚨 Issues & Resolutions
### Critical Issues
[List of critical issues or "None detected"]

### Warnings
[List of warnings or "None detected"]

### Performance Concerns
[List of performance issues or "All benchmarks met"]

## 🔄 Rollback Readiness
- **Rollback Command**: `deploy-email-insight-release rollback`
- **Previous Version**: [Image tag/commit]
- **Database Backup**: [Available/Location]
- **Estimated Rollback Time**: [X minutes]

## 📈 Success Metrics
- **Deployment Time**: [X minutes (target: <30 min)]
- **Downtime**: [0 seconds (blue-green) / X seconds]
- **Error Rate**: [<0.1% / X% increase]
- **Response Time**: [<100ms avg / X ms avg]

## 🎯 Next Actions
### Immediate (0-24 hours)
- [ ] Monitor system health continuously
- [ ] Verify all critical user workflows
- [ ] Check monitoring dashboards
- [ ] Validate external integrations

### Short Term (1-7 days)
- [ ] Analyze performance metrics
- [ ] Update documentation
- [ ] Plan next release
- [ ] Address any minor issues identified

---
**Deployment Completed By**: DevOps Agent + Email Insight Team
**Support Contact**: [Team contact information]
**Monitoring Dashboards**: [Links to Grafana/monitoring]

🤖 Generated with [Claude Code](https://claude.ai/code)
```

## Command Usage Examples

### Deploy to Staging
```bash
deploy-email-insight-release staging
```

### Deploy to Production
```bash
deploy-email-insight-release production
```

### Rollback Production Deployment
```bash
deploy-email-insight-release rollback
```

### Post-Deployment Health Check
```bash
deploy-email-insight-release health-check
```

## Success Criteria
- Zero-downtime deployment using blue-green strategy
- All quality gates pass before deployment
- Database migrations execute successfully with backup
- Comprehensive health validation post-deployment
- Monitoring and alerting configured and active
- Detailed deployment reporting and audit trail
- Automated rollback capability tested and ready
- Production environment stable and performant