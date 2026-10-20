import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOfferDto } from './create-offer.dto';
import type { OfferBatchImportRequest } from '@shared/api.interface';

export class BatchImportOfferDto implements OfferBatchImportRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOfferDto)
  items!: CreateOfferDto[];
}
