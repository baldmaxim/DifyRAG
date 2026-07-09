import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { DifyConfig } from '../../config/configuration';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SettingsService } from '../../settings/settings.service';
import { StorageService } from '../../storage/storage.service';
import { DifyClient, DifyApiError } from './dify.client';
import { DifyDatasetMappingService } from './dify-dataset-mapping.service';
import { mapDifyIndexingStatus } from './dify-status';
import type { CreateDocumentByFileData, DifyDocumentStatusAction } from './dify.types';

@Injectable()
export class DifyDocumentSyncService {
  private readonly logger = new Logger(DifyDocumentSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dify: DifyClient,
    private readonly datasetMapping: DifyDatasetMappingService,
    private readonly storage: StorageService,
    private readonly settings: SettingsService,
  ) {}

  private get cfg(): DifyConfig {
    return this.settings.dify();
  }

  private buildData(): CreateDocumentByFileData {
    return {
      indexing_technique: this.cfg.defaultIndexingTechnique as 'high_quality' | 'economy',
      doc_form: this.cfg.defaultDocForm as 'text_model',
      doc_language: this.cfg.defaultDocLanguage,
      // Automatic segmentation keeps this robust across Dify versions; custom chunk
      // rules (DIFY_CHUNK_*) can be dialed in once validated against the live Dify.
      process_rule: { mode: 'automatic' },
    };
  }

  /** Send the current version of a document to Dify (create-by-file / update-by-file). */
  async syncDocument(documentId: string): Promise<void> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { folder: true, currentVersion: true, project: true },
    });
    if (!doc || !doc.currentVersion) {
      throw new NotFoundException('Document or current version not found');
    }

    const mapping = await this.datasetMapping.resolveMapping({
      scope: doc.scope,
      projectId: doc.projectId,
      projectCode: doc.project?.code ?? null,
      departmentId: doc.departmentId,
      folderPath: doc.folder.path,
    });
    const ensured = await this.datasetMapping.ensureDataset(mapping);
    const datasetId = ensured.difyDatasetId as string;

    const bytes = await this.storage.getObjectBytes(doc.currentVersion.s3Key);
    const prior = await this.prisma.difyDocumentMapping.findFirst({
      where: { documentId, difyDatasetMappingId: ensured.id, difyDocumentId: { not: null } },
      orderBy: { createdAt: 'desc' },
    });

    const fileParams = {
      datasetId,
      file: bytes,
      fileName: doc.currentVersion.originalFileName,
      mimeType: doc.currentVersion.mimeType,
      data: this.buildData(),
    };

    let difyDocumentId: string;
    let batch: string;
    if (prior?.difyDocumentId) {
      const res = await this.dify.updateDocumentByFile({
        ...fileParams,
        documentId: prior.difyDocumentId,
      });
      difyDocumentId = res.document.id ?? prior.difyDocumentId;
      batch = res.batch;
    } else {
      const res = await this.dify.createDocumentByFile(fileParams);
      difyDocumentId = res.document.id;
      batch = res.batch;
    }

    await this.prisma.difyDocumentMapping.upsert({
      where: {
        documentVersionId_difyDatasetMappingId: {
          documentVersionId: doc.currentVersionId as string,
          difyDatasetMappingId: ensured.id,
        },
      },
      update: { difyDocumentId, difyBatch: batch, indexingStatus: 'waiting', errorMessage: null },
      create: {
        documentId,
        documentVersionId: doc.currentVersionId as string,
        difyDatasetMappingId: ensured.id,
        difyDatasetId: datasetId,
        difyDocumentId,
        difyBatch: batch,
        indexingStatus: 'waiting',
      },
    });

    await this.prisma.document.update({ where: { id: documentId }, data: { status: 'processing' } });
  }

  /** Poll indexing status for a document's in-progress mappings and roll up doc status. */
  async pollDocument(documentId: string): Promise<void> {
    const mappings = await this.prisma.difyDocumentMapping.findMany({
      where: { documentId, difyBatch: { not: null }, difyDocumentId: { not: null } },
    });
    if (mappings.length === 0) return;

    let anyError = false;
    let allCompleted = true;
    for (const m of mappings) {
      try {
        const res = await this.dify.getDocumentIndexingStatus(m.difyDatasetId, m.difyBatch as string);
        const item =
          res.data.find((d) => d.id === m.difyDocumentId) ?? res.data[res.data.length - 1];
        const status = mapDifyIndexingStatus(item?.indexing_status);
        if (status !== 'completed') allCompleted = false;
        if (status === 'error') anyError = true;
        await this.prisma.difyDocumentMapping.update({
          where: { id: m.id },
          data: {
            indexingStatus: status,
            completedSegments: item?.completed_segments ?? null,
            totalSegments: item?.total_segments ?? null,
            errorMessage: item?.error ?? null,
            lastPolledAt: new Date(),
            indexedAt: status === 'completed' ? new Date() : m.indexedAt,
          },
        });
      } catch (err) {
        allCompleted = false;
        this.logger.warn(`Poll failed for mapping ${m.id}: ${(err as Error).message}`);
      }
    }

    if (anyError) {
      await this.prisma.document.update({ where: { id: documentId }, data: { status: 'error' } });
    } else if (allCompleted) {
      await this.prisma.document.update({ where: { id: documentId }, data: { status: 'indexed' } });
    }
  }

  /** Archive (or disable, or as a last resort delete-from-index) all Dify docs for a document. */
  async archiveDocument(documentId: string): Promise<void> {
    const mappings = await this.prisma.difyDocumentMapping.findMany({
      where: { documentId, difyDocumentId: { not: null } },
    });
    for (const m of mappings) {
      const difyDocId = m.difyDocumentId as string;
      const applied = await this.tryStatusActions(m.difyDatasetId, difyDocId, ['archive', 'disable']);
      if (applied) {
        await this.prisma.difyDocumentMapping.update({
          where: { id: m.id },
          data: { indexingStatus: applied === 'archive' ? 'archived' : 'disabled' },
        });
      } else {
        await this.dify.deleteDocumentFromDify(m.difyDatasetId, difyDocId);
        await this.prisma.difyDocumentMapping.update({
          where: { id: m.id },
          data: { indexingStatus: 'archived', difyDocumentId: null },
        });
      }
    }
  }

  /** Restore all Dify docs for a document (un_archive/enable, or re-upload if missing). */
  async restoreDocument(documentId: string): Promise<void> {
    const mappings = await this.prisma.difyDocumentMapping.findMany({
      where: { documentId, difyDocumentId: { not: null } },
    });
    if (mappings.length === 0) {
      await this.syncDocument(documentId);
      return;
    }
    for (const m of mappings) {
      const difyDocId = m.difyDocumentId as string;
      try {
        const applied = await this.tryStatusActions(m.difyDatasetId, difyDocId, ['un_archive', 'enable']);
        await this.prisma.difyDocumentMapping.update({
          where: { id: m.id },
          data: { indexingStatus: applied ? 'completed' : m.indexingStatus },
        });
      } catch (err) {
        if (err instanceof DifyApiError && err.status === 404) {
          await this.syncDocument(documentId);
          return;
        }
        throw err;
      }
    }
  }

  private async tryStatusActions(
    datasetId: string,
    difyDocumentId: string,
    actions: DifyDocumentStatusAction[],
  ): Promise<DifyDocumentStatusAction | null> {
    for (const action of actions) {
      try {
        await this.dify.updateDocumentStatusBatch(datasetId, action, [difyDocumentId]);
        return action;
      } catch (err) {
        this.logger.warn(`Dify ${action} failed: ${(err as Error).message}`);
      }
    }
    return null;
  }
}
