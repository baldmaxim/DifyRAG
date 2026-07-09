import { API_KEY_SCOPE_VALUES } from '@dkp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App as AntApp, Alert, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { apiErrorMessage } from '../api/client';
import { apiKeysApi } from '../api/endpoints';
import { Icons } from '../components/icons';
import { PageHead } from '../components/PageHead';
import { StatusTag } from '../components/StatusTag';
import type { ApiKeySummary } from '../types';

const { Text } = Typography;

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
    <>
      <PageHead
        title="API-ключи"
        desc="Ключи внешнего доступа с ограниченными правами (scopes)"
        extra={
          <Button type="primary" icon={Icons.plus} onClick={() => setOpen(true)}>
            Создать ключ
          </Button>
        }
      />
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table<ApiKeySummary>
          rowKey="id"
          loading={isLoading}
          dataSource={data ?? []}
          pagination={{ pageSize: 15, size: 'small' }}
          columns={[
            {
              title: 'Название',
              dataIndex: 'name',
              render: (v: string) => (
                <Text strong style={{ fontSize: 13.5 }}>
                  {v}
                </Text>
              ),
            },
            { title: 'Prefix', dataIndex: 'prefix', render: (v: string) => <Text className="mono">{v}</Text> },
            {
              title: 'Scopes',
              dataIndex: 'scopes',
              render: (s: string[]) => (
                <Space size={4} wrap>
                  {s.map((x) => (
                    <Tag key={x} style={{ marginInlineEnd: 0 }}>
                      {x}
                    </Tag>
                  ))}
                </Space>
              ),
            },
            {
              title: 'Посл. использование',
              dataIndex: 'lastUsedAt',
              width: 180,
              render: (v: string | null) => (
                <Text type="secondary" className="num" style={{ fontSize: 12.5 }}>
                  {v ? new Date(v).toLocaleString() : '—'}
                </Text>
              ),
            },
            { title: 'Статус', dataIndex: 'status', width: 130, render: (s: string) => <StatusTag status={s} /> },
            {
              title: '',
              width: 100,
              render: (_, row) =>
                row.status === 'active' ? (
                  <Popconfirm title="Отозвать ключ?" onConfirm={() => revokeMutation.mutate(row.id)}>
                    <Button danger size="small" icon={Icons.cross}>
                      Отозвать
                    </Button>
                  </Popconfirm>
                ) : null,
            },
          ]}
        />
      </Card>

      <Modal
        title="Новый API-ключ"
        open={open}
        onCancel={() => setOpen(false)}
        okText="Создать"
        confirmLoading={createMutation.isPending}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input placeholder="ci-deploy-2026" />
          </Form.Item>
          <Form.Item name="scopes" label="Scopes" rules={[{ required: true }]}>
            <Select mode="multiple" options={API_KEY_SCOPE_VALUES.map((s) => ({ value: s }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Ключ создан — сохраните его, он показывается один раз"
        open={Boolean(createdKey)}
        onCancel={() => setCreatedKey(null)}
        onOk={() => setCreatedKey(null)}
      >
        <Alert
          type="warning"
          showIcon
          message="Секрет больше не будет показан"
          style={{ marginBottom: 12 }}
        />
        <Text copyable code className="mono" style={{ wordBreak: 'break-all' }}>
          {createdKey}
        </Text>
      </Modal>
    </>
  );
}
