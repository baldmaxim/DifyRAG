import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  it('returns an ok health payload', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: ConfigService, useValue: { get: () => 'test' } },
      ],
    }).compile();

    const controller = moduleRef.get(AppController);
    const health = controller.getHealth();

    expect(health.status).toBe('ok');
    expect(health.environment).toBe('test');
  });
});
