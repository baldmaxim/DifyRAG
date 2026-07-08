import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { Document } from '@prisma/client';
import { ApiKeyScope } from '@dkp/shared';
import { CurrentApiKey } from '../common/decorators/current-api-key.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Scopes } from '../common/decorators/scopes.decorator';
import { apiKeyContext } from '../common/types/actor-context';
import type { AuthenticatedApiKey, AuthenticatedRequest } from '../common/types/authenticated-request';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { DocumentsService, type UploadUrlResult } from '../documents/documents.service';
import { CommitUploadDto } from '../documents/dto/commit-upload.dto';
import { UpdateDocumentDto } from '../documents/dto/update-document.dto';
import { UploadUrlDto } from '../documents/dto/upload-url.dto';
import { SearchDto } from '../search/dto/search.dto';
import { SearchService } from '../search/search.service';
import type { SearchResponse } from '../search/search.types';
import { ExternalCreateDocumentDto } from './dto/external-create-document.dto';
import { ExternalListQuery } from './dto/external-list.query';
import { ExternalService } from './external.service';
import { RateLimitGuard } from './rate-limit.guard';

@ApiTags('external')
@ApiSecurity('apiKey')
@Public() // skip JWT; authenticate via X-API-Key instead
@UseGuards(ApiKeyGuard, RateLimitGuard)
@Controller('external')
export class ExternalController {
  constructor(
    private readonly external: ExternalService,
    private readonly documents: DocumentsService,
    private readonly search: SearchService,
  ) {}

  @Post('documents')
  @Scopes(ApiKeyScope.DocumentsWrite)
  create(
    @Body() dto: ExternalCreateDocumentDto,
    @CurrentApiKey() apiKey: AuthenticatedApiKey,
    @Req() req: AuthenticatedRequest,
  ): Promise<Document> {
    return this.external.createDocument(dto, apiKeyContext(apiKey, req));
  }

  @Get('documents')
  @Scopes(ApiKeyScope.DocumentsRead)
  list(@Query() query: ExternalListQuery): Promise<Document[]> {
    return this.external.list(query);
  }

  @Get('documents/:id')
  @Scopes(ApiKeyScope.DocumentsRead)
  getById(@Param('id') id: string): Promise<Document> {
    return this.documents.getById(id);
  }

  @Patch('documents/:id')
  @Scopes(ApiKeyScope.DocumentsWrite)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentApiKey() apiKey: AuthenticatedApiKey,
    @Req() req: AuthenticatedRequest,
  ): Promise<Document> {
    return this.documents.update(id, dto, apiKeyContext(apiKey, req));
  }

  @Delete('documents/:id')
  @Scopes(ApiKeyScope.DocumentsDelete)
  softDelete(
    @Param('id') id: string,
    @CurrentApiKey() apiKey: AuthenticatedApiKey,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ id: string }> {
    return this.documents.softDelete(id, apiKeyContext(apiKey, req));
  }

  @Post('documents/:id/restore')
  @Scopes(ApiKeyScope.DocumentsWrite)
  restore(
    @Param('id') id: string,
    @CurrentApiKey() apiKey: AuthenticatedApiKey,
    @Req() req: AuthenticatedRequest,
  ): Promise<Document> {
    return this.documents.restore(id, apiKeyContext(apiKey, req));
  }

  @Post('documents/:id/upload-url')
  @Scopes(ApiKeyScope.DocumentsWrite)
  uploadUrl(
    @Param('id') id: string,
    @Body() dto: UploadUrlDto,
    @CurrentApiKey() apiKey: AuthenticatedApiKey,
    @Req() req: AuthenticatedRequest,
  ): Promise<UploadUrlResult> {
    return this.documents.createUploadUrl(id, dto, apiKeyContext(apiKey, req));
  }

  @Post('documents/:id/commit-upload')
  @Scopes(ApiKeyScope.DocumentsWrite)
  commitUpload(
    @Param('id') id: string,
    @Body() dto: CommitUploadDto,
    @CurrentApiKey() apiKey: AuthenticatedApiKey,
    @Req() req: AuthenticatedRequest,
  ): Promise<Document> {
    return this.documents.commitUpload(id, dto.uploadSessionId, apiKeyContext(apiKey, req));
  }

  @Post('documents/:id/reindex')
  @Scopes(ApiKeyScope.ProcessingWrite)
  reindex(
    @Param('id') id: string,
    @CurrentApiKey() apiKey: AuthenticatedApiKey,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ id: string; jobQueued: true }> {
    return this.documents.reindex(id, apiKeyContext(apiKey, req));
  }

  @Post('search')
  @Scopes(ApiKeyScope.SearchRead)
  runSearch(
    @Body() dto: SearchDto,
    @CurrentApiKey() apiKey: AuthenticatedApiKey,
    @Req() req: AuthenticatedRequest,
  ): Promise<SearchResponse> {
    // External keys never see private datasets by default.
    return this.search.search(dto, { ctx: apiKeyContext(apiKey, req), includePrivate: false });
  }
}
