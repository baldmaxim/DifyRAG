import { api } from './client';
import type {
  ApiKeySummary,
  AuditLogRow,
  CreatedApiKey,
  CurrentUser,
  DashboardStats,
  Department,
  DifyDatasetMappingRow,
  DocumentRow,
  DocumentVersion,
  Folder,
  HealthResult,
  ProcessingJobRow,
  Project,
  SearchResponse,
  TokenPair,
  UploadUrlResult,
} from '../types';

// ── Auth ──────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post<TokenPair>('/auth/login', { email, password }).then((r) => r.data),
  me: () => api.get<CurrentUser>('/auth/me').then((r) => r.data),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
};

// ── Projects ──────────────────────────────────────────────
export const projectsApi = {
  list: (search?: string) =>
    api.get<Project[]>('/projects', { params: { search } }).then((r) => r.data),
  get: (id: string) => api.get<Project>(`/projects/${id}`).then((r) => r.data),
  create: (body: Partial<Project>) => api.post<Project>('/projects', body).then((r) => r.data),
  update: (id: string, body: Partial<Project>) =>
    api.patch<Project>(`/projects/${id}`, body).then((r) => r.data),
  archive: (id: string) => api.delete<Project>(`/projects/${id}`).then((r) => r.data),
};

// ── Folders ───────────────────────────────────────────────
export const foldersApi = {
  tree: (scope: string, projectId?: string) =>
    api.get<Folder[]>('/folders/tree', { params: { scope, projectId } }).then((r) => r.data),
};

// ── Departments ───────────────────────────────────────────
export const departmentsApi = {
  list: () => api.get<Department[]>('/departments').then((r) => r.data),
  get: (id: string) => api.get<Department>(`/departments/${id}`).then((r) => r.data),
  update: (id: string, body: Partial<Department>) =>
    api.patch<Department>(`/departments/${id}`, body).then((r) => r.data),
};

// ── Documents ─────────────────────────────────────────────
export interface CreateDocumentBody {
  folderId: string;
  documentTypeCode: string;
  title: string;
  description?: string;
  documentDate?: string;
  counterparty?: string;
  confidentiality?: string;
  metadata?: Record<string, unknown>;
}

export const documentsApi = {
  list: (params: { projectId?: string; folderId?: string; status?: string; search?: string }) =>
    api.get<DocumentRow[]>('/documents', { params }).then((r) => r.data),
  get: (id: string) => api.get<DocumentRow>(`/documents/${id}`).then((r) => r.data),
  create: (body: CreateDocumentBody) => api.post<DocumentRow>('/documents', body).then((r) => r.data),
  update: (id: string, body: Partial<CreateDocumentBody>) =>
    api.patch<DocumentRow>(`/documents/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete(`/documents/${id}`).then((r) => r.data),
  restore: (id: string) => api.post<DocumentRow>(`/documents/${id}/restore`).then((r) => r.data),
  uploadUrl: (id: string, body: { fileName: string; mimeType: string; sizeBytes?: number }) =>
    api.post<UploadUrlResult>(`/documents/${id}/upload-url`, body).then((r) => r.data),
  commitUpload: (id: string, uploadSessionId: string) =>
    api.post<DocumentRow>(`/documents/${id}/commit-upload`, { uploadSessionId }).then((r) => r.data),
  downloadUrl: (id: string) =>
    api.get<{ url: string; fileName: string }>(`/documents/${id}/download-url`).then((r) => r.data),
  versions: (id: string) =>
    api.get<DocumentVersion[]>(`/documents/${id}/versions`).then((r) => r.data),
  reindex: (id: string) => api.post(`/documents/${id}/reindex`).then((r) => r.data),
};

// ── Search ────────────────────────────────────────────────
export const searchApi = {
  run: (body: Record<string, unknown>) =>
    api.post<SearchResponse>('/search', body).then((r) => r.data),
};

// ── Integrations ──────────────────────────────────────────
export const integrationsApi = {
  health: () => api.get<HealthResult[]>('/integrations/health').then((r) => r.data),
  one: (provider: string) =>
    api.get<HealthResult>(`/integrations/${provider}/health`).then((r) => r.data),
};

// ── API keys ──────────────────────────────────────────────
export const apiKeysApi = {
  list: () => api.get<ApiKeySummary[]>('/api-keys').then((r) => r.data),
  create: (body: { name: string; scopes: string[]; expiresAt?: string }) =>
    api.post<CreatedApiKey>('/api-keys', body).then((r) => r.data),
  revoke: (id: string) => api.delete<ApiKeySummary>(`/api-keys/${id}`).then((r) => r.data),
};

// ── Processing jobs ───────────────────────────────────────
export const processingApi = {
  list: (status?: string) =>
    api.get<ProcessingJobRow[]>('/processing/jobs', { params: { status } }).then((r) => r.data),
  retry: (id: string) => api.post<ProcessingJobRow>(`/processing/jobs/${id}/retry`).then((r) => r.data),
};

// ── Reporting ─────────────────────────────────────────────
export const reportingApi = {
  dashboard: () => api.get<DashboardStats>('/stats/dashboard').then((r) => r.data),
  auditLogs: (params: { action?: string; resourceType?: string }) =>
    api.get<AuditLogRow[]>('/audit-logs', { params }).then((r) => r.data),
  difyDatasets: () => api.get<DifyDatasetMappingRow[]>('/dify-datasets').then((r) => r.data),
};
