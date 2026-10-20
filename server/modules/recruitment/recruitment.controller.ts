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
import { RecruitmentService } from './recruitment.service';
import { CreateRecruitmentDto } from './dto/create-recruitment.dto';
import { UpdateRecruitmentDto } from './dto/update-recruitment.dto';
import { ListRecruitmentDto } from './dto/list-recruitment.dto';
import type {
  RecruitmentPositionItem,
  RecruitmentListResponse,
  RecruitmentStats,
} from '@shared/api.interface';

@Controller('api/recruitment')
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  @Get()
  async list(@Query() query: ListRecruitmentDto): Promise<RecruitmentListResponse> {
    return this.recruitmentService.list(query);
  }

  @Get('stats')
  async stats(): Promise<RecruitmentStats> {
    return this.recruitmentService.stats();
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<RecruitmentPositionItem> {
    return this.recruitmentService.getById(id);
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: Request,
    @Body() dto: CreateRecruitmentDto,
  ): Promise<RecruitmentPositionItem> {
    const { userId } = req.userContext;
    return this.recruitmentService.create(dto, userId);
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateRecruitmentDto,
  ): Promise<RecruitmentPositionItem> {
    const { userId } = req.userContext;
    return this.recruitmentService.update(id, dto, userId);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.recruitmentService.remove(id);
  }
}
