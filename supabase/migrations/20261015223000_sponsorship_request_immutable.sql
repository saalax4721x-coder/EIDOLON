-- Only sponsorship status and update timestamp are editable through the Data API.
-- Identity, applicant, sponsor, offer and pitch remain immutable after submission.
revoke update on public.sponsorship_requests from authenticated;
grant update(status,updated_at) on public.sponsorship_requests to authenticated;
