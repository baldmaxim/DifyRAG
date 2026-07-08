export const DocumentStatus = {
  Draft: 'draft',
  Active: 'active',
  Uploading: 'uploading',
  Stored: 'stored',
  Queued: 'queued',
  Processing: 'processing',
  Indexed: 'indexed',
  Error: 'error',
  Deleted: 'deleted',
} as const;

export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const DOCUMENT_STATUS_VALUES = Object.values(DocumentStatus) as DocumentStatus[];
