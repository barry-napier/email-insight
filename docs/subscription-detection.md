# Subscription Detection Algorithm

## Overview
The subscription detection system identifies recurring emails from newsletters, marketing campaigns, and automated notifications using multiple signals and scoring mechanisms.

## Detection Signals

### 1. Header Analysis (Highest Confidence)

#### List-Unsubscribe Header
RFC 2369 standard header used by legitimate bulk senders
```
List-Unsubscribe: <https://example.com/unsubscribe?id=123>, <mailto:unsubscribe@example.com>
```
**Weight**: 0.9 (very strong signal)

#### List-Unsubscribe-Post Header
RFC 8058 one-click unsubscribe
```
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```
**Weight**: 0.95 (strongest signal)

#### Other Headers
```
Precedence: bulk|list|junk
X-Campaign-ID: *
X-Mailer: MailChimp, SendGrid, Mailgun, etc.
Auto-Submitted: auto-generated|auto-replied
```
**Weight**: 0.7-0.8

### 2. Sender Pattern Analysis

#### Domain Frequency
```typescript
interface SenderPattern {
  domain: string
  totalEmails: number
  uniqueSubjects: number
  avgInterval: number  // days between emails
  regularityScore: number  // 0-1, how regular the pattern
}
```

Thresholds:
- **Newsletter**: >4 emails/month, regular interval
- **Marketing**: >2 emails/month, irregular pattern
- **Notification**: Any frequency, automated pattern

#### Sender Email Patterns
Common patterns that indicate bulk sending:
- `noreply@`, `no-reply@`, `donotreply@`
- `newsletter@`, `updates@`, `news@`
- `marketing@`, `promotions@`, `deals@`
- `notifications@`, `alerts@`, `system@`

**Weight**: 0.6

### 3. Content Analysis

#### Subject Line Patterns
```typescript
const subscriptionPatterns = [
  /newsletter/i,
  /weekly.*digest/i,
  /monthly.*update/i,
  /\d+%.*off/i,  // "50% off"
  /deal.*of.*the/i,  // "deal of the day"
  /new.*from/i,  // "new from brand"
  /issue.*#\d+/i,  // "issue #123"
];
```

#### Body Content Signals
- Presence of unsubscribe links
- Marketing language detection
- Template-based layout (high HTML/text ratio)
- Tracking pixels presence
- Multiple CTAs (Call-to-Action buttons)

**Weight**: 0.4-0.5

### 4. Gmail-Specific Signals

#### Categories
Gmail automatically categorizes emails:
- `PROMOTIONS` - Marketing emails
- `UPDATES` - Notifications and updates
- `FORUMS` - Mailing lists
- `SOCIAL` - Social network updates

**Weight**: 0.7

#### Bulk Sender Annotations
Gmail marks bulk senders with special indicators we can detect

### 5. Frequency Analysis

```typescript
interface FrequencyPattern {
  calculateFrequency(emails: Email[]): {
    type: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'irregular'
    confidence: number
    avgInterval: number
    stdDeviation: number
  }
}
```

Regular patterns indicate subscriptions:
- Daily: σ < 2 hours
- Weekly: σ < 1 day
- Monthly: σ < 3 days

## Scoring Algorithm

### Confidence Score Calculation

```typescript
function calculateSubscriptionScore(signals: Signals): number {
  let score = 0;
  let weight = 0;
  
  // Header signals (strongest)
  if (signals.hasListUnsubscribe) {
    score += 0.9;
    weight += 1;
  }
  
  if (signals.hasListUnsubscribePost) {
    score += 0.95;
    weight += 1;
  }
  
  // Sender patterns
  if (signals.isNoReplyAddress) {
    score += 0.6;
    weight += 1;
  }
  
  if (signals.senderFrequency > 4) {
    score += 0.5 + Math.min(signals.senderFrequency / 20, 0.3);
    weight += 1;
  }
  
  // Content patterns
  if (signals.hasUnsubscribeLink) {
    score += 0.7;
    weight += 1;
  }
  
  if (signals.subjectMatchesPattern) {
    score += 0.4;
    weight += 1;
  }
  
  // Gmail signals
  if (signals.gmailCategory === 'PROMOTIONS') {
    score += 0.7;
    weight += 1;
  }
  
  // Normalize score
  return weight > 0 ? score / weight : 0;
}
```

### Classification Thresholds

```typescript
enum SubscriptionConfidence {
  CERTAIN = 0.8,      // Definitely a subscription
  LIKELY = 0.6,       // Probably a subscription
  POSSIBLE = 0.4,     // Maybe a subscription
  UNLIKELY = 0.2      // Probably not a subscription
}
```

## Detection Pipeline

