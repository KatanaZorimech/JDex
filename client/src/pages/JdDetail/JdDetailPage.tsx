import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Copy,
  Archive,
  RotateCcw,
  Trash2,
  Clock,
  Tag,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { jdApi, termApi, recruitmentApi } from '@client/src/api';
import { Markdown } from '@client/src/components/ui/markdown';
import {
  JD_CATEGORY_LABELS,
  TERM_CATEGORY_LABELS,
  type JdItem,
  type JdVersionItem,
  type JdTermStats,
  type TermRecognitionResult,
  PROJECT_GROUP_LABELS,
} from '@shared/api.interface';
import { showConfirm } from '@lark-apaas/client-toolkit';
import { toast } from 'sonner';

type ExplanationType = 'hr' | 'tech';

const STATUS_LABELS: Record<string, string> = {
  active: '已发布',
  draft: '草稿',
  archived: '已归档',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-yellow-100 text-yellow-700',
  archived: 'bg-gray-100 text-gray-600',
};

const CATEGORY_COLORS: Record<string, string> = {
  program: 'bg-blue-100 text-blue-700 border-blue-200',
  art: 'bg-purple-100 text-purple-700 border-purple-200',
  product: 'bg-green-100 text-green-700 border-green-200',
  operations: 'bg-pink-100 text-pink-700 border-pink-200',
  middle_platform: 'bg-orange-100 text-orange-700 border-orange-200',
  function: 'bg-gray-100 text-gray-700 border-gray-200',
};

const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '-';
  const d: Date = new Date(dateStr);
  const year: number = d.getFullYear();
  const month: string = String(d.getMonth() + 1).padStart(2, '0');
  const day: string = String(d.getDate()).padStart(2, '0');
  const hours: string = String(d.getHours()).padStart(2, '0');
  const minutes: string = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const normalizeJdContent = (content: string): string => {
  if (!content) return content;
  return content
    .replace(/^\s*(\d+)[、.．]\s*/gm, (_, num) => `${num}. `)
    .replace(/^\s*([（(]\d+[)）])\s*/gm, (_, marker) => `${marker} `)
    .replace(/^\s*([一二三四五六七八九十]+)[、.．]\s*/gm, (_, cn) => `- ${cn}、`);
};

