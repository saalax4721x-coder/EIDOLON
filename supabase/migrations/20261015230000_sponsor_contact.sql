-- Sponsors explicitly choose whether to publish a business contact email.
alter table public.sponsorship_offers
 add column contact_email text not null default ''
 check (contact_email = '' or (char_length(contact_email)<=254 and contact_email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'));
