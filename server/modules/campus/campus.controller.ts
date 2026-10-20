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
import { CampusService } from './campus.service';
import { CreateCampusSchoolDto } from './dto/create-campus-school.dto';
import { UpdateCampusSchoolDto } from './dto/update-campus-school.dto';
import { ListCampusSchoolDto } from './dto/list-campus-school.dto';
import type {
  CampusSchoolItem,
  CampusSchoolListResponse,
  CampusFairEvent,
} from '@shared/api.interface';

@Controller('api/campus/schools')
export class CampusController {
  constructor(private readonly campusService: CampusService) {}

  @Get()
  async list(@Query() query: ListCampusSchoolDto): Promise<CampusSchoolListResponse> {
    return this.campusService.list(query);
  }

  @Get('fair-calendar')
  async getFairCalendar(
    @Query('year') year: string,
    @Query('month') month: string,
  ): Promise<CampusFairEvent[]> {
    return this.campusService.getFairCalendar(
      parseInt(year, 10),
      parseInt(month, 10),
    );
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<CampusSchoolItem> {
    return this.campusService.getById(id);
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: Request,
    @Body() dto: CreateCampusSchoolDto,
  ): Promise<CampusSchoolItem> {
    const { userId } = req.userContext;
    return this.campusService.create(dto, userId);
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateCampusSchoolDto,
  ): Promise<CampusSchoolItem> {
    const { userId } = req.userContext;
    return this.campusService.update(id, dto, userId);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.campusService.remove(id);
  }
}
