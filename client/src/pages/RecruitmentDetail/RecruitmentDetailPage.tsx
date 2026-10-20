import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { showConfirm } from '@lark-apaas/client-toolkit';
import { toast } from 'sonner';
import { recruitmentApi, jdApi } from '@client/src/api';
import {
  PROJECT_GROUP_LABELS,
  JD_CATEGORY_LABELS,
  RECRUITMENT_STAGE_LABELS,
  PRIORITY_LABELS,
  type ProjectGroup,
  type JdCategory,
  type RecruitmentStage,
  type PriorityLevel,
  type RecruitmentPositionItem,
  type CreateRecruitmentDto,
  type JdItem,
} from '@shared/api.interface';

const RecruitmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew: boolean = !id || id === 'new';

  // Form state
  const [title, setTitle] = useState('');
  const [projectGroup, setProjectGroup] = useState<ProjectGroup | ''>('');
  const [category, setCategory] = useState<JdCategory | ''>('');
  const [jdId, setJdId] = useState('');
  const [stage, setStage] = useState<RecruitmentStage>('pending');
  const [resumeCount, setResumeCount] = useState(0);
  const [interviewCount, setInterviewCount] = useState(0);
  const [offerCount, setOfferCount] = useState(0);
  const [onboardedCount, setOnboardedCount] = useState(0);
  const [remark, setRemark] = useState('');
  const [hiringManager, setHiringManager] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('p2');
  const [headCount, setHeadCount] = useState(1);
  const [expectedStartDate, setExpectedStartDate] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [jdList, setJdList] = useState<JdItem[]>([]);
  const [jdLoading, setJdLoading] = useState(false);

  // Load existing position in edit mode
  useEffect(() => {
    if (isNew || !id) return;
    const loadDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const data: RecruitmentPositionItem =
          await recruitmentApi.getRecruitmentDetail(id);
        setTitle(data.title || '');
        setProjectGroup(data.projectGroup || '');
        setCategory(data.category || '');
        setJdId(data.jdId || '');
        setStage(data.stage || 'pending');
        setResumeCount(data.resumeCount || 0);
        setInterviewCount(data.interviewCount || 0);
        setOfferCount(data.offerCount || 0);
        setOnboardedCount(data.onboardedCount || 0);
        setRemark(data.remark || '');
        setHiringManager(data.hiringManager || '');
        setPriority(data.priority || 'p2');
        setHeadCount(data.headCount || 1);
        setExpectedStartDate(data.expectedStartDate || '');
      } catch (err: unknown) {
        logger.error('加载招聘岗位失败', err);
        setError('加载失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [id, isNew]);

  // Fetch JD list for selector
  useEffect(() => {
    const loadJdList = async () => {
      setJdLoading(true);
      try {
        const res = await jdApi.getJdList({ pageSize: 100 });
        setJdList(res.items || []);
      } catch (err: unknown) {
        logger.error('加载JD列表失败', err);
      } finally {
        setJdLoading(false);
      }
    };
    loadJdList();
  }, []);

  const handleBack = () => {
    navigate('/recruitment');
  };

  const handleJdChange = (selectedJdId: string) => {
    setJdId(selectedJdId);

    // In create mode, pre-fill fields from JD if they are empty
    if (isNew && selectedJdId) {
      const selectedJd: JdItem | undefined = jdList.find(
        (jd: JdItem) => jd.id === selectedJdId,
      );
      if (selectedJd) {
        if (!title.trim()) {
          setTitle(selectedJd.title);
        }
        if (!category) {
          setCategory(selectedJd.category);
        }
        if (!projectGroup) {
          setProjectGroup(selectedJd.projectGroup);
        }
      }
    }
  };

  const validate = (): string | null => {
    if (!title.trim()) return '请输入岗位名称';
    if (!projectGroup) return '请选择所属项目组';
    if (!category) return '请选择岗位类别';
    return null;
  };

  const handleSave = async () => {
    const validationError: string | null = validate();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload: CreateRecruitmentDto = {
        title: title.trim(),
        projectGroup: projectGroup as ProjectGroup,
        category: category as JdCategory,
        jdId: jdId || undefined,
        hiringManager: hiringManager.trim() || undefined,
        priority: priority,
        headCount: headCount,
        stage: stage,
        resumeCount: resumeCount,
        interviewCount: interviewCount,
        offerCount: offerCount,
        onboardedCount: onboardedCount,
        expectedStartDate: expectedStartDate || undefined,
        remark: remark.trim() || undefined,
      };

      let result: RecruitmentPositionItem;
      if (isNew) {
        result = await recruitmentApi.createRecruitment(payload);
        toast.success('创建成功');
        navigate(`/recruitment/${result.id}`);
      } else if (id) {
        result = await recruitmentApi.updateRecruitment(id, payload);
        toast.success('保存成功');
        // Refresh local state with updated data
        setTitle(result.title);
        setProjectGroup(result.projectGroup);
        setCategory(result.category);
        setJdId(result.jdId || '');
        setStage(result.stage);
        setResumeCount(result.resumeCount);
        setInterviewCount(result.interviewCount);
        setOfferCount(result.offerCount);
        setOnboardedCount(result.onboardedCount);
        setRemark(result.remark || '');
        setHiringManager(result.hiringManager || '');
        setPriority(result.priority);
        setHeadCount(result.headCount);
        setExpectedStartDate(result.expectedStartDate || '');
      }
    } catch (err: unknown) {
      logger.error('保存招聘岗位失败', err);
      const msg = '保存失败，请稍后重试';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || isNew) return;

    const confirmed: boolean = await showConfirm(
      '确定要删除这个招聘岗位吗？删除后无法恢复。',
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await recruitmentApi.deleteRecruitment(id);
      toast.success('删除成功');
      navigate('/recruitment');
    } catch (err: unknown) {
      logger.error('删除招聘岗位失败', err);
      toast.error('删除失败，请稍后重试');
    } finally {
      setDeleting(false);
    }
  };

  const handleRetry = () => {
    if (isNew || !id) return;
    setLoading(true);
    setError('');
    // Re-trigger effect by reloading
    window.location.reload();
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

  const isSaveDisabled: boolean = !title.trim() || saving;

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
              {isNew ? '新建招聘岗位' : title || '招聘岗位详情'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isNew ? '创建一个新的招聘岗位' : '编辑招聘岗位信息'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!isNew && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 size={16} />
              删除
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaveDisabled}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            保存
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm flex items-center justify-between">
          <span>{error}</span>
          {!isNew && (
            <button
              onClick={handleRetry}
              className="text-red-600 underline hover:text-red-700"
            >
              重试
            </button>
          )}
        </div>
      )}

      {/* Form - Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - 主信息 (spans 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本信息 */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">基本信息</h3>

            <div>
              <label className="block text-sm text-gray-700 mb-1">
                岗位名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setTitle(e.target.value)
                }
                placeholder="请输入岗位名称"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  所属项目组 <span className="text-red-500">*</span>
                </label>
                <select
                  value={projectGroup}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setProjectGroup(e.target.value as ProjectGroup | '')
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="">请选择项目组</option>
                  {(Object.keys(PROJECT_GROUP_LABELS) as ProjectGroup[]).map(
                    (key: ProjectGroup) => (
                      <option key={key} value={key}>
                        {PROJECT_GROUP_LABELS[key]}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  岗位类别 <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setCategory(e.target.value as JdCategory | '')
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="">请选择岗位类别</option>
                  {(Object.keys(JD_CATEGORY_LABELS) as JdCategory[]).map(
                    (key: JdCategory) => (
                      <option key={key} value={key}>
                        {JD_CATEGORY_LABELS[key]}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">关联JD</label>
              <select
                value={jdId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  handleJdChange(e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                disabled={jdLoading && jdList.length === 0}
              >
                <option value="">{jdLoading ? '加载中...' : '请选择关联JD（可选）'}</option>
                {jdList.map((jd: JdItem) => (
                  <option key={jd.id} value={jd.id}>
                    {jd.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 招聘进展 */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">招聘进展</h3>

            <div>
              <label className="block text-sm text-gray-700 mb-1">当前阶段</label>
              <select
                value={stage}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setStage(e.target.value as RecruitmentStage)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                {(Object.keys(RECRUITMENT_STAGE_LABELS) as RecruitmentStage[]).map(
                  (key: RecruitmentStage) => (
                    <option key={key} value={key}>
                      {RECRUITMENT_STAGE_LABELS[key]}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">已收简历数</label>
                <input
                  type="number"
                  min={0}
                  value={resumeCount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setResumeCount(Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">面试人数</label>
                <input
                  type="number"
                  min={0}
                  value={interviewCount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setInterviewCount(Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Offer人数</label>
                <input
                  type="number"
                  min={0}
                  value={offerCount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setOfferCount(Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">入职人数</label>
                <input
                  type="number"
                  min={0}
                  value={onboardedCount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setOnboardedCount(Math.max(0, parseInt(e.target.value, 10) || 0))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* 备注 */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">备注</h3>
            <textarea
              value={remark}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setRemark(e.target.value)
              }
              placeholder="特殊要求、面试反馈记录等..."
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
            />
          </div>
        </div>

        {/* Right column - 配置 (spans 1) */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">招聘配置</h3>

            <div>
              <label className="block text-sm text-gray-700 mb-1">招聘负责人</label>
              <input
                type="text"
                value={hiringManager}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setHiringManager(e.target.value)
                }
                placeholder="请输入负责人ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">紧急程度</label>
              <select
                value={priority}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setPriority(e.target.value as PriorityLevel)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
              >
                {(Object.keys(PRIORITY_LABELS) as PriorityLevel[]).map(
                  (key: PriorityLevel) => (
                    <option key={key} value={key}>
                      {PRIORITY_LABELS[key]}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">需求人数</label>
              <input
                type="number"
                min={1}
                value={headCount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setHeadCount(Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">期望到岗时间</label>
              <input
                type="date"
                value={expectedStartDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setExpectedStartDate(e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruitmentDetailPage;
