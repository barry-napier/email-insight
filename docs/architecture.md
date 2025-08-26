# System Architecture

## Overview
Email Insight uses a modern, lightweight architecture optimized for Gmail integration and local data processing.

## System Architecture Diagrams

### High-Level Architecture (C4 Context)
```
                    ┌─────────────────────────────┐
                    │         User                │
                    │   (Gmail Account Owner)     │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                Email Insight System                         │
    │  ┌─────────────┐     ┌──────────────┐     ┌──────────────┐ │
    │  │   Next.js   │────▶│  Hono API    │────▶│   SQLite     │ │
    │  │  Frontend   │     │   Server     │     │   Database   │ │
    │  └─────────────┘     └──────┬───────┘     └──────────────┘ │
    └───────────────────────────────┼───────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │         Gmail API           │
                    │    (Google Services)        │
                    └─────────────────────────────┘
```

### Container Architecture (C4 Container)
```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Email Insight System                           │
│                                                                         │
│  ┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐   │
│  │                 │────▶│                  │────▶│                 │   │
│  │  Next.js Web    │     │  Hono API        │     │  Gmail API      │   │
│  │  Application    │     │  Server          │     │  Integration    │   │
│  │                 │     │                  │     │                 │   │
│  │  - Dashboard    │     │  - Auth Routes   │     │ - OAuth2        │   │
│  │  - Analytics    │     │  - Analytics     │     │ - Message Sync  │   │
│  │  - Subscriptions│     │  - Subscriptions │     │ - Rate Limiting │   │
│  │  - Settings     │     │  - Gmail Sync    │     │                 │   │
│  └─────────────────┘     │                  │     └─────────────────┘   │
│                          │                  │                           │
│                          │                  │     ┌─────────────────┐   │
│                          │                  │────▶│                 │   │
│                          │                  │     │  SQLite         │   │
│                          │                  │     │  Database       │   │
│                          │                  │     │                 │   │
│                          │                  │     │ - User Data     │   │
│                          │                  │     │ - Email Storage │   │
│                          │                  │     │ - Analytics     │   │
│                          │                  │     │ - Subscriptions │   │
│                          └──────────────────┘     │ - FTS Index     │   │
│                                                   └─────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Architecture (C4 Component - API Server)
```
┌─────────────────────────────────────────────────────────────────────────┐
│                            Hono API Server                               │
│                                                                         │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐       │
│  │  Auth Router    │   │ Analytics Router│   │Subscription     │       │
│  │                 │   │                 │   │Router           │       │
│  │ - POST /auth    │   │ - GET /overview │   │ - GET /         │       │
│  │ - POST /refresh │   │ - GET /volume   │   │ - POST /detect  │       │
│  │ - POST /logout  │   │ - GET /contacts │   │ - POST /unsub   │       │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘       │
│           │                       │                       │             │
│           ▼                       ▼                       ▼             │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐       │
│  │  Auth Service   │   │Analytics Service│   │Subscription     │       │
│  │                 │   │                 │   │Service          │       │
│  │ - JWT Manager   │   │ - Stats Calc    │   │ - Detection     │       │
│  │ - Token Store   │   │ - Aggregation   │   │ - Unsubscribe   │       │
│  │ - OAuth Handler │   │ - Pattern Det.  │   │ - Filter Mgmt   │       │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘       │
│           │                       │                       │             │
│           ▼                       ▼                       ▼             │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐       │
│  │  Gmail Service  │   │ Database Layer  │   │  Crypto Utils   │       │
│  │                 │   │                 │   │                 │       │
│  │ - API Client    │   │ - Drizzle ORM   │   │ - Encryption    │       │
│  │ - Rate Limiter  │   │ - Query Builder │   │ - Token Mgmt    │       │
│  │ - Sync Engine   │   │ - Migrations    │   │ - Hashing       │       │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend
- **Hono**: Ultra-fast web framework with excellent TypeScript support
  - Lightweight (smaller than Express)
  - Built-in middleware ecosystem
  - Edge runtime compatible
  
- **TypeScript**: End-to-end type safety
  - Shared types between frontend and backend
  - Better IDE support and refactoring
  
- **SQLite**: Embedded database
  - Zero configuration
  - Full-text search with FTS5
  - JSON support for flexible schemas
  - Single file for easy backup

