import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Descriptions, Row, Skeleton, Typography } from 'antd';
import { integrationsApi } from '../api/endpoints';
import { Icons } from '../components/icons';
import { PageHead } from '../components/PageHead';
import { StatusTag } from '../components/StatusTag';
import type { HealthResult } from '../types';

const { Text } = Typography;

const LABELS: Record<string, string> = {
  dify: 'Dify — RAG-движок',
  lmstudio: 'LM Studio — эмбеддинги',
  qdrant: 'Qdrant — векторное хранилище',
  s3: 'Cloud.ru S3 — оригиналы',
};

export function IntegrationsPage(): React.ReactElement {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['integrations-health'],
    queryFn: integrationsApi.health,
  });

  if (isLoading) return <Skeleton active />;

  return (
    <>
      <PageHead
        desc="Состояние внешних сервисов конвейера обработки"
        extra={
          <Button icon={Icons.refresh} loading={isFetching} onClick={() => void refetch()}>
            Проверить
          </Button>
        }
      />
      <Row gutter={[16, 16]}>
        {(data ?? []).map((h: HealthResult) => (
          <Col xs={24} md={12} key={h.provider}>
            <Card
              size="small"
              title={LABELS[h.provider] ?? h.provider}
              extra={<StatusTag status={h.status} />}
            >
              {h.provider === 'qdrant' && (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="Qdrant управляется Dify. Приложение не пишет в Qdrant напрямую."
                />
              )}
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Задержка">
                  <Text className="num">{h.latencyMs ?? '—'} мс</Text>
                </Descriptions.Item>
                {Object.entries(h.details).map(([k, v]) => (
                  <Descriptions.Item key={k} label={k}>
                    <Text className="mono" style={{ fontSize: 12 }}>
                      {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </Text>
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
