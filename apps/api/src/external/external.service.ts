import { BadRequestException, Injectable } from '@nestjs/common';
import type { Document, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import type { ActorContext } from '../common/types/actor-context';
import { DocumentsService } from '../documents/documents.service';
import type { ExternalCreateDocumentDto } from './dto/external-create-document.dto';
import type { ExternalListQuery } from './dto/external-list.query';

@Injectable()
export class ExternalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
  ) {}

  async createDocument(dto: ExternalCreateDocumentDto, ctx: ActorContext): Promise<Document> {
    let projectId: string | null = null;
    if (dto.scope === 'project') {
      if (!dto.project_code) {
        throw new BadRequestException('project_code is required for project scope');
      }
      const project = await this.prisma.project.findUnique({ where: { code: dto.project_code } });
      if (!project) {
        throw new BadRequestException(`Unknown project_code: ${dto.project_code}`);
      }
      projectId = project.id;
    }

    const folder = await this.prisma.folder.findFirst({
      where: { scope: dto.scope, projectId, path: dto.folder_path },
    });
    if (!folder) {
      throw new BadRequestException(`Folder not found: ${dto.folder_path}`);
    }

    return this.documents.create(
      {
        folderId: folder.id,
        documentTypeCode: dto.document_type,
        title: dto.title,
        description: dto.description,
        documentDate: dto.document_date,
        counterparty: dto.counterparty,
        confidentiality: dto.confidentiality,
        metadata: dto.metadata,
      },
      ctx,
    );
  }

  list(query: ExternalListQuery): Promise<Document[]> {
    const where: Prisma.DocumentWhereInput = { deletedAt: null, status: query.status };
    if (query.project_code) where.project = { code: query.project_code };
    if (query.folder_path) where.folder = { path: { startsWith: query.folder_path } };
    if (query.document_type) where.documentType = { code: query.document_type };
    if (query.updated_since) where.updatedAt = { gte: new Date(query.updated_since) };

    return this.prisma.document.findMany({
      where,
      include: { documentType: true, folder: true, currentVersion: true },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }
}
