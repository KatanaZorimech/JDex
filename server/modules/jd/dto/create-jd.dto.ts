import { IsString, IsOptional, IsBoolean, IsArray, IsIn, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import type { CreateJdDto as SharedCreateJdDto } from '@shared/api.interface';

export class CreateJdDto implements SharedCreateJdDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @IsString()
  @IsIn(['program', 'art', 'product', 'operations', 'middle_platform', 'function'])
  category!: 'program' | 'art' | 'product' | 'operations' | 'middle_platform' | 'function';

  @IsOptional()
  @IsString()
  @IsIn(['tk', 'jwus1', 'jwus2'])
  projectGroup?: 'tk' | 'jwus1' | 'jwus2';

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'draft', 'archived'])
  status?: 'active' | 'draft' | 'archived';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  techStack?: string[];

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeNote?: string;
}
