import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Upload, Trash2, Edit, Handshake, UserCheck, XCircle, Percent } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { showConfirm } from '@lark-apaas/client-toolkit';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import type { TableProps } from '@lark-apaas/client-toolkit/antd-table';
import { toast } from 'sonner';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import dayjs from 'dayjs';
import { offerApi } from '@client/src/api';
import BatchImportModal from '@client/src/components/batch-import/BatchImportModal';
import { parseOfferImportFile } from '@client/src/utils/import-parser/importParsers';
import { Button } from '@client/src/components/ui/button';
import { Badge } from '@client/src/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@client/src/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@client/src/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import { Calendar } from '@client/src/components/ui/calendar';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  OFFER_STATUS_LABELS,
  REJECT_REASON_LABELS,
  JD_CATEGORY_LABELS,
  OFFER_PROJECT_GROUP_LABELS,
  PROJECT_GROUP_LABELS,
  type OfferStatus,
  type RejectReasonCategory,
  type JdCategory,
  type OfferProjectGroup,
  type OfferItem,
  type OfferListParams,
  type OfferStatsResponse,
  type OfferImportPreviewItem,
  type CreateOfferRequest,
  type UpdateOfferRequest,
} from '@shared/api.interface';

const STATUS_COLORS: Record<OfferStatus, string> = {
  onboarded: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
};

const STATUS_BADGE_VARIANT: Record<OfferStatus, 'default' | 'destructive' | 'secondary'> = {
  onboarded: 'default',
  rejected: 'destructive',
  in_progress: 'secondary',
};

const CATEGORY_COLORS: Record<JdCategory, string> = {
  program: 'bg-blue-100 text-blue-700 border-blue-200',
  art: 'bg-purple-100 text-purple-700 border-purple-200',
  product: 'bg-green-100 text-green-700 border-green-200',
  operations: 'bg-pink-100 text-pink-700 border-pink-200',
  middle_platform: 'bg-orange-100 text-orange-700 border-orange-200',
  function: 'bg-gray-100 text-gray-700 border-gray-200',
};

const YEAR_FILTERS: { key: string; label: string }[] = [
  { key: '', label: '全部' },
  { key: String(new Date().getFullYear()), label: `${new Date().getFullYear()}年` },
  { key: String(new Date().getFullYear() - 1), label: `${new Date().getFullYear() - 1}年` },
  { key: String(new Date().getFullYear() - 2), label: `${new Date().getFullYear() - 2}年` },
];

