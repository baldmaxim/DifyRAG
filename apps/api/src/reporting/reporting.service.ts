import { Injectable } from '@nestjs/common';
import type { AuditLog, DifyDatasetMapping, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

export interface DashboardStats {
  projects: number;
  documents: number;
  documentsByStatus: Record<string, number>;
  recentDocuments: Array<{ id: string; title: string; status: string; updatedAt: Date }>;
  errorDocuments: number;
}

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(): Promise<DashboardStats> {
    const [projects, documents, byStatus, recent, errors] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.document.count({ where: { deletedAt: null } }),
      this.prisma.document.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.document.findMany({
        where: { deletedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: { id: true, title: true, status: true, updatedAt: true },
      }),
      this.prisma.document.count({ where: { deletedAt: null, status: 'error' } }),
    ]);

    const documentsByStatus: Record<string, number> = {};
    for (const row of byStatus) {
      documentsByStatus[row.status] = row._count._all;
    }

    return { projects, documents, documentsByStatus, recentDocuments: recent, errorDocuments: errors };
  }

  listAuditLogs(filter: {
    action?: string;
    resourceType?: string;
    take?: number;
  }): Promise<AuditLog[]> {
    const where: Prisma.AuditLogWhereInput = {
      action: filter.action ? { contains: filter.action, mode: 'insensitive' } : undefined,
      resourceType: filter.resourceType,
    };
    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(filter.take ?? 100, 500),
    });
  }

  listDifyDatasets(): Promise<Array<DifyDatasetMapping & { documentCount: number }>> {
    return this.prisma.difyDatasetMapping
      .findMany({
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { documents: true } } },
      })
      .then((rows) =>
        rows.map(({ _count, ...rest }) => ({ ...rest, documentCount: _count.documents })),
      );
  }
}
