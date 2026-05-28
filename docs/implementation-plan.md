# PandaPay Admin — Phased Implementation Plan

> **Companion to:** [admin-frontend.md](./admin-frontend.md)
> **Stack baseline:** Next.js 16.2.4 · React 19.2.4 · Tailwind v4 · pnpm
> **Backend:** `http://localhost:3000` (NestJS — must enable CORS for `http://localhost:3001`)
> **Frontend:** `http://localhost:3001`

## Current status (2026-05-19)

| Phase | Status |
|-------|--------|
| P0–P3 Foundation, auth, shell | **Done** |
| P4 Dashboard | **Done** |
| P5 Products | **Done** (BE pricing fields not wired — use `denomination`) |
| P6 Orders | **Done** (includes force fulfill when order is PAID) |
| P7 Users | **Done** (wallet credit / transactions UI calls missing BE routes) |
| P8 Audit | **Done** |
| P9 Pricing + Admins | **UI done** — backend routes **not implemented** |

**Next work:** Align with [INTEGRATION.md](./INTEGRATION.md) — either implement missing pandapay-be admin routes or hide/disable Pricing, Admins, and change-password until ready.

---

This plan breaks the build into **9 phases**. Each phase is independently deployable / testable. Earlier phases unblock later ones — work strictly in order unless a phase is explicitly marked parallelizable.

**Historical note:** The checklist below was the original bootstrap tracker; most items are now complete (`[x]`).

---

## Master dependency table

All third-party packages, grouped by what introduces them. **Do not pre-install.** Add each set when its phase starts so reviewers can trace why each dep landed.

| Package | Phase | Dev dep? | Purpose |
|---|---|---|---|
| `js-cookie` | P0 | runtime | Token cookie read/write |
| `@types/js-cookie` | P0 | dev | Types for above |
| `@tanstack/react-query` | P1 | runtime | Server state, caching, mutations |
| `@tanstack/react-query-devtools` | P1 | runtime | Inspect queries in dev |
| `lucide-react` | P1 | runtime | Icon set used by Shadcn + nav |
| `clsx` | P1 (auto via shadcn) | runtime | `cn()` helper deps |
| `tailwind-merge` | P1 (auto via shadcn) | runtime | `cn()` helper deps |
| `class-variance-authority` | P1 (auto via shadcn) | runtime | Shadcn variant API |
| `tw-animate-css` | P1 (auto via shadcn) | runtime | Shadcn animations on Tailwind v4 |
| `react-hook-form` | P2 | runtime | Form state |
| `@hookform/resolvers` | P2 | runtime | Zod adapter |
| `zod` | P2 | runtime | Schema validation |
| `sonner` | P2 (auto via shadcn add) | runtime | Toaster |
| `recharts` | P4 | runtime | Dashboard charts |
| `nuqs` | P5 | runtime | URL-synced search/filter state |
| `usehooks-ts` | P5 | runtime | `useDebounce` |
| `date-fns` | P5 | runtime | Date formatting (`format`, `formatDistanceToNow`) |
| `react-day-picker` | P6 (auto via shadcn calendar) | runtime | Calendar primitive |

Shadcn primitives (added via `pnpm dlx shadcn@latest add ...`):
| Primitive | First needed in |
|---|---|
| `button` `card` `input` `label` `form` | P2 |
| `sonner` (toaster) | P2 |
| `skeleton` `badge` `avatar` `dropdown-menu` `tooltip` `separator` | P3 |
| `alert` | P3 |
| `tabs` | P5 |
| `dialog` `textarea` `select` | P5 |
| `popover` `calendar` | P6 |
| `sheet` (mobile sidebar, optional) | P3 |

---

## Phase 0 — Project plumbing

**Goal:** Codebase ready to build features against. No business logic yet.

