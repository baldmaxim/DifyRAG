import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App as AntApp,
  Alert,
  Button,
  Card,
  Collapse,
  Form,
  Input,
  InputNumber,
  Skeleton,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';
import { useState } from 'react';
import { apiErrorMessage } from '../api/client';
import { settingsApi } from '../api/endpoints';
import { Icons } from '../components/icons';
import { PageHead } from '../components/PageHead';
import { StatusTag } from '../components/StatusTag';
import type { HealthResult, MaskedSettingField, MaskedSettingGroup } from '../types';

const { Text } = Typography;
const TESTABLE = new Set(['s3', 'dify', 'lmStudio', 'qdrant']);

function FieldItem({ f }: { f: MaskedSettingField }): React.ReactElement {
  if (f.type === 'boolean') {
    return (
      <Form.Item name={f.field} label={f.label} valuePropName="checked">
        <Switch />
      </Form.Item>
    );
  }
  if (f.type === 'number') {
    return (
      <Form.Item name={f.field} label={f.label}>
        <InputNumber style={{ width: '100%' }} />
      </Form.Item>
    );
  }
  if (f.secret) {
    return (
      <Form.Item
        name={f.field}
        label={f.label}
        extra={f.configured ? 'Задано. Оставьте пустым, чтобы не менять.' : 'Не задано.'}
      >
        <Input.Password placeholder={f.configured ? '••••••••' : ''} autoComplete="new-password" />
      </Form.Item>
    );
  }
  return (
    <Form.Item name={f.field} label={f.label}>
      <Input className="mono" />
    </Form.Item>
  );
}

function GroupForm({ group }: { group: MaskedSettingGroup }): React.ReactElement {
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  const [testResult, setTestResult] = useState<HealthResult | null>(null);

  const initialValues: Record<string, unknown> = {};
  for (const f of group.fields) {
    if (f.secret) continue;
    initialValues[f.field] = f.type === 'boolean' ? Boolean(f.value) : (f.value ?? undefined);
  }

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const patch: Record<string, unknown> = { ...values };
      for (const f of group.fields) {
        if (f.secret && !patch[f.field]) delete patch[f.field];
      }
      return settingsApi.update(group.group, patch);
    },
    onSuccess: () => {
      message.success('Настройки сохранены');
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
      void queryClient.invalidateQueries({ queryKey: ['integrations-health'] });
    },
    onError: (err) => message.error(apiErrorMessage(err)),
  });

  const testMutation = useMutation({
    mutationFn: () => settingsApi.test(group.group),
    onSuccess: (res) => {
      if ('supported' in res) {
        message.info('Для этой группы нет проверки соединения');
      } else {
        setTestResult(res);
      }
    },
    onError: (err) => message.error(apiErrorMessage(err)),
  });

  return (
    <Form form={form} layout="vertical" initialValues={initialValues} onFinish={(v) => saveMutation.mutate(v)}>
      {group.fields.map((f) => (
        <FieldItem key={f.field} f={f} />
      ))}
      {testResult && (
        <Alert
          style={{ marginBottom: 12 }}
          type={testResult.status === 'ok' ? 'success' : testResult.status === 'degraded' ? 'warning' : 'error'}
          message={
            <Space>
              <StatusTag status={testResult.status} />
              {testResult.latencyMs != null && (
                <Text type="secondary" className="num">
                  {testResult.latencyMs} мс
                </Text>
              )}
            </Space>
          }
          description={
            <pre className="mono" style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
              {JSON.stringify(testResult.details, null, 2)}
            </pre>
          }
        />
      )}
      <Space>
        <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
          Сохранить
        </Button>
        {TESTABLE.has(group.group) && (
          <Button icon={Icons.plug} loading={testMutation.isPending} onClick={() => testMutation.mutate()}>
            Проверить соединение
          </Button>
        )}
      </Space>
    </Form>
  );
}

export function SettingsPage(): React.ReactElement {
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.list });

  if (isLoading) return <Skeleton active />;
  if (isError) {
    return (
      <>
        <PageHead title="Настройки" />
        <Alert type="error" showIcon message={apiErrorMessage(error, 'Нет доступа к настройкам (нужна роль admin)')} />
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Настройки"
        desc="Конфигурация системы · доступно только администраторам"
        extra={<Tag color="purple" style={{ marginInlineEnd: 0 }}>Только Admin</Tag>}
      />
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Секреты хранятся в зашифрованном виде"
        description="Значения переопределяют переменные из .env и применяются немедленно, без перезапуска сервисов."
      />
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Collapse
          accordion
          bordered={false}
          defaultActiveKey={data?.[0]?.group}
          items={(data ?? []).map((g) => ({
            key: g.group,
            label: <Text strong>{g.label}</Text>,
            children: <GroupForm group={g} />,
          }))}
        />
      </Card>
    </>
  );
}
