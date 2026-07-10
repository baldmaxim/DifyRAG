import { Body, Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@dkp/shared';
import { AuditService } from '../common/audit/audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedRequest, AuthenticatedUser } from '../common/types/authenticated-request';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService, type UserSummary } from './users.service';

@ApiTags('users')
@ApiBearerAuth('jwt')
@Roles(UserRole.Admin)
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(): Promise<UserSummary[]> {
    return this.users.list();
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserSummary> {
    const updated = await this.users.update(id, dto, user.id);
    await this.audit.write({
      actor: AuditService.actorFromUser(user),
      action: 'user.update',
      resourceType: 'user',
      resourceId: id,
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
      after: { status: updated.status, role: updated.role },
    });
    return updated;
  }
}