// Highlight terms in plain text with tooltip overlays
const HighlightedContent: React.FC<{
  content: string;
  terms: TermRecognitionResult[];
  explanationType: ExplanationType;
}> = ({ content, terms, explanationType }) => {
  if (!terms || terms.length === 0) {
    return <Markdown>{normalizeJdContent(content)}</Markdown>;
  }

  // Build a map of unique term info by name (lowercase match)
  const termMap = new Map<string, TermRecognitionResult>();
  for (const t of terms) {
    const key: string = t.term.name.toLowerCase();
    if (!termMap.has(key)) termMap.set(key, t);
  }

  // For markdown rendering, we replace recognized terms with custom HTML spans
  // We use a regex approach: find all term names in content and wrap them
  const sortedTerms: TermRecognitionResult[] = Array.from(termMap.values()).sort(
    (a: TermRecognitionResult, b: TermRecognitionResult) =>
      b.term.name.length - a.term.name.length,
  );

  // We'll use the components prop of ReactMarkdown to handle term highlighting
  // For simplicity and to avoid breaking markdown rendering, we process text nodes
  // Create a regex that matches any term name (case insensitive)
  const termNames: string[] = sortedTerms.map((t: TermRecognitionResult) => t.term.name);
  const escapedNames: string[] = termNames.map((name: string) =>
    name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  const termRegex: RegExp = new RegExp(`(${escapedNames.join('|')})`, 'gi');

  return (
    <Markdown
      components={{
        p: ({ children, ...props }) => {
          const processChild = (
            child: React.ReactNode,
            keyPrefix: string,
          ): React.ReactNode => {
            if (typeof child === 'string') {
              const parts: React.ReactNode[] = [];
              let lastIndex: number = 0;
              let match: RegExpExecArray | null;
              const regex: RegExp = new RegExp(termRegex.source, 'gi');
              let keyIdx: number = 0;
              while ((match = regex.exec(child)) !== null) {
                if (match.index > lastIndex) {
                  parts.push(child.slice(lastIndex, match.index));
                }
                const matchedName: string = match[0];
                const termInfo: TermRecognitionResult | undefined = termMap.get(
                  matchedName.toLowerCase(),
                );
                if (termInfo) {
                  const explanation: string =
                    explanationType === 'hr'
                      ? termInfo.term.explanationHr
                      : termInfo.term.explanationTech;
                  parts.push(
                    <span
                      key={`${keyPrefix}-${keyIdx}`}
                      className="relative inline-block group/term cursor-help border-b border-dotted border-primary/60 text-primary font-medium"
                    >
                      {matchedName}
                      <span className="pointer-events-none invisible opacity-0 absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 text-xs text-gray-700 bg-white border border-gray-200 rounded-md shadow-lg transition-all duration-200 group-hover/term:visible group-hover/term:opacity-100">
                        <span className="font-semibold text-gray-900 block mb-1">
                          {termInfo.term.name}
                        </span>
                        <span className="text-gray-500 block mb-1">
                          {TERM_CATEGORY_LABELS[termInfo.term.category] || termInfo.term.category}
                        </span>
                        <span className="text-gray-700">{explanation}</span>
                      </span>
                    </span>,
                  );
                  keyIdx += 1;
                } else {
                  parts.push(matchedName);
                }
                lastIndex = regex.lastIndex;
              }
              if (lastIndex < child.length) {
                parts.push(child.slice(lastIndex));
              }
              return <>{parts}</>;
            }
            if (Array.isArray(child)) {
              return child.map((c: React.ReactNode, i: number) =>
                processChild(c, `${keyPrefix}-${i}`),
              );
            }
            return child;
          };
          return (
            <p {...props} className="group">
              {processChild(children, 'p')}
            </p>
          );
        },
        li: ({ children, ...props }) => {
          const processChild = (
            child: React.ReactNode,
            keyPrefix: string,
          ): React.ReactNode => {
            if (typeof child === 'string') {
              const parts: React.ReactNode[] = [];
              let lastIndex: number = 0;
              let match: RegExpExecArray | null;
              const regex: RegExp = new RegExp(termRegex.source, 'gi');
              let keyIdx: number = 0;
              while ((match = regex.exec(child)) !== null) {
                if (match.index > lastIndex) {
                  parts.push(child.slice(lastIndex, match.index));
                }
                const matchedName: string = match[0];
                const termInfo: TermRecognitionResult | undefined = termMap.get(
                  matchedName.toLowerCase(),
                );
                if (termInfo) {
                  const explanation: string =
                    explanationType === 'hr'
                      ? termInfo.term.explanationHr
                      : termInfo.term.explanationTech;
                  parts.push(
                    <span
                      key={`${keyPrefix}-${keyIdx}`}
                      className="relative inline-block cursor-help border-b border-dotted border-primary/60 text-primary font-medium"
                      title={explanation}
                    >
                      {matchedName}
                    </span>,
                  );
                  keyIdx += 1;
                } else {
                  parts.push(matchedName);
                }
                lastIndex = regex.lastIndex;
              }
              if (lastIndex < child.length) {
                parts.push(child.slice(lastIndex));
              }
              return <>{parts}</>;
            }
            if (Array.isArray(child)) {
              return child.map((c: React.ReactNode, i: number) =>
                processChild(c, `${keyPrefix}-${i}`),
              );
            }
            return child;
          };
          return (
            <li {...props} className="group">
              {processChild(children, 'li')}
            </li>
          );
        },
      }}
    >
      {normalizeJdContent(content)}
    </Markdown>
  );
};

const JdDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [jd, setJd] = useState<JdItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [versions, setVersions] = useState<JdVersionItem[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [versionContent, setVersionContent] = useState<string>('');
  const [versionLoading, setVersionLoading] = useState(false);
  const [recognizedTerms, setRecognizedTerms] = useState<TermRecognitionResult[]>([]);
  const [termStats, setTermStats] = useState<JdTermStats[]>([]);
  const [explanationType, setExplanationType] = useState<ExplanationType>('hr');
  const [analyzing, setAnalyzing] = useState(false);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data: JdItem = await jdApi.getJdDetail(id);
      setJd(data);
    } catch (err: unknown) {
      logger.error('获取JD详情失败', err);
      setError('加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async () => {
    if (!id) return;
    try {
      const data: JdVersionItem[] = await jdApi.getJdVersions(id);
      setVersions(data || []);
    } catch (err: unknown) {
      logger.error('获取版本历史失败', err);
    }
  };

  const analyzeTerms = async () => {
    if (!id) return;
    setAnalyzing(true);
    try {
      const analysis = await jdApi.analyzeJdTerms(id);
      setRecognizedTerms(analysis.terms || []);
      setTermStats(analysis.stats || []);
    } catch (err: unknown) {
      logger.error('术语识别失败', err);
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    fetchVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (jd && jd.content) {
      // Try recognize terms for the content using analyze endpoint
      analyzeTerms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jd?.id]);

  const handleBack = () => {
    navigate('/jd');
  };

  const handleEdit = () => {
    if (!id) return;
    navigate(`/jd/${id}/edit`);
  };

  const handleCreateRecruitment = async () => {
    if (!id || !jd) return;
    try {
      const newPosition = await recruitmentApi.createRecruitment({
        title: jd.title,
        projectGroup: jd.projectGroup,
        category: jd.category,
        jdId: jd.id,
        priority: 'p2',
        headCount: 1,
        stage: 'pending',
      });
      toast.success('已创建在招岗位');
      navigate(`/recruitment/${newPosition.id}`);
    } catch (err: unknown) {
      logger.error('创建在招岗位失败', err);
      toast.error('创建失败，请稍后重试');
    }
  };

  const handleDuplicate = async () => {
    if (!id) return;
    try {
      const newJd: JdItem = await jdApi.duplicateJd(id);
      navigate(`/jd/${newJd.id}`);
    } catch (err: unknown) {
      logger.error('复制JD失败', err);
    }
  };

  const handleDelete = async () => {
    if (!id || !jd) return;
    const confirmed: boolean = await showConfirm(
      jd.isArchived
        ? '确定要恢复这个JD吗？'
        : '确定要归档这个JD吗？归档后可在列表筛选中找到并恢复。',
    );
    if (!confirmed) return;
    try {
      if (jd.isArchived) {
        await jdApi.restoreJd(id);
      } else {
        await jdApi.updateJd(id, { isArchived: true });
      }
      navigate('/jd');
    } catch (err: unknown) {
      logger.error('操作失败', err);
    }
  };

  const handlePermanentDelete = async () => {
    if (!id) return;
    const confirmed: boolean = await showConfirm('确定要删除这个岗位JD吗？此操作不可恢复。');
    if (!confirmed) return;
    try {
      await jdApi.deleteJd(id);
      toast.success('删除成功');
      navigate('/jd');
    } catch (err: unknown) {
      logger.error('删除失败', err);
      const msg: string =
        (err as { response?: { data?: { error?: { message?: string } } } })
          .response?.data?.error?.message || '删除失败，请稍后重试';
      toast.error(msg);
    }
  };

  const handleViewVersion = async (versionId: string) => {
    if (!id) return;
    setVersionLoading(true);
    try {
      const v: JdVersionItem = await jdApi.getJdVersion(id, versionId);
      setSelectedVersionId(versionId);
      setVersionContent(v.content);
    } catch (err: unknown) {
      logger.error('获取版本详情失败', err);
    } finally {
      setVersionLoading(false);
    }
  };

  const handleCloseVersion = () => {
    setSelectedVersionId(null);
    setVersionContent('');
  };

  const handleRollback = async (versionId: string) => {
    if (!id) return;
    const confirmed: boolean = await showConfirm('确定要回滚到此版本吗？');
    if (!confirmed) return;
    try {
      await jdApi.rollbackJd(id, versionId);
      setSelectedVersionId(null);
      setVersionContent('');
      fetchDetail();
      fetchVersions();
    } catch (err: unknown) {
      logger.error('回滚失败', err);
    }
  };

  const displayContent: string = selectedVersionId ? versionContent : jd?.content || '';

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

  if (error || !jd) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-red-500 mb-4">{error || '未找到该JD'}</p>
          <button
            onClick={handleBack}
            className="text-primary hover:underline"
          >
            返回列表
          </button>
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
            <h1 className="text-2xl font-bold text-gray-900">{jd.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              版本 v{jd.version}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDuplicate}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Copy size={16} />
            复制
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            {jd.isArchived ? (
              <>
                <RotateCcw size={16} />
                恢复
              </>
            ) : (
              <>
                <Archive size={16} />
                归档
              </>
            )}
          </button>
          <button
            onClick={handlePermanentDelete}
            className="inline-flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            <Trash2 size={16} />
            删除
          </button>
          <button
            onClick={handleCreateRecruitment}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            <ArrowRight size={16} />
            设为在招岗位
          </button>
          <button
            onClick={handleEdit}
            className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            <Edit size={16} />
            编辑
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Info Bar */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex flex-wrap items-center gap-4 gap-y-2">
              <span
                className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-md border ${CATEGORY_COLORS[jd.category] || ''}`}
              >
                {JD_CATEGORY_LABELS[jd.category] || jd.category}
              </span>
              {jd.department && (
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <Tag size={14} />
                  {jd.department}
                </span>
              )}
              <span
                className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[jd.status] || ''}`}
              >
                {STATUS_LABELS[jd.status] || jd.status}
              </span>
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <BookOpen size={14} />
                v{jd.version}
              </span>
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Clock size={14} />
                {formatDateTime(jd.updatedAt)}
              </span>
            </div>

            {jd.techStack && jd.techStack.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500">技术栈：</span>
                {jd.techStack.map((tech: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full border border-blue-100"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}

            {jd.tags && jd.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-sm text-gray-500">标签：</span>
                {jd.tags.map((tag: string, idx: number) => (
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

          {/* Term explanation toggle */}
          {recognizedTerms.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 px-5 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                共识别到 <span className="font-medium text-primary">{recognizedTerms.length}</span> 个术语
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">术语解释版本：</span>
                <div className="flex rounded-md border border-gray-300 overflow-hidden">
                  <button
                    onClick={() => setExplanationType('hr')}
                    className={`px-3 py-1 text-sm transition-colors ${
                      explanationType === 'hr'
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    HR版
                  </button>
                  <button
                    onClick={() => setExplanationType('tech')}
                    className={`px-3 py-1 text-sm transition-colors ${
                      explanationType === 'tech'
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    技术版
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* JD Content */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {selectedVersionId && (
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-md">
                  正在查看历史版本
                </span>
                <button
                  onClick={handleCloseVersion}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  返回最新版本
                </button>
              </div>
            )}
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              JD内容
              {analyzing && (
                <span className="text-xs font-normal text-gray-400 ml-2">
                  (术语识别中...)
                </span>
              )}
            </h2>
            {versionLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : displayContent ? (
              <HighlightedContent
                content={displayContent}
                terms={recognizedTerms}
                explanationType={explanationType}
              />
            ) : (
              <p className="text-gray-400">暂无内容</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Version History */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock size={16} />
              版本历史
            </h3>
            <div className="space-y-3 max-h-[360px] overflow-y-auto">
              {versions.length === 0 ? (
                <p className="text-sm text-gray-400">暂无版本记录</p>
              ) : (
                versions.map((v: JdVersionItem) => (
                  <div
                    key={v.id}
                    className={`p-3 rounded-md border cursor-pointer transition-colors ${
                      selectedVersionId === v.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleViewVersion(v.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        v{v.version}
                      </span>
                      {selectedVersionId === v.id && (
                        <button
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleRollback(v.id);
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          回滚
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-1">
                      {v.changeNote || '无版本说明'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDateTime(v.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Term Stats */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen size={16} />
              术语统计
            </h3>
            {analyzing && termStats.length === 0 ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : termStats.length === 0 ? (
              <p className="text-sm text-gray-400">暂无识别到的术语</p>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {termStats.map((stat: JdTermStats) => (
                  <div
                    key={stat.termId}
                    className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50"
                  >
                    <span className="text-sm text-gray-700 truncate flex-1">
                      {stat.termName}
                    </span>
                    <span className="text-xs text-gray-400 ml-2 shrink-0">
                      {TERM_CATEGORY_LABELS[stat.category] || stat.category}
                    </span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-2 shrink-0">
                      {stat.count}次
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JdDetailPage;
