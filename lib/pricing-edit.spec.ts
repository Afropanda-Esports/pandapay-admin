import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  canEditPricingHere,
  followsGlobalMarkupWithoutPreview,
} from './money.ts';

/**
 * GBP-003 — the console's pricing controls were built for dollars: the product
 * pricing card sends `priceUsd`, shows a `$` prefix and previews with the USD
 * oracle. Until GBP-5 builds the currency-aware version, a GBP product's card is
 * read-only rather than able to mis-edit it.
 */

test('the existing pricing card may edit USD and NGN products', () => {
  assert.equal(canEditPricingHere('USD'), true);
  assert.equal(canEditPricingHere('NGN'), true);
});

test('the existing pricing card may not edit a GBP product', () => {
  assert.equal(canEditPricingHere('GBP'), false);
});

test('an unknown currency is never editable here', () => {
  assert.equal(canEditPricingHere('EUR'), false);
});

// The general-markup form previews with the USD oracle. A GBP product that
// follows the general markup DOES move when it changes, but cannot be
// previewed there — the form must say so rather than omit it silently.
test('a GBP product following the general markup is flagged as not previewed', () => {
  assert.equal(
    followsGlobalMarkupWithoutPreview({ baseCurrency: 'GBP', markupBps: null }),
    true,
  );
});

test('a GBP product with its own markup is not affected, so not flagged', () => {
  assert.equal(
    followsGlobalMarkupWithoutPreview({ baseCurrency: 'GBP', markupBps: 1800 }),
    false,
  );
});

test('USD and NGN products are never flagged (behaviour unchanged)', () => {
  for (const baseCurrency of ['USD', 'NGN'] as const) {
    assert.equal(
      followsGlobalMarkupWithoutPreview({ baseCurrency, markupBps: null }),
      false,
    );
  }
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

test('the pricing card consults canEditPricingHere before offering edits', () => {
  const card = read('components/features/products/pricing-card.tsx');
  assert.match(card, /canEditPricingHere\(/);
});
