-- Company creation inserts the owner membership before membership-based reads are possible.
-- Evaluate ownership through a private, narrowly scoped SECURITY DEFINER helper.
create or replace function private.is_company_owner(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $company_owner$
  select exists (
    select 1 from public.companies c
    where c.id = p_company_id and c.owner_id = (select auth.uid())
  );
$company_owner$;
revoke all on function private.is_company_owner(uuid) from public, anon;
grant execute on function private.is_company_owner(uuid) to authenticated;

drop policy if exists "company owners manage membership" on public.company_members;
create policy "company owners manage membership" on public.company_members for all to authenticated
using (private.is_company_owner(company_id))
with check (private.is_company_owner(company_id));
