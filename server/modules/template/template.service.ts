import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, count, desc, ilike, or, isNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { jdTemplate, jd } from '@server/database/schema';
import type {
  JdTemplateItem,
  TemplateListResponse,
  TemplateListParams,
  CreateTemplateDto,
  UpdateTemplateDto,
} from '@shared/api.interface';

@Injectable()
export class TemplateService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  private toTemplateItem(row: typeof jdTemplate.$inferSelect): JdTemplateItem {
    return {
      id: row.id,
      name: row.name,
      category: row.category as JdTemplateItem['category'],
      projectGroup: row.projectGroup as JdTemplateItem['projectGroup'],
      type: row.type as JdTemplateItem['type'],
      content: row.content,
      description: row.description ?? undefined,
      isSystem: row.isSystem,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async list(params: TemplateListParams): Promise<TemplateListResponse> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (params.category) conditions.push(eq(jdTemplate.category, params.category));
    if (params.type) conditions.push(eq(jdTemplate.type, params.type));
    if (params.isSystem !== undefined) conditions.push(eq(jdTemplate.isSystem, params.isSystem));

    if (params.keyword) {
      const keyword = `%${params.keyword}%`;
      const descCol = sql`COALESCE(${jdTemplate.description}, '')`;
      conditions.push(
        or(
          ilike(jdTemplate.name, keyword),
          ilike(descCol, keyword),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, rows] = await Promise.all([
      this.db.select({ count: count() }).from(jdTemplate).where(whereClause),
      this.db
        .select()
        .from(jdTemplate)
        .where(whereClause)
        .orderBy(desc(jdTemplate.createdAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    const items: JdTemplateItem[] = rows.map((row: typeof jdTemplate.$inferSelect) =>
      this.toTemplateItem(row),
    );

    return {
      items,
      total: Number(totalResult[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async getById(id: string): Promise<JdTemplateItem> {
    const rows = await this.db.select().from(jdTemplate).where(eq(jdTemplate.id, id)).limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('模板不存在');
    }
    return this.toTemplateItem(rows[0]);
  }

  async create(dto: CreateTemplateDto): Promise<JdTemplateItem> {
    const rows = await this.db
      .insert(jdTemplate)
      .values({
        name: dto.name,
        category: dto.category,
        type: dto.type,
        content: dto.content,
        description: dto.description,
        isSystem: false,
      })
      .returning();
    return this.toTemplateItem(rows[0]);
  }

  async batchImport(
    items: CreateTemplateDto[],
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

  async update(id: string, dto: UpdateTemplateDto): Promise<JdTemplateItem> {
    const patch: Partial<typeof jdTemplate.$inferInsert> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.category !== undefined) patch.category = dto.category;
    if (dto.type !== undefined) patch.type = dto.type;
    if (dto.content !== undefined) patch.content = dto.content;
    if (dto.description !== undefined) patch.description = dto.description;

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    const rows = await this.db
      .update(jdTemplate)
      .set(patch)
      .where(eq(jdTemplate.id, id))
      .returning();
    if (rows.length === 0) {
      throw new NotFoundException('模板不存在');
    }
    return this.toTemplateItem(rows[0]);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.db
      .select({ isSystem: jdTemplate.isSystem })
      .from(jdTemplate)
      .where(eq(jdTemplate.id, id))
      .limit(1);
    if (existing.length === 0) {
      throw new NotFoundException('模板不存在');
    }
    if (existing[0].isSystem) {
      throw new ForbiddenException('系统模板禁止删除');
    }
    await this.db.delete(jdTemplate).where(eq(jdTemplate.id, id));
  }

  async applyTemplate(templateId: string): Promise<{ id: string }> {
    const templateRows = await this.db
      .select()
      .from(jdTemplate)
      .where(eq(jdTemplate.id, templateId))
      .limit(1);
    if (templateRows.length === 0) {
      throw new NotFoundException('模板不存在');
    }
    const template = templateRows[0];

    const rows = await this.db
      .insert(jd)
      .values({
        title: template.name,
        category: template.category,
        content: template.content,
        status: 'draft',
        tags: [],
        techStack: [],
        isTemplate: false,
        version: 1,
        isArchived: false,
      })
      .returning({ id: jd.id });

    return { id: rows[0].id };
  }
}
