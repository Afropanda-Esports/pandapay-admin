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

function createProductPayloads(file: string): Array<Record<string, string>> {
  const source = readFileSync(file, 'utf8');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const payloads: Array<Record<string, string>> = [];

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(tree) === 'createProduct' &&
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

test('all UUID selects in the discount dialog provide label maps', () => {
  const configured = configuredItemMaps(
    'components/features/discount-codes/generate-discount-codes-dialog.tsx',
  );

  assert.ok(configured.includes('productSelectItems'));
  assert.ok(configured.includes('categorySelectItems'));
});

test('product mutations continue to submit ids rather than display labels', () => {
  const payloads = createProductPayloads(
    'components/features/products/create-product-dialog.tsx',
  );

  assert.equal(payloads.length, 2);
  for (const payload of payloads) {
    assert.equal(payload.brandId, 'data.brandId');
    assert.equal(payload.lineId, 'data.lineId');
    assert.equal(payload.categoryId, 'data.categoryId');
  }
});
