import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App as AntApp, Button, Card, Popconfirm, Table, Tag, Typography } from 'antd';
import { Navigate } from 'react-router-dom';
import { apiErrorMessage } from '../api/client';
import { usersApi } from '../api/endpoints';
import { Icons } from '../components/icons';
import { PageHead } from '../components/PageHead';
import { StatusTag } from '../components/StatusTag';
import { useAuthStore } from '../stores/auth.store';
import type { AdminUser } from '../types';

const { Text } = Typography;

export function UsersPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
  const currentUser = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'disabled' }) =>
      usersApi.update(id, { status }),
    onSuccess: (_, { status }) => {
      message.success(status === 'active' ? 'Пользователь активирован' : 'Пользователь заблокирован');
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => message.error(apiErrorMessage(err)),
  });

  // Страница управления пользователями доступна только администраторам.
  if (currentUser && currentUser.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <PageHead desc="Учётные записи портала. Новые регистрации создаются отключёнными — активируйте их здесь." />
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table<AdminUser>
          rowKey="id"
          loading={isLoading}
          dataSource={data ?? []}
          pagination={{ pageSize: 15, size: 'small' }}
          columns={[
            {
              title: 'Пользователь',
              dataIndex: 'fullName',
              render: (v: string, row) => (
                <div style={{ lineHeight: 1.3 }}>
                  <Text strong style={{ fontSize: 13.5 }}>
                    {v}
                  </Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12.5 }}>
                      {row.email}
                    </Text>
                  </div>
                </div>
              ),
            },
            {
              title: 'Роль',
              dataIndex: 'role',
              width: 130,
              render: (role: string) => (
                <Tag color={role === 'admin' ? 'geekblue' : 'default'} style={{ marginInlineEnd: 0 }}>
                  {role === 'admin' ? 'Администратор' : 'Пользователь'}
                </Tag>
              ),
            },
            {
              title: 'Статус',
              dataIndex: 'status',
              width: 150,
              render: (s: string) => <StatusTag status={s} />,
            },
            {
              title: 'Создан',
              dataIndex: 'createdAt',
              width: 180,
              render: (v: string) => (
                <Text type="secondary" className="num" style={{ fontSize: 12.5 }}>
                  {new Date(v).toLocaleString()}
                </Text>
              ),
            },
            {
              title: '',
              width: 140,
              render: (_, row) => {
                const isSelf = row.id === currentUser?.id;
                if (row.status === 'active') {
                  return (
                    <Popconfirm
                      title="Заблокировать пользователя?"
                      disabled={isSelf}
                      onConfirm={() => updateMutation.mutate({ id: row.id, status: 'disabled' })}
                    >
                      <Button danger size="small" icon={Icons.cross} disabled={isSelf}>
                        Заблокировать
                      </Button>
                    </Popconfirm>
                  );
                }
                return (
                  <Button
                    type="primary"
                    size="small"
                    icon={Icons.check}
                    loading={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: row.id, status: 'active' })}
                  >
                    Активировать
                  </Button>
                );
              },
            },
          ]}
        />
      </Card>
    </>
  );
}
