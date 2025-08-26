# Implement Email Insight GitHub Issue

## Introduction
Execute implementation of analyzed Email Insight GitHub issues using the appropriate specialized agent. This command takes the analysis results and coordinates with the assigned lead agent to deliver the complete implementation according to the acceptance criteria and technical specifications.

## Prerequisites
- Issue analysis completed using `analyze-email-insight-github-issue.md`
- GitHub CLI (`gh`) installed and authenticated
- Development environment set up according to `/docs/setup.md`
- Access to all Email Insight documentation and codebase

## Issue Reference
<issue_reference> #$ARGUMENTS </issue_reference>

## Main Tasks

### 1. Pre-Implementation Setup & Git Workflow

**Git Branch Management:**
- [ ] Ensure we're on the latest main branch: `git checkout main && git pull origin main`
- [ ] Create new feature branch from latest main: `git checkout -b feature/issue-[number]-[description]`
- [ ] Verify clean working directory: `git status` shows no uncommitted changes
- [ ] Set up branch tracking: `git push -u origin feature/issue-[number]-[description]`

**Branch Naming Convention:**
```bash
# Foundation issues (Phase 1)
feature/issue-[number]-foundation-[component]
# Example: feature/issue-5-foundation-database-setup

# Integration issues (Phase 2)  
feature/issue-[number]-integration-[component]
# Example: feature/issue-8-integration-gmail-api

# Intelligence issues (Phase 3)
feature/issue-[number]-intelligence-[component] 
# Example: feature/issue-12-intelligence-subscription-detection

# Interface issues (Phase 4)
feature/issue-[number]-interface-[component]
# Example: feature/issue-15-interface-dashboard-ui

# Quality issues (Phase 5)
feature/issue-[number]-quality-[component]
# Example: feature/issue-18-quality-security-hardening

# Deployment issues (Phase 6)
feature/issue-[number]-deployment-[component]
# Example: feature/issue-20-deployment-docker-setup
```

**Analysis Report Verification:**
- [ ] Confirm analysis report exists and is complete
- [ ] Verify all dependencies are resolved or available
- [ ] Check that prerequisites from previous phases are met
- [ ] Validate that lead agent assignment is correct
- [ ] Ensure implementation plan is detailed and actionable

**Environment Readiness Check:**
- [ ] Verify development environment is properly configured
- [ ] Check that all required dependencies are installed
- [ ] Confirm database is initialized and accessible
- [ ] Validate API keys and authentication tokens are available
- [ ] Ensure test environment is ready for validation

**Codebase Quality Baseline:**
- [ ] Run `npm run lint` and ensure no errors (warnings acceptable)
- [ ] Run `npm run type-check` and ensure no TypeScript errors
- [ ] Run `npm test` and ensure all existing tests pass
- [ ] Run `npm run build` and ensure project builds successfully
- [ ] Document baseline metrics (test coverage, bundle size, etc.)

### 2. Lead Agent Implementation Coordination

Based on the issue's lead agent assignment, invoke the appropriate specialized agent with complete context and specifications:

#### Phase 1: Foundation Issues

**Project Setup Implementation (@agent-project-setup-initializer)**
```
Implement project setup for: [Issue Title]

Context Package:
- Issue analysis report with technical requirements
- TypeScript and tooling configuration specifications
- Development environment and tooling setup needs
- Integration requirements with existing Email Insight patterns

Implementation Tasks:
- Initialize Node.js project with specified TypeScript configuration
- Set up Hono server with middleware and routing structure
- Configure development tooling (ESLint, Prettier, testing framework)
- Create project structure following Email Insight patterns
- Set up environment configuration and secret management
- Implement basic health checks and logging

Validation Requirements:
- Project builds successfully without errors
- All linting and type checking passes
- Basic server starts and responds to health checks
- Development tooling is properly configured
- Integration tests for basic functionality pass
```

