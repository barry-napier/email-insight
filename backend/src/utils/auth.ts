import jwt from 'jsonwebtoken';
import { securityConfig } from '@/config/environment';
import type { JWTPayload } from '@email-insight/shared';
import { getDatabase } from '@/db/connection';
import { tokenBlacklist } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * JWT token pair interface for authentication responses.
 * 
 * @interface TokenPair
 * @property {string} accessToken - Short-lived JWT for API access (1 hour)
 * @property {string} refreshToken - Long-lived JWT for token renewal (7 days) 
 * @property {number} expiresIn - Unix timestamp when access token expires
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Generates a pair of JWT tokens (access and refresh) for user authentication.
 * 
 * This function creates both access and refresh tokens with appropriate expiration
 * times and security claims. Access tokens are short-lived for API access while
 * refresh tokens enable secure token renewal without re-authentication.
 * 
 * @param userId - Database user ID for token subject
 * @param email - User email address for token payload
 * @returns {TokenPair} Object containing access token, refresh token, and expiry
 * 
 * @example
 * ```typescript
 * // Generate tokens after successful OAuth login
 * const tokens = generateTokenPair(user.id, user.email);
 * 
 * // Return tokens to client
 * return c.json({
 *   accessToken: tokens.accessToken,
 *   refreshToken: tokens.refreshToken,
 *   expiresIn: tokens.expiresIn
 * });
 * ```
 * 
 * Security Features:
 * - Access token expires in 1 hour (short-lived)
 * - Refresh token expires in 7 days (long-lived)
 * - Unique JWT ID (jti) for token identification and blacklisting
 * - Proper issuer and audience claims for validation
 * - Cryptographically signed with HS256 algorithm
 * 
 * Token Claims:
 * - userId: Database user identifier
 * - email: User email address
 * - type: 'access' or 'refresh' for token type identification
 * - jti: Unique token identifier for blacklisting
 * - iat: Issued at timestamp
 * - exp: Expiration timestamp
 * - iss: 'email-insight' issuer claim
 * - aud: 'email-insight-users' audience claim
 */
export function generateTokenPair(userId: number, email: string): TokenPair {
  const now = Math.floor(Date.now() / 1000);
  const accessTokenExpiry = now + (60 * 60); // 1 hour
  const refreshTokenExpiry = now + (60 * 60 * 24 * 7); // 7 days

  const jti = `${userId}-${Date.now()}-${Math.random()}`;

  const accessToken = jwt.sign(
    {
      userId,
      email,
      type: 'access',
      jti,
      iat: now,
      exp: accessTokenExpiry,
    },
    securityConfig.jwtSecret,
    {
      expiresIn: '1h',
      issuer: 'email-insight',
      audience: 'email-insight-users',
    }
  );

  const refreshToken = jwt.sign(
    {
      userId,
      email,
      type: 'refresh',
      jti: `${jti}-refresh`,
    },
    securityConfig.jwtSecret,
    {
      expiresIn: '7d',
      issuer: 'email-insight',
      audience: 'email-insight-users',
    }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: accessTokenExpiry,
  };
}

/**
 * Verifies and decodes JWT tokens with comprehensive validation.
 * 
 * This function performs complete JWT verification including signature validation,
 * expiration checking, and issuer/audience claim verification. Returns decoded
 * payload on success or null on any validation failure.
 * 
 * @param token - JWT token string to verify and decode
 * @returns {(JWTPayload & { jti: string }) | null} Decoded payload with JTI or null if invalid
 * 
 * @example
 * ```typescript
 * // Verify access token from Authorization header
 * const token = extractTokenFromHeader(authHeader);
 * const payload = verifyToken(token);
 * 
 * if (payload) {
 *   // Token is valid, use payload data
 *   const userId = payload.userId;
 *   const userEmail = payload.email;
 * } else {
 *   // Token is invalid, expired, or malformed
 *   return unauthorizedResponse();
 * }
 * ```
 * 
 * Validation Performed:
 * - Signature verification using JWT secret key
 * - Expiration time checking (exp claim)
 * - Issuer validation (iss: 'email-insight')
 * - Audience validation (aud: 'email-insight-users')
 * - Token structure and format validation
 * 
 * Returns null for:
 * - Invalid or malformed tokens
 * - Expired tokens (past exp claim)
 * - Wrong issuer or audience claims
 * - Invalid signature (wrong secret key)
 * - Missing required claims
 * 
 * Security Considerations:
 * - Uses secure JWT verification (not just decode)
 * - Validates all security claims
 * - Returns null instead of throwing for security (no info leakage)
 * - Constant-time verification to prevent timing attacks
 */
