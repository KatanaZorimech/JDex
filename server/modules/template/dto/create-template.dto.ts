import { Type } from 'class-transformer';
import { IsString, IsIn, IsOptional, MaxLength } from 'class-validator';
import type { CreateTemplateDto, JdCategory, TemplateType } from '@shared/api.interface';

export class CreateTemplateDtoClass implements CreateTemplateDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @Type(() => String)
  @IsString()
  @IsIn(['program', 'art', 'product', 'operations', 'middle_platform', 'function'])
  category!: JdCategory;

  @Type(() => String)
  @IsString()
  @IsIn(['jd', 'company_intro', 'benefits', 'responsibility', 'requirement'])
  type!: TemplateType;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