### Frontend
- **Next.js 14**: React framework
  - App router for better performance
  - Server components and streaming
  - Built-in optimization and image optimization
  - TypeScript integration
  
- **React 18**: UI library with concurrent features
- **TailwindCSS**: Utility-first styling with design system
- **shadcn/ui**: Component library for consistent design
- **Recharts**: Data visualization and charts
- **Tanstack Table**: Advanced data tables with virtualization
- **Tanstack Query**: Server state management and caching

### Integration Layer
- **Gmail API**: Official Google API
  - OAuth2 authentication
  - Real-time webhook support
  - Batch operations
  - Thread management

## Core Components

### 1. Authentication Service
- Google OAuth2 flow
- JWT token management
- Session handling with secure cookies
- Refresh token rotation

### 2. Gmail Sync Engine
- Incremental sync using history API
- Batch message fetching
- Thread grouping
- Attachment handling
- Rate limit management

### 3. Analytics Engine
- Real-time metrics calculation
- Aggregated statistics
- Contact scoring algorithm
- Pattern detection

### 4. Subscription Detector
- Header analysis (List-Unsubscribe)
- Sender pattern recognition
- Frequency analysis
- Content classification

### 5. Unsubscribe Manager
- One-click unsubscribe (RFC 8058)
- Link extraction and processing
- Gmail filter creation
- Success tracking

## Data Flow

### Initial Setup
1. User authenticates with Google OAuth2
2. System requests Gmail API permissions
3. Initial email sync begins (last 30 days)
4. Analytics processing starts
5. Subscription detection runs

### Ongoing Sync
1. Periodic sync checks (every 15 minutes)
2. Fetch changes using history API
3. Update local SQLite database
4. Recalculate affected analytics
5. Update subscription list

### Unsubscribe Flow
1. User selects subscriptions
2. System checks unsubscribe method
3. Execute unsubscribe (header/link)
4. Create Gmail filter as backup
5. Track success/failure

## Security Considerations

### Data Protection
- OAuth2 tokens encrypted at rest
- SQLite database encryption (optional)
- HTTPS only communication
- CSP headers for XSS protection

### Privacy
- All data stored locally
- No third-party analytics
- User-controlled data retention
- GDPR compliant data export/deletion

## Performance Optimizations

### Database
- Indexed columns for common queries
- Materialized views for analytics
- FTS5 for full-text search
- WAL mode for concurrent access

### API
- Response caching with ETags
- Pagination for large datasets
- Batch operations where possible
- Connection pooling

### Frontend
- Static generation where possible
- Image optimization
- Code splitting
- Prefetching for navigation

## Scalability Considerations

### Current Design (Single User)
- SQLite handles millions of emails
- Local processing ensures privacy
- No infrastructure scaling needed

### Future Multi-User Support
- PostgreSQL migration path
- Redis for caching layer
- Queue system for background jobs
- Horizontal scaling for API servers

## Architectural Decision Records (ADRs)

### ADR-001: SQLite vs PostgreSQL for Initial Implementation
**Status**: Accepted  
**Date**: 2024-08-26  

**Decision**: Use SQLite for initial single-user implementation  

**Context**: Need to choose database for email storage and analytics with requirements for:
- Fast local queries on email data
- Full-text search capabilities
- Simple deployment and maintenance
- Future scalability path

**Options Considered**:
1. SQLite with local storage
2. PostgreSQL with Docker
3. MongoDB for document storage

**Decision Rationale**:
- SQLite provides excellent performance for single-user scenarios
- FTS5 extension offers powerful full-text search
- Zero configuration deployment
- Clear migration path to PostgreSQL for multi-user
- Reduces operational complexity

**Consequences**:
- ✅ Faster development and deployment
- ✅ Better privacy (local data)
- ✅ Excellent query performance
- ❌ Limited to single-user initially
- ❌ Manual scaling for multi-user

### ADR-002: Hono vs Express for API Framework
**Status**: Accepted  
**Date**: 2024-08-26  

**Decision**: Use Hono framework for API server

**Context**: Need fast, type-safe API framework with:
- Excellent TypeScript support
- Small bundle size
- Edge runtime compatibility
- Modern middleware ecosystem

**Options Considered**:
1. Hono (modern, TypeScript-first)
2. Express (mature, large ecosystem)
3. Fastify (performance-focused)
4. Koa (minimalist)

