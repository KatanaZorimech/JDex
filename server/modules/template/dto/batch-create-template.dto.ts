import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { CreateTemplateDtoClass } from './create-template.dto';

export class BatchCreateTemplateDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateTemplateDtoClass)
  items!: CreateTemplateDtoClass[];
}
