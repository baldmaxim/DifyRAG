import { randomBytes } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { ApiKey } from '@prisma/client';
import type { ApiKeyScope } from '@dkp/shared';
import { hashSecret } from '../../common/hashing';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateApiKeyDto } from './dto/create-api-key.dto';

export interface ApiKeySummary {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  status: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface CreatedApiKey extends ApiKeySummary {
  /** The full secret — returned only once, at creation time. */
  key: string;
}

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  private toSummary(key: ApiKey): ApiKeySummary {
    return {
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      scopes: key.scopes,
      status: key.status,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
      revokedAt: key.revokedAt,
    };
  }

  async create(dto: CreateApiKeyDto, createdByUserId: string): Promise<CreatedApiKey> {
    const prefix = `dkp_${randomBytes(5).toString('hex')}`;
    const secret = randomBytes(32).toString('hex');
    const secretHash = await hashSecret(secret);

    const key = await this.prisma.apiKey.create({
      data: {
        name: dto.name,
        prefix,
        secretHash,
        scopes: dto.scopes as ApiKeyScope[],
        createdByUserId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    return { ...this.toSummary(key), key: `${prefix}.${secret}` };
  }

  async list(): Promise<ApiKeySummary[]> {
    const keys = await this.prisma.apiKey.findMany({ orderBy: { createdAt: 'desc' } });
    return keys.map((k) => this.toSummary(k));
  }

  async revoke(id: string): Promise<ApiKeySummary> {
    const existing = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('API key not found');
    }
    const key = await this.prisma.apiKey.update({
      where: { id },
      data: { status: 'revoked', revokedAt: new Date() },
    });
    return this.toSummary(key);
  }
}
