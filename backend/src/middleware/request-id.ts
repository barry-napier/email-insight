import type { Next } from 'hono';
import type { Context } from '@/types/hono';
import { generateRandomString } from '@/utils/crypto';

/**
 * Request ID middleware that adds a unique identifier to each request
 */
export async function requestIdMiddleware(c: Context, next: Next): Promise<void> {
  // Generate a unique request ID
  const requestId = `req_${Date.now()}_${generateRandomString(8)}`;
  
  // Set the request ID in the context
  c.set('requestId', requestId);
  
  // Add request ID to response headers for debugging
  c.res.headers.set('X-Request-ID', requestId);
  
  await next();
}