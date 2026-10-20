export type JdCategory = 'program' | 'art' | 'product' | 'operations' | 'middle_platform' | 'function';

export const JD_CATEGORY_LABELS: Record<JdCategory, string> = {
  program: '程序',
  art: '美术',
  product: '产品',
  operations: '运营&发行',
  middle_platform: '中台',
  function: '职能',
};

export type ProjectGroup = 'tk' | 'jwus1' | 'jwus2';

export const PROJECT_GROUP_LABELS: Record<ProjectGroup, string> = {
  tk: 'TK项目组',
  jwus1: '极无双1项目组',
  jwus2: '极无双2项目组',
};

export type OfferProjectGroup = 'tk' | 'jwus1' | 'jwus2' | 'ops' | 'middle_platform' | 'overseas' | 'function';

export const OFFER_PROJECT_GROUP_LABELS: Record<OfferProjectGroup, string> = {
  tk: 'TK',
  jwus1: '极无双1',
  jwus2: '极无双2',
  ops: '运营&发行',
  middle_platform: '中台',
  overseas: '海外',
  function: '职能',
};

export type RecruitmentStage = 'pending' | 'resume' | 'interview' | 'offer' | 'onboarded' | 'closed';

export const RECRUITMENT_STAGE_LABELS: Record<RecruitmentStage, string> = {
  pending: '待启动',
  resume: '简历筛选',
  interview: '面试中',
  offer: 'Offer沟通',
  onboarded: '已入职',
  closed: '已关闭',
};

export type PriorityLevel = 'p0' | 'p1' | 'p2' | 'p3';

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  p0: 'P0 紧急',
  p1: 'P1 高优',
  p2: 'P2 正常',
  p3: 'P3 低优',
};

export type JdStatus = 'active' | 'draft' | 'archived';

export type TermCategory = 'engine' | 'programming' | 'tool' | 'art' | 'software' | 'technology' | 'other';

export const TERM_CATEGORY_LABELS: Record<TermCategory, string> = {
  engine: '引擎',
  programming: '编程语言',
  tool: '工具软件',
  art: '美术',
  software: '软件工具',
  technology: '技术概念',
  other: '其他',
};

export type TemplateType = 'jd' | 'company_intro' | 'benefits' | 'responsibility' | 'requirement';

export const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  jd: 'JD模板',
  company_intro: '公司介绍',
  benefits: '福利待遇',
  responsibility: '岗位职责',
  requirement: '任职要求',
};

