import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  OfferItem,
  OfferListParams,
  OfferListResponse,
  OfferStatsResponse,
  CreateOfferRequest,
  UpdateOfferRequest,
  ImportConfirmResponse,
} from '@shared/api.interface';

export async function getOfferList(params: OfferListParams): Promise<OfferListResponse> {
  const { data } = await axiosForBackend.get('/api/offers', { params });
  return data;
}

export async function getOfferStats(params?: {
  projectGroup?: string;
  year?: number;
}): Promise<OfferStatsResponse> {
  const { data } = await axiosForBackend.get('/api/offers/stats', { params });
  return data;
}

export async function getOfferById(id: string): Promise<OfferItem> {
  const { data } = await axiosForBackend.get(`/api/offers/${id}`);
  return data;
}

export async function createOffer(payload: CreateOfferRequest): Promise<OfferItem> {
  const { data } = await axiosForBackend.post('/api/offers', payload);
  return data;
}

export async function updateOffer(
  id: string,
  payload: UpdateOfferRequest,
): Promise<OfferItem> {
  const { data } = await axiosForBackend.patch(`/api/offers/${id}`, payload);
  return data;
}

export async function deleteOffer(id: string): Promise<void> {
  await axiosForBackend.delete(`/api/offers/${id}`);
}

export async function batchImportOffer(items: CreateOfferRequest[]): Promise<ImportConfirmResponse> {
  const { data } = await axiosForBackend.post('/api/offers/batch/import', { items });
  return data;
}
