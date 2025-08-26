# Error Handling Architecture

## Overview
This document defines comprehensive error handling patterns across the Email Insight application, ensuring consistent error responses, proper logging, and graceful failure recovery.

## Error Classification

### Error Categories
```typescript
enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization', 
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  SYSTEM = 'system',
  RATE_LIMIT = 'rate_limit'
}

enum ErrorSeverity {
  LOW = 'low',           // User input errors, expected failures
  MEDIUM = 'medium',     // Business logic violations, temporary failures
  HIGH = 'high',         // System errors, data integrity issues
  CRITICAL = 'critical'  // Security breaches, data corruption
}
```

## Error Response Format

### Standard Error Structure
```typescript
interface ErrorResponse {
  success: false
  error: {
    code: string           // Machine-readable error code
    message: string        // Human-readable error message
    category: ErrorCategory
    severity: ErrorSeverity
    details?: any         // Additional error context
    requestId: string     // For tracing
    timestamp: string     // ISO timestamp
    field?: string        // For validation errors
    retryable: boolean    // Whether client should retry
  }
}
```

### Error Codes Reference

#### Authentication Errors (AUTH_*)
```typescript
const AUTH_ERRORS = {
  AUTH_REQUIRED: {
    code: 'AUTH_REQUIRED',
    message: 'Authentication required',
    httpStatus: 401,
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.LOW
  },
  TOKEN_EXPIRED: {
    code: 'TOKEN_EXPIRED', 
    message: 'Access token has expired',
    httpStatus: 401,
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.LOW,
    retryable: true
  },
  INVALID_TOKEN: {
    code: 'INVALID_TOKEN',
    message: 'Invalid or malformed token',
    httpStatus: 401,
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM
  },
  REFRESH_TOKEN_EXPIRED: {
    code: 'REFRESH_TOKEN_EXPIRED',
    message: 'Refresh token has expired, re-authentication required',
    httpStatus: 401,
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM
  }
}
```

#### Gmail API Errors (GMAIL_*)
```typescript
const GMAIL_ERRORS = {
  GMAIL_QUOTA_EXCEEDED: {
    code: 'GMAIL_QUOTA_EXCEEDED',
    message: 'Gmail API quota limit exceeded',
    httpStatus: 429,
    category: ErrorCategory.EXTERNAL_SERVICE,
    severity: ErrorSeverity.HIGH,
    retryable: true
  },
  GMAIL_INSUFFICIENT_PERMISSION: {
    code: 'GMAIL_INSUFFICIENT_PERMISSION',
    message: 'Insufficient Gmail API permissions',
    httpStatus: 403,
    category: ErrorCategory.AUTHORIZATION,
    severity: ErrorSeverity.MEDIUM
  },
  GMAIL_SERVICE_UNAVAILABLE: {
    code: 'GMAIL_SERVICE_UNAVAILABLE',
    message: 'Gmail API temporarily unavailable',
    httpStatus: 503,
    category: ErrorCategory.EXTERNAL_SERVICE,
    severity: ErrorSeverity.HIGH,
    retryable: true
  },
  GMAIL_MESSAGE_NOT_FOUND: {
    code: 'GMAIL_MESSAGE_NOT_FOUND',
    message: 'Email message not found or deleted',
    httpStatus: 404,
    category: ErrorCategory.EXTERNAL_SERVICE,
    severity: ErrorSeverity.LOW
  }
}
```

#### Database Errors (DB_*)
```typescript
const DB_ERRORS = {
  DB_CONNECTION_FAILED: {
    code: 'DB_CONNECTION_FAILED',
    message: 'Database connection failed',
    httpStatus: 500,
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.CRITICAL,
    retryable: true
  },
  DB_QUERY_FAILED: {
    code: 'DB_QUERY_FAILED',
    message: 'Database query execution failed',
    httpStatus: 500,
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.HIGH
  },
  DB_CONSTRAINT_VIOLATION: {
    code: 'DB_CONSTRAINT_VIOLATION',
    message: 'Database constraint violation',
    httpStatus: 409,
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.MEDIUM
  },
  DB_TRANSACTION_FAILED: {
    code: 'DB_TRANSACTION_FAILED',
    message: 'Database transaction failed',
    httpStatus: 500,
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.HIGH,
    retryable: true
  }
}
```

