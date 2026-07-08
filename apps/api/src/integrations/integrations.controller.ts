import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@dkp/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { DifyHealthService } from './dify/dify-health.service';
import type { HealthResult } from './health.types';
import { IntegrationsHealthService } from './integrations-health.service';
import { LmStudioHealthService } from './lmstudio/lmstudio-health.service';
import { QdrantHealthService } from './qdrant/qdrant-health.service';
import { QdrantReadonlyClient } from './qdrant/qdrant-readonly.client';

@ApiTags('integrations')
@ApiBearerAuth('jwt')
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly health: IntegrationsHealthService,
    private readonly dify: DifyHealthService,
    private readonly lmStudio: LmStudioHealthService,
    private readonly qdrant: QdrantHealthService,
    private readonly qdrantClient: QdrantReadonlyClient,
  ) {}

  @Get('health')
  checkAll(): Promise<HealthResult[]> {
    return this.health.checkAll();
  }

  @Get('dify/health')
  difyHealth(): Promise<HealthResult> {
    return this.dify.check();
  }

  @Get('lmstudio/health')
  lmStudioHealth(): Promise<HealthResult> {
    return this.lmStudio.check();
  }

  @Get('qdrant/health')
  qdrantHealth(): Promise<HealthResult> {
    return this.qdrant.check();
  }

  @Get('qdrant/collections')
  @Roles(UserRole.Admin, UserRole.SuperAdmin)
  qdrantCollections(): Promise<string[]> {
    return this.qdrantClient.listCollections();
  }
}
