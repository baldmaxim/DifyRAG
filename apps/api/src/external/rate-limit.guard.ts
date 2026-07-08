import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SecurityConfig } from '../config/configuration';
import type { AuthenticatedRequest } from '../common/types/authenticated-request';

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory fixed-window rate limit per API key. For multi-instance
 * deployments back this with Redis; single-instance is fine for the portal.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();
  private readonly limit: number;
  private readonly windowMs = 60_000;

  constructor(config: ConfigService) {
    this.limit = config.getOrThrow<SecurityConfig>('security').externalRateLimitPerMin;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const key = request.apiKey?.id ?? request.ip ?? 'anonymous';
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (bucket.count >= this.limit) {
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
    bucket.count += 1;
    return true;
  }
}
