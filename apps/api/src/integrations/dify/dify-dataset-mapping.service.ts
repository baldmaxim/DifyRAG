import { Injectable, Logger } from '@nestjs/common';
import type { DifyDatasetMapping, Scope } from '@prisma/client';
import type { DifyConfig } from '../../config/configuration';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SettingsService } from '../../settings/settings.service';
import { DifyApiError, DifyClient } from './dify.client';
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
  /** Dataset ids confirmed to exist this process run — avoids re-verifying every sync. */
  private readonly verifiedDatasetIds = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly dify: DifyClient,
    private readonly settings: SettingsService,
  ) {}

  private get cfg(): DifyConfig {
    return this.settings.dify();
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

  /**
   * Ensure the Dify dataset exists, creating it if auto-create is enabled.
   * Self-healing: if a stored `difyDatasetId` no longer exists in the current Dify
   * (e.g. a mapping carried over from another environment / a different embedding
   * dimension), it is cleared and recreated so vectors are (re)built for THIS Dify.
   */
  async ensureDataset(mapping: DifyDatasetMapping): Promise<DifyDatasetMapping> {
    let current = mapping;

    if (current.difyDatasetId) {
      if (await this.datasetExists(current.difyDatasetId)) {
        return current;
      }
      this.logger.warn(
        `Dify dataset ${current.difyDatasetId} (${current.difyDatasetName}) not found — recreating`,
      );
      current = await this.prisma.difyDatasetMapping.update({
        where: { id: current.id },
        data: { difyDatasetId: null, status: 'pending' },
      });
    }

    if (!this.cfg.autoCreateDatasets) {
      await this.prisma.difyDatasetMapping.update({
        where: { id: current.id },
        data: { status: 'error', errorMessage: 'setup_required' },
      });
      throw new DatasetSetupRequiredError(current.difyDatasetName);
    }

    await this.prisma.difyDatasetMapping.update({
      where: { id: current.id },
      data: { status: 'creating' },
    });
    const dataset = await this.dify.createDataset({
      name: current.difyDatasetName,
      description: current.difyDatasetDescription ?? undefined,
      indexing_technique: (current.indexingTechnique as 'high_quality' | 'economy') ?? 'high_quality',
      permission: 'only_me',
    });
    this.verifiedDatasetIds.add(dataset.id);
    this.logger.log(`Created Dify dataset ${dataset.name} (${dataset.id})`);

    return this.prisma.difyDatasetMapping.update({
      where: { id: current.id },
      data: {
        difyDatasetId: dataset.id,
        status: 'active',
        errorMessage: null,
        // Record which embedding provider/model built this dataset — helps diagnose
        // a local(small-dim) vs server(4096) mismatch if a mapping is reused.
        embeddingProvider: 'lmstudio',
        embeddingModel: this.settings.lmStudio().embeddingModel,
      },
    });
  }

  /** Whether a Dify dataset id still exists in the current Dify (cached per run). */
  private async datasetExists(datasetId: string): Promise<boolean> {
    if (this.verifiedDatasetIds.has(datasetId)) {
      return true;
    }
    try {
      await this.dify.getDataset(datasetId);
      this.verifiedDatasetIds.add(datasetId);
      return true;
    } catch (err) {
      if (err instanceof DifyApiError && err.status === 404) {
        return false;
      }
      // Transient/other error: assume it exists (do not recreate) but do not cache,
      // so the next sync re-verifies.
      this.logger.warn(`Could not verify Dify dataset ${datasetId}: ${(err as Error).message}`);
      return true;
    }
  }
}
