import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, count, ilike, sql, gte, lt, asc } from 'drizzle-orm';
import { campusSchool } from '@server/database/schema';
import type {
  CampusSchoolItem,
  CampusSchoolListResponse,
  CampusFairEvent,
  SchoolCategory,
  FairStatus,
} from '@shared/api.interface';
import { CreateCampusSchoolDto } from './dto/create-campus-school.dto';
import { UpdateCampusSchoolDto } from './dto/update-campus-school.dto';
import { ListCampusSchoolDto } from './dto/list-campus-school.dto';

@Injectable()
export class CampusService {
  private readonly logger = new Logger(CampusService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async list(params: ListCampusSchoolDto): Promise<CampusSchoolListResponse> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const offset = (page - 1) * pageSize;

    const conditions = [];

    if (params.keyword) {
      const kw = `%${params.keyword}%`;
      conditions.push(ilike(campusSchool.schoolName, kw));
    }

    if (params.category) {
      conditions.push(eq(campusSchool.category, params.category));
    }

    if (params.fairStatus) {
      conditions.push(eq(campusSchool.fairStatus, params.fairStatus));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, items] = await Promise.all([
      this.db.select({ count: count() }).from(campusSchool).where(whereClause),
      this.db
        .select()
        .from(campusSchool)
        .where(whereClause)
        .orderBy(
          sql`CASE ${campusSchool.category}
            WHEN '985' THEN 1
            WHEN '211' THEN 2
            WHEN 'double_first_class' THEN 3
            ELSE 4
          END`,
          sql`${campusSchool.schoolName} COLLATE "zh-Hans-CN-x-icu"`,
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

  async getById(id: string): Promise<CampusSchoolItem> {
    const rows = await this.db
      .select()
      .from(campusSchool)
      .where(eq(campusSchool.id, id))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('学校记录不存在');
    }
    return this.mapToItem(rows[0]);
  }

  async create(dto: CreateCampusSchoolDto, userId: string): Promise<CampusSchoolItem> {
    const [created] = await this.db
      .insert(campusSchool)
      .values({
        schoolName: dto.schoolName,
        category: dto.category,
        websiteUrl: dto.websiteUrl ?? null,
        loginAccount: dto.loginAccount ?? null,
        loginPassword: dto.loginPassword ?? null,
        fairStatus: dto.fairStatus,
        fairTime: dto.fairTime ? new Date(dto.fairTime) : null,
        boothFee: dto.boothFee ?? null,
        location: dto.location ?? null,
        remark: dto.remark ?? null,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return this.mapToItem(created);
  }

  async update(id: string, dto: UpdateCampusSchoolDto, userId: string): Promise<CampusSchoolItem> {
    const patch: Record<string, unknown> = {};
    if (dto.schoolName !== undefined) patch.schoolName = dto.schoolName;
    if (dto.category !== undefined) patch.category = dto.category;
    if (dto.websiteUrl !== undefined) patch.websiteUrl = dto.websiteUrl ?? null;
    if (dto.loginAccount !== undefined) patch.loginAccount = dto.loginAccount ?? null;
    if (dto.loginPassword !== undefined) patch.loginPassword = dto.loginPassword ?? null;
    if (dto.fairStatus !== undefined) patch.fairStatus = dto.fairStatus;
    if (dto.fairTime !== undefined) {
      patch.fairTime = dto.fairTime ? new Date(dto.fairTime) : null;
    }
    if (dto.boothFee !== undefined) patch.boothFee = dto.boothFee ?? null;
    if (dto.location !== undefined) patch.location = dto.location ?? null;
    if (dto.remark !== undefined) patch.remark = dto.remark ?? null;

    patch.updatedBy = userId;

    const [updated] = await this.db
      .update(campusSchool)
      .set(patch)
      .where(eq(campusSchool.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException('学校记录不存在');
    }

    return this.mapToItem(updated);
  }

  async remove(id: string): Promise<void> {
    const rows = await this.db
      .delete(campusSchool)
      .where(eq(campusSchool.id, id))
      .returning({ id: campusSchool.id });
    if (rows.length === 0) {
      throw new NotFoundException('学校记录不存在');
    }
  }

  async getFairCalendar(year: number, month: number): Promise<CampusFairEvent[]> {
    const monthStart = new Date(year, month - 1, 1);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextMonthYear = month === 12 ? year + 1 : year;
    const monthEnd = new Date(nextMonthYear, nextMonth - 1, 1);

    const rows = await this.db
      .select({
        id: campusSchool.id,
        schoolName: campusSchool.schoolName,
        category: campusSchool.category,
        fairTime: campusSchool.fairTime,
        location: campusSchool.location,
        remark: campusSchool.remark,
      })
      .from(campusSchool)
      .where(
        and(
          gte(campusSchool.fairTime, monthStart),
          lt(campusSchool.fairTime, monthEnd),
          eq(campusSchool.fairStatus, 'registered'),
        ),
      )
      .orderBy(asc(campusSchool.fairTime));

    return rows.map((row) => ({
      id: row.id,
      schoolName: row.schoolName,
      category: row.category as SchoolCategory,
      fairTime: row.fairTime.toISOString(),
      location: row.location ?? undefined,
      remark: row.remark ?? undefined,
    }));
  }

  private mapToItem(row: typeof campusSchool.$inferSelect): CampusSchoolItem {
    return {
      id: row.id,
      schoolName: row.schoolName,
      category: row.category as SchoolCategory,
      websiteUrl: row.websiteUrl ?? undefined,
      loginAccount: row.loginAccount ?? undefined,
      loginPassword: row.loginPassword ?? undefined,
      fairStatus: row.fairStatus as FairStatus,
      fairTime: row.fairTime ? row.fairTime.toISOString() : undefined,
      boothFee: row.boothFee ?? undefined,
      location: row.location ?? undefined,
      remark: row.remark ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      createdBy: row.createdBy ?? '',
    };
  }
}
