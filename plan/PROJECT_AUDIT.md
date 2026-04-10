# Project Audit and Improvement Plan

## Scope
This audit is based on the current Next.js 16 + Supabase codebase, a review of the main app/actions/migrations, and local verification attempts on April 10, 2026.

## What I Checked
- App structure under `src/app`, `src/lib/actions`, `src/components`, and `supabase/migrations`
- Authentication flow in middleware and admin layout
- Loan, borrower, payment, and report server actions
- Local verification commands: `npm run lint` and `npm run build`

## Current Findings
### 1. Tooling is not fully aligned with Next.js 16
- `npm run lint` currently runs `next lint` and fails immediately with `Invalid project directory provided ...\\lint`.
- Suggestion: replace it with an ESLint CLI command such as `eslint .` or `eslint src --ext .ts,.tsx`.

### 2. Build verification is blocked by local output locking
- `npm run build` failed with `EPERM` while unlinking `.next\\app-path-routes-manifest.json`.
- Suggestion: stop any running dev server before build, and consider cleaning `.next` in a safe prebuild step if this keeps happening.

### 3. Auth protection is inconsistent
- `src/lib/supabase/middleware.ts` only redirects unauthenticated users for `/dashboard`, but the admin app also exposes `/borrowers`, `/loans`, `/payments`, `/reports`, and `/settings`.
- Suggestion: protect all admin routes in middleware, not just the dashboard path.

### 4. Borrower detail logic is out of sync with the schema
- `src/lib/actions/borrowers.ts` still selects `loan_amount`, while the current loans schema uses `principal_amount`.
- Risk: borrower detail pages can return incorrect totals or fail at runtime.

### 5. Payment processing is not atomic
- `recordPayment()` inserts into `payments`, then separately calls `process_payment()`.
- Risk: if the RPC fails after insert, payment data and schedule balances can diverge.
- Suggestion: move the full write flow into one database function or one transaction boundary.

### 6. Reporting code will not scale well
- `src/lib/actions/reports.ts` performs repeated per-loan queries inside loops.
- Suggestion: replace N+1 reads with joined queries, views, or SQL functions for reports.

### 7. Security rules are broad
- Current RLS policies generally allow all authenticated users full access.
- Suggestion: tighten policies by role and operation, especially for write paths and admin-only data.

## Priority Backlog
1. Fix the lint script and re-run verification in CI.
2. Correct schema mismatches in actions (`loan_amount` vs `principal_amount`).
3. Expand middleware protection to all admin routes.
4. Refactor payment writes into one atomic database operation.
5. Add automated tests for actions, migrations, and critical auth flows.
6. Optimize reporting with database-side aggregation.
7. Replace destructive migration patterns with forward-only production-safe migrations.

## Suggested Next Step
Start with the verification/auth/data-integrity items first. They have the highest chance of causing immediate runtime or operational issues.
