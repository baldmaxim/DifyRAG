import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@dkp/shared';
import { AuditService } from '../../common/audit/audit.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedRequest, AuthenticatedUser } from '../../common/types/authenticated-request';
import { ApiKeysService, type ApiKeySummary, type CreatedApiKey } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@ApiTags('api-keys')
@ApiBearerAuth('jwt')
@Roles(UserRole.Admin)
@Controller('api-keys')
export class ApiKeysController {
  constructor(
    private readonly apiKeys: ApiKeysService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  async create(
    @Body() dto: CreateApiKeyDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthenticatedRequest,
  ): Promise<CreatedApiKey> {
    const created = await this.apiKeys.create(dto, user.id);
    await this.audit.write({
      actor: AuditService.actorFromUser(user),
      action: 'api_key.create',
      resourceType: 'api_key',
      resourceId: created.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
      after: { name: created.name, scopes: created.scopes, prefix: created.prefix },
    });
    return created;
  }

  @Get()
  list(): Promise<ApiKeySummary[]> {
    return this.apiKeys.list();
  }

  @Delete(':id')
  async revoke(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiKeySummary> {
    const revoked = await this.apiKeys.revoke(id);
    await this.audit.write({
      actor: AuditService.actorFromUser(user),
      action: 'api_key.revoke',
      resourceType: 'api_key',
      resourceId: id,
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return revoked;
  }
}
