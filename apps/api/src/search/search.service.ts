import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import type { DifyConfig } from '../config/configuration';
import { PrismaService } from '../common/prisma/prisma.service';
import type { ActorContext } from '../common/types/actor-context';
import { DifyAppService } from '../integrations/dify/dify-app.service';
import { DifySearchService, type RetrievedChunk } from '../integrations/dify/dify-search.service';
import { DatasetResolverService } from './dataset-resolver.service';
import type { SearchDto } from './dto/search.dto';
import type { SearchChunk, SearchResponse, SearchSource } from './search.types';

export interface SearchExecuteOptions {
  ctx: ActorContext;
  includePrivate: boolean;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly cfg: DifyConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: DatasetResolverService,
    private readonly difySearch: DifySearchService,
    private readonly difyApp: DifyAppService,
    config: ConfigService,
  ) {
    this.cfg = config.getOrThrow<DifyConfig>('dify');
  }

  async search(dto: SearchDto, options: SearchExecuteOptions): Promise<SearchResponse> {
    const traceId = randomUUID();
    const start = Date.now();
    const scope = dto.scope ?? 'project';
    const topK = dto.top_k ?? this.cfg.retrieveTopK;
    const scoreThreshold = dto.score_threshold ?? this.cfg.retrieveScoreThreshold;

    const resolved = await this.resolver.resolve({
      scope,
      projectCode: dto.project_code,
      folderPath: dto.folder_path,
      departmentSlug: dto.department_slug,
      includePrivate: options.includePrivate,
    });
    const warnings = [...resolved.warnings];

    if (resolved.datasetIds.length === 0) {
      await this.logSearch(dto, options.ctx, resolved.projectId, [], 0, Date.now() - start, 'success');
      return { answer: null, chunks: [], sources: [], trace_id: traceId, warnings };
    }

    const settled = await Promise.allSettled(
      resolved.datasetIds.map((datasetId) =>
        this.difySearch.retrieveFromDataset(datasetId, dto.query, { topK, scoreThreshold }),
      ),
    );
    const raw: RetrievedChunk[] = [];
    for (const r of settled) {
      if (r.status === 'fulfilled') raw.push(...r.value);
      else warnings.push('dataset_partial_failure');
    }

    raw.sort((a, b) => b.score - a.score);
    const enriched = await this.enrich(raw.slice(0, topK * 2), dto);
    const chunks = enriched.slice(0, topK);
    const sources = this.buildSources(chunks);

    let answer: string | null = null;
    if (dto.mode === 'answer') {
      if (this.difyApp.isConfigured()) {
        answer = await this.difyApp.generateAnswer(
          dto.query,
          { project_code: dto.project_code, folder_path: dto.folder_path },
          options.ctx.userId ?? options.ctx.apiKeyId ?? 'anonymous',
        );
      } else {
        warnings.push('answer_mode_not_configured');
      }
    }

    await this.logSearch(
      dto,
      options.ctx,
      resolved.projectId,
      resolved.datasetIds,
      chunks.length,
      Date.now() - start,
      'success',
    );

    return { answer, chunks, sources, trace_id: traceId, warnings };
  }

  private async enrich(raw: RetrievedChunk[], dto: SearchDto): Promise<SearchChunk[]> {
    const difyDocIds = [...new Set(raw.map((r) => r.difyDocumentId).filter((v): v is string => Boolean(v)))];
    const mappings = difyDocIds.length
      ? await this.prisma.difyDocumentMapping.findMany({
          where: { difyDocumentId: { in: difyDocIds } },
        })
      : [];
    const difyToDocId = new Map(mappings.map((m) => [m.difyDocumentId as string, m.documentId]));

    const docIds = [...new Set([...difyToDocId.values()])];
    const documents = docIds.length
      ? await this.prisma.document.findMany({
          where: { id: { in: docIds } },
          include: { currentVersion: true, folder: true, project: true, documentType: true },
        })
      : [];
    const docById = new Map(documents.map((d) => [d.id, d]));

    const result: SearchChunk[] = [];
    for (const r of raw) {
      const documentId = r.difyDocumentId ? (difyToDocId.get(r.difyDocumentId) ?? null) : null;
      const doc = documentId ? docById.get(documentId) : undefined;

      // Post-filter by folder path (descendants) and document type.
      if (dto.folder_path && doc && !doc.folder.path.startsWith(dto.folder_path)) continue;
      if (dto.document_type && doc && doc.documentType.code !== dto.document_type) continue;

      result.push({
        content: r.content,
        score: r.score,
        dataset_id: r.datasetId,
        dify_document_id: r.difyDocumentId,
        document_id: documentId,
        document_title: doc?.title ?? null,
        document_type: doc?.documentType.code ?? null,
        project_code: doc?.project?.code ?? null,
        folder_path: doc?.folder.path ?? null,
        source: {
          file_name: doc?.currentVersion?.originalFileName ?? null,
          document_version_id: doc?.currentVersionId ?? null,
          page: null,
        },
      });
    }
    return result;
  }

  private buildSources(chunks: SearchChunk[]): SearchSource[] {
    const byDoc = new Map<string, SearchSource>();
    for (const c of chunks) {
      if (c.document_id && !byDoc.has(c.document_id)) {
        byDoc.set(c.document_id, {
          document_id: c.document_id,
          title: c.document_title ?? '',
          file_name: c.source.file_name,
          folder_path: c.folder_path,
        });
      }
    }
    return [...byDoc.values()];
  }

  private async logSearch(
    dto: SearchDto,
    ctx: ActorContext,
    projectId: string | null,
    datasetIds: string[],
    resultCount: number,
    latencyMs: number,
    status: 'success' | 'error',
  ): Promise<void> {
    try {
      await this.prisma.ragSearchLog.create({
        data: {
          actorType: ctx.actor.actorType,
          actorUserId: ctx.actor.actorUserId ?? null,
          actorApiKeyId: ctx.actor.actorApiKeyId ?? null,
          query: dto.query,
          scope: dto.scope ?? 'project',
          projectId,
          folderPath: dto.folder_path,
          datasetIds,
          topK: dto.top_k ?? this.cfg.retrieveTopK,
          resultCount,
          latencyMs,
          status,
        } satisfies Prisma.RagSearchLogUncheckedCreateInput,
      });
    } catch (err) {
      this.logger.warn(`Failed to log search: ${(err as Error).message}`);
    }
  }
}
