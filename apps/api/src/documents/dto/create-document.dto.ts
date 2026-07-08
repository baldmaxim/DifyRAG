import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import {
  CONFIDENTIALITY_VALUES,
  DOCUMENT_TYPE_CODE_VALUES,
  type Confidentiality,
  type DocumentTypeCode,
} from '@dkp/shared';

export class CreateDocumentDto {
  @ApiProperty({ description: 'Folder the document belongs to (determines scope/project).' })
  @IsUUID()
  folderId!: string;

  @ApiProperty({ enum: DOCUMENT_TYPE_CODE_VALUES })
  @IsIn(DOCUMENT_TYPE_CODE_VALUES)
  documentTypeCode!: DocumentTypeCode;

  @ApiProperty({ example: 'КС-2 за июнь 2026' })
  @IsString()
  @MaxLength(500)
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, example: '2026-06-30' })
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

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
