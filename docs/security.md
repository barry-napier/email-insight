# Security Guidelines

## Overview
Security is paramount when handling email data. This document outlines security best practices, threat models, and implementation guidelines for Email Insight.

## Threat Model

### Primary Threats
1. **Unauthorized Access** - Attackers gaining access to user email data
2. **Token Theft** - OAuth tokens being compromised
3. **Data Leakage** - Sensitive information exposed through logs or errors
4. **Injection Attacks** - SQL injection, XSS, command injection
5. **Man-in-the-Middle** - Interception of data in transit
6. **Account Takeover** - Compromised user accounts
7. **Data Retention** - Improper handling of deleted data

### Trust Boundaries
- User Browser ↔ Frontend Server
- Frontend Server ↔ API Server
- API Server ↔ Gmail API
- API Server ↔ Database
- Application ↔ Third-party Services

## Authentication & Authorization

### OAuth2 Security

#### Token Storage
```typescript
// NEVER store tokens in plain text
// Use encryption at rest with modern crypto
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

class TokenEncryption {
  private algorithm = 'aes-256-gcm';
  private key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  
  encrypt(token: string): EncryptedToken {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  decrypt(data: EncryptedToken): string {
    const decipher = createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(data.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
    
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

#### Token Rotation
```typescript
// Implement automatic token refresh
class TokenManager {
  async getValidToken(userId: number): Promise<string> {
    const user = await db.getUser(userId);
    const tokenData = this.decryptToken(user.encryptedToken);
    
    // Check if token expires soon (within 5 minutes)
    if (tokenData.expiryDate - Date.now() < 5 * 60 * 1000) {
      const newToken = await this.refreshToken(tokenData.refreshToken);
      await this.saveToken(userId, newToken);
      return newToken.accessToken;
    }
    
    return tokenData.accessToken;
  }
  
  private async refreshToken(refreshToken: string) {
    // Refresh with Google OAuth2
    const response = await oauth2Client.refreshAccessToken(refreshToken);
    return response.credentials;
  }
}
```

### JWT Security

#### Secure JWT Implementation
```typescript
import jwt from 'jsonwebtoken';

class JWTManager {
  private secret = process.env.JWT_SECRET;
  private issuer = 'email-insight';
  private audience = 'email-insight-users';
  
  generateToken(userId: number, email: string): string {
    return jwt.sign(
      {
        userId,
        email,
        type: 'access'
      },
      this.secret,
      {
        expiresIn: '1h',
        issuer: this.issuer,
        audience: this.audience,
        algorithm: 'HS256'
      }
    );
  }
  
  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.secret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['HS256']
      });
    } catch (error) {
      throw new UnauthorizedError('Invalid token');
    }
  }
}
```

#### Session Management
```typescript
// Use secure, httpOnly cookies for session tokens
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only
    httpOnly: true, // No JS access
    sameSite: 'strict', // CSRF protection
    maxAge: 60 * 60 * 1000 // 1 hour
  }
}));
```

## Data Protection

### Encryption at Rest

#### Database Encryption
```typescript
// Use SQLCipher for encrypted SQLite
import Database from 'better-sqlite3';

const db = new Database('email-insight.db');
db.pragma(`key = '${process.env.DB_ENCRYPTION_KEY}'`);
db.pragma('cipher_compatibility = 4');
```

#### Sensitive Field Encryption
```typescript
// Encrypt sensitive fields before storing
class DataEncryption {
  encryptEmailBody(body: string): string {
    return this.encrypt(body);
  }
  
  decryptEmailBody(encrypted: string): string {
    return this.decrypt(encrypted);
  }
  
  // Hash emails for lookups without storing plaintext
  hashEmail(email: string): string {
    return createHash('sha256')
      .update(email.toLowerCase())
      .digest('hex');
  }
}
```

### Data Minimization

```typescript
// Only store necessary data
interface EmailStoragePolicy {
  // Don't store
  excludeFields: ['password', 'creditCard', 'ssn'];
  
  // Redact sensitive patterns
  redactPatterns: [
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    /\b\d{16}\b/g,            // Credit card
  ];
  
  // Auto-delete after period
  retentionDays: 90;
}

function sanitizeEmailContent(content: string): string {
  let sanitized = content;
  
  for (const pattern of redactPatterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  
  return sanitized;
}
```

## Input Validation & Sanitization

### API Input Validation
```typescript
import { z } from 'zod';

// Define strict schemas for all inputs
const emailSearchSchema = z.object({
  query: z.string().max(500),
  limit: z.number().min(1).max(100),
  offset: z.number().min(0)
});

app.post('/api/search', async (c) => {
  try {
    const input = emailSearchSchema.parse(await c.req.json());
    // Process validated input
  } catch (error) {
    return c.json({ error: 'Invalid input' }, 400);
  }
});
```

### SQL Injection Prevention
```typescript
// ALWAYS use parameterized queries
// NEVER concatenate user input into queries

// BAD - Vulnerable to SQL injection
const query = `SELECT * FROM emails WHERE subject LIKE '%${userInput}%'`;

// GOOD - Safe parameterized query
const stmt = db.prepare('SELECT * FROM emails WHERE subject LIKE ?');
const results = stmt.all(`%${userInput}%`);

// Using query builder (Drizzle)
const results = await db
  .select()
  .from(emails)
  .where(like(emails.subject, `%${userInput}%`));
```

### XSS Prevention
```typescript
// Sanitize all user-generated content
import DOMPurify from 'isomorphic-dompurify';

function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href']
  });
}

