import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';
import type { UpdateOfferRequest } from '@shared/api.interface';

export class UpdateOfferDto implements UpdateOfferRequest {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  candidateName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  positionTitle?: string;

  @IsOptional()
  @IsString()
  @IsIn(['tk', 'jwus1', 'jwus2', 'ops', 'middle_platform', 'overseas', 'function'])
  projectGroup?: 'tk' | 'jwus1' | 'jwus2' | 'ops' | 'middle_platform' | 'overseas' | 'function';

  @IsOptional()
  @IsString()
  @IsIn(['program', 'art', 'product', 'operations', 'middle_platform', 'function'])
  category?: 'program' | 'art' | 'product' | 'operations' | 'middle_platform' | 'function';

  @IsOptional()
  @IsString()
  onboardDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  recruiter?: string;

  @IsOptional()
  @IsString()
  @IsIn(['onboarded', 'rejected', 'in_progress'])
  status?: 'onboarded' | 'rejected' | 'in_progress';

  @IsOptional()
  @IsString()
  @IsIn(['salary', 'location', 'family', 'better_offer', 'health', 'school', 'other'])
  rejectReasonCategory?: 'salary' | 'location' | 'family' | 'better_offer' | 'health' | 'school' | 'other' | null;

  @IsOptional()
  @IsString()
  rejectReasonDetail?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  salaryInfo?: string | null;

  @IsOptional()
  @IsString()
  jdId?: string | null;

  @IsOptional()
  @IsString()
  remark?: string | null;
}
