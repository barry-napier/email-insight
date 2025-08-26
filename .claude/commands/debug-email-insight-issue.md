# Debug Email Insight Issue

## Introduction
Intelligent debugging and diagnostics system for Email Insight application issues. This command provides automated log analysis, performance bottleneck identification, Gmail API integration debugging, database query optimization, and cross-agent coordination issue detection with actionable remediation suggestions.

## Prerequisites
- Access to application logs and error reporting
- Database access for query analysis
- Gmail API credentials and access logs
- Development or staging environment for testing

## Debug Target
<debug_target> $ARGUMENTS </debug_target>
*Arguments: `performance`, `gmail-api`, `database`, `auth`, `frontend`, `sync`, `all`, or specific error message*

## Main Tasks

### 1. Issue Classification & Context Gathering

**Automated Issue Detection:**
```bash
echo "🔍 Email Insight Debug Analysis - $(date)"
echo "Debug target: ${1:-all}"

# Create debug session directory
DEBUG_SESSION="debug-session-$(date +%Y%m%d-%H%M%S)"
mkdir -p "debug-logs/$DEBUG_SESSION"

# Gather system context
echo "📋 Gathering system context..."
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "OS: $(uname -s) $(uname -r)"
echo "Architecture: $(uname -m)"

# Check if services are running
BACKEND_RUNNING=$(pgrep -f "npm run dev\|hono" | wc -l)
FRONTEND_RUNNING=$(pgrep -f "next dev" | wc -l)

echo "Backend processes: $BACKEND_RUNNING"
echo "Frontend processes: $FRONTEND_RUNNING"
```

**Log Collection & Analysis:**
```bash
echo "📄 Collecting and analyzing logs..."

# Collect recent logs from various sources
LOG_SOURCES=(
    "logs/application.log"
    "logs/error.log"
    "logs/gmail-api.log"
    "logs/database.log"
    "/tmp/email-insight-*.log"
)

for log_source in "${LOG_SOURCES[@]}"; do
    if [ -f "$log_source" ] || ls $log_source >/dev/null 2>&1; then
        echo "Analyzing $log_source..."
        
        # Extract recent errors (last 100 lines)
        if ls $log_source >/dev/null 2>&1; then
            tail -100 $log_source > "debug-logs/$DEBUG_SESSION/$(basename $log_source .log)-recent.log" 2>/dev/null || true
        fi
        
        # Count error patterns
        ERROR_COUNT=$(grep -i "error\|exception\|fail" $log_source 2>/dev/null | wc -l || echo "0")
        WARNING_COUNT=$(grep -i "warn\|warning" $log_source 2>/dev/null | wc -l || echo "0")
        
        echo "  Errors: $ERROR_COUNT, Warnings: $WARNING_COUNT"
    fi
done
```

### 2. Performance Issue Debugging

