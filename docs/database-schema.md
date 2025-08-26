# Database Schema (Phase 1 Implementation)

**Implementation Status:** ✅ Complete - 8 tables with proper relationships and foreign key constraints  
**Database Size:** 73KB with migrations applied  
**Performance:** WAL mode enabled, optimized for concurrent access

## SQLite Configuration (✅ Implemented)

```sql
-- Enable WAL mode for better concurrency
PRAGMA journal_mode = WAL;

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Optimize for performance
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000;  -- 64MB cache
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 268435456; -- 256MB memory map
```

**Actual Configuration Applied:**
- WAL mode active for concurrent reads during writes
- Foreign key constraints enforced for referential integrity
- 64MB cache size for optimal query performance
- Memory-mapped I/O (256MB) for large database operations

### Configuration Explanation
- **WAL mode**: Allows concurrent reads while writing, improving performance for multi-user scenarios
- **Foreign keys**: Ensures referential integrity between related tables
- **Synchronous NORMAL**: Balances data safety with performance
- **Cache size**: Large cache for frequently accessed data
- **Memory mapped I/O**: Improves performance for large databases

## Entity Relationship Overview (✅ Implemented)

```
users (1) ──── (∞) emails
users (1) ──── (∞) contacts  
users (1) ──── (∞) subscriptions
users (1) ──── (∞) email_analytics
users (1) ──── (∞) sync_jobs
users (1) ──── (∞) gmail_filters
users (1) ──── (∞) token_blacklist

subscriptions (1) ──── (∞) gmail_filters [optional, ON DELETE SET NULL]
```

**Implementation Details:**
- All foreign key relationships implemented with CASCADE delete for user data
- Token blacklist table added for JWT security
- Unique constraints on google_id, email, and JWT IDs

## Core Tables

### users (✅ Implemented)
Stores user account information and encrypted OAuth tokens
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    picture TEXT,
    access_token BLOB NOT NULL,      -- Encrypted with AES-256
    refresh_token BLOB NOT NULL,     -- Encrypted with AES-256
    token_expiry INTEGER NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    last_sync_at INTEGER,
    sync_history_id TEXT  -- Gmail history ID for incremental sync
);

