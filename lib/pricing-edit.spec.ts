import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import {
  buildPricingPatch,
  pricingEditKind,
  previewRequestFor,
  previewErrorMessage,
  saveBlockReason,
  describePreview,
} from './pricing-edit.ts';

/**
 * GBP-005 — the product pricing card is currency-aware.
 *
 *   USD, GBP  face value (`baseAmount`) + markup, previewed by the BACKEND
 *   NGN       the native naira price + its declared dollar value; no preview,
 *             because there is nothing to convert
 *
 * GBP-003's read-only GBP card is gone. Nothing here computes a price.
 */

describe('pricingEditKind', () => {
  test('converted currencies edit a face value', () => {
    assert.equal(pricingEditKind('USD'), 'FACE_VALUE');
    assert.equal(pricingEditKind('GBP'), 'FACE_VALUE');
  });

  test('naira edits the naira price', () => {
    assert.equal(pricingEditKind('NGN'), 'NGN_PRICE');
  });
});

describe('previewRequestFor — what to ask POST /admin/pricing/preview', () => {
  test('a GBP face value and markup become a currency preview request', () => {
    assert.deepEqual(
      previewRequestFor({ currency: 'GBP', faceValue: '10', markup: '1300' }),
      { request: { currency: 'GBP', baseAmount: '10', markupBps: 1300 } },
    );
  });

  test('blank markup is sent as null (inherit), never 0', () => {
    assert.deepEqual(
      previewRequestFor({ currency: 'GBP', faceValue: '10', markup: '' }),
      { request: { currency: 'GBP', baseAmount: '10', markupBps: null } },
    );
  });

  test('0 markup is sent as 0', () => {
    assert.deepEqual(
      previewRequestFor({ currency: 'USD', faceValue: '10', markup: '0' }),
      { request: { currency: 'USD', baseAmount: '10', markupBps: 0 } },
    );
  });

  test('a region id is used instead of the currency when given', () => {
    assert.deepEqual(
      previewRequestFor({
        currency: 'GBP',
        regionId: 'r-uk',
        faceValue: '10',
        markup: '',
      }),
      { request: { regionId: 'r-uk', baseAmount: '10', markupBps: null } },
    );
  });

  test('an invalid face value or markup asks nothing and says why', () => {
    const badFace = previewRequestFor({
      currency: 'GBP',
      faceValue: '1.005',
      markup: '',
    });
    assert.equal(badFace.request, undefined);
    assert.ok(badFace.blocked);

    const badMarkup = previewRequestFor({
      currency: 'GBP',
      faceValue: '10',
      markup: '-5',
    });
    assert.equal(badMarkup.request, undefined);
    assert.ok(badMarkup.blocked);
  });

  test('NGN is never previewed — the typed price is the price', () => {
    const r = previewRequestFor({ currency: 'NGN', faceValue: '8000', markup: '' });
    assert.equal(r.request, undefined);
    assert.equal(r.notApplicable, true);
  });
});

describe('describePreview — the backend response, displayed', () => {
  const preview = {
    currency: 'GBP' as const,
    baseAmount: '10',
    ngnPerUnit: '2100.0000',
    rateEffectiveFrom: '2026-09-30T12:00:00.000Z',
    rateSource: 'MANUAL',
    globalMarkupBps: 1000,
    effectiveMarkupBps: 1000,
    ngnPrice: '23100.00',
  };

  test('GBP: pound face value, GBP/NGN rate, naira price — no dollars anywhere', () => {
    const d = describePreview(preview, null);
    assert.deepEqual(d, {
      faceValue: '£10.00',
      rateLabel: 'Current GBP/NGN rate',
      rate: '₦2,100.00 / £1',
      markup: '10% (general markup)',
      ngnPrice: '₦23,100',
    });
    assert.doesNotMatch(JSON.stringify(d), /\$/);
  });

  test('USD: dollar face value and the USD/NGN rate', () => {
    const d = describePreview(
      {
        ...preview,
        currency: 'USD',
        ngnPerUnit: '1600.0000',
        effectiveMarkupBps: 1300,
        ngnPrice: '18100.00',
      },
      1300,
    );
    assert.equal(d.faceValue, '$10.00');
    assert.equal(d.rateLabel, 'Current USD/NGN rate');
    assert.equal(d.rate, '₦1,600.00 / $1');
    assert.equal(d.markup, '13% (this product)');
    assert.equal(d.ngnPrice, '₦18,100');
  });

  test('0 markup reads as an explicit zero', () => {
    const d = describePreview({ ...preview, effectiveMarkupBps: 0, ngnPrice: '21000.00' }, 0);
    assert.equal(d.markup, '0% (this product — sells at cost)');
  });
});

