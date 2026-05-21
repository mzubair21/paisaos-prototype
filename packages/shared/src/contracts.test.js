import test from 'node:test';
import assert from 'node:assert/strict';
import { apiContracts, domainEntities } from './contracts.js';

test('contracts include p0 dashboard and reporting APIs', () => {
  assert.ok(apiContracts.dashboard.includes('/api/dashboard'));
  assert.ok(apiContracts.reports.includes('/api/reports/monthly'));
  assert.ok(domainEntities.includes('Transactions'));
});
