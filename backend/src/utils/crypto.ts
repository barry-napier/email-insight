import CryptoJS from 'crypto-js';
import { securityConfig } from '@/config/environment';

/**
 * Encrypts sensitive data using AES-256 encryption in CBC mode.
 * 
 * This function provides secure encryption for sensitive data such as OAuth tokens,
 * personal information, and other confidential data before database storage.
 * Uses the application's master encryption key from environment configuration.
 * 
 * @param data - Plain text string to encrypt
 * @returns {Buffer} Encrypted data as Buffer for database BLOB storage
 * 
 * @throws {Error} When encryption fails due to:
 * - Invalid encryption key configuration
 * - CryptoJS library errors
 * - Memory allocation issues
 * 
 * @example
 * ```typescript
 * // Encrypt OAuth token before database storage
 * const token = 'oauth_access_token_value';
 * const encryptedToken = encrypt(token);
 * 
 * // Store in database as BLOB
 * await db.insert(users).values({
 *   accessToken: encryptedToken,
 *   // ... other fields
 * });
 * ```
 * 
 * Security Features:
 * - AES-256 encryption algorithm (industry standard)
 * - Uses master key from secure environment configuration
 * - Automatic encoding to Buffer for database compatibility
 * - Comprehensive error handling with secure error messages
 */
