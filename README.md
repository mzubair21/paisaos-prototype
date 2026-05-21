# PaisaOS Prototype

PaisaOS Prototype now includes a runnable P0 MVP foundation in a monorepo:

- `apps/backend`: Node.js API implementing auth, profile, accounts, transactions, periods/targets, dashboard, pots/goals/loans, net worth, CSV import/export, and reports.
- `apps/frontend`: lightweight responsive web UI for exercising the vertical slices.
- `packages/shared`: shared domain + API contract constants.
- `infra`: environment templates and Docker Compose scaffolding.

## Environment strategy

Environment templates are in `/infra/environments` for `dev`, `staging`, and `prod`.

## CI/CD quality gates

GitHub Actions workflow (`.github/workflows/ci.yml`) runs lint, build, and tests across all workspaces and all environments.

## Run locally

```bash
npm run lint
npm run build
npm test
npm run dev
```

Backend starts on `http://localhost:3000`.

To run frontend:

```bash
cd apps/frontend && npm run dev
```

## Netlify deployment (frontend)

This repository includes a root `netlify.toml` configured for the frontend workspace:

- Build command: `npm --workspace apps/frontend run build`
- Publish directory: `apps/frontend/dist/src`

## API overview

- Health and metrics: `GET /health`, `GET /metrics`
- Auth/profile: `POST /api/auth/register`, `POST /api/auth/login`, `GET/PUT /api/profile`
- Money flow: `/api/accounts`, `/api/categories`, `/api/transactions`, `/api/transactions/import-csv`, `/api/transactions/export-csv`
- Planning: `/api/periods`, `/api/targets/:periodId`, `/api/pots`, `/api/goals`, `/api/loans`
- Insights and reports: `/api/dashboard`, `/api/net-worth`, `/api/reports/monthly`, `/api/reports/export.csv`, `/api/reports/export.pdf`
- Security baseline: password hashing (PBKDF2), encrypted PII fields (AES-256-GCM), primary/shared RBAC checks, audit logging.

## Notes

- This is a prototype implementation focused on P0 delivery and architecture lock-in.
- The PDF export is a prototype-compatible generated payload using `application/pdf` response format.