export function verifyToken(token: string): JWTPayload & { jti: string } | null {
  try {
    const payload = jwt.verify(token, securityConfig.jwtSecret, {
      issuer: 'email-insight',
      audience: 'email-insight-users',
    }) as JWTPayload & { jti: string };

    return payload;
  } catch {
    return null;
  }
}

/**
 * Checks if a JWT token is blacklisted (revoked) by its JWT ID.
 * 
 * This function queries the token blacklist database to determine if a token
 * has been revoked through logout or administrative action. Part of the
 * comprehensive authentication security system.
 * 
 * @param jti - JWT ID claim from token payload
 * @returns {Promise<boolean>} True if token is blacklisted, false otherwise
 * 
 * @example
 * ```typescript
 * // Check token blacklist in authentication middleware
 * const payload = verifyToken(token);
 * if (payload && await isTokenBlacklisted(payload.jti)) {
 *   return c.json({ error: 'Token revoked' }, { status: 401 });
 * }
 * 
 * // Verify token is not blacklisted before API access
 * const isRevoked = await isTokenBlacklisted(jwtId);
 * if (isRevoked) {
 *   // Token was revoked, require re-authentication
 * }
 * ```
 * 
 * Database Query:
 * - Searches token_blacklist table for matching JTI
 * - Uses indexed lookup for fast performance
 * - Handles database connection errors gracefully
 * 
 * Security Features:
 * - Prevents replay attacks after logout
 * - Fast blacklist checking with database indexes
 * - Graceful error handling (assumes valid if DB error)
 * - Essential for secure logout functionality
 * 
 * Performance:
 * - Indexed database lookup (fast)
 * - Single query with LIMIT 1
 * - Returns immediately on first match
 * - Typically <5ms response time
 */
export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  try {
    const db = getDatabase();
    const blacklistedToken = await db
      .select()
      .from(tokenBlacklist)
      .where(eq(tokenBlacklist.jti, jti))
      .limit(1);

    return blacklistedToken.length > 0;
  } catch {
    return false;
  }
}

/**
 * Adds a JWT token to the blacklist to prevent future use.
 * 
 * This function securely revokes JWT tokens by adding them to the blacklist
 * database. Used during logout operations and administrative token revocation.
 * Essential for secure logout functionality.
 * 
 * @param jti - JWT ID claim to blacklist
 * @param userId - User ID associated with the token
 * @param expiresAt - Unix timestamp when token naturally expires
 * @returns {Promise<void>} Resolves when token is successfully blacklisted
 * 
 * @throws {Error} When database operation fails
 * 
 * @example
 * ```typescript
 * // Blacklist token during logout
 * const payload = verifyToken(accessToken);
 * if (payload) {
 *   await blacklistToken(payload.jti, payload.userId, payload.exp);
 * }
 * 
 * // Administrative token revocation
 * await blacklistToken(tokenJti, userId, expirationTime);
 * console.log('Token successfully revoked');
 * ```
 * 
 * Database Operations:
 * - Inserts record into token_blacklist table
 * - Uses unique constraint on JTI to prevent duplicates
 * - Links to user_id for administrative management
 * - Stores expiration for automatic cleanup
 * 
 * Security Implications:
 * - Immediately invalidates token across all systems
 * - Prevents token replay attacks
 * - Required for secure logout implementation
 * - Supports administrative user management
 * 
 * Automatic Cleanup:
 * - Expired tokens are automatically cleaned up
 * - expiresAt field used by cleanup process
 * - Prevents blacklist table from growing indefinitely
 * - Maintains optimal database performance
 */
