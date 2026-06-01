import { NextRequest, NextResponse } from 'next/server';

import { ADMIN_ROLE_COOKIE, ADMIN_TOKEN_COOKIE } from '@/lib/auth/session';

const PROTECTED_PATHS = [
  '/dashboard',
  '/users',
  '/orders',
  '/products',
  '/audit',
  '/admins',
  '/pricing',
  '/fraud',
  '/change-password',
];

const SUPER_ADMIN_ONLY_PATHS = ['/admins'];

export function proxy(req: NextRequest) {
  const token = req.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
  const role = req.cookies.get(ADMIN_ROLE_COOKIE)?.value;
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected && !token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    SUPER_ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p)) &&
    role !== 'SUPER_ADMIN'
  ) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/users/:path*',
    '/orders/:path*',
    '/products/:path*',
    '/audit/:path*',
    '/admins/:path*',
    '/pricing/:path*',
    '/fraud/:path*',
    '/change-password',
    '/login',
  ],
};
