import { useQuery } from '@tanstack/react-query';
import { Card, Input, Table } from 'antd';
import { useState } from 'react';
import { documentsApi } from '../api/endpoints';
import { StatusTag } from '../components/StatusTag';
import type { DocumentRow } from '../types';

export function DocumentsPage(): React.ReactElement {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['all-documents', search],
    queryFn: () => documentsApi.list({ search: search || undefined }),
  });

  return (
    <Card title="Документы">
      <Input.Search
        placeholder="Поиск по названию / описанию / контрагенту"
        allowClear
        onSearch={setSearch}
        style={{ maxWidth: 380, marginBottom: 16 }}
      />
      <Table<DocumentRow>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        columns={[
          { title: 'Название', dataIndex: 'title' },
          { title: 'Тип', dataIndex: ['documentType', 'code'] },
          { title: 'Контрагент', dataIndex: 'counterparty' },
          { title: 'Статус', dataIndex: 'status', render: (s: string) => <StatusTag status={s} /> },
          { title: 'Конфид.', dataIndex: 'confidentiality' },
          {
            title: 'Обновлён',
            dataIndex: 'updatedAt',
            render: (v: string) => new Date(v).toLocaleDateString(),
          },
        ]}
      />
    </Card>
  );
}
