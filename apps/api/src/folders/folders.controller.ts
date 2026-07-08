import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Folder, Scope } from '@prisma/client';
import { UserRole } from '@dkp/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { FoldersService } from './folders.service';

@ApiTags('folders')
@ApiBearerAuth('jwt')
@Controller('folders')
export class FoldersController {
  constructor(private readonly folders: FoldersService) {}

  @Get('tree')
  getTree(
    @Query('scope') scope: Scope,
    @Query('projectId') projectId?: string,
    @Query('departmentId') departmentId?: string,
  ): Promise<Folder[]> {
    return this.folders.getTree({ scope, projectId, departmentId });
  }

  @Post()
  @Roles(UserRole.Editor, UserRole.Manager, UserRole.Admin, UserRole.SuperAdmin)
  create(@Body() dto: CreateFolderDto): Promise<Folder> {
    return this.folders.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.Editor, UserRole.Manager, UserRole.Admin, UserRole.SuperAdmin)
  update(@Param('id') id: string, @Body() dto: UpdateFolderDto): Promise<Folder> {
    return this.folders.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.Manager, UserRole.Admin, UserRole.SuperAdmin)
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.folders.remove(id);
  }
}
