import { Module } from '@nestjs/common';
import { LmStudioClient } from './lmstudio.client';
import { LmStudioHealthService } from './lmstudio-health.service';

@Module({
  providers: [LmStudioClient, LmStudioHealthService],
  exports: [LmStudioClient, LmStudioHealthService],
})
export class LmStudioModule {}
