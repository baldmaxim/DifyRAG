import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedApiKey, AuthenticatedUser } from '../types/authenticated-request';

export interface AuditActor {
  actorType: 'user' | 'api_key' | 'system';
  actorUserId?: string | null;
  actorApiKeyId?: string | null;
}

export interface WriteAuditParams {
  actor: AuditActor;
  action: string;
  resourceType: string;
  resourceId: string;
  ip?: string | null;
  userAgent?: string | null;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  static actorFromUser(user: AuthenticatedUser): AuditActor {
    return { actorType: 'user', actorUserId: user.id };
  }

  static actorFromApiKey(apiKey: AuthenticatedApiKey): AuditActor {
    return { actorType: 'api_key', actorApiKeyId: apiKey.id };
  }

  static systemActor(): AuditActor {
    return { actorType: 'system' };
  }

  async write(params: WriteAuditParams): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorType: params.actor.actorType,
        actorUserId: params.actor.actorUserId ?? null,
        actorApiKeyId: params.actor.actorApiKeyId ?? null,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
        before: params.before ?? undefined,
        after: params.after ?? undefined,
      },
    });
  }
}
