# Performance Architecture Guide

## Overview
This document defines performance requirements, optimization strategies, and monitoring approaches for the Email Insight application to ensure scalable and responsive user experience.

## Performance Requirements

### Response Time Targets
```typescript
interface PerformanceTargets {
  api: {
    p50: number  // 50th percentile response time
    p95: number  // 95th percentile response time
    p99: number  // 99th percentile response time
  }
  database: {
    simpleQuery: number      // Simple SELECT queries
    complexQuery: number     // JOIN queries with aggregation
    fullTextSearch: number   // FTS5 search queries
  }
  frontend: {
    initialLoad: number      // Time to first contentful paint
    routeTransition: number  // Client-side navigation
    interaction: number      // Time to interactive response
  }
}

const PERFORMANCE_TARGETS: PerformanceTargets = {
  api: {
    p50: 100,   // 100ms
    p95: 200,   // 200ms  
    p99: 500    // 500ms
  },
  database: {
    simpleQuery: 10,      // 10ms
    complexQuery: 50,     // 50ms
    fullTextSearch: 100   // 100ms
  },
  frontend: {
    initialLoad: 2000,      // 2s
    routeTransition: 300,   // 300ms
    interaction: 16         // 16ms (60fps)
  }
}
```

### Throughput Requirements
- **Concurrent Users**: Support 100+ concurrent users per instance
- **API Requests**: Handle 1000+ requests per minute per user
- **Email Processing**: Process 10,000+ emails in initial sync within 30 seconds
- **Database**: Support 1M+ emails per user with consistent performance

## Database Performance Optimization

### Index Strategy
```sql
-- Email queries optimization
CREATE INDEX idx_emails_user_date_perf ON emails(user_id, date DESC) 
WHERE is_trash = 0 AND is_spam = 0;

-- Subscription queries
CREATE INDEX idx_emails_subscription_perf ON emails(user_id, from_email, date DESC);

-- Analytics aggregation
CREATE INDEX idx_emails_analytics ON emails(user_id, date, is_sent, is_received)
WHERE is_trash = 0 AND is_spam = 0;

-- Contact relationship queries
CREATE INDEX idx_emails_contacts ON emails(user_id, from_email, to_emails);

-- Full-text search optimization
CREATE INDEX idx_emails_fts_content ON emails(subject, snippet) 
WHERE length(subject) > 0;
```

### Materialized Views for Analytics
```sql
-- Pre-computed daily statistics
CREATE VIEW daily_email_stats AS
SELECT 
    user_id,
    date(date, 'unixepoch') as day,
    COUNT(*) as total_emails,
    SUM(is_sent) as emails_sent,
    SUM(is_received) as emails_received,
    COUNT(DISTINCT from_email) as unique_senders,
    COUNT(DISTINCT json_extract(to_emails, '$[0]')) as unique_recipients,
    AVG(size_bytes) as avg_size
FROM emails 
WHERE is_trash = 0 AND is_spam = 0
GROUP BY user_id, day;

-- Pre-computed contact statistics
CREATE VIEW contact_stats AS
SELECT 
    user_id,
    from_email,
    COUNT(*) as email_count,
    MIN(date) as first_contact,
    MAX(date) as last_contact,
    COUNT(DISTINCT date(date, 'unixepoch')) as contact_days,
    AVG(
        CASE 
            WHEN is_sent = 1 THEN 
                (SELECT MIN(date) FROM emails e2 
                 WHERE e2.from_email = emails.to_emails 
                 AND e2.date > emails.date 
                 AND e2.user_id = emails.user_id) - emails.date
        END
    ) / 60.0 as avg_response_time_minutes
FROM emails
WHERE is_trash = 0 AND is_spam = 0
GROUP BY user_id, from_email
HAVING email_count >= 2;
```

