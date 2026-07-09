import { Space, theme as antdTheme } from 'antd';
import type { ReactNode } from 'react';

interface Props {
  desc?: ReactNode;
  extra?: ReactNode;
}

/**
 * Тонкая панель действий страницы: контекст/описание слева, действия справа.
 * Заголовок страницы больше не дублируется — он выводится только в верхней панели (AppLayout).
 */
export function PageHead({ desc, extra }: Props): React.ReactElement | null {
  const { token } = antdTheme.useToken();
  if (!desc && !extra) return null;
  return (
    <div className="page-head t-reveal">
      <div className="page-desc" style={{ color: token.colorTextSecondary }}>
        {desc}
      </div>
      {extra && (
        <Space wrap size={8}>
          {extra}
        </Space>
      )}
    </div>
  );
}
