# SPRINT CONTRACT — CUR-001-FE

**A currency selector, and the product form talking to the API that actually shipped**

> Status: **EXECUTED — PENDING_REVIEW.** D1 locked as **(a)** — derive `baseCurrency` from `pricingMode`.
> Companion frontend to CUR-001 ([be#159](https://github.com/Afropanda-Esports/pandapay-be/pull/159),
> merged) and PRICE-002 ([be#160](https://github.com/Afropanda-Esports/pandapay-be/pull/160), merged).
>
> **This is not a polish sprint. Product creation from the admin console is broken on `main` right
> now**, and two more fields the UI reads no longer exist on the API. The currency selector the human
> asked for is the reason to open the file; the breakage is why it cannot wait.

---

## Work-type profile

`ui` — admin catalog management. Gates: `code-quality-gate`.
`security-checklist` **N/A** — no credential, authz or destructive path is touched. The role gates on
this page were settled in CAT-010-FE and are not modified.

---

## Design source

Human: *"currency should no longer be a free field… a currency MUST be supported by the system, so it
should be a list determined… once set this becomes the base currency of that product."*

CUR-001 scope item 4, deferred at the time: *"A currency selector in the admin product form (companion
FE work), replacing the free-text field."*

---

## Investigation (grounded)

### 1. Creating a product is broken on `main` — two ways at once

`main.ts:27` runs the global `ValidationPipe` with `whitelist: true` **and
`forbidNonWhitelisted: true`**. `CreateProductDto` (`src/admin/dto/create-product.dto.ts:37`) now
declares:

```ts
@IsEnum(SupportedCurrency)
baseCurrency: SupportedCurrency;   // required — no @IsOptional
```

The admin app sends `currency: data.currency`
(`create-product-dialog.tsx:165,175`) and never sends `baseCurrency`. So every submit gets a **400**
carrying two violations: `property currency should not exist`, and `baseCurrency must be one of the
following values: NGN, USD`.

**This is not a hypothesis about the future — it is the current state of `origin/main` on both repos.**
The first success criterion is that a product can be created at all.

### 2. Two fields the UI reads were removed from the product

| Read at | Field | State on the API |
|---|---|---|
| `products/page.tsx:108`, `products/[id]/page.tsx:108,292` | `product.currency` | Renamed to `baseCurrency` by CUR-001 |
| `pricing-card.tsx:55,121` | `product.manualPriceNgn` | Column dropped by PRICE-002; now a transient *input* only |

`lib/types.ts:292,296` still declares both as present, so the compiler asserts a `string` for values
that are `undefined` at runtime. Two visible consequences:

- `formatPrice(price, undefined)` falls to its else branch and renders **"6,985 undefined"** — on the
  products list price column and in the product detail page header.
- The pricing card's NGN field initialises from `product.manualPriceNgn ?? ''` and so **opens empty
  every time**, and its `hasChanges` comparison is against a value that is never there.

This is the same class of defect CAT-010-FE fixed for `archivedAt` and `ProductBrand.categoryId`, and
it is fixed here for the same reason: the currency UI cannot be written on top of a type that lies.

### 3. `baseCurrency` and `pricingMode` overlap, and nothing keeps them coherent

Two fields now describe adjacent things, and `git grep baseCurrency -- src/products src/admin` on
`origin/main` finds **no cross-validation anywhere**. `toQuoteLines`
(`src/orders/cart-order-quote.util.ts:46`) branches on `baseCurrency` alone:

| `baseCurrency` | `pricingMode` | What checkout does | Verdict |
|---|---|---|---|
| NGN | MANUAL_NGN | prices from `snapshotNgnPrice`, which is the admin's own figure | correct |
| USD | GLOBAL_FX | prices from `priceUsd` at the quoted rate | correct |
| USD | MANUAL_NGN | prices from `priceUsd × rate`, **ignoring the naira price the admin set** | silently wrong |
| NGN | GLOBAL_FX | prices from `snapshotNgnPrice`, **which the scheduler rewrites on every rate change** | reintroduces the exact stale-cache exposure PRICE-002 removed |

The bottom two rows are creatable today through two independent dropdowns. That is **D1**, and it is
the only genuinely open decision in this sprint.

### 4. The `priceUsd` field is required in both modes, and stays that way

DISC-008 made every product carry a dollar value because a USD voucher is measured against it
(`pricing-snapshot.util.ts:22`). `usdPriceHelp()` already explains that its *meaning* differs by mode.
Adding a currency selector must not disturb that — a `MANUAL_NGN` product still declares a dollar
value it is not priced from.

### 5. This repo can only test pure functions

`package.json` runs `node --experimental-strip-types --test` over **an explicit list of four
`lib/*.spec.ts` files**. There is no jsdom, no React Testing Library, and no component test in the
repo — including for CAT-010-FE, whose contract described some.

Stating it plainly so the test plan below is not read as more than it is: **the testable core has to be
extracted into `lib/`**, and adding a spec means editing the `test:unit` file list. Anything left
inside the `.tsx` is verified by build, types, lint and the human check — not by a test.

---

## Scope — WILL do

1. **Replace the free-text currency `Input` with a Select** over the supported set, in
   `create-product-dialog.tsx`. Send `baseCurrency`; stop sending `currency`.
2. **A single source for the supported set in the admin app** — `lib/money.ts`, mirroring the
   backend's `SupportedCurrency`. Two members, one place, so the next surface does not invent a third
   list.
3. **Keep the two fields coherent, per D1.**
4. **Fix the two stale types** — `Product.currency` → `baseCurrency`; drop `Product.manualPriceNgn`,
   and drop it from the `updateProductPricing` *response* typing while keeping it in the request body,
   which the API still accepts.
5. **Repair the pricing card** so the NGN field initialises from something that exists and
   `hasChanges` compares against it.
6. **One shared money formatter** in `lib/money.ts`, replacing the two copies of `formatPrice`
   duplicated in `products/page.tsx:30` and `products/[id]/page.tsx:33`, rendering an amount in its
   own currency — `$5` and `₦8,000`, matching what CUR-001 made WhatsApp show.
7. **Show base currency on the product surfaces** — the detail page's Currency row and header, and the
   list page's price column, so the console and the bot describe a product the same way.
8. Specs for every pure function added, wired into `test:unit`.

## Scope — will NOT do

- **No backend change.** If D1 lands on server-side enforcement, that is a separate BE sprint with its
  own contract; this sprint does not reach across the repo boundary.
- **No editing a product's currency after creation.** Base currency is what checkout prices from, and
  changing it on a product with orders reinterprets history. Out of scope, deliberately, and worth its
  own decision later.
- **No third currency.** The set is what the backend enum supports; widening it is a backend change
  first.
- **No component-test harness.** Adding jsdom and RTL is a real piece of work and would dwarf this
  sprint. Recorded as debt — see the gap under Risk.
- **No change to `pricingMode` semantics, to `priceUsd` being required, or to the DISC-008 help text.**
- **No voucher or discount work** — VOUCH-001.

---

## Target / Branch

`pandapay-admin`:

- `components/features/products/create-product-dialog.tsx` — the selector, and the corrected payload
- `components/features/products/pricing-card.tsx` — the NGN field's initial value
- `app/(admin)/products/page.tsx`, `app/(admin)/products/[id]/page.tsx` — formatter and currency reads
- `app/(admin)/orders/[id]/page.tsx:309` — reads `order.product.currency`
- `lib/types.ts` — the two stale fields
- `lib/api/products.ts` — `createProduct` body type
- `lib/money.ts` + `lib/money.spec.ts` — new
- `package.json` — the `test:unit` file list

Branch: `feat/cur-001-fe-currency-selector` from `origin/main`.

---

## Blocking question — D1: how do `baseCurrency` and `pricingMode` stay coherent?

Two of the four combinations are wrong, one of them silently (see Investigation 3). The form can
prevent both, and the question is whether it should do so by construction or by validation.

- **(a) Recommended — derive `baseCurrency` from `pricingMode`; do not ask twice.** `MANUAL_NGN` →
  `NGN`, `GLOBAL_FX` → `USD`, shown as a read-only line under the pricing mode so the admin can see
  what the product will be priced in. One control, and the two bad combinations become unrepresentable
  in the UI.
  **Cost:** it hard-codes a mapping the API does not enforce, so the same bad states remain reachable
  by anything else that calls the endpoint, and if the two concepts ever diverge legitimately this has
  to be undone.
- (b) **Two independent controls, with a cross-field validation** refusing the incoherent pairs before
  submit. Honest about them being two fields, and the error can explain *why* — which is genuinely
  worth reading. **Cost:** an admin can select a combination and be told no, for a distinction most of
  them will not hold in their head, on a form they use constantly.
- (c) **Two independent controls, no validation** — let the server be the authority. Cheapest, and the
  one I would reject: the server has no such check either, so "authority" here means the mistake is
  discovered as a wrong charge at checkout, which is precisely the failure PRICE-002 existed to remove.

**My recommendation is (a)**, with the observation that it makes the redundancy visible: if
`baseCurrency` is always derivable from `pricingMode`, the two fields are one field, and the right
long-term fix is a backend that says so. That is a follow-up, not this sprint — but choosing (a) is
the option that makes the case for it.

---

## Tests first (TDD — mandatory)

Pure functions in `lib/money.ts`, each failing before the implementation exists:

- `formatMoney('8000.00', 'NGN')` → `₦8,000` — and **not** `₦8,000.00`; whole amounts drop the
  decimals, matching the backend formatter CUR-001 shipped.
- `formatMoney('5.50', 'USD')` → `$5.50` — a real fractional amount keeps them.
- `formatMoney('1234567.89', 'NGN')` → `₦1,234,567.89` — grouping.
- **An unsupported code is refused rather than rendered** — no `"6,985 undefined"` and no
  `"6,985 XYZ"` reaching a screen.
- The supported set has exactly the two members the backend enum has, asserted as a list — so adding
  one here without adding it there fails.
- Under D1(a): `baseCurrencyFor('MANUAL_NGN')` → `NGN`, `baseCurrencyFor('GLOBAL_FX')` → `USD`, with
  the mapping total over `PricingMode`.
- Under D1(b) instead: `currencyModeIssue(currency, mode)` returns null for the two coherent pairs and
  a message naming the conflict for the two incoherent ones.

**Mutation check** (the discipline that caught the equivalent gap in PRICE-002): inverting the
`baseCurrencyFor` mapping must fail a test. If it does not, the test is asserting the shape of the
mapping rather than its content.

Not covered by tests, and stated rather than implied: that the dialog *renders* the selector, that it
sends `baseCurrency`, and that the pricing card initialises correctly. Those are verified by
`tsc`/`build`/`lint` and by the human check below.

## Success criteria (falsifiable)

1. **A product can be created.** Submitting the form against a local backend on `main` returns 201,
   where today it returns 400 with `property currency should not exist`.
2. The created row has the `base_currency` the form showed, confirmed by reading it back from
   `GET /admin/products/:id`.
3. The products list price column and the detail header render `₦6,985` — not `6,985 undefined`.
4. A USD product renders `$5` on both surfaces.
5. Opening the pricing card on a `MANUAL_NGN` product shows its current naira price in the field, not
   an empty box, and Save stays disabled until something actually changes.
6. Under D1(a): switching pricing mode updates the displayed base currency, and there is no control
   that can put the two out of step.
7. `pnpm lint`, `pnpm build`, `pnpm test:unit` and `pnpm tsc --noEmit` all exit 0.
8. `git grep "\.currency"` finds no remaining read of a product's currency outside `lib/money.ts` —
   region currency, which is a different and legitimate field, is excluded.

---

## Risk

**Medium, and lower than it looks.** The dangerous-sounding part — money on screen — is display only;
nothing here computes a payable amount, which is entirely server-side after PRICE-002. The genuine
risk is D1: choosing (a) and hard-coding a mapping the API does not share means the admin console and
the API disagree about what is representable, and the console is the one that will be wrong if that
mapping ever stops holding.

**The state this leaves behind, said plainly:** `baseCurrency` and `pricingMode` encode overlapping
information with no server-side coherence check, and after this sprint the *console* will be the only
thing preventing the bad combinations. Any other caller — a script, a future service, a manual curl —
can still create a USD product priced in naira and have it charged wrong at checkout. This sprint
narrows the hole to everything-except-the-console; it does not close it. Closing it is a backend
sprint.

**A gap I am not fixing and do not want silently inherited:** this repo has no component tests, and
none of the UI behaviour above is protected by one. Every previous admin sprint has said "tests" and
meant pure-function specs. That is a standing debt, it grows with each of these sprints, and it is the
reason success criteria 1–6 are written as things a human runs rather than things CI proves.

**Rollback:** clean — revert the branch. The backend is unchanged, so nothing is left in a state the
old code cannot read. Reverting does, however, restore the broken create form.

**Deploy coupling:** none in the risky direction. The backend is already live, so this can ship at any
time and only improves matters. VOUCH-001 is the sprint that will need a coordinated deploy, because
it renames the discount-codes route.
