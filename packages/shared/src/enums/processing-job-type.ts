export const ProcessingJobType = {
  DifyCreateDocument: 'dify_create_document',
  DifyUpdateDocument: 'dify_update_document',
  DifyArchiveDocument: 'dify_archive_document',
  DifyRestoreDocument: 'dify_restore_document',
  DifyReindexDocument: 'dify_reindex_document',
  DifyPollIndexingStatus: 'dify_poll_indexing_status',
} as const;

export type ProcessingJobType = (typeof ProcessingJobType)[keyof typeof ProcessingJobType];

export const PROCESSING_JOB_TYPE_VALUES = Object.values(ProcessingJobType) as ProcessingJobType[];
