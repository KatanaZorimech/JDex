import { IsOptional, IsString, IsIn, IsInt, IsBoolean, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import type { JdListParams } from '@shared/api.interface';

export class ListJdDto implements JdListParams {
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
  @IsIn(['program', 'art', 'product', 'operations', 'middle_platform', 'function'])
  category?: 'program' | 'art' | 'product' | 'operations' | 'middle_platform' | 'function';

  @IsOptional()
  @IsString()
  @IsIn(['tk', 'jwus1', 'jwus2'])
  projectGroup?: 'tk' | 'jwus1' | 'jwus2';

  @IsOptional()
  @IsString()
  @IsIn(['active', 'draft', 'archived'])
  status?: 'active' | 'draft' | 'archived';

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  techStack?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ obj, key }) => {
    const val = (obj as Record<string, unknown>)[key];
    return val === 'true' || val === true;
  })
  isTemplate?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ obj, key }) => {
    const val = (obj as Record<string, unknown>)[key];
    return val === 'true' || val === true;
  })
  isArchived?: boolean;
}