### 1. Initial Scan
```typescript
async function detectSubscriptions(userId: number) {
  // Group emails by sender
  const senders = await groupEmailsBySender(userId);
  
  for (const sender of senders) {
    // Skip if too few emails
    if (sender.emailCount < 2) continue;
    
    // Analyze sender patterns
    const patterns = analyzeSenderPatterns(sender);
    
    // Check headers of recent emails
    const headers = await analyzeHeaders(sender.emails);
    
    // Analyze content
    const content = await analyzeContent(sender.emails);
    
    // Calculate score
    const score = calculateSubscriptionScore({
      ...patterns,
      ...headers,
      ...content
    });
    
    // Store if confidence is high enough
    if (score >= SubscriptionConfidence.POSSIBLE) {
      await saveSubscription(sender, score);
    }
  }
}
```

### 2. Incremental Updates
```typescript
async function updateSubscriptionOnNewEmail(email: Email) {
  const subscription = await findSubscription(email.from);
  
  if (subscription) {
    // Update frequency analysis
    subscription.emailCount++;
    subscription.lastSeen = email.date;
    
    // Recalculate frequency pattern
    const pattern = calculateFrequencyPattern(subscription);
    subscription.frequency = pattern.type;
    
    // Update confidence if new signals
    if (hasNewSignals(email)) {
      subscription.confidenceScore = recalculateScore(subscription, email);
    }
    
    await updateSubscription(subscription);
  } else {
    // Check if this might be a new subscription
    const signals = await analyzeEmail(email);
    if (signals.score >= SubscriptionConfidence.POSSIBLE) {
      await createSubscription(email, signals);
    }
  }
}
```

## Unsubscribe Method Detection

### Priority Order
1. **One-Click Unsubscribe** (RFC 8058)
   ```
   List-Unsubscribe: <https://example.com/unsubscribe>
   List-Unsubscribe-Post: List-Unsubscribe=One-Click
   ```

2. **HTTPS Link from Header**
   ```
   List-Unsubscribe: <https://example.com/unsubscribe?id=123>
   ```

3. **Mailto from Header**
   ```
   List-Unsubscribe: <mailto:unsubscribe@example.com?subject=unsubscribe>
   ```

4. **Body Link Extraction**
   ```typescript
   const unsubscribePatterns = [
     /https?:\/\/[^\s]*unsubscribe[^\s]*/gi,
     /https?:\/\/[^\s]*opt-out[^\s]*/gi,
     /https?:\/\/[^\s]*preferences[^\s]*/gi,
     /https?:\/\/[^\s]*remove[^\s]*/gi
   ];
   ```

5. **Gmail Filter** (Fallback)
   - Create filter to auto-archive/delete

### Unsubscribe Execution

```typescript
async function executeUnsubscribe(subscription: Subscription) {
  const method = subscription.unsubscribeMethod;
  
  switch (method.type) {
    case 'one-click':
      // POST request with form data
      return await fetch(method.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'List-Unsubscribe=One-Click'
      });
      
    case 'https':
      // GET request to unsubscribe URL
      return await fetch(method.url, {
        method: 'GET',
        headers: { 'User-Agent': 'EmailInsight/1.0' }
      });
      
    case 'mailto':
      // Send email via Gmail API
      return await sendUnsubscribeEmail(method.email, method.subject);
      
    case 'filter':
      // Create Gmail filter
      return await createGmailFilter({
        from: subscription.senderEmail,
        action: { delete: true }
      });
  }
}
```

## False Positive Prevention

### Exclusion Rules
Never mark as subscription if:
1. Email is in SENT folder
2. Previous two-way conversation exists
3. Email contains personal indicators:
   - Uses your first name in greeting
   - References specific prior conversation
   - Has unique, non-templated content
4. From domain in whitelist (e.g., internal company domain)

### Manual Corrections
```typescript
interface UserFeedback {
  markAsNotSubscription(email: Email): void
  markAsSubscription(email: Email): void
  neverMarkDomainAsSubscription(domain: string): void
}
```

## Performance Optimization

### Batch Processing
- Process emails in batches of 100
- Use database transactions for bulk inserts
- Cache sender patterns for 24 hours

### Incremental Analysis
- Only analyze new emails since last sync
- Update existing subscriptions incrementally
- Recompute scores only when signals change

### Database Indexes
```sql
CREATE INDEX idx_emails_from_date ON emails(from_email, date DESC);
CREATE INDEX idx_emails_headers ON emails(json_extract(headers, '$.List-Unsubscribe'));
CREATE INDEX idx_subscriptions_confidence ON subscriptions(confidence_score DESC);
```

## Testing Strategy

### Test Cases
1. **Newsletter Detection**
   - Input: Regular weekly newsletter with List-Unsubscribe
   - Expected: High confidence (>0.8)

2. **Marketing Email**
   - Input: Promotional email with unsubscribe link in body
   - Expected: Medium confidence (0.6-0.8)

3. **Personal Email**
   - Input: Email from friend with regular pattern
   - Expected: Not detected (<0.2)

4. **Transactional Email**
   - Input: Order confirmation, shipping notification
   - Expected: Low confidence or excluded

### Metrics to Track
- Detection accuracy (precision/recall)
- False positive rate
- Unsubscribe success rate
- Processing time per email
- User feedback incorporation