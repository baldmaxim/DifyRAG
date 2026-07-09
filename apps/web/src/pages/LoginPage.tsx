import { App as AntApp, Button, Card, Form, Input, Typography, theme as antdTheme } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../api/client';
import { authApi } from '../api/endpoints';
import { Icons } from '../components/icons';
import { useAuthStore } from '../stores/auth.store';

const { Title, Paragraph } = Typography;

export function LoginPage(): React.ReactElement {
  const navigate = useNavigate();
  const { token } = antdTheme.useToken();
  const { message } = AntApp.useApp();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { email: string; password: string }): Promise<void> => {
    setLoading(true);
    try {
      const tokens = await authApi.login(values.email, values.password);
      setTokens(tokens);
      const me = await authApi.me();
      setUser(me);
      navigate('/dashboard');
    } catch (err) {
      message.error(apiErrorMessage(err, 'Неверный email или пароль'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap" style={{ background: token.colorBgLayout }}>
      <div className="login-brand">
        <div className="login-grid" />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="dkp-logo-mark" style={{ width: 38, height: 38, borderRadius: 10 }}>
            {Icons.cloud}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 19, letterSpacing: 0.4 }}>DKP</div>
            <div style={{ fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase', color: '#7E8DA8' }}>
              Document Knowledge Portal
            </div>
          </div>
        </div>
        <div style={{ position: 'relative', maxWidth: 460 }}>
          <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.25, marginBottom: 14 }}>
            Вся документация ваших объектов — в одном хранилище, с умным поиском.
          </div>
          <div style={{ color: '#9AA8C2', fontSize: 14, lineHeight: 1.65 }}>
            Договоры, сметы, акты КС-2/КС-3, проектная и исполнительная документация — с версиями, правами
            доступа и семантическим поиском по каждому проекту.
          </div>
        </div>
        <div style={{ position: 'relative', color: '#5F6E8A', fontSize: 12 }}>
          © 2026 · Внутренняя система документооборота
        </div>
      </div>
      <div className="login-form-col">
        <Card style={{ width: 380, boxShadow: token.boxShadowSecondary }} variant="borderless">
          <Title level={4} style={{ marginBottom: 4 }}>
            Вход в портал
          </Title>
          <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 20 }}>
            Используйте корпоративную учётную запись
          </Paragraph>
          <Form layout="vertical" requiredMark={false} onFinish={onFinish}>
            <Form.Item name="email" label="Рабочий e-mail" rules={[{ required: true, type: 'email' }]}>
              <Input size="large" placeholder="i.ivanov@stroyfirma.kz" autoComplete="username" />
            </Form.Item>
            <Form.Item
              name="password"
              label="Пароль"
              rules={[{ required: true, min: 8 }]}
              style={{ marginBottom: 16 }}
            >
              <Input.Password size="large" placeholder="••••••••" autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" size="large" block htmlType="submit" loading={loading}>
              Войти
            </Button>
          </Form>
        </Card>
      </div>
    </div>
  );
}
