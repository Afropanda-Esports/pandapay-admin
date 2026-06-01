import { apiFetch } from './client';

export interface FraudEvent {
  id: string;
  orderId: string | null;
  userId: string | null;
  signalType: string;
  riskScore: number;
  narrative: string | null;
  action: 'PASS' | 'REVIEW' | 'BLOCK';
  resolution: 'PENDING' | 'APPROVED' | 'REJECTED';
  providerRef: string | null;
  createdAt: string;
}

export interface FraudListResponse {
  data: FraudEvent[];
  total: number;
  page: number;
  limit: number;
}

export function listFraudEvents(page = 1, limit = 20) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  return apiFetch<FraudListResponse>(`/admin/fraud-events?${q}`);
}

export function approveFraudEvent(id: string) {
  return apiFetch<FraudEvent>(`/admin/fraud-events/${id}/approve`, {
    method: 'PATCH',
  });
}

export function rejectFraudEvent(id: string) {
  return apiFetch<FraudEvent>(`/admin/fraud-events/${id}/reject`, {
    method: 'PATCH',
  });
}
