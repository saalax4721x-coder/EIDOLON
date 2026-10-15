-- Prevent direct REST clients from linking a job to a quotation for a different customer.
create unique index if not exists company_quotes_id_company_lead_unique
  on public.company_quotes(id,company_id,lead_id);
alter table public.company_jobs
  add constraint company_jobs_quote_customer_fk
  foreign key(quote_id,company_id,lead_id)
  references public.company_quotes(id,company_id,lead_id);
