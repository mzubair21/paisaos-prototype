import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('frontend has accessible live status region', () => {
  const html = readFileSync(resolve(process.cwd(), 'src/index.html'), 'utf8');
  assert.match(html, /aria-live="polite"/);
});
