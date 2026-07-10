import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { hashSecret, verifySecret } from '../common/hashing';
import type { RegisterDto } from './dto/register.dto';
import { TokensService, type TokenPair } from './tokens.service';

/**
 * Результат саморегистрации:
 * - active  — первый пользователь в системе, сразу активен и получает токены (bootstrap admin);
 * - pending — аккаунт создан со статусом disabled, ждёт активации администратором.
 */
export type RegisterResult = { status: 'active'; tokens: TokenPair } | { status: 'pending' };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Пользователь с таким e-mail уже существует');
    }

    const isFirst = (await this.prisma.user.count()) === 0;

    let user: { id: string; email: string; role: 'admin' | 'user'; fullName: string };
    try {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash: await hashSecret(dto.password),
          fullName: dto.fullName,
          role: isFirst ? 'admin' : 'user',
          status: isFirst ? 'active' : 'disabled',
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Пользователь с таким e-mail уже существует');
      }
      throw error;
    }

    if (isFirst) {
      return { status: 'active', tokens: await this.tokens.issueTokens(user) };
    }
    return { status: 'pending' };
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await verifySecret(user.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.tokens.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const userId = await this.tokens.rotateRefreshToken(refreshToken);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User is not active');
    }
    return this.tokens.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revokeRefreshToken(refreshToken);
  }
}
