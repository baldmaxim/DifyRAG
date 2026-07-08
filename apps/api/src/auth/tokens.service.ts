import { randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';
import type { UserRole } from '@dkp/shared';
import { parseDurationToMs } from '../common/duration';
import { PrismaService } from '../common/prisma/prisma.service';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  fullName: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface UserForToken {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
}

@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async issueTokens(user: UserForToken): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.issueAccessToken(user),
      this.issueRefreshToken(user.id),
    ]);
    return { accessToken, refreshToken };
  }

  issueAccessToken(user: UserForToken): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };
    return this.jwt.signAsync(payload);
  }

  async issueRefreshToken(userId: string): Promise<string> {
    const secret = randomBytes(32).toString('hex');
    const ttl = this.config.get<string>('auth.refreshTtl') ?? '30d';
    const expiresAt = new Date(Date.now() + parseDurationToMs(ttl));
    const row = await this.prisma.refreshToken.create({
      data: { userId, tokenHash: await argonHash(secret), expiresAt },
    });
    return `${row.id}.${secret}`;
  }

  /** Validate and rotate a refresh token; returns the owning userId. */
  async rotateRefreshToken(token: string): Promise<string> {
    const [id, secret] = token.split('.');
    if (!id || !secret) {
      throw new UnauthorizedException('Malformed refresh token');
    }
    const row = await this.prisma.refreshToken.findUnique({ where: { id } });
    if (!row || row.revokedAt || row.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const valid = await argonVerify(row.tokenHash, secret);
    if (!valid) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return row.userId;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    const [id, secret] = token.split('.');
    if (!id || !secret) return;
    const row = await this.prisma.refreshToken.findUnique({ where: { id } });
    if (!row || row.revokedAt) return;
    const valid = await argonVerify(row.tokenHash, secret);
    if (!valid) return;
    await this.prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwt.verifyAsync<AccessTokenPayload>(token);
  }
}
