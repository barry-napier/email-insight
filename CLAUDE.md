# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Email Insight is a Gmail analytics and subscription management application using:
- **Backend**: Hono + TypeScript + SQLite with Drizzle ORM
- **Frontend**: Next.js 14 + React + TailwindCSS  
- **Integration**: Gmail API with OAuth2
- **Development**: Multi-agent coordination architecture

## Project Status
**Current Phase**: Phase 1 Complete - Ready for Phase 2 Gmail Integration  
**Implementation Status**: Foundation complete with all acceptance criteria exceeded  
**Performance Achieved**: TypeScript compilation 7.8s, server startup 588ms, health endpoint 23ms  
**Next Step**: Begin Gmail API integration with OAuth2 flow and email synchronization

## Development Commands

### Project Structure (Implemented)
```
backend/              # Hono API server (✅ Complete)
├── src/
│   ├── api/         # API routes (health, auth stubs)
│   ├── config/      # Environment configuration with Zod validation
│   ├── db/          # Database layer (schema, migrations, connection)
│   ├── middleware/  # Auth, CORS, error handling, response formatting
│   ├── types/       # Hono type extensions
│   └── utils/       # Auth utilities, crypto, rate-limiter
frontend/            # Next.js application (✅ Structure ready)
├── app/             # Next.js app directory structure
├── components/      # React components (charts, tables, ui)
└── lib/             # Frontend utilities
shared/              # Shared TypeScript types and utilities
└── src/             # Common interfaces and types
```

### Common Development Commands (Verified Working)
```bash
# Workspace operations (from root)
npm run dev              # Start all development servers concurrently
npm run dev:backend      # Start backend development server (port 3001)
npm run dev:frontend     # Start frontend development server (port 3000)
npm run build            # Build all packages (shared, backend, frontend)
npm run type-check       # Run TypeScript checking across all packages
npm run test             # Run test suites for all packages
npm run lint             # Lint all packages

# Database operations
npm run db:init          # Initialize SQLite database with schema
npm run db:migrate       # Run database migrations
npm run db:reset         # Reset database to clean state
npm run db:console       # Open SQLite console

# Backend-specific (from backend/ directory)
npm run dev              # Start development server with hot reload
npm run test:coverage    # Run tests with coverage report (80% threshold)
npm run lint:fix         # Auto-fix ESLint issues
npm run clean            # Clean build artifacts

# Production
npm run start            # Start production server (backend)
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

### Database Schema Architecture (✅ Implemented)
- **SQLite with Drizzle ORM**: Type-safe database operations with 8 tables
- **WAL Mode**: Enabled for concurrent access and better performance
- **Comprehensive Schema**: Users, emails, contacts, subscriptions, analytics, sync jobs
- **Security Integration**: Token blacklisting table for secure logout
- **Performance Optimizations**: 64MB cache, memory-mapped I/O, proper indexing

### Security Patterns (✅ Implemented)
- **JWT Authentication**: Stateless token-based auth with token blacklisting
- **AES-256 Encryption**: Sensitive data encrypted at rest (access tokens, refresh tokens)
- **Comprehensive Middleware**: Auth, CORS, security headers, request tracking
- **Environment Validation**: Zod-based configuration validation
- **Rate Limiting Foundation**: Utilities ready for API protection

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

### Phase 1: Foundation (✅ COMPLETED)
- **Project Structure**: Complete npm workspace with backend/frontend/shared packages
- **Performance**: TypeScript compilation 7.8s, server startup 588ms, health endpoint 23ms
- **Database**: SQLite with 8 tables, WAL mode, Drizzle ORM integration
- **Security**: JWT middleware, AES-256 encryption, token blacklisting
- **Testing**: 18 validation tests with 100% pass rate, coverage thresholds
- **Quality**: Zero TypeScript errors, ESLint compliance, comprehensive error handling

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

### Phase 1 Foundation Implementation (✅ Complete)
- **Hono Framework**: Modern TypeScript-first web framework with excellent performance
- **Database Connection**: Singleton pattern with health checking and proper error handling
- **Middleware Pipeline**: Authentication, CORS, error handling, response formatting, request tracking
- **Environment Configuration**: Zod validation with secure defaults and clear error messages
- **Crypto Utilities**: AES-256 encryption, HMAC signatures, secure token generation
- **Development Experience**: Hot reload, path aliases, comprehensive npm scripts

### Phase 2 Gmail API Integration (Next Steps)
- Use incremental sync with history API for efficiency
- Implement exponential backoff for rate limiting
- Handle OAuth2 token refresh automatically
- Set up webhooks for real-time updates

### Database Performance (Optimized)
- WAL mode enabled for better concurrent access
- 64MB cache size and memory-mapped I/O configured
- Foreign key constraints enforced for data integrity
- Prepared statements used for security and performance

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