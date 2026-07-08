export const Scope = {
  Project: 'project',
  Company: 'company',
  People: 'people',
  Contractors: 'contractors',
  Reference: 'reference',
  Templates: 'templates',
} as const;

export type Scope = (typeof Scope)[keyof typeof Scope];

export const SCOPE_VALUES = Object.values(Scope) as Scope[];
