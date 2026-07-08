import { HttpException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { RateLimitGuard } from './rate-limit.guard';

const config = {
  getOrThrow: () => ({ externalRateLimitPerMin: 2 }),
} as unknown as ConfigService;

function ctxForKey(id: string): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ apiKey: { id }, ip: '127.0.0.1' }) }),
  } as unknown as ExecutionContext;
}

describe('RateLimitGuard', () => {
  it('allows up to the limit then throws 429', () => {
    const guard = new RateLimitGuard(config);
    const ctx = ctxForKey('key-1');
    expect(guard.canActivate(ctx)).toBe(true);
    expect(guard.canActivate(ctx)).toBe(true);
    expect(() => guard.canActivate(ctx)).toThrow(HttpException);
  });

  it('tracks limits per API key independently', () => {
    const guard = new RateLimitGuard(config);
    expect(guard.canActivate(ctxForKey('a'))).toBe(true);
    expect(guard.canActivate(ctxForKey('b'))).toBe(true);
    expect(guard.canActivate(ctxForKey('a'))).toBe(true);
    expect(guard.canActivate(ctxForKey('b'))).toBe(true);
    expect(() => guard.canActivate(ctxForKey('a'))).toThrow(HttpException);
  });
});
