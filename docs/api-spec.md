# API Specification

## Base URL
```
Development: http://localhost:3001/api
Production: https://api.email-insight.com/v1
```

## Authentication
All endpoints except `/auth/*` require JWT token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

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

### Response Format
All responses follow this standard structure:
```typescript
interface APIResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
    requestId?: string
  }
  meta?: {
    timestamp: string
    version: string
    requestId: string
  }
}
```

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

### Authentication

#### POST `/auth/google`
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

### Email Sync

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

### Analytics

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

### Subscriptions

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

### Search

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

### Gmail Filters

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