import { Alert, Button, Card, Col, Divider, Empty, Row, Skeleton, Space, Typography, theme as antdTheme } from 'antd';
import { useState } from 'react';
import { DKP_STATUS } from '../dkp-theme';
import { Icons } from '../components/icons';
import { StatusTag } from '../components/StatusTag';
import { useShake, useSuccessCheck } from '../hooks/useMotion';

const { Text } = Typography;

/** Живая витрина transitions.dev — вход, hover-lift и интерактивные паттерны. */
function MotionShowcase(): React.ReactElement {
  const { token } = antdTheme.useToken();
  const [runId, setRunId] = useState(0); // remount → переигрывает анимации входа
  const { ref: shakeRef, trigger: shake } = useShake<HTMLDivElement>();
  const { ref: checkRef, play } = useSuccessCheck<HTMLSpanElement>();

  const tile: React.CSSProperties = {
    minWidth: 92,
    padding: '12px 14px',
    borderRadius: 8,
    background: token.colorFillQuaternary,
    border: `1px solid ${token.colorBorderSecondary}`,
  };

  return (
    <Card
      size="small"
      title="Движение — transitions.dev"
      extra={
        <Button size="small" onClick={() => setRunId((n) => n + 1)}>
          Повторить вход
        </Button>
      }
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div key={runId} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="t-rise" style={{ '--i': i, ...tile } as React.CSSProperties}>
              <span className="t-num num" style={{ '--i': i, fontSize: 22, fontWeight: 600 } as React.CSSProperties}>
                {(i + 1) * 17}
              </span>
              <div style={{ fontSize: 11, color: token.colorTextTertiary }}>t-rise · t-num</div>
            </div>
          ))}
        </div>

        <div className="t-lift" style={{ ...tile, cursor: 'default', width: 200 }}>
          <Text style={{ fontSize: 13 }}>Наведите курсор — <b>t-lift</b></Text>
        </div>

        <Space wrap size={16} align="center">
          <div ref={shakeRef} className="t-shake">
            <Button danger onClick={shake}>
              Показать ошибку · t-shake
            </Button>
          </div>
          <Space size={10} align="center">
            <Button onClick={play}>Успех · t-success-check</Button>
            <span ref={checkRef} className="t-success-check" data-state="out" aria-hidden="true" style={{ color: token.colorSuccess }}>
              <svg width="26" height="26" viewBox="0 0 48 48" fill="none">
                <path
                  d="M14 24l7 7 13-14"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ strokeDasharray: 32, strokeDashoffset: 32 }}
                />
              </svg>
            </span>
          </Space>
          <span className="t-shimmer" data-text="Индексация в Dify…" style={{ fontSize: 14, fontWeight: 500 }}>
            Индексация в Dify…
          </span>
        </Space>
      </Space>
    </Card>
  );
}

function Swatch({ c, n, d }: { c: string; n: string; d?: string }): React.ReactElement {
  const { token } = antdTheme.useToken();
  return (
    <div style={{ width: 120, borderRadius: 8, overflow: 'hidden', border: `1px solid ${token.colorBorderSecondary}` }}>
      <div style={{ height: 44, background: c }} />
      <div style={{ padding: '6px 8px', fontSize: 11, lineHeight: 1.5 }}>
        <b>{n}</b>
        <br />
        <span className="mono" style={{ color: token.colorTextTertiary }}>
          {c}
        </span>
        {d && (
          <>
            <br />
            <span style={{ color: token.colorTextTertiary }}>{d}</span>
          </>
        )}
      </div>
    </div>
  );
}

function StatusGroup({ keys }: { keys: string[] }): React.ReactElement {
  return (
    <Space wrap size={8}>
      {keys.map((k) => (
        <StatusTag key={k} status={k} />
      ))}
    </Space>
  );
}

