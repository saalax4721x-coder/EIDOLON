-- Store the applicant's real company display name at submission time.
-- This is a snapshot, not a verification badge or external endorsement.
alter table public.sponsorship_requests
 add column applicant_name text not null default '' check (char_length(applicant_name)<=120);
