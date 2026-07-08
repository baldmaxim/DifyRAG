import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsIn, IsOptional, IsISO8601, IsString } from 'class-validator';
import { API_KEY_SCOPE_VALUES, type ApiKeyScope } from '@dkp/shared';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'ERP integration' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: API_KEY_SCOPE_VALUES, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(API_KEY_SCOPE_VALUES, { each: true })
  scopes!: ApiKeyScope[];

  @ApiProperty({ required: false, example: '2027-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
