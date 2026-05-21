# PaisaOS Prototype — BRD + PRD (v1.0)

## 1) Document Control
- **Product Name:** PaisaOS Prototype
- **Document Type:** Business Requirements Document (BRD) + Product Requirements Document (PRD)
- **Version:** 1.0
- **Date:** 2026-05-21
- **Status:** Draft for stakeholder validation

---

## 2) Executive Summary
PaisaOS is a personal finance operating system for individuals and families to manage income, expenses, savings pots, loans, goals, and net worth from one place.  
The product focuses on period-based planning (monthly/yearly/all-time), intentional allocation of money, and actionable analytics.

---

## 3) Business Requirements (BRD)

### 3.1 Problem Statement
Users track finances across multiple apps/spreadsheets, causing poor visibility into discretionary income, inconsistent goal progress, and weak control over debt and spending behavior.

### 3.2 Business Objectives
1. Provide a single source of truth for personal finances.
2. Enable period-based budgeting and target tracking.
3. Improve goal achievement and debt repayment discipline.
4. Deliver clear reporting for decisions without manual reconciliation.

### 3.3 Target Users
- Young professionals managing monthly cashflow.
- Families with shared planning needs.
- Users with mixed portfolios (cash + investments + liabilities).

### 3.4 Success Metrics (MVP)
- 80%+ of active users complete monthly period closure workflow.
- 90%+ of dashboard cards load successfully within SLA.
- 70%+ of users create at least one goal/pot within first 14 days.
- Monthly report export success rate > 99%.

### 3.5 Scope
#### In Scope (MVP)
- Dashboard, Money Flow, Periods, Calendar, Analytics, Reports, Calculators, Pots, Goals, Net Worth, Settings.
- Single primary user, optional shared-user permissions.
- Manual transaction entry + CSV import/export.

#### Out of Scope (MVP)
- Full open-banking sync (phase 2+ unless approved earlier).
- Advanced AI financial assistant.
- Tax filing integrations.

### 3.6 Key Stakeholders
- Product Owner
- Engineering Lead
- UX/UI Design Lead
- QA Lead
- Security/Compliance Reviewer

---

## 4) Product Requirements (PRD)

## 4.1 User Roles and Permissions
### Primary User
- Full CRUD on all financial entities.
- Manage settings, data exports, and account-level permissions.

### Shared User (Optional)
- Configurable view/edit permissions.
- No destructive account actions unless explicitly granted.

## 4.2 Functional Modules and Requirements

### A) Dashboard
1. Display summary cards for:
   - Total Income
   - Total Invested
   - Intentional Money Rate
   - Loan Repaid
   - Total Expenses
   - Savings Pots Value
   - Active Loans
2. Period selector with quick modes: **Period / Year / All Time**.
3. Display current period target progress (Income, Investments, Loan Repayment, Giving).
4. Show net discretionary income breakdown table.
5. Persist user-selected period context across modules.

### B) Money Flow
1. Record income and expense transactions.
2. Categorize by fixed / variable / one-off.
3. Filter/search by period, category, account, amount range.
4. Support bulk CSV import with validation and error summary.

### C) Periods
1. Create and manage periods (monthly, bi-monthly, yearly).
2. Define allocation targets by percentage.
3. Mark period status: ongoing/closed.
4. Prevent edits to closed period unless reopened with audit trail.

### D) Calendar
1. Track recurring events (salary, bills, EMI/SIP, reminders).
2. Show due/overdue/upcoming states.
3. Notify user based on configured reminder preferences.

### E) Analytics
1. Trend analysis for income vs expenses.
2. Category-level contribution insights.
3. Period-over-period comparisons for key KPIs.

### F) Reports
1. Generate monthly/period reports.
2. Include spending, investing, goals, debt, and net worth sections.
3. Export formats: PDF and CSV.

### G) Calculators
1. Support core calculators for budgeting and planning.
2. Initial set configurable by product owner (e.g., loan, SIP, savings target).

### H) Pots (Savings Buckets)
1. Create pots with target amount and optional deadline.
2. Track contributions and completion percentage.
3. Support linkage between pots and goals.

### I) Goals
1. Create financial goals with amount + deadline.
2. Track progress from manual contributions and linked pots.
3. Display status: on-track / at-risk / completed.

### J) Net Worth
1. Track assets and liabilities over time.
2. Display trend chart and point-in-time snapshot.
3. Attribute changes to major components where possible.

