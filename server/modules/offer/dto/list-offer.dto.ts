import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import type { OfferListParams } from '@shared/api.interface';

export class ListOfferDto implements OfferListParams {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  @IsIn(['tk', 'jwus1', 'jwus2', 'ops', 'middle_platform', 'overseas', 'function'])
  projectGroup?: 'tk' | 'jwus1' | 'jwus2' | 'ops' | 'middle_platform' | 'overseas' | 'function';

  @IsOptional()
  @IsString()
  @IsIn(['program', 'art', 'product', 'operations', 'middle_platform', 'function'])
  category?: 'program' | 'art' | 'product' | 'operations' | 'middle_platform' | 'function';

  @IsOptional()
  @IsString()
  @IsIn(['onboarded', 'rejected', 'in_progress'])
  status?: 'onboarded' | 'rejected' | 'in_progress';

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  year?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  month?: number;
}
