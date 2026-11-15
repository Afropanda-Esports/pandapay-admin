import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatUsdcBaseUnits,
  nearblocksAccountUrl,
  safeExplorerHref,
  shortHash,
} from './intents-format.ts';

describe('formatUsdcBaseUnits', () => {
  it('turns 6-decimal base units into USDC without floats', () => {
    assert.equal(formatUsdcBaseUnits('1000000'), '1.000000');
    assert.equal(formatUsdcBaseUnits('1031000'), '1.031000');
    assert.equal(formatUsdcBaseUnits('5'), '0.000005');
    assert.equal(formatUsdcBaseUnits('0'), '0.000000');
    assert.equal(
      formatUsdcBaseUnits('123456789012345678901'),
      '123456789012345.678901',
    );
  });

  it('shows a dash for missing or malformed input', () => {
    assert.equal(formatUsdcBaseUnits(null), '—');
    assert.equal(formatUsdcBaseUnits(undefined), '—');
    assert.equal(formatUsdcBaseUnits('1.5'), '—');
    assert.equal(formatUsdcBaseUnits('-1'), '—');
    assert.equal(formatUsdcBaseUnits(''), '—');
  });
});

describe('safeExplorerHref', () => {
  it('accepts https links only', () => {
    assert.equal(
      safeExplorerHref('https://solscan.io/tx/5abc'),
      'https://solscan.io/tx/5abc',
    );
    assert.equal(safeExplorerHref('http://solscan.io/tx/5abc'), null);
    assert.equal(safeExplorerHref('javascript:alert(1)'), null);
    assert.equal(safeExplorerHref('not a url'), null);
    assert.equal(safeExplorerHref(null), null);
  });
});

describe('nearblocksAccountUrl', () => {
  it('links a NEAR account on nearblocks', () => {
    assert.equal(
      nearblocksAccountUrl('policy.afropanda.near'),
      'https://nearblocks.io/address/policy.afropanda.near',
    );
  });

  it('encodes anything that is not a plain account id', () => {
    assert.equal(
      nearblocksAccountUrl('a/b?c'),
      'https://nearblocks.io/address/a%2Fb%3Fc',
    );
  });
});

describe('shortHash', () => {
  it('keeps short hashes and trims long ones in the middle', () => {
    assert.equal(shortHash('abc'), 'abc');
    assert.equal(
      shortHash('CYokyXjzJtT6s1TvStpNNTsEXhKMrdBpssnr5WuFr7z'),
      'CYokyX…uFr7z',
    );
  });
});
