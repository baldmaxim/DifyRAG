import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CommitUploadDto {
  @ApiProperty({ description: 'Upload session id returned by upload-url.' })
  @IsUUID()
  uploadSessionId!: string;
}
