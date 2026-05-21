import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsvRows, requireFields } from '../src/validation.js';

test('requireFields returns missing field message', () => {
  const missing = requireFields({ a: 1 }, ['a', 'b']);
  assert.equal(missing, 'Missing required field: b');
});

test('parseCsvRows parses CSV rows', () => {
  const parsed = parseCsvRows('accountId,categoryId,type,amount,date\na,c,income,25,2026-05-21');
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].amount, '25');
});
