import { useQuery } from '@tanstack/react-query';
import { Card, Table, Typography } from 'antd';
import { PageHead } from '../components/PageHead';
import { StatusTag } from '../components/StatusTag';
import { reportingApi } from '../api/endpoints';
import type { DifyDatasetMappingRow } from '../types';

const { Text } = Typography;

export function DifyDatasetsPage(): React.ReactElement {
  const { data, isLoading } = useQuery({ queryKey: ['dify-datasets'], queryFn: reportingApi.difyDatasets });

  return (
    <>
      <PageHead
        title="Dify Datasets"
        desc="Соответствие «проект · раздел» → датасет Dify (project_{код}__раздел). Только чтение."
      />
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table<DifyDatasetMappingRow>
          rowKey="id"
          loading={isLoading}
          dataSource={data ?? []}
          pagination={{ pageSize: 15, size: 'small', showTotal: (t) => `Всего: ${t}` }}
          columns={[
            {
              title: 'Датасет',
              dataIndex: 'difyDatasetName',
              render: (v: string) => <Text className="mono">{v}</Text>,
            },
            { title: 'Scope', dataIndex: 'scope', width: 110 },
            { title: 'Группа', dataIndex: 'folderGroup', width: 160 },
            {
              title: 'Dify ID',
              dataIndex: 'difyDatasetId',
              width: 180,
              ellipsis: true,
              render: (v?: string) => (
                <Text type="secondary" className="mono">
                  {v ?? '—'}
                </Text>
              ),
            },
            { title: 'Документов', dataIndex: 'documentCount', width: 110, align: 'right', className: 'col-num' },
            { title: 'Статус', dataIndex: 'status', width: 150, render: (s: string) => <StatusTag status={s} /> },
            { title: 'Ошибка', dataIndex: 'errorMessage', ellipsis: true, render: (v?: string) => v ?? '—' },
          ]}
        />
      </Card>
    </>
  );
}
