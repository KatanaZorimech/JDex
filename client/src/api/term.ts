import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  TermListParams,
  TermListResponse,
  TermItem,
  CreateTermDto,
  UpdateTermDto,
  TermRecognitionResult,
  ImportConfirmResponse,
} from '@shared/api.interface';

export interface TermCategoryStats {
  category: string;
  count: number;
}

export async function getTermList(params: TermListParams): Promise<TermListResponse> {
  logger.debug('getTermList', params);
  const res = await axiosForBackend.get<TermListResponse>('/api/terms', { params });
  return res.data;
}

export async function getAllTerms(): Promise<TermItem[]> {
  logger.debug('getAllTerms');
  const res = await axiosForBackend.get<TermItem[]>('/api/terms/all');
  return res.data;
}

export async function getTermDetail(id: string): Promise<TermItem> {
  logger.debug('getTermDetail', id);
  const res = await axiosForBackend.get<TermItem>(`/api/terms/${id}`);
  return res.data;
}

export async function createTerm(data: CreateTermDto): Promise<TermItem> {
  logger.debug('createTerm', data);
  const res = await axiosForBackend.post<TermItem>('/api/terms', data);
  return res.data;
}

export async function updateTerm(id: string, data: UpdateTermDto): Promise<TermItem> {
  logger.debug('updateTerm', id, data);
  const res = await axiosForBackend.patch<TermItem>(`/api/terms/${id}`, data);
  return res.data;
}

export async function deleteTerm(id: string): Promise<void> {
  logger.debug('deleteTerm', id);
  await axiosForBackend.delete(`/api/terms/${id}`);
}

export async function batchCreateTerms(data: CreateTermDto[]): Promise<TermItem[]> {
  logger.debug('batchCreateTerms', data);
  const res = await axiosForBackend.post<TermItem[]>('/api/terms/batch', data);
  return res.data;
}

export async function batchImportTerms(
  items: CreateTermDto[],
): Promise<ImportConfirmResponse> {
  logger.debug('batchImportTerms', items.length);
  const res = await axiosForBackend.post<ImportConfirmResponse>('/api/terms/batch/import', {
    items,
  });
  return res.data;
}

export async function recognizeTerms(text: string): Promise<TermRecognitionResult[]> {
  logger.debug('recognizeTerms', text.length);
  const res = await axiosForBackend.post<TermRecognitionResult[]>(
    '/api/terms/recognize',
    { text },
  );
  return res.data;
}

export async function getTermCategoryStats(): Promise<TermCategoryStats[]> {
  logger.debug('getTermCategoryStats');
  const res = await axiosForBackend.get<TermCategoryStats[]>(
    '/api/terms/stats/categories',
  );
  return res.data;
}