**Decision Rationale**:
- Native TypeScript support without additional setup
- 2-3x faster than Express in benchmarks
- Built-in edge runtime compatibility
- Smaller bundle size (better for serverless)
- Modern async/await patterns

**Consequences**:
- ✅ Better performance and type safety
- ✅ Future-ready for edge deployment
- ✅ Cleaner, more maintainable code
- ❌ Smaller community than Express
- ❌ Fewer third-party middleware options

### ADR-003: Client-Side vs Server-Side Email Processing
**Status**: Accepted  
**Date**: 2024-08-26  

**Decision**: Process emails server-side with local SQLite storage

**Context**: Gmail API returns large volumes of email data requiring:
- Header parsing and analysis
- Content extraction and indexing
- Pattern recognition for subscriptions
- Statistical aggregation

**Options Considered**:
1. Server-side processing with local database
2. Client-side processing with browser storage
3. Hybrid approach with selective processing

**Decision Rationale**:
- Server-side enables complex SQL queries and FTS
- Better performance for large datasets
- Enables background processing and incremental sync
- SQLite provides ACID transactions
- Separates concerns cleanly

**Consequences**:
- ✅ Superior query performance and capabilities
- ✅ Background processing support
- ✅ Better data integrity and consistency
- ✅ Scalable architecture patterns
- ❌ Requires server infrastructure
- ❌ More complex deployment

## Deployment Architecture

### Development Environment
```
┌─────────────────────────────────────────────────────┐
│                Development Setup                     │
│                                                     │
│  ┌─────────────┐    ┌─────────────┐                │
│  │  Frontend   │    │   Backend   │                │
│  │  Next.js    │    │    Hono     │                │
│  │ Port 3000   │    │  Port 3001  │                │
│  └─────────────┘    └─────────────┘                │
│         │                   │                      │
│         └─────────┬─────────┘                      │
│                   │                                │
│               SQLite DB                             │
│            (./data/*.db)                           │
└─────────────────────────────────────────────────────┘
```

### Production Deployment Options

#### Option 1: Single Server Deployment
```
┌─────────────────────────────────────────────────────┐
│                 Production Server                    │
│                                                     │
│  ┌─────────────────────────────────────────────────┐ │
│  │              Nginx Reverse Proxy               │ │
│  │         (SSL termination, static files)        │ │
│  └─────────────────┬───────────────────────────────┘ │
│                    │                                │
│  ┌─────────────────▼───────────────────────────────┐ │
│  │            Docker Container                     │ │
│  │                                                 │ │
│  │  ┌─────────────┐    ┌─────────────┐           │ │
│  │  │  Frontend   │    │   Backend   │           │ │
│  │  │  Next.js    │    │    Hono     │           │ │
│  │  │  (Static)   │    │   (API)     │           │ │
│  │  └─────────────┘    └─────────────┘           │ │
│  │         │                   │                 │ │
│  │         └─────────┬─────────┘                 │ │
│  │                   │                           │ │
│  │               SQLite DB                       │ │
│  │           (Persistent Volume)                 │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

#### Option 2: Container Orchestration (Future)
```
┌─────────────────────────────────────────────────────┐
│                Load Balancer                        │
│               (HTTPS/SSL)                          │
└─────────────────┬───────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼─────────┐ ┌───────▼─────────┐
│   Frontend      │ │   API Server    │
│   Container     │ │   Container     │
│   (Next.js)     │ │   (Hono)       │
└─────────────────┘ └─────────┬───────┘
                              │
                    ┌─────────▼─────────┐
                    │   Database        │
                    │   (PostgreSQL)    │
                    │   + Redis Cache   │
                    └───────────────────┘
```

## Monitoring and Observability

### Health Check Endpoints
```typescript
// Required health check endpoints for production
GET /health          // Basic health status
GET /health/detailed // Detailed system health
GET /metrics         // Prometheus metrics (future)
```

### Key Metrics to Monitor
- API response times (p95 < 200ms)
- Gmail API quota usage (< 80% of limit)
- Database query performance (< 100ms avg)
- Email sync success rate (> 95%)
- Subscription detection accuracy (> 90%)
- Unsubscribe success rate (> 90%)

### Alerting Thresholds
- **Critical**: API errors > 5%, Database unavailable
- **Warning**: Response time > 500ms, Quota > 90%
- **Info**: Sync completion, New user registration