### Query Optimization Patterns
```typescript
// Batch loading pattern
export class EmailRepository {
  async getEmailsBatch(userIds: number[], limit = 1000) {
    // Use IN clause for batch loading instead of N+1 queries
    const query = `
      SELECT * FROM emails 
      WHERE user_id IN (${userIds.map(() => '?').join(',')})
      AND is_trash = 0 
      ORDER BY date DESC 
      LIMIT ?
    `;
    return db.prepare(query).all(...userIds, limit);
  }

  // Pagination with cursor instead of OFFSET
  async getEmailsCursor(userId: number, cursor?: string, limit = 50) {
    const query = cursor 
      ? `SELECT * FROM emails 
         WHERE user_id = ? AND date < ? 
         ORDER BY date DESC LIMIT ?`
      : `SELECT * FROM emails 
         WHERE user_id = ? 
         ORDER BY date DESC LIMIT ?`;
         
    const params = cursor ? [userId, cursor, limit] : [userId, limit];
    return db.prepare(query).all(...params);
  }
}
```

## API Performance Optimization

### Response Caching Strategy
```typescript
interface CacheConfig {
  key: string
  ttl: number      // Time to live in seconds
  tags: string[]   // For cache invalidation
  compress: boolean
}

const CACHE_CONFIGS: Record<string, CacheConfig> = {
  'analytics.overview': {
    key: 'analytics:overview:{userId}',
    ttl: 300,      // 5 minutes
    tags: ['analytics', 'user'],
    compress: true
  },
  'analytics.volume': {
    key: 'analytics:volume:{userId}:{startDate}:{endDate}',
    ttl: 600,      // 10 minutes
    tags: ['analytics', 'user'],
    compress: true
  },
  'subscriptions.list': {
    key: 'subscriptions:list:{userId}:{filters}',
    ttl: 120,      // 2 minutes
    tags: ['subscriptions', 'user'],
    compress: false
  }
}

// Cache middleware implementation
export const cacheMiddleware = (config: CacheConfig) => {
  return async (c: Context, next: Next) => {
    const userId = c.get('userId');
    const cacheKey = config.key.replace('{userId}', userId.toString());
    
    // Try to get from cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      const data = config.compress 
        ? JSON.parse(zlib.gunzipSync(Buffer.from(cached, 'base64')).toString())
        : JSON.parse(cached);
      return c.json(data);
    }
    
    // Execute handler and cache result
    await next();
    
    const response = await c.res.clone().json();
    const serialized = JSON.stringify(response);
    const toCache = config.compress 
      ? zlib.gzipSync(serialized).toString('base64')
      : serialized;
      
    await redis.setex(cacheKey, config.ttl, toCache);
    
    // Tag for invalidation
    for (const tag of config.tags) {
      await redis.sadd(`tags:${tag}`, cacheKey);
    }
  };
};
```

### Background Job Processing
```typescript
interface BackgroundJob {
  id: string
  type: string
  payload: any
  priority: number
  createdAt: Date
  attemptCount: number
}

export class JobQueue {
  private queue: BackgroundJob[] = []
  private processing = false
  
  async add(type: string, payload: any, priority = 0) {
    const job: BackgroundJob = {
      id: crypto.randomUUID(),
      type,
      payload,
      priority,
      createdAt: new Date(),
      attemptCount: 0
    }
    
    this.queue.push(job)
    this.queue.sort((a, b) => b.priority - a.priority)
    
    if (!this.processing) {
      this.processQueue()
    }
  }
  
  private async processQueue() {
    this.processing = true
    
    while (this.queue.length > 0) {
      const job = this.queue.shift()!
      
      try {
        await this.executeJob(job)
      } catch (error) {
        job.attemptCount++
        if (job.attemptCount < 3) {
          // Retry with exponential backoff
          setTimeout(() => this.add(job.type, job.payload, job.priority), 
                    Math.pow(2, job.attemptCount) * 1000)
        }
      }
    }
    
    this.processing = false
  }
  
  private async executeJob(job: BackgroundJob) {
    switch (job.type) {
      case 'email.sync':
        await this.syncEmails(job.payload)
        break
      case 'analytics.calculate':
        await this.calculateAnalytics(job.payload)
        break
      case 'subscription.detect':
        await this.detectSubscriptions(job.payload)
        break
    }
  }
}
```

