import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware, requireAuth } from '@/middleware/auth';
import type { ContextVariableMap } from '@/types/hono';
import * as authUtils from '@/utils/auth';

// Mock auth utilities
vi.mock('@/utils/auth');
const mockVerifyToken = authUtils.verifyToken as Mock;
const mockIsTokenBlacklisted = authUtils.isTokenBlacklisted as Mock;

describe('Auth Middleware', () => {
  let app: Hono<{ Variables: ContextVariableMap }>;

  beforeEach(() => {
    app = new Hono<{ Variables: ContextVariableMap }>();
    vi.clearAllMocks();
  });

  describe('authMiddleware', () => {
    it('should skip auth for public routes', async () => {
      app.use('*', authMiddleware);
      app.get('/api/health', (c) => c.json({ message: 'ok' }));

      const req = new Request('http://localhost/api/health');
      const res = await app.request(req);

      expect(res.status).toBe(200);
      expect(mockVerifyToken).not.toHaveBeenCalled();
    });

    it('should allow valid Bearer token', async () => {
      const mockUser = { id: 1, email: 'test@example.com', googleId: 'google123' };
      mockVerifyToken.mockResolvedValue(mockUser);
      mockIsTokenBlacklisted.mockResolvedValue(false);

      app.use('*', authMiddleware);
      app.get('/api/protected', (c) => {
        const user = c.get('user');
        return c.json({ user });
      });

      const req = new Request('http://localhost/api/protected', {
        headers: { Authorization: 'Bearer valid-token' },
      });
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.user).toEqual(mockUser);
      expect(mockVerifyToken).toHaveBeenCalledWith('valid-token');
      expect(mockIsTokenBlacklisted).toHaveBeenCalledWith('valid-token');
    });

    it('should reject invalid token format', async () => {
      app.use('*', authMiddleware);
      app.get('/api/protected', (c) => c.json({ message: 'ok' }));

      const req = new Request('http://localhost/api/protected', {
        headers: { Authorization: 'InvalidFormat token' },
      });
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject blacklisted token', async () => {
      mockVerifyToken.mockResolvedValue({ id: 1, email: 'test@example.com' });
      mockIsTokenBlacklisted.mockResolvedValue(true);

      app.use('*', authMiddleware);
      app.get('/api/protected', (c) => c.json({ message: 'ok' }));

      const req = new Request('http://localhost/api/protected', {
        headers: { Authorization: 'Bearer blacklisted-token' },
      });
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('TOKEN_BLACKLISTED');
    });

    it('should reject expired/invalid token', async () => {
      mockVerifyToken.mockRejectedValue(new Error('Token expired'));
      mockIsTokenBlacklisted.mockResolvedValue(false);

      app.use('*', authMiddleware);
      app.get('/api/protected', (c) => c.json({ message: 'ok' }));

      const req = new Request('http://localhost/api/protected', {
        headers: { Authorization: 'Bearer expired-token' },
      });
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('TOKEN_VERIFICATION_FAILED');
    });
  });

  describe('requireAuth', () => {
    it('should pass when user is authenticated', async () => {
      app.use('*', (c, next) => {
        c.set('user', { id: 1, email: 'test@example.com', googleId: 'google123' });
        return next();
      });
      app.use('*', requireAuth);
      app.get('/api/protected', (c) => c.json({ message: 'success' }));

      const req = new Request('http://localhost/api/protected');
      const res = await app.request(req);

      expect(res.status).toBe(200);
    });

    it('should reject when user is not authenticated', async () => {
      app.use('*', requireAuth);
      app.get('/api/protected', (c) => c.json({ message: 'success' }));

      const req = new Request('http://localhost/api/protected');
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });
});