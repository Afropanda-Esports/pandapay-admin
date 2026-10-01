import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { orderPricingView } from './order-pricing.ts';

/**
 * GBP-005 — the order detail reads the GBP-4 pricing snapshot recorded at
 * checkout (`orders.base_currency …`, `order_items.unit_base_amount …`). It never
 * recomputes a historical figure from the product, the current rate or the
 * current markup. An order without the snapshot (written before GBP-4) keeps the
 * old legacy fields, labelled as legacy.
 */

const item = (over: Record<string, unknown> = {}) => ({
  id: 'i1',
  productId: 'p1',
  nameSnapshot: 'Amazon UK £10',
  skuSnapshot: 'AMZ-UK-GBP-10',
  quantity: 1,
  unitAmount: '23100.00',
  lineTotal: '23100.00',
  baseCurrency: 'GBP',
  unitBaseAmount: '10.00',
  voucherBaseAllocated: '0.00',
  ngnPerUnit: '2100.0000',
  markupBpsApplied: 1000,
  ...over,
});

const gbpOrder = (over: Record<string, unknown> = {}) => ({
  amount: '23100.00',
  baseCurrency: 'GBP',
  baseAmountTotal: '10.00',
  ngnPerUnit: '2100.0000',
  fxRateId: 'fx-1',
  voucherAppliedBase: '0.00',
  fxMarkupNgn: '2100.00',
  priceUsd: null,
  markupBps: null,
  oracleNgnPerUsd: null,
  rateSnapshot: null,
  pricingMode: null,
  items: [item()],
  // What the product looks like TODAY — must never leak into the history.
  product: {
    baseCurrency: 'GBP',
    baseAmount: '99.00',
    snapshotNgnPrice: '999999.00',
    markupBps: 9999,
  },
  ...over,
});

describe('new GBP order', () => {
  test('one line: £10 at ₦2,100/£1, 10%, no voucher, ₦23,100', () => {
    const view = orderPricingView(gbpOrder());
    assert.equal(view.kind, 'SNAPSHOT');
    if (view.kind !== 'SNAPSHOT') return;
    assert.equal(view.currency, 'GBP');
    assert.deepEqual(view.lines, [
      {
        key: 'i1',
        item: 'Amazon UK £10',
        sku: 'AMZ-UK-GBP-10',
        faceValue: '£10.00',
        quantity: 1,
        rate: '₦2,100.00 / £1',
        markup: '10%',
        voucher: '£0.00',
        ngnTotal: '₦23,100',
      },
    ]);
    assert.deepEqual(view.summary, {
      faceValueTotal: '£10.00',
      voucherApplied: '£0.00',
      rate: '₦2,100.00 / £1',
      fxMarginRealised: '₦2,100',
      charged: '₦23,100',
    });
    // No dollar figure anywhere for a GBP order.
    assert.doesNotMatch(JSON.stringify(view), /\$/);
  });

  test('uses the stored snapshot, not the product as it is today', () => {
    const view = orderPricingView(gbpOrder());
    const text = JSON.stringify(view);
    assert.doesNotMatch(text, /99\.00|999,999|9999/);
  });

  test('changing the current product and rate does not change the view', () => {
    const before = orderPricingView(gbpOrder());
    const after = orderPricingView(
      gbpOrder({
        product: {
          baseCurrency: 'GBP',
          baseAmount: '10.00',
          snapshotNgnPrice: '30000.00',
          markupBps: 2500,
        },
        currentRate: '3000.0000',
      }),
    );
    assert.deepEqual(after, before);
  });

  test('a voucher line shows its share of the voucher in the order currency', () => {
    const view = orderPricingView(
      gbpOrder({
        amount: '11550.00',
        voucherAppliedBase: '5.00',
        items: [
          item({
            unitAmount: '11550.00',
            lineTotal: '11550.00',
            voucherBaseAllocated: '5.00',
          }),
        ],
      }),
    );
    assert.equal(view.kind, 'SNAPSHOT');
    if (view.kind !== 'SNAPSHOT') return;
    assert.equal(view.lines[0].voucher, '£5.00');
    assert.equal(view.lines[0].ngnTotal, '₦11,550');
    assert.equal(view.summary.voucherApplied, '£5.00');
  });

  test('0 markup is shown as 0%, a product markup as itself', () => {
    const view = orderPricingView(
      gbpOrder({
        items: [
          item({ id: 'a', markupBpsApplied: 0 }),
          item({ id: 'b', markupBpsApplied: 1300 }),
        ],
      }),
    );
    if (view.kind !== 'SNAPSHOT') throw new Error('expected snapshot');
    assert.deepEqual(
      view.lines.map((l) => l.markup),
      ['0%', '13%'],
    );
  });

  test('quantity above one is shown, not multiplied into the face value', () => {
    const view = orderPricingView(
      gbpOrder({ items: [item({ quantity: 3, lineTotal: '69300.00' })] }),
    );
    if (view.kind !== 'SNAPSHOT') throw new Error('expected snapshot');
    assert.equal(view.lines[0].faceValue, '£10.00');
    assert.equal(view.lines[0].quantity, 3);
    assert.equal(view.lines[0].ngnTotal, '₦69,300');
  });
});

