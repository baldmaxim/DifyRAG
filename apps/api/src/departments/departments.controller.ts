import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Department } from '@prisma/client';
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
  create(@Body() dto: CreateDepartmentDto): Promise<Department> {
    return this.departments.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto): Promise<Department> {
    return this.departments.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.departments.remove(id);
  }
}