**Performance Bottleneck Analysis:**
```bash
if [[ "${1:-all}" == "performance" ]] || [[ "${1:-all}" == "all" ]]; then
    echo "🚀 Performance debugging analysis..."
    
    # API endpoint performance testing
    echo "Testing API endpoint performance..."
    API_ENDPOINTS=(
        "/health"
        "/api/auth/status"
        "/api/analytics/overview"
        "/api/subscriptions/list"
        "/api/sync/status"
    )
    
    BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
    PERFORMANCE_ISSUES=()
    
    for endpoint in "${API_ENDPOINTS[@]}"; do
        echo "  Testing $endpoint..."
        
        # Run 5 requests and calculate average
        TOTAL_TIME=0
        SUCCESSFUL_REQUESTS=0
        
        for i in {1..5}; do
            RESPONSE_TIME=$(curl -w "%{time_total}" -s -o /dev/null "$BACKEND_URL$endpoint" 2>/dev/null || echo "999")
            HTTP_STATUS=$(curl -w "%{http_code}" -s -o /dev/null "$BACKEND_URL$endpoint" 2>/dev/null || echo "000")
            
            if [ "$HTTP_STATUS" = "200" ]; then
                TOTAL_TIME=$(echo "$TOTAL_TIME + $RESPONSE_TIME" | bc -l 2>/dev/null || echo "$TOTAL_TIME")
                ((SUCCESSFUL_REQUESTS++))
            fi
            sleep 0.1
        done
        
        if [ "$SUCCESSFUL_REQUESTS" -gt 0 ]; then
            AVG_TIME=$(echo "scale=3; $TOTAL_TIME / $SUCCESSFUL_REQUESTS" | bc -l 2>/dev/null || echo "999")
            
            if [ "${AVG_TIME%.*}" -ge 1 ]; then
                PERFORMANCE_ISSUES+=("$endpoint: ${AVG_TIME}s average response time")
                echo "    ❌ SLOW: ${AVG_TIME}s average"
            elif [ "${AVG_TIME%.*}" -ge 1 ] || [[ "$AVG_TIME" == 0.* ]] && [[ "${AVG_TIME#*.}" -gt 500 ]]; then
                echo "    ⚠️  MODERATE: ${AVG_TIME}s average"
            else
                echo "    ✅ GOOD: ${AVG_TIME}s average"
            fi
        else
            PERFORMANCE_ISSUES+=("$endpoint: All requests failed")
            echo "    ❌ ERROR: All requests failed"
        fi
    done
    
    # Memory usage analysis
    echo "Analyzing memory usage patterns..."
    if command -v ps >/dev/null 2>&1; then
        NODE_PROCESSES=$(ps aux | grep node | grep -v grep)
        echo "$NODE_PROCESSES" > "debug-logs/$DEBUG_SESSION/node-processes.log"
        
        HIGHEST_MEMORY=$(echo "$NODE_PROCESSES" | sort -k6 -nr | head -1 | awk '{print $6/1024 " MB - " $11 " " $12}')
        echo "  Highest memory usage: $HIGHEST_MEMORY"
        
        TOTAL_NODE_MEMORY=$(echo "$NODE_PROCESSES" | awk '{sum+=$6} END {printf "%.1f MB", sum/1024}')
        echo "  Total Node.js memory: $TOTAL_NODE_MEMORY"
    fi
    
    # Check for memory leaks
    echo "Checking for potential memory leaks..."
    if [ -f "debug-logs/$DEBUG_SESSION/node-processes.log" ]; then
        # Simple check: if any process is using >500MB, flag it
        HIGH_MEMORY_PROCESSES=$(awk '$6/1024 > 500 {print $6/1024 " MB - " $11 " " $12}' "debug-logs/$DEBUG_SESSION/node-processes.log")
        if [ -n "$HIGH_MEMORY_PROCESSES" ]; then
            echo "  ⚠️  High memory usage processes detected:"
            echo "$HIGH_MEMORY_PROCESSES"
        else
            echo "  ✅ No obvious memory leaks detected"
        fi
    fi
fi
```

### 3. Gmail API Integration Debugging

