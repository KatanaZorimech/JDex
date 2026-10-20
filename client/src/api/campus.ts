import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  CampusSchoolListParams,
  CampusSchoolListResponse,
  CampusSchoolItem,
  CreateCampusSchoolRequest,
  UpdateCampusSchoolRequest,
  CampusFairEvent,
} from '@shared/api.interface';

export async function listSchools(
  params: CampusSchoolListParams,
): Promise<CampusSchoolListResponse> {
  logger.debug('listSchools', params);
  const res = await axiosForBackend.get<CampusSchoolListResponse>('/api/campus/schools', {
    params,
  });
  return res.data;
}

export async function getSchool(id: string): Promise<CampusSchoolItem> {
  logger.debug('getSchool', id);
  const res = await axiosForBackend.get<CampusSchoolItem>(`/api/campus/schools/${id}`);
  return res.data;
}

export async function createSchool(
  data: CreateCampusSchoolRequest,
): Promise<CampusSchoolItem> {
  logger.debug('createSchool', data);
  const res = await axiosForBackend.post<CampusSchoolItem>(
    '/api/campus/schools',
    data,
  );
  return res.data;
}

export async function updateSchool(
  id: string,
  data: UpdateCampusSchoolRequest,
): Promise<CampusSchoolItem> {
  logger.debug('updateSchool', id, data);
  const res = await axiosForBackend.patch<CampusSchoolItem>(
    `/api/campus/schools/${id}`,
    data,
  );
  return res.data;
}

export async function deleteSchool(id: string): Promise<void> {
  logger.debug('deleteSchool', id);
  await axiosForBackend.delete(`/api/campus/schools/${id}`);
}

export async function getFairCalendar(
  year: number,
  month: number,
): Promise<CampusFairEvent[]> {
  logger.debug('getFairCalendar', year, month);
  const res = await axiosForBackend.get<CampusFairEvent[]>(
    '/api/campus/schools/fair-calendar',
    { params: { year, month } },
  );
  return res.data;
}

export const campusApi = {
  listSchools,
  getSchool,
  createSchool,
  updateSchool,
  deleteSchool,
  getFairCalendar,
};
