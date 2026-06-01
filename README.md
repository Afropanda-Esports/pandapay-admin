# PandaPay Admin

Internal operations console for PandaPay. Next.js 16 (App Router) uses a **same-origin BFF** so admin JWTs never reach browser JavaScript.

## Quick start

```bash
pnpm install
cp .env.example .env.local
# API_URL=http://localhost:3000
pnpm dev                     # http://localhost:3001
```

Start the backend first (`pandapay-be` on port 3000). See [pandapay-be/INTEGRATION.md](../pandapay-be/INTEGRATION.md) for the full admin API matrix.

## Roles

| Role | Label | Access |
|------|-------|--------|
| `SUPER_ADMIN` | Super Admin | Full platform control including **Team** and global FX |
| `ADMIN` | Manager | Orders, users, products, fraud review, audit (no team / FX writes) |

See [docs/ROLES.md](./docs/ROLES.md) for the full matrix. Create managers from **Team** after logging in as Super Admin.

## Security model

| Layer | Behavior |
|-------|----------|
| **Login** | `POST /api/auth/login` → NestJS `POST /admin/auth/login` → **HttpOnly** `admin_token` cookie |
| **API calls** | Browser → `GET/POST /api/backend/...` → BFF adds `Authorization: Bearer` server-side |
| **Logout** | `POST /api/auth/logout` clears cookie + React Query cache |
| **Route guard** | `proxy.ts` requires session cookie on all admin routes (including `/fraud`) |
| **Headers** | CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, strict referrer |
| **Indexing** | `robots.txt` disallows all; `metadata.robots` noindex |

Production checklist:

- Set `API_URL` to the internal NestJS URL (not exposed in the browser).
- Serve admin over HTTPS so `Secure` cookies apply.
- Restrict admin host at the edge (VPN, IP allowlist, or SSO in front) — UI RBAC is not a perimeter control; the API enforces roles.

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `API_URL` | Yes (build) | NestJS base URL for server routes (`/api/auth/*`, `/api/backend/*`) |
| `NEXT_PUBLIC_API_URL` | Fallback | Used only if `API_URL` is unset (legacy) |

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
| `/login` | Works — BFF login |
| `/dashboard` | Works — stats + charts |
| `/orders`, `/orders/[id]` | Works — list, detail, resend, force fulfill |
| `/users`, `/users/[id]` | Partial — list/detail/unlock PIN |
| `/products`, `/products/[id]` | Works — CRUD + vouchers |
| `/pricing` | Works when backend pricing routes are enabled |
| `/fraud` | Fraud review queue |
| `/audit` | Works |
| `/admins` (Team) | Super Admin — invite managers & super admins |
| `/fraud` | Fraud review queue (approve held payments) |
| `/change-password` | Forced password change flow |

## Scripts

- `pnpm dev` — dev server on port **3001**
- `pnpm build` / `pnpm start` — production build (requires `API_URL` or `NEXT_PUBLIC_API_URL`)
- `pnpm lint` — ESLint

## Related repos

- **pandapay-be** — NestJS API, WhatsApp flows, Paystack webhooks
- **panda-pay** — marketing site
