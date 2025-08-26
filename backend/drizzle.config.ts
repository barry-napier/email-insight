import type { Config } from 'drizzle-kit';
import { resolve } from 'path';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: resolve(__dirname, '../data/email-insight.db'),
  },
  verbose: true,
  strict: true,
} satisfies Config;