import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App as AntApp,
  Alert,
  Button,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Skeleton,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography,
  theme as antdTheme,
} from 'antd';
import { useState, type ReactElement } from 'react';
import { apiErrorMessage } from '../api/client';
import { settingsApi } from '../api/endpoints';
import { Icons } from '../components/icons';
import { PageHead } from '../components/PageHead';
import type { HealthResult, MaskedSettingField, MaskedSettingGroup } from '../types';

const TESTABLE = new Set(['s3', 'dify', 'lmStudio', 'qdrant']);

const GROUP_ICON: Record<string, ReactElement> = {
  s3: Icons.cloud,
  dify: Icons.dataset,
  lmStudio: Icons.bolt,
  qdrant: Icons.dataset,
  processing: Icons.queue,
  security: Icons.key,
};

const GROUP_TITLE: Record<string, string> = {
  s3: 'Хранилище S3',
  dify: 'Dify',
  lmStudio: 'LM Studio',
  qdrant: 'Qdrant',
  processing: 'Обработка',
  security: 'Безопасность',
};

const GROUP_DESC: Record<string, string> = {
  s3: 'Где хранятся оригиналы файлов (Cloud.ru Object Storage).',
  dify: 'RAG-движок: адрес и ключ доступа.',
  lmStudio: 'Модель эмбеддингов (для проверки соединения).',
  qdrant: 'Векторное хранилище (только диагностика).',
  processing: 'Фоновая отправка документов в Dify.',
  security: 'Лимиты внешнего API.',
};

/** Cryptic fields hidden by default behind the "Расширенные" toggle. */
const ADVANCED: Record<string, Set<string>> = {
  s3: new Set(['forcePathStyle', 'presignedUrlTtlSeconds']),
  dify: new Set([
    'apiPrefix',
    'timeoutMs',
    'autoCreateDatasets',
    'defaultIndexingTechnique',
    'defaultDocForm',
    'defaultDocLanguage',
    'retrieveTopK',
    'retrieveScoreThreshold',
  ]),
  lmStudio: new Set(['timeoutMs']),
  qdrant: new Set(['healthcheckEnabled']),
  processing: new Set(['pollIntervalMs', 'maxAttempts']),
  security: new Set(),
};

/** Friendlier labels than the raw config field names. */
const LABELS: Record<string, string> = {
  's3.maxFileSizeBytes': 'Макс. размер файла, байт',
  's3.secretAccessKey': 'Secret Access Key',
  'dify.baseUrl': 'Адрес Dify (Base URL)',
  'dify.enabled': 'Dify включён',
  'lmStudio.baseUrl': 'Адрес LM Studio',
  'lmStudio.embeddingModel': 'Модель эмбеддингов',
  'lmStudio.expectedEmbeddingDimension': 'Размерность (0 = без проверки)',
  'qdrant.url': 'Адрес Qdrant',
  'processing.workerEnabled': 'Фоновая обработка (worker)',
  'security.externalRateLimitPerMin': 'Лимит запросов API, в минуту',
};

function labelFor(group: string, f: MaskedSettingField): string {
  return LABELS[`${group}.${f.field}`] ?? f.label;
}

function FieldItem({ group, f }: { group: string; f: MaskedSettingField }): ReactElement {
  const label = labelFor(group, f);
  if (f.type === 'boolean') {
    return (
      <Form.Item name={f.field} label={label} valuePropName="checked">
        <Switch />
      </Form.Item>
    );
  }
  if (f.type === 'number') {
    return (
      <Form.Item name={f.field} label={label}>
        <InputNumber style={{ width: '100%' }} />
      </Form.Item>
    );
  }
  if (f.secret) {
    return (
      <Form.Item name={f.field} label={label} extra={f.configured ? 'Задано. Пусто — не менять.' : 'Не задано.'}>
        <Input.Password placeholder={f.configured ? '••••••••' : ''} autoComplete="new-password" />
      </Form.Item>
    );
  }
  return (
    <Form.Item name={f.field} label={label}>
      <Input />
    </Form.Item>
  );
}

