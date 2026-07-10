import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'i.ivanov@stroyfirma.kz' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Иванов Иван', minLength: 2 })
  @IsString()
  @MinLength(2)
  fullName!: string;

  @ApiProperty({ example: 'change-me-strong', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
