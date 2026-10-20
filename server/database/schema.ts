/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { boolean, date, foreignKey, index, integer, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const campusSchool = pgTable("campus_school", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolName: varchar("school_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 20 }).notNull().default('other'),
  websiteUrl: varchar("website_url", { length: 500 }),
  loginAccount: varchar("login_account", { length: 100 }),
  loginPassword: varchar("login_password", { length: 255 }),
  fairStatus: varchar("fair_status", { length: 20 }).notNull().default('not_registered'),
  fairTime: customTimestamptz("fair_time", { precision: 6 }),
  boothFee: varchar("booth_fee", { length: 100 }),
  location: varchar("location", { length: 255 }),
  remark: text("remark"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_campus_school_category").on(table.category),
  index("idx_campus_school_fair_status").on(table.fairStatus),
  index("idx_campus_school_fair_time").on(table.fairTime),
  index("idx_campus_school_name").on(table.schoolName),
]);

export const offerRecord = pgTable("offer_record", {
  id: uuid("id").primaryKey().defaultRandom(),
  candidateName: varchar("candidate_name", { length: 100 }).notNull(),
  positionTitle: varchar("position_title", { length: 255 }).notNull(),
  projectGroup: varchar("project_group", { length: 50 }).notNull().default('tk'),
  category: varchar("category", { length: 50 }).notNull().default('program'),
  onboardDate: date("onboard_date"),
  recruiter: varchar("recruiter", { length: 100 }),
  status: varchar("status", { length: 20 }).notNull().default('in_progress'),
  rejectReasonCategory: varchar("reject_reason_category", { length: 30 }),
  rejectReasonDetail: text("reject_reason_detail"),
  salaryInfo: varchar("salary_info", { length: 255 }),
  jdId: uuid("jd_id"),
  remark: text("remark"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_offer_project_group").on(table.projectGroup),
  index("idx_offer_category").on(table.category),
  index("idx_offer_status").on(table.status),
  index("idx_offer_onboard_date").on(table.onboardDate),
  index("idx_offer_jd_id").on(table.jdId),
]);

export const recruitmentPosition = pgTable("recruitment_position", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  projectGroup: varchar("project_group", { length: 50 }).notNull().default('tk'),
  category: varchar("category", { length: 50 }).notNull().default('program'),
  jdId: uuid("jd_id"),
  hiringManager: userProfile("hiring_manager"),
  priority: varchar("priority", { length: 20 }).notNull().default('p2'),
  headCount: integer("head_count").notNull().default(1),
  onboardedCount: integer("onboarded_count").notNull().default(0),
  stage: varchar("stage", { length: 30 }).notNull().default('pending'),
  resumeCount: integer("resume_count").notNull().default(0),
  interviewCount: integer("interview_count").notNull().default(0),
  offerCount: integer("offer_count").notNull().default(0),
  expectedStartDate: date("expected_start_date"),
  remark: text("remark"),
  sortOrder: integer("sort_order").notNull().default(0),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_recruitment_project_group").on(table.projectGroup),
  index("idx_recruitment_category").on(table.category),
  index("idx_recruitment_stage").on(table.stage),
  index("idx_recruitment_priority").on(table.priority),
  // Complex index: CREATE INDEX idx_recruitment_hiring_manager ON recruitment_position USING btree (((hiring_manager).user_id)),
  index("idx_recruitment_jd_id").on(table.jdId),
  index("idx_recruitment_sort_order").on(table.sortOrder),
]);

export const jdTemplate = pgTable("jd_template", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  type: varchar("type", { length: 30 }).notNull().default('jd'),
  content: text("content").notNull(),
  description: varchar("description", { length: 500 }),
  isSystem: boolean("is_system").notNull().default(false),
  projectGroup: varchar("project_group", { length: 50 }).notNull().default('tk'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_jd_template_category").on(table.category),
  index("idx_jd_template_type").on(table.type),
  index("idx_jd_template_project_group").on(table.projectGroup),
]);

export const term = pgTable("term", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  category: varchar("category", { length: 50 }).notNull().default('technology'),
  explanationHr: text("explanation_hr").notNull(),
  explanationTech: text("explanation_tech").notNull(),
  relatedTerms: text("related_terms").array().notNull().default([]),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("term_name_key").on(table.name),
  index("idx_term_category").on(table.category),
]);

export const jdVersion = pgTable("jd_version", {
  id: uuid("id").primaryKey().defaultRandom(),
  jdId: uuid("jd_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  version: integer("version").notNull(),
  changeNote: varchar("change_note", { length: 500 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_jd_version_jd_id").on(table.jdId),
  foreignKey({
    columns: [table.jdId],
    foreignColumns: [jd.id],
    name: "jd_version_jd_id_fkey",
  }).onDelete("cascade"),
]);

export const jd = pgTable("jd", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  department: varchar("department", { length: 100 }),
  category: varchar("category", { length: 50 }).notNull().default('program'),
  content: text("content").notNull(),
  status: varchar("status", { length: 20 }).notNull().default('active'),
  tags: text("tags").array().notNull().default([]),
  techStack: text("tech_stack").array().notNull().default([]),
  isTemplate: boolean("is_template").notNull().default(false),
  parentId: uuid("parent_id"),
  version: integer("version").notNull().default(1),
  isArchived: boolean("is_archived").notNull().default(false),
  projectGroup: varchar("project_group", { length: 50 }).notNull().default('tk'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_jd_category").on(table.category),
  index("idx_jd_status").on(table.status),
  index("idx_jd_is_template").on(table.isTemplate),
  index("idx_jd_is_archived").on(table.isArchived),
  index("idx_jd_tech_stack").using("gin", table.techStack),
  index("idx_jd_tags").using("gin", table.tags),
  index("idx_jd_project_group").on(table.projectGroup),
]);

// table aliases
export const campusSchoolTable = campusSchool;
export const jdTable = jd;
export const jdTemplateTable = jdTemplate;
export const jdVersionTable = jdVersion;
export const offerRecordTable = offerRecord;
export const recruitmentPositionTable = recruitmentPosition;
export const termTable = term;
