import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeDashboard } from '../src/reporting.js';

test('dashboard summary computes totals and discretionary income', () => {
  const result = summarizeDashboard({
    transactions: [
      { type: 'income', amount: 1000, periodId: 'p1' },
      { type: 'expense', amount: 300, periodId: 'p1' }
    ],
    accounts: [{ type: 'investment', balance: 120 }],
    pots: [{ currentAmount: 80 }],
    goals: [],
    loans: [{ principal: 1000, paidAmount: 100 }],
    periodId: 'p1'
  });

  assert.equal(result.cards.totalIncome, 1000);
  assert.equal(result.cards.totalExpenses, 300);
  assert.equal(result.discretionaryBreakdown.discretionary, 700);
});
