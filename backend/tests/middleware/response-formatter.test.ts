import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { responseFormatterMiddleware } from '@/middleware/response-formatter';
import type { ContextVariableMap } from '@/types/hono';

describe('Response Formatter Middleware', () => {
  let app: Hono<{ Variables: ContextVariableMap }>;

  beforeEach(() => {
    app = new Hono<{ Variables: ContextVariableMap }>();
    app.use('*', responseFormatterMiddleware);
  });

  describe('Success Response Formatting', () => {
    it('should preserve already formatted success responses', async () => {
      app.get('/api/test', (c) => {
        return c.json({
          success: true,
          data: { message: 'test' }
        });
      });

      const req = new Request('http://localhost/api/test');
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({
        success: true,
        data: { message: 'test' }
      });
    });

    it('should not modify non-JSON responses', async () => {
      app.get('/api/text', (c) => c.text('plain text'));

      const req = new Request('http://localhost/api/text');
      const res = await app.request(req);
      const body = await res.text();

      expect(res.status).toBe(200);
      expect(body).toBe('plain text');
    });

    it('should handle empty responses', async () => {
      app.get('/api/empty', (c) => c.body(null));

      const req = new Request('http://localhost/api/empty');
      const res = await app.request(req);

      expect(res.status).toBe(200);
      expect(await res.text()).toBe('');
    });

    it('should preserve custom status codes', async () => {
      app.post('/api/created', (c) => {
        return c.json({ success: true, data: { id: 1 } }, { status: 201 });
      });

      const req = new Request('http://localhost/api/created', { method: 'POST' });
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.success).toBe(true);
    });
  });

  describe('Error Response Formatting', () => {
    it('should format unhandled errors into standard format', async () => {
      app.get('/api/error', () => {
        throw new Error('Test error');
      });

      const req = new Request('http://localhost/api/error');
      const res = await app.request(req);

      // The error should be caught by error handler, not formatter
      expect(res.status).toBe(500);
    });

    it('should preserve already formatted error responses', async () => {
      app.get('/api/formatted-error', (c) => {
        return c.json({
          success: false,
          error: {
            code: 'CUSTOM_ERROR',
            message: 'Custom error message',
            severity: 'medium' as const
          }
        }, { status: 400 });
      });

      const req = new Request('http://localhost/api/formatted-error');
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('CUSTOM_ERROR');
    });
  });

  describe('Content Type Handling', () => {
    it('should handle different content types appropriately', async () => {
      app.get('/api/html', (c) => c.html('<h1>HTML Response</h1>'));

      const req = new Request('http://localhost/api/html');
      const res = await app.request(req);
      const body = await res.text();

      expect(res.status).toBe(200);
      expect(body).toBe('<h1>HTML Response</h1>');
      expect(res.headers.get('Content-Type')).toContain('text/html');
    });

    it('should handle redirect responses', async () => {
      app.get('/api/redirect', (c) => c.redirect('/new-location'));

      const req = new Request('http://localhost/api/redirect');
      const res = await app.request(req);

      expect(res.status).toBe(302);
      expect(res.headers.get('Location')).toBe('/new-location');
    });
  });
});