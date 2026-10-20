import { ExternalLink, FolderOpen } from 'lucide-react';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

const FEISHU_URL =
  'https://taiyouxi.feishu.cn/sheets/shtcnZPTY5mOCJ65xSDpSOnqApd?sheet=0rjobW';

const CampusResourcesPage = () => {
  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm md:p-12">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-emerald-50">
              <FolderOpen size={32} className="text-emerald-600" />
            </div>
            <h1 className="mb-3 text-2xl font-bold text-gray-900">
              校招其他资料
            </h1>
            <p className="mb-8 max-w-md text-gray-500">
              校招相关的其他资料都整理在飞书表格中，点击下方按钮打开查看
            </p>
            <UniversalLink
              to={FEISHU_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white shadow-sm transition-colors hover:bg-primary/90"
            >
              <ExternalLink size={18} />
              打开飞书表格
            </UniversalLink>
          </div>

          <div className="mt-10 border-t border-gray-100 pt-8">
            <p className="text-center text-sm text-gray-400">
              资料持续更新中，如有补充请联系校招负责人
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampusResourcesPage;
