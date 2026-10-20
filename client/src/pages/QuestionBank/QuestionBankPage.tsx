import { ExternalLink, FolderOpen } from 'lucide-react';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

const FEISHU_URL = 'https://taiyouxi.feishu.cn/drive/folder/fldcno3PYJjABN6sWMyeIYfuXzh?from=from_copylink';

const QuestionBankPage = () => {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-8 md:p-12 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-6">
              <FolderOpen size={32} className="text-violet-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              笔试题库
            </h1>
            <p className="text-gray-500 mb-8 max-w-md">
              所有笔试题都存放在飞书云文件夹中，点击进入查看和管理
            </p>
            <UniversalLink
              to={FEISHU_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <ExternalLink size={18} />
              打开笔试题文件夹
            </UniversalLink>
          </div>

          <div className="mt-10 pt-8 border-t border-gray-100">
            <p className="text-sm text-gray-400 text-center">
              按岗位类别分类整理，支持在线预览和下载
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionBankPage;
