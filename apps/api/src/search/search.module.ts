import { Module } from '@nestjs/common';
import { DifyModule } from '../integrations/dify/dify.module';
import { DatasetResolverService } from './dataset-resolver.service';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [DifyModule],
  controllers: [SearchController],
  providers: [SearchService, DatasetResolverService],
  exports: [SearchService, DatasetResolverService],
})
export class SearchModule {}
