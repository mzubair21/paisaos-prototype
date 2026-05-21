const apiBase = (window.location.search.includes('api=') ? new URLSearchParams(window.location.search).get('api') : null) || 'http://localhost:3000';
let token = null;
let selectedPeriodId = null;

const output = document.getElementById('output');
const status = document.getElementById('status');
const log = (value) => {
  output.textContent = `${JSON.stringify(value, null, 2)}\n\n${output.textContent}`;
};

const api = async (path, options = {}) => {
  const headers = { 'content-type': 'application/json', ...(options.headers || {}) };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${apiBase}${path}`, { ...options, headers });
  const ct = res.headers.get('content-type') || '';
  const body = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(typeof body === 'string' ? body : body.error || 'Request failed');
  return body;
};

const setAuth = (isAuthed) => {
  status.textContent = isAuthed ? 'Authenticated.' : 'Not authenticated.';
};

document.getElementById('register-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  log(await api('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }));
});

document.getElementById('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  const result = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(data) });
  token = result.token;
  setAuth(true);
  log(result);
});

document.getElementById('seed-data').addEventListener('click', async () => {
  const account = await api('/api/accounts', { method: 'POST', body: JSON.stringify({ name: 'Main Bank', type: 'bank', balance: 4500 }) });
  const category = await api('/api/categories', { method: 'POST', body: JSON.stringify({ name: 'Salary', type: 'income' }) });
  const period = await api('/api/periods', { method: 'POST', body: JSON.stringify({ name: '2026-05', startDate: '2026-05-01', endDate: '2026-05-31' }) });
  selectedPeriodId = period.id;
  const transaction = await api('/api/transactions', {
    method: 'POST',
    body: JSON.stringify({ accountId: account.id, categoryId: category.id, type: 'income', amount: 1200, date: '2026-05-21', periodId: selectedPeriodId })
  });
  log({ account, category, period, transaction });
});

document.getElementById('create-pot').addEventListener('click', async () => {
  log(await api('/api/pots', { method: 'POST', body: JSON.stringify({ name: 'Emergency', targetAmount: 5000, currentAmount: 600 }) }));
});

document.getElementById('create-goal').addEventListener('click', async () => {
  log(await api('/api/goals', { method: 'POST', body: JSON.stringify({ name: 'Bike', targetAmount: 1500, currentAmount: 350 }) }));
});

document.getElementById('create-loan').addEventListener('click', async () => {
  log(await api('/api/loans', { method: 'POST', body: JSON.stringify({ name: 'Car Loan', principal: 10000, paidAmount: 1400 }) }));
});

document.getElementById('add-net-worth').addEventListener('click', async () => {
  log(await api('/api/net-worth', { method: 'POST', body: JSON.stringify({ date: '2026-05-21', totalAssets: 12000, totalLiabilities: 6000 }) }));
});

document.getElementById('dashboard').addEventListener('click', async () => {
  log(await api(`/api/dashboard?mode=period&periodId=${selectedPeriodId || ''}`));
});

document.getElementById('report').addEventListener('click', async () => {
  log(await api(`/api/reports/monthly?periodId=${selectedPeriodId || ''}`));
});
