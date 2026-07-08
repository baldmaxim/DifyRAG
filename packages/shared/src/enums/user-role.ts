export const UserRole = {
  SuperAdmin: 'super_admin',
  Admin: 'admin',
  Manager: 'manager',
  Editor: 'editor',
  Viewer: 'viewer',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const USER_ROLE_VALUES = Object.values(UserRole) as UserRole[];
