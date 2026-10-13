-- EIDOLON digital companies and AI workforce foundation.
-- A company is a first-class network object; AI execution is never fabricated.
create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null unique,
  industry text not null default 'Other',
  mission text not null check (char_length(trim(mission)) between 10 and 4000),
  business_model text not null default 'To be defined',
  target_customer text not null default '',
  launch_plan jsonb not null default '{}'::jsonb,
  status text not null default 'planning' check (status in ('planning','operating','paused','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member','viewer')),
  joined_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create table if not exists public.company_ai_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openai','anthropic','google','openrouter','custom')),
  auth_method text not null check (auth_method in ('api_key','oauth','mcp')),
  display_name text not null,
  credential_ciphertext text,
  endpoint_url text,
  scopes text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','connected','needs_reauth','disabled')),
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, provider, auth_method, display_name)
);

create table if not exists public.company_ai_agents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  role text not null check (char_length(trim(role)) between 2 and 120),
  description text not null default '',
  runtime text not null default 'eidolon' check (runtime in ('eidolon','provider','external')),
  provider text check (provider in ('openai','anthropic','google','openrouter','custom')),
  model text,
  connection_id uuid references public.company_ai_connections(id) on delete set null,
  instructions text not null default '',
  allowed_tools text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','active','paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((runtime = 'eidolon' and provider is null) or (runtime <> 'eidolon' and provider is not null))
);

create table if not exists public.company_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  assigned_agent_id uuid references public.company_ai_agents(id) on delete set null,
  title text not null check (char_length(trim(title)) between 2 and 180),
  objective text not null check (char_length(trim(objective)) between 5 and 12000),
  task_type text not null default 'general' check (task_type in ('planning','research','content','marketing','product','coding','operations','general')),
  status text not null default 'queued' check (status in ('queued','running','review','completed','failed','cancelled')),
  result text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.company_artifacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  task_id uuid references public.company_tasks(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  artifact_type text not null check (artifact_type in ('plan','document','content','report','code','other')),
  title text not null,
  body text not null,
  source_provider text,
  created_at timestamptz not null default now()
);

create index if not exists companies_owner_created_idx on public.companies(owner_id, created_at desc);
create index if not exists company_members_user_idx on public.company_members(user_id, company_id);
create index if not exists company_agents_company_idx on public.company_ai_agents(company_id, created_at);
create index if not exists company_tasks_company_status_idx on public.company_tasks(company_id, status, created_at desc);
create index if not exists company_artifacts_company_idx on public.company_artifacts(company_id, created_at desc);

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.company_ai_connections enable row level security;
alter table public.company_ai_agents enable row level security;
alter table public.company_tasks enable row level security;
alter table public.company_artifacts enable row level security;

drop policy if exists "company members can read companies" on public.companies;
create policy "company members can read companies" on public.companies for select to authenticated
using (exists (select 1 from public.company_members m where m.company_id = id and m.user_id = (select auth.uid())));

drop policy if exists "owners can update companies" on public.companies;
create policy "owners can update companies" on public.companies for update to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists "members can read company membership" on public.company_members;
create policy "members can read company membership" on public.company_members for select to authenticated
using (exists (select 1 from public.company_members own where own.company_id = company_id and own.user_id = (select auth.uid())));

drop policy if exists "company owners manage membership" on public.company_members;
create policy "company owners manage membership" on public.company_members for all to authenticated
using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid())))
with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid())));

drop policy if exists "company members read AI connections metadata" on public.company_ai_connections;
create policy "company members read AI connections metadata" on public.company_ai_connections for select to authenticated
using (exists (select 1 from public.company_members m where m.company_id = company_id and m.user_id = (select auth.uid())));

drop policy if exists "company owners manage AI connections" on public.company_ai_connections;
create policy "company owners manage AI connections" on public.company_ai_connections for all to authenticated
using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid())))
with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid())));

drop policy if exists "company members read agents" on public.company_ai_agents;
create policy "company members read agents" on public.company_ai_agents for select to authenticated
using (exists (select 1 from public.company_members m where m.company_id = company_id and m.user_id = (select auth.uid())));

drop policy if exists "company owners manage agents" on public.company_ai_agents;
create policy "company owners manage agents" on public.company_ai_agents for all to authenticated
using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid())))
with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid())));

drop policy if exists "company members read tasks" on public.company_tasks;
create policy "company members read tasks" on public.company_tasks for select to authenticated
using (exists (select 1 from public.company_members m where m.company_id = company_id and m.user_id = (select auth.uid())));

drop policy if exists "company members create tasks" on public.company_tasks;
create policy "company members create tasks" on public.company_tasks for insert to authenticated
with check (created_by = (select auth.uid()) and exists (select 1 from public.company_members m where m.company_id = company_id and m.user_id = (select auth.uid()) and m.role in ('owner','admin','member')));

drop policy if exists "company owners manage tasks" on public.company_tasks;
create policy "company owners manage tasks" on public.company_tasks for update to authenticated
using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid())))
with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid())));

drop policy if exists "company members read artifacts" on public.company_artifacts;
create policy "company members read artifacts" on public.company_artifacts for select to authenticated
using (exists (select 1 from public.company_members m where m.company_id = company_id and m.user_id = (select auth.uid())));

drop policy if exists "company members create artifacts" on public.company_artifacts;
create policy "company members create artifacts" on public.company_artifacts for insert to authenticated
with check (created_by = (select auth.uid()) and exists (select 1 from public.company_members m where m.company_id = company_id and m.user_id = (select auth.uid())));

create or replace function public.create_company_bundle(
  p_name text,
  p_slug text,
  p_industry text,
  p_mission text,
  p_business_model text,
  p_target_customer text,
  p_launch_plan jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_name,''))) < 2 or char_length(trim(coalesce(p_name,''))) > 120 then
    raise exception 'invalid company name' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_mission,''))) < 10 or char_length(trim(coalesce(p_mission,''))) > 4000 then
    raise exception 'invalid company mission' using errcode = '22023';
  end if;

  insert into public.companies(owner_id,name,slug,industry,mission,business_model,target_customer,launch_plan)
  values ((select auth.uid()),trim(p_name),p_slug,coalesce(nullif(trim(p_industry),''),'Other'),
    trim(p_mission),coalesce(nullif(trim(p_business_model),''),'To be defined'),
    coalesce(p_target_customer,''),coalesce(p_launch_plan,'{}'::jsonb))
  returning id into v_company_id;

  insert into public.company_members(company_id,user_id,role)
  values (v_company_id,(select auth.uid()),'owner');

  return v_company_id;
end;
$$;

revoke all on function public.create_company_bundle(text,text,text,text,text,text,jsonb) from public, anon;
grant execute on function public.create_company_bundle(text,text,text,text,text,text,jsonb) to authenticated;
