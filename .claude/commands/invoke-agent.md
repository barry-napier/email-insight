# Invoke Agent - Email Insight Agent Orchestrator

## Introduction
Core orchestration command that properly invokes Claude's built-in subagents for Email Insight development tasks. This command maps Email Insight agent roles to Claude's actual subagent types and handles context passing, progress tracking, and agent coordination automatically.

## Agent Mapping
Email Insight agents are mapped to Claude's built-in subagent types:

```javascript
const AGENT_MAPPING = {
  // Leadership Agents
  "product-owner": "product-owner",
  "technical-architect": "technical-architect", 
  "ui-ux-designer": "ui-ux-designer",
  
  // Development Agents
  "project-setup": "project-setup-initializer",
  "database-architect": "database-architect",
  "gmail-integration": "gmail-oauth-integration",
  "backend-api": "backend-api-developer",
  "frontend-ui": "nextjs-ui-builder",
  
  // Intelligence Agents
  "analytics-engine": "analytics-engine",
  "subscription-detective": "subscription-detective",
  
  // Quality Agents
  "security-guardian": "security-guardian",
  "testing-qa": "testing-qa-engineer",
  "unsubscribe-specialist": "unsubscribe-specialist",
  
  // Operations Agents
  "devops": "devops-deployment-optimizer",
  "documentation": "documentation-maintainer"
}
```

## Usage Pattern

### Basic Agent Invocation
```javascript
// Instead of manual checklists and bash scripts, use:
invokeAgent({
  type: "database-architect",
  task: "Design email storage schema",
  context: {
    requirements: issueRequirements,
    phase: "Phase 1 - Foundation",
    constraints: projectConstraints
  }
})
```

### Agent Chaining with Handoffs
```javascript
// Automatic handoff between agents
const schemaResult = await invokeAgent("database-architect", schemaTask)
const apiResult = await invokeAgent("backend-api", {
  task: "Create CRUD endpoints",
  context: { schema: schemaResult.deliverables }
})
```

## Implementation Instructions

When this command is invoked, it should:

1. **Parse the request** to determine:
   - Which agent type is needed
   - What task needs to be completed
   - What context is available

2. **Prepare the context package**:
   - Project documentation references
   - Previous agent deliverables
   - Current phase and requirements
   - Constraints and standards

3. **Invoke the appropriate Claude subagent using the Task tool**:
   ```javascript
   Task({
     subagent_type: mappedAgentType,
     description: taskDescription,
     prompt: comprehensivePrompt
   })
   ```

4. **Track progress** using TodoWrite:
   - Mark current task as in_progress
   - Update when agent completes
   - Add follow-up tasks as needed

5. **Handle agent response**:
   - Extract deliverables
   - Update project state
   - Prepare handoff for next agent

## Example Invocations

### Database Schema Design
```markdown
Agent: database-architect
Task: Design and implement SQLite schema for email storage
Context:
  - Store emails with full-text search
  - Support subscription detection
  - Optimize for analytics queries
  - Include migration scripts
```

### API Implementation  
```markdown
Agent: backend-api
Task: Implement REST API endpoints for email operations
Context:
  - Use Hono framework
  - Follow OpenAPI specification
  - Include authentication middleware
  - Handle Gmail API integration
```

### Testing Suite
```markdown
Agent: testing-qa
Task: Create comprehensive test suite for Email Insight
Context:
  - Unit tests with >80% coverage
  - Integration tests for APIs
  - E2E tests with Playwright
  - Performance benchmarks
```

## Coordination Rules

### Sequential Handoffs
Some agents must run in sequence:
1. `product-owner` → Validates requirements
2. `technical-architect` → Designs system
3. `database-architect` → Implements schema
4. `backend-api` → Creates endpoints
5. `testing-qa` → Validates implementation

### Parallel Execution
Some agents can run in parallel:
- `frontend-ui` + `backend-api` (after schema complete)
- `documentation` + `testing-qa` (after implementation)
- `security-guardian` + `devops` (for deployment prep)

### Leadership Gates
Certain decisions require leadership approval:
- `product-owner`: Feature acceptance
- `technical-architect`: Design approval
- `ui-ux-designer`: UX validation

## Progress Tracking Template

```markdown
## Current Agent Pipeline Status
- [✅] Requirements Analysis (product-owner)
- [✅] System Design (technical-architect)
- [🔄] Database Implementation (database-architect) 
- [⏳] API Development (backend-api)
- [⏳] Frontend Development (frontend-ui)
- [ ] Testing & Validation (testing-qa)
- [ ] Security Audit (security-guardian)
- [ ] Deployment (devops)
```

## Error Handling

If an agent fails or encounters issues:
1. Log the error with context
2. Determine if it's blocking or can be worked around
3. Invoke `technical-architect` for design decisions if needed
4. Invoke `product-owner` for requirement clarifications if needed
5. Update todo list with blocked status

## Success Criteria
- Agent is invoked with proper Claude Task tool
- Context is comprehensive and relevant
- Progress is tracked automatically
- Handoffs happen seamlessly
- No manual intervention unless issues arise