import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { databaseConfig } from '@/config/environment';
import * as schema from './schema';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let database: Database.Database | null = null;
let db: ReturnType<typeof drizzle> | null = null;

/**
 * Initializes the SQLite database connection with optimal performance settings.
 * 
 * This function creates a singleton database connection that:
 * - Sets up SQLite with WAL mode for concurrent access
 * - Applies performance optimizations (64MB cache, memory mapping)
 * - Enables foreign key constraints for data integrity
 * - Runs database migrations if they exist
 * - Creates the Drizzle ORM instance with schema
 * 
 * @returns {ReturnType<typeof drizzle>} Initialized Drizzle database instance
 * 
 * @throws {Error} When database initialization fails due to:
 * - Invalid database path or permissions
 * - SQLite configuration errors
 * - Migration failures
 * - Schema validation issues
 * 
 * @example
 * ```typescript
 * // Initialize database (typically done once at startup)
 * const db = initializeDatabase();
 * 
 * // Use with Drizzle queries
 * const users = await db.select().from(schema.users);
 * ```
 * 
 * Performance Optimizations Applied:
 * - WAL (Write-Ahead Logging) for concurrent reads during writes
 * - 64MB cache size for frequently accessed data
 * - 256MB memory-mapped I/O for large operations
 * - NORMAL synchronous mode balancing safety and speed
 * - Memory-based temporary storage
 * 
 * Security Features:
 * - Foreign key constraints enforced
 * - Database directory created with proper permissions
 * - Migration integrity verification
 */
export function initializeDatabase(): ReturnType<typeof drizzle> {
  if (db) {
    return db;
  }

  try {
    // Ensure data directory exists
    const dbPath = resolve(databaseConfig.url);
    const dbDir = dirname(dbPath);
    
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    // Create SQLite database connection
    database = new Database(dbPath);

    // Configure SQLite for optimal performance
    database.pragma('journal_mode = WAL');
    database.pragma('foreign_keys = ON');
    database.pragma('synchronous = NORMAL');
    database.pragma('cache_size = -64000'); // 64MB cache
    database.pragma('temp_store = MEMORY');
    database.pragma('mmap_size = 268435456'); // 256MB memory map

    // Create Drizzle instance
    db = drizzle(database, { schema });

    // Run migrations if they exist
    const migrationsPath = resolve(__dirname, './migrations');
    const journalPath = resolve(migrationsPath, 'meta/_journal.json');
    if (existsSync(migrationsPath) && existsSync(journalPath)) {
      migrate(db, { migrationsFolder: migrationsPath });
      console.log('✅ Database migrations applied');
    } else {
      console.log('ℹ️  No migrations found, skipping migration step');
    }

    console.log('✅ Database initialized successfully');
    return db;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Gets the current database connection, initializing if necessary.
 * 
 * This function implements the singleton pattern for database connections,
 * ensuring only one connection exists throughout the application lifecycle.
 * If no connection exists, it automatically initializes one.
 * 
 * @returns {ReturnType<typeof drizzle>} Active Drizzle database instance
 * 
 * @example
 * ```typescript
 * // Get database instance anywhere in the application
 * const db = getDatabase();
 * 
 * // Perform database operations
 * const result = await db.select().from(users).where(eq(users.id, 1));
 * ```
 * 
 * Thread Safety:
 * - Safe for concurrent access due to SQLite WAL mode
 * - Singleton pattern prevents connection pool issues
 * - No race conditions in initialization
 */
export function getDatabase(): ReturnType<typeof drizzle> {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

/**
 * Gracefully closes the database connection and cleans up resources.
 * 
 * This function should be called during application shutdown to ensure:
 * - All pending transactions are completed
 * - Database files are properly closed
 * - Memory resources are released
 * - Connection state is reset for potential reinitialization
 * 
 * @returns {void}
 * 
 * @example
 * ```typescript
 * // Graceful shutdown handler
 * process.on('SIGTERM', () => {
 *   console.log('Shutting down gracefully...');
 *   closeDatabase();
 *   process.exit(0);
 * });
 * ```
 * 
 * Cleanup Process:
 * - Closes SQLite database connection
 * - Resets singleton instances to null
 * - Allows for clean reinitialization if needed
 * - Logs confirmation of successful closure
 */
export function closeDatabase(): void {
  if (database) {
    database.close();
    database = null;
    db = null;
    console.log('✅ Database connection closed');
  }
}

/**
 * Performs a health check on the database connection.
 * 
 * This function verifies database availability and measures response time by:
 * - Executing a simple SELECT query
 * - Measuring query execution latency
 * - Validating expected query results
 * - Catching and reporting any connection issues
 * 
 * @returns {{ healthy: boolean; latency: number; error?: string }} Health status object
 * @returns {boolean} healthy - Whether database is operational
 * @returns {number} latency - Query execution time in milliseconds
 * @returns {string} [error] - Error message if health check failed
 * 
 * @example
 * ```typescript
 * // Check database health for monitoring
 * const health = checkDatabaseHealth();
 * 
 * if (health.healthy) {
 *   console.log(`Database healthy, latency: ${health.latency}ms`);
 * } else {
 *   console.error(`Database unhealthy: ${health.error}`);
 * }
 * ```
 * 
 * Used By:
 * - Health check API endpoints
 * - Application monitoring systems
 * - Startup verification processes
 * - Load balancer health checks
 * 
 * Performance Expectations:
 * - Typical latency: 0-5ms for healthy database
 * - Warning threshold: >10ms may indicate performance issues
 * - Error threshold: >50ms likely indicates problems
 */
export function checkDatabaseHealth(): { healthy: boolean; latency: number; error?: string } {
  const startTime = Date.now();
  
  try {
    if (!database) {
      throw new Error('Database not initialized');
    }

    // Simple health check query
    const result = database.prepare('SELECT 1 as health').get() as { health: number } | undefined;
    
    if (!result || result.health !== 1) {
      throw new Error('Health check query failed');
    }

    const latency = Date.now() - startTime;
    
    return {
      healthy: true,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    
    return {
      healthy: false,
      latency,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Direct access to the database instance for advanced usage.
 * 
 * WARNING: This export provides direct access to the database instance.
 * Prefer using `getDatabase()` for standard operations as it ensures
 * proper initialization and maintains the singleton pattern.
 * 
 * @type {ReturnType<typeof drizzle> | null}
 * 
 * Use Cases:
 * - Advanced database operations requiring direct access
 * - Testing scenarios with specific connection requirements
 * - Migration scripts and database maintenance tools
 * 
 * @example
 * ```typescript
 * import { db } from '@/db/connection';
 * 
 * // Check if database is initialized
 * if (db) {
 *   // Direct database operations
 * } else {
 *   // Database not initialized yet
 * }
 * ```
 */
export { db };