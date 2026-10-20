import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  RecruitmentListParams,
  RecruitmentListResponse,
  RecruitmentPositionItem,
  CreateRecruitmentDto,
  UpdateRecruitmentDto,
  RecruitmentStats,
} from '@shared/api.interface';

export async function getRecruitmentList(
  params: RecruitmentListParams,
): Promise<RecruitmentListResponse> {
  logger.debug('getRecruitmentList', params);
  const res = await axiosForBackend.get<RecruitmentListResponse>('/api/recruitment', {
    params,
  });
  return res.data;
}

export async function getRecruitmentStats(): Promise<RecruitmentStats> {
  logger.debug('getRecruitmentStats');
  const res = await axiosForBackend.get<RecruitmentStats>('/api/recruitment/stats');
  return res.data;
}

export async function getRecruitmentDetail(id: string): Promise<RecruitmentPositionItem> {
  logger.debug('getRecruitmentDetail', id);
  const res = await axiosForBackend.get<RecruitmentPositionItem>(`/api/recruitment/${id}`);
  return res.data;
}

export async function createRecruitment(
  data: CreateRecruitmentDto,
): Promise<RecruitmentPositionItem> {
  logger.debug('createRecruitment', data);
  const res = await axiosForBackend.post<RecruitmentPositionItem>(
    '/api/recruitment',
    data,
  );
  return res.data;
}

export async function updateRecruitment(
  id: string,
  data: UpdateRecruitmentDto,
): Promise<RecruitmentPositionItem> {
  logger.debug('updateRecruitment', id, data);
  const res = await axiosForBackend.patch<RecruitmentPositionItem>(
    `/api/recruitment/${id}`,
    data,
  );
  return res.data;
}

export async function deleteRecruitment(id: string): Promise<void> {
  logger.debug('deleteRecruitment', id);
  await axiosForBackend.delete(`/api/recruitment/${id}`);
}

export async function createFromJd(
  jdId: string,
  data: Partial<CreateRecruitmentDto>,
): Promise<RecruitmentPositionItem> {
  logger.debug('createFromJd', jdId, data);
  const res = await axiosForBackend.post<RecruitmentPositionItem>(
    '/api/recruitment',
    { jdId, ...data },
  );
  return res.data;
}
