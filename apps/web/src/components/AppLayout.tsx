import {
  ApiOutlined,
  AppstoreOutlined,
  AuditOutlined,
  BulbFilled,
  BulbOutlined,
  CloudServerOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  FileTextOutlined,
  LogoutOutlined,
  SearchOutlined,
  SettingOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, Layout, Menu, Space, Tooltip, Typography } from 'antd';
import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../api/endpoints';
import { useAuthStore } from '../stores/auth.store';
import { useThemeStore } from '../stores/theme.store';

const { Header, Sider, Content } = Layout;

const MENU = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Дашборд' },
  { key: '/projects', icon: <AppstoreOutlined />, label: 'Проекты' },
  { key: '/search', icon: <SearchOutlined />, label: 'Поиск' },
  { key: '/documents', icon: <FileTextOutlined />, label: 'Документы' },
  { key: '/departments', icon: <TeamOutlined />, label: 'Отделы' },
  { key: '/dify-datasets', icon: <DatabaseOutlined />, label: 'Dify Datasets' },
  { key: '/integrations', icon: <DeploymentUnitOutlined />, label: 'Интеграции' },
  { key: '/api-keys', icon: <ApiOutlined />, label: 'API-ключи' },
  { key: '/processing-jobs', icon: <ThunderboltOutlined />, label: 'Обработка' },
  { key: '/audit-logs', icon: <AuditOutlined />, label: 'Аудит' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Настройки' },
];

export function AppLayout(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const mode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggle);

  const selectedKey = useMemo(() => {
    const match = MENU.find((m) => location.pathname.startsWith(m.key));
    return match?.key ?? '/dashboard';
  }, [location.pathname]);

  const onLogout = async (): Promise<void> => {
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => undefined);
    }
    logout();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0" theme="dark">
        <div style={{ height: 48, margin: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CloudServerOutlined style={{ color: '#fff', fontSize: 22 }} />
          <span style={{ color: '#fff', fontWeight: 600 }}>DKP</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={MENU}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <Space size="middle">
            <Tooltip title={mode === 'dark' ? 'Светлая тема' : 'Тёмная тема'}>
              <Button
                type="text"
                aria-label="Переключить тему"
                icon={mode === 'dark' ? <BulbFilled /> : <BulbOutlined />}
                onClick={toggleTheme}
              />
            </Tooltip>
            <Dropdown
              menu={{
                items: [{ key: 'logout', icon: <LogoutOutlined />, label: 'Выйти', onClick: onLogout }],
              }}
            >
              <Space style={{ cursor: 'pointer' }}>
                <Typography.Text strong>{user?.fullName ?? user?.email ?? 'Пользователь'}</Typography.Text>
                <Typography.Text type="secondary">({user?.role})</Typography.Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