**Database Architecture Implementation (@agent-database-architect)**
```
Implement database design for: [Issue Title]

Context Package:
- Database schema requirements from analysis
- Performance optimization and indexing specifications
- FTS5 full-text search implementation needs
- Migration strategy and data integrity requirements

Implementation Tasks:
- Design and implement SQLite database schema using Drizzle ORM
- Create database migration scripts with proper rollback support
- Set up FTS5 full-text search indexes for email content
- Implement query optimization and strategic indexing
- Create database connection pooling and management
- Build data access layer with type-safe queries

Validation Requirements:
- Database schema matches specification exactly
- All migrations run successfully forward and backward
- FTS5 search performs within specified time limits
- Query performance meets benchmarked requirements
- Data integrity constraints are properly enforced
```

#### Phase 2: Integration Issues

**Gmail Integration Implementation (@agent-gmail-oauth-integration)**
```
Implement Gmail API integration for: [Issue Title]

Context Package:
- OAuth2 flow requirements and security specifications
- Gmail API endpoints and permission requirements
- Rate limiting and error handling strategies
- Token management and refresh mechanisms

Implementation Tasks:
- Implement complete OAuth2 authentication flow
- Set up Gmail API client with proper error handling
- Create token management system with secure storage
- Implement rate limiting and exponential backoff
- Build email fetching with pagination and filtering
- Create webhook handling for real-time updates

Validation Requirements:
- OAuth2 flow works end-to-end without errors
- Gmail API integration handles rate limits gracefully
- Token refresh mechanism works automatically
- Email fetching performs within specified time limits
- Webhook integration processes updates correctly
```

**Backend API Implementation (@agent-backend-api-developer)**
```
Implement backend API endpoints for: [Issue Title]

Context Package:
- API specification with request/response schemas
- Authentication and authorization requirements
- Middleware and validation specifications
- Integration requirements with database and Gmail API

Implementation Tasks:
- Create Hono API endpoints following OpenAPI specification
- Implement authentication and authorization middleware
- Build request validation and error handling
- Create background job system for async processing
- Implement logging and monitoring integration
- Set up CORS and security headers

Validation Requirements:
- All API endpoints respond according to specification
- Authentication and authorization work correctly
- Request validation prevents invalid data submission
- Error handling provides appropriate responses
- Background jobs process tasks successfully
```

#### Phase 3: Intelligence Issues

**Analytics Engine Implementation (@agent-analytics-engine)**
```
Implement analytics processing for: [Issue Title]

Context Package:
- Data processing requirements and algorithms
- Performance optimization and materialized view specifications
- Statistical analysis and aggregation requirements
- Real-time vs batch processing considerations

Implementation Tasks:
- Build email volume and trend analysis algorithms
- Implement contact aggregation and relationship scoring
- Create materialized views for performance optimization
- Develop statistical calculations for response times
- Build data pipeline for real-time and batch processing
- Implement caching layer for frequently accessed data

Validation Requirements:
- Analytics calculations produce accurate results
- Materialized views update correctly and efficiently
- Performance meets specified response time requirements
- Data pipeline handles large volumes without errors
- Caching layer improves response times measurably
```

**Subscription Detection Implementation (@agent-subscription-detective)**
```
Implement subscription detection for: [Issue Title]

Context Package:
- Pattern recognition algorithm specifications
- Training data and accuracy requirements
- Confidence scoring and validation mechanisms
- Integration with email parsing and storage systems

Implementation Tasks:
- Implement email classification algorithms
- Build pattern recognition for subscription identification
- Create confidence scoring mechanism
- Develop false positive prevention system
- Build subscription categorization logic
- Implement performance optimization for large datasets

Validation Requirements:
- Detection accuracy meets specified precision/recall targets
- Confidence scoring provides meaningful differentiation
- False positive rate stays below acceptable threshold
- Performance handles specified email volume efficiently
- Categorization produces consistent and useful results
```

