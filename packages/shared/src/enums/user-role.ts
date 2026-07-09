export const UserRole = {
  Admin: 'admin',
  User: 'user',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const USER_ROLE_VALUES = Object.values(UserRole) as UserRole[];
