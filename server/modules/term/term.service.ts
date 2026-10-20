import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  count,
  eq,
  ilike,
  inArray,
  or,
  sql,
} from 'drizzle-orm';
import type { PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { DRIZZLE_DATABASE } from '@lark-apaas/fullstack-nestjs-core';
import { term } from '@server/database/schema';
import type {
  CreateTermDto,
  TermCategory,
  TermItem,
  TermListParams,
  TermListResponse,
  TermRecognitionResult,
  UpdateTermDto,
} from '@shared/api.interface';

function extractPostgresErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth += 1) {
    const { code, cause } = current as { code?: unknown; cause?: unknown };
    if (typeof code === 'string') return code;
    current = cause;
  }
  return undefined;
}

function mapTerm(row: typeof term.$inferSelect): TermItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category as TermCategory,
    explanationHr: row.explanationHr,
    explanationTech: row.explanationTech,
    relatedTerms: row.relatedTerms ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class TermService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async list(params: TermListParams): Promise<TermListResponse> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const conditions = [];
    if (params.keyword) {
      const pattern = `%${params.keyword}%`;
      conditions.push(or(ilike(term.name, pattern), ilike(term.explanationHr, pattern)));
    }
    if (params.category) {
      conditions.push(eq(term.category, params.category));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult, rows] = await Promise.all([
      this.db.select({ count: count() }).from(term).where(where),
      this.db
        .select()
        .from(term)
        .where(where)
        .orderBy(term.name)
        .limit(pageSize)
        .offset((page - 1) * pageSize),
    ]);

    const total = countResult[0]?.count ?? 0;

    return {
      items: rows.map(mapTerm),
      total,
      page,
      pageSize,
    };
  }

  async findAll(): Promise<Pick<TermItem, 'id' | 'name' | 'category'>[]> {
    const rows = await this.db
      .select({ id: term.id, name: term.name, category: term.category })
      .from(term)
      .orderBy(term.name);
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category as TermCategory,
    }));
  }

  async findById(id: string): Promise<TermItem> {
    const rows = await this.db.select().from(term).where(eq(term.id, id)).limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('术语不存在');
    }
    return mapTerm(rows[0]);
  }

  async create(dto: CreateTermDto): Promise<TermItem> {
    try {
      const rows = await this.db
        .insert(term)
        .values({
          name: dto.name,
          category: dto.category,
          explanationHr: dto.explanationHr,
          explanationTech: dto.explanationTech,
          relatedTerms: dto.relatedTerms ?? [],
        })
        .returning();
      return mapTerm(rows[0]);
    } catch (error) {
      if (extractPostgresErrorCode(error) === '23505') {
        throw new ConflictException('术语名称已存在');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateTermDto): Promise<TermItem> {
    const patch: Partial<typeof term.$inferInsert> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.category !== undefined) patch.category = dto.category;
    if (dto.explanationHr !== undefined) patch.explanationHr = dto.explanationHr;
    if (dto.explanationTech !== undefined) patch.explanationTech = dto.explanationTech;
    if (dto.relatedTerms !== undefined) patch.relatedTerms = dto.relatedTerms;

    if (Object.keys(patch).length === 0) {
      return this.findById(id);
    }

    patch.updatedAt = new Date();

    try {
      const rows = await this.db
        .update(term)
        .set(patch)
        .where(eq(term.id, id))
        .returning();
      if (rows.length === 0) {
        throw new NotFoundException('术语不存在');
      }
      return mapTerm(rows[0]);
    } catch (error) {
      if (extractPostgresErrorCode(error) === '23505') {
        throw new ConflictException('术语名称已存在');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const rows = await this.db
      .delete(term)
      .where(eq(term.id, id))
      .returning({ id: term.id });
    if (rows.length === 0) {
      throw new NotFoundException('术语不存在');
    }
  }

  async batchCreate(items: CreateTermDto[]): Promise<{ inserted: number; total: number }> {
    if (items.length === 0) {
      return { inserted: 0, total: 0 };
    }

    const values = items.map((item) => ({
      name: item.name,
      category: item.category,
      explanationHr: item.explanationHr,
      explanationTech: item.explanationTech,
      relatedTerms: item.relatedTerms ?? [],
    }));

    const result = await this.db
      .insert(term)
      .values(values)
      .onConflictDoNothing({ target: term.name })
      .returning({ id: term.id });

    return { inserted: result.length, total: items.length };
  }

  async batchImport(
    items: CreateTermDto[],
  ): Promise<{ successCount: number; failedCount: number; errors: { rowIndex: number; error: string }[] }> {
    const errors: { rowIndex: number; error: string }[] = [];
    let successCount = 0;

    for (let i = 0; i < items.length; i += 1) {
      try {
        await this.create(items[i]);
        successCount += 1;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '未知错误';
        errors.push({ rowIndex: i, error: message });
      }
    }

    return { successCount, failedCount: errors.length, errors };
  }

  async recognize(text: string): Promise<TermRecognitionResult[]> {
    const allTerms = await this.db
      .select()
      .from(term)
      .orderBy(sql`length(${term.name}) DESC`);

    if (allTerms.length === 0) {
      return [];
    }

    const termMap = new Map<string, typeof term.$inferSelect>();
    for (const t of allTerms) {
      termMap.set(t.name, t);
    }

    const escapedNames = allTerms.map((t) =>
      t.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    );
    const regex = new RegExp(escapedNames.join('|'), 'g');

    const results: TermRecognitionResult[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const matchedName = match[0];
      const matchedTerm = termMap.get(matchedName);
      if (matchedTerm) {
        results.push({
          term: mapTerm(matchedTerm),
          startIndex: match.index,
          endIndex: match.index + matchedName.length,
        });
      }
    }

    return results;
  }

  async getCategoryStats(): Promise<{ category: TermCategory; count: number }[]> {
    const rows = await this.db
      .select({
        category: term.category,
        count: count(),
      })
      .from(term)
      .groupBy(term.category);

    return rows.map((row) => ({
      category: row.category as TermCategory,
      count: row.count,
    }));
  }
}
