import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App as AntApp, Button, Card, Table, Typography } from 'antd';
import { processingApi } from '../api/endpoints';
import { Icons } from '../components/icons';
import { StatusTag } from '../components/StatusTag';
import type { ProcessingJobRow } from '../types';

const { Text } = Typography;

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
    <>
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table<ProcessingJobRow>
          rowKey="id"
          loading={isLoading}
          dataSource={data ?? []}
          pagination={{ pageSize: 15, size: 'small', showTotal: (t) => `Всего: ${t}` }}
          columns={[
            { title: 'Тип', dataIndex: 'jobType', width: 160, render: (v: string) => <Text className="mono">{v}</Text> },
            { title: 'Статус', dataIndex: 'status', width: 150, render: (s: string) => <StatusTag status={s} /> },
            { title: 'Попыток', dataIndex: 'attempts', width: 90, align: 'right', className: 'col-num' },
            {
              title: 'Ошибка',
              dataIndex: 'errorMessage',
              ellipsis: true,
              render: (v?: string) => (v ? <Text type="danger">{v}</Text> : '—'),
            },
            {
              title: 'Обновлена',
              dataIndex: 'updatedAt',
              width: 160,
              render: (v: string) => (
                <Text type="secondary" className="num" style={{ fontSize: 12.5 }}>
                  {new Date(v).toLocaleString()}
                </Text>
              ),
            },
            {
              title: '',
              width: 100,
              render: (_, row) =>
                row.status === 'failed' ? (
                  <Button size="small" icon={Icons.refresh} onClick={() => retryMutation.mutate(row.id)}>
                    Повтор
                  </Button>
                ) : null,
            },
          ]}
        />
      </Card>
    </>
  );
}
