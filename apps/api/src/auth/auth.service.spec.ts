import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../common/prisma/prisma.service';
import { hashSecret } from '../common/hashing';
import { AuthService } from './auth.service';
import type { RegisterDto } from './dto/register.dto';
import type { TokensService } from './tokens.service';

async function buildUser(status: 'active' | 'disabled') {
  return {
    id: 'u1',
    email: 'admin@example.com',
    fullName: 'Admin',
    role: 'admin',
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

describe('AuthService.register', () => {
  const dto: RegisterDto = { email: 'new@example.com', fullName: 'New User', password: 'password123' };

  function registerServiceWith(userCount: number) {
    const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'u1',
      email: data.email,
      fullName: data.fullName,
      role: data.role,
      status: data.status,
    }));
    const prisma = {
      user: {
        findUnique: vi.fn(async () => null),
        count: vi.fn(async () => userCount),
        create,
      },
    } as unknown as PrismaService;
    const tokens = {
      issueTokens: vi.fn(async () => ({ accessToken: 'a', refreshToken: 'r' })),
    } as unknown as TokensService;
    return { service: new AuthService(prisma, tokens), create };
  }

  it('makes the first user an active admin and returns tokens', async () => {
    const { service, create } = registerServiceWith(0);
    const result = await service.register(dto);
    expect(result).toEqual({ status: 'active', tokens: { accessToken: 'a', refreshToken: 'r' } });
    expect(create.mock.calls[0][0].data).toMatchObject({ role: 'admin', status: 'active' });
  });

  it('creates subsequent users disabled and pending', async () => {
    const { service, create } = registerServiceWith(1);
    const result = await service.register(dto);
    expect(result).toEqual({ status: 'pending' });
    expect(create.mock.calls[0][0].data).toMatchObject({ role: 'user', status: 'disabled' });
  });

  it('rejects a duplicate e-mail', async () => {
    const prisma = {
      user: { findUnique: vi.fn(async () => ({ id: 'existing' })) },
    } as unknown as PrismaService;
    const tokens = {} as unknown as TokensService;
    const service = new AuthService(prisma, tokens);
    await expect(service.register(dto)).rejects.toBeInstanceOf(ConflictException);
  });
});
