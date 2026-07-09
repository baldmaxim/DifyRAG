import { Avatar, Breadcrumb, Dropdown, Input, Layout, Menu, Space, Switch, Tooltip, Typography, theme as antdTheme } from 'antd';
import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../api/endpoints';
import { useAuthStore } from '../stores/auth.store';
import { useThemeStore } from '../stores/theme.store';
import { Icons } from './icons';

const { Header, Sider, Content } = Layout;

interface NavItem {
  key: string;
  icon: string;
  label: string;
}

const MENU: NavItem[] = [
  { key: '/dashboard', icon: 'dashboard', label: 'Дашборд' },
  { key: '/projects', icon: 'projects', label: 'Проекты' },
  { key: '/search', icon: 'search', label: 'Поиск' },
  { key: '/documents', icon: 'docs', label: 'Документы' },
  { key: '/departments', icon: 'depts', label: 'Отделы' },
  { key: '/dify-datasets', icon: 'dataset', label: 'Dify Datasets' },
  { key: '/integrations', icon: 'plug', label: 'Интеграции' },
  { key: '/api-keys', icon: 'key', label: 'API-ключи' },
  { key: '/processing-jobs', icon: 'queue', label: 'Обработка' },
  { key: '/audit-logs', icon: 'audit', label: 'Аудит' },
  { key: '/settings', icon: 'gear2', label: 'Настройки' },
  { key: '/design-system', icon: 'palette', label: 'Дизайн-система' },
];

function initials(name?: string, email?: string): string {
  const src = (name ?? email ?? '?').trim();
  const parts = src.split(/[\s.@]+/).filter(Boolean);
  return (parts.slice(0, 2).map((p) => p[0]).join('') || '?').toUpperCase();
}

export function AppLayout(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = antdTheme.useToken();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const mode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const [collapsed, setCollapsed] = useState(false);

  const current = useMemo(() => MENU.find((m) => location.pathname.startsWith(m.key)) ?? MENU[0], [location.pathname]);

  const onLogout = async (): Promise<void> => {
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => undefined);
    }
    logout();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={228}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={64}
        theme="dark"
      >
        <div className="dkp-logo" style={collapsed ? { padding: '16px 0', justifyContent: 'center' } : undefined}>
          <div className="dkp-logo-mark">{Icons.cloud}</div>
          {!collapsed && (
            <div>
              <div className="dkp-logo-text">DKP</div>
              <div className="dkp-logo-sub">Knowledge Portal</div>
            </div>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          style={{ border: 'none' }}
          selectedKeys={[current.key]}
          items={MENU.map((m) => ({ key: m.key, icon: Icons[m.icon], label: m.label }))}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            position: 'sticky',
            top: 0,
            zIndex: 5,
          }}
        >
          <Breadcrumb items={[{ title: 'DKP' }, { title: current.label }]} />
          <Space size={14}>
            <Input
              placeholder="Глобальный поиск…  ( / )"
              prefix={<span style={{ color: token.colorTextTertiary }}>{Icons.search}</span>}
              size="small"
              variant="filled"
              style={{ width: 220 }}
              onPressEnter={(e) => {
                const q = (e.target as HTMLInputElement).value.trim();
                navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
              }}
            />
            <Tooltip title={mode === 'dark' ? 'Светлая тема' : 'Тёмная тема'}>
              <Switch
                checked={mode === 'dark'}
                onChange={toggleTheme}
                checkedChildren={Icons.moon}
                unCheckedChildren={Icons.sun}
              />
            </Tooltip>
            <Dropdown
              menu={{
                items: [
                  { key: 'role', label: `Роль: ${user?.role ?? '—'}`, disabled: true },
                  { type: 'divider' },
                  {
                    key: 'logout',
                    danger: true,
                    label: (
                      <Space size={8}>
                        {Icons.door}
                        Выход
                      </Space>
                    ),
                    onClick: onLogout,
                  },
                ],
              }}
            >
              <Space style={{ cursor: 'pointer' }} size={10}>
                <Avatar size={30} style={{ background: token.colorPrimary, fontWeight: 600, fontSize: 12 }}>
                  {initials(user?.fullName, user?.email)}
                </Avatar>
                <div style={{ lineHeight: 1.2, textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>
                    {user?.fullName ?? user?.email ?? 'Пользователь'}
                  </div>
                  <Typography.Text style={{ fontSize: 11, color: token.colorTextTertiary }}>
                    {user?.role}
                  </Typography.Text>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ padding: 24, maxWidth: 1560, width: '100%', margin: '0 auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