**Gmail API Issue Analysis:**
```bash
if [[ "${1:-all}" == "gmail-api" ]] || [[ "${1:-all}" == "all" ]]; then
    echo "📧 Gmail API debugging analysis..."
    
    # OAuth2 token status check
    echo "Checking OAuth2 token status..."
    if [ -f ".env.local" ] && grep -q "GOOGLE_CLIENT_ID" .env.local; then
        echo "  ✅ OAuth2 credentials configured"
        
        # Test token endpoint
        TOKEN_STATUS=$(curl -s -w "%{http_code}" -o /dev/null "${BACKEND_URL:-http://localhost:3001}/api/auth/gmail/status" 2>/dev/null || echo "000")
        
        if [ "$TOKEN_STATUS" = "200" ]; then
            echo "  ✅ Token endpoint accessible"
        else
            echo "  ❌ Token endpoint error (HTTP $TOKEN_STATUS)"
        fi
    else
        echo "  ❌ OAuth2 credentials not configured"
    fi
    
    # Check Gmail API quota and usage
    echo "Analyzing Gmail API usage patterns..."
    if [ -f "logs/gmail-api.log" ]; then
        # Extract API call patterns from logs
        QUOTA_ERRORS=$(grep -i "quota\|limit\|rate" logs/gmail-api.log | wc -l)
        AUTH_ERRORS=$(grep -i "auth\|token\|credential" logs/gmail-api.log | wc -l)
        SYNC_ERRORS=$(grep -i "sync\|fetch\|message" logs/gmail-api.log | wc -l)
        
        echo "  Quota/Rate limit errors: $QUOTA_ERRORS"
        echo "  Authentication errors: $AUTH_ERRORS"
        echo "  Sync/Fetch errors: $SYNC_ERRORS"
        
        if [ "$QUOTA_ERRORS" -gt 5 ]; then
            echo "  ⚠️  High number of quota errors - check API usage patterns"
        fi
        
        if [ "$AUTH_ERRORS" -gt 0 ]; then
            echo "  ⚠️  Authentication issues detected - check token refresh logic"
        fi
        
        # Extract recent API errors
        grep -i "error\|exception" logs/gmail-api.log | tail -10 > "debug-logs/$DEBUG_SESSION/gmail-api-errors.log" 2>/dev/null || true
    else
        echo "  ⚠️  No Gmail API logs found"
    fi
    
    # Test Gmail API connectivity
    echo "Testing Gmail API connectivity..."
    API_TEST=$(curl -s "${BACKEND_URL:-http://localhost:3001}/api/sync/test" 2>/dev/null || echo '{"error": "unreachable"}')
    
    if echo "$API_TEST" | grep -q "success\|authenticated"; then
        echo "  ✅ Gmail API connectivity working"
    else
        echo "  ❌ Gmail API connectivity issues"
        echo "  Response: $API_TEST" | head -200
    fi
fi
```

### 4. Database Performance Debugging

**Database Issue Analysis:**
```bash
if [[ "${1:-all}" == "database" ]] || [[ "${1:-all}" == "all" ]]; then
    echo "🗄️  Database debugging analysis..."
    
    DB_PATH="${DB_PATH:-./database/email-insight.db}"
    
    if [ -f "$DB_PATH" ]; then
        echo "Database file: $DB_PATH"
        
        # Database integrity check
        echo "Running database integrity check..."
        INTEGRITY_CHECK=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>/dev/null || echo "error")
        
        if [ "$INTEGRITY_CHECK" = "ok" ]; then
            echo "  ✅ Database integrity: OK"
        else
            echo "  ❌ Database integrity issues detected"
            echo "  Result: $INTEGRITY_CHECK"
        fi
        
        # Analyze database statistics
        echo "Analyzing database statistics..."
        DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
        TABLE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
        
        echo "  Database size: $DB_SIZE"
        echo "  Table count: $TABLE_COUNT"
        
        # Check table sizes and record counts
        echo "Table analysis:"
        TABLES=$(sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "")
        
        for table in $TABLES; do
            if [ -n "$table" ] && [ "$table" != "sqlite_sequence" ]; then
                RECORD_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM [$table];" 2>/dev/null || echo "error")
                echo "    $table: $RECORD_COUNT records"
                
                # Flag tables with unusually high record counts
                if [ "$RECORD_COUNT" != "error" ] && [ "$RECORD_COUNT" -gt 100000 ]; then
                    echo "      ⚠️  Large table - consider archiving or optimization"
                fi
            fi
        done
        
        # Query performance analysis
        echo "Testing query performance..."
        
        # Test common queries with timing
        QUERIES=(
            "SELECT COUNT(*) FROM emails"
            "SELECT sender, COUNT(*) FROM emails GROUP BY sender LIMIT 10"
            "SELECT * FROM subscriptions LIMIT 10"
        )
        
        for query in "${QUERIES[@]}"; do
            echo "  Testing: $query"
            START_TIME=$(date +%s%3N)
            RESULT=$(sqlite3 "$DB_PATH" "$query" 2>/dev/null || echo "error")
            END_TIME=$(date +%s%3N)
            DURATION=$((END_TIME - START_TIME))
            
            if [ "$RESULT" != "error" ]; then
                if [ "$DURATION" -gt 1000 ]; then
                    echo "    ❌ SLOW: ${DURATION}ms"
                elif [ "$DURATION" -gt 100 ]; then
                    echo "    ⚠️  MODERATE: ${DURATION}ms"
                else
                    echo "    ✅ FAST: ${DURATION}ms"
                fi
            else
                echo "    ❌ ERROR: Query failed"
            fi
        done
        
        # Check for missing indexes
        echo "Analyzing index usage..."
        INDEX_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='index';" 2>/dev/null || echo "0")
        echo "  Index count: $INDEX_COUNT"
        
        # Suggest indexes for common query patterns
        echo "Index recommendations:"
        if sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE '%sender%';" | grep -q sender; then
            echo "  ✅ Sender index exists"
        else
            echo "  💡 Consider adding index on sender column"
        fi
        
        if sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE '%timestamp%';" | grep -q timestamp; then
            echo "  ✅ Timestamp index exists"
        else
            echo "  💡 Consider adding index on timestamp column"
        fi
        
    else
        echo "  ❌ Database file not found: $DB_PATH"
    fi
fi
```