## Frontend Performance Optimization

### React Performance Patterns
```tsx
// Component memoization
const EmailList = memo(({ emails }: { emails: Email[] }) => {
  return (
    <div>
      {emails.map(email => (
        <EmailItem key={email.id} email={email} />
      ))}
    </div>
  )
})

// Callback memoization
const Dashboard = () => {
  const [filter, setFilter] = useState('')
  
  const handleFilterChange = useCallback((newFilter: string) => {
    setFilter(newFilter)
  }, [])
  
  const filteredEmails = useMemo(() => {
    return emails.filter(email => 
      email.subject.toLowerCase().includes(filter.toLowerCase())
    )
  }, [emails, filter])
  
  return <EmailList emails={filteredEmails} />
}

// Virtual scrolling for large lists
import { FixedSizeList as List } from 'react-window'

const VirtualizedEmailList = ({ emails }: { emails: Email[] }) => {
  const Row = ({ index, style }: { index: number, style: CSSProperties }) => (
    <div style={style}>
      <EmailItem email={emails[index]} />
    </div>
  )
  
  return (
    <List
      height={600}
      itemCount={emails.length}
      itemSize={80}
      width='100%'
    >
      {Row}
    </List>
  )
}
```

### Data Fetching Optimization
```tsx
// React Query for server state management
const useAnalytics = (userId: number, timeRange: string) => {
  return useQuery({
    queryKey: ['analytics', userId, timeRange],
    queryFn: () => fetchAnalytics(userId, timeRange),
    staleTime: 5 * 60 * 1000,  // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  })
}

// Prefetching for navigation
const Dashboard = () => {
  const queryClient = useQueryClient()
  
  const prefetchSubscriptions = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['subscriptions'],
      queryFn: fetchSubscriptions,
    })
  }, [queryClient])
  
  return (
    <nav>
      <Link 
        to="/subscriptions" 
        onMouseEnter={prefetchSubscriptions}
      >
        Subscriptions
      </Link>
    </nav>
  )
}

// Infinite query for pagination
const useInfiniteEmails = (userId: number) => {
  return useInfiniteQuery({
    queryKey: ['emails', userId],
    queryFn: ({ pageParam = null }) => 
      fetchEmails(userId, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 2 * 60 * 1000,  // 2 minutes
  })
}
```

## Performance Monitoring

### Metrics Collection
```typescript
interface PerformanceMetrics {
  requestDuration: number
  dbQueryDuration: number
  cacheHitRate: number
  memoryUsage: number
  cpuUsage: number
  activeConnections: number
}

export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map()
  
  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    const values = this.metrics.get(name)!
    values.push(value)
    
    // Keep only last 1000 measurements
    if (values.length > 1000) {
      values.shift()
    }
  }
  
  getStats(name: string) {
    const values = this.metrics.get(name) || []
    if (values.length === 0) return null
    
    const sorted = [...values].sort((a, b) => a - b)
    
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b) / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    }
  }
}

// Performance middleware
export const performanceMiddleware = async (c: Context, next: Next) => {
  const start = process.hrtime.bigint()
  
  await next()
  
  const duration = Number(process.hrtime.bigint() - start) / 1000000 // Convert to ms
  
  performanceMonitor.recordMetric('api.request.duration', duration)
  performanceMonitor.recordMetric(`api.${c.req.method}.duration`, duration)
  
  c.res.headers.set('X-Response-Time', `${duration}ms`)
}
```

