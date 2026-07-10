import { App as AntApp, Button, Card, Form, Input, Typography, theme as antdTheme } from 'antd';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../api/client';
import { authApi } from '../api/endpoints';
import { Icons } from '../components/icons';
import { useShake } from '../hooks/useMotion';
import { useAuthStore } from '../stores/auth.store';

const { Title, Paragraph, Text } = Typography;

interface RegisterValues {
  fullName: string;
  email: string;
  password: string;
  confirm: string;
}

export function RegisterPage(): React.ReactElement {
  const navigate = useNavigate();
  const { token } = antdTheme.useToken();
  const { message } = AntApp.useApp();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const { ref: shakeRef, trigger: shake } = useShake<HTMLDivElement>();

  const onFinish = async (values: RegisterValues): Promise<void> => {
    setLoading(true);
    try {
      const res = await authApi.register({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      if (res.status === 'active') {
        setTokens(res.tokens);
        const me = await authApi.me();
        setUser(me);
        navigate('/dashboard');
      } else {
        setPending(true);
      }
    } catch (err) {
      message.error(apiErrorMessage(err, 'Не удалось зарегистрироваться'));
      shake();
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
        <div ref={shakeRef} className="t-shake" style={{ width: '100%', maxWidth: 380 }}>
          <Card style={{ width: '100%', boxShadow: token.boxShadowSecondary }} variant="borderless">
            {pending ? (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div
                  className="t-success-check"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    margin: '0 auto 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: token.colorSuccess,
                    background: token.colorSuccessBg,
                  }}
                >
                  {Icons.check}
                </div>
                <Title level={4} style={{ marginBottom: 8 }}>
                  Заявка отправлена
                </Title>
                <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 20 }}>
                  Учётная запись создана и ожидает активации администратором. После подтверждения вы
                  сможете войти в портал.
                </Paragraph>
                <Button type="primary" size="large" block onClick={() => navigate('/login')}>
                  Вернуться ко входу
                </Button>
              </div>
            ) : (
              <>
                <Title level={4} style={{ marginBottom: 4 }}>
                  Регистрация в портале
                </Title>
                <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 20 }}>
                  Создайте учётную запись корпоративного портала
                </Paragraph>
                <Form layout="vertical" requiredMark={false} onFinish={onFinish} onFinishFailed={shake}>
                  <Form.Item name="fullName" label="ФИО" rules={[{ required: true, min: 2 }]}>
                    <Input size="large" placeholder="Иванов Иван" autoComplete="name" />
                  </Form.Item>
                  <Form.Item name="email" label="Рабочий e-mail" rules={[{ required: true, type: 'email' }]}>
                    <Input size="large" placeholder="i.ivanov@stroyfirma.kz" autoComplete="username" />
                  </Form.Item>
                  <Form.Item name="password" label="Пароль" rules={[{ required: true, min: 8 }]}>
                    <Input.Password size="large" placeholder="••••••••" autoComplete="new-password" />
                  </Form.Item>
                  <Form.Item
                    name="confirm"
                    label="Повторите пароль"
                    dependencies={['password']}
                    rules={[
                      { required: true },
                      ({ getFieldValue }) => ({
                        validator(_, value: string) {
                          if (!value || getFieldValue('password') === value) return Promise.resolve();
                          return Promise.reject(new Error('Пароли не совпадают'));
                        },
                      }),
                    ]}
                    style={{ marginBottom: 16 }}
                  >
                    <Input.Password size="large" placeholder="••••••••" autoComplete="new-password" />
                  </Form.Item>
                  <Button type="primary" size="large" block htmlType="submit" loading={loading}>
                    Зарегистрироваться
                  </Button>
                </Form>
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Уже есть аккаунт?{' '}
                  </Text>
                  <Link to="/login" style={{ fontSize: 13 }}>
                    Войти
                  </Link>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
