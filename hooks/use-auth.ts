'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { logout as logoutApi } from '@/lib/api/auth';

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const logout = async () => {
    try {
      await logoutApi();
    } finally {
      queryClient.clear();
      router.push('/login');
    }
  };

  return { logout };
}
