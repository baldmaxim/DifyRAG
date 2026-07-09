import { useQuery } from '@tanstack/react-query';
import { Card, Input, Space, Table, Typography, theme as antdTheme } from 'antd';
import { useState } from 'react';
import { documentsApi } from '../api/endpoints';
import { Icons } from '../components/icons';
import { PageHead } from '../components/PageHead';
import { StatusTag } from '../components/StatusTag';
import type { DocumentRow } from '../types';

const { Text } = Typography;

export function DocumentsPage(): React.ReactElement {
  const { token } = antdTheme.useToken();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['all-documents', search],
    queryFn: () => documentsApi.list({ search: search || undefined }),
  });

  return (
    <>
      <PageHead title="Документы" desc="Все документы по всем проектам компании" />
      <Input.Search
        placeholder="Поиск по названию / описанию / контрагенту"
        allowClear
        onSearch={setSearch}
        style={{ maxWidth: 380, marginBottom: 16 }}
      />
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table<DocumentRow>
          rowKey="id"
          loading={isLoading}
          dataSource={data ?? []}
          pagination={{ pageSize: 15, size: 'small', showTotal: (t) => `Всего: ${t}` }}
          columns={[
            {
              title: 'Документ',
              dataIndex: 'title',
              render: (v: string, r) => (
                <Space size={8}>
                  <span style={{ color: token.colorTextTertiary }}>{Icons.file}</span>
                  <div>
                    <Text strong style={{ fontSize: 13.5 }}>
                      {v}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {r.documentType?.name ?? r.documentType?.code ?? '—'}
                      {r.folder ? ` · ${r.folder.path}` : ''}
                    </Text>
                  </div>
                </Space>
              ),
            },
            { title: 'Контрагент', dataIndex: 'counterparty', width: 180, render: (v?: string) => v ?? '—' },
            { title: 'Статус', dataIndex: 'status', width: 150, render: (s: string) => <StatusTag status={s} /> },
            { title: 'Конфид.', dataIndex: 'confidentiality', width: 120 },
            {
              title: 'Обновлён',
              dataIndex: 'updatedAt',
              width: 160,
              render: (v: string) => (
                <Text type="secondary" className="num" style={{ fontSize: 12.5 }}>
                  {new Date(v).toLocaleString()}
                </Text>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
