import { describe, it, expect, beforeEach, vi } from 'vitest';
import { encrypt, decrypt, hashPassword, verifyPassword, generateSecureToken } from '@/utils/crypto';

describe('Crypto Utilities', () => {
  beforeEach(() => {
    // Set encryption key for tests
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-min';
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt data correctly', () => {
      const originalData = 'sensitive information';
      
      const encrypted = encrypt(originalData);
      expect(encrypted).not.toBe(originalData);
      expect(encrypted.length).toBeGreaterThan(0);

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(originalData);
    });

    it('should encrypt the same data differently each time (due to random IV)', () => {
      const data = 'same data';
      
      const encrypted1 = encrypt(data);
      const encrypted2 = encrypt(data);
      
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same value
      expect(decrypt(encrypted1)).toBe(data);
      expect(decrypt(encrypted2)).toBe(data);
    });

    it('should handle empty strings', () => {
      const emptyString = '';
      
      const encrypted = encrypt(emptyString);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(emptyString);
    });

    it('should handle unicode characters', () => {
      const unicodeData = '🔐 Unicode test émoji 中文 🚀';
      
      const encrypted = encrypt(unicodeData);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(unicodeData);
    });

    it('should handle long strings', () => {
      const longString = 'A'.repeat(10000);
      
      const encrypted = encrypt(longString);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(longString);
    });

    it('should throw error when decrypting invalid data', () => {
      expect(() => decrypt('invalid-encrypted-data')).toThrow();
    });

    it('should throw error when decrypting tampered data', () => {
      const originalData = 'original data';
      const encrypted = encrypt(originalData);
      
      // Tamper with the encrypted data
      const tamperedEncrypted = encrypted.slice(0, -1) + 'x';
      
      expect(() => decrypt(tamperedEncrypted)).toThrow();
    });

    it('should throw error when encryption key is missing', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      expect(() => encrypt('test')).toThrow('Encryption key not configured');

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });

  describe('hashPassword/verifyPassword', () => {
    it('should hash and verify passwords correctly', async () => {
      const password = 'mySecurePassword123!';
      
      const hashedPassword = await hashPassword(password);
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(0);
      
      const isValid = await verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect passwords', async () => {
      const correctPassword = 'correctPassword';
      const wrongPassword = 'wrongPassword';
      
      const hashedPassword = await hashPassword(correctPassword);
      
      const isValid = await verifyPassword(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'samePassword';
      
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
      
      // But both should verify correctly
      expect(await verifyPassword(password, hash1)).toBe(true);
      expect(await verifyPassword(password, hash2)).toBe(true);
    });

    it('should handle empty passwords', async () => {
      const emptyPassword = '';
      
      const hashedPassword = await hashPassword(emptyPassword);
      const isValid = await verifyPassword(emptyPassword, hashedPassword);
      
      expect(isValid).toBe(true);
    });

    it('should handle unicode characters in passwords', async () => {
      const unicodePassword = 'pássword中文🔐';
      
      const hashedPassword = await hashPassword(unicodePassword);
      const isValid = await verifyPassword(unicodePassword, hashedPassword);
      
      expect(isValid).toBe(true);
    });

    it('should handle long passwords', async () => {
      const longPassword = 'A'.repeat(1000);
      
      const hashedPassword = await hashPassword(longPassword);
      const isValid = await verifyPassword(longPassword, hashedPassword);
      
      expect(isValid).toBe(true);
    });

    it('should handle verification errors gracefully', async () => {
      const password = 'validPassword';
      const invalidHash = 'not-a-valid-hash';
      
      const isValid = await verifyPassword(password, invalidHash);
      expect(isValid).toBe(false);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate secure tokens of specified length', () => {
      const token16 = generateSecureToken(16);
      const token32 = generateSecureToken(32);
      const token64 = generateSecureToken(64);
      
      expect(token16).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(token32).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(token64).toHaveLength(128); // 64 bytes = 128 hex chars
    });

    it('should generate different tokens each time', () => {
      const token1 = generateSecureToken(16);
      const token2 = generateSecureToken(16);
      
      expect(token1).not.toBe(token2);
    });

    it('should generate tokens with only hexadecimal characters', () => {
      const token = generateSecureToken(32);
      
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should handle minimum token size', () => {
      const token = generateSecureToken(1);
      
      expect(token).toHaveLength(2); // 1 byte = 2 hex chars
      expect(token).toMatch(/^[0-9a-f]{2}$/);
    });

    it('should handle large token sizes', () => {
      const token = generateSecureToken(256);
      
      expect(token).toHaveLength(512); // 256 bytes = 512 hex chars
      expect(token).toMatch(/^[0-9a-f]{512}$/);
    });

    it('should use default length when no parameter provided', () => {
      const token = generateSecureToken();
      
      expect(token).toHaveLength(64); // Default 32 bytes = 64 hex chars
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('Error Handling', () => {
    it('should handle crypto operations with insufficient entropy', () => {
      // Mock crypto.randomBytes to simulate insufficient entropy
      const originalRandomBytes = require('crypto').randomBytes;
      vi.spyOn(require('crypto'), 'randomBytes').mockImplementation(() => {
        throw new Error('Insufficient entropy');
      });

      expect(() => generateSecureToken(16)).toThrow();

      // Restore original function
      require('crypto').randomBytes = originalRandomBytes;
    });

    it('should handle encryption with invalid key length', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'short'; // Too short for AES

      expect(() => encrypt('test data')).toThrow();

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });
});