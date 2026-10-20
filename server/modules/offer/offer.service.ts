import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, count, desc, ilike, sql, or, gte, lt } from 'drizzle-orm';
import { offerRecord } from '@server/database/schema';
import type {
  OfferItem,
  OfferListResponse,
  OfferStatsResponse,
  OfferProjectGroup,
  OfferStatus,
  RejectReasonCategory,
  JdCategory,
} from '@shared/api.interface';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { ListOfferDto } from './dto/list-offer.dto';

@Injectable()
export class OfferService {
  private readonly logger = new Logger(OfferService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async list(params: ListOfferDto): Promise<OfferListResponse> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = [];

    if (params.keyword) {
      const kw = `%${params.keyword}%`;
      conditions.push(
        or(
          ilike(offerRecord.candidateName, kw),
          ilike(offerRecord.positionTitle, kw),
        ),
      );
    }

    if (params.projectGroup) {
      conditions.push(eq(offerRecord.projectGroup, params.projectGroup));
    }

    if (params.category) {
      conditions.push(eq(offerRecord.category, params.category));
    }

    if (params.status) {
      conditions.push(eq(offerRecord.status, params.status));
    }

    if (params.year) {
      const yearStr = String(params.year);
      const startDate = `${yearStr}-01-01`;
      const endDate = `${params.year + 1}-01-01`;
      if (params.month) {
        const monthStr = String(params.month).padStart(2, '0');
        const monthStart = `${yearStr}-${monthStr}-01`;
        const nextMonth = params.month === 12 ? 1 : params.month + 1;
        const nextMonthYear = params.month === 12 ? params.year + 1 : params.year;
        const nextMonthStr = String(nextMonth).padStart(2, '0');
        const monthEnd = `${nextMonthYear}-${nextMonthStr}-01`;
        conditions.push(
          and(
            gte(offerRecord.onboardDate, monthStart),
            lt(offerRecord.onboardDate, monthEnd),
          ),
        );
      } else {
        conditions.push(
          and(
            gte(offerRecord.onboardDate, startDate),
            lt(offerRecord.onboardDate, endDate),
          ),
        );
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, items] = await Promise.all([
      this.db.select({ count: count() }).from(offerRecord).where(whereClause),
      this.db
        .select()
        .from(offerRecord)
        .where(whereClause)
        .orderBy(
          sql`${offerRecord.onboardDate} DESC NULLS LAST`,
          desc(offerRecord.updatedAt),
        )
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

  async getById(id: string): Promise<OfferItem> {
    const rows = await this.db
      .select()
      .from(offerRecord)
      .where(eq(offerRecord.id, id))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('Offer记录不存在');
    }
    return this.mapToItem(rows[0]);
  }

  async stats(params?: { projectGroup?: string; year?: number }): Promise<OfferStatsResponse> {
    const baseConditions = [];
    if (params?.projectGroup) {
      baseConditions.push(eq(offerRecord.projectGroup, params.projectGroup));
    }

    const baseWhere = baseConditions.length > 0 ? and(...baseConditions) : undefined;

    const trendConditions = [...baseConditions];
    if (params?.year) {
      const yearStr = String(params.year);
      const startDate = `${yearStr}-01-01`;
      const endDate = `${Number(params.year) + 1}-01-01`;
      trendConditions.push(
        sql`${offerRecord.onboardDate} >= ${startDate}`,
        sql`${offerRecord.onboardDate} < ${endDate}`,
      );
    }
    const trendWhere = trendConditions.length > 0 ? and(...trendConditions) : undefined;

    const [overallRows, rejectRows, categoryRows] = await Promise.all([
      this.db
        .select({
          totalOffers: count(),
          onboardedCount: sql<number>`
            count(*) filter (where ${offerRecord.status} = 'onboarded')
          `,
          rejectedCount: sql<number>`
            count(*) filter (where ${offerRecord.status} = 'rejected')
          `,
          inProgressCount: sql<number>`
            count(*) filter (where ${offerRecord.status} = 'in_progress')
          `,
        })
        .from(offerRecord)
        .where(baseWhere),
      this.db
        .select({
          category: offerRecord.rejectReasonCategory,
          count: count(),
        })
        .from(offerRecord)
        .where(
          and(
            ...baseConditions,
            eq(offerRecord.status, 'rejected'),
          ),
        )
        .groupBy(offerRecord.rejectReasonCategory),
      this.db
        .select({
          category: offerRecord.category,
          count: count(),
        })
        .from(offerRecord)
        .where(baseWhere)
        .groupBy(offerRecord.category),
    ]);

    const overall = overallRows[0];
    const totalOffers = overall?.totalOffers ?? 0;
    const onboardedCount = Number(overall?.onboardedCount ?? 0);
    const rejectedCount = Number(overall?.rejectedCount ?? 0);
    const inProgressCount = Number(overall?.inProgressCount ?? 0);
    const acceptRate = totalOffers > 0 ? onboardedCount / totalOffers : 0;

    // Monthly trend: 12 months of the specified year, or last 12 months
    const months: { month: string; offers: number; onboarded: number }[] = [];
    if (params?.year) {
      for (let m = 1; m <= 12; m += 1) {
        const monthStr = `${params.year}-${String(m).padStart(2, '0')}`;
        months.push({ month: monthStr, offers: 0, onboarded: 0 });
      }
    } else {
      const now = new Date();
      for (let i = 11; i >= 0; i -= 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.push({ month: monthStr, offers: 0, onboarded: 0 });
      }
    }

    const monthMap = new Map(months.map((m) => [m.month, m]));

    const [offerRows, onboardedRows] = await Promise.all([
      this.db
        .select({
          month: sql<string>`TO_CHAR(${offerRecord.onboardDate}, 'YYYY-MM')`,
          count: sql<number>`count(*)`,
        })
        .from(offerRecord)
        .where(trendWhere)
        .groupBy(sql`TO_CHAR(${offerRecord.onboardDate}, 'YYYY-MM')`),
      this.db
        .select({
          month: sql<string>`TO_CHAR(${offerRecord.onboardDate}, 'YYYY-MM')`,
          count: sql<number>`count(*)`,
        })
        .from(offerRecord)
        .where(
          trendWhere
            ? and(trendWhere, eq(offerRecord.status, 'onboarded'))
            : eq(offerRecord.status, 'onboarded'),
        )
        .groupBy(sql`TO_CHAR(${offerRecord.onboardDate}, 'YYYY-MM')`),
    ]);

    for (const row of offerRows) {
      const m = monthMap.get(row.month);
      if (m) {
        m.offers = Number(row.count);
      }
    }

    for (const row of onboardedRows) {
      const m = monthMap.get(row.month);
      if (m) {
        m.onboarded = Number(row.count);
      }
    }

    const monthlyTrend = months;

    return {
      totalOffers,
      onboardedCount,
      rejectedCount,
      inProgressCount,
      acceptRate,
      monthlyTrend,
      rejectReasons: rejectRows
        .filter((row) => row.category !== null)
        .map((row) => ({
          category: row.category as RejectReasonCategory,
          count: row.count,
        })),
      categoryDistribution: categoryRows.map((row) => ({
        category: row.category as JdCategory,
        count: row.count,
      })),
    };
  }

  async create(dto: CreateOfferDto, userId: string): Promise<OfferItem> {
    const [created] = await this.db
      .insert(offerRecord)
      .values({
        candidateName: dto.candidateName,
        positionTitle: dto.positionTitle,
        projectGroup: dto.projectGroup,
        category: dto.category,
        onboardDate: dto.onboardDate ?? null,
        recruiter: dto.recruiter ?? null,
        status: dto.status,
        rejectReasonCategory: dto.rejectReasonCategory ?? null,
        rejectReasonDetail: dto.rejectReasonDetail ?? null,
        salaryInfo: dto.salaryInfo ?? null,
        jdId: dto.jdId ?? null,
        remark: dto.remark ?? null,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return this.mapToItem(created);
  }

  async update(id: string, dto: UpdateOfferDto, userId: string): Promise<OfferItem> {
    const patch: Record<string, unknown> = {};
    if (dto.candidateName !== undefined) patch.candidateName = dto.candidateName;
    if (dto.positionTitle !== undefined) patch.positionTitle = dto.positionTitle;
    if (dto.projectGroup !== undefined) patch.projectGroup = dto.projectGroup;
    if (dto.category !== undefined) patch.category = dto.category;
    if (dto.onboardDate !== undefined) patch.onboardDate = dto.onboardDate ?? null;
    if (dto.recruiter !== undefined) patch.recruiter = dto.recruiter ?? null;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.rejectReasonCategory !== undefined) {
      patch.rejectReasonCategory = dto.rejectReasonCategory ?? null;
    }
    if (dto.rejectReasonDetail !== undefined) {
      patch.rejectReasonDetail = dto.rejectReasonDetail ?? null;
    }
    if (dto.salaryInfo !== undefined) patch.salaryInfo = dto.salaryInfo ?? null;
    if (dto.jdId !== undefined) patch.jdId = dto.jdId ?? null;
    if (dto.remark !== undefined) patch.remark = dto.remark ?? null;

    patch.updatedBy = userId;

    const [updated] = await this.db
      .update(offerRecord)
      .set(patch)
      .where(eq(offerRecord.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException('Offer记录不存在');
    }

    return this.mapToItem(updated);
  }

  async remove(id: string): Promise<void> {
    const rows = await this.db
      .delete(offerRecord)
      .where(eq(offerRecord.id, id))
      .returning({ id: offerRecord.id });
    if (rows.length === 0) {
      throw new NotFoundException('Offer记录不存在');
    }
  }

  async batchImport(
    items: CreateOfferDto[],
    userId: string,
  ): Promise<{ successCount: number; failedCount: number; errors: { rowIndex: number; error: string }[] }> {
    const errors: { rowIndex: number; error: string }[] = [];
    let successCount = 0;

    for (let i = 0; i < items.length; i += 1) {
      try {
        await this.create(items[i], userId);
        successCount += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : '未知错误';
        errors.push({ rowIndex: i, error: message });
      }
    }

    return {
      successCount,
      failedCount: errors.length,
      errors,
    };
  }

  private mapToItem(row: typeof offerRecord.$inferSelect): OfferItem {
    const onboardDate = row.onboardDate
      ? String(row.onboardDate).slice(0, 10)
      : undefined;

    return {
      id: row.id,
      candidateName: row.candidateName,
      positionTitle: row.positionTitle,
      projectGroup: row.projectGroup as OfferProjectGroup,
      category: row.category as JdCategory,
      onboardDate,
      recruiter: row.recruiter ?? undefined,
      status: row.status as OfferStatus,
      rejectReasonCategory: (row.rejectReasonCategory ?? undefined) as
        | RejectReasonCategory
        | undefined,
      rejectReasonDetail: row.rejectReasonDetail ?? undefined,
      salaryInfo: row.salaryInfo ?? undefined,
      jdId: row.jdId ?? undefined,
      remark: row.remark ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      createdBy: row.createdBy ?? '',
    };
  }
}
