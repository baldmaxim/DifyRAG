import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@dkp/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { userContext } from '../common/types/actor-context';
import type { AuthenticatedRequest, AuthenticatedUser } from '../common/types/authenticated-request';
import { SearchDto } from './dto/search.dto';
import { SearchService } from './search.service';
import type { SearchResponse } from './search.types';

@ApiTags('search')
@ApiBearerAuth('jwt')
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Post()
  run(
    @Body() dto: SearchDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AuthenticatedRequest,
  ): Promise<SearchResponse> {
    const includePrivate = user.role === UserRole.Admin;
    return this.search.search(dto, { ctx: userContext(user, req), includePrivate });
  }
}
