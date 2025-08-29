import type { Next } from 'hono';
import type { Context } from '@/types/hono';
import type { ApiResponse, ApiError } from '@email-insight/shared';

/**
 * Response formatter middleware that ensures consistent API response format
 */
export async function responseFormatterMiddleware(c: Context, next: Next): Promise<void> {
  await next();
  
  // Only format JSON responses
  const contentType = c.res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return;
  }
  
  // Get the response body
  const response = await c.res.clone().json() as unknown;
  
  // If it's already in the correct format, don't modify it
  if (response && typeof response === 'object' && 'success' in response) {
    return;
  }
  
  // Format successful responses
  const status = c.res.status;
  
  if (status >= 200 && status < 300) {
    const formattedResponse: ApiResponse = {
      success: true,
      data: response,
    };
    
    c.res = new Response(JSON.stringify(formattedResponse), {
      status: c.res.status,
      headers: c.res.headers,
    });
  }
}

/**
 * Helper function to create standardized error responses
 */
export function createErrorResponse(
  code: string,
  message: string,
  severity: ApiError['error']['severity'] = 'medium'
): ApiError {
  return {
    success: false,
    error: {
      code,
      message,
      severity,
    },
  };
}

/**
 * Helper function to create standardized success responses
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}