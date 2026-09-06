import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

import { Select } from '@base-ui/react/select';

import { toSelectItems } from './select-items.ts';

const UUID = '49810d92-2103-48b5-9e08-5ee2d6e016c4';

function callPayloads(
  file: string,
  fn: string,
): Array<Record<string, string>> {
  const source = readFileSync(file, 'utf8');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const payloads: Array<Record<string, string>> = [];

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(tree) === fn &&
      node.arguments[0] &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      payloads.push(
        Object.fromEntries(
          node.arguments[0].properties.flatMap((property) =>
            ts.isPropertyAssignment(property)
              ? [[property.name.getText(tree), property.initializer.getText(tree)]]
              : [],
          ),
        ),
      );
    }
    ts.forEachChild(node, visit);
  }

  visit(tree);
  return payloads;
}

test('maps opaque ids to labels while keeping the id as the submitted value', () => {
  const items = toSelectItems([{ id: UUID, name: 'United States' }]);
  const html = renderToStaticMarkup(
    React.createElement(
      Select.Root,
      { items, value: UUID },
      React.createElement(Select.Value),
    ),
  );

  assert.match(html, /^<span>United States<\/span>/);
  assert.match(html, new RegExp(`value="${UUID}"`));
});

/**
 * VOUCH-001: vouchers are product-agnostic (WA-052). The dialog must not quietly
 * regrow a product/category scope the backend ignores.
 */
test('the voucher dialog offers no product or category scope', () => {
  const source = readFileSync(
    'components/features/voucher-codes/generate-voucher-codes-dialog.tsx',
    'utf8',
  );

  assert.ok(!source.includes('productId'), 'voucher codes carry no product scope');
  assert.ok(!source.includes('categoryId'), 'voucher codes carry no category scope');
});

/**
 * The payload, not merely the file's vocabulary. Asserts what goes over the
 * wire after VOUCH-001: `value` + `currency`, not the retired `valueUsd` /
 * `discountType` / `discountValue` fields.
 */
test('the voucher dialog submits value and currency', () => {
  const [payload, ...rest] = callPayloads(
    'components/features/voucher-codes/generate-voucher-codes-dialog.tsx',
    'generateVoucherCodes',
  );

  assert.equal(rest.length, 0, 'expected exactly one generate call');
  assert.equal(payload.value, 'data.value');
  assert.equal(payload.currency, 'data.currency');
  assert.ok(!('valueUsd' in payload), 'valueUsd was removed by VOUCH-001');
  assert.ok(!('discountValue' in payload), 'discountValue was removed by DISC-008');
  assert.ok(!('discountType' in payload), 'discountType was removed by DISC-008');
});

/**
 * CAT-004 shipped DELETE, archive and unarchive for products and no admin app
 * ever called them — the capability existed and was unreachable. That is the
 * same failure as the discount dialog, only quieter: nothing breaks, the button
 * simply is not there. These assert the client actually wires all three.
 */
test('the product API client reaches every CAT-004 endpoint', () => {
  const source = readFileSync('lib/api/products.ts', 'utf8');

  assert.ok(/method:\s*'DELETE'/.test(source), 'no DELETE call for products');
  assert.ok(source.includes('/archive'), 'no archive call');
  assert.ok(source.includes('/unarchive'), 'no unarchive call');
});

/**
 * CAT-007 dropped category from ProductBrand. The frontend type still declared
 * it, so the compiler asserted a string for a field that is undefined at
 * runtime — a lie someone could act on.
 */
test('the brand type does not claim fields the backend dropped', () => {
  const types = readFileSync('lib/types.ts', 'utf8');
  const brand = types.slice(
    types.indexOf('export interface ProductBrand'),
    types.indexOf('}', types.indexOf('export interface ProductBrand')),
  );

  assert.ok(!brand.includes('categoryId'), 'CAT-007 removed brand.categoryId');
  assert.ok(!brand.includes('category?'), 'CAT-007 removed brand.category');
});

test('the product type knows about archiving', () => {
  const types = readFileSync('lib/types.ts', 'utf8');
  const product = types.slice(
    types.indexOf('export interface Product {'),
    types.indexOf('}', types.indexOf('export interface Product {')),
  );

  assert.ok(product.includes('archivedAt'), 'CAT-004 added products.archived_at');
});


/**
 * The role gate is the visible half of a server-side control. It is easy to
 * lose in a refactor and its absence looks like nothing at all, so it is
 * asserted directly: delete is SUPER_ADMIN, archive is not.
 */
test('delete is gated on super admin, archive is not', () => {
  const del = readFileSync(
    'components/features/products/delete-product-dialog.tsx',
    'utf8',
  );
  const arch = readFileSync(
    'components/features/products/archive-product-button.tsx',
    'utf8',
  );

  assert.ok(
    /if \(!isSuperAdmin\) return null;/.test(del),
    'delete must render only for a super admin',
  );
  assert.ok(!arch.includes('isSuperAdmin'), 'archive is reversible — ADMIN level');
});

/**
 * A refused delete is the common case, not the edge case: any product with
 * order history returns 409. The dialog must read that status and offer
 * archiving, rather than dropping the admin at a dead end with a toast.
 */
test('a refused delete offers archiving instead of failing silently', () => {
  const source = readFileSync(
    'components/features/products/delete-product-dialog.tsx',
    'utf8',
  );

  assert.ok(source.includes('err.status === 409'), 'must detect the refusal');
  assert.ok(source.includes('archiveProduct'), 'must offer the working alternative');
});


/**
 * CAT-009 shipped DELETE for categories, brands and product lines. CAT-004's
 * product delete sat unreachable for a day because nothing called it; these
 * assert the client wires all three so that does not repeat.
 */
test('the API client reaches every CAT-009 delete endpoint', () => {
  const products = readFileSync('lib/api/products.ts', 'utf8');
  const categories = readFileSync('lib/api/categories.ts', 'utf8');

  assert.ok(
    /deleteProductBrand[\s\S]{0,200}method:\s*'DELETE'/.test(products),
    'no DELETE for brands',
  );
  assert.ok(
    /deleteProductLine[\s\S]{0,200}method:\s*'DELETE'/.test(products),
    'no DELETE for lines',
  );
  assert.ok(
    /deleteCategory[\s\S]{0,200}method:\s*'DELETE'/.test(categories),
    'no DELETE for categories',
  );
});

/**
 * A refused delete is the common case at every level, so the shared dialog has
 * to read the 409 and offer the working alternative. The product dialog proved
 * the shape in CAT-010-FE; these levels reuse it rather than growing four
 * near-identical copies, the same consolidation the backend guard got.
 */
test('the shared delete dialog handles the refusal and offers an alternative', () => {
  const source = readFileSync(
    'components/features/catalog/delete-catalog-row-dialog.tsx',
    'utf8',
  );

  assert.ok(source.includes('err.status === 409'), 'must detect the refusal');
  assert.ok(source.includes('alternative'), 'must offer a way forward');
  assert.ok(
    /if \(!isSuperAdmin\) return null;/.test(source),
    'delete is SUPER_ADMIN at every level',
  );
});
