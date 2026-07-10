import { Button, Space, Tooltip } from 'antd';
import { useIsMobile } from '../hooks/useIsMobile';
import { Icons } from './icons';

export interface RowAction {
  icon: string;
  tip: string;
  onClick?: () => void;
  danger?: boolean;
}

/** Компактный ряд иконок-действий для строк таблицы. На телефонах — тап-цели ≥44px. */
export function RowActions({ items }: { items: RowAction[] }): React.ReactElement {
  const isMobile = useIsMobile();
  return (
    <Space size={isMobile ? 8 : 2}>
      {items.map((a, i) => (
        <Tooltip title={a.tip} key={i}>
          <Button
            type="text"
            size={isMobile ? 'middle' : 'small'}
            danger={a.danger}
            icon={Icons[a.icon] ?? Icons.minus}
            style={isMobile ? { minWidth: 44, height: 44 } : undefined}
            onClick={(e) => {
              e.stopPropagation();
              a.onClick?.();
            }}
          />
        </Tooltip>
      ))}
    </Space>
  );
}
