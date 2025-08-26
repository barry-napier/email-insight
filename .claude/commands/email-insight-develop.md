# Email Insight Develop - Streamlined Multi-Agent Development

## Introduction
Simplified orchestration command that automatically coordinates multiple Claude subagents to implement Email Insight features. This command replaces 6 manual commands with intelligent agent invocation using the Task tool.

## Usage
```bash
email-insight-develop [issue-number|feature-description]
```

## Automated Workflow

### Phase 1: Requirement Analysis
```javascript
// Automatically invoked when command runs
Task({
  subagent_type: "product-owner",
  description: "Analyze and validate requirements",
  prompt: `
    Review Email Insight issue #${issueNumber}:
    1. Validate requirements against product vision
    2. Define acceptance criteria
    3. Identify required agents and phases
    4. Approve or request clarifications
    5. Return structured requirements package
  `
})
```

### Phase 2: Technical Design  
```javascript
// Invoked after requirements approved
Task({
  subagent_type: "technical-architect",
  description: "Design technical solution",
  prompt: `
    Design architecture for: ${requirements}
    1. Define component structure
    2. Specify API contracts
    3. Plan data flow
    4. Identity integration points
    5. Return technical design document
  `
})
```

### Phase 3: Implementation
Based on the feature type, appropriate agents are invoked:

#### Database Features
```javascript
Task({
  subagent_type: "database-architect",
  description: "Implement database schema",
  prompt: `
    Implement SQLite database for Email Insight:
    Requirements: ${requirements}
    Technical Design: ${technicalDesign}
    
    Tasks:
    - Create schema with Drizzle ORM
    - Implement FTS5 for search
    - Write migration scripts
    - Optimize indexes
    - Create seed data
    - Return implementation with tests
  `
})
```

#### API Features
```javascript
Task({
  subagent_type: "backend-api-developer", 
  description: "Implement API endpoints",
  prompt: `
    Create Hono API endpoints for Email Insight:
    Requirements: ${requirements}
    Schema: ${databaseSchema}
    
    Tasks:
    - Implement REST endpoints
    - Add authentication middleware
    - Create validation schemas
    - Handle error responses
    - Write API tests
    - Return complete API implementation
  `
})
```

#### Frontend Features
```javascript
Task({
  subagent_type: "nextjs-ui-builder",
  description: "Build UI components",
  prompt: `
    Create Next.js UI for Email Insight:
    Requirements: ${requirements}
    API Spec: ${apiSpecification}
    
    Tasks:
    - Build React components
    - Implement responsive design
    - Add TailwindCSS styling
    - Create data visualizations
    - Handle loading states
    - Return UI implementation with tests
  `
})
```

#### Gmail Integration
```javascript
Task({
  subagent_type: "gmail-oauth-integration",
  description: "Implement Gmail integration",
  prompt: `
    Implement Gmail API integration:
    Requirements: ${requirements}
    
    Tasks:
    - Set up OAuth2 flow
    - Implement token management
    - Create email sync logic
    - Handle rate limiting
    - Set up webhooks
    - Return complete integration
  `
})
```

### Phase 4: Quality Assurance
```javascript
// Always invoked after implementation
Task({
  subagent_type: "testing-qa-engineer",
  description: "Validate implementation",
  prompt: `
    Test Email Insight implementation:
    Implementation: ${implementationDetails}
    Acceptance Criteria: ${acceptanceCriteria}
    
    Tasks:
    - Write comprehensive unit tests
    - Create integration tests
    - Implement E2E tests with Playwright
    - Check code coverage (>80%)
    - Performance testing
    - Security validation
    - Return test results and coverage report
  `
})
```

### Phase 5: Documentation
```javascript
// Invoked in parallel with testing
Task({
  subagent_type: "documentation-maintainer",
  description: "Update documentation",
  prompt: `
    Document Email Insight changes:
    Implementation: ${implementationDetails}
    
    Tasks:
    - Update API documentation
    - Add code comments
    - Update architecture docs
    - Create user guides
    - Update CHANGELOG
    - Return documentation updates
  `
})
```

## Intelligent Phase Detection

The command automatically determines which phase and agents are needed:

```javascript
function determinePhase(issue) {
  const issueContent = issue.toLowerCase()
  
  if (issueContent.includes('database') || issueContent.includes('schema')) {
    return { phase: 1, leadAgent: 'database-architect' }
  }
  if (issueContent.includes('gmail') || issueContent.includes('oauth')) {
    return { phase: 2, leadAgent: 'gmail-oauth-integration' }
  }
  if (issueContent.includes('api') || issueContent.includes('endpoint')) {
    return { phase: 2, leadAgent: 'backend-api-developer' }
  }
  if (issueContent.includes('ui') || issueContent.includes('dashboard')) {
    return { phase: 4, leadAgent: 'nextjs-ui-builder' }
  }
  if (issueContent.includes('analytics') || issueContent.includes('subscription')) {
    return { phase: 3, leadAgent: 'analytics-engine' }
  }
  // Default to product owner for requirement analysis
  return { phase: 0, leadAgent: 'product-owner' }
}
```

## Progress Tracking

The command automatically tracks progress using TodoWrite:

```javascript
TodoWrite({
  todos: [
    { content: "Requirement analysis", status: "completed" },
    { content: "Technical design", status: "completed" },
    { content: "Database implementation", status: "in_progress" },
    { content: "API development", status: "pending" },
    { content: "Frontend development", status: "pending" },
    { content: "Testing and validation", status: "pending" },
    { content: "Documentation update", status: "pending" }
  ]
})
```

## Automatic Pull Request Creation

After all agents complete their work:

```javascript
// Commit all changes
git add .
git commit -m "feat: Implement ${featureDescription}"

// Create PR with comprehensive description
gh pr create --title "[Phase ${phase}] ${featureDescription}" \
  --body "Implementation completed by multi-agent pipeline:
  - Requirements: ✅ Validated by product-owner
  - Design: ✅ Approved by technical-architect
  - Implementation: ✅ Completed by ${leadAgent}
  - Testing: ✅ Validated by testing-qa-engineer
  - Documentation: ✅ Updated by documentation-maintainer
  
  Coverage: ${coveragePercent}%
  Tests: ${testsPassed}/${testsTotal} passing"
```

## Example Execution

```bash
# User runs:
email-insight-develop 42

# Command automatically:
1. Fetches issue #42 from GitHub
2. Invokes product-owner agent for requirements
3. Invokes technical-architect for design
4. Determines it needs database-architect
5. Invokes database-architect for implementation
6. Invokes testing-qa-engineer for validation
7. Invokes documentation-maintainer for docs
8. Creates PR with all changes
9. Updates progress tracking throughout
```

## Error Recovery

If any agent fails:
1. Error is logged with context
2. Technical-architect is consulted for workarounds
3. User is notified only if unrecoverable
4. Progress tracking shows blocked status
5. Partial work is preserved

## Success Criteria
- Single command replaces 6 manual commands
- Agents handle all implementation details
- No manual checklists or intervention
- Automatic progress tracking
- Complete PR ready for review
- All tests passing and documented