export function DesignSystemPage(): React.ReactElement {
  const { token } = antdTheme.useToken();
  // Ссылаемся на DKP_STATUS, чтобы витрина падала, если ключи разойдутся с картой.
  const known = new Set(Object.keys(DKP_STATUS));
  const pipeline = ['queued', 'uploading', 'waiting', 'parsing', 'cleaning', 'splitting', 'indexing', 'completed', 'error', 'archived', 'disabled'].filter((k) => known.has(k));

  return (
    <>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card size="small" title="Палитра">
          <Space wrap size={8}>
            <Swatch c={token.colorPrimary} n="Primary" d="действия, ссылки" />
            <Swatch c={token.colorSuccess} n="Success" d="завершено, ок" />
            <Swatch c={token.colorWarning} n="Warning" d="деградация" />
            <Swatch c={token.colorError} n="Error" d="сбой, ошибка" />
            <Swatch c={token.colorText} n="Text" />
            <Swatch c={token.colorTextSecondary} n="Text 2" />
            <Swatch c={token.colorBgLayout} n="Bg layout" />
            <Swatch c={token.colorBgContainer} n="Bg container" />
            <Swatch c={token.colorBorder} n="Border" />
          </Space>
        </Card>

        <Card size="small" title="Статусы — документ и пайплайн Dify">
          <StatusGroup keys={pipeline} />
          <Divider style={{ margin: '12px 0' }} />
          <Text type="secondary" style={{ fontSize: 12.5 }}>
            Портальные статусы документа:
          </Text>
          <div style={{ marginTop: 8 }}>
            <StatusGroup keys={['draft', 'active', 'stored', 'indexed', 'deleted']} />
          </div>
        </Card>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Card size="small" title="Статусы — задачи обработки">
              <StatusGroup keys={['queued', 'running', 'success', 'failed', 'skipped']} />
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card size="small" title="Статусы — интеграции">
              <StatusGroup keys={['ok', 'degraded', 'down', 'setup_required']} />
            </Card>
          </Col>
        </Row>

        <Card size="small" title="Типографика — Inter (кириллица) + IBM Plex Mono">
          <Space direction="vertical" size={2}>
            <span style={{ fontSize: 30, fontWeight: 600 }}>Заголовок H1 · 30/38 · 600</span>
            <span style={{ fontSize: 24, fontWeight: 600 }}>Заголовок H2 · 24/32 · 600</span>
            <span style={{ fontSize: 20, fontWeight: 600 }}>Заголовок H3 · 20/28 · 600</span>
            <span style={{ fontSize: 16, fontWeight: 600 }}>Заголовок H4 · 16/24 · 600</span>
            <span style={{ fontSize: 14 }}>
              Основной текст · 14/22 · 400 — Съешь ещё этих мягких французских булок, да выпей чаю.
            </span>
            <span style={{ fontSize: 12, color: token.colorTextSecondary }}>
              Подпись · 12/20 · 400 — вторичный текст, метаданные таблиц
            </span>
            <span className="mono num">Моно / табличные цифры · 84 316 200 ₸ · dkp_live_8f3k… · 08.07.2026 17:42</span>
          </Space>
        </Card>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Card size="small" title="Состояние: загрузка">
              <Skeleton active paragraph={{ rows: 3 }} />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" title="Состояние: пусто">
              <Empty description="В этой папке пока нет документов">
                <Button type="primary" size="small" icon={Icons.upload}>
                  Загрузить первый
                </Button>
              </Empty>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" title="Состояние: ошибка">
              <Alert
                type="error"
                showIcon
                message="Не удалось загрузить данные"
                description="Сервер вернул ошибку 502. Проверьте подключение к API и повторите."
                action={
                  <Button size="small" danger>
                    Повторить
                  </Button>
                }
              />
            </Card>
          </Col>
        </Row>

        <Card size="small" title="Отступы и радиусы">
          <Text type="secondary" style={{ fontSize: 13 }}>
            База 4px · компоненты 8/12/16 · гуттер страницы 24 · радиусы 4 / 6 / 10 · тени двух уровней · движение
            100–240 мс, ease-out.
          </Text>
        </Card>

        <MotionShowcase />
      </Space>
    </>
  );
}
