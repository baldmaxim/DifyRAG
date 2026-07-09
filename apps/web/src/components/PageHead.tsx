import { Space, theme as antdTheme } from 'antd';
import type { ReactNode } from 'react';

interface Props {
  title: ReactNode;
  desc?: ReactNode;
  extra?: ReactNode;
}

/** Единая шапка страницы: заголовок + описание слева, действия справа. */
export function PageHead({ title, desc, extra }: Props): React.ReactElement {
  const { token } = antdTheme.useToken();
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title" style={{ color: token.colorText }}>
          {title}
        </h1>
        {desc && (
          <div className="page-desc" style={{ color: token.colorTextSecondary }}>
            {desc}
          </div>
        )}
      </div>
      {extra && (
        <Space wrap size={8}>
          {extra}
        </Space>
      )}
    </div>
  );
}
