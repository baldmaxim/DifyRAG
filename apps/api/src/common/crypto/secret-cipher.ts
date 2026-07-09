import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SecurityConfig } from '../../config/configuration';

const PREFIX = 'enc:v1:';
const IV_LEN = 12;
const TAG_LEN = 16;

/**
 * AES-256-GCM encryption for UI-managed secrets at rest. The key is derived from
 * SETTINGS_ENCRYPTION_KEY (env, bootstrap-only). Secrets are never returned to the
 * frontend — only stored/decrypted server-side.
 */
@Injectable()
export class SecretCipher {
  private readonly key: Buffer | null;

  constructor(config: ConfigService) {
    const passphrase = config.getOrThrow<SecurityConfig>('security').settingsEncryptionKey;
    this.key = passphrase ? createHash('sha256').update(passphrase).digest() : null;
  }

  isConfigured(): boolean {
    return this.key !== null;
  }

  encrypt(plaintext: string): string {
    if (!this.key) {
      throw new Error('SETTINGS_ENCRYPTION_KEY is not configured — cannot store secrets');
    }
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64');
  }

  decrypt(payload: string): string {
    if (!this.key) {
      throw new Error('SETTINGS_ENCRYPTION_KEY is not configured — cannot read secrets');
    }
    if (!payload.startsWith(PREFIX)) {
      // Legacy/plaintext value (e.g. seeded directly) — return as-is.
      return payload;
    }
    const raw = Buffer.from(payload.slice(PREFIX.length), 'base64');
    const iv = raw.subarray(0, IV_LEN);
    const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const enc = raw.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  }

  isEncrypted(payload: string): boolean {
    return payload.startsWith(PREFIX);
  }
}
