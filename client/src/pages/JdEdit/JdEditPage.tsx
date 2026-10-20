import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  FileText,
  Eye,
  X,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { jdApi, templateApi } from '@client/src/api';
import { Markdown } from '@client/src/components/ui/markdown';

const normalizeJdContent = (content: string): string => {
  if (!content) return content;
  return content
    .replace(/^\s*(\d+)[、.．]\s*/gm, (_, num) => `${num}. `)
    .replace(/^\s*([（(]\d+[)）])\s*/gm, (_, marker) => `${marker} `)
    .replace(/^\s*([一二三四五六七八九十]+)[、.．]\s*/gm, (_, cn) => `- ${cn}、`);
};
import {
  JD_CATEGORY_LABELS,
  PROJECT_GROUP_LABELS,
  TEMPLATE_TYPE_LABELS,
  type JdCategory,
  type ProjectGroup,
  type JdItem,
  type JdStatus,
  type JdTemplateItem,
} from '@shared/api.interface';
import { showConfirm } from '@lark-apaas/client-toolkit';

const JdEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew: boolean = !id || id === 'new';

  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState<JdCategory | ''>('');
  const [projectGroup, setProjectGroup] = useState<ProjectGroup>('tk');
  const [status, setStatus] = useState<JdStatus>('draft');
  const [tags, setTags] = useState('');
  const [techStack, setTechStack] = useState('');
  const [content, setContent] = useState('');
  const [changeNote, setChangeNote] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templates, setTemplates] = useState<JdTemplateItem[]>([]);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateFilter, setTemplateFilter] = useState<JdCategory | ''>('');

  // Load existing JD in edit mode
  useEffect(() => {
    if (isNew || !id) return;
    const loadDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const data: JdItem = await jdApi.getJdDetail(id);
        setTitle(data.title || '');
        setDepartment(data.department || '');
        setCategory(data.category || '');
        setProjectGroup(data.projectGroup || 'tk');
        setStatus(data.status || 'draft');
        setTags((data.tags || []).join(', '));
        setTechStack((data.techStack || []).join(', '));
        setContent(data.content || '');
      } catch (err: unknown) {
        logger.error('加载JD失败', err);
        setError('加载失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [id, isNew]);

  const loadTemplates = async () => {
    setTemplateLoading(true);
    try {
      const res = await templateApi.getTemplateList({
        page: 1,
        pageSize: 50,
        category: templateFilter || undefined,
        type: 'jd',
      });
      setTemplates(res.items || []);
    } catch (err: unknown) {
      logger.error('加载模板失败', err);
    } finally {
      setTemplateLoading(false);
    }
  };

  useEffect(() => {
    if (showTemplatePicker) {
      loadTemplates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTemplatePicker, templateFilter]);

  const handleBack = () => {
    if (isNew) {
      navigate('/jd');
    } else {
      navigate(`/jd/${id}`);
    }
  };

  const parseCommaList = (str: string): string[] => {
    return str
      .split(/[,，]/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
  };

  const validate = (): string | null => {
    if (!title.trim()) return '请输入岗位名称';
    if (!category) return '请选择分类';
    if (!content.trim()) return '请输入JD内容';
    return null;
  };

  const handleSave = async (saveStatus: JdStatus) => {
    const validationError: string | null = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        department: department.trim() || undefined,
        category: category as JdCategory,
        projectGroup,
        content,
        status: saveStatus,
        tags: parseCommaList(tags),
        techStack: parseCommaList(techStack),
        changeNote: changeNote.trim() || undefined,
      };
      let result: JdItem;
      if (isNew) {
        result = await jdApi.createJd(payload);
      } else if (id) {
        result = await jdApi.updateJd(id, payload);
      } else {
        return;
      }
      navigate(`/jd/${result.id}`);
    } catch (err: unknown) {
      logger.error('保存失败', err);
      setError('保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = () => {
    handleSave('draft');
  };

  const handlePublish = () => {
    handleSave('active');
  };

  const handleApplyTemplate = async (template: JdTemplateItem) => {
    if (!content.trim() || await showConfirm('应用模板将覆盖当前内容，确定继续吗？')) {
      setContent(template.content);
      if (!title.trim() && template.name) {
        setTitle(template.name.replace(/模板|模版/g, ''));
      }
      if (!category && template.category && !['company', 'welfare'].includes(template.category)) {
        setCategory(template.category as JdCategory);
      }
      setShowTemplatePicker(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
          <span className="text-gray-500">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={18} />
            返回
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isNew ? '新建JD' : '编辑JD'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isNew
                ? '创建一份新的岗位描述'
                : title || '编辑岗位描述'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Eye size={16} />
            {showPreview ? '编辑模式' : '预览'}
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            保存草稿
          </button>
          <button
            onClick={handlePublish}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <FileText size={16} />
            发布
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Title */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                岗位名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTitle(e.target.value)
                }
                placeholder="请输入岗位名称，如：高级前端工程师"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-base"
              />
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                JD内容 <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-2">支持Markdown</span>
              </label>
              <button
                onClick={() => setShowTemplatePicker(true)}
                className="text-sm text-primary hover:text-primary/80 inline-flex items-center gap-1"
              >
                <FileText size={14} />
                从模板创建
              </button>
            </div>
            {showPreview ? (
              <div className="border border-gray-200 rounded-md p-4 min-h-[400px] bg-gray-50">
                {content ? (
                  <Markdown>{normalizeJdContent(content)}</Markdown>
                ) : (
                  <p className="text-gray-400">暂无内容</p>
                )}
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setContent(e.target.value)
                }
                placeholder="请输入JD详细内容，包括岗位职责、任职要求等，支持Markdown格式..."
                rows={18}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y font-mono text-sm"
              />
            )}
          </div>

          {/* Change Note (edit mode) */}
          {!isNew && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                修改说明
                <span className="text-gray-400 font-normal ml-2">选填，记录本次修改内容</span>
              </label>
              <textarea
                value={changeNote}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setChangeNote(e.target.value)
                }
                placeholder="请简要描述本次修改的内容，将作为版本备注保存..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y text-sm"
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">基本信息</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                所属部门
              </label>
              <input
                type="text"
                value={department}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDepartment(e.target.value)
                }
                placeholder="请输入部门名称"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                所属项目组 <span className="text-red-500">*</span>
              </label>
              <select
                value={projectGroup}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setProjectGroup(e.target.value as ProjectGroup)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                {Object.entries(PROJECT_GROUP_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                分类 <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setCategory(e.target.value as JdCategory | '')
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                <option value="">请选择分类</option>
                {Object.entries(JD_CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                状态
              </label>
              <select
                value={status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setStatus(e.target.value as JdStatus)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                <option value="draft">草稿</option>
                <option value="active">已发布</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                标签
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTags(e.target.value)
                }
                placeholder="多个标签用逗号分隔"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {parseCommaList(tags).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {parseCommaList(tags).map((tag: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                技术栈
              </label>
              <input
                type="text"
                value={techStack}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTechStack(e.target.value)
                }
                placeholder="多个技术栈用逗号分隔"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {parseCommaList(techStack).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {parseCommaList(techStack).map((tech: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full border border-blue-100"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Template Picker Modal */}
      {showTemplatePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                选择模板
              </h3>
              <button
                onClick={() => setShowTemplatePicker(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="关闭"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">分类筛选：</span>
                <select
                  value={templateFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setTemplateFilter(e.target.value as JdCategory | '')
                  }
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">全部分类</option>
                  {Object.entries(JD_CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {templateLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  暂无可用模板
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map((tpl: JdTemplateItem) => (
                    <div
                      key={tpl.id}
                      className="p-3 border border-gray-200 rounded-md hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors"
                      onClick={() => handleApplyTemplate(tpl)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {tpl.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {TEMPLATE_TYPE_LABELS[tpl.type] || tpl.type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {tpl.description || tpl.content.slice(0, 100)}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {JD_CATEGORY_LABELS[tpl.category] || tpl.category}
                        </span>
                        <span className="text-xs text-primary">应用模板</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JdEditPage;
