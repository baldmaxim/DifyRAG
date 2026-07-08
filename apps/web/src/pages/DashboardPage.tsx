import { useQuery } from '@tanstack/react-query';
import { Card, Col, Empty, List, Row, Skeleton, Statistic, Typography } from 'antd';
import { reportingApi } from '../api/endpoints';
import { StatusTag } from '../components/StatusTag';

export function DashboardPage(): React.ReactElement {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: reportingApi.dashboard });

  if (isLoading) return <Skeleton active />;
  if (!data) return <Empty description="Нет данных" />;

  const statuses = Object.entries(data.documentsByStatus);

  return (
    <>
      <Typography.Title level={3}>Дашборд</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Проекты" value={data.projects} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Документы" value={data.documents} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Ошибки обработки" value={data.errorDocuments} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Документы по статусам">
            {statuses.length === 0 ? (
              <Empty />
            ) : (
              <List
                dataSource={statuses}
                renderItem={([status, count]) => (
                  <List.Item>
                    <StatusTag status={status} />
                    <span>{count}</span>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Последние документы">
            <List
              dataSource={data.recentDocuments}
              locale={{ emptyText: <Empty /> }}
              renderItem={(doc) => (
                <List.Item actions={[<StatusTag key="s" status={doc.status} />]}>
                  {doc.title}
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
