import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../common/prisma/prisma.service';
import { hashSecret } from '../common/hashing';
import { AuthService } from './auth.service';
import type { TokensService } from './tokens.service';

async function buildUser(status: 'active' | 'disabled') {
  return {
    id: 'u1',
    email: 'admin@example.com',
    fullName: 'Admin',
    role: 'super_admin',
    status,
    passwordHash: await hashSecret('password123'),
  };
}

function serviceWith(user: unknown): AuthService {
  const prisma = {
    user: { findUnique: vi.fn(async () => user) },
  } as unknown as PrismaService;
  const tokens = {
    issueTokens: vi.fn(async () => ({ accessToken: 'a', refreshToken: 'r' })),
  } as unknown as TokensService;
  return new AuthService(prisma, tokens);
}

describe('AuthService.login', () => {
  it('issues tokens on valid credentials', async () => {
    const service = serviceWith(await buildUser('active'));
    const pair = await service.login('admin@example.com', 'password123');
    expect(pair.accessToken).toBe('a');
  });

  it('rejects a wrong password', async () => {
    const service = serviceWith(await buildUser('active'));
    await expect(service.login('admin@example.com', 'nope')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a disabled user', async () => {
    const service = serviceWith(await buildUser('disabled'));
    await expect(service.login('admin@example.com', 'password123')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an unknown user', async () => {
    const service = serviceWith(null);
    await expect(service.login('ghost@example.com', 'password123')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
