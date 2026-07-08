import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Project } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { flattenFolderTree } from './folder-tree';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(search?: string): Promise<Project[]> {
    const where: Prisma.ProjectWhereInput = search
      ? {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { customerName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    return this.prisma.project.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async getById(id: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async create(dto: CreateProjectDto): Promise<Project> {
    const existing = await this.prisma.project.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`Project code "${dto.code}" already exists`);
    }
    const project = await this.prisma.project.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        address: dto.address,
        customerName: dto.customerName,
        metadata: (dto.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
    await this.createDefaultProjectFolderTree(project.id);
    return project;
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    await this.getById(id);
    return this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        address: dto.address,
        customerName: dto.customerName,
        status: dto.status,
        metadata: (dto.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
  }

  /** DELETE a project = archive, never physical delete. */
  async archive(id: string): Promise<Project> {
    await this.getById(id);
    return this.prisma.project.update({ where: { id }, data: { status: 'archived' } });
  }

  /**
   * Idempotently create the standard project folder tree. Running twice does not
   * create duplicates (folders are unique by scope + projectId + path).
   */
  async createDefaultProjectFolderTree(projectId: string): Promise<void> {
    const flat = flattenFolderTree();
    const pathToId = new Map<string, string>();
    for (const f of flat) {
      const parentId = f.parentPath ? (pathToId.get(f.parentPath) ?? null) : null;
      const folder = await this.prisma.folder.upsert({
        where: { scope_projectId_path: { scope: 'project', projectId, path: f.path } },
        update: {},
        create: {
          scope: 'project',
          projectId,
          parentId,
          slug: f.slug,
          name: f.name,
          path: f.path,
          sortOrder: f.sortOrder,
        },
      });
      pathToId.set(f.path, folder.id);
    }
  }
}
