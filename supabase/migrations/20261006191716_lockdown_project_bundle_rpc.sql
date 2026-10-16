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
  v_owner uuid := (select auth.uid());
  v_existing_owner uuid;
begin
  if v_owner is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_type not in (
    'Website','Web app','App','GitHub project','API','Game','AI product',
    'Dataset','Digital asset','Creator / business','Protocol','Other'
  ) then
    raise exception 'unsupported project type' using errcode = '22023';
  end if;

  if p_economy not in ('none','token') then
    raise exception 'unsupported economy' using errcode = '22023';
  end if;

  if p_source_kind not in ('github','domain','wallet','app_store','play_store','game','brokerage','other') then
    raise exception 'unsupported source kind' using errcode = '22023';
  end if;

  if p_name is null or char_length(trim(p_name)) < 2 or char_length(trim(p_name)) > 120 then
    raise exception 'invalid project name' using errcode = '22023';
  end if;

  if p_slug is null or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(p_slug) > 160 then
    raise exception 'invalid project slug' using errcode = '22023';
  end if;

  if p_description is null or char_length(trim(p_description)) < 10 or char_length(trim(p_description)) > 4000 then
    raise exception 'invalid project description' using errcode = '22023';
  end if;

  if p_source_reference is null or char_length(trim(p_source_reference)) < 4 or char_length(trim(p_source_reference)) > 1000 then
    raise exception 'invalid project source' using errcode = '22023';
  end if;

  if p_actions is null or coalesce(array_length(p_actions, 1), 0) = 0 then
    raise exception 'project actions required' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(p_actions) as a(action)
    where action not in (
      'use','buy','sell','fund','subscribe','license','sponsor','bounty',
      'contribute','rent','borrow','predict','trade','compose','reserve','follow'
    )
  ) then
    raise exception 'unsupported project action' using errcode = '22023';
  end if;

  select owner_id into v_existing_owner
  from public.projects
  where slug = p_slug;

  if v_existing_owner is not null then
    if v_existing_owner = v_owner then
      select id into v_project_id from public.projects where slug = p_slug;
      return v_project_id;
    end if;
    raise exception 'project slug already exists' using errcode = '23505';
  end if;

  insert into public.projects (
    owner_id, name, slug, type, description, economy, verification_status
  )
  values (
    v_owner, trim(p_name), p_slug, p_type, trim(p_description),
    p_economy, 'pending'
  )
  returning id into v_project_id;

  insert into public.project_sources (
    project_id, kind, reference, status
  )
  values (
    v_project_id, p_source_kind, trim(p_source_reference), 'pending'
  );

  insert into public.project_economies (project_id, mode)
  values (v_project_id, p_economy);

  foreach v_action in array (select array_agg(distinct action) from unnest(p_actions) as x(action)) loop
    insert into public.project_actions (project_id, action, enabled)
    values (v_project_id, v_action, true);
  end loop;

  return v_project_id;
exception
  when unique_violation then
    select owner_id, id into v_existing_owner, v_project_id
    from public.projects
    where slug = p_slug;

    if v_existing_owner = v_owner and v_project_id is not null then
      return v_project_id;
    end if;

    raise exception 'project slug already exists' using errcode = '23505';
end;
$$;

revoke all on function public.create_project_bundle(text, text, text, text, text, text, text, text[]) from public;
revoke execute on function public.create_project_bundle(text, text, text, text, text, text, text, text[]) from anon;
grant execute on function public.create_project_bundle(text, text, text, text, text, text, text, text[]) to authenticated;
