import type { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../common/audit/audit.service';
import { SecretCipher } from '../common/crypto/secret-cipher';
import type { PrismaService } from '../common/prisma/prisma.service';
import type { ActorContext } from '../common/types/actor-context';
import { SettingsService } from './settings.service';

const cipher = new SecretCipher({
  getOrThrow: () => ({ settingsEncryptionKey: 'test-passphrase' }),
} as unknown as ConfigService);

const ctx: ActorContext = { actor: { actorType: 'user', actorUserId: 'u1' }, userId: 'u1' };

function build(rows: Array<{ key: string; value: string; isSecret: boolean }>) {
  const upsert = vi.fn(async () => ({}));
  const prisma = {
    appSetting: { findMany: vi.fn(async () => rows), upsert },
  } as unknown as PrismaService;
  const audit = { write: vi.fn(async () => undefined) } as unknown as AuditService;
  const service = new SettingsService(prisma, cipher, audit);
  return { service, upsert, audit };
}

describe('SettingsService', () => {
  it('falls back to env defaults when there are no DB overrides', async () => {
    const { service } = build([]);
    await service.reload();
    expect(service.s3().region).toBe('ru-central-1'); // env default from configuration()
  });

  it('overlays DB overrides and decrypts secrets', async () => {
    const { service } = build([
      { key: 's3.region', value: 'eu-west', isSecret: false },
      { key: 's3.secretAccessKey', value: cipher.encrypt('super-secret'), isSecret: true },
    ]);
    await service.reload();
    expect(service.s3().region).toBe('eu-west');
    expect(service.s3().secretAccessKey).toBe('super-secret');
  });

  it('never returns secret values in the masked view', async () => {
    const { service } = build([
      { key: 's3.secretAccessKey', value: cipher.encrypt('super-secret'), isSecret: true },
      { key: 's3.region', value: 'eu-west', isSecret: false },
    ]);
    await service.reload();
    const s3 = service.getMasked().find((g) => g.group === 's3');
    const secretField = s3?.fields.find((f) => f.field === 'secretAccessKey');
    const regionField = s3?.fields.find((f) => f.field === 'region');
    expect(secretField?.value).toBeNull();
    expect(secretField?.configured).toBe(true);
    expect(regionField?.value).toBe('eu-west');
    // The plaintext secret must not appear anywhere in the masked payload.
    expect(JSON.stringify(service.getMasked())).not.toContain('super-secret');
  });

  it('encrypts secrets on update and audits only field names', async () => {
    const { service, upsert, audit } = build([]);
    await service.reload();
    await service.update('s3', { region: 'us-1', secretAccessKey: 'new-secret' }, ctx);

    const secretUpsert = upsert.mock.calls.find(
      (c) => (c[0] as { where: { key: string } }).where.key === 's3.secretAccessKey',
    );
    const storedValue = (secretUpsert?.[0] as { create: { value: string } }).create.value;
    expect(cipher.isEncrypted(storedValue)).toBe(true);
    expect(storedValue).not.toContain('new-secret');

    const auditArg = (audit.write as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(JSON.stringify(auditArg)).not.toContain('new-secret');
    expect(auditArg.after.changedFields).toContain('secretAccessKey');
  });

  it('leaves a secret unchanged when the update value is empty', async () => {
    const { service, upsert } = build([]);
    await service.reload();
    await service.update('s3', { secretAccessKey: '' }, ctx);
    const secretUpsert = upsert.mock.calls.find(
      (c) => (c[0] as { where: { key: string } }).where.key === 's3.secretAccessKey',
    );
    expect(secretUpsert).toBeUndefined();
  });
});
