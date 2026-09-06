import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CATALOG_NAME_MAX_LENGTH,
  brandNameItems,
  catalogNameIssue,
  usdPriceHelp,
} from './catalog-forms.ts';

/**
 * CAT-008-FE — the rules behind the catalog creation forms.
 *
 * The repo's runner is `node --test` over `lib/`, so the decisions worth
 * protecting live here rather than inside components: which brand names may be
 * offered, when a name is too long for a WhatsApp list row, and when a dollar
 * price is required.
 */

describe('brandNameItems', () => {
  it('offers exactly what the API returned, never a hardcoded list', () => {
    assert.deepEqual(brandNameItems(['PlayStation', 'Xbox']), {
      PlayStation: 'PlayStation',
      Xbox: 'Xbox',
    });
  });

  // The backend constrains the name with @IsIn(LAUNCH_BRANDS). A second copy in
  // the frontend would drift from the constant the WhatsApp bot matches on,
  // which is the defect CAT-007 existed to fix.
  it('offers nothing when the API returned nothing', () => {
    assert.deepEqual(brandNameItems(undefined), {});
    assert.deepEqual(brandNameItems([]), {});
  });
});

describe('catalogNameIssue', () => {
  it('accepts a name within the WhatsApp list-row limit', () => {
    assert.equal(catalogNameIssue('PSN Gift Card'), null);
  });

  it('requires a name', () => {
    assert.match(catalogNameIssue('   ') ?? '', /required/i);
  });

  /**
   * 24 characters is the WhatsApp catalog list-title limit the backend enforces.
   * Catching it here means the customer-facing constraint is explained in the
   * form rather than surfacing as a server error after submission.
   */
  it('rejects a name past the limit, and says what the limit is', () => {
    const tooLong = 'x'.repeat(CATALOG_NAME_MAX_LENGTH + 1);
    const issue = catalogNameIssue(tooLong) ?? '';
    assert.match(issue, new RegExp(String(CATALOG_NAME_MAX_LENGTH)));
  });

  it('accepts a name exactly at the limit', () => {
    assert.equal(catalogNameIssue('x'.repeat(CATALOG_NAME_MAX_LENGTH)), null);
  });

  it('measures the trimmed name, not the typed whitespace', () => {
    assert.equal(catalogNameIssue(`  ${'x'.repeat(CATALOG_NAME_MAX_LENGTH)}  `), null);
  });
});

describe('usdPriceHelp', () => {
  /**
   * DISC-008 made price_usd mandatory in both modes, but it means different
   * things in each: for GLOBAL_FX it drives the naira price, for MANUAL_NGN it
   * is declared only. An admin who assumes it converts will set one and expect
   * the other to follow, so the field has to say which it is.
   */
  it('tells a manual-pricing admin the dollar value does not drive the NGN price', () => {
    const help = usdPriceHelp('MANUAL_NGN', 1387.82);
    assert.match(help, /does not change/i);
    assert.doesNotMatch(help, /sets the NGN price/i);
  });

  it('tells a GLOBAL_FX admin it does drive the price, and at what rate', () => {
    const help = usdPriceHelp('GLOBAL_FX', 1387.82);
    assert.match(help, /sets the NGN price/i);
    assert.match(help, /1,387\.82/);
  });

  it('says the rate is missing rather than showing a blank one', () => {
    assert.match(usdPriceHelp('GLOBAL_FX'), /no fx rate set/i);
  });
});
