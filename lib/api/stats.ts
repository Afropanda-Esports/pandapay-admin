import { apiFetch } from './client';
import type { Stats } from '@/lib/types';

export const getStats = () => apiFetch<Stats>('/admin/stats');
