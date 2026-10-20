import { Type } from 'class-transformer';
import { IsString, IsIn, IsOptional, MaxLength } from 'class-validator';
import type { UpdateTemplateDto, JdCategory, TemplateType } from '@shared/api.interface';

export class UpdateTemplateDtoClass implements UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @Type(() => String)
  @IsString()
  @IsIn(['program', 'art', 'product', 'operations', 'middle_platform', 'function'])
  category?: JdCategory;

  @IsOptional()
  @Type(() => String)
  @IsString()
  @IsIn(['jd', 'company_intro', 'benefits', 'responsibility', 'requirement'])
  type?: TemplateType;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
