// API Response Types
export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
}

export type ApiResult<T = unknown> = ApiResponse<T> | ApiError;

// User Types
export interface User {
  id: number;
  googleId: string;
  email: string;
  name: string | null;
  picture: string | null;
  createdAt: number;
  updatedAt: number;
  lastSyncAt: number | null;
}

export interface CreateUserData {
  googleId: string;
  email: string;
  name?: string;
  picture?: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
}

// Email Types
export interface Email {
  id: string;
  userId: number;
  threadId: string;
  subject: string | null;
  snippet: string | null;
  fromEmail: string | null;
  fromName: string | null;
  toEmails: string[] | null;
  ccEmails: string[] | null;
  bccEmails: string[] | null;
  date: number;
  labels: string[] | null;
  hasAttachments: boolean;
  attachmentCount: number;
  sizeBytes: number | null;
  isSent: boolean;
  isReceived: boolean;
  isDraft: boolean;
  isSpam: boolean;
  isTrash: boolean;
  headers: Record<string, string> | null;
  bodyText: string | null;
  bodyHtml: string | null;
  createdAt: number;
}

// Contact Types
export interface Contact {
  id: number;
  userId: number;
  email: string;
  name: string | null;
  emailCount: number;
  firstEmailDate: number;
  lastEmailDate: number;
  avgResponseTime: number | null;
  relationshipScore: number;
  isSubscription: boolean;
  createdAt: number;
  updatedAt: number;
}

// Subscription Types
export interface Subscription {
  id: number;
  userId: number;
  senderEmail: string;
  senderName: string | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'irregular';
  category: string | null;
  unsubscribeUrl: string | null;
  unsubscribeMethod: 'link' | 'header' | 'reply' | 'unknown';
  isActive: boolean;
  confidence: number;
  emailCount: number;
  firstEmailDate: number;
  lastEmailDate: number;
  createdAt: number;
  updatedAt: number;
}

// Analytics Types
export interface EmailAnalytics {
  totalEmails: number;
  sentEmails: number;
  receivedEmails: number;
  uniqueContacts: number;
  avgResponseTime: number | null;
  topSenders: Array<{
    email: string;
    name: string | null;
    count: number;
  }>;
  emailsByDay: Array<{
    date: string;
    sent: number;
    received: number;
  }>;
  contactActivity: Array<{
    email: string;
    name: string | null;
    score: number;
    lastEmail: number;
  }>;
}

export interface VolumeMetrics {
  period: 'day' | 'week' | 'month' | 'year';
  sent: number;
  received: number;
  date: string;
}

// Authentication Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface JWTPayload {
  userId: number;
  email: string;
  iat: number;
  exp: number;
}

// Gmail API Types
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  historyId?: string;
  internalDate?: string;
  payload?: {
    headers: Array<{ name: string; value: string }>;
    body: {
      size: number;
      data?: string;
    };
    parts?: Array<{
      mimeType: string;
      body: {
        size: number;
        data?: string;
      };
    }>;
  };
  sizeEstimate?: number;
}

// Environment Configuration Types
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
  FRONTEND_URL: string;
  PUBSUB_TOPIC?: string;
}

// Utility Types
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type NonEmptyArray<T> = [T, ...T[]];

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> & 
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];