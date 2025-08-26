# Analyze Email Insight GitHub Issue

## Introduction
Perform comprehensive analysis of Email Insight GitHub issues to prepare for implementation. This command extracts requirements, identifies dependencies, coordinates with the assigned lead agent, and creates a detailed implementation plan ready for execution.

## Prerequisites
- GitHub CLI (`gh`) installed and authenticated
- Access to the Email Insight repository
- Understanding of the multi-agent development workflow

## Issue Reference
<issue_reference> #$ARGUMENTS </issue_reference>

## Main Tasks

### 1. Issue Context Extraction

**GitHub Issue Analysis:**
- [ ] Fetch issue details using GitHub CLI or URL
- [ ] Extract issue title, description, and labels
- [ ] Identify assigned agents (lead and supporting)
- [ ] Parse acceptance criteria and success metrics
- [ ] Review linked documentation and references
- [ ] Check for related issues and dependencies

**Email Insight Context Validation:**
- [ ] Verify phase alignment with development roadmap
- [ ] Confirm agent assignments match expertise areas
- [ ] Validate architecture references and constraints
- [ ] Check integration points with existing components
- [ ] Review leadership approval requirements

### 2. Technical Analysis & Requirements Deep Dive

**Architecture Impact Assessment:**
- [ ] Review `/docs/architecture.md` for affected components
- [ ] Check `/docs/api-spec.md` for API contract implications  
- [ ] Analyze `/docs/database-schema.md` for data model changes
- [ ] Examine `/docs/security.md` for security considerations
- [ ] Review existing codebase for integration patterns

**Dependency Chain Analysis:**
- [ ] Identify prerequisite tasks and completion status
- [ ] Map handoff interfaces from previous agents
- [ ] Document required inputs and expected outputs
- [ ] Check for blocking dependencies or circular references
- [ ] Validate timeline feasibility within phase constraints

**Technical Complexity Assessment:**
- [ ] Estimate implementation effort and timeline
- [ ] Identify potential technical risks and challenges
- [ ] Review required libraries, frameworks, and tools
- [ ] Assess testing complexity and coverage requirements
- [ ] Evaluate performance and scalability implications

### 3. Lead Agent Coordination & Implementation Planning

**Agent Context Preparation:**
- [ ] Compile all relevant documentation and references
- [ ] Prepare technical specifications and constraints
- [ ] Document handoff interfaces and validation criteria
- [ ] Create implementation checklist based on acceptance criteria
- [ ] Identify review checkpoints and approval gates

**Lead Agent Analysis Task:**
Based on issue assignment, invoke the appropriate specialized agent:

#### Database Architecture Issues (@agent-database-architect)
```
Analyze database requirements for: [Issue Title]
- Schema design and migration requirements
- Index optimization and performance considerations  
- FTS5 implementation for search capabilities
- Data integrity and constraint requirements
- Integration with existing database patterns
```

#### Gmail Integration Issues (@agent-gmail-oauth-integration)
```
Analyze Gmail API requirements for: [Issue Title]
- OAuth2 flow and token management complexity
- Gmail API endpoints and permission requirements
- Rate limiting and quota management strategies
- Webhook setup and real-time sync considerations
- Error handling and retry logic requirements
```

#### Backend API Issues (@agent-backend-api-developer)
```
Analyze API requirements for: [Issue Title]
- Endpoint design and request/response schemas
- Authentication and authorization requirements
- Middleware and validation logic needed
- Error handling and logging specifications
- Integration with database and external services
```

#### Frontend UI Issues (@agent-nextjs-ui-builder)
```
Analyze UI/UX requirements for: [Issue Title]
- Component design and state management needs
- Data visualization and interaction requirements
- Responsive design and accessibility considerations
- Integration with backend APIs and data flow
- User experience patterns and design system alignment
```

#### Analytics Engine Issues (@agent-analytics-engine)
```
Analyze data processing requirements for: [Issue Title]
- Data aggregation and calculation algorithms
- Performance optimization and materialized views
- Real-time vs batch processing considerations
- Statistical analysis and reporting requirements
- Data pipeline design and error handling
```

#### Subscription Detection Issues (@agent-subscription-detective)
```
Analyze subscription detection requirements for: [Issue Title]
- Pattern recognition algorithm design
- Training data and accuracy requirements
- Confidence scoring and validation mechanisms
- Performance optimization for large datasets
- Integration with email parsing and storage
```

#### Unsubscribe Functionality Issues (@agent-unsubscribe-specialist)
```
Analyze unsubscribe implementation for: [Issue Title]
- RFC 8058 one-click unsubscribe compliance
- Link extraction and validation algorithms
- Gmail filter generation and management
- Success tracking and retry mechanisms
- Bulk operation handling and performance
```

