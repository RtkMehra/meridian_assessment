import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests-min-32';
    service = new EncryptionService();
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt data correctly', () => {
      const original = 'sensitive-data-123';
      const encrypted = service.encrypt(original);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const data = 'same-data';
      const encrypted1 = service.encrypt(data);
      const encrypted2 = service.encrypt(data);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should throw on decrypt with invalid data', () => {
      expect(() => service.decrypt('invalid:data:format')).toThrow();
    });
  });

  describe('hashPassword/comparePassword', () => {
    it('should hash and verify password correctly', async () => {
      const password = 'secure-password-123';
      const hash = await service.hashPassword(password);
      const isValid = await service.comparePassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'correct-password';
      const hash = await service.hashPassword(password);
      const isValid = await service.comparePassword('wrong-password', hash);

      expect(isValid).toBe(false);
    });

    it('should produce different hashes for same password', async () => {
      const password = 'same-password';
      const hash1 = await service.hashPassword(password);
      const hash2 = await service.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateRandomToken', () => {
    it('should generate hex token of correct length', () => {
      const token = service.generateRandomToken(32);
      expect(token).toMatch(/^[0-9a-f]+$/);
      expect(token.length).toBe(64);
    });
  });

  describe('hashForAudit', () => {
    it('should produce consistent hash for same input', () => {
      const data = 'audit-data';
      const hash1 = service.hashForAudit(data);
      const hash2 = service.hashForAudit(data);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different input', () => {
      const hash1 = service.hashForAudit('data1');
      const hash2 = service.hashForAudit('data2');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('anonymizePII', () => {
    it('should mask email local part', () => {
      const result = service.anonymizePII('user@example.com');
      expect(result).toBe('us**@example.com');
    });
  });

  describe('maskCardNumber', () => {
    it('should mask all but last 4 digits', () => {
      const result = service.maskCardNumber('4111111111111111');
      expect(result).toBe('************1111');
    });

    it('should handle short numbers', () => {
      const result = service.maskCardNumber('123');
      expect(result).toBe('****');
    });
  });
});
