-- Prevent forged display identities even through direct Supabase REST access.
-- Invoker-rights triggers read the same company rows that the signed-in owner can access.
create or replace function public.sponsorship_offer_identity_guard()
returns trigger language plpgsql security invoker set search_path=public as $$
declare actual_name text;
begin
 if tg_op='INSERT' then
  select c.name into actual_name from public.companies c
   where c.id=new.sponsor_company_id and c.owner_id=auth.uid();
  if actual_name is null then raise exception 'Sponsor company ownership required'; end if;
  new.sponsor_name=actual_name;
 elsif new.sponsor_company_id is distinct from old.sponsor_company_id
    or new.created_by is distinct from old.created_by
    or new.sponsor_name is distinct from old.sponsor_name
    or new.contact_email is distinct from old.contact_email
    or new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.categories is distinct from old.categories
    or new.eligibility is distinct from old.eligibility
    or new.budget_note is distinct from old.budget_note then
  raise exception 'Offer identity and content are immutable';
 end if;
 return new;
end $$;
create trigger sponsorship_offer_identity_guard before insert or update on public.sponsorship_offers
 for each row execute function public.sponsorship_offer_identity_guard();

create or replace function public.sponsorship_request_identity_guard()
returns trigger language plpgsql security invoker set search_path=public as $$
declare actual_name text;
begin
 if tg_op='INSERT' then
  select c.name into actual_name from public.companies c
   where c.id=new.applicant_company_id and c.owner_id=auth.uid();
  if actual_name is null then raise exception 'Applicant company ownership required'; end if;
  new.applicant_name=actual_name;
 elsif new.offer_id is distinct from old.offer_id
    or new.sponsor_company_id is distinct from old.sponsor_company_id
    or new.applicant_company_id is distinct from old.applicant_company_id
    or new.created_by is distinct from old.created_by
    or new.applicant_name is distinct from old.applicant_name
    or new.pitch is distinct from old.pitch
    or new.requested_support is distinct from old.requested_support then
  raise exception 'Application identity and pitch are immutable';
 elsif new.status='withdrawn' and old.status not in ('submitted','reviewing') then
  raise exception 'Only pending applications may be withdrawn';
 elsif old.status='withdrawn' and new.status<>old.status then
  raise exception 'Withdrawn applications cannot be reopened';
 end if;
 return new;
end $$;
create trigger sponsorship_request_identity_guard before insert or update on public.sponsorship_requests
 for each row execute function public.sponsorship_request_identity_guard();
revoke all on function public.sponsorship_offer_identity_guard() from public;
revoke all on function public.sponsorship_request_identity_guard() from public;
