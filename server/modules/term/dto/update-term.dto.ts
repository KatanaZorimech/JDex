import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { UpdateTermDto as IUpdateTermDto } from '@shared/api.interface';

export class UpdateTermDto implements IUpdateTermDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(['engine', 'programming', 'tool', 'art', 'software', 'technology', 'other'])
  category?: 'engine' | 'programming' | 'tool' | 'art' | 'software' | 'technology' | 'other';

  @IsOptional()
  @IsString()
  explanationHr?: string;

  @IsOptional()
  @IsString()
  explanationTech?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedTerms?: string[];
}
