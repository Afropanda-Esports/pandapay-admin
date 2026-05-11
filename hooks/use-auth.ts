'use client';

import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

const TOKEN_KEY = 'admin_token';

export function useAuth() {
  const router = useRouter();

  const getToken = (): string | null => Cookies.get(TOKEN_KEY) ?? null;

  const saveToken = (token: string) => {
    Cookies.set(TOKEN_KEY, token, {
      expires: 1,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });
  };

  const logout = () => {
    Cookies.remove(TOKEN_KEY);
    router.push('/login');
  };

  const isLoggedIn = () => !!getToken();

  return { getToken, saveToken, logout, isLoggedIn };
}
