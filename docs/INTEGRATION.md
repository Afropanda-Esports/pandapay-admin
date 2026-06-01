# Admin ↔ Backend Integration

How this app connects to [pandapay-be](../../pandapay-be/). The **canonical** contract (including changelog) lives in [pandapay-be/INTEGRATION.md](../../pandapay-be/INTEGRATION.md) — keep both in sync when routes change.

## Configuration

| Variable | Default | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | NestJS base URL (no `/api/v1` prefix) |

Auth: JWT from `POST /admin/auth/login` stored in cookie `admin_token`. All admin calls use `Authorization: Bearer <token>` via `lib/api/client.ts`.

Backend must allow CORS from the admin origin with credentials (`CORS_ORIGINS` or `ADMIN_FRONTEND_URL` in pandapay-be).

## Page ↔ API matrix

### Fully wired

| Page | `lib/api` | Backend routes |
|------|-----------|------------------|
| Login | `auth.ts` | `POST /admin/auth/login` |
| Shell / profile | `me.ts` | `GET /admin/me`, `POST /admin/me/change-password` |
| Dashboard | `stats.ts` | `GET /admin/stats` |
| Orders list/detail | `orders.ts` | `GET /admin/orders`, `GET /admin/orders/:id` (includes `payments` + `paymentTimeline` alias), `POST .../resend`, `POST .../fulfill` |
| Users list/detail | `users.ts` | `GET /admin/users`, `GET /admin/users/:id`, `GET .../payments`, `PATCH .../unlock-pin` |
| Products list/detail | `products.ts` | `GET/POST/PATCH /admin/products`, `PATCH .../pricing`, voucher upload/stats |
| Pricing | `pricing.ts` | `GET/PATCH /admin/pricing/*`, oracle rate, recompute |
| Admins | `admins.ts` | `GET/POST/PATCH /admin/admins/*` |
| Audit | `audit.ts` | `GET /admin/audit-logs` |

### Storefront (panda-pay, not admin)

| Consumer | Backend route |
|----------|-----------------|
| Marketing site inventory | `GET /offerings` |
| Spec catalog API | `GET /api/v1/catalog` |

## Response notes

- Product payloads include **`snapshotNgnPrice`**, `priceUsd`, `pricingMode`, and optional **`sku`**.
- Order **`amount`** is a string in JSON; parse for display.
- Order detail includes **`payments`** (and **`paymentTimeline`** alias) — array of `{ id, method, amount, providerRef, confirmedAt }` from the immutable `payments` table.
- Login returns `display_name`, `role`, `must_change_password` — see BE doc for the full shape.

## Local dev checklist

1. Start stack: `docker compose up -d` from repo root (Postgres + Redis + backend), or `cd pandapay-be && pnpm migration:run && pnpm start:dev` with `REDIS_URL` set.
2. Admin env: `cd pandapay-admin && cp .env.example .env.local && pnpm dev`
3. Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from pandapay-be `.env`
4. Swagger (non-prod): `http://localhost:3000/api/docs`

## Changelog

- **2026-05-30:** Phase A refresh — pricing, admins, change-password, wallet credit, and payment timeline are wired; storefront `/offerings` documented.
- **2026-05-19:** Initial admin doc; aligned with BE Track A (`/admin/me`, login shape, order fulfill).
