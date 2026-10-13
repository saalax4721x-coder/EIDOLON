-- Secure, scoped MCP access so ChatGPT/Claude can use a company's EIDOLON workspace.
create table if not exists public.company_mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  label text not null default 'External AI assistant',
  token_hash text not null unique,
  scopes text[] not null default array['company:read','tasks:create','artifacts:write']::text[],
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists company_mcp_tokens_company_idx on public.company_mcp_tokens(company_id, created_at desc);
alter table public.company_mcp_tokens enable row level security;
drop policy if exists "company owners read MCP tokens" on public.company_mcp_tokens;
create policy "company owners read MCP tokens" on public.company_mcp_tokens for select to authenticated
using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid())));
drop policy if exists "company owners create MCP tokens" on public.company_mcp_tokens;
create policy "company owners create MCP tokens" on public.company_mcp_tokens for insert to authenticated
with check (created_by = (select auth.uid()) and exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid())));
drop policy if exists "company owners revoke MCP tokens" on public.company_mcp_tokens;
create policy "company owners revoke MCP tokens" on public.company_mcp_tokens for update to authenticated
using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid())))
with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = (select auth.uid())));

-- Only a high-entropy token hash is accepted. The function exposes only the
-- company data and operations explicitly permitted by that token's scopes.
create or replace function public.execute_company_mcp_tool(
  p_token_hash text,
  p_tool text,
  p_arguments jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token public.company_mcp_tokens%rowtype;
  v_company public.companies%rowtype;
  v_task_id uuid;
  v_artifact_id uuid;
  v_title text;
  v_body text;
  v_type text;
  v_task_type text;
begin
  select * into v_token from public.company_mcp_tokens t
  where t.token_hash = p_token_hash and t.revoked_at is null
  limit 1;
  if not found then raise exception 'invalid or revoked EIDOLON MCP token' using errcode = '42501'; end if;
  select * into v_company from public.companies c where c.id = v_token.company_id;
  if not found then raise exception 'company not found' using errcode = 'P0002'; end if;

  if p_tool = 'auth_check' then
    update public.company_mcp_tokens set last_used_at = now() where id = v_token.id;
    return jsonb_build_object('ok',true,'company_id',v_company.id,'company_name',v_company.name,'scopes',to_jsonb(v_token.scopes));
  elsif p_tool = 'get_company_overview' then
    if not ('company:read' = any(v_token.scopes)) then raise exception 'scope denied' using errcode = '42501'; end if;
    update public.company_mcp_tokens set last_used_at = now() where id = v_token.id;
    return jsonb_build_object('id',v_company.id,'name',v_company.name,'industry',v_company.industry,'mission',v_company.mission,'business_model',v_company.business_model,'target_customer',v_company.target_customer,'status',v_company.status,'created_at',v_company.created_at);
  elsif p_tool = 'list_company_artifacts' then
    if not ('company:read' = any(v_token.scopes)) then raise exception 'scope denied' using errcode = '42501'; end if;
    update public.company_mcp_tokens set last_used_at = now() where id = v_token.id;
    return coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'title',a.title,'artifact_type',a.artifact_type,'body',a.body,'source_provider',a.source_provider,'created_at',a.created_at) order by a.created_at desc)
      from (select * from public.company_artifacts where company_id = v_company.id order by created_at desc limit 25) a),'[]'::jsonb);
  elsif p_tool = 'create_company_task' then
    if not ('tasks:create' = any(v_token.scopes)) then raise exception 'scope denied' using errcode = '42501'; end if;
    v_title := trim(coalesce(p_arguments->>'title',''));
    v_body := trim(coalesce(p_arguments->>'objective',''));
    v_task_type := coalesce(p_arguments->>'task_type','general');
    if char_length(v_title) < 2 or char_length(v_title) > 180 or char_length(v_body) < 5 or char_length(v_body) > 12000 then
      raise exception 'invalid task title or objective' using errcode = '22023';
    end if;
    if v_task_type not in ('planning','research','content','marketing','product','coding','operations','general') then v_task_type := 'general'; end if;
    insert into public.company_tasks(company_id,created_by,title,objective,task_type,status)
    values (v_company.id,v_company.owner_id,v_title,v_body,v_task_type,'queued') returning id into v_task_id;
    update public.company_mcp_tokens set last_used_at = now() where id = v_token.id;
    return jsonb_build_object('id',v_task_id,'title',v_title,'status','queued','note','Queued for EIDOLON workforce execution; no completion is implied.');
  elsif p_tool = 'save_company_artifact' then
    if not ('artifacts:write' = any(v_token.scopes)) then raise exception 'scope denied' using errcode = '42501'; end if;
    v_title := trim(coalesce(p_arguments->>'title',''));
    v_body := trim(coalesce(p_arguments->>'body',''));
    v_type := coalesce(p_arguments->>'artifact_type','document');
    if char_length(v_title) < 2 or char_length(v_title) > 180 or char_length(v_body) < 1 or char_length(v_body) > 100000 then
      raise exception 'invalid artifact title or body' using errcode = '22023';
    end if;
    if v_type not in ('plan','document','content','report','code','other') then v_type := 'document'; end if;
    insert into public.company_tasks(company_id,created_by,title,objective,task_type,status,result,completed_at)
    values (v_company.id,v_company.owner_id,v_title,'Artifact saved from an authorized external AI assistant.','general','completed',v_body,now())
    returning id into v_task_id;
    insert into public.company_artifacts(company_id,task_id,created_by,artifact_type,title,body,source_provider)
    values (v_company.id,v_task_id,v_company.owner_id,v_type,v_title,v_body,'external_mcp')
    returning id into v_artifact_id;
    update public.company_mcp_tokens set last_used_at = now() where id = v_token.id;
    return jsonb_build_object('artifact_id',v_artifact_id,'task_id',v_task_id,'title',v_title,'artifact_type',v_type,'saved',true);
  else
    raise exception 'unsupported MCP tool' using errcode = '22023';
  end if;
end;
$$;
revoke all on function public.execute_company_mcp_tool(text,text,jsonb) from public, authenticated;
grant execute on function public.execute_company_mcp_tool(text,text,jsonb) to anon;
