import { createServer } from 'node:http';
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defaultStore, loadStore, saveStore } from './persistence.js';
import { buildMonthlyReport, summarizeDashboard, toCsv, toPdfLikeBuffer } from './reporting.js';
import { createId, decryptText, emailDigest, encryptText, hashPassword, maskPii, signSessionToken, verifyPassword } from './security.js';
import { ensurePositiveNumber, parseCsvRows, parseJsonBody, requireFields } from './validation.js';

const port = Number(process.env.PORT || 3000);
const env = process.env.NODE_ENV || 'dev';
const startTime = Date.now();
const errorLogFile = resolve(process.cwd(), 'data', 'errors.log');

const json = (res, status, payload) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
};

const sendText = (res, status, body, contentType = 'text/plain; charset=utf-8') => {
  res.writeHead(status, { 'content-type': contentType });
  res.end(body);
};

const unauthorized = (res) => json(res, 401, { error: 'Unauthorized' });

const audit = (store, userId, action, entity, entityId, details = {}) => {
  store.auditLogs.push({
    id: createId('audit'),
    userId,
    action,
    entity,
    entityId,
    details,
    createdAt: new Date().toISOString()
  });
};

const getSessionUser = (req, store) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice('Bearer '.length);
  const session = store.sessions.find((x) => x.token === token);
  if (!session) return null;
  const user = store.users.find((x) => x.id === session.userId);
  if (!user) return null;
  return { user, token };
};

const resolvePeriodContext = (periods, requestedPeriodId, mode) => {
  if (mode === 'all') return null;
  if (requestedPeriodId) return periods.find((x) => x.id === requestedPeriodId)?.id || null;
  if (mode === 'year') {
    const year = new Date().getUTCFullYear();
    const inYear = periods.filter((x) => String(x.startDate).startsWith(String(year)));
    return inYear.at(-1)?.id || null;
  }
  return periods.at(-1)?.id || null;
};

const parsePath = (url) => {
  const [pathname, query = ''] = url.split('?');
  const search = new URLSearchParams(query);
  return { pathname, search };
};

const metricsPayload = (store) => ({
  env,
  uptimeSeconds: Math.round((Date.now() - startTime) / 1000),
  counts: Object.fromEntries(Object.entries(store).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]))
});

const validateRole = (session, role) => session?.user?.role === role;

