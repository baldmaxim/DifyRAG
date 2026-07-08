import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { App as AntApp, Button, Card, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage } from '../api/client';
import { authApi } from '../api/endpoints';
import { useAuthStore } from '../stores/auth.store';

export function LoginPage(): React.ReactElement {
  const navigate = useNavigate();
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
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 380 }}>
        <Typography.Title level={3} style={{ textAlign: 'center' }}>
          Document Knowledge Portal
        </Typography.Title>
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input prefix={<UserOutlined />} placeholder="admin@example.com" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="Пароль" rules={[{ required: true, min: 8 }]}>
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Войти
          </Button>
        </Form>
      </Card>
    </div>
  );
}
