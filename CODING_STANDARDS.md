# EnergyDeal CRM - Coding Standards

## General Principles

1. **Code Quality Over Speed**: Write clean, maintainable code. Shortcuts create technical debt.
2. **Test Everything Important**: The calculation engine, multi-tenancy, and audit logging must have tests.
3. **Type Safety**: TypeScript strict mode enabled. No `any` types without justification.
4. **Explicit is Better**: No magic numbers, no implicit behavior. Document assumptions.

## File Naming & Structure

### Frontend (React + TypeScript)

```
src/
├── features/              # Feature-based modules
│   ├── auth/
│   ├── crm/
│   ├── comparator/
│   ├── tariffs/
│   ├── commissions/
│   └── fiscal/
├── shared/                # Shared utilities
│   ├── components/        # Reusable UI components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Business logic utilities
│   ├── types/             # Shared TypeScript types
│   └── utils/             # Helper functions
├── config/                # Configuration files
└── App.tsx                # Application entry point
```

**Naming Conventions:**
- Components: `PascalCase.tsx` (e.g., `CustomerList.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useCustomers.ts`)
- Utilities: `camelCase.ts` (e.g., `formatCurrency.ts`)
- Types: `PascalCase.ts` (e.g., `Customer.ts`)

### Backend (Supabase)

```
supabase/
├── migrations/            # SQL migrations (timestamped)
├── functions/             # Edge Functions
├── seed.sql               # Seed data for development
└── config.toml            # Supabase configuration
```

**Migration Naming:**
- Format: `YYYYMMDDHHMMSS_descriptive_name.sql`
- Example: `20260203120000_create_companies_table.sql`

## TypeScript Standards

### Type Definitions

```typescript
// ✅ GOOD: Explicit types for domain entities
export interface Customer {
  id: string;
  company_id: string;
  cif: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// ✅ GOOD: Separate types for API requests/responses
export type CreateCustomerRequest = Omit<Customer, 'id' | 'created_at' | 'updated_at'>;

// ❌ BAD: Using `any`
function processData(data: any) { }

// ✅ GOOD: Use generics or unknown
function processData<T>(data: T) { }
```

### Component Structure

```typescript
// ✅ GOOD: Props interface, destructuring, explicit return type
interface CustomerCardProps {
  customer: Customer;
  onEdit: (id: string) => void;
}

export function CustomerCard({ customer, onEdit }: CustomerCardProps): JSX.Element {
  return (
    <div>
      <h3>{customer.name}</h3>
      <button onClick={() => onEdit(customer.id)}>Edit</button>
    </div>
  );
}
```

## Database Standards

### Naming Conventions

- **Tables**: `snake_case`, plural (e.g., `customers`, `tariff_batches`)
- **Columns**: `snake_case` (e.g., `company_id`, `created_at`)
- **Foreign Keys**: `{table}_id` (e.g., `company_id`, `user_id`)
- **Indexes**: `idx_{table}_{column}` (e.g., `idx_customers_cif`)
- **Constraints**: `{table}_{column}_{type}` (e.g., `customers_cif_unique`)

### Migration Template

```sql
-- Migration: Add description
-- Created: YYYY-MM-DD

BEGIN;

-- Create table
CREATE TABLE IF NOT EXISTS table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  -- other columns
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_table_name_company_id ON table_name(company_id);

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their company's data"
  ON table_name
  FOR ALL
  USING (company_id = auth.company_id());

COMMIT;
```

### Required Columns

Every table (except `companies` and `users`) MUST have:
- `id UUID PRIMARY KEY`
- `company_id UUID REFERENCES companies(id)`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`

## API & Data Fetching

### React Query Hooks

```typescript
// ✅ GOOD: Custom hook wrapping React Query
export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Customer[];
    }
  });
}
```

### Error Handling

```typescript
// ✅ GOOD: Proper error types
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// ✅ GOOD: Catch and rethrow with context
try {
  await saveCustomer(data);
} catch (error) {
  console.error('Failed to save customer:', { error, data });
  throw new DatabaseError(
    'Failed to save customer',
    'SAVE_FAILED',
    { original: error, input: data }
  );
}
```

## Forms & Validation

### Zod Schemas

```typescript
// ✅ GOOD: Validation schema matching domain model
import { z } from 'zod';

