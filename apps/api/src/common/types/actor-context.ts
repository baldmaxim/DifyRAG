import type { AuditActor } from '../audit/audit.service';
import type { AuthenticatedApiKey, AuthenticatedUser } from './authenticated-request';

/** Who is performing an action + request context, for audit + ownership fields. */
export interface ActorContext {
  actor: AuditActor;
  userId?: string | null;
  apiKeyId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export function userContext(
  user: AuthenticatedUser,
  req?: { ip?: string; headers: Record<string, unknown> },
): ActorContext {
  return {
    actor: { actorType: 'user', actorUserId: user.id },
    userId: user.id,
    ip: req?.ip ?? null,
    userAgent: (req?.headers['user-agent'] as string) ?? null,
  };
}

export function apiKeyContext(
  apiKey: AuthenticatedApiKey,
  req?: { ip?: string; headers: Record<string, unknown> },
): ActorContext {
  return {
    actor: { actorType: 'api_key', actorApiKeyId: apiKey.id },
    apiKeyId: apiKey.id,
    ip: req?.ip ?? null,
    userAgent: (req?.headers['user-agent'] as string) ?? null,
  };
}
