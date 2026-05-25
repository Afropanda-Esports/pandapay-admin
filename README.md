# PandaPay Admin

Internal operations console for PandaPay. Next.js 16 (App Router) talks to the NestJS backend at `NEXT_PUBLIC_API_URL`.

## Quick start

```bash
pnpm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:3000
pnpm dev                     # http://localhost:3001
```

Start the backend first (`pandapay-be` on port 3000). See [pandapay-be/INTEGRATION.md](../pandapay-be/INTEGRATION.md) for the full admin API matrix.

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/INTEGRATION.md](./docs/INTEGRATION.md) | Which pages work vs which APIs are missing on the backend |
| [docs/admin-frontend.md](./docs/admin-frontend.md) | Stack, folder layout, API shapes, UI patterns |
| [docs/implementation-plan.md](./docs/implementation-plan.md) | Original phased build plan (mostly complete) |
| [../pandapay-be/INTEGRATION.md](../pandapay-be/INTEGRATION.md) | Canonical admin ↔ backend contract (shared) |
| [../pandapay-be/STANDARDS_AUDIT.md](../pandapay-be/STANDARDS_AUDIT.md) | `.cursorrules` compliance backlog |

## Routes

| Path | Status |
|------|--------|
| `/login` | Works — `POST /admin/auth/login` |
| `/dashboard` | Works — stats + charts |
| `/orders`, `/orders/[id]` | Works — list, detail, resend, force fulfill |
| `/users`, `/users/[id]` | Partial — list/detail/unlock PIN; wallet credit & transactions **404** |
| `/products`, `/products/[id]` | Works — CRUD + vouchers; per-product pricing PATCH **404** |
| `/pricing` | UI only — all `/admin/pricing/*` **404** on backend |
| `/audit` | Works |
| `/admins` | UI only — all `/admin/admins/*` **404** on backend |
| `/change-password` | UI only — `POST /admin/me/change-password` **404** |

## Scripts

- `pnpm dev` — dev server on port **3001**
- `pnpm build` / `pnpm start` — production build
- `pnpm lint` — ESLint

## Related repos

- **pandapay-be** — NestJS API, WhatsApp flows, Paystack webhooks
- **panda-pay** — marketing site (static offerings until `GET /offerings` exists)
