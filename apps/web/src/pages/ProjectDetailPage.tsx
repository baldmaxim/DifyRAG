import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App as AntApp, Button, Card, Col, Popconfirm, Row, Space, Table, Tree, Typography } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiErrorMessage } from '../api/client';
import { documentsApi, foldersApi, projectsApi } from '../api/endpoints';
import { StatusTag } from '../components/StatusTag';
import { UploadDocumentDrawer } from '../components/UploadDocumentDrawer';
import type { DocumentRow, Folder } from '../types';

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
  const queryClient = useQueryClient();
  const { message } = AntApp.useApp();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: project } = useQuery({ queryKey: ['project', projectId], queryFn: () => projectsApi.get(projectId) });
  const { data: folders } = useQuery({
    queryKey: ['folders', projectId],
    queryFn: () => foldersApi.tree('project', projectId),
  });
  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', projectId, selectedFolder],
    queryFn: () => documentsApi.list({ projectId, folderId: selectedFolder ?? undefined }),
  });

  const treeData = useMemo(() => buildTree(folders ?? []), [folders]);

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

  return (
    <>
      <Typography.Title level={3}>{project?.name ?? 'Проект'}</Typography.Title>
      <Row gutter={16}>
        <Col xs={24} md={7}>
          <Card title="Папки" size="small">
            <Tree
              treeData={treeData}
              onSelect={(keys) => setSelectedFolder((keys[0] as string) ?? null)}
              height={520}
            />
          </Card>
        </Col>
        <Col xs={24} md={17}>
          <Card
            title="Документы"
            size="small"
            extra={
              <Button type="primary" disabled={!selectedFolder} onClick={() => setUploadOpen(true)}>
                Загрузить
              </Button>
            }
          >
            <Table<DocumentRow>
              rowKey="id"
              size="small"
              loading={isLoading}
              dataSource={documents ?? []}
              columns={[
                { title: 'Название', dataIndex: 'title' },
                { title: 'Тип', dataIndex: ['documentType', 'code'] },
                { title: 'Статус', dataIndex: 'status', render: (s: string) => <StatusTag status={s} /> },
                {
                  title: 'Действия',
                  render: (_, row) => (
                    <Space>
                      <Button size="small" onClick={() => reindexMutation.mutate(row.id)}>
                        Reindex
                      </Button>
                      <Popconfirm
                        title="Скрыть документ? Файл останется в S3."
                        onConfirm={() => deleteMutation.mutate(row.id)}
                      >
                        <Button size="small" danger>
                          Удалить
                        </Button>
                      </Popconfirm>
                    </Space>
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
