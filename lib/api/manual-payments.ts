import { apiFetch } from './client';
export interface ManualPaymentQueueRow {
  orderRef: string;
  customerPhone: string | null;
  productName: string;
  expectedAmount: string;
  netReceived: string;
  paymentCount: number;
  settlement: string;
  attemptStatus: string;
  /** PAY-018: the name on the sending bank account, as reported by the
   * customer — replaces `bankReference` for new claims (kept below for
   * historical rows from before the switch). */
  senderName: string | null;
  bankReference: string | null;
  claimedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface ManualPaymentFilters {
  status?: string;
  settlement?: string;
  orderRef?: string;
  phoneSuffix?: string;
  bankReference?: string;
  senderName?: string;
}

export const listManualPayments = (page = 1, limit = 20, filters: ManualPaymentFilters = {}) => {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  Object.entries(filters).forEach(([key, value]) => value && query.set(key, value));
  return apiFetch<{ data: ManualPaymentQueueRow[]; total: number; page: number; limit: number }>(
    `/admin/manual-payments?${query}`,
  );
};

export const confirmManualPayment = (
  orderId: string,
  input: { amountNaira: string; bankReference: string; note?: string; decisionContext: string },
) =>
  apiFetch<{ status: 'confirmed' | 'underpaid' | 'already_confirmed'; outstanding?: string; excess?: string }>(
    `/admin/manual-payments/${orderId}/confirm`,
    { method: 'POST', body: JSON.stringify(input) },
  );

export const retryManualSettlement = (orderRef: string) =>
  apiFetch<{ status: string }>(`/admin/manual-payments/${orderRef}/retry-settlement`, { method: 'POST' });

export interface ManualPaymentBank { code: string; name: string }
export interface ManualPaymentSettings {
  bankCode: string; bankName: string; accountNumber: string; accountName: string; updatedAt: string;
}

export const listManualPaymentBanks = () => apiFetch<ManualPaymentBank[]>('/admin/manual-payments/banks');
export const getManualPaymentSettings = () => apiFetch<ManualPaymentSettings | null>('/admin/manual-payments/settings');
export const updateManualPaymentSettings = (input: { bankCode: string; accountNumber: string; accountName: string; currentPassword: string }) =>
  apiFetch<ManualPaymentSettings>('/admin/manual-payments/settings', { method: 'PUT', body: JSON.stringify(input) });
