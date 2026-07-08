import { ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Descriptions, Row, Skeleton, Typography } from 'antd';
import { integrationsApi } from '../api/endpoints';
import { StatusTag } from '../components/StatusTag';
import type { HealthResult } from '../types';

const LABELS: Record<string, string> = {
  dify: 'Dify (RAG-движок)',
  lmstudio: 'LM Studio (embeddings)',
  qdrant: 'Qdrant (vector store)',
  s3: 'Cloud.ru S3',
};

export function IntegrationsPage(): React.ReactElement {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['integrations-health'],
    queryFn: integrationsApi.health,
  });

  if (isLoading) return <Skeleton active />;

  return (
    <>
      <Typography.Title level={3}>
        Интеграции{' '}
        <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => void refetch()}>
          Проверить
        </Button>
      </Typography.Title>
      <Row gutter={[16, 16]}>
        {(data ?? []).map((h: HealthResult) => (
          <Col xs={24} md={12} key={h.provider}>
            <Card title={LABELS[h.provider] ?? h.provider} extra={<StatusTag status={h.status} />}>
              {h.provider === 'qdrant' && (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="Qdrant управляется Dify. Приложение не пишет в Qdrant напрямую."
                />
              )}
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Latency">{h.latencyMs ?? '—'} ms</Descriptions.Item>
                {Object.entries(h.details).map(([k, v]) => (
                  <Descriptions.Item key={k} label={k}>
                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
}
