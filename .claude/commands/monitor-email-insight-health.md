# Monitor Email Insight Health

## Introduction
Comprehensive health monitoring and performance tracking for Email Insight application across all environments. This command provides real-time system health checks, performance metrics analysis, Gmail API quota monitoring, and proactive alerting for potential issues before they impact users.

## Prerequisites
- Application deployed and running (development/staging/production)
- Access to application logs and metrics
- Monitoring tools configured (optional: Prometheus, Grafana)
- Database access for health checks

## Monitoring Scope
<monitoring_scope> $ARGUMENTS </monitoring_scope>
*Arguments: `dev` (development), `staging` (staging environment), `prod` (production), `all` (all environments)*

## Main Tasks

### 1. System Health Assessment

**Service Status Validation:**
```bash
echo "🔍 Email Insight Health Monitoring - $(date)"
echo "Environment: ${1:-dev}"

# Define service endpoints based on environment
case "${1:-dev}" in
    "dev")
        BACKEND_URL="http://localhost:3001"
        FRONTEND_URL="http://localhost:3000"
        DB_PATH="./database/email-insight.db"
        ;;
    "staging")
        BACKEND_URL="https://staging-api.email-insight.com"
        FRONTEND_URL="https://staging.email-insight.com"
        DB_PATH="./database/email-insight-staging.db"
        ;;
    "prod")
        BACKEND_URL="https://api.email-insight.com"
        FRONTEND_URL="https://email-insight.com"
        DB_PATH="./database/email-insight-prod.db"
        ;;
    "all")
        echo "Monitoring all environments..."
        ;;
esac

echo "Monitoring endpoints:"
echo "  Backend: $BACKEND_URL"
echo "  Frontend: $FRONTEND_URL"
echo "  Database: $DB_PATH"
```

**Core Service Health Checks:**
- [ ] **Backend API Health**: Check `/health` endpoint response time and status
- [ ] **Frontend Application**: Verify main page loads and renders correctly  
- [ ] **Database Connectivity**: Test SQLite connection and query response
- [ ] **Gmail API Integration**: Validate OAuth2 token status and API connectivity
- [ ] **Authentication Service**: Test JWT token generation and validation

### 2. Performance Metrics Collection

**API Performance Monitoring:**
```bash
echo "📊 Collecting API performance metrics..."

# Test critical API endpoints
API_ENDPOINTS=(
    "/health"
    "/api/auth/status"
    "/api/analytics/overview"
    "/api/subscriptions/list"
    "/api/sync/status"
)

for endpoint in "${API_ENDPOINTS[@]}"; do
    echo "Testing $endpoint..."
    
    # Measure response time and status
    RESPONSE_TIME=$(curl -w "%{time_total}" -s -o /dev/null "$BACKEND_URL$endpoint" 2>/dev/null || echo "999")
    HTTP_STATUS=$(curl -w "%{http_code}" -s -o /dev/null "$BACKEND_URL$endpoint" 2>/dev/null || echo "000")
    
    # Evaluate performance
    if [ "$HTTP_STATUS" = "200" ] && [ "${RESPONSE_TIME%.*}" -lt 1 ]; then
        echo "  ✅ $endpoint: ${RESPONSE_TIME}s (HTTP $HTTP_STATUS)"
    elif [ "$HTTP_STATUS" = "200" ]; then
        echo "  ⚠️  $endpoint: ${RESPONSE_TIME}s (HTTP $HTTP_STATUS) - SLOW"
    else
        echo "  ❌ $endpoint: ERROR (HTTP $HTTP_STATUS)"
    fi
done
```

**Database Performance Analysis:**
```bash
echo "🗄️  Database performance analysis..."

if [ -f "$DB_PATH" ]; then
    # Check database size and table counts
    DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
    TABLE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "ERROR")
    
    echo "  Database size: $DB_SIZE"
    echo "  Table count: $TABLE_COUNT"
    
    # Test query performance on key tables
    echo "  Testing query performance..."
    
    # Email table query performance
    EMAIL_COUNT_TIME=$(time sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM emails;" 2>&1 | grep real | awk '{print $2}' || echo "ERROR")
    echo "    Email count query: $EMAIL_COUNT_TIME"
    
    # Analytics query performance  
    ANALYTICS_TIME=$(time sqlite3 "$DB_PATH" "SELECT sender, COUNT(*) FROM emails GROUP BY sender LIMIT 10;" 2>&1 | grep real | awk '{print $2}' || echo "ERROR")
    echo "    Analytics query: $ANALYTICS_TIME"
    
    # FTS5 search performance
    if sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%fts%';" | grep -q fts; then
        FTS_TIME=$(time sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM emails_fts WHERE emails_fts MATCH 'newsletter';" 2>&1 | grep real | awk '{print $2}' || echo "ERROR")
        echo "    FTS5 search query: $FTS_TIME"
    else
        echo "    FTS5 search: Not configured"
    fi
else
    echo "  ❌ Database file not found: $DB_PATH"
fi
```