#### Phase 4: Interface Issues

**Frontend UI Implementation (@agent-nextjs-ui-builder)**
```
Implement user interface for: [Issue Title]

Context Package:
- UI/UX design specifications and mockups
- Component library and design system requirements
- Data visualization and interaction specifications
- Responsive design and accessibility requirements

Implementation Tasks:
- Build React components following design system patterns
- Implement responsive layouts using TailwindCSS
- Create data visualization components (charts, graphs)
- Build interactive elements with proper state management
- Implement accessibility features (WCAG 2.1 AA compliance)
- Integrate with backend APIs and handle loading states

Validation Requirements:
- Components match design specifications exactly
- Responsive design works across all specified breakpoints
- Data visualizations render correctly with real data
- Accessibility audit passes with no critical issues
- API integration handles all success and error states
```

**Unsubscribe Implementation (@agent-unsubscribe-specialist)**
```
Implement unsubscribe functionality for: [Issue Title]

Context Package:
- RFC 8058 one-click unsubscribe requirements
- Link extraction and validation algorithms
- Gmail filter generation and management needs
- Bulk operation handling and performance requirements

Implementation Tasks:
- Implement RFC 8058 compliant one-click unsubscribe
- Build link extraction from email headers and body
- Create Gmail filter generation as backup method
- Implement success/failure tracking and retry logic
- Build bulk unsubscribe operations with progress tracking
- Create resubscribe capability and audit trail

Validation Requirements:
- One-click unsubscribe works with major email providers
- Link extraction identifies unsubscribe methods correctly
- Gmail filters are created and work as expected
- Bulk operations handle large volumes efficiently
- Success tracking provides accurate completion status
```

#### Phase 5: Quality Issues

**Security Implementation (@agent-security-guardian)**
```
Implement security measures for: [Issue Title]

Context Package:
- Security requirements and threat model analysis
- Encryption and data protection specifications
- Compliance requirements (GDPR, OWASP guidelines)
- Authentication and authorization security measures

Implementation Tasks:
- Implement data encryption at rest and in transit
- Build comprehensive input validation and sanitization
- Set up security headers and CSRF protection
- Create audit logging and security monitoring
- Implement rate limiting and DDoS protection
- Build GDPR compliance features (data export/deletion)

Validation Requirements:
- Security audit passes with no critical vulnerabilities
- Encryption properly protects sensitive data
- Input validation prevents all common attack vectors
- Compliance features meet legal requirements
- Security monitoring detects and alerts on threats
```

**Testing Implementation (@agent-testing-qa-engineer)**
```
Implement comprehensive testing for: [Issue Title]

Context Package:
- Test coverage requirements and critical path analysis
- Unit, integration, and end-to-end testing specifications
- Performance testing and benchmarking requirements
- Test data setup and fixture management needs

Implementation Tasks:
- Write unit tests for all core functionality
- Create integration tests for API endpoints and database operations
- Build end-to-end tests for complete user workflows
- Implement performance testing and benchmarking
- Set up test data fixtures and mock services
- Create test reporting and coverage analysis

Validation Requirements:
- Test coverage exceeds specified minimum (80%+)
- All tests pass consistently in CI environment
- Performance tests validate system meets benchmarks
- End-to-end tests cover all critical user journeys
- Test suite runs efficiently and provides clear feedback
```

#### Phase 6: Deployment Issues

**DevOps Implementation (@agent-devops-deployment-optimizer)**
```
Implement deployment infrastructure for: [Issue Title]

Context Package:
- Containerization and orchestration requirements
- CI/CD pipeline and automation specifications
- Environment configuration and secret management needs
- Monitoring, logging, and alerting requirements

Implementation Tasks:
- Create Docker containers for all application components
- Build CI/CD pipeline with automated testing and deployment
- Set up environment configuration and secret management
- Implement monitoring, logging, and alerting systems
- Create backup and disaster recovery procedures
- Build deployment automation and rollback capabilities

Validation Requirements:
- Containers build and run successfully in all environments
- CI/CD pipeline deploys automatically without errors
- Monitoring provides visibility into system health
- Backup and recovery procedures work as expected
- Deployment automation enables reliable releases
```

