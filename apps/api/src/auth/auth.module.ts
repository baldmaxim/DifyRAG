import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { parseDurationToMs } from '../common/duration';
import { ApiKeysController } from './api-keys/api-keys.controller';
import { ApiKeysService } from './api-keys/api-keys.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { TokensService } from './tokens.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('auth.jwtSecret') ?? 'dev-insecure-secret',
        signOptions: {
          expiresIn: Math.floor(parseDurationToMs(config.get<string>('auth.accessTtl') ?? '15m') / 1000),
        },
      }),
    }),
  ],
  controllers: [AuthController, ApiKeysController],
  providers: [
    AuthService,
    TokensService,
    ApiKeysService,
    JwtAuthGuard,
    RolesGuard,
    ApiKeyGuard,
  ],
  exports: [TokensService, JwtAuthGuard, RolesGuard, ApiKeyGuard, JwtModule],
})
export class AuthModule {}