describe('new USD order', () => {
  test('dollar face value, USD/NGN rate, product markup', () => {
    const view = orderPricingView({
      amount: '18100.00',
      baseCurrency: 'USD',
      baseAmountTotal: '10.00',
      ngnPerUnit: '1600.0000',
      fxRateId: null,
      voucherAppliedBase: '0.00',
      fxMarkupNgn: '2100.00',
      priceUsd: '10.00',
      markupBps: 1000,
      oracleNgnPerUsd: '1600.0000',
      rateSnapshot: '1760.0000',
      pricingMode: null,
      items: [
        item({
          nameSnapshot: 'PSN $10',
          skuSnapshot: null,
          baseCurrency: 'USD',
          unitBaseAmount: '10.00',
          ngnPerUnit: '1600.0000',
          markupBpsApplied: 1300,
          unitAmount: '18100.00',
          lineTotal: '18100.00',
        }),
      ],
    });
    if (view.kind !== 'SNAPSHOT') throw new Error('expected snapshot');
    assert.equal(view.lines[0].faceValue, '$10.00');
    assert.equal(view.lines[0].rate, '₦1,600.00 / $1');
    assert.equal(view.lines[0].markup, '13%');
    assert.equal(view.lines[0].sku, null);
    // The legacy USD columns are still written for USD — exposed, labelled.
    assert.deepEqual(view.legacy, {
      generalMarkupAtCheckout: '1000 bps (10%)',
      oracleNgnPerUsd: '₦1,600.0000 / $1',
    });
  });
});

describe('new NGN order', () => {
  test('the naira price is the price: no rate, no markup', () => {
    const view = orderPricingView({
      amount: '8000.00',
      baseCurrency: 'NGN',
      baseAmountTotal: '8000.00',
      ngnPerUnit: null,
      fxRateId: null,
      voucherAppliedBase: '0.00',
      fxMarkupNgn: '0.00',
      priceUsd: '5.00',
      markupBps: 1000,
      oracleNgnPerUsd: '1600.0000',
      rateSnapshot: null,
      pricingMode: null,
      items: [
        item({
          nameSnapshot: 'Airtime ₦8,000',
          baseCurrency: 'NGN',
          unitBaseAmount: '8000.00',
          ngnPerUnit: null,
          markupBpsApplied: null,
          unitAmount: '8000.00',
          lineTotal: '8000.00',
        }),
      ],
    });
    if (view.kind !== 'SNAPSHOT') throw new Error('expected snapshot');
    assert.equal(view.lines[0].faceValue, '₦8,000.00');
    assert.equal(view.lines[0].rate, '—');
    assert.equal(view.lines[0].markup, '—');
    assert.equal(view.summary.rate, '—');
  });
});

describe('legacy orders (no GBP-4 snapshot)', () => {
  test('an old USD order keeps the legacy fields, labelled legacy', () => {
    const view = orderPricingView({
      amount: '17600.00',
      baseCurrency: null,
      baseAmountTotal: null,
      ngnPerUnit: null,
      fxRateId: null,
      voucherAppliedBase: null,
      fxMarkupNgn: '1600.00',
      priceUsd: '10.00',
      markupBps: 1000,
      oracleNgnPerUsd: '1600.0000',
      rateSnapshot: '1760.0000',
      pricingMode: 'GLOBAL_FX',
      items: [],
    });
    assert.deepEqual(view, {
      kind: 'LEGACY',
      rows: [
        { label: 'Pricing mode (legacy)', value: 'GLOBAL_FX' },
        { label: 'Face value (USD, legacy)', value: '$10.00' },
        { label: 'General markup at checkout (legacy)', value: '1000 bps (10%)' },
        { label: 'Oracle NGN/USD (legacy)', value: '₦1,600.0000 / $1' },
        { label: 'Rate snapshot (legacy)', value: '1760.0000' },
        { label: 'FX markup', value: '₦1,600.00' },
      ],
    });
  });

  test('an old naira order (no legacy USD fields) still renders, with dashes', () => {
    const view = orderPricingView({
      amount: '8000.00',
      fxMarkupNgn: null,
      priceUsd: null,
      markupBps: null,
      oracleNgnPerUsd: null,
      rateSnapshot: null,
      pricingMode: 'MANUAL_NGN',
    });
    assert.equal(view.kind, 'LEGACY');
    if (view.kind !== 'LEGACY') return;
    assert.equal(view.rows[0].value, 'Manual NGN');
    assert.equal(view.rows[1].value, '—');
  });

  test('an order with snapshot columns but no item rows is still shown from the order snapshot', () => {
    const view = orderPricingView(gbpOrder({ items: [] }));
    assert.equal(view.kind, 'SNAPSHOT');
    if (view.kind !== 'SNAPSHOT') return;
    assert.deepEqual(view.lines, []);
    assert.equal(view.summary.charged, '₦23,100');
  });
});
