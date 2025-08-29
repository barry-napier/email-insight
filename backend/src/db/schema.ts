import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * Database schema definitions using Drizzle ORM.
 * 
 * This module defines the complete database schema for Email Insight application,
 * including all tables, relationships, and constraints. The schema is designed for:
 * - Gmail integration with OAuth2 token management
 * - Email analytics and contact relationship tracking  
 * - ML-based subscription detection and management
 * - Secure JWT authentication with token blacklisting
 * 
 * All tables use Unix timestamps and foreign key constraints for data integrity.
 * Sensitive data (OAuth tokens) is stored as encrypted BLOBs.
 */

/**
 * Users table - Stores user accounts and encrypted OAuth credentials.
 * 
 * This table contains user authentication data and Gmail API tokens required
 * for accessing user email data. OAuth tokens are encrypted using AES-256
 * before storage for security compliance.
 * 
 * @table users
 * @primaryKey id - Auto-incrementing integer primary key
 * @unique google_id - Google OAuth user identifier
 * @unique email - User's Gmail address
 * @encrypted access_token - Gmail API access token (AES-256 encrypted BLOB)
 * @encrypted refresh_token - Gmail API refresh token (AES-256 encrypted BLOB)
 */
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  googleId: text('google_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name'),
  picture: text('picture'),
  accessToken: blob('access_token').notNull(), // Encrypted
  refreshToken: blob('refresh_token').notNull(), // Encrypted
  tokenExpiry: integer('token_expiry').notNull(),
  createdAt: integer('created_at').default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`).notNull(),
  lastSyncAt: integer('last_sync_at'),
  syncHistoryId: text('sync_history_id'), // Gmail history ID for incremental sync
});

/**
 * Emails table - Stores Gmail message data with comprehensive metadata.
 * 
 * This table contains email messages synchronized from Gmail API, including
 * message content, headers, labels, and classification flags. Designed for
 * efficient querying of email analytics and subscription detection.
 * 
 * @table emails
 * @primaryKey id - Gmail message ID (text, not auto-increment)
 * @foreignKey user_id - References users.id with CASCADE delete
 * @indexed user_id, thread_id, date, from_email for performance
 * @jsonFields to_emails, cc_emails, bcc_emails, labels, headers - Stored as JSON
 */
export const emails = sqliteTable('emails', {
  id: text('id').primaryKey(), // Gmail message ID
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  threadId: text('thread_id').notNull(),
  subject: text('subject'),
  snippet: text('snippet'),
  fromEmail: text('from_email'),
  fromName: text('from_name'),
  toEmails: text('to_emails', { mode: 'json' }).$type<string[]>(),
  ccEmails: text('cc_emails', { mode: 'json' }).$type<string[]>(),
  bccEmails: text('bcc_emails', { mode: 'json' }).$type<string[]>(),
  date: integer('date').notNull(), // Unix timestamp
  labels: text('labels', { mode: 'json' }).$type<string[]>(),
  hasAttachments: integer('has_attachments', { mode: 'boolean' }).default(false).notNull(),
  attachmentCount: integer('attachment_count').default(0).notNull(),
  sizeBytes: integer('size_bytes'),
  isSent: integer('is_sent', { mode: 'boolean' }).default(false).notNull(),
  isReceived: integer('is_received', { mode: 'boolean' }).default(true).notNull(),
  isDraft: integer('is_draft', { mode: 'boolean' }).default(false).notNull(),
  isSpam: integer('is_spam', { mode: 'boolean' }).default(false).notNull(),
  isTrash: integer('is_trash', { mode: 'boolean' }).default(false).notNull(),
  headers: text('headers', { mode: 'json' }).$type<Record<string, string>>(),
  bodyText: text('body_text'),
  bodyHtml: text('body_html'),
  createdAt: integer('created_at').default(sql`(unixepoch())`).notNull(),
});

/**
 * Contacts table - Aggregated contact analytics and relationship scoring.
 * 
 * This table stores computed contact statistics for email analytics dashboard.
 * Data is populated and maintained by the analytics engine based on email
 * message patterns and communication frequency.
 * 
 * @table contacts
 * @primaryKey id - Auto-incrementing contact ID
 * @foreignKey user_id - References users.id with CASCADE delete
 * @analytics email_count, avg_response_time, relationship_score - Computed fields
 * @ml is_subscription - ML classification for subscription detection
 */
export const contacts = sqliteTable('contacts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  name: text('name'),
  emailCount: integer('email_count').default(0).notNull(),
  firstEmailDate: integer('first_email_date').notNull(),
  lastEmailDate: integer('last_email_date').notNull(),
  avgResponseTime: integer('avg_response_time'), // In minutes
  relationshipScore: real('relationship_score').default(0).notNull(),
  isSubscription: integer('is_subscription', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at').default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`).notNull(),
});

