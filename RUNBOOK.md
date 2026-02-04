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

### Staging Environment

1. Push code to `develop` branch
2. Vercel auto-deploys to staging URL
3. Supabase staging project: `<project-name>-staging`

### Production Deployment

1. Merge `develop` → `main`
2. Tag release: `git tag v1.0.0`
3. Push: `git push origin main --tags`
4. Vercel auto-deploys to production
5. Run production migrations:

```bash
# Connect to production project
supabase link --project-ref <prod-project-ref>

# Apply migrations
supabase db push
```

### Environment-Specific Configs

| Environment | Supabase Project | Vercel URL |
|-------------|------------------|------------|
| Local | localhost:54321 | localhost:5173 |
| Staging | energydeal-staging | staging.energydeal.app |
| Production | energydeal-prod | app.energydeal.app |

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
- [ ] Environment variables are set in Vercel
- [ ] CORS is configured correctly
- [ ] Rate limiting is enabled (Supabase Edge Functions)
- [ ] All user inputs are validated with Zod
- [ ] Audit logging is working for critical actions
