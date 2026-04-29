import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EncryptionService {
  private readonly encryptionKey: Buffer;

  constructor() {
    const keyString = process.env.ENCRYPTION_KEY || this.getDevelopmentKey();
    const hash = crypto.createHash('sha256');
    hash.update(keyString);
    this.encryptionKey = hash.digest();
  }

  private getDevelopmentKey(): string {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY is required in production');
    }

    return 'dev-encryption-key-change-me-minimum-32-chars';
  }

  encrypt(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`;
  }

  decrypt(encryptedData: string): string {
    const [ivB64, tagB64, encrypted] = encryptedData.split(':');

    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  hashForAudit(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  anonymizePII(email: string): string {
    const [localPart, domain] = email.split('@');
    const masked = localPart.substring(0, 2) + '*'.repeat(localPart.length - 2);
    return `${masked}@${domain}`;
  }

  maskCardNumber(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\D/g, '');
    if (cleaned.length < 4) return '****';
    return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
  }
}
