# Admin ↔ Backend Integration

How this app connects to [pandapay-be](../../pandapay-be/). The **canonical** contract (including changelog) lives in [pandapay-be/INTEGRATION.md](../../pandapay-be/INTEGRATION.md) — keep both in sync when routes change.

## Configuration

| Variable | Default | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | NestJS base URL (no `/api/v1` prefix) |

Auth: JWT from `POST /admin/auth/login` stored in cookie `admin_token`. All admin calls use `Authorization: Bearer <token>` via `lib/api/client.ts`.

Backend must allow CORS from `http://localhost:3001` with credentials (`ADMIN_FRONTEND_URL` in pandapay-be).

## Page ↔ API matrix

### Fully wired

| Page | `lib/api` | Backend routes |
|------|-----------|------------------|
| Login | `auth.ts` | `POST /admin/auth/login` |
| Shell / profile | `me.ts` | `GET /admin/me` |
| Dashboard | `stats.ts` | `GET /admin/stats` |
| Orders list/detail | `orders.ts` | `GET /admin/orders`, `GET /admin/orders/:id`, `POST .../resend`, `POST .../fulfill` |
| Users list/detail | `users.ts` | `GET /admin/users`, `GET /admin/users/:id`, `PATCH .../unlock-pin` |
| Products list/detail | `products.ts` | `GET/POST/PATCH /admin/products`, voucher upload/stats |
| Audit | `audit.ts` | `GET /admin/audit-logs` |

### UI built, backend missing (expect 404 / network errors)

| Page | `lib/api` | Missing routes |
|------|-----------|------------------|
| Change password | `me.ts` | `POST /admin/me/change-password` |
| User detail (wallet) | `users.ts` | `GET /admin/users/:id/transactions`, `POST /admin/users/:id/wallet/credit` |
| Product pricing card | `products.ts` | `PATCH /admin/products/:id/pricing` |
| Pricing | `pricing.ts` | All `/admin/pricing/*` |
| Admins | `admins.ts` | All `/admin/admins/*` |

**Product decision (open):** hide Pricing / Admins / change-password until BE ships, or implement the missing admin module on pandapay-be. See [STANDARDS_AUDIT.md](../../pandapay-be/STANDARDS_AUDIT.md).

## Type / response mismatches

Until a pricing module exists on the backend:

- Use **`denomination`** (string decimal from TypeORM) for NGN price — not `snapshotNgnPrice`, `priceUsd`, or `pricingMode` on product payloads.
- Order **`amount`** is a string in JSON; parse with `parseFloat` for display.
- Login returns `display_name`, `role: SUPER_ADMIN`, `must_change_password: false` — see BE doc for the full shape.

## Local dev checklist

1. PostgreSQL + migrations: `cd pandapay-be && pnpm run migration:run && pnpm run start:dev`
2. Admin env: `cd pandapay-admin && cp .env.example .env.local && pnpm dev`
3. Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from pandapay-be `.env`
4. Swagger (non-prod): `http://localhost:3000/api/docs`

## Changelog

- **2026-05-19:** Initial admin doc; aligned with BE Track A (`/admin/me`, login shape, order fulfill).
