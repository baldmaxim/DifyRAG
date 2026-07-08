import { Tag } from 'antd';

const DOCUMENT_STATUS_COLORS: Record<string, string> = {
  draft: 'default',
  active: 'blue',
  uploading: 'processing',
  stored: 'cyan',
  queued: 'gold',
  processing: 'processing',
  indexed: 'green',
  error: 'red',
  deleted: 'default',
};

const JOB_STATUS_COLORS: Record<string, string> = {
  queued: 'gold',
  running: 'processing',
  success: 'green',
  failed: 'red',
  skipped: 'default',
};

const HEALTH_COLORS: Record<string, string> = {
  ok: 'green',
  degraded: 'orange',
  down: 'red',
  setup_required: 'gold',
};

export function StatusTag({ status }: { status: string }): React.ReactElement {
  const color =
    DOCUMENT_STATUS_COLORS[status] ?? JOB_STATUS_COLORS[status] ?? HEALTH_COLORS[status] ?? 'default';
  return <Tag color={color}>{status}</Tag>;
}