## Error Handling Implementation

### Backend Error Handler
```typescript
import { ErrorHandler, HTTPException } from 'hono';
import { logger } from '../utils/logger';

export const globalErrorHandler: ErrorHandler = (error, c) => {
  const requestId = c.get('requestId') || 'unknown';
  
  // Log error with context
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    requestId,
    url: c.req.url,
    method: c.req.method,
    userAgent: c.req.header('user-agent')
  });

  // Handle known error types
  if (error instanceof HTTPException) {
    return c.json({
      success: false,
      error: {
        code: error.message.includes('auth') ? 'AUTH_REQUIRED' : 'BAD_REQUEST',
        message: error.message,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        requestId,
        timestamp: new Date().toISOString(),
        retryable: false
      }
    }, error.status);
  }

  // Gmail API errors
  if (error.message.includes('Gmail API')) {
    const gmailError = mapGmailError(error);
    return c.json({
      success: false,
      error: {
        ...gmailError,
        requestId,
        timestamp: new Date().toISOString()
      }
    }, gmailError.httpStatus);
  }

  // Database errors
  if (error.message.includes('SQLITE') || error.name === 'DatabaseError') {
    const dbError = mapDatabaseError(error);
    return c.json({
      success: false,
      error: {
        ...dbError,
        requestId,
        timestamp: new Date().toISOString()
      }
    }, dbError.httpStatus);
  }

  // Fallback for unexpected errors
  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.CRITICAL,
      requestId,
      timestamp: new Date().toISOString(),
      retryable: false
    }
  }, 500);
};
```

### Error Mapping Functions
```typescript
function mapGmailError(error: Error) {
  if (error.message.includes('quota')) {
    return GMAIL_ERRORS.GMAIL_QUOTA_EXCEEDED;
  }
  if (error.message.includes('permission')) {
    return GMAIL_ERRORS.GMAIL_INSUFFICIENT_PERMISSION;
  }
  if (error.message.includes('503')) {
    return GMAIL_ERRORS.GMAIL_SERVICE_UNAVAILABLE;
  }
  return {
    code: 'GMAIL_UNKNOWN_ERROR',
    message: 'Unknown Gmail API error',
    httpStatus: 500,
    category: ErrorCategory.EXTERNAL_SERVICE,
    severity: ErrorSeverity.HIGH
  };
}

function mapDatabaseError(error: Error) {
  if (error.message.includes('UNIQUE constraint')) {
    return DB_ERRORS.DB_CONSTRAINT_VIOLATION;
  }
  if (error.message.includes('database is locked')) {
    return DB_ERRORS.DB_CONNECTION_FAILED;
  }
  return DB_ERRORS.DB_QUERY_FAILED;
}
```

### Custom Error Classes
```typescript
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public httpStatus: number = 500,
    public category: ErrorCategory = ErrorCategory.SYSTEM,
    public severity: ErrorSeverity = ErrorSeverity.HIGH,
    public retryable: boolean = false,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string, details?: any) {
    super(
      'VALIDATION_ERROR',
      message,
      422,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      false,
      { field, ...details }
    );
  }
}

export class BusinessLogicError extends AppError {
  constructor(code: string, message: string, details?: any) {
    super(
      code,
      message,
      400,
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM,
      false,
      details
    );
  }
}
```

## Frontend Error Handling

