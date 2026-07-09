import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App as AntApp, Alert, Button, Card, Drawer, Empty, Form, Input, Skeleton, Space, Table, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../api/client';
import { projectsApi } from '../api/endpoints';
import { Icons } from '../components/icons';
import { useShake } from '../hooks/useMotion';
import { PageHead } from '../components/PageHead';
import { RowActions } from '../components/RowActions';
import { StatusTag } from '../components/StatusTag';
import type { Project } from '../types';

const { Text } = Typography;

export function ProjectsPage(): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const { ref: shakeRef, trigger: shake } = useShake<HTMLDivElement>();

  const { data, isLoading, isError, error, refetch } = useQuery({
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
    <>
      <PageHead
        desc="Объекты строительства и их хранилища документов"
        extra={
          <Button type="primary" icon={Icons.plus} onClick={() => setOpen(true)}>
            Новый проект
          </Button>
        }
      />
      <Input.Search
        placeholder="Поиск по коду / названию / заказчику"
        allowClear
        onSearch={setSearch}
        style={{ maxWidth: 360, marginBottom: 16 }}
      />
      <Card size="small" styles={{ body: { padding: isError ? 16 : 0 } }}>
        {isLoading ? (
          <div style={{ padding: 16 }}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ) : isError ? (
          <Alert
            type="error"
            showIcon
            message="Не удалось загрузить проекты"
            description={apiErrorMessage(error)}
            action={
              <Button size="small" danger onClick={() => void refetch()}>
                Повторить
              </Button>
            }
          />
        ) : (data ?? []).length === 0 ? (
          <div style={{ padding: 24 }}>
            <Empty description="Проектов пока нет — создайте первый объект">
              <Button type="primary" icon={Icons.plus} onClick={() => setOpen(true)}>
                Создать проект
              </Button>
            </Empty>
          </div>
        ) : (
          <Table<Project>
            rowKey="id"
            dataSource={data ?? []}
            pagination={{ pageSize: 10, size: 'small', showTotal: (t) => `Всего: ${t}` }}
            onRow={(record) => ({ onClick: () => navigate(`/projects/${record.id}`), style: { cursor: 'pointer' } })}
            columns={[
              { title: 'Код', dataIndex: 'code', width: 96, render: (v: string) => <Text className="mono">{v}</Text> },
              {
                title: 'Название',
                dataIndex: 'name',
                render: (v: string) => (
                  <Text strong style={{ fontSize: 13.5 }}>
                    {v}
                  </Text>
                ),
              },
              { title: 'Заказчик', dataIndex: 'customerName', render: (v?: string) => v ?? '—' },
              { title: 'Статус', dataIndex: 'status', width: 130, render: (s: string) => <StatusTag status={s} /> },
              {
                title: '',
                key: 'a',
                width: 90,
                render: (_, r) => (
                  <RowActions
                    items={[
                      { icon: 'eye', tip: 'Открыть', onClick: () => navigate(`/projects/${r.id}`) },
                    ]}
                  />
                ),
              },
            ]}
          />
        )}
      </Card>

      <Drawer
        title="Новый проект"
        open={open}
        onClose={() => setOpen(false)}
        width={440}
        footer={
          <Space style={{ float: 'right' }}>
            <Button onClick={() => setOpen(false)}>Отмена</Button>
            <Button type="primary" loading={createMutation.isPending} onClick={() => form.submit()}>
              Создать проект
            </Button>
          </Space>
        }
      >
        <div ref={shakeRef} className="t-shake">
        <Form
          form={form}
          layout="vertical"
          requiredMark="optional"
          onFinish={(v) => createMutation.mutate(v)}
          onFinishFailed={shake}
        >
          <Form.Item
            name="code"
            label="Код проекта"
            tooltip="Латиницей. Используется в именах Dify-датасетов: project_{код}__раздел"
            rules={[{ required: true, pattern: /^[a-z0-9-]+$/, message: 'Латиница, цифры, дефис' }]}
          >
            <Input placeholder="zilart-lot-31" className="mono" />
          </Form.Item>
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input placeholder="ЖК «Туран»" />
          </Form.Item>
          <Form.Item name="customerName" label="Заказчик">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Адрес">
            <Input />
          </Form.Item>
          <Alert
            type="info"
            showIcon
            message="Структура папок 00–99 будет создана автоматически по стандартному шаблону."
          />
        </Form>
        </div>
      </Drawer>
    </>
  );
}
