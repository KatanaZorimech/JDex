import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, count, desc, ilike, arrayContains, or } from 'drizzle-orm';
import { jd, jdVersion, term } from '@server/database/schema';
import type { JdItem, JdVersionItem, JdListResponse, JdTermAnalysis, TermItem } from '@shared/api.interface';
import { CreateJdDto } from './dto/create-jd.dto';
import { UpdateJdDto } from './dto/update-jd.dto';
import { ListJdDto } from './dto/list-jd.dto';

function parseBooleanQuery(value: boolean | string | undefined): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1' || value === 'on';
}

@Injectable()
export class JdService {
  private readonly logger = new Logger(JdService.name);

  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async list(params: ListJdDto): Promise<JdListResponse> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = [];

    if (params.keyword) {
      const kw = `%${params.keyword}%`;
      conditions.push(or(ilike(jd.title, kw), ilike(jd.content, kw)));
    }

    if (params.category) {
      conditions.push(eq(jd.category, params.category));
    }

    if (params.projectGroup) {
      conditions.push(eq(jd.projectGroup, params.projectGroup));
    }

    if (params.status) {
      conditions.push(eq(jd.status, params.status));
    }

    if (params.tag) {
      conditions.push(arrayContains(jd.tags, [params.tag]));
    }

    if (params.techStack) {
      conditions.push(arrayContains(jd.techStack, [params.techStack]));
    }

    if (params.isTemplate !== undefined) {
      conditions.push(eq(jd.isTemplate, parseBooleanQuery(params.isTemplate)));
    }

