# EnergyDeal CRM - Runbook

## Prerequisites

- **Node.js**: v18+ (recommended: v20 LTS)
- **npm**: v9+
- **Supabase CLI**: Install via `npm install -g supabase`
- **Git**: Latest version

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd crmluz
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Supabase Setup

#### Local Development (Recommended)

```bash
# Start local Supabase instance (requires Docker)
supabase start

# This will output:
# - API URL
# - anon key
# - service_role key
# - Studio URL (local dashboard)
```

#### Cloud Development (Alternative)

1. Create a project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Settings → API

### 4. Environment Variables

Create `.env.local` file:

```bash
# Supabase
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# For development, use local Supabase:
# VITE_SUPABASE_URL=http://localhost:54321
# VITE_SUPABASE_ANON_KEY=<from supabase start output>
```

### 5. Run Database Migrations

```bash
# If using local Supabase
supabase db reset

# If using cloud Supabase
supabase db push
```

### 6. Seed Database (Optional)

```bash
supabase db seed
```

## Development Workflow

### Start Development Server

```bash
npm run dev
```

This will start the Vite dev server at `http://localhost:5173`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |

### Code Quality Checks

Before committing:

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Test
npm test

# Or run all at once
npm run typecheck && npm run lint && npm test
```

## Database Management

### Creating a Migration

```bash
# Create a new migration file
supabase migration new <description>

# Example:
supabase migration new add_customers_table
```

This creates a file in `supabase/migrations/YYYYMMDDHHMMSS_<description>.sql`

### Applying Migrations

```bash
# Local
supabase db reset

# Cloud (staging/production)
supabase db push
```

### Viewing Local Database

```bash
# Open Supabase Studio
supabase studio
```

Visit `http://localhost:54323` to access the local dashboard

### Resetting Local Database

```bash
supabase db reset
```

⚠️ This will destroy all local data and reapply migrations + seed

## Testing

### Unit Tests

```bash
# Run once
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

### Integration Tests

```bash
# Requires local Supabase running
npm run test:integration
```

### E2E Tests (Future)

```bash
npm run test:e2e
```

## Debugging

### Frontend Debugging

1. Use browser DevTools
2. React DevTools extension for component inspection
3. Console logs (remove before committing)

### Backend Debugging

```bash
# View Supabase logs
supabase functions logs <function-name>

# View database logs
supabase db logs
```

### Common Issues

#### Port Already in Use

```bash
# Kill process on port 5173
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5173 | xargs kill
```

#### Supabase Connection Issues

```bash
# Restart Supabase
supabase stop
supabase start
```

#### Module Not Found

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Deployment

Hosting is a self-managed VPS. There is no Vercel integration in this repo — deploys run entirely through GitHub Actions over SSH.

### How it works (confirmed from `.github/workflows/deploy.yml`)

- **Trigger**: `push` to `main`, or manual `workflow_dispatch`. This is the only workflow in `.github/workflows/`, and it does not trigger on `develop` or any other branch.
- **Pipeline**: `deploy.yml` calls a reusable workflow hosted in a different repo, `Opspilots/agenciaopspilot/.github/workflows/deploy-vps.yml@main`, with:
  - `project_name: comparadorluz`
  - `deploy_path: /var/www/energydeal/dist`
  - `test_command: npm test -- --run`
- **Secrets used**: `VPS_HOST`, `VPS_USER`, `VPS_SSH_PRIVATE_KEY` (mapped from this repo's `VPS_SSH_KEY` secret).
- The exact build/rsync/restart steps executed on the VPS live inside `deploy-vps.yml` in the `agenciaopspilot` repo, which is not part of this checkout — check that repo for the literal step-by-step.

### Production Deployment

1. Merge your PR (or push directly) to `main`.
2. GitHub Actions runs `deploy.yml` automatically: it runs `npm test -- --run`, then deploys to the VPS at `deploy_path: /var/www/energydeal/dist`.
3. Apply any pending database migrations manually:

```bash
# Connect to the production Supabase project
supabase link --project-ref <prod-project-ref>

# Apply migrations
supabase db push
```

> The production Supabase project ref is not documented anywhere in this repo — confirm it with whoever administers the Supabase Cloud org before running this.

### Staging Environment

There is currently no staging environment or staging deploy pipeline. `.github/workflows/` contains only `deploy.yml`, and it only triggers on `main`. There is also no separate CI workflow that runs on pull requests — the only automated check before a change reaches production is the `test_command` (`npm test -- --run`) executed as part of the production deploy itself. To validate changes before merging to `main`, rely on local testing (`npm run dev`, local Supabase, `npm run typecheck && npm run lint && npm test`) and manual code review.

### Environment-Specific Configs

| Environment | Supabase Project | App URL |
|-------------|------------------|---------|
| Local | `crmluz` (local, via `supabase start`) | `localhost:5173` |
| Production | Not documented in this repo — link manually with `supabase link --project-ref <prod-project-ref>` | `energydeal.es` (confirmed in `index.html` canonical URL, `public/sitemap.xml`, `public/robots.txt`, and the CORS allow-list in `supabase/functions/_shared/cors.ts`) |

No staging row: no staging environment exists today (see above).

## Monitoring

### Supabase Dashboard

- **API Usage**: Monitor request volume
- **Database Performance**: Slow queries
- **Auth**: User signups/logins
- **Storage**: File uploads

### Sentry (Error Tracking)

- View errors at `sentry.io/organizations/<org>/issues`
- Errors are auto-grouped by stack trace

### PostHog (Analytics)

- User behavior tracking
- Feature usage metrics

## Data Backups

### Local Backups

```bash
# Dump database
supabase db dump > backup.sql

# Restore from dump
psql -h localhost -p 54322 -d postgres -f backup.sql
```

### Production Backups

Supabase Cloud provides automatic daily backups:
- Settings → Database → Backups
- Point-in-time recovery available on Pro plan

## Troubleshooting

### RLS Policy Errors

If queries fail with "permission denied":

1. Check if RLS is enabled: `SELECT tablename FROM pg_tables WHERE rowsecurity = true;`
2. Verify policies exist: `SELECT * FROM pg_policies WHERE tablename = 'customers';`
3. Test policy logic in SQL Editor

### Migration Conflicts

If migration fails:

```bash
# Rollback local
supabase db reset

# Check migration history
supabase migration list
```

### Performance Issues

1. Check slow queries in Supabase Dashboard
2. Add missing indexes
3. Review RLS policies (they can be slow)
4. Consider materialized views for complex queries

## Support & Documentation

- **Supabase Docs**: https://supabase.com/docs
- **React Query Docs**: https://tanstack.com/query/latest
- **Vite Docs**: https://vitejs.dev
- **GitHub Issues**: <repository-url>/issues

## Security Checklist

Before deploying to production:
- [ ] All RLS policies are in place
- [ ] No service_role key in client code
- [ ] Environment variables required for the build (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, etc.) are correctly configured for the deploy pipeline — the exact mechanism (GitHub Actions secrets/vars vs. a `.env` file on the VPS) is defined in the external `deploy-vps.yml` reusable workflow (`Opspilots/agenciaopspilot`), not in this repo; verify there before assuming
- [ ] CORS is configured correctly
- [ ] Rate limiting is enabled (Supabase Edge Functions)
- [ ] All user inputs are validated with Zod
- [ ] Audit logging is working for critical actions