const PROJECT_GROUP_FILTERS: { key: OfferProjectGroup | ''; label: string }[] = [
  { key: '', label: '全部' },
  { key: 'tk', label: OFFER_PROJECT_GROUP_LABELS.tk },
  { key: 'jwus1', label: OFFER_PROJECT_GROUP_LABELS.jwus1 },
  { key: 'jwus2', label: OFFER_PROJECT_GROUP_LABELS.jwus2 },
  { key: 'ops', label: OFFER_PROJECT_GROUP_LABELS.ops },
  { key: 'middle_platform', label: OFFER_PROJECT_GROUP_LABELS.middle_platform },
  { key: 'overseas', label: OFFER_PROJECT_GROUP_LABELS.overseas },
  { key: 'function', label: OFFER_PROJECT_GROUP_LABELS.function },
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

const STATUS_FILTERS: { key: OfferStatus | ''; label: string }[] = [
  { key: '', label: '全部' },
  { key: 'onboarded', label: '已入职' },
  { key: 'rejected', label: '已拒接' },
  { key: 'in_progress', label: '进行中' },
];

const offerFormSchema = z.object({
  candidateName: z.string().min(1, '姓名不能为空'),
  positionTitle: z.string().min(1, '职位不能为空'),
  projectGroup: z.string().min(1, '请选择项目组'),
  category: z.string().min(1, '请选择岗位类别'),
  onboardDate: z.string().optional(),
  recruiter: z.string().optional(),
  status: z.string().min(1, '请选择Offer状态'),
  rejectReasonCategory: z.string().optional(),
  rejectReasonDetail: z.string().optional(),
  salaryInfo: z.string().optional(),
  jdId: z.string().optional(),
  remark: z.string().optional(),
});

type OfferFormData = z.infer<typeof offerFormSchema>;

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-';
  const d: Date = new Date(dateStr);
  const year: number = d.getFullYear();
  const month: string = String(d.getMonth() + 1).padStart(2, '0');
  const day: string = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const OfferOverviewPage: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [year, setYear] = useState<string>('');
  const [projectGroup, setProjectGroup] = useState<OfferProjectGroup | ''>('');
  const [category, setCategory] = useState<JdCategory | ''>('');
  const [status, setStatus] = useState<OfferStatus | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [items, setItems] = useState<OfferItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<OfferStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OfferItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<OfferFormData>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: {
      candidateName: '',
      positionTitle: '',
      projectGroup: '',
      category: '',
      onboardDate: '',
      recruiter: '',
      status: 'in_progress',
      rejectReasonCategory: '',
      rejectReasonDetail: '',
      salaryInfo: '',
      jdId: '',
      remark: '',
    },
  });

  const watchStatus = form.watch('status');

  const fetchList = async (params: OfferListParams) => {
    setLoading(true);
    setError('');
    try {
      const res = await offerApi.getOfferList(params);
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (err: unknown) {
      logger.error('获取Offer列表失败', err);
      setError('加载失败，请稍后重试');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await offerApi.getOfferStats({
        projectGroup: projectGroup || undefined,
        year: year ? Number(year) : undefined,
      });
      setStats(res);
    } catch (err: unknown) {
      logger.error('获取Offer统计失败', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      const params: OfferListParams = {
        page: 1,
        pageSize,
        keyword: keyword || undefined,
        projectGroup: projectGroup || undefined,
        category: category || undefined,
        status: status || undefined,
        year: year ? Number(year) : undefined,
      };
      setPage(1);
      fetchList(params);
      fetchStats();
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, year, projectGroup, category, status]);

  useEffect(() => {
    const params: OfferListParams = {
      page,
      pageSize,
      keyword: keyword || undefined,
      projectGroup: projectGroup || undefined,
      category: category || undefined,
      status: status || undefined,
      year: year ? Number(year) : undefined,
    };
    fetchList(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleCreate = () => {
    setEditingItem(null);
    form.reset({
      candidateName: '',
      positionTitle: '',
      projectGroup: '',
      category: '',
      onboardDate: '',
      recruiter: '',
      status: 'in_progress',
      rejectReasonCategory: '',
      rejectReasonDetail: '',
      salaryInfo: '',
      jdId: '',
      remark: '',
    });
    setDialogOpen(true);
  };

  const handleEdit = (item: OfferItem) => {
    setEditingItem(item);
    form.reset({
      candidateName: item.candidateName,
      positionTitle: item.positionTitle,
      projectGroup: item.projectGroup,
      category: item.category,
      onboardDate: item.onboardDate || '',
      recruiter: item.recruiter || '',
      status: item.status,
      rejectReasonCategory: item.rejectReasonCategory || '',
      rejectReasonDetail: item.rejectReasonDetail || '',
      salaryInfo: item.salaryInfo || '',
      jdId: item.jdId || '',
      remark: item.remark || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('确定要删除这条Offer记录吗？此操作不可恢复。');
    if (!confirmed) return;
    try {
      await offerApi.deleteOffer(id);
      toast.success('删除成功');
      const params: OfferListParams = {
        page,
        pageSize,
        keyword: keyword || undefined,
        projectGroup: projectGroup || undefined,
        category: category || undefined,
        status: status || undefined,
        year: year ? Number(year) : undefined,
      };
      if (items.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchList(params);
      }
      fetchStats();
    } catch (err: unknown) {
      logger.error('删除Offer失败', err);
      const msg: string =
        (err as { response?: { data?: { error?: { message?: string } } } })
          .response?.data?.error?.message || '删除失败，请稍后重试';
      toast.error(msg);
    }
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    setSubmitting(true);
    try {
      if (editingItem) {
        const payload: UpdateOfferRequest = {
          candidateName: data.candidateName,
          positionTitle: data.positionTitle,
          projectGroup: data.projectGroup as OfferProjectGroup,
          category: data.category as JdCategory,
          onboardDate: data.onboardDate || null,
          recruiter: data.recruiter || null,
          status: data.status as OfferStatus,
          rejectReasonCategory: data.rejectReasonCategory as RejectReasonCategory | null || null,
          rejectReasonDetail: data.rejectReasonDetail || null,
          salaryInfo: data.salaryInfo || null,
          jdId: data.jdId || null,
          remark: data.remark || null,
        };
        await offerApi.updateOffer(editingItem.id, payload);
        toast.success('更新成功');
      } else {
        const payload: CreateOfferRequest = {
          candidateName: data.candidateName,
          positionTitle: data.positionTitle,
          projectGroup: data.projectGroup as OfferProjectGroup,
          category: data.category as JdCategory,
          onboardDate: data.onboardDate || undefined,
          recruiter: data.recruiter || undefined,
          status: data.status as OfferStatus,
          rejectReasonCategory: data.rejectReasonCategory as RejectReasonCategory | undefined,
          rejectReasonDetail: data.rejectReasonDetail || undefined,
          salaryInfo: data.salaryInfo || undefined,
          jdId: data.jdId || undefined,
          remark: data.remark || undefined,
        };
        await offerApi.createOffer(payload);
        toast.success('创建成功');
      }
      setDialogOpen(false);
      const nextPage = editingItem ? page : 1;
      const params: OfferListParams = {
        page: nextPage,
        pageSize,
        keyword: keyword || undefined,
        projectGroup: projectGroup || undefined,
        category: category || undefined,
        status: status || undefined,
        year: year ? Number(year) : undefined,
      };
      if (!editingItem) {
        setPage(1);
      }
      fetchList(params);
      fetchStats();
    } catch (err: unknown) {
      logger.error('保存Offer失败', err);
      const msg: string =
        (err as { response?: { data?: { error?: { message?: string } } } })
          .response?.data?.error?.message || '保存失败，请稍后重试';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  });

  const handleImport = async (importItems: OfferImportPreviewItem[]) => {
    const dtos: CreateOfferRequest[] = importItems
      .filter((item) => item.valid)
      .map((item) => ({
        candidateName: item.candidateName,
        positionTitle: item.positionTitle,
        projectGroup: 'tk' as OfferProjectGroup,
        category: 'program' as JdCategory,
        onboardDate: item.onboardDate || undefined,
        recruiter: item.recruiter || undefined,
        status: (item.rejectReason ? 'rejected' : 'in_progress') as OfferStatus,
        rejectReasonDetail: item.rejectReason || undefined,
      }));
    return offerApi.batchImportOffer(dtos);
  };

  const renderOfferPreviewTable = (
    previewItems: OfferImportPreviewItem[],
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
            <th className="px-4 py-3 font-medium">姓名</th>
            <th className="px-4 py-3 font-medium">职位</th>
            <th className="px-4 py-3 font-medium">入职时间</th>
            <th className="px-4 py-3 font-medium">招聘负责人</th>
            <th className="px-4 py-3 font-medium">拒接原因</th>
            <th className="px-4 py-3 font-medium">状态</th>
          </tr>
        </thead>
        <tbody>
          {previewItems.map((item, idx) => (
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
              <td className="px-4 py-3 font-medium text-gray-900">{item.candidateName}</td>
              <td className="px-4 py-3 text-gray-600">{item.positionTitle}</td>
              <td className="px-4 py-3 text-gray-600">{item.onboardDate || '-'}</td>
              <td className="px-4 py-3 text-gray-600">{item.recruiter || '-'}</td>
              <td className="px-4 py-3 text-gray-600">{item.rejectReason || '-'}</td>
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

  const columns: TableProps<OfferItem>['columns'] = [
    { title: '姓名', dataIndex: 'candidateName', width: 120, fixed: 'left' },
    { title: '职位', dataIndex: 'positionTitle', width: 150 },
    {
      title: '项目组',
      dataIndex: 'projectGroup',
      width: 120,
      render: (val: OfferProjectGroup) => OFFER_PROJECT_GROUP_LABELS[val] || val,
    },
    {
      title: '岗位类别',
      dataIndex: 'category',
      width: 100,
      render: (val: JdCategory) => (
        <span
          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md border ${CATEGORY_COLORS[val]}`}
        >
          {JD_CATEGORY_LABELS[val]}
        </span>
      ),
    },
    {
      title: '入职时间',
      dataIndex: 'onboardDate',
      width: 120,
      render: (val?: string) => formatDate(val),
    },
    {
      title: '招聘负责人',
      dataIndex: 'recruiter',
      width: 110,
      render: (val?: string) => val || '-',
    },
    {
      title: 'Offer状态',
      dataIndex: 'status',
      width: 100,
      render: (val: OfferStatus) => (
        <Badge variant={STATUS_BADGE_VARIANT[val]}>{OFFER_STATUS_LABELS[val]}</Badge>
      ),
    },
    {
      title: '薪资',
      dataIndex: 'salaryInfo',
      width: 120,
      render: (val?: string) => val || '-',
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 140,
      render: (_: unknown, record: OfferItem) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(record)}
            className="h-7 px-2"
          >
            <Edit size={14} className="mr-1" />
            编辑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(record.id)}
            className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} className="mr-1" />
            删除
          </Button>
        </div>
      ),
    },
  ];

  const totalPages: number = Math.max(1, Math.ceil(total / pageSize));

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    setPage(newPage);
  };

  const trendOption: EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', bottom: 0, data: ['发出Offer数', '已入职数'] },
    grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
    xAxis: {
      type: 'category',
      data: stats?.monthlyTrend.map((item) => item.month) || [],
      boundaryGap: true,
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '发出Offer数',
        type: 'bar',
        data: stats?.monthlyTrend.map((item) => item.offers) || [],
        itemStyle: { color: '#3370eb' },
      },
      {
        name: '已入职数',
        type: 'bar',
        data: stats?.monthlyTrend.map((item) => item.onboarded) || [],
        itemStyle: { color: '#22c55e' },
      },
    ],
  };

  const rejectReasonsOption: EChartsOption = {
    tooltip: { trigger: 'item' },
    legend: { type: 'scroll', bottom: 0, textStyle: { color: '#374151' }, padding: [8, 8] },
    color: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'],
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: { label: { show: false } },
        data: (stats?.rejectReasons || []).map((item) => ({
          name: REJECT_REASON_LABELS[item.category] || item.category,
          value: item.count,
        })),
      },
    ],
  };

  const categoryDistOption: EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { show: false },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: { type: 'value' },
    yAxis: {
      type: 'category',
      data: (stats?.categoryDistribution || []).map((item) => JD_CATEGORY_LABELS[item.category] || item.category),
    },
    series: [
      {
        type: 'bar',
        data: (stats?.categoryDistribution || []).map((item) => item.count),
        itemStyle: { color: '#8b5cf6' },
        barWidth: 20,
      },
    ],
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Offer概览</h1>
          <p className="text-sm text-gray-500 mt-1">管理所有Offer记录与入职情况</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
          >
            <Upload size={18} />
            批量导入
          </Button>
          <Button onClick={handleCreate}>
            <Plus size={18} />
            新增Offer
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-ai-section-type="card-stat">
        <div className="bg-white rounded-lg border border-gray-200 p-5 flex items-center gap-4 border-l-4 border-l-blue-500">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Handshake size={24} className="text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {statsLoading ? '-' : stats?.totalOffers ?? 0}
            </div>
            <div className="text-sm text-gray-500">总发出Offer数</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 flex items-center gap-4 border-l-4 border-l-green-500">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
            <UserCheck size={24} className="text-green-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {statsLoading ? '-' : stats?.onboardedCount ?? 0}
            </div>
            <div className="text-sm text-gray-500">已入职人数</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 flex items-center gap-4 border-l-4 border-l-purple-500">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
            <Percent size={24} className="text-purple-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {statsLoading ? '-' : `${((stats?.acceptRate ?? 0) * 100).toFixed(1)}%`}
            </div>
            <div className="text-sm text-gray-500">Offer接受率</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 flex items-center gap-4 border-l-4 border-l-red-500">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <XCircle size={24} className="text-red-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {statsLoading ? '-' : stats?.rejectedCount ?? 0}
            </div>
            <div className="text-sm text-gray-500">已拒接数</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              value={keyword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setKeyword(e.target.value)
              }
              placeholder="搜索姓名或职位"
              className="pl-10"
            />
          </div>

          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="年份" />
            </SelectTrigger>
            <SelectContent>
              {YEAR_FILTERS.map((item) => (
                <SelectItem key={item.key} value={item.key}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={projectGroup} onValueChange={(val) => setProjectGroup(val as OfferProjectGroup | '')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="项目组" />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_GROUP_FILTERS.map((item) => (
                <SelectItem key={item.key} value={item.key}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={category} onValueChange={(val) => setCategory(val as JdCategory | '')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="岗位类别" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_FILTERS.map((item) => (
                <SelectItem key={item.key} value={item.key}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(val) => setStatus(val as OfferStatus | '')}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Offer状态" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((item) => (
                <SelectItem key={item.key} value={item.key}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">每月入职趋势</h3>
          <ReactECharts
            option={trendOption}
            theme="ud"
            className="h-[340px] w-full"
            notMerge
          />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">拒接原因分布</h3>
          <ReactECharts
            option={rejectReasonsOption}
            theme="ud"
            className="h-[340px] w-full"
            notMerge
          />
        </div>
        <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">已入职人员岗位类别分布</h3>
          <ReactECharts
            option={categoryDistOption}
            theme="ud"
            className="h-[340px] w-full"
            notMerge
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <Table<OfferItem>
          columns={columns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1100, y: 500 }}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: handlePageChange,
            showSizeChanger: false,
            showTotal: (t: number) => `共 ${t} 条`,
          }}
        />
        {error && (
          <div className="p-12 text-center">
            <p className="text-base text-red-500 mb-4">{error}</p>
            <Button
              variant="ghost"
              onClick={() => {
                const params: OfferListParams = {
                  page,
                  pageSize,
                  keyword: keyword || undefined,
                  projectGroup: projectGroup || undefined,
                  category: category || undefined,
                  status: status || undefined,
                  year: year ? Number(year) : undefined,
                };
                fetchList(params);
              }}
            >
              重新加载
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? '编辑Offer' : '新增Offer'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <FormField
                  control={form.control}
                  name="candidateName"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[180px]">
                      <FormLabel>
                        姓名{' '}
                        <span aria-hidden="true" className="text-destructive">
                          *
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="请输入姓名" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="positionTitle"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[180px]">
                      <FormLabel>
                        职位{' '}
                        <span aria-hidden="true" className="text-destructive">
                          *
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="请输入职位" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-wrap gap-4">
                <FormField
                  control={form.control}
                  name="projectGroup"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[180px]">
                      <FormLabel>
                        项目组{' '}
                        <span aria-hidden="true" className="text-destructive">
                          *
                        </span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择项目组" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="tk">TK</SelectItem>
                          <SelectItem value="jwus1">极无双1</SelectItem>
                          <SelectItem value="jwus2">极无双2</SelectItem>
                          <SelectItem value="ops">运营&amp;发行</SelectItem>
                          <SelectItem value="middle_platform">中台</SelectItem>
                          <SelectItem value="overseas">海外</SelectItem>
                          <SelectItem value="function">职能</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[180px]">
                      <FormLabel>
                        岗位类别{' '}
                        <span aria-hidden="true" className="text-destructive">
                          *
                        </span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择岗位类别" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="program">程序</SelectItem>
                          <SelectItem value="art">美术</SelectItem>
                          <SelectItem value="product">产品</SelectItem>
                          <SelectItem value="operations">运营&发行</SelectItem>
                          <SelectItem value="middle_platform">中台</SelectItem>
                          <SelectItem value="function">职能</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-wrap gap-4">
                <FormField
                  control={form.control}
                  name="onboardDate"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[180px]">
                      <FormLabel>入职时间</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full justify-start font-normal"
                            >
                              {field.value
                                ? dayjs(field.value).format('YYYY-MM-DD')
                                : '请选择日期'}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) =>
                              field.onChange(date ? date.toISOString() : '')
                            }
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="recruiter"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[180px]">
                      <FormLabel>招聘负责人</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入招聘负责人" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Offer状态{' '}
                      <span aria-hidden="true" className="text-destructive">
                        *
                      </span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择状态" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="onboarded">已入职</SelectItem>
                        <SelectItem value="rejected">已拒接</SelectItem>
                        <SelectItem value="in_progress">进行中</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchStatus === 'rejected' && (
                <>
                  <div className="flex flex-wrap gap-4">
                    <FormField
                      control={form.control}
                      name="rejectReasonCategory"
                      render={({ field }) => (
                        <FormItem className="flex-1 min-w-[180px]">
                          <FormLabel>拒接原因分类</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="请选择拒接原因" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="salary">薪资不满意</SelectItem>
                              <SelectItem value="location">地点问题</SelectItem>
                              <SelectItem value="family">家庭原因</SelectItem>
                              <SelectItem value="better_offer">更好offer</SelectItem>
                              <SelectItem value="health">身体原因</SelectItem>
                              <SelectItem value="school">学校原因</SelectItem>
                              <SelectItem value="other">其他</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="rejectReasonDetail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>拒接原因详情</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="请输入拒接原因详情"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <div className="flex flex-wrap gap-4">
                <FormField
                  control={form.control}
                  name="salaryInfo"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[180px]">
                      <FormLabel>薪资信息</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入薪资信息" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="jdId"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[180px]">
                      <FormLabel>关联JD</FormLabel>
                      <FormControl>
                        <Input placeholder="JD ID或名称" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="remark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>备注</FormLabel>
                    <FormControl>
                      <Textarea placeholder="请输入备注" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    取消
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={submitting}>
                  {submitting ? '保存中...' : '保存'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <BatchImportModal<OfferImportPreviewItem>
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="批量导入Offer"
        acceptFormats=".xlsx,.xls"
        formatDescription="Excel (.xlsx / .xls)"
        parseFile={parseOfferImportFile}
        importItems={handleImport}
        onSuccess={() => {
          const params: OfferListParams = {
            page: 1,
            pageSize,
            keyword: keyword || undefined,
            projectGroup: projectGroup || undefined,
            category: category || undefined,
            status: status || undefined,
            year: year ? Number(year) : undefined,
          };
          setPage(1);
          fetchList(params);
          fetchStats();
        }}
        renderPreviewTable={renderOfferPreviewTable}
        getPreviewTitle={(item) => item.candidateName}
      />
    </div>
  );
};

export default OfferOverviewPage;
