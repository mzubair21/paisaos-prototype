import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dataDir = resolve(process.cwd(), 'data');
const storeFile = resolve(dataDir, 'store.json');

export const defaultStore = () => ({
  users: [],
  sessions: [],
  accounts: [],
  categories: [],
  transactions: [],
  periods: [],
  targets: [],
  pots: [],
  goals: [],
  loans: [],
  netWorthSnapshots: [],
  reports: [],
  auditLogs: [],
  imports: []
});

export const ensureStore = () => {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(storeFile)) writeFileSync(storeFile, JSON.stringify(defaultStore(), null, 2));
};

export const loadStore = () => {
  ensureStore();
  return JSON.parse(readFileSync(storeFile, 'utf8'));
};

export const saveStore = (store) => {
  ensureStore();
  writeFileSync(storeFile, JSON.stringify(store, null, 2));
};
