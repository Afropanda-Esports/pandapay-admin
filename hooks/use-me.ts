'use client';

import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/lib/api/me';

/**
 * Fetches the authenticated admin's own profile.
 * Cached globally — every component that needs identity (header, sidebar,
 * admins page, audit log) hits the same query.
 */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    staleTime: 5 * 60_000,
    retry: false,
  });
}