### 3. Gmail API Quota & Rate Limit Monitoring

**Gmail API Health Assessment:**
```bash
echo "📧 Gmail API monitoring..."

# Check OAuth2 token status
if curl -s "$BACKEND_URL/api/auth/gmail/status" | grep -q "authenticated"; then
    echo "  ✅ Gmail OAuth2: Authenticated"
    
    # Check API quota usage
    QUOTA_RESPONSE=$(curl -s "$BACKEND_URL/api/sync/quota-status" 2>/dev/null || echo '{"error":"unavailable"}')
    
    if echo "$QUOTA_RESPONSE" | grep -q "quota_remaining"; then
        QUOTA_USED=$(echo "$QUOTA_RESPONSE" | grep -o '"quota_used":[0-9]*' | cut -d':' -f2)
        QUOTA_LIMIT=$(echo "$QUOTA_RESPONSE" | grep -o '"quota_limit":[0-9]*' | cut -d':' -f2)
        QUOTA_PERCENTAGE=$((QUOTA_USED * 100 / QUOTA_LIMIT))
        
        if [ "$QUOTA_PERCENTAGE" -lt 80 ]; then
            echo "  ✅ Gmail API Quota: ${QUOTA_PERCENTAGE}% used ($QUOTA_USED/$QUOTA_LIMIT)"
        elif [ "$QUOTA_PERCENTAGE" -lt 95 ]; then
            echo "  ⚠️  Gmail API Quota: ${QUOTA_PERCENTAGE}% used ($QUOTA_USED/$QUOTA_LIMIT) - HIGH"
        else
            echo "  ❌ Gmail API Quota: ${QUOTA_PERCENTAGE}% used ($QUOTA_USED/$QUOTA_LIMIT) - CRITICAL"
        fi
    else
        echo "  ⚠️  Gmail API Quota: Unable to retrieve status"
    fi
    
    # Test sync functionality
    SYNC_TEST=$(curl -s -w "%{http_code}" "$BACKEND_URL/api/sync/test" 2>/dev/null || echo "000")
    if [ "$SYNC_TEST" = "200" ]; then
        echo "  ✅ Gmail Sync: Functional"
    else
        echo "  ❌ Gmail Sync: Error (HTTP $SYNC_TEST)"
    fi
else
    echo "  ❌ Gmail OAuth2: Not authenticated or service unavailable"
fi
```

### 4. Resource Usage Monitoring

**System Resource Analysis:**
```bash
echo "💾 System resource monitoring..."

# Memory usage
if command -v ps >/dev/null 2>&1; then
    NODE_MEMORY=$(ps aux | grep node | grep -v grep | awk '{sum+=$6} END {printf "%.1f", sum/1024}' || echo "0")
    echo "  Node.js memory usage: ${NODE_MEMORY}MB"
    
    if [ "${NODE_MEMORY%.*}" -gt 500 ]; then
        echo "    ⚠️  High memory usage detected"
    fi
fi

# Disk usage for database and logs
if [ -f "$DB_PATH" ]; then
    DB_SIZE_MB=$(du -m "$DB_PATH" | cut -f1)
    echo "  Database size: ${DB_SIZE_MB}MB"
    
    if [ "$DB_SIZE_MB" -gt 1000 ]; then
        echo "    ⚠️  Large database size - consider archiving old data"
    fi
fi

# Log file sizes
if [ -d "logs" ]; then
    LOG_SIZE=$(du -sh logs 2>/dev/null | cut -f1 || echo "0")
    echo "  Log files size: $LOG_SIZE"
fi

# Temporary file cleanup check
TEMP_FILES=$(find /tmp -name "*email-insight*" -type f 2>/dev/null | wc -l || echo "0")
if [ "$TEMP_FILES" -gt 10 ]; then
    echo "  ⚠️  ${TEMP_FILES} temporary files found - cleanup recommended"
fi
```

### 5. Frontend Performance Monitoring

