import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuditLog } from '@prisma/client';
import { UserRole } from '@dkp/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { ReportingService, type DashboardStats } from './reporting.service';

@ApiTags('reporting')
@ApiBearerAuth('jwt')
@Controller()
export class ReportingController {
  constructor(private readonly reporting: ReportingService) {}

  @Get('stats/dashboard')
  dashboard(): Promise<DashboardStats> {
    return this.reporting.dashboard();
  }

  @Get('audit-logs')
  @Roles(UserRole.Admin, UserRole.SuperAdmin)
  auditLogs(
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
  ): Promise<AuditLog[]> {
    return this.reporting.listAuditLogs({ action, resourceType });
  }

  @Get('dify-datasets')
  @Roles(UserRole.Manager, UserRole.Admin, UserRole.SuperAdmin)
  difyDatasets(): Promise<unknown[]> {
    return this.reporting.listDifyDatasets();
  }
}
