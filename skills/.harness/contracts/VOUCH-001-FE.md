# SPRINT CONTRACT — VOUCH-001-FE

**Admin companion: rename discount → voucher; generate with value + currency**

> Status: **EXECUTE** — approved via parent execute of VOUCH-001 admin companion on
> `feat/cur-001-fe-currency-selector` (coordinated deploy with CUR-001-FE).
> Backend contract: `pandapay-be/skills/.harness/contracts/VOUCH-001.md`.

---

## Scope — WILL do

1. Rename admin UI discount → voucher: nav label, route `/voucher-codes`, copy, API client `/admin/voucher-codes`.
2. Generate dialog requires `value` + `currency` (`NGN` | `USD`) instead of `valueUsd`.
3. Types: `VoucherCode` / `GenerateVoucherCodesInput` with `value` + `currency`.
4. Update permissions, nav-items, proxy matchers.
5. Keep product-agnostic generate (no productId/categoryId).

## Scope — will NOT do

- Backend redemption / migrations (pandapay-be VOUCH-001).
- Percentage or product-scoped promos.
- Commit / push / PR.

## File impact map

| Path | Action |
|------|--------|
| `lib/api/discount-codes.ts` → `lib/api/voucher-codes.ts` | rename + path update |
| `lib/types.ts` | DiscountCode → VoucherCode |
| `app/(admin)/discount-codes/` → `voucher-codes/` | move |
| `components/features/discount-codes/` → `voucher-codes/` | rename + currency field |
| `components/layout/nav-items.ts` | label/href/permission |
| `lib/permissions.ts` | voucher-codes:* |
| `proxy.ts` | protected path + matcher |
| `lib/select-items.spec.ts` | assert value+currency payload |

## Success criteria

1. No remaining imports of `/admin/discount-codes` or `DiscountCode` in admin app sources.
2. Generate payload includes `value` and `currency`, not `valueUsd`.
3. `pnpm exec tsc --noEmit` exits 0.
4. `select-items.spec.ts` voucher tests pass.

## Verify

```bash
pnpm exec tsc --noEmit
node --experimental-strip-types --test lib/select-items.spec.ts
```
