import { DOCUMENT_TYPE_CODE_VALUES } from '@dkp/shared';
import { App as AntApp, Alert, Button, DatePicker, Drawer, Form, Input, Select, Space, Steps, Typography, Upload, theme as antdTheme } from 'antd';
import type { UploadFile } from 'antd';
import axios from 'axios';
import { useState } from 'react';
import { apiErrorMessage } from '../api/client';
import { documentsApi } from '../api/endpoints';
import { Icons } from './icons';

const { Text } = Typography;

interface Props {
  folderId: string | null;
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

/** Extra metadata fields per document type (subset — extend as needed). */
function DynamicFields({ type }: { type?: string }): React.ReactElement | null {
  if (type === 'ks2') {
    return (
      <>
        <Form.Item name={['metadata', 'period']} label="Период">
          <Input placeholder="Июнь 2026" />
        </Form.Item>
        <Form.Item name={['metadata', 'party_role']} label="Сторона">
          <Select options={[{ value: 'customer', label: 'Заказчик' }, { value: 'subcontractor', label: 'Субподряд' }]} allowClear />
        </Form.Item>
        <Form.Item name={['metadata', 'amount_with_vat']} label="Сумма с НДС">
          <Input type="number" />
        </Form.Item>
      </>
    );
  }
  if (type === 'upd') {
    return (
      <>
        <Form.Item name={['metadata', 'supplier']} label="Поставщик">
          <Input />
        </Form.Item>
        <Form.Item name={['metadata', 'document_number']} label="Номер документа">
          <Input />
        </Form.Item>
        <Form.Item name={['metadata', 'vehicle_number']} label="Номер машины">
          <Input />
        </Form.Item>
      </>
    );
  }
  return null;
}

export function UploadDocumentDrawer({ folderId, open, onClose, onUploaded }: Props): React.ReactElement {
  const { token } = antdTheme.useToken();
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  const [file, setFile] = useState<UploadFile | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const docType = Form.useWatch('documentTypeCode', form);

  const reset = (): void => {
    form.resetFields();
    setFile(null);
    setStep(0);
  };

  const submit = async (values: Record<string, unknown>): Promise<void> => {
    if (!folderId) {
      message.error('Выберите папку');
      return;
    }
    const rawFile = file?.originFileObj as File | undefined;
    if (!rawFile) {
      message.error('Прикрепите файл');
      return;
    }
    setBusy(true);
    try {
      setStep(1);
      const doc = await documentsApi.create({
        folderId,
        documentTypeCode: values.documentTypeCode as string,
        title: values.title as string,
        counterparty: values.counterparty as string | undefined,
        documentDate: values.documentDate
          ? (values.documentDate as { toISOString(): string }).toISOString()
          : undefined,
        confidentiality: values.confidentiality as string | undefined,
        metadata: values.metadata as Record<string, unknown> | undefined,
      });

      setStep(2);
      const upload = await documentsApi.uploadUrl(doc.id, {
        fileName: rawFile.name,
        mimeType: rawFile.type || 'application/octet-stream',
        sizeBytes: rawFile.size,
      });

      setStep(3);
      await axios.put(upload.uploadUrl, rawFile, {
        headers: { 'Content-Type': rawFile.type || 'application/octet-stream' },
      });

      setStep(4);
      await documentsApi.commitUpload(doc.id, upload.uploadSessionId);
      setStep(5);
      message.success('Документ загружен и поставлен в очередь на индексацию в Dify');
      onUploaded();
      reset();
      onClose();
    } catch (err) {
      message.error(apiErrorMessage(err, 'Не удалось загрузить документ'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      title="Загрузка документа"
      open={open}
      onClose={onClose}
      width={480}
      destroyOnClose
      footer={
        <Space style={{ float: 'right' }}>
          <Button onClick={onClose}>Отмена</Button>
          <Button type="primary" icon={Icons.upload} loading={busy} onClick={() => form.submit()}>
            Загрузить и отправить в обработку
          </Button>
        </Space>
      }
    >
      <Steps
        size="small"
        current={step}
        style={{ marginBottom: 24 }}
        items={[
          { title: 'Метаданные' },
          { title: 'Создан' },
          { title: 'S3 URL' },
          { title: 'Upload' },
          { title: 'Commit' },
          { title: 'В очереди' },
        ]}
      />
      <Form form={form} layout="vertical" onFinish={submit} initialValues={{ confidentiality: 'internal' }}>
        <Form.Item label="Файл" required>
          <Upload.Dragger
            beforeUpload={() => false}
            maxCount={1}
            fileList={file ? [file] : []}
            onChange={({ fileList }) => setFile(fileList[0] ?? null)}
            style={{ background: token.colorFillQuaternary, borderRadius: 10 }}
          >
            <div style={{ color: token.colorPrimary, marginBottom: 8 }}>{Icons.upload}</div>
            <Text>Перетащите файл сюда или выберите на диске</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              PDF, DOCX, XLSX и др. · загрузка напрямую в S3
            </Text>
          </Upload.Dragger>
        </Form.Item>
        <Form.Item name="title" label="Название" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="documentTypeCode" label="Тип документа" rules={[{ required: true }]}>
          <Select showSearch options={DOCUMENT_TYPE_CODE_VALUES.map((c) => ({ value: c, label: c }))} />
        </Form.Item>
        <Form.Item name="documentDate" label="Дата документа">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="counterparty" label="Контрагент">
          <Input />
        </Form.Item>
        <Form.Item name="confidentiality" label="Конфиденциальность">
          <Select
            options={[
              { value: 'public', label: 'Публичный' },
              { value: 'internal', label: 'Внутренний' },
              { value: 'confidential', label: 'Конфиденциальный' },
              { value: 'restricted', label: 'Ограниченный' },
            ]}
          />
        </Form.Item>
        <DynamicFields type={docType} />
        <Alert
          type="info"
          showIcon
          message="После загрузки документ автоматически попадёт в очередь обработки Dify. Статус виден в таблице документов."
        />
      </Form>
    </Drawer>
  );
}