// React automatically escapes values
// But be careful with dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: sanitizeHTML(userContent) }} />
```

## Network Security

### HTTPS Enforcement
```typescript
// Force HTTPS in production
app.use((c, next) => {
  if (process.env.NODE_ENV === 'production' && !c.req.header('x-forwarded-proto')?.includes('https')) {
    return c.redirect(`https://${c.req.header('host')}${c.req.url}`, 301);
  }
  return next();
});
```

### Security Headers
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://www.googleapis.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### CORS Configuration
```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## Rate Limiting & DDoS Protection

### API Rate Limiting
```typescript
import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMemory({
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
  blockDuration: 60 * 5, // Block for 5 minutes
});

app.use(async (c, next) => {
  try {
    await rateLimiter.consume(c.get('userId') || c.ip);
    return next();
  } catch (error) {
    return c.json({ error: 'Too many requests' }, 429);
  }
});
```

### Request Size Limiting
```typescript
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ limit: '1mb', extended: true }));
```

## Logging & Monitoring

### Secure Logging
```typescript
import winston from 'winston';

// Never log sensitive data
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(info => {
      // Redact sensitive fields
      if (info.meta) {
        delete info.meta.password;
        delete info.meta.token;
        delete info.meta.refreshToken;
      }
      return JSON.stringify(info);
    })
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Security Event Monitoring
```typescript
// Log security events
enum SecurityEvent {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY'
}

function logSecurityEvent(event: SecurityEvent, userId?: number, details?: any) {
  logger.warn({
    type: 'SECURITY_EVENT',
    event,
    userId,
    timestamp: new Date().toISOString(),
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    details: sanitizeLogData(details)
  });
}
```

## Vulnerability Management

### Dependency Security
```json
{
  "scripts": {
    "security:check": "npm audit",
    "security:fix": "npm audit fix",
    "security:update": "npm-check-updates -u",
    "security:snyk": "snyk test"
  }
}
```

### Security Testing
```typescript
// Security test examples
describe('Security Tests', () => {
  test('should prevent SQL injection', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    const response = await api.search(maliciousInput);
    expect(response.status).toBe(200);
    
    // Verify table still exists
    const tableExists = await db.tableExists('users');
    expect(tableExists).toBe(true);
  });
  
  test('should prevent XSS', async () => {
    const xssPayload = '<script>alert("XSS")</script>';
    const sanitized = sanitizeHTML(xssPayload);
    expect(sanitized).not.toContain('<script>');
  });
  
  test('should enforce rate limiting', async () => {
    const requests = Array(150).fill(null).map(() => 
      api.get('/api/emails')
    );
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

## Incident Response

### Security Incident Checklist
1. **Detection**
   - Monitor security logs
   - Set up alerts for suspicious activity
   - Regular security audits

2. **Containment**
   - Revoke compromised tokens
   - Block suspicious IP addresses
   - Disable affected user accounts

3. **Investigation**
   - Review logs for breach timeline
   - Identify affected data
   - Determine attack vector

4. **Recovery**
   - Patch vulnerabilities
   - Reset all user tokens
   - Force password changes
   - Restore from clean backups

5. **Post-Incident**
   - Document incident
   - Update security measures
   - Notify affected users (if required)
   - Conduct security review

### Emergency Contacts
```typescript
// Security contacts configuration
const SECURITY_CONTACTS = {
  email: 'security@email-insight.com',
  oncall: process.env.SECURITY_ONCALL_PHONE,
  escalation: ['cto@company.com', 'security-team@company.com']
};
```

## Compliance

### GDPR Compliance
- User consent for data processing
- Right to access data
- Right to delete data
- Data portability
- Privacy by design

### Implementation
```typescript
// GDPR compliance endpoints
app.get('/api/user/data', authenticate, async (c) => {
  // Return all user data
  const userData = await exportUserData(c.get('userId'));
  return c.json(userData);
});

app.delete('/api/user/data', authenticate, async (c) => {
  // Delete all user data
  await deleteUserData(c.get('userId'));
  return c.json({ success: true });
});
```

## Security Checklist

### Development
- [ ] Use environment variables for secrets
- [ ] Enable TypeScript strict mode
- [ ] Implement input validation
- [ ] Use parameterized database queries
- [ ] Sanitize user-generated content
- [ ] Implement rate limiting
- [ ] Add security headers
- [ ] Enable CORS properly

### Deployment
- [ ] Use HTTPS everywhere
- [ ] Encrypt database
- [ ] Secure cookie settings
- [ ] Disable debug mode
- [ ] Remove development endpoints
- [ ] Set up monitoring
- [ ] Configure firewall rules
- [ ] Regular security updates

### Ongoing
- [ ] Regular dependency updates
- [ ] Security audits
- [ ] Penetration testing
- [ ] Code reviews
- [ ] Security training
- [ ] Incident response drills