### 5. Authentication & Security Debugging

**Authentication Issue Analysis:**
```bash
if [[ "${1:-all}" == "auth" ]] || [[ "${1:-all}" == "all" ]]; then
    echo "🔐 Authentication debugging analysis..."
    
    # JWT configuration check
    echo "Checking JWT configuration..."
    if [ -f ".env.local" ] && grep -q "JWT_SECRET" .env.local; then
        JWT_SECRET_LENGTH=$(grep "JWT_SECRET" .env.local | cut -d'=' -f2 | wc -c)
        
        if [ "$JWT_SECRET_LENGTH" -gt 32 ]; then
            echo "  ✅ JWT secret configured (${JWT_SECRET_LENGTH} characters)"
        else
            echo "  ⚠️  JWT secret too short (${JWT_SECRET_LENGTH} characters)"
        fi
    else
        echo "  ❌ JWT_SECRET not configured"
    fi
    
    # Test authentication endpoints
    echo "Testing authentication endpoints..."
    AUTH_ENDPOINTS=(
        "/api/auth/status"
        "/api/auth/login"
        "/api/auth/logout"
    )
    
    for endpoint in "${AUTH_ENDPOINTS[@]}"; do
        echo "  Testing $endpoint..."
        AUTH_STATUS=$(curl -s -w "%{http_code}" -o /dev/null "${BACKEND_URL:-http://localhost:3001}$endpoint" 2>/dev/null || echo "000")
        
        case $AUTH_STATUS in
            200) echo "    ✅ Accessible" ;;
            401) echo "    ✅ Requires authentication (expected)" ;;
            404) echo "    ❌ Not found" ;;
            500) echo "    ❌ Server error" ;;
            000) echo "    ❌ Unreachable" ;;
            *) echo "    ⚠️  Unexpected status: $AUTH_STATUS" ;;
        esac
    done
    
    # Check for common authentication issues
    echo "Checking common authentication issues..."
    
    # CORS configuration
    CORS_TEST=$(curl -s -H "Origin: http://localhost:3000" -I "${BACKEND_URL:-http://localhost:3001}/api/auth/status" 2>/dev/null | grep -i "access-control-allow-origin")
    
    if [ -n "$CORS_TEST" ]; then
        echo "  ✅ CORS headers present"
    else
        echo "  ⚠️  CORS headers missing - may cause frontend auth issues"
    fi
    
    # Session/token persistence check
    if [ -f "logs/auth.log" ]; then
        TOKEN_REFRESH_ERRORS=$(grep -i "refresh\|expire\|invalid" logs/auth.log | wc -l)
        echo "  Token refresh errors: $TOKEN_REFRESH_ERRORS"
        
        if [ "$TOKEN_REFRESH_ERRORS" -gt 5 ]; then
            echo "  ⚠️  High number of token issues - check refresh logic"
        fi
    fi
fi
```

