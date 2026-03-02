# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EnergyDeal CRM — a multi-tenant B2B SaaS platform for Spanish energy comparison. Commercial agents use it to calculate savings, manage customers, track commissions, and handle messaging. All UI strings are in Spanish.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server (localhost:5173) |
| `npm run build` | TypeScript check + Vite production build |
| `npm run lint` | ESLint (zero warnings enforced) |
| `npm test` | Run Vitest unit tests |
| `npm run test:watch` | Tests in watch mode |
| `supabase start` | Start local Supabase (requires Docker) |
| `supabase db reset` | Reset local DB (reapplies all migrations + seed) |
| `supabase db push` | Apply migrations to cloud Supabase |
| `supabase migration new <name>` | Create new timestamped migration file |

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript (strict) + Vite + Tailwind CSS
- **UI Components**: Shadcn/ui (Radix primitives + Tailwind)
- **State**: React Query for server state, local React state for UI
- **Forms**: React Hook Form + Zod validation
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Hosting**: Vercel (frontend) + Supabase Cloud (backend)

### Path Alias
`@/*` maps to `./src/*` (configured in tsconfig.json and vite.config.ts).

### Feature-Based Module Structure
Each feature in `src/features/` contains its own `components/`, `pages/`, and `lib/` subdirectories:

- **auth** — Login, settings, profile
- **crm** — Customers (by CIF), contacts, supply points (CUPS), activities
- **comparator** — Tariff comparison engine with calculation breakdown
- **tariffs** — Upload pipeline (PDF → parse → validate → review → publish)
- **commissioners** — Commercial agents & commission rules
- **contracts** — Deal management tied to comparisons
- **messaging** — Email/WhatsApp campaigns and conversations
- **dashboard** — Main overview page

### Shared Code (`src/shared/`)
- `types/index.ts` — All domain TypeScript interfaces
- `lib/supabase.ts` — Supabase client init (uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`)
- `lib/audit.ts` — Audit logging helper
- `components/ui/` — Shadcn/ui base components
- `components/layout/` — App shell, sidebar, navigation

### Supabase Backend (`supabase/`)
- `migrations/` — 38+ timestamped SQL files (schema, RLS policies, indexes)
- `functions/` — Deno-based Edge Functions (parse-tariff-document, send-message, sync-gmail, webhooks)
- `seed.sql` — Development seed data
- `config.toml` — Local Supabase config (ports: API=54321, DB=54322, Studio=54323)

### Routing
React Router DOM 6 in `src/App.tsx`. All routes except `/login` are wrapped in `<PrivateRoute>` (Supabase session check). Key route groups: `/crm/*`, `/comparator/*`, `/admin/tariffs/*`, `/admin/messages/*`, `/commissioners/*`, `/contracts/*`.

## Key Domain Concepts

- **CIF**: Spanish tax ID — primary identifier for companies/customers
- **CUPS**: Universal Supply Point Code — energy meter identifier
- **Multi-tenancy**: Every table has `company_id` with RLS policies using `auth.company_id()`
- **Tariff versioning**: Tariffs are never overwritten; new versions are created with `valid_from`/`valid_to`
- **Comparison snapshots**: Results are denormalized for reproducibility and audit
- **Commission states**: `pending → validated → paid → reverted`
- **Customer status flow**: `prospecto → contactado → propuesta → negociacion → cliente → perdido`

## Database Conventions

- Tables: `snake_case`, plural (e.g., `customers`, `tariff_batches`)
- Every table (except `companies`) must have: `id UUID`, `company_id UUID`, `created_at`, `updated_at`
- RLS is mandatory on all tables
- Migrations wrapped in `BEGIN`/`COMMIT` with indexes and `updated_at` triggers
- Foreign keys named `{table}_id`

## Coding Conventions

- TypeScript strict mode — no `any` types
- Components: `PascalCase.tsx`; Hooks: `use*.ts`; Utilities: `camelCase.ts`
- Data fetching via React Query hooks wrapping Supabase client queries
- Form validation with Zod schemas matching domain models
- Commit format: `<type>(<scope>): <subject>` (conventional commits)
- Environment variables prefixed with `VITE_`, accessed via `import.meta.env`

## Environment Variables

```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```
