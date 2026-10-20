import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import type { Request } from 'express';
import { JdService } from './jd.service';
import { CreateJdDto } from './dto/create-jd.dto';
import { UpdateJdDto } from './dto/update-jd.dto';
import { ListJdDto } from './dto/list-jd.dto';
import { BatchCreateJdDto } from './dto/batch-create-jd.dto';
import type {
  JdItem,
  JdVersionItem,
  JdListResponse,
  JdTermAnalysis,
} from '@shared/api.interface';

@Controller('api/jd')
export class JdController {
  constructor(private readonly jdService: JdService) {}

  @Get()
  async list(@Query() query: ListJdDto): Promise<JdListResponse> {
    return this.jdService.list(query);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<JdItem> {
    return this.jdService.getById(id);
  }

  @NeedLogin()
  @Post()
  async create(@Req() req: Request, @Body() dto: CreateJdDto): Promise<JdItem> {
    const { userId } = req.userContext;
    return this.jdService.create(dto, userId);
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateJdDto,
  ): Promise<JdItem> {
    const { userId } = req.userContext;
    return this.jdService.update(id, dto, userId);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string): Promise<void> {
    const { userId } = req.userContext;
    await this.jdService.remove(id, userId);
  }

  @NeedLogin()
  @Post(':id/restore')
  async restore(@Req() req: Request, @Param('id') id: string): Promise<JdItem> {
    const { userId } = req.userContext;
    return this.jdService.restore(id, userId);
  }

  @NeedLogin()
  @Post(':id/duplicate')
  async duplicate(@Req() req: Request, @Param('id') id: string): Promise<JdItem> {
    const { userId } = req.userContext;
    return this.jdService.duplicate(id, userId);
  }

  @Get(':id/versions')
  async getVersionList(@Param('id') id: string): Promise<JdVersionItem[]> {
    return this.jdService.getVersionList(id);
  }

  @Get(':id/versions/:versionId')
  async getVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ): Promise<JdVersionItem> {
    return this.jdService.getVersion(id, versionId);
  }

  @NeedLogin()
  @Post(':id/rollback/:versionId')
  async rollback(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ): Promise<JdItem> {
    const { userId } = req.userContext;
    return this.jdService.rollbackToVersion(id, versionId, userId);
  }

  @NeedLogin()
  @Post('batch/import')
  async batchImport(
    @Req() req: Request,
    @Body() dto: BatchCreateJdDto,
  ): Promise<{ successCount: number; failedCount: number; errors: { rowIndex: number; error: string }[] }> {
    const { userId } = req.userContext;
    return this.jdService.batchImport(dto.items, userId);
  }

  @Post(':id/analyze-terms')
  async analyzeTerms(@Param('id') id: string): Promise<JdTermAnalysis> {
    return this.jdService.analyzeTerms(id);
  }
}
