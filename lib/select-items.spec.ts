import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

import { Select } from '@base-ui/react/select';

import { toSelectItems } from './select-items.ts';

const UUID = '49810d92-2103-48b5-9e08-5ee2d6e016c4';

function configuredItemMaps(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const configured: string[] = [];

  function visit(node: ts.Node): void {
    if (ts.isJsxOpeningElement(node) && node.tagName.getText(tree) === 'Select') {
      const items = node.attributes.properties.find(
        (attribute): attribute is ts.JsxAttribute =>
          ts.isJsxAttribute(attribute) && attribute.name.getText(tree) === 'items',
      );
      const expression = items?.initializer;
      if (expression && ts.isJsxExpression(expression) && expression.expression) {
        configured.push(expression.expression.getText(tree));
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(tree);
  return configured;
}

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

test('all UUID selects in the product dialog provide label maps', () => {
  const configured = configuredItemMaps(
    'components/features/products/create-product-dialog.tsx',
  );

  for (const expected of [
    'regionSelectItems',
    'categorySelectItems',
    'brandSelectItems',
    'lineSelectItems',
  ]) {
    assert.ok(configured.includes(expected), `missing items={${expected}}`);
  }
});

/**
 * DISC-008 removed the product and category selects from the discount dialog:
 * codes are product-agnostic (WA-052) and denominated in dollars, so there is
 * nothing UUID-valued left to label. The assertion that replaced it is the one
 * that still matters — the dialog must not quietly regrow a scope the backend
 * ignores, which would promise the operator something the system cannot honour.
 */
test('the discount dialog offers no product or category scope', () => {
  const source = readFileSync(
    'components/features/discount-codes/generate-discount-codes-dialog.tsx',
    'utf8',
  );

  assert.ok(!source.includes('productId'), 'discount codes carry no product scope');
  assert.ok(!source.includes('categoryId'), 'discount codes carry no category scope');
});

/**
 * The payload, not merely the file's vocabulary. The dialog kept sending
 * `discountType` and `discountValue` after the API moved to `valueUsd`, so
 * every Generate press failed with a 400 — and nothing caught it, because the
 * words still appeared in the source. This asserts what actually goes over the
 * wire.
 */
test('the discount dialog submits a dollar amount, not the removed naira fields', () => {
  const [payload, ...rest] = callPayloads(
    'components/features/discount-codes/generate-discount-codes-dialog.tsx',
    'generateDiscountCodes',
  );

  assert.equal(rest.length, 0, 'expected exactly one generate call');
  assert.equal(payload.valueUsd, 'data.valueUsd');
  assert.ok(!('discountValue' in payload), 'discountValue was removed by DISC-008');
  assert.ok(!('discountType' in payload), 'discountType was removed by DISC-008');
});

test('product mutations continue to submit ids rather than display labels', () => {
  const payloads = callPayloads(
    'components/features/products/create-product-dialog.tsx',
    'createProduct',
  );

  assert.equal(payloads.length, 2);
  for (const payload of payloads) {
    assert.equal(payload.brandId, 'data.brandId');
    assert.equal(payload.lineId, 'data.lineId');
    assert.equal(payload.categoryId, 'data.categoryId');
  }
});
