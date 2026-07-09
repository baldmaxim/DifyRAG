import { Global, Module } from '@nestjs/common';
import { SecretCipher } from '../common/crypto/secret-cipher';
import { IntegrationsModule } from '../integrations/integrations.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Global()
@Module({
  imports: [IntegrationsModule],
  controllers: [SettingsController],
  providers: [SecretCipher, SettingsService],
  exports: [SecretCipher, SettingsService],
})
export class SettingsModule {}
