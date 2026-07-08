import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma, Scope } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { resolveDifyFolderGroup } from '../integrations/dify/dify-folder-group';

export interface ResolveDatasetsInput {
  scope: Scope;
  projectCode?: string | null;
  folderPath?: string | null;
  departmentSlug?: string | null;
  includePrivate: boolean;
}

export interface ResolvedDatasets {
  datasetIds: string[];
  projectId: string | null;
  warnings: string[];
}

const PRIVATE_GROUP = 'people_private';

@Injectable()
export class DatasetResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(input: ResolveDatasetsInput): Promise<ResolvedDatasets> {
    const warnings: string[] = [];

    if (input.scope === 'project') {
      if (!input.projectCode) {
        throw new BadRequestException('project_code is required for project scope');
      }
      const project = await this.prisma.project.findUnique({ where: { code: input.projectCode } });
      if (!project) {
        return { datasetIds: [], projectId: null, warnings: ['project_not_found'] };
      }
      const where: Prisma.DifyDatasetMappingWhereInput = {
        scope: 'project',
        projectId: project.id,
        status: 'active',
        difyDatasetId: { not: null },
      };
      if (input.folderPath) {
        where.folderGroup = resolveDifyFolderGroup(input.folderPath);
      }
      const mappings = await this.prisma.difyDatasetMapping.findMany({ where });
      if (mappings.length === 0) warnings.push('setup_required');
      return {
        datasetIds: mappings.map((m) => m.difyDatasetId).filter((v): v is string => Boolean(v)),
        projectId: project.id,
        warnings,
      };
    }

    // Company / reference / templates / people scopes.
    const where: Prisma.DifyDatasetMappingWhereInput = {
      scope: input.scope,
      projectId: null,
      status: 'active',
      difyDatasetId: { not: null },
    };
    if (!input.includePrivate) {
      where.folderGroup = { not: PRIVATE_GROUP };
    }
    const mappings = await this.prisma.difyDatasetMapping.findMany({ where });
    if (mappings.length === 0) warnings.push('setup_required');
    return {
      datasetIds: mappings.map((m) => m.difyDatasetId).filter((v): v is string => Boolean(v)),
      projectId: null,
      warnings,
    };
  }
}
