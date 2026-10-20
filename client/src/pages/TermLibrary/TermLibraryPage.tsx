import BatchImportModal from '@client/src/components/batch-import/BatchImportModal';
import { parseTermImportFile } from '@client/src/utils/import-parser/importParsers';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Upload,
  Pencil,
  Trash2,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { termApi } from '@client/src/api';
import {
  TERM_CATEGORY_LABELS,
  type TermCategory,
  type TermItem,
  type CreateTermDto,
  type UpdateTermDto,
  type TermImportPreviewItem,
} from '@shared/api.interface';
import type { TermCategoryStats } from '@client/src/api/term';

const categoryColors: Record<TermCategory, string> = {
  engine: 'bg-blue-100 text-blue-700',
  programming: 'bg-purple-100 text-purple-700',
  tool: 'bg-green-100 text-green-700',
  art: 'bg-pink-100 text-pink-700',
  software: 'bg-cyan-100 text-cyan-700',
  technology: 'bg-indigo-100 text-indigo-700',
  other: 'bg-gray-100 text-gray-700',
};

const PAGE_SIZE = 10;

const TermLibraryPage: React.FC = () => {
  const navigate = useNavigate();

  // 列表数据
  const [items, setItems] = useState<TermItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // 筛选
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState<TermCategory | ''>('');

  // 统计
  const [stats, setStats] = useState<TermCategoryStats[]>([]);

  // 弹窗
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TermItem | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // 表单
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<TermCategory>('engine');
  const [formExplanationHr, setFormExplanationHr] = useState('');
  const [formExplanationTech, setFormExplanationTech] = useState('');
  const [formRelatedTerms, setFormRelatedTerms] = useState('');

  // 删除确认
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 批量导入
  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  // 加载统计
  const loadStats = useCallback(async () => {
    try {
      const data = await termApi.getTermCategoryStats();
      setStats(data);
    } catch (err) {
      logger.error('加载术语分类统计失败', err);
    }
  }, []);

  // 加载列表
  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params: {
        page: number;
        pageSize: number;
        keyword?: string;
        category?: TermCategory;
      } = {
        page,
        pageSize: PAGE_SIZE,
      };
      if (keyword.trim()) params.keyword = keyword.trim();
      if (category) params.category = category;
      const res = await termApi.getTermList(params);
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      logger.error('加载术语列表失败', err);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, keyword, category]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const totalCount = stats.reduce((sum, s) => sum + s.count, 0);

  const handleSearch = () => {
    setKeyword(searchInput);
    setPage(1);
  };

  const handleCategoryChange = (cat: TermCategory | '') => {
    setCategory(cat);
    setPage(1);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormCategory('engine');
    setFormExplanationHr('');
    setFormExplanationTech('');
    setFormRelatedTerms('');
    setModalOpen(true);
  };

  const openEditModal = (item: TermItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormExplanationHr(item.explanationHr);
    setFormExplanationTech(item.explanationTech);
    setFormRelatedTerms(item.relatedTerms.join(', '));
    setModalOpen(true);
  };

  const closeModal = () => {
    if (modalLoading) return;
    setModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      logger.error('术语名称不能为空');
      return;
    }
    setModalLoading(true);
    try {
      const relatedTermsArr = formRelatedTerms
        ? formRelatedTerms
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      if (editingItem) {
        const dto: UpdateTermDto = {
          name: formName.trim(),
          category: formCategory,
          explanationHr: formExplanationHr,
          explanationTech: formExplanationTech,
          relatedTerms: relatedTermsArr,
        };
        await termApi.updateTerm(editingItem.id, dto);
      } else {
        const dto: CreateTermDto = {
          name: formName.trim(),
          category: formCategory,
          explanationHr: formExplanationHr,
          explanationTech: formExplanationTech,
          relatedTerms: relatedTermsArr,
        };
        await termApi.createTerm(dto);
      }
      setModalOpen(false);
      setEditingItem(null);
      loadList();
      loadStats();
    } catch (err) {
      logger.error('保存术语失败', err);
    } finally {
      setModalLoading(false);
    }
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
      await termApi.deleteTerm(deletingId);
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      // 如果当前页删空了，回退一页
      if (items.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        loadList();
      }
      loadStats();
    } catch (err) {
      logger.error('删除术语失败', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const openImportModal = () => {
    setImportOpen(true);
  };

  const closeImportModal = () => {
    if (importLoading) return;
    setImportOpen(false);
  };

  const handleImport = async (items: TermImportPreviewItem[]) => {
    const dtos: CreateTermDto[] = items
      .filter((item): item is TermImportPreviewItem & { category: TermCategory } =>
        item.valid && item.category !== '',
      )
      .map((item) => ({
        name: item.name,
        category: item.category,
        explanationHr: item.explanationHr,
        explanationTech: item.explanationTech || '',
        relatedTerms: item.relatedTerms || [],
      }));
    return termApi.batchImportTerms(dtos);
  };

  const renderTermPreviewTable = (
    items: TermImportPreviewItem[],
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
            <th className="px-4 py-3 font-medium">术语名称</th>
            <th className="px-4 py-3 font-medium">分类</th>
            <th className="px-4 py-3 font-medium">HR版解释</th>
            <th className="px-4 py-3 font-medium">相关术语</th>
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
              <td className="px-4 py-3 text-gray-600">{item.category}</td>
              <td className="px-4 py-3 text-gray-600 max-w-xs line-clamp-2">
                {item.explanationHr || '-'}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {item.relatedTerms?.length ? item.relatedTerms.join('、') : '-'}
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const truncate = (text: string, maxLen: number) => {
    if (!text) return '-';
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + '...';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">术语库</h1>
          <p className="text-sm text-gray-500 mt-1">
            管理行业术语的HR解释和技术解释
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openImportModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Upload size={18} />
            批量导入
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus size={18} />
            新建术语
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3"
        data-ai-section-type="card-stat"
      >
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
          <div className="text-xs text-gray-500 mt-1">术语总数</div>
        </div>
        {(Object.entries(TERM_CATEGORY_LABELS) as [TermCategory, string][]).map(
          ([key, label]) => {
            const stat = stats.find((s) => s.category === key);
            return (
              <div
                key={key}
                className="bg-white rounded-lg border border-gray-200 p-4"
              >
                <div className="text-2xl font-bold text-gray-900">
                  {stat?.count ?? 0}
                </div>
                <div className="text-xs text-gray-500 mt-1">{label}</div>
              </div>
            );
          },
        )}
      </div>

      {/* Search & Category Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[240px]">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchInput(e.target.value)
                }
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                placeholder="搜索术语名称..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
          <button
            onClick={handleSearch}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            搜索
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-3">
          <button
            onClick={() => handleCategoryChange('')}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              category === ''
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            全部
          </button>
          {(Object.entries(TERM_CATEGORY_LABELS) as [TermCategory, string][]).map(
            ([key, label]) => (
              <button
                key={key}
                onClick={() => handleCategoryChange(key)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  category === key
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Term Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-primary animate-spin" />
            <span className="ml-2 text-gray-500">加载中...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <BookOpen size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              暂无术语数据
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              点击"新建术语"开始添加术语解释
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus size={18} />
              新建术语
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      术语名称
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      分类
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      HR版解释
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item: TermItem) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">
                          {item.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            categoryColors[item.category]
                          }`}
                        >
                          {TERM_CATEGORY_LABELS[item.category]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {truncate(item.explanationHr, 80)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded transition-colors"
                            aria-label={`编辑 ${item.name}`}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => openDeleteConfirm(item.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            aria-label={`删除 ${item.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                共 {total} 条，第 {page}/{totalPages} 页
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="p-1.5 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="上一页"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 7) return true;
                    if (p === 1 || p === totalPages) return true;
                    if (Math.abs(p - page) <= 1) return true;
                    return false;
                  })
                  .map((p, idx, arr) => (
                    <div key={p} className="flex items-center">
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-1 text-gray-400">...</span>
                      )}
                      <button
                        onClick={() => setPage(p)}
                        className={`min-w-[32px] h-8 px-2 rounded-md text-sm transition-colors ${
                          page === p
                            ? 'bg-primary text-white'
                            : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    </div>
                  ))}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="下一页"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
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
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingItem ? '编辑术语' : '新建术语'}
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
                  术语名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormName(e.target.value)
                  }
                  placeholder="请输入术语名称"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  分类
                </label>
                <select
                  value={formCategory}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setFormCategory(e.target.value as TermCategory)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  {(
                    Object.entries(TERM_CATEGORY_LABELS) as [
                      TermCategory,
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
                  HR版解释
                </label>
                <textarea
                  value={formExplanationHr}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormExplanationHr(e.target.value)
                  }
                  rows={3}
                  placeholder="用通俗易懂的语言解释术语，便于HR理解"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  技术版解释
                </label>
                <textarea
                  value={formExplanationTech}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormExplanationTech(e.target.value)
                  }
                  rows={3}
                  placeholder="专业的技术解释"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  相关术语
                </label>
                <input
                  type="text"
                  value={formRelatedTerms}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormRelatedTerms(e.target.value)
                  }
                  placeholder="多个术语用逗号分隔"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                确定要删除这个术语吗？此操作不可撤销。
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

      {/* Batch Import Modal */}
      <BatchImportModal<TermImportPreviewItem>
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="批量导入术语"
        acceptFormats=".xlsx,.xls"
        formatDescription="Excel (.xlsx / .xls)"
        parseFile={parseTermImportFile}
        importItems={handleImport}
        onSuccess={() => {
          loadList();
          loadStats();
        }}
        renderPreviewTable={renderTermPreviewTable}
        getPreviewTitle={(item) => item.name}
      />
    </div>
  );
};

export default TermLibraryPage;
