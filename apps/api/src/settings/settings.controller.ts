import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@dkp/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { userContext } from '../common/types/actor-context';
import type { AuthenticatedRequest, AuthenticatedUser } from '../common/types/authenticated-request';
import { IntegrationsHealthService } from '../integrations/integrations-health.service';
import type { HealthResult } from '../integrations/health.types';
import { SettingsService, type MaskedGroup } from './settings.service';

const GROUP_TO_PROVIDER: Record<string, 'dify' | 'lmstudio' | 'qdrant' | 's3'> = {
  s3: 's3',
  dify: 'dify',
  lmStudio: 'lmstudio',
  qdrant: 'qdrant',
};

@ApiTags('settings')
@ApiBearerAuth('jwt')
@Roles(UserRole.Admin, UserRole.SuperAdmin)
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly health: IntegrationsHealthService,
  ) {}

  @Get()
  list(): MaskedGroup[] {
    return this.settings.getMasked();
  }

  @Patch(':group')
  update(
    @Param('group') group: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthenticatedRequest,
  ): Promise<MaskedGroup> {
    return this.settings.update(group, body, userContext(user, req));
  }

  @Post(':group/test')
  async test(@Param('group') group: string): Promise<HealthResult | { supported: false }> {
    const provider = GROUP_TO_PROVIDER[group];
    if (!provider) {
      return { supported: false };
    }
    return this.health.checkOne(provider);
  }
}
