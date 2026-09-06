import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CATALOG_NAME_MAX_LENGTH,
  brandNameItems,
  catalogNameIssue,
  brandLabel,
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

describe('brandLabel', () => {
  const regions = [
    { id: 'r-us', name: 'USA' },
    { id: 'r-uk', name: 'United Kingdom' },
  ];

  /**
   * Brands are region-scoped, so the same platform exists once per region. A
   * dropdown listing them by name alone shows "PlayStation" twice with no way
   * to tell which is which — and picking the wrong one files a product line
   * under the wrong region.
   */
  it('qualifies the brand with its region', () => {
    assert.equal(
      brandLabel({ id: 'b1', name: 'PlayStation', regionId: 'r-us' }, regions),
      'PlayStation — USA',
    );
  });

  it('distinguishes the same brand in two regions', () => {
    const us = brandLabel({ id: 'b1', name: 'Xbox', regionId: 'r-us' }, regions);
    const uk = brandLabel({ id: 'b2', name: 'Xbox', regionId: 'r-uk' }, regions);
    assert.notEqual(us, uk);
  });

  // Regions load separately, so the label must stay usable before they arrive
  // rather than rendering "PlayStation — undefined".
  it('falls back to the bare name when the region is not loaded yet', () => {
    assert.equal(brandLabel({ id: 'b1', name: 'Steam', regionId: 'r-us' }, undefined), 'Steam');
    assert.equal(brandLabel({ id: 'b1', name: 'Steam', regionId: 'r-zz' }, regions), 'Steam');
  });
});
