-- Correct the correlated sponsorship-offer check. The original unqualified
-- sponsor_company_id inside the subquery resolved to the offer itself.
drop policy if exists "applicants request published offers" on public.sponsorship_requests;
create policy "applicants request published offers" on public.sponsorship_requests
 for insert to authenticated
 with check (
  created_by=(select auth.uid())
  and private.is_company_owner(applicant_company_id)
  and exists (
   select 1 from public.sponsorship_offers o
   where o.id=sponsorship_requests.offer_id
    and o.sponsor_company_id=sponsorship_requests.sponsor_company_id
    and o.status='published'
  )
 );
