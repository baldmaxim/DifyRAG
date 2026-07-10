import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App as AntApp, Button, Card, Form, Input, Modal, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
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
  const [pwdTarget, setPwdTarget] = useState<AdminUser | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.list });

  const invalidate = (): void => void queryClient.invalidateQueries({ queryKey: ['users'] });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: {
      id: string;
      patch: { status?: 'active' | 'disabled'; role?: 'admin' | 'user' };
      okMsg: string;
    }) => usersApi.update(id, patch),
    onSuccess: (_, { okMsg }) => {
      message.success(okMsg);
      invalidate();
    },
    onError: (err) => message.error(apiErrorMessage(err)),
  });

  const passwordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => usersApi.resetPassword(id, password),
    onSuccess: () => {
      message.success('Пароль изменён');
      setPwdTarget(null);
      form.resetFields();
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
          scroll={{ x: 'max-content' }}
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
              width: 170,
              render: (v: string) => (
                <Text type="secondary" className="num" style={{ fontSize: 12.5 }}>
                  {new Date(v).toLocaleString()}
                </Text>
              ),
            },
            {
              title: '',
              width: 340,
              render: (_, row) => {
                const isSelf = row.id === currentUser?.id;
                const toAdmin = row.role !== 'admin';
                return (
                  <Space size={6} wrap>
                    {row.status === 'active' ? (
                      <Popconfirm
                        title="Заблокировать пользователя?"
                        disabled={isSelf}
                        onConfirm={() =>
                          updateMutation.mutate({
                            id: row.id,
                            patch: { status: 'disabled' },
                            okMsg: 'Пользователь заблокирован',
                          })
                        }
                      >
                        <Button danger size="small" icon={Icons.cross} disabled={isSelf}>
                          Заблокировать
                        </Button>
                      </Popconfirm>
                    ) : (
                      <Button
                        type="primary"
                        size="small"
                        icon={Icons.check}
                        onClick={() =>
                          updateMutation.mutate({
                            id: row.id,
                            patch: { status: 'active' },
                            okMsg: 'Пользователь активирован',
                          })
                        }
                      >
                        Активировать
                      </Button>
                    )}
                    <Popconfirm
                      title={toAdmin ? 'Назначить администратором?' : 'Снять роль администратора?'}
                      disabled={isSelf}
                      onConfirm={() =>
                        updateMutation.mutate({
                          id: row.id,
                          patch: { role: toAdmin ? 'admin' : 'user' },
                          okMsg: 'Роль обновлена',
                        })
                      }
                    >
                      <Button size="small" icon={Icons.users} disabled={isSelf}>
                        {toAdmin ? 'Сделать админом' : 'Снять админа'}
                      </Button>
                    </Popconfirm>
                    <Button size="small" icon={Icons.key} onClick={() => setPwdTarget(row)}>
                      Пароль
                    </Button>
                  </Space>
                );
              },
            },
          ]}
        />
      </Card>

      <Modal
        title={`Сменить пароль — ${pwdTarget?.fullName ?? ''}`}
        open={Boolean(pwdTarget)}
        onCancel={() => {
          setPwdTarget(null);
          form.resetFields();
        }}
        okText="Сохранить"
        confirmLoading={passwordMutation.isPending}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v: { password: string }) =>
            pwdTarget && passwordMutation.mutate({ id: pwdTarget.id, password: v.password })
          }
        >
          <Form.Item name="password" label="Новый пароль" rules={[{ required: true, min: 8 }]}>
            <Input.Password size="large" autoComplete="new-password" placeholder="••••••••" />
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
          >
            <Input.Password size="large" autoComplete="new-password" placeholder="••••••••" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
