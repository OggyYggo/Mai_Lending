# Repository Guidelines

## Project Structure & Module Organization
This repository is a Next.js 16 app using the App Router and TypeScript. Application routes live under `src/app`, with route groups for authentication in `src/app/(auth)` and admin pages in `src/app/(admin)`. Reusable UI lives in `src/components/ui`, while feature-specific components are grouped under folders such as `src/components/loans`, `src/components/payments`, and `src/components/dashboard`.

Shared logic is kept in `src/lib` (`actions`, Supabase clients, export helpers, utilities), with domain types in `src/types` and Zod validation schemas in `src/validations`. Database schema changes live in `supabase/migrations`.

## Build, Test, and Development Commands
- `npm run dev`: start the local development server.
- `npm run build`: create a production build and catch compile-time issues.
- `npm run start`: run the production build locally.
- `npm run lint`: run Next.js ESLint rules (`next/core-web-vitals`, `next/typescript`).

Use `.env.local.example` as the reference for required environment variables before running the app.

## Coding Style & Naming Conventions
Use TypeScript with strict typing enabled. Follow the existing codebase style: 2-space indentation, double quotes, and path aliases via `@/*` for imports from `src`. Keep React components in `PascalCase` files (`ApproveLoanDialog.tsx`), hooks in `camelCase` with a `use-` prefix (`use-mobile.ts`), and utility modules in lower-case descriptive names (`loan-utils.ts`).

Prefer colocating page-specific components beside the route that uses them, and keep shared primitives inside `src/components/ui`.

## Testing Guidelines
There is no dedicated automated test suite in the repository yet. Until one is added, treat `npm run lint` and `npm run build` as the minimum verification for every change. For database work, validate migration order and test affected admin flows manually against a local Supabase instance.

## Commit & Pull Request Guidelines
Git history currently uses Conventional Commits (example: `feat: initial commit`). Continue with prefixes like `feat:`, `fix:`, `refactor:`, and `docs:`. Keep commit scopes focused.

Pull requests should include a short summary, any environment or migration notes, linked issues when applicable, and screenshots for UI changes. Call out schema changes and manual verification steps explicitly.

## Security & Configuration Tips
Do not commit `.env.local` or service-role secrets. Treat `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` as sensitive values, and rotate them if exposed.
