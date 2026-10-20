import { IsIn, IsNumber, IsOptional, IsString, Max } from 'class-validator';
import type { TermListParams } from '@shared/api.interface';

export class ListTermDto implements TermListParams {
  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  @IsIn(['engine', 'programming', 'tool', 'art', 'software', 'technology', 'other'])
  category?: 'engine' | 'programming' | 'tool' | 'art' | 'software' | 'technology' | 'other';
}
