import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader2, Check } from 'lucide-react';
import { logger } from '@lark-apaas/client-toolkit/logger';

export interface ImportPreviewItem {
  rowIndex: number;
  valid: boolean;
  error?: string;
}

interface BatchImportModalProps<T extends ImportPreviewItem> {
  open: boolean;
  onClose: () => void;
  title: string;
  acceptFormats: string;
  formatDescription: string;
  parseFile: (file: File) => Promise<T[]>;
  importItems: (items: T[]) => Promise<{ successCount: number; failedCount: number; errors: { rowIndex: number; error: string }[] }>;
  onSuccess: () => void;
  renderPreviewTable: (items: T[], selected: Set<number>, onToggle: (idx: number) => void, selectAll: boolean, onToggleAll: () => void) => React.ReactNode;
  getPreviewTitle: (item: T) => string;
}

export function BatchImportModal<T extends ImportPreviewItem>({
  open,
  onClose,
  title,
  acceptFormats,
  formatDescription,
  parseFile,
  importItems,
  onSuccess,
  renderPreviewTable,
}: BatchImportModalProps<T>) {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewItems, setPreviewItems] = useState<T[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [importResult, setImportResult] = useState<{ successCount: number; failedCount: number } | null>(null);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setStep('upload');
      setFileName('');
      setPreviewItems([]);
      setSelectedIndexes(new Set());
      setImportResult(null);
      setError('');
    }
  }, [open]);

  const handleFile = useCallback(async (file: File) => {
    setError('');
    setParsing(true);
    setFileName(file.name);
    try {
      const items = await parseFile(file);
      setPreviewItems(items);
      const validIndexes = new Set<number>();
      items.forEach((item, idx) => {
        if (item.valid) validIndexes.add(idx);
      });
      setSelectedIndexes(validIndexes);
      setStep('preview');
    } catch (err: unknown) {
      logger.error('解析文件失败', err);
      setError(err instanceof Error ? err.message : '文件解析失败');
    } finally {
      setParsing(false);
    }
  }, [parseFile]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const toggleSelect = (idx: number) => {
    const next = new Set(selectedIndexes);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setSelectedIndexes(next);
  };

  const selectAllValid = () => {
    const allValid = new Set<number>();
    previewItems.forEach((item, idx) => {
      if (item.valid) allValid.add(idx);
    });
    const allSelected = previewItems.every((item, idx) => item.valid && selectedIndexes.has(idx));
    if (allSelected) {
      setSelectedIndexes(new Set());
    } else {
      setSelectedIndexes(allValid);
    }
  };

  const allValidSelected = previewItems.length > 0
    && previewItems.every((item, idx) => !item.valid || selectedIndexes.has(idx));

  const validCount = previewItems.filter((i) => i.valid).length;
  const invalidCount = previewItems.filter((i) => !i.valid).length;

  const handleImport = async () => {
    const selectedItems = previewItems.filter((_, idx) => selectedIndexes.has(idx));
    if (selectedItems.length === 0) return;

    setImporting(true);
    setError('');
    try {
      const result = await importItems(selectedItems);
      setImportResult(result);
      setStep('result');
      if (result.successCount > 0) {
        onSuccess();
      }
    } catch (err: unknown) {
      logger.error('批量导入失败', err);
      setError(err instanceof Error ? err.message : '导入失败');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (importing) return;
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-500"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        {step === 'upload' && (
          <div className="p-6 space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptFormats}
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                  <Upload size={28} className="text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-medium text-gray-900">
                    {parsing ? '正在解析文件...' : '拖拽文件到此处，或点击选择文件'}
                  </p>
                  <p className="text-sm text-gray-500">
                    支持格式：{formatDescription}
                  </p>
                </div>
                {parsing && (
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600 flex items-start gap-2">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600">
                  文件名：<span className="font-medium text-gray-900">{fileName}</span>
                </span>
                <span className="text-gray-600">
                  共 <span className="font-medium text-gray-900">{previewItems.length}</span> 条
                </span>
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle size={14} />
                  {validCount} 条有效
                </span>
                {invalidCount > 0 && (
                  <span className="text-red-600 flex items-center gap-1">
                    <AlertCircle size={14} />
                    {invalidCount} 条异常
                  </span>
                )}
              </div>
              <button
                onClick={() => setStep('upload')}
                className="text-sm text-primary hover:underline"
              >
                重新选择文件
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {renderPreviewTable(
                previewItems,
                selectedIndexes,
                toggleSelect,
                allValidSelected,
                selectAllValid,
              )}
            </div>
          </div>
        )}

        {step === 'result' && importResult && (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <Check size={32} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">导入完成</h3>
              <p className="text-sm text-gray-500">
                共 {importResult.successCount + importResult.failedCount} 条数据
              </p>
            </div>
            <div className="flex justify-center gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{importResult.successCount}</div>
                <div className="text-sm text-gray-500 mt-1">成功</div>
              </div>
              {importResult.failedCount > 0 && (
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-500">{importResult.failedCount}</div>
                  <div className="text-sm text-gray-500 mt-1">失败</div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          {step === 'upload' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              取消
            </button>
          )}
          {step === 'preview' && (
            <>
              <button
                onClick={handleClose}
                disabled={importing}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={importing || selectedIndexes.size === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing && <Loader2 size={16} className="animate-spin" />}
                {importing ? '导入中...' : `确认导入（${selectedIndexes.size} 条）`}
              </button>
            </>
          )}
          {step === 'result' && (
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-primary text-white text-sm rounded-md hover:bg-primary/90 transition-colors"
            >
              完成
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BatchImportModal;
