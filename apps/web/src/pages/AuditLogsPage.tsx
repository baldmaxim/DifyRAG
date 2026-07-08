import { useQuery } from '@tanstack/react-query';
import { Card, Drawer, Table, Typography } from 'antd';
import { useState } from 'react';
import { reportingApi } from '../api/endpoints';
import type { AuditLogRow } from '../types';

export function AuditLogsPage(): React.ReactElement {
  const [selected, setSelected] = useState<AuditLogRow | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['audit-logs'], queryFn: () => reportingApi.auditLogs({}) });

  return (
    <Card title="Журнал аудита">
      <Table<AuditLogRow>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        onRow={(r) => ({ onClick: () => setSelected(r) })}
        columns={[
          { title: 'Время', dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleString() },
          { title: 'Действие', dataIndex: 'action' },
          { title: 'Ресурс', dataIndex: 'resourceType' },
          { title: 'Актор', dataIndex: 'actorType' },
        ]}
      />
      <Drawer title="Детали события" open={Boolean(selected)} onClose={() => setSelected(null)} width={480}>
        <Typography.Paragraph>
          <pre>{JSON.stringify({ before: selected?.before, after: selected?.after }, null, 2)}</pre>
        </Typography.Paragraph>
      </Drawer>
    </Card>
  );
}
