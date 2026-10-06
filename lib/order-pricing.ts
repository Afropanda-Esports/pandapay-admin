import {
  formatFxMarkupNgn,
  formatMarkupBps,
  formatOracleNgnPerUsd,
  formatPriceUsd,
  formatPricingMode,
  formatRateSnapshot,
} from './fx-markup-display.ts';
import { formatBpsAsPercent } from './markup.ts';
import {
  formatFaceValue,
  formatMoney,
  formatRatePerUnit,
  isSupportedCurrency,
  type PricingCurrency,
} from './money.ts';

/**
 * How an order was priced, for the order detail — GBP-005.
 *
 * GBP-4 records the pricing basis on every new order (`orders.base_currency`,
 * `base_amount_total`, `ngn_per_unit`, `voucher_applied_base`) and every line
 * (`order_items.unit_base_amount`, `voucher_base_allocated`, `ngn_per_unit`,
 * `markup_bps_applied`, `line_total`). This view is built from those stored
 * values ONLY. It does not read the product, the current rate or the current
 * markup, and it does no price arithmetic: a historical figure is shown as it
 * was recorded.
 *
 * An order whose snapshot is NULL was written before GBP-4. It keeps the old
 * fields, each labelled as legacy, and is never reinterpreted.
 */

const MISSING = '—';

interface SnapshotItem {
  id: string;
  nameSnapshot: string;
  skuSnapshot: string | null;
  quantity: number;
  lineTotal: string;
  baseCurrency: string | null;
  unitBaseAmount: string | null;
  voucherBaseAllocated: string | null;
  ngnPerUnit: string | null;
  markupBpsApplied: number | null;
}

/** The order fields this view reads. Anything else on the order is ignored. */
export interface OrderPricingInput {
  amount: string;
  baseCurrency?: string | null;
  baseAmountTotal?: string | null;
  ngnPerUnit?: string | null;
  voucherAppliedBase?: string | null;
  fxMarkupNgn?: string | null;
  priceUsd?: string | null;
  markupBps?: number | null;
  oracleNgnPerUsd?: string | null;
  rateSnapshot?: string | null;
  pricingMode?: string | null;
  items?: ReadonlyArray<SnapshotItem>;
}

export interface SnapshotLine {
  key: string;
  item: string;
  sku: string | null;
  /** One unit's face value as recorded (before any voucher). */
  faceValue: string;
  quantity: number;
  rate: string;
  markup: string;
  voucher: string;
  ngnTotal: string;
}

export type OrderPricingView =
  | {
      kind: 'SNAPSHOT';
      currency: PricingCurrency;
      lines: SnapshotLine[];
      summary: {
        faceValueTotal: string;
        voucherApplied: string;
        rate: string;
        fxMarginRealised: string;
        charged: string;
      };
      /**
       * USD orders still get the legacy USD columns (GBP-4 keeps writing them).
       * Shown separately and labelled; null for GBP/NGN where they are not the
       * order's basis.
       */
      legacy: { generalMarkupAtCheckout: string; oracleNgnPerUsd: string } | null;
    }
  | { kind: 'LEGACY'; rows: Array<{ label: string; value: string }> };

const rateOf = (ngnPerUnit: string | null | undefined, currency: PricingCurrency) =>
  ngnPerUnit ? formatRatePerUnit(ngnPerUnit, currency) : MISSING;

const amountIn = (value: string | null | undefined, currency: PricingCurrency) =>
  value == null ? MISSING : formatFaceValue(value, currency);

export function orderPricingView(order: OrderPricingInput): OrderPricingView {
  const currency = order.baseCurrency;
  if (!currency || !isSupportedCurrency(currency)) {
    return { kind: 'LEGACY', rows: legacyRows(order) };
  }

  const lines = (order.items ?? []).map((line): SnapshotLine => {
    const lineCurrency =
      line.baseCurrency && isSupportedCurrency(line.baseCurrency)
        ? line.baseCurrency
        : currency;
    return {
      key: line.id,
      item: line.nameSnapshot,
      sku: line.skuSnapshot,
      faceValue: amountIn(line.unitBaseAmount, lineCurrency),
      quantity: line.quantity,
      rate: rateOf(line.ngnPerUnit, lineCurrency),
      markup:
        line.markupBpsApplied == null
          ? MISSING
          : formatBpsAsPercent(line.markupBpsApplied),
      voucher: amountIn(line.voucherBaseAllocated, lineCurrency),
      ngnTotal: formatMoney(line.lineTotal, 'NGN'),
    };
  });

  return {
    kind: 'SNAPSHOT',
    currency,
    lines,
    summary: {
      faceValueTotal: amountIn(order.baseAmountTotal, currency),
      voucherApplied: amountIn(order.voucherAppliedBase, currency),
      rate: rateOf(order.ngnPerUnit, currency),
      fxMarginRealised: order.fxMarkupNgn
        ? formatMoney(order.fxMarkupNgn, 'NGN')
        : MISSING,
      charged: formatMoney(order.amount, 'NGN'),
    },
    legacy:
      currency === 'USD'
        ? {
            generalMarkupAtCheckout: formatMarkupBps(order.markupBps),
            oracleNgnPerUsd: formatOracleNgnPerUsd(order.oracleNgnPerUsd),
          }
        : null,
  };
}

function legacyRows(order: OrderPricingInput) {
  return [
    { label: 'Pricing mode (legacy)', value: formatPricingMode(order.pricingMode) },
    { label: 'Face value (USD, legacy)', value: formatPriceUsd(order.priceUsd) },
    // `orders.markup_bps` has always held the GENERAL markup at checkout, not
    // the product's own (review R5) — labelled for what it is.
    {
      label: 'General markup at checkout (legacy)',
      value: formatMarkupBps(order.markupBps),
    },
    {
      label: 'Oracle NGN/USD (legacy)',
      value: formatOracleNgnPerUsd(order.oracleNgnPerUsd),
    },
    { label: 'Rate snapshot (legacy)', value: formatRateSnapshot(order.rateSnapshot) },
    { label: 'FX markup', value: formatFxMarkupNgn(order.fxMarkupNgn) },
  ];
}
