import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import type { CampusSchoolListParams } from '@shared/api.interface';

export class ListCampusSchoolDto implements CampusSchoolListParams {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  @IsIn(['985', '211', 'double_first_class', 'other'])
  category?: '985' | '211' | 'double_first_class' | 'other';

  @IsOptional()
  @IsString()
  @IsIn(['registered', 'not_registered', 'pending'])
  fairStatus?: 'registered' | 'not_registered' | 'pending';
}