**Documentation Implementation (@agent-documentation-maintainer)**
```
Implement documentation for: [Issue Title]

Context Package:
- API documentation and code comment requirements
- User guide and tutorial specifications
- Setup and troubleshooting documentation needs
- Code example and integration pattern requirements

Implementation Tasks:
- Create comprehensive API documentation with examples
- Write user guides and tutorials for key features
- Update setup and configuration documentation
- Create troubleshooting guides and FAQ sections
- Write code comments and JSDoc annotations
- Build integration examples and code snippets

Validation Requirements:
- API documentation is complete and accurate
- User guides enable successful feature usage
- Setup documentation allows successful environment setup
- Code comments meet specified coverage requirements
- Examples and snippets work without modification
```

### 3. Implementation Execution & Monitoring

**Progress Tracking:**
- [ ] Monitor implementation progress against timeline
- [ ] Track completion of specific tasks and milestones
- [ ] Identify and address blockers as they arise
- [ ] Coordinate with supporting agents when needed
- [ ] Update issue status and progress comments
- [ ] Commit frequently with descriptive messages during development

**Continuous Quality Gates:**
- [ ] Run `npm run lint` before each commit attempt
- [ ] Run `npm run type-check` before each commit attempt
- [ ] Run `npm test` to ensure no regressions introduced
- [ ] Run `npm run build` to verify project still builds
- [ ] Code quality checks pass continuously during development

**Development Commit Strategy:**
- [ ] Make atomic commits with single logical changes
- [ ] Write descriptive commit messages following convention:
```bash
# Format: type(scope): description
# Examples:
feat(auth): implement JWT token management system
fix(gmail): resolve OAuth2 refresh token handling
docs(api): update endpoint documentation with new schemas
test(analytics): add unit tests for email volume calculations
```

**Agent Coordination:**
- [ ] Maintain communication with lead agent during implementation
- [ ] Coordinate handoffs with supporting agents when needed
- [ ] Escalate blockers to leadership agents appropriately
- [ ] Ensure deliverables meet handoff interface requirements
- [ ] Validate integration points with existing components

### 4. Leadership Review Process

**Product Owner Review (@agent-product-owner)**
```
Review implementation against business requirements:
- Validate feature meets user needs and acceptance criteria
- Confirm implementation aligns with product vision
- Approve user experience and interface design decisions
- Verify business logic and workflow implementation
- Authorize release and deployment of feature
```

**Technical Architect Review (@agent-technical-architect)**
```
Review implementation against technical requirements:
- Validate architecture compliance and design patterns
- Review code quality, performance, and scalability
- Confirm integration points and system coherence
- Verify security and reliability implementations
- Approve technical decisions and infrastructure changes
```

**UI/UX Designer Review (@agent-ui-ux-designer)** *(when applicable)*
```
Review implementation against design requirements:
- Validate design system compliance and visual consistency
- Review accessibility implementation and WCAG compliance
- Confirm responsive design and cross-browser compatibility
- Verify user experience flows and interaction patterns
- Approve final UI implementation for release
```

### 5. Pre-Commit Validation & Quality Gates

**Final Build Validation (REQUIRED BEFORE COMMIT):**
- [ ] Run `npm run lint` - Must pass with zero errors (warnings acceptable)
- [ ] Run `npm run type-check` - Must pass with zero TypeScript errors
- [ ] Run `npm test` - All tests must pass (no skipped critical tests)
- [ ] Run `npm run build` - Must build successfully without errors
- [ ] Run security scan if available - No critical vulnerabilities

