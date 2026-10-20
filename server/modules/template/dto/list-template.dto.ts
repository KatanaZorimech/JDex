import { Type } from 'class-transformer';
import { Transform } from 'class-transformer';
import { IsString, IsIn, IsOptional, IsInt, IsBoolean, Min, Max } from 'class-validator';
import type { TemplateListParams, TemplateType } from '@shared/api.interface';

export class ListTemplateDto implements TemplateListParams {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Type(() => String)
  @IsString()
  @IsIn(['program', 'art', 'product', 'operations', 'middle_platform', 'function', 'company_intro', 'benefits'])
  category?: TemplateListParams['category'];

  @IsOptional()
  @Type(() => String)
  @IsString()
  @IsIn(['jd', 'company_intro', 'benefits', 'responsibility', 'requirement'])
  type?: TemplateType;

  @IsOptional()
  @IsBoolean()
  @Transform(({ obj, key }) => {
    const val = (obj as Record<string, unknown>)[key];
    return val === 'true' || val === true;
  })
  isSystem?: boolean;
}
