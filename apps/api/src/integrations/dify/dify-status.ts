import type { DifyMappingIndexingStatus } from '@prisma/client';

const KNOWN: Record<string, DifyMappingIndexingStatus> = {
  pending: 'pending',
  uploading: 'uploading',
  waiting: 'waiting',
  parsing: 'parsing',
  cleaning: 'cleaning',
  splitting: 'splitting',
  indexing: 'indexing',
  completed: 'completed',
  error: 'error',
  archived: 'archived',
  disabled: 'disabled',
  paused: 'waiting',
};

/** Normalize a Dify indexing_status string into our enum (default: waiting). */
export function mapDifyIndexingStatus(raw: string | undefined | null): DifyMappingIndexingStatus {
  if (!raw) return 'waiting';
  return KNOWN[raw.toLowerCase()] ?? 'waiting';
}
