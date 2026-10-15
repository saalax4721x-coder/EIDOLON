-- Opt-in sponsor marketplace: only real company owners can publish offers and submit requests.
create table public.sponsorship_offers (
 id uuid primary key default gen_random_uuid(),
 sponsor_company_id uuid not null references public.companies(id) on delete cascade,
 created_by uuid not null references auth.users(id),
 title text not null check (char_length(trim(title)) between 5 and 180),
 description text not null check (char_length(trim(description)) between 20 and 4000),
 categories text not null default '' check (char_length(categories)<=300),
 eligibility text not null default '' check (char_length(eligibility)<=1000),
 budget_note text not null default '' check (char_length(budget_note)<=240),
 status text not null default 'published' check (status in ('published','paused','closed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(id,sponsor_company_id)
);
create table public.sponsorship_requests (
 id uuid primary key default gen_random_uuid(),
 offer_id uuid not null,
 sponsor_company_id uuid not null,
 applicant_company_id uuid not null references public.companies(id) on delete cascade,
 created_by uuid not null references auth.users(id),
 pitch text not null check (char_length(trim(pitch)) between 30 and 4000),
 requested_support text not null check (char_length(trim(requested_support)) between 5 and 500),
 status text not null default 'submitted' check (status in ('submitted','reviewing','accepted','declined','withdrawn')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key (offer_id,sponsor_company_id) references public.sponsorship_offers(id,sponsor_company_id) on delete cascade,
 unique(offer_id,applicant_company_id),
 check(sponsor_company_id<>applicant_company_id)
);
create index sponsorship_offers_discover_idx on public.sponsorship_offers(status,created_at desc);
create index sponsorship_requests_sponsor_idx on public.sponsorship_requests(sponsor_company_id,created_at desc);
create index sponsorship_requests_applicant_idx on public.sponsorship_requests(applicant_company_id,created_at desc);
alter table public.sponsorship_offers enable row level security;
alter table public.sponsorship_requests enable row level security;
create policy "discover published or owned offers" on public.sponsorship_offers for select to authenticated using(status='published' or private.is_company_owner(sponsor_company_id));
create policy "owner publishes offers" on public.sponsorship_offers for insert to authenticated with check(created_by=(select auth.uid()) and private.is_company_owner(sponsor_company_id));
create policy "owner edits offers" on public.sponsorship_offers for update to authenticated using(private.is_company_owner(sponsor_company_id)) with check(created_by=(select auth.uid()) and private.is_company_owner(sponsor_company_id));
create policy "participants read requests" on public.sponsorship_requests for select to authenticated using(private.is_company_owner(sponsor_company_id) or private.is_company_owner(applicant_company_id));
create policy "applicants request published offers" on public.sponsorship_requests for insert to authenticated with check(
 created_by=(select auth.uid()) and private.is_company_owner(applicant_company_id)
 and exists(select 1 from public.sponsorship_offers o where o.id=offer_id and o.sponsor_company_id=sponsor_company_id and o.status='published')
);
create policy "participants update requests" on public.sponsorship_requests for update to authenticated using(private.is_company_owner(sponsor_company_id) or private.is_company_owner(applicant_company_id)) with check(private.is_company_owner(sponsor_company_id) or private.is_company_owner(applicant_company_id));
grant select,insert,update on public.sponsorship_offers,public.sponsorship_requests to authenticated;
