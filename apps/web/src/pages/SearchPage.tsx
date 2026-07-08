import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Card, Form, Input, List, Select, Space, Tag, Typography } from 'antd';
import { apiErrorMessage } from '../api/client';
import { searchApi } from '../api/endpoints';
import type { SearchResponse } from '../types';

export function SearchPage(): React.ReactElement {
  const [form] = Form.useForm();
  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => searchApi.run(body),
  });

  const onFinish = (values: Record<string, unknown>): void => {
    mutation.mutate({ ...values, scope: values.scope ?? 'project' });
  };

  const result: SearchResponse | undefined = mutation.data;

  return (
    <>
      <Typography.Title level={3}>Поиск (RAG через Dify)</Typography.Title>
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="query" label="Запрос" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="Найди КС-2 по заказчику за июнь 2026" />
          </Form.Item>
          <Space wrap>
            <Form.Item name="scope" label="Scope" initialValue="project">
              <Select
                style={{ width: 140 }}
                options={['project', 'company', 'people', 'reference', 'templates'].map((v) => ({ value: v }))}
              />
            </Form.Item>
            <Form.Item name="project_code" label="Код проекта">
              <Input placeholder="zilart-lot-31" />
            </Form.Item>
            <Form.Item name="folder_path" label="Папка">
              <Input placeholder="07-finance/03-ks2-ks3" />
            </Form.Item>
            <Form.Item name="document_type" label="Тип">
              <Input placeholder="ks2" />
            </Form.Item>
            <Form.Item name="mode" label="Режим" initialValue="chunks">
              <Select style={{ width: 120 }} options={[{ value: 'chunks' }, { value: 'answer' }]} />
            </Form.Item>
          </Space>
          <div>
            <Button type="primary" htmlType="submit" loading={mutation.isPending}>
              Искать
            </Button>
          </div>
        </Form>
      </Card>

      {mutation.isError && (
        <Alert type="error" style={{ marginTop: 16 }} message={apiErrorMessage(mutation.error)} />
      )}

      {result && (
        <div style={{ marginTop: 16 }}>
          {result.warnings.map((w) => (
            <Alert key={w} type="warning" style={{ marginBottom: 8 }} message={w} showIcon />
          ))}
          {result.answer && (
            <Card style={{ marginBottom: 16 }} title="Ответ">
              <Typography.Paragraph>{result.answer}</Typography.Paragraph>
            </Card>
          )}
          <List
            dataSource={result.chunks}
            locale={{ emptyText: 'Ничего не найдено' }}
            renderItem={(chunk) => (
              <Card size="small" style={{ marginBottom: 8 }}>
                <Space style={{ marginBottom: 8 }}>
                  <Tag color="blue">score {chunk.score.toFixed(2)}</Tag>
                  {chunk.document_type && <Tag>{chunk.document_type}</Tag>}
                  {chunk.project_code && <Tag color="geekblue">{chunk.project_code}</Tag>}
                </Space>
                <Typography.Paragraph>{chunk.content}</Typography.Paragraph>
                <Typography.Text type="secondary">
                  {chunk.document_title} · {chunk.folder_path}
                </Typography.Text>
              </Card>
            )}
          />
        </div>
      )}
    </>
  );
}