**Frontend Health & Performance:**
```bash
echo "🌐 Frontend performance monitoring..."

# Basic frontend health check
FRONTEND_STATUS=$(curl -s -w "%{http_code}" -o /dev/null "$FRONTEND_URL" 2>/dev/null || echo "000")

if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "  ✅ Frontend: Accessible (HTTP $FRONTEND_STATUS)"
    
    # Load time measurement (simplified)
    LOAD_TIME=$(curl -w "%{time_total}" -s -o /dev/null "$FRONTEND_URL" 2>/dev/null || echo "999")
    
    if [ "${LOAD_TIME%.*}" -lt 3 ]; then
        echo "  ✅ Frontend load time: ${LOAD_TIME}s"
    else
        echo "  ⚠️  Frontend load time: ${LOAD_TIME}s - SLOW"
    fi
    
    # Check if JavaScript bundle loads
    JS_STATUS=$(curl -s -w "%{http_code}" -o /dev/null "$FRONTEND_URL/_next/static/chunks/main.js" 2>/dev/null || echo "404")
    if [ "$JS_STATUS" = "200" ]; then
        echo "  ✅ JavaScript bundle: Available"
    else
        echo "  ⚠️  JavaScript bundle: Issues detected"
    fi
    
else
    echo "  ❌ Frontend: Unavailable (HTTP $FRONTEND_STATUS)"
fi
```

### 6. Security Health Monitoring

**Security Status Assessment:**
```bash
echo "🔒 Security health monitoring..."

# SSL certificate check (for production)
if [[ "$BACKEND_URL" == https* ]]; then
    SSL_EXPIRY=$(echo | openssl s_client -servername "$(echo "$BACKEND_URL" | sed 's|https://||')" -connect "$(echo "$BACKEND_URL" | sed 's|https://||'):443" 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
    
    if [ -n "$SSL_EXPIRY" ]; then
        # Convert to epoch and check if expiring within 30 days
        SSL_EPOCH=$(date -d "$SSL_EXPIRY" +%s 2>/dev/null || echo "0")
        CURRENT_EPOCH=$(date +%s)
        DAYS_UNTIL_EXPIRY=$(( (SSL_EPOCH - CURRENT_EPOCH) / 86400 ))
        
        if [ "$DAYS_UNTIL_EXPIRY" -gt 30 ]; then
            echo "  ✅ SSL Certificate: Valid for ${DAYS_UNTIL_EXPIRY} days"
        elif [ "$DAYS_UNTIL_EXPIRY" -gt 0 ]; then
            echo "  ⚠️  SSL Certificate: Expires in ${DAYS_UNTIL_EXPIRY} days"
        else
            echo "  ❌ SSL Certificate: EXPIRED"
        fi
    fi
fi

# Security headers check
SECURITY_HEADERS=$(curl -s -I "$BACKEND_URL/health" | grep -i "x-frame-options\|x-content-type-options\|strict-transport-security" | wc -l)

if [ "$SECURITY_HEADERS" -ge 2 ]; then
    echo "  ✅ Security headers: Present"
else
    echo "  ⚠️  Security headers: Missing or incomplete"
fi

# JWT token validation test
JWT_TEST=$(curl -s -w "%{http_code}" -H "Authorization: Bearer invalid-token" "$BACKEND_URL/api/auth/validate" 2>/dev/null || echo "000")
if [ "$JWT_TEST" = "401" ]; then
    echo "  ✅ JWT validation: Working (rejects invalid tokens)"
else
    echo "  ⚠️  JWT validation: May have issues"
fi
```

### 7. Alert Generation & Thresholds

