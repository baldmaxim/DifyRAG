import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AppInfo {
  name: string;
  status: 'ok';
  environment: string;
  version: string;
  timestamp: string;
}

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}

  getInfo(): AppInfo {
    return {
      name: 'Document Knowledge Portal API',
      status: 'ok',
      environment: this.config.get<string>('app.nodeEnv') ?? 'development',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }
}