**Code Quality Requirements:**
- [ ] Test coverage maintains or improves baseline (>80% for new code)
- [ ] No TODO comments left in production code
- [ ] All console.log and debugging statements removed
- [ ] Code follows established patterns and conventions
- [ ] Error handling properly implemented for all new functionality

**Final Acceptance Criteria Validation:**
- [ ] All specified acceptance criteria are met and tested
- [ ] Functional requirements work as specified in issue
- [ ] Performance requirements are met or exceeded
- [ ] Security requirements are properly implemented
- [ ] Integration requirements work with existing systems
- [ ] Manual testing completed for critical user paths

**Pre-Commit Checklist:**
```bash
# Run all quality gates before commit
npm run lint && \
npm run type-check && \
npm test && \
npm run build && \
echo "✅ All quality gates passed - ready to commit"
```

### 6. Git Commit & Push Process

**Final Commit & Push (Only After All Quality Gates Pass):**
```bash
# Stage all changes
git add .

# Create detailed commit message
git commit -m "$(cat <<'EOF'
feat(issue-[number]): [Brief description of feature implemented]

## Implementation Summary
- [Key feature 1 implemented]
- [Key feature 2 implemented] 
- [Key feature 3 implemented]

## Technical Changes
- [Database changes, if any]
- [API endpoints added/modified]
- [Frontend components created/updated]
- [Tests added/updated]

## Quality Validation
- ✅ All lints pass (npm run lint)
- ✅ All type checks pass (npm run type-check)
- ✅ All tests pass (npm test)
- ✅ Build successful (npm run build)
- ✅ Test coverage: [X]%

## Issue Resolution
Closes #[issue-number]
Implements acceptance criteria: [brief list]

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# Push to remote branch
git push origin feature/issue-[number]-[description]
```

**Commit Validation Requirements:**
- [ ] All quality gates must pass before commit is allowed
- [ ] Commit message follows conventional commit format
- [ ] Implementation summary documents all major changes
- [ ] Issue closure reference is included in commit message
- [ ] Push successful to remote feature branch

### 7. Pull Request Creation

