import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';
import type { UpdateCampusSchoolRequest } from '@shared/api.interface';

export class UpdateCampusSchoolDto implements UpdateCampusSchoolRequest {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  schoolName?: string;

  @IsOptional()
  @IsString()
  @IsIn(['985', '211', 'double_first_class', 'other'])
  category?: '985' | '211' | 'double_first_class' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  loginAccount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  loginPassword?: string;

  @IsOptional()
  @IsString()
  @IsIn(['registered', 'not_registered', 'pending'])
  fairStatus?: 'registered' | 'not_registered' | 'pending';

  @IsOptional()
  @IsString()
  fairTime?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  boothFee?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