**Automated Alerting System:**
```bash
echo "🚨 Evaluating alert conditions..."

ALERTS=()
WARNINGS=()

# Performance alerts
if [ "${LOAD_TIME%.*}" -gt 5 ]; then
    ALERTS+=("Frontend load time critical: ${LOAD_TIME}s")
elif [ "${LOAD_TIME%.*}" -gt 3 ]; then
    WARNINGS+=("Frontend load time slow: ${LOAD_TIME}s")
fi

# Memory alerts  
if [ "${NODE_MEMORY%.*}" -gt 1000 ]; then
    ALERTS+=("High memory usage: ${NODE_MEMORY}MB")
elif [ "${NODE_MEMORY%.*}" -gt 500 ]; then
    WARNINGS+=("Elevated memory usage: ${NODE_MEMORY}MB")
fi

# Gmail API quota alerts
if [ -n "$QUOTA_PERCENTAGE" ]; then
    if [ "$QUOTA_PERCENTAGE" -gt 95 ]; then
        ALERTS+=("Gmail API quota critical: ${QUOTA_PERCENTAGE}%")
    elif [ "$QUOTA_PERCENTAGE" -gt 80 ]; then
        WARNINGS+=("Gmail API quota high: ${QUOTA_PERCENTAGE}%")
    fi
fi

# Database size alerts
if [ -n "$DB_SIZE_MB" ] && [ "$DB_SIZE_MB" -gt 5000 ]; then
    ALERTS+=("Database size large: ${DB_SIZE_MB}MB")
elif [ -n "$DB_SIZE_MB" ] && [ "$DB_SIZE_MB" -gt 1000 ]; then
    WARNINGS+=("Database size growing: ${DB_SIZE_MB}MB")
fi

# Display alerts
if [ ${#ALERTS[@]} -gt 0 ]; then
    echo "❌ CRITICAL ALERTS:"
    for alert in "${ALERTS[@]}"; do
        echo "  - $alert"
    done
fi

if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo "⚠️  WARNINGS:"
    for warning in "${WARNINGS[@]}"; do
        echo "  - $warning"
    done
fi

if [ ${#ALERTS[@]} -eq 0 ] && [ ${#WARNINGS[@]} -eq 0 ]; then
    echo "✅ No alerts or warnings - system healthy"
fi
```

### 8. Health Report Generation

**Comprehensive Health Report:**
```bash
# Generate timestamped health report
REPORT_FILE="health-reports/email-insight-health-$(date +%Y%m%d-%H%M%S).json"
mkdir -p health-reports

cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "${1:-dev}",
  "overall_status": "$([ ${#ALERTS[@]} -eq 0 ] && echo "healthy" || echo "unhealthy")",
  "services": {
    "backend": {
      "status": "$([ "$HTTP_STATUS" = "200" ] && echo "healthy" || echo "unhealthy")",
      "response_time": "$RESPONSE_TIME",
      "url": "$BACKEND_URL"
    },
    "frontend": {
      "status": "$([ "$FRONTEND_STATUS" = "200" ] && echo "healthy" || echo "unhealthy")",
      "load_time": "$LOAD_TIME",
      "url": "$FRONTEND_URL"
    },
    "database": {
      "status": "$([ -f "$DB_PATH" ] && echo "accessible" || echo "unavailable")",
      "size_mb": "${DB_SIZE_MB:-0}",
      "table_count": "${TABLE_COUNT:-0}"
    }
  },
  "performance": {
    "api_endpoints": $(printf '%s\n' "${API_ENDPOINTS[@]}" | jq -R . | jq -s .),
    "memory_usage_mb": "${NODE_MEMORY:-0}",
    "database_query_times": {
      "email_count": "$EMAIL_COUNT_TIME",
      "analytics": "$ANALYTICS_TIME",
      "fts_search": "${FTS_TIME:-N/A}"
    }
  },
  "gmail_api": {
    "quota_used_percent": "${QUOTA_PERCENTAGE:-0}",
    "sync_status": "$([ "$SYNC_TEST" = "200" ] && echo "functional" || echo "error")"
  },
  "security": {
    "ssl_days_until_expiry": "${DAYS_UNTIL_EXPIRY:-N/A}",
    "security_headers": "$([ "$SECURITY_HEADERS" -ge 2 ] && echo "present" || echo "missing")",
    "jwt_validation": "$([ "$JWT_TEST" = "401" ] && echo "working" || echo "issues")"
  },
  "alerts": $(printf '%s\n' "${ALERTS[@]}" | jq -R . | jq -s .),
  "warnings": $(printf '%s\n' "${WARNINGS[@]}" | jq -R . | jq -s .)
}
EOF

echo "📋 Health report saved: $REPORT_FILE"
```

### 9. Integration with Monitoring Tools