const server = createServer(async (req, res) => {
  let store = loadStore();
  const { pathname, search } = parsePath(req.url || '/');

  try {
    if (req.method === 'GET' && pathname === '/health') {
      json(res, 200, { status: 'ok', env });
      return;
    }

    if (req.method === 'GET' && pathname === '/metrics') {
      json(res, 200, metricsPayload(store));
      return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/register') {
      const body = await parseJsonBody(req);
      const missing = requireFields(body, ['email', 'password', 'name']);
      if (missing) return json(res, 400, { error: missing });
      const existing = store.users.find((u) => u.emailHash === emailDigest(body.email));
      if (existing) return json(res, 409, { error: 'Email already registered' });
      const user = {
        id: createId('user'),
        emailHash: emailDigest(body.email),
        emailEncrypted: encryptText(body.email),
        nameEncrypted: encryptText(body.name),
        passwordHash: hashPassword(body.password),
        role: 'primary',
        createdAt: new Date().toISOString(),
        profile: {
          locale: 'en-US',
          currency: 'USD',
          financialYearStartMonth: 1
        }
      };
      store.users.push(user);
      audit(store, user.id, 'create', 'user', user.id, { email: maskPii(body.email) });
      saveStore(store);
      json(res, 201, { id: user.id, email: body.email, name: body.name });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/login') {
      const body = await parseJsonBody(req);
      const missing = requireFields(body, ['email', 'password']);
      if (missing) return json(res, 400, { error: missing });
      const user = store.users.find((u) => u.emailHash === emailDigest(body.email));
      if (!user || !verifyPassword(body.password, user.passwordHash)) return unauthorized(res);
      const token = signSessionToken();
      store.sessions = store.sessions.filter((s) => s.userId !== user.id);
      store.sessions.push({ id: createId('session'), userId: user.id, token, createdAt: new Date().toISOString() });
      audit(store, user.id, 'create', 'session', token.slice(0, 8), {});
      saveStore(store);
      json(res, 200, { token, role: user.role });
      return;
    }

    const session = getSessionUser(req, store);

    if (req.method === 'GET' && pathname === '/api/profile') {
      if (!session) return unauthorized(res);
      json(res, 200, {
        id: session.user.id,
        email: decryptText(session.user.emailEncrypted),
        name: decryptText(session.user.nameEncrypted),
        role: session.user.role,
        profile: session.user.profile
      });
      return;
    }

    if (req.method === 'PUT' && pathname === '/api/profile') {
      if (!session) return unauthorized(res);
      const body = await parseJsonBody(req);
      const target = store.users.find((u) => u.id === session.user.id);
      if (body.name) target.nameEncrypted = encryptText(body.name);
      target.profile = { ...target.profile, ...(body.profile || {}) };
      audit(store, target.id, 'update', 'profile', target.id, { changed: Object.keys(body) });
      saveStore(store);
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/shared-users') {
      if (!session) return unauthorized(res);
      if (!validateRole(session, 'primary')) return json(res, 403, { error: 'Primary user required' });
      const body = await parseJsonBody(req);
      const missing = requireFields(body, ['email', 'password', 'name']);
      if (missing) return json(res, 400, { error: missing });
      const sharedUser = {
        id: createId('user'),
        emailHash: emailDigest(body.email),
        emailEncrypted: encryptText(body.email),
        nameEncrypted: encryptText(body.name),
        passwordHash: hashPassword(body.password),
        role: 'shared',
        createdAt: new Date().toISOString(),
        ownerId: session.user.id,
        profile: { locale: 'en-US', currency: 'USD', financialYearStartMonth: 1 }
      };
      store.users.push(sharedUser);
      audit(store, session.user.id, 'create', 'shared-user', sharedUser.id, { email: maskPii(body.email) });
      saveStore(store);
      json(res, 201, { id: sharedUser.id, role: sharedUser.role });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/accounts') {
      if (!session) return unauthorized(res);
      json(res, 200, store.accounts.filter((x) => x.userId === session.user.id));
      return;
    }

    if (req.method === 'POST' && pathname === '/api/accounts') {
      if (!session) return unauthorized(res);
      const body = await parseJsonBody(req);
      const missing = requireFields(body, ['name', 'type', 'balance']);
      if (missing) return json(res, 400, { error: missing });
      const balanceErr = ensurePositiveNumber(body.balance, 'balance');
      if (balanceErr) return json(res, 400, { error: balanceErr });
      const item = { id: createId('acc'), userId: session.user.id, name: body.name, type: body.type, balance: Number(body.balance) };
      store.accounts.push(item);
      audit(store, session.user.id, 'create', 'account', item.id, { type: item.type });
      saveStore(store);
      json(res, 201, item);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/categories') {
      if (!session) return unauthorized(res);
      json(res, 200, store.categories.filter((x) => x.userId === session.user.id));
      return;
    }

    if (req.method === 'POST' && pathname === '/api/categories') {
      if (!session) return unauthorized(res);
      const body = await parseJsonBody(req);
      const missing = requireFields(body, ['name', 'type']);
      if (missing) return json(res, 400, { error: missing });
      const category = { id: createId('cat'), userId: session.user.id, name: body.name, type: body.type };
      store.categories.push(category);
      audit(store, session.user.id, 'create', 'category', category.id, {});
      saveStore(store);
      json(res, 201, category);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/periods') {
      if (!session) return unauthorized(res);
      json(res, 200, store.periods.filter((x) => x.userId === session.user.id));
      return;
    }

    if (req.method === 'POST' && pathname === '/api/periods') {
      if (!session) return unauthorized(res);
      const body = await parseJsonBody(req);
      const missing = requireFields(body, ['name', 'startDate', 'endDate']);
      if (missing) return json(res, 400, { error: missing });
      const period = { id: createId('period'), userId: session.user.id, name: body.name, startDate: body.startDate, endDate: body.endDate, status: 'ongoing' };
      store.periods.push(period);
      audit(store, session.user.id, 'create', 'period', period.id, {});
      saveStore(store);
      json(res, 201, period);
      return;
    }

    if (req.method === 'PATCH' && pathname.startsWith('/api/periods/')) {
      if (!session) return unauthorized(res);
      const id = pathname.split('/').at(-1);
      const body = await parseJsonBody(req);
      const period = store.periods.find((x) => x.id === id && x.userId === session.user.id);
      if (!period) return json(res, 404, { error: 'Not found' });
      if (period.status === 'closed' && body.status !== 'ongoing') return json(res, 400, { error: 'Closed periods are immutable unless reopened' });
      if (body.status) period.status = body.status;
      audit(store, session.user.id, 'update', 'period', id, { status: body.status });
      saveStore(store);
      json(res, 200, period);
      return;
    }

    if (req.method === 'PUT' && pathname.startsWith('/api/targets/')) {
      if (!session) return unauthorized(res);
      const periodId = pathname.split('/').at(-1);
      const body = await parseJsonBody(req);
      const payload = {
        incomePct: Number(body.incomePct || 0),
        investmentsPct: Number(body.investmentsPct || 0),
        loanRepaymentPct: Number(body.loanRepaymentPct || 0),
        givingPct: Number(body.givingPct || 0)
      };
      const existing = store.targets.find((x) => x.periodId === periodId && x.userId === session.user.id);
      if (existing) Object.assign(existing, payload);
      else store.targets.push({ id: createId('target'), userId: session.user.id, periodId, ...payload });
      audit(store, session.user.id, 'upsert', 'target', periodId, payload);
      saveStore(store);
      json(res, 200, payload);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/transactions') {
      if (!session) return unauthorized(res);
      const periodId = search.get('periodId');
      const rows = store.transactions.filter((x) => x.userId === session.user.id && (!periodId || x.periodId === periodId));
      json(res, 200, rows);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/transactions') {
      if (!session) return unauthorized(res);
      const body = await parseJsonBody(req);
      const missing = requireFields(body, ['accountId', 'categoryId', 'type', 'amount', 'date']);
      if (missing) return json(res, 400, { error: missing });
      const amountErr = ensurePositiveNumber(body.amount, 'amount');
      if (amountErr) return json(res, 400, { error: amountErr });
      const periodId = body.periodId || resolvePeriodContext(store.periods.filter((p) => p.userId === session.user.id), null, 'period');
      const period = store.periods.find((p) => p.id === periodId && p.userId === session.user.id);
      if (period && period.status === 'closed') return json(res, 400, { error: 'Cannot edit closed period' });
      const tx = {
        id: createId('txn'),
        userId: session.user.id,
        accountId: body.accountId,
        categoryId: body.categoryId,
        type: body.type,
        amount: Number(body.amount),
        description: body.description || '',
        date: body.date,
        periodId: periodId || null
      };
      store.transactions.push(tx);
      audit(store, session.user.id, 'create', 'transaction', tx.id, { type: tx.type, amount: tx.amount });
      saveStore(store);
      json(res, 201, tx);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/transactions/import-csv') {
      if (!session) return unauthorized(res);
      const body = await parseJsonBody(req);
      const missing = requireFields(body, ['idempotencyKey', 'csv']);
      if (missing) return json(res, 400, { error: missing });
      const importKey = `${session.user.id}:${body.idempotencyKey}`;
      if (store.imports.find((x) => x.idempotencyKey === importKey)) {
        return json(res, 200, { status: 'duplicate', imported: 0, errors: [] });
      }
      const { rows } = parseCsvRows(body.csv);
      const errors = [];
      let imported = 0;
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const amountErr = ensurePositiveNumber(row.amount, `row ${index + 1} amount`);
        if (!row.accountId || !row.categoryId || !row.type || !row.date || amountErr) {
          errors.push({ row: index + 1, reason: amountErr || 'Missing required value(s)' });
          continue;
        }
        store.transactions.push({
          id: createId('txn'),
          userId: session.user.id,
          accountId: row.accountId,
          categoryId: row.categoryId,
          type: row.type,
          amount: Number(row.amount),
          description: row.description || '',
          date: row.date,
          periodId: row.periodId || null
        });
        imported += 1;
      }
      store.imports.push({ id: createId('import'), userId: session.user.id, idempotencyKey: importKey, rowCount: rows.length, imported, createdAt: new Date().toISOString() });
      audit(store, session.user.id, 'import', 'transactions', body.idempotencyKey, { imported, rejected: errors.length });
      saveStore(store);
      json(res, 200, { status: 'ok', imported, errors });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/transactions/export-csv') {
      if (!session) return unauthorized(res);
      const periodId = search.get('periodId');
      const rows = store.transactions.filter((x) => x.userId === session.user.id && (!periodId || x.periodId === periodId));
      sendText(res, 200, toCsv(rows), 'text/csv; charset=utf-8');
      return;
    }

    const registerCollection = (name) => {
      if (req.method === 'GET' && pathname === `/api/${name}`) {
        if (!session) return unauthorized(res);
        json(res, 200, store[name].filter((x) => x.userId === session.user.id));
        return true;
      }
      if (req.method === 'POST' && pathname === `/api/${name}`) {
        if (!session) return unauthorized(res);
        return parseJsonBody(req).then((body) => {
          const definitions = {
            pots: ['name', 'targetAmount'],
            goals: ['name', 'targetAmount'],
            loans: ['name', 'principal']
          };
          const missing = requireFields(body, definitions[name]);
          if (missing) return json(res, 400, { error: missing });
          const amountField = name === 'loans' ? 'principal' : 'targetAmount';
          const amountErr = ensurePositiveNumber(body[amountField], amountField);
          if (amountErr) return json(res, 400, { error: amountErr });
          const item = { id: createId(name.slice(0, -1)), userId: session.user.id, ...body, currentAmount: Number(body.currentAmount || 0), paidAmount: Number(body.paidAmount || 0) };
          store[name].push(item);
          audit(store, session.user.id, 'create', name.slice(0, -1), item.id, {});
          saveStore(store);
          json(res, 201, item);
        });
      }
      if (req.method === 'PATCH' && pathname.startsWith(`/api/${name}/`)) {
        if (!session) return unauthorized(res);
        const id = pathname.split('/').at(-1);
        return parseJsonBody(req).then((body) => {
          const item = store[name].find((x) => x.id === id && x.userId === session.user.id);
          if (!item) return json(res, 404, { error: 'Not found' });
          Object.assign(item, body);
          audit(store, session.user.id, 'update', name.slice(0, -1), id, { fields: Object.keys(body) });
          saveStore(store);
          json(res, 200, item);
        });
      }
      return false;
    };

    if (registerCollection('pots') || registerCollection('goals') || registerCollection('loans')) return;

    if (req.method === 'GET' && pathname === '/api/net-worth') {
      if (!session) return unauthorized(res);
      json(res, 200, store.netWorthSnapshots.filter((x) => x.userId === session.user.id));
      return;
    }

    if (req.method === 'POST' && pathname === '/api/net-worth') {
      if (!session) return unauthorized(res);
      const body = await parseJsonBody(req);
      const missing = requireFields(body, ['date', 'totalAssets', 'totalLiabilities']);
      if (missing) return json(res, 400, { error: missing });
      const assetsErr = ensurePositiveNumber(body.totalAssets, 'totalAssets');
      const liabilitiesErr = ensurePositiveNumber(body.totalLiabilities, 'totalLiabilities');
      if (assetsErr || liabilitiesErr) return json(res, 400, { error: assetsErr || liabilitiesErr });
      const snapshot = {
        id: createId('nw'),
        userId: session.user.id,
        date: body.date,
        totalAssets: Number(body.totalAssets),
        totalLiabilities: Number(body.totalLiabilities),
        netWorth: Number(body.totalAssets) - Number(body.totalLiabilities)
      };
      store.netWorthSnapshots.push(snapshot);
      audit(store, session.user.id, 'create', 'net-worth', snapshot.id, {});
      saveStore(store);
      json(res, 201, snapshot);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/dashboard') {
      if (!session) return unauthorized(res);
      const mode = search.get('mode') || 'period';
      const userPeriods = store.periods.filter((x) => x.userId === session.user.id);
      const selectedPeriodId = resolvePeriodContext(userPeriods, search.get('periodId'), mode);
      const dashboard = summarizeDashboard({
        transactions: store.transactions.filter((x) => x.userId === session.user.id),
        accounts: store.accounts.filter((x) => x.userId === session.user.id),
        pots: store.pots.filter((x) => x.userId === session.user.id),
        goals: store.goals.filter((x) => x.userId === session.user.id),
        loans: store.loans.filter((x) => x.userId === session.user.id),
        periodId: selectedPeriodId
      });
      const targets = store.targets.find((x) => x.userId === session.user.id && x.periodId === selectedPeriodId) || null;
      json(res, 200, { mode, selectedPeriodId, dashboard, targets });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/reports/monthly') {
      if (!session) return unauthorized(res);
      const periodId = search.get('periodId');
      const period = store.periods.find((x) => x.id === periodId && x.userId === session.user.id) || null;
      const dashboard = summarizeDashboard({
        transactions: store.transactions.filter((x) => x.userId === session.user.id),
        accounts: store.accounts.filter((x) => x.userId === session.user.id),
        pots: store.pots.filter((x) => x.userId === session.user.id),
        goals: store.goals.filter((x) => x.userId === session.user.id),
        loans: store.loans.filter((x) => x.userId === session.user.id),
        periodId
      });
      const report = buildMonthlyReport({
        period,
        dashboard,
        goals: store.goals.filter((x) => x.userId === session.user.id),
        loans: store.loans.filter((x) => x.userId === session.user.id),
        netWorthSnapshots: store.netWorthSnapshots.filter((x) => x.userId === session.user.id)
      });
      store.reports.push({ id: createId('report'), userId: session.user.id, periodId, createdAt: report.generatedAt, type: 'monthly' });
      audit(store, session.user.id, 'create', 'report', periodId || 'all', {});
      saveStore(store);
      json(res, 200, report);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/reports/export.csv') {
      if (!session) return unauthorized(res);
      const periodId = search.get('periodId');
      const txs = store.transactions.filter((x) => x.userId === session.user.id && (!periodId || x.periodId === periodId));
      sendText(res, 200, toCsv(txs), 'text/csv; charset=utf-8');
      return;
    }

    if (req.method === 'GET' && pathname === '/api/reports/export.pdf') {
      if (!session) return unauthorized(res);
      const periodId = search.get('periodId');
      const payload = { periodId, summary: 'Prototype PDF export' };
      const pdf = toPdfLikeBuffer('PaisaOS Monthly Report', payload);
      res.writeHead(200, { 'content-type': 'application/pdf', 'content-length': pdf.length });
      res.end(pdf);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/audit-logs') {
      if (!session) return unauthorized(res);
      if (!validateRole(session, 'primary')) return json(res, 403, { error: 'Primary user required' });
      json(res, 200, store.auditLogs.filter((x) => x.userId === session.user.id));
      return;
    }

    json(res, 404, { error: 'Route not found' });
  } catch (error) {
    appendFileSync(errorLogFile, `[${new Date().toISOString()}] ${error.stack || error.message}\n`);
    json(res, 500, { error: 'Internal server error', details: env === 'dev' ? error.message : undefined });
  }
});

if (process.env.NODE_ENV !== 'test') {
  if (loadStore() == null) saveStore(defaultStore());
  server.listen(port, () => {
    console.log(`PaisaOS backend listening on port ${port}`);
  });
}

export { server };
