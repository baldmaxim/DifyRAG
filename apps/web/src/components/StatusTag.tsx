import { SyncOutlined } from '@ant-design/icons';
import { Tag } from 'antd';
import { DKP_STATUS } from '../dkp-theme';

type StatusMeta = { label: string; color: string; live?: boolean };

const STATUS = DKP_STATUS as Record<string, StatusMeta>;

export function StatusTag({ status }: { status: string }): React.ReactElement {
  const meta: StatusMeta = STATUS[status] ?? { label: status, color: 'default' };
  return (
    <Tag color={meta.color} icon={meta.live ? <SyncOutlined spin /> : undefined}>
      {meta.label}
    </Tag>
  );
}
