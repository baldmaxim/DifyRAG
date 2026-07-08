import { Module } from '@nestjs/common';
import { QdrantHealthService } from './qdrant-health.service';
import { QdrantReadonlyClient } from './qdrant-readonly.client';

@Module({
  providers: [QdrantReadonlyClient, QdrantHealthService],
  exports: [QdrantReadonlyClient, QdrantHealthService],
})
export class QdrantModule {}
