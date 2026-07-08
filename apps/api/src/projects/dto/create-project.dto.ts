import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'zilart-lot-31', description: 'Unique URL-safe project code' })
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]*$/, {
    message: 'code must be lowercase alphanumeric with dashes',
  })
  @MaxLength(64)
  code!: string;

  @ApiProperty({ example: 'ЖК Зиларт, лот 31' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
