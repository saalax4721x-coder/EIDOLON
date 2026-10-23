create table public.company_workflows (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 created_by uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(trim(name)) between 2 and 120),
 description text not null default '' check (char_length(description)<=1000),
 nodes jsonb not null default '[]'::jsonb check (jsonb_typeof(nodes)='array' and jsonb_array_length(nodes)<=50),
 edges jsonb not null default '[]'::jsonb check (jsonb_typeof(edges)='array' and jsonb_array_length(edges)<=100),
 status text not null default 'draft' check(status in ('draft','active','archived')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index company_workflows_company_idx on public.company_workflows(company_id,updated_at desc);
alter table public.company_workflows enable row level security;
create policy "owners read workflows" on public.company_workflows for select to authenticated using(private.is_company_owner(company_id));
create policy "owners create workflows" on public.company_workflows for insert to authenticated with check(created_by=(select auth.uid()) and private.is_company_owner(company_id));
create policy "owners update workflows" on public.company_workflows for update to authenticated using(private.is_company_owner(company_id)) with check(created_by=(select auth.uid()) and private.is_company_owner(company_id));
create policy "owners delete workflows" on public.company_workflows for delete to authenticated using(private.is_company_owner(company_id));
grant select,insert,update,delete on public.company_workflows to authenticated;