import { IsString, IsOptional, IsIn, IsInt, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { UpdateRecruitmentDto as SharedUpdateRecruitmentDto } from '@shared/api.interface';

export class UpdateRecruitmentDto implements SharedUpdateRecruitmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @IsIn(['tk', 'jwus1', 'jwus2'])
  projectGroup?: 'tk' | 'jwus1' | 'jwus2';

  @IsOptional()
  @IsString()
  @IsIn(['program', 'art', 'product', 'operations', 'middle_platform', 'function'])
  category?: 'program' | 'art' | 'product' | 'operations' | 'middle_platform' | 'function';

  @IsOptional()
  @IsString()
  jdId?: string;

  @IsOptional()
  @IsString()
  hiringManager?: string;

  @IsOptional()
  @IsString()
  @IsIn(['p0', 'p1', 'p2', 'p3'])
  priority?: 'p0' | 'p1' | 'p2' | 'p3';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  headCount?: number;

  @IsOptional()
  @IsString()
  @IsIn(['pending', 'resume', 'interview', 'offer', 'onboarded', 'closed'])
  stage?: 'pending' | 'resume' | 'interview' | 'offer' | 'onboarded' | 'closed';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  resumeCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  interviewCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offerCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  onboardedCount?: number;

  @IsOptional()
  @IsString()
  expectedStartDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  remark?: string;
}