describe('previewErrorMessage', () => {
  test('a missing rate says which and where to set it', () => {
    assert.equal(
      previewErrorMessage({ status: 409, code: 'FX_RATE_MISSING' }, 'GBP'),
      'No GBP/NGN rate is set — a Super Admin must set one on the Currency rates page first.',
    );
  });

  test('anything else is a generic, non-committal failure', () => {
    assert.equal(
      previewErrorMessage({ status: 500 }, 'USD'),
      'Could not load the price preview. Saving is disabled until it loads.',
    );
  });
});

describe('saveBlockReason — Save waits for an authoritative preview', () => {
  test('converted: blocked while loading, on error, when invalid, and when unchanged', () => {
    const base = { kind: 'FACE_VALUE' as const, isDirty: true, inputError: null };
    assert.equal(saveBlockReason({ ...base, preview: 'ready' }), null);
    assert.match(saveBlockReason({ ...base, preview: 'loading' })!, /preview/i);
    assert.match(saveBlockReason({ ...base, preview: 'error' })!, /preview/i);
    assert.match(
      saveBlockReason({ ...base, preview: 'ready', inputError: 'bad' })!,
      /bad/,
    );
    assert.match(
      saveBlockReason({ ...base, preview: 'ready', isDirty: false })!,
      /No changes/,
    );
  });

  test('NGN needs no preview', () => {
    assert.equal(
      saveBlockReason({
        kind: 'NGN_PRICE',
        isDirty: true,
        inputError: null,
        preview: 'idle',
      }),
      null,
    );
  });
});

describe('buildPricingPatch — what PATCH /admin/products/:id/pricing receives', () => {
  test('GBP sends baseAmount + markup, never priceUsd', () => {
    assert.deepEqual(
      buildPricingPatch('GBP', { faceValue: '10.00', markup: '' }),
      { baseAmount: '10.00', markupBps: null },
    );
  });

  test('USD sends baseAmount (not the deprecated priceUsd alias)', () => {
    assert.deepEqual(
      buildPricingPatch('USD', { faceValue: '25', markup: '0' }),
      { baseAmount: '25', markupBps: 0 },
    );
  });

  test('NGN sends the naira price and its declared dollar value', () => {
    assert.deepEqual(
      buildPricingPatch('NGN', { ngnPrice: '8000', declaredUsd: '5.00' }),
      { ngnPrice: 8000, priceUsd: 5 },
    );
  });

  test('refuses to build an invalid patch', () => {
    assert.throws(() => buildPricingPatch('GBP', { faceValue: '0', markup: '' }));
    assert.throws(() => buildPricingPatch('GBP', { faceValue: '10', markup: '1.5' }));
    assert.throws(() => buildPricingPatch('NGN', { ngnPrice: '', declaredUsd: '5' }));
  });
});

// Source-level guards: these components cannot be rendered under node:test.
const read = (rel: string) =>
  readFileSync(join(import.meta.dirname, '..', rel), 'utf8');

test('the voucher dialog offers VOUCHER_CURRENCIES, never the pricing list', () => {
  const dialog = read(
    'components/features/voucher-codes/generate-voucher-codes-dialog.tsx',
  );
  assert.match(dialog, /VOUCHER_CURRENCIES/);
  assert.doesNotMatch(dialog, /SUPPORTED_CURRENCIES/);
});

test('the pricing card previews through the backend and builds its patch here', () => {
  const card = read('components/features/products/pricing-card.tsx');
  const previewHook = read('hooks/use-price-preview.ts');
  assert.match(card, /usePricePreview\(/);
  assert.match(previewHook, /previewPrice\(/);
  assert.match(card, /buildPricingPatch\(/);
  assert.doesNotMatch(card, /parseFloat/);
  assert.doesNotMatch(previewHook, /parseFloat/);
});
