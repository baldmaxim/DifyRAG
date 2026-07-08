import type {
  Confidentiality,
  DocumentStatus,
  DifyIndexingStatus,
  Scope,
  UserRole,
} from '@dkp/shared';

export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  address?: string | null;
  customerName?: string | null;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  scope: Scope;
  projectId: string | null;
  parentId: string | null;
  slug: string;
  name: string;
  path: string;
  sortOrder: number;
}

export interface Department {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  skillsMarkdown?: string | null;
}

export interface DocumentTypeRef {
  id: string;
  code: string;
  name: string;
}

export interface DocumentVersion {
  id: string;
  versionNo: number;
  originalFileName: string;
  mimeType: string;
  sizeBytes: string | number;
  isCurrent: boolean;
  createdAt: string;
}

export interface DocumentRow {
  id: string;
  scope: Scope;
  projectId: string | null;
  folderId: string;
  title: string;
  description?: string | null;
  counterparty?: string | null;
  documentDate?: string | null;
  status: DocumentStatus;
  confidentiality: Confidentiality;
  currentVersionId: string | null;
  updatedAt: string;
  documentType?: DocumentTypeRef;
  folder?: Folder;
  currentVersion?: DocumentVersion | null;
  metadata?: Record<string, unknown> | null;
}

export interface UploadUrlResult {
  uploadSessionId: string;
  uploadUrl: string;
  s3Key: string;
  expiresAt: string;
}

export interface ApiKeySummary {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  status: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreatedApiKey extends ApiKeySummary {
  key: string;
}

export interface ProcessingJobRow {
  id: string;
  documentId: string | null;
  jobType: string;
  status: string;
  attempts: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogRow {
  id: string;
  actorType: string;
  action: string;
  resourceType: string;
  resourceId: string;
  createdAt: string;
  before?: unknown;
  after?: unknown;
}

export interface HealthResult {
  provider: 'dify' | 'lmstudio' | 'qdrant' | 's3';
  status: 'ok' | 'degraded' | 'down' | 'setup_required';
  latencyMs?: number;
  details: Record<string, unknown>;
}

export interface DifyDatasetMappingRow {
  id: string;
  scope: string;
  projectId: string | null;
  folderGroup: string;
  difyDatasetId: string | null;
  difyDatasetName: string;
  status: string;
  errorMessage: string | null;
  documentCount: number;
  updatedAt: string;
}

export interface DashboardStats {
  projects: number;
  documents: number;
  documentsByStatus: Record<string, number>;
  recentDocuments: Array<{ id: string; title: string; status: string; updatedAt: string }>;
  errorDocuments: number;
}

export interface SearchChunk {
  content: string;
  score: number;
  document_id: string | null;
  document_title: string | null;
  document_type: string | null;
  project_code: string | null;
  folder_path: string | null;
  source: { file_name: string | null; document_version_id: string | null; page: number | null };
}

export interface SearchResponse {
  answer: string | null;
  chunks: SearchChunk[];
  sources: Array<{ document_id: string; title: string; file_name: string | null; folder_path: string | null }>;
  trace_id: string;
  warnings: string[];
}

export type { DifyIndexingStatus };
