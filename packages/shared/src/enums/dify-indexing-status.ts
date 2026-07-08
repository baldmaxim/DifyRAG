/**
 * Mirrors the Dify document indexing lifecycle plus the archived/disabled
 * states the portal tracks. All statuses must be surfaced to the user.
 */
export const DifyIndexingStatus = {
  Pending: 'pending',
  Uploading: 'uploading',
  Waiting: 'waiting',
  Parsing: 'parsing',
  Cleaning: 'cleaning',
  Splitting: 'splitting',
  Indexing: 'indexing',
  Completed: 'completed',
  Error: 'error',
  Archived: 'archived',
  Disabled: 'disabled',
} as const;

export type DifyIndexingStatus = (typeof DifyIndexingStatus)[keyof typeof DifyIndexingStatus];

export const DIFY_INDEXING_STATUS_VALUES = Object.values(
  DifyIndexingStatus,
) as DifyIndexingStatus[];

/** Statuses that mean Dify is still working and the poller should keep polling. */
export const DIFY_IN_PROGRESS_STATUSES: DifyIndexingStatus[] = [
  DifyIndexingStatus.Pending,
  DifyIndexingStatus.Uploading,
  DifyIndexingStatus.Waiting,
  DifyIndexingStatus.Parsing,
  DifyIndexingStatus.Cleaning,
  DifyIndexingStatus.Splitting,
  DifyIndexingStatus.Indexing,
];