export const customerSchema = z.object({
  cif: z.string().regex(/^[A-Z]\d{8}$/, 'CIF must be 1 letter + 8 digits'),
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email().optional(),
  phone: z.string().optional()
});

export type CustomerFormData = z.infer<typeof customerSchema>;
```

## Testing Standards

### Unit Tests (Vitest)

```typescript
import { describe, it, expect } from 'vitest';
import { calculateAnnualCost } from './tariffCalculator';

describe('tariffCalculator', () => {
  describe('calculateAnnualCost', () => {
    it('should calculate cost for standard tariff', () => {
      const result = calculateAnnualCost({
        energyPrice: 0.15,
        powerPrice: 40,
        consumption: 5000,
        power: 10
      });
      
      expect(result).toBeCloseTo(1230, 2); // 5000*0.15 + 12*40*10
    });
  });
});
```

### Integration Tests

```typescript
import { createClient } from '@supabase/supabase-js';
import { beforeEach, describe, it, expect } from 'vitest';

describe('Customer CRUD', () => {
  let supabase: SupabaseClient;
  
  beforeEach(async () => {
    supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
    // Clean test data
  });
  
  it('should create and retrieve customer', async () => {
    const customer = { cif: 'A12345678', name: 'Test Corp' };
    const { data, error } = await supabase.from('customers').insert(customer).select().single();
    
    expect(error).toBeNull();
    expect(data.cif).toBe(customer.cif);
  });
});
```

## Comments & Documentation

### When to Comment

```typescript
// ✅ GOOD: Explain WHY, not WHAT
// We denormalize comparison results to ensure reproducibility
// even if tariffs are updated later
const snapshot = {
  inputs: comparisonInputs,
  results: calculatedResults,
  tariff_version_ids: results.map(r => r.tariff_version_id)
};

// ❌ BAD: Stating the obvious
// Set the name
customer.name = newName;
```

### JSDoc for Public APIs

```typescript
/**
 * Calculates annual energy cost based on tariff and consumption
 * 
 * @param tariff - Tariff configuration with prices
 * @param consumption - Annual consumption in kWh
 * @param power - Contracted power in kW
 * @returns Total annual cost in EUR
 * 
 * @example
 * const cost = calculateAnnualCost(tariff, 5000, 10); // 1230.50
 */
export function calculateAnnualCost(
  tariff: Tariff,
  consumption: number,
  power: number
): number {
  // implementation
}
```

## Git Commit Standards

### Conventional Commits

Format: `<type>(<scope>): <subject>`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or updating tests
- `docs`: Documentation changes
- `chore`: Build process or auxiliary tool changes

**Examples:**
```
feat(crm): add customer search by CIF
fix(comparator): handle edge case when no tariffs available
refactor(tariffs): extract validation logic to separate module
test(commissions): add tests for settlement calculation
docs(architecture): update multi-tenant design diagram
chore(deps): upgrade React to 18.3
```

## Security Guidelines

1. **Never commit secrets**: Use environment variables for API keys
2. **Validate all inputs**: Use Zod schemas on both client and server
3. **RLS is mandatory**: Every table must have RLS policies
4. **Sanitize user content**: Escape HTML in user-generated content
5. **Use prepared statements**: Supabase client does this by default

## Performance Guidelines

1. **Lazy load routes**: Use React.lazy() for code splitting
2. **Optimize queries**: Use `select()` to fetch only needed columns
3. **Cache expensive calculations**: Use React Query's caching
4. **Debounce search inputs**: Don't query on every keystroke
5. **Paginate large lists**: Don't load 1000+ rows at once

## Accessibility (A11y)

1. **Semantic HTML**: Use `<button>`, `<nav>`, `<main>`, etc.
2. **ARIA labels**: Add `aria-label` for icon-only buttons
3. **Keyboard navigation**: All interactive elements must be keyboard-accessible
4. **Color contrast**: Meet WCAG AA standards (4.5:1 for text)
5. **Focus indicators**: Don't remove `:focus` outlines without replacing them

## Pre-Commit Checklist

Before committing code:
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] Linter passes (`npm run lint`)
- [ ] Tests pass (`npm run test`)
- [ ] RLS policies are in place for new tables
- [ ] Audit logging is implemented for critical actions
- [ ] No console.logs in production code
- [ ] Environment variables are documented in `.env.example`
