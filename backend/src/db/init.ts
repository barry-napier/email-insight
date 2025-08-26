import { initializeDatabase, closeDatabase } from './connection';
import { resolve, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { databaseConfig } from '@/config/environment';

async function initDatabase(): Promise<void> {
  try {
    console.log('🚀 Initializing Email Insight database...');

    // Ensure data directory exists
    const dbPath = resolve(databaseConfig.url);
    const dbDir = dirname(dbPath);
    
    console.log(`📁 Database path: ${dbPath}`);
    console.log(`📁 Database directory: ${dbDir}`);
    
    if (!existsSync(dbDir)) {
      console.log('📁 Creating database directory...');
      mkdirSync(dbDir, { recursive: true });
    }

    // Initialize database and run migrations
    const db = initializeDatabase();
    
    console.log('✅ Database initialization completed successfully');
    console.log('📊 You can now start the development server with: npm run dev');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase().catch((error) => {
    console.error('❌ Unexpected error during database initialization:', error);
    process.exit(1);
  });
}