### 6. Frontend Issue Debugging

**Frontend Error Analysis:**
```bash
if [[ "${1:-all}" == "frontend" ]] || [[ "${1:-all}" == "all" ]]; then
    echo "🌐 Frontend debugging analysis..."
    
    # Check if frontend is accessible
    FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
    FRONTEND_STATUS=$(curl -s -w "%{http_code}" -o /dev/null "$FRONTEND_URL" 2>/dev/null || echo "000")
    
    echo "Frontend status: $FRONTEND_STATUS"
    
    if [ "$FRONTEND_STATUS" = "200" ]; then
        echo "  ✅ Frontend accessible"
        
        # Check for JavaScript errors in the page
        FRONTEND_CONTENT=$(curl -s "$FRONTEND_URL" 2>/dev/null || echo "")
        
        if echo "$FRONTEND_CONTENT" | grep -q "Application error\|500\|Error"; then
            echo "  ⚠️  Frontend shows error content"
        else
            echo "  ✅ Frontend content loads normally"
        fi
        
        # Test JavaScript bundle loading
        JS_BUNDLE=$(curl -s -w "%{http_code}" -o /dev/null "$FRONTEND_URL/_next/static/chunks/main.js" 2>/dev/null || echo "404")
        
        if [ "$JS_BUNDLE" = "200" ]; then
            echo "  ✅ JavaScript bundle loads"
        else
            echo "  ⚠️  JavaScript bundle issues (HTTP $JS_BUNDLE)"
        fi
        
    else
        echo "  ❌ Frontend not accessible"
    fi
    
    # Check Next.js specific logs
    if [ -f "logs/next.log" ] || [ -f ".next/trace" ]; then
        echo "Analyzing Next.js logs..."
        
        # Look for build errors
        BUILD_ERRORS=$(grep -i "error\|fail" .next/trace 2>/dev/null | wc -l || echo "0")
        echo "  Build errors: $BUILD_ERRORS"
        
        if [ "$BUILD_ERRORS" -gt 0 ]; then
            echo "  ❌ Build errors detected"
            grep -i "error\|fail" .next/trace 2>/dev/null | tail -5
        fi
    fi
    
    # Check for console errors (if browser automation available)
    echo "💡 Manual check needed: Open browser dev tools and check console for JavaScript errors"
fi
```

### 7. Email Sync Issue Debugging

