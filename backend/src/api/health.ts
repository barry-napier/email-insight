import { Hono } from 'hono';
import { checkDatabaseHealth } from '@/db/connection';
import { createSuccessResponse, createErrorResponse } from '@/middleware';
import { serverConfig } from '@/config/environment';

const app = new Hono();

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  database: {
    status: 'connected' | 'disconnected';
    latency: number;
    error?: string;
  };
  services: {
    [key: string]: {
      status: 'operational' | 'degraded' | 'down';
      latency?: number;
      error?: string;
    };
  };
}

// Basic health check endpoint
app.get('/', (c) => {
  const startTime = Date.now();
  
  try {
    const dbHealth = checkDatabaseHealth();
    
    const healthStatus: HealthStatus = {
      status: dbHealth.healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: serverConfig.nodeEnv,
      uptime: process.uptime(),
      database: {
        status: dbHealth.healthy ? 'connected' : 'disconnected',
        latency: dbHealth.latency,
        ...(dbHealth.error && { error: dbHealth.error }),
      },
      services: {
        api: {
          status: 'operational',
          latency: Date.now() - startTime,
        },
        gmail: {
          status: 'operational', // TODO: Add actual Gmail API health check
        },
      },
    };

    const responseTime = Date.now() - startTime;
    
    if (responseTime > 50) {
      console.warn(`Health check took ${responseTime}ms (target: <50ms)`);
    }

    return c.json(createSuccessResponse(healthStatus));
  } catch (error) {
    console.error('Health check failed:', error);
    
    const healthStatus: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: serverConfig.nodeEnv,
      uptime: process.uptime(),
      database: {
        status: 'disconnected',
        latency: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      services: {
        api: {
          status: 'down',
          error: 'Health check failed',
        },
        gmail: {
          status: 'down',
        },
      },
    };

    return c.json(createErrorResponse(
      'HEALTH_CHECK_FAILED',
      'Service health check failed',
      'critical'
    ), { status: 503 });
  }
});

// Detailed health check endpoint
app.get('/detailed', (c) => {
  const startTime = Date.now();
  
  try {
    const dbHealth = checkDatabaseHealth();
    
    const detailedHealth = {
      ...checkDatabaseHealth(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: serverConfig.nodeEnv,
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      database: {
        status: dbHealth.healthy ? 'connected' : 'disconnected',
        latency: dbHealth.latency,
        ...(dbHealth.error && { error: dbHealth.error }),
      },
      responseTime: Date.now() - startTime,
    };

    return c.json(createSuccessResponse(detailedHealth));
  } catch (error) {
    console.error('Detailed health check failed:', error);
    
    return c.json(createErrorResponse(
      'DETAILED_HEALTH_CHECK_FAILED',
      'Detailed health check failed',
      'critical'
    ), { status: 503 });
  }
});

export default app;