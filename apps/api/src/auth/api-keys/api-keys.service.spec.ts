import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { verifySecret } from '../../common/hashing';
import { ApiKeysService } from './api-keys.service';

describe('ApiKeysService', () => {
  it('returns the full key once and stores only a hash', async () => {
    const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'k1',
      status: 'active',
      lastUsedAt: null,
      expiresAt: null,
      createdAt: new Date(),
      revokedAt: null,
      ...data,
    }));
    const prisma = { apiKey: { create } } as unknown as PrismaService;
    const service = new ApiKeysService(prisma);

    const created = await service.create({ name: 'ERP', scopes: ['documents:read'] }, 'user-1');

    expect(created.key).toContain('.');
    const [prefix, secret] = created.key.split('.');
    expect(prefix).toBe(created.prefix);

    const storedHash = create.mock.calls[0][0].data.secretHash as string;
    expect(storedHash).not.toContain(secret as string);
    expect(await verifySecret(storedHash, secret as string)).toBe(true);
  });

  it('revokes a key', async () => {
    const prisma = {
      apiKey: {
        findUnique: vi.fn(async () => ({ id: 'k1' })),
        update: vi.fn(async () => ({ id: 'k1', status: 'revoked', scopes: [] })),
      },
    } as unknown as PrismaService;
    const service = new ApiKeysService(prisma);
    const result = await service.revoke('k1');
    expect(result.status).toBe('revoked');
  });
});
