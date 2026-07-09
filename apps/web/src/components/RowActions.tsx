import { Button, Space, Tooltip } from 'antd';
import { Icons } from './icons';

export interface RowAction {
  icon: string;
  tip: string;
  onClick?: () => void;
  danger?: boolean;
}

/** Компактный ряд иконок-действий для строк таблицы. */
export function RowActions({ items }: { items: RowAction[] }): React.ReactElement {
  return (
    <Space size={2}>
      {items.map((a, i) => (
        <Tooltip title={a.tip} key={i}>
          <Button
            type="text"
            size="small"
            danger={a.danger}
            icon={Icons[a.icon] ?? Icons.minus}
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
