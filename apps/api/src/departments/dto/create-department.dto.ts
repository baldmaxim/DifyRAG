import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'pto' })
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]*$/, { message: 'slug must be URL-safe' })
  @MaxLength(64)
  slug!: string;

  @ApiProperty({ example: 'ПТО' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: 'Markdown describing department skills' })
  @IsOptional()
  @IsString()
  skillsMarkdown?: string;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
