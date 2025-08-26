import type { Next } from 'hono';
import type { Context } from '@/types/hono';
import { verifyToken, isTokenBlacklisted, extractTokenFromHeader } from '@/utils/auth';
import { getDatabase } from '@/db/connection';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { ApiError } from '@email-insight/shared';

/**
 * Authentication middleware that validates JWT tokens and ensures user authorization.
 * 
 * This middleware performs comprehensive authentication including:
 * - Bearer token extraction and validation
 * - Token blacklist checking for secure logout
 * - User existence verification in database
 * - Security context establishment for subsequent middleware
 * 
 * @param c - Hono context object containing request/response data
 * @param next - Next middleware function in the pipeline
 * @returns Promise<Response | void> - Returns error response on auth failure, void on success
 * 
 * @throws Will return 401 status codes for authentication failures:
 * - MISSING_TOKEN: No Authorization header or Bearer token provided
 * - INVALID_TOKEN: JWT token is malformed, expired, or invalid
 * - TOKEN_REVOKED: Token exists in blacklist (user logged out)
 * - USER_NOT_FOUND: Token valid but user account no longer exists
 * 
 * @throws Will return 500 status code for unexpected authentication errors
 * 
 * @example
 * ```typescript
 * // Apply to protected routes
 * app.use('/api/protected/*', authMiddleware);
 * 
 * // Access user context in route handlers
 * app.get('/api/protected/profile', (c) => {
 *   const userId = c.get('userId');
 *   const userEmail = c.get('userEmail');
 *   // ... handle authenticated request
 * });
 * ```
 * 
 * Security Features:
 * - JWT signature verification using HS256 algorithm
 * - Token blacklist checking prevents replay attacks after logout
 * - Database user verification ensures account still exists
 * - Structured error responses with severity levels for monitoring
 * - Request context populated with user ID, email, and JWT ID
 */
export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
  try {
    const authHeader = c.req.header('Authorization');
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      const error: ApiError = {
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization token is required',
          severity: 'medium',
        },
      };
      
      return c.json(error, { status: 401 });
    }

    const payload = verifyToken(token);
    
    if (!payload) {
      const error: ApiError = {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          severity: 'medium',
        },
      };
      
      return c.json(error, { status: 401 });
    }

    // Check if token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(payload.jti);
    
    if (isBlacklisted) {
      const error: ApiError = {
        success: false,
        error: {
          code: 'TOKEN_REVOKED',
          message: 'Token has been revoked',
          severity: 'medium',
        },
      };
      
      return c.json(error, { status: 401 });
    }

    // Verify user still exists
    const db = getDatabase();
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (user.length === 0) {
      const error: ApiError = {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account not found',
          severity: 'high',
        },
      };
      
      return c.json(error, { status: 401 });
    }

    // Set user context for subsequent middleware and routes
    c.set('userId', payload.userId);
    c.set('userEmail', payload.email);
    c.set('jti', payload.jti);

    await next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    
    const apiError: ApiError = {
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
        severity: 'high',
      },
    };
    
    return c.json(apiError, { status: 500 });
  }
}

/**
 * Optional authentication middleware for public endpoints that may have authenticated users.
 * 
 * This middleware performs the same authentication checks as `authMiddleware` but does not
 * fail the request if authentication is missing or invalid. Instead, it silently continues
 * without setting user context, allowing routes to handle both authenticated and anonymous users.
 * 
 * @param c - Hono context object containing request/response data
 * @param next - Next middleware function in the pipeline
 * @returns Promise<void> - Always continues to next middleware, never returns error response
 * 
 * @example
 * ```typescript
 * // Apply to public endpoints that benefit from user context when available
 * app.use('/api/public/*', optionalAuthMiddleware);
 * 
 * // Handle both authenticated and anonymous users
 * app.get('/api/public/content', (c) => {
 *   const userId = c.get('userId'); // May be undefined
 *   if (userId) {
 *     // Return personalized content
 *   } else {
 *     // Return generic content
 *   }
 * });
 * ```
 * 
 * Behavior:
 * - Valid token: Sets user context (userId, userEmail, jti) same as authMiddleware
 * - Invalid/missing token: Continues without setting context, no error response
 * - Blacklisted token: Continues without setting context
 * - Non-existent user: Continues without setting context
 * - Authentication errors: Logs error but continues request processing
 * 
 * Use Cases:
 * - Public API endpoints that customize responses for authenticated users
 * - Content that shows different data based on authentication status
 * - Analytics endpoints that track both authenticated and anonymous usage
 */
export async function optionalAuthMiddleware(c: Context, next: Next): Promise<void> {
  try {
    const authHeader = c.req.header('Authorization');
    const token = extractTokenFromHeader(authHeader);
    
    if (token) {
      const payload = verifyToken(token);
      
      if (payload && !(await isTokenBlacklisted(payload.jti))) {
        // Verify user still exists
        const db = getDatabase();
        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, payload.userId))
          .limit(1);

        if (user.length > 0) {
          c.set('userId', payload.userId);
          c.set('userEmail', payload.email);
          c.set('jti', payload.jti);
        }
      }
    }
  } catch (error) {
    console.error('Optional authentication middleware error:', error);
    // Don't fail the request, just continue without setting user context
  }
  
  await next();
}