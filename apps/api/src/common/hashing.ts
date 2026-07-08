import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';

/** Hash a secret (password or API-key secret) with Argon2id. */
export function hashSecret(secret: string): Promise<string> {
  return argonHash(secret);
}

/** Verify a plaintext secret against an Argon2 hash. Never throws on mismatch. */
export async function verifySecret(hash: string, secret: string): Promise<boolean> {
  try {
    return await argonVerify(hash, secret);
  } catch {
    return false;
  }
}
