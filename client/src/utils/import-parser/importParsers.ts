import { parseExcelFile, parseDocxFile, getCell } from './importParser';
import type {
  JdCategory,
  ProjectGroup,
  JdImportPreviewItem,
  TermCategory,
  TermImportPreviewItem,
  TemplateType,
  TemplateImportPreviewItem,
  OfferImportPreviewItem,
} from '@shared/api.interface';

const JD_CATEGORY_MAP: Record<string, JdCategory> = {
  程序: 'program',
  开发: 'program',
  技术: 'program',
  美术: 'art',
  设计: 'art',
  产品: 'product',
  运营: 'operations',
  '运营&发行': 'operations',
  发行: 'operations',
  中台: 'middle_platform',
  职能: 'function',
  行政: 'function',
  人力: 'function',
  hr: 'function',
};

const PROJECT_GROUP_MAP: Record<string, ProjectGroup> = {
  tk: 'tk',
  TK: 'tk',
  'TK项目组': 'tk',
  tk项目组: 'tk',
  极无双1: 'jwus1',
  jwus1: 'jwus1',
  JWUS1: 'jwus1',
  '极无双1项目组': 'jwus1',
  极无双2: 'jwus2',
  jwus2: 'jwus2',
  JWUS2: 'jwus2',
  '极无双2项目组': 'jwus2',
};

const TERM_CATEGORY_MAP: Record<string, TermCategory> = {
  引擎: 'engine',
  游戏引擎: 'engine',
  编程语言: 'programming',
  语言: 'programming',
  开发工具: 'tool',
  工具软件: 'tool',
  工具: 'tool',
  美术: 'art',
  美术软件: 'software',
  软件工具: 'software',
  技术概念: 'technology',
  框架库: 'technology',
  其他: 'other',
};

const TEMPLATE_TYPE_MAP: Record<string, TemplateType> = {
  jd: 'jd',
  JD: 'jd',
  'JD模板': 'jd',
  完整JD: 'jd',
  公司介绍: 'company_intro',
  公司简介: 'company_intro',
  福利待遇: 'benefits',
  福利: 'benefits',
  岗位职责: 'responsibility',
  职责: 'responsibility',
  任职要求: 'requirement',
  岗位要求: 'requirement',
  要求: 'requirement',
};

