# Gmail Integration Guide

## Overview
This guide covers the complete Gmail API integration, from OAuth2 setup to advanced features like push notifications.

## Google Cloud Console Setup

### 1. Create Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project named "Email Insight"
3. Enable Gmail API:
   ```bash
   gcloud services enable gmail.googleapis.com
   ```

### 2. Configure OAuth2 Consent Screen
1. Navigate to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type (or "Internal" if within Google Workspace)
3. Fill application information:
   - App name: Email Insight
   - Support email: your-email@example.com
   - Developer contact: your-email@example.com
   - Application domain: http://localhost:3000 (dev) / https://yourdomain.com (prod)
   - Privacy policy URL: Required for production
   - Terms of service URL: Required for production
   
4. Add required scopes (minimal permission principle):
   - `https://www.googleapis.com/auth/gmail.readonly` - Read emails
   - `https://www.googleapis.com/auth/gmail.modify` - Modify emails (for marking as read)
   - `https://www.googleapis.com/auth/gmail.settings.basic` - Create filters
   - `https://www.googleapis.com/auth/userinfo.email` - User email
   - `https://www.googleapis.com/auth/userinfo.profile` - User profile info

5. Add test users (for unverified apps during development)

### 3. Create OAuth2 Credentials
1. Go to "Credentials" > "Create Credentials" > "OAuth client ID"
2. Application type: Web application
3. Authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (development)
   - `https://yourdomain.com/auth/callback` (production)
4. Save Client ID and Client Secret

## OAuth2 Implementation

### Authorization Flow
```typescript
import { google } from 'googleapis';

class GmailAuth {
  private oauth2Client;
  
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }
  
  // Generate auth URL
  getAuthUrl(state?: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',  // Get refresh token
      prompt: 'consent',        // Force consent to get refresh token
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.settings.basic',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
      state: state  // CSRF protection
    });
  }
  
  // Exchange code for tokens
  async getTokens(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }
  
  // Refresh access token
  async refreshAccessToken(refreshToken: string) {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken
    });
    
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    return credentials;
  }
}
```

### Token Storage
```typescript
interface TokenStorage {
  access_token: string
  refresh_token: string
  expiry_date: number
  scope: string
  token_type: string
}

// Encrypt tokens before storing
import crypto from 'crypto';

function encryptToken(token: string): string {
  const cipher = crypto.createCipher('aes-256-gcm', process.env.ENCRYPTION_KEY);
  return cipher.update(token, 'utf8', 'hex') + cipher.final('hex');
}

function decryptToken(encrypted: string): string {
  const decipher = crypto.createDecipher('aes-256-gcm', process.env.ENCRYPTION_KEY);
  return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
}
```

## Gmail API Client

### Initialize Client
```typescript
import { google, gmail_v1 } from 'googleapis';

class GmailClient {
  private gmail: gmail_v1.Gmail;
  private userId = 'me';  // Special value for authenticated user
  
  constructor(accessToken: string) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    
    this.gmail = google.gmail({
      version: 'v1',
      auth: oauth2Client
    });
  }
  
  // Get user profile
  async getProfile() {
    const response = await this.gmail.users.getProfile({
      userId: this.userId
    });
    
    return {
      email: response.data.emailAddress,
      totalMessages: response.data.messagesTotal,
      totalThreads: response.data.threadsTotal,
      historyId: response.data.historyId
    };
  }
}
```

### Fetching Messages

#### List Messages with Filters
```typescript
async function listMessages(query?: string, pageToken?: string) {
  const response = await this.gmail.users.messages.list({
    userId: 'me',
    q: query,  // Gmail search syntax
    maxResults: 100,
    pageToken: pageToken,
    includeSpamTrash: false
  });
  
  return {
    messages: response.data.messages || [],
    nextPageToken: response.data.nextPageToken,
    resultSizeEstimate: response.data.resultSizeEstimate
  };
}

// Example queries:
// "after:2024/1/1" - Messages after date
// "from:newsletter@example.com" - From specific sender
// "label:UNREAD" - Unread messages
// "has:attachment" - Messages with attachments
// "category:promotions" - Promotional emails
```