**Email Synchronization Analysis:**
```bash
if [[ "${1:-all}" == "sync" ]] || [[ "${1:-all}" == "all" ]]; then
    echo "🔄 Email sync debugging analysis..."
    
    # Check sync status
    SYNC_STATUS=$(curl -s "${BACKEND_URL:-http://localhost:3001}/api/sync/status" 2>/dev/null || echo '{"error": "unreachable"}')
    
    echo "Current sync status:"
    echo "$SYNC_STATUS" | head -200
    
    # Analyze sync performance
    if [ -f "logs/sync.log" ]; then
        echo "Analyzing sync logs..."
        
        # Count sync operations
        SYNC_ATTEMPTS=$(grep -i "sync start\|sync begin" logs/sync.log | wc -l)
        SYNC_COMPLETIONS=$(grep -i "sync complete\|sync success" logs/sync.log | wc -l)
        SYNC_ERRORS=$(grep -i "sync error\|sync fail" logs/sync.log | wc -l)
        
        echo "  Sync attempts: $SYNC_ATTEMPTS"
        echo "  Sync completions: $SYNC_COMPLETIONS"
        echo "  Sync errors: $SYNC_ERRORS"
        
        if [ "$SYNC_ATTEMPTS" -gt 0 ]; then
            SUCCESS_RATE=$((SYNC_COMPLETIONS * 100 / SYNC_ATTEMPTS))
            echo "  Success rate: ${SUCCESS_RATE}%"
            
            if [ "$SUCCESS_RATE" -lt 80 ]; then
                echo "  ⚠️  Low sync success rate"
            fi
        fi
        
        # Extract recent sync errors
        echo "Recent sync errors:"
        grep -i "error\|exception" logs/sync.log | tail -5
        
        # Check for specific sync issues
        QUOTA_EXCEEDED=$(grep -i "quota\|rate limit" logs/sync.log | wc -l)
        TOKEN_ISSUES=$(grep -i "token\|auth\|credential" logs/sync.log | wc -l)
        NETWORK_ISSUES=$(grep -i "network\|timeout\|connection" logs/sync.log | wc -l)
        
        echo "Issue breakdown:"
        echo "  Quota/Rate limit: $QUOTA_EXCEEDED"
        echo "  Token/Auth: $TOKEN_ISSUES"
        echo "  Network: $NETWORK_ISSUES"
    else
        echo "  ⚠️  No sync logs found"
    fi
    
    # Test email parsing functionality
    echo "Testing email parsing..."
    if [ -f "test-email.eml" ]; then
        PARSE_TEST=$(curl -s -X POST -F "email=@test-email.eml" "${BACKEND_URL:-http://localhost:3001}/api/debug/parse-email" 2>/dev/null || echo "error")
        
        if echo "$PARSE_TEST" | grep -q "success\|parsed"; then
            echo "  ✅ Email parsing working"
        else
            echo "  ❌ Email parsing issues"
        fi
    else
        echo "  💡 No test email available for parsing test"
    fi
fi
```

### 8. Automated Issue Resolution Suggestions

**Intelligent Remediation Suggestions:**
```bash
echo "🔧 Generating remediation suggestions..."

SUGGESTIONS=()

# Performance suggestions
if [ ${#PERFORMANCE_ISSUES[@]} -gt 0 ]; then
    SUGGESTIONS+=("PERFORMANCE: Optimize slow API endpoints:")
    for issue in "${PERFORMANCE_ISSUES[@]}"; do
        SUGGESTIONS+=("  - $issue")
    done
    SUGGESTIONS+=("  💡 Consider adding caching, database indexing, or query optimization")
fi

# Memory suggestions
if command -v ps >/dev/null 2>&1; then
    TOTAL_NODE_MEMORY_NUM=$(ps aux | grep node | grep -v grep | awk '{sum+=$6} END {printf "%.0f", sum/1024}')
    if [ "${TOTAL_NODE_MEMORY_NUM:-0}" -gt 500 ]; then
        SUGGESTIONS+=("MEMORY: High memory usage detected (${TOTAL_NODE_MEMORY_NUM}MB)")
        SUGGESTIONS+=("  💡 Check for memory leaks, optimize data structures, implement pagination")
    fi
fi

# Database suggestions
if [ -f "$DB_PATH" ]; then
    DB_SIZE_MB=$(du -m "$DB_PATH" | cut -f1)
    if [ "$DB_SIZE_MB" -gt 100 ]; then
        SUGGESTIONS+=("DATABASE: Large database size (${DB_SIZE_MB}MB)")
        SUGGESTIONS+=("  💡 Consider data archiving, table partitioning, or cleanup of old records")
    fi
fi

# Gmail API suggestions
if [ -n "$QUOTA_ERRORS" ] && [ "$QUOTA_ERRORS" -gt 5 ]; then
    SUGGESTIONS+=("GMAIL_API: High quota error rate ($QUOTA_ERRORS errors)")
    SUGGESTIONS+=("  💡 Implement exponential backoff, batch requests, or optimize sync frequency")
fi

# Authentication suggestions
if grep -q "JWT_SECRET" .env.local 2>/dev/null; then
    JWT_SECRET_LENGTH=$(grep "JWT_SECRET" .env.local | cut -d'=' -f2 | wc -c)
    if [ "$JWT_SECRET_LENGTH" -lt 32 ]; then
        SUGGESTIONS+=("SECURITY: JWT secret too short")
        SUGGESTIONS+=("  💡 Generate a longer, more secure JWT secret (32+ characters)")
    fi
else
    SUGGESTIONS+=("SECURITY: JWT_SECRET not configured")
    SUGGESTIONS+=("  💡 Add JWT_SECRET to .env.local with a secure random string")
fi

# Display suggestions
if [ ${#SUGGESTIONS[@]} -gt 0 ]; then
    echo "Automated remediation suggestions:"
    for suggestion in "${SUGGESTIONS[@]}"; do
        echo "$suggestion"
    done
else
    echo "✅ No specific issues detected requiring immediate attention"
fi
```

