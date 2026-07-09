import { Tag } from 'antd';
import { DKP_STATUS } from '../dkp-theme';
import { Icons } from './icons';

type StatusMeta = { label: string; color: string; icon?: string; live?: boolean };

const STATUS = DKP_STATUS as Record<string, StatusMeta>;

export function StatusTag({ status }: { status: string }): React.ReactElement {
  const meta: StatusMeta = STATUS[status] ?? { label: status, color: 'default', icon: 'minus' };
  const icon = Icons[meta.icon ?? 'minus'] ?? Icons.minus;
  return (
    <Tag
      color={meta.color}
      className={meta.live ? 'st-live' : undefined}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginInlineEnd: 0, fontWeight: 500 }}
    >
      {icon}
      {meta.label}
    </Tag>
  );
}
