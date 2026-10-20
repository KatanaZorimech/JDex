import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  JdListParams,
  JdListResponse,
  JdItem,
  JdVersionItem,
  CreateJdDto,
  UpdateJdDto,
  JdTermAnalysis,
  ImportConfirmResponse,
} from '@shared/api.interface';

export async function getJdList(params: JdListParams): Promise<JdListResponse> {
  logger.debug('getJdList', params);
  const res = await axiosForBackend.get<JdListResponse>('/api/jd', { params });
  return res.data;
}

export async function getJdDetail(id: string): Promise<JdItem> {
  logger.debug('getJdDetail', id);
  const res = await axiosForBackend.get<JdItem>(`/api/jd/${id}`);
  return res.data;
}

export async function createJd(data: CreateJdDto): Promise<JdItem> {
  logger.debug('createJd', data);
  const res = await axiosForBackend.post<JdItem>('/api/jd', data);
  return res.data;
}

export async function updateJd(id: string, data: UpdateJdDto): Promise<JdItem> {
  logger.debug('updateJd', id, data);
  const res = await axiosForBackend.patch<JdItem>(`/api/jd/${id}`, data);
  return res.data;
}

export async function deleteJd(id: string): Promise<void> {
  logger.debug('deleteJd', id);
  await axiosForBackend.delete(`/api/jd/${id}`);
}

export async function restoreJd(id: string): Promise<JdItem> {
  logger.debug('restoreJd', id);
  const res = await axiosForBackend.post<JdItem>(`/api/jd/${id}/restore`);
  return res.data;
}

export async function duplicateJd(id: string): Promise<JdItem> {
  logger.debug('duplicateJd', id);
  const res = await axiosForBackend.post<JdItem>(`/api/jd/${id}/duplicate`);
  return res.data;
}

export async function getJdVersions(id: string): Promise<JdVersionItem[]> {
  logger.debug('getJdVersions', id);
  const res = await axiosForBackend.get<JdVersionItem[]>(`/api/jd/${id}/versions`);
  return res.data;
}

export async function getJdVersion(id: string, versionId: string): Promise<JdVersionItem> {
  logger.debug('getJdVersion', id, versionId);
  const res = await axiosForBackend.get<JdVersionItem>(
    `/api/jd/${id}/versions/${versionId}`,
  );
  return res.data;
}

export async function rollbackJd(id: string, versionId: string): Promise<JdItem> {
  logger.debug('rollbackJd', id, versionId);
  const res = await axiosForBackend.post<JdItem>(
    `/api/jd/${id}/rollback/${versionId}`,
  );
  return res.data;
}

export async function analyzeJdTerms(id: string): Promise<JdTermAnalysis> {
  logger.debug('analyzeJdTerms', id);
  const res = await axiosForBackend.post<JdTermAnalysis>(
    `/api/jd/${id}/analyze-terms`,
  );
  return res.data;
}

export async function batchImportJd(
  items: CreateJdDto[],
): Promise<ImportConfirmResponse> {
  logger.debug('batchImportJd', items.length);
  const res = await axiosForBackend.post<ImportConfirmResponse>('/api/jd/batch/import', {
    items,
  });
  return res.data;
}
