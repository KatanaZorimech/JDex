import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, FileText, Clock, Tag, Upload, Trash2 } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { showConfirm } from '@lark-apaas/client-toolkit';
import { toast } from 'sonner';
import { jdApi } from '@client/src/api';
import BatchImportModal from '@client/src/components/batch-import/BatchImportModal';
import { parseJdImportFile } from '@client/src/utils/import-parser/importParsers';
import {
  JD_CATEGORY_LABELS,
  PROJECT_GROUP_LABELS,
  type JdCategory,
  type ProjectGroup,
  type JdStatus,
  type JdItem,
  type JdListParams,
  type JdImportPreviewItem,
  type CreateJdDto,
} from '@shared/api.interface';

const CATEGORY_COLORS: Record<JdCategory, string> = {
  program: 'bg-blue-100 text-blue-700 border-blue-200',
  art: 'bg-purple-100 text-purple-700 border-purple-200',
  product: 'bg-green-100 text-green-700 border-green-200',
  operations: 'bg-pink-100 text-pink-700 border-pink-200',
  middle_platform: 'bg-orange-100 text-orange-700 border-orange-200',
  function: 'bg-gray-100 text-gray-700 border-gray-200',
};

const STATUS_LABELS: Record<JdStatus, string> = {
  active: '已发布',
  draft: '草稿',
  archived: '已归档',
};

const STATUS_COLORS: Record<JdStatus, string> = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-yellow-100 text-yellow-700',
  archived: 'bg-gray-100 text-gray-600',
};

const PROJECT_GROUP_FILTERS: { key: ProjectGroup | ''; label: string }[] = [
  { key: '', label: '全部' },
  { key: 'tk', label: PROJECT_GROUP_LABELS.tk },
  { key: 'jwus1', label: PROJECT_GROUP_LABELS.jwus1 },
  { key: 'jwus2', label: PROJECT_GROUP_LABELS.jwus2 },
];

const CATEGORY_FILTERS: { key: JdCategory | ''; label: string }[] = [
  { key: '', label: '全部' },
  { key: 'program', label: '程序' },
  { key: 'art', label: '美术' },
  { key: 'product', label: '产品' },
  { key: 'operations', label: '运营&发行' },
  { key: 'middle_platform', label: '中台' },
  { key: 'function', label: '职能' },
];

