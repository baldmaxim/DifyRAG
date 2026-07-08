import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../common/prisma/prisma.service';
import { DatasetResolverService } from './dataset-resolver.service';

function prismaWith(project: unknown, mappings: unknown[]): { prisma: PrismaService; findMany: ReturnType<typeof vi.fn> } {
  const findMany = vi.fn(async () => mappings);
  const prisma = {
    project: { findUnique: vi.fn(async () => project) },
    difyDatasetMapping: { findMany },
  } as unknown as PrismaService;
  return { prisma, findMany };
}

describe('DatasetResolverService', () => {
  it('project scope + folder_path filters to the folder group dataset', async () => {
    const { prisma, findMany } = prismaWith({ id: 'p1' }, [{ difyDatasetId: 'ds-finance' }]);
    const resolver = new DatasetResolverService(prisma);
    const res = await resolver.resolve({
      scope: 'project',
      projectCode: 'zilart',
      folderPath: '07-finance/03-ks2-ks3',
      includePrivate: false,
    });
    expect(res.datasetIds).toEqual(['ds-finance']);
    expect(findMany.mock.calls[0][0].where.folderGroup).toBe('finance');
  });

  it('project scope without folder_path returns all project datasets', async () => {
    const { prisma } = prismaWith({ id: 'p1' }, [{ difyDatasetId: 'a' }, { difyDatasetId: 'b' }]);
    const resolver = new DatasetResolverService(prisma);
    const res = await resolver.resolve({ scope: 'project', projectCode: 'zilart', includePrivate: false });
    expect(res.datasetIds).toEqual(['a', 'b']);
  });

  it('requires project_code for project scope', async () => {
    const { prisma } = prismaWith(null, []);
    const resolver = new DatasetResolverService(prisma);
    await expect(resolver.resolve({ scope: 'project', includePrivate: false })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('warns when the project does not exist', async () => {
    const { prisma } = prismaWith(null, []);
    const resolver = new DatasetResolverService(prisma);
    const res = await resolver.resolve({ scope: 'project', projectCode: 'nope', includePrivate: false });
    expect(res.warnings).toContain('project_not_found');
  });

  it('company scope excludes people_private unless includePrivate', async () => {
    const { prisma, findMany } = prismaWith(null, [{ difyDatasetId: 'c1' }]);
    const resolver = new DatasetResolverService(prisma);
    await resolver.resolve({ scope: 'company', includePrivate: false });
    expect(findMany.mock.calls[0][0].where.folderGroup).toEqual({ not: 'people_private' });

    findMany.mockClear();
    await resolver.resolve({ scope: 'company', includePrivate: true });
    expect(findMany.mock.calls[0][0].where.folderGroup).toBeUndefined();
  });

  it('warns setup_required when no datasets exist', async () => {
    const { prisma } = prismaWith({ id: 'p1' }, []);
    const resolver = new DatasetResolverService(prisma);
    const res = await resolver.resolve({ scope: 'project', projectCode: 'zilart', includePrivate: false });
    expect(res.warnings).toContain('setup_required');
  });
});