function normalizeContentLines(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

export function parseJdExcelRows(rows: { [key: string]: string }[]): JdImportPreviewItem[] {
  return rows.map((row, idx) => {
    const title = getCell(row, '岗位名称', '职位名称', '岗位', '职位', '标题', '名称');
    const categoryLabel = getCell(row, '岗位类别', '职位类别', '类别', '分类', '岗位分类');
    const projectLabel = getCell(row, '所属项目组', '项目组', '所属项目', '项目');
    const responsibilities = getCell(row, '岗位职责', '职责', '工作职责', '岗位描述');
    const requirements = getCell(row, '岗位要求', '任职要求', '要求', '资格要求');
    const tagsRaw = getCell(row, '标签', 'tags', 'Tag');
    const department = getCell(row, '所属部门', '部门');

    const category = (JD_CATEGORY_MAP[categoryLabel] || '') as JdCategory | '';
    const projectGroup = (PROJECT_GROUP_MAP[projectLabel] || '') as ProjectGroup | '';
    const tags = tagsRaw
      ? tagsRaw
          .split(/[,，、；;]/)
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
      : [];

    let content = '';
    if (responsibilities) {
      content += `## 岗位职责\n\n${normalizeContentLines(responsibilities)}\n\n`;
    }
    if (requirements) {
      content += `## 岗位要求\n\n${normalizeContentLines(requirements)}`;
    }

    const errors: string[] = [];
    if (!title) errors.push('岗位名称不能为空');
    if (!category) errors.push(`岗位类别无效：${categoryLabel || '空'}`);
    if (!projectGroup) errors.push(`项目组无效：${projectLabel || '空'}`);
    if (!content) errors.push('岗位职责和岗位要求不能都为空');

    return {
      rowIndex: idx,
      title: title || '',
      category,
      projectGroup,
      content,
      tags,
      valid: errors.length === 0,
      error: errors.length > 0 ? errors.join('；') : undefined,
    };
  });
}

export function parseJdDocxText(text: string): JdImportPreviewItem[] {
  const items: JdImportPreviewItem[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  let currentTitle = '';
  let currentResponsibilities: string[] = [];
  let currentRequirements: string[] = [];
  let section: 'none' | 'responsibility' | 'requirement' = 'none';

  const flush = (idx: number) => {
    if (currentTitle) {
      const content = `## 岗位职责\n\n${currentResponsibilities.join('\n') || '（待补充）'}\n\n## 岗位要求\n\n${currentRequirements.join('\n') || '（待补充）'}`;
      const valid = currentTitle.length > 0 && (currentResponsibilities.length > 0 || currentRequirements.length > 0);
      items.push({
        rowIndex: idx,
        title: currentTitle,
        category: 'program',
        projectGroup: 'tk',
        content,
        tags: [],
        valid,
        error: valid ? undefined : '标题或内容为空，请检查格式',
      });
    }
  };

  let idx = 0;
  for (const line of lines) {
    const isJobTitle = /^[\u4e00-\u9fa5A-Za-z0-9]{2,30}(岗位|工程师|设计师|专员|经理|主管|总监|开发|产品|运营|美术|程序)$/.test(line)
      || /^.{2,20}JD$/.test(line)
      || (line.length < 30 && /^(客户端|服务端|前端|后端|策划|运营|美术|程序|产品|HR|人力)/.test(line));

    const isRespHeader = /^(岗位职责|工作职责|主要职责|工作内容|岗位描述|职位描述|【岗位职责】|【工作职责】)/.test(line);
    const isReqHeader = /^(岗位要求|任职要求|资格要求|职位要求|招聘要求|【岗位要求】|【任职要求】)/.test(line);

    if (isJobTitle && !isRespHeader && !isReqHeader) {
      flush(idx);
      idx += 1;
      currentTitle = line;
      currentResponsibilities = [];
      currentRequirements = [];
      section = 'none';
    } else if (isRespHeader) {
      section = 'responsibility';
    } else if (isReqHeader) {
      section = 'requirement';
    } else if (currentTitle && section === 'responsibility') {
      currentResponsibilities.push(line);
    } else if (currentTitle && section === 'requirement') {
      currentRequirements.push(line);
    }
  }
  flush(idx);

  return items;
}

export async function parseJdImportFile(file: File): Promise<JdImportPreviewItem[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const rows = await parseExcelFile(file);
    return parseJdExcelRows(rows);
  }
  if (name.endsWith('.docx')) {
    const text = await parseDocxFile(file);
    return parseJdDocxText(text);
  }
  throw new Error('不支持的文件格式，请上传 .xlsx / .xls / .docx 文件');
}

export function parseTermExcelRows(rows: { [key: string]: string }[]): TermImportPreviewItem[] {
  return rows.map((row, idx) => {
    const name = getCell(row, '术语名称', '术语', '名称', 'name');
    const categoryLabel = getCell(row, '术语分类', '分类', '类别', 'category');
    const explanationHr = getCell(row, 'HR版解释', 'HR解释', '通俗解释', 'hr版', 'HR版');
    const explanationTech = getCell(row, '技术版解释', '专业解释', '技术解释', '技术版');
    const relatedRaw = getCell(row, '相关术语', '关联词', '相关词', '相关');

    const category = (TERM_CATEGORY_MAP[categoryLabel] || '') as TermCategory | '';
    const relatedTerms = relatedRaw
      ? relatedRaw
          .split(/[,，、；;]/)
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
      : [];

    const errors: string[] = [];
    if (!name) errors.push('术语名称不能为空');
    if (!category) errors.push(`分类无效：${categoryLabel || '空'}`);
    if (!explanationHr) errors.push('HR版解释不能为空');

    return {
      rowIndex: idx,
      name: name || '',
      category,
      explanationHr: explanationHr || '',
      explanationTech: explanationTech || '',
      relatedTerms,
      valid: errors.length === 0,
      error: errors.length > 0 ? errors.join('；') : undefined,
    };
  });
}

export async function parseTermImportFile(file: File): Promise<TermImportPreviewItem[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const rows = await parseExcelFile(file);
    return parseTermExcelRows(rows);
  }
  throw new Error('术语库仅支持 Excel (.xlsx / .xls) 格式');
}

