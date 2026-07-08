/** Scopes attachable to external API keys. */
export const ApiKeyScope = {
  DocumentsRead: 'documents:read',
  DocumentsWrite: 'documents:write',
  DocumentsDelete: 'documents:delete',
  ProjectsRead: 'projects:read',
  ProjectsWrite: 'projects:write',
  SearchRead: 'search:read',
  ProcessingWrite: 'processing:write',
  IntegrationsRead: 'integrations:read',
  IntegrationsWrite: 'integrations:write',
} as const;

export type ApiKeyScope = (typeof ApiKeyScope)[keyof typeof ApiKeyScope];

export const API_KEY_SCOPE_VALUES = Object.values(ApiKeyScope) as ApiKeyScope[];
