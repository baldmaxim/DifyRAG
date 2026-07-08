import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { DOCUMENT_STATUS_VALUES, type DocumentStatus } from '@dkp/shared';

export class ListDocumentsQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @ApiPropertyOptional({ enum: DOCUMENT_STATUS_VALUES })
  @IsOptional()
  @IsIn(DOCUMENT_STATUS_VALUES)
  status?: DocumentStatus;

  @ApiPropertyOptional({ description: 'Free-text search over title/description.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Include soft-deleted documents (admin views).' })
  @IsOptional()
  @IsString()
  includeDeleted?: string;
}
