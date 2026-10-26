import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEFAULT_AFTER_LOGIN, safeRedirectPath } from './safe-redirect.ts';

test('keeps an in-app path, with its query and hash', () => {
  assert.equal(safeRedirectPath('/orders'), '/orders');
  assert.equal(safeRedirectPath('/orders/abc?tab=items#x'), '/orders/abc?tab=items#x');
});

test('falls back to the dashboard when there is no redirect', () => {
  assert.equal(safeRedirectPath(null), DEFAULT_AFTER_LOGIN);
  assert.equal(safeRedirectPath(undefined), DEFAULT_AFTER_LOGIN);
  assert.equal(safeRedirectPath(''), DEFAULT_AFTER_LOGIN);
});

test('never leaves the admin site', () => {
  for (const evil of [
    'https://evil.example/login',
    'http://evil.example',
    '//evil.example',
    '/\\evil.example',
    '\\\\evil.example',
    '/\t/evil.example',
    '/\n/evil.example',
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,hi',
    'evil.example',
    ' //evil.example',
  ]) {
    assert.equal(safeRedirectPath(evil), DEFAULT_AFTER_LOGIN, evil);
  }
});
