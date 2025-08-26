# Email Insight Deploy - Automated Production Deployment

## Introduction
Streamlined deployment command that leverages Claude's devops-deployment-optimizer agent for zero-downtime production deployment. Replaces complex manual deployment procedures with intelligent agent-driven automation.

## Usage
```bash
email-insight-deploy [staging|production|rollback]
```

## Automated Deployment Pipeline

### Deployment Strategy Agent Invocation
```javascript
Task({
  subagent_type: "devops-deployment-optimizer",
  description: "Deploy Email Insight to production",
  prompt: `
    Execute production deployment for Email Insight:
    
    Environment: ${targetEnvironment}
    Git Commit: ${currentCommit}
    
    Deployment Requirements:
    1. Zero-Downtime Deployment
       - Blue-green deployment strategy
       - Health checks before traffic switch
       - Automatic rollback on failure
       - Load balancer management
    
    2. Container Management
       - Build Docker images for backend/frontend
       - Tag images with git commit hash
       - Deploy to container orchestration
       - Update service definitions
    
    3. Database Management
       - Execute migrations safely
       - Create backup before changes
       - Verify schema integrity
       - Optimize performance (VACUUM, ANALYZE)
    
    4. Environment Configuration
       - Update environment variables
       - Rotate secrets if needed
       - Configure SSL certificates
       - Set up monitoring endpoints
    
    5. Health Validation
       - API endpoint health checks
       - Database connectivity tests
       - Gmail API integration tests
       - Frontend load testing
    
    6. Monitoring Setup
       - Configure Prometheus metrics
       - Set up Grafana dashboards
       - Configure alerting rules
       - Set up log aggregation
    
    Return:
    - Deployment status report
    - Health check results
    - Performance metrics
    - Rollback instructions
    - Monitoring dashboard links
  `
})
```

### Pre-Deployment Validation

```javascript
// Invoke security-guardian for final security check
Task({
  subagent_type: "security-guardian",
  description: "Pre-deployment security validation",
  prompt: `
    Perform final security validation before production deployment:
    
    Security Checklist:
    - Verify all secrets are encrypted
    - Check for exposed API keys
    - Validate SSL configuration
    - Confirm security headers
    - Check for debugging code
    - Validate CORS settings
    - Confirm rate limiting
    - Check authentication flows
    
    Return security clearance or block deployment.
  `
})
```

### Infrastructure Preparation

```javascript
// Invoke analytics-engine for capacity planning
Task({
  subagent_type: "analytics-engine",
  description: "Analyze capacity requirements",
  prompt: `
    Analyze capacity and performance requirements for production:
    
    Capacity Planning:
    - Estimate resource requirements
    - Calculate database storage needs
    - Plan for expected user load
    - Identify performance bottlenecks
    - Recommend scaling strategies
    
    Return capacity recommendations and resource allocation.
  `
})
```

## Environment-Specific Configuration

### Staging Deployment
```javascript
if (environment === 'staging') {
  const stagingConfig = {
    resources: {
      cpu: "1 core",
      memory: "512MB",
      storage: "10GB"
    },
    databases: {
      primary: "staging-db",
      backup: true,
      retention: "7 days"
    },
    monitoring: {
      level: "basic",
      alerts: "email"
    }
  }
  
  deployWithConfig(stagingConfig)
}
```

### Production Deployment
```javascript
if (environment === 'production') {
  const prodConfig = {
    resources: {
      cpu: "2 cores",
      memory: "1GB",
      storage: "50GB"
    },
    databases: {
      primary: "prod-db",
      backup: true,
      retention: "30 days",
      replication: true
    },
    monitoring: {
      level: "comprehensive",
      alerts: "slack + pager",
      dashboards: "grafana"
    },
    security: {
      ssl: true,
      encryption: "AES-256",
      backups: "encrypted",
      audit_logging: true
    }
  }
  
  deployWithConfig(prodConfig)
}
```

## Automated Rollback Strategy

```javascript
// If deployment fails or health checks fail
if (deploymentStatus === 'FAILED') {
  Task({
    subagent_type: "devops-deployment-optimizer",
    description: "Execute automatic rollback",
    prompt: `
      Deployment failed. Execute automatic rollback:
      
      Rollback Strategy:
      1. Switch load balancer back to previous version
      2. Restore database from backup if migrations ran
      3. Update DNS if needed
      4. Verify services are healthy
      5. Send alert notifications
      
      Previous Version: ${previousDeployment.version}
      Database Backup: ${previousDeployment.dbBackup}
      
      Return rollback status and system health.
    `
  })
}
```

