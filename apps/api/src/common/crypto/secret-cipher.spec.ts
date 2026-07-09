import type { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { SecretCipher } from './secret-cipher';

function cipherWith(key: string | undefined): SecretCipher {
  const config = {
    getOrThrow: () => ({ settingsEncryptionKey: key }),
  } as unknown as ConfigService;
  return new SecretCipher(config);
}

describe('SecretCipher', () => {
  it('encrypts and decrypts a round trip', () => {
    const cipher = cipherWith('a-long-test-passphrase');
    const enc = cipher.encrypt('S3-SECRET-VALUE');
    expect(enc.startsWith('enc:v1:')).toBe(true);
    expect(enc).not.toContain('S3-SECRET-VALUE');
    expect(cipher.decrypt(enc)).toBe('S3-SECRET-VALUE');
  });

  it('treats non-prefixed values as plaintext on decrypt', () => {
    const cipher = cipherWith('key');
    expect(cipher.decrypt('legacy-plain')).toBe('legacy-plain');
    expect(cipher.isEncrypted('legacy-plain')).toBe(false);
  });

  it('throws when no key is configured', () => {
    const cipher = cipherWith(undefined);
    expect(cipher.isConfigured()).toBe(false);
    expect(() => cipher.encrypt('x')).toThrow(/SETTINGS_ENCRYPTION_KEY/);
  });
});
