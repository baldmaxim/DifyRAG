export const ProcessingJobStatus = {
  Queued: 'queued',
  Running: 'running',
  Success: 'success',
  Failed: 'failed',
  Skipped: 'skipped',
} as const;

export type ProcessingJobStatus = (typeof ProcessingJobStatus)[keyof typeof ProcessingJobStatus];

export const PROCESSING_JOB_STATUS_VALUES = Object.values(
  ProcessingJobStatus,
) as ProcessingJobStatus[];
