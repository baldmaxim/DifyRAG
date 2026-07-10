import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { UserRole } from '@dkp/shared';
import { hashSecret } from '../common/hashing';
import { PrismaService } from '../common/prisma/prisma.service';
import type { UpdateUserDto } from './dto/update-user.dto';

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: string;
  createdAt: Date;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<UserSummary[]> {
    return this.prisma.user.findMany({
      select: { id: true, email: true, fullName: true, role: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdateUserDto, currentUserId: string): Promise<UserSummary> {
    // Защита от само-локаута: админ не может отключить или понизить собственную учётку.
    if (id === currentUserId && (dto.status === 'disabled' || dto.role === 'user')) {
      throw new BadRequestException('Нельзя отключить или понизить собственную учётную запись');
    }

    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Пользователь не найден');
    }

    return this.prisma.user.update({
      where: { id },
      data: { status: dto.status, role: dto.role },
      select: { id: true, email: true, fullName: true, role: true, status: true, createdAt: true },
    });
  }

  /** Установить новый пароль пользователю и завершить его активные сессии. */
  async resetPassword(id: string, password: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Пользователь не найден');
    }
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await hashSecret(password) },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