export interface JdItem {
  id: string;
  title: string;
  department?: string;
  category: JdCategory;
  projectGroup: ProjectGroup;
  content: string;
  status: JdStatus;
  tags: string[];
  techStack: string[];
  isTemplate: boolean;
  parentId?: string;
  version: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface JdVersionItem {
  id: string;
  jdId: string;
  title: string;
  content: string;
  version: number;
  changeNote?: string;
  createdAt: string;
  createdBy?: string;
}

export interface TermItem {
  id: string;
  name: string;
  category: TermCategory;
  explanationHr: string;
  explanationTech: string;
  relatedTerms: string[];
  createdAt: string;
  updatedAt: string;
}

export interface JdTemplateItem {
  id: string;
  name: string;
  category: JdCategory | 'company' | 'welfare';
  projectGroup: ProjectGroup;
  type: TemplateType;
  content: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JdListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  category?: JdCategory;
  projectGroup?: ProjectGroup;
  status?: JdStatus;
  tag?: string;
  techStack?: string;
  isTemplate?: boolean;
  isArchived?: boolean;
}

export interface JdListResponse {
  items: JdItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateJdDto {
  title: string;
  department?: string;
  category: JdCategory;
  projectGroup?: ProjectGroup;
  content: string;
  status?: JdStatus;
  tags?: string[];
  techStack?: string[];
  isTemplate?: boolean;
  parentId?: string;
  changeNote?: string;
}

export interface UpdateJdDto {
  title?: string;
  department?: string;
  category?: JdCategory;
  projectGroup?: ProjectGroup;
  content?: string;
  status?: JdStatus;
  tags?: string[];
  techStack?: string[];
  isArchived?: boolean;
  changeNote?: string;
}

export interface TermListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  category?: TermCategory;
}

export interface TermListResponse {
  items: TermItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateTermDto {
  name: string;
  category: TermCategory;
  explanationHr: string;
  explanationTech: string;
  relatedTerms?: string[];
}

export interface UpdateTermDto {
  name?: string;
  category?: TermCategory;
  explanationHr?: string;
  explanationTech?: string;
  relatedTerms?: string[];
}

export interface TemplateListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  category?: JdCategory | 'company' | 'welfare';
  type?: TemplateType;
  isSystem?: boolean;
}

export interface TemplateListResponse {
  items: JdTemplateItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateTemplateDto {
  name: string;
  category: JdCategory;
  type: TemplateType;
  content: string;
  description?: string;
}

export interface UpdateTemplateDto {
  name?: string;
  category?: JdCategory;
  type?: TemplateType;
  content?: string;
  description?: string;
}

export interface TermRecognitionResult {
  term: TermItem;
  startIndex: number;
  endIndex: number;
}

export interface JdTermStats {
  termId: string;
  termName: string;
  category: TermCategory;
  count: number;
}

export interface JdTermAnalysis {
  terms: TermRecognitionResult[];
  stats: JdTermStats[];
  unknownTerms: string[];
}

export interface RecruitmentPositionItem {
  id: string;
  title: string;
  projectGroup: ProjectGroup;
  category: JdCategory;
  jdId?: string;
  hiringManager?: string;
  priority: PriorityLevel;
  headCount: number;
  onboardedCount: number;
  stage: RecruitmentStage;
  sortOrder: number;
  resumeCount: number;
  interviewCount: number;
  offerCount: number;
  expectedStartDate?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface RecruitmentListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  projectGroup?: ProjectGroup;
  category?: JdCategory;
  stage?: RecruitmentStage;
  priority?: PriorityLevel;
  hiringManager?: string;
}

export interface RecruitmentListResponse {
  items: RecruitmentPositionItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateRecruitmentDto {
  title: string;
  projectGroup: ProjectGroup;
  category: JdCategory;
  jdId?: string;
  hiringManager?: string;
  priority?: PriorityLevel;
  headCount?: number;
  stage?: RecruitmentStage;
  resumeCount?: number;
  interviewCount?: number;
  offerCount?: number;
  onboardedCount?: number;
  expectedStartDate?: string;
  remark?: string;
  sortOrder?: number;
}

export interface UpdateRecruitmentDto {
  title?: string;
  projectGroup?: ProjectGroup;
  category?: JdCategory;
  jdId?: string;
  hiringManager?: string;
  priority?: PriorityLevel;
  headCount?: number;
  stage?: RecruitmentStage;
  resumeCount?: number;
  interviewCount?: number;
  offerCount?: number;
  onboardedCount?: number;
  expectedStartDate?: string;
  remark?: string;
  sortOrder?: number;
}

export interface RecruitmentStats {
  totalPositions: number;
  totalHeadCount: number;
  totalOnboarded: number;
  completionRate: number;
  byProjectGroup: { projectGroup: ProjectGroup; count: number }[];
  byPriority: { priority: PriorityLevel; count: number }[];
  byStage: { stage: RecruitmentStage; count: number }[];
  funnel: {
    resume: number;
    interview: number;
    offer: number;
    onboarded: number;
  };
}

export interface ImportPreviewItem {
  rowIndex: number;
  valid: boolean;
  error?: string;
}

export interface JdImportPreviewItem extends ImportPreviewItem {
  title: string;
  category: JdCategory | '';
  projectGroup: ProjectGroup | '';
  content: string;
  tags: string[];
}

export interface TermImportPreviewItem extends ImportPreviewItem {
  name: string;
  category: TermCategory | '';
  explanationHr: string;
  explanationTech: string;
  relatedTerms: string[];
}

export interface TemplateImportPreviewItem extends ImportPreviewItem {
  name: string;
  type: TemplateType | '';
  category: JdCategory | '';
  content: string;
  description: string;
}

export interface JdImportPreviewResponse {
  items: JdImportPreviewItem[];
  total: number;
  validCount: number;
  invalidCount: number;
}

export interface TermImportPreviewResponse {
  items: TermImportPreviewItem[];
  total: number;
  validCount: number;
  invalidCount: number;
}

export interface TemplateImportPreviewResponse {
  items: TemplateImportPreviewItem[];
  total: number;
  validCount: number;
  invalidCount: number;
}

export interface ImportConfirmRequest {
  fileKey: string;
  selectedIndexes: number[];
}

export interface ImportConfirmResponse {
  successCount: number;
  failedCount: number;
  errors: { rowIndex: number; error: string }[];
}

export type OfferStatus = 'onboarded' | 'rejected' | 'in_progress';

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  onboarded: '已入职',
  rejected: '已拒接',
  in_progress: '进行中',
};

export type RejectReasonCategory =
  | 'salary'
  | 'location'
  | 'family'
  | 'better_offer'
  | 'health'
  | 'school'
  | 'other';

export const REJECT_REASON_LABELS: Record<RejectReasonCategory, string> = {
  salary: '薪资不满意',
  location: '地点问题',
  family: '家庭原因',
  better_offer: '更好offer',
  health: '身体原因',
  school: '学校原因',
  other: '其他',
};

export interface OfferItem {
  id: string;
  candidateName: string;
  positionTitle: string;
  projectGroup: OfferProjectGroup;
  category: JdCategory;
  onboardDate?: string;
  recruiter?: string;
  status: OfferStatus;
  rejectReasonCategory?: RejectReasonCategory;
  rejectReasonDetail?: string;
  salaryInfo?: string;
  jdId?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface OfferListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  projectGroup?: OfferProjectGroup;
  category?: JdCategory;
  status?: OfferStatus;
  year?: number;
  month?: number;
}

export interface OfferListResponse {
  items: OfferItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateOfferRequest {
  candidateName: string;
  positionTitle: string;
  projectGroup: OfferProjectGroup;
  category: JdCategory;
  onboardDate?: string;
  recruiter?: string;
  status: OfferStatus;
  rejectReasonCategory?: RejectReasonCategory;
  rejectReasonDetail?: string;
  salaryInfo?: string;
  jdId?: string;
  remark?: string;
}

export interface UpdateOfferRequest {
  candidateName?: string;
  positionTitle?: string;
  projectGroup?: OfferProjectGroup;
  category?: JdCategory;
  onboardDate?: string | null;
  recruiter?: string;
  status?: OfferStatus;
  rejectReasonCategory?: RejectReasonCategory | null;
  rejectReasonDetail?: string | null;
  salaryInfo?: string | null;
  jdId?: string | null;
  remark?: string | null;
}

export interface OfferStatsResponse {
  totalOffers: number;
  onboardedCount: number;
  rejectedCount: number;
  inProgressCount: number;
  acceptRate: number;
  monthlyTrend: { month: string; offers: number; onboarded: number }[];
  rejectReasons: { category: RejectReasonCategory; count: number }[];
  categoryDistribution: { category: JdCategory; count: number }[];
}

export interface OfferImportPreviewItem extends ImportPreviewItem {
  candidateName: string;
  positionTitle: string;
  onboardDate: string;
  recruiter: string;
  rejectReason: string;
}

export interface OfferImportRow {
  candidateName: string;
  positionTitle: string;
  onboardDate?: string;
  recruiter?: string;
  rejectReason?: string;
}

export interface OfferBatchImportRequest {
  items: CreateOfferRequest[];
}

export type SchoolCategory = '985' | '211' | 'double_first_class' | 'other';

export const SCHOOL_CATEGORY_LABELS: Record<SchoolCategory, string> = {
  '985': '985',
  '211': '211',
  double_first_class: '双一流',
  other: '其他',
};

export type FairStatus = 'registered' | 'not_registered' | 'pending';

export const FAIR_STATUS_LABELS: Record<FairStatus, string> = {
  registered: '已报名',
  not_registered: '未报名',
  pending: '待确认',
};

export interface CampusSchoolItem {
  id: string;
  schoolName: string;
  category: SchoolCategory;
  websiteUrl?: string;
  loginAccount?: string;
  loginPassword?: string;
  fairStatus: FairStatus;
  fairTime?: string;
  boothFee?: string;
  location?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CampusSchoolListResponse {
  items: CampusSchoolItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CampusSchoolListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  category?: SchoolCategory;
  fairStatus?: FairStatus;
}

export interface CreateCampusSchoolRequest {
  schoolName: string;
  category: SchoolCategory;
  websiteUrl?: string;
  loginAccount?: string;
  loginPassword?: string;
  fairStatus: FairStatus;
  fairTime?: string;
  boothFee?: string;
  location?: string;
  remark?: string;
}

export type UpdateCampusSchoolRequest = Partial<CreateCampusSchoolRequest>;

export interface CampusFairEvent {
  id: string;
  schoolName: string;
  category: SchoolCategory;
  fairTime: string;
  location?: string;
  remark?: string;
}

export interface CampusFairCalendarParams {
  year: number;
  month: number;
}