**Automated PR Creation:**
```bash
# Create comprehensive pull request
gh pr create \
  --title "[Phase X] Issue #[number]: [Feature Description]" \
  --body "$(cat <<'EOF'
## 🎯 Issue Summary
**Issue**: #[number] - [Title]
**Phase**: [Phase X - Name]
**Lead Agent**: @agent-[name]
**Supporting Agents**: @agent-[name], @agent-[name]

## 📋 Implementation Overview
### Features Implemented
- [✅] [Feature 1]: [Brief description]
- [✅] [Feature 2]: [Brief description]
- [✅] [Feature 3]: [Brief description]

### Technical Changes
**Backend Changes:**
- [API endpoints added/modified]
- [Database schema changes]
- [Authentication/security updates]

**Frontend Changes:**
- [Components created/updated]
- [UI/UX improvements]
- [Responsive design updates]

**Testing & Quality:**
- [Unit tests added: X new tests]
- [Integration tests: X scenarios covered]
- [Test coverage: X% (baseline: Y%)]

## 🏗️ Architecture Alignment
**Documentation Updated:**
- [ ] `/docs/api-spec.md` - [Changes made]
- [ ] `/docs/database-schema.md` - [Schema updates]
- [ ] `/docs/architecture.md` - [Architecture changes]
- [ ] Code comments and JSDoc - [Coverage improved]

**Design Patterns Followed:**
- [✅] Email Insight API response standards
- [✅] Database query optimization patterns
- [✅] Security and authentication patterns
- [✅] Error handling and logging standards

## 🧪 Quality Validation Results
### Build & Lint Status
- [✅] `npm run lint`: Passed (0 errors, [X] warnings)
- [✅] `npm run type-check`: Passed (0 TypeScript errors)
- [✅] `npm test`: Passed ([X]/[Y] tests)
- [✅] `npm run build`: Successful build
- [✅] Security scan: No critical vulnerabilities

### Performance Benchmarks
- [API response times: P95 < Xms, P99 < Yms]
- [Database query performance: avg < Xms]
- [Frontend load time: < Xs initial load]
- [Memory usage: stable at < XMB]

### Acceptance Criteria Validation
**From Issue #[number]:**
- [✅] [Acceptance criterion 1] - [How it was validated]
- [✅] [Acceptance criterion 2] - [How it was validated]  
- [✅] [Acceptance criterion 3] - [How it was validated]

## 🔗 Agent Coordination
### Handoff Requirements Met
**Received from @agent-[previous]:**
- [✅] [Input requirement 1] - [Status]
- [✅] [Input requirement 2] - [Status]

**Delivering to @agent-[next]:**
- [✅] [Output deliverable 1] - [Interface specification]
- [✅] [Output deliverable 2] - [Interface specification]

### Integration Testing
- [✅] [Integration point 1] - [Test results]
- [✅] [Integration point 2] - [Test results]

## 👥 Leadership Review Required
- [ ] **@agent-product-owner**: Business value validation
- [ ] **@agent-technical-architect**: Architecture compliance review
- [ ] **@agent-ui-ux-designer**: Design system compliance *(if applicable)*

## 🚨 Risk Assessment
**Issues Identified & Resolved:**
- [Issue 1]: [Resolution]
- [Issue 2]: [Resolution]

**Remaining Considerations:**
- [Consideration 1]: [Plan for resolution]
- [Consideration 2]: [Monitoring required]

## 📊 Success Metrics Achieved
**Technical Success:**
- [✅] [Metric 1]: [Result vs target]
- [✅] [Metric 2]: [Result vs target]

**Product Success:**
- [✅] [User value delivered]: [Measurement]
- [✅] [Performance improved]: [Measurement]

## 🔄 Next Steps
**Immediate Actions:**
- [ ] Leadership review and approval
- [ ] Staging deployment and testing
- [ ] Documentation review and updates

**Follow-up Tasks:**
- [ ] [Task 1 for next phase/iteration]
- [ ] [Task 2 for next phase/iteration]

**Dependencies for Next Agent:**
- [Dependency 1]: Available and validated
- [Dependency 2]: Available and validated

## 📚 References
- **Original Issue**: #[number]
- **Analysis Report**: [Link to analysis documentation]
- **Architecture Docs**: [Links to relevant architecture documentation]
- **API Specification**: [Links to updated API docs]

---

🤖 Generated with [Claude Code](https://claude.ai/code)

**Implementation completed by**: @agent-[name]  
**Quality gates**: All passed ✅  
**Ready for review**: Yes ✅
EOF
)" \
  --label "phase-[X]-[name],agent-[type],[component],ready-for-review" \
  --assignee "@[username]" \
  --reviewer "@tech-lead,@product-owner"
```

**PR Requirements Checklist:**
- [ ] Title follows format: `[Phase X] Issue #[number]: [Description]`
- [ ] Body includes complete implementation summary
- [ ] All acceptance criteria marked as completed with validation
- [ ] Quality gates results documented and verified
- [ ] Architecture alignment confirmed and documented
- [ ] Agent handoff requirements specified
- [ ] Leadership review requirements clearly marked
- [ ] Appropriate labels assigned for tracking
- [ ] Reviewers assigned according to agent coordination plan

### 8. Issue Completion & Handoff

**Implementation Summary:**
- [ ] Document what was implemented and how
- [ ] Record any deviations from original specifications
- [ ] Update architecture and API documentation
- [ ] Create handoff documentation for next phase
- [ ] Link PR to GitHub issue for automatic closure

**Next Phase Preparation:**
- [ ] Prepare deliverables for next agent in workflow
- [ ] Document integration interfaces and contracts
- [ ] Create validation tests for handoff verification
- [ ] Update project roadmap and timeline
- [ ] Communicate completion to dependent issues