    if (params.isArchived !== undefined) {
      conditions.push(eq(jd.isArchived, parseBooleanQuery(params.isArchived)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, items] = await Promise.all([
      this.db.select({ count: count() }).from(jd).where(whereClause),
      this.db
        .select()
        .from(jd)
        .where(whereClause)
        .orderBy(desc(jd.updatedAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      items: items.map((item) => this.mapToJdItem(item)),
      total,
      page,
      pageSize,
    };
  }

  async getById(id: string): Promise<JdItem> {
    const rows = await this.db.select().from(jd).where(eq(jd.id, id)).limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('JD不存在');
    }
    return this.mapToJdItem(rows[0]);
  }

  async create(dto: CreateJdDto, userId: string): Promise<JdItem> {
    const created = await this.db.transaction(async (tx) => {
      const [newJd] = await tx
        .insert(jd)
        .values({
          title: dto.title,
          department: dto.department,
          category: dto.category,
          projectGroup: dto.projectGroup ?? 'tk',
          content: dto.content,
          status: dto.status ?? 'active',
          tags: dto.tags ?? [],
          techStack: dto.techStack ?? [],
          isTemplate: dto.isTemplate ?? false,
          parentId: dto.parentId ?? null,
          version: 1,
          isArchived: false,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      await tx.insert(jdVersion).values({
        jdId: newJd.id,
        title: newJd.title,
        content: newJd.content,
        version: 1,
        changeNote: dto.changeNote ?? '初始版本',
        createdBy: userId,
      });

      return newJd;
    });

    return this.mapToJdItem(created);
  }

  async batchImport(
    items: CreateJdDto[],
    userId: string,
  ): Promise<{ successCount: number; failedCount: number; errors: { rowIndex: number; error: string }[] }> {
    const errors: { rowIndex: number; error: string }[] = [];
    let successCount = 0;

    for (let i = 0; i < items.length; i += 1) {
      try {
        await this.create(items[i], userId);
        successCount += 1;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '未知错误';
        errors.push({ rowIndex: i, error: message });
      }
    }

    return { successCount, failedCount: errors.length, errors };
  }

  async update(id: string, dto: UpdateJdDto, userId: string): Promise<JdItem> {
    const currentRows = await this.db.select().from(jd).where(eq(jd.id, id)).limit(1);
    if (currentRows.length === 0) {
      throw new NotFoundException('JD不存在');
    }
    const current = currentRows[0];

    const updated = await this.db.transaction(async (tx) => {
      const newVersion = current.version + 1;

      await tx.insert(jdVersion).values({
        jdId: current.id,
        title: current.title,
        content: current.content,
        version: current.version,
        changeNote: dto.changeNote ?? null,
        createdBy: userId,
      });

      const patch: Record<string, unknown> = {};
      if (dto.title !== undefined) patch.title = dto.title;
      if (dto.department !== undefined) patch.department = dto.department;
      if (dto.category !== undefined) patch.category = dto.category;
      if (dto.projectGroup !== undefined) patch.projectGroup = dto.projectGroup;
      if (dto.content !== undefined) patch.content = dto.content;
      if (dto.status !== undefined) patch.status = dto.status;
      if (dto.tags !== undefined) patch.tags = dto.tags;
      if (dto.techStack !== undefined) patch.techStack = dto.techStack;
      if (dto.isArchived !== undefined) patch.isArchived = dto.isArchived;
      patch.version = newVersion;
      patch.updatedBy = userId;

      const [result] = await tx.update(jd).set(patch).where(eq(jd.id, id)).returning();
      return result;
    });

    return this.mapToJdItem(updated);
  }

  async remove(id: string, userId: string): Promise<void> {
    const rows = await this.db
      .update(jd)
      .set({ isArchived: true, updatedBy: userId })
      .where(eq(jd.id, id))
      .returning({ id: jd.id });
    if (rows.length === 0) {
      throw new NotFoundException('JD不存在');
    }
  }

  async restore(id: string, userId: string): Promise<JdItem> {
    const rows = await this.db
      .update(jd)
      .set({ isArchived: false, updatedBy: userId })
      .where(eq(jd.id, id))
      .returning();
    if (rows.length === 0) {
      throw new NotFoundException('JD不存在');
    }
    return this.mapToJdItem(rows[0]);
  }

  async duplicate(id: string, userId: string): Promise<JdItem> {
    const sourceRows = await this.db.select().from(jd).where(eq(jd.id, id)).limit(1);
    if (sourceRows.length === 0) {
      throw new NotFoundException('JD不存在');
    }
    const source = sourceRows[0];

    const duplicated = await this.db.transaction(async (tx) => {
      const [newJd] = await tx
        .insert(jd)
        .values({
          title: `${source.title} 副本`,
          department: source.department,
          category: source.category,
          projectGroup: source.projectGroup,
          content: source.content,
          status: source.status as 'active' | 'draft' | 'archived',
          tags: source.tags,
          techStack: source.techStack,
          isTemplate: source.isTemplate,
          parentId: source.id,
          version: 1,
          isArchived: false,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      await tx.insert(jdVersion).values({
        jdId: newJd.id,
        title: newJd.title,
        content: newJd.content,
        version: 1,
        changeNote: `复制自 JD ${source.title}`,
        createdBy: userId,
      });

      return newJd;
    });

    return this.mapToJdItem(duplicated);
  }

  async getVersionList(jdId: string): Promise<JdVersionItem[]> {
    const jdRows = await this.db.select().from(jd).where(eq(jd.id, jdId)).limit(1);
    if (jdRows.length === 0) {
      throw new NotFoundException('JD不存在');
    }

    const versions = await this.db
      .select()
      .from(jdVersion)
      .where(eq(jdVersion.jdId, jdId))
      .orderBy(desc(jdVersion.version));

    return versions.map((v) => this.mapToJdVersionItem(v));
  }

  async getVersion(jdId: string, versionId: string): Promise<JdVersionItem> {
    const rows = await this.db
      .select()
      .from(jdVersion)
      .where(and(eq(jdVersion.id, versionId), eq(jdVersion.jdId, jdId)))
      .limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('版本不存在');
    }
    return this.mapToJdVersionItem(rows[0]);
  }

  async rollbackToVersion(jdId: string, versionId: string, userId: string): Promise<JdItem> {
    const jdRows = await this.db.select().from(jd).where(eq(jd.id, jdId)).limit(1);
    if (jdRows.length === 0) {
      throw new NotFoundException('JD不存在');
    }
    const current = jdRows[0];

    const versionRows = await this.db
      .select()
      .from(jdVersion)
      .where(and(eq(jdVersion.id, versionId), eq(jdVersion.jdId, jdId)))
      .limit(1);
    if (versionRows.length === 0) {
      throw new NotFoundException('目标版本不存在');
    }
    const targetVersion = versionRows[0];

    const result = await this.db.transaction(async (tx) => {
      const newVersion = current.version + 1;

      await tx.insert(jdVersion).values({
        jdId: current.id,
        title: current.title,
        content: current.content,
        version: current.version,
        changeNote: `回滚前快照，回滚至 v${targetVersion.version}`,
        createdBy: userId,
      });

      const [updated] = await tx
        .update(jd)
        .set({
          title: targetVersion.title,
          content: targetVersion.content,
          version: newVersion,
          updatedBy: userId,
        })
        .where(eq(jd.id, jdId))
        .returning();

      return updated;
    });

    return this.mapToJdItem(result);
  }

  async analyzeTerms(id: string): Promise<JdTermAnalysis> {
    const jdRows = await this.db.select().from(jd).where(eq(jd.id, id)).limit(1);
    if (jdRows.length === 0) {
      throw new NotFoundException('JD不存在');
    }
    const jdItem = jdRows[0];

    const allTerms = await this.db.select().from(term);

    const content = jdItem.content;
    const recognitionResults: Array<{ term: typeof allTerms[0]; startIndex: number; endIndex: number }> = [];
    const termCountMap = new Map<string, number>();

    for (const t of allTerms) {
      const regex = new RegExp(this.escapeRegExp(t.name), 'gi');
      let match: RegExpExecArray | null;
      let found = false;
      while ((match = regex.exec(content)) !== null) {
        recognitionResults.push({
          term: t,
          startIndex: match.index,
          endIndex: match.index + t.name.length,
        });
        found = true;
      }
      if (found) {
        termCountMap.set(t.id, (termCountMap.get(t.id) ?? 0) + this.countOccurrences(content, t.name));
      }
    }

    recognitionResults.sort((a, b) => a.startIndex - b.startIndex);

    const stats = Array.from(termCountMap.entries()).map(([termId, count]) => {
      const t = allTerms.find((item) => item.id === termId)!;
      return {
        termId: t.id,
        termName: t.name,
        category: t.category as TermItem['category'],
        count,
      };
    });
    stats.sort((a, b) => b.count - a.count);

    const unknownTerms: string[] = [];

    return {
      terms: recognitionResults.map((r) => ({
        term: this.mapToTermItem(r.term),
        startIndex: r.startIndex,
        endIndex: r.endIndex,
      })),
      stats,
      unknownTerms,
    };
  }

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private countOccurrences(haystack: string, needle: string): number {
    if (needle.length === 0) return 0;
    const regex = new RegExp(this.escapeRegExp(needle), 'gi');
    const matches = haystack.match(regex);
    return matches ? matches.length : 0;
  }

  private mapToJdItem(row: typeof jd.$inferSelect): JdItem {
    return {
      id: row.id,
      title: row.title,
      department: row.department ?? undefined,
      category: row.category as JdItem['category'],
      projectGroup: row.projectGroup as JdItem['projectGroup'],
      content: row.content,
      status: row.status as JdItem['status'],
      tags: row.tags ?? [],
      techStack: row.techStack ?? [],
      isTemplate: row.isTemplate,
      parentId: row.parentId ?? undefined,
      version: row.version,
      isArchived: row.isArchived,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      createdBy: row.createdBy ?? undefined,
    };
  }

  private mapToJdVersionItem(row: typeof jdVersion.$inferSelect): JdVersionItem {
    return {
      id: row.id,
      jdId: row.jdId,
      title: row.title,
      content: row.content,
      version: row.version,
      changeNote: row.changeNote ?? undefined,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy ?? undefined,
    };
  }

  private mapToTermItem(row: typeof term.$inferSelect): TermItem {
    return {
      id: row.id,
      name: row.name,
      category: row.category as TermItem['category'],
      explanationHr: row.explanationHr,
      explanationTech: row.explanationTech,
      relatedTerms: row.relatedTerms ?? [],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
