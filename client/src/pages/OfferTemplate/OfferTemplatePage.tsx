import { ExternalLink, FileCheck } from 'lucide-react';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';

const MOKA_URL = 'https://app.mokahr.com/settings/offer_template';

const OfferTemplatePage = () => {
  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm md:p-12">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-indigo-50">
              <FileCheck size={32} className="text-indigo-600" />
            </div>
            <h1 className="mb-3 text-2xl font-bold text-gray-900">Offer模板</h1>
            <p className="mb-8 max-w-md text-gray-500">
              Offer模板都在Moka系统中管理，点击下方按钮查看和编辑
            </p>
            <UniversalLink
              to={MOKA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white shadow-sm transition-colors hover:bg-primary/90"
            >
              <ExternalLink size={18} />
              打开Moka Offer模板
            </UniversalLink>
          </div>

          <div className="mt-10 border-t border-gray-100 pt-8">
            <p className="text-center text-sm text-gray-400">
              模板修改后请通知HR团队，确保发放版本统一
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferTemplatePage;
