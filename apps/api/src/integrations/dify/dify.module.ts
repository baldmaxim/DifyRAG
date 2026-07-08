import { Module } from '@nestjs/common';
import { DifyClient } from './dify.client';
import { DifyDatasetMappingService } from './dify-dataset-mapping.service';
import { DifyDocumentSyncService } from './dify-document-sync.service';
import { DifyHealthService } from './dify-health.service';
import { DifySearchService } from './dify-search.service';

@Module({
  providers: [
    DifyClient,
    DifyDatasetMappingService,
    DifyDocumentSyncService,
    DifyHealthService,
    DifySearchService,
  ],
  exports: [
    DifyClient,
    DifyDatasetMappingService,
    DifyDocumentSyncService,
    DifyHealthService,
    DifySearchService,
  ],
})
export class DifyModule {}
