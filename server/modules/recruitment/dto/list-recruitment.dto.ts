import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import type { RecruitmentListParams } from '@shared/api.interface';

export class ListRecruitmentDto implements RecruitmentListParams {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsString()
  keyword?: string;

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
  @IsIn(['pending', 'resume', 'interview', 'offer', 'onboarded', 'closed'])
  stage?: 'pending' | 'resume' | 'interview' | 'offer' | 'onboarded' | 'closed';

  @IsOptional()
  @IsString()
  @IsIn(['p0', 'p1', 'p2', 'p3'])
  priority?: 'p0' | 'p1' | 'p2' | 'p3';

  @IsOptional()
  @IsString()
  hiringManager?: string;
}