### K) Settings
1. Manage currency, locale, financial year.
2. Manage categories and tags.
3. Configure notifications.
4. Enable backup/export/delete account actions.

## 4.3 Data Model (High-Level Entities)
- Users
- Accounts (bank/cash/card/investment/loan)
- Transactions
- Categories
- Periods
- Targets
- Pots
- Goals
- Loans
- NetWorthSnapshots
- Reports
- Notifications
- AuditLogs

## 4.4 Non-Functional Requirements
### Security & Privacy
- Encrypted transport (TLS) and encryption at rest.
- Role-based access control.
- Optional 2FA.
- PII masking in logs.
- Consent-based data handling and clear retention policy.

### Performance
- Dashboard first meaningful render under 2s for standard data volume.
- Report generation under 10s for normal monthly datasets.

### Reliability
- Daily backup.
- Idempotent import operations.
- Graceful failure handling with actionable error messages.

### Usability
- Mobile-responsive layout.
- Accessible color contrast and keyboard navigation for critical flows.

## 4.5 Integrations
### MVP
- CSV import/export.

### Post-MVP
- Bank aggregators/open-banking providers (country-dependent).
- Notification channels (email/SMS/push).

---

## 5) Backlog Prioritization

## P0 (Must Have)
1. Authentication + profile setup
2. Accounts and transactions (manual + CSV import)
3. Categories and period management
4. Dashboard summary + period selector
5. Pots, goals, loans core tracking
6. Net worth basic tracking
7. Reports export (CSV/PDF)
8. Security baseline (RBAC, encryption, audit logs)

## P1 (Should Have)
1. Calendar reminders
2. Advanced analytics comparisons
3. Shared-user collaboration controls
4. More calculators

## P2 (Could Have)
1. AI assistant and predictive recommendations
2. Open-banking sync
3. Scenario simulation/planning engine

---

## 6) Epics and Feature Acceptance Criteria

## Epic 1: User & Access Foundation
### Acceptance Criteria
- User can register/login/logout securely.
- Optional 2FA can be enabled and verified.
- Shared-user permissions are enforceable on protected actions.

## Epic 2: Finance Data Capture
### Acceptance Criteria
- User can add/edit/delete transactions.
- CSV import rejects invalid rows and provides error report.
- Transactions are visible under selected period context.

## Epic 3: Period Planning & Targets
### Acceptance Criteria
- User can define period and target percentages.
- Dashboard progress bars reflect configured targets.
- Closed periods are immutable without explicit reopen action.

## Epic 4: Savings, Debt, and Goals
### Acceptance Criteria
- User can create pots and goals with progress tracking.
- User can add loans and see repayment progress.
- Dashboard cards update after financial events.

## Epic 5: Insights and Reporting
### Acceptance Criteria
- User can view expense/income trends by period/category.
- User can export monthly report to CSV/PDF.
- Report values reconcile with dashboard totals for same period.

## Epic 6: Net Worth Intelligence
### Acceptance Criteria
- User can record assets and liabilities.
- Net worth trend chart updates per snapshot interval.
- Historical snapshots remain queryable by period.

---

## 7) Risks, Assumptions, Dependencies

### Assumptions
- MVP starts with manual entry + CSV import.
- Single-country regulatory scope in initial release.
- Web-first rollout.

### Risks
- Data quality issues from CSV imports.
- Scope expansion from optional modules (AI, banking sync).
- Compliance requirements varying by geography.

### Dependencies
- Product decision on launch region/currency set.
- Design system and UX completion for all core modules.
- Security and compliance review sign-off before production launch.

---

## 8) Release Plan

## Phase 1 (MVP)
- Core data capture, period management, dashboard, pots/goals/loans, net worth, reports.

## Phase 2
- Calendar + advanced analytics + shared-user enhancements.

## Phase 3
- Open-banking integrations + AI advisory and scenario simulation.

---

## 9) Open Decisions Requiring Stakeholder Input
1. Bank sync in MVP or post-MVP?
2. Single-user only at launch or shared-family mode in MVP?
3. Initial country/currency coverage?
4. Must-have calculators for MVP?
5. Web-only launch or simultaneous mobile apps?
6. AI assistant in MVP or phase 2?

---

## 10) Definition of Done (Product Level)
- All P0 features implemented and QA passed.
- Security checks passed with no unresolved high-severity findings.
- Performance and reliability targets met in staging.
- Documentation complete for user-facing and operational workflows.
