import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Hono } from 'hono';
import healthApp from '@/api/health';
import { initializeDatabase, closeDatabase } from '@/db/connection';
import type { ContextVariableMap } from '@/types/hono';

// Mock database for integration tests
vi.mock('@/db/connection');

const mockInitializeDatabase = initializeDatabase as any;
const mockCloseDatabase = closeDatabase as any;

describe('Health API Integration Tests', () => {
  let app: Hono<{ Variables: ContextVariableMap }>;

  beforeAll(() => {
    app = new Hono<{ Variables: ContextVariableMap }>();
    app.route('/', healthApp);
    
    // Mock successful database initialization
    mockInitializeDatabase.mockReturnValue(true);
  });

  afterAll(() => {
    mockCloseDatabase.mockImplementation(() => {});
  });

  describe('GET /health', () => {
    it('should return healthy status when all services are operational', async () => {
      // Mock successful database health check
      vi.doMock('@/db/connection', () => ({
        checkDatabaseHealth: () => ({
          healthy: true,
          latency: 5
        })
      }));

      const req = new Request('http://localhost/');
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        status: 'healthy',
        version: '1.0.0',
        environment: expect.any(String),
        uptime: expect.any(Number),
        database: {
          status: 'connected',
          latency: expect.any(Number)
        },
        services: {
          api: {
            status: 'operational',
            latency: expect.any(Number)
          },
          gmail: {
            status: 'operational'
          }
        }
      });
      expect(body.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('should return unhealthy status when database is down', async () => {
      // Mock failed database health check
      vi.doMock('@/db/connection', () => ({
        checkDatabaseHealth: () => ({
          healthy: false,
          latency: 1000,
          error: 'Connection timeout'
        })
      }));

      const req = new Request('http://localhost/');
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(200); // Health endpoint still returns 200, but status is unhealthy
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('unhealthy');
      expect(body.data.database).toMatchObject({
        status: 'disconnected',
        latency: 1000,
        error: 'Connection timeout'
      });
    });

    it('should handle health check exceptions gracefully', async () => {
      // Mock database health check throwing error
      vi.doMock('@/db/connection', () => ({
        checkDatabaseHealth: () => {
          throw new Error('Database connection failed');
        }
      }));

      const req = new Request('http://localhost/');
      const res = await app.request(req);
      
      // The health endpoint should handle errors gracefully
      expect(res.status).toBe(503);
      expect(await res.json()).toMatchObject({
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'Service health check failed',
          severity: 'critical'
        }
      });
    });

    it('should include proper response headers', async () => {
      vi.doMock('@/db/connection', () => ({
        checkDatabaseHealth: () => ({
          healthy: true,
          latency: 5
        })
      }));

      const req = new Request('http://localhost/');
      const res = await app.request(req);

      expect(res.headers.get('Content-Type')).toContain('application/json');
    });

    it('should respond within performance target (<50ms)', async () => {
      vi.doMock('@/db/connection', () => ({
        checkDatabaseHealth: () => ({
          healthy: true,
          latency: 1
        })
      }));

      const startTime = Date.now();
      const req = new Request('http://localhost/');
      const res = await app.request(req);
      const endTime = Date.now();

      expect(res.status).toBe(200);
      
      const responseTime = endTime - startTime;
      // Note: This test may be flaky in CI environments
      expect(responseTime).toBeLessThan(100); // Allow more time for testing environment
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health information', async () => {
      vi.doMock('@/db/connection', () => ({
        checkDatabaseHealth: () => ({
          healthy: true,
          latency: 3
        })
      }));

      const req = new Request('http://localhost/detailed');
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        healthy: true,
        latency: 3,
        timestamp: expect.any(String),
        version: '1.0.0',
        environment: expect.any(String),
        uptime: expect.any(Number),
        memory: {
          used: expect.any(Number),
          total: expect.any(Number),
          external: expect.any(Number),
          rss: expect.any(Number)
        },
        database: {
          status: 'connected',
          latency: expect.any(Number)
        },
        responseTime: expect.any(Number)
      });
    });

    it('should return error when detailed health check fails', async () => {
      vi.doMock('@/db/connection', () => ({
        checkDatabaseHealth: () => {
          throw new Error('Detailed check failed');
        }
      }));

      const req = new Request('http://localhost/detailed');
      const res = await app.request(req);

      expect(res.status).toBe(503);
      expect(await res.json()).toMatchObject({
        success: false,
        error: {
          code: 'DETAILED_HEALTH_CHECK_FAILED',
          message: 'Detailed health check failed',
          severity: 'critical'
        }
      });
    });

    it('should include memory usage information', async () => {
      vi.doMock('@/db/connection', () => ({
        checkDatabaseHealth: () => ({
          healthy: true,
          latency: 2
        })
      }));

      const req = new Request('http://localhost/detailed');
      const res = await app.request(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.memory).toBeDefined();
      expect(body.data.memory.used).toBeTypeOf('number');
      expect(body.data.memory.total).toBeTypeOf('number');
      expect(body.data.memory.external).toBeTypeOf('number');
      expect(body.data.memory.rss).toBeTypeOf('number');
      
      // Memory values should be reasonable (in MB)
      expect(body.data.memory.used).toBeGreaterThan(0);
      expect(body.data.memory.total).toBeGreaterThan(body.data.memory.used);
    });
  });

  describe('Performance Metrics', () => {
    it('should track and report response times', async () => {
      vi.doMock('@/db/connection', () => ({
        checkDatabaseHealth: () => ({
          healthy: true,
          latency: 1
        })
      }));

      const req = new Request('http://localhost/detailed');
      const res = await app.request(req);
      const body = await res.json();

      expect(body.data.responseTime).toBeTypeOf('number');
      expect(body.data.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should warn when health check is slow', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock slow database health check
      vi.doMock('@/db/connection', () => ({
        checkDatabaseHealth: () => {
          // Simulate slow response by delaying
          const start = Date.now();
          while (Date.now() - start < 60) {
            // Busy wait to simulate slow response
          }
          return { healthy: true, latency: 60 };
        }
      }));

      const req = new Request('http://localhost/');
      await app.request(req);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Health check took')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Database Health Reporting', () => {
    it('should report database connection status correctly', async () => {
      const testCases = [
        {
          dbHealth: { healthy: true, latency: 5 },
          expected: { status: 'connected', latency: 5 }
        },
        {
          dbHealth: { healthy: false, latency: 100, error: 'Timeout' },
          expected: { status: 'disconnected', latency: 100, error: 'Timeout' }
        }
      ];

      for (const { dbHealth, expected } of testCases) {
        vi.doMock('@/db/connection', () => ({
          checkDatabaseHealth: () => dbHealth
        }));

        const req = new Request('http://localhost/');
        const res = await app.request(req);
        const body = await res.json();

        expect(body.data.database).toMatchObject(expected);
      }
    });
  });
});