### 9. Debug Report Generation

**Comprehensive Debug Report:**
```bash
# Generate debug report
REPORT_FILE="debug-logs/$DEBUG_SESSION/debug-report.md"

cat > "$REPORT_FILE" << EOF
# Email Insight Debug Report

## Debug Session Information
**Timestamp**: $(date -u +%Y-%m-%dT%H:%M:%SZ)
**Debug Target**: ${1:-all}
**Environment**: $(uname -s) $(uname -r)
**Node.js Version**: $(node --version)

## System Status Overview
**Backend Processes**: $BACKEND_RUNNING
**Frontend Processes**: $FRONTEND_RUNNING
**Database**: $([ -f "$DB_PATH" ] && echo "Available" || echo "Not Found")

## Performance Analysis
$(if [ ${#PERFORMANCE_ISSUES[@]} -gt 0 ]; then
    echo "### Issues Detected"
    printf '- %s\n' "${PERFORMANCE_ISSUES[@]}"
else
    echo "### Status: ✅ No performance issues detected"
fi)

## Service Health
- **Backend API**: $([ "$BACKEND_RUNNING" -gt 0 ] && echo "Running" || echo "Not Running")
- **Frontend**: $([ "$FRONTEND_RUNNING" -gt 0 ] && echo "Running" || echo "Not Running")
- **Database**: $([ -f "$DB_PATH" ] && echo "Accessible" || echo "Inaccessible")

## Log Analysis Summary
- **Application Logs**: $([ -f "logs/application.log" ] && echo "Available" || echo "Not Found")
- **Error Logs**: $([ -f "logs/error.log" ] && echo "Available" || echo "Not Found")
- **Gmail API Logs**: $([ -f "logs/gmail-api.log" ] && echo "Available" || echo "Not Found")

## Remediation Suggestions
$(if [ ${#SUGGESTIONS[@]} -gt 0 ]; then
    printf '%s\n' "${SUGGESTIONS[@]}"
else
    echo "No specific remediation suggestions at this time."
fi)

## Files Collected
$(ls -la "debug-logs/$DEBUG_SESSION/" | tail -n +2)

## Next Steps
1. Review collected logs in debug-logs/$DEBUG_SESSION/
2. Implement suggested fixes based on issue analysis
3. Re-run debug analysis after applying fixes
4. Consider implementing monitoring for proactive issue detection

---
**Debug Report Generated**: $(date)
🤖 Generated with [Claude Code](https://claude.ai/code)
EOF

echo "📋 Debug report saved: $REPORT_FILE"
```

### 10. Integration with Development Workflow

