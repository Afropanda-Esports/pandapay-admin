# PandaPay Admin Frontend — Implementation Guide

> **Stack:** Next.js **16.2.4** (App Router) · React 19.2 · TypeScript · Tailwind v4 · Shadcn/ui · TanStack Query v5 · Recharts · React Hook Form · Zod · nuqs
> **Backend dev URL:** `http://localhost:3000` (NestJS, `pandapay-be`)
> **Frontend dev URL:** `http://localhost:3001`
> **Auth:** JWT lives **only** in an HttpOnly `admin_token` cookie set server-side by Next.js route handlers — it never reaches browser JS. See [§6](#6-auth--bff-architecture).

**Integration status (2026-07-20):** The app shell and every backend module *except Discount Codes* are fully wired. Canonical live-status references: [INTEGRATION.md](./INTEGRATION.md) and [ROLES.md](./ROLES.md) in this repo, and `pandapay-be/AGENTS.md`'s "Admin ↔ backend" table (also currently out of date — see note below).

> **This document was significantly stale as of 2026-07-19** (described a client-side `js-cookie` auth pattern and only 5 of 13 admin modules). It was rewritten 2026-07-20 against the actual source in this repo and the sibling `pandapay-be` repo. If you find it drifting again, prefer reading the real files over trusting prose — links are provided throughout.

---

## Table of Contents

1. [Codebase Status](#1-codebase-status)
2. [Environment Variables](#2-environment-variables)
3. [Folder Structure](#3-folder-structure)
4. [Complete API Reference](#4-complete-api-reference)
5. [TypeScript Types](#5-typescript-types)
6. [Auth — BFF Architecture](#6-auth--bff-architecture)
7. [Providers & Root Layout](#7-providers--root-layout)
8. [Admin Shell Layout (Sidebar + Header)](#8-admin-shell-layout-sidebar--header)
9. [Page Inventory](#9-page-inventory)
10. [Charts](#10-charts)
11. [Reusable Components](#11-reusable-components)
12. [Form Patterns](#12-form-patterns)
13. [Error & Loading Patterns](#13-error--loading-patterns)
14. [Backend CORS](#14-backend-cors)
15. [Deployment (Vercel)](#15-deployment-vercel)
16. [Next Up — Discount Codes Admin UI](#16-next-up--discount-codes-admin-ui)

---

## 1. Codebase Status

**Build state:** All 12 backend admin modules are now wired end-to-end (list/detail pages, mutations, RBAC-gated actions), including Discount Codes (`app/(admin)/discount-codes/page.tsx`, built per §16 below).

| Concern | Status |
|---|---|
| Next.js | **16.2.4** (App Router) |
| React | **19.2.4** |
| TanStack Query, RHF, Zod, Recharts, nuqs, date-fns | Installed (`package.json`) |
| Shadcn/ui primitives | Installed under `components/ui/` (style `base-nova`) |
| API clients | `lib/api/*.ts` — one file per backend module, all built on `apiFetch` in `lib/api/client.ts` |
| Auth | HttpOnly-cookie BFF — see [§6](#6-auth--bff-architecture) |
| Dev port | **3001** (`pnpm dev`, Turbopack) |
| Satoshi font | `.otf` files present at `app/assets/satoshi/` but **not yet wired** via `next/font/local` in `app/layout.tsx` — theme currently renders in fallback `sans-serif` |
| Automated tests | **None** — no test runner installed in this repo |

### Backend ↔ frontend parity

Every route in every controller under `pandapay-be/src/admin/controllers/` is now called from `panda-admin/lib/api/*.ts`, including `discount-codes-admin.controller.ts` (`lib/api/discount-codes.ts`).

`pandapay-be/AGENTS.md`'s own "Admin ↔ backend" table is itself out of date — it lists `change-password`, `pricing/*`, and `admins/*` as "missing," but all three have been implemented on both sides for some time, and it never mentions discount-codes at all. Don't trust that table without cross-checking; that's out of scope to fix from this repo since it lives in `pandapay-be`.

### Next 16 breaking changes you must know

These differ from the Next 14/15 patterns most LLMs and tutorials assume:

1. **`middleware.ts` → `proxy.ts`** at project root. Exported function is `proxy`, not `middleware`. Same `config.matcher` shape. See [§6.2](#62-proxy-the-route-guard).
2. **Dynamic route `params` and `searchParams` are `Promise<...>`.** Must `await` (server component) or `use()` (client component).
3. **`app/(admin)/error.tsx` receives `unstable_retry`**, not the old `reset` prop.

Before touching routing, caching, or the proxy, skim `node_modules/next/dist/docs/01-app/`.

---

## 2. Environment Variables

```bash
# .env.local
API_URL=http://localhost:3000
# NEXT_PUBLIC_API_URL is a legacy fallback — lib/env.ts prefers API_URL if both are set
```

`lib/env.ts`'s `assertAdminEnv()` runs at `next.config.ts` load time and **fails the build** if neither var is set or the value doesn't parse as a URL.

**Never** put JWT secrets or admin credentials in `NEXT_PUBLIC_*` — nothing token-related needs to be public; the token lives server-side only (see [§6](#6-auth--bff-architecture)).

`package.json`'s `dev` script already runs on port 3001:
```json
"scripts": { "dev": "next dev --port 3001 --turbopack" }
```

---

## 3. Folder Structure

The `@/*` import alias resolves to project root.

```
panda-admin/
├── app/
│   ├── layout.tsx                   # Root layout — Providers, Sonner toaster
│   ├── page.tsx                     # Redirect to /dashboard
│   ├── globals.css                  # Panda theme (Tailwind v4 @theme, light/dark)
│   ├── sample.css                   # ⚠ orphan — not imported anywhere, safe to delete
│   ├── assets/satoshi/              # Satoshi .otf files (present, not yet wired)
│   ├── login/page.tsx
│   ├── change-password/page.tsx
│   ├── api/                         # BFF server routes — see §6
│   │   ├── auth/login/route.ts
│   │   ├── auth/logout/route.ts
│   │   └── backend/[...path]/route.ts   # generic authenticated reverse proxy
│   └── (admin)/                     # Route group — every page requires auth
│       ├── layout.tsx               # Sidebar + Header shell, redirects on mustChangePassword
│       ├── error.tsx                # Next 16: unstable_retry, not reset
│       ├── dashboard/page.tsx
│       ├── users/page.tsx, [id]/page.tsx
│       ├── orders/page.tsx, [id]/page.tsx
│       ├── transactions/page.tsx
│       ├── products/page.tsx, [id]/page.tsx
│       ├── pricing/page.tsx
│       ├── fraud/page.tsx
│       ├── payment-exceptions/page.tsx
│       ├── feature-flags/page.tsx
│       ├── audit/page.tsx
│       └── admins/page.tsx          # SUPER_ADMIN only (gated in proxy.ts too)
│
├── lib/
│   ├── types.ts                     # Single source of truth for all shared types/enums
│   ├── permissions.ts                # AdminPermission enum, role→permission map
│   ├── env.ts                        # assertAdminEnv() build-time guard
│   ├── auth/session.ts               # Cookie name constants, cookie option builders
│   ├── utils.ts                      # cn() helper
│   └── api/
│       ├── client.ts                 # apiFetch<T> — see §6.1
│       ├── auth.ts, me.ts, stats.ts
│       ├── users.ts, orders.ts, products.ts, pricing.ts
│       ├── admins.ts, audit.ts, fraud.ts
│       ├── payment-exceptions.ts, feature-flags.ts
│       └── (discount-codes.ts does not exist yet — §16)
│
├── hooks/
│   ├── use-auth.ts                   # logout(): clears React Query cache, redirects
│   ├── use-me.ts                     # cached current-admin profile query (5 min staleTime)
│   └── use-permissions.ts            # derives role/labels/can() from useMe
│
├── components/
│   ├── ui/                           # Shadcn primitives (style: base-nova)
│   ├── layout/
│   │   ├── providers.tsx
│   │   ├── sidebar.tsx, header.tsx
│   │   └── nav-items.ts              # §8
│   ├── shared/                       # Generic: data-table, pagination, status-badge,
│   │                                 #   stat-card, page-header, empty-state, confirm-dialog
│   ├── orders/payment-timeline.tsx   # ⚠ lives outside features/orders/ — minor inconsistency
│   └── features/<domain>/            # dashboard, orders, products, users, pricing, fraud,
│                                     #   payment-exceptions, feature-flags, admins
│
├── proxy.ts                          # Next 16 route guard — see §6.2
└── components.json                   # Shadcn config
```

> **File naming:** kebab-case for non-component and component files alike.

---

## 4. Complete API Reference

All routes except `POST /admin/auth/login` require the `admin_token` cookie (attached server-side as `Authorization: Bearer <token>` by `app/api/backend/[...path]/route.ts`).

> **Decimal gotcha:** TypeORM serializes `DECIMAL` columns as **strings**. `Order.amount`, `Product.priceUsd`/`manualPriceNgn`/`snapshotNgnPrice`, `DiscountCode.discountValue`, etc. are all `string`. `Stats.revenue.*` is the one exception — computed server-side and returned as `number`.

### 4.1 Auth & session

| Route | Frontend client |
|---|---|
| `POST /admin/auth/login` | `lib/api/auth.ts: login()` — actually calls `/api/auth/login` (BFF), which forwards to this and sets cookies |
| `GET /admin/me` | `lib/api/me.ts: getMe()` |
| `POST /admin/me/change-password` | `lib/api/me.ts: changePassword()` |

Login response shape (`LoginResponse` in `lib/types.ts`): `{ must_change_password, role?, email?, display_name? }`. The `access_token` itself is consumed by the BFF route handler and never returned to the browser.

### 4.2 Stats

`GET /admin/stats` → `lib/api/stats.ts: getStats()`. Polled every 30s on the dashboard. Returns `Stats` (see §5) — `revenue` values are `number`, everything money-like elsewhere is `string`.

### 4.3 Users

| Route | Client (`lib/api/users.ts`) |
|---|---|
| `GET /admin/users?page&limit&search` | `getUsers()` |
| `GET /admin/users/directory?limit` | `getUserDirectory()` |
| `GET /admin/users/:id` | `getUser()` |
| `PATCH /admin/users/:id/unlock-pin` | `unlockPin()` |
| `GET /admin/users/:id/payments?page&limit` | `getUserPayments()` |

`UserDetail` includes `pinStatus`, `recentOrders`, and `virtualAccount` (Paystack DVA info, nullable). There is **no wallet balance concept** in the current domain model — the `wallet` module on the backend is legacy/dead in the live checkout path. `PaymentMethod` values are `DEDICATED_NUBAN | BANK_TRANSFER | WALLET | REFUND | CRYPTO_USDC`.

### 4.4 Orders

| Route | Client (`lib/api/orders.ts`) |
|---|---|
| `GET /admin/orders?page&limit&status&userId&from&to` | `getOrders()` |
| `GET /admin/orders/:id` | `getOrder()` |
| `POST /admin/orders/:id/resend` | `resendOrder()` |
| `POST /admin/orders/:id/fulfill` | `fulfillOrder()` |
| `POST /admin/orders/:id/refund` | `refundOrder()` |
| `POST /admin/orders/:id/retry` | `retryOrder()` |
| `POST /admin/orders/purchase` | `createPurchase()` |

`OrderStatus` = `PENDING | PAID | FULFILLED | EXPIRED | FAILED`. `PaymentMode` = `WALLET | DIRECT_TRANSFER | CRYPTO` (the `WALLET` mode value still exists in the enum for historical orders even though the wallet module itself is dead for new checkouts — don't assume it means an active feature). `OrderDetail.paymentTimeline` is `@deprecated`, use `.payments`.

### 4.5 Products & pricing

| Route | Client |
|---|---|
| `GET /admin/products?category` | `products.ts: getProducts()` |
| `GET /admin/products/:id` | `getProduct()` |
| `POST /admin/products` | `createProduct()` |
| `PATCH /admin/products/:id` | `updateProduct()` |
| `PATCH /admin/products/:id/pricing` | `updateProductPricing()` — SUPER_ADMIN only server-side |
| `POST /admin/products/:id/vouchers` | `uploadVouchers()` (max 500 codes/request, AES-256-GCM at rest) |
| `GET /admin/products/:id/vouchers/stats` | `getVoucherStats()` |
| `GET /admin/pricing/rate` | `pricing.ts: getCurrentRate()` |
| `GET /admin/pricing/oracle` | `getOracleRate()` |
| `GET /admin/pricing/rate/history?limit` | `getRateHistory()` |
| `POST /admin/pricing/rate` | `setRate()` — SUPER_ADMIN only |
| `POST /admin/pricing/recompute` | `recomputeAll()` — SUPER_ADMIN only |

`PricingMode` = `GLOBAL_FX | MANUAL_NGN`. `Product.snapshotNgnPrice` is the price actually charged; it's recomputed whenever the global rate changes (`GLOBAL_FX` products) or on manual pricing PATCH.

### 4.6 Admins (team management)

| Route | Client (`lib/api/admins.ts`) |
|---|---|
| `GET /admin/admins/directory` | `getAdminDirectory()` |
| `GET /admin/admins` | `getAdmins()` |
| `POST /admin/admins` | `createAdmin()` — SUPER_ADMIN only |
| `PATCH /admin/admins/:id` | `updateAdmin()` — SUPER_ADMIN only |
| `POST /admin/admins/:id/reset-password` | `resetAdminPassword()` — SUPER_ADMIN only |

### 4.7 Fraud, payment exceptions, feature flags, audit

| Route | Client |
|---|---|
| `GET /admin/fraud-events?page&limit` | `fraud.ts: listFraudEvents()` |
| `PATCH /admin/fraud-events/:id/approve` | `approveFraudEvent()` |
| `PATCH /admin/fraud-events/:id/reject` | `rejectFraudEvent()` |
| `GET /admin/payment-exceptions?page&limit&status` | `payment-exceptions.ts: listPaymentExceptions()` |
| `POST /admin/payment-exceptions/:id/resolve` | `resolvePaymentException()` |
| `GET /admin/feature-flags` | `feature-flags.ts: getFeatureFlags()` |
| `PATCH /admin/feature-flags/:key` | `updateFeatureFlag()` — SUPER_ADMIN only |
| `GET /admin/audit-logs?page&limit&actor&action&from&to` | `audit.ts: getAuditLogs()` |

`FeatureFlag` has a time-boxed activation window (`activeFrom`/`activeUntil`); `isFeatureFlagEffective()` in `feature-flags.ts` mirrors the backend's window logic client-side for UI badges only — the backend is still the enforcement point.

### 4.8 Discount codes

| Route | Client (`lib/api/discount-codes.ts`) |
|---|---|
| `GET /admin/discount-codes?page&limit&status&productId&category` | `listDiscountCodes()` |
| `POST /admin/discount-codes/generate` | `generateDiscountCodes()` — SUPER_ADMIN only |
| `PATCH /admin/discount-codes/:id/revoke` | `revokeDiscountCode()` — SUPER_ADMIN only |

`DiscountCodeStatus` is derived client-side (`deriveDiscountCodeStatus()` in `components/features/discount-codes/discount-status-badge.tsx`) since the backend has no `status` column — see [§16](#16-next-up--discount-codes-admin-ui) for the exact precedence and full contract this was built from.

---

## 5. TypeScript Types

[lib/types.ts](../lib/types.ts) is the single source of truth — **read it directly rather than trusting a copy here**, it has drifted from documentation before. Key things worth calling out explicitly:

- `AuditAction` has grown to 25+ values (admin actions, product/pricing actions, fraud, crypto, feature flags) — don't assume the audit log only covers wallet/order events.
- `PaymentMethod` (payments a user made) and `PaymentMode` (mode an order was placed in) are **different types** — easy to confuse.
- Money fields are `string` almost everywhere except `Stats.revenue.*`.
- There is currently **no `DiscountCode` type** — it needs to be added as part of [§16](#16-next-up--discount-codes-admin-ui).

---

## 6. Auth — BFF Architecture

This is the part earlier versions of this doc got fundamentally wrong (they described a client-side `js-cookie`/`NEXT_PUBLIC_API_URL` pattern). The real architecture:

1. Login form → `lib/api/auth.ts: login()` → `POST /api/auth/login` (a **Next.js server route**, not the NestJS backend directly).
2. That route (`app/api/auth/login/route.ts`) calls `POST {API_URL}/admin/auth/login` on the real backend, then sets `admin_token` (HttpOnly, `sameSite: strict`, `secure` in prod, 24h max-age) and `admin_role` cookies via `lib/auth/session.ts`'s option builders. The JWT never reaches browser JavaScript.
3. Every subsequent client fetch goes through `lib/api/client.ts: apiFetch()`, which calls `/api/backend/<path>` same-origin.
4. `app/api/backend/[...path]/route.ts` — a catch-all reverse proxy — reads the `admin_token` cookie server-side, attaches `Authorization: Bearer <token>`, forwards to the NestJS backend, and streams the response back. A 401 from upstream clears both cookies automatically.
5. `hooks/use-auth.ts: useAuth().logout()` calls `POST /api/auth/logout` (clears cookies), clears the React Query cache, and redirects to `/login`.

### 6.1 Client-side RBAC is not a security boundary

`lib/permissions.ts` + `hooks/use-permissions.ts` + `components/shared/require-permission.tsx` hide/disable UI for the `ADMIN` ("Manager") role vs `SUPER_ADMIN`. This is UX only — every SUPER_ADMIN-only mutation is independently re-checked by `SuperAdminGuard` on the backend and returns 403 if bypassed.

### 6.2 Proxy — the route guard

`proxy.ts` (project root, Next 16's renamed `middleware.ts` — exported function is `proxy`, not `middleware`) does a **cookie-presence check only**:

- `PROTECTED_PATHS` covers every `(admin)` route plus `/change-password`.
- `SUPER_ADMIN_ONLY_PATHS = ['/admins']` — redirects non-SUPER_ADMIN roles to `/dashboard` based on the `admin_role` cookie.
- A forged or expired token still passes this check and gets rejected by the backend on the next API call (`apiFetch` handles the resulting 401).

If you add a new protected route, add it to **both** `PROTECTED_PATHS` and the `matcher` array in the same file — they're two separate lists that must stay in sync.

---

## 7. Providers & Root Layout

`app/layout.tsx` wraps everything in `<Providers>` (React Query + Sonner toaster) and sets `robots: { index: false, follow: false }` since this is an internal tool. `components/layout/providers.tsx` configures the shared `QueryClient`:

```tsx
new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
})
```

Individual queries override `staleTime`/`refetchInterval` as needed (e.g. dashboard stats poll every 30s).

Satoshi `.otf` files exist at `app/assets/satoshi/` but are not yet loaded via `next/font/local` — if you wire this up, the theme (`app/globals.css`) already has the CSS variable hooks expecting it.

---

## 8. Admin Shell Layout (Sidebar + Header)

`app/(admin)/layout.tsx` is a **client component** — it calls `useMe()` and force-redirects to `/change-password` if `mustChangePassword` is true, before rendering `<Sidebar>` + `<Header>` + page content.

Current nav (`components/layout/nav-items.ts`):

```ts
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',          href: '/dashboard',          permission: 'dashboard:view' },
  { label: 'Orders',             href: '/orders',             permission: 'orders:view' },
  { label: 'Transactions',       href: '/transactions',       permission: 'orders:view' },
  { label: 'Users',              href: '/users',              permission: 'users:view' },
  { label: 'Products',           href: '/products',           permission: 'products:view' },
  { label: 'Pricing',            href: '/pricing',            permission: 'pricing:view' },
  { label: 'Fraud Review',       href: '/fraud',               permission: 'fraud:view' },
  { label: 'Payment exceptions', href: '/payment-exceptions', permission: 'orders:view' },
  { label: 'Feature Flags',      href: '/feature-flags',      permission: 'feature-flags:view' },
  { label: 'Audit Log',          href: '/audit',              permission: 'audit:view' },
  { label: 'Team',               href: '/admins',             permission: 'admins:manage' },
];
```

`NavItem.permission` is checked via `hasPermission()` before rendering each link — a `ADMIN`/Manager role simply doesn't see `Team`.

---

## 9. Page Inventory

Every page below is a client component using TanStack Query + the corresponding `lib/api/*.ts` module. Dynamic `[id]/page.tsx` routes receive `params` as `Promise<{ id: string }>` — unwrap with React's `use()` hook.

| Route | Backend coverage | Notes |
|---|---|---|
| `/login` | `POST /admin/auth/login` (via BFF) | RHF + Zod, honors `?redirect=` |
| `/change-password` | `POST /admin/me/change-password` | Force-navigated to when `mustChangePassword` is true |
| `/dashboard` | `GET /admin/stats` | 30s poll, stat cards + charts (§10) |
| `/users`, `/users/[id]` | Full | List + search (nuqs-synced), detail with PIN unlock, recent orders, payment history |
| `/orders`, `/orders/[id]` | Full | Status/date/user filters, resend/fulfill/refund/retry actions gated by status |
| `/transactions` | Reuses orders data | Payment-focused view over the same order/payment data |
| `/products`, `/products/[id]` | Full | Category tabs, voucher upload (textarea, max 500 codes), pricing mode toggle |
| `/pricing` | Full | Current rate, oracle rate, rate history, set-rate + recompute (SUPER_ADMIN) |
| `/fraud` | Full | Approve/reject fraud events |
| `/payment-exceptions` | Full | Resolve with note |
| `/feature-flags` | Full | Toggle + time-window edit (SUPER_ADMIN) |
| `/audit` | Full | Actor/action/date filters, collapsible metadata JSON |
| `/admins` | Full | SUPER_ADMIN only — create/update/reset-password |
| `/discount-codes` | Full | Viewable by both roles; generate/revoke SUPER_ADMIN only — see §16 |

**Action badge/status colors:** use Panda semantic tokens (`success-100/700`, `error-100/700`, `info-100/700`, `warning-100/700`, `neutral-100/700`) for consistent light/dark mode.

---

## 10. Charts

**Recharts** is already installed and used on `/dashboard`. `orders-chart.tsx` renders a bar chart of order status counts using the Panda semantic color tokens. `/admin/stats` only returns totals + last-7-day aggregates (no time series), so the revenue chart is a two-bar comparison rather than a line/area chart. If a real time series is needed, that requires a new backend endpoint (e.g. `GET /admin/stats/revenue-series?days=30`) — not currently planned.

---

## 11. Reusable Components

`components/shared/` — still accurate, these are genuinely generic and haven't drifted:

- **`status-badge.tsx`** — maps `OrderStatus` (`PENDING | PAID | FULFILLED | EXPIRED | FAILED`) to a colored `<Badge>` using the semantic tokens above.
- **`stat-card.tsx`** — label/value/subtitle/icon dashboard tile with a `Skeleton` loading state.
- **`pagination-controls.tsx`** — `{ page, limit, total, onPageChange }` — Previous/Next with a "Showing X–Y of Z" label.
- **`confirm-dialog.tsx`** — generic "Are you sure?" wrapper used for resend/refund/revoke-style destructive or important actions, with `variant: 'default' | 'destructive'` and an `isPending` state.
- **`data-table.tsx`**, **`page-header.tsx`**, **`empty-state.tsx`** — generic table/layout/empty-state wrappers used across every list page.

Read these directly rather than copying snippets here — they're small and stable.

---

## 12. Form Patterns

Zod schema next to the form component, React Hook Form + `zodResolver`, TanStack `useMutation` for the submit, `queryClient.invalidateQueries` on success, toast on error:

```tsx
const mutation = useMutation({
  mutationFn: (data: FormValues) => someApiCall(data),
  onSuccess: () => {
    toast.success('Saved');
    queryClient.invalidateQueries({ queryKey: ['resource-key'] });
    form.reset();
  },
  onError: (e) => toast.error(e.message),
});
```

Disable the submit button while `mutation.isPending`.

---

## 13. Error & Loading Patterns

- **Loading:** Shadcn `Skeleton` shaped like the final content — no raw spinners.
- **Error:** icon + message + retry button calling `refetch()`.
- **Empty:** `<EmptyState message="..." />` when `data.data.length === 0`.
- **401:** handled centrally in `apiFetch` (`lib/api/client.ts`) — redirects to `/login` unless already there. No per-component handling needed.
- **403:** `apiFetch` throws an `ApiError` with a permission-denied message — surface it as a toast, don't silently swallow it (this is the real enforcement point, not the client-side `hasPermission()` check).

---

## 14. Backend CORS

Already implemented — `pandapay-be/src/main.ts` calls `app.enableCors({ origin: corsOrigins, credentials: true })`, where `corsOrigins` is built from `ADMIN_FRONTEND_URL` / `PUBLIC_FRONTEND_URL` / `STORE_FRONTEND_URL` env vars. Nothing to add on a fresh setup — just confirm `ADMIN_FRONTEND_URL=http://localhost:3001` is set in `pandapay-be`'s `.env` for local dev.

---

## 15. Deployment (Vercel)

1. `panda-admin` has its own git repo — push to GitHub as usual.
2. Import into Vercel.
3. Set env var `API_URL=https://api.pandapay.io` (see [§2](#2-environment-variables) — `API_URL` is preferred over `NEXT_PUBLIC_API_URL`).
4. Custom domain → Vercel project settings + DNS.
5. Confirm the deployed admin origin is added to `pandapay-be`'s `ADMIN_FRONTEND_URL` in production.

---

## 16. Discount Codes Admin UI

The backend module (`DISC-001`, `FEATURES.json` status `PASS`) is fully built and live at `admin/discount-codes`, and the frontend now consumes it (`app/(admin)/discount-codes/page.tsx`, `components/features/discount-codes/`). This section is kept as the contract reference this was built from — read it before changing the discount-codes UI.

### Backend contract (`pandapay-be/src/admin/controllers/discount-codes-admin.controller.ts`)

**`GET /admin/discount-codes`** — any admin. Query params: `page`, `limit` (default 20, max 100), `status?: 'ACTIVE'|'USED'|'EXPIRED'|'REVOKED'`, `productId?`, `category?`. Returns `{ data: DiscountCode[], total, page, limit }`.

**`POST /admin/discount-codes/generate`** — SUPER_ADMIN only. Body (`GenerateDiscountCodesDto`):
```ts
{
  count: number;              // 1–500
  productId?: string;         // UUID — exactly one of productId/category
  category?: ProductCategory; // 'GIFT_CARD' | 'GAME_TOP_UP' | 'AIRTIME' | 'CONSOLE_VOUCHER' | 'ENTERTAINMENT'
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;      // > 0
  expiresInDays?: number;     // 1–90
  recipientLabel?: string;    // informational only, max 120 chars
}
```

**`PATCH /admin/discount-codes/:id/revoke`** — SUPER_ADMIN only. No body.

### `DiscountCode` entity shape (add to `lib/types.ts`)

```ts
export type DiscountCodeStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';
export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface DiscountCode {
  id: string;
  code: string;
  productId: string | null;      // exactly one of productId/category is set
  category: ProductCategory | null;
  discountType: DiscountType;
  discountValue: string;         // DECIMAL — string
  recipientLabel: string | null;
  expiresAt: string;
  isUsed: boolean;
  usedAt: string | null;
  usedByOrderId: string | null;
  isRevoked: boolean;
  revokedAt: string | null;
  revokedBy: string | null;
  createdAt: string;
  updatedAt: string;
}
```

Note the backend has no derived `status` field on the entity itself — `ACTIVE/USED/EXPIRED/REVOKED` is computed server-side for filtering (`applyStatusFilter` in `discount-codes.service.ts`) from `isUsed`/`isRevoked`/`expiresAt`. The frontend should derive a display status the same way (`isRevoked` → REVOKED, else `isUsed` → USED, else `expiresAt < now` → EXPIRED, else ACTIVE) rather than expecting the API to return it.

### What was built (checklist, now complete)

1. **`lib/api/discount-codes.ts`** — `listDiscountCodes()`, `generateDiscountCodes()`, `revokeDiscountCode()`, mirroring the pattern in `lib/api/fraud.ts`/`lib/api/payment-exceptions.ts`.
2. **`lib/types.ts`** — `DiscountCode`, `DiscountCodeStatus`, `DiscountType`, `GenerateDiscountCodesInput` as specified above.
3. **`lib/permissions.ts`** — `discount-codes:view` (both roles) / `discount-codes:manage` (SUPER_ADMIN only, matching the backend's `SuperAdminGuard` on generate/revoke).
4. **`app/(admin)/discount-codes/page.tsx`** — paginated table with status filter tabs, "Generate codes" dialog gated to SUPER_ADMIN, per-row revoke wrapped in `<ConfirmDialog variant="destructive">` (only shown while a code is `ACTIVE`).
5. **`components/features/discount-codes/`** — `generate-discount-codes-dialog.tsx` (two-panel form → generated-codes-with-copy-all result, mirroring `create-admin-dialog.tsx`'s temp-password reveal pattern) and `discount-status-badge.tsx` (client-derived status, since the backend has no `status` column).
6. **`components/layout/nav-items.ts`** — `Tag`-icon nav entry gated on `discount-codes:view`.
7. **`proxy.ts`** — `/discount-codes` added to both `PROTECTED_PATHS` and `matcher`.

---

*Last updated: 2026-07-20 · Guide version 3.0 (rewritten against actual source — see staleness note at top)*
