create or replace function public.update_project_economy(p_project_id uuid, p_mode text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_project public.projects%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_mode not in ('none', 'token') then
    raise exception 'invalid economy mode' using errcode = '22023';
  end if;
  update public.projects
  set economy = p_mode
  where id = p_project_id
  returning * into v_project;
  if not found then
    raise exception 'project not found or not owned' using errcode = '42501';
  end if;
  insert into public.project_economies (project_id, mode)
  values (p_project_id, p_mode)
  on conflict (project_id) do update
    set mode = excluded.mode,
        chain = case when p_mode = 'none' then null else public.project_economies.chain end,
        token_address = case when p_mode = 'none' then null else public.project_economies.token_address end;
  return jsonb_build_object('project_id', v_project.id, 'economy', v_project.economy);
end;
$$;

revoke all on function public.update_project_economy(uuid, text) from public;
revoke all on function public.update_project_economy(uuid, text) from anon;
grant execute on function public.update_project_economy(uuid, text) to authenticated;