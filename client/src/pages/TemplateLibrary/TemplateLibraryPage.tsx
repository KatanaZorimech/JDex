import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Upload,
  LayoutTemplate,
  Pencil,
  Trash2,
  Play,
  X,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import BatchImportModal from '@client/src/components/batch-import/BatchImportModal';
import { parseTemplateImportFile } from '@client/src/utils/import-parser/importParsers';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { templateApi } from '@client/src/api';
import {
  TEMPLATE_TYPE_LABELS,
  JD_CATEGORY_LABELS,
  type TemplateType,
  type JdCategory,
  type JdTemplateItem,
  type CreateTemplateDto,
  type UpdateTemplateDto,
  type TemplateImportPreviewItem,
} from '@shared/api.interface';

const categoryColors: Record<JdCategory, string> = {
  program: 'bg-blue-100 text-blue-700',
  art: 'bg-pink-100 text-pink-700',
  product: 'bg-purple-100 text-purple-700',
  operations: 'bg-teal-100 text-teal-700',
  middle_platform: 'bg-orange-100 text-orange-700',
  function: 'bg-green-100 text-green-700',
};

const PAGE_SIZE = 12;

const TemplateLibraryPage: React.FC = () => {
  const navigate = useNavigate();

  // 列表数据
  const [items, setItems] = useState<JdTemplateItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  // 筛选
  const [activeTab, setActiveTab] = useState<TemplateType>('jd');
  const [category, setCategory] = useState<JdCategory | ''>('');

  // 弹窗
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JdTemplateItem | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // 表单
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<JdCategory>('program');
  const [formType, setFormType] = useState<TemplateType>('jd');
  const [formDescription, setFormDescription] = useState('');
  const [formContent, setFormContent] = useState('');

  // 删除确认
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 批量导入
  const [importOpen, setImportOpen] = useState(false);

  // 加载列表
  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params: {
        page: number;
        pageSize: number;
        type: TemplateType;
        category?: JdCategory;
      } = {
        page,
        pageSize: PAGE_SIZE,
        type: activeTab,
      };
      if (category) params.category = category;
      const res = await templateApi.getTemplateList(params);
      setItems(res.items);
      setTotal(res.total);
      setHasMore(page * PAGE_SIZE < res.total);
    } catch (err) {
      logger.error('加载模板列表失败', err);
      setItems([]);
      setTotal(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, category]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, category]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleTabChange = (type: TemplateType) => {
    setActiveTab(type);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormCategory('program');
    setFormType(activeTab);
    setFormDescription('');
    setFormContent('');
    setModalOpen(true);
  };

  const openEditModal = (item: JdTemplateItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category as JdCategory);
    setFormType(item.type);
    setFormDescription(item.description || '');
    setFormContent(item.content);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (modalLoading) return;
    setModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      logger.error('模板名称不能为空');
      return;
    }
    setModalLoading(true);
    try {
      if (editingItem) {
        const dto: UpdateTemplateDto = {
          name: formName.trim(),
          category: formCategory,
          type: formType,
          description: formDescription,
          content: formContent,
        };
        await templateApi.updateTemplate(editingItem.id, dto);
      } else {
        const dto: CreateTemplateDto = {
          name: formName.trim(),
          category: formCategory,
          type: formType,
          description: formDescription,
          content: formContent,
        };
        await templateApi.createTemplate(dto);
      }
      setModalOpen(false);
      setEditingItem(null);
      if (!editingItem) {
        setPage(1);
      } else {
        loadList();
      }
    } catch (err) {
      logger.error('保存模板失败', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleUseTemplate = (item: JdTemplateItem) => {
    // 跳转到新建JD页面，带上模板内容
    navigate('/jd/new', {
      state: {
        templateId: item.id,
        templateType: item.type,
        templateContent: item.content,
        templateCategory: item.category,
      },
    });
  };

  const openDeleteConfirm = (id: string) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    if (deleteLoading) return;
    setDeleteConfirmOpen(false);
    setDeletingId(null);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await templateApi.deleteTemplate(deletingId);
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      // 如果当前页删空了，回退一页
      if (items.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        loadList();
      }
    } catch (err) {
      logger.error('删除模板失败', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const truncate = (text: string, maxLen: number) => {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + '...';
  };

  const handleImport = async (items: TemplateImportPreviewItem[]) => {
    const dtos: CreateTemplateDto[] = items
      .filter(
        (item): item is TemplateImportPreviewItem & { type: TemplateType; category: JdCategory } =>
          item.valid && item.type !== '' && item.category !== '',
      )
      .map((item) => ({
        name: item.name,
        type: item.type,
        category: item.category,
        content: item.content,
        description: item.description || '',
      }));
    return templateApi.batchImportTemplates(dtos);
  };

  const renderTemplatePreviewTable = (
    items: TemplateImportPreviewItem[],
    selected: Set<number>,
    onToggle: (idx: number) => void,
    selectAll: boolean,
    onToggleAll: () => void,
  ) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr className="text-left text-gray-600 border-b border-gray-200">
            <th className="px-4 py-3 w-12">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={onToggleAll}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
            </th>
            <th className="px-4 py-3 font-medium">序号</th>
            <th className="px-4 py-3 font-medium">模板名称</th>
            <th className="px-4 py-3 font-medium">类型</th>
            <th className="px-4 py-3 font-medium">适用类别</th>
            <th className="px-4 py-3 font-medium">描述</th>
            <th className="px-4 py-3 font-medium">状态</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr
              key={idx}
              className={`border-b border-gray-100 ${item.valid ? '' : 'bg-red-50'}`}
            >
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.has(idx)}
                  onChange={() => onToggle(idx)}
                  disabled={!item.valid}
                  className="rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-40"
                />
              </td>
              <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
              <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
              <td className="px-4 py-3 text-gray-600">{item.type}</td>
              <td className="px-4 py-3 text-gray-600">{item.category}</td>
              <td className="px-4 py-3 text-gray-500 max-w-xs line-clamp-2">
                {item.description || '-'}
              </td>
              <td className="px-4 py-3">
                {item.valid ? (
                  <span className="text-green-600 text-xs">正常</span>
                ) : (
                  <span className="text-red-600 text-xs" title={item.error}>
                    {item.error}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const tabItems: { key: TemplateType; label: string }[] = (
    Object.entries(TEMPLATE_TYPE_LABELS) as [TemplateType, string][]
  ).map(([key, label]) => ({ key, label }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">模板库</h1>
          <p className="text-sm text-gray-500 mt-1">
            管理各类模板，快速生成标准化JD内容
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Upload size={18} />
            批量导入
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus size={18} />
            新建模板
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Category Tabs */}
        <div className="border-b border-gray-200 px-4">
          <div className="flex items-center gap-1 overflow-x-auto">
            {tabItems.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'text-primary border-primary'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={category}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setCategory(e.target.value as JdCategory | '')
                }
                className="appearance-none pl-3 pr-8 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                <option value="">全部分类</option>
                {(
                  Object.entries(JD_CATEGORY_LABELS) as [JdCategory, string][]
                ).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
            <span className="text-sm text-gray-500">共 {total} 个模板</span>
          </div>
        </div>

        {/* Template Card Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-primary animate-spin" />
            <span className="ml-2 text-gray-500">加载中...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <LayoutTemplate size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                暂无{TEMPLATE_TYPE_LABELS[activeTab]}模板
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                点击"新建模板"开始创建您的第一个模板
              </p>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
              >
                <Plus size={18} />
                新建模板
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              className="p-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              data-ai-section-type="card-list"
            >
              {items.map((item: JdTemplateItem) => (
                <div
                  key={item.id}
                  className="group relative bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-gray-300 transition-all flex flex-col"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-gray-900 truncate flex-1">
                      {item.name}
                    </h4>
                    {item.isSystem && (
                      <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
                        系统
                      </span>
                    )}
                  </div>

                  {/* Category Tag */}
                  <div className="mb-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        categoryColors[item.category]
                      }`}
                    >
                      {JD_CATEGORY_LABELS[item.category]}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-500 mb-4 line-clamp-3 min-h-[60px]">
                    {item.description
                      ? truncate(item.description, 100)
                      : truncate(item.content, 100)}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleUseTemplate(item)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-primary/90 transition-colors"
                    >
                      <Play size={14} />
                      使用模板
                    </button>
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded transition-colors"
                      aria-label={`编辑 ${item.name}`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(item.id)}
                      disabled={item.isSystem}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:bg-transparent"
                      aria-label={`删除 ${item.name}`}
                      title={item.isSystem ? '系统模板不可删除' : '删除'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center pb-4">
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={loading}
                  className="px-4 py-2 text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      加载中...
                    </span>
                  ) : (
                    '加载更多'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeModal}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingItem ? '编辑模板' : '新建模板'}
              </h3>
              <button
                onClick={closeModal}
                disabled={modalLoading}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                aria-label="关闭"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  模板名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormName(e.target.value)
                  }
                  placeholder="请输入模板名称"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    分类
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setFormCategory(e.target.value as JdCategory)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  >
                    {(
                      Object.entries(JD_CATEGORY_LABELS) as [
                        JdCategory,
                        string,
                      ][]
                    ).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    类型
                  </label>
                  <select
                    value={formType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setFormType(e.target.value as TemplateType)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                  >
                    {(
                      Object.entries(TEMPLATE_TYPE_LABELS) as [
                        TemplateType,
                        string,
                      ][]
                    ).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  描述
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormDescription(e.target.value)
                  }
                  placeholder="简要描述模板用途"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  内容
                </label>
                <textarea
                  value={formContent}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormContent(e.target.value)
                  }
                  rows={8}
                  placeholder="请输入模板内容..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200">
              <button
                onClick={closeModal}
                disabled={modalLoading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={modalLoading || !formName.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {modalLoading && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeDeleteConfirm}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                确认删除
              </h3>
              <p className="text-sm text-gray-600">
                确定要删除这个模板吗？此操作不可撤销。
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200">
              <button
                onClick={closeDeleteConfirm}
                disabled={deleteLoading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleteLoading && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      <BatchImportModal<TemplateImportPreviewItem>
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="批量导入模板"
        acceptFormats=".xlsx,.xls,.docx"
        formatDescription="Excel (.xlsx / .xls)、Word (.docx)"
        parseFile={parseTemplateImportFile}
        importItems={handleImport}
        onSuccess={() => {
          setPage(1);
          loadList();
        }}
        renderPreviewTable={renderTemplatePreviewTable}
        getPreviewTitle={(item) => item.name}
      />
    </div>
  );
};

export default TemplateLibraryPage;