function fieldGrid(group: string, fields: MaskedSettingField[]): ReactElement {
  return (
    <Row gutter={[20, 0]}>
      {fields.map((f) => (
        <Col xs={24} sm={12} key={f.field}>
          <FieldItem group={group} f={f} />
        </Col>
      ))}
    </Row>
  );
}

function GroupForm({ group }: { group: MaskedSettingGroup }): ReactElement {
  const { token } = antdTheme.useToken();
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  const [editing, setEditing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testResult, setTestResult] = useState<HealthResult | null>(null);

  const advSet = ADVANCED[group.group] ?? new Set<string>();
  const basicFields = group.fields.filter((f) => !advSet.has(f.field));
  const advancedFields = group.fields.filter((f) => advSet.has(f.field));

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
      message.success('Сохранено');
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ['settings'] });
      void queryClient.invalidateQueries({ queryKey: ['integrations-health'] });
    },
    onError: (err) => message.error(apiErrorMessage(err)),
  });

  const testMutation = useMutation({
    mutationFn: () => settingsApi.test(group.group),
    onSuccess: (res) => {
      if ('supported' in res) message.info('Для этой группы нет проверки соединения');
      else setTestResult(res);
    },
    onError: (err) => message.error(apiErrorMessage(err)),
  });

  const cancel = (): void => {
    form.resetFields();
    setEditing(false);
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <div>
          <Typography.Text strong style={{ fontSize: 15 }}>
            {GROUP_TITLE[group.group] ?? group.label}
          </Typography.Text>
          <div style={{ color: token.colorTextSecondary, fontSize: 13 }}>{GROUP_DESC[group.group]}</div>
        </div>
        <Space>
          {TESTABLE.has(group.group) && (
            <Button loading={testMutation.isPending} onClick={() => testMutation.mutate()}>
              Проверить
            </Button>
          )}
          {editing ? (
            <>
              <Button type="primary" loading={saveMutation.isPending} onClick={() => form.submit()}>
                Сохранить
              </Button>
              <Button onClick={cancel}>Отмена</Button>
            </>
          ) : (
            <Button type="primary" onClick={() => setEditing(true)}>
              Редактировать
            </Button>
          )}
        </Space>
      </div>

      {testResult && (
        <Alert
          style={{ margin: '0 0 16px' }}
          type={testResult.status === 'ok' ? 'success' : testResult.status === 'degraded' ? 'warning' : 'error'}
          message={
            <Space>
              Проверка соединения: <Tag>{testResult.status}</Tag>
              {testResult.latencyMs != null && <span className="num">{testResult.latencyMs} мс</span>}
            </Space>
          }
        />
      )}

      <Form
        form={form}
        layout="vertical"
        disabled={!editing}
        initialValues={initialValues}
        onFinish={(v) => saveMutation.mutate(v)}
      >
        {fieldGrid(group.group, basicFields)}
        {advancedFields.length > 0 && (
          <>
            <Divider style={{ margin: '4px 0 16px' }} />
            <Space style={{ marginBottom: showAdvanced ? 12 : 0 }}>
              {/* keep the toggle interactive even when fields are locked */}
              <Switch size="small" disabled={false} checked={showAdvanced} onChange={setShowAdvanced} />
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                Расширенные настройки
              </Typography.Text>
            </Space>
            {showAdvanced && fieldGrid(group.group, advancedFields)}
          </>
        )}
      </Form>
    </div>
  );
}

export function SettingsPage(): ReactElement {
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.list });

  if (isLoading) return <Skeleton active />;
  if (isError) {
    return <Alert type="error" message={apiErrorMessage(error, 'Нет доступа к настройкам (нужна роль admin)')} />;
  }

  return (
    <>
      <PageHead
        title="Настройки"
        desc="Хранятся в БД и переопределяют .env. Секреты шифруются и не отображаются. Применяются сразу."
      />
      <Tabs
        tabPosition="left"
        items={(data ?? []).map((g) => ({
          key: g.group,
          label: (
            <Space size={8}>
              {GROUP_ICON[g.group]}
              {GROUP_TITLE[g.group] ?? g.label}
            </Space>
          ),
          children: <GroupForm group={g} />,
        }))}
      />
    </>
  );
}
