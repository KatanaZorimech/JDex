import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';
import type { CreateOfferRequest } from '@shared/api.interface';

export class CreateOfferDto implements CreateOfferRequest {
  @IsString()
  @MaxLength(100)
  candidateName!: string;

  @IsString()
  @MaxLength(255)
  positionTitle!: string;

  @IsString()
  @IsIn(['tk', 'jwus1', 'jwus2', 'ops', 'middle_platform', 'overseas', 'function'])
  projectGroup!: 'tk' | 'jwus1' | 'jwus2' | 'ops' | 'middle_platform' | 'overseas' | 'function';

  @IsString()
  @IsIn(['program', 'art', 'product', 'operations', 'middle_platform', 'function'])
  category!: 'program' | 'art' | 'product' | 'operations' | 'middle_platform' | 'function';

  @IsOptional()
  @IsString()
  onboardDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  recruiter?: string;

  @IsString()
  @IsIn(['onboarded', 'rejected', 'in_progress'])
  status!: 'onboarded' | 'rejected' | 'in_progress';

  @IsOptional()
  @IsString()
  @IsIn(['salary', 'location', 'family', 'better_offer', 'health', 'school', 'other'])
  rejectReasonCategory?: 'salary' | 'location' | 'family' | 'better_offer' | 'health' | 'school' | 'other';

  @IsOptional()
  @IsString()
  rejectReasonDetail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  salaryInfo?: string;

  @IsOptional()
  @IsString()
  jdId?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
