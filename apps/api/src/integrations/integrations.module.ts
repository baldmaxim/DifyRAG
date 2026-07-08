import { Module } from '@nestjs/common';
import { DifyModule } from './dify/dify.module';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsHealthService } from './integrations-health.service';
import { LmStudioModule } from './lmstudio/lmstudio.module';
import { QdrantModule } from './qdrant/qdrant.module';
import { S3HealthService } from './s3-health.service';

@Module({
  imports: [DifyModule, LmStudioModule, QdrantModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsHealthService, S3HealthService],
  exports: [DifyModule, LmStudioModule, QdrantModule, IntegrationsHealthService],
})
export class IntegrationsModule {}
