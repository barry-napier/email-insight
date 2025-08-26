import { vi } from 'vitest';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = ':memory:';
process.env.JWT_SECRET = 'test-jwt-secret-32-chars-minimum-length-here';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-minimum-length';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/callback';

// Mock database connection globally
vi.mock('@/db/connection', () => ({
  initializeDatabase: vi.fn().mockReturnValue({}),
  getDatabase: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    get: vi.fn().mockReturnValue(null),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
  }),
  closeDatabase: vi.fn(),
  checkDatabaseHealth: vi.fn().mockReturnValue({
    healthy: true,
    latency: 5,
  }),
}));

// Mock console methods to keep test output clean
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// Global test utilities
export const createMockUser = () => ({
  id: 1,
  email: 'test@example.com',
  googleId: 'google123',
  name: 'Test User'
});

export const createMockToken = () => 'mock-jwt-token-12345';

export const createMockRequest = (url: string, options: RequestInit = {}) => {
  return new Request(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
};