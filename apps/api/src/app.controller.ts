import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { AppInfo, AppService } from './app.service';

@ApiTags('system')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  @ApiOkResponse({ description: 'Liveness probe for the API process.' })
  getHealth(): AppInfo {
    return this.appService.getInfo();
  }
}
