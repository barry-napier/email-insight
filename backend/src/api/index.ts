import { Hono } from 'hono';
import { apiRateLimit } from '@/utils/rate-limiter';
import healthRoutes from './health';
import authRoutes from './auth';

const app = new Hono();

// Apply API rate limiting to all routes except health checks
app.use('/auth/*', apiRateLimit);

// Mount route handlers
app.route('/health', healthRoutes);
app.route('/auth', authRoutes);

// Placeholder routes for future implementation
app.get('/analytics', (c) => {
  return c.json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Analytics endpoints not yet implemented',
      severity: 'low' as const,
    },
  }, { status: 501 });
});

app.get('/subscriptions', (c) => {
  return c.json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Subscription endpoints not yet implemented',
      severity: 'low' as const,
    },
  }, { status: 501 });
});

app.get('/sync', (c) => {
  return c.json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Sync endpoints not yet implemented',
      severity: 'low' as const,
    },
  }, { status: 501 });
});

export default app;