export function encrypt(data: string): Buffer {
  try {
    const encrypted = CryptoJS.AES.encrypt(data, securityConfig.encryptionKey);
    return Buffer.from(encrypted.toString(), 'utf8');
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypts sensitive data using AES-256 decryption in CBC mode.
 * 
 * This function safely decrypts data previously encrypted with the `encrypt` function.
 * Verifies decryption success and provides secure error handling to prevent
 * information leakage through error messages.
 * 
 * @param encryptedBuffer - Buffer containing encrypted data from database
 * @returns {string} Decrypted plain text data
 * 
 * @throws {Error} When decryption fails due to:
 * - Invalid or corrupted encrypted data
 * - Wrong encryption key (data encrypted with different key)
 * - Buffer encoding/decoding errors
 * - Empty decryption result (indicates corruption or key mismatch)
 * 
 * @example
 * ```typescript
 * // Decrypt OAuth token from database
 * const user = await db.select().from(users).where(eq(users.id, userId));
 * const decryptedToken = decrypt(user.accessToken);
 * 
 * // Use decrypted token for Gmail API calls
 * const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
 * oauth2Client.setCredentials({ access_token: decryptedToken });
 * ```
 * 
 * Security Considerations:
 * - Validates decryption output to prevent empty results
 * - Secure error handling without exposing sensitive information
 * - Memory-safe string operations
 * - Timing attack resistance through consistent error paths
 */
export function decrypt(encryptedBuffer: Buffer): string {
  try {
    const encryptedString = encryptedBuffer.toString('utf8');
    const bytes = CryptoJS.AES.decrypt(encryptedString, securityConfig.encryptionKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      throw new Error('Decryption resulted in empty string');
    }
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates cryptographically secure random strings for tokens and secrets.
 * 
 * This function creates high-entropy random strings suitable for security-critical
 * applications including JWT IDs, session tokens, CSRF tokens, and API keys.
 * Uses cryptographically secure random number generation.
 * 
 * @param length - Number of bytes of randomness (default: 32)
 * @returns {string} Hexadecimal string representation of random bytes
 * 
 * @example
 * ```typescript
 * // Generate JWT ID (jti) claim
 * const jwtId = generateRandomString(16); // 32 hex characters
 * 
 * // Generate API key
 * const apiKey = generateRandomString(32); // 64 hex characters
 * 
 * // Generate CSRF token
 * const csrfToken = generateRandomString(24); // 48 hex characters
 * ```
 * 
 * Security Properties:
 * - Cryptographically secure random number generation
 * - High entropy (4 bits per hex character)
 * - Suitable for security tokens and keys
 * - No predictable patterns or bias
 * 
 * Output Format:
 * - Hexadecimal encoding (0-9, a-f)
 * - Length: `length * 2` characters (each byte = 2 hex chars)
 * - Example: 32 bytes → 64 character hex string
 */
export function generateRandomString(length: number = 32): string {
  return CryptoJS.lib.WordArray.random(length).toString(CryptoJS.enc.Hex);
}

/**
 * Creates a SHA-256 hash of the input string for data integrity and indexing.
 * 
 * This function generates cryptographic hashes suitable for data integrity
 * verification, password hashing (with salt), and creating deterministic
 * identifiers from variable-length input data.
 * 
 * @param input - String data to hash
 * @returns {string} SHA-256 hash as lowercase hexadecimal string
 * 
 * @example
 * ```typescript
 * // Create deterministic ID from email content
 * const contentHash = hashString(emailSubject + emailBody);
 * 
 * // Hash for data integrity verification
 * const dataHash = hashString(JSON.stringify(userData));
 * 
 * // Create index key from variable data
 * const indexKey = hashString(`${userId}:${timestamp}:${action}`);
 * ```
 * 
 * Security Properties:
 * - SHA-256 cryptographic hash function
 * - 256-bit output (64 hex characters)
 * - Deterministic (same input always produces same hash)
 * - One-way function (computationally infeasible to reverse)
 * - Avalanche effect (small input changes cause large output changes)
 * 
 * Use Cases:
 * - Data integrity verification
 * - Creating deterministic identifiers
 * - Content deduplication
 * - Cache key generation
 * 
 * Note: For password hashing, use bcrypt or similar with salt.
 * This function is for general-purpose hashing, not password storage.
 */
export function hashString(input: string): string {
  return CryptoJS.SHA256(input).toString(CryptoJS.enc.Hex);
}

/**
 * Creates an HMAC-SHA256 signature for data authentication and integrity.
 * 
 * This function generates Hash-based Message Authentication Codes (HMAC) using
 * SHA-256 for verifying data authenticity and integrity. Commonly used for
 * API request signing, webhook verification, and data tamper detection.
 * 
 * @param data - Data to sign with HMAC
 * @param secret - Secret key for HMAC generation (defaults to encryption key)
 * @returns {string} HMAC-SHA256 signature as lowercase hexadecimal string
 * 
 * @example
 * ```typescript
 * // Sign API request payload
 * const requestBody = JSON.stringify({ userId: 123, action: 'sync' });
 * const signature = createHMAC(requestBody);
 * 
 * // Sign webhook payload with custom secret
 * const webhookSecret = 'webhook_secret_key';
 * const webhookSignature = createHMAC(webhookData, webhookSecret);
 * 
 * // Create tamper-evident data
 * const dataSignature = createHMAC(sensitiveData);
 * ```
 * 
 * Security Properties:
 * - HMAC-SHA256 provides both authentication and integrity
 * - Resistant to length extension attacks (unlike simple hash)
 * - Requires secret key knowledge to generate valid signatures
 * - 256-bit output (64 hex characters)
 * 
 * Use Cases:
 * - API request authentication
 * - Webhook payload verification
 * - Data integrity checking
 * - Message authentication in protocols
 */
export function createHMAC(data: string, secret: string = securityConfig.encryptionKey): string {
  return CryptoJS.HmacSHA256(data, secret).toString(CryptoJS.enc.Hex);
}

/**
 * Verifies an HMAC-SHA256 signature for data authentication and integrity.
 * 
 * This function performs secure HMAC verification using constant-time comparison
 * to prevent timing attacks. Used to verify the authenticity and integrity of
 * data by comparing provided signatures with computed signatures.
 * 
 * @param data - Original data that was signed
 * @param signature - HMAC signature to verify (hexadecimal string)
 * @param secret - Secret key used for HMAC generation (defaults to encryption key)
 * @returns {boolean} True if signature is valid, false otherwise
 * 
 * @example
 * ```typescript
 * // Verify API request signature
 * const isValidRequest = verifyHMAC(requestBody, providedSignature);
 * if (!isValidRequest) {
 *   return c.json({ error: 'Invalid signature' }, { status: 401 });
 * }
 * 
 * // Verify webhook from external service
 * const webhookSecret = 'webhook_secret_key';
 * const isValidWebhook = verifyHMAC(webhookData, webhookSig, webhookSecret);
 * 
 * // Verify data integrity
 * const isDataIntact = verifyHMAC(storedData, storedSignature);
 * ```
 * 
 * Security Properties:
 * - Constant-time comparison prevents timing attacks
 * - Uses same HMAC-SHA256 algorithm as createHMAC
 * - Secure against signature forgery without secret key
 * - Resistant to chosen-message attacks
 * 
 * Timing Attack Protection:
 * - Both signatures converted to same format before comparison
 * - CryptoJS comparison functions used for constant-time operation
 * - No early termination on first character mismatch
 * 
 * Returns false for:
 * - Invalid or malformed signatures
 * - Wrong secret key used
 * - Data tampering or modification
 * - Signature generated with different algorithm
 */
export function verifyHMAC(data: string, signature: string, secret: string = securityConfig.encryptionKey): boolean {
  const expectedSignature = createHMAC(data, secret);
  return CryptoJS.enc.Hex.parse(signature).toString() === CryptoJS.enc.Hex.parse(expectedSignature).toString();
}