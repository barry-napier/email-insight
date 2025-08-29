import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import jwt from 'jsonwebtoken';
import { 
  generateToken, 
  verifyToken, 
  refreshTokens, 
  blacklistToken, 
  isTokenBlacklisted 
} from '@/utils/auth';
import { getDatabase } from '@/db/connection';
import * as dbModule from '@/db/connection';

// Mock dependencies
vi.mock('jsonwebtoken');
vi.mock('@/db/connection');

const mockJwt = jwt as any;
const mockGetDatabase = getDatabase as Mock;

describe('Auth Utilities', () => {
  const mockDb = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    get: vi.fn(),
    prepare: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDatabase.mockReturnValue(mockDb);
    
    // Setup jwt mocks
    mockJwt.sign = vi.fn();
    mockJwt.verify = vi.fn();
    
    // Reset environment
    process.env.JWT_SECRET = 'test-jwt-secret-32-chars-minimum';
  });

  describe('generateToken', () => {
    it('should generate access and refresh tokens for user', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        googleId: 'google123'
      };

      mockJwt.sign
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token');

      const result = await generateToken(mockUser);

      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      });

      // Verify access token generation
      expect(mockJwt.sign).toHaveBeenCalledWith(
        {
          userId: 1,
          email: 'test@example.com',
          type: 'access'
        },
        'test-jwt-secret-32-chars-minimum',
        { 
          expiresIn: '1h',
          issuer: 'email-insight-api',
          audience: 'email-insight-app',
          jwtid: expect.any(String)
        }
      );

      // Verify refresh token generation
      expect(mockJwt.sign).toHaveBeenCalledWith(
        {
          userId: 1,
          email: 'test@example.com',
          type: 'refresh'
        },
        'test-jwt-secret-32-chars-minimum',
        {
          expiresIn: '7d',
          issuer: 'email-insight-api',
          audience: 'email-insight-app',
          jwtid: expect.any(String)
        }
      );
    });

    it('should handle token generation errors', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        googleId: 'google123'
      };

      mockJwt.sign.mockImplementation(() => {
        throw new Error('Token generation failed');
      });

      await expect(generateToken(mockUser)).rejects.toThrow('Failed to generate tokens');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token and return user data', async () => {
      const mockPayload = {
        userId: 1,
        email: 'test@example.com',
        type: 'access',
        jti: 'token-id-123'
      };

      mockJwt.verify.mockReturnValue(mockPayload);

      const result = await verifyToken('valid-token');

      expect(result).toEqual({
        userId: 1,
        email: 'test@example.com',
        type: 'access',
        jti: 'token-id-123'
      });

      expect(mockJwt.verify).toHaveBeenCalledWith(
        'valid-token',
        'test-jwt-secret-32-chars-minimum'
      );
    });

    it('should throw error for invalid token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(verifyToken('invalid-token')).rejects.toThrow('Token verification failed');
    });

    it('should handle malformed tokens', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Malformed token');
      });

      await expect(verifyToken('malformed-token')).rejects.toThrow('Token verification failed');
    });

    it('should handle expired tokens', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      await expect(verifyToken('expired-token')).rejects.toThrow('Token verification failed');
    });
  });

  describe('refreshTokens', () => {
    it('should generate new tokens using valid refresh token', async () => {
      const mockPayload = {
        userId: 1,
        email: 'test@example.com',
        type: 'refresh',
        jti: 'refresh-token-id'
      };

      mockJwt.verify.mockReturnValue(mockPayload);
      mockJwt.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      mockDb.get.mockReturnValue(null); // Token not blacklisted

      const result = await refreshTokens('valid-refresh-token');

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      });

      // Should blacklist the old refresh token
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalled();
    });

    it('should reject non-refresh tokens', async () => {
      const mockPayload = {
        userId: 1,
        email: 'test@example.com',
        type: 'access',
        jti: 'access-token-id'
      };

      mockJwt.verify.mockReturnValue(mockPayload);

      await expect(refreshTokens('access-token')).rejects.toThrow('Invalid refresh token');
    });

    it('should reject blacklisted refresh tokens', async () => {
      const mockPayload = {
        userId: 1,
        email: 'test@example.com',
        type: 'refresh',
        jti: 'blacklisted-refresh-token'
      };

      mockJwt.verify.mockReturnValue(mockPayload);
      mockDb.get.mockReturnValue({ jti: 'blacklisted-refresh-token' }); // Token is blacklisted

      await expect(refreshTokens('blacklisted-refresh-token')).rejects.toThrow('Refresh token has been revoked');
    });
  });

  describe('blacklistToken', () => {
    it('should add token to blacklist', async () => {
      const mockPayload = {
        userId: 1,
        email: 'test@example.com',
        jti: 'token-to-blacklist',
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockJwt.verify.mockReturnValue(mockPayload);

      await blacklistToken('token-to-blacklist');

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith({
        jti: 'token-to-blacklist',
        userId: 1,
        expiresAt: mockPayload.exp
      });
    });

    it('should handle blacklist insertion errors gracefully', async () => {
      const mockPayload = {
        userId: 1,
        email: 'test@example.com',
        jti: 'token-to-blacklist',
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockJwt.verify.mockReturnValue(mockPayload);
      mockDb.insert.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(blacklistToken('token-to-blacklist')).rejects.toThrow('Failed to blacklist token');
    });
  });

  describe('isTokenBlacklisted', () => {
    it('should return false for non-blacklisted tokens', async () => {
      const mockPayload = {
        jti: 'valid-token-id',
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockJwt.verify.mockReturnValue(mockPayload);
      mockDb.get.mockReturnValue(null);

      const result = await isTokenBlacklisted('valid-token');

      expect(result).toBe(false);
    });

    it('should return true for blacklisted tokens', async () => {
      const mockPayload = {
        jti: 'blacklisted-token-id',
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      mockJwt.verify.mockReturnValue(mockPayload);
      mockDb.get.mockReturnValue({ jti: 'blacklisted-token-id' });

      const result = await isTokenBlacklisted('blacklisted-token');

      expect(result).toBe(true);
    });

    it('should return true for expired tokens', async () => {
      const expiredPayload = {
        jti: 'expired-token-id',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };

      mockJwt.verify.mockReturnValue(expiredPayload);

      const result = await isTokenBlacklisted('expired-token');

      expect(result).toBe(true);
    });

    it('should handle token verification errors', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await isTokenBlacklisted('invalid-token');

      expect(result).toBe(true);
    });
  });
});