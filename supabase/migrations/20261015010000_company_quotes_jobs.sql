-- Company sales and service operations, linked to real company leads.
create table if not exists public.company_quotes (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 lead_id uuid not null references public.company_leads(id) on delete cascade,
 created_by uuid not null references auth.users(id),
 title text not null check (char_length(trim(title)) between 2 and 180),
 description text not null default '' check (char_length(description)<=4000),
 amount numeric(14,2) not null check (amount>=0 and amount<=999999999999.99),
 currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
 status text not null default 'draft' check (status in ('draft','sent','accepted','declined')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(id,company_id)
);
create index if not exists company_quotes_company_idx on public.company_quotes(company_id,created_at desc);
create table if not exists public.company_jobs (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 lead_id uuid not null references public.company_leads(id) on delete cascade,
 quote_id uuid,
 created_by uuid not null references auth.users(id),
 title text not null check (char_length(trim(title)) between 2 and 180),
 description text not null default '' check (char_length(description)<=4000),
 scheduled_at timestamptz,
 status text not null default 'planned' check (status in ('planned','scheduled','in_progress','completed','cancelled')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(quote_id,company_id) references public.company_quotes(id,company_id)
);
create index if not exists company_jobs_company_idx on public.company_jobs(company_id,created_at desc);
-- Enforce that referenced leads belong to the same company even for direct Data API clients.
create unique index if not exists company_leads_id_company_unique on public.company_leads(id,company_id);
alter table public.company_quotes add constraint company_quotes_lead_company_fk foreign key(lead_id,company_id) references public.company_leads(id,company_id);
alter table public.company_jobs add constraint company_jobs_lead_company_fk foreign key(lead_id,company_id) references public.company_leads(id,company_id);
alter table public.company_quotes enable row level security;
alter table public.company_jobs enable row level security;
create policy "owners read quotes" on public.company_quotes for select to authenticated using(private.is_company_owner(company_id));
create policy "owners insert quotes" on public.company_quotes for insert to authenticated with check(created_by=(select auth.uid()) and private.is_company_owner(company_id));
create policy "owners update quotes" on public.company_quotes for update to authenticated using(private.is_company_owner(company_id)) with check(created_by=(select auth.uid()) and private.is_company_owner(company_id));
create policy "owners read jobs" on public.company_jobs for select to authenticated using(private.is_company_owner(company_id));
create policy "owners insert jobs" on public.company_jobs for insert to authenticated with check(created_by=(select auth.uid()) and private.is_company_owner(company_id));
create policy "owners update jobs" on public.company_jobs for update to authenticated using(private.is_company_owner(company_id)) with check(created_by=(select auth.uid()) and private.is_company_owner(company_id));
grant select,insert,update on public.company_quotes,public.company_jobs to authenticated;
