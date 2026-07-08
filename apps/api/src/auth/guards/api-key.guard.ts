import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ApiKeyScope } from '@dkp/shared';
import { SCOPES_KEY } from '../../common/decorators/scopes.decorator';
import { verifySecret } from '../../common/hashing';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const raw = request.headers['x-api-key'];
    const headerValue = Array.isArray(raw) ? raw[0] : raw;
    if (!headerValue) {
      throw new UnauthorizedException('Missing X-API-Key');
    }

    const [prefix, secret] = headerValue.split('.');
    if (!prefix || !secret) {
      throw new UnauthorizedException('Malformed API key');
    }

    const key = await this.prisma.apiKey.findUnique({ where: { prefix } });
    if (!key || key.status !== 'active') {
      throw new UnauthorizedException('Invalid API key');
    }
    if (key.expiresAt && key.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Expired API key');
    }
    const valid = await verifySecret(key.secretHash, secret);
    if (!valid) {
      throw new UnauthorizedException('Invalid API key');
    }

    const requiredScopes = this.reflector.getAllAndOverride<ApiKeyScope[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredScopes && requiredScopes.length > 0) {
      const granted = new Set(key.scopes);
      const missing = requiredScopes.filter((s) => !granted.has(s));
      if (missing.length > 0) {
        throw new ForbiddenException(`Missing scopes: ${missing.join(', ')}`);
      }
    }

    // Best-effort last-used update; do not block the request on it.
    void this.prisma.apiKey
      .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    request.apiKey = {
      id: key.id,
      name: key.name,
      scopes: key.scopes as ApiKeyScope[],
      createdByUserId: key.createdByUserId,
    };
    return true;
  }
}
