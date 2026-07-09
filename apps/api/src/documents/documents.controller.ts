import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Document, DocumentVersion } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { userContext } from '../common/types/actor-context';
import type { AuthenticatedRequest, AuthenticatedUser } from '../common/types/authenticated-request';
import { DocumentsService, type UploadUrlResult } from './documents.service';
import { CommitUploadDto } from './dto/commit-upload.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { ListDocumentsQuery } from './dto/list-documents.query';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { UploadUrlDto } from './dto/upload-url.dto';

@ApiTags('documents')
@ApiBearerAuth('jwt')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(@Query() query: ListDocumentsQuery): Promise<Document[]> {
    return this.documents.list(query);
  }

  @Get('search')
  metadataSearch(@Query('q') q: string): Promise<Document[]> {
    return this.documents.metadataSearch(q ?? '');
  }

  @Get(':id')
  getById(@Param('id') id: string): Promise<Document> {
    return this.documents.getById(id);
  }

  @Post()
  create(
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthenticatedRequest,
  ): Promise<Document> {
    return this.documents.create(dto, userContext(user, req));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthenticatedRequest,
  ): Promise<Document> {
    return this.documents.update(id, dto, userContext(user, req));
  }

  @Delete(':id')
  softDelete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ id: string }> {
    return this.documents.softDelete(id, userContext(user, req));
  }

  @Post(':id/restore')
  restore(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthenticatedRequest,
  ): Promise<Document> {
    return this.documents.restore(id, userContext(user, req));
  }

  @Post(':id/upload-url')
  uploadUrl(
    @Param('id') id: string,
    @Body() dto: UploadUrlDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthenticatedRequest,
  ): Promise<UploadUrlResult> {
    return this.documents.createUploadUrl(id, dto, userContext(user, req));
  }

  @Post(':id/commit-upload')
  commitUpload(
    @Param('id') id: string,
    @Body() dto: CommitUploadDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthenticatedRequest,
  ): Promise<Document> {
    return this.documents.commitUpload(id, dto.uploadSessionId, userContext(user, req));
  }

  @Get(':id/download-url')
  downloadUrl(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ url: string; fileName: string }> {
    return this.documents.getDownloadUrl(id, userContext(user, req));
  }

  @Get(':id/versions')
  versions(@Param('id') id: string): Promise<DocumentVersion[]> {
    return this.documents.listVersions(id);
  }

  @Post(':id/versions/:versionId/make-current')
  makeCurrent(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthenticatedRequest,
  ): Promise<Document> {
    return this.documents.makeCurrent(id, versionId, userContext(user, req));
  }

  @Post(':id/reindex')
  reindex(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ id: string; jobQueued: true }> {
    return this.documents.reindex(id, userContext(user, req));
  }
}