const STATUS_FILTERS: { key: JdStatus | ''; label: string }[] = [
  { key: '', label: '全部' },
  { key: 'active', label: '已发布' },
  { key: 'draft', label: '草稿' },
  { key: 'archived', label: '已归档' },
];

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  const d: Date = new Date(dateStr);
  const year: number = d.getFullYear();
  const month: string = String(d.getMonth() + 1).padStart(2, '0');
  const day: string = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const JdListPage: React.FC = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [projectGroup, setProjectGroup] = useState<ProjectGroup | ''>('');
  const [category, setCategory] = useState<JdCategory | ''>('');
  const [status, setStatus] = useState<JdStatus | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [items, setItems] = useState<JdItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchList = async (params: JdListParams) => {
    setLoading(true);
    setError('');
    try {
      const res = await jdApi.getJdList(params);
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (err: unknown) {
      logger.error('获取JD列表失败', err);
      setError('加载失败，请稍后重试');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
     debounceRef.current = setTimeout(() => {
       const params: JdListParams = {
         page: 1,
         pageSize,
         keyword: keyword || undefined,
         projectGroup: projectGroup || undefined,
         category: category || undefined,
         status: status || undefined,
         isArchived: false,
       };
       setPage(1);
       fetchList(params);
     }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, projectGroup, category, status]);

   useEffect(() => {
     const params: JdListParams = {
       page,
       pageSize,
       keyword: keyword || undefined,
       projectGroup: projectGroup || undefined,
       category: category || undefined,
       status: status || undefined,
       isArchived: false,
     };
     fetchList(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleCreate = () => {
    navigate('/jd/new');
  };

  const handleImport = async (items: JdImportPreviewItem[]) => {
    const dtos: CreateJdDto[] = items
      .filter((item): item is JdImportPreviewItem & { category: JdCategory; projectGroup: ProjectGroup } =>
        item.valid && item.category !== '' && item.projectGroup !== '',
      )
      .map((item) => ({
        title: item.title,
        category: item.category,
        projectGroup: item.projectGroup,
        content: item.content,
        tags: item.tags,
        status: 'active',
      }));
    return jdApi.batchImportJd(dtos);
  };

  const renderJdPreviewTable = (
    items: JdImportPreviewItem[],
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
            <th className="px-4 py-3 font-medium">岗位名称</th>
            <th className="px-4 py-3 font-medium">岗位类别</th>
            <th className="px-4 py-3 font-medium">项目组</th>
            <th className="px-4 py-3 font-medium">标签</th>
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
              <td className="px-4 py-3 font-medium text-gray-900">{item.title}</td>
              <td className="px-4 py-3 text-gray-600">{item.category}</td>
              <td className="px-4 py-3 text-gray-600">{item.projectGroup}</td>
              <td className="px-4 py-3 text-gray-500">
                {item.tags?.length ? item.tags.join('、') : '-'}
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

  const handleCardClick = (id: string) => {
    navigate(`/jd/${id}`);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await showConfirm('确定要删除这个岗位JD吗？此操作不可恢复。');
    if (!confirmed) return;
    try {
      await jdApi.deleteJd(id);
      toast.success('删除成功');
       const params: JdListParams = {
         page,
         pageSize,
         keyword: keyword || undefined,
         projectGroup: projectGroup || undefined,
         category: category || undefined,
         status: status || undefined,
         isArchived: false,
       };
      if (items.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchList(params);
      }
    } catch (err: unknown) {
      logger.error('删除JD失败', err);
      const msg: string =
        (err as { response?: { data?: { error?: { message?: string } } } })
          .response?.data?.error?.message || '删除失败，请稍后重试';
      toast.error(msg);
    }
  };

  const totalPages: number = Math.max(1, Math.ceil(total / pageSize));

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages: (number | string)[] = [];
    const maxVisible: number = 5;
    let start: number = Math.max(1, page - Math.floor(maxVisible / 2));
    const end: number = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }
    for (let i: number = start; i <= end; i += 1) {
      pages.push(i);
    }
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return (
      <div className="flex items-center justify-center gap-1 mt-6">
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          上一页
        </button>
        {pages.map((p: number | string, idx: number) =>
          typeof p === 'number' ? (
            <button
              key={idx}
              onClick={() => handlePageChange(p)}
              className={`min-w-[36px] px-2 py-1.5 text-sm rounded-md border transition-colors ${
                p === page
                  ? 'bg-primary text-white border-primary'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          ) : (
            <span key={idx} className="px-2 text-gray-400">
              {p}
            </span>
          ),
        )}
        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          下一页
        </button>
        <span className="ml-3 text-sm text-gray-500">
          共 {total} 条
        </span>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">JD管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理所有岗位描述文档</p>
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
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus size={18} />
            新建JD
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={keyword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setKeyword(e.target.value)
            }
            placeholder="搜索JD标题、部门、标签..."
            className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Project group tabs */}
        <div className="flex flex-wrap gap-2">
          {PROJECT_GROUP_FILTERS.map((item) => (
            <button
              key={item.key}
              onClick={() => setProjectGroup(item.key)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                projectGroup === item.key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2">
          {CATEGORY_FILTERS.map((item) => (
            <button
              key={item.key}
              onClick={() => setCategory(item.key)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                category === item.key
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-500 flex items-center">状态：</span>
          {STATUS_FILTERS.map((item) => (
            <button
              key={item.key}
              onClick={() => setStatus(item.key)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                status === item.key
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading && items.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-500">加载中...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-base text-red-500 mb-4">{error}</p>
            <button
              onClick={() =>
                fetchList({
                  page,
                  pageSize,
                  keyword: keyword || undefined,
                  projectGroup: projectGroup || undefined,
                  category: category || undefined,
                  status: status || undefined,
                })
              }
              className="text-sm text-primary hover:underline"
            >
              重新加载
            </button>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText size={28} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              暂无JD数据
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              点击"新建JD"开始创建您的第一份岗位描述
            </p>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus size={18} />
              新建JD
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((item: JdItem) => (
              <div
                key={item.id}
                onClick={() => handleCardClick(item.id)}
                className="bg-white rounded-lg border border-gray-200 p-5 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-base font-semibold text-gray-900 group-hover:text-primary transition-colors line-clamp-2 flex-1">
                    {item.title}
                  </h3>
                  <span
                    className={`inline-flex shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[item.status]}`}
                  >
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md border ${CATEGORY_COLORS[item.category]}`}
                  >
                    {JD_CATEGORY_LABELS[item.category]}
                  </span>
                  <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-md bg-gray-100 text-gray-600 border border-gray-200">
                    {PROJECT_GROUP_LABELS[item.projectGroup as ProjectGroup] || item.projectGroup}
                  </span>
                  {item.department && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Tag size={12} />
                      {item.department}
                    </span>
                  )}
                </div>

                {item.techStack && item.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.techStack.slice(0, 3).map((tech: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                      >
                        {tech}
                      </span>
                    ))}
                    {item.techStack.length > 3 && (
                      <span className="px-2 py-0.5 text-xs text-gray-400">
                        +{item.techStack.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
                  <span className="flex items-center">
                    <Clock size={12} className="mr-1" />
                    更新于 {formatDate(item.updatedAt)}
                  </span>
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 -m-1"
                    aria-label="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {renderPagination()}
        </>
      )}

      <BatchImportModal<JdImportPreviewItem>
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="批量导入JD"
        acceptFormats=".xlsx,.xls,.docx"
        formatDescription="Excel (.xlsx / .xls)、Word (.docx)"
        parseFile={parseJdImportFile}
        importItems={handleImport}
        onSuccess={() => {
         const params: JdListParams = {
           page: 1,
           pageSize,
           keyword: keyword || undefined,
           projectGroup: projectGroup || undefined,
           category: category || undefined,
           status: status || undefined,
           isArchived: false,
         };
         setPage(1);
         fetchList(params);
       }}
        renderPreviewTable={renderJdPreviewTable}
        getPreviewTitle={(item) => item.title}
      />
    </div>
  );
};

export default JdListPage;
