import { apiFetch } from './client';
import type { Order, PaginatedResponse } from '@/lib/types';

export const listManualPayments = (page = 1, limit = 20) =>
  apiFetch<Pick<PaginatedResponse<Order>, 'data' | 'total'>>(
    `/admin/manual-payments?page=${page}&limit=${limit}`,
  );

export const confirmManualPayment = (
  orderId: string,
  input: { amountNaira: string; bankReference: string; note?: string },
) =>
  apiFetch<{ status: 'confirmed' | 'already_confirmed' }>(
    `/admin/manual-payments/${orderId}/confirm`,
    { method: 'POST', body: JSON.stringify(input) },
  );

export interface ManualPaymentBank { code: string; name: string }
export interface ManualPaymentSettings {
  bankCode: string; bankName: string; accountNumber: string; accountName: string; updatedAt: string;
}

export const listManualPaymentBanks = () => apiFetch<ManualPaymentBank[]>('/admin/manual-payments/banks');
export const getManualPaymentSettings = () => apiFetch<ManualPaymentSettings | null>('/admin/manual-payments/settings');
export const updateManualPaymentSettings = (input: { bankCode: string; accountNumber: string; accountName: string; currentPassword: string }) =>
  apiFetch<ManualPaymentSettings>('/admin/manual-payments/settings', { method: 'PUT', body: JSON.stringify(input) });
