import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ minLength: 8, description: 'Новый пароль пользователя' })
  @IsString()
  @MinLength(8)
  password!: string;
}
