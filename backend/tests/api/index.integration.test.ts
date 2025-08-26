import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import apiRoutes from '@/api';
import type { ContextVariableMap } from '@/types/hono';

describe('API Routes Integration Tests', () => {
  let app: Hono<{ Variables: ContextVariableMap }>;

  beforeAll(() => {
    app = new Hono<{ Variables: ContextVariableMap }>();
    app.route('/api', apiRoutes);
  });

  describe('Route Registration', () => {
    it('should register health routes correctly', async () => {
      const healthReq = new Request('http://localhost/api/health');
      const healthRes = await app.request(healthReq);

      expect(healthRes.status).toBe(200);
      
      const body = await healthRes.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    it('should register auth routes correctly', async () => {
      // Test that auth routes are registered (they should return proper errors for unauthenticated requests)
      const authReq = new Request('http://localhost/api/auth/profile');
      const authRes = await app.request(authReq);

      // Should not be 404, meaning the route is registered
      expect(authRes.status).not.toBe(404);
    });

    it('should handle unregistered routes with 404', async () => {
      const invalidReq = new Request('http://localhost/api/nonexistent');
      const invalidRes = await app.request(invalidReq);

      expect(invalidRes.status).toBe(404);
      
      const body = await invalidRes.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('ROUTE_NOT_FOUND');
    });
  });

  describe('API Response Format', () => {
    it('should return responses in standard format', async () => {
      const req = new Request('http://localhost/api/health');
      const res = await app.request(req);
      const body = await res.json();

      expect(body).toHaveProperty('success');
      expect(body.success).toBe(true);
      expect(body).toHaveProperty('data');
    });

    it('should return errors in standard format', async () => {
      const req = new Request('http://localhost/api/nonexistent');
      const res = await app.request(req);
      const body = await res.json();

      expect(body).toHaveProperty('success');
      expect(body.success).toBe(false);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('severity');
    });
  });

  describe('HTTP Methods', () => {
    it('should handle GET requests correctly', async () => {
      const req = new Request('http://localhost/api/health', { method: 'GET' });
      const res = await app.request(req);

      expect(res.status).toBe(200);
    });

    it('should handle POST requests to auth endpoints', async () => {
      const req = new Request('http://localhost/api/auth/login', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' })
      });
      const res = await app.request(req);

      // Should not be 405 (Method Not Allowed), meaning POST is supported
      expect(res.status).not.toBe(405);
    });

    it('should reject unsupported methods appropriately', async () => {
      const req = new Request('http://localhost/api/health', { method: 'DELETE' });
      const res = await app.request(req);

      expect(res.status).toBe(405); // Method Not Allowed
    });
  });

  describe('Content Type Handling', () => {
    it('should handle JSON content type', async () => {
      const req = new Request('http://localhost/api/health', {
        headers: { 'Accept': 'application/json' }
      });
      const res = await app.request(req);

      expect(res.headers.get('Content-Type')).toContain('application/json');
    });

    it('should handle missing content type gracefully', async () => {
      const req = new Request('http://localhost/api/health');
      const res = await app.request(req);

      expect(res.status).toBe(200);
    });
  });

  describe('CORS Headers', () => {
    it('should include appropriate CORS headers', async () => {
      const req = new Request('http://localhost/api/health', {
        headers: { 'Origin': 'http://localhost:3000' }
      });
      const res = await app.request(req);

      // Check for CORS headers (these are set by middleware)
      expect(res.headers.has('Access-Control-Allow-Credentials')).toBe(true);
      expect(res.headers.has('Vary')).toBe(true);
    });

    it('should handle preflight OPTIONS requests', async () => {
      const req = new Request('http://localhost/api/health', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET'
        }
      });
      const res = await app.request(req);

      expect(res.status).toBe(200);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const req = new Request('http://localhost/api/health');
      const res = await app.request(req);

      // Check for security headers (set by middleware)
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
      expect(res.headers.has('Strict-Transport-Security')).toBe(true);
      expect(res.headers.get('Referrer-Policy')).toBe('no-referrer');
    });

    it('should include request ID header', async () => {
      const req = new Request('http://localhost/api/health');
      const res = await app.request(req);

      expect(res.headers.has('X-Request-ID')).toBe(true);
      expect(res.headers.get('X-Request-ID')).toMatch(/^req_\d+_[a-f0-9]+$/);
    });

    it('should include timing headers', async () => {
      const req = new Request('http://localhost/api/health');
      const res = await app.request(req);

      expect(res.headers.has('Server-Timing')).toBe(true);
      expect(res.headers.get('Server-Timing')).toContain('total;dur=');
    });
  });

  describe('Error Boundary', () => {
    it('should handle middleware errors gracefully', async () => {
      // This tests the overall error handling in the API layer
      const req = new Request('http://localhost/api/health');
      const res = await app.request(req);

      // Should not throw unhandled errors
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(600);
    });
  });

  describe('Route Hierarchy', () => {
    it('should respect route precedence', async () => {
      // More specific routes should take precedence over general ones
      const healthReq = new Request('http://localhost/api/health');
      const healthDetailReq = new Request('http://localhost/api/health/detailed');

      const healthRes = await app.request(healthReq);
      const healthDetailRes = await app.request(healthDetailReq);

      expect(healthRes.status).toBe(200);
      expect(healthDetailRes.status).toBe(200);

      const healthBody = await healthRes.json();
      const healthDetailBody = await healthDetailRes.json();

      // Detailed endpoint should return more information
      expect(Object.keys(healthDetailBody.data).length)
        .toBeGreaterThanOrEqual(Object.keys(healthBody.data).length);
    });
  });
});