#### Get Full Message
```typescript
async function getMessage(messageId: string) {
  const response = await this.gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full'  // Get complete message
  });
  
  return parseMessage(response.data);
}

function parseMessage(message: gmail_v1.Schema$Message) {
  const headers = parseHeaders(message.payload.headers);
  const body = extractBody(message.payload);
  
  return {
    id: message.id,
    threadId: message.threadId,
    labelIds: message.labelIds,
    snippet: message.snippet,
    historyId: message.historyId,
    internalDate: message.internalDate,
    sizeEstimate: message.sizeEstimate,
    headers: {
      from: headers['from'],
      to: headers['to'],
      subject: headers['subject'],
      date: headers['date'],
      messageId: headers['message-id'],
      listUnsubscribe: headers['list-unsubscribe'],
      listUnsubscribePost: headers['list-unsubscribe-post']
    },
    body: {
      text: body.text,
      html: body.html
    },
    attachments: extractAttachments(message.payload)
  };
}
```

#### Batch Operations
```typescript
async function batchGetMessages(messageIds: string[]) {
  const batch = gapi.client.newBatch();
  
  messageIds.forEach(id => {
    batch.add(
      this.gmail.users.messages.get({
        userId: 'me',
        id: id,
        format: 'full'
      })
    );
  });
  
  const responses = await batch.execute();
  return responses.map(r => parseMessage(r.result));
}
```

### Incremental Sync

#### Using History API
```typescript
async function syncMessages(historyId: string) {
  let pageToken;
  const changes = [];
  
  do {
    const response = await this.gmail.users.history.list({
      userId: 'me',
      startHistoryId: historyId,
      historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved'],
      pageToken: pageToken
    });
    
    if (response.data.history) {
      changes.push(...response.data.history);
    }
    
    pageToken = response.data.nextPageToken;
  } while (pageToken);
  
  return processHistoryChanges(changes);
}

function processHistoryChanges(history: gmail_v1.Schema$History[]) {
  const changes = {
    added: [],
    deleted: [],
    modified: []
  };
  
  history.forEach(record => {
    if (record.messagesAdded) {
      changes.added.push(...record.messagesAdded);
    }
    if (record.messagesDeleted) {
      changes.deleted.push(...record.messagesDeleted);
    }
    if (record.labelsAdded || record.labelsRemoved) {
      changes.modified.push(...(record.labelsAdded || []));
      changes.modified.push(...(record.labelsRemoved || []));
    }
  });
  
  return changes;
}
```

### Managing Filters

#### Create Filter
```typescript
async function createFilter(criteria: FilterCriteria, action: FilterAction) {
  const response = await this.gmail.users.settings.filters.create({
    userId: 'me',
    requestBody: {
      criteria: {
        from: criteria.from,
        to: criteria.to,
        subject: criteria.subject,
        hasAttachment: criteria.hasAttachment,
        negatedQuery: criteria.negatedQuery
      },
      action: {
        addLabelIds: action.addLabelIds,
        removeLabelIds: action.removeLabelIds,
        forward: action.forward
      }
    }
  });
  
  return response.data.id;
}

// Example: Auto-delete emails from specific sender
await createFilter(
  { from: 'spam@example.com' },
  { removeLabelIds: ['INBOX'], addLabelIds: ['TRASH'] }
);
```

### Push Notifications (Real-time Updates)

#### Setup Cloud Pub/Sub
```typescript
async function watchMailbox() {
  const response = await this.gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName: 'projects/email-insight/topics/gmail-updates',
      labelIds: ['INBOX'],
      labelFilterAction: 'include'
    }
  });
  
  return {
    historyId: response.data.historyId,
    expiration: response.data.expiration  // Renew before this
  };
}

// Webhook handler
app.post('/webhooks/gmail', (req, res) => {
  const message = JSON.parse(
    Buffer.from(req.body.message.data, 'base64').toString()
  );
  
  // message = { emailAddress, historyId }
  processNewEmails(message.historyId);
  
  res.status(200).send();
});
```

## Rate Limiting & Quotas

