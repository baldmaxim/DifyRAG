import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { SCOPE_VALUES, type Scope } from '@dkp/shared';

export type SearchMode = 'chunks' | 'answer';

export class SearchDto {
  @ApiProperty({ example: 'Найди КС-2 по заказчику за июнь 2026' })
  @IsString()
  @MinLength(2)
  query!: string;

  @ApiPropertyOptional({ enum: SCOPE_VALUES, default: 'project' })
  @IsOptional()
  @IsIn(SCOPE_VALUES)
  scope?: Scope;

  @ApiPropertyOptional({ example: 'zilart-lot-31' })
  @IsOptional()
  @IsString()
  project_code?: string;

  @ApiPropertyOptional({ example: '07-finance/03-ks2-ks3/01-customer-ks2' })
  @IsOptional()
  @IsString()
  folder_path?: string;

  @ApiPropertyOptional({ example: 'ks2' })
  @IsOptional()
  @IsString()
  document_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department_slug?: string;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  top_k?: number;

  @ApiPropertyOptional({ default: 0.2, minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  score_threshold?: number;

  @ApiPropertyOptional({ enum: ['chunks', 'answer'], default: 'chunks' })
  @IsOptional()
  @IsIn(['chunks', 'answer'])
  mode?: SearchMode;
}