### Error Boundary Component
```tsx
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<
  PropsWithChildren<{}>, 
  ErrorBoundaryState
> {
  constructor(props: PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    console.error('React Error Boundary caught an error:', error, errorInfo);
    
    // Report to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // reportError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>We're sorry, but something unexpected happened.</p>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### API Error Handler Hook
```tsx
export function useErrorHandler() {
  const [error, setError] = useState<ErrorResponse | null>(null);
  
  const handleError = useCallback((error: any) => {
    if (error.response?.data?.error) {
      const apiError = error.response.data.error;
      setError(apiError);
      
      // Handle specific error types
      switch (apiError.code) {
        case 'TOKEN_EXPIRED':
          // Trigger token refresh
          window.location.href = '/auth/refresh';
          break;
          
        case 'GMAIL_QUOTA_EXCEEDED':
          // Show user-friendly message about rate limits
          toast.error('Gmail API limit reached. Please try again later.');
          break;
          
        case 'VALIDATION_ERROR':
          // Show field-specific validation errors
          toast.error(apiError.message);
          break;
          
        default:
          toast.error('An unexpected error occurred');
      }
    } else {
      // Network or other errors
      setError({
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to server',
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.HIGH
      });
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { error, handleError, clearError };
}
```

## Retry Strategies

### Exponential Backoff Implementation
```typescript
export class RetryHandler {
  private maxRetries: number;
  private baseDelayMs: number;
  private maxDelayMs: number;

  constructor(maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 30000) {
    this.maxRetries = maxRetries;
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
  }

  async execute<T>(
    operation: () => Promise<T>,
    isRetryable: (error: any) => boolean = () => true
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === this.maxRetries || !isRetryable(error)) {
          throw error;
        }

        const delay = Math.min(
          this.baseDelayMs * Math.pow(2, attempt),
          this.maxDelayMs
        );

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const retryHandler = new RetryHandler();

async function syncEmails() {
  return retryHandler.execute(
    () => gmailClient.syncMessages(),
    (error) => {
      // Only retry on specific error types
      return error.code === 'GMAIL_SERVICE_UNAVAILABLE' ||
             error.code === 'GMAIL_QUOTA_EXCEEDED' ||
             error.code === 'NETWORK_ERROR';
    }
  );
}
```

## Circuit Breaker Pattern

```typescript
enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open', 
  HALF_OPEN = 'half_open'
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime?: Date;
  private nextAttempt?: Date;

  constructor(
    private failureThreshold: number = 5,
    private timeoutMs: number = 60000,
    private resetTimeoutMs: number = 30000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.nextAttempt && new Date() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      const result = await Promise.race([
        operation(),
        this.timeout()
      ]);

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = new Date(Date.now() + this.resetTimeoutMs);
    }
  }

  private async timeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), this.timeoutMs);
    });
  }
}
```

## Monitoring and Alerting

### Error Metrics
```typescript
interface ErrorMetrics {
  errorCount: number
  errorRate: number
  errorsByCategory: Record<ErrorCategory, number>
  errorsBySeverity: Record<ErrorSeverity, number>
  topErrors: Array<{
    code: string
    count: number
    lastSeen: string
  }>
}

export class ErrorTracker {
  private errors: Map<string, number> = new Map();
  
  track(error: ErrorResponse['error']) {
    const key = `${error.category}:${error.code}`;
    this.errors.set(key, (this.errors.get(key) || 0) + 1);
    
    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(error);
    }
  }
  
  private sendToMonitoring(error: ErrorResponse['error']) {
    // Implementation for external monitoring service
    // e.g., Sentry, DataDog, etc.
  }
}
```

### Health Check Error Handling
```typescript
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  checks: Record<string, any>
}> {
  const checks: Record<string, any> = {};
  
  try {
    // Database health
    await db.query('SELECT 1');
    checks.database = { status: 'healthy' };
  } catch (error) {
    checks.database = { 
      status: 'unhealthy',
      error: error.message 
    };
  }
  
  try {
    // Gmail API health
    await gmailClient.getProfile();
    checks.gmail = { status: 'healthy' };
  } catch (error) {
    checks.gmail = { 
      status: 'degraded',
      error: error.message 
    };
  }
  
  const unhealthyChecks = Object.values(checks)
    .filter(check => check.status === 'unhealthy').length;
  const degradedChecks = Object.values(checks)
    .filter(check => check.status === 'degraded').length;
    
  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (unhealthyChecks > 0) {
    status = 'unhealthy';
  } else if (degradedChecks > 0) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }
  
  return { status, checks };
}
```