import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App as AntApp, Button, Card, Col, Row, Select, Space, Table, Tag, Tree, Typography, theme as antdTheme } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiErrorMessage } from '../api/client';
import { documentsApi, foldersApi, projectsApi } from '../api/endpoints';
import { Icons } from '../components/icons';
import { PageHead } from '../components/PageHead';
import { RowActions } from '../components/RowActions';
import { StatusTag } from '../components/StatusTag';
import { UploadDocumentDrawer } from '../components/UploadDocumentDrawer';
import type { DocumentRow, Folder } from '../types';

const { Text } = Typography;

function buildTree(folders: Folder[]): DataNode[] {
  const byId = new Map<string, DataNode & { key: string }>();
  folders.forEach((f) => byId.set(f.id, { key: f.id, title: f.name, children: [] }));
  const roots: DataNode[] = [];
  folders.forEach((f) => {
    const node = byId.get(f.id)!;
    if (f.parentId && byId.has(f.parentId)) {
      (byId.get(f.parentId)!.children as DataNode[]).push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export function ProjectDetailPage(): React.ReactElement {
  const { projectId = '' } = useParams();
  const { token } = antdTheme.useToken();
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: project } = useQuery({ queryKey: ['project', projectId], queryFn: () => projectsApi.get(projectId) });
  const { data: folders } = useQuery({
    queryKey: ['folders', projectId],
    queryFn: () => foldersApi.tree('project', projectId),
  });
  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', projectId, selectedFolder, statusFilter],
    queryFn: () => documentsApi.list({ projectId, folderId: selectedFolder ?? undefined, status: statusFilter }),
  });

  const treeData = useMemo(() => buildTree(folders ?? []), [folders]);
  const selectedName = folders?.find((f) => f.id === selectedFolder)?.name;

  const reindexMutation = useMutation({
    mutationFn: (id: string) => documentsApi.reindex(id),
    onSuccess: () => message.success('Переиндексация поставлена в очередь'),
    onError: (err) => message.error(apiErrorMessage(err)),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.remove(id),
    onSuccess: () => {
      message.success('Документ скрыт (файл сохранён в S3)');
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err) => message.error(apiErrorMessage(err)),
  });

  const download = async (id: string): Promise<void> => {
    try {
      const { url } = await documentsApi.downloadUrl(id);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      message.error(apiErrorMessage(err));
    }
  };

  return (
    <>
      <PageHead
        desc={
          <Space size={10} wrap>
            <span style={{ fontWeight: 600 }}>{project?.name ?? 'Проект'}</span>
            {project?.code && (
              <Tag className="mono" style={{ marginInlineEnd: 0 }}>
                {project.code}
              </Tag>
            )}
            {project?.status && <StatusTag status={project.status} />}
            <span>·</span>
            <span>{selectedName ? `Папка: ${selectedName}` : 'Выберите папку слева'}</span>
          </Space>
        }
        extra={
          <>
            <Button icon={Icons.refresh} onClick={() => void queryClient.invalidateQueries({ queryKey: ['documents'] })}>
              Обновить
            </Button>
            <Button type="primary" icon={Icons.upload} disabled={!selectedFolder} onClick={() => setUploadOpen(true)}>
              Загрузить документ
            </Button>
          </>
        }
      />
      <Row gutter={16}>
        <Col xs={24} md={8} lg={7} xl={6}>
          <Card
            size="small"
            title="Папки"
            styles={{ body: { padding: '8px 8px', maxHeight: 560, overflow: 'auto' } }}
          >
            <Tree
              treeData={treeData}
              blockNode
              showLine={{ showLeafIcon: false }}
              selectedKeys={selectedFolder ? [selectedFolder] : []}
              onSelect={(keys) => setSelectedFolder((keys[0] as string) ?? null)}
            />
          </Card>
        </Col>
        <Col xs={24} md={16} lg={17} xl={18}>
          <Card
            size="small"
            styles={{ body: { padding: 0 } }}
            title={<Text strong>{selectedName ?? 'Все документы проекта'}</Text>}
            extra={
              <Select
                size="small"
                allowClear
                placeholder="Все статусы"
                style={{ width: 160 }}
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'indexed', label: 'Индексирован' },
                  { value: 'error', label: 'Ошибка' },
                  { value: 'queued', label: 'В очереди' },
                ]}
              />
            }
          >
            <Table<DocumentRow>
              rowKey="id"
              loading={isLoading}
              dataSource={documents ?? []}
              pagination={{ pageSize: 12, size: 'small', showTotal: (t) => `Всего: ${t}` }}
              columns={[
                {
                  title: 'Документ',
                  dataIndex: 'title',
                  render: (v: string, r) => (
                    <Space size={8}>
                      <span style={{ color: token.colorTextTertiary }}>{Icons.file}</span>
                      <div>
                        <Text strong style={{ fontSize: 13.5 }}>
                          {v}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {r.documentType?.code ?? '—'}
                          {r.currentVersion ? ` · ${r.currentVersion.originalFileName}` : ''}
                        </Text>
                      </div>
                    </Space>
                  ),
                },
                { title: 'Статус', dataIndex: 'status', width: 150, render: (s: string) => <StatusTag status={s} /> },
                {
                  title: 'Обновлён',
                  dataIndex: 'updatedAt',
                  width: 160,
                  render: (v: string) => (
                    <Text type="secondary" className="num" style={{ fontSize: 12.5 }}>
                      {new Date(v).toLocaleString()}
                    </Text>
                  ),
                },
                {
                  title: '',
                  key: 'a',
                  width: 130,
                  render: (_, row) => (
                    <RowActions
                      items={[
                        { icon: 'download', tip: 'Скачать', onClick: () => void download(row.id) },
                        { icon: 'refresh', tip: 'Реиндексация', onClick: () => reindexMutation.mutate(row.id) },
                        { icon: 'trash', tip: 'Скрыть (soft delete)', danger: true, onClick: () => deleteMutation.mutate(row.id) },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <UploadDocumentDrawer
        folderId={selectedFolder}
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => void queryClient.invalidateQueries({ queryKey: ['documents'] })}
      />
    </>
  );
}