**Tasks:**
1. Update `package.json` `dev` script → `"next dev --port 3001"`.
2. Create `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:3000`.
3. Create `.env.example` mirroring it (no secrets, checked in).
4. **Add Satoshi fonts** at `app/assets/satoshi/Satoshi-{Regular,Italic,Bold,BoldItalic}.otf` — or, if not yet available, comment out the `@font-face` block in `globals.css` for now.
5. Wire `next/font/local` in `app/layout.tsx` once fonts exist (see admin-frontend.md §8).
6. Backend coordination: ask backend dev to add `app.enableCors({ origin: 'http://localhost:3001', credentials: true })` to `src/main.ts` and set `ADMIN_FRONTEND_URL=http://localhost:3001` in backend `.env` (see admin-frontend.md §15).
7. Install P0 deps: `pnpm add js-cookie && pnpm add -D @types/js-cookie`.

**Acceptance:**
- `pnpm dev` boots on `http://localhost:3001`.
- Visit `/` — current placeholder renders, no console errors.
- `curl http://localhost:3000/admin/stats -H "Origin: http://localhost:3001" -I` returns `Access-Control-Allow-Origin: http://localhost:3001`.

**Unblocks:** all subsequent phases.

---

## Phase 1 — Foundation: types, API client, Shadcn

**Goal:** Type-safe HTTP layer + UI primitive system. Still no pages.

