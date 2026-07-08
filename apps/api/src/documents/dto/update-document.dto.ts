import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import {
  CONFIDENTIALITY_VALUES,
  DOCUMENT_TYPE_CODE_VALUES,
  type Confidentiality,
  type DocumentTypeCode,
} from '@dkp/shared';

export class UpdateDocumentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO8601()
  documentDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  counterparty?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contractNumber?: string;

  @ApiProperty({ required: false, enum: CONFIDENTIALITY_VALUES })
  @IsOptional()
  @IsIn(CONFIDENTIALITY_VALUES)
  confidentiality?: Confidentiality;

  @ApiProperty({ required: false, description: 'Move to another folder.' })
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @ApiProperty({ required: false, enum: DOCUMENT_TYPE_CODE_VALUES })
  @IsOptional()
  @IsIn(DOCUMENT_TYPE_CODE_VALUES)
  documentTypeCode?: DocumentTypeCode;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
