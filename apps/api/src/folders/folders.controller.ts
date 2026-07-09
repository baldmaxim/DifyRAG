import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Folder, Scope } from '@prisma/client';
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
  create(@Body() dto: CreateFolderDto): Promise<Folder> {
    return this.folders.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFolderDto): Promise<Folder> {
    return this.folders.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.folders.remove(id);
  }
}
