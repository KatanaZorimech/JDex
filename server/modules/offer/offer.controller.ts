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
import { OfferService } from './offer.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { ListOfferDto } from './dto/list-offer.dto';
import { BatchImportOfferDto } from './dto/batch-import-offer.dto';
import type {
  OfferItem,
  OfferListResponse,
  OfferStatsResponse,
} from '@shared/api.interface';

@Controller('api/offers')
export class OfferController {
  constructor(private readonly offerService: OfferService) {}

  @Get()
  async list(@Query() query: ListOfferDto): Promise<OfferListResponse> {
    return this.offerService.list(query);
  }

  @Get('stats')
  async stats(@Query() query: ListOfferDto): Promise<OfferStatsResponse> {
    return this.offerService.stats({
      projectGroup: query.projectGroup,
      year: query.year,
    });
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<OfferItem> {
    return this.offerService.getById(id);
  }

  @NeedLogin()
  @Post()
  async create(
    @Req() req: Request,
    @Body() dto: CreateOfferDto,
  ): Promise<OfferItem> {
    const { userId } = req.userContext;
    return this.offerService.create(dto, userId);
  }

  @NeedLogin()
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateOfferDto,
  ): Promise<OfferItem> {
    const { userId } = req.userContext;
    return this.offerService.update(id, dto, userId);
  }

  @NeedLogin()
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.offerService.remove(id);
  }

  @NeedLogin()
  @Post('batch/import')
  async batchImport(
    @Req() req: Request,
    @Body() dto: BatchImportOfferDto,
  ): Promise<{ successCount: number; failedCount: number; errors: { rowIndex: number; error: string }[] }> {
    const { userId } = req.userContext;
    return this.offerService.batchImport(dto.items, userId);
  }
}
