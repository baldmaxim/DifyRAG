import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Department, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import type { CreateDepartmentDto } from './dto/create-department.dto';
import type { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<Department[]> {
    return this.prisma.department.findMany({ orderBy: { name: 'asc' } });
  }

  async getById(id: string): Promise<Department> {
    const department = await this.prisma.department.findUnique({ where: { id } });
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    return department;
  }

  async create(dto: CreateDepartmentDto): Promise<Department> {
    const existing = await this.prisma.department.findUnique({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`Department slug "${dto.slug}" already exists`);
    }
    return this.prisma.department.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        description: dto.description,
        skillsMarkdown: dto.skillsMarkdown,
        metadata: (dto.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    await this.getById(id);
    return this.prisma.department.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        skillsMarkdown: dto.skillsMarkdown,
        metadata: (dto.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
  }

  async remove(id: string): Promise<{ id: string }> {
    await this.getById(id);
    await this.prisma.department.delete({ where: { id } });
    return { id };
  }
}