**Prometheus Metrics Export (Optional):**
```bash
# Export metrics in Prometheus format if enabled
if [ "$ENABLE_PROMETHEUS" = "true" ] && [ -n "$PROMETHEUS_GATEWAY" ]; then
    echo "📊 Exporting metrics to Prometheus..."
    
    cat << EOF | curl --data-binary @- "$PROMETHEUS_GATEWAY/metrics/job/email_insight_health"
# HELP email_insight_api_response_time API endpoint response time in seconds
# TYPE email_insight_api_response_time gauge
email_insight_api_response_time{endpoint="/health",environment="${1:-dev}"} $RESPONSE_TIME

# HELP email_insight_memory_usage Memory usage in MB
# TYPE email_insight_memory_usage gauge  
email_insight_memory_usage{environment="${1:-dev}"} ${NODE_MEMORY:-0}

# HELP email_insight_database_size Database size in MB
# TYPE email_insight_database_size gauge
email_insight_database_size{environment="${1:-dev}"} ${DB_SIZE_MB:-0}

# HELP email_insight_gmail_quota_percent Gmail API quota usage percentage
# TYPE email_insight_gmail_quota_percent gauge
email_insight_gmail_quota_percent{environment="${1:-dev}"} ${QUOTA_PERCENTAGE:-0}
EOF
    
    echo "✅ Metrics exported to Prometheus"
fi
```

**Slack/Discord Alert Integration:**
```bash
# Send alerts to Slack/Discord if webhooks configured
if [ ${#ALERTS[@]} -gt 0 ] && [ -n "$SLACK_WEBHOOK_URL" ]; then
    ALERT_MESSAGE="🚨 Email Insight Health Alert - ${1:-dev}\\n\\n"
    for alert in "${ALERTS[@]}"; do
        ALERT_MESSAGE+="❌ $alert\\n"
    done
    
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"$ALERT_MESSAGE\"}" \
        "$SLACK_WEBHOOK_URL" >/dev/null 2>&1
    
    echo "🔔 Alert sent to Slack"
fi
```

## Health Monitoring Report Template

```markdown
# Email Insight Health Report

## 🎯 System Overview
**Environment**: [dev/staging/prod]
**Timestamp**: [ISO 8601 timestamp]
**Overall Status**: [✅ Healthy / ⚠️ Issues / ❌ Critical]

## 🔍 Service Health Status

### Backend API
- **Status**: [✅ Healthy / ❌ Unhealthy]
- **Response Time**: [X.XX]s
- **Critical Endpoints**: [X/Y] responding normally

### Frontend Application  
- **Status**: [✅ Healthy / ❌ Unhealthy]
- **Load Time**: [X.XX]s
- **JavaScript Bundle**: [✅ Available / ❌ Issues]

### Database
- **Status**: [✅ Accessible / ❌ Unavailable]
- **Size**: [X]MB ([X] tables)
- **Query Performance**: [Avg response time]

### Gmail API Integration
- **Authentication**: [✅ Valid / ❌ Expired]
- **Quota Usage**: [X]% ([X]/[Y] requests)
- **Sync Status**: [✅ Functional / ❌ Error]

## 📊 Performance Metrics

### API Performance
- `/health`: [X]ms
- `/api/analytics/overview`: [X]ms  
- `/api/subscriptions/list`: [X]ms

### Resource Usage
- **Memory**: [X]MB
- **Database Size**: [X]MB
- **Log Files**: [X]MB

### Database Performance
- **Email Count Query**: [X]ms
- **Analytics Query**: [X]ms
- **FTS5 Search**: [X]ms

## 🔒 Security Status
- **SSL Certificate**: [Valid for X days / Expired]
- **Security Headers**: [✅ Present / ⚠️ Missing]
- **JWT Validation**: [✅ Working / ⚠️ Issues]

## 🚨 Active Alerts
### Critical Issues
[List of critical alerts or "None"]

### Warnings  
[List of warnings or "None"]

## 📋 Recommendations
- [Performance optimization suggestions]
- [Security improvements needed]
- [Maintenance tasks recommended]

---
**Next Health Check**: [Scheduled time]
**Report Generated**: [Timestamp]
🤖 Generated with [Claude Code](https://claude.ai/code)
```

## Command Usage Examples

### Monitor Development Environment
```bash
monitor-email-insight-health dev
```

### Monitor Production with Alerts
```bash  
ENABLE_PROMETHEUS=true SLACK_WEBHOOK_URL="https://hooks.slack.com/..." monitor-email-insight-health prod
```

### Monitor All Environments
```bash
monitor-email-insight-health all
```

### Continuous Monitoring (Every 5 minutes)
```bash
while true; do
    monitor-email-insight-health staging
    sleep 300
done
```

## Success Criteria
- Real-time health status for all critical services
- Performance metrics within acceptable thresholds  
- Proactive alerting for potential issues
- Comprehensive reporting with actionable insights
- Integration with external monitoring tools
- Automated remediation suggestions
- Historical health trend analysis