export function parseTemplateExcelRows(rows: { [key: string]: string }[]): TemplateImportPreviewItem[] {
  return rows.map((row, idx) => {
    const name = getCell(row, '模板名称', '名称', 'name');
    const typeLabel = getCell(row, '模板类型', '类型', 'type');
    const categoryLabel = getCell(row, '适用岗位类别', '适用类别', '岗位类别', '类别', '分类', 'category');
    const content = getCell(row, '模板内容', '内容', 'content');
    const description = getCell(row, '描述', '说明', '备注', 'description');

    const type = (TEMPLATE_TYPE_MAP[typeLabel] || '') as TemplateType | '';
    const category = (JD_CATEGORY_MAP[categoryLabel] || '') as JdCategory | '';

    const errors: string[] = [];
    if (!name) errors.push('模板名称不能为空');
    if (!type) errors.push(`模板类型无效：${typeLabel || '空'}`);
    if (!category) errors.push(`岗位类别无效：${categoryLabel || '空'}`);
    if (!content) errors.push('模板内容不能为空');

    return {
      rowIndex: idx,
      name: name || '',
      type,
      category,
      content: content || '',
      description: description || '',
      valid: errors.length === 0,
      error: errors.length > 0 ? errors.join('；') : undefined,
    };
  });
}

export function parseTemplateDocxText(text: string): TemplateImportPreviewItem[] {
  const items: TemplateImportPreviewItem[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  let currentName = '';
  let currentContent: string[] = [];
  let currentType: TemplateType | '' = 'jd';

  const detectType = (title: string): TemplateType => {
    if (/公司介绍|公司简介|企业介绍/.test(title)) return 'company_intro';
    if (/福利|待遇|薪酬|薪资/.test(title)) return 'benefits';
    if (/岗位职责|工作职责|职责/.test(title)) return 'responsibility';
    if (/任职要求|岗位要求|要求|资格/.test(title)) return 'requirement';
    return 'jd';
  };

  const flush = (idx: number) => {
    if (currentName) {
      const content = currentContent.join('\n');
      items.push({
        rowIndex: idx,
        name: currentName,
        type: currentType,
        category: 'program',
        content,
        description: '',
        valid: content.length > 0,
        error: content.length > 0 ? undefined : '模板内容为空',
      });
    }
  };

  let idx = 0;
  for (const line of lines) {
    const isTitle = line.length < 50 && /(模板|介绍|福利|职责|要求|JD|岗位|通用)$/.test(line);
    if (isTitle && /^(第[一二三四五六七八九十]+[节章篇]|[\d]+[.、])?\s*/.test(line)) {
      flush(idx);
      idx += 1;
      currentName = line.replace(/^第[一二三四五六七八九十]+[节章篇]\s*/, '').replace(/^[\d]+[.、]\s*/, '');
      currentType = detectType(currentName);
      currentContent = [];
    } else if (currentName) {
      currentContent.push(line);
    }
  }
  flush(idx);

  if (items.length === 0 && text.trim().length > 0) {
    items.push({
      rowIndex: 0,
      name: '导入的模板',
      type: 'jd',
      category: 'program',
      content: text.trim(),
      description: '',
      valid: true,
    });
  }

  return items;
}

export async function parseTemplateImportFile(file: File): Promise<TemplateImportPreviewItem[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const rows = await parseExcelFile(file);
    return parseTemplateExcelRows(rows);
  }
  if (name.endsWith('.docx')) {
    const text = await parseDocxFile(file);
    return parseTemplateDocxText(text);
  }
  throw new Error('不支持的文件格式，请上传 .xlsx / .xls / .docx 文件');
}

export function parseOfferExcelRows(rows: { [key: string]: string }[]): OfferImportPreviewItem[] {
  return rows.map((row, idx) => {
    const candidateName = getCell(row, '姓名', '候选人姓名', '候选人', 'candidateName', 'name');
    const positionTitle = getCell(row, '职位', '岗位', '职位名称', '岗位名称', 'positionTitle', 'title');
    const onboardDate = getCell(row, '入职时间', '入职日期', 'onboardDate', 'date');
    const recruiter = getCell(row, '招聘负责人', '招聘', '负责人', 'recruiter', 'hr');
    const rejectReason = getCell(row, '拒接原因', '拒绝原因', '拒接', 'rejectReason', 'reason');

    const errors: string[] = [];
    if (!candidateName) errors.push('姓名不能为空');
    if (!positionTitle) errors.push('职位不能为空');

    return {
      rowIndex: idx,
      candidateName: candidateName || '',
      positionTitle: positionTitle || '',
      onboardDate: onboardDate || '',
      recruiter: recruiter || '',
      rejectReason: rejectReason || '',
      valid: errors.length === 0,
      error: errors.length > 0 ? errors.join('；') : undefined,
    };
  });
}

export async function parseOfferImportFile(file: File): Promise<OfferImportPreviewItem[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const rows = await parseExcelFile(file);
    return parseOfferExcelRows(rows);
  }
  throw new Error('Offer导入仅支持 Excel (.xlsx / .xls) 格式');
}
