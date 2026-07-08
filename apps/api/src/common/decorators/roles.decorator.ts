import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@dkp/shared';

export const ROLES_KEY = 'roles';

/** Restrict a route to the given user roles (enforced by RolesGuard). */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
