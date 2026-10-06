create table if not exists public.provider_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('github')),
  provider_user_id text not null,
  provider_login text not null,
  access_token_ciphertext text not null,
  refresh_token_ciphertext text,
  expires_at timestamptz,
  refresh_expires_at timestamptz,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider),
  unique (provider, provider_user_id)
);

alter table public.provider_connections enable row level security;

create policy "provider_connections_select_own" on public.provider_connections
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "provider_connections_insert_own" on public.provider_connections
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "provider_connections_update_own" on public.provider_connections
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "provider_connections_delete_own" on public.provider_connections
  for delete to authenticated using ((select auth.uid()) = user_id);

create index if not exists provider_connections_user_id_idx on public.provider_connections(user_id);
