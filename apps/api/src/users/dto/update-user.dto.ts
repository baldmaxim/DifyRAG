import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { USER_ROLE_VALUES, type UserRole } from '@dkp/shared';

const USER_STATUS_VALUES = ['active', 'disabled'] as const;
export type UserStatus = (typeof USER_STATUS_VALUES)[number];

export class UpdateUserDto {
  @ApiPropertyOptional({ enum: USER_STATUS_VALUES, description: 'Статус учётной записи' })
  @IsOptional()
  @IsIn(USER_STATUS_VALUES)
  status?: UserStatus;

  @ApiPropertyOptional({ enum: USER_ROLE_VALUES, description: 'Роль пользователя' })
  @IsOptional()
  @IsIn(USER_ROLE_VALUES)
  role?: UserRole;
}
