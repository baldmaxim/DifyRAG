import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DifyDatasetMapping, Scope } from '@prisma/client';
import type { DifyConfig } from '../../config/configuration';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DifyClient } from './dify.client';
import {
  companyDatasetName,
  projectDatasetName,
  resolveDifyFolderGroup,
  type DifyFolderGroup,
} from './dify-folder-group';

export interface ResolveMappingInput {
  scope: Scope;
  projectId?: string | null;
  projectCode?: string | null;
  departmentId?: string | null;
  folderPath: string;
}

/** Setup error surfaced when a dataset is missing and auto-create is disabled. */
export class DatasetSetupRequiredError extends Error {
  constructor(datasetName: string) {
    super(`Dify dataset "${datasetName}" is missing and auto-create is disabled (setup_required)`);
    this.name = 'DatasetSetupRequiredError';
  }
}

@Injectable()
export class DifyDatasetMappingService {
  private readonly logger = new Logger(DifyDatasetMappingService.name);
  private readonly cfg: DifyConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly dify: DifyClient,
    config: ConfigService,
  ) {
    this.cfg = config.getOrThrow<DifyConfig>('dify');
  }

  private datasetNameFor(input: ResolveMappingInput, group: DifyFolderGroup): string {
    if (input.scope === 'project' && input.projectCode) {
      return projectDatasetName(input.projectCode, group);
    }
    return companyDatasetName(group);
  }

  /** Find or create the DB mapping row for a document's scope/project/folder group. */
  async resolveMapping(input: ResolveMappingInput): Promise<DifyDatasetMapping> {
    const group = resolveDifyFolderGroup(input.folderPath);
    const datasetName = this.datasetNameFor(input, group);

    // findFirst (not findUnique): projectId is nullable and Prisma types nullable
    // fields in a compound unique as non-null, so findUnique can't target null.
    const existing = await this.prisma.difyDatasetMapping.findFirst({
      where: {
        scope: input.scope,
        projectId: input.projectId ?? null,
        folderGroup: group,
      },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.difyDatasetMapping.create({
      data: {
        scope: input.scope,
        projectId: input.projectId ?? null,
        departmentId: input.departmentId ?? null,
        folderGroup: group,
        difyDatasetName: datasetName,
        strategy: input.scope === 'project' ? 'project_section' : 'company_section',
        indexingTechnique: this.cfg.defaultIndexingTechnique,
        status: 'pending',
      },
    });
  }

  /** Ensure the Dify dataset exists, creating it if auto-create is enabled. */
  async ensureDataset(mapping: DifyDatasetMapping): Promise<DifyDatasetMapping> {
    if (mapping.difyDatasetId) {
      return mapping;
    }
    if (!this.cfg.autoCreateDatasets) {
      await this.prisma.difyDatasetMapping.update({
        where: { id: mapping.id },
        data: { status: 'error', errorMessage: 'setup_required' },
      });
      throw new DatasetSetupRequiredError(mapping.difyDatasetName);
    }

    await this.prisma.difyDatasetMapping.update({
      where: { id: mapping.id },
      data: { status: 'creating' },
    });
    const dataset = await this.dify.createDataset({
      name: mapping.difyDatasetName,
      description: mapping.difyDatasetDescription ?? undefined,
      indexing_technique: (mapping.indexingTechnique as 'high_quality' | 'economy') ?? 'high_quality',
      permission: 'only_me',
    });
    this.logger.log(`Created Dify dataset ${dataset.name} (${dataset.id})`);

    return this.prisma.difyDatasetMapping.update({
      where: { id: mapping.id },
      data: { difyDatasetId: dataset.id, status: 'active', errorMessage: null },
    });
  }
}
