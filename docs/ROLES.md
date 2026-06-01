# Admin roles & permissions

PandaPay admin uses two roles backed by `admin_users.role` in the API:

| Role (API) | UI label | Purpose |
|------------|----------|---------|
| `SUPER_ADMIN` | **Super Admin** | Root access — team management, global FX, product pricing modes |
| `ADMIN` | **Manager** | Day-to-day operations — orders, users, catalog stock, fraud review |

Permissions are enforced **twice**: UI hides/disables actions, and the NestJS API returns `403` for unauthorized mutations.

## Permission matrix

| Capability | Manager | Super Admin |
|------------|:-------:|:-----------:|
| Dashboard | ✓ | ✓ |
| Orders (view, fulfill, resend) | ✓ | ✓ |
| Users (view, unlock PIN, payments) | ✓ | ✓ |
| Products (CRUD, vouchers, availability) | ✓ | ✓ |
| Product pricing mode / USD face value | — | ✓ |
| Pricing (view rate, history, oracle) | ✓ | ✓ |
| Set global FX rate / recompute all | — | ✓ |
| Fraud review (approve / reject) | ✓ | ✓ |
| Audit log | ✓ | ✓ |
| Team (create admins, reset passwords) | — | ✓ |

## Backend enforcement (Super Admin only)

- `POST /admin/pricing/rate`, `POST /admin/pricing/recompute`
- `PATCH /admin/products/:id/pricing`
- `GET/POST/PATCH /admin/admins/*` (except `GET /admin/admins/directory` for audit labels)

## Creating operators

1. Log in as Super Admin (env bootstrap user or existing super admin).
2. Open **Team** → **Invite admin**.
3. Choose **Manager** for ops staff or **Super Admin** for root access.
4. Share the one-time temporary password securely.

## Code references

- `lib/permissions.ts` — permission sets
- `hooks/use-permissions.ts` — `can('orders:manage')` etc.
- `proxy.ts` — blocks `/admins` without super-admin role cookie
