drop index if exists public.stripe_donors_email_currency_unique;
drop index if exists public.stripe_donors_name_email_currency_unique;

alter table public.stripe_donors
drop constraint if exists stripe_donors_email_currency_key;

alter table public.stripe_donors
drop constraint if exists stripe_donors_name_email_currency_key;

alter table public.stripe_donors
add column if not exists donor_key text;

update public.thank_you_emails
set donor_id = null
where donor_id is not null;

delete from public.stripe_donors;

alter table public.stripe_donors
alter column donor_key set not null;

create unique index if not exists stripe_donors_donor_key_currency_unique
on public.stripe_donors(donor_key, currency);
