# EnergyDeal CRM

> B2B SaaS platform for energy comparison, designed for commercial agents to calculate savings, manage customer relationships, and track commissions.

## 🎯 Project Status

**Phase**: Architecture & Planning (Phase 1 of 7)

✅ **Completed:**
- Architecture documentation
- Database schema design (18 tables across 6 domains)
- Coding standards
- Development runbook
- 5 SQL migrations for complete data model

🔄 **Current:**
- Implementation plan for calculation engine (awaiting review)

📋 **Next:**
- Project initialization (Vite + React + TypeScript)
- Supabase setup
- Calculation engine implementation

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, domains, tech stack, decisions |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Complete schema with 18 tables, RLS policies |
| [CODING_STANDARDS.md](./CODING_STANDARDS.md) | TypeScript, React, SQL conventions |
| [RUNBOOK.md](./RUNBOOK.md) | Setup, development, deployment guides |

---

## 🏗️ Architecture Overview

### Domains

1. **Multi-Tenancy & Auth**: Companies, users, audit logging
2. **CRM**: Customers (by CIF), contacts, supply points, activities
3. **Tariff Engine**: Batch uploads, versioned tariffs, price components
4. **Comparator**: Comparison inputs/results with reproducible snapshots
5. **Commissions**: Rules, events, payouts for commercial agents
6. **Fiscal**: VAT and payment report exports

### Key Principles

- ✅ **Multi-tenant by design**: Every entity scoped to `company_id`
- ✅ **Audit-first**: Complete action history (who/when/what)
- ✅ **Reproducibility**: Historical calculations reconstructable from snapshots
- ✅ **Data integrity**: No publication without validation + human review
- ✅ **Transparency**: Conflict of interest explicitly flagged

---

## 🛠️ Tech Stack

**Frontend**:
- React 18+ with TypeScript
- Vite (build tool)
- React Query (server state)
- Shadcn/ui (components)
- React Hook Form + Zod (forms/validation)

**Backend**:
- Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- Row-Level Security (RLS) for multi-tenancy
- pg_cron for scheduled tasks

**Infrastructure**:
- Vercel (frontend hosting)
- Supabase Cloud (backend)
- GitHub Actions (CI/CD)

---

## 📊 Database Schema

18 tables across 6 domains:

```
companies (root tenant)
├── users (auth + roles)
├── customers (B2B companies by CIF)
│   ├── contacts
│   ├── supply_points
│   └── activities
├── tariff_batches (upload sessions)
│   ├── tariff_files (PDFs)
│   ├── tariff_versions (immutable, time-scoped)
│   └── tariff_components (prices)
├── comparisons (inputs + snapshot)
│   └── comparison_results (ranked offers)
├── contracts (signed deals)
│   ├── commission_events
│   └── payouts
├── fiscal_exports
│   └── fiscal_lines
└── audit_log (complete history)
```

**Multi-Tenancy**: All tables (except `companies`) have RLS policies scoped to `company_id`.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Supabase CLI: `npm install -g supabase`
- Docker (for local Supabase)

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start local Supabase
supabase start

# 3. Run migrations
supabase db reset

# 4. Configure environment
cp .env.example .env.local
# Edit .env.local with Supabase credentials

# 5. Start dev server
npm run dev
```

See [RUNBOOK.md](./RUNBOOK.md) for detailed setup instructions.

---

## 🧪 Testing Strategy

### Unit Tests (Calculation Engine)
```bash
npm test
```

**Coverage Requirements:**
- 100% for `calculator.ts` (critical business logic)
- Snapshot tests for regression protection

### Integration Tests (Database)
```bash
npm run test:integration
```

**Tests:**
- RLS policies enforce multi-tenancy
- Commission rules cascade correctly
- Tariff versioning works as expected

---

## 📦 Migrations

Located in `supabase/migrations/`, ordered by timestamp:

1. `20260203120000_create_core_tables.sql` - Companies, users, audit
2. `20260203120100_create_crm_tables.sql` - Customers, contacts, supply points
3. `20260203120200_create_tariff_tables.sql` - Tariff engine
4. `20260203120300_create_comparison_contract_tables.sql` - Comparator + contracts
5. `20260203120400_create_commission_fiscal_tables.sql` - Commissions + fiscal

**To apply:**
```bash
supabase db reset  # Local
supabase db push   # Cloud
```

---

## 🔐 Security

- **RLS enforces tenant isolation** at database level
- **No service_role key in client code**
- **Audit logging** for all critical actions
- **Input validation** with Zod schemas (client + server)
- **Signed URLs** for PDF storage (short-lived)

---

## 📋 Implementation Phases

### Phase 1: Foundation ✅
- [x] Architecture documentation
- [x] Database schema
- [x] Coding standards
- [x] SQL migrations

### Phase 2: Core Engine (Next)
- [ ] Calculation engine + tests
- [ ] Tariff upload pipeline
- [ ] Batch validation workflow
- [ ] Human review interface

### Phase 3: CRM
- [ ] Customer management
- [ ] Contacts & supply points
- [ ] Activity tracking

### Phase 4: Comparator
- [ ] Comparison input form
- [ ] Ranking algorithm
- [ ] Client-first vs commercial-first modes

### Phase 5: Commissions
- [ ] Commission rules
- [ ] Event tracking
- [ ] Monthly settlements

### Phase 6: Fiscal
- [ ] VAT reports
- [ ] Payment exports

### Phase 7: Testing & Deployment
- [ ] E2E tests
- [ ] Seed data
- [ ] Production deployment

---

## 🤝 Contributing

See [CODING_STANDARDS.md](./CODING_STANDARDS.md) for:
- TypeScript conventions
- Component structure
- Database naming
- Git commit format
- Testing requirements

---

## 📄 License

Proprietary - All rights reserved

---

## 📞 Support

For questions or issues, contact the development team.

---

**Last Updated**: 2026-02-03  
**Version**: 0.1.0-alpha  
**Status**: Architecture Phase
