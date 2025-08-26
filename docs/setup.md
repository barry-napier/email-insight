# Development Setup Guide

## Prerequisites

### Required Software
- **Node.js 20+** and **npm 10+** (or **pnpm 8+** recommended)
- **Git** 2.30+
- **SQLite3** (will be installed automatically with project dependencies)
- **A Google account** for Gmail API access
- **Google Cloud Console** access for API setup

### Recommended Tools
- VS Code with TypeScript extension
- Postman or similar API testing tool
- DB Browser for SQLite
- Chrome DevTools

## Initial Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd email-insight

# Verify Node.js version
node --version  # Should be 20+
npm --version   # Should be 10+
```

### 2. Environment Variables
Create `.env` file in project root:
```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=./data/email-insight.db

# Google OAuth2
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# Security
JWT_SECRET=generate_random_32_char_string_here
ENCRYPTION_KEY=generate_another_32_char_string_here

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Optional: Gmail Push Notifications
PUBSUB_TOPIC=projects/your-project/topics/gmail-updates
```

### 3. Google Cloud Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project
3. Enable Gmail API
4. Create OAuth2 credentials (see [Gmail Integration Guide](./gmail-integration.md))
5. Add authorized redirect URI: `http://localhost:3000/auth/callback`

## Backend Setup

> **Note**: The backend implementation does not exist yet. This section describes the planned setup once development begins.

### Install Dependencies
```bash
cd backend
npm install
# or if using pnpm
pnpm install
```

### Initialize Database
```bash
npm run db:init     # Create database
npm run db:migrate  # Run migrations
npm run db:seed     # Optional: Add test data
```

### Start Development Server
```bash
npm run dev
```

Server will run on `http://localhost:3001`

### Backend Project Structure
```
backend/
├── src/
│   ├── api/           # API routes
│   │   ├── auth.ts
│   │   ├── analytics.ts
│   │   ├── subscriptions.ts
│   │   └── sync.ts
│   ├── services/      # Business logic
│   │   ├── gmail.ts
│   │   ├── analytics.ts
│   │   ├── subscription-detector.ts
│   │   └── unsubscribe.ts
│   ├── db/            # Database layer
│   │   ├── schema.ts
│   │   ├── migrations/
│   │   └── queries/
│   ├── utils/         # Utilities
│   │   ├── auth.ts
│   │   ├── crypto.ts
│   │   └── rate-limiter.ts
│   ├── types/         # TypeScript types
│   └── index.ts       # Entry point
├── tests/
├── package.json
└── tsconfig.json
```

## Frontend Setup

> **Note**: The frontend implementation does not exist yet. This section describes the planned setup once development begins.

### Install Dependencies
```bash
cd frontend
npm install
# or if using pnpm
pnpm install
```

### Start Development Server
```bash
npm run dev
```

Frontend will run on `http://localhost:3000`

### Frontend Project Structure
```
frontend/
├── app/               # Next.js app directory
│   ├── layout.tsx
│   ├── page.tsx
│   ├── auth/
│   ├── dashboard/
│   └── subscriptions/
├── components/        # React components
│   ├── charts/
│   ├── tables/
│   └── ui/
├── lib/              # Utilities
│   ├── api.ts
│   ├── auth.ts
│   └── utils.ts
├── styles/
├── public/
├── package.json
└── tsconfig.json
```

## Development Workflow

### 1. Database Development
```bash
# Create new migration
npm run db:migrate:create add_new_table

# Run migrations
npm run db:migrate

# Reset database
npm run db:reset

# Open SQLite console
npm run db:console
```

### 2. Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.ts

# Watch mode
npm run test:watch
```

### 3. Type Checking
```bash
# Check types
npm run type-check

# Generate types from database
npm run db:types
```

### 4. Linting & Formatting
```bash
# Lint code
npm run lint

# Fix lint issues
npm run lint:fix

# Format code
npm run format
```

## Common Development Tasks

### Adding a New API Endpoint

1. **Define route in `backend/src/api/`**
```typescript
// backend/src/api/newFeature.ts
import { Hono } from 'hono';