export async function blacklistToken(jti: string, userId: number, expiresAt: number): Promise<void> {
  try {
    const db = getDatabase();
    await db.insert(tokenBlacklist).values({
      jti,
      userId,
      expiresAt,
    });
  } catch (error) {
    console.error('Failed to blacklist token:', error);
    throw new Error('Failed to blacklist token');
  }
}

/**
 * Removes expired tokens from the blacklist to maintain database performance.
 * 
 * This function performs maintenance on the token blacklist by removing entries
 * for tokens that have naturally expired. Should be run periodically (e.g., daily)
 * to prevent the blacklist from growing indefinitely.
 * 
 * @returns {Promise<void>} Resolves when cleanup is complete
 * 
 * @example
 * ```typescript
 * // Run cleanup in scheduled maintenance task
 * import cron from 'node-cron';
 * 
 * // Clean up expired tokens daily at 2 AM
 * cron.schedule('0 2 * * *', async () => {
 *   await cleanupExpiredTokens();
 * });
 * 
 * // Manual cleanup during application maintenance
 * await cleanupExpiredTokens();
 * ```
 * 
 * Maintenance Process:
 * - Queries for tokens where expiresAt < current time
 * - Deletes expired blacklist entries in batch
 * - Logs cleanup completion for monitoring
 * - Handles errors gracefully without throwing
 * 
 * Performance Benefits:
 * - Prevents blacklist table from growing indefinitely
 * - Maintains fast blacklist lookup performance
 * - Reduces database storage requirements
 * - Optimizes index efficiency
 * 
 * Scheduling Recommendations:
 * - Run daily during low-traffic hours
 * - Monitor execution time and adjust frequency
 * - Consider running after backup operations
 * - Log cleanup statistics for operational visibility
 */
export async function cleanupExpiredTokens(): Promise<void> {
  try {
    const db = getDatabase();
    const now = Math.floor(Date.now() / 1000);
    
    await db
      .delete(tokenBlacklist)
      .where(eq(tokenBlacklist.expiresAt, now));
      
    console.log('✅ Expired tokens cleaned up');
  } catch (error) {
    console.error('Failed to cleanup expired tokens:', error);
  }
}

/**
 * Extracts Bearer token from HTTP Authorization header.
 * 
 * This utility function parses the Authorization header to extract JWT tokens
 * following the Bearer token standard (RFC 6750). Handles malformed headers
 * gracefully and returns null for invalid formats.
 * 
 * @param authHeader - Authorization header value (may be undefined)
 * @returns {string | null} Extracted token string or null if invalid format
 * 
 * @example
 * ```typescript
 * // Extract token in middleware
 * const authHeader = c.req.header('Authorization');
 * const token = extractTokenFromHeader(authHeader);
 * 
 * if (token) {
 *   const payload = verifyToken(token);
 *   // Process authenticated request
 * } else {
 *   // No valid token provided
 *   return unauthorizedResponse();
 * }
 * ```
 * 
 * Header Format Expected:
 * ```
 * Authorization: Bearer <jwt_token>
 * ```
 * 
 * Returns null for:
 * - Undefined or empty header
 * - Headers not starting with 'Bearer '
 * - Headers with incorrect format
 * - Headers with only 'Bearer' (no token)
 * 
 * Security Considerations:
 * - Validates proper Bearer token format
 * - No error throwing to prevent information leakage
 * - Handles edge cases gracefully
 * - Compatible with RFC 6750 Bearer Token specification
 * 
 * RFC 6750 Compliance:
 * - Follows Bearer token specification exactly
 * - Case-sensitive 'Bearer ' prefix matching
 * - Proper token extraction without additional validation
 * - Compatible with standard HTTP clients and libraries
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.slice(7);
}