/**
 * Subscriptions table - ML-detected email subscriptions with management data.
 * 
 * This table stores subscription information detected by machine learning
 * algorithms, including confidence scores, unsubscribe methods, and frequency
 * analysis. Core table for subscription management features.
 * 
 * @table subscriptions
 * @primaryKey id - Auto-incrementing subscription ID
 * @foreignKey user_id - References users.id with CASCADE delete
 * @ml confidence - ML confidence score (0-1) for subscription detection
 * @rfc8058 unsubscribe_method - Supports List-Unsubscribe header standards
 * @analytics frequency, email_count - Pattern detection fields
 */
export const subscriptions = sqliteTable('subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  senderEmail: text('sender_email').notNull(),
  senderName: text('sender_name'),
  frequency: text('frequency').$type<'daily' | 'weekly' | 'monthly' | 'irregular'>().notNull(),
  category: text('category'),
  unsubscribeUrl: text('unsubscribe_url'),
  unsubscribeMethod: text('unsubscribe_method').$type<'link' | 'header' | 'reply' | 'unknown'>().default('unknown').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  confidence: real('confidence').default(0).notNull(), // ML confidence score
  emailCount: integer('email_count').default(0).notNull(),
  firstEmailDate: integer('first_email_date').notNull(),
  lastEmailDate: integer('last_email_date').notNull(),
  createdAt: integer('created_at').default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`).notNull(),
});

/**
 * Email analytics table - Pre-computed analytics for dashboard performance.
 * 
 * This table stores materialized analytics views aggregated by time periods
 * (day, week, month, year). Data is computed by the analytics engine for
 * fast dashboard queries without real-time aggregation overhead.
 * 
 * @table email_analytics
 * @primaryKey id - Auto-incrementing analytics record ID
 * @foreignKey user_id - References users.id with CASCADE delete
 * @materialized period, date - Time-based aggregation keys
 * @performance total_emails, sent_emails, received_emails - Pre-computed counts
 */
export const emailAnalytics = sqliteTable('email_analytics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  period: text('period').$type<'day' | 'week' | 'month' | 'year'>().notNull(),
  date: text('date').notNull(), // ISO date string
  totalEmails: integer('total_emails').default(0).notNull(),
  sentEmails: integer('sent_emails').default(0).notNull(),
  receivedEmails: integer('received_emails').default(0).notNull(),
  uniqueContacts: integer('unique_contacts').default(0).notNull(),
  avgResponseTime: integer('avg_response_time'), // In minutes
  createdAt: integer('created_at').default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`).notNull(),
});

/**
 * Sync jobs table - Gmail API synchronization job tracking and monitoring.
 * 
 * This table tracks Gmail synchronization operations including initial sync,
 * incremental updates, and full re-synchronization jobs. Used for monitoring
 * sync progress, error handling, and incremental sync state management.
 * 
 * @table sync_jobs
 * @primaryKey id - Auto-incrementing job ID
 * @foreignKey user_id - References users.id with CASCADE delete
 * @gmail history_id - Gmail history ID for incremental sync tracking
 * @monitoring status, error - Job status and error tracking
 */
export const syncJobs = sqliteTable('sync_jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').$type<'initial' | 'incremental' | 'full'>().notNull(),
  status: text('status').$type<'pending' | 'running' | 'completed' | 'failed'>().notNull(),
  startedAt: integer('started_at').notNull(),
  completedAt: integer('completed_at'),
  processedCount: integer('processed_count').default(0).notNull(),
  totalCount: integer('total_count'),
  error: text('error'),
  historyId: text('history_id'), // Gmail history ID for incremental sync
  createdAt: integer('created_at').default(sql`(unixepoch())`).notNull(),
});

/**
 * Gmail filters table - Tracks Gmail API filters created by the application.
 * 
 * This table maintains a record of Gmail filters created through the application
 * for subscription management and email organization. Links filters to
 * subscriptions for bulk management operations.
 * 
 * @table gmail_filters
 * @primaryKey id - Auto-incrementing filter record ID
 * @foreignKey user_id - References users.id with CASCADE delete
 * @foreignKey subscription_id - Optional link to subscriptions.id with SET NULL
 * @gmail gmail_filter_id - Gmail API filter ID for management operations
 * @json criteria, action - Filter criteria and actions as JSON
 */
export const gmailFilters = sqliteTable('gmail_filters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  gmailFilterId: text('gmail_filter_id').notNull(), // Gmail API filter ID
  subscriptionId: integer('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),
  criteria: text('criteria', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  action: text('action', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  createdAt: integer('created_at').default(sql`(unixepoch())`).notNull(),
});

/**
 * Token blacklist table - JWT token revocation for secure logout.
 * 
 * This table implements JWT token blacklisting to prevent token replay attacks
 * after user logout. Tokens are identified by JWT ID (jti) claim and
 * automatically cleaned up after expiration.
 * 
 * @table token_blacklist  
 * @primaryKey id - Auto-incrementing blacklist entry ID
 * @foreignKey user_id - References users.id with CASCADE delete
 * @unique jti - JWT ID claim for token identification
 * @security expires_at - Token expiration for automatic cleanup
 */
export const tokenBlacklist = sqliteTable('token_blacklist', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jti: text('jti').notNull().unique(), // JWT ID
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').default(sql`(unixepoch())`).notNull(),
});