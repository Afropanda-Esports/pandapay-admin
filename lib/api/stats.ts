import { apiFetch } from './client';
import type { Stats } from '@/lib/types';

export { getStatsSeries } from './stats-series';

export const getStats = () => apiFetch<Stats>('/admin/stats');
