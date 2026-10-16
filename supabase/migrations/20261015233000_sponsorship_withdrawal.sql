-- An applicant may withdraw only their own application; sponsors retain review control.
create policy "applicant withdraws request" on public.sponsorship_requests
 for update to authenticated
 using (private.is_company_owner(applicant_company_id) and status in ('submitted','reviewing'))
 with check (private.is_company_owner(applicant_company_id) and status='withdrawn');
