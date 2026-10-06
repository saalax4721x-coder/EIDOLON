create or replace function public.create_project_bundle(
  p_name text,
  p_slug text,
  p_type text,
  p_description text,
  p_economy text,
  p_source_kind text,
  p_source_reference text,
  p_actions text[]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_project_id uuid;
  v_action text;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  insert into public.projects (
    owner_id, name, slug, type, description, economy, verification_status
  )
  values (
    (select auth.uid()), p_name, p_slug, p_type, p_description,
    case when p_economy = 'token' then 'token' else 'none' end,
    'pending'
  )
  returning id into v_project_id;

  insert into public.project_sources (
    project_id, kind, reference, status
  )
  values (
    v_project_id, p_source_kind, p_source_reference, 'pending'
  );

  insert into public.project_economies (
    project_id, mode
  )
  values (
    v_project_id,
    case when p_economy = 'token' then 'token' else 'none' end
  );

  foreach v_action in array p_actions loop
    insert into public.project_actions (project_id, action, enabled)
    values (v_project_id, v_action, true);
  end loop;

  return v_project_id;
end;
$$;

revoke all on function public.create_project_bundle(text, text, text, text, text, text, text, text[]) from public;
revoke execute on function public.create_project_bundle(text, text, text, text, text, text, text, text[]) from anon;
grant execute on function public.create_project_bundle(text, text, text, text, text, text, text, text[]) to authenticated;
