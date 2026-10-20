import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, Edit, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { showConfirm } from '@lark-apaas/client-toolkit';
import { Table } from '@lark-apaas/client-toolkit/antd-table';
import type { TableProps } from '@lark-apaas/client-toolkit/antd-table';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import dayjs from 'dayjs';
import { campusApi } from '@client/src/api/campus';
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
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import {
  SCHOOL_CATEGORY_LABELS,
  FAIR_STATUS_LABELS,
  type SchoolCategory,
  type FairStatus,
  type CampusSchoolItem,
  type CampusSchoolListParams,
  type CreateCampusSchoolRequest,
  type UpdateCampusSchoolRequest,
} from '@shared/api.interface';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

const CATEGORY_COLORS: Record<SchoolCategory, string> = {
  '985': 'bg-red-100 text-red-700 border-red-200',
  '211': 'bg-blue-100 text-blue-700 border-blue-200',
  double_first_class: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  other: 'bg-gray-100 text-gray-700 border-gray-200',
};

const FAIR_STATUS_COLORS: Record<FairStatus, string> = {
  registered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  not_registered: 'bg-gray-100 text-gray-600 border-gray-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
};

const CATEGORY_FILTERS: { key: SchoolCategory | ''; label: string }[] = [
  { key: '', label: '全部' },
  { key: '985', label: '985' },
  { key: '211', label: '211' },
  { key: 'double_first_class', label: '双一流' },
  { key: 'other', label: '其他' },
];

const FAIR_STATUS_FILTERS: { key: FairStatus | ''; label: string }[] = [
  { key: '', label: '全部' },
  { key: 'registered', label: '已报名' },
  { key: 'not_registered', label: '未报名' },
  { key: 'pending', label: '待确认' },
];

const schoolFormSchema = z.object({
  schoolName: z.string().min(1, '学校名称不能为空'),
  category: z.string().min(1, '请选择类别'),
  websiteUrl: z.string().optional(),
  loginAccount: z.string().optional(),
  loginPassword: z.string().optional(),
  fairStatus: z.string().min(1, '请选择双选会状态'),
  fairTime: z.string().optional(),
  boothFee: z.string().optional(),
  location: z.string().optional(),
  remark: z.string().optional(),
});

type SchoolFormData = z.infer<typeof schoolFormSchema>;

const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return '-';
  const d: Date = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
  const year: number = d.getFullYear();
  const month: string = String(d.getMonth() + 1).padStart(2, '0');
  const day: string = String(d.getDate()).padStart(2, '0');
  const hour: string = String(d.getHours()).padStart(2, '0');
  const minute: string = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
};

