import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Department } from '@prisma/client';
import { UserRole } from '@dkp/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentsService } from './departments.service';

@ApiTags('departments')
@ApiBearerAuth('jwt')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @Get()
  list(): Promise<Department[]> {
    return this.departments.list();
  }

  @Get(':id')
  getById(@Param('id') id: string): Promise<Department> {
    return this.departments.getById(id);
  }

  @Post()
  @Roles(UserRole.Manager, UserRole.Admin, UserRole.SuperAdmin)
  create(@Body() dto: CreateDepartmentDto): Promise<Department> {
    return this.departments.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.Editor, UserRole.Manager, UserRole.Admin, UserRole.SuperAdmin)
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto): Promise<Department> {
    return this.departments.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.Admin, UserRole.SuperAdmin)
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.departments.remove(id);
  }
}
