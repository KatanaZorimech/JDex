import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Briefcase,
  Users,
  UserCheck,
  Target,
  LayoutGrid,
  List,
  FileText,
  Trash2,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { recruitmentApi } from '@client/src/api';
import {
  PROJECT_GROUP_LABELS,
  JD_CATEGORY_LABELS,
  RECRUITMENT_STAGE_LABELS,
  PRIORITY_LABELS,
  type ProjectGroup,
  type JdCategory,
  type PriorityLevel,
  type RecruitmentStage,
  type RecruitmentPositionItem,
  type RecruitmentStats,
  type RecruitmentListParams,
} from '@shared/api.interface';
import { showConfirm } from '@lark-apaas/client-toolkit';
import { toast } from 'sonner';

const STAGES: RecruitmentStage[] = [
  'pending',
  'resume',
  'interview',
  'offer',
  'onboarded',
  'closed',
];

type BoardColumnKey = 'pending' | 'active' | 'closed';

interface BoardColumnConfig {
  key: BoardColumnKey;
  label: string;
  stages: RecruitmentStage[];
  color: string;
}

const BOARD_COLUMNS: BoardColumnConfig[] = [
  { key: 'pending', label: '待启动', stages: ['pending'], color: 'gray' },
  {
    key: 'active',
    label: '正在招聘',
    stages: ['resume', 'interview', 'offer', 'onboarded'],
    color: 'blue',
  },
  { key: 'closed', label: '已关闭', stages: ['closed'], color: 'green' },
];

const PRIORITY_ORDER: Record<PriorityLevel, number> = {
  p0: 0,
  p1: 1,
  p2: 2,
  p3: 3,
};

const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  p0: 'bg-red-100 text-red-700 border-red-200',
  p1: 'bg-orange-100 text-orange-700 border-orange-200',
  p2: 'bg-blue-100 text-blue-700 border-blue-200',
  p3: 'bg-gray-100 text-gray-600 border-gray-200',
};

const COLUMN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  gray: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-300',
  },
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-300',
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-300',
  },
};

const PROJECT_GROUP_FILTERS: { key: ProjectGroup | ''; label: string }[] = [
  { key: '', label: '全部' },
  { key: 'tk', label: 'TK项目组' },
  { key: 'jwus1', label: '极无双1项目组' },
  { key: 'jwus2', label: '极无双2项目组' },
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

const PRIORITY_FILTERS: { key: PriorityLevel | ''; label: string }[] = [
  { key: '', label: '全部' },
  { key: 'p0', label: 'P0' },
  { key: 'p1', label: 'P1' },
  { key: 'p2', label: 'P2' },
  { key: 'p3', label: 'P3' },
];

type ViewMode = 'kanban' | 'list';

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconBg: string;
  iconColor: string;
}> = ({ icon, label, value, iconBg, iconColor }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-lg ${iconBg} flex items-center justify-center`}>
      <span className={iconColor}>{icon}</span>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-gray-500 mb-0.5">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

const PositionCard: React.FC<{
  item: RecruitmentPositionItem;
  onClick: (id: string) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
}> = ({
  item,
  onClick,
  onDelete,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  const handleDeleteClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (await showConfirm('确定要删除这个岗位吗？')) {
      onDelete(item.id);
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, item.id)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop?.(e, item.id)}
      onClick={() => onClick(item.id)}
      className={`relative bg-white rounded-md border p-3 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group ${
        isDragging ? 'opacity-40 scale-95' : 'opacity-100'
      } ${
        isDragOver
          ? 'border-primary border-2 border-dashed bg-primary/5'
          : 'border-gray-200'
      }`}
    >
      <button
        onClick={handleDeleteClick}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all z-10"
        aria-label="删除岗位"
      >
        <Trash2 size={12} />
      </button>

      <h4 className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors line-clamp-2 mb-2 pr-6">
        {item.title}
      </h4>

      <div className="flex flex-wrap gap-1.5 mb-2">
        <span className="inline-flex px-2 py-0.5 text-[11px] font-medium rounded bg-gray-100 text-gray-600 border border-gray-200">
          {PROJECT_GROUP_LABELS[item.projectGroup]}
        </span>
        <span className="inline-flex px-2 py-0.5 text-[11px] font-medium rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
          {JD_CATEGORY_LABELS[item.category]}
        </span>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span
          className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded border ${PRIORITY_COLORS[item.priority]}`}
        >
          {PRIORITY_LABELS[item.priority]}
        </span>
      </div>

      <div className="text-xs text-gray-500 mb-2">
        简历{item.resumeCount} / 面试{item.interviewCount} / offer{item.offerCount}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
        <span className="text-gray-500">
          招{item.headCount}人 / 已入职{item.onboardedCount}人
        </span>
      </div>
    </div>
  );
};

