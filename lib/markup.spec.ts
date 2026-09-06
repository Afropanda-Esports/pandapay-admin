import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  effectiveMarkupBps,
  overridesGlobal,
  parseMarkupInput,
  previewNgn,
} from './markup.ts';

/**
 * PRICE-004-FE — a product's margin, set as basis points over cost.
 *
 * The pricing-mode toggle is gone: a price is now its face value converted at
 * the oracle rate and marked up by a margin chosen per product. What this
 * module exists for is the one distinction the form can silently destroy —
 * an empty field means "inherit the global markup", a typed 0 means "sell at
 * cost". A number input that coerces blank to 0 prices a product at cost with
 * no error anywhere.
 */

describe('parseMarkupInput', () => {
  it('reads an empty field as inheriting the global markup', () => {
    assert.deepEqual(parseMarkupInput(''), { markupBps: null });
  });

  it('reads whitespace as inheriting too', () => {
    assert.deepEqual(parseMarkupInput('   '), { markupBps: null });
  });

  /**
   * The assertion this module exists for. Zero is a deliberate margin, not an
   * absent one, and the two produce different prices.
   */
  it('reads a typed zero as a real zero margin, not as unset', () => {
    assert.deepEqual(parseMarkupInput('0'), { markupBps: 0 });
  });

  it('reads a normal markup', () => {
    assert.deepEqual(parseMarkupInput('1350'), { markupBps: 1350 });
  });

  it('tolerates surrounding whitespace', () => {
    assert.deepEqual(parseMarkupInput(' 255 '), { markupBps: 255 });
  });

  // These mirror the backend's @Min(0) / @IsInt / @Max(10000), so the form
  // refuses before the API has to.
  it('refuses a negative markup — it would sell below cost', () => {
    assert.match(parseMarkupInput('-1').error ?? '', /below cost|negative/i);
  });

  it('refuses a fractional basis point', () => {
    assert.match(parseMarkupInput('12.5').error ?? '', /whole number/i);
  });

  it('refuses a markup above 10000 bps', () => {
    assert.match(parseMarkupInput('10001').error ?? '', /10000|100%/i);
  });

  it('refuses text', () => {
    assert.ok(parseMarkupInput('abc').error);
  });

  it('reports an error instead of a value, never both', () => {
    const result = parseMarkupInput('-5');
    assert.equal(result.markupBps, undefined);
  });
});

describe('effectiveMarkupBps', () => {
  it('falls back to the global when the product sets none', () => {
    assert.equal(effectiveMarkupBps(null, 255), 255);
  });

  it('uses the product markup when set', () => {
    assert.equal(effectiveMarkupBps(1350, 255), 1350);
  });

  it('honours a zero markup rather than falling back', () => {
    assert.equal(effectiveMarkupBps(0, 255), 0);
  });
});

describe('overridesGlobal', () => {
  it('is false when the product inherits', () => {
    assert.equal(overridesGlobal(null), false);
  });

  it('is true for a normal markup', () => {
    assert.equal(overridesGlobal(1350), true);
  });

  /**
   * The likeliest thing to get backwards. A zero markup is very much an
   * override — it is the strongest one there is — and the admin needs telling
   * that changing the global will not move this product.
   */
  it('is true for a zero markup', () => {
    assert.equal(overridesGlobal(0), true);
  });
});

describe('previewNgn', () => {
  /**
   * Must agree with `roundUpToNearest50` on the backend to the naira, or the
   * admin sets one price and the customer is charged another.
   * 5 × 1321.60 × 1.1350 = 7500.08 → 7550.
   */
  it('previews the price the backend will compute', () => {
    assert.equal(previewNgn('5.00', 1321.6, 1350), '7550.00');
  });

  it('rounds up, never down — rounding must not eat the margin', () => {
    assert.equal(previewNgn('1.00', 1321.6, 1350), '1550.00');
  });

  it('leaves an exact ₦50 multiple alone', () => {
    // 5 × 1320 = 6600, already a multiple of 50.
    assert.equal(previewNgn('5.00', 1320, 0), '6600.00');
  });

  it('multiplies the oracle rate, not a rate carrying the global markup', () => {
    assert.notEqual(
      previewNgn('5.00', 1321.6, 1350),
      previewNgn('5.00', 1355.3008, 1350),
    );
  });

  it('returns null with no rate, rather than guessing a price', () => {
    assert.equal(previewNgn('5.00', null, 1350), null);
  });

  it('returns null when the face value is not a number', () => {
    assert.equal(previewNgn('', 1321.6, 1350), null);
  });
});
