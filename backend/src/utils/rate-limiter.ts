import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import type { Context } from '@/types/hono';
import type { ApiError } from '@email-insight/shared';

// Rate limiter configurations
const authLimiterConfig = {
  keyPrefix: 'auth_fail',
  points: 5, // Number of requests
  duration: 900, // Per 15 minutes
  blockDuration: 900, // Block for 15 minutes
};

const apiLimiterConfig = {
  keyPrefix: 'api_req',
  points: 100, // Number of requests
  duration: 60, // Per 1 minute
  blockDuration: 60, // Block for 1 minute
};

const gmailLimiterConfig = {
  keyPrefix: 'gmail_api',
  points: 250, // Gmail API quota per user per 100 seconds
  duration: 100, // Per 100 seconds
  blockDuration: 100, // Block for 100 seconds
};

// Create rate limiters
export const authLimiter = new RateLimiterMemory(authLimiterConfig);
export const apiLimiter = new RateLimiterMemory(apiLimiterConfig);
export const gmailLimiter = new RateLimiterMemory(gmailLimiterConfig);

/**
 * Gets the client IP from request headers
 */
function getClientIP(c: Context): string {
  // Check various headers for the real IP
  const forwarded = c.req.header('x-forwarded-for');
  const realIp = c.req.header('x-real-ip');
  const cfConnectingIp = c.req.header('cf-connecting-ip');
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, get the first one
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // Fallback to a default value since we can't get the actual IP in this context
  return 'fallback-ip';
}

/**
 * Rate limiting middleware factory
 */
export function createRateLimitMiddleware(
  limiter: RateLimiterMemory,
  keyPrefix?: string
) {
  return async (c: Context, next: () => Promise<void>): Promise<Response | void> => {
    try {
      const ip = getClientIP(c);
      const key = keyPrefix ? `${keyPrefix}:${ip}` : ip;
      
      await limiter.consume(key);
      return await next();
    } catch (rateLimiterRes) {
      const error: ApiError = {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          severity: 'medium',
        },
      };
      
      const remainingPoints = (rateLimiterRes as any)?.remainingPoints ?? 0;
      const msBeforeNext = (rateLimiterRes as any)?.msBeforeNext ?? 60000;
      
      return c.json(error, {
        status: 429,
        headers: {
          'Retry-After': Math.round(msBeforeNext / 1000).toString(),
          'X-RateLimit-Limit': limiter.points.toString(),
          'X-RateLimit-Remaining': Math.max(0, remainingPoints).toString(),
          'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
        },
      });
    }
  };
}

/**
 * User-specific rate limiting (requires userId in context)
 */
export function createUserRateLimitMiddleware(
  limiter: RateLimiterMemory,
  keyPrefix: string = 'user'
) {
  return async (c: Context, next: () => Promise<void>): Promise<Response | void> => {
    try {
      const userId = c.get('userId') as number | undefined;
      
      if (!userId) {
        // If no user ID, fallback to IP-based limiting
        return createRateLimitMiddleware(limiter, keyPrefix)(c, next);
      }
      
      const key = `${keyPrefix}:${userId}`;
      
      await limiter.consume(key);
      return await next();
    } catch (rateLimiterRes) {
      const error: ApiError = {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          severity: 'medium',
        },
      };
      
      const remainingPoints = (rateLimiterRes as any)?.remainingPoints ?? 0;
      const msBeforeNext = (rateLimiterRes as any)?.msBeforeNext ?? 60000;
      
      return c.json(error, {
        status: 429,
        headers: {
          'Retry-After': Math.round(msBeforeNext / 1000).toString(),
          'X-RateLimit-Limit': limiter.points.toString(),
          'X-RateLimit-Remaining': Math.max(0, remainingPoints).toString(),
          'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString(),
        },
      });
    }
  };
}

// Export pre-configured middleware
export const authRateLimit = createRateLimitMiddleware(authLimiter, 'auth');
export const apiRateLimit = createRateLimitMiddleware(apiLimiter, 'api');
export const gmailRateLimit = createUserRateLimitMiddleware(gmailLimiter, 'gmail');