export const domainEntities = [
  'Users',
  'Accounts',
  'Transactions',
  'Categories',
  'Periods',
  'Targets',
  'Pots',
  'Goals',
  'Loans',
  'NetWorthSnapshots',
  'Reports',
  'AuditLogs'
];

export const apiContracts = {
  auth: ['/api/auth/register', '/api/auth/login'],
  profile: ['/api/profile'],
  moneyFlow: ['/api/accounts', '/api/categories', '/api/transactions', '/api/transactions/import-csv', '/api/transactions/export-csv'],
  periods: ['/api/periods', '/api/targets/:periodId'],
  dashboard: ['/api/dashboard'],
  planning: ['/api/pots', '/api/goals', '/api/loans'],
  netWorth: ['/api/net-worth'],
  reports: ['/api/reports/monthly', '/api/reports/export.csv', '/api/reports/export.pdf'],
  observability: ['/health', '/metrics']
};

export const environments = ['dev', 'staging', 'prod'];
