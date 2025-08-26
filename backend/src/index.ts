import { Hono } from 'hono';
import type { ContextVariableMap } from '@/types/hono';
import { serve } from '@hono/node-server';
import { logger } from 'hono/logger';
import { timing } from 'hono/timing';
import { secureHeaders } from 'hono/secure-headers';
import { 
  corsMiddleware,
  errorHandler,
  notFoundHandler,
  responseFormatterMiddleware,
  requestIdMiddleware
} from '@/middleware';
import { initializeDatabase } from '@/db/connection';
import { serverConfig } from '@/config/environment';
import apiRoutes from '@/api';

// Initialize database on startup
initializeDatabase();

// Create Hono app with type inference
const app = new Hono<{ Variables: ContextVariableMap }>();

// Global middleware pipeline (order matters!)
app.use('*', requestIdMiddleware);       // Add request ID first
app.use('*', logger());                  // Log all requests
app.use('*', timing());                  // Add timing headers
app.use('*', secureHeaders());          // Security headers
app.use('*', corsMiddleware);           // CORS configuration
app.use('*', errorHandler);             // Global error handling
app.use('*', responseFormatterMiddleware); // Format responses

// Health check at root (no /api prefix for load balancers)
app.get('/', (c) => {
  return c.json({
    success: true,
    data: {
      service: 'Email Insight API',
      version: '1.0.0',
      status: 'operational',
      timestamp: new Date().toISOString(),
    }
  });
});

// Mount API routes
app.route('/api', apiRoutes);

// 404 handler for unmatched routes
app.notFound(notFoundHandler);

// Error boundary for uncaught errors
app.onError((err, c) => {
  console.error('Uncaught error:', err);
  
  return c.json({
    success: false,
    error: {
      code: 'UNCAUGHT_ERROR',
      message: 'An unexpected error occurred',
      severity: 'critical' as const,
    },
  }, { status: 500 });
});

// Server startup
const port = serverConfig.port;

console.log('🚀 Starting Email Insight API Server...');
console.log(`📊 Environment: ${serverConfig.nodeEnv}`);
console.log(`🌐 Frontend URL: ${serverConfig.frontendUrl}`);

const server = serve({
  fetch: app.fetch,
  port,
}, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
  console.log(`🏥 Health check: http://localhost:${port}/api/health`);
  console.log(`📖 API routes available at: http://localhost:${port}/api/`);
  
  // Performance startup check (simplified for now)
  const startupTime = process.uptime() * 1000;
  if (startupTime > 2000) {
    console.warn(`⚠️  Server startup took ${startupTime}ms (target: <2000ms)`);
  } else {
    console.log(`⚡ Server started in ${startupTime}ms`);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Graceful shutdown initiated...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🔄 SIGTERM received, initiating graceful shutdown...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't crash the server, but log the error
});

export default app;