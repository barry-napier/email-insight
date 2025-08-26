# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Email Insight is a Gmail analytics and subscription management application using:
- **Backend**: Hono + TypeScript + SQLite with Drizzle ORM
- **Frontend**: Next.js 14 + React + TailwindCSS  
- **Integration**: Gmail API with OAuth2
- **Development**: Multi-agent coordination architecture

## Project Status
**Current Phase**: Documentation complete, ready for Phase 1 development  
**Implementation Status**: Planning complete, code implementation not yet started  
**Next Step**: Begin foundation setup (database schema, auth, project structure)

## Development Commands

### Project Structure (Once Implemented)
```
backend/              # Hono API server
├── src/
│   ├── api/         # API routes (auth, analytics, subscriptions, sync)
│   ├── services/    # Business logic (gmail, analytics, subscription-detector)
│   ├── db/          # Database layer (schema, migrations, queries)
│   └── utils/       # Utilities (auth, crypto, rate-limiter)
frontend/            # Next.js application
├── app/             # Next.js app directory structure
├── components/      # React components (charts, tables, ui)
└── lib/             # Frontend utilities
```

### Common Development Commands (Planned)
```bash
# Database operations
npm run db:init          # Initialize SQLite database
npm run db:migrate       # Run database migrations
npm run db:reset         # Reset database to clean state
npm run db:console       # Open SQLite console

# Development servers
npm run dev              # Start backend development server (port 3001)
cd frontend && npm run dev  # Start frontend development server (port 3000)

# Code quality
npm run lint             # Lint TypeScript code
npm run type-check       # Run TypeScript type checking  
npm test                 # Run test suite
npm run test:coverage    # Run tests with coverage report

# Production
npm run build            # Build for production
npm run start            # Start production server
```

## Architecture Patterns

### API Response Standards
All API responses follow consistent format:
```typescript
// Success responses
{ success: true, data: T, message?: string }

// Error responses  
{ success: false, error: { code: string, message: string, severity: 'low'|'medium'|'high'|'critical' } }
```

### Database Schema Architecture
- **SQLite with Drizzle ORM**: Type-safe database operations
- **Materialized Views**: Pre-computed analytics for performance
- **FTS5 Integration**: Full-text search for email content
- **Strategic Indexing**: Optimized for email volume and sender queries

### Security Patterns
- **JWT Authentication**: Stateless token-based auth with refresh tokens
- **OAuth2 Integration**: Gmail API access with proper token refresh
- **Data Encryption**: Sensitive data encrypted at rest using AES-256
- **Rate Limiting**: Multi-tier rate limiting for API protection

## Multi-Agent Development Architecture

This project uses coordinated AI agents for development. Each agent has specific expertise:

### Leadership Agents (Active All Phases)
- **Product Owner** (@agent-product-owner): Product vision, feature prioritization, acceptance testing
- **Technical Architect** (@agent-technical-architect): System design, architectural decisions, technical standards  
- **UI/UX Designer** (@agent-ui-ux-designer): Design system, user experience, accessibility

### Specialized Development Agents
- **Project Setup** (@agent-project-setup-initializer): TypeScript projects, development tooling
- **Database Architect** (@agent-database-architect): SQLite schema, optimization, migrations
- **Gmail Integration** (@agent-gmail-oauth-integration): OAuth2, Gmail API, token management
- **Backend API** (@agent-backend-api-developer): Hono endpoints, middleware, validation
- **Analytics Engine** (@agent-analytics-engine): Email data processing, statistics, materialized views
- **Subscription Detective** (@agent-subscription-detective): ML algorithms for subscription detection
- **Frontend UI** (@agent-nextjs-ui-builder): React components, TailwindCSS, responsive design
- **Unsubscribe Specialist** (@agent-unsubscribe-specialist): RFC 8058 one-click unsubscribe, Gmail filters
- **Security Guardian** (@agent-security-guardian): Authentication, encryption, compliance audits
- **Testing QA** (@agent-testing-qa-engineer): Unit tests, integration tests, coverage analysis
- **DevOps Optimizer** (@agent-devops-deployment-optimizer): Docker, CI/CD, monitoring
- **Documentation** (@agent-documentation-maintainer): API docs, code comments, user guides

### Agent Coordination Workflow
1. **Plan Phase**: Technical Architect and Product Owner define requirements
2. **Implementation**: Specialized agents develop focused components
3. **Integration**: Technical Architect ensures component compatibility  
4. **Quality Gate**: Security, Testing, and Documentation agents validate
5. **Acceptance**: Product Owner approves before next phase

## Development Phases

### Phase 1: Foundation (Week 1)
- Project structure and TypeScript configuration
- SQLite database schema and migrations  
- JWT authentication and basic security
- Gmail OAuth2 integration setup

### Phase 2: Gmail Integration (Week 2) 
- Gmail API message fetching and pagination
- Real-time webhook configuration
- Rate limiting and error handling
- Basic email data synchronization

### Phase 3: Analytics Engine (Week 2-3)
- Email volume and sender analysis algorithms
- Response time calculations and trends
- Database materialized views for performance
- Contact relationship scoring

### Phase 4: Subscription Detection (Week 3-4)
- Machine learning algorithm for subscription identification
- Unsubscribe link extraction and validation
- Subscription management database schema
- One-click unsubscribe implementation

### Phase 5: Frontend Interface (Week 4-5)
- Next.js dashboard with responsive design
- Interactive charts and analytics visualization  
- Subscription management interface
- Email search and filtering capabilities

### Phase 6: Production Ready (Week 6)
- Comprehensive testing and security audit
- Docker containerization and deployment
- Performance optimization and monitoring
- Complete documentation and user guides

## Key Implementation Notes

### Gmail API Integration
- Use incremental sync with history API for efficiency
- Implement exponential backoff for rate limiting
- Handle OAuth2 token refresh automatically
- Set up webhooks for real-time updates

### Database Performance
- Create indexes on frequently queried columns (user_id, sender, timestamp)
- Use materialized views for complex analytics queries
- Implement database connection pooling
- Regular VACUUM and ANALYZE operations

### Frontend Architecture  
- Use React Query for server state management
- Implement proper error boundaries for graceful failures
- Use TailwindCSS utility classes consistently
- Follow accessibility best practices (WCAG 2.1 AA)

### Security Requirements
- Never log sensitive data (tokens, email content)
- Implement CSRF protection for all forms
- Use secure cookies with httpOnly and sameSite flags
- Regular security dependency updates

## Documentation References

- **Complete Architecture**: `/docs/architecture.md` - System design and C4 diagrams
- **API Specification**: `/docs/api-spec.md` - REST endpoints and data contracts  
- **Database Schema**: `/docs/database-schema.md` - SQLite schema and indexes
- **Setup Guide**: `/docs/setup.md` - Development environment configuration
- **Security Framework**: `/docs/security.md` - Security patterns and compliance
- **Agent Coordination**: `/docs/agents.md` - Multi-agent development details

Use these resources to understand the complete system architecture before beginning implementation.