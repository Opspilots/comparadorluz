-- Create Campaigns Table
create table if not exists campaigns (
    id uuid default gen_random_uuid() primary key,
    company_id uuid references companies(id) not null,
    name text not null,
    subject text,
    body text,
    status text default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed')),
    scheduled_at timestamptz,
    sent_at timestamptz,
    created_by uuid references auth.users(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Create Campaign Recipients Table
create table if not exists campaign_recipients (
    id uuid default gen_random_uuid() primary key,
    campaign_id uuid references campaigns(id) on delete cascade not null,
    customer_id uuid references customers(id) not null,
    contact_id uuid references contacts(id), -- Specific contact, if null maybe main?
    status text default 'pending' check (status in ('pending', 'sent', 'failed', 'delivered', 'read')),
    error_message text,
    sent_at timestamptz,
    created_at timestamptz default now()
);

-- Add RLS Policies (Simple for now: company isolation)
alter table campaigns enable row level security;
alter table campaign_recipients enable row level security;

create policy "Users can view campaigns from their company"
    on campaigns for select
    using (company_id in (select company_id from users where id = auth.uid()));

create policy "Users can insert campaigns for their company"
    on campaigns for insert
    with check (company_id in (select company_id from users where id = auth.uid()));

create policy "Users can update campaigns from their company"
    on campaigns for update
    using (company_id in (select company_id from users where id = auth.uid()));

create policy "Users can delete campaigns from their company"
    on campaigns for delete
    using (company_id in (select company_id from users where id = auth.uid()));

-- Recipients Policies
create policy "Users can view recipients from their company via campaign"
    on campaign_recipients for select
    using (campaign_id in (select id from campaigns where company_id in (select company_id from users where id = auth.uid())));

create policy "Users can insert recipients"
    on campaign_recipients for insert
    with check (campaign_id in (select id from campaigns where company_id in (select company_id from users where id = auth.uid())));
