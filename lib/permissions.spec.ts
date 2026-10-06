import assert from 'node:assert/strict';
import { test } from 'node:test';

import { hasPermission } from './permissions.ts';

/**
 * GBP-005/006 — the console mirrors the backend's guards (the backend is the
 * authority; hiding a control is not security):
 *
 *   create product        Super Admin   (POST /admin/products → SuperAdminGuard)
 *   pricing edit          Super Admin   (PATCH /admin/products/:id/pricing)
 *   set the GBP rate      Super Admin   (POST /admin/pricing/rates/:currency)
 *   upload stock          Admin
 *   toggle availability   Admin
 *   archive               Admin
 *   view rates / preview  Admin
 */

test('only a Super Admin may create products', () => {
  assert.equal(hasPermission('SUPER_ADMIN', 'products:create'), true);
  assert.equal(hasPermission('ADMIN', 'products:create'), false);
  assert.equal(hasPermission(null, 'products:create'), false);
});

test('only a Super Admin may edit pricing or set a rate', () => {
  for (const permission of ['products:pricing', 'pricing:manage'] as const) {
    assert.equal(hasPermission('SUPER_ADMIN', permission), true);
    assert.equal(hasPermission('ADMIN', permission), false);
  }
});

test('an Admin keeps stock, availability, archive and viewing rates', () => {
  for (const permission of ['products:manage', 'products:view', 'pricing:view'] as const) {
    assert.equal(hasPermission('ADMIN', permission), true);
  }
});
