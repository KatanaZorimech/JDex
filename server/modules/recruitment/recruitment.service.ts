import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, count, desc, ilike, sql, asc } from 'drizzle-orm';
import { recruitmentPosition } from '@server/database/schema';
import type {
  RecruitmentPositionItem,
  RecruitmentListResponse,
  RecruitmentStats,
  ProjectGroup,
  PriorityLevel,
  RecruitmentStage,
} from '@shared/api.interface';
import { CreateRecruitmentDto } from './dto/create-recruitment.dto';
import { UpdateRecruitmentDto } from './dto/update-recruitment.dto';
import { ListRecruitmentDto } from './dto/list-recruitment.dto';

@Injectable()
export class RecruitmentService {
  private readonly logger = new Logger(RecruitmentService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async list(params: ListRecruitmentDto): Promise<RecruitmentListResponse> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = [];

    if (params.keyword) {
      const kw = `%${params.keyword}%`;
      conditions.push(ilike(recruitmentPosition.title, kw));
    }

    if (params.projectGroup) {
      conditions.push(eq(recruitmentPosition.projectGroup, params.projectGroup));
    }

    if (params.category) {
      conditions.push(eq(recruitmentPosition.category, params.category));
    }

    if (params.stage) {
      conditions.push(eq(recruitmentPosition.stage, params.stage));
    }

    if (params.priority) {
      conditions.push(eq(recruitmentPosition.priority, params.priority));
    }

    if (params.hiringManager) {
      conditions.push(
        sql`(${recruitmentPosition.hiringManager}).user_id = ${params.hiringManager}`,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, items] = await Promise.all([
      this.db.select({ count: count() }).from(recruitmentPosition).where(whereClause),
      this.db
        .select()
        .from(recruitmentPosition)
        .where(whereClause)
        .orderBy(asc(recruitmentPosition.sortOrder), desc(recruitmentPosition.updatedAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      items: items.map((item) => this.mapToItem(item)),
      total,
      page,
      pageSize,
    };
  }

  async getById(id: string): Promise<RecruitmentPositionItem> {
    const rows = await this.db
      .select()
      .from(recruitmentPosition)
      .where(eq(recruitmentPosition.id, id))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('招聘职位不存在');
    }
    return this.mapToItem(rows[0]);
  }

  async stats(): Promise<RecruitmentStats> {
    const [overallRows, byGroupRows, byPriorityRows, byStageRows] = await Promise.all([
      this.db
        .select({
          totalPositions: count(),
          totalHeadCount: sql<number>`COALESCE(SUM(${recruitmentPosition.headCount}), 0)`,
          totalOnboarded: sql<number>`COALESCE(SUM(${recruitmentPosition.onboardedCount}), 0)`,
          resumeSum: sql<number>`COALESCE(SUM(${recruitmentPosition.resumeCount}), 0)`,
          interviewSum: sql<number>`COALESCE(SUM(${recruitmentPosition.interviewCount}), 0)`,
          offerSum: sql<number>`COALESCE(SUM(${recruitmentPosition.offerCount}), 0)`,
        })
        .from(recruitmentPosition),
      this.db
        .select({
          projectGroup: recruitmentPosition.projectGroup,
          count: count(),
        })
        .from(recruitmentPosition)
        .groupBy(recruitmentPosition.projectGroup),
      this.db
        .select({
          priority: recruitmentPosition.priority,
          count: count(),
        })
        .from(recruitmentPosition)
        .groupBy(recruitmentPosition.priority),
      this.db
        .select({
          stage: recruitmentPosition.stage,
          count: count(),
        })
        .from(recruitmentPosition)
        .groupBy(recruitmentPosition.stage),
    ]);

    const overall = overallRows[0];
    const totalHeadCount = Number(overall?.totalHeadCount ?? 0);
    const totalOnboarded = Number(overall?.totalOnboarded ?? 0);
    const completionRate = totalHeadCount > 0 ? totalOnboarded / totalHeadCount : 0;

    return {
      totalPositions: overall?.totalPositions ?? 0,
      totalHeadCount,
      totalOnboarded,
      completionRate,
      byProjectGroup: byGroupRows.map((row) => ({
        projectGroup: row.projectGroup as ProjectGroup,
        count: row.count,
      })),
      byPriority: byPriorityRows.map((row) => ({
        priority: row.priority as PriorityLevel,
        count: row.count,
      })),
      byStage: byStageRows.map((row) => ({
        stage: row.stage as RecruitmentStage,
        count: row.count,
      })),
      funnel: {
        resume: Number(overall?.resumeSum ?? 0),
        interview: Number(overall?.interviewSum ?? 0),
        offer: Number(overall?.offerSum ?? 0),
        onboarded: totalOnboarded,
      },
    };
  }

  async create(dto: CreateRecruitmentDto, userId: string): Promise<RecruitmentPositionItem> {
    const [created] = await this.db
      .insert(recruitmentPosition)
      .values({
        title: dto.title,
        projectGroup: dto.projectGroup,
        category: dto.category,
        jdId: dto.jdId ? dto.jdId : null,
        hiringManager: dto.hiringManager ?? null,
        priority: dto.priority ?? 'p2',
        headCount: dto.headCount ?? 1,
        stage: dto.stage ?? 'pending',
        resumeCount: dto.resumeCount ?? 0,
        interviewCount: dto.interviewCount ?? 0,
        offerCount: dto.offerCount ?? 0,
        onboardedCount: dto.onboardedCount ?? 0,
        expectedStartDate: dto.expectedStartDate ?? null,
        remark: dto.remark ?? null,
        sortOrder: dto.sortOrder ?? 0,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return this.mapToItem(created);
  }

  async update(id: string, dto: UpdateRecruitmentDto, userId: string): Promise<RecruitmentPositionItem> {
    const patch: Record<string, unknown> = {};
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.projectGroup !== undefined) patch.projectGroup = dto.projectGroup;
    if (dto.category !== undefined) patch.category = dto.category;
    if (dto.jdId !== undefined) patch.jdId = dto.jdId ? dto.jdId : null;
    if (dto.hiringManager !== undefined) patch.hiringManager = dto.hiringManager;
    if (dto.priority !== undefined) patch.priority = dto.priority;
    if (dto.headCount !== undefined) patch.headCount = dto.headCount;
    if (dto.stage !== undefined) patch.stage = dto.stage;
    if (dto.resumeCount !== undefined) patch.resumeCount = dto.resumeCount;
    if (dto.interviewCount !== undefined) patch.interviewCount = dto.interviewCount;
    if (dto.offerCount !== undefined) patch.offerCount = dto.offerCount;
    if (dto.onboardedCount !== undefined) patch.onboardedCount = dto.onboardedCount;
    if (dto.expectedStartDate !== undefined) {
      patch.expectedStartDate = dto.expectedStartDate ?? null;
    }
    if (dto.remark !== undefined) patch.remark = dto.remark;
    if (dto.sortOrder !== undefined) patch.sortOrder = dto.sortOrder;

    patch.updatedBy = userId;

    const [updated] = await this.db
      .update(recruitmentPosition)
      .set(patch)
      .where(eq(recruitmentPosition.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException('招聘职位不存在');
    }

    return this.mapToItem(updated);
  }

  async remove(id: string): Promise<void> {
    const rows = await this.db
      .delete(recruitmentPosition)
      .where(eq(recruitmentPosition.id, id))
      .returning({ id: recruitmentPosition.id });
    if (rows.length === 0) {
      throw new NotFoundException('招聘职位不存在');
    }
  }

  private mapToItem(row: typeof recruitmentPosition.$inferSelect): RecruitmentPositionItem {
    const expectedStartDate = row.expectedStartDate
      ? String(row.expectedStartDate).slice(0, 10)
      : undefined;

    return {
      id: row.id,
      title: row.title,
      projectGroup: row.projectGroup as ProjectGroup,
      category: row.category as
        | 'program'
        | 'art'
        | 'product'
        | 'operations'
        | 'middle_platform'
        | 'function',
      jdId: row.jdId ?? undefined,
      hiringManager: row.hiringManager ?? undefined,
      priority: row.priority as PriorityLevel,
      headCount: row.headCount,
      onboardedCount: row.onboardedCount,
      stage: row.stage as RecruitmentStage,
      sortOrder: row.sortOrder,
      resumeCount: row.resumeCount,
      interviewCount: row.interviewCount,
      offerCount: row.offerCount,
      expectedStartDate,
      remark: row.remark ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      createdBy: row.createdBy ?? undefined,
    };
  }
}
