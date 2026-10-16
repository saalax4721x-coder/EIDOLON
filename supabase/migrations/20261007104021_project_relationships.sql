create table if not exists public.project_relationships (
  id uuid primary key default gen_random_uuid(),
  source_project_id uuid not null references public.projects(id) on delete cascade,
  target_project_id uuid not null references public.projects(id) on delete cascade,
  relationship text not null check (relationship in (
    'uses','depends_on','forked_from','built_with','funds','competes_with',
    'complements','licenses','provides','consumes','derived_from',
    'composed_with','invested_in','contributes_to'
  )),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (source_project_id <> target_project_id),
  unique (source_project_id, target_project_id, relationship)
);

create index if not exists project_relationships_source_idx
  on public.project_relationships(source_project_id);
create index if not exists project_relationships_target_idx
  on public.project_relationships(target_project_id);
create index if not exists project_relationships_created_by_idx
  on public.project_relationships(created_by);

alter table public.project_relationships enable row level security;

create policy "project relationships are publicly readable"
  on public.project_relationships for select
  to anon, authenticated
  using (true);

create policy "project owners can create relationships"
  on public.project_relationships for insert
  to authenticated
  with check (
    (select auth.uid()) = created_by
    and exists (
      select 1 from public.projects p
      where p.id = source_project_id
        and p.owner_id = (select auth.uid())
    )
  );

create policy "relationship creators can delete relationships"
  on public.project_relationships for delete
  to authenticated
  using ((select auth.uid()) = created_by);
