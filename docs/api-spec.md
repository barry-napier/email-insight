# API Specification

## Base URL
```
Development: http://localhost:3001/api
Production: https://api.email-insight.com/v1
```

## Authentication
All endpoints except `/auth/*` and `/health` require JWT token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

**Current Implementation Status:**
- JWT middleware implemented with token blacklisting
- Bearer token validation with comprehensive error handling
- Authentication stubs ready for Phase 2 OAuth2 integration

## API Versioning
- Current version: **v1**
- Version header: `Accept: application/json; version=1`
- URL versioning: `/api/v1/` (production only)

## Request/Response Standards

### Request Headers
```
Content-Type: application/json
Accept: application/json; version=1
Authorization: Bearer <jwt_token>
X-Request-ID: <uuid> (optional, for tracing)
```

### Response Format (✅ Implemented)
All responses follow this standard structure:
```typescript
// Success responses
interface SuccessResponse<T> {
  success: true
  data: T
  message?: string
}

// Error responses
interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    severity: 'low' | 'medium' | 'high' | 'critical'
  }
}
```

**Implementation Details:**
- Consistent response formatting via middleware
- Error severity classification for frontend handling
- Request ID tracking for audit trails

### Pagination Standard
```typescript
interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}
```

### HTTP Status Code Usage
- `200 OK` - Successful GET, PUT requests
- `201 Created` - Successful POST requests
- `204 No Content` - Successful DELETE requests
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate)
- `422 Unprocessable Entity` - Validation errors
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server errors

## Endpoints

### Health & System (✅ Implemented)

#### GET `/api/health`
System health check endpoint
```typescript
Response: SuccessResponse<{
  status: 'healthy' | 'unhealthy'
  timestamp: string
  version: string
  environment: string
  uptime: number
  database: {
    status: 'connected' | 'disconnected'
    latency: number
    error?: string
  }
  services: {
    api: {
      status: 'operational' | 'degraded' | 'down'
      latency: number
    }
    gmail: {
      status: 'operational' | 'down'  // TODO: Phase 2
    }
  }
}>
```

#### GET `/api/health/detailed`
Detailed system health with memory usage
```typescript
Response: SuccessResponse<{
  ...healthStatus
  memory: {
    used: number    // MB
    total: number   // MB
    external: number // MB
    rss: number     // MB
  }
  responseTime: number
}>
```

#### GET `/api/`
Root endpoint - API status
```typescript
Response: SuccessResponse<{
  message: string
  version: string
  timestamp: string
}>
```

### Authentication (🔧 Ready for Phase 2)

#### POST `/auth/google` (Phase 2)
Stubbed endpoint ready for OAuth2 implementation
Initiate Google OAuth2 flow
```typescript
Response: {
  authUrl: string  // Google OAuth consent URL
}
```

#### POST `/auth/callback`
Handle OAuth2 callback
```typescript
Request: {
  code: string     // OAuth2 authorization code
  state: string    // CSRF token
}

Response: {
  token: string    // JWT token
  user: {
    id: string
    email: string
    name: string
    picture?: string
  }
}
```

#### POST `/auth/refresh`
Refresh JWT token
```typescript
Request: {
  refreshToken: string
}

Response: {
  token: string
  refreshToken: string
}
```

#### POST `/auth/logout`
Invalidate tokens
```typescript
Response: {
  success: boolean
}
```

### Email Sync (Phase 2 - Gmail Integration)

#### POST `/sync/start`
Start initial email sync
```typescript
Request: {
  daysToSync?: number  // Default: 30
  maxResults?: number  // Default: 1000
}

Response: {
  jobId: string
  status: 'queued' | 'processing'
}
```

#### GET `/sync/status/:jobId`
Check sync job status
```typescript
Response: {
  jobId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: {
    total: number
    processed: number
    failed: number
  }
  error?: string
}
```

#### POST `/sync/incremental`
Trigger incremental sync
```typescript
Response: {
  messagesAdded: number
  messagesModified: number
  messagesDeleted: number
}
```

### Analytics (Phase 3 - Analytics Engine)
**Database Schema Ready:** `email_analytics` table implemented

#### GET `/analytics/overview`
Get email analytics overview
```typescript
Query: {
  startDate?: string  // ISO date
  endDate?: string    // ISO date
}

Response: {
  totalEmails: number
  totalSent: number
  totalReceived: number
  avgResponseTime: number  // minutes
  busiestDay: string
  busiestHour: number
  topSenders: Array<{
    email: string
    name?: string
    count: number
  }>
  topRecipients: Array<{
    email: string
    name?: string
    count: number
  }>
}
```

#### GET `/analytics/volume`
Get email volume over time
```typescript
Query: {
  groupBy: 'day' | 'week' | 'month'
  startDate?: string
  endDate?: string
}

Response: {
  data: Array<{
    date: string
    sent: number
    received: number
    total: number
  }>
}
```