-- Unique indexes automatically created by Drizzle
CREATE UNIQUE INDEX users_google_id_unique ON users(google_id);
CREATE UNIQUE INDEX users_email_unique ON users(email);
```

**Security Implementation:**
- OAuth tokens stored as encrypted BLOBs using AES-256
- Unique constraints prevent duplicate Google accounts
- Unix timestamps for efficient date operations

### emails
Stores email messages
```sql
CREATE TABLE emails (
    id TEXT PRIMARY KEY,  -- Gmail message ID
    user_id INTEGER NOT NULL,
    thread_id TEXT NOT NULL,
    subject TEXT,
    snippet TEXT,
    from_email TEXT,
    from_name TEXT,
    to_emails JSON,  -- Array of email addresses
    cc_emails JSON,
    bcc_emails JSON,
    date INTEGER NOT NULL,  -- Unix timestamp
    labels JSON,  -- Array of Gmail label IDs
    has_attachments BOOLEAN DEFAULT 0,
    attachment_count INTEGER DEFAULT 0,
    size_bytes INTEGER,
    is_sent BOOLEAN DEFAULT 0,
    is_received BOOLEAN DEFAULT 1,
    is_draft BOOLEAN DEFAULT 0,
    is_spam BOOLEAN DEFAULT 0,
    is_trash BOOLEAN DEFAULT 0,
    headers JSON,  -- Store all headers as JSON
    body_text TEXT,
    body_html TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_emails_user_id ON emails(user_id);
CREATE INDEX idx_emails_thread_id ON emails(thread_id);
CREATE INDEX idx_emails_date ON emails(date DESC);
CREATE INDEX idx_emails_from ON emails(from_email);
CREATE INDEX idx_emails_sent_received ON emails(user_id, is_sent, is_received);
```

### token_blacklist (✅ Implemented)
JWT token blacklist for secure logout functionality
```sql
CREATE TABLE token_blacklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jti TEXT UNIQUE NOT NULL,        -- JWT ID
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX token_blacklist_jti_unique ON token_blacklist(jti);
```

**Security Features:**
- Prevents token replay after logout
- Automatic cleanup of expired tokens
- Fast JTI lookup with unique index

### Full-Text Search (Phase 2 - Gmail Integration)
*FTS5 virtual table will be added in Phase 2 for email content search*

### contacts (✅ Implemented)
Aggregated contact information for analytics
```sql
CREATE TABLE contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    email_count INTEGER DEFAULT 0,
    first_email_date INTEGER NOT NULL,
    last_email_date INTEGER NOT NULL,
    avg_response_time INTEGER,        -- in minutes
    relationship_score REAL DEFAULT 0, -- 0-100
    is_subscription BOOLEAN DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Implementation Notes:**
- Ready for Phase 3 analytics engine
- Relationship scoring foundation implemented
- Subscription detection field prepared

### subscriptions (✅ Implemented)
ML-based subscription detection with confidence scoring
```sql
CREATE TABLE subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    sender_email TEXT NOT NULL,
    sender_name TEXT,
    frequency TEXT NOT NULL,      -- 'daily' | 'weekly' | 'monthly' | 'irregular'
    category TEXT,
    unsubscribe_url TEXT,
    unsubscribe_method TEXT DEFAULT 'unknown' NOT NULL, -- 'link' | 'header' | 'reply' | 'unknown'
    is_active BOOLEAN DEFAULT 1 NOT NULL,
    confidence REAL DEFAULT 0 NOT NULL,  -- ML confidence score (0-1)
    email_count INTEGER DEFAULT 0 NOT NULL,
    first_email_date INTEGER NOT NULL,
    last_email_date INTEGER NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**ML Integration Ready:**
- Confidence scoring for subscription detection algorithms
- Multiple unsubscribe method support (RFC 8058)
- Frequency analysis for pattern detection
- Prepared for Phase 4 subscription detection engine

### email_analytics (✅ Implemented)
Materialized analytics views for dashboard performance
```sql
CREATE TABLE email_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    period TEXT NOT NULL,           -- 'day' | 'week' | 'month' | 'year'
    date TEXT NOT NULL,             -- ISO date string
    total_emails INTEGER DEFAULT 0,
    sent_emails INTEGER DEFAULT 0,
    received_emails INTEGER DEFAULT 0,
    unique_contacts INTEGER DEFAULT 0,
    avg_response_time INTEGER,      -- minutes
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Performance Optimization:**
- Pre-computed analytics for fast dashboard queries
- Time-series data with multiple aggregation periods
- Ready for Phase 3 analytics engine implementation

### sync_jobs (✅ Implemented)
Gmail API synchronization job tracking
```sql
CREATE TABLE sync_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,             -- 'initial' | 'incremental' | 'full'
    status TEXT NOT NULL,           -- 'pending' | 'running' | 'completed' | 'failed'
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    processed_count INTEGER DEFAULT 0,
    total_count INTEGER,
    error TEXT,
    history_id TEXT,                -- Gmail history ID for incremental sync
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Gmail Integration Ready:**
- History ID tracking for incremental synchronization
- Comprehensive job status tracking
- Error logging for debugging sync issues
- Prepared for Phase 2 Gmail API integration

### gmail_filters (✅ Implemented)
Gmail API filter management
```sql
CREATE TABLE gmail_filters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    gmail_filter_id TEXT NOT NULL,    -- Gmail API filter ID
    subscription_id INTEGER,          -- Optional link to subscription
    criteria TEXT NOT NULL,           -- JSON filter criteria
    action TEXT NOT NULL,             -- JSON filter actions
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
);
```

**Filter Management:**
- Tracks filters created through the application
- Links filters to subscriptions for bulk management
- Stores Gmail API filter IDs for deletion/modification
- Ready for Phase 4 unsubscribe implementation

## Views for Common Queries

### Daily Email Stats
```sql
CREATE VIEW daily_stats AS
SELECT 
    user_id,
    date(date, 'unixepoch') as day,
    COUNT(*) as total_emails,
    SUM(is_sent) as sent,
    SUM(is_received) as received,
    COUNT(DISTINCT from_email) as unique_senders
FROM emails
WHERE is_trash = 0 AND is_spam = 0
GROUP BY user_id, day;
```

### Top Contacts
```sql
CREATE VIEW top_contacts AS
SELECT 
    c.*,
    RANK() OVER (PARTITION BY user_id ORDER BY total_emails DESC) as rank
FROM contacts c
WHERE total_emails > 5;
```

### Active Subscriptions Summary
```sql
CREATE VIEW subscription_summary AS
SELECT 
    user_id,
    COUNT(*) as total_subscriptions,
    SUM(CASE WHEN is_unsubscribed = 0 THEN 1 ELSE 0 END) as active_subscriptions,
    SUM(CASE WHEN is_unsubscribed = 1 THEN 1 ELSE 0 END) as unsubscribed,
    SUM(email_count) as total_subscription_emails
FROM subscriptions
GROUP BY user_id;
```

## Migration Strategy

```sql
-- Version tracking
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER DEFAULT (unixepoch())
);

-- Insert initial version
INSERT INTO schema_version (version) VALUES (1);
```

## Indexes for Performance

### Common Query Patterns
```sql
-- Recent emails for a user
CREATE INDEX idx_emails_recent ON emails(user_id, date DESC) 
WHERE is_trash = 0 AND is_spam = 0;

-- Subscription emails
CREATE INDEX idx_emails_subscription ON emails(from_email, user_id, date DESC);

-- Unread important emails
CREATE INDEX idx_emails_important ON emails(user_id, date DESC) 
WHERE json_extract(labels, '$[*]') LIKE '%IMPORTANT%';
```

## Data Retention

```sql
-- Clean up old analytics data (keep 1 year)
DELETE FROM email_analytics 
WHERE date < unixepoch() - (365 * 24 * 60 * 60);

-- Archive old emails (move to separate table)
CREATE TABLE emails_archive AS 
SELECT * FROM emails 
WHERE date < unixepoch() - (180 * 24 * 60 * 60);
```