-- Owner-scoped customer pipeline for Company Foundry. No synthetic leads.
create table if not exists public.company_leads (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 created_by uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(trim(name)) between 2 and 160),
 contact text not null default '' check (char_length(contact) <= 320),
 source text not null default 'manual' check (char_length(source) <= 120),
 stage text not null default 'new' check (stage in ('new','contacted','qualified','quoted','won','lost')),
 notes text not null default '' check (char_length(notes) <= 4000),
 next_action text not null default '' check (char_length(next_action) <= 500),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists company_leads_company_created_idx on public.company_leads(company_id,created_at desc);
alter table public.company_leads enable row level security;
create policy "company owners read leads" on public.company_leads for select to authenticated
using (private.is_company_owner(company_id));
create policy "company owners add leads" on public.company_leads for insert to authenticated
with check (created_by = (select auth.uid()) and private.is_company_owner(company_id));
create policy "company owners update leads" on public.company_leads for update to authenticated
using (private.is_company_owner(company_id))
with check (private.is_company_owner(company_id) and created_by = (select auth.uid()));
create policy "company owners delete leads" on public.company_leads for delete to authenticated
using (private.is_company_owner(company_id));
