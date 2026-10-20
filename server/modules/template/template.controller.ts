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
import { TemplateService } from './template.service';
import { ListTemplateDto } from './dto/list-template.dto';
import { CreateTemplateDtoClass } from './dto/create-template.dto';
import { UpdateTemplateDtoClass } from './dto/update-template.dto';
import { BatchCreateTemplateDto } from './dto/batch-create-template.dto';
import type {
  JdTemplateItem,
  TemplateListResponse,
} from '@shared/api.interface';

@Controller('api/templates')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get()
  async list(@Query() query: ListTemplateDto): Promise<TemplateListResponse> {
    return this.templateService.list(query);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<JdTemplateItem> {
    return this.templateService.getById(id);
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() _req: Request,
    @Body() dto: CreateTemplateDtoClass,
  ): Promise<JdTemplateItem> {
    return this.templateService.create(dto);
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() _req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDtoClass,
  ): Promise<JdTemplateItem> {
    return this.templateService.update(id, dto);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Req() _req: Request, @Param('id') id: string): Promise<void> {
    return this.templateService.remove(id);
  }

  @NeedLogin()
  @Post('batch/import')
  async batchImport(
    @Body() dto: BatchCreateTemplateDto,
  ): Promise<{ successCount: number; failedCount: number; errors: { rowIndex: number; error: string }[] }> {
    return this.templateService.batchImport(dto.items);
  }

  @NeedLogin()
  @Post(':id/apply')
  async apply(
    @Req() _req: Request,
    @Param('id') id: string,
  ): Promise<{ id: string }> {
    return this.templateService.applyTemplate(id);
  }
}