**Automated Fix Implementation:**
```bash
echo "🔧 Checking for automated fixes..."

AUTO_FIX_AVAILABLE=false

# Simple automated fixes
if [ ! -f ".env.local" ] && [ -f ".env.template" ]; then
    echo "💡 Auto-fix available: Copy .env.template to .env.local"
    echo "Run: cp .env.template .env.local"
    AUTO_FIX_AVAILABLE=true
fi

if [ -d "node_modules" ] && [ ! -f "package-lock.json" ]; then
    echo "💡 Auto-fix available: Reinstall dependencies"
    echo "Run: rm -rf node_modules && npm install"
    AUTO_FIX_AVAILABLE=true
fi

if [ "$AUTO_FIX_AVAILABLE" = "false" ]; then
    echo "No automated fixes available - manual intervention required"
fi

# Suggest next debugging steps
echo ""
echo "🎯 Suggested next actions:"
echo "1. Review debug report: debug-logs/$DEBUG_SESSION/debug-report.md"
echo "2. Check collected logs for detailed error messages"
echo "3. Run health monitoring: monitor-email-insight-health"
echo "4. Consider resetting environment: reset-email-insight-dev-env"
```

## Debug Report Template

```markdown
# Email Insight Debug Analysis Report

## 🎯 Debug Session Summary
**Target**: [performance/gmail-api/database/auth/frontend/sync/all]
**Timestamp**: [ISO 8601 timestamp]
**Duration**: [X minutes]
**Overall Status**: [✅ Resolved / ⚠️ Issues Found / ❌ Critical Issues]

## 🔍 Issues Identified

### Critical Issues (Immediate Action Required)
[List of critical issues or "None detected"]

### Performance Issues
[List of performance bottlenecks or "None detected"]

### Integration Issues  
[List of API/service integration problems or "None detected"]

## 📊 System Analysis Results

### Performance Metrics
- **API Response Times**: [Average/slowest endpoints]
- **Memory Usage**: [Current usage and trends]
- **Database Performance**: [Query times and optimization needs]

### Service Health
- **Backend API**: [Status and issues]
- **Frontend Application**: [Status and issues]
- **Database**: [Status, size, integrity]
- **Gmail API**: [Authentication, quota, sync status]

### Error Pattern Analysis
- **Log Errors**: [Count and patterns]
- **Authentication Errors**: [OAuth2/JWT issues]
- **Sync Errors**: [Gmail sync problems]

## 🔧 Remediation Recommendations

### Immediate Actions
1. [Action 1 with priority level]
2. [Action 2 with priority level]
3. [Action 3 with priority level]

### Performance Optimizations
- [Database indexing recommendations]
- [API caching suggestions]
- [Memory optimization strategies]

### Security Improvements
- [Authentication strengthening]
- [Configuration security fixes]
- [Access control improvements]

## 📁 Debug Artifacts
- **Debug Session**: [debug-logs/session-folder]
- **Log Files**: [List of collected log files]
- **Performance Data**: [Metrics and timing data]
- **Error Traces**: [Stack traces and error details]

## 🎯 Next Steps
1. **Priority 1**: [Immediate critical fixes]
2. **Priority 2**: [Performance improvements]
3. **Priority 3**: [Preventive measures]

## 📈 Follow-up Actions
- [ ] Implement suggested fixes
- [ ] Run validation testing
- [ ] Update monitoring thresholds
- [ ] Document lessons learned

---
**Debug Analysis Complete**
**Recommended Tools**: [List of useful commands/tools for follow-up]

🤖 Generated with [Claude Code](https://claude.ai/code)
```

## Command Usage Examples

### Debug Performance Issues
```bash
debug-email-insight-issue performance
```

### Debug Gmail API Problems
```bash
debug-email-insight-issue gmail-api
```

### Debug Database Performance
```bash
debug-email-insight-issue database
```

### Comprehensive Debug Analysis
```bash
debug-email-insight-issue all
```

### Debug Specific Error Message
```bash
debug-email-insight-issue "Token refresh failed"
```

## Success Criteria
- Rapid identification of root causes for common issues
- Automated log analysis with pattern recognition
- Performance bottleneck detection and optimization suggestions
- Gmail API integration debugging with quota monitoring
- Database performance analysis with query optimization
- Security and authentication issue identification
- Comprehensive debug reports with actionable recommendations
- Integration with existing development workflow and monitoring tools