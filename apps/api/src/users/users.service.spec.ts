import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../common/prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  it('lists users without password hashes', async () => {
    const findMany = vi.fn(async () => [
      { id: 'u1', email: 'a@x.kz', fullName: 'A', role: 'user', status: 'disabled', createdAt: new Date() },
    ]);
    const prisma = { user: { findMany } } as unknown as PrismaService;
    const service = new UsersService(prisma);
    const list = await service.list();
    expect(list).toHaveLength(1);
    expect(findMany.mock.calls[0][0].select).not.toHaveProperty('passwordHash');
  });

  it('activates a pending user', async () => {
    const update = vi.fn(async () => ({
      id: 'u2',
      email: 'b@x.kz',
      fullName: 'B',
      role: 'user',
      status: 'active',
      createdAt: new Date(),
    }));
    const prisma = {
      user: { findUnique: vi.fn(async () => ({ id: 'u2' })), update },
    } as unknown as PrismaService;
    const service = new UsersService(prisma);
    const result = await service.update('u2', { status: 'active' }, 'admin-1');
    expect(result.status).toBe('active');
    expect(update).toHaveBeenCalledOnce();
  });

  it('prevents an admin from disabling their own account', async () => {
    const prisma = { user: {} } as unknown as PrismaService;
    const service = new UsersService(prisma);
    await expect(service.update('admin-1', { status: 'disabled' }, 'admin-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when the user does not exist', async () => {
    const prisma = {
      user: { findUnique: vi.fn(async () => null) },
    } as unknown as PrismaService;
    const service = new UsersService(prisma);
    await expect(service.update('ghost', { status: 'active' }, 'admin-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('hashes a new password and revokes active sessions', async () => {
    const update = vi.fn(async () => ({ id: 'u2' }));
    const updateMany = vi.fn(async () => ({ count: 2 }));
    const prisma = {
      user: { findUnique: vi.fn(async () => ({ id: 'u2' })), update },
      refreshToken: { updateMany },
    } as unknown as PrismaService;
    const service = new UsersService(prisma);
    await service.resetPassword('u2', 'new-password-123');

    const storedHash = update.mock.calls[0][0].data.passwordHash as string;
    expect(storedHash).not.toContain('new-password-123');
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: 'u2', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('throws when resetting the password of a missing user', async () => {
    const prisma = {
      user: { findUnique: vi.fn(async () => null) },
    } as unknown as PrismaService;
    const service = new UsersService(prisma);
    await expect(service.resetPassword('ghost', 'new-password-123')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
