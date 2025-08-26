import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  initializeDatabase, 
  getDatabase, 
  closeDatabase, 
  checkDatabaseHealth 
} from '@/db/connection';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';

// Mock better-sqlite3
vi.mock('better-sqlite3');
vi.mock('fs');
vi.mock('path', () => ({
  resolve: vi.fn((...paths) => paths.join('/')),
  dirname: vi.fn((path) => path.split('/').slice(0, -1).join('/'))
}));

const mockDatabase = {
  pragma: vi.fn(),
  prepare: vi.fn().mockReturnValue({
    get: vi.fn()
  }),
  close: vi.fn()
};

const MockedDatabase = Database as any;
const mockExistsSync = existsSync as any;
const mockMkdirSync = mkdirSync as any;

describe('Database Connection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockedDatabase.mockReturnValue(mockDatabase);
    mockExistsSync.mockReturnValue(true);
    
    // Set test environment variables
    process.env.DATABASE_URL = './test-data/test.db';
  });

  afterEach(() => {
    // Clean up database state
    try {
      closeDatabase();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('initializeDatabase', () => {
    it('should initialize database with correct configuration', () => {
      const db = initializeDatabase();

      expect(MockedDatabase).toHaveBeenCalledWith('./test-data/test.db');
      expect(mockDatabase.pragma).toHaveBeenCalledWith('journal_mode = WAL');
      expect(mockDatabase.pragma).toHaveBeenCalledWith('foreign_keys = ON');
      expect(mockDatabase.pragma).toHaveBeenCalledWith('synchronous = NORMAL');
      expect(mockDatabase.pragma).toHaveBeenCalledWith('cache_size = -64000');
      expect(mockDatabase.pragma).toHaveBeenCalledWith('temp_store = MEMORY');
      expect(mockDatabase.pragma).toHaveBeenCalledWith('mmap_size = 268435456');
      expect(db).toBeDefined();
    });

    it('should create data directory if it does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      initializeDatabase();

      expect(mockMkdirSync).toHaveBeenCalledWith('./test-data', { recursive: true });
    });

    it('should return existing database instance on subsequent calls', () => {
      const db1 = initializeDatabase();
      const db2 = initializeDatabase();

      expect(db1).toBe(db2);
      expect(MockedDatabase).toHaveBeenCalledTimes(1);
    });

    it('should handle database connection errors', () => {
      MockedDatabase.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      expect(() => initializeDatabase()).toThrow('Database connection failed');
    });

    it('should skip migrations when migration directory does not exist', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockExistsSync.mockImplementation((path) => {
        if (path.includes('migrations')) return false;
        return true;
      });

      initializeDatabase();

      expect(consoleSpy).toHaveBeenCalledWith('ℹ️  No migrations found, skipping migration step');
      
      consoleSpy.mockRestore();
    });
  });

  describe('getDatabase', () => {
    it('should return existing database instance', () => {
      const initDb = initializeDatabase();
      const getDb = getDatabase();

      expect(getDb).toBe(initDb);
    });

    it('should initialize database if not already initialized', () => {
      const db = getDatabase();

      expect(MockedDatabase).toHaveBeenCalled();
      expect(db).toBeDefined();
    });
  });

  describe('closeDatabase', () => {
    it('should close database connection', () => {
      initializeDatabase();
      closeDatabase();

      expect(mockDatabase.close).toHaveBeenCalled();
    });

    it('should handle closing when database is not initialized', () => {
      expect(() => closeDatabase()).not.toThrow();
    });

    it('should reset database instance after closing', () => {
      initializeDatabase();
      closeDatabase();

      // Next call should create new instance
      getDatabase();
      expect(MockedDatabase).toHaveBeenCalledTimes(2);
    });
  });

  describe('checkDatabaseHealth', () => {
    beforeEach(() => {
      // Mock Date.now for consistent timing
      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1010); // End time
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return healthy status for working database', () => {
      const mockGet = vi.fn().mockReturnValue({ health: 1 });
      mockDatabase.prepare.mockReturnValue({ get: mockGet });
      
      initializeDatabase(); // Initialize database first

      const result = checkDatabaseHealth();

      expect(result).toEqual({
        healthy: true,
        latency: 10
      });

      expect(mockDatabase.prepare).toHaveBeenCalledWith('SELECT 1 as health');
      expect(mockGet).toHaveBeenCalled();
    });

    it('should return unhealthy status when database is not initialized', () => {
      const result = checkDatabaseHealth();

      expect(result).toEqual({
        healthy: false,
        latency: 10,
        error: 'Database not initialized'
      });
    });

    it('should return unhealthy status when health check query fails', () => {
      mockDatabase.prepare.mockImplementation(() => {
        throw new Error('Query failed');
      });

      initializeDatabase();

      const result = checkDatabaseHealth();

      expect(result).toEqual({
        healthy: false,
        latency: 10,
        error: 'Query failed'
      });
    });

    it('should return unhealthy status when health check returns wrong result', () => {
      const mockGet = vi.fn().mockReturnValue({ health: 0 });
      mockDatabase.prepare.mockReturnValue({ get: mockGet });

      initializeDatabase();

      const result = checkDatabaseHealth();

      expect(result).toEqual({
        healthy: false,
        latency: 10,
        error: 'Health check query failed'
      });
    });

    it('should return unhealthy status when health check returns null', () => {
      const mockGet = vi.fn().mockReturnValue(null);
      mockDatabase.prepare.mockReturnValue({ get: mockGet });

      initializeDatabase();

      const result = checkDatabaseHealth();

      expect(result).toEqual({
        healthy: false,
        latency: 10,
        error: 'Health check query failed'
      });
    });

    it('should handle database operation errors gracefully', () => {
      const mockGet = vi.fn().mockImplementation(() => {
        throw new Error('Database operation failed');
      });
      mockDatabase.prepare.mockReturnValue({ get: mockGet });

      initializeDatabase();

      const result = checkDatabaseHealth();

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Database operation failed');
      expect(typeof result.latency).toBe('number');
    });
  });

  describe('Database Configuration', () => {
    it('should apply performance optimizations', () => {
      initializeDatabase();

      // Verify WAL mode is enabled for better concurrency
      expect(mockDatabase.pragma).toHaveBeenCalledWith('journal_mode = WAL');
      
      // Verify foreign keys are enabled for data integrity
      expect(mockDatabase.pragma).toHaveBeenCalledWith('foreign_keys = ON');
      
      // Verify performance settings
      expect(mockDatabase.pragma).toHaveBeenCalledWith('synchronous = NORMAL');
      expect(mockDatabase.pragma).toHaveBeenCalledWith('cache_size = -64000'); // 64MB cache
      expect(mockDatabase.pragma).toHaveBeenCalledWith('temp_store = MEMORY');
      expect(mockDatabase.pragma).toHaveBeenCalledWith('mmap_size = 268435456'); // 256MB memory map
    });

    it('should handle pragma configuration errors', () => {
      mockDatabase.pragma.mockImplementation(() => {
        throw new Error('Pragma configuration failed');
      });

      expect(() => initializeDatabase()).toThrow('Pragma configuration failed');
    });
  });
});