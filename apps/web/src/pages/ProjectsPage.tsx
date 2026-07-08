import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App as AntApp, Button, Card, Drawer, Form, Input, Space, Table, Tag } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../api/client';
import { projectsApi } from '../api/endpoints';
import type { Project } from '../types';

export function ProjectsPage(): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['projects', search],
    queryFn: () => projectsApi.list(search || undefined),
  });

  const createMutation = useMutation({
    mutationFn: (body: Partial<Project>) => projectsApi.create(body),
    onSuccess: () => {
      message.success('Проект создан');
      setOpen(false);
      form.resetFields();
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err) => message.error(apiErrorMessage(err)),
  });

  return (
    <Card
      title="Проекты"
      extra={
        <Button type="primary" onClick={() => setOpen(true)}>
          Новый проект
        </Button>
      }
    >
      <Input.Search
        placeholder="Поиск по коду / названию / заказчику"
        allowClear
        onSearch={setSearch}
        style={{ maxWidth: 360, marginBottom: 16 }}
      />
      <Table<Project>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        onRow={(record) => ({ onClick: () => navigate(`/projects/${record.id}`) })}
        columns={[
          { title: 'Код', dataIndex: 'code' },
          { title: 'Название', dataIndex: 'name' },
          { title: 'Заказчик', dataIndex: 'customerName' },
          {
            title: 'Статус',
            dataIndex: 'status',
            render: (s: string) => <Tag color={s === 'active' ? 'green' : 'default'}>{s}</Tag>,
          },
        ]}
      />

      <Drawer title="Новый проект" open={open} onClose={() => setOpen(false)} width={420}>
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="code" label="Код" rules={[{ required: true, pattern: /^[a-z0-9-]+$/ }]}>
            <Input placeholder="zilart-lot-31" />
          </Form.Item>
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="customerName" label="Заказчик">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Адрес">
            <Input />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
              Создать
            </Button>
            <Button onClick={() => setOpen(false)}>Отмена</Button>
          </Space>
        </Form>
      </Drawer>
    </Card>
  );
}
