import { SetMetadata } from '@nestjs/common';
import type { ApiKeyScope } from '@dkp/shared';

export const SCOPES_KEY = 'scopes';

/** Require the given API-key scopes (enforced by ApiKeyGuard). */
export const Scopes = (...scopes: ApiKeyScope[]): MethodDecorator & ClassDecorator =>
  SetMetadata(SCOPES_KEY, scopes);
