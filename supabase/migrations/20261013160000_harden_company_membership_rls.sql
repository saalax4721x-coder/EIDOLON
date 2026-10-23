-- Keep the RLS helper outside PostgREST's exposed public schema.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $member_check$
  select exists (
    select 1 from public.company_members m
    where m.company_id = p_company_id and m.user_id = (select auth.uid())
  );
$member_check$;
revoke all on function private.is_company_member(uuid) from public, anon;
grant execute on function private.is_company_member(uuid) to authenticated;

drop policy if exists "company members can read companies" on public.companies;
drop policy if exists "members can read company membership" on public.company_members;
drop policy if exists "company members read AI connections metadata" on public.company_ai_connections;
drop policy if exists "company members read agents" on public.company_ai_agents;
drop policy if exists "company members read tasks" on public.company_tasks;
drop policy if exists "company members create tasks" on public.company_tasks;
drop policy if exists "company members read artifacts" on public.company_artifacts;
drop policy if exists "company members create artifacts" on public.company_artifacts;

create policy "company members can read companies" on public.companies for select to authenticated
using (private.is_company_member(id));
create policy "members can read company membership" on public.company_members for select to authenticated
using (private.is_company_member(company_id));
create policy "company members read AI connections metadata" on public.company_ai_connections for select to authenticated
using (private.is_company_member(company_id));
create policy "company members read agents" on public.company_ai_agents for select to authenticated
using (private.is_company_member(company_id));
create policy "company members read tasks" on public.company_tasks for select to authenticated
using (private.is_company_member(company_id));
create policy "company members create tasks" on public.company_tasks for insert to authenticated
with check (
  created_by = (select auth.uid())
  and private.is_company_member(company_id)
  and exists (
    select 1 from public.company_members m
    where m.company_id = company_id and m.user_id = (select auth.uid())
      and m.role in ('owner','admin','member')
  )
);
create policy "company members read artifacts" on public.company_artifacts for select to authenticated
using (private.is_company_member(company_id));
create policy "company members create artifacts" on public.company_artifacts for insert to authenticated
with check (created_by = (select auth.uid()) and private.is_company_member(company_id));

drop function if exists public.is_company_member(uuid);