## Monitoring and Alerting Setup

```javascript
// Configure monitoring after successful deployment
Task({
  subagent_type: "analytics-engine",
  description: "Set up production monitoring",
  prompt: `
    Configure comprehensive monitoring for Email Insight production:
    
    Monitoring Configuration:
    1. Application Metrics
       - API response times (P95, P99)
       - Error rates by endpoint
       - Active user sessions
       - Gmail API quota usage
    
    2. Infrastructure Metrics
       - CPU and memory usage
       - Database performance
       - Network latency
       - Storage utilization
    
    3. Business Metrics
       - User registrations
       - Email sync volumes
       - Subscription detections
       - Unsubscribe actions
    
    4. Alert Thresholds
       - API errors > 1%
       - Response time > 500ms
       - Memory usage > 80%
       - Gmail quota > 90%
    
    Return monitoring dashboard URLs and alert configurations.
  `
})
```

## Deployment Progress Tracking

```javascript
TodoWrite({
  todos: [
    { content: "Pre-deployment security check", status: "completed" },
    { content: "Infrastructure preparation", status: "completed" },
    { content: "Database migration", status: "in_progress" },
    { content: "Container deployment", status: "pending" },
    { content: "Load balancer switch", status: "pending" },
    { content: "Health validation", status: "pending" },
    { content: "Monitoring setup", status: "pending" },
    { content: "Documentation update", status: "pending" }
  ]
})
```

## Deployment Verification

```javascript
// Automated health checks after deployment
const healthChecks = [
  {
    name: "API Health",
    endpoint: "/health",
    expected: 200,
    timeout: 5000
  },
  {
    name: "Database Connection",
    test: "SELECT COUNT(*) FROM emails",
    expected: "number",
    timeout: 1000
  },
  {
    name: "Gmail Integration",
    endpoint: "/api/auth/gmail/status",
    expected: "authenticated",
    timeout: 10000
  },
  {
    name: "Frontend Load",
    endpoint: "/",
    expected: 200,
    timeout: 3000
  }
]

// Run health checks
const healthResults = await runHealthChecks(healthChecks)
if (healthResults.every(r => r.status === 'PASS')) {
  console.log("✅ Deployment successful - all health checks passed")
} else {
  console.log("❌ Deployment issues detected - initiating rollback")
  triggerRollback()
}
```

## Deployment Report Generation

```javascript
// Generate comprehensive deployment report
const deploymentReport = {
  deployment: {
    id: deploymentId,
    timestamp: new Date().toISOString(),
    environment: targetEnvironment,
    version: gitCommitHash,
    status: deploymentStatus
  },
  
  changes: {
    commits: commitsSinceLastDeploy,
    features: newFeaturesDeployed,
    bugfixes: bugfixesIncluded,
    migrations: databaseMigrations
  },
  
  performance: {
    deploymentTime: deploymentDuration,
    healthCheckTime: healthCheckDuration,
    rollbackTime: rollbackDuration || null
  },
  
  monitoring: {
    dashboardUrls: monitoringDashboards,
    alertChannels: alertConfigurations,
    logStreams: logAggregationUrls
  }
}

// Save and share report
fs.writeFileSync(`deployment-reports/deploy-${deploymentId}.json`, JSON.stringify(deploymentReport, null, 2))
postToSlack(deploymentReport)
```

## Example Execution

```bash
# User runs:
email-insight-deploy production

# Command automatically:
1. Invokes security-guardian for final security check
2. Invokes analytics-engine for capacity planning  
3. Invokes devops-deployment-optimizer for deployment
4. Executes blue-green deployment with health checks
5. Switches traffic only after validation
6. Sets up monitoring and alerting
7. Generates deployment report
8. Notifies team of success/failure
```

## Success Criteria
- Zero-downtime deployment achieved
- All health checks pass before traffic switch
- Monitoring and alerting configured automatically
- Rollback capability tested and ready
- Comprehensive deployment reporting
- Team notifications sent
- No manual intervention required unless issues arise