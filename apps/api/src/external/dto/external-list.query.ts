import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';
import { DOCUMENT_STATUS_VALUES, type DocumentStatus } from '@dkp/shared';

export class ExternalListQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  project_code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  folder_path?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  document_type?: string;

  @ApiPropertyOptional({ enum: DOCUMENT_STATUS_VALUES })
  @IsOptional()
  @IsIn(DOCUMENT_STATUS_VALUES)
  status?: DocumentStatus;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  updated_since?: string;
}
