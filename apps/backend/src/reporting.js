const sum = (arr, selector) => arr.reduce((acc, item) => acc + Number(selector(item) || 0), 0);

export const summarizeDashboard = ({ transactions, accounts, pots, goals, loans, periodId }) => {
  const relevant = periodId ? transactions.filter((x) => x.periodId === periodId) : transactions;
  const income = sum(relevant.filter((x) => x.type === 'income'), (x) => x.amount);
  const expenses = sum(relevant.filter((x) => x.type === 'expense'), (x) => x.amount);
  const invested = sum(accounts.filter((x) => x.type === 'investment'), (x) => x.balance);
  const savingsPotsValue = sum(pots, (x) => x.currentAmount);
  const loanRepaid = sum(loans, (x) => x.paidAmount);
  const activeLoans = loans.filter((x) => Number(x.paidAmount) < Number(x.principal)).length;
  const discretionary = income - expenses;
  const intentionalRate = income > 0 ? Number((((invested + savingsPotsValue + loanRepaid) / income) * 100).toFixed(2)) : 0;

  return {
    cards: {
      totalIncome: income,
      totalExpenses: expenses,
      totalInvested: invested,
      savingsPotsValue,
      loanRepaid,
      activeLoans,
      intentionalMoneyRate: intentionalRate
    },
    discretionaryBreakdown: {
      income,
      expenses,
      discretionary
    },
    recordsConsidered: relevant.length
  };
};

export const buildMonthlyReport = ({ period, dashboard, goals, loans, netWorthSnapshots }) => ({
  period,
  generatedAt: new Date().toISOString(),
  summary: dashboard.cards,
  discretionaryBreakdown: dashboard.discretionaryBreakdown,
  goals,
  loans,
  latestNetWorth: netWorthSnapshots.at(-1) || null
});

export const toCsv = (items) => {
  if (!items.length) return '';
  const header = Object.keys(items[0]);
  const lines = [header.join(',')];
  for (const item of items) lines.push(header.map((k) => String(item[k] ?? '')).join(','));
  return lines.join('\n');
};

export const toPdfLikeBuffer = (title, payload) => Buffer.from(`%PDF-1.4\n${title}\n${JSON.stringify(payload, null, 2)}\n%%EOF\n`, 'utf8');
