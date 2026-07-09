import { BadRequestException, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { AuditService } from '../common/audit/audit.service';
import { SecretCipher } from '../common/crypto/secret-cipher';
import { PrismaService } from '../common/prisma/prisma.service';
import type { ActorContext } from '../common/types/actor-context';
import {
  configuration,
  type LmStudioConfig,
  type DifyConfig,
  type ProcessingConfig,
  type QdrantConfig,
  type RootConfig,
  type S3Config,
  type SecurityConfig,
} from '../config/configuration';
import { findGroup, SETTINGS_GROUPS, type SettingField } from './settings.schema';

type ConfigRecord = Record<string, Record<string, unknown>>;

export interface MaskedField {
  field: string;
  label: string;
  type: string;
  secret: boolean;
  /** Effective value for non-secret fields; null for secrets. */
  value: unknown;
  /** Whether a value is set (via env or DB) — used to show "configured" for secrets. */
  configured: boolean;
}

export interface MaskedGroup {
  group: string;
  label: string;
  fields: MaskedField[];
}

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private snapshot: RootConfig = configuration();
  private version = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cipher: SecretCipher,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reload();
  }

  // ── Effective typed config (env overlaid with DB) ─────────
  s3(): S3Config {
    return this.snapshot.s3;
  }
  dify(): DifyConfig {
    return this.snapshot.dify;
  }
  lmStudio(): LmStudioConfig {
    return this.snapshot.lmStudio;
  }
  qdrant(): QdrantConfig {
    return this.snapshot.qdrant;
  }
  processing(): ProcessingConfig {
    return this.snapshot.processing;
  }
  security(): SecurityConfig {
    return this.snapshot.security;
  }
  getVersion(): number {
    return this.version;
  }

  private coerce(value: string, type: SettingField['type']): unknown {
    if (type === 'number') return Number(value);
    if (type === 'boolean') return value === 'true' || value === '1';
    return value;
  }

  /** Rebuild the effective snapshot: fresh env base overlaid with DB settings. */
  async reload(): Promise<void> {
    const base = configuration() as unknown as ConfigRecord;
    try {
      const rows = await this.prisma.appSetting.findMany();
      for (const row of rows) {
        const [group, field] = row.key.split('.');
        if (!group || !field) continue;
        const def = findGroup(group)?.fields.find((f) => f.field === field);
        if (!def) continue;
        const raw = row.isSecret ? this.cipher.decrypt(row.value) : row.value;
        if (base[group]) {
          base[group][field] = this.coerce(raw, def.type);
        }
      }
    } catch (err) {
      this.logger.warn(`Could not load DB settings (using env only): ${(err as Error).message}`);
    }
    this.snapshot = base as unknown as RootConfig;
    this.version += 1;
  }

  /** UI-safe view: secret values are never returned, only whether they are configured. */
  getMasked(): MaskedGroup[] {
    const snap = this.snapshot as unknown as ConfigRecord;
    return SETTINGS_GROUPS.map((g) => ({
      group: g.group,
      label: g.label,
      fields: g.fields.map((f): MaskedField => {
        const effective = snap[g.group]?.[f.field];
        return {
          field: f.field,
          label: f.label,
          type: f.type,
          secret: Boolean(f.secret),
          value: f.secret ? null : (effective ?? null),
          configured: effective !== undefined && effective !== null && effective !== '',
        };
      }),
    }));
  }

  getMaskedGroup(group: string): MaskedGroup {
    const masked = this.getMasked().find((g) => g.group === group);
    if (!masked) {
      throw new BadRequestException(`Unknown settings group: ${group}`);
    }
    return masked;
  }

  /** Update a settings group. Secret fields with an empty value are left unchanged. */
  async update(
    group: string,
    patch: Record<string, unknown>,
    ctx: ActorContext,
  ): Promise<MaskedGroup> {
    const def = findGroup(group);
    if (!def) {
      throw new BadRequestException(`Unknown settings group: ${group}`);
    }
    const changed: string[] = [];

    for (const fieldDef of def.fields) {
      if (!(fieldDef.field in patch)) continue;
      const value = patch[fieldDef.field];

      if (fieldDef.secret) {
        if (value === undefined || value === null || value === '') continue; // keep existing
        if (!this.cipher.isConfigured()) {
          throw new BadRequestException('SETTINGS_ENCRYPTION_KEY is not configured on the server');
        }
        await this.prisma.appSetting.upsert({
          where: { key: `${group}.${fieldDef.field}` },
          create: {
            key: `${group}.${fieldDef.field}`,
            groupName: group,
            value: this.cipher.encrypt(String(value)),
            isSecret: true,
            updatedByUserId: ctx.userId ?? null,
          },
          update: {
            value: this.cipher.encrypt(String(value)),
            updatedByUserId: ctx.userId ?? null,
          },
        });
      } else {
        const stored = String(value ?? '');
        await this.prisma.appSetting.upsert({
          where: { key: `${group}.${fieldDef.field}` },
          create: {
            key: `${group}.${fieldDef.field}`,
            groupName: group,
            value: stored,
            isSecret: false,
            updatedByUserId: ctx.userId ?? null,
          },
          update: { value: stored, updatedByUserId: ctx.userId ?? null },
        });
      }
      changed.push(fieldDef.field);
    }

    await this.audit.write({
      actor: ctx.actor,
      action: 'settings.update',
      resourceType: 'settings',
      resourceId: group,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      after: { changedFields: changed }, // never log secret values
    });

    await this.reload();
    return this.getMaskedGroup(group);
  }
}
