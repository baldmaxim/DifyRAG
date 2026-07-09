import { useQuery } from '@tanstack/react-query';
import { Avatar, Card, Col, Empty, List, Row, Skeleton, Space, Statistic, Typography, theme as antdTheme } from 'antd';
import { integrationsApi, reportingApi } from '../api/endpoints';
import { Icons } from '../components/icons';
import { PageHead } from '../components/PageHead';
import { StatusTag } from '../components/StatusTag';

const { Text } = Typography;

interface Stage {
  l: string;
  keys: string[];
  col: string;
}

function PipelineStrip({ byStatus }: { byStatus: Record<string, number> }): React.ReactElement {
  const { token } = antdTheme.useToken();
  const sum = (keys: string[]): number => keys.reduce((n, k) => n + (byStatus[k] ?? 0), 0);
  const stages: Stage[] = [
    { l: 'В очереди', keys: ['queued'], col: token.colorTextSecondary },
    { l: 'Парсинг', keys: ['parsing'], col: token.colorInfo },
    { l: 'Очистка', keys: ['cleaning'], col: token.colorInfo },
    { l: 'Разбиение', keys: ['splitting'], col: token.colorInfo },
    { l: 'Индексация', keys: ['indexing', 'processing'], col: '#13A8A8' },
    { l: 'Проиндексировано', keys: ['indexed', 'completed', 'active'], col: token.colorSuccess },
    { l: 'Ошибки', keys: ['error'], col: token.colorError },
  ];
  return (
    <Card
      size="small"
      styles={{ body: { padding: '6px 8px' } }}
      title={
        <Space size={8}>
          {Icons.queue}
          <span>Конвейер обработки — сейчас</span>
        </Space>
      }
    >
      <div className="pipe" style={{ '--pipe-border': token.colorBorderSecondary } as React.CSSProperties}>
        {stages.map((s, i) => (
          <div
            key={i}
            className="pipe-stage"
            style={{
              background: token.colorBgContainer,
              borderTop: `1px solid ${token.colorBorderSecondary}`,
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <div className="pipe-count" style={{ color: s.col }}>
              {sum(s.keys)}
            </div>
            <div className="pipe-label" style={{ color: token.colorTextTertiary }}>
              {s.l}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function DashboardPage(): React.ReactElement {
  const { token } = antdTheme.useToken();
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: reportingApi.dashboard });
  const { data: audit } = useQuery({ queryKey: ['audit-logs', 'recent'], queryFn: () => reportingApi.auditLogs({}) });
  const { data: health } = useQuery({ queryKey: ['integrations-health'], queryFn: integrationsApi.health });

  if (isLoading) return <Skeleton active />;
  if (!data) return <Empty description="Нет данных" />;

  const byStatus = data.documentsByStatus;
  const indexed = (byStatus.indexed ?? 0) + (byStatus.completed ?? 0) + (byStatus.active ?? 0);
  const pct = data.documents ? Math.round((indexed / data.documents) * 1000) / 10 : 0;
  const queued = byStatus.queued ?? 0;

  const kpi = [
    { t: 'Проектов', v: data.projects, suffix: '' },
    { t: 'Документов', v: data.documents, suffix: '' },
    { t: 'Проиндексировано', v: pct, suffix: '%', d: `${indexed} из ${data.documents}` },
    { t: 'Документов с ошибкой', v: data.errorDocuments, d: 'требуют внимания', warn: true },
    { t: 'Задач в очереди', v: queued, suffix: '' },
  ];

  return (
    <>
      <PageHead title="Дашборд" desc="Состояние хранилища, конвейера обработки и интеграций" />
      <Row gutter={[16, 16]}>
        {kpi.map((k, i) => (
          <Col xs={12} md={8} xl={5} flex="1 1 180px" key={i}>
            <Card size="small" className="kpi-card">
              <Statistic
                title={k.t}
                value={k.v}
                suffix={k.suffix}
                valueStyle={{ color: k.warn ? token.colorError : token.colorText, fontWeight: 600 }}
              />
              {k.d && (
                <Text type={k.warn ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
                  {k.d}
                </Text>
              )}
            </Card>
          </Col>
        ))}
      </Row>
      <div style={{ height: 16 }} />
      <PipelineStrip byStatus={byStatus} />
      <div style={{ height: 16 }} />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={9}>
          <Card size="small" title="Последние загрузки" styles={{ body: { padding: '4px 0' } }}>
            <List
              size="small"
              dataSource={data.recentDocuments}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Пусто" /> }}
              renderItem={(d) => (
                <List.Item style={{ padding: '10px 16px' }} actions={[<StatusTag key="s" status={d.status} />]}>
                  <List.Item.Meta
                    avatar={<span style={{ color: token.colorTextTertiary }}>{Icons.file}</span>}
                    title={
                      <Text style={{ fontSize: 13.5 }} ellipsis>
                        {d.title}
                      </Text>
                    }
                    description={
                      <Text type="secondary" className="num" style={{ fontSize: 12 }}>
                        {new Date(d.updatedAt).toLocaleString()}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={9}>
          <Card size="small" title="Журнал действий" styles={{ body: { padding: '4px 0' } }}>
            <List
              size="small"
              dataSource={(audit ?? []).slice(0, 6)}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Пусто" /> }}
              renderItem={(a) => (
                <List.Item style={{ padding: '10px 16px' }}>
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        size={26}
                        style={{ background: token.colorFillSecondary, color: token.colorTextSecondary, fontSize: 11, fontWeight: 600 }}
                      >
                        {a.actorType.slice(0, 1).toUpperCase()}
                      </Avatar>
                    }
                    title={
                      <Text style={{ fontSize: 13.5 }}>
                        <b>{a.actorType}</b> · <span className="mono">{a.action}</span>
                      </Text>
                    }
                    description={
                      <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                        {a.resourceType} · {new Date(a.createdAt).toLocaleString()}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={6}>
          <Card size="small" title="Интеграции">
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              {(health ?? []).map((h) => (
                <div key={h.provider} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13.5 }}>{h.provider}</Text>
                  <Space size={8}>
                    {h.latencyMs != null && (
                      <Text type="secondary" className="num" style={{ fontSize: 12 }}>
                        {h.latencyMs} мс
                      </Text>
                    )}
                    <StatusTag status={h.status} />
                  </Space>
                </div>
              ))}
              {!health?.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Нет данных" />}
            </Space>
          </Card>
        </Col>
      </Row>
    </>
  );
}