## Command Usage Examples

### Implement Analyzed Issue
```bash
implement-email-insight-issue 15
```

### Implement with Specific Agent Override
```bash
implement-email-insight-issue 23 --agent=database-architect
```

### Implement with Dry Run
```bash
implement-email-insight-issue 8 --dry-run
```

## Implementation Output Template

```markdown
# Email Insight Implementation Report

## Issue Implementation Summary
**Issue**: [#Number] [Title]
**Lead Agent**: @agent-[name]
**Implementation Status**: [Complete/In Progress/Blocked]
**Duration**: [X days/hours actual vs estimated]

## Implementation Results

### Completed Features
- [✅] [Feature 1] - [Implementation notes]
- [✅] [Feature 2] - [Implementation notes]
- [✅] [Feature 3] - [Implementation notes]

### Technical Deliverables
- **Code Files**: [List of files created/modified]
- **Database Changes**: [Schema changes, migrations]
- **API Endpoints**: [New endpoints and modifications]
- **UI Components**: [New components and modifications]
- **Tests**: [Test files and coverage achieved]

### Performance Results
- **Response Times**: [Actual vs target performance]
- **Database Queries**: [Query performance benchmarks]
- **Memory Usage**: [Memory consumption measurements]
- **Test Coverage**: [Coverage percentage achieved]

## Quality Validation

### Code Quality
- [✅] ESLint: No errors, [X] warnings
- [✅] TypeScript: Strict mode compliance
- [✅] Prettier: Code formatting consistent
- [✅] Test Coverage: [X]% coverage achieved

### Security Validation
- [✅] Security audit: No critical vulnerabilities
- [✅] Input validation: All inputs properly sanitized
- [✅] Authentication: Proper token handling
- [✅] Data encryption: Sensitive data protected

### Integration Testing
- [✅] API Integration: All endpoints responding correctly
- [✅] Database Integration: Queries performing within limits
- [✅] Frontend Integration: UI components working with APIs
- [✅] Gmail Integration: API calls successful and rate-limited

## Leadership Approvals

### Product Owner Review (@agent-product-owner)
**Status**: [✅ Approved / ⏳ Pending / ❌ Rejected]
**Comments**: [Business value validation and feedback]

### Technical Architect Review (@agent-technical-architect)  
**Status**: [✅ Approved / ⏳ Pending / ❌ Rejected]
**Comments**: [Architecture compliance and technical quality feedback]

### UI/UX Designer Review (@agent-ui-ux-designer) *(if applicable)*
**Status**: [✅ Approved / ⏳ Pending / ❌ Rejected]  
**Comments**: [Design system compliance and UX feedback]

## Handoff Documentation

### Delivered to Next Agent
**Agent**: @agent-[next]
**Interface Contract**: [Specification of delivered functionality]
**Integration Points**: [How next agent should integrate]
**Validation Tests**: [Tests to verify integration]

### Dependencies for Next Phase
- [Dependency 1]: [Status and notes]
- [Dependency 2]: [Status and notes]
- [Dependency 3]: [Status and notes]

## Lessons Learned & Notes
**Challenges Encountered**: [Technical or process challenges]
**Solutions Developed**: [How challenges were resolved]
**Recommendations**: [Suggestions for future similar implementations]

## Issue Closure
**GitHub Issue**: [Link to closed issue]
**Commit References**: [Links to relevant commits]
**Deployment Status**: [Ready for staging/production]
**Next Steps**: [Actions required for next phase]
```

## Success Criteria
- Implementation completed according to acceptance criteria
- All quality gates passed (code quality, security, performance)  
- Leadership approvals obtained from required reviewers
- Integration tests validate proper system functionality
- Documentation updated to reflect implementation changes
- Handoff package prepared for next phase agent
- GitHub issue closed with complete implementation summary