**Tasks:**
1. Install: `pnpm add @tanstack/react-query @tanstack/react-query-devtools lucide-react`.
2. Initialize Shadcn for Tailwind v4:
   ```
   pnpm dlx shadcn@latest init
   ```
   - Style: New York
   - Base color: Neutral (we'll override via Panda tokens)
   - CSS variables: yes
   - **After init**, open the generated `app/globals.css` patches and the new `:root` block — Shadcn appends its own `--background`, `--foreground`, `--card`, etc. **Keep them**. They live alongside Panda's `--color-*` tokens — different namespaces, no conflict. If Shadcn overwrites `globals.css` wholesale, restore the Panda `@theme { ... }` block from version control and merge.
3. Create [lib/types.ts](../lib/types.ts) — copy from admin-frontend.md §5.
4. Create [lib/api/client.ts](../lib/api/client.ts) — `apiFetch` wrapper with 401 redirect.
5. Create the six per-resource API modules: `auth.ts`, `stats.ts`, `users.ts`, `orders.ts`, `products.ts`, `audit.ts`.
6. Create [components/layout/providers.tsx](../components/layout/providers.tsx) — `QueryClientProvider` + devtools.
7. Wire `<Providers>` into `app/layout.tsx`.
8. Add Shadcn primitives: `pnpm dlx shadcn@latest add button card input label form sonner`.
9. Add `<Toaster richColors position="top-right" />` to root layout.

**Acceptance:**
- `pnpm typecheck` (or `pnpm tsc --noEmit`) passes.
- Open the app — React Query devtools button appears in dev.
- A throwaway `useQuery({ queryKey: ['ping'], queryFn: () => fetch('/admin/stats').then(r => r.json()) })` in `app/page.tsx` errors with 401 (because no token yet), proving the client + base URL + CORS path work.

**Unblocks:** P2 (login can use `auth.ts`) and all data pages.

---

## Phase 2 — Auth (login + proxy guard)

**Goal:** End-to-end auth — admin can log in, get redirected to `/dashboard`, and protected routes bounce unauthenticated users to `/login`.

**Tasks:**
1. Install: `pnpm add react-hook-form @hookform/resolvers zod`.
2. Create [hooks/use-auth.ts](../hooks/use-auth.ts) — `getToken`, `saveToken`, `logout`, `isLoggedIn`.
3. Create [proxy.ts](../proxy.ts) at project root (Next 16 — `proxy` function, not `middleware`). Code in admin-frontend.md §7.2.
4. Create [app/login/page.tsx](../app/login/page.tsx) — RHF + Zod form, `<Form>`, `<Input>`, `<Button>`.
5. On submit success: `saveToken(access_token)` → `router.push(redirectParam ?? '/dashboard')`.
6. On submit error: `toast.error(e.message)`.
7. Update [app/page.tsx](../app/page.tsx) to redirect: `redirect('/dashboard')` (the proxy will bounce to `/login` if not authed).

**Acceptance:**
- `/dashboard` (no token) → redirected to `/login?redirect=/dashboard`.
- Bad creds → red toast, stays on `/login`.
- Good creds → cookie set, redirected to `/dashboard` (which 404s for now — that's fine, fixed in P4).
- `/login` while authed → redirected to `/dashboard`.

**Unblocks:** every protected page.

---

## Phase 3 — Admin shell

**Goal:** Sidebar + header layout that wraps every authenticated page.

**Tasks:**
1. Add Shadcn primitives: `pnpm dlx shadcn@latest add skeleton badge avatar dropdown-menu tooltip separator alert sheet`.
2. Create [components/layout/nav-items.ts](../components/layout/nav-items.ts).
3. Create [components/layout/sidebar.tsx](../components/layout/sidebar.tsx):
   - Active link highlight using `usePathname()`.
   - Logo at top, nav list, user avatar + logout at bottom.
   - Use Panda tokens: `bg-nav-bg`, `text-text-primary`, `border-border-subtle`.
4. Create [components/layout/header.tsx](../components/layout/header.tsx):
   - Page title (slot via `<PageHeader>` from shared, or read from route meta).
   - Right side: theme toggle, user menu (dropdown with logout).
5. Create [app/(admin)/layout.tsx](../app/(admin)/layout.tsx) — shell from admin-frontend.md §9.
6. Create shared primitives needed broadly: [components/shared/page-header.tsx](../components/shared/page-header.tsx), [components/shared/empty-state.tsx](../components/shared/empty-state.tsx), [components/shared/pagination-controls.tsx](../components/shared/pagination-controls.tsx).

**Acceptance:**
- A throwaway `app/(admin)/dashboard/page.tsx` returning `<h1>Dashboard</h1>` renders **inside** the shell.
- Sidebar nav items navigate correctly; active item highlights.
- Logout from header dropdown clears cookie and redirects to `/login`.
- Layout is responsive (sidebar collapses to a `<Sheet>` drawer on `md:` and below — optional, can defer to P9).

**Unblocks:** all data pages.

---

## Phase 4 — Dashboard

**Goal:** First real data page. Validates the entire pipeline (proxy → token → fetch → react-query → chart).

**Tasks:**
1. Install: `pnpm add recharts`.
2. Create [components/shared/stat-card.tsx](../components/shared/stat-card.tsx).
3. Create [components/features/dashboard/orders-chart.tsx](../components/features/dashboard/orders-chart.tsx) — bar chart with Panda token colors via CSS vars.
4. Create [components/features/dashboard/revenue-chart.tsx](../components/features/dashboard/revenue-chart.tsx) — Option A two-bar comparison.
5. Create [app/(admin)/dashboard/page.tsx](../app/(admin)/dashboard/page.tsx):
   - `useQuery({ queryKey: ['stats'], queryFn: getStats, refetchInterval: 30_000 })`.
   - Four `<StatCard>` in a 4-col grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-4`).
   - Two charts in a 2-col grid below.
   - Skeleton states matching the layout.

**Acceptance:**
- Dashboard renders live numbers from `/admin/stats`.
- 30s passes → numbers refresh without manual reload (visible in network tab).
- Both charts render with correct Panda colors in light + dark mode.

**Unblocks:** product, order, user, audit pages (all reuse `<StatCard>`, `<PageHeader>`, etc.).

---

## Phase 5 — Products module

> Built before orders/users because **ops needs to seed voucher stock** before orders are testable end-to-end.

**Goal:** List → detail → create → upload vouchers.

**Tasks:**
1. Install: `pnpm add nuqs usehooks-ts date-fns`.
2. Add Shadcn primitives: `pnpm dlx shadcn@latest add tabs dialog textarea select`.
3. Create [app/(admin)/products/page.tsx](../app/(admin)/products/page.tsx):
   - `useQuery({ queryKey: ['products'], queryFn: () => getProducts() })`.
   - Tabs filter the array client-side (no refetch per tab).
   - Card grid with stock bar (green/amber/red thresholds).
   - "New Product" button → `<CreateProductDialog>`.
4. Create [components/features/products/create-product-dialog.tsx](../components/features/products/create-product-dialog.tsx) — RHF + Zod, on success invalidate `['products']`.
5. Create [app/(admin)/products/[id]/page.tsx](../app/(admin)/products/[id]/page.tsx) — **client component, `use(params)` for the id**.
   - Details card with availability toggle (`updateProduct`).
   - Voucher stats card.
   - Upload textarea + button → `uploadVouchers(id, codes)`.
6. Create [components/features/products/upload-vouchers-dialog.tsx](../components/features/products/upload-vouchers-dialog.tsx) (or inline section — pick one).

**Acceptance:**
- Create a product → it appears in the list without a manual refresh.
- Upload 3 codes → toast `Inserted 3 vouchers` → stats card updates.
- Toggle availability → reflected in list immediately.
- Stock bar color shifts as available/total ratio changes.

**Unblocks:** P6 — end-to-end order test (need fulfilled stock).

---

## Phase 6 — Orders module

**Goal:** Full order list with filters, detail view, resend action. Core daily workflow.

**Tasks:**
1. Add Shadcn primitives: `pnpm dlx shadcn@latest add popover calendar`.
2. Create [components/shared/status-badge.tsx](../components/shared/status-badge.tsx) — Panda semantic colors per `OrderStatus`.
3. Create [components/shared/confirm-dialog.tsx](../components/shared/confirm-dialog.tsx).
4. Create [components/features/orders/order-filters.tsx](../components/features/orders/order-filters.tsx):
   - Status select.
   - Date range (`<Popover>` + `<Calendar mode="range">`).
   - User ID input.
   - All synced to URL via `nuqs`.
5. Create [app/(admin)/orders/page.tsx](../app/(admin)/orders/page.tsx) — paginated table, Resend button on `FULFILLED` rows wrapped in `<ConfirmDialog>`.
6. Create [app/(admin)/orders/[id]/page.tsx](../app/(admin)/orders/[id]/page.tsx) — `use(params)`. Surface fulfillment inconsistency banner when `voucherAssigned === true && voucherIsUsed === false`.

**Acceptance:**
- Filter by `status=FULFILLED` → URL updates to `?status=FULFILLED` → results reflect filter; back button restores prior state.
- Date range filter works (verify network call has `from`/`to` ISO params).
- Resend confirmation → success toast `Voucher resent via WhatsApp`.
- Truncated UUIDs show full value on hover (`<Tooltip>`).

**Unblocks:** P7 user detail (reuses Order list snippet for "Recent Orders").

---

## Phase 7 — Users module

**Tasks:**
1. Create [app/(admin)/users/page.tsx](../app/(admin)/users/page.tsx):
   - `nuqs` for `search` and `page`.
   - 300 ms debounced search.
   - Table from admin-frontend.md §10.3.
2. Create [components/features/users/pin-status-card.tsx](../components/features/users/pin-status-card.tsx) — shows attempts / lock state, "Unlock PIN" button gated on `pinStatus.isLocked === true`.
3. Create [app/(admin)/users/[id]/page.tsx](../app/(admin)/users/[id]/page.tsx) — `use(params)`.
   - Profile + PIN cards in a 2-col grid.
   - Recent orders table below.
   - "Unlock PIN" mutation → `invalidateQueries(['user', id])`.

**Acceptance:**
- Type a phone number prefix → list filters after 300ms debounce, page resets to 1.
- Locked user → PIN card shows red "Locked until {time}", button enabled.
- Click Unlock → toast → card flips to "Unlocked" with no page reload.

**Unblocks:** P8 (audit log shows user actions; cross-link from user detail to filtered audit log is nice-to-have).

---

## Phase 8 — Audit log

**Tasks:**
1. Create [app/(admin)/audit/page.tsx](../app/(admin)/audit/page.tsx):
   - Filters: actor (text), action (select with all `AuditAction` values), date range.
   - Table with collapsible JSON metadata column.
   - Action badges colored via Panda semantic tokens (`success-100`, `info-100`, `warning-100`, `error-100`, `neutral-100`).

**Acceptance:**
- All 10 `AuditAction` values render with distinct colors that survive theme toggle.
- Click metadata cell → expands to formatted JSON; click again → collapses.
- Filtering by `action=ADMIN_RESEND` returns only resend events.

**Unblocks:** —

---

## Phase 9 — Polish & deploy

**Goal:** Ship.

**Tasks:**
1. Add `loading.tsx` per route segment with skeletons matching final layout.
2. Add `error.tsx` per route segment with retry button.
3. Add `not-found.tsx` for the (admin) group.
4. Theme toggle in header (light/dark) — persist in `localStorage`, hydrate via `<script>` in `<head>` to avoid FOUC.
5. Add `unstable_instant` export to `/orders` and `/users` list pages (Next 16 instant navigation — see `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.mdx`).
6. Mobile sidebar drawer (`<Sheet>` toggle in header on `md:` and below).
7. **Backend deploy coordination:** push CORS update to staging/prod with the production frontend origin.
8. Vercel project setup:
   - Import repo.
   - Env: `NEXT_PUBLIC_API_URL=https://api.pandapay.io`.
   - Custom domain `admin.pandapay.io` + DNS.
9. Smoke test all 9 routes against production API with a real admin token.

**Acceptance:**
- Lighthouse perf ≥ 85 on `/dashboard` (the heaviest page).
- All pages have non-blank loading states.
- Error boundary catches a forced 500 (test by stopping backend mid-fetch).
- `pnpm build` succeeds with zero warnings.

---

## Phase dependency graph

```
P0 ──► P1 ──► P2 ──► P3 ──► P4 ──┬──► P5 ──► P6 ──► P7 ──► P8 ──► P9
                                  │
                                  └──► P5 (P5 blocks P6 because orders need stock to test)
```

P4 (Dashboard) and P5 (Products) can technically start in parallel after P3, but **P5 should land before P6** so order fulfillment is testable end-to-end.

---

## File checklist

Mirrors admin-frontend.md §3. **Completed** unless noted.

### Root
- [x] `proxy.ts` (P2)
- [x] `components.json` (P1)
- [x] `.env.example` (P0) — `.env.local` is local-only, not committed
- [x] `package.json` dev script port 3001 (P0)

### `app/`
- [x] `app/layout.tsx` + `<Providers>`, `<Toaster>` (P1)
- [x] `app/page.tsx` (P2)
- [x] `app/login/page.tsx` (P2)
- [x] `app/change-password/page.tsx` (BE route pending)
- [x] `app/(admin)/layout.tsx` (P3)
- [x] `app/(admin)/dashboard/page.tsx` (P4)
- [x] `app/(admin)/products/page.tsx`, `products/[id]/page.tsx` (P5)
- [x] `app/(admin)/orders/page.tsx`, `orders/[id]/page.tsx` (P6)
- [x] `app/(admin)/users/page.tsx`, `users/[id]/page.tsx` (P7)
- [x] `app/(admin)/audit/page.tsx` (P8)
- [x] `app/(admin)/pricing/page.tsx`, `admins/page.tsx` (P9 UI — BE pending)
- [ ] `app/assets/satoshi/*.otf` (optional)

### `lib/`
- [x] `lib/types.ts`, `lib/utils.ts`
- [x] `lib/api/client.ts`, `auth.ts`, `stats.ts`, `users.ts`, `orders.ts`, `products.ts`, `audit.ts`
- [x] `lib/api/pricing.ts`, `admins.ts`, `me.ts` (clients exist; several BE routes missing)

### `hooks/`
- [x] `hooks/use-auth.ts`, `hooks/use-me.ts`

### `components/layout/` & `shared/` & `features/`
- [x] Layout, shared, and feature components per phases P3–P7 (see repo tree)

### `components/ui/`
- [x] Shadcn primitives installed (button, card, dialog, tabs, calendar, etc.)

---

*Last updated: 2026-05-19*
