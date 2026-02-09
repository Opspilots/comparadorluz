-- 1. Create table commissioners
CREATE TABLE public.commissioners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id),
    user_id UUID REFERENCES public.users(id) UNIQUE, -- Link to auth user, must be unique
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    nif VARCHAR(20),
    address TEXT,
    commission_default_pct DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.commissioners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view commissioners from their company" 
ON public.commissioners FOR SELECT 
USING (company_id = auth.company_id());

CREATE POLICY "Admins/Managers can manage commissioners" 
ON public.commissioners FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'manager')
  )
);

-- 3. Migrate existing commercials (Preserving IDs)
INSERT INTO public.commissioners (id, company_id, user_id, full_name, email, commission_default_pct, created_at, updated_at)
SELECT id, company_id, id, full_name, email, commission_default_pct, created_at, updated_at
FROM public.users
WHERE role = 'commercial';

-- 4. Update Foreign Keys

-- Contracts: commercial_id points to commissioners(id)
ALTER TABLE public.contracts
    DROP CONSTRAINT IF EXISTS contracts_commercial_id_fkey,
    ADD CONSTRAINT contracts_commercial_id_fkey
    FOREIGN KEY (commercial_id) REFERENCES public.commissioners(id);

-- Commission Rules: Rename user_id -> commissioner_id and update FK
ALTER TABLE public.commission_rules
    DROP CONSTRAINT IF EXISTS commission_rules_user_id_fkey,
    RENAME COLUMN user_id TO commissioner_id;

ALTER TABLE public.commission_rules
    ADD CONSTRAINT commission_rules_commissioner_id_fkey
    FOREIGN KEY (commissioner_id) REFERENCES public.commissioners(id);

-- Commission Events: Rename user_id -> commissioner_id and update FK
ALTER TABLE public.commission_events
    DROP CONSTRAINT IF EXISTS commission_events_user_id_fkey,
    RENAME COLUMN user_id TO commissioner_id;

ALTER TABLE public.commission_events
    ADD CONSTRAINT commission_events_commissioner_id_fkey
    FOREIGN KEY (commissioner_id) REFERENCES public.commissioners(id);

-- Payouts: Rename user_id -> commissioner_id and update FK
ALTER TABLE public.payouts
    DROP CONSTRAINT IF EXISTS payouts_user_id_fkey,
    RENAME COLUMN user_id TO commissioner_id;

ALTER TABLE public.payouts
    ADD CONSTRAINT payouts_commissioner_id_fkey
    FOREIGN KEY (commissioner_id) REFERENCES public.commissioners(id);

-- Customers: assigned_to points to commissioners(id)
ALTER TABLE public.customers
    DROP CONSTRAINT IF EXISTS customers_assigned_to_fkey,
    ADD CONSTRAINT customers_assigned_to_fkey
    FOREIGN KEY (assigned_to) REFERENCES public.commissioners(id);
