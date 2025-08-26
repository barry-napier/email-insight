import { z } from 'zod';
import { config } from 'dotenv';
import { resolve } from 'path';
import type { EnvironmentConfig } from '@email-insight/shared';

// Load environment variables from root directory
config({ path: resolve(process.cwd(), '../../.env') });
// Fallback to current directory
config();

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().min(1, 'Database URL is required'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'Google Client ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'Google Client Secret is required'),
  GOOGLE_REDIRECT_URI: z.string().url('Google Redirect URI must be a valid URL'),
  JWT_SECRET: z.string().min(32, 'JWT Secret must be at least 32 characters'),
  ENCRYPTION_KEY: z.string().min(32, 'Encryption key must be at least 32 characters'),
  FRONTEND_URL: z.string().url('Frontend URL must be a valid URL'),
  PUBSUB_TOPIC: z.string().optional(),
});

function validateEnvironment(): EnvironmentConfig {
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    FRONTEND_URL: process.env.FRONTEND_URL,
    PUBSUB_TOPIC: process.env.PUBSUB_TOPIC,
  };

  try {
    const parsed = environmentSchema.parse(envVars);
    return parsed as EnvironmentConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingOrInvalid = error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      
      console.error('\n❌ Environment validation failed:');
      console.error('Missing or invalid environment variables:');
      missingOrInvalid.forEach((issue) => console.error(`  • ${issue}`));
      console.error('\nPlease check your .env file and ensure all required variables are set.\n');
    }
    
    process.exit(1);
  }
}

export const env = validateEnvironment();

// Export individual config sections for convenience
export const serverConfig = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  frontendUrl: env.FRONTEND_URL,
} as const;

export const databaseConfig = {
  url: env.DATABASE_URL,
} as const;

export const googleConfig = {
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  redirectUri: env.GOOGLE_REDIRECT_URI,
  pubsubTopic: env.PUBSUB_TOPIC,
} as const;

export const securityConfig = {
  jwtSecret: env.JWT_SECRET,
  encryptionKey: env.ENCRYPTION_KEY,
} as const;