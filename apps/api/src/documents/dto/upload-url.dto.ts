import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class UploadUrlDto {
  @ApiProperty({ example: 'ks2-june.pdf' })
  @IsString()
  fileName!: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ required: false, example: 123456 })
  @IsOptional()
  @IsInt()
  @Min(1)
  sizeBytes?: number;

  @ApiProperty({ required: false, description: 'Client-computed SHA-256 (hex).' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i, { message: 'checksumSha256 must be 64 hex chars' })
  checksumSha256?: string;
}
