alter table public.sponsorship_offers add column sponsor_name text not null default '' check(char_length(sponsor_name)<=120);
-- Display name is written by the sponsor's authenticated server route.
revoke update on public.sponsorship_offers from authenticated;
grant update(status,updated_at) on public.sponsorship_offers to authenticated;