const CampusSchoolPage: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<SchoolCategory | ''>('');
  const [fairStatus, setFairStatus] = useState<FairStatus | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [items, setItems] = useState<CampusSchoolItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CampusSchoolItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [dialogPasswordVisible, setDialogPasswordVisible] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<SchoolFormData>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: {
      schoolName: '',
      category: '',
      websiteUrl: '',
      loginAccount: '',
      loginPassword: '',
      fairStatus: 'not_registered',
      fairTime: '',
      boothFee: '',
      location: '',
      remark: '',
    },
  });

  const fetchList = async (params: CampusSchoolListParams) => {
    setLoading(true);
    setError('');
    try {
      const res = await campusApi.listSchools(params);
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (err: unknown) {
      logger.error('获取院校列表失败', err);
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
      const params: CampusSchoolListParams = {
        page: 1,
        pageSize,
        keyword: keyword || undefined,
        category: category || undefined,
        fairStatus: fairStatus || undefined,
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
  }, [keyword, category, fairStatus]);

  useEffect(() => {
    const params: CampusSchoolListParams = {
      page,
      pageSize,
      keyword: keyword || undefined,
      category: category || undefined,
      fairStatus: fairStatus || undefined,
    };
    fetchList(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreate = () => {
    setEditingItem(null);
    setDialogPasswordVisible(false);
    form.reset({
      schoolName: '',
      category: '',
      websiteUrl: '',
      loginAccount: '',
      loginPassword: '',
      fairStatus: 'not_registered',
      fairTime: '',
      boothFee: '',
      location: '',
      remark: '',
    });
    setDialogOpen(true);
  };

  const handleEdit = (item: CampusSchoolItem) => {
    setEditingItem(item);
    setDialogPasswordVisible(false);
    form.reset({
      schoolName: item.schoolName,
      category: item.category,
      websiteUrl: item.websiteUrl || '',
      loginAccount: item.loginAccount || '',
      loginPassword: item.loginPassword || '',
      fairStatus: item.fairStatus,
      fairTime: item.fairTime || '',
      boothFee: item.boothFee || '',
      location: item.location || '',
      remark: item.remark || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('确定要删除这条院校记录吗？此操作不可恢复。');
    if (!confirmed) return;
    try {
      await campusApi.deleteSchool(id);
      toast.success('删除成功');
      const params: CampusSchoolListParams = {
        page,
        pageSize,
        keyword: keyword || undefined,
        category: category || undefined,
        fairStatus: fairStatus || undefined,
      };
      if (items.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchList(params);
      }
    } catch (err: unknown) {
      logger.error('删除院校失败', err);
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
        const payload: UpdateCampusSchoolRequest = {
          schoolName: data.schoolName,
          category: data.category as SchoolCategory,
          websiteUrl: data.websiteUrl || undefined,
          loginAccount: data.loginAccount || undefined,
          loginPassword: data.loginPassword || undefined,
          fairStatus: data.fairStatus as FairStatus,
          fairTime: data.fairTime || undefined,
          boothFee: data.boothFee || undefined,
          location: data.location || undefined,
          remark: data.remark || undefined,
        };
        await campusApi.updateSchool(editingItem.id, payload);
        toast.success('更新成功');
      } else {
        const payload: CreateCampusSchoolRequest = {
          schoolName: data.schoolName,
          category: data.category as SchoolCategory,
          websiteUrl: data.websiteUrl || undefined,
          loginAccount: data.loginAccount || undefined,
          loginPassword: data.loginPassword || undefined,
          fairStatus: data.fairStatus as FairStatus,
          fairTime: data.fairTime || undefined,
          boothFee: data.boothFee || undefined,
          location: data.location || undefined,
          remark: data.remark || undefined,
        };
        await campusApi.createSchool(payload);
        toast.success('创建成功');
      }
      setDialogOpen(false);
      const nextPage = editingItem ? page : 1;
      const params: CampusSchoolListParams = {
        page: nextPage,
        pageSize,
        keyword: keyword || undefined,
        category: category || undefined,
        fairStatus: fairStatus || undefined,
      };
      if (!editingItem) {
        setPage(1);
      }
      fetchList(params);
    } catch (err: unknown) {
      logger.error('保存院校失败', err);
      const msg: string =
        (err as { response?: { data?: { error?: { message?: string } } } })
          .response?.data?.error?.message || '保存失败，请稍后重试';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  });

  const columns: TableProps<CampusSchoolItem>['columns'] = [
    { title: '学校名称', dataIndex: 'schoolName', width: 160, fixed: 'left' },
    {
      title: '类别',
      dataIndex: 'category',
      width: 80,
      render: (val: SchoolCategory) => (
        <span
          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md border ${CATEGORY_COLORS[val]}`}
        >
          {SCHOOL_CATEGORY_LABELS[val]}
        </span>
      ),
    },
    {
      title: '就业网',
      dataIndex: 'websiteUrl',
      width: 80,
      render: (val?: string) =>
        val ? (
          <UniversalLink
            to={val}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
          >
            <ExternalLink size={14} />
            打开
          </UniversalLink>
        ) : (
          '-'
        ),
    },
    {
      title: '登录账号',
      dataIndex: 'loginAccount',
      width: 110,
      render: (val?: string) => val || '-',
    },
    {
      title: '登录密码',
      dataIndex: 'loginPassword',
      width: 120,
      render: (val: string | undefined, record: CampusSchoolItem) => {
        const isVisible = visiblePasswords[record.id];
        return (
          <div className="flex items-center gap-2">
            <span className="text-gray-700">
              {val ? (isVisible ? val : '••••••') : '-'}
            </span>
            {val && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => togglePasswordVisibility(record.id)}
                aria-label={isVisible ? '隐藏密码' : '显示密码'}
              >
                {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
              </Button>
            )}
          </div>
        );
      },
    },
    {
      title: '双选会状态',
      dataIndex: 'fairStatus',
      width: 100,
      render: (val: FairStatus) => (
        <Badge
          variant="secondary"
          className={FAIR_STATUS_COLORS[val]}
        >
          {FAIR_STATUS_LABELS[val]}
        </Badge>
      ),
    },
    {
      title: '双选会时间',
      dataIndex: 'fairTime',
      width: 140,
      render: (val?: string) => formatDateTime(val),
    },
    {
      title: '展位费用',
      dataIndex: 'boothFee',
      width: 100,
      render: (val?: string) => val || '-',
    },
    {
      title: '地点',
      dataIndex: 'location',
      width: 150,
      render: (val?: string) => val || '-',
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 120,
      render: (val?: string) => val || '-',
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 120,
      render: (_: unknown, record: CampusSchoolItem) => (
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

  const watchWebsiteUrl = form.watch('websiteUrl');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">院校信息库</h1>
          <p className="text-sm text-gray-500 mt-1">管理校招院校信息与双选会安排</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleCreate}>
            <Plus size={18} />
            新增院校
          </Button>
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
              placeholder="搜索学校名称"
              className="pl-10"
            />
          </div>

          <Select
            value={category}
            onValueChange={(val) => setCategory(val as SchoolCategory | '')}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="类别" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_FILTERS.map((item) => (
                <SelectItem key={item.key} value={item.key}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={fairStatus}
            onValueChange={(val) => setFairStatus(val as FairStatus | '')}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="双选会状态" />
            </SelectTrigger>
            <SelectContent>
              {FAIR_STATUS_FILTERS.map((item) => (
                <SelectItem key={item.key} value={item.key}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <Table<CampusSchoolItem>
          columns={columns}
          dataSource={items}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1350, y: 500 }}
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
                const params: CampusSchoolListParams = {
                  page,
                  pageSize,
                  keyword: keyword || undefined,
                  category: category || undefined,
                  fairStatus: fairStatus || undefined,
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
            <DialogTitle>{editingItem ? '编辑院校' : '新增院校'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <FormField
                  control={form.control}
                  name="schoolName"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[200px]">
                      <FormLabel>
                        学校名称{' '}
                        <span aria-hidden="true" className="text-destructive">
                          *
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="请输入学校名称" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[160px]">
                      <FormLabel>
                        类别{' '}
                        <span aria-hidden="true" className="text-destructive">
                          *
                        </span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择类别" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="985">985</SelectItem>
                          <SelectItem value="211">211</SelectItem>
                          <SelectItem value="double_first_class">双一流</SelectItem>
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
                name="websiteUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>就业网网址</FormLabel>
                    <div className="flex gap-2">
                      <FormControl className="flex-1">
                        <Input placeholder="请输入就业网网址" {...field} />
                      </FormControl>
                      {watchWebsiteUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => window.open(watchWebsiteUrl, '_blank')}
                        >
                          <ExternalLink size={16} className="mr-1" />
                          打开
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-wrap gap-4">
                <FormField
                  control={form.control}
                  name="loginAccount"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[180px]">
                      <FormLabel>登录账号</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入登录账号" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="loginPassword"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[180px]">
                      <FormLabel>登录密码</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type={dialogPasswordVisible ? 'text' : 'password'}
                            placeholder="请输入登录密码"
                            {...field}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setDialogPasswordVisible((prev) => !prev)}
                          aria-label={dialogPasswordVisible ? '隐藏密码' : '显示密码'}
                        >
                          {dialogPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-wrap gap-4">
                <FormField
                  control={form.control}
                  name="fairStatus"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[180px]">
                      <FormLabel>
                        双选会状态{' '}
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
                          <SelectItem value="registered">已报名</SelectItem>
                          <SelectItem value="not_registered">未报名</SelectItem>
                          <SelectItem value="pending">待确认</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fairTime"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[220px]">
                      <FormLabel>双选会时间</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          value={
                            field.value
                              ? dayjs(field.value).format('YYYY-MM-DDTHH:mm')
                              : ''
                          }
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const val = e.target.value;
                            field.onChange(val ? dayjs(val).toISOString() : '');
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-wrap gap-4">
                <FormField
                  control={form.control}
                  name="boothFee"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[180px]">
                      <FormLabel>展位费用</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入展位费用" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-[180px]">
                      <FormLabel>地点</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入地点" {...field} />
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
    </div>
  );
};

export default CampusSchoolPage;