#### Security Issues (@agent-security-guardian)
```
Analyze security requirements for: [Issue Title]
- Authentication and authorization mechanisms
- Data encryption and privacy protection
- Input validation and injection prevention
- Compliance requirements (GDPR, security headers)
- Threat modeling and risk assessment
```

#### Testing Issues (@agent-testing-qa-engineer)
```
Analyze testing requirements for: [Issue Title]
- Unit test coverage and critical path identification
- Integration testing and API contract validation
- End-to-end testing scenarios and user flows
- Performance testing and benchmarking requirements
- Test data setup and fixture management
```

#### DevOps Issues (@agent-devops-deployment-optimizer)
```
Analyze deployment requirements for: [Issue Title]
- Containerization and orchestration needs
- CI/CD pipeline and automation requirements
- Environment configuration and secret management
- Monitoring, logging, and alerting setup
- Performance optimization and scaling considerations
```

#### Documentation Issues (@agent-documentation-maintainer)
```
Analyze documentation requirements for: [Issue Title]
- API documentation and code comment needs
- User guide and tutorial requirements
- Setup and configuration instructions
- Troubleshooting and FAQ content
- Code example and integration patterns
```

### 4. Implementation Readiness Assessment

**Pre-Implementation Checklist:**
- [ ] All dependencies identified and available
- [ ] Technical specifications clearly defined
- [ ] Agent coordination plan established
- [ ] Required tools and libraries documented
- [ ] Test strategy and validation criteria defined
- [ ] Risk mitigation strategies prepared

**Leadership Review Preparation:**
- [ ] **Product Owner Review**: Business value and user impact validated
- [ ] **Technical Architect Review**: Architecture compliance and integration verified
- [ ] **UI/UX Designer Review**: Design system alignment and accessibility confirmed

**Implementation Plan Generation:**
- [ ] Break down issue into specific development tasks
- [ ] Estimate time requirements for each task
- [ ] Define task dependencies and execution order
- [ ] Identify potential blockers and mitigation strategies
- [ ] Create validation checkpoints and testing milestones

### 5. Output Generation

## Analysis Report Template

```markdown
# Email Insight Issue Analysis Report

## Issue Overview
**Issue**: [#Number] [Title]
**Phase**: [Phase X - Name]
**Lead Agent**: @agent-[name]
**Supporting Agents**: @agent-[name], @agent-[name]
**Estimated Effort**: [X days/hours]

## Technical Analysis

### Requirements Summary
[Detailed breakdown of what needs to be implemented]

### Architecture Impact
[How this affects the overall system architecture]

### Dependencies
**Prerequisite Issues**: [List with status]
**Required Inputs**: [What this issue needs to start]
**Delivered Outputs**: [What this issue will produce]

### Risk Assessment
**Technical Risks**: [Identified challenges and mitigation]
**Timeline Risks**: [Schedule impacts and buffers]
**Integration Risks**: [Cross-agent coordination challenges]

## Implementation Plan

### Lead Agent Responsibilities (@agent-[name])
- [ ] [Task 1 with time estimate]
- [ ] [Task 2 with time estimate]  
- [ ] [Task 3 with time estimate]

### Supporting Agent Tasks
**@agent-[name]:**
- [ ] [Support task 1]
- [ ] [Support task 2]

### Validation Criteria
- [ ] [Functional validation 1]
- [ ] [Performance validation 2]
- [ ] [Integration validation 3]

## Leadership Review Requirements
- [ ] **Product Owner**: [Specific approval criteria]
- [ ] **Technical Architect**: [Technical review requirements]
- [ ] **UI/UX Designer**: [Design review needs] *(if applicable)*

## Implementation Readiness
**Status**: [Ready/Blocked/Needs Clarification]
**Blockers**: [None/List specific blockers]
**Next Steps**: [Immediate actions to begin implementation]

## Agent Handoff Package
[Complete technical specification ready for lead agent implementation]
```

### 6. Lead Agent Implementation Kickoff

**Agent Handoff Process:**
- [ ] Provide complete analysis report to lead agent
- [ ] Transfer all technical specifications and constraints
- [ ] Confirm understanding of acceptance criteria
- [ ] Establish communication plan for status updates
- [ ] Schedule review checkpoints with leadership agents

## Command Usage Examples

### Analyze by Issue Number
```bash
analyze-email-insight-issue 15
```

### Analyze by GitHub URL
```bash  
analyze-email-insight-issue "https://github.com/user/email-insight/issues/15"
```

### Analyze with Specific Focus
```bash
analyze-email-insight-issue 23 --focus=architecture
```

## Success Criteria
- Complete technical analysis performed by appropriate lead agent
- Implementation plan ready for immediate execution
- All dependencies and risks identified with mitigation strategies
- Leadership review requirements clearly defined
- Agent handoff package prepared with complete specifications
- Implementation readiness confirmed before agent assignment