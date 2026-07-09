import { useMutation } from '@tanstack/react-query';
import { Alert, Badge, Card, Empty, Form, Input, Select, Skeleton, Space, Tag, Typography, theme as antdTheme } from 'antd';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiErrorMessage } from '../api/client';
import { searchApi } from '../api/endpoints';
import { Icons } from '../components/icons';
import type { SearchResponse } from '../types';

const { Paragraph, Text } = Typography;

export function SearchPage(): React.ReactElement {
  const { token } = antdTheme.useToken();
  const [form] = Form.useForm();
  const [params] = useSearchParams();
  const mutation = useMutation({ mutationFn: (body: Record<string, unknown>) => searchApi.run(body) });

  const onFinish = (values: Record<string, unknown>): void => {
    mutation.mutate({ ...values, scope: values.scope ?? 'project' });
  };

  // Префилл из глобального поиска (?q=…) и автозапуск.
  useEffect(() => {
    const q = params.get('q');
    if (q) {
      form.setFieldValue('query', q);
      mutation.mutate({ query: q, scope: 'project', mode: 'chunks' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const result: SearchResponse | undefined = mutation.data;

  return (
    <>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Form form={form} onFinish={onFinish} initialValues={{ scope: 'project', mode: 'chunks' }}>
          <Form.Item name="query" rules={[{ required: true, message: 'Введите запрос' }]} style={{ marginBottom: 12 }}>
            <Input.Search
              size="large"
              enterButton="Найти"
              placeholder="Найди КС-2 по заказчику за июнь 2026"
              prefix={<span style={{ color: token.colorTextTertiary }}>{Icons.search}</span>}
              onSearch={() => form.submit()}
              loading={mutation.isPending}
            />
          </Form.Item>
          <Space wrap>
            <Form.Item name="scope" noStyle>
              <Select
                size="small"
                style={{ minWidth: 130 }}
                options={['project', 'company', 'people', 'reference', 'templates'].map((v) => ({ value: v }))}
              />
            </Form.Item>
            <Form.Item name="project_code" noStyle>
              <Input size="small" style={{ width: 150 }} placeholder="Код проекта" className="mono" />
            </Form.Item>
            <Form.Item name="folder_path" noStyle>
              <Input size="small" style={{ width: 180 }} placeholder="Папка (07-finance/…)" />
            </Form.Item>
            <Form.Item name="document_type" noStyle>
              <Input size="small" style={{ width: 130 }} placeholder="Тип (ks2)" />
            </Form.Item>
            <Form.Item name="mode" noStyle>
              <Select size="small" style={{ width: 130 }} options={[{ value: 'chunks', label: 'Фрагменты' }, { value: 'answer', label: 'Ответ' }]} />
            </Form.Item>
          </Space>
        </Form>
      </Card>

      {mutation.isError && (
        <Alert type="error" showIcon style={{ marginBottom: 16 }} message={apiErrorMessage(mutation.error)} />
      )}
      {mutation.isPending && (
        <Card size="small">
          <Skeleton active paragraph={{ rows: 3 }} />
        </Card>
      )}

      {result && (
        <>
          {result.warnings.map((w) => (
            <Alert key={w} type="warning" style={{ marginBottom: 8 }} message={w} showIcon />
          ))}
          {result.answer && (
            <Card style={{ marginBottom: 16 }} title="Ответ" size="small">
              <Paragraph style={{ marginBottom: 0 }}>{result.answer}</Paragraph>
            </Card>
          )}
          {result.chunks.length === 0 && !result.answer ? (
            <Card size="small">
              <Empty description="По запросу ничего не найдено. Расширьте область или измените формулировку." />
            </Card>
          ) : (
            <>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Найдено фрагментов: {result.chunks.length}
              </Text>
              <div style={{ height: 10 }} />
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {result.chunks.map((chunk, i) => (
                  <Card size="small" key={i} hoverable>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <Space size={10} wrap>
                        <Badge
                          count={chunk.score.toFixed(2)}
                          color={chunk.score > 0.9 ? token.colorSuccess : token.colorPrimary}
                          overflowCount={999}
                        />
                        <Text strong>{chunk.document_title ?? 'Документ'}</Text>
                        {chunk.project_code && (
                          <Tag className="mono" style={{ fontSize: 11 }}>
                            {chunk.project_code}
                          </Tag>
                        )}
                        {chunk.document_type && <Tag>{chunk.document_type}</Tag>}
                      </Space>
                    </div>
                    <Paragraph style={{ margin: '8px 0 6px', fontSize: 13.5, lineHeight: 1.65 }}>
                      {chunk.content}
                    </Paragraph>
                    {chunk.folder_path && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {Icons.folder} {chunk.folder_path}
                      </Text>
                    )}
                  </Card>
                ))}
              </Space>
            </>
          )}
        </>
      )}
    </>
  );
}
