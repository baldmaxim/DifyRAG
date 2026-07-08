import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Project } from '@prisma/client';
import { UserRole } from '@dkp/shared';
import { AuditService } from '../common/audit/audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedRequest, AuthenticatedUser } from '../common/types/authenticated-request';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@ApiBearerAuth('jwt')
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(@Query('search') search?: string): Promise<Project[]> {
    return this.projects.list(search);
  }

  @Get(':id')
  getById(@Param('id') id: string): Promise<Project> {
    return this.projects.getById(id);
  }

  @Post()
  @Roles(UserRole.Manager, UserRole.Admin, UserRole.SuperAdmin)
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthenticatedRequest,
  ): Promise<Project> {
    const project = await this.projects.create(dto);
    await this.audit.write({
      actor: AuditService.actorFromUser(user),
      action: 'project.create',
      resourceType: 'project',
      resourceId: project.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
      after: { code: project.code, name: project.name },
    });
    return project;
  }

  @Patch(':id')
  @Roles(UserRole.Manager, UserRole.Admin, UserRole.SuperAdmin)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Project> {
    const before = await this.projects.getById(id);
    const project = await this.projects.update(id, dto);
    await this.audit.write({
      actor: AuditService.actorFromUser(user),
      action: 'project.update',
      resourceType: 'project',
      resourceId: id,
      before: { name: before.name, status: before.status },
      after: { name: project.name, status: project.status },
    });
    return project;
  }

  @Delete(':id')
  @Roles(UserRole.Manager, UserRole.Admin, UserRole.SuperAdmin)
  async archive(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Project> {
    const project = await this.projects.archive(id);
    await this.audit.write({
      actor: AuditService.actorFromUser(user),
      action: 'project.archive',
      resourceType: 'project',
      resourceId: id,
    });
    return project;
  }
}