#### GET `/analytics/contacts`
Get contact analytics
```typescript
Query: {
  limit?: number      // Default: 50
  offset?: number     // Default: 0
  sortBy?: 'frequency' | 'lastContact' | 'responseTime'
}

Response: {
  contacts: Array<{
    email: string
    name?: string
    domain: string
    totalEmails: number
    sent: number
    received: number
    avgResponseTime?: number
    lastContact: string
    relationshipScore: number
  }>
  total: number
}
```

#### GET `/analytics/patterns`
Get email patterns
```typescript
Response: {
  hourlyDistribution: Array<{
    hour: number
    count: number
  }>
  weeklyDistribution: Array<{
    day: string
    count: number
  }>
  monthlyTrend: Array<{
    month: string
    count: number
    growth: number  // percentage
  }>
}
```

### Subscriptions (Phase 4 - Subscription Detection)
**Database Schema Ready:** `subscriptions` table implemented with ML confidence scoring

#### GET `/subscriptions`
List detected subscriptions
```typescript
Query: {
  status?: 'active' | 'unsubscribed' | 'all'
  category?: 'newsletter' | 'marketing' | 'notification'
  sortBy?: 'frequency' | 'volume' | 'lastSeen'
  limit?: number
  offset?: number
}

Response: {
  subscriptions: Array<{
    id: string
    senderEmail: string
    senderName?: string
    domain: string
    category: string
    frequency: 'daily' | 'weekly' | 'monthly' | 'irregular'
    emailCount: number
    firstSeen: string
    lastSeen: string
    unsubscribeMethod?: {
      type: 'header' | 'link' | 'mailto' | 'manual'
      url?: string
      email?: string
    }
    isUnsubscribed: boolean
    unsubscribedAt?: string
    sampleSubjects: string[]
  }>
  total: number
}
```

#### POST `/subscriptions/detect`
Force subscription detection
```typescript
Response: {
  newSubscriptions: number
  updatedSubscriptions: number
}
```

#### POST `/subscriptions/:id/unsubscribe`
Unsubscribe from a subscription
```typescript
Request: {
  method?: 'auto' | 'filter' | 'archive'
}

Response: {
  success: boolean
  method: string
  error?: string
}
```

#### POST `/subscriptions/bulk-unsubscribe`
Bulk unsubscribe
```typescript
Request: {
  subscriptionIds: string[]
  method?: 'auto' | 'filter' | 'archive'
}

Response: {
  results: Array<{
    id: string
    success: boolean
    error?: string
  }>
}
```

#### POST `/subscriptions/:id/resubscribe`
Resubscribe to a subscription
```typescript
Response: {
  success: boolean
}
```

### Search (Phase 2-3 - Gmail Integration + Analytics)
**Database Schema Ready:** Full-text search capabilities with `emails` table

#### GET `/search/emails`
Search emails
```typescript
Query: {
  q: string           // Gmail search syntax
  limit?: number
  offset?: number
  includeBody?: boolean
}

Response: {
  emails: Array<{
    id: string
    threadId: string
    subject: string
    from: string
    to: string[]
    date: string
    snippet: string
    labels: string[]
    body?: string
  }>
  total: number
}
```

### Gmail Filters (Phase 4 - Subscription Management)
**Database Schema Ready:** `gmail_filters` table for tracking created filters

#### POST `/filters/create`
Create Gmail filter
```typescript
Request: {
  criteria: {
    from?: string
    to?: string
    subject?: string
    hasAttachment?: boolean
  }
  action: {
    addLabel?: string
    removeLabel?: string
    archive?: boolean
    delete?: boolean
    markAsRead?: boolean
  }
}

Response: {
  filterId: string
  success: boolean
}
```

#### GET `/filters`
List Gmail filters
```typescript
Response: {
  filters: Array<{
    id: string
    criteria: object
    action: object
  }>
}
```

#### DELETE `/filters/:id`
Delete Gmail filter
```typescript
Response: {
  success: boolean
}
```

## Error Responses

All errors follow this format:
```typescript
{
  error: {
    code: string
    message: string
    details?: any
  }
}
```

### Error Codes
- `AUTH_REQUIRED` - Missing or invalid authentication
- `INVALID_TOKEN` - JWT token expired or invalid
- `GMAIL_API_ERROR` - Gmail API error
- `RATE_LIMIT` - Rate limit exceeded
- `VALIDATION_ERROR` - Invalid request parameters
- `NOT_FOUND` - Resource not found
- `INTERNAL_ERROR` - Server error

## Rate Limiting

- **Gmail API**: 250 quota units per user per second
- **Application API**: 100 requests per minute per user

## Webhooks (Optional)

### POST `/webhooks/gmail`
Receive Gmail push notifications
```typescript
Headers: {
  'X-Goog-Resource-State': string
  'X-Goog-Message-Number': string
  'X-Goog-Resource-ID': string
}

Request: {
  message: {
    data: string  // Base64 encoded
    messageId: string
  }
}
```