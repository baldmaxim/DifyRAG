import { describe, expect, it } from 'vitest';
import { hashSecret, verifySecret } from './hashing';

describe('hashing', () => {
  it('hashes and verifies a secret', async () => {
    const hash = await hashSecret('super-secret-123');
    expect(hash).not.toContain('super-secret-123');
    expect(await verifySecret(hash, 'super-secret-123')).toBe(true);
  });

  it('rejects a wrong secret', async () => {
    const hash = await hashSecret('correct');
    expect(await verifySecret(hash, 'wrong')).toBe(false);
  });

  it('returns false on a malformed hash instead of throwing', async () => {
    expect(await verifySecret('not-a-hash', 'anything')).toBe(false);
  });
});
