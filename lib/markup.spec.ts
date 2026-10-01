import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  effectiveMarkupBps,
  formatBpsAsPercent,
  generalMarkupFollowers,
  markupGuidance,
  overridesGlobal,
  parseMarkupInput,
  parsePercentToBps,
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

/**
 * GBP-005 — the admin no longer computes selling prices. `previewNgn` (a float
 * copy of the backend formula) is gone; every authoritative preview comes from
 * `POST /admin/pricing/preview`. This guard fails if a copy creeps back in.
 */
describe('no client-side price formula (GBP-005)', () => {
  const root = join(import.meta.dirname, '..');
  const sources: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.spec.ts')) {
        sources.push(path);
      }
    }
  };
  for (const dir of ['app', 'components', 'lib', 'hooks']) walk(join(root, dir));

  it('previewNgn no longer exists anywhere', () => {
    for (const file of sources) {
      assert.doesNotMatch(readFileSync(file, 'utf8'), /previewNgn/, file);
    }
  });

  it('nothing rounds to the ₦50 step client-side', () => {
    for (const file of sources) {
      assert.doesNotMatch(
        readFileSync(file, 'utf8'),
        /Math\.ceil\([^)]*\/\s*(50|ROUNDING_STEP)/,
        file,
      );
    }
  });
});

describe('parsePercentToBps — the general markup typed as a percentage', () => {
  it('reads whole and fractional percentages exactly, without floats', () => {
    assert.deepEqual(parsePercentToBps('10'), { bps: 1000 });
    assert.deepEqual(parsePercentToBps('2.55'), { bps: 255 });
    assert.deepEqual(parsePercentToBps('13.5'), { bps: 1350 });
    assert.deepEqual(parsePercentToBps(' 0 '), { bps: 0 });
    assert.deepEqual(parsePercentToBps('100'), { bps: 10000 });
    // 0.1 + 0.2 style float traps: 1.15 × 100 is 114.99999999999999 in JS.
    assert.deepEqual(parsePercentToBps('1.15'), { bps: 115 });
    assert.deepEqual(parsePercentToBps('0.29'), { bps: 29 });
  });

  it('refuses more than two decimal places (sub-basis-point)', () => {
    assert.ok(parsePercentToBps('1.555').error);
  });

  it('refuses blank, negative, over 100 % and text', () => {
    for (const raw of ['', '-1', '100.01', 'abc', '1e2']) {
      assert.ok(parsePercentToBps(raw).error, raw);
    }
  });
});

describe('formatBpsAsPercent', () => {
  it('renders basis points as a percentage, trimming zeros', () => {
    assert.equal(formatBpsAsPercent(1000), '10%');
    assert.equal(formatBpsAsPercent(1350), '13.5%');
    assert.equal(formatBpsAsPercent(255), '2.55%');
    assert.equal(formatBpsAsPercent(0), '0%');
    assert.equal(formatBpsAsPercent(5), '0.05%');
  });
});

describe('markupGuidance (GBP-005)', () => {
  it('blank on a GBP product is allowed, but warns that it follows the general markup', () => {
    const g = markupGuidance('GBP', parseMarkupInput(''), 1000);
    assert.equal(g.warning, 'Blank markup follows the general markup.');
    assert.match(g.help, /general markup \(10%\)/);
  });

  it('blank on a USD product explains inheritance without the GBP warning', () => {
    const g = markupGuidance('USD', parseMarkupInput(''), 255);
    assert.equal(g.warning, null);
    assert.match(g.help, /general markup \(2.55%\)/);
  });

  it('0 is an explicit zero margin, never described as inheriting', () => {
    const g = markupGuidance('GBP', parseMarkupInput('0'), 1000);
    assert.equal(g.warning, null);
    assert.match(g.help, /sells at cost/);
  });

  it('a product markup overrides the general one', () => {
    const g = markupGuidance('GBP', parseMarkupInput('1300'), 1000);
    assert.equal(g.warning, null);
    assert.match(g.help, /13%.*overrides the general markup/);
  });

  it('an unknown general markup is said so, not invented', () => {
    const g = markupGuidance('USD', parseMarkupInput(''), null);
    assert.match(g.help, /not loaded/);
  });
});

describe('generalMarkupFollowers (GBP-005)', () => {
  const p = (baseCurrency: string, markupBps: number | null, archivedAt: string | null = null) => ({
    baseCurrency,
    markupBps,
    archivedAt,
  });

  it('counts converted products that inherit the general markup — USD AND GBP', () => {
    const counts = generalMarkupFollowers([
      p('USD', null),
      p('USD', null),
      p('GBP', null),
      p('USD', 1300),
      p('GBP', 0),
      p('NGN', null),
    ]);
    assert.deepEqual(counts, {
      byCurrency: { USD: 2, GBP: 1 },
      following: 3,
      overriding: 2,
    });
  });

  it('a 0 markup is an override, not a follower', () => {
    assert.equal(generalMarkupFollowers([p('GBP', 0)]).following, 0);
  });

  it('naira products are neither — the general markup never touches them', () => {
    const counts = generalMarkupFollowers([p('NGN', null), p('NGN', 500)]);
    assert.equal(counts.following, 0);
    assert.equal(counts.overriding, 0);
  });

  it('archived products are not counted', () => {
    assert.equal(
      generalMarkupFollowers([p('USD', null, '2026-09-01T00:00:00Z')]).following,
      0,
    );
  });
});
