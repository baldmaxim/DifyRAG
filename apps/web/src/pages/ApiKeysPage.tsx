import { API_KEY_SCOPE_VALUES } from '@dkp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App as AntApp, Alert, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Typography } from 'antd';
import { useState } from 'react';
import { apiErrorMessage } from '../api/client';
import { apiKeysApi } from '../api/endpoints';
import type { ApiKeySummary } from '../types';

export function ApiKeysPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['api-keys'], queryFn: apiKeysApi.list });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; scopes: string[] }) => apiKeysApi.create(body),
    onSuccess: (created) => {
      setCreatedKey(created.key);
      setOpen(false);
      form.resetFields();
      void queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (err) => message.error(apiErrorMessage(err)),
  });
  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiKeysApi.revoke(id),
    onSuccess: () => {
      message.success('Ключ отозван');
      void queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  return (
    <Card
      title="API-ключи"
      extra={
        <Button type="primary" onClick={() => setOpen(true)}>
          Создать ключ
        </Button>
      }
    >
      <Table<ApiKeySummary>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        columns={[
          { title: 'Название', dataIndex: 'name' },
          { title: 'Prefix', dataIndex: 'prefix' },
          { title: 'Scopes', dataIndex: 'scopes', render: (s: string[]) => s.join(', ') },
          { title: 'Статус', dataIndex: 'status' },
          {
            title: '',
            render: (_, row) =>
              row.status === 'active' ? (
                <Popconfirm title="Отозвать ключ?" onConfirm={() => revokeMutation.mutate(row.id)}>
                  <Button danger size="small">
                    Revoke
                  </Button>
                </Popconfirm>
              ) : null,
          },
        ]}
      />

      <Modal title="Новый API-ключ" open={open} onCancel={() => setOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="scopes" label="Scopes" rules={[{ required: true }]}>
            <Select mode="multiple" options={API_KEY_SCOPE_VALUES.map((s) => ({ value: s }))} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
            Создать
          </Button>
        </Form>
      </Modal>

      <Modal
        title="Ключ создан — сохраните его, он показывается один раз"
        open={Boolean(createdKey)}
        onCancel={() => setCreatedKey(null)}
        onOk={() => setCreatedKey(null)}
      >
        <Alert type="warning" showIcon message="Секрет больше не будет показан" style={{ marginBottom: 12 }} />
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text copyable code>
            {createdKey}
          </Typography.Text>
        </Space>
      </Modal>
    </Card>
  );
}
