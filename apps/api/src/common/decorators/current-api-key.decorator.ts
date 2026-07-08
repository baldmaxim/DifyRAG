import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedApiKey, AuthenticatedRequest } from '../types/authenticated-request';

export const CurrentApiKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedApiKey => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.apiKey) {
      throw new UnauthorizedException('No authenticated API key in request');
    }
    return request.apiKey;
  },
);
