# PandaPay Admin Frontend — Implementation Guide

> **Stack:** Next.js **16.2.4** (App Router) · React 19.2 · TypeScript · Tailwind v4 · Shadcn/ui · TanStack Query v5 · Recharts · React Hook Form · Zod
> **Backend dev URL:** `http://localhost:3000` (NestJS)
> **Frontend dev URL:** `http://localhost:3001`
> **Auth:** JWT stored in a cookie (`admin_token`), enforced by Next's `proxy.ts` on every protected route.

**Integration status (2026-05-19):** The app shell and most pages are implemented. See **[INTEGRATION.md](./INTEGRATION.md)** for which API calls succeed vs return 404. Canonical contract: [pandapay-be/INTEGRATION.md](../../pandapay-be/INTEGRATION.md).

---

## Table of Contents

1. [Codebase Status](#1-codebase-status)
2. [Environment Variables](#2-environment-variables)
3. [Folder Structure](#3-folder-structure)
4. [Complete API Reference](#4-complete-api-reference)
5. [TypeScript Types](#5-typescript-types)
6. [API Client Layer](#6-api-client-layer)
7. [Auth — Hook + Proxy (Next 16)](#7-auth--hook--proxy-next-16)
8. [Providers & Root Layout](#8-providers--root-layout)
9. [Admin Shell Layout (Sidebar + Header)](#9-admin-shell-layout-sidebar--header)
10. [Page Implementation Guide](#10-page-implementation-guide)
11. [Charts — Recommendation & Setup](#11-charts--recommendation--setup)
12. [Reusable Components](#12-reusable-components)
13. [Form Patterns](#13-form-patterns)
14. [Error & Loading Patterns](#14-error--loading-patterns)
15. [Backend CORS Change Required](#15-backend-cors-change-required)
16. [Deployment (Vercel)](#16-deployment-vercel)

---

## 1. Codebase Status

**Build state:** Phases 0–8 from [implementation-plan.md](./implementation-plan.md) are **done** — auth, dashboard, products, orders, users, audit, pricing/admins UI shells, and shared components all exist in the repo.

| Concern | Status |
|---|---|
| Next.js | **16.2.4** (App Router) |
| React | **19.2.4** |
| TanStack Query, RHF, Zod, Recharts, nuqs, date-fns, js-cookie | **Installed** (`package.json`) |
| Shadcn/ui primitives | **Installed** under `components/ui/` |
| API clients | `lib/api/*.ts` — see [INTEGRATION.md](./INTEGRATION.md) for BE coverage |
| Routes | `app/login`, `app/(admin)/*`, `app/change-password` |
| Theme | [app/globals.css](../app/globals.css) — light + dark; Satoshi `@font-face` optional |
| Dev port | **3001** (`pnpm dev`) |

### Backend gaps (admin UI ahead of API)

These pages render but call **unimplemented** backend routes: `/pricing`, `/admins`, `/change-password`, user wallet credit/transactions, product pricing PATCH. Details: [INTEGRATION.md](./INTEGRATION.md).

### Missing assets (optional)

Satoshi `.otf` files at `app/assets/satoshi/` are still optional — theme falls back to `sans-serif` without them.

### Next 16 breaking changes you must know

These differ from the Next 14/15 patterns most LLMs and tutorials assume:

1. **`middleware.ts` → `proxy.ts`** at project root. Function exported is `proxy`, not `middleware`. Same `config.matcher` shape. (Old `middleware.ts` still works but is deprecated.) See [§7.2](#72-proxy-nexts-auth-guard).
2. **Dynamic route `params` and `searchParams` are `Promise<...>`.** Must `await` (server component) or `use()` (client component). See [§10.4](#104-user-detail-usersid) for the canonical pattern.
3. **`unstable_instant`** export from a route enables instant navigation — Suspense alone is not enough. Worth adding to `/orders` and `/users` list pages once they ship.

Before starting any phase, skim relevant guides in `node_modules/next/dist/docs/01-app/` if your work touches routing, caching, or proxy.

---

## 2. Environment Variables

Create `.env.local` at project root:

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
# Production:
# NEXT_PUBLIC_API_URL=https://api.pandapay.io
```

**Never** put JWT secrets or admin credentials in `NEXT_PUBLIC_*`. The token lives in a client-side cookie only.

`package.json` `dev` script must run on **port 3001** so backend (3000) and frontend (3001) don't collide:

```json
"scripts": {
  "dev": "next dev --port 3001"
}
```

---

## 3. Folder Structure

The `@/*` import alias resolves to project root (`tsconfig.json` → `"paths": { "@/*": ["./*"] }`), so all imports below are written `@/lib/...`, `@/components/...`, etc.

```
panda-admin/
├── app/
│   ├── layout.tsx                   # Root layout — Providers, Sonner toaster
│   ├── page.tsx                     # Redirect to /dashboard (or /login)
│   ├── globals.css                  # Panda theme (Tailwind v4 @theme + light/dark)
│   ├── assets/
│   │   └── satoshi/                 # Satoshi-Regular.otf etc. (drop in)
│   ├── login/
│   │   └── page.tsx                 # Login form
│   └── (admin)/                     # Route group — all pages require auth
│       ├── layout.tsx               # Admin shell (sidebar + topbar)
│       ├── dashboard/
│       │   └── page.tsx
│       ├── users/
│       │   ├── page.tsx             # User list + search
│       │   └── [id]/
│       │       └── page.tsx         # User detail
│       ├── orders/
│       │   ├── page.tsx             # Order list + filters
│       │   └── [id]/
│       │       └── page.tsx         # Order detail
│       ├── products/
│       │   ├── page.tsx             # Product list + create
│       │   └── [id]/
│       │       └── page.tsx         # Product detail + voucher upload
│       └── audit/
│           └── page.tsx             # Audit log
│
├── lib/
│   ├── types.ts                     # All shared TS interfaces + enums
│   ├── utils.ts                     # cn() helper (added by shadcn init)
│   └── api/
│       ├── client.ts                # Base fetch wrapper (auth header, error handling)
│       ├── auth.ts
│       ├── stats.ts
│       ├── users.ts
│       ├── orders.ts
│       ├── products.ts
│       └── audit.ts
│
├── hooks/
│   ├── use-auth.ts                  # Token read/write/logout
│   └── use-debounce.ts              # Search input debounce (or import from usehooks-ts)
│
├── components/
│   ├── ui/                          # Shadcn primitives (added by `shadcn add ...`)
│   ├── layout/
│   │   ├── providers.tsx            # QueryClientProvider + devtools
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── nav-items.ts             # Sidebar link config
│   ├── shared/
│   │   ├── data-table.tsx           # Generic paginated table wrapper
│   │   ├── pagination-controls.tsx
│   │   ├── status-badge.tsx         # Order status → colored badge
│   │   ├── stat-card.tsx            # Dashboard metric card
│   │   ├── page-header.tsx          # Title + breadcrumb + action slot
│   │   ├── empty-state.tsx
│   │   └── confirm-dialog.tsx       # Generic "Are you sure?" dialog
│   └── features/
│       ├── dashboard/
│       │   ├── orders-chart.tsx
│       │   └── revenue-chart.tsx
│       ├── orders/
│       │   └── order-filters.tsx
│       ├── products/
│       │   ├── create-product-dialog.tsx
│       │   └── upload-vouchers-dialog.tsx
│       └── users/
│           └── pin-status-card.tsx
│
├── proxy.ts                         # ← Next 16: was middleware.ts
└── components.json                  # Shadcn config (created by `shadcn init`)
```

> **File naming:** kebab-case for non-component files and component files alike — matches Shadcn's own conventions. Existing `app/layout.tsx` etc. stays as-is (Next requires those names).

---

## 4. Complete API Reference

All routes except login require `Authorization: Bearer <token>`.

> **Availability:** Not every endpoint below exists on pandapay-be yet. For a live matrix (implemented vs 404), use [INTEGRATION.md](./INTEGRATION.md) and [pandapay-be/INTEGRATION.md](../../pandapay-be/INTEGRATION.md). This section documents **intended** contracts for frontend types and future BE work.

> **Decimal gotcha:** TypeORM serializes `DECIMAL` database columns as **strings** in JSON — so `amount` and `denomination` always come back as `"5000.00"`, not `5000`. Parse with `parseFloat()` before doing arithmetic or display formatting.

---

### 4.1 Auth

```
POST /admin/auth/login
```

**Request body:**
```json
{
  "email": "admin@pandapay.io",
  "password": "yourpassword"
}
```

**Response `200`:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "email": "admin@pandapay.io",
  "display_name": "PandaPay Admin",
  "role": "SUPER_ADMIN",
  "must_change_password": false
}
```

**Response `401`:**
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "timestamp": "2026-05-06T10:00:00.000Z",
  "path": "/admin/auth/login"
}
```

---

### 4.2 Stats

```
GET /admin/stats
Authorization: Bearer <token>
```

**Response `200`:**
```json
{
  "users": {
    "total": 142,
    "newLast7Days": 18
  },
  "orders": {
    "total": 890,
    "pending": 5,
    "paid": 2,
    "fulfilled": 820,
    "failed": 15,
    "expired": 48
  },
  "revenue": {
    "totalNgn": 4450000.00,
    "last7DaysNgn": 125000.00
  },
  "vouchers": {
    "total": 500,
    "available": 230,
    "used": 270
  }
}
```

> `revenue` values are JavaScript `number` (float), not strings — they are computed in service code, not read from a decimal column directly.

---

### 4.3 Users

#### List users
```
GET /admin/users?page=1&limit=20&search=081
Authorization: Bearer <token>
```

**Query params:**
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `page` | integer | `1` | |
| `limit` | integer | `20` | max `100` |
| `search` | string | — | ILIKE match on `whatsappNumber` or `displayName` |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "whatsappNumber": "2348012345678",
      "displayName": "Emeka Obi",
      "createdAt": "2026-04-01T08:22:10.000Z",
      "walletBalance": 12500
    }
  ],
  "total": 142,
  "page": 1,
  "limit": 20
}
```

> `walletBalance` is a JavaScript `number` (float), not a string. Computed in the service from the ledger (`SUM(CREDIT) - SUM(DEBIT)`).

#### Get user detail
```
GET /admin/users/:id
Authorization: Bearer <token>
```

**Response `200`:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "whatsappNumber": "2348012345678",
  "displayName": "Emeka Obi",
  "createdAt": "2026-04-01T08:22:10.000Z",
  "walletBalance": 12500,
  "pinStatus": {
    "failedAttempts": 2,
    "isLocked": false,
    "lockedUntil": null
  },
  "recentOrders": [
    {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "productId": "d4e5f6a7-b8c9-0123-defa-234567890123",
      "amount": "5000.00",
      "paymentMode": "WALLET",
      "status": "FULFILLED",
      "paystackReference": null,
      "expiresAt": null,
      "createdAt": "2026-05-01T11:30:00.000Z",
      "product": {
        "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
        "name": "Steam Gift Card",
        "category": "GIFT_CARD",
        "denomination": "5000.00",
        "currency": "NGN",
        "isAvailable": true
      }
    }
  ]
}
```

**Locked user example** (`pinStatus` when locked):
```json
{
  "failedAttempts": 5,
  "isLocked": true,
  "lockedUntil": "2026-05-06T11:45:00.000Z"
}
```

#### Unlock PIN
```
PATCH /admin/users/:id/unlock-pin
Authorization: Bearer <token>
```

**Response `200`:** `{ "success": true }`

---

### 4.4 Orders

#### List orders
```
GET /admin/orders?page=1&limit=20&status=FULFILLED&from=2026-05-01&to=2026-05-06
Authorization: Bearer <token>
```

**Query params:**
| Param | Type | Notes |
|-------|------|-------|
| `page` | integer | default `1` |
| `limit` | integer | default `20`, max `100` |
| `status` | string | `PENDING \| PAID \| FULFILLED \| EXPIRED \| FAILED` |
| `userId` | UUID | exact match |
| `from` / `to` | ISO date | e.g. `2026-05-01` |

**Response `200`:** `PaginatedResponse<Order>` — see §5.

#### Get order detail
```
GET /admin/orders/:id
```

Returns `OrderDetail` (`Order` + `voucherAssigned: boolean` + `voucherIsUsed: boolean`).

> `voucherAssigned: true, voucherIsUsed: false` should never happen in normal flow — flag as fulfillment inconsistency in the UI.

#### Resend voucher
```
POST /admin/orders/:id/resend
```

No body. Returns `{ "success": true }`. Only works on `FULFILLED` orders with a voucher assigned.

---

### 4.5 Products

#### List products
```
GET /admin/products
GET /admin/products?category=GIFT_CARD
```

Returns `ProductWithStats[]` — **bare array**, not paginated. Includes unavailable products.

#### Get product detail
```
GET /admin/products/:id
```
Returns one `ProductWithStats`.

#### Create product
```
POST /admin/products
Content-Type: application/json

{
  "name": "Xbox Game Pass 1 Month",
  "category": "GIFT_CARD",
  "denomination": 7500,
  "currency": "NGN"
}
```

> `currency` defaults to `"NGN"` if omitted.

**Response `201`:** Product object **without** `voucherStats`. Refetch if you need stats.

#### Update product
```
PATCH /admin/products/:id

{ "isAvailable": false }
{ "name": "...", "denomination": 5000, "isAvailable": true }
```

All fields optional. Response: full product (no `voucherStats`).

#### Upload vouchers
```
POST /admin/products/:id/vouchers

{ "codes": ["STEAM-XXXX-YYYY-ZZZZ", "..."] }
```

> Max 500 codes per request. Server encrypts (AES-256-GCM) before storing — never log plaintext after sending.

**Response `200`:** `{ "inserted": 3 }`

#### Get voucher stats
```
GET /admin/products/:id/vouchers/stats
```

Response: `{ productId, total, available, used }`.

---

### 4.6 Audit Logs

```
GET /admin/audit-logs?page=1&limit=20&action=WALLET_CREDIT&from=2026-05-01
```

**Query params:** `page`, `limit`, `actor` (userId UUID, `"system"`, or `"admin"`), `action`, `from`, `to`.

**Action values and metadata shapes:**

| Action | Actor | Metadata fields |
|--------|-------|-----------------|
| `WALLET_CREDIT` | userId | `walletId`, `amount`, `reference` |
| `WALLET_DEBIT` | userId | `walletId`, `amount`, `orderId` |
| `ORDER_FULFILLED` | userId | `orderId`, `productId` |
| `ORDER_FAILED` | userId | `orderId` |
| `ORDER_EXPIRED` | `"system"` | `orderId` |
| `ADMIN_RESEND` | `"admin"` | `orderId`, `actor` |
| `USER_CREATED` | `"system"` | `userId`, `whatsappNumber` |
| `PIN_SET` | userId | `userId` |
| `PIN_LOCKED` | userId | `userId`, `lockedUntil` |
| `PIN_UNLOCKED` | `"admin"` | `userId` |

---

## 5. TypeScript Types

[lib/types.ts](../lib/types.ts) — single source of truth.

```ts
// ─── Enums ────────────────────────────────────────────────────────────────────

export type OrderStatus = 'PENDING' | 'PAID' | 'FULFILLED' | 'EXPIRED' | 'FAILED';
export type PaymentMode = 'WALLET' | 'DIRECT_TRANSFER';
export type ProductCategory = 'GIFT_CARD' | 'GAME_TOP_UP' | 'AIRTIME';
export type AuditAction =
  | 'WALLET_CREDIT'
  | 'WALLET_DEBIT'
  | 'ORDER_FULFILLED'
  | 'ORDER_FAILED'
  | 'ORDER_EXPIRED'
  | 'ADMIN_RESEND'
  | 'USER_CREATED'
  | 'PIN_SET'
  | 'PIN_LOCKED'
  | 'PIN_UNLOCKED';

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface Stats {
  users: { total: number; newLast7Days: number };
  orders: {
    total: number;
    pending: number;
    paid: number;
    fulfilled: number;
    failed: number;
    expired: number;
  };
  revenue: { totalNgn: number; last7DaysNgn: number };
  vouchers: { total: number; available: number; used: number };
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface UserListItem {
  id: string;
  whatsappNumber: string;
  displayName: string | null;
  createdAt: string;
  walletBalance: number;
}

export interface UserDetail extends UserListItem {
  pinStatus: {
    failedAttempts: number;
    isLocked: boolean;
    lockedUntil: string | null;
  };
  recentOrders: Order[];
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface Order {
  id: string;
  userId: string;
  productId: string;
  amount: string;            // DECIMAL — parseFloat before math
  paymentMode: PaymentMode;
  status: OrderStatus;
  paystackReference: string | null;
  expiresAt: string | null;
  createdAt: string;
  product?: ProductWithStats;
  user?: UserListItem;
}

export interface OrderDetail extends Order {
  voucherAssigned: boolean;
  voucherIsUsed: boolean;
}

// ─── Products ─────────────────────────────────────────────────────────────────

export interface VoucherStats {
  total: number;
  available: number;
  used: number;
}

export interface ProductWithStats {
  id: string;
  name: string;
  category: ProductCategory;
  denomination: string;       // DECIMAL — parseFloat before math
  currency: string;
  isAvailable: boolean;
  voucherStats: VoucherStats;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  actor: string;
  action: AuditAction;
  metadata: Record<string, unknown>;
  createdAt: string;
}
```

---

## 6. API Client Layer

### 6.1 Base Client — [lib/api/client.ts](../lib/api/client.ts)

```ts
import Cookies from 'js-cookie';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = Cookies.get('admin_token');

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  // Token expired or invalid — clear cookie, let proxy redirect on next nav
  if (res.status === 401) {
    Cookies.remove('admin_token');
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new ApiError(401, 'Session expired');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (body as any).message ?? 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
```

### 6.2 Auth — [lib/api/auth.ts](../lib/api/auth.ts)

```ts
import { apiFetch } from './client';

export const login = (email: string, password: string) =>
  apiFetch<{ access_token: string }>('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
```

### 6.3 Stats — [lib/api/stats.ts](../lib/api/stats.ts)

```ts
import { apiFetch } from './client';
import type { Stats } from '@/lib/types';

export const getStats = () => apiFetch<Stats>('/admin/stats');
```

### 6.4 Users — [lib/api/users.ts](../lib/api/users.ts)

```ts
import { apiFetch } from './client';
import type { PaginatedResponse, UserListItem, UserDetail } from '@/lib/types';

interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const getUsers = ({ page = 1, limit = 20, search }: GetUsersParams = {}) => {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) q.set('search', search);
  return apiFetch<PaginatedResponse<UserListItem>>(`/admin/users?${q}`);
};

export const getUser = (id: string) => apiFetch<UserDetail>(`/admin/users/${id}`);

export const unlockPin = (id: string) =>
  apiFetch<{ success: boolean }>(`/admin/users/${id}/unlock-pin`, {
    method: 'PATCH',
  });
```

### 6.5 Orders — [lib/api/orders.ts](../lib/api/orders.ts)

```ts
import { apiFetch } from './client';
import type { PaginatedResponse, Order, OrderDetail, OrderStatus } from '@/lib/types';

interface GetOrdersParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  userId?: string;
  from?: string;
  to?: string;
}

export const getOrders = ({ page = 1, limit = 20, ...rest }: GetOrdersParams = {}) => {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  Object.entries(rest).forEach(([k, v]) => v != null && q.set(k, v));
  return apiFetch<PaginatedResponse<Order>>(`/admin/orders?${q}`);
};

export const getOrder = (id: string) => apiFetch<OrderDetail>(`/admin/orders/${id}`);

export const resendOrder = (id: string) =>
  apiFetch<{ success: boolean }>(`/admin/orders/${id}/resend`, { method: 'POST' });
```

### 6.6 Products — [lib/api/products.ts](../lib/api/products.ts)

```ts
import { apiFetch } from './client';
import type { ProductWithStats, ProductCategory, VoucherStats } from '@/lib/types';

export const getProducts = (category?: ProductCategory) =>
  apiFetch<ProductWithStats[]>(
    `/admin/products${category ? `?category=${category}` : ''}`,
  );

export const getProduct = (id: string) =>
  apiFetch<ProductWithStats>(`/admin/products/${id}`);

export const createProduct = (body: {
  name: string;
  category: ProductCategory;
  denomination: number;
  currency?: string;
}) =>
  apiFetch<ProductWithStats>('/admin/products', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateProduct = (
  id: string,
  body: { name?: string; denomination?: number; isAvailable?: boolean },
) =>
  apiFetch<ProductWithStats>(`/admin/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const uploadVouchers = (id: string, codes: string[]) =>
  apiFetch<{ inserted: number }>(`/admin/products/${id}/vouchers`, {
    method: 'POST',
    body: JSON.stringify({ codes }),
  });

export const getVoucherStats = (id: string) =>
  apiFetch<{ productId: string } & VoucherStats>(
    `/admin/products/${id}/vouchers/stats`,
  );
```

### 6.7 Audit — [lib/api/audit.ts](../lib/api/audit.ts)

```ts
import { apiFetch } from './client';
import type { PaginatedResponse, AuditLog, AuditAction } from '@/lib/types';

interface GetAuditLogsParams {
  page?: number;
  limit?: number;
  actor?: string;
  action?: AuditAction;
  from?: string;
  to?: string;
}

export const getAuditLogs = ({ page = 1, limit = 20, ...rest }: GetAuditLogsParams = {}) => {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  Object.entries(rest).forEach(([k, v]) => v != null && q.set(k, v));
  return apiFetch<PaginatedResponse<AuditLog>>(`/admin/audit-logs?${q}`);
};
```

---

## 7. Auth — Hook + Proxy (Next 16)

### 7.1 Auth Hook — [hooks/use-auth.ts](../hooks/use-auth.ts)

```ts
'use client';

import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

const TOKEN_KEY = 'admin_token';

export function useAuth() {
  const router = useRouter();

  const getToken = (): string | null => Cookies.get(TOKEN_KEY) ?? null;

  const saveToken = (token: string) => {
    Cookies.set(TOKEN_KEY, token, {
      expires: 1,                  // 1 day
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
```

### 7.2 Proxy — Next's Auth Guard — [proxy.ts](../proxy.ts)

> **Next 16 change:** the file is `proxy.ts` (project root) and the exported function is `proxy`, not `middleware`. The `config.matcher` shape is unchanged.

```ts
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
```

> The proxy only checks for cookie *existence*. A forged or expired token still produces a 401 from the API, which `apiFetch` handles by clearing the cookie and redirecting.

---

## 8. Providers & Root Layout

### `app/layout.tsx`

The Panda theme is imported by `globals.css` (already in the project). Use `next/font/local` once the Satoshi `.otf` files land in `app/assets/satoshi/`:

```tsx
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Providers } from '@/components/layout/providers';
import { Toaster } from '@/components/ui/sonner';

const satoshi = localFont({
  src: [
    { path: './assets/satoshi/Satoshi-Regular.otf',    weight: '400', style: 'normal' },
    { path: './assets/satoshi/Satoshi-Italic.otf',     weight: '400', style: 'italic' },
    { path: './assets/satoshi/Satoshi-Bold.otf',       weight: '700', style: 'normal' },
    { path: './assets/satoshi/Satoshi-BoldItalic.otf', weight: '700', style: 'italic' },
  ],
  variable: '--font-satoshi',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PandaPay Admin',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${satoshi.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
```

> Until the OTF files exist, drop the `localFont` import and let `globals.css` fall back to `sans-serif`.

### `components/layout/providers.tsx`

```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

---

## 9. Admin Shell Layout (Sidebar + Header)

### `components/layout/nav-items.ts`

```ts
import { LayoutDashboard, Users, ShoppingBag, Package, FileText } from 'lucide-react';

export const NAV_ITEMS = [
  { label: 'Dashboard',  href: '/dashboard', icon: LayoutDashboard },
  { label: 'Orders',     href: '/orders',    icon: ShoppingBag },
  { label: 'Users',      href: '/users',     icon: Users },
  { label: 'Products',   href: '/products',  icon: Package },
  { label: 'Audit Log',  href: '/audit',     icon: FileText },
];
```

### `app/(admin)/layout.tsx`

```tsx
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

---

## 10. Page Implementation Guide

> **Next 16 reminder:** every dynamic page (`[id]/page.tsx`) receives `params` as `Promise<...>`. In a client component (which is what these all are because they use TanStack Query), unwrap with React's `use()` hook — see [§10.4](#104-user-detail-usersid).

### 10.1 Login (`/login`)

Single form — email + password → `POST /admin/auth/login` → save token → redirect.

- React Hook Form + Zod for validation.
- Show error toast on 401.
- Honor the `?redirect=` param if present.

```tsx
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const { access_token } = await login(data.email, data.password);
saveToken(access_token);
router.push(redirectParam ?? '/dashboard');
```

### 10.2 Dashboard (`/dashboard`)

`GET /admin/stats` — refetch every 30 seconds.

```tsx
const { data, isLoading } = useQuery({
  queryKey: ['stats'],
  queryFn: getStats,
  refetchInterval: 30_000,
});
```

**Stat cards:**
- Total Users — subtitle `+{newLast7Days} this week`
- Total Revenue `₦{totalNgn}` — subtitle `₦{last7DaysNgn} this week`
- Fulfilled Orders `{fulfilled}` — subtitle `{failed} failed · {expired} expired`
- Voucher Stock `{available} available` — subtitle `{used}/{total} used`

**Charts:** see §11.

### 10.3 Users (`/users`)

`GET /admin/users?page&limit&search`. Use `nuqs` to keep page + search in URL.

```tsx
const [search, setSearch] = useQueryState('search', { defaultValue: '' });
const [page, setPage]     = useQueryState('page', parseAsInteger.withDefault(1));
const debouncedSearch     = useDebounce(search, 300);

const { data, isLoading } = useQuery({
  queryKey: ['users', page, debouncedSearch],
  queryFn: () => getUsers({ page, search: debouncedSearch }),
});

useEffect(() => { setPage(1); }, [debouncedSearch]);
```

**Columns:** Display Name (fallback `—`), WhatsApp Number (fixed-width), Balance (`₦{walletBalance.toLocaleString()}`), Joined (`format(createdAt, 'dd MMM yyyy')`), Actions ("View" → `/users/{id}`).

### 10.4 User Detail (`/users/[id]`)

**Next 16 client-component pattern** for unwrapping `params`:

```tsx
'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUser } from '@/lib/api/users';

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => getUser(id),
  });

  // …
}
```

**Layout:**
```
┌─────────────────────────────┬──────────────────┐
│  Profile Card               │  PIN Status Card  │
│  Name, Number, Balance      │  Attempts, Lock   │
│  Joined date                │  [Unlock PIN btn] │
└─────────────────────────────┴──────────────────┘
┌────────────────────────────────────────────────┐
│  Recent Orders (last 10, no pagination)        │
└────────────────────────────────────────────────┘
```

**Unlock PIN:**
```tsx
const mutation = useMutation({
  mutationFn: () => unlockPin(id),
  onSuccess: () => {
    toast.success('PIN unlocked');
    queryClient.invalidateQueries({ queryKey: ['user', id] });
  },
});
```

Show button only when `pinStatus.isLocked === true`.

### 10.5 Orders (`/orders`)

`GET /admin/orders?page&limit&status&userId&from&to`

**Filters:** Status select, date range (Calendar in a Popover), User ID input.

**Columns:** Order ID (truncated UUID, full on hover), User, Product, Amount, Mode (icon), Status (`<StatusBadge>`), Date (relative + absolute), Actions (View · Resend — only when `FULFILLED`).

**Resend** wrapped in `<ConfirmDialog>` — "Resend voucher code for this order?"

### 10.6 Order Detail (`/orders/[id]`)

Same `use(params)` pattern as §10.4.

```
┌──────────────────────────────────────────────────────┐
│  Order Header: ID · Status badge · Created date       │
├─────────────────────────┬────────────────────────────┤
│  Order Info             │  Payment Info              │
├─────────────────────────┼────────────────────────────┤
│  User Info              │  Voucher Info              │
└─────────────────────────┴────────────────────────────┘
[Resend Voucher]  ← only when status = FULFILLED
```

### 10.7 Products (`/products`)

`GET /admin/products` — full list, filter client-side by tab.

```
[All] [Gift Cards] [Game Top-Ups] [Airtime]
```

**Card layout:**
```
┌──────────────────────────────────────────┐
│  Name                    [Available ●]   │
│  Category tag · ₦Denomination            │
│  Vouchers: ████████░░  8/10 available    │
│                              [View →]    │
└──────────────────────────────────────────┘
```

Stock bar color: green if `>30%`, amber if `>10%`, red if `≤10%`.

**Create:** "New Product" → `<CreateProductDialog>`. On success, invalidate `['products']`.

### 10.8 Product Detail (`/products/[id]`)

`use(params)` for the id. Three sections:

1. **Details card** — name, category, denomination, currency, availability toggle.
2. **Voucher stats card** — total / available / used + mini progress bar.
3. **Upload vouchers** — textarea (one code per line), parse and POST:

```ts
const codes = textarea.value
  .split('\n')
  .map((c) => c.trim())
  .filter(Boolean);
// validate: max 500
```

After upload: toast `Inserted {n} vouchers`, refresh stats.

### 10.9 Audit Log (`/audit`)

`GET /admin/audit-logs?page&limit&actor&action&from&to`

**Filters:** Actor input, Action select (all `AuditAction` values), date range.

**Columns:** Actor (truncate UUIDs), Action (color-coded badge), Metadata (collapsible JSON), Time.

**Action badge colors:** use Panda semantic tokens (`success-100/700`, `error-100/700`, `info-100/700`, `warning-100/700`, `neutral-100/700`) — keeps light/dark mode coherent.

---

## 11. Charts — Recommendation & Setup

**Recharts** — native React, composable, works with Tailwind, ~400KB. Install: `pnpm add recharts`.

### Order Status Bar Chart — `components/features/dashboard/orders-chart.tsx`

```tsx
'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { Stats } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  Fulfilled: 'var(--color-success-500)',
  Pending:   'var(--color-warning-500)',
  Paid:      'var(--color-info-500)',
  Failed:    'var(--color-error-500)',
  Expired:   'var(--color-neutral-300)',
};

export function OrdersChart({ orders }: { orders: Stats['orders'] }) {
  const data = [
    { name: 'Fulfilled', value: orders.fulfilled },
    { name: 'Pending',   value: orders.pending },
    { name: 'Paid',      value: orders.paid },
    { name: 'Failed',    value: orders.failed },
    { name: 'Expired',   value: orders.expired },
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-subtle)" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={30} />
        <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '13px' }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### Revenue Chart — `components/features/dashboard/revenue-chart.tsx`

`/admin/stats` only returns total + last-7-days totals — no time series. **Option A** (current): two-bar comparison "Last 7 days" vs "All-time 7-day average". **Option B** (future): add `GET /admin/stats/revenue-series?days=30` to backend, switch to `<AreaChart>`.

---

## 12. Reusable Components

### `components/shared/status-badge.tsx`

```tsx
import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const STYLES: Record<OrderStatus, string> = {
  PENDING:   'bg-warning-100 text-warning-700 hover:bg-warning-100',
  PAID:      'bg-info-100 text-info-700 hover:bg-info-100',
  FULFILLED: 'bg-success-100 text-success-700 hover:bg-success-100',
  EXPIRED:   'bg-neutral-100 text-neutral-500 hover:bg-neutral-100',
  FAILED:    'bg-error-100 text-error-700 hover:bg-error-100',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge className={cn('font-medium border-0', STYLES[status])}>
      {status}
    </Badge>
  );
}
```

### `components/shared/stat-card.tsx`

```tsx
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  isLoading?: boolean;
}

export function StatCard({ label, value, subtitle, icon: Icon, isLoading }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-6">
        <div className="space-y-1">
          <p className="text-sm text-neutral-400">{label}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
          {subtitle && <p className="text-xs text-neutral-400">{subtitle}</p>}
        </div>
        <div className="rounded-md bg-surface p-2">
          <Icon className="h-5 w-5 text-neutral-400" />
        </div>
      </CardContent>
    </Card>
  );
}
```

### `components/shared/pagination-controls.tsx`

```tsx
import { Button } from '@/components/ui/button';

interface Props {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ page, limit, total, onPageChange }: Props) {
  const totalPages = Math.ceil(total / limit);
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between text-sm text-neutral-400">
      <span>Showing {from}–{to} of {total}</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
```

### `components/shared/confirm-dialog.tsx`

```tsx
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  isPending?: boolean;
}

export function ConfirmDialog({
  trigger, title, description, confirmLabel = 'Confirm',
  variant = 'default', onConfirm, isPending,
}: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant={variant} onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Loading…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 13. Form Patterns

Zod schemas live next to their form component:

```ts
const schema = z.object({
  name:         z.string().min(2, 'Min 2 characters'),
  category:     z.enum(['GIFT_CARD', 'GAME_TOP_UP', 'AIRTIME']),
  denomination: z.coerce.number().min(1, 'Must be > 0'),
  currency:     z.string().optional(),
});
```

Submit pattern:

```tsx
const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

const mutation = useMutation({
  mutationFn: (data: z.infer<typeof schema>) => createProduct(data),
  onSuccess: () => {
    toast.success('Product created');
    queryClient.invalidateQueries({ queryKey: ['products'] });
    form.reset();
    setOpen(false);
  },
  onError: (e) => toast.error(e.message),
});

const onSubmit = form.handleSubmit((data) => mutation.mutate(data));
```

Disable submit button while `mutation.isPending`.

---

## 14. Error & Loading Patterns

**Loading:** Shadcn `Skeleton` shaped like the final content. No raw spinners.

```tsx
if (isLoading) return <TableSkeleton rows={10} cols={6} />;
```

**Error:**
```tsx
if (isError) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-neutral-400">
      <AlertCircle className="h-8 w-8" />
      <p>Failed to load data</p>
      <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
    </div>
  );
}
```

**Empty:**
```tsx
if (data?.data.length === 0) return <EmptyState message="No orders found" />;
```

**401:** handled in `apiFetch` — clears cookie, redirects. No per-component handling needed.

---

## 15. Backend CORS Change Required

The NestJS backend at `src/main.ts` must allow requests from `http://localhost:3001` in dev. Add before `app.listen()`:

```ts
// src/main.ts
app.enableCors({
  origin: process.env.ADMIN_FRONTEND_URL ?? 'http://localhost:3001',
  credentials: true,
});
```

Backend `.env`:
```
ADMIN_FRONTEND_URL=http://localhost:3001
# Production:
# ADMIN_FRONTEND_URL=https://admin.pandapay.io
```

---

## 16. Deployment (Vercel)

1. Push `panda-admin` to its own GitHub repo.
2. Import into Vercel.
3. Set env var: `NEXT_PUBLIC_API_URL=https://api.pandapay.io`.
4. Custom domain `admin.pandapay.io` → set in Vercel project settings, point DNS.

> Vercel handles Next 16 App Router natively. The Panda theme works without any extra Vercel config.

---

*Last updated: 2026-05-06 · Guide version 2.0 (Next 16 + no-src layout)*
