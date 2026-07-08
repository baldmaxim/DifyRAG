import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App as AntApp, Button, Card, Table } from 'antd';
import { processingApi } from '../api/endpoints';
import { StatusTag } from '../components/StatusTag';
import type { ProcessingJobRow } from '../types';

export function ProcessingJobsPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
  const { data, isLoading } = useQuery({
    queryKey: ['processing-jobs'],
    queryFn: () => processingApi.list(),
    refetchInterval: 5000,
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => processingApi.retry(id),
    onSuccess: () => {
      message.success('Задача перезапущена');
      void queryClient.invalidateQueries({ queryKey: ['processing-jobs'] });
    },
  });

  return (
    <Card title="Обработка (Dify jobs)">
      <Table<ProcessingJobRow>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        columns={[
          { title: 'Тип', dataIndex: 'jobType' },
          { title: 'Статус', dataIndex: 'status', render: (s: string) => <StatusTag status={s} /> },
          { title: 'Попытки', dataIndex: 'attempts' },
          { title: 'Ошибка', dataIndex: 'errorMessage', ellipsis: true },
          {
            title: '',
            render: (_, row) =>
              row.status === 'failed' ? (
                <Button size="small" onClick={() => retryMutation.mutate(row.id)}>
                  Retry
                </Button>
              ) : null,
          },
        ]}
      />
    </Card>
  );
}
