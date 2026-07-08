import { useQuery } from '@tanstack/react-query';
import { Card, Table } from 'antd';
import { reportingApi } from '../api/endpoints';
import { StatusTag } from '../components/StatusTag';
import type { DifyDatasetMappingRow } from '../types';

export function DifyDatasetsPage(): React.ReactElement {
  const { data, isLoading } = useQuery({ queryKey: ['dify-datasets'], queryFn: reportingApi.difyDatasets });

  return (
    <Card title="Dify Datasets">
      <Table<DifyDatasetMappingRow>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        columns={[
          { title: 'Dataset', dataIndex: 'difyDatasetName' },
          { title: 'Scope', dataIndex: 'scope' },
          { title: 'Группа', dataIndex: 'folderGroup' },
          { title: 'Dify ID', dataIndex: 'difyDatasetId', ellipsis: true },
          { title: 'Документов', dataIndex: 'documentCount' },
          { title: 'Статус', dataIndex: 'status', render: (s: string) => <StatusTag status={s} /> },
          { title: 'Ошибка', dataIndex: 'errorMessage', ellipsis: true },
        ]}
      />
    </Card>
  );
}
