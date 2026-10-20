import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  TemplateListParams,
  TemplateListResponse,
  JdTemplateItem,
  CreateTemplateDto,
  UpdateTemplateDto,
  ImportConfirmResponse,
} from '@shared/api.interface';

export async function getTemplateList(
  params: TemplateListParams,
): Promise<TemplateListResponse> {
  logger.debug('getTemplateList', params);
  const res = await axiosForBackend.get<TemplateListResponse>('/api/templates', {
    params,
  });
  return res.data;
}

export async function getTemplateDetail(id: string): Promise<JdTemplateItem> {
  logger.debug('getTemplateDetail', id);
  const res = await axiosForBackend.get<JdTemplateItem>(`/api/templates/${id}`);
  return res.data;
}

export async function createTemplate(data: CreateTemplateDto): Promise<JdTemplateItem> {
  logger.debug('createTemplate', data);
  const res = await axiosForBackend.post<JdTemplateItem>('/api/templates', data);
  return res.data;
}

export async function updateTemplate(
  id: string,
  data: UpdateTemplateDto,
): Promise<JdTemplateItem> {
  logger.debug('updateTemplate', id, data);
  const res = await axiosForBackend.patch<JdTemplateItem>(
    `/api/templates/${id}`,
    data,
  );
  return res.data;
}

export async function deleteTemplate(id: string): Promise<void> {
  logger.debug('deleteTemplate', id);
  await axiosForBackend.delete(`/api/templates/${id}`);
}

export async function applyTemplate(id: string): Promise<JdTemplateItem> {
  logger.debug('applyTemplate', id);
  const res = await axiosForBackend.post<JdTemplateItem>(
    `/api/templates/${id}/apply`,
  );
  return res.data;
}

export async function batchImportTemplates(
  items: CreateTemplateDto[],
): Promise<ImportConfirmResponse> {
  logger.debug('batchImportTemplates', items.length);
  const res = await axiosForBackend.post<ImportConfirmResponse>('/api/templates/batch/import', {
    items,
  });
  return res.data;
}
