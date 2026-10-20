import { ExternalLink, FileText } from 'lucide-react';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

const FEISHU_URL = 'https://taiyouxi.feishu.cn/file/X5UFbSFAToA1TQxWF5Cc22C8nec';

const PositionNameTablePage = () => {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-8 md:p-12 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
              <FileText size={32} className="text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              招聘职位分类&amp;名称表
            </h1>
            <p className="text-gray-500 mb-8 max-w-md">
              公司统一的职位分类和名称规范，存放在飞书文档中
            </p>
            <UniversalLink
              to={FEISHU_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <ExternalLink size={18} />
              打开职位名称表
            </UniversalLink>
          </div>

          <div className="mt-10 pt-8 border-t border-gray-100">
            <p className="text-sm text-gray-400 text-center">
              新增职位前请先查阅此文档，确保名称规范统一
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PositionNameTablePage;
