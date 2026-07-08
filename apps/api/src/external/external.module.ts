import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DocumentsModule } from '../documents/documents.module';
import { SearchModule } from '../search/search.module';
import { ExternalController } from './external.controller';
import { ExternalService } from './external.service';
import { RateLimitGuard } from './rate-limit.guard';

@Module({
  imports: [AuthModule, DocumentsModule, SearchModule],
  controllers: [ExternalController],
  providers: [ExternalService, RateLimitGuard],
})
export class ExternalModule {}
