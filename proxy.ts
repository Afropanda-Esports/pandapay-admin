import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PATHS = [
  '/dashboard',
  '/users',
  '/orders',
  '/products',
  '/audit',
];

export function proxy(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value;
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected && !token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
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
    '/login',
  ],
};