const app = new Hono();

app.get('/feature', async (c) => {
  // Implementation
  return c.json({ data: result });
});

export default app;
```

2. **Register route in main app**
```typescript
// backend/src/index.ts
import newFeature from './api/newFeature';

app.route('/api/feature', newFeature);
```

3. **Add TypeScript types**
```typescript
// backend/src/types/feature.ts
export interface Feature {
  id: string;
  // ... other properties
}
```

### Adding Database Table

1. **Create migration**
```bash
npm run db:migrate:create create_features_table
```

2. **Write migration**
```sql
-- migrations/001_create_features_table.sql
CREATE TABLE features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);
```

3. **Update schema types**
```typescript
// backend/src/db/schema.ts
export const features = sqliteTable('features', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at').default(sql`(unixepoch())`)
});
```

### Adding Frontend Component

1. **Create component**
```tsx
// frontend/components/Feature.tsx
export function Feature({ data }: { data: FeatureData }) {
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}
```

2. **Use in page**
```tsx
// frontend/app/dashboard/page.tsx
import { Feature } from '@/components/Feature';

export default function Dashboard() {
  const data = await fetchFeatureData();
  return <Feature data={data} />;
}
```

## Debugging

### Backend Debugging

1. **VS Code Launch Configuration**
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Backend",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "dev:debug"],
  "port": 9229,
  "skipFiles": ["<node_internals>/**"]
}
```

2. **Using Inspector**
```bash
npm run dev:debug
# Open chrome://inspect in Chrome
```

### Frontend Debugging

1. **Next.js Debug Mode**
```bash
NODE_OPTIONS='--inspect' npm run dev
```

2. **React DevTools**
- Install React DevTools browser extension
- Use Components and Profiler tabs

### Database Debugging

1. **View database**
```bash
# Open in DB Browser for SQLite
open data/email-insight.db
```

2. **Query logging**
```typescript
// Enable query logging
const db = new Database('email-insight.db');
db.on('query', (query) => console.log(query));
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>
```

#### Database Locked
```bash
# Remove lock file
rm data/email-insight.db-wal
rm data/email-insight.db-shm
```

#### Gmail API Errors

**401 Unauthorized**
- Check if tokens are expired
- Verify OAuth2 credentials

**403 Insufficient Permission**
- Check OAuth2 scopes
- Re-authenticate user

**429 Rate Limit**
- Implement exponential backoff
- Check quota usage in Google Cloud Console

#### TypeScript Errors

**Cannot find module**
```bash
# Clear TypeScript cache
rm -rf node_modules/.cache
npm run type-check
```

**Type definitions out of sync**
```bash
# Regenerate types
npm run db:types
npm run type-check
```

## Performance Optimization

### Database Optimization
```sql
-- Analyze query performance
EXPLAIN QUERY PLAN SELECT * FROM emails WHERE user_id = 1;

-- Update statistics
ANALYZE;

-- Vacuum database
VACUUM;
```

### API Response Caching
```typescript
// Add caching middleware
app.use('/api/analytics', cache({
  ttl: 60 * 5, // 5 minutes
  key: (c) => `${c.req.url}-${c.get('userId')}`
}));
```

### Frontend Optimization
```typescript
// Use React Query for caching
const { data } = useQuery({
  queryKey: ['analytics', userId],
  queryFn: fetchAnalytics,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

## Deployment Preparation

### Build for Production
```bash
# Backend
cd backend
npm run build

# Frontend  
cd frontend
npm run build
```

### Environment Variables for Production
```env
NODE_ENV=production
DATABASE_URL=/var/data/email-insight.db
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/callback
```

### Health Checks
```typescript
// Add health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});
```

## Additional Resources

- [Hono Documentation](https://hono.dev)
- [Next.js Documentation](https://nextjs.org/docs)
- [Gmail API Reference](https://developers.google.com/gmail/api/reference/rest)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)