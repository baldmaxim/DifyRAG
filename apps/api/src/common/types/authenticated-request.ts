import type { Request } from 'express';
import type { UserRole, ApiKeyScope } from '@dkp/shared';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
}

export interface AuthenticatedApiKey {
  id: string;
  name: string;
  scopes: ApiKeyScope[];
  createdByUserId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  apiKey?: AuthenticatedApiKey;
}
