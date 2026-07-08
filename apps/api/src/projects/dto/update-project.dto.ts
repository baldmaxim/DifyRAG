import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { CreateProjectDto } from './create-project.dto';

const PROJECT_STATUSES = ['active', 'archived'] as const;
type ProjectStatusLiteral = (typeof PROJECT_STATUSES)[number];

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @ApiProperty({ required: false, enum: PROJECT_STATUSES })
  @IsOptional()
  @IsIn(PROJECT_STATUSES)
  status?: ProjectStatusLiteral;
}
