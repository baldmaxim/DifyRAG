import { useQuery } from '@tanstack/react-query';
import { Card, Descriptions, Drawer, Table, Tag, Typography, theme as antdTheme } from 'antd';
import { useState } from 'react';
import { reportingApi } from '../api/endpoints';
import type { AuditLogRow } from '../types';

const { Text } = Typography;

function JsonBlock({ value }: { value: unknown }): React.ReactElement {
  const { token } = antdTheme.useToken();
  return (
    <pre
      className="mono"
      style={{
        margin: 0,
        padding: '12px 14px',
        borderRadius: 8,
        fontSize: 12,
        lineHeight: 1.65,
        overflow: 'auto',
        background: token.colorFillQuaternary,
        border: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      {value == null ? '—' : JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function AuditLogsPage(): React.ReactElement {
  const [selected, setSelected] = useState<AuditLogRow | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['audit-logs'], queryFn: () => reportingApi.auditLogs({}) });

  return (
    <>
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table<AuditLogRow>
          rowKey="id"
          loading={isLoading}
          dataSource={data ?? []}
          pagination={{ pageSize: 20, size: 'small', showTotal: (t) => `Всего: ${t}` }}
          onRow={(r) => ({ onClick: () => setSelected(r), style: { cursor: 'pointer' } })}
          columns={[
            {
              title: 'Время',
              dataIndex: 'createdAt',
              width: 170,
              render: (v: string) => (
                <Text className="num" style={{ fontSize: 12.5 }}>
                  {new Date(v).toLocaleString()}
                </Text>
              ),
            },
            { title: 'Действие', dataIndex: 'action', render: (v: string) => <Text className="mono">{v}</Text> },
            { title: 'Ресурс', dataIndex: 'resourceType', width: 160 },
            { title: 'Актор', dataIndex: 'actorType', width: 130, render: (v: string) => <Tag>{v}</Tag> },
          ]}
        />
      </Card>

      <Drawer title="Детали события" open={Boolean(selected)} onClose={() => setSelected(null)} width={520}>
        {selected && (
          <>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Действие">
                <Text className="mono">{selected.action}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Ресурс">
                {selected.resourceType} · <Text className="mono">{selected.resourceId}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Актор">{selected.actorType}</Descriptions.Item>
              <Descriptions.Item label="Время">{new Date(selected.createdAt).toLocaleString()}</Descriptions.Item>
            </Descriptions>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Было
            </Text>
            <JsonBlock value={selected.before} />
            <div style={{ height: 12 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Стало
            </Text>
            <JsonBlock value={selected.after} />
          </>
        )}
      </Drawer>
    </>
  );
}
