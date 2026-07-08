import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App as AntApp, Button, Card, Col, Drawer, Form, Input, Row } from 'antd';
import { useState } from 'react';
import { apiErrorMessage } from '../api/client';
import { departmentsApi } from '../api/endpoints';
import type { Department } from '../types';

export function DepartmentsPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
  const [editing, setEditing] = useState<Department | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ['departments'], queryFn: departmentsApi.list });

  const saveMutation = useMutation({
    mutationFn: (values: { name: string; description?: string; skillsMarkdown?: string }) =>
      departmentsApi.update(editing!.id, values),
    onSuccess: () => {
      message.success('Сохранено');
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err) => message.error(apiErrorMessage(err)),
  });

  const openEdit = (dep: Department): void => {
    setEditing(dep);
    form.setFieldsValue(dep);
  };

  return (
    <>
      <Row gutter={[16, 16]}>
        {(data ?? []).map((dep) => (
          <Col xs={24} md={8} key={dep.id}>
            <Card
              title={dep.name}
              loading={isLoading}
              extra={<Button size="small" onClick={() => openEdit(dep)}>Изменить</Button>}
            >
              {dep.description ?? 'Нет описания'}
            </Card>
          </Col>
        ))}
      </Row>

      <Drawer title={editing?.name} open={Boolean(editing)} onClose={() => setEditing(null)} width={520}>
        <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)}>
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="skillsMarkdown" label="Компетенции (markdown)">
            <Input.TextArea rows={8} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
            Сохранить
          </Button>
        </Form>
      </Drawer>
    </>
  );
}
