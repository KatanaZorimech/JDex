import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import type { CreateTermDto as ICreateTermDto } from '@shared/api.interface';

export class CreateTermDto implements ICreateTermDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsIn(['engine', 'programming', 'tool', 'art', 'software', 'technology', 'other'])
  category!: 'engine' | 'programming' | 'tool' | 'art' | 'software' | 'technology' | 'other';

  @IsString()
  explanationHr!: string;

  @IsString()
  explanationTech!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedTerms?: string[];
}

export class BatchCreateTermDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateTermDto)
  items!: CreateTermDto[];
}

export class RecognizeTextDto {
  @IsString()
  text!: string;
}