const RecruitmentBoardPage: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [keyword, setKeyword] = useState('');
  const [projectGroup, setProjectGroup] = useState<ProjectGroup | ''>('');
  const [category, setCategory] = useState<JdCategory | ''>('');
  const [priority, setPriority] = useState<PriorityLevel | ''>('');
  const [items, setItems] = useState<RecruitmentPositionItem[]>([]);
  const [stats, setStats] = useState<RecruitmentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<BoardColumnKey | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchList = async (params: RecruitmentListParams) => {
    setLoading(true);
    setError('');
    try {
      const res = await recruitmentApi.getRecruitmentList(params);
      setItems(res.items || []);
    } catch (err: unknown) {
      logger.error('获取招聘列表失败', err);
      setError('加载失败，请稍后重试');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await recruitmentApi.getRecruitmentStats();
      setStats(res);
    } catch (err: unknown) {
      logger.error('获取招聘统计失败', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const refreshData = () => {
    const params: RecruitmentListParams = {
      page: 1,
      pageSize: 100,
      keyword: keyword || undefined,
      projectGroup: projectGroup || undefined,
      category: category || undefined,
      priority: priority || undefined,
    };
    fetchList(params);
    fetchStats();
  };

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      const params: RecruitmentListParams = {
        page: 1,
        pageSize: 100,
        keyword: keyword || undefined,
        projectGroup: projectGroup || undefined,
        category: category || undefined,
        priority: priority || undefined,
      };
      fetchList(params);
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, projectGroup, category, priority]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleCreate = () => {
    navigate('/recruitment/new');
  };

  const handleCreateInColumn = async (column: BoardColumnConfig) => {
    try {
      const defaultStage = column.stages[0];
      const defaultProjectGroup: ProjectGroup =
        (projectGroup as ProjectGroup) || 'tk';
      const res = await recruitmentApi.createRecruitment({
        title: '新岗位',
        projectGroup: defaultProjectGroup,
        category: 'program',
        priority: 'p2',
        stage: defaultStage,
        sortOrder: 0,
        headCount: 1,
      });
      fetchStats();
      navigate(`/recruitment/${res.id}`);
    } catch (err: unknown) {
      logger.error('创建岗位失败', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await recruitmentApi.deleteRecruitment(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
      toast.success('删除成功');
      fetchStats();
    } catch (err: unknown) {
      logger.error('删除岗位失败', err);
      const msg: string =
        (err as { response?: { data?: { error?: { message?: string } } } })
          .response?.data?.error?.message || '删除失败，请稍后重试';
      toast.error(msg);
    }
  };

  const handleCardClick = (id: string) => {
    navigate(`/recruitment/${id}`);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverColumn(null);
    setDragOverItemId(null);
  };

  const handleColumnDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    columnKey: BoardColumnKey,
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnKey) {
      setDragOverColumn(columnKey);
    }
  };

  const handleColumnDragLeave = () => {
    setDragOverColumn(null);
    setDragOverItemId(null);
  };

  const handleColumnDrop = async (
    e: React.DragEvent<HTMLDivElement>,
    column: BoardColumnConfig,
  ) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    setDraggingId(null);
    setDragOverColumn(null);
    setDragOverItemId(null);

    if (!id) return;

    const targetStage = column.stages[0];
    const item = items.find((it) => it.id === id);
    if (!item) return;

    if (!column.stages.includes(item.stage)) {
      try {
        const colItems = boardColumns[column.key] || [];
        const maxSort = colItems.length > 0 ? Math.max(...colItems.map((it) => it.sortOrder)) : 0;
        await recruitmentApi.updateRecruitment(id, {
          stage: targetStage,
          sortOrder: maxSort + 1,
        });
        refreshData();
      } catch (err: unknown) {
        logger.error('更新岗位阶段失败', err);
      }
    }
  };

  const handleCardDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    targetId: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverItemId !== targetId) {
      setDragOverItemId(targetId);
    }
  };

  const handleCardDrop = async (
    e: React.DragEvent<HTMLDivElement>,
    targetId: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer.getData('text/plain');
    setDraggingId(null);
    setDragOverColumn(null);
    setDragOverItemId(null);

    if (!sourceId || sourceId === targetId) return;

    const sourceItem = items.find((it) => it.id === sourceId);
    const targetItem = items.find((it) => it.id === targetId);
    if (!sourceItem || !targetItem) return;

    const sourceColumn = BOARD_COLUMNS.find((c) =>
      c.stages.includes(sourceItem.stage),
    );
    const targetColumn = BOARD_COLUMNS.find((c) =>
      c.stages.includes(targetItem.stage),
    );

    if (!sourceColumn || !targetColumn) return;

    try {
      if (sourceColumn.key !== targetColumn.key) {
        const newStage = targetColumn.stages[0];
        await recruitmentApi.updateRecruitment(sourceId, {
          stage: newStage,
          sortOrder: targetItem.sortOrder,
        });
      } else {
        await recruitmentApi.updateRecruitment(sourceId, {
          sortOrder: targetItem.sortOrder,
        });
      }
      refreshData();
    } catch (err: unknown) {
      logger.error('拖拽排序失败', err);
    }
  };

  const boardColumns = useMemo(() => {
    const result: Record<BoardColumnKey, RecruitmentPositionItem[]> = {
      pending: [],
      active: [],
      closed: [],
    };

    for (const item of items) {
      for (const col of BOARD_COLUMNS) {
        if (col.stages.includes(item.stage)) {
          result[col.key].push(item);
          break;
        }
      }
    }

    for (const key of Object.keys(result) as BoardColumnKey[]) {
      result[key].sort((a, b) => {
        const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.sortOrder - b.sortOrder;
      });
    }

    return result;
  }, [items]);

  const renderStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        icon={<Briefcase size={22} />}
        label="在招岗位数"
        value={statsLoading ? '—' : stats?.totalPositions ?? 0}
        iconBg="bg-blue-50"
        iconColor="text-blue-600"
      />
      <StatCard
        icon={<Users size={22} />}
        label="招聘总需求"
        value={statsLoading ? '—' : `${stats?.totalHeadCount ?? 0} 人`}
        iconBg="bg-purple-50"
        iconColor="text-purple-600"
      />
      <StatCard
        icon={<UserCheck size={22} />}
        label="已入职"
        value={statsLoading ? '—' : `${stats?.totalOnboarded ?? 0} 人`}
        iconBg="bg-green-50"
        iconColor="text-green-600"
      />
      <StatCard
        icon={<Target size={22} />}
        label="完成率"
        value={
          statsLoading ? '—' : `${((stats?.completionRate ?? 0) * 100).toFixed(1)}%`
        }
        iconBg="bg-orange-50"
        iconColor="text-orange-600"
      />
    </div>
  );

  const renderFilterBar = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={keyword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setKeyword(e.target.value)
            }
            placeholder="搜索岗位名称..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-500">项目组：</span>
          <div className="flex gap-1">
            {PROJECT_GROUP_FILTERS.map((item) => (
              <button
                key={item.key}
                onClick={() => setProjectGroup(item.key)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  projectGroup === item.key
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-500">岗位类别：</span>
          <div className="flex gap-1 flex-wrap">
            {CATEGORY_FILTERS.map((item) => (
              <button
                key={item.key}
                onClick={() => setCategory(item.key)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  category === item.key
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-500">紧急程度：</span>
          <div className="flex gap-1">
            {PRIORITY_FILTERS.map((item) => (
              <button
                key={item.key}
                onClick={() => setPriority(item.key)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  priority === item.key
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderViewToggle = () => (
    <div className="flex items-center justify-between">
      <div className="inline-flex bg-gray-100 rounded-md p-0.5">
        <button
          onClick={() => setViewMode('kanban')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
            viewMode === 'kanban'
              ? 'bg-white text-gray-900 shadow-sm font-medium'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <LayoutGrid size={16} />
          看板视图
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
            viewMode === 'list'
              ? 'bg-white text-gray-900 shadow-sm font-medium'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <List size={16} />
          列表视图
        </button>
      </div>
      <span className="text-sm text-gray-500">共 {items.length} 个岗位</span>
    </div>
  );

  const renderKanban = () => (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
      {BOARD_COLUMNS.map((column) => {
        const columnItems = boardColumns[column.key] || [];
        const colors = COLUMN_COLORS[column.color] || COLUMN_COLORS.gray;
        const isDragOver = dragOverColumn === column.key;

        return (
          <div
            key={column.key}
            className={`flex-shrink-0 w-80 flex flex-col rounded-lg border transition-colors ${
              isDragOver
                ? `${colors.border} border-2 ${colors.bg}`
                : 'border-gray-200 bg-gray-50'
            }`}
            onDragOver={(e) => handleColumnDragOver(e, column.key)}
            onDragLeave={handleColumnDragLeave}
            onDrop={(e) => handleColumnDrop(e, column)}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 bg-white rounded-t-lg">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-gray-900">{column.label}</h3>
                <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                  {columnItems.length}
                </span>
              </div>
              <button
                onClick={() => handleCreateInColumn(column)}
                className="w-6 h-6 rounded-full bg-gray-100 hover:bg-primary hover:text-white flex items-center justify-center text-gray-500 transition-colors"
                aria-label={`在${column.label}创建岗位`}
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 max-h-[calc(100vh-380px)] min-h-[200px]">
              {loading && columnItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-xs text-gray-400">加载中...</p>
                </div>
              ) : columnItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                    <FileText size={18} className="text-gray-300" />
                  </div>
                  <p className="text-xs text-gray-400">暂无岗位</p>
                </div>
              ) : (
                columnItems.map((item: RecruitmentPositionItem) => (
                  <PositionCard
                    key={item.id}
                    item={item}
                    onClick={handleCardClick}
                    onDelete={handleDelete}
                    isDragging={draggingId === item.id}
                    isDragOver={dragOverItemId === item.id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleCardDragOver(e, item.id)}
                    onDragLeave={() => setDragOverItemId(null)}
                    onDrop={handleCardDrop}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderListView = () => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-gray-500">加载中...</p>
        </div>
      ) : error ? (
        <div className="p-12 flex flex-col items-center justify-center text-center">
          <p className="text-base text-red-500 mb-4">{error}</p>
          <button
            onClick={() => {
              const params: RecruitmentListParams = {
                page: 1,
                pageSize: 100,
                keyword: keyword || undefined,
                projectGroup: projectGroup || undefined,
                category: category || undefined,
                priority: priority || undefined,
              };
              fetchList(params);
            }}
            className="text-sm text-primary hover:underline"
          >
            重新加载
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Briefcase size={28} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">暂无岗位数据</h3>
          <p className="text-sm text-gray-500 mb-4">
            点击"新建岗位"开始创建您的第一个招聘岗位
          </p>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus size={18} />
            新建岗位
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                  岗位名称
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                  项目组
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                  岗位类别
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                  当前阶段
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                  紧急程度
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                  招聘进展
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                  需求/入职
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 whitespace-nowrap">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: RecruitmentPositionItem) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleCardClick(item.id)}
                      className="text-left font-medium text-gray-900 hover:text-primary transition-colors"
                    >
                      {item.title}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {PROJECT_GROUP_LABELS[item.projectGroup]}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {JD_CATEGORY_LABELS[item.category]}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {RECRUITMENT_STAGE_LABELS[item.stage]}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${PRIORITY_COLORS[item.priority]}`}
                    >
                      {PRIORITY_LABELS[item.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    简历{item.resumeCount} / 面试{item.interviewCount} / offer
                    {item.offerCount}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {item.headCount}/{item.onboardedCount}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleCardClick(item.id)}
                      className="text-primary hover:underline text-sm"
                    >
                      查看详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">在招岗位看板</h1>
          <p className="text-sm text-gray-500 mt-1">
            实时跟踪所有招聘岗位的进展状态
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus size={18} />
          新建岗位
        </button>
      </div>

      {/* Stats Dashboard */}
      {renderStats()}

      {/* Filter Bar */}
      {renderFilterBar()}

      {/* View Toggle */}
      {renderViewToggle()}

      {/* Main Content */}
      {viewMode === 'kanban' ? renderKanban() : renderListView()}
    </div>
  );
};

export default RecruitmentBoardPage;
