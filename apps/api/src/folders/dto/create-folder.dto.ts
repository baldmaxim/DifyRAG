import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { SCOPE_VALUES, type Scope } from '@dkp/shared';

export class CreateFolderDto {
  @ApiProperty({ enum: SCOPE_VALUES })
  @IsIn(SCOPE_VALUES)
  scope!: Scope;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty({ example: 'Дополнительная папка' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: 'extra-folder' })
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]*$/i, { message: 'slug must be URL-safe' })
  @MaxLength(120)
  slug!: string;
}
