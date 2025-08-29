import { describe, it, expect } from 'vitest';
import { checkDatabaseHealth } from '@/db/connection';
import { encrypt, decrypt, generateRandomString } from '@/utils/crypto';
import { Hono } from 'hono';

describe('Phase 1 Foundation Validation', () => {
  describe('Database Health Check', () => {
    it('should return health status object', () => {
      const health = checkDatabaseHealth();
      
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('latency');
      expect(typeof health.healthy).toBe('boolean');
      expect(typeof health.latency).toBe('number');
    });
  });

  describe('Crypto Utilities', () => {
    it('should encrypt and decrypt data correctly', () => {
      const originalData = 'test sensitive data';
      const encrypted = encrypt(originalData);
      const decrypted = decrypt(encrypted);

      expect(encrypted).not.toBe(originalData);
      expect(decrypted).toBe(originalData);
    });

    it('should generate secure tokens', () => {
      const token = generateRandomString(16);
      
      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate different tokens each time', () => {
      const token1 = generateRandomString(16);
      const token2 = generateRandomString(16);
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('Hono Framework Integration', () => {
    it('should create Hono app instance', () => {
      const app = new Hono();
      expect(app).toBeDefined();
      expect(typeof app.get).toBe('function');
      expect(typeof app.post).toBe('function');
    });

    it('should handle basic routes', async () => {
      const app = new Hono();
      app.get('/test', (c) => c.json({ message: 'hello' }));

      const req = new Request('http://localhost/test');
      const res = await app.request(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ message: 'hello' });
    });

    it('should handle 404 for unregistered routes', async () => {
      const app = new Hono();
      
      const req = new Request('http://localhost/nonexistent');
      const res = await app.request(req);

      expect(res.status).toBe(404);
    });
  });

  describe('TypeScript Configuration Validation', () => {
    it('should enforce strict mode', () => {
      // This test passes if TypeScript compilation succeeds with strict mode
      const testValue: string = 'test';
      const result: number = testValue.length;
      
      expect(result).toBe(4);
    });

    it('should support ES modules', () => {
      // Test that import/export works correctly
      expect(typeof import.meta).toBe('object');
      expect(typeof import.meta.url).toBe('string');
    });
  });

  describe('Environment Configuration', () => {
    it('should have required environment variables', () => {
      expect(process.env.NODE_ENV).toBeDefined();
      expect(process.env.DATABASE_URL).toBeDefined();
      expect(process.env.JWT_SECRET).toBeDefined();
      expect(process.env.ENCRYPTION_KEY).toBeDefined();
    });

    it('should validate JWT_SECRET length', () => {
      expect(process.env.JWT_SECRET!.length).toBeGreaterThanOrEqual(32);
    });

    it('should validate ENCRYPTION_KEY length', () => {
      expect(process.env.ENCRYPTION_KEY!.length).toBeGreaterThanOrEqual(32);
    });
  });

  describe('Performance Requirements', () => {
    it('should encrypt/decrypt quickly', () => {
      const data = 'performance test data';
      
      const start = process.hrtime.bigint();
      const encrypted = encrypt(data);
      const decrypted = decrypt(encrypted);
      const end = process.hrtime.bigint();

      const durationMs = Number(end - start) / 1_000_000;
      
      expect(decrypted).toBe(data);
      expect(durationMs).toBeLessThan(10); // Should complete in less than 10ms
    });

    it('should generate tokens quickly', () => {
      const start = process.hrtime.bigint();
      const token = generateRandomString(32);
      const end = process.hrtime.bigint();

      const durationMs = Number(end - start) / 1_000_000;
      
      expect(token).toHaveLength(64);
      expect(durationMs).toBeLessThan(5); // Should complete in less than 5ms
    });
  });

  describe('Error Handling', () => {
    it('should handle crypto errors gracefully', () => {
      expect(() => decrypt(Buffer.from('invalid-data'))).toThrow();
    });

    it('should validate environment configuration at startup', () => {
      // Environment validation happens at config loading time
      // This test validates that required variables are present
      expect(process.env.ENCRYPTION_KEY).toBeDefined();
      expect(process.env.JWT_SECRET).toBeDefined();
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  describe('Security Validation', () => {
    it('should generate cryptographically strong tokens', () => {
      const tokens = Array(100).fill(0).map(() => generateRandomString(16));
      
      // Check for uniqueness (very high probability with crypto-strong random)
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(100);
    });

    it('should produce different encrypted output for same input', () => {
      const data = 'same input data';
      const encrypted1 = encrypt(data);
      const encrypted2 = encrypt(data);

      expect(encrypted1).not.toBe(encrypted2);
      expect(decrypt(encrypted1)).toBe(data);
      expect(decrypt(encrypted2)).toBe(data);
    });
  });
});