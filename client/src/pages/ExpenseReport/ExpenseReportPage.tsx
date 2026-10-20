import { ExternalLink, FileSpreadsheet } from 'lucide-react';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

const FEISHU_URL = 'https://taiyouxi.feishu.cn/sheets/shtcnQLY4RpddFYmHN1vDD1yu5f?sheet=0AWigw';

const ExpenseReportPage = () => {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-8 md:p-12 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6">
              <FileSpreadsheet size={32} className="text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              招聘费用汇总表
            </h1>
            <p className="text-gray-500 mb-8 max-w-md">
              点击下方按钮打开飞书表格查看和编辑招聘费用明细
            </p>
            <UniversalLink
              to={FEISHU_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <ExternalLink size={18} />
              打开飞书表格
            </UniversalLink>
          </div>

          <div className="mt-10 pt-8 border-t border-gray-100">
            <p className="text-sm text-gray-400 text-center">
              表格支持在线协作编辑，数据实时同步
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseReportPage;
