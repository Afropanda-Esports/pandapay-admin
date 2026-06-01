import { NextRequest, NextResponse } from 'next/server';

import {
  ADMIN_ROLE_COOKIE,
  ADMIN_TOKEN_COOKIE,
  getApiBaseUrl,
} from '@/lib/auth/session';

async function proxy(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await context.params;
  const token = req.cookies.get(ADMIN_TOKEN_COOKIE)?.value;

  const upstreamUrl = new URL(path.join('/'), `${getApiBaseUrl()}/`);
  upstreamUrl.search = req.nextUrl.search;

  const headers = new Headers();
  const contentType = req.headers.get('content-type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const body = hasBody ? await req.text() : undefined;

  const upstream = await fetch(upstreamUrl, {
    method: req.method,
    headers,
    body: body && body.length > 0 ? body : undefined,
    cache: 'no-store',
  });

  if (upstream.status === 401 && token) {
    const res = NextResponse.json(
      { message: 'Session expired' },
      { status: 401 },
    );
    const clear = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
      maxAge: 0,
    };
    res.cookies.set(ADMIN_TOKEN_COOKIE, '', clear);
    res.cookies.set(ADMIN_ROLE_COOKIE, '', clear);
    return res;
  }

  const responseHeaders = new Headers();
  const upstreamType = upstream.headers.get('content-type');
  if (upstreamType) {
    responseHeaders.set('Content-Type', upstreamType);
  }

  if (upstream.status === 204) {
    return new NextResponse(null, { status: 204, headers: responseHeaders });
  }

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(req, context);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(req, context);
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(req, context);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(req, context);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(req, context);
}
