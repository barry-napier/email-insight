# Database Schema

## SQLite Configuration

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

### Configuration Explanation
- **WAL mode**: Allows concurrent reads while writing, improving performance for multi-user scenarios
- **Foreign keys**: Ensures referential integrity between related tables
- **Synchronous NORMAL**: Balances data safety with performance
- **Cache size**: Large cache for frequently accessed data
- **Memory mapped I/O**: Improves performance for large databases

## Entity Relationship Overview

```
users (1) ──── (∞) emails
users (1) ──── (∞) contacts  
users (1) ──── (∞) subscriptions
users (1) ──── (∞) email_analytics
users (1) ──── (∞) sync_jobs
users (1) ──── (∞) gmail_filters

subscriptions (1) ──── (∞) gmail_filters [optional]
```

## Core Tables

### users
Stores user account information and OAuth tokens
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    picture TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expiry INTEGER NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    last_sync_at INTEGER,
    sync_history_id TEXT  -- Gmail history ID for incremental sync
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
```

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

### Full-Text Search Table
```sql
CREATE VIRTUAL TABLE emails_fts USING fts5(
    subject,
    snippet,
    from_name,
    from_email,
    body_text,
    content=emails,
    content_rowid=rowid,
    tokenize='porter unicode61'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER emails_ai AFTER INSERT ON emails BEGIN
    INSERT INTO emails_fts(rowid, subject, snippet, from_name, from_email, body_text)
    VALUES (new.rowid, new.subject, new.snippet, new.from_name, new.from_email, new.body_text);
END;

CREATE TRIGGER emails_ad AFTER DELETE ON emails BEGIN
    DELETE FROM emails_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER emails_au AFTER UPDATE ON emails BEGIN
    UPDATE emails_fts 
    SET subject = new.subject, 
        snippet = new.snippet,
        from_name = new.from_name,
        from_email = new.from_email,
        body_text = new.body_text
    WHERE rowid = new.rowid;
END;
```

### contacts
Aggregated contact information
```sql
CREATE TABLE contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    domain TEXT,
    total_emails INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    emails_received INTEGER DEFAULT 0,
    first_contact INTEGER,
    last_contact INTEGER,
    avg_response_time INTEGER,  -- in minutes
    relationship_score REAL DEFAULT 0,  -- 0-100
    is_frequent BOOLEAN DEFAULT 0,  -- top 20% of contacts
    metadata JSON,  -- Additional data like company, role, etc
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, email)
);

CREATE INDEX idx_contacts_user_email ON contacts(user_id, email);
CREATE INDEX idx_contacts_domain ON contacts(domain);
CREATE INDEX idx_contacts_frequency ON contacts(user_id, total_emails DESC);
CREATE INDEX idx_contacts_last ON contacts(user_id, last_contact DESC);
```

### subscriptions
Detected email subscriptions
```sql
CREATE TABLE subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    sender_email TEXT NOT NULL,
    sender_name TEXT,
    domain TEXT NOT NULL,
    category TEXT CHECK(category IN ('newsletter', 'marketing', 'notification', 'social', 'other')),
    frequency TEXT CHECK(frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'irregular')),
    email_count INTEGER DEFAULT 0,
    first_seen INTEGER,
    last_seen INTEGER,
    avg_emails_per_month REAL,
    unsubscribe_method JSON,  -- {type: 'header'|'link'|'mailto', url?: string, email?: string}
    list_unsubscribe_header TEXT,
    list_unsubscribe_post_header TEXT,
    sample_subjects JSON,  -- Array of recent subjects
    is_active BOOLEAN DEFAULT 1,
    is_unsubscribed BOOLEAN DEFAULT 0,
    unsubscribed_at INTEGER,
    unsubscribe_status TEXT,  -- 'success', 'failed', 'pending'
    confidence_score REAL DEFAULT 0,  -- 0-1, how confident we are this is a subscription
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, sender_email)
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_domain ON subscriptions(domain);
CREATE INDEX idx_subscriptions_active ON subscriptions(user_id, is_active);
CREATE INDEX idx_subscriptions_category ON subscriptions(category);
CREATE INDEX idx_subscriptions_frequency ON subscriptions(user_id, email_count DESC);
```

### email_analytics
Pre-computed analytics for performance
```sql
CREATE TABLE email_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date INTEGER NOT NULL,  -- Unix timestamp (day precision)
    period TEXT CHECK(period IN ('day', 'week', 'month')),
    total_emails INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    emails_received INTEGER DEFAULT 0,
    unique_senders INTEGER DEFAULT 0,
    unique_recipients INTEGER DEFAULT 0,
    avg_response_time INTEGER,  -- minutes
    total_threads INTEGER DEFAULT 0,
    hourly_distribution JSON,  -- {0: count, 1: count, ..., 23: count}
    top_senders JSON,  -- [{email, count}, ...]
    top_recipients JSON,  -- [{email, count}, ...]
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, date, period)
);

CREATE INDEX idx_analytics_user_date ON email_analytics(user_id, date DESC);
CREATE INDEX idx_analytics_period ON email_analytics(user_id, period, date DESC);
```

### sync_jobs
Track sync operations
```sql
CREATE TABLE sync_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT CHECK(type IN ('initial', 'incremental', 'full')),
    status TEXT CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
    started_at INTEGER,
    completed_at INTEGER,
    total_messages INTEGER DEFAULT 0,
    processed_messages INTEGER DEFAULT 0,
    failed_messages INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSON,  -- Additional sync details
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sync_jobs_user ON sync_jobs(user_id, created_at DESC);
CREATE INDEX idx_sync_jobs_status ON sync_jobs(status);
```

### gmail_filters
Store created Gmail filters
```sql
CREATE TABLE gmail_filters (
    id TEXT PRIMARY KEY,  -- Gmail filter ID
    user_id INTEGER NOT NULL,
    subscription_id INTEGER,
    criteria JSON NOT NULL,
    action JSON NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
);

CREATE INDEX idx_filters_user ON gmail_filters(user_id);
CREATE INDEX idx_filters_subscription ON gmail_filters(subscription_id);
```

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