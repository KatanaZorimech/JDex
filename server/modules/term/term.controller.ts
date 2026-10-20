import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { TermService } from './term.service';
import { ListTermDto } from './dto/list-term.dto';
import {
  BatchCreateTermDto,
  CreateTermDto,
  RecognizeTextDto,
} from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import type {
  TermListResponse,
  TermRecognitionResult,
} from '@shared/api.interface';

@Controller('api/terms')
export class TermController {
  constructor(private readonly termService: TermService) {}

  @Get()
  async list(@Query() query: ListTermDto): Promise<TermListResponse> {
    const page = query.page !== undefined ? Number(query.page) : 1;
    const pageSize = query.pageSize !== undefined ? Number(query.pageSize) : 20;
    return this.termService.list({
      page,
      pageSize,
      keyword: query.keyword,
      category: query.category,
    });
  }

  @Get('all')
  async findAll() {
    return this.termService.findAll();
  }

  @Get('stats/categories')
  async getCategoryStats() {
    return this.termService.getCategoryStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.termService.findById(id);
  }

  @NeedLogin()
  @Post()
  async create(@Body() dto: CreateTermDto) {
    return this.termService.create(dto);
  }

  @NeedLogin()
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTermDto) {
    return this.termService.update(id, dto);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.termService.remove(id);
  }

  @NeedLogin()
  @Post('batch')
  async batchCreate(@Body() dto: BatchCreateTermDto) {
    return this.termService.batchCreate(dto.items);
  }

  @NeedLogin()
  @Post('batch/import')
  async batchImport(@Body() dto: BatchCreateTermDto) {
    return this.termService.batchImport(dto.items);
  }

  @Post('recognize')
  async recognize(@Body() dto: RecognizeTextDto): Promise<TermRecognitionResult[]> {
    return this.termService.recognize(dto.text);
  }
}
