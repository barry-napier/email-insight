import type { Next } from 'hono';
import type { Context } from '@/types/hono';
import type { ApiError } from '@email-insight/shared';
import { ZodError } from 'zod';

/**
 * Global error handling middleware
 */
export async function errorHandler(c: Context, next: Next): Promise<Response | void> {
  try {
    await next();
  } catch (error) {
    console.error('Unhandled error:', error);
    
    let apiError: ApiError;
    let status = 500;
    
    if (error instanceof ZodError) {
      // Handle Zod validation errors
      const validationErrors = error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      
      apiError = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Validation failed: ${validationErrors}`,
          severity: 'low',
        },
      };
      status = 400;
    } else if (error instanceof Error) {
      // Handle known errors
      if (error.message.includes('SQLITE_CONSTRAINT')) {
        apiError = {
          success: false,
          error: {
            code: 'CONSTRAINT_VIOLATION',
            message: 'Data constraint violation',
            severity: 'medium',
          },
        };
        status = 409;
      } else if (error.message.includes('not found')) {
        apiError = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found',
            severity: 'low',
          },
        };
        status = 404;
      } else if (error.message.includes('unauthorized')) {
        apiError = {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Unauthorized access',
            severity: 'medium',
          },
        };
        status = 401;
      } else {
        apiError = {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
            severity: 'critical',
          },
        };
      }
    } else {
      // Handle unknown errors
      apiError = {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unknown error occurred',
          severity: 'critical',
        },
      };
    }
    
    // Add request ID for debugging in development
    if (process.env.NODE_ENV === 'development') {
      const requestId = c.get('requestId') as string | undefined;
      if (requestId) {
        console.error(`Request ID: ${requestId}`);
      }
    }
    
    return c.json(apiError, status as any);
  }
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(c: Context): Response | Promise<Response> {
  const apiError: ApiError = {
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${c.req.method} ${c.req.path} not found`,
      severity: 'low',
    },
  };
  
  return c.json(apiError, 404 as any);
}