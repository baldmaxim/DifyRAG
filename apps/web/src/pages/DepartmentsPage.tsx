import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App as AntApp, Button, Card, Col, Drawer, Form, Input, Row, Skeleton, Space, Typography } from 'antd';
import { useState } from 'react';
import { apiErrorMessage } from '../api/client';
import { departmentsApi } from '../api/endpoints';
import { Icons } from '../components/icons';
import { RowActions } from '../components/RowActions';
import type { Department } from '../types';

const { Text, Paragraph } = Typography;

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
      {isLoading ? (
        <Skeleton active />
      ) : (
        <Row gutter={[16, 16]}>
          {(data ?? []).map((dep) => (
            <Col xs={24} md={12} xl={8} key={dep.id}>
              <Card
                size="small"
                title={
                  <Space size={8}>
                    {Icons.depts}
                    {dep.name}
                  </Space>
                }
                extra={<RowActions items={[{ icon: 'edit', tip: 'Изменить', onClick: () => openEdit(dep) }]} />}
              >
                <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 8 }} ellipsis={{ rows: 2 }}>
                  {dep.description ?? 'Нет описания'}
                </Paragraph>
                {dep.skillsMarkdown && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {Icons.docs} компетенции заданы
                  </Text>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Drawer
        title={editing?.name}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        width={560}
        footer={
          <Space style={{ float: 'right' }}>
            <Button onClick={() => setEditing(null)}>Отмена</Button>
            <Button type="primary" loading={saveMutation.isPending} onClick={() => form.submit()}>
              Сохранить
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)}>
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="skillsMarkdown" label="Компетенции (markdown)">
            <Input.TextArea rows={10} className="mono" />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