### Database Query Monitoring
```typescript
// Query performance tracking
export class DatabaseMonitor {
  async executeWithTracking<T>(
    query: string, 
    params: any[], 
    operation: () => Promise<T>
  ): Promise<T> {
    const start = process.hrtime.bigint()
    
    try {
      const result = await operation()
      const duration = Number(process.hrtime.bigint() - start) / 1000000
      
      this.recordQueryMetrics(query, duration, true)
      
      return result
    } catch (error) {
      const duration = Number(process.hrtime.bigint() - start) / 1000000
      this.recordQueryMetrics(query, duration, false)
      throw error
    }
  }
  
  private recordQueryMetrics(query: string, duration: number, success: boolean) {
    const queryType = this.getQueryType(query)
    
    performanceMonitor.recordMetric('db.query.duration', duration)
    performanceMonitor.recordMetric(`db.${queryType}.duration`, duration)
    
    if (!success) {
      performanceMonitor.recordMetric('db.query.errors', 1)
    }
    
    // Log slow queries
    if (duration > 100) {
      console.warn(`Slow query detected: ${duration}ms`, {
        query: query.substring(0, 100),
        duration,
        success
      })
    }
  }
  
  private getQueryType(query: string): string {
    const normalized = query.toLowerCase().trim()
    if (normalized.startsWith('select')) return 'select'
    if (normalized.startsWith('insert')) return 'insert'
    if (normalized.startsWith('update')) return 'update'
    if (normalized.startsWith('delete')) return 'delete'
    return 'other'
  }
}
```

### Performance Testing
```typescript
// Load testing utility
export class LoadTester {
  async runLoadTest(
    endpoint: string,
    concurrency: number,
    duration: number
  ) {
    const results: Array<{ duration: number, success: boolean }> = []
    const startTime = Date.now()
    
    const workers = Array(concurrency).fill(null).map(async () => {
      while (Date.now() - startTime < duration) {
        const requestStart = Date.now()
        
        try {
          await fetch(endpoint)
          results.push({
            duration: Date.now() - requestStart,
            success: true
          })
        } catch (error) {
          results.push({
            duration: Date.now() - requestStart,
            success: false
          })
        }
      }
    })
    
    await Promise.all(workers)
    
    return this.analyzeResults(results)
  }
  
  private analyzeResults(results: Array<{ duration: number, success: boolean }>) {
    const successfulRequests = results.filter(r => r.success)
    const durations = successfulRequests.map(r => r.duration).sort()
    
    return {
      totalRequests: results.length,
      successfulRequests: successfulRequests.length,
      failedRequests: results.length - successfulRequests.length,
      successRate: (successfulRequests.length / results.length) * 100,
      avgResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50: durations[Math.floor(durations.length * 0.5)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
      requestsPerSecond: results.length / (durations[durations.length - 1] - durations[0]) * 1000
    }
  }
}
```

## Performance Alerting

### Alert Thresholds
```typescript
const PERFORMANCE_ALERTS = {
  API_RESPONSE_TIME_P95_HIGH: {
    threshold: 500,  // ms
    severity: 'warning'
  },
  API_RESPONSE_TIME_P99_HIGH: {
    threshold: 1000, // ms
    severity: 'critical'
  },
  DB_QUERY_TIME_HIGH: {
    threshold: 200,  // ms
    severity: 'warning'
  },
  MEMORY_USAGE_HIGH: {
    threshold: 0.8,  // 80% of available memory
    severity: 'critical'
  },
  ERROR_RATE_HIGH: {
    threshold: 0.05, // 5% error rate
    severity: 'critical'
  }
}

export class AlertManager {
  checkPerformanceThresholds() {
    const apiP95 = performanceMonitor.getStats('api.request.duration')?.p95
    if (apiP95 && apiP95 > PERFORMANCE_ALERTS.API_RESPONSE_TIME_P95_HIGH.threshold) {
      this.sendAlert('API_RESPONSE_TIME_P95_HIGH', {
        current: apiP95,
        threshold: PERFORMANCE_ALERTS.API_RESPONSE_TIME_P95_HIGH.threshold
      })
    }
    
    // Check other thresholds...
  }
  
  private sendAlert(type: string, data: any) {
    console.error(`Performance Alert: ${type}`, data)
    // Send to monitoring service
  }
}
```