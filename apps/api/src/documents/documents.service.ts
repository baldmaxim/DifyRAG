import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Document, DocumentVersion, Prisma } from '@prisma/client';
import { ProcessingJobType, type DocumentTypeCode } from '@dkp/shared';
import { AuditService } from '../common/audit/audit.service';
import { PrismaService } from '../common/prisma/prisma.service';
import type { ActorContext } from '../common/types/actor-context';
import { StorageService } from '../storage/storage.service';
import { buildObjectKey } from '../storage/object-key';
import { validateUpload } from '../storage/file-validation';
import type { CreateDocumentDto } from './dto/create-document.dto';
import type { UpdateDocumentDto } from './dto/update-document.dto';
import type { UploadUrlDto } from './dto/upload-url.dto';
import type { ListDocumentsQuery } from './dto/list-documents.query';

const DOCUMENT_INCLUDE = {
  documentType: true,
  folder: true,
  currentVersion: true,
} satisfies Prisma.DocumentInclude;

export interface UploadUrlResult {
  uploadSessionId: string;
  uploadUrl: string;
  s3Key: string;
  expiresAt: Date;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async list(query: ListDocumentsQuery): Promise<Document[]> {
    const where: Prisma.DocumentWhereInput = {
      deletedAt: query.includeDeleted === 'true' ? undefined : null,
      projectId: query.projectId,
      folderId: query.folderId,
      status: query.status,
    };
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { counterparty: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.document.findMany({
      where,
      include: DOCUMENT_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  async getById(id: string, includeDeleted = false): Promise<Document> {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: DOCUMENT_INCLUDE,
    });
    if (!document || (!includeDeleted && document.deletedAt)) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  private async resolveDocumentTypeId(code: DocumentTypeCode): Promise<string> {
    const type = await this.prisma.documentType.findUnique({ where: { code } });
    if (!type) {
      throw new BadRequestException(`Unknown document type: ${code}`);
    }
    return type.id;
  }

  async create(dto: CreateDocumentDto, ctx: ActorContext): Promise<Document> {
    const folder = await this.prisma.folder.findUnique({ where: { id: dto.folderId } });
    if (!folder) {
      throw new BadRequestException('Folder not found');
    }
    const documentTypeId = await this.resolveDocumentTypeId(dto.documentTypeCode);

    const document = await this.prisma.document.create({
      data: {
        scope: folder.scope,
        projectId: folder.projectId,
        departmentId: folder.departmentId,
        folderId: folder.id,
        documentTypeId,
        title: dto.title,
        description: dto.description,
        documentDate: dto.documentDate ? new Date(dto.documentDate) : null,
        counterparty: dto.counterparty,
        contractNumber: dto.contractNumber,
        confidentiality: dto.confidentiality ?? 'internal',
        status: 'draft',
        metadata: (dto.metadata as Prisma.InputJsonValue) ?? undefined,
        createdByUserId: ctx.userId ?? (await this.systemUserId()),
      },
      include: DOCUMENT_INCLUDE,
    });

    await this.audit.write({
      actor: ctx.actor,
      action: 'document.create',
      resourceType: 'document',
      resourceId: document.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      after: { title: document.title, folderId: document.folderId },
    });
    return document;
  }

  async update(id: string, dto: UpdateDocumentDto, ctx: ActorContext): Promise<Document> {
    const before = await this.getById(id);
    const data: Prisma.DocumentUpdateInput = {
      title: dto.title,
      description: dto.description,
      documentDate: dto.documentDate ? new Date(dto.documentDate) : undefined,
      counterparty: dto.counterparty,
      contractNumber: dto.contractNumber,
      confidentiality: dto.confidentiality,
      metadata: (dto.metadata as Prisma.InputJsonValue) ?? undefined,
      updatedBy: ctx.userId ? { connect: { id: ctx.userId } } : undefined,
    };

    if (dto.folderId && dto.folderId !== before.folderId) {
      const folder = await this.prisma.folder.findUnique({ where: { id: dto.folderId } });
      if (!folder) {
        throw new BadRequestException('Target folder not found');
      }
      data.folder = { connect: { id: folder.id } };
      data.scope = folder.scope;
      data.project = folder.projectId ? { connect: { id: folder.projectId } } : { disconnect: true };
    }
    if (dto.documentTypeCode) {
      data.documentType = { connect: { id: await this.resolveDocumentTypeId(dto.documentTypeCode) } };
    }

    const document = await this.prisma.document.update({
      where: { id },
      data,
      include: DOCUMENT_INCLUDE,
    });

    await this.audit.write({
      actor: ctx.actor,
      action: 'document.update',
      resourceType: 'document',
      resourceId: id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      before: { title: before.title },
      after: { title: document.title },
    });
    return document;
  }

  async createUploadUrl(id: string, dto: UploadUrlDto, ctx: ActorContext): Promise<UploadUrlResult> {
    const document = await this.getById(id);
    validateUpload({
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes ?? null,
      maxFileSizeBytes: this.config.get<number>('s3.maxFileSizeBytes') ?? 524_288_000,
    });

    const nextVersion = (await this.maxVersionNo(id)) + 1;
    const projectCode = document.projectId
      ? (await this.prisma.project.findUnique({ where: { id: document.projectId } }))?.code
      : null;
    const s3Key = buildObjectKey({
      scope: document.scope,
      projectCode,
      documentId: id,
      versionNo: nextVersion,
      fileName: dto.fileName,
      date: document.documentDate ?? undefined,
    });

    const ttl = this.config.get<number>('s3.presignedUrlTtlSeconds') ?? 900;
    const expiresAt = new Date(Date.now() + ttl * 1000);

    const session = await this.prisma.fileUploadSession.create({
      data: {
        documentId: id,
        intendedFileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes != null ? BigInt(dto.sizeBytes) : null,
        checksumSha256: dto.checksumSha256,
        s3Bucket: this.storage.bucket,
        s3Key,
        status: 'created',
        expiresAt,
        createdByUserId: ctx.userId ?? null,
        createdByApiKeyId: ctx.apiKeyId ?? null,
      },
    });

    await this.prisma.document.update({ where: { id }, data: { status: 'uploading' } });
    const uploadUrl = await this.storage.createPresignedPutUrl({
      key: s3Key,
      contentType: dto.mimeType,
      expiresInSeconds: ttl,
    });

    return { uploadSessionId: session.id, uploadUrl, s3Key, expiresAt };
  }

  async commitUpload(id: string, uploadSessionId: string, ctx: ActorContext): Promise<Document> {
    await this.getById(id); // asserts the document exists and is not soft-deleted
    const session = await this.prisma.fileUploadSession.findUnique({ where: { id: uploadSessionId } });
    if (!session || session.documentId !== id) {
      throw new NotFoundException('Upload session not found');
    }
    if (session.status !== 'created') {
      throw new ConflictException(`Upload session is ${session.status}`);
    }

    const head = await this.storage.headObject(session.s3Key);
    const versionNo = (await this.maxVersionNo(id)) + 1;
    const uploadSource = ctx.apiKeyId ? 'external_api' : 'web';

    const version = await this.prisma.$transaction(async (tx) => {
      await tx.documentVersion.updateMany({ where: { documentId: id }, data: { isCurrent: false } });
      const created = await tx.documentVersion.create({
        data: {
          documentId: id,
          versionNo,
          originalFileName: session.intendedFileName,
          mimeType: session.mimeType,
          sizeBytes: BigInt(head.contentLength || Number(session.sizeBytes ?? 0n)),
          checksumSha256: session.checksumSha256 ?? '',
          s3Bucket: session.s3Bucket,
          s3Key: session.s3Key,
          s3VersionId: head.versionId ?? null,
          uploadedByUserId: ctx.userId ?? null,
          uploadSource,
          isCurrent: true,
        },
      });
      await tx.document.update({
        where: { id },
        data: { currentVersionId: created.id, status: 'queued' },
      });
      await tx.fileUploadSession.update({
        where: { id: uploadSessionId },
        data: { status: 'committed', committedAt: new Date() },
      });
      await tx.processingJob.create({
        data: {
          documentId: id,
          documentVersionId: created.id,
          jobType:
            versionNo === 1
              ? ProcessingJobType.DifyCreateDocument
              : ProcessingJobType.DifyUpdateDocument,
          status: 'queued',
        },
      });
      return created;
    });

    await this.audit.write({
      actor: ctx.actor,
      action: 'document.commit_upload',
      resourceType: 'document',
      resourceId: id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      after: { versionNo: version.versionNo, s3Key: session.s3Key },
    });

    return this.getById(id);
  }

  async getDownloadUrl(id: string, ctx: ActorContext): Promise<{ url: string; fileName: string }> {
    const document = await this.getById(id);
    if (!document.currentVersionId) {
      throw new NotFoundException('Document has no current version');
    }
    const version = await this.prisma.documentVersion.findUnique({
      where: { id: document.currentVersionId },
    });
    if (!version) {
      throw new NotFoundException('Current version not found');
    }
    const url = await this.storage.createPresignedGetUrl({
      key: version.s3Key,
      downloadFileName: version.originalFileName,
    });
    await this.audit.write({
      actor: ctx.actor,
      action: 'document.download_url',
      resourceType: 'document',
      resourceId: id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return { url, fileName: version.originalFileName };
  }

  listVersions(id: string): Promise<DocumentVersion[]> {
    return this.prisma.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { versionNo: 'desc' },
    });
  }

  async makeCurrent(id: string, versionId: string, ctx: ActorContext): Promise<Document> {
    await this.getById(id);
    const version = await this.prisma.documentVersion.findUnique({ where: { id: versionId } });
    if (!version || version.documentId !== id) {
      throw new NotFoundException('Version not found');
    }
    await this.prisma.$transaction([
      this.prisma.documentVersion.updateMany({ where: { documentId: id }, data: { isCurrent: false } }),
      this.prisma.documentVersion.update({ where: { id: versionId }, data: { isCurrent: true } }),
      this.prisma.document.update({
        where: { id },
        data: { currentVersionId: versionId, status: 'queued' },
      }),
      this.prisma.processingJob.create({
        data: {
          documentId: id,
          documentVersionId: versionId,
          jobType: ProcessingJobType.DifyReindexDocument,
          status: 'queued',
        },
      }),
    ]);
    await this.audit.write({
      actor: ctx.actor,
      action: 'document.make_current_version',
      resourceType: 'document',
      resourceId: id,
      after: { versionId },
    });
    return this.getById(id);
  }

  async softDelete(id: string, ctx: ActorContext): Promise<{ id: string }> {
    const document = await this.getById(id);
    await this.prisma.$transaction([
      this.prisma.document.update({
        where: { id },
        data: {
          status: 'deleted',
          deletedAt: new Date(),
          deletedByUserId: ctx.userId ?? null,
        },
      }),
      this.prisma.processingJob.create({
        data: {
          documentId: id,
          jobType: ProcessingJobType.DifyArchiveDocument,
          status: 'queued',
        },
      }),
    ]);
    await this.audit.write({
      actor: ctx.actor,
      action: 'document.soft_delete',
      resourceType: 'document',
      resourceId: id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      before: { status: document.status },
    });
    return { id };
  }

  async restore(id: string, ctx: ActorContext): Promise<Document> {
    const document = await this.getById(id, true);
    if (!document.deletedAt) {
      throw new BadRequestException('Document is not deleted');
    }
    await this.prisma.$transaction([
      this.prisma.document.update({
        where: { id },
        data: {
          status: document.currentVersionId ? 'queued' : 'draft',
          deletedAt: null,
          deletedByUserId: null,
        },
      }),
      this.prisma.processingJob.create({
        data: {
          documentId: id,
          jobType: ProcessingJobType.DifyRestoreDocument,
          status: 'queued',
        },
      }),
    ]);
    await this.audit.write({
      actor: ctx.actor,
      action: 'document.restore',
      resourceType: 'document',
      resourceId: id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return this.getById(id);
  }

  async reindex(id: string, ctx: ActorContext): Promise<{ id: string; jobQueued: true }> {
    const document = await this.getById(id);
    await this.prisma.$transaction([
      this.prisma.document.update({ where: { id }, data: { status: 'queued' } }),
      this.prisma.processingJob.create({
        data: {
          documentId: id,
          documentVersionId: document.currentVersionId,
          jobType: ProcessingJobType.DifyReindexDocument,
          status: 'queued',
        },
      }),
    ]);
    await this.audit.write({
      actor: ctx.actor,
      action: 'document.reindex',
      resourceType: 'document',
      resourceId: id,
    });
    return { id, jobQueued: true };
  }

  private async maxVersionNo(documentId: string): Promise<number> {
    const agg = await this.prisma.documentVersion.aggregate({
      where: { documentId },
      _max: { versionNo: true },
    });
    return agg._max.versionNo ?? 0;
  }

  /** Fallback owner for system-created documents (external API without a user). */
  private async systemUserId(): Promise<string> {
    const admin = await this.prisma.user.findFirst({
      where: { role: 'super_admin' },
      orderBy: { createdAt: 'asc' },
    });
    if (!admin) {
      throw new BadRequestException('No system user available to own the document');
    }
    return admin.id;
  }
}