### Gmail API Quotas
- **Per-user limit**: 250 quota units/user/second
- **Daily quota**: 1,000,000,000 quota units/day

### Quota Costs
```typescript
const QUOTA_COSTS = {
  'messages.list': 5,
  'messages.get': 5,
  'messages.send': 100,
  'messages.modify': 5,
  'threads.list': 5,
  'threads.get': 10,
  'history.list': 2,
  'watch': 100
};
```

### Rate Limit Handler
```typescript
class RateLimiter {
  private queue = [];
  private processing = false;
  private quotaUsed = 0;
  private resetTime = Date.now();
  
  async execute(fn: Function, cost: number) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, cost, resolve, reject });
      this.processQueue();
    });
  }
  
  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    
    while (this.queue.length > 0) {
      // Reset quota counter every second
      if (Date.now() - this.resetTime > 1000) {
        this.quotaUsed = 0;
        this.resetTime = Date.now();
      }
      
      const item = this.queue[0];
      
      // Check if we have quota
      if (this.quotaUsed + item.cost > 250) {
        // Wait for quota reset
        await sleep(this.resetTime + 1000 - Date.now());
        continue;
      }
      
      this.queue.shift();
      this.quotaUsed += item.cost;
      
      try {
        const result = await item.fn();
        item.resolve(result);
      } catch (error) {
        if (error.code === 429) {
          // Rate limited, retry with backoff
          this.queue.unshift(item);
          await sleep(Math.pow(2, attempt) * 1000);
        } else {
          item.reject(error);
        }
      }
    }
    
    this.processing = false;
  }
}
```

## Error Handling

### Common Errors
```typescript
enum GmailErrorCode {
  INVALID_CREDENTIALS = 401,
  INSUFFICIENT_PERMISSION = 403,
  NOT_FOUND = 404,
  RATE_LIMIT_EXCEEDED = 429,
  BACKEND_ERROR = 500,
  SERVICE_UNAVAILABLE = 503
}

async function handleGmailError(error: any) {
  switch (error.code) {
    case 401:
      // Refresh token
      const newToken = await refreshAccessToken();
      return retry(originalRequest, newToken);
      
    case 403:
      // Check required scopes
      throw new Error('Missing required Gmail permissions');
      
    case 429:
      // Exponential backoff
      await sleep(Math.pow(2, retryCount) * 1000);
      return retry(originalRequest);
      
    case 503:
      // Service temporarily unavailable
      await sleep(5000);
      return retry(originalRequest);
      
    default:
      throw error;
  }
}
```

## Security Best Practices

### 1. Token Security
- Encrypt tokens at rest
- Use secure session storage
- Implement token rotation
- Short access token lifetime (1 hour)

### 2. Scope Minimization
- Request only necessary scopes
- Use read-only scopes when possible
- Separate scopes for different features

### 3. Data Protection
- Don't log sensitive email content
- Implement data retention policies
- Allow users to revoke access
- Regular security audits

### 4. Rate Limit Protection
- Implement circuit breakers
- Use exponential backoff
- Cache frequently accessed data
- Batch operations when possible

## Testing

### Mock Gmail API
```typescript
class MockGmailClient {
  async listMessages() {
    return {
      messages: [
        { id: 'msg1', threadId: 'thread1' },
        { id: 'msg2', threadId: 'thread1' }
      ],
      nextPageToken: null
    };
  }
  
  async getMessage(id: string) {
    return mockMessages[id];
  }
}

// Use in tests
const gmail = process.env.NODE_ENV === 'test' 
  ? new MockGmailClient()
  : new GmailClient(token);
```

### Integration Tests
```typescript
describe('Gmail Integration', () => {
  it('should fetch user profile', async () => {
    const profile = await gmail.getProfile();
    expect(profile.email).toBeDefined();
  });
  
  it('should list messages', async () => {
    const messages = await gmail.listMessages('label:INBOX');
    expect(messages.messages).toBeInstanceOf(Array);
  });
  
  it('should handle rate limiting', async () => {
    const promises = Array(100).fill(null).map(() => 
      gmail.getMessage('test-id')
    );
    
    await expect(Promise.all(promises)).resolves.toBeDefined();
  });
});
```