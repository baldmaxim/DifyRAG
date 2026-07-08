import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Folder, Prisma, Scope } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import type { CreateFolderDto } from './dto/create-folder.dto';
import type { UpdateFolderDto } from './dto/update-folder.dto';

export interface FolderTreeQuery {
  scope: Scope;
  projectId?: string;
  departmentId?: string;
}

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) {}

  async getTree(query: FolderTreeQuery): Promise<Folder[]> {
    return this.prisma.folder.findMany({
      where: {
        scope: query.scope,
        projectId: query.projectId ?? null,
        departmentId: query.departmentId ?? null,
      },
      orderBy: [{ path: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async create(dto: CreateFolderDto): Promise<Folder> {
    let path = dto.slug;
    if (dto.parentId) {
      const parent = await this.prisma.folder.findUnique({ where: { id: dto.parentId } });
      if (!parent) {
        throw new NotFoundException('Parent folder not found');
      }
      if (parent.scope !== dto.scope || parent.projectId !== (dto.projectId ?? null)) {
        throw new BadRequestException('Parent folder scope/project mismatch');
      }
      path = `${parent.path}/${dto.slug}`;
    }

    const duplicate = await this.prisma.folder.findFirst({
      where: { scope: dto.scope, projectId: dto.projectId ?? null, path },
    });
    if (duplicate) {
      throw new ConflictException(`Folder path "${path}" already exists`);
    }

    return this.prisma.folder.create({
      data: {
        scope: dto.scope,
        projectId: dto.projectId ?? null,
        departmentId: dto.departmentId ?? null,
        parentId: dto.parentId ?? null,
        slug: dto.slug,
        name: dto.name,
        path,
      },
    });
  }

  async update(id: string, dto: UpdateFolderDto): Promise<Folder> {
    await this.getById(id);
    return this.prisma.folder.update({
      where: { id },
      data: {
        name: dto.name,
        sortOrder: dto.sortOrder,
        metadata: (dto.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
  }

  /** Delete a folder only if it is empty (no child folders, no documents). */
  async remove(id: string): Promise<{ id: string }> {
    await this.getById(id);
    const [childCount, docCount] = await Promise.all([
      this.prisma.folder.count({ where: { parentId: id } }),
      this.prisma.document.count({ where: { folderId: id, deletedAt: null } }),
    ]);
    if (childCount > 0 || docCount > 0) {
      throw new BadRequestException('Folder is not empty');
    }
    await this.prisma.folder.delete({ where: { id } });
    return { id };
  }

  private async getById(id: string): Promise<Folder> {
    const folder = await this.prisma.folder.findUnique({ where: { id } });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
    return folder;
  }
}
