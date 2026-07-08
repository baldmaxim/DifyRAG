import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  CONFIDENTIALITY_VALUES,
  DOCUMENT_TYPE_CODE_VALUES,
  SCOPE_VALUES,
  type Confidentiality,
  type DocumentTypeCode,
  type Scope,
} from '@dkp/shared';

export class ExternalCreateDocumentDto {
  @ApiProperty({ enum: SCOPE_VALUES })
  @IsIn(SCOPE_VALUES)
  scope!: Scope;

  @ApiPropertyOptional({ example: 'zilart-lot-31' })
  @IsOptional()
  @IsString()
  project_code?: string;

  @ApiProperty({ example: '07-finance/03-ks2-ks3/01-customer-ks2' })
  @IsString()
  folder_path!: string;

  @ApiProperty({ enum: DOCUMENT_TYPE_CODE_VALUES })
  @IsIn(DOCUMENT_TYPE_CODE_VALUES)
  document_type!: DocumentTypeCode;

  @ApiProperty({ example: 'КС-2 за июнь 2026' })
  @IsString()
  @MaxLength(500)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsISO8601()
  document_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  counterparty?: string;

  @ApiPropertyOptional({ enum: CONFIDENTIALITY_VALUES })
  @IsOptional()
  @IsIn(CONFIDENTIALITY_VALUES)
  confidentiality?: Confidentiality;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
