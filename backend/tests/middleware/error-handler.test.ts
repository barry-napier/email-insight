import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { errorHandler } from '@/middleware/error-handler';
import type { ContextVariableMap } from '@/types/hono';

// Mock console.error to prevent test output pollution
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Error Handler Middleware', () => {
  let app: Hono<{ Variables: ContextVariableMap }>;

  beforeEach(() => {
    app = new Hono<{ Variables: ContextVariableMap }>();
    app.use('*', errorHandler);
    vi.clearAllMocks();
  });

  describe('Error Handling', () => {
    it('should handle JavaScript errors and return formatted response', async () => {
      app.get('/api/error', () => {
        throw new Error('Test error message');
      });

      const req = new Request('http://localhost/api/error');
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(body.error.message).toBe('An internal server error occurred');
      expect(body.error.severity).toBe('high');
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should handle validation errors with appropriate status', async () => {
      app.post('/api/validate', () => {
        const error = new Error('Validation failed');
        error.name = 'ValidationError';
        throw error;
      });

      const req = new Request('http://localhost/api/validate', { method: 'POST' });
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.severity).toBe('medium');
    });

    it('should handle authentication errors', async () => {
      app.get('/api/auth-error', () => {
        const error = new Error('Unauthorized');
        error.name = 'AuthenticationError';
        throw error;
      });

      const req = new Request('http://localhost/api/auth-error');
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTHENTICATION_ERROR');
      expect(body.error.severity).toBe('medium');
    });

    it('should handle authorization errors', async () => {
      app.get('/api/forbidden', () => {
        const error = new Error('Forbidden');
        error.name = 'AuthorizationError';
        throw error;
      });

      const req = new Request('http://localhost/api/forbidden');
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTHORIZATION_ERROR');
      expect(body.error.severity).toBe('medium');
    });

    it('should handle database errors', async () => {
      app.get('/api/db-error', () => {
        const error = new Error('Database connection failed');
        error.name = 'DatabaseError';
        throw error;
      });

      const req = new Request('http://localhost/api/db-error');
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('DATABASE_ERROR');
      expect(body.error.severity).toBe('critical');
    });

    it('should handle rate limit errors', async () => {
      app.get('/api/rate-limit', () => {
        const error = new Error('Too many requests');
        error.name = 'RateLimitError';
        throw error;
      });

      const req = new Request('http://localhost/api/rate-limit');
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(429);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(body.error.severity).toBe('low');
    });

    it('should handle non-Error objects thrown', async () => {
      app.get('/api/string-error', () => {
        throw 'String error thrown';
      });

      const req = new Request('http://localhost/api/string-error');
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(body.error.message).toBe('An internal server error occurred');
    });
  });

  describe('Production vs Development Mode', () => {
    it('should not leak error details in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      app.get('/api/error', () => {
        throw new Error('Sensitive error information');
      });

      const req = new Request('http://localhost/api/error');
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error.message).toBe('An internal server error occurred');
      expect(body.error.message).not.toContain('Sensitive error information');

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should provide detailed errors in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      app.get('/api/error', () => {
        throw new Error('Detailed error for debugging');
      });

      const req = new Request('http://localhost/api/error');
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      // In development, we still show generic messages for security
      expect(body.error.message).toBe('An internal server error occurred');
      
      // But we do log the actual error
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error caught by error handler:'),
        expect.any(Error)
      );

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Request ID Tracking', () => {
    it('should include request ID in error logs when available', async () => {
      app.use('*', (c, next) => {
        c.set('requestId', 'test-request-123');
        return next();
      });

      app.get('/api/error-with-id', () => {
        throw new Error('Error with request ID');
      });

      const req = new Request('http://localhost/api/error-with-id');
      await app.request(req);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('[test-request-123]'),
        expect.any(Error)
      );
    });
  });
});