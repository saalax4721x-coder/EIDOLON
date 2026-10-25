-- EIDOLON initial persistence foundation
-- Real project identity, source verification, actions, economy and follows.
-- RLS is enabled on every exposed table.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) >= 2),
  slug text not null unique,
  type text not null,
  description text not null check (char_length(trim(description)) >= 10),
  economy text not null default 'none' check (economy in ('none','token')),
  verification_status text not null default 'pending'
    check (verification_status in ('unverified','pending','verified','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null,
  reference text not null,
  status text not null default 'pending'
    check (status in ('unverified','pending','verified','rejected')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, kind, reference)
);

create table if not exists public.project_actions (
  project_id uuid not null references public.projects(id) on delete cascade,
  action text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (project_id, action)
);

create table if not exists public.project_economies (
  project_id uuid primary key references public.projects(id) on delete cascade,
  mode text not null check (mode in ('none','token')),
  chain text,
  token_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_follows (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists projects_owner_id_idx on public.projects(owner_id);
create index if not exists projects_created_at_idx on public.projects(created_at desc);
create index if not exists project_sources_project_id_idx on public.project_sources(project_id);
create index if not exists project_follows_user_id_idx on public.project_follows(user_id);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_sources enable row level security;
alter table public.project_actions enable row level security;
alter table public.project_economies enable row level security;
alter table public.project_follows enable row level security;

create policy "profiles are readable by everyone"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "users can create their profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "users can update their profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "projects are publicly discoverable"
  on public.projects for select
  to anon, authenticated
  using (true);

create policy "owners can create projects"
  on public.projects for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "owners can update projects"
  on public.projects for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "owners can delete projects"
  on public.projects for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "project sources are publicly readable"
  on public.project_sources for select
  to anon, authenticated
  using (true);

create policy "project owners manage sources"
  on public.project_sources for all
  to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  ));

create policy "project actions are publicly readable"
  on public.project_actions for select
  to anon, authenticated
  using (true);

create policy "project owners manage actions"
  on public.project_actions for all
  to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  ));

create policy "project economies are publicly readable"
  on public.project_economies for select
  to anon, authenticated
  using (true);

create policy "project owners manage economies"
  on public.project_economies for all
  to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  ));

create policy "users can read their follows"
  on public.project_follows for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "users can follow projects"
  on public.project_follows for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users can unfollow projects"
  on public.project_follows for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
